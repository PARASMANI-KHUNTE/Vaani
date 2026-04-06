const { getRedisClient, isRedisConnected } = require("../config/redis.client");

const PENDING_MESSAGES_PREFIX = "pending_messages:";
const MAX_PENDING_PER_USER = 100;
const PENDING_TTL_SECONDS = 86400 * 7;

const getPendingKey = (userId) => `${PENDING_MESSAGES_PREFIX}${userId}`;

const queueOfflineMessage = async (userId, message) => {
  if (!userId || !message) return false;
  
  const redis = getRedisClient();
  
  try {
    if (redis) {
      const key = getPendingKey(userId);
      const serialized = JSON.stringify({
        ...message,
        queuedAt: new Date().toISOString(),
      });
      
      await redis.lpPush(key, serialized);
      await redis.lTrim(key, 0, MAX_PENDING_PER_USER - 1);
      
      if (redis.expire) {
        await redis.expire(key, PENDING_TTL_SECONDS);
      }
      
      return true;
    }
  } catch (error) {
    console.error("Failed to queue offline message:", error);
  }
  
  return false;
};

const getPendingMessages = async (userId) => {
  if (!userId) return [];
  
  const redis = getRedisClient();
  
  try {
    if (redis) {
      const key = getPendingKey(userId);
      const messages = await redis.lRange(key, 0, -1);
      return messages.map((m) => JSON.parse(m)).reverse();
    }
  } catch (error) {
    console.error("Failed to get pending messages:", error);
  }
  
  return [];
};

const clearPendingMessages = async (userId) => {
  if (!userId) return;
  
  const redis = getRedisClient();
  
  try {
    if (redis) {
      const key = getPendingKey(userId);
      await redis.del(key);
    }
  } catch (error) {
    console.error("Failed to clear pending messages:", error);
  }
};

const getPendingCount = async (userId) => {
  if (!userId) return 0;
  
  const redis = getRedisClient();
  
  try {
    if (redis && redis.lLen) {
      const key = getPendingKey(userId);
      return await redis.lLen(key);
    }
  } catch (error) {
    console.error("Failed to get pending count:", error);
  }
  
  return 0;
};

module.exports = {
  queueOfflineMessage,
  getPendingMessages,
  clearPendingMessages,
  getPendingCount,
};
