/**
 * Express Application Setup
 * Core Express app configuration with middleware pipeline
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { errorHandler, notFoundHandler } from '../../shared/middleware/errorHandler';
import { ApiError } from '../../shared/utils/apiError';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { authRoutes } from '../../modules/auth/routes';
import { userRoutes } from '../../modules/user/routes';
import { chatRoutes } from '../../modules/chat/routes';
import { messageRoutes } from '../../modules/message/routes';
import { notificationRoutes } from '../../modules/notification/routes';
import { mediaRoutes } from '../../modules/media/routes';
import { systemRoutes } from '../../modules/system/routes';
import { getConnection } from '../../config/database';
import { isRedisConnected } from '../../config/redis';

// ============================================================================
// Express App Factory
// ============================================================================

export const createApp = (): Application => {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxy
  app.set('trust proxy', config.isProduction() ? 1 : false);

  // Request timeout
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.setTimeout(30000, () => {
      logger.warn({ path: req.path, method: req.method, ip: req.ip }, 'Request timeout');
    });
    next();
  });

  // CORS
  const allowedOrigions = [...config.clientUrls, config.mobileClientUrl].filter(Boolean);
  const corsOptions: cors.CorsOptions = {
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigions.includes(origin)) return callback(null, true);
      if (config.isDevelopment()) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
  app.use(cors(corsOptions));

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
      hsts: config.isProduction() ? { maxAge: 31536000, includeSubDomains: true } : false,
    })
  );

  // Compression
  app.use(compression());

  // Logging
  app.use(morgan(config.isProduction() ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info({ source: 'morgan' }, message.trim()) },
  }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Static files (web build)
  const webDistPath = path.resolve(__dirname, '../../../web/dist');
  app.use(express.static(webDistPath, { maxAge: config.isProduction() ? '1y' : 0 }));

  // ============================================================================
  // Health & Monitoring Endpoints
  // ============================================================================

  const getHealthSnapshot = () => {
    const mongoState = getConnection()?.readyState ?? 0;
    const mongoConnected = mongoState === 1;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      env: config.nodeEnv,
      version: process.env.npm_package_version || '1.0.0',
      mongo: {
        connected: mongoConnected,
        readyState: mongoState,
      },
      redis: {
        enabled: config.redis.enabled,
        connected: config.redis.enabled ? isRedisConnected() : false,
        mode: config.redis.upstashUrl ? 'upstash' : config.redis.useLocal ? 'local' : 'disabled',
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
      },
    };
  };

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    const accept = (req.get('accept') || '').toLowerCase();
    if (accept.includes('text/html')) {
      return res.sendFile(path.join(webDistPath, 'index.html'));
    }

    return sendSuccess(res, 200, 'OK', {
      service: 'chat-app',
      endpoints: {
        health: '/health',
        readiness: '/readyz',
        api: '/api',
      },
      ...getHealthSnapshot(),
    });
  });

  // Health check
  app.get('/health', (_req: Request, res: Response) => {
    return sendSuccess(res, 200, 'Server is healthy', getHealthSnapshot());
  });

  // Readiness check (for Kubernetes/load balancers)
  app.get('/readyz', (_req: Request, res: Response) => {
    const snapshot = getHealthSnapshot();
    const ready = snapshot.mongo.connected && (!snapshot.redis.enabled || snapshot.redis.connected);
    const status = ready ? 200 : 503;

    return res.status(status).json({
      success: ready,
      status,
      message: ready ? 'Ready' : 'Not ready',
      data: snapshot,
    });
  });

  // Liveness check
  app.get('/livez', (_req: Request, res: Response) => {
    return sendSuccess(res, 200, 'Alive', { timestamp: new Date().toISOString() });
  });

  // ============================================================================
  // API Routes
  // ============================================================================

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/chats', chatRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/system', systemRoutes);

  // ============================================================================
  // SPA Fallback (must be after API routes)
  // ============================================================================

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      const isApiRoute =
        req.path.startsWith('/api') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/readyz') ||
        req.path.startsWith('/livez') ||
        req.path.startsWith('/monitoring');

      if (!isApiRoute && !path.extname(req.path)) {
        return res.sendFile(path.join(webDistPath, 'index.html'));
      }
    }
    next();
  });

  // ============================================================================
  // Error Handling (must be last)
  // ============================================================================

  // Database offline graceful handling
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    const dbErrors = [
      'MongooseError',
      'MongoNetworkError',
      'MongoServerSelectionError',
      'MongoTimeoutError',
    ];

    const isDbError = dbErrors.includes(err.name) ||
      err.message?.includes('buffering timed out') ||
      err.message?.includes('not connected') ||
      err.message?.includes('connection closed');

    if (isDbError) {
      logger.warn({ error: err.message }, 'Database offline — returning fallback response');
      if (req.method === 'GET') {
        return res.json({
          success: true,
          data: req.path.endsWith('s') || req.path.endsWith('s/') ? [] : {},
        });
      }
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable (database offline)',
      });
    }
    next(err);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export type { Application, Request, Response, NextFunction } from 'express';