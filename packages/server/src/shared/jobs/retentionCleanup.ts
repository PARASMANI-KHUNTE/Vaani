/**
 * Retention Cleanup Job
 * Scheduled cleanup of old chats and messages based on retention policy
 */

import { config } from '../../config';
import { logger } from '../../shared/utils/logger';
import { Chat } from '../../modules/chat/model';
import { Message } from '../../modules/message/model';
import { destroyMediaAssets } from '../../shared/utils/mediaUpload';
import mongoose from 'mongoose';

// ============================================================================
// Configuration
// ============================================================================

let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let cleanupInProgress = false;

// ============================================================================
// Helper Functions
// ============================================================================

const daysToCutoff = (days: number): Date | null => {
  if (!Number.isFinite(days) || days <= 0) {
    return null;
  }
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
};

// ============================================================================
// Main Cleanup Function
// ============================================================================

export const runRetentionCleanup = async (): Promise<{
  deletedChats: number;
  deletedMessages: number;
  deletedMediaAssets: number;
  skipped?: boolean;
}> => {
  if (cleanupInProgress || mongoose.connection.readyState !== 1) {
    logger.debug({ cleanupInProgress, dbReady: mongoose.connection.readyState === 1 }, 'Retention cleanup skipped');
    return { deletedChats: 0, deletedMessages: 0, deletedMediaAssets: 0, skipped: true };
  }

  cleanupInProgress = true;
  const startTime = Date.now();

  try {
    const chatCutoff = daysToCutoff(config.retention.chatDays);
    const messageCutoff = daysToCutoff(config.retention.messageDays);

    let deletedChats = 0;
    let deletedMessages = 0;
    let deletedMediaAssets = 0;
    let retainedChatIds: mongoose.Types.ObjectId[] = [];

    // Cleanup old chats
    if (chatCutoff) {
      logger.info({ cutoffDate: chatCutoff.toISOString() }, 'Starting chat retention cleanup');

      const oldChats = await Chat.find({ updatedAt: { $lt: chatCutoff } })
        .select('_id')
        .lean();

      const oldChatIds = oldChats.map((chat) => chat._id);
      retainedChatIds = oldChatIds;

      if (oldChatIds.length > 0) {
        // Get messages in these chats for media cleanup
        const chatMessages = await Message.find({ chatId: { $in: oldChatIds } })
          .select('media')
          .lean();

        // Delete associated media assets
        const mediaPublicIds = chatMessages
          .map((message) => message.media?.publicId)
          .filter(Boolean) as string[];
        deletedMediaAssets += await destroyMediaAssets(mediaPublicIds);

        // Delete messages
        const messageDeleteResult = await Message.deleteMany({ chatId: { $in: oldChatIds } });
        deletedMessages += messageDeleteResult.deletedCount || 0;

        // Delete chats
        const chatDeleteResult = await Chat.deleteMany({ _id: { $in: oldChatIds } });
        deletedChats += chatDeleteResult.deletedCount || 0;

        logger.info({ chatsDeleted: deletedChats, messagesDeleted: deletedMessages, mediaAssetsDeleted: deletedMediaAssets }, 'Chat retention cleanup completed');
      }
    }

    // Cleanup old messages (not in deleted chats)
    if (messageCutoff) {
      logger.info({ cutoffDate: messageCutoff.toISOString() }, 'Starting message retention cleanup');

      const query: Record<string, unknown> = { createdAt: { $lt: messageCutoff } };

      // Exclude messages from chats that were already deleted
      if (retainedChatIds.length > 0) {
        query.chatId = { $nin: retainedChatIds };
      }

      const oldMessages = await Message.find(query)
        .select('_id media')
        .lean();

      if (oldMessages.length > 0) {
        // Delete associated media assets
        const mediaPublicIds = oldMessages
          .map((message) => message.media?.publicId)
          .filter(Boolean) as string[];
        deletedMediaAssets += await destroyMediaAssets(mediaPublicIds);

        const messageIds = oldMessages.map((message) => message._id);
        const deleteResult = await Message.deleteMany({ _id: { $in: messageIds } });
        deletedMessages += deleteResult.deletedCount || 0;

        logger.info({ messagesDeleted: deleteResult.deletedCount, mediaAssetsDeleted: deletedMediaAssets }, 'Message retention cleanup completed');
      }
    }

    const duration = Date.now() - startTime;
    logger.info({ deletedChats, deletedMessages, deletedMediaAssets, durationMs: duration }, 'Retention cleanup completed');

    return {
      deletedChats,
      deletedMessages,
      deletedMediaAssets,
    };
  } catch (error) {
    logger.error({ error: (error as Error).message, stack: (error as Error).stack }, 'Retention cleanup failed');
    throw error;
  } finally {
    cleanupInProgress = false;
  }
};

// ============================================================================
// Scheduler
// ============================================================================

export const initializeRetentionCleanup = (): void => {
  const intervalHours = config.retention.cleanupIntervalHours;

  if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
    logger.info({}, 'Retention cleanup scheduler disabled (interval not configured)');
    return;
  }

  // Run initial cleanup
  runRetentionCleanup().catch((error) => {
    logger.error({ error: error.message, stack: error.stack }, 'Initial retention cleanup failed');
  });

  // Schedule periodic cleanup
  cleanupTimer = setInterval(() => {
    runRetentionCleanup().catch((error) => {
      logger.error({ error: error.message, stack: error.stack }, 'Scheduled retention cleanup failed');
    });
  }, intervalHours * 60 * 60 * 1000);

  logger.info({ intervalHours }, 'Retention cleanup scheduler initialized');
};

export const stopRetentionCleanup = (): void => {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info({}, 'Retention cleanup scheduler stopped');
  }
};

export const isCleanupRunning = (): boolean => cleanupInProgress;

// ============================================================================
// Manual Trigger (for testing/admin)
// ============================================================================

export const triggerRetentionCleanup = async (): Promise<{
  deletedChats: number;
  deletedMessages: number;
  deletedMediaAssets: number;
}> => {
  logger.info({}, 'Manual retention cleanup triggered');
  return runRetentionCleanup();
};

// ============================================================================
// Health Check
// ============================================================================

export const getRetentionCleanupStatus = (): {
  enabled: boolean;
  intervalHours: number;
  chatRetentionDays: number;
  messageRetentionDays: number;
  running: boolean;
} => {
  return {
    enabled: config.retention.cleanupIntervalHours > 0,
    intervalHours: config.retention.cleanupIntervalHours,
    chatRetentionDays: config.retention.chatDays,
    messageRetentionDays: config.retention.messageDays,
    running: cleanupInProgress,
  };
};