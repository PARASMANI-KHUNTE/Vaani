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
import { SocketEvents } from '@chat-app/shared/constants';
import { verifySocketToken } from '../../shared/middleware/socketAuth';
import { socketHandlers } from '../../modules/socket/handlers';
import { presenceService } from '../../modules/socket/presence';
import { notificationService } from '../../modules/socket/notifications';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  if (io) {
    logger.warn('Socket.IO already initialized');
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
      logger.info('Socket.IO Redis adapter enabled');
    } else {
      logger.info('Socket.IO using in-memory adapter (Upstash or disabled)');
    }
  }

  // Authentication middleware
  io.use(verifySocketToken);

  // Connection handling
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    logger.debug('Socket connected', { socketId: socket.id, userId });

    // Register socket with presence service
    presenceService.addSocket(userId, socket);

    // Register event handlers
    socketHandlers(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { socketId: socket.id, userId, reason });
      presenceService.removeSocket(userId, socket);
    });

    // Error handling
    socket.on('error', (error) => {
      logger.error('Socket error', { socketId: socket.id, userId, error: error.message });
    });
  });

  // Global error handler
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error', { error: err.message, code: err.code });
  });

  logger.info('Socket.IO server initialized');
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

emitToChat('chat-123', 'test', { hello: 'world' });
// Note: The above line was incorrectly placed here and should be removed

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
// Typed Event Emitters
// ============================================================================

export const socketEmitters = {
  // Message events
  newMessage: (chatId: string, message: unknown, clientTempId?: string) => {
    emitToChat(chatId, SocketEvents.NEW_MESSAGE, { message, chat: { _id: chatId }, clientTempId });
  },

  messageDelivered: (chatId: string, messageId: string, userId: string) => {
    emitToChat(chatId, SocketEvents.MESSAGE_DELIVERED, { messageId, chatId, userId });
  },

  messageSeen: (chatId: string, messageId: string, userId: string) => {
    emitToChat(chatId, SocketEvents.MESSAGE_SEEN, { messageId, chatId, userId });
  },

  messageDeleted: (chatId: string, messageId: string, scope: 'me' | 'everyone', message?: unknown) => {
    emitToChat(chatId, SocketEvents.MESSAGE_DELETED, { messageId, chatId, scope, message });
  },

  messageEdited: (message: unknown) => {
    const chatId = (message as { chatId: string }).chatId;
    emitToChat(chatId, SocketEvents.MESSAGE_EDITED, { message });
  },

  // Chat events
  chatUpdated: (chat: unknown) => {
    const chatId = (chat as { _id: string })._id;
    emitToChat(chatId, SocketEvents.CHAT_UPDATED, { chat });
  },

  chatRemoved: (chatId: string) => {
    emitToChat(chatId, SocketEvents.CHAT_REMOVED, { chatId });
  },

  chatCreated: (chat: unknown) => {
    const chatId = (chat as { _id: string })._id;
    emitToChat(chatId, SocketEvents.CHAT_CREATED, { chat });
  },

  // Presence events
  userOnline: (userId: string) => {
    broadcast(SocketEvents.USER_ONLINE, { userId });
  },

  userOffline: (userId: string) => {
    broadcast(SocketEvents.USER_OFFLINE, { userId });
  },

  presenceSync: (onlineUserIds: string[]) => {
    broadcast(SocketEvents.PRESENCE_SYNC, { onlineUserIds });
  },

  // Typing events
  typingStart: (chatId: string, userId: string, userName: string) => {
    emitToChat(chatId, SocketEvents.TYPING_START, { chatId, userId, userName }, userId);
  },

  typingStop: (chatId: string, userId: string) => {
    emitToChat(chatId, SocketEvents.TYPING_STOP, { chatId, userId }, userId);
  },

  // Reaction events
  reactionAdded: (message: unknown, userId: string, userName: string, emoji: string) => {
    const chatId = (message as { chatId: string }).chatId;
    emitToChat(chatId, SocketEvents.REACTION_ADDED, { message, userId, userName, emoji });
  },

  reactionRemoved: (message: unknown, userId: string, emoji: string) => {
    const chatId = (message as { chatId: string }).chatId;
    emitToChat(chatId, SocketEvents.REACTION_REMOVED, { message, userId, emoji });
  },

  // Friend events
  friendRequestReceived: (notification: unknown) => {
    const userId = (notification as { toUser: string }).toUser;
    emitToUser(userId, SocketEvents.FRIEND_REQUEST_RECEIVED, notification);
  },

  friendRequestAccepted: (notification: unknown) => {
    const userId = (notification as { fromUser: string }).fromUser;
    emitToUser(userId, SocketEvents.FRIEND_REQUEST_ACCEPTED, notification);
  },

  friendRequestRejected: (notification: unknown) => {
    const userId = (notification as { fromUser: string }).fromUser;
    emitToUser(userId, SocketEvents.FRIEND_REQUEST_REJECTED, notification);
  },

  // Group events
  memberAddedToGroup: (chatId: string, userId: string, userName: string) => {
    emitToChat(chatId, SocketEvents.MEMBER_ADDED_TO_GROUP, { chatId, userId, userName });
  },

  // Error
  socketError: (socketId: string, code: string, message: string) => {
    if (!io) return;
    io.to(socketId).emit(SocketEvents.SOCKET_ERROR, { code, message, timestamp: new Date().toISOString() });
  },
};