/**
 * User Validators
 * Express-validator chains for user endpoints
 */

import { body, param, query } from 'express-validator';
import { validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/utils/apiError';
import { Limits } from '@chat-app/shared/constants';

// ============================================================================
// Validation Chains
// ============================================================================

export const updateProfileValidator: ValidationChain[] = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: Limits.MAX_USERNAME_LENGTH })
    .withMessage(`Name must be 1-${Limits.MAX_USERNAME_LENGTH} characters`),
  body('tagline')
    .optional()
    .isString()
    .trim()
    .isLength({ max: Limits.MAX_TAGLINE_LENGTH })
    .withMessage(`Tagline must be max ${Limits.MAX_TAGLINE_LENGTH} characters`),
  body('bio')
    .optional()
    .isString()
    .trim()
    .isLength({ max: Limits.MAX_BIO_LENGTH })
    .withMessage(`Bio must be max ${Limits.MAX_BIO_LENGTH} characters`),
  body('username')
    .optional()
    .isString()
    .trim()
    .isLength({ min: Limits.MIN_USERNAME_LENGTH, max: Limits.MAX_USERNAME_LENGTH })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(`Username must be ${Limits.MIN_USERNAME_LENGTH}-${Limits.MAX_USERNAME_LENGTH} characters, alphanumeric and underscore only`),
];

export const updateSettingsValidator: ValidationChain[] = [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system'),
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),
  body('notifications.messages')
    .optional()
    .isBoolean()
    .withMessage('Messages notification must be boolean'),
  body('notifications.reactions')
    .optional()
    .isBoolean()
    .withMessage('Reactions notification must be boolean'),
  body('notifications.friendRequests')
    .optional()
    .isBoolean()
    .withMessage('Friend requests notification must be boolean'),
  body('notifications.groupInvites')
    .optional()
    .isBoolean()
    .withMessage('Group invites notification must be boolean'),
  body('notifications.sounds')
    .optional()
    .isBoolean()
    .withMessage('Sounds notification must be boolean'),
  body('privacy')
    .optional()
    .isObject()
    .withMessage('Privacy must be an object'),
  body('privacy.lastSeen')
    .optional()
    .isIn(['everyone', 'contacts', 'nobody'])
    .withMessage('Last seen privacy must be everyone, contacts, or nobody'),
  body('privacy.profilePhoto')
    .optional()
    .isIn(['everyone', 'contacts', 'nobody'])
    .withMessage('Profile photo privacy must be everyone, contacts, or nobody'),
  body('privacy.about')
    .optional()
    .isIn(['everyone', 'contacts', 'nobody'])
    .withMessage('About privacy must be everyone, contacts, or nobody'),
  body('privacy.groups')
    .optional()
    .isIn(['everyone', 'contacts', 'nobody'])
    .withMessage('Groups privacy must be everyone, contacts, or nobody'),
];

export const userIdParamValidator: ValidationChain[] = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
];

export const searchUsersValidator: ValidationChain[] = [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
];

export const pushTokenValidator: ValidationChain[] = [
  body('pushToken')
    .isString()
    .notEmpty()
    .withMessage('Push token is required'),
  body('platform')
    .isIn(['web', 'ios', 'android'])
    .withMessage('Platform must be web, ios, or android'),
];

export const blockUserValidator: ValidationChain[] = [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
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