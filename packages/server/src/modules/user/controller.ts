/**
 * User Controller
 * HTTP handlers for user endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse';
import {
  getUserProfile,
  updateProfile,
  updateSettings,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  blockUser,
  unblockUser,
  getFriends,
  getBlockedUsers,
  getPendingFriendRequests,
  getSentFriendRequests,
  searchUsers,
  exploreUsers,
  addPushToken,
  removePushToken,
  disableAccount,
  deleteAccount,
} from './service';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';

export const getMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const profile = await getUserProfile(userId, userId);

  return sendSuccess(res, 200, 'Profile retrieved', { profile });
});

export const updateMyProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const input = req.body;

  const profile = await updateProfile(userId, input);

  return sendSuccess(res, 200, 'Profile updated', {
    profile: {
      _id: profile._id,
      name: profile.name,
      email: profile.email,
      username: profile.username,
      avatar: profile.avatar,
      tagline: profile.tagline,
      bio: profile.bio,
    },
  });
});

export const updateMySettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const settings = req.body;

  const profile = await updateSettings(userId, settings);

  return sendSuccess(res, 200, 'Settings updated', { settings: profile.settings });
});

export const getProfileByUsername = asyncHandler(async (req: Request, res: Response) => {
  const { username } = req.params;
  const currentUserId = (req.user as { _id: string })._id;

  const user = await getUserProfile(username, currentUserId);
  if (!user) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return sendSuccess(res, 200, 'Profile retrieved', { profile: user });
});

export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const currentUserId = (req.user as { _id: string })._id;

  const profile = await getUserProfile(userId, currentUserId);
  if (!profile) {
    throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
  }

  return sendSuccess(res, 200, 'Profile retrieved', { profile });
});

// Friend management
export const sendFriendRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { userId: targetId } = req.params;

  await sendFriendRequest(userId, targetId);

  return sendSuccess(res, 200, 'Friend request sent');
});

export const acceptFriendRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { userId: fromUserId } = req.params;

  await acceptFriendRequest(userId, fromUserId);

  return sendSuccess(res, 200, 'Friend request accepted');
});

export const rejectFriendRequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { userId: fromUserId } = req.params;

  await rejectFriendRequest(userId, fromUserId);

  return sendSuccess(res, 200, 'Friend request rejected');
});

export const removeFriendHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { userId: friendId } = req.params;

  await removeFriend(userId, friendId);

  return sendSuccess(res, 200, 'Friend removed');
});

// Block management
export const blockUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { userId: targetId } = req.params;

  await blockUser(userId, targetId);

  return sendSuccess(res, 200, 'User blocked');
});

export const unblockUserHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { userId: targetId } = req.params;

  await unblockUser(userId, targetId);

  return sendSuccess(res, 200, 'User unblocked');
});

// Friends list
export const getFriendsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const friends = await getFriends(userId);

  return sendSuccess(res, 200, 'Friends retrieved', { friends });
});

export const getBlockedUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const blocked = await getBlockedUsers(userId);

  return sendSuccess(res, 200, 'Blocked users retrieved', { blockedUsers: blocked });
});

export const getPendingFriendRequestsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const requests = await getPendingFriendRequests(userId);

  return sendSuccess(res, 200, 'Pending requests retrieved', { requests });
});

export const getSentFriendRequestsHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const requests = await getSentFriendRequests(userId);

  return sendSuccess(res, 200, 'Sent requests retrieved', { requests });
});

// Search & Explore
export const searchUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    throw new ApiError(400, 'Search query is required', 'MISSING_QUERY');
  }

  const users = await searchUsers(q, userId);

  return sendSuccess(res, 200, 'Users found', { users });
});

export const exploreUsersHandler = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const users = await exploreUsers(userId);

  return sendSuccess(res, 200, 'Users found', { users });
});

// Push tokens
export const registerPushToken = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { pushToken, platform } = req.body;

  if (!pushToken || !platform) {
    throw new ApiError(400, 'Push token and platform are required', 'MISSING_PARAMS');
  }

  await addPushToken(userId, pushToken, platform);

  return sendSuccess(res, 200, 'Push token registered');
});

export const unregisterPushToken = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { token } = req.body;

  if (!token) {
    throw new ApiError(400, 'Push token is required', 'MISSING_TOKEN');
  }

  await removePushToken(userId, token);

  return sendSuccess(res, 200, 'Push token unregistered');
});

// Account management
export const disableMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;

  await disableAccount(userId);

  return sendSuccess(res, 200, 'Account disabled');
});

export const deleteMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;

  await deleteAccount(userId);

  return sendSuccess(res, 200, 'Account deleted');
});