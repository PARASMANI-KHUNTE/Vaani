const { getRedisClient, isRedisConnected } = require("../../config/redis.client");

const DEDUP_PREFIX = "msg_dedup:";
const DEDUP_TTL_SECONDS = 300;

const messageDeduplicationCache = new Map();

const getDedupKey = (userId, clientTempId) => `${userId}:${clientTempId}`;

const clearExpiredDedupEntries = () => {
  const now = Date.now();
  for (const [key, entry] of messageDeduplicationCache.entries()) {
    if (entry.expiresAt <= now) {
      messageDeduplicationCache.delete(key);
    }
  }
};

setInterval(clearExpiredDedupEntries, 60000);

const checkAndSetDedup = async (userId, clientTempId) => {
  if (!clientTempId) return null;

  const key = getDedupKey(userId, clientTempId);

  if (isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const existing = await redis.get(`${DEDUP_PREFIX}${key}`);
        if (existing) {
          return JSON.parse(existing);
        }
        return null;
      } catch {
        return null;
      }
    }
  }

  const cached = messageDeduplicationCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.messageId;
  }

  return null;
};

const storeDedup = async (userId, clientTempId, messageId) => {
  if (!clientTempId || !messageId) return;

  const key = getDedupKey(userId, clientTempId);
  const entry = {
    messageId,
    expiresAt: Date.now() + DEDUP_TTL_SECONDS * 1000,
  };

  if (isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.setEx(`${DEDUP_PREFIX}${key}`, DEDUP_TTL_SECONDS, JSON.stringify({ messageId }));
      } catch {}
    }
  } else {
    messageDeduplicationCache.set(key, entry);
  }
};

module.exports = {
  checkAndSetDedup,
  storeDedup,
};
