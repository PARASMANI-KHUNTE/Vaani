/**
 * Socket Event Handlers
 * Real-time event handlers for Socket.IO connections
 */

import { Server, Socket } from 'socket.io';
import mongoose from 'mongoose';
import { verifyAccessToken, extractTokenFromSocket } from '../../shared/utils/jwt.js';
import { User } from '../user/model.js';
import { Chat } from '../chat/model.js';
import { Message } from '../message/model.js';
import { Notification } from '../notification/model.js';
import { logger } from '../../shared/utils/logger.js';
import { socketEmitters } from '../../core/socket/server.js';
import { processOfflineQueue } from '../../shared/utils/offlineQueue.js';
import { NotificationType } from '@chat-app/shared/types';
import { SocketEvents } from '@chat-app/shared/constants';

// ============================================================================
// Types
// ============================================================================

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

// ============================================================================
// Authentication Handler
// ============================================================================

export const handleAuthentication = async (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token = extractTokenFromSocket(socket);
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('+pushTokens');

    if (!user || user.accountStatus !== 'active') {
      return next(new Error('User not found or inactive'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
};

// ============================================================================
// Connection Handler
// ============================================================================

export const handleConnection = async (io: Server, socket: AuthenticatedSocket) => {
  const userId = socket.userId!;
  const user = socket.user!;

  logger.info({ userId, socketId: socket.id }, 'Socket connected');

  // Update user online status
  await User.findByIdAndUpdate(userId, {
    isOnline: true,
    lastSeen: new Date(),
    socketId: socket.id,
  });

  // Join user's personal room for direct notifications
  socket.join(`user:${userId}`);

  // Join all chat rooms user is participant of
  const chats = await Chat.find({
    'participants.userId': userId,
    deletedForEveryone: { $ne: true },
  }).select('_id').lean();

  for (const chat of chats) {
    socket.join(`chat:${chat._id}`);
  }

  // Process offline queue
  await processOfflineQueue(userId, async (queuedMessage) => {
    socket.emit(SocketEvents.NEW_MESSAGE, queuedMessage);
    return true;
  });

  // Emit user online status to contacts
  socketEmitters.userOnline(userId);

  // Send initial data
  socket.emit(SocketEvents.CONNECTED as string, {
    userId,
    socketId: socket.id,
    timestamp: new Date(),
  });

  // Handle disconnection
  socket.on('disconnect', async (reason) => {
    await handleDisconnect(io, socket, reason);
  });
};

// ============================================================================
// Disconnection Handler
// ============================================================================

const handleDisconnect = async (io: Server, socket: AuthenticatedSocket, reason: string) => {
  const userId = socket.userId!;
  logger.info({ userId, socketId: socket.id, reason }, 'Socket disconnected');

  // Update user offline status
  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeen: new Date(),
    socketId: null,
  });

  // Emit user offline status to contacts
  socketEmitters.userOffline(userId);

  // Leave all rooms
  for (const room of socket.rooms) {
    if (room !== socket.id) {
      socket.leave(room);
    }
  }
};

// ============================================================================
// Message Event Handlers
// ============================================================================

export const handleSendMessage = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { chatId, content, type, replyToId, media, clientTempId } = data;

    // Validate input
    if (!chatId) {
      return callback?.({ success: false, error: 'Chat ID required' });
    }

    // Import service dynamically to avoid circular deps
    const { sendMessage } = await import('../message/service.js');
    const message = await sendMessage({
      chatId,
      senderId: userId,
      content,
      type,
      replyToId,
      media,
      clientTempId,
    });

    callback?.({ success: true, message });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Send message error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to send message' });
  }
};

export const handleEditMessage = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { messageId, chatId, content } = data;

    const { editMessage } = await import('../message/service.js');
    const message = await editMessage({ messageId, chatId, userId, content });

    callback?.({ success: true, message });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Edit message error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to edit message' });
  }
};

export const handleDeleteMessage = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { messageId, chatId, scope } = data;

    const { deleteMessage } = await import('../message/service.js');
    const result = await deleteMessage({ messageId, chatId, userId, scope });

    callback?.({ success: true, ...result });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Delete message error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to delete message' });
  }
};

export const handleForwardMessage = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { messageId, chatId, targetChatId } = data;

    const { forwardMessage } = await import('../message/service.js');
    const message = await forwardMessage({ messageId, chatId, targetChatId, userId });

    callback?.({ success: true, message });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Forward message error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to forward message' });
  }
};

// ============================================================================
// Reaction Handlers
// ============================================================================

export const handleAddReaction = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const userName = socket.user!.name;
    const { messageId, emoji } = data;

    const { addReaction } = await import('../message/service.js');
    const message = await addReaction({ messageId, userId, userName, emoji });

    callback?.({ success: true, message });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Add reaction error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to add reaction' });
  }
};

export const handleRemoveReaction = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { messageId, emoji } = data;

    const { removeReaction } = await import('../message/service.js');
    const message = await removeReaction(messageId, userId, emoji);

    callback?.({ success: true, message });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Remove reaction error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to remove reaction' });
  }
};

// ============================================================================
// Receipt Handlers
// ============================================================================

export const handleMarkDelivered = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { messageId } = data;

    const { markDelivered } = await import('../message/service.js');
    await markDelivered(messageId, userId);

    callback?.({ success: true });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Mark delivered error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to mark delivered' });
  }
};

export const handleMarkSeen = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { messageId } = data;

    const { markSeen } = await import('../message/service.js');
    await markSeen(messageId, userId);

    callback?.({ success: true });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Mark seen error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to mark seen' });
  }
};

export const handleMarkChatSeen = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { chatId, before } = data;

    const { markChatMessagesSeen } = await import('../message/service.js');
    await markChatMessagesSeen(chatId, userId, before ? new Date(before) : undefined);

    callback?.({ success: true });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Mark chat seen error');
    callback?.({ success: false, error: error instanceof Error ? error.message : 'Failed to mark chat seen' });
  }
};

// ============================================================================
// Typing Indicators
// ============================================================================

export const handleTypingStart = async (io: Server, socket: AuthenticatedSocket, data: any) => {
  const userId = socket.userId!;
  const { chatId } = data;

  // Verify user is participant
  const chat = await Chat.findById(chatId);
  if (!chat || !chat.isParticipant(new mongoose.Types.ObjectId(userId))) {
    return;
  }

  socket.to(`chat:${chatId}`).emit(SocketEvents.TYPING_START, {
    chatId,
    userId,
    userName: socket.user!.name,
  });
};

export const handleTypingStop = async (io: Server, socket: AuthenticatedSocket, data: any) => {
  const userId = socket.userId!;
  const { chatId } = data;

  socket.to(`chat:${chatId}`).emit(SocketEvents.TYPING_STOP, {
    chatId,
    userId,
  });
};

// ============================================================================
// Presence Handlers
// ============================================================================

export const handleGetPresence = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const { userIds } = data;

    const users = await User.find({ _id: { $in: userIds } })
      .select('_id name username avatar isOnline lastSeen')
      .lean();

    const presence = users.map((u) => ({
      userId: u._id.toString(),
      isOnline: u.isOnline,
      lastSeen: u.lastSeen,
    }));

    callback?.({ success: true, presence });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Get presence error');
    callback?.({ success: false, error: 'Failed to get presence' });
  }
};

// ============================================================================
// Chat Event Handlers
// ============================================================================

export const handleJoinChat = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { chatId } = data;

    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isParticipant(new mongoose.Types.ObjectId(userId))) {
      return callback?.({ success: false, error: 'Not a member of this chat' });
    }

    socket.join(`chat:${chatId}`);
    callback?.({ success: true });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Join chat error');
    callback?.({ success: false, error: 'Failed to join chat' });
  }
};

export const handleLeaveChat = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  const { chatId } = data;
  socket.leave(`chat:${chatId}`);
  callback?.({ success: true });
};

// ============================================================================
// Notification Handlers
// ============================================================================

export const handleMarkNotificationRead = async (io: Server, socket: AuthenticatedSocket, data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;
    const { notificationId } = data;

    const { markAsRead } = await import('../notification/service.js');
    await markAsRead(notificationId, userId);

    callback?.({ success: true });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Mark notification read error');
    callback?.({ success: false, error: 'Failed to mark notification read' });
  }
};

export const handleMarkAllNotificationsRead = async (io: Server, socket: AuthenticatedSocket, _data: any, callback?: (response: any) => void) => {
  try {
    const userId = socket.userId!;

    const { markAllAsRead } = await import('../notification/service.js');
    await markAllAsRead(userId);

    callback?.({ success: true });
  } catch (error) {
    logger.error({ error, userId: socket.userId }, 'Mark all notifications read error');
    callback?.({ success: false, error: 'Failed to mark all notifications read' });
  }
};

// ============================================================================
// Register All Handlers
// ============================================================================

export const registerSocketHandlers = (io: Server) => {
  // Authentication middleware
  io.use(handleAuthentication);

  // Connection handling
  io.on('connection', (socket: AuthenticatedSocket) => {
    handleConnection(io, socket);

    // Message events
    socket.on(SocketEvents.SEND_MESSAGE, (data, callback) => handleSendMessage(io, socket, data, callback));
    socket.on(SocketEvents.EDIT_MESSAGE, (data, callback) => handleEditMessage(io, socket, data, callback));
    socket.on(SocketEvents.DELETE_MESSAGE, (data, callback) => handleDeleteMessage(io, socket, data, callback));
    socket.on(SocketEvents.FORWARD_MESSAGE, (data, callback) => handleForwardMessage(io, socket, data, callback));

    // Reaction events
    socket.on(SocketEvents.ADD_REACTION, (data, callback) => handleAddReaction(io, socket, data, callback));
    socket.on(SocketEvents.REMOVE_REACTION, (data, callback) => handleRemoveReaction(io, socket, data, callback));

    // Receipt events
    socket.on(SocketEvents.MARK_DELIVERED, (data, callback) => handleMarkDelivered(io, socket, data, callback));
    socket.on(SocketEvents.MARK_SEEN, (data, callback) => handleMarkSeen(io, socket, data, callback));
    socket.on(SocketEvents.MARK_CHAT_SEEN, (data, callback) => handleMarkChatSeen(io, socket, data, callback));

    // Typing events
    socket.on(SocketEvents.TYPING_START, (data) => handleTypingStart(io, socket, data));
    socket.on(SocketEvents.TYPING_STOP, (data) => handleTypingStop(io, socket, data));

    // Presence events
    socket.on(SocketEvents.GET_PRESENCE, (data, callback) => handleGetPresence(io, socket, data, callback));

    // Chat events
    socket.on(SocketEvents.JOIN_CHAT, (data, callback) => handleJoinChat(io, socket, data, callback));
    socket.on(SocketEvents.LEAVE_CHAT, (data, callback) => handleLeaveChat(io, socket, data, callback));

    // Notification events
    socket.on(SocketEvents.MARK_NOTIFICATION_READ, (data, callback) => handleMarkNotificationRead(io, socket, data, callback));
    socket.on(SocketEvents.MARK_ALL_NOTIFICATIONS_READ, (data, callback) => handleMarkAllNotificationsRead(io, socket, data, callback));
  });
};