/**
 * Socket Service
 * Socket.IO service for server-side event emission and management
 */

import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { User } from '../user/model';
import { Chat } from '../chat/model';
import { Message } from '../message/model';
import { Notification, INotification } from '../notification/model';
import { SocketEvents } from '@chat-app/shared/constants';
import { Message as SharedMessage, InAppNotification } from '@chat-app/shared/types';

// ============================================================================
// Types
// ============================================================================

type MessagePayload = SharedMessage;
type NotificationPayload = InAppNotification;

// ============================================================================
// Socket.IO Server Instance
// ============================================================================

let io: Server | null = null;
let redisPubClient: any = null;
let redisSubClient: any = null;

// ============================================================================
// Initialization
// ============================================================================

export const initializeSocketServer = async (httpServer: any): Promise<Server> => {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: config.cors.origin,
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  // Setup Redis adapter for multi-server scaling
  if (config.redis.enabled && config.redis.url) {
    try {
      redisPubClient = createClient({ url: config.redis.url });
      redisSubClient = redisPubClient.duplicate();

      await Promise.all([redisPubClient.connect(), redisSubClient.connect()]);

      io.adapter(createAdapter(redisPubClient, redisSubClient));
      logger.info('Socket.IO Redis adapter initialized');
    } catch (error) {
      logger.warn('Failed to initialize Redis adapter, using in-memory adapter', { error });
    }
  }

  // Register event handlers
  const { registerSocketHandlers } = await import('./handlers');
  registerSocketHandlers(io);

  logger.info('Socket.IO server initialized');
  return io;
};

export const getSocketServer = (): Server | null => io;

export const closeSocketServer = async (): Promise<void> => {
  if (io) {
    await io.close();
    io = null;
  }
  if (redisPubClient) {
    await redisPubClient.quit();
    redisPubClient = null;
  }
  if (redisSubClient) {
    await redisSubClient.quit();
    redisSubClient = null;
  }
  logger.info('Socket.IO server closed');
};

// ============================================================================
// Event Emitters
// ============================================================================

export const socketEmitters = {
  // Connection events
  connected: (socketId: string, data: any) => {
    io?.to(socketId).emit(SocketEvents.CONNECTED, data);
  },

  // Message events
  newMessage: (chatId: string, message: MessagePayload, clientTempId?: string) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.NEW_MESSAGE, {
      message,
      clientTempId,
    });
  },

  messageEdited: (message: MessagePayload) => {
    io?.to(`chat:${message.chatId}`).emit(SocketEvents.MESSAGE_EDITED, { message });
  },

  messageDeleted: (chatId: string, messageId: string, scope: 'me' | 'everyone', message?: MessagePayload) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE_DELETED, {
      messageId,
      scope,
      message,
    });
  },

  // Reaction events
  reactionAdded: (message: MessagePayload, userId: string, userName: string, emoji: string) => {
    io?.to(`chat:${message.chatId}`).emit(SocketEvents.REACTION_ADDED, {
      messageId: message._id,
      userId,
      userName,
      emoji,
    });
  },

  reactionRemoved: (message: MessagePayload, userId: string, emoji: string) => {
    io?.to(`chat:${message.chatId}`).emit(SocketEvents.REACTION_REMOVED, {
      messageId: message._id,
      userId,
      emoji,
    });
  },

  // Receipt events
  messageDelivered: (chatId: string, messageId: string, userId: string) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE_DELIVERED, {
      messageId,
      userId,
    });
  },

  messageSeen: (chatId: string, messageId: string, userId: string) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.MESSAGE_SEEN, {
      messageId,
      userId,
    });
  },

  // Typing events
  userTyping: (chatId: string, userId: string, userName: string) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.USER_TYPING, { chatId, userId, userName });
  },

  userStopTyping: (chatId: string, userId: string) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.USER_STOP_TYPING, { chatId, userId });
  },

  // Presence events
  userOnline: (userId: string) => {
    io?.emit(SocketEvents.USER_ONLINE, { userId });
  },

  userOffline: (userId: string) => {
    io?.emit(SocketEvents.USER_OFFLINE, { userId });
  },

  presenceUpdate: (userId: string, presence: any) => {
    io?.to(`user:${userId}`).emit(SocketEvents.PRESENCE_UPDATE, { userId, presence });
  },

  // Notification events
  notificationCreated: (userId: string, notification: NotificationPayload) => {
    io?.to(`user:${userId}`).emit(SocketEvents.NOTIFICATION_CREATED, { notification });
  },

  notificationRead: (userId: string, notificationId: string) => {
    io?.to(`user:${userId}`).emit(SocketEvents.NOTIFICATION_READ, { notificationId });
  },

  allNotificationsRead: (userId: string) => {
    io?.to(`user:${userId}`).emit(SocketEvents.ALL_NOTIFICATIONS_READ, { userId });
  },

  // Chat events
  chatCreated: (chat: any, memberIds: string[]) => {
    for (const memberId of memberIds) {
      io?.to(`user:${memberId}`).emit(SocketEvents.CHAT_CREATED, { chat });
    }
  },

  chatUpdated: (chatId: string, updates: any) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.CHAT_UPDATED, { chatId, updates });
  },

  chatDeleted: (chatId: string, memberIds: string[]) => {
    for (const memberId of memberIds) {
      io?.to(`user:${memberId}`).emit(SocketEvents.CHAT_DELETED, { chatId });
    }
  },

  memberAdded: (chatId: string, member: any) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.MEMBER_ADDED, { chatId, member });
  },

  // memberAddedToGroup: Notifies specific user they were added to a group
  memberAddedToGroup: (chatId: string, userId: string, actorName: string) => {
    io?.to(`user:${userId}`).emit(SocketEvents.MEMBER_ADDED_TO_GROUP, { chatId, actorName });
  },

  memberRemoved: (chatId: string, memberId: string) => {
    io?.to(`chat:${chatId}`).emit(SocketEvents.MEMBER_REMOVED, { chatId, memberId });
  },

  // Call events (for future WebRTC integration)
  callIncoming: (targetUserId: string, callData: any) => {
    io?.to(`user:${targetUserId}`).emit(SocketEvents.CALL_INCOMING, callData);
  },

  callAccepted: (callerId: string, callData: any) => {
    io?.to(`user:${callerId}`).emit(SocketEvents.CALL_ACCEPTED, callData);
  },

  callRejected: (callerId: string, callData: any) => {
    io?.to(`user:${callerId}`).emit(SocketEvents.CALL_REJECTED, callData);
  },

  callEnded: (participants: string[], callData: any) => {
    for (const participantId of participants) {
      io?.to(`user:${participantId}`).emit(SocketEvents.CALL_ENDED, callData);
    }
  },

  // Generic emit to room
  toRoom: (room: string, event: string, data: any) => {
    io?.to(room).emit(event as any, data);
  },

  // Generic emit to user
  toUser: (userId: string, event: string, data: any) => {
    io?.to(`user:${userId}`).emit(event as any, data);
  },

  // Broadcast to all
  broadcast: (event: string, data: any) => {
    io?.emit(event as any, data);
  },
};

// ============================================================================
// Deduplication Helper
// ============================================================================

const pendingAcknowledgments = new Map<string, { timestamp: number; resolve: (value: any) => void; reject: (error: Error) => void }>();

export const waitForAcknowledgment = (
  eventName: string,
  clientTempId: string,
  timeout = 10000
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const key = `${eventName}:${clientTempId}`;
    const timeoutId = setTimeout(() => {
      pendingAcknowledgments.delete(key);
      reject(new Error('Acknowledgment timeout'));
    }, timeout);

    pendingAcknowledgments.set(key, {
      timestamp: Date.now(),
      resolve: (value) => {
        clearTimeout(timeoutId);
        pendingAcknowledgments.delete(key);
        resolve(value);
      },
      reject: (error) => {
        clearTimeout(timeoutId);
        pendingAcknowledgments.delete(key);
        reject(error);
      },
    });
  });
};

export const resolveAcknowledgment = (eventName: string, clientTempId: string, data: any): void => {
  const key = `${eventName}:${clientTempId}`;
  const pending = pendingAcknowledgments.get(key);
  if (pending) {
    pending.resolve(data);
  }
};

export const rejectAcknowledgment = (eventName: string, clientTempId: string, error: Error): void => {
  const key = `${eventName}:${clientTempId}`;
  const pending = pendingAcknowledgments.get(key);
  if (pending) {
    pending.reject(error);
  }
};

// ============================================================================
// Room Management
// ============================================================================

export const joinRoom = (socket: Socket, room: string): void => {
  socket.join(room);
};

export const leaveRoom = (socket: Socket, room: string): void => {
  socket.leave(room);
};

export const getRoomParticipants = async (room: string): Promise<string[]> => {
  if (!io) return [];
  const sockets = await io.in(room).fetchSockets();
  return sockets.map((s) => s.id);
};

// ============================================================================
// User Socket Management
// ============================================================================

export const getUserSockets = async (userId: string): Promise<Socket[]> => {
  if (!io) return [];
  const sockets = await io.in(`user:${userId}`).fetchSockets();
  return sockets;
};

export const disconnectUser = async (userId: string): Promise<void> => {
  const sockets = await getUserSockets(userId);
  for (const socket of sockets) {
    socket.disconnect(true);
  }
};

export const sendToUser = (userId: string, event: string, data: any): void => {
  io?.to(`user:${userId}`).emit(event as any, data);
};

// ============================================================================
// Chat Room Management
// ============================================================================

export const joinChatRoom = (socket: Socket, chatId: string): void => {
  socket.join(`chat:${chatId}`);
};

export const leaveChatRoom = (socket: Socket, chatId: string): void => {
  socket.leave(`chat:${chatId}`);
};

export const broadcastToChat = (chatId: string, event: string, data: any): void => {
  io?.to(`chat:${chatId}`).emit(event as any, data);
};

// ============================================================================
// Stats
// ============================================================================

export const getSocketStats = async (): Promise<{
  connectedClients: number;
  rooms: number;
  usersOnline: number;
}> => {
  if (!io) return { connectedClients: 0, rooms: 0, usersOnline: 0 };

  const sockets = await io.fetchSockets();
  const rooms = new Set<string>();

  for (const socket of sockets) {
    for (const room of socket.rooms) {
      rooms.add(room);
    }
  }

  return {
    connectedClients: sockets.length,
    rooms: rooms.size,
    usersOnline: sockets.filter((s) => s.data.userId).length,
  };
};