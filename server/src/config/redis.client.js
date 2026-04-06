const { createClient } = require("redis");
const env = require("./env");
const logger = require("../utils/logger");

let redisClient = null;
let isConnected = false;

const isRedisEnabled = () => Boolean(env.redis.enabled);
const isUpstashConfigured = () => Boolean(env.redis.upstashUrl && env.redis.upstashToken);

const connectRedis = async () => {
  if (!isRedisEnabled()) {
    logger.info("Redis disabled - using in-memory fallback");
    return;
  }

  if (!env.redis.useLocal && isUpstashConfigured()) {
    isConnected = true;
    logger.info("Redis connected (Upstash)");
    return;
  }

  try {
    if (!redisClient) {
      redisClient = createClient({ url: env.redis.url });

      redisClient.on("error", (err) => {
        logger.error("Redis Client Error", { error: err.message });
        isConnected = false;
      });

      redisClient.on("connect", () => {
        isConnected = true;
        logger.info("Redis connected (local)");
      });

      redisClient.on("end", () => {
        isConnected = false;
        logger.info("Redis disconnected");
      });
    }

    if (!redisClient.isOpen) {
      await redisClient.connect();
    }

    isConnected = true;
  } catch (error) {
    isConnected = false;
    logger.error("Redis connection failed", { error: error.message });
  }
};

const disconnectRedis = async () => {
  if (redisClient?.isOpen) {
    await redisClient.quit();
  }
  redisClient = null;
  isConnected = false;
};

const isRedisConnected = () => isConnected;

const getRedisClient = () => {
  if (!isRedisEnabled()) {
    return null;
  }

  if (!env.redis.useLocal && isUpstashConfigured()) {
    // NOTE: Upstash REST client only implements commands currently used by message deduplication.
    // Presence features (sets/keys/exists) require a full Redis protocol client.
    return {
      async get(key) {
        try {
          const response = await fetch(`${env.redis.upstashUrl}/get/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${env.redis.upstashToken}` },
          });
          const data = await response.json();
          return data.result || null;
        } catch (error) {
          logger.error("Redis GET error", { error: error.message });
          return null;
        }
      },

      async set(key, value, options = {}) {
        try {
          const body = { key, value };
          if (options.EX) body.ex = options.EX;

          const response = await fetch(`${env.redis.upstashUrl}/set`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.redis.upstashToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          return data.result;
        } catch (error) {
          logger.error("Redis SET error", { error: error.message });
          return null;
        }
      },

      async setEx(key, seconds, value) {
        return this.set(key, value, { EX: seconds });
      },

      async del(key) {
        try {
          const response = await fetch(`${env.redis.upstashUrl}/del/${encodeURIComponent(key)}`, {
            headers: { Authorization: `Bearer ${env.redis.upstashToken}` },
          });
          const data = await response.json();
          return data.result;
        } catch (error) {
          logger.error("Redis DEL error", { error: error.message });
          return 0;
        }
      },

      duplicate() {
        return getRedisClient();
      },

      async connect() {
        return;
      },

      async quit() {
        isConnected = false;
      },

      on() {
        return this;
      },
    };
  }

  return redisClient;
};

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
};
