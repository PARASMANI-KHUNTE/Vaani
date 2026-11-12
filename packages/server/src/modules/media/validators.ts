/**
 * Media Validators
 * Express-validator chains for media endpoints
 */

import { body, param, query } from 'express-validator';
import { ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../../shared/utils/apiError';
import { CloudinaryFolder, CloudinaryTransformation } from '@chat-app/shared/constants';

// ============================================================================
// Validation Chains
// ============================================================================

export const uploadMediaValidator: ValidationChain[] = [
  // File is validated by multer middleware
  body('folder')
    .optional()
    .isIn(Object.values(CloudinaryFolder))
    .withMessage('Invalid folder'),
  body('transformation')
    .optional()
    .isString()
    .withMessage('Transformation must be a JSON string'),
  body('chatId')
    .optional()
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('messageId')
    .optional()
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a JSON string'),
];

export const signedUploadValidator: ValidationChain[] = [
  body('fileName')
    .isString()
    .notEmpty()
    .withMessage('File name required'),
  body('mimeType')
    .isString()
    .notEmpty()
    .withMessage('MIME type required'),
  body('folder')
    .optional()
    .isIn(Object.values(CloudinaryFolder))
    .withMessage('Invalid folder'),
  body('transformation')
    .optional()
    .isString()
    .withMessage('Transformation must be a JSON string'),
  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a JSON string'),
];

export const confirmUploadValidator: ValidationChain[] = [
  param('publicId')
    .isString()
    .notEmpty()
    .withMessage('Public ID required'),
  body('messageId')
    .optional()
    .isMongoId()
    .withMessage('Invalid message ID'),
  body('chatId')
    .optional()
    .isMongoId()
    .withMessage('Invalid chat ID'),
];

export const moderateMediaValidator: ValidationChain[] = [
  param('publicId')
    .isString()
    .notEmpty()
    .withMessage('Public ID required'),
  body('status')
    .isIn(['approved', 'rejected'])
    .withMessage('Status must be "approved" or "rejected"'),
  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string'),
];

export const deleteMediaValidator: ValidationChain[] = [
  param('publicId')
    .isString()
    .notEmpty()
    .withMessage('Public ID required'),
];

export const getMediaInfoValidator: ValidationChain[] = [
  param('publicId')
    .isString()
    .notEmpty()
    .withMessage('Public ID required'),
];

export const getUserMediaValidator: ValidationChain[] = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be 1-100'),
  query('folder')
    .optional()
    .isIn(Object.values(CloudinaryFolder))
    .withMessage('Invalid folder'),
  query('resourceType')
    .optional()
    .isIn(['image', 'video', 'raw'])
    .withMessage('Invalid resource type'),
];

export const transformedUrlValidator: ValidationChain[] = [
  param('publicId')
    .isString()
    .notEmpty()
    .withMessage('Public ID required'),
  query('transformation')
    .isString()
    .notEmpty()
    .withMessage('Transformation required'),
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