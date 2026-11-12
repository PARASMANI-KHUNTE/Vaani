/**
 * API Error Classes
 * Standardized error handling for the API
 */

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // Static factory methods for common errors
  static badRequest(message: string, code: string = 'BAD_REQUEST', details?: Record<string, unknown>): ApiError {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message: string = 'Authentication required', code: string = 'UNAUTHORIZED', details?: Record<string, unknown>): ApiError {
    return new ApiError(401, message, code, details);
  }

  static forbidden(message: string = 'Access denied', code: string = 'FORBIDDEN', details?: Record<string, unknown>): ApiError {
    return new ApiError(403, message, code, details);
  }

  static notFound(resource: string = 'Resource', code: string = 'NOT_FOUND', details?: Record<string, unknown>): ApiError {
    return new ApiError(404, `${resource} not found`, code, details);
  }

  static conflict(message: string, code: string = 'CONFLICT', details?: Record<string, unknown>): ApiError {
    return new ApiError(409, message, code, details);
  }

  static validationError(message: string, details?: Record<string, unknown>): ApiError {
    return new ApiError(400, message, 'VALIDATION_ERROR', details);
  }

  static tooManyRequests(message: string = 'Too many requests', code: string = 'RATE_LIMIT_EXCEEDED', details?: Record<string, unknown>): ApiError {
    return new ApiError(429, message, code, details);
  }

  static internal(message: string = 'Internal server error', code: string = 'INTERNAL_ERROR', details?: Record<string, unknown>): ApiError {
    return new ApiError(500, message, code, details);
  }

  static serviceUnavailable(message: string = 'Service temporarily unavailable', code: string = 'SERVICE_UNAVAILABLE', details?: Record<string, unknown>): ApiError {
    return new ApiError(503, message, code, details);
  }

  static payloadTooLarge(message: string = 'Payload too large', code: string = 'PAYLOAD_TOO_LARGE', details?: Record<string, unknown>): ApiError {
    return new ApiError(413, message, code, details);
  }

  static unsupportedMediaType(message: string = 'Unsupported media type', code: string = 'UNSUPPORTED_MEDIA_TYPE', details?: Record<string, unknown>): ApiError {
    return new ApiError(415, message, code, details);
  }

  // Convert to JSON-serializable object
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack,
    };
  }
}

// ============================================================================
// Specialized Error Classes
// ============================================================================

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    super(404, `${resource} not found${id ? ` (${id})` : ''}`, 'NOT_FOUND', { resource, id });
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required', code: string = 'UNAUTHORIZED') {
    super(401, message, code);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access denied', code: string = 'FORBIDDEN') {
    super(403, message, code);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>, code: string = 'CONFLICT') {
    super(409, message, code, details);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', code: string = 'RATE_LIMIT_EXCEEDED') {
    super(429, message, code);
    this.name = 'RateLimitError';
  }
}

export class PayloadTooLargeError extends ApiError {
  constructor(message: string = 'Payload too large') {
    super(413, message, 'PAYLOAD_TOO_LARGE');
    this.name = 'PayloadTooLargeError';
  }
}

export class UnsupportedMediaTypeError extends ApiError {
  constructor(message: string = 'Unsupported media type') {
    super(415, message, 'UNSUPPORTED_MEDIA_TYPE');
    this.name = 'UnsupportedMediaTypeError';
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string = 'Database operation failed', details?: Record<string, unknown>) {
    super(500, message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class ExternalServiceError extends ApiError {
  constructor(service: string, message: string, details?: Record<string, unknown>) {
    super(502, `${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', { service, ...details });
    this.name = 'ExternalServiceError';
  }
}

// ============================================================================
// Error Type Guards
// ============================================================================

export const isApiError = (error: unknown): error is ApiError => {
  return error instanceof ApiError;
};

export const isOperationalError = (error: Error): boolean => {
  if (error instanceof ApiError) {
    return error.statusCode < 500;
  }

  const operationalErrors = [
    'ValidationError',
    'CastError',
    'TokenExpiredError',
    'JsonWebTokenError',
    'MulterError',
  ];

  if (operationalErrors.includes(error.name)) {
    return true;
  }

  if ((error as { code?: number }).code === 11000) {
    return true;
  }

  return false;
};

export const getErrorCode = (error: Error): string => {
  if (error instanceof ApiError) return error.code;
  return 'UNKNOWN_ERROR';
};

export const getErrorStatusCode = (error: Error): number => {
  if (error instanceof ApiError) return error.statusCode;
  if ((error as { statusCode?: number }).statusCode) return (error as { statusCode: number }).statusCode;
  if ((error as { status?: number }).status) return (error as { status: number }).status;
  if ((error as { code?: number }).code === 11000) return 409;
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'CastError') return 400;
  if (error.name === 'TokenExpiredError') return 401;
  if (error.name === 'JsonWebTokenError') return 401;
  return 500;
};