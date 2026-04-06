const { createClient } = require("redis");
const env = require("./env");

let redisClient = null;
let isConnected = false;

const getRedisClient = () => {
  if (!env.redis.enabled) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: env.redis.url });

    redisClient.on("error", (err) => {
      console.error("Redis Client Error:", err);
      isConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("Redis connected");
      isConnected = true;
    });

    redisClient.on("disconnect", () => {
      console.log("Redis disconnected");
      isConnected = false;
    });
  }

  return redisClient;
};

const connectRedis = async () => {
  if (!env.redis.enabled) {
    console.log("Redis disabled - using in-memory fallback");
    return;
  }

  const client = getRedisClient();
  if (client && !isConnected) {
    await client.connect();
  }
};

const disconnectRedis = async () => {
  if (redisClient && isConnected) {
    await redisClient.quit();
    redisClient = null;
    isConnected = false;
  }
};

const isRedisConnected = () => isConnected;

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
};
