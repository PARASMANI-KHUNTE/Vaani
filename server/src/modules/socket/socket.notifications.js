let ioInstance = null;

const setSocketIO = (io) => {
  ioInstance = io;
};

const getUserRoom = (userId) => `user:${userId}`;

const emitNotification = (targetUserId, event, data) => {
  if (ioInstance) {
    ioInstance.to(getUserRoom(targetUserId.toString())).emit(event, data);
  }
};

const notifyFriendRequestReceived = (targetUserId, fromUser) => {
  emitNotification(targetUserId, "FRIEND_REQUEST_RECEIVED", {
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
  });
};

const notifyFriendRequestAccepted = (targetUserId, fromUser) => {
  emitNotification(targetUserId, "FRIEND_REQUEST_ACCEPTED", {
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
  });
};

const notifyFriendRequestRejected = (targetUserId, fromUser) => {
  emitNotification(targetUserId, "FRIEND_REQUEST_REJECTED", {
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
  });
};

module.exports = {
  setSocketIO,
  notifyFriendRequestReceived,
  notifyFriendRequestAccepted,
  notifyFriendRequestRejected,
};
