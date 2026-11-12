/**
 * Redis Configuration
 * Dual Redis client support (local Redis + Upstash REST)
 */

import { createClient, RedisClientType } from 'redis';
import { config } from './index';
import { logger } from '../shared/utils/logger';

let redisClient: RedisClientType | null = null;
let isConnected = false;
let useUpstash = false;

// Upstash REST client implementation
interface UpstashClient {
  request(command: string, ...args: string[]): Promise<unknown>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: { EX?: number }): Promise<'OK' | null>;
  setEx(key: string, seconds: number, value: string): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  sAdd(key: string, member: string): Promise<number>;
  sRem(key: string, member: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  sIsMember(key: string, member: string): Promise<boolean>;
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  duplicate(): UpstashClient;
  connect(): Promise<void>;
  quit(): Promise<void>;
  on(event: string, listener: (...args: unknown[]) => void): UpstashClient;
}

const createUpstashClient = (): UpstashClient => {
  const { upstashUrl, upstashToken } = config.redis;

  if (!upstashUrl || !upstashToken) {
    throw new Error('Upstash configuration missing');
  }

  const headers = {
    Authorization: `Bearer ${upstashToken}`,
    'Content-Type': 'application/json',
  };

  const baseUrl = upstashUrl.replace(/\/$/, '');

  const request = async (command: string, ...args: string[]): Promise<unknown> => {
    const lower = command.toLowerCase();
    const upper = command.toUpperCase();
    const encodedArgs = args.map((arg) => encodeURIComponent(String(arg)));

    // Try path-based API first
    const tryPath = async (): Promise<unknown> => {
      const url = `${baseUrl}/${lower}/${encodedArgs.join('/')}`;
      const response = await fetch(url, { headers });
      if (!response.ok) return null;
      const data = await response.json();
      return data.result;
    };

    // Fallback to command API
    const tryCommand = async (): Promise<unknown> => {
      const url = `${baseUrl}/command`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ command: [upper, ...args.map((arg) => String(arg))] }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.result;
    };

    try {
      const result = await tryPath();
      if (result !== null && result !== undefined) return result;
      return await tryCommand();
    } catch (error) {
      logger.error(`Redis ${upper} error`, { error: (error as Error).message });
      return null;
    }
  };

  const client: UpstashClient = {
    async request(command, ...args) {
      return request(command, ...args);
    },

    async get(key) {
      const result = await request('get', key);
      return (result as string) || null;
    },

    async set(key, value, options = {}) {
      try {
        const body: Record<string, unknown> = { key, value };
        if (options.EX) body.ex = options.EX;

        const response = await fetch(`${baseUrl}/set`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const data = await response.json();
        return data.result;
      } catch (error) {
        logger.error('Redis SET error', { error: (error as Error).message });
        return null;
      }
    },

    async setEx(key, seconds, value) {
      return client.set(key, value, { EX: seconds });
    },

    async del(key) {
      const result = await request('del', key);
      return typeof result === 'number' ? result : 0;
    },

    async exists(key) {
      const result = await request('exists', key);
      return typeof result === 'number' ? result : 0;
    },

    async expire(key, seconds) {
      const result = await request('expire', key, String(seconds));
      return typeof result === 'number' ? result : 0;
    },

    async sAdd(key, member) {
      const result = await request('sadd', key, member);
      return typeof result === 'number' ? result : 0;
    },

    async sRem(key, member) {
      const result = await request('srem', key, member);
      return typeof result === 'number' ? result : 0;
    },

    async sMembers(key) {
      const result = await request('smembers', key);
      return Array.isArray(result) ? result.map(String) : [];
    },

    async sIsMember(key, member) {
      const result = await request('sismember', key, member);
      return typeof result === 'number' ? result === 1 : false;
    },

    async incr(key) {
      const result = await request('incr', key);
      return typeof result === 'number' ? result : 0;
    },

    async decr(key) {
      const result = await request('decr', key);
      return typeof result === 'number' ? result : 0;
    },

    async keys(pattern) {
      const result = await request('keys', pattern);
      return Array.isArray(result) ? result.map(String) : [];
    },

    duplicate() {
      return createUpstashClient();
    },

    async connect() {
      // No-op for REST client
    },

    async quit() {
      isConnected = false;
    },

    on() {
      return client;
    },
  };

  return client;
};

// Type for unified Redis client
export type UnifiedRedisClient = RedisClientType | UpstashClient;

export const connectRedis = async (): Promise<UnifiedRedisClient | null> => {
  if (!config.redis.enabled) {
    logger.info('Redis disabled - using in-memory fallback');
    return null;
  }

  // Check if Upstash is configured
  if (!config.redis.useLocal && config.redis.upstashUrl && config.redis.upstashToken) {
    useUpstash = true;
    isConnected = true;
    logger.info('Redis connected (Upstash)');
    return createUpstashClient();
  }

  // Use local Redis
  try {
    if (!redisClient) {
      redisClient = createClient({
        url: config.redis.url,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis max reconnection attempts reached');
              return new Error('Max reconnection attempts reached');
            }
            return Math.min(retries * 200, 2000);
          },
        },
      });

      redisClient.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
        isConnected = false;
      });

      redisClient.on('connect', () => {
        isConnected = true;
        logger.info('Redis connected (local)');
      });

      redisClient.on('disconnect', () => {
        isConnected = false;
        logger.warn('Redis disconnected');
      });

      redisClient.on('reconnecting', () => {
        logger.info('Redis reconnecting...');
      });
    }

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    isConnected = true;
    return redisClient;
  } catch (error) {
    isConnected = false;
    logger.error('Redis connection failed', { error: (error as Error).message });

    if (config.isDevelopment()) {
      logger.warn('Falling back to in-memory cache');
      return null;
    }

    throw error;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  redisClient = null;
  isConnected = false;
};

export const getRedisClient = (): UnifiedRedisClient | null => {
  if (!config.redis.enabled) return null;

  if (useUpstash) {
    return createUpstashClient();
  }

  return redisClient;
};

export const isRedisConnected = (): boolean => isConnected;

export const isRedisEnabled = (): boolean => config.redis.enabled;

// Health check
export const checkRedisHealth = async (): Promise<{ status: string; latency?: number }> => {
  const start = Date.now();
  try {
    if (!config.redis.enabled) {
      return { status: 'disabled' };
    }

    const client = getRedisClient();
    if (!client) {
      return { status: 'unavailable' };
    }

    if (useUpstash) {
      // Upstash client uses get for health check
      await client.get('health-check');
    } else {
      await redisClient?.ping();
    }

    return { status: 'healthy', latency: Date.now() - start };
  } catch (error) {
    return { status: 'unhealthy', latency: Date.now() - start };
  }
};

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (!client) return null;

    try {
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, serialized);
      } else {
        await client.set(key, serialized);
      }
      return true;
    } catch {
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      await client.del(key);
      return true;
    } catch {
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      const result = await client.exists(key);
      return result > 0;
    } catch {
      return false;
    }
  },
};

// Set operations (for presence tracking)
export const sets = {
  async add(key: string, member: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      return await client.sAdd(key, member);
    } catch {
      return 0;
    }
  },

  async remove(key: string, member: string): Promise<number> {
    const client = getRedisClient();
    if (!client) return 0;

    try {
      return await client.sRem(key, member);
    } catch {
      return 0;
    }
  },

  async members(key: string): Promise<string[]> {
    const client = getRedisClient();
    if (!client) return [];

    try {
      return await client.sMembers(key);
    } catch {
      return [];
    }
  },

  async isMember(key: string, member: string): Promise<boolean> {
    const client = getRedisClient();
    if (!client) return false;

    try {
      return await client.sIsMember(key, member);
    } catch {
      return false;
    }
  },
};