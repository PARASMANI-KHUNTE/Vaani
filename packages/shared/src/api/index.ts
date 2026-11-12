/**
 * Shared API Client Base
 * Base class for typed API clients with retry logic, interceptors, and error handling
 */

import type { ApiResponse, ApiError, PaginationParams, PaginatedResponse } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface RequestOptions extends RequestInit {
  params?: Record<string, unknown>;
  signal?: AbortSignal;
  retries?: number;
  retryDelay?: number;
  skipAuth?: boolean;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export type ProgressCallback = (progress: UploadProgress) => void;

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
  onError?: (error: ApiError) => void;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
}

// ============================================================================
// Error Classes
// ============================================================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromResponse(status: number, data: unknown): ApiError {
    const errorData = data as { code?: string; message?: string; details?: Record<string, unknown> } | null;
    return new ApiError(
      status,
      errorData?.code || 'UNKNOWN_ERROR',
      errorData?.message || `Request failed with status ${status}`,
      errorData?.details
    );
  }

  static fromNetworkError(error: Error): ApiError {
    return new ApiError(0, 'NETWORK_ERROR', error.message || 'Network error occurred');
  }
}

// ============================================================================
// Base API Client
// ============================================================================

export abstract class BaseApiClient {
  protected baseUrl: string;
  protected getToken: () => string | null | Promise<string | null>;
  protected onUnauthorized: () => void;
  protected onError: (error: ApiError) => void;
  protected defaultHeaders: Record<string, string>;
  protected timeout: number;
  protected abortControllers: Map<string, AbortController> = new Map();

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken ?? (() => null);
    this.onUnauthorized = config.onUnauthorized ?? (() => {});
    this.onError = config.onError ?? (() => {});
    this.defaultHeaders = config.defaultHeaders ?? {};
    this.timeout = config.timeout ?? 30000;
  }

  // ============================================================================
  // Core Request Methods
  // ============================================================================

  protected async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      params,
      body,
      headers = {},
      signal,
      retries = 3,
      retryDelay = 1000,
      skipAuth = false,
      ...fetchOptions
    } = options;

    const url = this.buildUrl(path, params);
    const token = skipAuth ? null : await this.getToken();

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
      ...headers,
    };

    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Remove Content-Type for FormData
    if (body instanceof FormData) {
      delete requestHeaders['Content-Type'];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          ...fetchOptions,
        });

        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');
        const data = isJson ? await response.json() : await response.text();

        if (!response.ok) {
          const error = ApiError.fromResponse(response.status, data);
          if (response.status === 401 && !skipAuth) {
            this.onUnauthorized();
          }
          this.onError(error);
          throw error;
        }

        return this.parseResponse<T>(data);
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        // Don't retry on client errors (except 408, 429)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408 && error.status !== 429) {
          throw error;
        }

        // Don't retry if aborted
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError(0, 'REQUEST_CANCELLED', 'Request was cancelled');
        }

        // Retry with exponential backoff
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await sleep(delay);
          continue;
        }

        throw error instanceof ApiError ? error : ApiError.fromNetworkError(lastError!);
      }
    }

    throw lastError!;
  }

  protected buildUrl(path: string, params?: Record<string, unknown>): string {
    const url = new URL(path.startsWith('/') ? path : `/${path}`, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach((v) => url.searchParams.append(key, String(v)));
          } else {
            url.searchParams.set(key, String(value));
          }
        }
      });
    }
    return url.toString();
  }

  protected parseResponse<T>(data: unknown): T {
    // Handle different response formats
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as { data: T }).data;
    }
    return data as T;
  }

  // ============================================================================
  // HTTP Methods
  // ============================================================================

  protected get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  protected post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', path, { ...options, body });
  }

  protected put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', path, { ...options, body });
  }

  protected patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>('PATCH', path, { ...options, body });
  }

  protected delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  // ============================================================================
  // Upload with Progress
  // ============================================================================

  protected async upload<T>(
    path: string,
    formData: FormData,
    onProgress?: ProgressCallback,
    options?: Omit<RequestOptions, 'body'>
  ): Promise<T> {
    const token = await this.getToken();
    const url = this.buildUrl(path);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress({
            loaded: event.loaded,
            total: event.total,
            percentage: Math.round((event.loaded / event.total) * 100),
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(this.parseResponse<T>(data));
          } catch {
            reject(new ApiError(xhr.status, 'PARSE_ERROR', 'Failed to parse response'));
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            const error = ApiError.fromResponse(xhr.status, errorData);
            this.onError(error);
            reject(error);
          } catch {
            const error = new ApiError(xhr.status, 'UPLOAD_FAILED', 'Upload failed');
            this.onError(error);
            reject(error);
          }
        }
      });

      xhr.addEventListener('error', () => {
        const error = ApiError.fromNetworkError(new Error('Network error during upload'));
        this.onError(error);
        reject(error);
      });

      xhr.addEventListener('abort', () => {
        reject(new ApiError(0, 'UPLOAD_CANCELLED', 'Upload was cancelled'));
      });

      xhr.open('POST', url);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      Object.entries(this.defaultHeaders).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value);
      });
      xhr.send(formData);
    });
  }

  // ============================================================================
  // Request Cancellation
  // ============================================================================

  cancelRequest(key: string): void {
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  setTokenGetter(getToken: () => string | null | Promise<string | null>): void {
    this.getToken = getToken;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/health', { skipAuth: true, retries: 0 });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// Typed Response Helpers
// ============================================================================

export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationParams & { total: number }
): PaginatedResponse<T> {
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 30;
  const total = pagination.total;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

export function isApiResponse<T>(data: unknown): data is ApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'success' in data &&
    typeof (data as Record<string, unknown>).success === 'boolean'
  );
}

export function unwrapApiResponse<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(
      400,
      response.error?.code || 'API_ERROR',
      response.error?.message || 'API request failed',
      response.error?.details
    );
  }
  return response.data as T;
}