let ioInstance = null;
const User = require("../user/user.model");
const Chat = require("../chat/chat.model");
const { sendExpoPushNotifications } = require("../../utils/pushNotifications");
const { getChatSummariesForParticipants } = require("../chat/chat.service");

const setSocketIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

const getUserRoom = (userId) => `user:${userId}`;
const getChatRoom = (chatId) => `chat:${chatId}`;

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

const emitToChatParticipants = async (chatId, event, data, excludeUserId = null) => {
  if (!ioInstance) return;
  
  const chat = await Chat.findById(chatId).select("participants").lean();
  if (!chat) return;
  
  chat.participants.forEach((participantId) => {
    const participantIdStr = participantId.toString();
    if (excludeUserId && participantIdStr === excludeUserId.toString()) return;
    ioInstance.to(getUserRoom(participantIdStr)).emit(event, data);
  });
};

const emitMessageCreated = async (message, chatId, currentUserId, currentUserName, clientTempId = null, participantIds = null) => {
  if (!ioInstance) return;
  
  const chatIdStr = chatId?.toString();
  if (!chatIdStr) return;
  
  let chatParticipants = participantIds;
  if (!chatParticipants) {
    const chat = await Chat.findById(chatIdStr).lean();
    if (!chat) return;
    chatParticipants = chat.participants.map((p) => p.toString());
  }
  
  const summaries = await getChatSummariesForParticipants(chatIdStr, chatParticipants);
  
  chatParticipants.forEach((participantId) => {
    const chatSummary = summaries[participantId];
    if (chatSummary) {
      ioInstance.to(getUserRoom(participantId)).emit("NEW_MESSAGE", {
        message,
        chat: chatSummary,
        clientTempId: participantId === currentUserId ? clientTempId : undefined,
      });
    }
  });
};

const emitMessageDeleted = async (result, scope, currentUserId) => {
  if (!ioInstance) return;
  
  const { message, messageId, chatId } = result;
  
  if (scope === "everyone" && message) {
    const messageChatId = message.chatId?.toString();
    if (messageChatId) {
      await emitToChatParticipants(messageChatId, "MESSAGE_DELETED", {
        scope,
        message,
        chatId: messageChatId,
      });
    }
  } else {
    const chatIdStr = chatId?.toString();
    ioInstance.to(getUserRoom(currentUserId)).emit("MESSAGE_DELETED", {
      scope,
      messageId,
      chatId: chatIdStr,
    });
  }
};

const emitReactionAdded = async (message, currentUserId, currentUserName, emoji) => {
  if (!ioInstance || !message.chatId) return;
  
  const chatIdStr = message.chatId?.toString();
  if (!chatIdStr) return;
  
  await emitToChatParticipants(chatIdStr, "REACTION_ADDED", {
    message,
    userId: currentUserId,
    userName: currentUserName,
    emoji,
  });
};

const emitReactionRemoved = async (message, currentUserId, emoji) => {
  if (!ioInstance || !message.chatId) return;
  
  const chatIdStr = message.chatId?.toString();
  if (!chatIdStr) return;
  
  await emitToChatParticipants(chatIdStr, "REACTION_REMOVED", {
    message,
    userId: currentUserId,
    emoji,
  });
};

const emitMessageEdited = async (message, chatId, currentUserId) => {
  if (!ioInstance || !message.chatId) return;
  
  const chatIdStr = chatId?.toString() || message.chatId?.toString();
  if (!chatIdStr) return;
  
  await emitToChatParticipants(chatIdStr, "MESSAGE_EDITED", {
    message,
    chatId: chatIdStr,
  });
};

const emitForwardedMessage = async (message, targetChatId, currentUserId) => {
  if (!ioInstance) return;
  
  const targetChatIdStr = targetChatId?.toString();
  if (!targetChatIdStr) return;
  
  const targetChat = await Chat.findById(targetChatIdStr).lean();
  if (!targetChat) return;
  
  const participantIds = targetChat.participants.map((p) => p.toString());
  const summaries = await getChatSummariesForParticipants(targetChatIdStr, participantIds);
  
  participantIds.forEach((participantId) => {
    const chatSummary = summaries[participantId];
    if (chatSummary) {
      ioInstance.to(getUserRoom(participantId)).emit("NEW_MESSAGE", {
        message,
        chat: chatSummary,
      });
    }
  });
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
  emitNotification,
  emitToUser,
  emitToUsers,
  emitToChatParticipants,
  emitMessageCreated,
  emitMessageDeleted,
  emitReactionAdded,
  emitReactionRemoved,
  emitMessageEdited,
  emitForwardedMessage,
  getIO,
  sendUserPushNotification,
  setSocketIO,
  notifyFriendRequestReceived,
  notifyFriendRequestAccepted,
  notifyFriendRequestRejected,
};
