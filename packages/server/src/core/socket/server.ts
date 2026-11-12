/**
 * Socket.IO Server Setup
 * Real-time communication with Redis adapter for horizontal scaling
 */

import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { config } from '../../config';
import { getRedisClient, isRedisEnabled } from '../../config/redis';
import { logger } from '../../shared/utils/logger';
import { verifySocketToken } from '../../shared/middleware/socketAuth';
import { registerSocketHandlers } from '../../modules/socket/handlers';
import { socketEmitters as newSocketEmitters } from '../../modules/socket/service';
import { SocketEvents } from '@chat-app/shared/constants';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  if (io) {
    logger.warn({}, 'Socket.IO already initialized');
    return io;
  }

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [...config.clientUrls, config.mobileClientUrl].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
  });

  // Redis adapter for horizontal scaling
  if (isRedisEnabled()) {
    const redisClient = getRedisClient();
    if (redisClient && !('request' in redisClient)) {
      // Only use Redis adapter with local Redis (not Upstash REST)
      const pubClient = redisClient.duplicate();
      const subClient = redisClient.duplicate();

      io.adapter(createAdapter(pubClient, subClient));
      logger.info({}, 'Socket.IO Redis adapter enabled');
    } else {
      logger.info({}, 'Socket.IO using in-memory adapter (Upstash or disabled)');
    }
  }

  // Authentication middleware
  io.use(verifySocketToken);

  // Register event handlers
  registerSocketHandlers(io);

  // Global error handler
  io.engine.on('connection_error', (err) => {
    logger.error({ error: err.message, code: err.code }, 'Socket.IO connection error');
  });

  logger.info({}, 'Socket.IO server initialized');
  return io;
};

export const getIO = (): SocketIOServer | null => io;

export const closeSocket = async (): Promise<void> => {
  if (io) {
    await io.close();
    io = null;
    logger.info('Socket.IO server closed');
  }
};

// ============================================================================
// Event Emitters (for use in services)
// ============================================================================

export const emitToUser = (userId: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToChat = (chatId: string, event: string, data: unknown, excludeUserId?: string): void => {
  if (!io) return;
  const room = `chat:${chatId}`;
  if (excludeUserId) {
    io.to(room).except(`user:${excludeUserId}`).emit(event, data);
  } else {
    io.to(room).emit(event, data);
  }
};

export const emitToRoom = (room: string, event: string, data: unknown): void => {
  if (!io) return;
  io.to(room).emit(event, data);
};

export const broadcast = (event: string, data: unknown): void => {
  if (!io) return;
  io.emit(event, data);
};

// ============================================================================
// Socket Event Constants (re-exported from shared)
// ============================================================================

export { SocketEvents };

// ============================================================================
// Typed Event Emitters (re-exported from socket module)
// ============================================================================

export const socketEmitters = newSocketEmitters;