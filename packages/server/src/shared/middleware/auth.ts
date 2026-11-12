/**
 * Authentication Middleware
 * JWT verification and user attachment
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { User } from '../../modules/user/model';
import { ApiError } from '../../shared/utils/apiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';

interface JWTPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: mongoose.Document & { _id: mongoose.Types.ObjectId; accountStatus: string; [key: string]: unknown };
      auth?: JWTPayload;
    }
  }
}

import mongoose from 'mongoose';

export const authMiddleware = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization token is required');
  }

  const token = authHeader.split(' ')[1];

  let decodedToken: JWTPayload;
  try {
    decodedToken = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid token');
    }
    throw new ApiError(401, 'Token verification failed');
  }

  // Check token type
  if (decodedToken.type !== 'access') {
    throw new ApiError(401, 'Invalid token type');
  }

  let user;
  if (mongoose.connection.readyState !== 1) {
    // Fallback for development when DB is not connected
    user = {
      _id: new mongoose.Types.ObjectId(decodedToken.sub),
      username: 'demouser',
      name: 'Demo User',
      email: decodedToken.email,
      accountStatus: 'active',
      avatar: null,
      tagline: 'Exploring in preview mode',
      bio: 'Welcome!',
      friends: [],
      blockedUsers: [],
      save: async () => {},
    } as unknown as mongoose.Document & { _id: mongoose.Types.ObjectId; accountStatus: string; [key: string]: unknown };
  } else {
    user = await User.findById(decodedToken.sub).lean();
  }

  if (!user) {
    throw new ApiError(401, 'Authenticated user no longer exists');
  }

  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted');
  }

  req.user = user;
  req.auth = decodedToken;

  next();
});

export const optionalAuthMiddleware = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;

    if (decodedToken.type !== 'access') {
      return next();
    }

    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decodedToken.sub).lean();
      if (user && user.accountStatus === 'active') {
        req.user = user;
        req.auth = decodedToken;
      }
    }
  } catch {
    // Ignore auth errors for optional auth
  }

  next();
});

export const requireActiveUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required');
  }

  if (req.user.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted');
  }

  next();
});

// Export types
export type { JWTPayload };