const env = require("./env");

let isConnected = false;
let isUpstash = false;

const isRedisEnabled = () => env.redis.enabled && env.redis.upstashUrl && env.redis.upstashToken;

const connectRedis = async () => {
  if (!isRedisEnabled()) {
    console.log("Redis disabled - using in-memory fallback");
    return;
  }

  isUpstash = true;
  isConnected = true;
  console.log("Redis connected (Upstash)");
};

const disconnectRedis = async () => {
  isConnected = false;
};

const isRedisConnected = () => isConnected;

const getRedisClient = () => {
  if (!isRedisEnabled()) {
    return null;
  }

  return {
    async get(key) {
      try {
        const response = await fetch(`${env.redis.upstashUrl}/get/${encodeURIComponent(key)}`, {
          headers: { Authorization: `Bearer ${env.redis.upstashToken}` },
        });
        const data = await response.json();
        return data.result || null;
      } catch (error) {
        console.error("Redis GET error:", error);
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
        console.error("Redis SET error:", error);
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
        console.error("Redis DEL error:", error);
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
};

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
};
