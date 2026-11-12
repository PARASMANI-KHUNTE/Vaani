/**
 * Rate Limiting Middleware
 * Multiple rate limiters for different endpoint types
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { config } from '../../config';
import { RateLimitKeys, RateLimitDefaults } from '@chat-app/shared/constants';
import { cache, isRedisEnabled } from '../../config/redis';
import { logger } from '../../shared/utils/logger';
import { ApiError } from '../../shared/utils/apiError';

// ============================================================================
// Custom Store for Redis-backed rate limiting
// ============================================================================

class RedisRateLimitStore {
  private prefix: string;

  constructor(prefix: string = 'rl:') {
    this.prefix = prefix;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: Date }> {
    if (!isRedisEnabled()) {
      // In-memory fallback
      return { totalHits: 1, resetTime: new Date(Date.now() + 60000) };
    }

    const fullKey = `${this.prefix}${key}`;
    const current = await cache.get<{ hits: number; resetTime: number }>(fullKey);

    if (!current) {
      const resetTime = Date.now() + config.rateLimit.windowMs;
      await cache.set(fullKey, { hits: 1, resetTime }, Math.ceil(config.rateLimit.windowMs / 1000));
      return { totalHits: 1, resetTime: new Date(resetTime) };
    }

    const newHits = current.hits + 1;
    await cache.set(fullKey, { hits: newHits, resetTime: current.resetTime }, Math.ceil((current.resetTime - Date.now()) / 1000));
    return { totalHits: newHits, resetTime: new Date(current.resetTime) };
  }

  async decrement(key: string): Promise<void> {
    if (!isRedisEnabled()) return;
    const fullKey = `${this.prefix}${key}`;
    const current = await cache.get<{ hits: number; resetTime: number }>(fullKey);
    if (current && current.hits > 0) {
      await cache.set(fullKey, { hits: current.hits - 1, resetTime: current.resetTime }, Math.ceil((current.resetTime - Date.now()) / 1000));
    }
  }

  async resetKey(key: string): Promise<void> {
    if (!isRedisEnabled()) return;
    await cache.del(`${this.prefix}${key}`);
  }
}

// ============================================================================
// Rate Limiter Factory
// ============================================================================

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request, res: Response) => boolean;
  message?: string;
  statusCode?: number;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

const createRateLimiter = (options: RateLimiterOptions = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    max = config.rateLimit.maxRequests,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    skip = () => false,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    standardHeaders = true,
    legacyHeaders = false,
  } = options;

  const store = new RedisRateLimitStore();

  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    skip,
    message: { success: false, error: message },
    statusCode,
    standardHeaders,
    legacyHeaders,
    store: {
      increment: async (key: string) => {
        const result = await store.increment(key);
        return {
          totalHits: result.totalHits,
          resetTime: result.resetTime,
        };
      },
      decrement: (key: string) => store.decrement(key),
      resetKey: (key: string) => store.resetKey(key),
    },
    handler: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userId: (req as unknown as { user?: { _id: string } }).user?._id,
      });
      res.status(statusCode).json({ success: false, error: message });
    },
  });
};

// ============================================================================
// Pre-configured Rate Limiters
// ============================================================================

// Auth rate limiters
export const authLoginLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.AUTH_LOGIN],
  keyGenerator: (req) => `auth:login:${req.ip}`,
  message: 'Too many login attempts, please try again later',
});

export const authRegisterLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.AUTH_REGISTER],
  keyGenerator: (req) => `auth:register:${req.ip}`,
  message: 'Too many registration attempts, please try again later',
});

export const authRefreshLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.AUTH_REFRESH],
  keyGenerator: (req) => `auth:refresh:${req.ip}`,
  message: 'Too many token refresh attempts, please try again later',
});

// API rate limiters
export const apiGeneralLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.API_GENERAL],
  keyGenerator: (req) => `api:general:${req.ip}`,
});

export const apiChatsLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.API_CHATS],
  keyGenerator: (req) => `api:chats:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
});

export const apiMessagesLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.API_MESSAGES],
  keyGenerator: (req) => `api:messages:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
});

export const apiUploadLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.API_UPLOAD],
  keyGenerator: (req) => `api:upload:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
  message: 'Upload limit reached, please wait before uploading again',
});

export const apiGroupMutationLimiter = createRateLimiter({
  ...RateLimitDefaults[RateLimitKeys.API_GROUP_MUTATION],
  keyGenerator: (req) => `api:group:mutation:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
  message: 'Too many group modifications, please slow down',
});

// Socket rate limiters (used in socket handlers)
export const socketRateLimiters = {
  message: createRateLimiter({
    ...RateLimitDefaults[RateLimitKeys.SOCKET_MESSAGE],
    keyGenerator: (req) => `socket:message:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
    message: 'Message rate limit exceeded',
  }),

  typing: createRateLimiter({
    ...RateLimitDefaults[RateLimitKeys.SOCKET_TYPING],
    keyGenerator: (req) => `socket:typing:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
    message: 'Typing rate limit exceeded',
  }),

  join: createRateLimiter({
    ...RateLimitDefaults[RateLimitKeys.SOCKET_JOIN],
    keyGenerator: (req) => `socket:join:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
    message: 'Join rate limit exceeded',
  }),

  reaction: createRateLimiter({
    ...RateLimitDefaults[RateLimitKeys.SOCKET_REACTION],
    keyGenerator: (req) => `socket:reaction:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
    message: 'Reaction rate limit exceeded',
  }),
};

// ============================================================================
// Dynamic Rate Limiter (for custom limits)
// ============================================================================

export const createDynamicRateLimiter = (
  keyPrefix: string,
  windowMs: number,
  max: number,
  message?: string
) => {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => `${keyPrefix}:${(req as unknown as { user?: { _id: string } }).user?._id || req.ip}`,
    message: message || 'Rate limit exceeded',
  });
};

// ============================================================================
// Rate Limit Headers Helper
// ============================================================================

export const addRateLimitHeaders = (req: Request, res: Response, limit: number, remaining: number, resetTime: Date) => {
  res.setHeader('X-RateLimit-Limit', limit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));
  res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime.getTime() / 1000));
};

// ============================================================================
// Skip Function Helpers
// ============================================================================

export const skipHealthChecks = (req: Request): boolean => {
  return req.path === '/health' || req.path === '/readyz' || req.path === '/livez';
};

export const skipIfAuthenticated = (req: Request): boolean => {
  // Skip rate limiting for authenticated requests (use user-specific limiters instead)
  return !!(req as unknown as { user?: { _id: string } }).user;
};