/**
 * Offline Message Queue
 * Redis-based queue for storing messages when users are offline
 */

import { cache, isRedisEnabled } from '../../config/redis';
import { logger } from './logger';
import { Message } from '@chat-app/shared/types';

// ============================================================================
// Configuration
// ============================================================================

const OFFLINE_QUEUE_PREFIX = 'offline_queue:';
const MAX_QUEUE_SIZE = 1000;
const QUEUE_TTL = 7 * 24 * 60 * 60; // 7 days

// ============================================================================
// Types
// ============================================================================

interface QueuedMessage {
  message: Message;
  chatId: string;
  recipientId: string;
  enqueuedAt: string;
  attempts: number;
}

interface QueueStats {
  totalMessages: number;
  oldestMessage?: string;
  newestMessage?: string;
}

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Add a message to user's offline queue
 */
export const enqueueOfflineMessage = async (
  userId: string,
  message: Message,
  chatId: string
): Promise<boolean> => {
  if (!isRedisEnabled()) {
    logger.debug({ userId }, 'Offline queue: Redis disabled, skipping');
    return false;
  }

  try {
    const key = `${OFFLINE_QUEUE_PREFIX}${userId}`;
    const queuedMessage: QueuedMessage = {
      message,
      chatId,
      recipientId: userId,
      enqueuedAt: new Date().toISOString(),
      attempts: 0,
    };

    // Use Redis list for queue (LPUSH for newest first)
    // We'll store as JSON strings
    const client = cache as unknown as { lpush?: (key: string, value: string) => Promise<number>; ltrim?: (key: string, start: number, stop: number) => Promise<void>; expire?: (key: string, seconds: number) => Promise<void> };

    if (client.lpush) {
      await client.lpush(key, JSON.stringify(queuedMessage));
      // Trim to max size
      await client.ltrim?.(key, 0, MAX_QUEUE_SIZE - 1);
      // Set TTL
      await client.expire?.(key, QUEUE_TTL);
      logger.debug({ userId, messageId: message._id }, 'Message enqueued for offline user');
      return true;
    }

    return false;
  } catch (error) {
    logger.error({ userId, error: (error as Error).message }, 'Failed to enqueue offline message');
    return false;
  }
};

/**
 * Get and remove messages from user's offline queue
 */
export const dequeueOfflineMessages = async (userId: string, limit: number = 100): Promise<QueuedMessage[]> => {
  if (!isRedisEnabled()) {
    return [];
  }

  try {
    const key = `${OFFLINE_QUEUE_PREFIX}${userId}`;
    const client = cache as unknown as { lrange?: (key: string, start: number, stop: number) => Promise<string[]>; ltrim?: (key: string, start: number, stop: number) => Promise<void> };

    if (!client.lrange) return [];

    const messages = await client.lrange(key, 0, limit - 1);
    if (!messages.length) return [];

    // Remove dequeued messages
    await client.ltrim?.(key, limit, -1);

    return messages.map((msg) => JSON.parse(msg) as QueuedMessage);
  } catch (error) {
    logger.error({ userId, error: (error as Error).message }, 'Failed to dequeue offline messages');
    return [];
  }
};

/**
 * Peek at offline queue without removing messages
 */
export const peekOfflineQueue = async (userId: string, limit: number = 50): Promise<QueuedMessage[]> => {
  if (!isRedisEnabled()) {
    return [];
  }

  try {
    const key = `${OFFLINE_QUEUE_PREFIX}${userId}`;
    const client = cache as unknown as { lrange?: (key: string, start: number, stop: number) => Promise<string[]> };

    if (!client.lrange) return [];

    const messages = await client.lrange(key, 0, limit - 1);
    return messages.map((msg) => JSON.parse(msg) as QueuedMessage);
  } catch (error) {
    logger.error({ userId, error: (error as Error).message }, 'Failed to peek offline queue');
    return [];
  }
};

/**
 * Get queue statistics
 */
export const getOfflineQueueStats = async (userId: string): Promise<QueueStats> => {
  if (!isRedisEnabled()) {
    return { totalMessages: 0 };
  }

  try {
    const key = `${OFFLINE_QUEUE_PREFIX}${userId}`;
    const client = cache as unknown as { llen?: (key: string) => Promise<number>; lrange?: (key: string, start: number, stop: number) => Promise<string[]> };

    if (!client.llen) return { totalMessages: 0 };

    const totalMessages = await client.llen(key);
    if (totalMessages === 0) return { totalMessages: 0 };

    const [oldest, newest] = await Promise.all([
      client.lrange?.(key, -1, -1),
      client.lrange?.(key, 0, 0),
    ]);

    return {
      totalMessages,
      oldestMessage: oldest?.[0] ? JSON.parse(oldest[0]).enqueuedAt : undefined,
      newestMessage: newest?.[0] ? JSON.parse(newest[0]).enqueuedAt : undefined,
    };
  } catch (error) {
    logger.error({ userId, error: (error as Error).message }, 'Failed to get offline queue stats');
    return { totalMessages: 0 };
  }
};

/**
 * Clear user's offline queue
 */
export const clearOfflineQueue = async (userId: string): Promise<boolean> => {
  if (!isRedisEnabled()) {
    return false;
  }

  try {
    const key = `${OFFLINE_QUEUE_PREFIX}${userId}`;
    await cache.del(key);
    logger.debug({ userId }, 'Offline queue cleared');
    return true;
  } catch (error) {
    logger.error({ userId, error: (error as Error).message }, 'Failed to clear offline queue');
    return false;
  }
};

/**
 * Re-queue a message (increment attempts)
 */
export const requeueOfflineMessage = async (
  userId: string,
  message: QueuedMessage
): Promise<boolean> => {
  if (!isRedisEnabled()) {
    return false;
  }

  try {
    const key = `${OFFLINE_QUEUE_PREFIX}${userId}`;
    const client = cache as unknown as { lpush?: (key: string, value: string) => Promise<number>; ltrim?: (key: string, start: number, stop: number) => Promise<void> };

    if (!client.lpush) return false;

    const updatedMessage = {
      ...message,
      attempts: message.attempts + 1,
      enqueuedAt: new Date().toISOString(),
    };

    await client.lpush(key, JSON.stringify(updatedMessage));
    await client.ltrim?.(key, 0, MAX_QUEUE_SIZE - 1);
    return true;
  } catch (error) {
    logger.error({ userId, error: (error as Error).message }, 'Failed to requeue offline message');
    return false;
  }
};

/**
 * Get all users with non-empty offline queues
 */
export const getUsersWithOfflineMessages = async (): Promise<string[]> => {
  if (!isRedisEnabled()) {
    return [];
  }

  try {
    const client = cache as unknown as { keys?: (pattern: string) => Promise<string[]> };
    if (!client.keys) return [];

    const keys = await client.keys(`${OFFLINE_QUEUE_PREFIX}*`);
    return keys.map((key) => key.replace(OFFLINE_QUEUE_PREFIX, ''));
  } catch (error) {
    logger.error({ error: (error as Error).message }, 'Failed to get users with offline messages');
    return [];
  }
};

/**
 * Process offline queue for a user when they come online
 */
export const processOfflineQueue = async (
  userId: string,
  sendFn: (message: QueuedMessage) => Promise<boolean>,
  options: { maxMessages?: number; onMessageSent?: (message: QueuedMessage) => void } = {}
): Promise<{ sent: number; failed: number; remaining: number }> => {
  const { maxMessages = 100, onMessageSent } = options;

  const messages = await dequeueOfflineMessages(userId, maxMessages);
  if (!messages.length) {
    return { sent: 0, failed: 0, remaining: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const queuedMessage of messages) {
    try {
      const success = await sendFn(queuedMessage);
      if (success) {
        sent++;
        onMessageSent?.(queuedMessage);
      } else {
        failed++;
        // Re-queue for later
        await requeueOfflineMessage(userId, queuedMessage);
      }
    } catch (error) {
      failed++;
      logger.error({ userId, messageId: queuedMessage.message._id, error: (error as Error).message }, 'Failed to send offline message');
      // Re-queue for later
      await requeueOfflineMessage(userId, queuedMessage);
    }
  }

  const stats = await getOfflineQueueStats(userId);
  return { sent, failed, remaining: stats.totalMessages };
};