/**
 * User Service
 * Business logic for user profiles, friends, blocks, search
 */

import mongoose, { ClientSession } from 'mongoose';
import { User, IUser } from './model';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';
import { Limits } from '@chat-app/shared/constants';
import { isTransactionSupported, withTransaction } from '../../core/mongoose';

// ============================================================================
// User Profile
// ============================================================================

export const findOrCreateUser = async (profile: { email: string; name: string; avatar?: string }): Promise<IUser> => {
  let user = await User.findByEmail(profile.email);

  if (!user) {
    user = await User.create({
      name: profile.name,
      email: profile.email,
      avatar: profile.avatar,
      username: generateUniqueUsername(profile.name),
    });
    logger.info({ userId: user._id, email: user.email }, 'New user created');
  }

  return user;
};

export const getUserById = async (userId: string): Promise<Record<string, unknown> | null> => {
  if (!mongoose.Types.ObjectId.isValid(userId)) return null;
  return User.findById(userId).lean();
};

export const getUserProfile = async (userId: string, currentUserId?: string): Promise<Record<string, unknown> | null> => {
  const user = await User.findById(userId)
    .select('-pushTokens -friendRequests -blockedUsers -settings.notifications')
    .lean();

  if (!user) return null;

  // Add friend status if currentUserId provided
  if (currentUserId && currentUserId !== userId) {
    const currentUser = await User.findById(currentUserId).select('friends blockedUsers friendRequests').lean();
    if (currentUser) {
      (user as Record<string, unknown>).isFriend = currentUser.friends.some((id: any) => id.equals(userId));
      (user as Record<string, unknown>).isBlocked = currentUser.blockedUsers.some((id: any) => id.equals(userId));
      (user as Record<string, unknown>).friendRequestSent = currentUser.friendRequests.some(
        (req: any) => req.fromUser.equals(userId) && req.status === 'pending'
      );
      (user as Record<string, unknown>).friendRequestReceived = currentUser.friendRequests.some(
        (req: any) => req.toUser.equals(userId) && req.status === 'pending'
      );
    }
  }

  return user;
};

export const updateProfile = async (
  userId: string,
  input: { name?: string; tagline?: string; bio?: string; username?: string }
): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  if (input.name !== undefined) user.name = input.name;
  if (input.tagline !== undefined) user.tagline = input.tagline;
  if (input.bio !== undefined) user.bio = input.bio;
  if (input.username !== undefined) {
    const existing = await User.findByUsername(input.username);
    if (existing && !existing._id.equals(userId)) {
      throw new ApiError(409, 'Username already taken', 'USERNAME_TAKEN');
    }
    user.username = input.username.toLowerCase();
  }

  return user.save();
};

export const updateSettings = async (
  userId: string,
  settings: Partial<IUser['settings']>
): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  if (settings.theme) user.settings.theme = settings.theme;
  if (settings.notifications) user.settings.notifications = { ...user.settings.notifications, ...settings.notifications };
  if (settings.privacy) user.settings.privacy = { ...user.settings.privacy, ...settings.privacy };

  return user.save();
};

// ============================================================================
// Username Generation
// ============================================================================

const generateUniqueUsername = async (name: string): Promise<string> => {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20);
  let username = base;
  let counter = 1;

  while (await User.findByUsername(username)) {
    username = `${base}${counter}`;
    counter++;
  }

  return username;
};

// ============================================================================
// Friends Management
// ============================================================================

export const sendFriendRequest = async (fromUserId: string, toUserId: string): Promise<IUser> => {
  if (fromUserId === toUserId) {
    throw new ApiError(400, 'Cannot send friend request to yourself', 'CANNOT_FRIEND_SELF');
  }

  const [fromUser, toUser] = await Promise.all([
    User.findById(fromUserId),
    User.findById(toUserId),
  ]);

  if (!fromUser || !toUser) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  if (fromUser.accountStatus !== 'active' || toUser.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_INACTIVE');
  }

  // Check if blocked
  if (fromUser.blockedUsers.some((id) => id.equals(toUserId)) || toUser.blockedUsers.some((id) => id.equals(fromUserId))) {
    throw new ApiError(403, 'Unable to send friend request', 'BLOCKED');
  }

  // Use transaction if supported
  if (isTransactionSupported()) {
    return withTransaction(async (session) => {
      const from = await User.findById(fromUserId).session(session);
      const to = await User.findById(toUserId).session(session);

      if (!from || !to) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

      await from.sendFriendRequest(to._id);
      await to.save(); // For reverse request auto-accept

      return from;
    });
  }

  // Without transaction
  await fromUser.sendFriendRequest(toUser._id);
  await toUser.save(); // For reverse request auto-accept

  return fromUser;
};

export const acceptFriendRequest = async (userId: string, fromUserId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await user.acceptFriendRequest(new mongoose.Types.ObjectId(fromUserId));

  // Also add to other user's friends
  const fromUser = await User.findById(fromUserId);
  if (fromUser) {
    if (!fromUser.friends.some((id) => id.equals(userId))) {
      fromUser.friends.push(user._id);
      await fromUser.save();
    }
  }

  return user;
};

export const rejectFriendRequest = async (userId: string, fromUserId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await user.rejectFriendRequest(new mongoose.Types.ObjectId(fromUserId));
  return user;
};

export const removeFriend = async (userId: string, friendId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await user.removeFriend(new mongoose.Types.ObjectId(friendId));

  // Also remove from other user's friends
  const friend = await User.findById(friendId);
  if (friend) {
    friend.friends = friend.friends.filter((id) => !id.equals(userId));
    await friend.save();
  }

  return user;
};

export const blockUser = async (userId: string, targetId: string): Promise<IUser> => {
  if (userId === targetId) {
    throw new ApiError(400, 'Cannot block yourself', 'CANNOT_BLOCK_SELF');
  }

  const [user, target] = await Promise.all([User.findById(userId), User.findById(targetId)]);
  if (!user || !target) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await user.blockUser(new mongoose.Types.ObjectId(targetId));
  return user;
};

export const unblockUser = async (userId: string, targetId: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await user.unblockUser(new mongoose.Types.ObjectId(targetId));
  return user;
};

export const getFriends = async (userId: string): Promise<Record<string, unknown>[]> => {
  const user = await User.findById(userId).populate('friends', '_id name username email avatar tagline isOnline lastSeen').lean();
  return (user?.friends as unknown as Record<string, unknown>[]) || [];
};

export const getBlockedUsers = async (userId: string): Promise<Record<string, unknown>[]> => {
  const user = await User.findById(userId).populate('blockedUsers', '_id name username email avatar').lean();
  return (user?.blockedUsers as unknown as Record<string, unknown>[]) || [];
};

export const getPendingFriendRequests = async (userId: string): Promise<Array<{ fromUser: Record<string, unknown>; createdAt: Date }>> => {
  const user = await User.findById(userId).populate('friendRequests.fromUser', '_id name username email avatar').lean();
  if (!user) return [];

  return user.friendRequests
    .filter((req) => req.status === 'pending')
    .map((req) => ({ fromUser: req.fromUser as unknown as Record<string, unknown>, createdAt: req.createdAt as Date }));
};

export const getSentFriendRequests = async (userId: string): Promise<Array<{ toUser: Record<string, unknown>; createdAt: Date }>> => {
  const user = await User.findById(userId).populate('friendRequests.toUser', '_id name username email avatar').lean();
  if (!user) return [];

  return user.friendRequests
    .filter((req) => req.status === 'pending')
    .map((req) => ({ toUser: req.toUser as unknown as Record<string, unknown>, createdAt: req.createdAt as Date }));
};

// ============================================================================
// Search & Explore
// ============================================================================

export const searchUsers = async (query: string, currentUserId: string, limit: number = Limits.USERS_SEARCH_LIMIT): Promise<Record<string, unknown>[]> => {
  return User.searchUsers(query, new mongoose.Types.ObjectId(currentUserId), limit);
};

export const exploreUsers = async (currentUserId: string, limit: number = Limits.USERS_EXPLORE_LIMIT): Promise<Record<string, unknown>[]> => {
  return User.getExploreUsers(new mongoose.Types.ObjectId(currentUserId), limit);
};

// ============================================================================
// Push Tokens
// ============================================================================

export const addPushToken = async (userId: string, token: string, platform: 'web' | 'ios' | 'android', deviceId?: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await user.addPushToken({ token, platform, deviceId, createdAt: new Date() });
  return user;
};

export const removePushToken = async (userId: string, token: string): Promise<IUser> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  await user.removePushToken(token);
  return user;
};

export const getPushTokens = async (userId: string): Promise<Array<{ token: string; platform: string; deviceId?: string }>> => {
  const user = await User.findById(userId).select('pushTokens').lean();
  return user?.pushTokens || [];
};

// ============================================================================
// Account Management
// ============================================================================

export const disableAccount = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

  user.accountStatus = 'disabled';
  user.isOnline = false;
  await user.save();
};

export const deleteAccount = async (userId: string): Promise<void> => {
  if (isTransactionSupported()) {
    await withTransaction(async (session) => {
      // Remove from all friends' lists
      const user = await User.findById(userId).session(session);
      if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

      // Remove from friends' friend lists
      await User.updateMany(
        { _id: { $in: user.friends } },
        { $pull: { friends: user._id } },
        { session }
      );

      // Remove friend requests
      await User.updateMany(
        { 'friendRequests.fromUser': user._id },
        { $pull: { friendRequests: { fromUser: user._id } } },
        { session }
      );
      await User.updateMany(
        { 'friendRequests.toUser': user._id },
        { $pull: { friendRequests: { toUser: user._id } } },
        { session }
      );

      // Remove from blocked lists
      await User.updateMany(
        { blockedUsers: user._id },
        { $pull: { blockedUsers: user._id } },
        { session }
      );

      // Mark as deleted
      user.accountStatus = 'deleted';
      user.name = 'Deleted User';
      user.email = `deleted_${user._id}@deleted.local`;
      user.username = undefined;
      user.avatar = undefined;
      user.tagline = undefined;
      user.bio = undefined;
      user.friends = [];
      user.friendRequests = [];
      user.blockedUsers = [];
      user.pushTokens = [];
      user.isOnline = false;
      await user.save({ session });
    });
  } else {
    // Without transaction - best effort
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');

    // Remove from friends
    await User.updateMany({ _id: { $in: user.friends } }, { $pull: { friends: user._id } });

    // Clean up friend requests
    await User.updateMany({ 'friendRequests.fromUser': user._id }, { $pull: { friendRequests: { fromUser: user._id } } });
    await User.updateMany({ 'friendRequests.toUser': user._id }, { $pull: { friendRequests: { toUser: user._id } } });

    // Remove from blocked
    await User.updateMany({ blockedUsers: user._id }, { $pull: { blockedUsers: user._id } });

    // Mark as deleted
    user.accountStatus = 'deleted';
    user.name = 'Deleted User';
    user.email = `deleted_${user._id}@deleted.local`;
    user.username = undefined;
    user.avatar = undefined;
    user.tagline = undefined;
    user.bio = undefined;
    user.friends = [];
    user.friendRequests = [];
    user.blockedUsers = [];
    user.pushTokens = [];
    user.isOnline = false;
    await user.save();
  }
};

// ============================================================================
// Presence
// ============================================================================

export const setOnlineStatus = async (userId: string, online: boolean): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) return;

  await user.setOnlineStatus(online);
};

export const updateLastSeen = async (userId: string): Promise<void> => {
  const user = await User.findById(userId);
  if (!user) return;

  await user.updateLastSeen();
};