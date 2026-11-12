/**
 * Chat Model
 * Mongoose schema for Chat (direct and group)
 */

import mongoose, { Document, Schema } from 'mongoose';
import { createBaseSchema, userRef, chatRef } from '../../core/mongoose';
import { UserChatState, ChatSettings, GroupInviteLink } from '@chat-app/shared/types';

// ============================================================================
// Interfaces
// ============================================================================

export interface IChatParticipant {
  userId: mongoose.Types.ObjectId;
  role: 'member' | 'admin' | 'owner';
  joinedAt: Date;
  userState?: IUserChatState;
}

export interface IUserChatState extends UserChatState {
  clearedAt?: Date;
  hidden?: boolean;
  manualUnread?: boolean;
  archivedAt?: Date;
  pinnedAt?: Date;
  mutedUntil?: Date;
  notificationsMuted?: boolean;
}

export interface IChatSettings extends ChatSettings {
  wallpaper?: string;
  theme?: string;
  disappearingMessages?: {
    enabled: boolean;
    duration: number;
  };
}

export interface IGroupInviteLink extends GroupInviteLink {
  _id: mongoose.Types.ObjectId;
  chatId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'direct' | 'group';
  participants: IChatParticipant[];
  groupName?: string;
  groupAvatar?: string;
  groupDescription?: string;
  ownerId?: mongoose.Types.ObjectId;
  admins: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  unreadCount?: number;
  inviteLink?: IGroupInviteLink;
  settings: IChatSettings;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  addParticipant(userId: mongoose.Types.ObjectId, role?: 'member' | 'admin'): Promise<IChat>;
  removeParticipant(userId: mongoose.Types.ObjectId): Promise<IChat>;
  updateParticipantRole(userId: mongoose.Types.ObjectId, role: 'member' | 'admin' | 'owner'): Promise<IChat>;
  isParticipant(userId: mongoose.Types.ObjectId): boolean;
  getParticipantRole(userId: mongoose.Types.ObjectId): 'member' | 'admin' | 'owner' | null;
  canUserManage(userId: mongoose.Types.ObjectId): boolean;
  updateUserState(userId: mongoose.Types.ObjectId, state: Partial<IUserChatState>): Promise<IChat>;
  getUserState(userId: mongoose.Types.ObjectId): IUserChatState | undefined;
}

// ============================================================================
// Sub-schemas
// ============================================================================

const UserChatStateSchema = new Schema<IUserChatState>({
  clearedAt: Date,
  hidden: Boolean,
  manualUnread: Boolean,
  archivedAt: Date,
  pinnedAt: Date,
  mutedUntil: Date,
  notificationsMuted: Boolean,
}, { _id: false });

const ChatSettingsSchema = new Schema<IChatSettings>({
  wallpaper: String,
  theme: String,
  disappearingMessages: {
    enabled: { type: Boolean, default: false },
    duration: { type: Number, default: 86400 }, // 24 hours in seconds
  },
}, { _id: false });

const ParticipantSchema = new Schema<IChatParticipant>({
  userId: userRef(),
  role: { type: String, enum: ['member', 'admin', 'owner'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  userState: UserChatStateSchema,
}, { _id: false });

const GroupInviteLinkSchema = new Schema<IGroupInviteLink>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  chatId: chatRef(),
  token: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  maxUses: Number,
  useCount: { type: Number, default: 0 },
  createdBy: userRef(),
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

// ============================================================================
// Main Schema
// ============================================================================

const ChatSchema = createBaseSchema<IChat>({
  type: { type: String, enum: ['direct', 'group'], required: true, index: true },
  participants: [ParticipantSchema],
  groupName: { type: String, trim: true, maxlength: 100 },
  groupAvatar: String,
  groupDescription: { type: String, trim: true, maxlength: 500 },
  ownerId: userRef(false),
  admins: [userRef(false)],
  lastMessage: { type: Schema.Types.ObjectId, ref: 'Message' },
  unreadCount: { type: Number, default: 0 },
  inviteLink: GroupInviteLinkSchema,
  settings: { type: ChatSettingsSchema, default: () => ({}) },
});

// ============================================================================
// Indexes
// ============================================================================

ChatSchema.index({ 'participants.userId': 1, updatedAt: -1 });
ChatSchema.index({ type: 1, updatedAt: -1 });
ChatSchema.index({ ownerId: 1 });
ChatSchema.index({ 'inviteLink.token': 1 }, { unique: true, sparse: true });

// ============================================================================
// Instance Methods
// ============================================================================

ChatSchema.methods.addParticipant = async function (
  userId: mongoose.Types.ObjectId,
  role: 'member' | 'admin' = 'member'
): Promise<IChat> {
  const exists = this.participants.some((p) => p.userId.equals(userId));
  if (!exists) {
    this.participants.push({ userId, role, joinedAt: new Date() });
    return this.save();
  }
  return this;
};

ChatSchema.methods.removeParticipant = async function (userId: mongoose.Types.ObjectId): Promise<IChat> {
  this.participants = this.participants.filter((p) => !p.userId.equals(userId));
  this.admins = this.admins.filter((id) => !id.equals(userId));
  return this.save();
};

ChatSchema.methods.updateParticipantRole = async function (
  userId: mongoose.Types.ObjectId,
  role: 'member' | 'admin' | 'owner'
): Promise<IChat> {
  const participant = this.participants.find((p) => p.userId.equals(userId));
  if (participant) {
    participant.role = role;
    if (role === 'admin' && !this.admins.some((id) => id.equals(userId))) {
      this.admins.push(userId);
    } else if (role !== 'admin') {
      this.admins = this.admins.filter((id) => !id.equals(userId));
    }
    if (role === 'owner') {
      this.ownerId = userId;
    }
    return this.save();
  }
  throw new Error('Participant not found');
};

ChatSchema.methods.isParticipant = function (userId: mongoose.Types.ObjectId): boolean {
  return this.participants.some((p) => p.userId.equals(userId));
};

ChatSchema.methods.getParticipantRole = function (userId: mongoose.Types.ObjectId): 'member' | 'admin' | 'owner' | null {
  const participant = this.participants.find((p) => p.userId.equals(userId));
  return participant?.role || null;
};

ChatSchema.methods.canUserManage = function (userId: mongoose.Types.ObjectId): boolean {
  const role = this.getParticipantRole(userId);
  return role === 'admin' || role === 'owner';
};

ChatSchema.methods.updateUserState = async function (
  userId: mongoose.Types.ObjectId,
  state: Partial<IUserChatState>
): Promise<IChat> {
  const participant = this.participants.find((p) => p.userId.equals(userId));
  if (participant) {
    participant.userState = { ...(participant.userState || {}), ...state };
    return this.save();
  }
  throw new Error('Participant not found');
};

ChatSchema.methods.getUserState = function (userId: mongoose.Types.ObjectId): IUserChatState | undefined {
  const participant = this.participants.find((p) => p.userId.equals(userId));
  return participant?.userState;
};

// ============================================================================
// Static Methods
// ============================================================================

ChatSchema.statics.findUserChats = async function (
  userId: mongoose.Types.ObjectId,
  options: { limit?: number; offset?: number; includeHidden?: boolean } = {}
): Promise<IChat[]> {
  const { limit = 30, offset = 0, includeHidden = false } = options;

  const query: Record<string, unknown> = {
    'participants.userId': userId,
  };

  if (!includeHidden) {
    query['participants.userState.hidden'] = { $ne: true };
  }

  return this.find(query)
    .sort({ updatedAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate('participants.userId', '_id name username email avatar tagline isOnline lastSeen')
    .populate('lastMessage')
    .lean();
};

ChatSchema.statics.findDirectChat = async function (
  userId1: mongoose.Types.ObjectId,
  userId2: mongoose.Types.ObjectId
): Promise<IChat | null> {
  return this.findOne({
    type: 'direct',
    'participants.userId': { $all: [userId1, userId2] },
  }).lean();
};

ChatSchema.statics.getChatWithParticipants = async function (chatId: mongoose.Types.ObjectId): Promise<IChat | null> {
  return this.findById(chatId)
    .populate('participants.userId', '_id name username email avatar tagline isOnline lastSeen')
    .populate('lastMessage')
    .populate('ownerId', '_id name username')
    .populate('admins', '_id name username')
    .lean();
};

// ============================================================================
// Model Export
// ============================================================================

export const Chat = mongoose.model<IChat>('Chat', ChatSchema);
export const GroupInvite = mongoose.model<IGroupInviteLink>('GroupInvite', GroupInviteLinkSchema);
export default Chat;