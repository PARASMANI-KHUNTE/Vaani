/**
 * Message Controller
 * HTTP handlers for message endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { sendSuccess, sendCreated, sendOK, sendNoContent, sendError } from '../../shared/utils/apiResponse';
import {
  sendMessage,
  getMessages,
  getMessageById,
  editMessage,
  deleteMessage,
  forwardMessage,
  addReaction,
  removeReaction,
  markDelivered,
  markSeen,
  markChatMessagesSeen,
} from './service';

// ============================================================================
// Send Message
// ============================================================================

export const sendMessageController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { chatId, content, type, replyToId, media, clientTempId } = req.body;

  const message = await sendMessage({
    chatId,
    senderId: userId,
    content,
    type,
    replyToId,
    media,
    clientTempId,
  });

  sendSuccess(res, 201, 'Message sent successfully', message);
});

// ============================================================================
// Get Messages (paginated)
// ============================================================================

export const getMessagesController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { chatId } = req.params;
  const { page, limit, before } = req.query;

  const result = await getMessages(chatId, userId, {
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? parseInt(limit as string, 10) : 30,
    before: before ? new Date(before as string) : undefined,
  });

  sendSuccess(res, 200, 'Messages retrieved successfully', result);
});

// ============================================================================
// Get Single Message
// ============================================================================

export const getMessageController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;

  const message = await getMessageById(messageId, userId);

  if (!message) {
    return sendError(res, 404, 'Message not found', { code: 'MESSAGE_NOT_FOUND' });
  }

  sendSuccess(res, 200, 'Message retrieved successfully', message);
});

// ============================================================================
// Edit Message
// ============================================================================

export const editMessageController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId, chatId } = req.params;
  const { content } = req.body;

  const message = await editMessage({
    messageId,
    chatId,
    userId,
    content,
  });

  sendSuccess(res, 200, 'Message edited successfully', message);
});

// ============================================================================
// Delete Message
// ============================================================================

export const deleteMessageController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId, chatId } = req.params;
  const { scope = 'me' } = req.body;

  const result = await deleteMessage({
    messageId,
    chatId,
    userId,
    scope,
  });

  sendSuccess(res, 200, scope === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you', result);
});

// ============================================================================
// Forward Message
// ============================================================================

export const forwardMessageController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId, chatId } = req.params;
  const { targetChatId } = req.body;

  const message = await forwardMessage({
    messageId,
    chatId,
    targetChatId,
    userId,
  });

  sendSuccess(res, 201, 'Message forwarded successfully', message);
});

// ============================================================================
// Add Reaction
// ============================================================================

export const addReactionController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const userName = req.user!.name;
  const { messageId } = req.params;
  const { emoji } = req.body;

  const message = await addReaction({
    messageId,
    userId,
    userName,
    emoji,
  });

  sendSuccess(res, 200, 'Reaction added successfully', message);
});

// ============================================================================
// Remove Reaction
// ============================================================================

export const removeReactionController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;
  const { emoji } = req.body;

  const message = await removeReaction(messageId, userId, emoji);

  sendSuccess(res, 200, 'Reaction removed successfully', message);
});

// ============================================================================
// Mark Delivered
// ============================================================================

export const markDeliveredController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;

  await markDelivered(messageId, userId);

  sendSuccess(res, 200, 'Message marked as delivered', null);
});

// ============================================================================
// Mark Seen
// ============================================================================

export const markSeenController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;

  await markSeen(messageId, userId);

  sendSuccess(res, 200, 'Message marked as seen', null);
});

// ============================================================================
// Mark Chat Messages Seen
// ============================================================================

export const markChatSeenController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { chatId } = req.params;
  const { before } = req.query;

  await markChatMessagesSeen(chatId, userId, before ? new Date(before as string) : undefined);

  sendSuccess(res, 200, 'Messages marked as seen', null);
});