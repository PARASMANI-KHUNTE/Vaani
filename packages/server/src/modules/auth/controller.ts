/**
 * Auth Controller
 * HTTP handlers for authentication endpoints
 */

import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../shared/utils/apiResponse';
import {
  loginWithGoogleProfile,
  refreshAccessToken,
  logout,
  createMobileAuthCode,
  verifyMobileAuthCode,
} from './service.js';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';

// ============================================================================
// Controllers
// ============================================================================

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { idToken } = req.body;

  if (!idToken) {
    throw new ApiError(400, 'Google ID token is required', 'MISSING_ID_TOKEN');
  }

  const result = await loginWithGoogleProfile(idToken);

  return sendCreated(res, 'Login successful', {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(400, 'Refresh token is required', 'MISSING_REFRESH_TOKEN');
  }

  const result = await refreshAccessToken(refreshToken);

  return sendSuccess(res, 200, 'Token refreshed', {
    accessToken: result.accessToken,
  });
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await logout(refreshToken);
  }

  return sendSuccess(res, 200, 'Logged out successfully');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  // req.user is attached by authMiddleware
  const user = req.user;

  if (!user) {
    throw new ApiError(401, 'User not found', 'USER_NOT_FOUND');
  }

  return sendSuccess(res, 200, 'Current user', {
    user: {
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      username: user.username,
      avatar: user.avatar,
      tagline: user.tagline,
      bio: user.bio,
      accountStatus: user.accountStatus,
    },
  });
});

export const issueMobileAuthCode = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user._id.toString();

  const result = await createMobileAuthCode(userId);

  return sendSuccess(res, 200, 'Mobile auth code issued', {
    code: result.code,
    expiresAt: result.expiresAt,
  });
});

export const redeemMobileAuthCode = asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    throw new ApiError(400, 'Auth code is required', 'MISSING_AUTH_CODE');
  }

  const userId = await verifyMobileAuthCode(code);

  if (!userId) {
    throw new ApiError(400, 'Invalid or expired auth code', 'INVALID_AUTH_CODE');
  }

  // Generate tokens for the user
  const user = { _id: userId, email: '', name: '' }; // Minimal user object for token creation
  const { createAccessToken, createRefreshToken } = await import('./service.js');

  const accessToken = createAccessToken(user);
  const { token: refreshToken } = await createRefreshToken(user);

  return sendSuccess(res, 200, 'Mobile auth successful', {
    user: { _id: userId },
    accessToken,
    refreshToken,
  });
});