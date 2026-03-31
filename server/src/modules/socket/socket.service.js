const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const User = require("../user/user.model");

const onlineUsers = new Map();

const getUserRoom = (userId) => `user:${userId}`;
const getChatRoom = (chatId) => `chat:${chatId}`;

const addOnlineUser = (userId, socketId) => {
  const userSockets = onlineUsers.get(userId) || new Set();
  userSockets.add(socketId);
  onlineUsers.set(userId, userSockets);
};

const removeOnlineUser = (userId, socketId) => {
  const userSockets = onlineUsers.get(userId);

  if (!userSockets) {
    return false;
  }

  userSockets.delete(socketId);

  if (userSockets.size === 0) {
    onlineUsers.delete(userId);
    return true;
  }

  onlineUsers.set(userId, userSockets);
  return false;
};

const isUserOnline = (userId) => onlineUsers.has(userId.toString());

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

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
