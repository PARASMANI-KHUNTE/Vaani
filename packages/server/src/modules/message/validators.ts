/**
 * Message Validators
 * Express-validator chains for message endpoints
 */

import { body, param, query } from 'express-validator';
import { ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../../shared/utils/apiError';
import { Limits } from '@chat-app/shared/constants';

// ============================================================================
// Validation Chains
// ============================================================================

export const sendMessageValidator: ValidationChain[] = [
  body('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('content')
    .optional()
    .isString()
    .trim()
    .isLength({ max: Limits.MAX_MESSAGE_LENGTH })
    .withMessage(`Message too long (max ${Limits.MAX_MESSAGE_LENGTH} chars)`),
  body('type')
    .optional()
    .isIn(['text', 'image', 'video', 'audio', 'file', 'location', 'contact'])
    .withMessage('Invalid message type'),
  body('replyToId')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply message ID'),
  body('media')
    .optional()
    .isObject()
    .withMessage('Media must be an object'),
  body('media.url')
    .optional()
    .isURL()
    .withMessage('Invalid media URL'),
  body('media.thumbnailUrl')
    .optional()
    .isURL()
    .withMessage('Invalid thumbnail URL'),
  body('media.publicId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Public ID required for media'),
  body('media.format')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Format required for media'),
  body('media.width')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid width'),
  body('media.height')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid height'),
  body('media.duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid duration'),
  body('media.fileSize')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Invalid file size'),
  body('media.fileName')
    .optional()
    .isString()
    .withMessage('Invalid file name'),
  body('media.mimeType')
    .optional()
    .isString()
    .withMessage('Invalid MIME type'),
  body('clientTempId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Invalid client temp ID'),
];

export const editMessageValidator: ValidationChain[] = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('content')
    .isString()
    .trim()
    .isLength({ min: 1, max: Limits.MAX_MESSAGE_LENGTH })
    .withMessage(`Content required (1-${Limits.MAX_MESSAGE_LENGTH} chars)`),
];

export const deleteMessageValidator: ValidationChain[] = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('scope')
    .optional()
    .isIn(['me', 'everyone'])
    .withMessage('Scope must be "me" or "everyone"'),
];

export const forwardMessageValidator: ValidationChain[] = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('targetChatId')
    .isMongoId()
    .withMessage('Invalid target chat ID'),
];

export const reactionValidator: ValidationChain[] = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('emoji')
    .isString()
    .notEmpty()
    .isLength({ max: 10 })
    .withMessage('Emoji required (max 10 chars)'),
];

export const markMessageValidator: ValidationChain[] = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
];

export const markChatSeenValidator: ValidationChain[] = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  query('before')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format (use ISO 8601)'),
];

export const chatIdParamValidator: ValidationChain[] = [
  param('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
];

export const messageIdParamValidator: ValidationChain[] = [
  param('messageId')
    .isMongoId()
    .withMessage('Invalid message ID'),
];

export const getMessagesQueryValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
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