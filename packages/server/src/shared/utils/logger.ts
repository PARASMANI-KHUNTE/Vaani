/**
 * Logger Utility
 * Structured logging with Pino
 */

import pino, { Logger, LoggerOptions } from 'pino';
import { config } from '../../config';

// ============================================================================
// Logger Configuration
// ============================================================================

const isDevelopment = config.isDevelopment();

const loggerOptions: LoggerOptions = {
  level: isDevelopment ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'chat-app',
    environment: config.nodeEnv,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      'req.body.idToken',
      'req.body.accessToken',
      'res.headers["set-cookie"]',
      '*.password',
      '*.token',
      '*.secret',
      '*.authorization',
    ],
    censor: '[REDACTED]',
  },
};

if (isDevelopment) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  };
}

// ============================================================================
// Create Logger Instance
// ============================================================================

export const logger: Logger = pino(loggerOptions);

// ============================================================================
// Child Logger Factory
// ============================================================================

export const createChildLogger = (bindings: Record<string, unknown>): Logger => {
  return logger.child(bindings);
};

// ============================================================================
// Request Logger
// ============================================================================

export const requestLogger = (req: unknown, res: unknown, extra?: Record<string, unknown>) => {
  return logger.child({
    req: req as Record<string, unknown>,
    res: res as Record<string, unknown>,
    ...extra,
  });
};

// ============================================================================
// Performance Logger
// ============================================================================

export const performanceLogger = (operation: string, duration: number, metadata?: Record<string, unknown>) => {
  logger.info({ operation, duration, ...metadata }, `Performance: ${operation} took ${duration}ms`);
};

// ============================================================================
// Audit Logger (for security-sensitive operations)
// ============================================================================

export const auditLogger = (action: string, userId: string, metadata?: Record<string, unknown>) => {
  logger.info(
    { action, userId, timestamp: new Date().toISOString(), ...metadata },
    `Audit: ${action} by ${userId}`
  );
};

export default logger;