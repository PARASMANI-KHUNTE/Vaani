/**
 * Auth Validators
 * Express-validator chains for auth endpoints
 */

import { body } from 'express-validator';
import { validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/utils/apiError';

// ============================================================================
// Validation Chains
// ============================================================================

export const googleLoginValidator: ValidationChain[] = [
  body('idToken')
    .isString()
    .notEmpty()
    .withMessage('Google ID token is required'),
];

export const refreshTokenValidator: ValidationChain[] = [
  body('refreshToken')
    .isString()
    .notEmpty()
    .withMessage('Refresh token is required'),
];

export const mobileAuthCodeValidator: ValidationChain[] = [
  body('code')
    .isString()
    .isLength({ min: 6, max: 6 })
    .matches(/^\d{6}$/)
    .withMessage('Auth code must be 6 digits'),
];

// ============================================================================
// Validation Middleware
// ============================================================================

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e: any) => `${e.path}: ${e.msg}`).join('; ');
    throw new ApiError(400, messages, 'VALIDATION_ERROR');
  }
  next();
};