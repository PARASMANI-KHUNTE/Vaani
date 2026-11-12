/**
 * System Validators
 * Express-validator chains for system endpoints
 */

import { body, param, query } from 'express-validator';
import { ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiError } from '../../shared/utils/apiError';

// ============================================================================
// Validation Chains
// ============================================================================

export const settingKeyParamValidator: ValidationChain[] = [
  param('key')
    .isString()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Setting key required (max 100 chars)'),
];

export const setSettingValidator: ValidationChain[] = [
  param('key')
    .isString()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Setting key required (max 100 chars)'),
  body('value')
    .notEmpty()
    .withMessage('Value is required'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description too long (max 500 chars)'),
];

export const metricNameParamValidator: ValidationChain[] = [
  param('name')
    .isString()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Metric name required (max 100 chars)'),
];

export const recordMetricValidator: ValidationChain[] = [
  body('name')
    .isString()
    .notEmpty()
    .isLength({ max: 100 })
    .withMessage('Metric name required (max 100 chars)'),
  body('value')
    .isNumeric()
    .withMessage('Value must be a number'),
  body('tags')
    .optional()
    .isObject()
    .withMessage('Tags must be an object'),
];

export const getMetricsQueryValidator: ValidationChain[] = [
  query('start')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format (use ISO 8601)'),
  query('end')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format (use ISO 8601)'),
  query('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a JSON string'),
];

export const auditLogsQueryValidator: ValidationChain[] = [
  query('actorId')
    .optional()
    .isMongoId()
    .withMessage('Invalid actor ID'),
  query('action')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Action too long'),
  query('resourceType')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('Resource type too long'),
  query('resourceId')
    .optional()
    .isMongoId()
    .withMessage('Invalid resource ID'),
  query('start')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format (use ISO 8601)'),
  query('end')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format (use ISO 8601)'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be 1-200'),
];

// ============================================================================
// Validation Middleware
// ============================================================================

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e: any) => `${e.path || e.param}: ${e.msg}`).join('; ');
    throw new ApiError(400, messages, 'VALIDATION_ERROR');
  }
  next();
};