/**
 * Message Model
 * Mongoose schema for Message with media, receipts, reactions, replies, soft deletes
 */

import mongoose, { Document, Schema } from 'mongoose';
import { createBaseSchema, chatRef, userRef, messageRef } from '../../core/mongoose';
import { MediaAttachment, MessageReaction, MessageReceipt, SystemEventData } from '@chat-app/shared/types';

// ============================================================================
// Interfaces
// ============================================================================

export interface IMediaAttachment extends MediaAttachment {}

export interface IMessageReaction {
  emoji: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  createdAt: Date;
}

export interface IMessageReceipt {
  userId: mongoose.Types.ObjectId;
  status: 'sent' | 'delivered' | 'seen' | 'failed';
  timestamp: Date;
}

export interface IReplyTo {
  _id: mongoose.Types.ObjectId;
  content?: string;
  type: string;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  media?: IMediaAttachment;
}

export interface ISystemEventData {
  type: string;
  actorId: mongoose.Types.ObjectId;
  actorName: string;
  targetUserId?: mongoose.Types.ObjectId;
  targetUserName?: string;
  metadata?: Record<string, unknown>;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName?: string;
  senderAvatar?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'system' | 'location' | 'contact';
  content?: string;
  media?: IMediaAttachment;
  replyTo?: IReplyTo | mongoose.Types.ObjectId;
  reactions?: IMessageReaction[];
  receipts?: IMessageReceipt[];
  status: 'sent' | 'delivered' | 'seen' | 'failed';
  isEdited: boolean;
  editedAt?: Date;
  deletedFor: mongoose.Types.ObjectId[];
  deletedForEveryone: boolean;
  deletedAt?: Date;
  systemEvent?: ISystemEventData;
  clientTempId?: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;

  // Methods
  addReaction(userId: mongoose.Types.ObjectId, userName: string, emoji: string): Promise<IMessage>;
  removeReaction(userId: mongoose.Types.ObjectId, emoji: string): Promise<IMessage>;
  addReceipt(userId: mongoose.Types.ObjectId, status: 'delivered' | 'seen'): Promise<IMessage>;
  markDelivered(userId: mongoose.Types.ObjectId): Promise<IMessage>;
  markSeen(userId: mongoose.Types.ObjectId): Promise<IMessage>;
  softDeleteFor(userId: mongoose.Types.ObjectId): Promise<IMessage>;
  softDeleteForEveryone(): Promise<IMessage>;
  edit(content: string): Promise<IMessage>;
}

export interface IMessageModel extends mongoose.Model<IMessage> {
  findChatMessages(
    chatId: mongoose.Types.ObjectId,
    options?: {
      page?: number;
      limit?: number;
      before?: Date;
      after?: Date;
      userId?: mongoose.Types.ObjectId;
    }
  ): Promise<IMessage[]>;
  getMessageById(
    messageId: mongoose.Types.ObjectId,
    userId?: mongoose.Types.ObjectId
  ): Promise<IMessage | null>;
  getMessagesByClientTempIds(clientTempIds: string[]): Promise<IMessage[]>;
}

// ============================================================================
// Sub-schemas
// ============================================================================

const MediaAttachmentSchema = new Schema<IMediaAttachment>({
  url: { type: String, required: true },
  thumbnailUrl: String,
  publicId: { type: String, required: true },
  format: { type: String, required: true },
  width: Number,
  height: Number,
  duration: Number,
  fileSize: { type: Number, required: true },
  fileName: String,
  mimeType: { type: String, required: true },
}, { _id: false });

const MessageReactionSchema = new Schema<IMessageReaction>({
  emoji: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const MessageReceiptSchema = new Schema<IMessageReceipt>({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['sent', 'delivered', 'seen', 'failed'], required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const ReplyToSchema = new Schema<IReplyTo>({
  _id: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: String,
  type: { type: String, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  media: MediaAttachmentSchema,
}, { _id: false });

const SystemEventDataSchema = new Schema<ISystemEventData>({
  type: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorName: { type: String, required: true },
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetUserName: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { _id: false });

// ============================================================================
// Main Schema
// ============================================================================

const MessageSchema = createBaseSchema<IMessage>({
  chatId: chatRef(),
  senderId: userRef(),
  senderName: String,
  senderAvatar: String,
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'file', 'system', 'location', 'contact'],
    default: 'text',
    required: true,
  },
  content: { type: String, maxlength: 10000 },
  media: MediaAttachmentSchema,
  replyTo: ReplyToSchema,
  reactions: [MessageReactionSchema],
  receipts: [MessageReceiptSchema],
  status: { type: String, enum: ['sent', 'delivered', 'seen', 'failed'], default: 'sent' },
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  deletedForEveryone: { type: Boolean, default: false },
  deletedAt: Date,
  systemEvent: SystemEventDataSchema,
  clientTempId: { type: String, index: true, sparse: true },
});

// ============================================================================
// Indexes
// ============================================================================

MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ clientTempId: 1 }, { unique: true, sparse: true });
MessageSchema.index({ 'receipts.userId': 1 });
MessageSchema.index({ deletedFor: 1 });
MessageSchema.index({ deletedForEveryone: 1, deletedAt: 1 });

// ============================================================================
// Instance Methods
// ============================================================================

MessageSchema.methods.addReaction = async function (
  userId: mongoose.Types.ObjectId,
  userName: string,
  emoji: string
): Promise<IMessage> {
  // Remove existing reaction from this user with same emoji
  this.reactions = this.reactions.filter(
    (r) => !(r.userId.equals(userId) && r.emoji === emoji)
  );

  // Add new reaction
  this.reactions.push({ emoji, userId, userName, createdAt: new Date() });
  return this.save();
};

MessageSchema.methods.removeReaction = async function (
  userId: mongoose.Types.ObjectId,
  emoji: string
): Promise<IMessage> {
  this.reactions = this.reactions.filter(
    (r) => !(r.userId.equals(userId) && r.emoji === emoji)
  );
  return this.save();
};

MessageSchema.methods.addReceipt = async function (
  userId: mongoose.Types.ObjectId,
  status: 'delivered' | 'seen'
): Promise<IMessage> {
  // Remove existing receipt for this user
  this.receipts = this.receipts.filter((r) => !r.userId.equals(userId));

  // Add new receipt
  this.receipts.push({ userId, status, timestamp: new Date() });

  // Update overall status
  if (status === 'seen') {
    this.status = 'seen';
  } else if (status === 'delivered' && this.status === 'sent') {
    this.status = 'delivered';
  }

  return this.save();
};

MessageSchema.methods.markDelivered = async function (userId: mongoose.Types.ObjectId): Promise<IMessage> {
  return this.addReceipt(userId, 'delivered');
};

MessageSchema.methods.markSeen = async function (userId: mongoose.Types.ObjectId): Promise<IMessage> {
  return this.addReceipt(userId, 'seen');
};

MessageSchema.methods.softDeleteFor = async function (userId: mongoose.Types.ObjectId): Promise<IMessage> {
  if (!this.deletedFor.some((id) => id.equals(userId))) {
    this.deletedFor.push(userId);
    this.deletedAt = new Date();
    return this.save();
  }
  return this;
};

MessageSchema.methods.softDeleteForEveryone = async function (): Promise<IMessage> {
  this.deletedForEveryone = true;
  this.deletedAt = new Date();
  return this.save();
};

MessageSchema.methods.edit = async function (content: string): Promise<IMessage> {
  this.content = content;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

// ============================================================================
// Static Methods
// ============================================================================

MessageSchema.statics.findChatMessages = async function (
  this: any,
  chatId: mongoose.Types.ObjectId,
  options: {
    page?: number;
    limit?: number;
    before?: Date;
    after?: Date;
    userId?: mongoose.Types.ObjectId; // For deletedFor filtering
  } = {}
): Promise<Record<string, unknown>[]> {
  const { page = 1, limit = 30, before, after, userId } = options;
  const skip = (page - 1) * limit;

  const query: Record<string, unknown> = { chatId };

  // Filter out messages deleted for everyone
  query.deletedForEveryone = { $ne: true };

  // Filter out messages deleted for specific user
  if (userId) {
    query.deletedFor = { $ne: userId };
  }

  // Date range filters
  if (before || after) {
    query.createdAt = {};
    if (before) (query.createdAt as Record<string, unknown>).$lt = before;
    if (after) (query.createdAt as Record<string, unknown>).$gt = after;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean() as Promise<Record<string, unknown>[]>;
};

MessageSchema.statics.getMessageById = async function (
  this: any,
  messageId: mongoose.Types.ObjectId,
  userId?: mongoose.Types.ObjectId
): Promise<Record<string, unknown> | null> {
  const query: Record<string, unknown> = { _id: messageId };

  if (userId) {
    query.$or = [
      { deletedForEveryone: { $ne: true }, deletedFor: { $ne: userId } },
    ];
  } else {
    query.deletedForEveryone = { $ne: true };
  }

  return this.findOne(query)
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean() as Promise<Record<string, unknown> | null>;
};

MessageSchema.statics.getMessagesByClientTempIds = async function (
  this: any,
  clientTempIds: string[]
): Promise<Record<string, unknown>[]> {
  return this.find({ clientTempId: { $in: clientTempIds } }).lean() as Promise<Record<string, unknown>[]>;
};

// ============================================================================
// Model Export
// ============================================================================

export const Message = mongoose.model<IMessage, IMessageModel>('Message', MessageSchema);
export default Message;