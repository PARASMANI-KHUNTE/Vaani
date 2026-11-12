/**
 * Server Configuration
 * Centralized environment configuration with validation
 */

import { z } from 'zod';
import { EnvKeys } from '@chat-app/shared/constants';

// Environment schema with validation
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_URL: z.string().url().optional(),
  CLIENT_URL: z.string().url().optional(),
  MOBILE_CLIENT_URL: z.string().url().optional(),

  // Database
  MONGODB_URI: z.string().min(1),
  MONGODB_URI_TEST: z.string().optional(),

  // Redis
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  REDIS_URL_UPSTASH: z.string().url().optional(),
  REDIS_TOKEN_UPSTASH: z.string().optional(),
  REDIS_ENABLED: z.coerce.boolean().default(true),
  REDIS_CACHE_TTL_SECONDS: z.coerce.number().default(300),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_IDS: z.string().optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default('chat-app'),

  // Push Notifications
  EXPO_ACCESS_TOKEN: z.string().optional(),
  FIREBASE_SERVER_KEY: z.string().optional(),

  // Retention
  RETENTION_CHAT_DAYS: z.coerce.number().default(365),
  RETENTION_MESSAGE_DAYS: z.coerce.number().default(180),
  RETENTION_CLEANUP_INTERVAL_HOURS: z.coerce.number().default(24),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

// Parse and validate environment
const parseEnv = () => {
  // Load .env files
  if (process.env.NODE_ENV !== 'production') {
    try {
      require('dotenv').config();
    } catch {
      // dotenv not available, use process.env directly
    }
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
  }

  return result.data;
};

const rawEnv = parseEnv();

// Derived configuration
export const config = {
  // Server
  nodeEnv: rawEnv.NODE_ENV,
  port: rawEnv.PORT,
  apiUrl: rawEnv.API_URL || `http://localhost:${rawEnv.PORT}`,
  clientUrl: rawEnv.CLIENT_URL || 'http://localhost:5173',
  mobileClientUrl: rawEnv.MOBILE_CLIENT_URL || 'exp://localhost:8081',
  clientUrls: rawEnv.CLIENT_URL
    ? [rawEnv.CLIENT_URL]
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],

  // Database
  mongodb: {
    uri: rawEnv.MONGODB_URI,
    uriTest: rawEnv.MONGODB_URI_TEST,
  },

  // Redis
  redis: {
    url: rawEnv.REDIS_URL,
    upstashUrl: rawEnv.REDIS_URL_UPSTASH,
    upstashToken: rawEnv.REDIS_TOKEN_UPSTASH,
    enabled: rawEnv.REDIS_ENABLED,
    cacheTtlSeconds: rawEnv.REDIS_CACHE_TTL_SECONDS,
    useLocal: rawEnv.NODE_ENV !== 'production' && !rawEnv.REDIS_URL_UPSTASH,
  },

  // Auth
  auth: {
    jwtSecret: rawEnv.JWT_SECRET,
    jwtRefreshSecret: rawEnv.JWT_REFRESH_SECRET || rawEnv.JWT_SECRET,
    jwtExpiresIn: rawEnv.JWT_EXPIRES_IN,
    jwtRefreshExpiresIn: rawEnv.JWT_REFRESH_EXPIRES_IN,
    googleClientId: rawEnv.GOOGLE_CLIENT_ID,
    googleClientSecret: rawEnv.GOOGLE_CLIENT_SECRET,
    googleClientIds: rawEnv.GOOGLE_CLIENT_IDS
      ? rawEnv.GOOGLE_CLIENT_IDS.split(',').map((id) => id.trim()).filter(Boolean)
      : [rawEnv.GOOGLE_CLIENT_ID],
  },

  // Cloudinary
  cloudinary: {
    cloudName: rawEnv.CLOUDINARY_CLOUD_NAME,
    apiKey: rawEnv.CLOUDINARY_API_KEY,
    apiSecret: rawEnv.CLOUDINARY_API_SECRET,
    folder: rawEnv.CLOUDINARY_FOLDER,
  },

  // Push Notifications
  push: {
    expoAccessToken: rawEnv.EXPO_ACCESS_TOKEN,
    firebaseServerKey: rawEnv.FIREBASE_SERVER_KEY,
  },

  // Retention
  retention: {
    chatDays: rawEnv.RETENTION_CHAT_DAYS,
    messageDays: rawEnv.RETENTION_MESSAGE_DAYS,
    cleanupIntervalHours: rawEnv.RETENTION_CLEANUP_INTERVAL_HOURS,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: rawEnv.RATE_LIMIT_WINDOW_MS,
    maxRequests: rawEnv.RATE_LIMIT_MAX_REQUESTS,
  },

  // Helper methods
  isDevelopment() {
    return this.nodeEnv === 'development';
  },

  isProduction() {
    return this.nodeEnv === 'production';
  },

  isTest() {
    return this.nodeEnv === 'test';
  },
} as const;

export type Config = typeof config;