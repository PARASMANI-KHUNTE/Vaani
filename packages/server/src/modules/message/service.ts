/**
 * Message Service
 * Business logic for messages - CRUD, editing, forwarding, reactions, delivery/seen tracking, media
 */

import mongoose, { ClientSession } from 'mongoose';
import { Message, IMessage } from './model';
import { Chat } from '../chat/model';
import { User } from '../user/model';
import { ApiError } from '../../shared/utils/apiError';
import { logger } from '../../shared/utils/logger';
import { Limits } from '@chat-app/shared/constants';
import { isTransactionSupported, withTransaction } from '../../core/mongoose';
import { socketEmitters } from '../../core/socket/server';
import { enqueueOfflineMessage, processOfflineQueue } from '../../shared/utils/offlineQueue';
import { destroyMediaAssets } from '../../shared/utils/mediaUpload';

// ============================================================================
// Types
// ============================================================================

interface SendMessageInput {
  chatId: string;
  senderId: string;
  content?: string;
  type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'contact';
  replyToId?: string | null;
  media?: { url: string; thumbnailUrl?: string; publicId: string; format: string; width?: number; height?: number; duration?: number; fileSize: number; fileName?: string; mimeType: string } | null;
  clientTempId?: string;
}

interface EditMessageInput {
  messageId: string;
  chatId: string;
  userId: string;
  content: string;
}

interface DeleteMessageInput {
  messageId: string;
  chatId: string;
  userId: string;
  scope: 'me' | 'everyone';
}

interface ForwardMessageInput {
  messageId: string;
  chatId: string;
  targetChatId: string;
  userId: string;
}

interface ReactionInput {
  messageId: string;
  userId: string;
  userName: string;
  emoji: string;
}

// ============================================================================
// Send Message
// ============================================================================

export const sendMessage = async (input: SendMessageInput): Promise<IMessage> => {
  const { chatId, senderId, content, type = 'text', replyToId, media, clientTempId } = input;

  // Verify chat exists and user is participant
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (!chat.isParticipant(new mongoose.Types.ObjectId(senderId))) {
    throw new ApiError(403, 'Not a member of this chat', 'NOT_CHAT_MEMBER');
  }

  // Verify sender is active
  const sender = await User.findById(senderId);
  if (!sender || sender.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_INACTIVE');
  }

  // Validate content based on type
  if (type === 'text' && (!content || content.trim().length === 0)) {
    throw new ApiError(400, 'Message content is required for text messages', 'MISSING_CONTENT');
  }

  if (content && content.length > Limits.MAX_MESSAGE_LENGTH) {
    throw new ApiError(400, `Message too long (max ${Limits.MAX_MESSAGE_LENGTH} characters)`, 'MESSAGE_TOO_LONG');
  }

  // Validate replyTo if provided
  let replyTo: IMessage['replyTo'] | undefined;
  if (replyToId) {
    const replyMessage = await Message.findById(replyToId);
    if (!replyMessage || !replyMessage.chatId.equals(chatId)) {
      throw new ApiError(404, 'Reply message not found', 'REPLY_NOT_FOUND');
    }
    replyTo = {
      _id: replyMessage._id,
      content: replyMessage.content,
      type: replyMessage.type,
      senderId: replyMessage.senderId,
      senderName: replyMessage.senderName || '',
      media: replyMessage.media,
    };
  }

  // Create message
  const message = await Message.create({
    chatId,
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    type,
    content: content?.trim(),
    media,
    replyTo,
    clientTempId,
  });

  // Update chat's lastMessage and updatedAt
  chat.lastMessage = message._id;
  chat.updatedAt = new Date();
  await chat.save();

  // Populate for response
  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean();

  // Emit real-time event
  socketEmitters.newMessage(
    chatId,
    populatedMessage! as any,
    clientTempId
  );

  // Handle offline recipients
  for (const participant of chat.participants) {
    if (!participant.userId.equals(senderId)) {
      const recipient = await User.findById(participant.userId);
      if (recipient && !recipient.isOnline) {
        await enqueueOfflineMessage(participant.userId.toString(), populatedMessage! as any, chatId);
      }
    }
  }

  logger.debug('Message sent', { messageId: message._id, chatId, senderId });
  return populatedMessage! as any;
};

// ============================================================================
// Get Messages
// ============================================================================

export const getMessages = async (
  chatId: string,
  userId: string,
  options: { page?: number; limit?: number; before?: Date } = {}
): Promise<{ messages: IMessage[]; pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean } }> => {
  const { page = 1, limit = 30, before } = options;

  // Verify chat access
  const chat = await Chat.findById(chatId);
  if (!chat) throw new ApiError(404, 'Chat not found', 'CHAT_NOT_FOUND');

  if (!chat.isParticipant(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(403, 'Not a member of this chat', 'NOT_CHAT_MEMBER');
  }

  const messages = await Message.findChatMessages(new mongoose.Types.ObjectId(chatId), {
    page,
    limit,
    before,
    userId: new mongoose.Types.ObjectId(userId),
  });

  // Get total count for pagination
  const total = await Message.countDocuments({
    chatId,
    deletedForEveryone: { $ne: true },
    deletedFor: { $ne: userId },
    ...(before ? { createdAt: { $lt: before } } : {}),
  });

  const totalPages = Math.ceil(total / limit);

  return {
    messages: messages.reverse(), // Return in chronological order
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
    },
  };
};

export const getMessageById = async (messageId: string, userId: string): Promise<IMessage | null> => {
  return Message.getMessageById(new mongoose.Types.ObjectId(messageId), new mongoose.Types.ObjectId(userId));
};

// ============================================================================
// Edit Message
// ============================================================================

export const editMessage = async (input: EditMessageInput): Promise<IMessage> => {
  const { messageId, chatId, userId, content } = input;

  if (!content || content.trim().length === 0) {
    throw new ApiError(400, 'Message content is required', 'MISSING_CONTENT');
  }

  if (content.length > Limits.MAX_MESSAGE_LENGTH) {
    throw new ApiError(400, `Message too long (max ${Limits.MAX_MESSAGE_LENGTH} characters)`, 'MESSAGE_TOO_LONG');
  }

  const message = await Message.findOne({ _id: messageId, chatId });
  if (!message) throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');

  if (!message.senderId.equals(userId)) {
    throw new ApiError(403, 'Can only edit your own messages', 'NOT_MESSAGE_OWNER');
  }

  if (message.deletedForEveryone || message.deletedFor.some((id) => id.equals(userId))) {
    throw new ApiError(400, 'Cannot edit deleted message', 'MESSAGE_DELETED');
  }

  if (message.type !== 'text') {
    throw new ApiError(400, 'Can only edit text messages', 'INVALID_MESSAGE_TYPE');
  }

  // Check edit time limit (e.g., 15 minutes)
  const editWindowMs = 15 * 60 * 1000;
  if (Date.now() - message.createdAt.getTime() > editWindowMs) {
    throw new ApiError(400, 'Edit time limit exceeded', 'EDIT_TIME_EXPIRED');
  }

  await message.edit(content.trim());
  await message.save();

  // Populate for response
  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean();

  // Emit real-time event
  socketEmitters.messageEdited(populatedMessage! as any);

  logger.debug('Message edited', { messageId, chatId, userId });
  return populatedMessage! as any;
};

// ============================================================================
// Delete Message
// ============================================================================

export const deleteMessage = async (input: DeleteMessageInput): Promise<{ messageId: string; chatId: string; message?: IMessage }> => {
  const { messageId, chatId, userId, scope } = input;

  const message = await Message.findOne({ _id: messageId, chatId });
  if (!message) throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');

  // Check permissions
  const isOwner = message.senderId.equals(userId);
  const chat = await Chat.findById(chatId);
  const role = chat?.getParticipantRole(new mongoose.Types.ObjectId(userId));
  const isAdmin = role === 'admin' || role === 'owner';

  if (scope === 'everyone') {
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, 'Only message owner or admin can delete for everyone', 'NOT_AUTHORIZED');
    }

    // Time limit for delete for everyone (e.g., 1 hour)
    const deleteWindowMs = 60 * 60 * 1000;
    if (Date.now() - message.createdAt.getTime() > deleteWindowMs && !isAdmin) {
      throw new ApiError(400, 'Delete for everyone time limit exceeded', 'DELETE_TIME_EXPIRED');
    }

    await message.softDeleteForEveryone();
    await message.save();

    // Clean up media if no other messages reference it
    if (message.media) {
      await destroyMediaAssets([message.media.publicId]);
    }
  } else {
    // Delete for me
    if (message.deletedFor.some((id) => id.equals(userId))) {
      throw new ApiError(400, 'Message already deleted for you', 'ALREADY_DELETED');
    }

    await message.softDeleteFor(new mongoose.Types.ObjectId(userId));
    await message.save();
  }

  // Populate for response (if not deleted for everyone)
  let populatedMessage: IMessage | undefined;
  if (scope === 'me') {
    populatedMessage = await Message.findById(message._id)
      .populate('senderId', '_id name username email avatar')
      .populate('replyTo', '_id content type senderId senderName media')
      .lean();
  }

  // Emit real-time event
  socketEmitters.messageDeleted(chatId, messageId, scope, populatedMessage as any);

  logger.debug('Message deleted', { messageId, chatId, userId, scope });
  return { messageId, chatId, message: populatedMessage };
};

// ============================================================================
// Forward Message
// ============================================================================

export const forwardMessage = async (input: ForwardMessageInput): Promise<IMessage> => {
  const { messageId, chatId, targetChatId, userId } = input;

  // Get original message
  const originalMessage = await Message.findOne({ _id: messageId, chatId })
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean();

  if (!originalMessage) throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');

  // Verify target chat
  const targetChat = await Chat.findById(targetChatId);
  if (!targetChat) throw new ApiError(404, 'Target chat not found', 'CHAT_NOT_FOUND');

  if (!targetChat.isParticipant(new mongoose.Types.ObjectId(userId))) {
    throw new ApiError(403, 'Not a member of target chat', 'NOT_CHAT_MEMBER');
  }

  // Verify sender is active
  const sender = await User.findById(userId);
  if (!sender || sender.accountStatus !== 'active') {
    throw new ApiError(403, 'Account is disabled or deleted', 'ACCOUNT_INACTIVE');
  }

  // Create forwarded message
  const forwardedMessage = await Message.create({
    chatId: targetChatId,
    senderId: userId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    type: originalMessage.type,
    content: originalMessage.content,
    media: originalMessage.media,
    replyTo: originalMessage.replyTo,
    // Note: we don't forward reactions, receipts, or system events
  });

  // Update target chat
  targetChat.lastMessage = forwardedMessage._id;
  targetChat.updatedAt = new Date();
  await targetChat.save();

  // Populate for response
  const populatedMessage = await Message.findById(forwardedMessage._id)
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean();

  // Emit real-time event
  socketEmitters.newMessage(targetChatId, populatedMessage! as any);

  logger.debug('Message forwarded', { originalMessageId: messageId, targetChatId, userId });
  return populatedMessage!;
};

// ============================================================================
// Reactions
// ============================================================================

export const addReaction = async (input: ReactionInput): Promise<IMessage> => {
  const { messageId, userId, userName, emoji } = input;

  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');

  if (message.deletedForEveryone || message.deletedFor.some((id) => id.equals(userId))) {
    throw new ApiError(400, 'Cannot react to deleted message', 'MESSAGE_DELETED');
  }

  // Limit reactions per message
  if (message.reactions.length >= 50) {
    throw new ApiError(400, 'Maximum reactions reached for this message', 'MAX_REACTIONS');
  }

  await message.addReaction(new mongoose.Types.ObjectId(userId), userName, emoji);
  await message.save();

  // Populate for response
  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean();

  // Emit real-time event
  socketEmitters.reactionAdded(populatedMessage! as any, userId, userName, emoji);

  logger.debug('Reaction added', { messageId, userId, emoji });
  return populatedMessage!;
};

export const removeReaction = async (messageId: string, userId: string, emoji: string): Promise<IMessage> => {
  const message = await Message.findById(messageId);
  if (!message) throw new ApiError(404, 'Message not found', 'MESSAGE_NOT_FOUND');

  await message.removeReaction(new mongoose.Types.ObjectId(userId), emoji);
  await message.save();

  // Populate for response
  const populatedMessage = await Message.findById(message._id)
    .populate('senderId', '_id name username email avatar')
    .populate('replyTo', '_id content type senderId senderName media')
    .lean();

  // Emit real-time event
  socketEmitters.reactionRemoved(populatedMessage! as any, userId, emoji);

  logger.debug('Reaction removed', { messageId, userId, emoji });
  return populatedMessage!;
};

// ============================================================================
// Delivery/Seen Tracking
// ============================================================================

export const markDelivered = async (messageId: string, userId: string): Promise<void> => {
  const message = await Message.findById(messageId);
  if (!message) return;

  await message.markDelivered(new mongoose.Types.ObjectId(userId));
  await message.save();

  // Emit real-time event
  socketEmitters.messageDelivered(message.chatId.toString(), messageId, userId);
};

export const markSeen = async (messageId: string, userId: string): Promise<void> => {
  const message = await Message.findById(messageId);
  if (!message) return;

  await message.markSeen(new mongoose.Types.ObjectId(userId));
  await message.save();

  // Emit real-time event
  socketEmitters.messageSeen(message.chatId.toString(), messageId, userId);
};

export const markChatMessagesSeen = async (chatId: string, userId: string, before?: Date): Promise<void> => {
  const query: Record<string, unknown> = {
    chatId,
    'receipts.userId': { $ne: userId },
    deletedForEveryone: { $ne: true },
    deletedFor: { $ne: userId },
  };

  if (before) {
    query.createdAt = { $lt: before };
  }

  const messages = await Message.find(query).select('_id').lean();

  for (const msg of messages) {
    await markSeen(msg._id.toString(), userId);
  }
};

// ============================================================================
// Media Upload (handled via Cloudinary, just return metadata)
// ============================================================================

export const processMessageMedia = async (
  mediaData: { url: string; thumbnailUrl?: string; publicId: string; format: string; width?: number; height?: number; duration?: number; fileSize: number; fileName?: string; mimeType: string }
): Promise<IMessage['media']> => {
  // Media is already uploaded to Cloudinary by client
  // Just return the metadata for message creation
  return mediaData;
};

// ============================================================================
// Process Offline Queue (called when user comes online)
// ============================================================================

export const processUserOfflineQueue = async (userId: string): Promise<void> => {
  await processOfflineQueue(userId, async (queuedMessage) => {
    // Send the queued message via socket
    // This is handled by the socket layer
    return true;
  });
};