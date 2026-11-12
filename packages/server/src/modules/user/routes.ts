/**
 * User Routes
 * User profile, friends, blocks, search endpoints
 */

import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  updateMySettings,
  getProfileByUsername,
  getProfileById,
  sendFriendRequestHandler,
  acceptFriendRequestHandler,
  rejectFriendRequestHandler,
  removeFriendHandler,
  blockUserHandler,
  unblockUserHandler,
  getFriendsHandler,
  getBlockedUsersHandler,
  getPendingFriendRequestsHandler,
  getSentFriendRequestsHandler,
  searchUsersHandler,
  exploreUsersHandler,
  registerPushToken,
  unregisterPushToken,
  disableMyAccount,
  deleteMyAccount,
} from './controller';
import {
  updateProfileValidator,
  updateSettingsValidator,
  userIdParamValidator,
  searchUsersValidator,
  pushTokenValidator,
  blockUserValidator,
  validate,
} from './validators';
import { authMiddleware } from '../../shared/middleware/auth';

const router: Router = Router();

// All routes require authentication
router.use(authMiddleware);

// Profile
router.get('/me', getMyProfile);
router.patch('/me', updateProfileValidator, validate, updateMyProfile);
router.patch('/me/settings', updateSettingsValidator, validate, updateMySettings);

// Profile by username/id
router.get('/profile/:username', getProfileByUsername);
router.get('/:userId/profile', userIdParamValidator, validate, getProfileById);

// Friends
router.post('/:userId/friend-request', userIdParamValidator, validate, sendFriendRequestHandler);
router.post('/:userId/friend-request/accept', userIdParamValidator, validate, acceptFriendRequestHandler);
router.post('/:userId/friend-request/reject', userIdParamValidator, validate, rejectFriendRequestHandler);
router.delete('/:userId/friend', userIdParamValidator, validate, removeFriendHandler);

// Blocks
router.post('/:userId/block', userIdParamValidator, validate, blockUserHandler);
router.delete('/:userId/block', userIdParamValidator, validate, unblockUserHandler);

// Lists
router.get('/me/friends', getFriendsHandler);
router.get('/me/blocked', getBlockedUsersHandler);
router.get('/me/friend-requests/pending', getPendingFriendRequestsHandler);
router.get('/me/friend-requests/sent', getSentFriendRequestsHandler);

// Search & Explore
router.get('/search', searchUsersValidator, validate, searchUsersHandler);
router.get('/explore', exploreUsersHandler);

// Push tokens
router.post('/push-token', pushTokenValidator, validate, registerPushToken);
router.delete('/push-token', pushTokenValidator, validate, unregisterPushToken);

// Account
router.post('/me/disable', disableMyAccount);
router.delete('/me', deleteMyAccount);

export { router as userRoutes };