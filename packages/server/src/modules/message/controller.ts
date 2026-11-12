/**
 * Message Controller
 * HTTP handlers for message endpoints
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/asyncHandler';
import { apiResponse } from '../../shared/utils/apiResponse';
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

  apiResponse.success(res, message, 'Message sent successfully', 201);
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

  apiResponse.success(res, result, 'Messages retrieved successfully');
});

// ============================================================================
// Get Single Message
// ============================================================================

export const getMessageController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;

  const message = await getMessageById(messageId, userId);

  if (!message) {
    return apiResponse.notFound(res, 'Message not found');
  }

  apiResponse.success(res, message, 'Message retrieved successfully');
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

  apiResponse.success(res, message, 'Message edited successfully');
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

  apiResponse.success(res, result, scope === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you');
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

  apiResponse.success(res, message, 'Message forwarded successfully', 201);
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

  apiResponse.success(res, message, 'Reaction added successfully');
});

// ============================================================================
// Remove Reaction
// ============================================================================

export const removeReactionController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;
  const { emoji } = req.body;

  const message = await removeReaction(messageId, userId, emoji);

  apiResponse.success(res, message, 'Reaction removed successfully');
});

// ============================================================================
// Mark Delivered
// ============================================================================

export const markDeliveredController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;

  await markDelivered(messageId, userId);

  apiResponse.success(res, null, 'Message marked as delivered');
});

// ============================================================================
// Mark Seen
// ============================================================================

export const markSeenController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { messageId } = req.params;

  await markSeen(messageId, userId);

  apiResponse.success(res, null, 'Message marked as seen');
});

// ============================================================================
// Mark Chat Messages Seen
// ============================================================================

export const markChatSeenController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!._id.toString();
  const { chatId } = req.params;
  const { before } = req.query;

  await markChatMessagesSeen(chatId, userId, before ? new Date(before as string) : undefined);

  apiResponse.success(res, null, 'Messages marked as seen');
});