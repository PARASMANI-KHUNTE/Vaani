/**
 * Notification Service
 * Business logic for in-app and push notifications
 */

import mongoose from 'mongoose';
import { Notification, INotification } from './model';
import { User } from '../user/model';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';
import { sendPushNotification } from '../../shared/utils/pushNotifications';
import { socketEmitters } from '../../core/socket/server';
import { NotificationType } from '@chat-app/shared/types';

// ============================================================================
// Types
// ============================================================================

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    messageId?: string;
    messageContent?: string;
    messageType?: string;
    chatId?: string;
    chatName?: string;
    chatAvatar?: string;
    chatType?: 'direct' | 'group';
    actorId?: string;
    actorName?: string;
    actorAvatar?: string;
    targetUserId?: string;
    targetUserName?: string;
    inviteToken?: string;
    metadata?: Record<string, unknown>;
  };
  sendPush?: boolean;
}

interface GetNotificationsInput {
  userId: string;
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
  before?: Date;
}

// ============================================================================
// Create Notification
// ============================================================================

export const createNotification = async (input: CreateNotificationInput): Promise<INotification> => {
  const { userId, type, title, body, data = {}, sendPush = true } = input;

  // Verify user exists
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  // Create in-app notification
  const notification = await Notification.create({
    userId,
    type,
    title,
    body,
    data: {
      ...data,
      messageId: data.messageId ? new mongoose.Types.ObjectId(data.messageId) : undefined,
      chatId: data.chatId ? new mongoose.Types.ObjectId(data.chatId) : undefined,
      actorId: data.actorId ? new mongoose.Types.ObjectId(data.actorId) : undefined,
      targetUserId: data.targetUserId ? new mongoose.Types.ObjectId(data.targetUserId) : undefined,
    },
  });

  // Emit real-time event
  socketEmitters.notificationCreated(userId, {
    _id: notification._id.toString(),
    userId: notification.userId.toString(),
    type: notification.type,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    read: notification.isRead,
    chatId: notification.data.chatId?.toString(),
    actorId: notification.data.actorId?.toString(),
    createdAt: notification.createdAt.toISOString(),
  });

  // Send push notification if user is offline and has push tokens
  if (sendPush && !user.isOnline && user.pushTokens && user.pushTokens.length > 0) {
    const tokens = user.pushTokens.map((t) => t.token);
    try {
      await sendPushNotification(tokens, {
        title,
        body,
        data: {
          notificationId: notification._id.toString(),
          type,
          ...data,
        },
      });
      await notification.markPushSent(true);
    } catch (error) {
      logger.error('Push notification failed', { userId, notificationId: notification._id, error });
      await notification.markPushSent(false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  logger.debug('Notification created', { notificationId: notification._id, userId, type });
  return notification;
};

// ============================================================================
// Bulk Create Notifications
// ============================================================================

export const createBulkNotifications = async (
  userIds: string[],
  type: NotificationType,
  title: string,
  body: string,
  data: CreateNotificationInput['data'] = {},
  sendPush = true
): Promise<INotification[]> => {
  const notifications = await Promise.all(
    userIds.map((userId) =>
      createNotification({ userId, type, title, body, data, sendPush })
    )
  );
  return notifications;
};

// ============================================================================
// Get Notifications
// ============================================================================

export const getNotifications = async (input: GetNotificationsInput): Promise<{
  notifications: INotification[];
  pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
}> => {
  const { userId, page = 1, limit = 20, unreadOnly = false, type, before } = input;

  const notifications = await Notification.getNotifications(userId, {
    page,
    limit,
    unreadOnly,
    type,
    before,
  });

  const total = await Notification.countDocuments({
    userId,
    ...(unreadOnly ? { isRead: false } : {}),
    ...(type ? { type } : {}),
    ...(before ? { createdAt: { $lt: before } } : {}),
  });

  const totalPages = Math.ceil(total / limit);

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
};

// ============================================================================
// Mark as Read
// ============================================================================

export const markAsRead = async (notificationId: string, userId: string): Promise<INotification | null> => {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    throw new ApiError(404, 'Notification not found', 'NOTIFICATION_NOT_FOUND');
  }

  await notification.markAsRead();

  // Emit real-time event
  socketEmitters.notificationRead(userId, notificationId);

  return notification;
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  await Notification.markAllAsRead(userId);

  // Emit real-time event
  socketEmitters.allNotificationsRead(userId);
};

// ============================================================================
// Unread Count
// ============================================================================

export const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.getUnreadCount(userId);
};

// ============================================================================
// Notification Creators (Convenience Functions)
// ============================================================================

export const notifyNewMessage = async (
  recipientId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined,
  chatId: string,
  chatName: string,
  chatAvatar: string | undefined,
  chatType: 'direct' | 'group',
  messageId: string,
  messageContent: string,
  messageType: string
): Promise<void> => {
  const title = chatType === 'group' ? `${senderName} in ${chatName}` : senderName;
  const body = messageType === 'text'
    ? messageContent
    : messageType === 'image'
      ? '📷 Photo'
      : messageType === 'video'
        ? '🎥 Video'
        : messageType === 'audio'
          ? '🎵 Audio'
          : messageType === 'file'
            ? '📎 File'
            : messageType === 'location'
              ? '📍 Location'
              : messageType === 'contact'
                ? '👤 Contact'
                : 'New message';

  await createNotification({
    userId: recipientId,
    type: NotificationType.MESSAGE,
    title,
    body,
    data: {
      messageId,
      messageContent: messageContent.substring(0, 100),
      messageType,
      chatId,
      chatName,
      chatAvatar,
      chatType,
      actorId: senderId,
      actorName: senderName,
      actorAvatar: senderAvatar,
    },
    sendPush: true,
  });
};

export const notifyGroupInvite = async (
  recipientId: string,
  inviterId: string,
  inviterName: string,
  inviterAvatar: string | undefined,
  chatId: string,
  chatName: string,
  chatAvatar: string | undefined,
  inviteToken: string
): Promise<void> => {
  await createNotification({
    userId: recipientId,
    type: NotificationType.GROUP_INVITE,
    title: 'Group Invitation',
    body: `${inviterName} invited you to join "${chatName}"`,
    data: {
      chatId,
      chatName,
      chatAvatar,
      chatType: 'group',
      actorId: inviterId,
      actorName: inviterName,
      actorAvatar: inviterAvatar,
      inviteToken,
    },
    sendPush: true,
  });
};

export const notifyFriendRequest = async (
  recipientId: string,
  senderId: string,
  senderName: string,
  senderAvatar: string | undefined
): Promise<void> => {
  await createNotification({
    userId: recipientId,
    type: NotificationType.FRIEND_REQUEST,
    title: 'New Friend Request',
    body: `${senderName} wants to be your friend`,
    data: {
      actorId: senderId,
      actorName: senderName,
      actorAvatar: senderAvatar,
    },
    sendPush: true,
  });
};

export const notifyFriendAccepted = async (
  recipientId: string,
  friendId: string,
  friendName: string,
  friendAvatar: string | undefined
): Promise<void> => {
  await createNotification({
    userId: recipientId,
    type: NotificationType.FRIEND_ACCEPTED,
    title: 'Friend Request Accepted',
    body: `${friendName} accepted your friend request`,
    data: {
      actorId: friendId,
      actorName: friendName,
      actorAvatar: friendAvatar,
    },
    sendPush: false,
  });
};

export const notifyMention = async (
  recipientId: string,
  actorId: string,
  actorName: string,
  actorAvatar: string | undefined,
  chatId: string,
  chatName: string,
  chatAvatar: string | undefined,
  messageId: string,
  messageContent: string
): Promise<void> => {
  await createNotification({
    userId: recipientId,
    type: NotificationType.MENTION,
    title: `Mention in ${chatName}`,
    body: `${actorName} mentioned you: ${messageContent.substring(0, 100)}`,
    data: {
      messageId,
      messageContent: messageContent.substring(0, 100),
      chatId,
      chatName,
      chatAvatar,
      chatType: 'group',
      actorId,
      actorName,
      actorAvatar,
    },
    sendPush: true,
  });
};

export const notifyReaction = async (
  recipientId: string,
  actorId: string,
  actorName: string,
  actorAvatar: string | undefined,
  chatId: string,
  chatName: string,
  messageId: string,
  emoji: string
): Promise<void> => {
  await createNotification({
    userId: recipientId,
    type: NotificationType.REACTION,
    title: 'New Reaction',
    body: `${actorName} reacted ${emoji} to your message`,
    data: {
      messageId,
      chatId,
      chatName,
      actorId,
      actorName,
      actorAvatar,
      metadata: { emoji },
    },
    sendPush: false, // Reactions usually don't need push
  });
};

export const notifySystem = async (
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> => {
  await createNotification({
    userId,
    type: NotificationType.SYSTEM,
    title,
    body,
    data: { metadata: data },
    sendPush: true,
  });
};