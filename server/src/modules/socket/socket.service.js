const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const { getRedisClient, isRedisConnected } = require("../../config/redis.client");
const User = require("../user/user.model");

const PRESENCE_KEY_PREFIX = "presence:user:";
const PRESENCE_TTL = 3600;

const onlineUsers = new Map();

const getUserRoom = (userId) => `user:${userId}`;
const getChatRoom = (chatId) => `chat:${chatId}`;

const getRedisPresenceKey = (userId) => `${PRESENCE_KEY_PREFIX}${userId}`;

const addOnlineUser = (userId, socketId) => {
  const userSockets = onlineUsers.get(userId) || new Set();
  userSockets.add(socketId);
  onlineUsers.set(userId, userSockets);

  if (env.redis.enabled && isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      redis.sAdd(getRedisPresenceKey(userId), socketId).catch(console.error);
      redis.expire(getRedisPresenceKey(userId), PRESENCE_TTL).catch(console.error);
    }
  }
};

const removeOnlineUser = (userId, socketId) => {
  const userSockets = onlineUsers.get(userId);

  if (!userSockets) {
    return false;
  }

  userSockets.delete(socketId);

  if (userSockets.size === 0) {
    onlineUsers.delete(userId);
    if (env.redis.enabled && isRedisConnected()) {
      const redis = getRedisClient();
      if (redis) {
        redis.del(getRedisPresenceKey(userId)).catch(console.error);
      }
    }
    return true;
  }

  onlineUsers.set(userId, userSockets);
  if (env.redis.enabled && isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      redis.sRem(getRedisPresenceKey(userId), socketId).catch(console.error);
    }
  }
  return false;
};

const isUserOnline = async (userId) => {
  if (env.redis.enabled && isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        const exists = await redis.exists(getRedisPresenceKey(userId));
        return exists === 1;
      } catch {
        return onlineUsers.has(userId.toString());
      }
    }
  }
  return onlineUsers.has(userId.toString());
};

const getOnlineUserIds = async () => {
  if (env.redis.enabled && isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      try {
        if (redis.scan) {
          const keys = [];
          let cursor = "0";
          do {
            const [newCursor, batch] = await redis.scan(cursor, "MATCH", `${PRESENCE_KEY_PREFIX}*`, "COUNT", 100);
            cursor = newCursor;
            keys.push(...batch);
          } while (cursor !== "0");
          return keys.map((key) => key.replace(PRESENCE_KEY_PREFIX, ""));
        }
        return Array.from(onlineUsers.keys());
      } catch {
        return Array.from(onlineUsers.keys());
      }
    }
  }
  return Array.from(onlineUsers.keys());
};

const authenticateSocket = async (socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace("Bearer ", "");

  if (!token) {
    return next(new Error("Unauthorized"));
  }

  try {
    const decodedToken = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decodedToken.sub).lean();

    if (!user || user.accountStatus !== "active") {
      return next(new Error("Unauthorized"));
    }

    socket.user = user;
    return next();
  } catch (error) {
    return next(new Error("Unauthorized"));
  }
};

module.exports = {
  addOnlineUser,
  authenticateSocket,
  getChatRoom,
  getOnlineUserIds,
  getUserRoom,
  isUserOnline,
  removeOnlineUser,
};
