/**
 * API Response Utilities
 * Standardized response formatting
 */

import { Response } from 'express';

// ============================================================================
// Success Response
// ============================================================================

export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T | null;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data: T | null = null
): Response => {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, message: string, data: T): Response => {
  return sendSuccess(res, 201, message, data);
};

export const sendOK = <T>(res: Response, message: string, data: T | null = null): Response => {
  return sendSuccess(res, 200, message, data);
};

export const sendNoContent = (res: Response, message: string = 'Success'): Response => {
  return sendSuccess(res, 204, message, null);
};

// ============================================================================
// Paginated Response
// ============================================================================

export interface PaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export const sendPaginated = <T>(
  res: Response,
  message: string,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): Response => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  const response: PaginatedResponse<T> = {
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
  };

  return res.status(200).json(response);
};

// ============================================================================
// Error Response (handled by error middleware, but useful for manual responses)
// ============================================================================

export interface ErrorResponse {
  success: false;
  status: number;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
  originalError?: string;
}

export const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  details?: Record<string, unknown>
): Response => {
  const response: ErrorResponse = {
    success: false,
    status: statusCode,
    message,
    details,
  };
  return res.status(statusCode).json(response);
};

// ============================================================================
// Response Helpers
// ============================================================================

export const withPagination = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): { data: T[]; pagination: PaginatedResponse<T>['pagination'] } => {
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
};

export const createPagination = (
  page: number = 1,
  limit: number = 30,
  maxLimit: number = 100
): { page: number; limit: number; skip: number } => {
  const safeLimit = Math.min(Math.max(limit, 1), maxLimit);
  const safePage = Math.max(page, 1);
  const skip = (safePage - 1) * safeLimit;
  return { page: safePage, limit: safeLimit, skip };
};

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];