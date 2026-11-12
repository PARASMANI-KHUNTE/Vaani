/**
 * Idempotency Middleware
 * Request deduplication for safe retries
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../../config';
import { cache, isRedisEnabled } from '../../config/redis';
import { logger } from '../../shared/utils/logger';
import { ApiError } from '../../shared/utils/apiError';
import { asyncHandler } from '../../shared/utils/asyncHandler';

// ============================================================================
// Configuration
// ============================================================================

const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours
const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const IDEMPOTENCY_PREFIX = 'idempotency:';

// ============================================================================
// In-Memory Fallback Store
// ============================================================================

interface IdempotencyRecord {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  createdAt: number;
}

const memoryStore = new Map<string, IdempotencyRecord>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now - record.createdAt > IDEMPOTENCY_TTL * 1000) {
      memoryStore.delete(key);
    }
  }
}, 60 * 60 * 1000); // Every hour

// ============================================================================
// Store Operations
// ============================================================================

const getStore = async (key: string): Promise<IdempotencyRecord | null> => {
  const fullKey = `${IDEMPOTENCY_PREFIX}${key}`;

  if (isRedisEnabled()) {
    try {
      const data = await cache.get<IdempotencyRecord>(fullKey);
      return data || null;
    } catch {
      // Fall through to memory store
    }
  }

  return memoryStore.get(fullKey) || null;
};

const setStore = async (key: string, record: IdempotencyRecord): Promise<void> => {
  const fullKey = `${IDEMPOTENCY_PREFIX}${key}`;

  if (isRedisEnabled()) {
    try {
      await cache.set(fullKey, record, IDEMPOTENCY_TTL);
      return;
    } catch {
      // Fall through to memory store
    }
  }

  memoryStore.set(fullKey, record);
};

const lockStore = async (key: string): Promise<boolean> => {
  const fullKey = `${IDEMPOTENCY_PREFIX}${key}:lock`;

  if (isRedisEnabled()) {
    try {
      // Use SET NX for distributed lock
      const client = cache as unknown as { setNX?: (key: string, value: string, ttl: number) => Promise<boolean> };
      if (client.setNX) {
        return await client.setNX(fullKey, '1', 30); // 30 second lock
      }
    } catch {
      // Fall through to memory store
    }
  }

  // Memory store lock
  if (memoryStore.has(fullKey)) return false;
  memoryStore.set(fullKey, { statusCode: 0, body: null, headers: {}, createdAt: Date.now() });
  return true;
};

const unlockStore = async (key: string): Promise<void> => {
  const fullKey = `${IDEMPOTENCY_PREFIX}${key}:lock`;

  if (isRedisEnabled()) {
    try {
      await cache.del(fullKey);
      return;
    } catch {
      // Fall through to memory store
    }
  }

  memoryStore.delete(fullKey);
};

// ============================================================================
// Idempotency Middleware
// ============================================================================

export const idempotencyMiddleware = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Only apply to mutating methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip if no idempotency key provided
  const idempotencyKey = req.headers[IDEMPOTENCY_HEADER.toLowerCase()] as string;
  if (!idempotencyKey) {
    return next();
  }

  // Validate key format (UUID or similar)
  if (!/^[a-zA-Z0-9-_]{16,64}$/.test(idempotencyKey)) {
    throw new ApiError(400, 'Invalid Idempotency-Key format');
  }

  // Create a unique key per user + endpoint + idempotency key
  const userId = (req as unknown as { user?: { _id: string } }).user?._id || 'anonymous';
  const compositeKey = `${userId}:${req.method}:${req.path}:${idempotencyKey}`;

  // Check for existing response
  const existing = await getStore(compositeKey);
  if (existing) {
    // Return cached response
    Object.entries(existing.headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.setHeader('X-Idempotency-Replay', 'true');
    return res.status(existing.statusCode).json(existing.body);
  }

  // Try to acquire lock
  const locked = await lockStore(compositeKey);
  if (!locked) {
    // Another request is processing, wait and check again
    await new Promise((resolve) => setTimeout(resolve, 100));
    const existingAfterWait = await getStore(compositeKey);
    if (existingAfterWait) {
      Object.entries(existingAfterWait.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      res.setHeader('X-Idempotency-Replay', 'true');
      return res.status(existingAfterWait.statusCode).json(existingAfterWait.body);
    }
    // Lock expired or released, continue with request
  }

  // Capture response
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  let statusCode = 200;
  let responseBody: unknown = null;
  const responseHeaders: Record<string, string> = {};

  res.status = ((code: number) => {
    statusCode = code;
    return originalStatus(code);
  }) as typeof res.status;

  res.json = ((body: unknown) => {
    responseBody = body;
    // Capture relevant headers
    const headersToCapture = ['content-type', 'cache-control', 'etag', 'last-modified'];
    headersToCapture.forEach((header) => {
      const value = res.getHeader(header);
      if (value) responseHeaders[header] = String(value);
    });

    // Store response for future requests (only for successful responses)
    if (statusCode >= 200 && statusCode < 400) {
      setStore(compositeKey, {
        statusCode,
        body: responseBody,
        headers: responseHeaders,
        createdAt: Date.now(),
      }).catch((err) => {
        logger.error('Failed to store idempotency response', { error: err.message });
      });
    }

    // Release lock
    unlockStore(compositeKey).catch(() => {});

    return originalJson(body);
  }) as typeof res.json;

  next();
});

// ============================================================================
// Idempotency Key Generator (for clients)
// ============================================================================

export const generateIdempotencyKey = (): string => {
  // Generate a UUID-like key
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============================================================================
// Clear Idempotency Key (for testing or manual invalidation)
// ============================================================================

export const clearIdempotencyKey = async (key: string, userId?: string): Promise<void> => {
  const compositeKey = `${userId || 'anonymous'}:*:*:${key}`;

  if (isRedisEnabled()) {
    try {
      // Redis doesn't support pattern deletion easily, so we'd need a different approach
      // For now, just delete the exact key if we know the method and path
      logger.warn('Pattern-based idempotency key deletion not implemented for Redis');
    } catch {
      // Ignore
    }
  }

  // Memory store pattern deletion
  for (const storeKey of memoryStore.keys()) {
    if (storeKey.endsWith(`:${key}`) || storeKey.endsWith(`:${key}:lock`)) {
      memoryStore.delete(storeKey);
    }
  }
};