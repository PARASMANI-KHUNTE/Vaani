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
      async request(command, ...args) {
        const lower = String(command).toLowerCase();
        const upper = String(command).toUpperCase();
        const encodedArgs = args.map((arg) => encodeURIComponent(String(arg)));
        const headers = { Authorization: `Bearer ${env.redis.upstashToken}` };

        const tryPath = async () => {
          const url = `${env.redis.upstashUrl}/${lower}/${encodedArgs.join("/")}`;
          const response = await fetch(url, { headers });
          if (!response.ok) {
            return null;
          }
          const data = await response.json();
          return data.result;
        };

        const tryCommand = async () => {
          const url = `${env.redis.upstashUrl}/command`;
          const response = await fetch(url, {
            method: "POST",
            headers: {
              ...headers,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ command: [upper, ...args.map((arg) => String(arg))] }),
          });
          if (!response.ok) {
            return null;
          }
          const data = await response.json();
          return data.result;
        };

        try {
          const result = await tryPath();
          if (result !== null && result !== undefined) {
            return result;
          }
          const fallback = await tryCommand();
          return fallback;
        } catch (error) {
          logger.error(`Redis ${upper} error`, { error: error.message });
          return null;
        }
      },

      async get(key) {
        const result = await this.request("get", key);
        return result || null;
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
        const result = await this.request("del", key);
        return typeof result === "number" ? result : 0;
      },

      async exists(key) {
        const result = await this.request("exists", key);
        return typeof result === "number" ? result : 0;
      },

      async expire(key, seconds) {
        const result = await this.request("expire", key, seconds);
        return typeof result === "number" ? result : 0;
      },

      async sAdd(key, member) {
        const result = await this.request("sadd", key, member);
        return typeof result === "number" ? result : 0;
      },

      async sRem(key, member) {
        const result = await this.request("srem", key, member);
        return typeof result === "number" ? result : 0;
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
