/**
 * User Model
 * Mongoose schema for User with friends, blocks, settings
 */

import mongoose, { Document, Schema } from 'mongoose';
import { createBaseSchema, userRef } from '../../core/mongoose';
import { UserSettings, PushToken, FriendRequest } from '@chat-app/shared/types';

// ============================================================================
// Interfaces
// ============================================================================

export interface IUserSettings extends UserSettings {}

export interface IPushToken extends PushToken {}

export interface IFriendRequest extends FriendRequest {}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  tagline?: string;
  bio?: string;
  accountStatus: 'active' | 'disabled' | 'deleted';
  isOnline: boolean;
  lastSeen?: Date;
  friends: mongoose.Types.ObjectId[];
  friendRequests: IFriendRequest[];
  blockedUsers: mongoose.Types.ObjectId[];
  pushTokens: IPushToken[];
  settings: IUserSettings;
  createdAt: Date;
  updatedAt: Date;

  // Methods
  addFriend(userId: mongoose.Types.ObjectId): Promise<IUser>;
  removeFriend(userId: mongoose.Types.ObjectId): Promise<IUser>;
  blockUser(userId: mongoose.Types.ObjectId): Promise<IUser>;
  unblockUser(userId: mongoose.Types.ObjectId): Promise<IUser>;
  sendFriendRequest(toUserId: mongoose.Types.ObjectId): Promise<IUser>;
  acceptFriendRequest(fromUserId: mongoose.Types.ObjectId): Promise<IUser>;
  rejectFriendRequest(fromUserId: mongoose.Types.ObjectId): Promise<IUser>;
  addPushToken(token: IPushToken): Promise<IUser>;
  removePushToken(token: string): Promise<IUser>;
  updateLastSeen(): Promise<IUser>;
  setOnlineStatus(online: boolean): Promise<IUser>;
}

// ============================================================================
// Schemas
// ============================================================================

const PushTokenSchema = new Schema<IPushToken>({
  token: { type: String, required: true },
  platform: { type: String, enum: ['web', 'ios', 'android'], required: true },
  deviceId: String,
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const FriendRequestSchema = new Schema<IFriendRequest>({
  _id: { type: Schema.Types.ObjectId, auto: true },
  fromUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const UserSettingsSchema = new Schema<IUserSettings>({
  theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
  notifications: {
    messages: { type: Boolean, default: true },
    reactions: { type: Boolean, default: true },
    friendRequests: { type: Boolean, default: true },
    groupInvites: { type: Boolean, default: true },
    sounds: { type: Boolean, default: true },
  },
  privacy: {
    lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'contacts' },
    profilePhoto: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'contacts' },
    about: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'contacts' },
    groups: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'contacts' },
  },
}, { _id: false });

const UserSchema = createBaseSchema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, unique: true, sparse: true, trim: true, lowercase: true, minlength: 3, maxlength: 30, match: /^[a-zA-Z0-9_]+$/ },
  avatar: { type: String, trim: true },
  tagline: { type: String, trim: true, maxlength: 50 },
  bio: { type: String, trim: true, maxlength: 200 },
  accountStatus: { type: String, enum: ['active', 'disabled', 'deleted'], default: 'active', index: true },
  isOnline: { type: Boolean, default: false, index: true },
  lastSeen: { type: Date, index: true },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [FriendRequestSchema],
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  pushTokens: [PushTokenSchema],
  settings: { type: UserSettingsSchema, default: () => ({}) },
});

// ============================================================================
// Indexes
// ============================================================================

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ username: 1 }, { unique: true, sparse: true });
UserSchema.index({ friends: 1 });
UserSchema.index({ blockedUsers: 1 });
UserSchema.index({ isOnline: 1, lastSeen: -1 });
UserSchema.index({ 'friendRequests.fromUser': 1, 'friendRequests.toUser': 1 });

// Text index for search
UserSchema.index({ name: 'text', username: 'text', email: 'text' });

// ============================================================================
// Instance Methods
// ============================================================================

UserSchema.methods.addFriend = async function (userId: mongoose.Types.ObjectId): Promise<IUser> {
  if (!this.friends.includes(userId)) {
    this.friends.push(userId);
    // Remove any pending friend requests between these users
    this.friendRequests = this.friendRequests.filter(
      (req) => !(req.fromUser.equals(userId) && req.toUser.equals(this._id) && req.status === 'pending')
    );
    return this.save();
  }
  return this;
};

UserSchema.methods.removeFriend = async function (userId: mongoose.Types.ObjectId): Promise<IUser> {
  this.friends = this.friends.filter((id) => !id.equals(userId));
  return this.save();
};

UserSchema.methods.blockUser = async function (userId: mongoose.Types.ObjectId): Promise<IUser> {
  if (!this.blockedUsers.includes(userId)) {
    this.blockedUsers.push(userId);
    // Remove friend relationship if exists
    this.friends = this.friends.filter((id) => !id.equals(userId));
    // Remove friend requests
    this.friendRequests = this.friendRequests.filter(
      (req) => !(req.fromUser.equals(userId) || req.toUser.equals(userId))
    );
    return this.save();
  }
  return this;
};

UserSchema.methods.unblockUser = async function (userId: mongoose.Types.ObjectId): Promise<IUser> {
  this.blockedUsers = this.blockedUsers.filter((id) => !id.equals(userId));
  return this.save();
};

UserSchema.methods.sendFriendRequest = async function (toUserId: mongoose.Types.ObjectId): Promise<IUser> {
  // Check if already friends
  if (this.friends.includes(toUserId)) {
    throw new Error('ALREADY_FRIENDS');
  }

  // Check if request already exists
  const existingRequest = this.friendRequests.find(
    (req) => req.fromUser.equals(toUserId) && req.toUser.equals(this._id) && req.status === 'pending'
  );
  if (existingRequest) {
    throw new Error('REQUEST_EXISTS');
  }

  // Check if reverse request exists
  const reverseRequest = this.friendRequests.find(
    (req) => req.fromUser.equals(this._id) && req.toUser.equals(toUserId) && req.status === 'pending'
  );
  if (reverseRequest) {
    // Auto-accept reverse request
    reverseRequest.status = 'accepted';
    this.friends.push(toUserId);
  } else {
    this.friendRequests.push({
      fromUser: this._id,
      toUser: toUserId,
      status: 'pending',
      createdAt: new Date(),
    });
  }

  return this.save();
};

UserSchema.methods.acceptFriendRequest = async function (fromUserId: mongoose.Types.ObjectId): Promise<IUser> {
  const request = this.friendRequests.find(
    (req) => req.fromUser.equals(fromUserId) && req.toUser.equals(this._id) && req.status === 'pending'
  );

  if (!request) {
    throw new Error('REQUEST_NOT_FOUND');
  }

  request.status = 'accepted';
  this.friends.push(fromUserId);
  return this.save();
};

UserSchema.methods.rejectFriendRequest = async function (fromUserId: mongoose.Types.ObjectId): Promise<IUser> {
  const request = this.friendRequests.find(
    (req) => req.fromUser.equals(fromUserId) && req.toUser.equals(this._id) && req.status === 'pending'
  );

  if (!request) {
    throw new Error('REQUEST_NOT_FOUND');
  }

  request.status = 'rejected';
  return this.save();
};

UserSchema.methods.addPushToken = async function (token: IPushToken): Promise<IUser> {
  // Remove existing token for same platform/device
  this.pushTokens = this.pushTokens.filter(
    (t) => !(t.token === token.token || (t.platform === token.platform && t.deviceId === token.deviceId))
  );
  this.pushTokens.push(token);
  return this.save();
};

UserSchema.methods.removePushToken = async function (token: string): Promise<IUser> {
  this.pushTokens = this.pushTokens.filter((t) => t.token !== token);
  return this.save();
};

UserSchema.methods.updateLastSeen = async function (): Promise<IUser> {
  this.lastSeen = new Date();
  return this.save();
};

UserSchema.methods.setOnlineStatus = async function (online: boolean): Promise<IUser> {
  this.isOnline = online;
  if (!online) {
    this.lastSeen = new Date();
  }
  return this.save();
};

// ============================================================================
// Static Methods
// ============================================================================

UserSchema.statics.findByEmail = async function (email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findByUsername = async function (username: string): Promise<IUser | null> {
  return this.findOne({ username: username.toLowerCase() });
};

UserSchema.statics.searchUsers = async function (query: string, excludeId: mongoose.Types.ObjectId, limit: number = 20): Promise<IUser[]> {
  return this.find({
    $or: [
      { name: { $regex: query, $options: 'i' } },
      { username: { $regex: query, $options: 'i' } },
      { email: { $regex: query, $options: 'i' } },
    ],
    _id: { $ne: excludeId },
    accountStatus: 'active',
  })
    .select('_id name username email avatar tagline isOnline lastSeen')
    .limit(limit)
    .lean();
};

UserSchema.statics.getExploreUsers = async function (excludeId: mongoose.Types.ObjectId, limit: number = 30): Promise<IUser[]> {
  return this.find({
    _id: { $ne: excludeId },
    accountStatus: 'active',
  })
    .select('_id name username email avatar tagline isOnline lastSeen')
    .limit(limit)
    .lean();
};

// ============================================================================
// Model Export
// ============================================================================

export const User = mongoose.model<IUser>('User', UserSchema);
export default User;