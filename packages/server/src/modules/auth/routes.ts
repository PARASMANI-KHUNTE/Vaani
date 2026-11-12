/**
 * Auth Routes
 * Authentication endpoints
 */

import { Router, RequestHandler } from 'express';
import { googleLogin, refreshToken, logoutUser, getMe, issueMobileAuthCode, redeemMobileAuthCode } from './controller';
import { googleLoginValidator, refreshTokenValidator, mobileAuthCodeValidator, validate } from './validators';
import { authMiddleware } from '../../shared/middleware/auth';

const router: Router = Router();

// Public routes
router.post('/login', googleLoginValidator, validate, googleLogin);
router.post('/refresh', refreshTokenValidator, validate, refreshToken);
router.post('/mobile/code/redeem', mobileAuthCodeValidator, validate, redeemMobileAuthCode);

// Protected routes
router.post('/logout', authMiddleware, logoutUser);
router.get('/me', authMiddleware, getMe);
router.post('/mobile/code', authMiddleware, issueMobileAuthCode);

export { router as authRoutes };