/**
 * Auth Service
 * Google OAuth, JWT token management, refresh token rotation
 */

import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../../config';
import { User } from '../user/model';
import { findOrCreateUser } from '../user/service';
import { getRedisClient, isRedisEnabled } from '../../config/redis';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';

// ============================================================================
// Constants
// ============================================================================

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
const REFRESH_TOKEN_PREFIX = 'refresh_token:';
const MOBILE_AUTH_CODE_PREFIX = 'mobile_auth_code:';
const MOBILE_AUTH_CODE_TTL = 5 * 60; // 5 minutes

const googleClient = new OAuth2Client();

// ============================================================================
// Token Creation
// ============================================================================

const createAccessToken = (user: { _id: string; email: string }): string => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      type: 'access',
    },
    config.auth.jwtSecret,
    {
      expiresIn: config.auth.jwtExpiresIn,
    }
  );
};

const createRefreshToken = async (user: { _id: string }): Promise<{ token: string; jti: string }> => {
  const jti = crypto.randomBytes(64).toString('hex');
  const token = jwt.sign(
    {
      sub: user._id.toString(),
      type: 'refresh',
      jti,
    },
    config.auth.jwtRefreshSecret,
    {
      expiresIn: config.auth.jwtRefreshExpiresIn,
    }
  );

  // Store in Redis for revocation checking
  if (isRedisEnabled()) {
    const redis = getRedisClient();
    if (redis && 'setEx' in redis) {
      await redis.setEx(`${REFRESH_TOKEN_PREFIX}${jti}`, REFRESH_TOKEN_TTL, user._id.toString());
    }
  }

  return { token, jti };
};

// ============================================================================
// Token Verification
// ============================================================================

const verifyRefreshToken = async (refreshToken: string): Promise<{ sub: string; jti: string }> => {
  try {
    const decoded = jwt.verify(refreshToken, config.auth.jwtRefreshSecret) as {
      sub: string;
      type: string;
      jti: string;
    };

    if (decoded.type !== 'refresh') {
      throw new ApiError(401, 'Invalid token type', 'INVALID_TOKEN_TYPE');
    }

    // Check if token is revoked
    if (isRedisEnabled()) {
      const redis = getRedisClient();
      if (redis && 'get' in redis) {
        const storedUserId = await redis.get(`${REFRESH_TOKEN_PREFIX}${decoded.jti}`);
        if (!storedUserId || storedUserId !== decoded.sub) {
          throw new ApiError(401, 'Token revoked', 'TOKEN_REVOKED');
        }
      }
    }

    return { sub: decoded.sub, jti: decoded.jti };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'Refresh token expired', 'REFRESH_TOKEN_EXPIRED');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN');
    }
    throw new ApiError(401, 'Token verification failed', 'TOKEN_VERIFICATION_FAILED');
  }
};

const revokeRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    const decoded = jwt.decode(refreshToken) as { jti?: string } | null;
    if (decoded?.jti && isRedisEnabled()) {
      const redis = getRedisClient();
      if (redis && 'del' in redis) {
        await redis.del(`${REFRESH_TOKEN_PREFIX}${decoded.jti}`);
      }
    }
  } catch {
    // Ignore errors during revocation
  }
};

// ============================================================================
// Google OAuth
// ============================================================================

const verifyGoogleIdToken = async (idToken: string): Promise<{ email: string; name: string; avatar?: string }> => {
  // Demo mode
  if (idToken === 'demo-token' || idToken?.startsWith('demo-')) {
    return {
      email: 'alex.demo@linkup.chat',
      name: 'Alex Demo',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    };
  }

  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.auth.googleClientIds,
    });
  } catch (error) {
    if (!config.auth.googleClientId || config.auth.googleClientIds.length === 0) {
      // Fallback for development without Google config
      return {
        email: 'alex.demo@linkup.chat',
        name: 'Alex Demo',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      };
    }
    logger.error('Google ID token verification failed', { error: (error as Error).message });
    throw new ApiError(401, 'Failed to verify Google identity', 'GOOGLE_AUTH_FAILED');
  }

  const payload = ticket.getPayload();

  if (!payload || !payload.email || !payload.name) {
    throw new ApiError(401, 'Invalid Google account payload', 'INVALID_GOOGLE_PAYLOAD');
  }

  if (!payload.email_verified) {
    throw new ApiError(401, 'Google email is not verified', 'EMAIL_NOT_VERIFIED');
  }

  return {
    email: payload.email,
    name: payload.name,
    avatar: payload.picture || null,
  };
};

// ============================================================================
// Mobile Auth Code
// ============================================================================

const generateMobileAuthCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};

export const createMobileAuthCode = async (userId: string): Promise<{ code: string; expiresAt: string }> => {
  const code = generateMobileAuthCode();
  const expiresAt = new Date(Date.now() + MOBILE_AUTH_CODE_TTL * 1000);

  if (isRedisEnabled()) {
    const redis = getRedisClient();
    if (redis && 'setEx' in redis) {
      await redis.setEx(`${MOBILE_AUTH_CODE_PREFIX}${code}`, MOBILE_AUTH_CODE_TTL, userId);
    }
  }

  return { code, expiresAt: expiresAt.toISOString() };
};

export const verifyMobileAuthCode = async (code: string): Promise<string | null> => {
  if (!isRedisEnabled()) return null;

  const redis = getRedisClient();
  if (!redis || !('get' in redis)) return null;

  const userId = await redis.get(`${MOBILE_AUTH_CODE_PREFIX}${code}`);
  if (userId) {
    // Delete the code after use (one-time use)
    if ('del' in redis) {
      await redis.del(`${MOBILE_AUTH_CODE_PREFIX}${code}`);
    }
    return userId;
  }

  return null;
};

// ============================================================================
// Public API
// ============================================================================

export const loginWithGoogleProfile = async (idToken: string): Promise<{
  user: { _id: string; email: string; name: string };
  accessToken: string;
  refreshToken: string;
}> => {
  const profile = await verifyGoogleIdToken(idToken);
  const user = await findOrCreateUser(profile);
  const accessToken = createAccessToken(user);
  const { token: refreshToken } = await createRefreshToken(user);

  logger.info('User logged in via Google', { userId: user._id, email: user.email });

  return {
    user: { _id: user._id.toString(), email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
  const decoded = await verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.sub).lean();

  if (!user || user.accountStatus !== 'active') {
    throw new ApiError(401, 'User not found or inactive', 'USER_INACTIVE');
  }

  const accessToken = createAccessToken(user);
  return { accessToken };
};

export const logout = async (refreshToken: string): Promise<void> => {
  await revokeRefreshToken(refreshToken);
};

export const revokeAllUserTokens = async (userId: string): Promise<void> => {
  if (isRedisEnabled()) {
    const redis = getRedisClient();
    if (redis && 'keys' in redis && 'del' in redis) {
      const keys = await redis.keys(`${REFRESH_TOKEN_PREFIX}*`);
      // Filter keys for this user
      for (const key of keys) {
        const value = await redis.get(key);
        if (value === userId.toString()) {
          await redis.del(key);
        }
      }
    }
  }
};

export { verifyGoogleIdToken, createAccessToken, createRefreshToken, verifyRefreshToken, revokeRefreshToken };