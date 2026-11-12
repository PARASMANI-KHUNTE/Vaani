/**
 * Chat Routes
 * Chat creation, management, invites, settings endpoints
 */

import { Router } from 'express';
import {
  listChats,
  getChat,
  createChat,
  updateGroupChat,
  addMembers,
  removeMember,
  promoteAdmin,
  demoteAdmin,
  transferOwnership,
  leaveGroupChat,
  createInviteLink,
  getInvitePreview,
  joinViaInvite,
  updateChatSettings,
  markRead,
  markUnread,
  clearMessages,
  deleteChat,
} from './controller';
import {
  createDirectChatValidator,
  createGroupChatValidator,
  updateGroupValidator,
  addGroupMembersValidator,
  promoteDemoteAdminValidator,
  transferOwnershipValidator,
  groupInviteValidator,
  chatStateValidator,
  chatIdParamValidator,
  memberIdParamValidator,
  inviteTokenParamValidator,
  validate,
} from './validators';
import { authMiddleware } from '../../shared/middleware/auth';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Chat listing
router.get('/', listChats);

// Create chats
router.post('/', (req, res, next) => {
  // Determine if it's a group or direct chat based on request body
  const isGroup = req.body.isGroup === true;
  if (isGroup) {
    return createGroupChatValidator, validate, createChat;
  } else {
    return createDirectChatValidator, validate, createChat;
  }
}, (req, res, next) => {
  // This middleware applies the correct validator based on isGroup
  const isGroup = req.body.isGroup === true;
  if (isGroup) {
    return createGroupChatValidator[0](req, res, () => createGroupChatValidator[1](req, res, () => createGroupChatValidator[2](req, res, () => validate(req, res, next))));
  } else {
    return createDirectChatValidator[0](req, res, () => validate(req, res, next));
  }
}, createChat);

// Better approach - separate endpoints
router.post('/direct', createDirectChatValidator, validate, createChat);
router.post('/group', createGroupChatValidator, validate, createChat);

// Chat by ID
router.get('/:chatId', chatIdParamValidator, validate, getChat);
router.patch('/:chatId/group', chatIdParamValidator, updateGroupValidator, validate, updateGroupChat);

// Members
router.post('/:chatId/members', chatIdParamValidator, addGroupMembersValidator, validate, addMembers);
router.delete('/:chatId/members/:memberId', chatIdParamValidator, memberIdParamValidator, validate, removeMember);

// Admins
router.post('/:chatId/admins/:memberId', chatIdParamValidator, memberIdParamValidator, validate, promoteAdmin);
router.delete('/:chatId/admins/:memberId', chatIdParamValidator, memberIdParamValidator, validate, demoteAdmin);

// Owner
router.post('/:chatId/owner', chatIdParamValidator, transferOwnershipValidator, validate, transferOwnership);

// Leave group
router.post('/:chatId/leave', chatIdParamValidator, validate, leaveGroupChat);

// Invites
router.post('/:chatId/invite-link', chatIdParamValidator, groupInviteValidator, validate, createInviteLink);
router.get('/invite/:inviteToken', inviteTokenParamValidator, validate, getInvitePreview);
router.post('/invite/:inviteToken/join', inviteTokenParamValidator, validate, joinViaInvite);

// Settings
router.patch('/:chatId/settings', chatIdParamValidator, chatStateValidator, validate, updateChatSettings);
router.patch('/:chatId/read', chatIdParamValidator, validate, markRead);
router.patch('/:chatId/unread', chatIdParamValidator, validate, markUnread);
router.post('/:chatId/clear', chatIdParamValidator, validate, clearMessages);
router.delete('/:chatId', chatIdParamValidator, validate, deleteChat);

export { router as chatRoutes };