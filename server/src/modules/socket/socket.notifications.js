let ioInstance = null;
const User = require("../user/user.model");
const { sendExpoPushNotifications } = require("../../utils/pushNotifications");

const setSocketIO = (io) => {
  ioInstance = io;
};

const getUserRoom = (userId) => `user:${userId}`;

const emitNotification = (targetUserId, event, data) => {
  if (ioInstance) {
    ioInstance.to(getUserRoom(targetUserId.toString())).emit(event, data);
  }
};

const emitToUser = (targetUserId, event, data) => {
  emitNotification(targetUserId, event, data);
};

const emitToUsers = (targetUserIds, event, data) => {
  if (!Array.isArray(targetUserIds)) {
    return;
  }
  targetUserIds.forEach((userId) => emitNotification(userId, event, data));
};

const sendUserPushNotification = async (targetUserId, message) => {
  const user = await User.findById(targetUserId).select("pushTokens").lean();
  const tokens = (user?.pushTokens || []).map((entry) => entry.token).filter(Boolean);

  if (!tokens.length) {
    return;
  }

  await sendExpoPushNotifications(
    tokens.map((token) => ({
      to: token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data || {},
      channelId: "messages",
    }))
  );
};

const notifyFriendRequestReceived = (targetUserId, fromUser) => {
  const payload = {
    id: `fr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: fromUser.name,
    body: "sent you a friend request",
    createdAt: new Date().toISOString(),
    userId: fromUser._id.toString(),
    read: false,
    kind: "friend_request",
    action: "received",
    fromUser: {
      _id: fromUser._id,
      name: fromUser.name,
      username: fromUser.username,
      avatar: fromUser.avatar,
    },
  };

  emitNotification(targetUserId, "FRIEND_REQUEST_RECEIVED", payload);
  void sendUserPushNotification(targetUserId, {
    title: payload.title,
    body: payload.body,
    data: {
      kind: payload.kind,
      action: payload.action,
      userId: payload.userId,
    },
  });
};

const notifyFriendRequestAccepted = (targetUserId, fromUser) => {
  const payload = {
    id: `fr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: fromUser.name,
    body: "accepted your friend request",
    createdAt: new Date().toISOString(),
    userId: fromUser._id.toString(),
    read: false,
    kind: "friend_request",
    action: "accepted",
    fromUser: {
      _id: fromUser._id,
      name: fromUser.name,
      username: fromUser.username,
      avatar: fromUser.avatar,
    },
  };

  emitNotification(targetUserId, "FRIEND_REQUEST_ACCEPTED", payload);
  void sendUserPushNotification(targetUserId, {
    title: payload.title,
    body: payload.body,
    data: {
      kind: payload.kind,
      action: payload.action,
      userId: payload.userId,
    },
  });
};

const notifyFriendRequestRejected = (targetUserId, fromUser) => {
  const payload = {
    id: `fr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: fromUser.name,
    body: "declined your friend request",
    createdAt: new Date().toISOString(),
    userId: fromUser._id.toString(),
    read: false,
    kind: "friend_request",
    action: "rejected",
    fromUser: {
      _id: fromUser._id,
      name: fromUser.name,
      username: fromUser.username,
      avatar: fromUser.avatar,
    },
  };

  emitNotification(targetUserId, "FRIEND_REQUEST_REJECTED", payload);
  void sendUserPushNotification(targetUserId, {
    title: payload.title,
    body: payload.body,
    data: {
      kind: payload.kind,
      action: payload.action,
      userId: payload.userId,
    },
  });
};

module.exports = {
  emitToUser,
  emitToUsers,
  sendUserPushNotification,
  setSocketIO,
  notifyFriendRequestReceived,
  notifyFriendRequestAccepted,
  notifyFriendRequestRejected,
};
