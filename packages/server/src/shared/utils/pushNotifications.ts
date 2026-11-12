/**
 * Push Notifications Utility
 * Expo push notifications with retry/backoff
 */

import { config } from '../../config';
import { logger } from './logger';
import { PushNotificationPayload } from '@chat-app/shared/types';

// ============================================================================
// Types
// ============================================================================

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
  badge?: number;
  priority?: 'default' | 'high';
  channelId?: string;
  categoryId?: string;
  mutableContent?: boolean;
  contentAvailable?: boolean;
  ttl?: number;
  expiration?: number;
}

interface ExpoPushResponse {
  data: Array<{
    status: 'ok' | 'error';
    id?: string;
    message?: string;
    details?: Record<string, unknown>;
  }>;
}

interface PushToken {
  token: string;
  platform: 'web' | 'ios' | 'android';
  deviceId?: string;
}

// ============================================================================
// Configuration
// ============================================================================

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 1000;
const MAX_BATCH_SIZE = 100; // Expo limit

// ============================================================================
// Core Send Function
// ============================================================================

const sendExpoPush = async (messages: ExpoPushMessage[]): Promise<ExpoPushResponse> => {
  const accessToken = config.push.expoAccessToken;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Expo push API error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

// ============================================================================
// Retry Logic
// ============================================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWithRetry = async (
  messages: ExpoPushMessage[],
  attempt: number = 0
): Promise<ExpoPushResponse> => {
  try {
    return await sendExpoPush(messages);
  } catch (error) {
    if (attempt >= MAX_RETRIES) {
      throw error;
    }

    const delay = BASE_RETRY_DELAY * Math.pow(2, attempt) + Math.random() * 1000;
    logger.warn('Push notification send failed, retrying', {
      attempt: attempt + 1,
      maxRetries: MAX_RETRIES,
      delay,
      error: (error as Error).message,
    });

    await sleep(delay);
    return sendWithRetry(messages, attempt + 1);
  }
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Send push notification to one or more tokens
 */
export const sendPushNotification = async (
  tokens: string | string[],
  payload: PushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number; errors: string[] }> => {
  const tokenArray = Array.isArray(tokens) ? tokens : [tokens];

  if (tokenArray.length === 0) {
    return { success: true, sent: 0, failed: 0, errors: [] };
  }

  // Filter valid Expo push tokens
  const validTokens = tokenArray.filter((token) => token.startsWith('ExponentPushToken['));
  const invalidCount = tokenArray.length - validTokens.length;

  if (invalidCount > 0) {
    logger.warn('Invalid push tokens filtered out', { invalidCount, tokens: tokenArray });
  }

  if (validTokens.length === 0) {
    return { success: true, sent: 0, failed: invalidCount, errors: ['No valid Expo push tokens'] };
  }

  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < validTokens.length; i += MAX_BATCH_SIZE) {
    const batch = validTokens.slice(i, i + MAX_BATCH_SIZE);

    const messages: ExpoPushMessage[] = batch.map((token) => ({
      to: token,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: payload.sound || 'default',
      badge: payload.badge,
      priority: payload.priority || 'high',
      channelId: payload.channelId || 'default',
      categoryId: payload.categoryId,
      mutableContent: payload.mutableContent ?? true,
      contentAvailable: payload.contentAvailable ?? true,
    }));

    try {
      const response = await sendWithRetry(messages);

      // Process response
      for (let j = 0; j < response.data.length; j++) {
        const result = response.data[j];
        if (result.status === 'ok') {
          sent++;
        } else {
          failed++;
          const errorMsg = `Token ${batch[j]}: ${result.message || 'Unknown error'}`;
          errors.push(errorMsg);
          logger.warn('Push notification failed for token', {
            token: batch[j].slice(0, 20) + '...',
            error: result.message,
            details: result.details,
          });
        }
      }
    } catch (error) {
      failed += batch.length;
      const errorMsg = `Batch failed: ${(error as Error).message}`;
      errors.push(errorMsg);
      logger.error('Push notification batch failed', { error: (error as Error).message, batchSize: batch.length });
    }
  }

  return {
    success: failed === 0,
    sent,
    failed: failed + invalidCount,
    errors,
  };
};

/**
 * Send push notification for a new message
 */
export const sendMessagePush = async (
  tokens: string[],
  senderName: string,
  messagePreview: string,
  chatId: string,
  messageId: string,
  data?: Record<string, unknown>
): Promise<void> => {
  await sendPushNotification(tokens, {
    title: senderName,
    body: messagePreview,
    data: {
      type: 'message',
      chatId,
      messageId,
      ...data,
    },
    sound: 'default',
    priority: 'high',
    categoryId: 'message',
  });
};

/**
 * Send push notification for friend request
 */
export const sendFriendRequestPush = async (
  tokens: string[],
  senderName: string,
  requestId: string,
  data?: Record<string, unknown>
): Promise<void> => {
  await sendPushNotification(tokens, {
    title: 'New Friend Request',
    body: `${senderName} wants to be your friend`,
    data: {
      type: 'friend_request',
      requestId,
      ...data,
    },
    sound: 'default',
    priority: 'high',
    categoryId: 'friend_request',
  });
};

/**
 * Send push notification for friend request accepted
 */
export const sendFriendAcceptedPush = async (
  tokens: string[],
  senderName: string,
  data?: Record<string, unknown>
): Promise<void> => {
  await sendPushNotification(tokens, {
    title: 'Friend Request Accepted',
    body: `${senderName} accepted your friend request`,
    data: {
      type: 'friend_accepted',
      ...data,
    },
    sound: 'default',
    priority: 'default',
    categoryId: 'friend_accepted',
  });
};

/**
 * Send push notification for reaction
 */
export const sendReactionPush = async (
  tokens: string[],
  reactorName: string,
  emoji: string,
  messagePreview: string,
  chatId: string,
  messageId: string,
  data?: Record<string, unknown>
): Promise<void> => {
  await sendPushNotification(tokens, {
    title: reactorName,
    body: `${emoji} reacted to your message`,
    data: {
      type: 'reaction',
      chatId,
      messageId,
      emoji,
      ...data,
    },
    sound: 'default',
    priority: 'default',
    categoryId: 'reaction',
  });
};

/**
 * Send push notification for group invite
 */
export const sendGroupInvitePush = async (
  tokens: string[],
  inviterName: string,
  groupName: string,
  inviteToken: string,
  data?: Record<string, unknown>
): Promise<void> => {
  await sendPushNotification(tokens, {
    title: 'Group Invitation',
    body: `${inviterName} invited you to join "${groupName}"`,
    data: {
      type: 'group_invite',
      inviteToken,
      groupName,
      ...data,
    },
    sound: 'default',
    priority: 'high',
    categoryId: 'group_invite',
  });
};

/**
 * Send push notification for mention
 */
export const sendMentionPush = async (
  tokens: string[],
  senderName: string,
  messagePreview: string,
  chatId: string,
  messageId: string,
  data?: Record<string, unknown>
): Promise<void> => {
  await sendPushNotification(tokens, {
    title: senderName,
    body: `@${senderName} mentioned you: ${messagePreview}`,
    data: {
      type: 'mention',
      chatId,
      messageId,
      ...data,
    },
    sound: 'default',
    priority: 'high',
    categoryId: 'mention',
  });
};

/**
 * Validate push token format
 */
export const isValidExpoPushToken = (token: string): boolean => {
  return token.startsWith('ExponentPushToken[') && token.endsWith(']');
};

/**
 * Parse push token to get platform info
 */
export const parsePushToken = (token: string): { platform: 'ios' | 'android' | 'web'; deviceId?: string } | null => {
  if (!isValidExpoPushToken(token)) return null;

  // Expo tokens format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
  const content = token.slice(22, -1); // Remove 'ExponentPushToken[' and ']'

  // Can't easily determine platform from token alone
  // This would need to be stored separately
  return { platform: 'ios', deviceId: content };
};

/**
 * Batch send with rate limiting
 */
const pendingNotifications = new Map<string, ExpoPushMessage[]>();
let batchTimeout: ReturnType<typeof setTimeout> | null = null;

export const queuePushNotification = (
  token: string,
  message: ExpoPushMessage
): void => {
  const existing = pendingNotifications.get(token) || [];
  existing.push(message);
  pendingNotifications.set(token, existing);

  if (!batchTimeout) {
    batchTimeout = setTimeout(() => {
      flushPushQueue();
    }, 1000); // Flush every second
  }
};

export const flushPushQueue = async (): Promise<void> => {
  if (batchTimeout) {
    clearTimeout(batchTimeout);
    batchTimeout = null;
  }

  const tokens = Array.from(pendingNotifications.keys());
  if (tokens.length === 0) return;

  const messages: ExpoPushMessage[] = [];
  for (const token of tokens) {
    const tokenMessages = pendingNotifications.get(token) || [];
    messages.push(...tokenMessages);
  }

  pendingNotifications.clear();

  try {
    await sendWithRetry(messages);
    logger.debug('Flushed push notification queue', { count: messages.length });
  } catch (error) {
    logger.error('Failed to flush push notification queue', { error: (error as Error).message });
    // Re-queue failed messages
    for (const message of messages) {
      if (message.to && typeof message.to === 'string') {
        queuePushNotification(message.to, message);
      }
    }
  }
};