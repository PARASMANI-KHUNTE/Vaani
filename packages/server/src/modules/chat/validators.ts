/**
 * Chat Validators
 * Express-validator chains for chat endpoints
 */

import { body, param, query } from 'express-validator';
import { validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/utils/apiError';
import { Limits } from '@chat-app/shared/constants';

// ============================================================================
// Validation Chains
// ============================================================================

export const createDirectChatValidator: ValidationChain[] = [
  body('participantId')
    .isMongoId()
    .withMessage('Invalid participant ID'),
];

export const createGroupChatValidator: ValidationChain[] = [
  body('groupName')
    .isString()
    .trim()
    .isLength({ min: 1, max: Limits.MAX_GROUP_NAME_LENGTH })
    .withMessage(`Group name required (1-${Limits.MAX_GROUP_NAME_LENGTH} chars)`),
  body('participantIds')
    .isArray({ min: 1, max: Limits.MAX_GROUP_MEMBERS - 1 })
    .withMessage(`At least 1 participant required (max ${Limits.MAX_GROUP_MEMBERS - 1})`),
  body('participantIds.*')
    .isMongoId()
    .withMessage('Invalid participant ID'),
  body('groupDescription')
    .optional()
    .isString()
    .trim()
    .isLength({ max: Limits.MAX_GROUP_DESCRIPTION_LENGTH })
    .withMessage(`Description too long (max ${Limits.MAX_GROUP_DESCRIPTION_LENGTH} chars)`),
  body('groupAvatar')
    .optional()
    .isURL()
    .withMessage('Invalid avatar URL'),
];

export const updateGroupValidator: ValidationChain[] = [
  body('groupName')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: Limits.MAX_GROUP_NAME_LENGTH })
    .withMessage(`Group name 1-${Limits.MAX_GROUP_NAME_LENGTH} chars`),
  body('groupAvatar')
    .optional()
    .isURL()
    .withMessage('Invalid avatar URL'),
  body('groupDescription')
    .optional()
    .isString()
    .trim()
    .isLength({ max: Limits.MAX_GROUP_DESCRIPTION_LENGTH })
    .withMessage(`Description too long (max ${Limits.MAX_GROUP_DESCRIPTION_LENGTH} chars)`),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
];

export const addGroupMembersValidator: ValidationChain[] = [
  body('memberIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('1-50 member IDs required'),
  body('memberIds.*')
    .isMongoId()
    .withMessage('Invalid member ID'),
];

export const promoteDemoteAdminValidator: ValidationChain[] = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  param('memberId')
    .isMongoId()
    .withMessage('Invalid member ID'),
];

export const transferOwnershipValidator: ValidationChain[] = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('nextOwnerId')
    .isMongoId()
    .withMessage('Invalid owner ID'),
];

export const groupInviteValidator: ValidationChain[] = [
  body('expiresInHours')
    .optional()
    .isInt({ min: 1, max: 8760 })
    .withMessage('Expires in 1-8760 hours'),
  body('maxUses')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max uses 1-10000'),
];

export const chatStateValidator: ValidationChain[] = [
  body('clearedAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('hidden')
    .optional()
    .isBoolean()
    .withMessage('Hidden must be boolean'),
  body('manualUnread')
    .optional()
    .isBoolean()
    .withMessage('Manual unread must be boolean'),
  body('archivedAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('pinnedAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('mutedUntil')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  body('notificationsMuted')
    .optional()
    .isBoolean()
    .withMessage('Notifications muted must be boolean'),
];

export const chatIdParamValidator: ValidationChain[] = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
];

export const memberIdParamValidator: ValidationChain[] = [
  param('memberId')
    .isMongoId()
    .withMessage('Invalid member ID'),
];

export const inviteTokenParamValidator: ValidationChain[] = [
  param('inviteToken')
    .isString()
    .notEmpty()
    .withMessage('Invite token required'),
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