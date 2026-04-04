export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface AppError {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  context?: string;
  originalError?: unknown;
  timestamp: number;
}

export interface ErrorHandlerConfig {
  onError?: (error: AppError) => void;
  onRetry?: (error: AppError, retry: () => void) => void;
  shouldReport?: (error: AppError) => boolean;
  onReport?: (error: AppError) => void;
}

const listeners: ErrorHandlerConfig[] = [];

export const registerErrorHandler = (config: ErrorHandlerConfig): (() => void) => {
  listeners.push(config);
  return () => {
    const index = listeners.indexOf(config);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
};

const notifyListeners = (error: AppError) => {
  for (const listener of listeners) {
    listener.onError?.(error);
    if (listener.shouldReport?.(error)) {
      listener.onReport?.(error);
    }
  }
};

export const createAppError = (
  message: string,
  options: {
    code?: string;
    severity?: ErrorSeverity;
    context?: string;
    originalError?: unknown;
  } = {}
): AppError => {
  return {
    message,
    code: options.code,
    severity: options.severity ?? "medium",
    context: options.context,
    originalError: options.originalError,
    timestamp: Date.now(),
  };
};

export const handleError = (
  error: unknown,
  options: {
    code?: string;
    severity?: ErrorSeverity;
    context?: string;
    silent?: boolean;
  } = {}
): AppError => {
  let message = "An unexpected error occurred";
  let originalError: unknown = error;

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  const appError = createAppError(message, {
    code: options.code,
    severity: options.severity,
    context: options.context,
    originalError,
  });

  if (!options.silent) {
    console.error("[AppError]", {
      message: appError.message,
      code: appError.code,
      context: appError.context,
      severity: appError.severity,
    });

    if (appError.severity === "high" || appError.severity === "critical") {
      console.error("[AppError] Original error:", originalError);
    }

    notifyListeners(appError);
  }

  return appError;
};

export const getErrorMessage = (error: unknown, fallback: string = "Something went wrong"): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
};

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  if (error && typeof error === "object") {
    const code = (error as { code?: string }).code;
    return code === "ECONNABORTED" || code === "ERR_NETWORK";
  }
  return false;
};

export const isAuthError = (error: unknown): boolean => {
  if (error && typeof error === "object") {
    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403) {
      return true;
    }
    const message = (error as { message?: string }).message;
    if (message && (message.includes("Unauthorized") || message.includes("401") || message.includes("403"))) {
      return true;
    }
  }
  return false;
};

export const withErrorHandler = async <T>(
  promise: Promise<T>,
  options: {
    context?: string;
    onError?: (error: AppError) => void;
  } = {}
): Promise<T> => {
  try {
    return await promise;
  } catch (error) {
    const appError = handleError(error, { context: options.context });
    options.onError?.(appError);
    throw appError;
  }
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    context?: string;
  } = {}
): Promise<T> => {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, context } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw handleError(lastError, { context });
};
