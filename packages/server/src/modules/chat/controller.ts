/**
 * Chat Controller
 * HTTP handlers for chat endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse';
import {
  createDirectChat,
  createGroupChat,
  updateGroup,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
  transferGroupOwnership,
  leaveGroup,
  createGroupInviteLink,
  getGroupInvitePreview,
  joinGroupViaInvite,
  updateUserChatState,
  markChatRead,
  markChatUnread,
  clearChatMessages,
  deleteChatForUser,
} from './service';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';

export const listChats = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { limit = 30, offset = 0, includeHidden = false } = req.query;

  const Chat = (await import('./model')).Chat;
  const chats = await Chat.findUserChats(new (await import('mongoose')).Types.ObjectId(userId), {
    limit: Number(limit),
    offset: Number(offset),
    includeHidden: includeHidden === 'true',
  });

  return sendSuccess(res, 200, 'Chats retrieved', { chats });
});

export const getChat = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const Chat = (await import('./model')).Chat;
  const chat = await Chat.getChatWithParticipants(new (await import('mongoose')).Types.ObjectId(chatId));

  if (!chat) {
    throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');
  }

  if (!chat.isParticipant(new (await import('mongoose')).Types.ObjectId(userId))) {
    throw new ApiError(403, 'Not a member of this chat', 'NOT_CHAT_MEMBER');
  }

  return sendSuccess(res, 200, 'Chat retrieved', { chat });
});

export const createChat = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req.user as { _id: string })._id;
  const { participantId, isGroup, groupName, participantIds, groupDescription, groupAvatar } = req.body;

  if (isGroup) {
    const chat = await createGroupChat({
      groupName,
      participantIds,
      currentUserId: userId,
      groupDescription,
      groupAvatar,
    });
    return sendSuccess(res, 201, 'Group chat created', { chat });
  } else {
    const chat = await createDirectChat({ participantId, currentUserId: userId });
    return sendSuccess(res, 201, 'Direct chat created', { chat });
  }
});

export const updateGroupChat = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;
  const input = req.body;

  const chat = await updateGroup(chatId, userId, input);
  return sendSuccess(res, 200, 'Group updated', { chat });
});

export const addMembers = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;
  const { memberIds } = req.body;

  const chat = await addGroupMembers({ chatId, memberIds, currentUserId: userId });
  return sendSuccess(res, 200, 'Members added', { chat });
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, memberId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const chat = await removeGroupMember(chatId, memberId, userId);
  return sendSuccess(res, 200, 'Member removed', { chat });
});

export const promoteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, memberId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const chat = await promoteGroupAdmin(chatId, memberId, userId);
  return sendSuccess(res, 200, 'Member promoted to admin', { chat });
});

export const demoteAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { chatId, memberId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const chat = await demoteGroupAdmin(chatId, memberId, userId);
  return sendSuccess(res, 200, 'Admin demoted to member', { chat });
});

export const transferOwnership = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;
  const { nextOwnerId } = req.body;

  const chat = await transferGroupOwnership(chatId, nextOwnerId, userId);
  return sendSuccess(res, 200, 'Ownership transferred', { chat });
});

export const leaveGroupChat = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const result = await leaveGroup(chatId, userId);
  return sendSuccess(res, 200, result.deleted ? 'Group deleted' : 'Left group', result);
});

// Group Invites
export const createInviteLink = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;
  const { expiresInHours, maxUses } = req.body;

  const invite = await createGroupInviteLink(chatId, userId, { expiresInHours, maxUses });
  return sendSuccess(res, 200, 'Invite link created', { invite });
});

export const getInvitePreview = asyncHandler(async (req: Request, res: Response) => {
  const { inviteToken } = req.params;

  const preview = await getGroupInvitePreview(inviteToken);
  if (!preview) {
    throw new ApiError(404, 'Invite not found or expired', 'INVITE_NOT_FOUND');
  }

  return sendSuccess(res, 200, 'Invite preview', { invite: preview });
});

export const joinViaInvite = asyncHandler(async (req: Request, res: Response) => {
  const { inviteToken } = req.params;
  const userId = (req.user as { _id: string })._id;

  const result = await joinGroupViaInvite(inviteToken, userId);
  return sendSuccess(res, 200, result.joined ? 'Joined group' : 'Already a member', result);
});

// Chat Settings
export const updateChatSettings = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;
  const state = req.body;

  const chat = await updateUserChatState(chatId, userId, state);
  return sendSuccess(res, 200, 'Chat settings updated', { chat });
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const chat = await markChatRead(chatId, userId);
  return sendSuccess(res, 200, 'Chat marked as read', { chat });
});

export const markUnread = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const chat = await markChatUnread(chatId, userId);
  return sendSuccess(res, 200, 'Chat marked as unread', { chat });
});

export const clearMessages = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const chat = await clearChatMessages(chatId, userId);
  return sendSuccess(res, 200, 'Chat messages cleared', { chat });
});

export const deleteChat = asyncHandler(async (req: Request, res: Response) => {
  const { chatId } = req.params;
  const userId = (req.user as { _id: string })._id;

  const result = await deleteChatForUser(chatId, userId);
  return sendSuccess(res, 200, 'Chat deleted for you', result);
});