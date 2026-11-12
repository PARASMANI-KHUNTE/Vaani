/**
 * Notification Model
 * Mongoose schema for in-app and push notifications
 */

import mongoose, { Document, Schema } from 'mongoose';
import { createBaseSchema, userRef, chatRef, messageRef } from '../../core/mongoose';
import { NotificationType } from '@chat-app/shared/types';

const NOTIFICATION_TYPES: NotificationType[] = ['message', 'reaction', 'friend_request', 'friend_accepted', 'friend_rejected', 'group_invite', 'mention', 'system'];

// ============================================================================
// Interfaces
// ============================================================================

export interface INotificationData {
  // Message related
  messageId?: mongoose.Types.ObjectId;
  messageContent?: string;
  messageType?: string;

  // Chat related
  chatId?: mongoose.Types.ObjectId;
  chatName?: string;
  chatAvatar?: string;
  chatType?: 'direct' | 'group';

  // User related
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
  actorAvatar?: string;

  // Friend/Block related
  targetUserId?: mongoose.Types.ObjectId;
  targetUserName?: string;

  // Group invite
  inviteToken?: string;

  // System
  metadata?: Record<string, unknown>;
}

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Recipient
  type: NotificationType;
  title: string;
  body: string;
  data: INotificationData;
  isRead: boolean;
  readAt?: Date;
  // Push notification fields
  pushSent: boolean;
  pushSentAt?: Date;
  pushFailed: boolean;
  pushFailureReason?: string;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  markAsRead(): Promise<INotification>;
  markPushSent(success: boolean, failureReason?: string): Promise<INotification>;
  [key: string]: unknown;
}

// ============================================================================
// Sub-schema
// ============================================================================

const NotificationDataSchema = new Schema<INotificationData>({
  messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
  messageContent: String,
  messageType: String,
  chatId: { type: Schema.Types.ObjectId, ref: 'Chat' },
  chatName: String,
  chatAvatar: String,
  chatType: { type: String, enum: ['direct', 'group'] },
  actorId: { type: Schema.Types.ObjectId, ref: 'User' },
  actorName: String,
  actorAvatar: String,
  targetUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  targetUserName: String,
  inviteToken: String,
  metadata: Schema.Types.Mixed,
}, { _id: false });

// ============================================================================
// Main Schema
// ============================================================================

const NotificationSchema = createBaseSchema<INotification>({
  userId: userRef(),
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    required: true,
    index: true,
  },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 1000 },
  data: NotificationDataSchema,
  isRead: { type: Boolean, default: false, index: true },
  readAt: Date,
  pushSent: { type: Boolean, default: false },
  pushSentAt: Date,
  pushFailed: { type: Boolean, default: false },
  pushFailureReason: String,
});

// ============================================================================
// Indexes
// ============================================================================

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, type: 1, createdAt: -1 });
NotificationSchema.index({ 'data.chatId': 1 });
NotificationSchema.index({ createdAt: -1 });

// ============================================================================
// Instance Methods
// ============================================================================

NotificationSchema.methods.markAsRead = async function (): Promise<INotification> {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
  }
  return this;
};

NotificationSchema.methods.markPushSent = async function (
  success: boolean,
  failureReason?: string
): Promise<INotification> {
  this.pushSent = success;
  this.pushSentAt = new Date();
  this.pushFailed = !success;
  this.pushFailureReason = failureReason;
  return this.save();
};

// ============================================================================
// Static Methods
// ============================================================================

NotificationSchema.statics.createNotification = async function (
  userId: mongoose.Types.ObjectId,
  type: NotificationType,
  title: string,
  body: string,
  data: INotificationData = {}
): Promise<INotification> {
  return this.create({
    userId,
    type,
    title,
    body,
    data,
  });
};

NotificationSchema.statics.getUnreadCount = async function (this: any, userId: mongoose.Types.ObjectId): Promise<number> {
  return this.countDocuments({ userId, isRead: false });
};

NotificationSchema.statics.markAllAsRead = async function (this: any, userId: mongoose.Types.ObjectId): Promise<void> {
  await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

NotificationSchema.statics.getNotifications = async function (
  this: any,
  userId: mongoose.Types.ObjectId,
  options: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
    type?: NotificationType;
    before?: Date;
  } = {}
): Promise<INotification[]> {
  const { page = 1, limit = 20, unreadOnly = false, type, before } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  if (type) {
    query.type = type;
  }

  if (before) {
    query.createdAt = { $lt: before };
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// ============================================================================
// Model Export
// ============================================================================

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
export default Notification;