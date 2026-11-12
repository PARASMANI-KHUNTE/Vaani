/**
 * Authentication Middleware
 * JWT verification and user attachment
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { User, IUser } from '../../modules/user/model';
import { ApiError } from '../../shared/utils/apiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import mongoose from 'mongoose';

interface JWTPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
  iat: number;
  exp: number;
}

// Type for user object attached to request (from User.findById().lean())
interface AuthenticatedUser {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  tagline?: string;
  bio?: string;
  accountStatus: 'active' | 'disabled' | 'deleted';
  isOnline: boolean;
  lastSeen?: Date;
  friends: mongoose.Types.ObjectId[];
  friendRequests: IUser['friendRequests'];
  blockedUsers: mongoose.Types.ObjectId[];
  pushTokens: IUser['pushTokens'];
  settings: IUser['settings'];
  role: 'user' | 'admin' | 'moderator';
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      auth?: JWTPayload;
    }
  }
}

export const authMiddleware = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authorization token is required', 'MISSING_TOKEN');
  }

  const token = authHeader.split(' ')[1];

  let decodedToken: JWTPayload;
  try {
    decodedToken = jwt.verify(token, config.auth.jwtSecret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Token expired', 'TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid token', 'INVALID_TOKEN');
    }
    throw new ApiError(401, 'Token verification failed', 'TOKEN_VERIFICATION_FAILED');
  }

  // Check token type
  if (decodedToken.type !== 'access') {
    throw new ApiError(401, 'Invalid token type', 'INVALID_TOKEN_TYPE');
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
    throw new ApiError(401, 'Authenticated user no longer exists', 'USER_NOT_FOUND');
  }

  if (user.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_DISABLED');
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
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  if (req.user.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_DISABLED');
  }

  next();
});

// Role-based access control middleware
export const requireRole = (...allowedRoles: string[]): RequestHandler => {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
    }

    // Check if user has a role property (from user model or JWT)
    const userRole = (req.user as Record<string, unknown>).role as string | undefined;

    if (!userRole || !allowedRoles.includes(userRole)) {
      throw new ApiError(403, 'Insufficient permissions', 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  });
};

// Export types
export type { JWTPayload };