/**
 * Request Validation Middleware
 * Express-validator integration with standardized error formatting
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, ValidationError } from 'express-validator';
import { ApiError } from '../../shared/utils/apiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';

// ============================================================================
// Validation Error Formatter
// ============================================================================

interface FormattedValidationError {
  field: string;
  message: string;
  value?: unknown;
  location: string;
}

const formatValidationErrors = (errors: ValidationError[]): FormattedValidationError[] => {
  return errors.map((error) => {
    const err = error as any;
    if ('path' in error) {
      return {
        field: error.path,
        message: error.msg,
        value: error.value,
        location: err.location || 'unknown',
      };
    }
    return {
      field: 'unknown',
      message: error.msg,
      location: err.location || 'unknown',
    };
  });
};

// ============================================================================
// Validation Middleware
// ============================================================================

export const validateRequest = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());

    // Create a user-friendly message
    const messages = formattedErrors.map((e) => `${e.field}: ${e.message}`).join('; ');

    throw new ApiError(400, messages, 'VALIDATION_ERROR', {
      validationErrors: formattedErrors,
    });
  }

  next();
});

// ============================================================================
// Validation Chain Helpers
// ============================================================================

// Common validation chains that can be reused
export const commonValidators = {
  // MongoDB ObjectId
  objectId: (field: string, location: 'body' | 'params' | 'query' = 'body') =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (value && !/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Invalid ID format');
      }
    },

  // UUID
  uuid: (field: string, location: 'body' | 'params' | 'query' = 'body') =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (value && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
        throw new Error('Invalid UUID format');
      }
    },

  // Email
  email: (field: string, location: 'body' | 'params' | 'query' = 'body') =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Invalid email format');
      }
    },

  // Username (alphanumeric + underscore, 3-30 chars)
  username: (field: string, location: 'body' | 'params' | 'query' = 'body') =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (value && !/^[a-zA-Z0-9_]{3,30}$/.test(value)) {
        throw new Error('Username must be 3-30 characters, alphanumeric and underscore only');
      }
    },

  // Non-empty string
  notEmpty: (field: string, location: 'body' | 'params' | 'query' = 'body', customMessage?: string) =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        throw new Error(customMessage || `${field} is required`);
      }
    },

  // String length
  stringLength: (field: string, min: number, max: number, location: 'body' | 'params' | 'query' = 'body') =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (value && (value.length < min || value.length > max)) {
        throw new Error(`${field} must be between ${min} and ${max} characters`);
      }
    },

  // Array with min/max items
  arrayLength: (field: string, min: number, max: number, location: 'body' | 'params' | 'query' = 'body') =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (value && (!Array.isArray(value) || value.length < min || value.length > max)) {
        throw new Error(`${field} must be an array with ${min} to ${max} items`);
      }
    },

  // Enum validation
  isIn: (field: string, values: unknown[], location: 'body' | 'params' | 'query' = 'body') =>
    (req: Request) => {
      const value = req[location]?.[field];
      if (value !== undefined && !values.includes(value)) {
        throw new Error(`${field} must be one of: ${values.join(', ')}`);
      }
    },

  // Custom validator
  custom: (field: string, validator: (value: unknown) => boolean | Promise<boolean>, message: string, location: 'body' | 'params' | 'query' = 'body') =>
    async (req: Request) => {
      const value = req[location]?.[field];
      if (value !== undefined) {
        const result = await validator(value);
        if (!result) {
          throw new Error(message);
        }
      }
    },
};

// ============================================================================
// Validation Chain Builders (for express-validator)
// ============================================================================

export const buildValidationChains = (
  validators: ValidationChain[]
): ValidationChain[] => {
  return validators;
};

// Pre-built validation chains for common scenarios
export const validationChains = {
  // Pagination
  pagination: [
    // query('page').optional().isInt({ min: 1 }).toInt(),
    // query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],

  // Search query
  search: [
    // query('q').isString().trim().notEmpty().isLength({ min: 1, max: 100 }),
  ],

  // ID parameter
  idParam: (paramName: string = 'id') => [
    // param(paramName).isMongoId().withMessage('Invalid ID format'),
  ],

  // Create direct chat
  createDirectChat: [
    // body('participantId').isMongoId().withMessage('Invalid participant ID'),
  ],

  // Create group chat
  createGroupChat: [
    // body('groupName').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Group name required (1-100 chars)'),
    // body('participantIds').isArray({ min: 1, max: 499 }).withMessage('At least 1 participant required (max 499)'),
    // body('participantIds.*').isMongoId().withMessage('Invalid participant ID'),
    // body('groupDescription').optional().isString().trim().isLength({ max: 500 }).withMessage('Description too long (max 500 chars)'),
  ],

  // Update group
  updateGroup: [
    // body('groupName').optional().isString().trim().isLength({ min: 1, max: 100 }).withMessage('Group name 1-100 chars'),
    // body('groupAvatar').optional().isURL().withMessage('Invalid avatar URL'),
    // body('groupDescription').optional().isString().trim().isLength({ max: 500 }).withMessage('Description too long'),
  ],

  // Send message
  sendMessage: [
    // body('chatId').isMongoId().withMessage('Invalid chat ID'),
    // body('content').optional().isString().trim().isLength({ max: 10000 }).withMessage('Message too long (max 10000 chars)'),
    // body('type').optional().isIn(['text', 'image', 'video', 'audio', 'file', 'location', 'contact']).withMessage('Invalid message type'),
    // body('replyToId').optional().isMongoId().withMessage('Invalid reply message ID'),
    // body('media').optional().isObject().withMessage('Media must be an object'),
  ],

  // Edit message
  editMessage: [
    // body('messageId').isMongoId().withMessage('Invalid message ID'),
    // body('chatId').isMongoId().withMessage('Invalid chat ID'),
    // body('content').isString().trim().isLength({ min: 1, max: 10000 }).withMessage('Content required (1-10000 chars)'),
  ],

  // Delete message
  deleteMessage: [
    // param('messageId').isMongoId().withMessage('Invalid message ID'),
    // query('scope').isIn(['me', 'everyone']).withMessage('Scope must be "me" or "everyone"'),
  ],

  // Reaction
  reaction: [
    // body('messageId').isMongoId().withMessage('Invalid message ID'),
    // body('emoji').isString().isLength({ min: 1, max: 10 }).withMessage('Emoji required (max 10 chars)'),
  ],

  // Update profile
  updateProfile: [
    // body('name').optional().isString().trim().isLength({ min: 1, max: 50 }).withMessage('Name 1-50 chars'),
    // body('tagline').optional().isString().trim().isLength({ max: 50 }).withMessage('Tagline max 50 chars'),
    // body('bio').optional().isString().trim().isLength({ max: 200 }).withMessage('Bio max 200 chars'),
    // body('username').optional().isString().trim().matches(/^[a-zA-Z0-9_]{3,30}$/).withMessage('Username 3-30 chars, alphanumeric + underscore'),
  ],

  // Friend action
  friendAction: [
    // param('userId').isMongoId().withMessage('Invalid user ID'),
  ],

  // Block user
  blockUser: [
    // body('userId').isMongoId().withMessage('Invalid user ID'),
  ],

  // Group invite
  groupInvite: [
    // body('expiresInHours').optional().isInt({ min: 1, max: 8760 }).withMessage('Expires in 1-8760 hours'),
    // body('maxUses').optional().isInt({ min: 1, max: 10000 }).withMessage('Max uses 1-10000'),
  ],

  // Add group members
  addGroupMembers: [
    // body('memberIds').isArray({ min: 1, max: 50 }).withMessage('1-50 member IDs required'),
    // body('memberIds.*').isMongoId().withMessage('Invalid member ID'),
  ],
};

// ============================================================================
// Sanitization Middleware
// ============================================================================

export const sanitizeRequest = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  // Trim string fields in body
  if (req.body && typeof req.body === 'object') {
    const trimStrings = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          result[key] = value.trim();
        } else if (Array.isArray(value)) {
          result[key] = value.map((v) => (typeof v === 'string' ? v.trim() : v));
        } else if (value && typeof value === 'object') {
          result[key] = trimStrings(value as Record<string, unknown>);
        } else {
          result[key] = value;
        }
      }
      return result;
    };
    req.body = trimStrings(req.body);
  }

  next();
});