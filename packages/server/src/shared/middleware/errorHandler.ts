/**
 * Error Handling Middleware
 * Centralized error handling with user-friendly messages
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { ApiError } from '../../shared/utils/apiError';

// ============================================================================
// Error Messages Map
// ============================================================================

const ERROR_MESSAGES: Record<number, Record<string, string>> = {
  400: {
    default: 'Invalid request. Please check your input and try again.',
    MISSING_FIELD: 'Required field is missing',
    INVALID_ID: 'Invalid ID format',
    INVALID_CONTENT: 'Message content is invalid',
    INVALID_TYPE: 'Invalid message type',
    VALIDATION_ERROR: 'Validation failed. Please check your input.',
  },
  401: {
    default: 'Authentication required. Please log in.',
    INVALID_TOKEN: 'Session expired. Please log in again.',
    TOKEN_EXPIRED: 'Session expired. Please log in again.',
    NO_TOKEN: 'Please log in to continue.',
    UNAUTHORIZED: 'Authentication required. Please log in.',
  },
  403: {
    default: 'You don\'t have permission to perform this action.',
    ACCOUNT_DISABLED: 'Your account is disabled. Please contact support.',
    BLOCKED: 'Unable to interact with this user.',
    UNAUTHORIZED: 'You are not authorized to perform this action.',
    FORBIDDEN: 'Access denied.',
  },
  404: {
    default: 'The requested resource was not found.',
    CHAT_NOT_FOUND: 'Chat not found or you don\'t have access.',
    USER_NOT_FOUND: 'User not found.',
    MESSAGE_NOT_FOUND: 'Message not found.',
    NOT_FOUND: 'Resource not found.',
  },
  409: {
    default: 'A conflict occurred. Please try again.',
    ALREADY_EXISTS: 'This item already exists.',
    ALREADY_FRIENDS: 'You are already friends with this user.',
    REQUEST_EXISTS: 'Friend request already sent.',
    CONFLICT: 'Conflict with existing resource.',
  },
  413: {
    default: 'File is too large. Please use a smaller file.',
    IMAGE_TOO_LARGE: 'Image exceeds the size limit.',
    VIDEO_TOO_LARGE: 'Video exceeds the size limit.',
    FILE_TOO_LARGE: 'File exceeds the size limit.',
    PAYLOAD_TOO_LARGE: 'Request payload too large.',
  },
  415: {
    default: 'File type not supported.',
    UNSUPPORTED_MEDIA: 'This file type is not allowed.',
    UNSUPPORTED_MEDIA_TYPE: 'Unsupported media type.',
  },
  422: {
    default: 'Validation failed. Please check your input.',
    UNPROCESSABLE_ENTITY: 'Unable to process the request.',
  },
  429: {
    default: 'Too many requests. Please slow down.',
    UPLOAD_LIMIT: 'Upload limit reached. Please wait before uploading again.',
    MESSAGE_LIMIT: 'Message limit reached. Please slow down.',
    RATE_LIMIT: 'Too many attempts. Please try again later.',
    TOO_MANY_REQUESTS: 'Rate limit exceeded.',
  },
  500: {
    default: 'Something went wrong. Please try again later.',
    INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
    DATABASE_ERROR: 'Database error. Please try again.',
  },
  502: {
    default: 'Service temporarily unavailable. Please try again.',
    UPLOAD_FAILED: 'Failed to upload file. Please try again.',
    BAD_GATEWAY: 'Bad gateway.',
  },
  503: {
    default: 'Service is temporarily unavailable. Please try again later.',
    SERVICE_UNAVAILABLE: 'Service unavailable.',
    DATABASE_OFFLINE: 'Database is temporarily unavailable.',
  },
};

// ============================================================================
// Get User-Friendly Error Message
// ============================================================================

const getErrorMessage = (statusCode: number, error: Error | ApiError): string => {
  const statusMessages = ERROR_MESSAGES[statusCode] || ERROR_MESSAGES[500];

  // ApiError with custom code
  if (error instanceof ApiError && error.code) {
    return statusMessages[error.code] || error.message || statusMessages.default;
  }

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    return statusMessages.VALIDATION_ERROR || statusMessages.default;
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    return statusMessages.INVALID_ID || statusMessages.default;
  }

  // JWT errors
  if (error.name === 'TokenExpiredError') {
    return statusMessages.TOKEN_EXPIRED || ERROR_MESSAGES[401].TOKEN_EXPIRED;
  }

  if (error.name === 'JsonWebTokenError') {
    return statusMessages.INVALID_TOKEN || ERROR_MESSAGES[401].INVALID_TOKEN;
  }

  // MongoDB duplicate key error
  if ((error as { code?: number }).code === 11000) {
    return statusMessages.ALREADY_EXISTS || statusMessages.default;
  }

  // Default to error message or status default
  return error.message || statusMessages.default;
};

// ============================================================================
// Check if Error is Operational (Expected)
// ============================================================================

const isOperationalError = (error: Error | ApiError): boolean => {
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

  // MongoDB duplicate key
  if ((error as { code?: number }).code === 11000) {
    return true;
  }

  return false;
};

// ============================================================================
// Error Handler
// ============================================================================

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  let error = err;
  let statusCode = 500;
  let message = ERROR_MESSAGES[500].default;
  let details: Record<string, unknown> | undefined;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = getErrorMessage(statusCode, error);
    details = error.details;
  } else {
    // Determine status code from error
    statusCode = (error as { statusCode?: number; status?: number }).statusCode ||
      (error as { statusCode?: number; status?: number }).status || 500;

    // Handle specific error types
    if ((error as { code?: number }).code === 11000) {
      statusCode = 409;
      const field = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern || {})[0] || 'Field';
      message = `${field} already exists`;
    } else if (error.name === 'ValidationError') {
      statusCode = 400;
      const validationError = error as unknown as { errors?: Record<string, { message: string }> };
      if (validationError.errors) {
        message = Object.values(validationError.errors)
          .map((val) => val.message)
          .join(', ');
      }
    } else if (error.name === 'CastError') {
      statusCode = 400;
      message = 'Invalid ID format provided';
    } else if (error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = ERROR_MESSAGES[401].TOKEN_EXPIRED;
    } else if (error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = ERROR_MESSAGES[401].INVALID_TOKEN;
    } else if (error.message?.includes('E11000')) {
      statusCode = 409;
      message = 'Duplicate entry. This item already exists.';
    } else if (error.name === 'MulterError') {
      statusCode = 400;
      message = error.message;
    }

    message = getErrorMessage(statusCode, error);
  }

  const shouldLog = !isOperationalError(error) || statusCode >= 500;

  if (shouldLog) {
    const logData = {
      statusCode,
      message,
      url: req.originalUrl,
      method: req.method,
      userId: (req as unknown as { user?: { _id: string } }).user?._id?.toString(),
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (statusCode >= 500) {
      logger.error({ ...logData, stack: error.stack, body: req.body && Object.keys(req.body).length > 0 ? '[REDACTED]' : undefined }, 'Server Error');
    } else {
      logger.warn(logData, 'Client Error');
    }
  }

  // Don't expose internal error details in production
  if (statusCode >= 500 && !isOperationalError(error)) {
    message = ERROR_MESSAGES[500].INTERNAL_ERROR;
  }

  const response: Record<string, unknown> = {
    success: false,
    status: statusCode,
    message,
  };

  if (details) {
    response.details = details;
  }

  if (config.isDevelopment()) {
    response.stack = error.stack;
    response.originalError = error.message;
    response.errorName = error.name;
  }

  res.status(statusCode).json(response);
};

// ============================================================================
// Not Found Handler
// ============================================================================

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

// ============================================================================
// Async Handler Wrapper
// ============================================================================

export const asyncHandler = (handler: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

// ============================================================================
// Custom Error Classes
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

// ============================================================================
// Error Code Helpers
// ============================================================================

export const isErrorCode = (error: Error, code: string): boolean => {
  return error instanceof ApiError && error.code === code;
};

export const getErrorCode = (error: Error): string => {
  return error instanceof ApiError ? error.code : 'UNKNOWN_ERROR';
};