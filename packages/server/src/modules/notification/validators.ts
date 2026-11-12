/**
 * Notification Validators
 * Express-validator chains for notification endpoints
 */

import { param, query } from 'express-validator';
import { ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../../shared/utils/apiError';
import { NotificationType } from '@chat-app/shared/types';

// ============================================================================
// Validation Chains
// ============================================================================

export const notificationIdParamValidator: ValidationChain[] = [
  param('notificationId')
    .isMongoId()
    .withMessage('Invalid notification ID'),
];

export const getNotificationsQueryValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('unreadOnly must be a boolean'),
  query('type')
    .optional()
    .isIn(Object.values(NotificationType))
    .withMessage('Invalid notification type'),
  query('before')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format (use ISO 8601)'),
];

// ============================================================================
// Validation Middleware
// ============================================================================

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    throw new ApiError(400, messages, 'VALIDATION_ERROR');
  }
  next();
};