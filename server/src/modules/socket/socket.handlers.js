const Chat = require("../chat/chat.model");
const { getChatSummary } = require("../chat/chat.service");
const logger = require("../../utils/logger");
const { assertSafeMessageContent } = require("../../utils/contentSafety");
const {
  createMessage,
  deleteMessage,
  markMessageAsDelivered,
  markMessagesAsSeen,
  addReaction,
  removeReaction,
} = require("../message/message.service");
const { SOCKET_EVENTS } = require("./socket.constants");
const {
  addOnlineUser,
  getChatRoom,
  getOnlineUserIds,
  getUserRoom,
  isUserOnline,
  removeOnlineUser,
} = require("./socket.service");
const { sendUserPushNotification } = require("./socket.notifications");

const emitToUser = (io, userId, event, data) => {
  io.to(getUserRoom(userId)).emit(event, data);
};

const emitPresence = (io, eventName, userId) => {
  io.emit(eventName, { userId });
};

const emitSocketError = (socket, message, code = "UNKNOWN_ERROR") => {
  socket.emit(SOCKET_EVENTS.ERROR, {
    code,
    message,
    timestamp: new Date().toISOString(),
  });
};

const handleSocketError = (socket, error, context = "operation") => {
  logger.error(`Socket error in ${context}`, {
    userId: socket.user?._id?.toString(),
    error: error.message,
    stack: error.stack,
  });

  let message = "An error occurred. Please try again.";
  let code = "INTERNAL_ERROR";

  if (error.statusCode === 403 || error.message?.includes("not authorized")) {
    message = "You don't have permission for this action.";
    code = "FORBIDDEN";
  } else if (error.statusCode === 404) {
    message = "The requested item was not found.";
    code = "NOT_FOUND";
  } else if (error.statusCode === 429) {
    message = "Too many requests. Please slow down.";
    code = "RATE_LIMITED";
  } else if (error.message) {
    message = error.message;
  }

  emitSocketError(socket, message, code);
};

const registerSocketHandlers = (io, socket) => {
  const currentUserId = socket.user._id.toString();
  const currentUserName = socket.user.name;

  addOnlineUser(currentUserId, socket.id);
  socket.join(getUserRoom(currentUserId));

  socket.emit(SOCKET_EVENTS.PRESENCE_SYNC, {
    onlineUserIds: getOnlineUserIds(),
  });
  emitPresence(io, SOCKET_EVENTS.USER_ONLINE, currentUserId);

  socket.on(SOCKET_EVENTS.JOIN_CHAT, async ({ chatId }) => {
    try {
      if (!chatId) {
        emitSocketError(socket, "chatId is required", "INVALID_PAYLOAD");
        return;
      }

      const chat = await Chat.findOne({
        _id: chatId,
        participants: currentUserId,
      }).lean();

      if (!chat) {
        logger.warn(`User ${currentUserId} attempted to join unauthorized chat ${chatId}`);
        emitSocketError(socket, "Chat not found or access denied", "CHAT_NOT_FOUND");
        return;
      }

      socket.join(getChatRoom(chatId));

      const seenCount = await markMessagesAsSeen({
        chatId,
        currentUserId,
      });

      if (seenCount > 0) {
        const updatedChat = await getChatSummary(chatId, currentUserId);

        chat.participants
          .map((participantId) => participantId.toString())
          .filter((participantId) => participantId !== currentUserId)
          .forEach((participantId) => {
            emitToUser(io, participantId, SOCKET_EVENTS.MESSAGE_SEEN, {
              chatId,
              seenByUserId: currentUserId,
              count: seenCount,
            });
            emitToUser(io, participantId, SOCKET_EVENTS.CHAT_UPDATED, {
              chat: updatedChat,
            });
          });

        emitToUser(io, currentUserId, SOCKET_EVENTS.CHAT_UPDATED, {
          chat: updatedChat,
        });
      }
    } catch (error) {
      handleSocketError(socket, error, "JOIN_CHAT");
    }
  });

  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload, acknowledgement) => {
    try {
      const { chatId, content = "", type = "text", media = null, clientTempId, replyToId = null } = payload || {};

      if (!chatId) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "chatId is required" });
        }
        return;
      }

      const trimmedContent = (content || "").trim();
      if (type === "text" && !trimmedContent && !media) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "Message content cannot be empty" });
        }
        return;
      }

      if (trimmedContent) {
        assertSafeMessageContent(trimmedContent);
      }

      let message = await createMessage({
        chatId,
        senderId: currentUserId,
        content: trimmedContent,
        type,
        replyToId,
        media,
      });

      const chat = await Chat.findById(chatId).lean();
      if (!chat || !chat.participants.some((p) => p.toString() === currentUserId)) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "Chat not found or access denied" });
        }
        return;
      }

      const participantIds = chat.participants.map((participantId) => participantId.toString());
      const receiverIds = participantIds.filter((participantId) => participantId !== currentUserId);
      const deliveredToOnlineUser = receiverIds.some((participantId) => isUserOnline(participantId));

      if (deliveredToOnlineUser && message.status === "sent") {
        message = await markMessageAsDelivered({
          messageId: message._id,
        });
      }

      await Promise.all(
        participantIds.map(async (participantId) => {
          const chatSummary = await getChatSummary(chatId, participantId);
          emitToUser(io, participantId, SOCKET_EVENTS.NEW_MESSAGE, {
            message,
            chat: chatSummary,
            clientTempId: participantId === currentUserId ? clientTempId : undefined,
          });
        })
      );

      if (deliveredToOnlineUser) {
        emitToUser(io, currentUserId, SOCKET_EVENTS.MESSAGE_DELIVERED, {
          chatId,
          messageId: message._id,
        });
      }

      await Promise.all(
        receiverIds
          .filter((participantId) => !isUserOnline(participantId))
          .map((participantId) =>
            sendUserPushNotification(participantId, {
              title: currentUserName,
              body: type === "text" ? trimmedContent || "Sent you a message" : `Sent a ${type === "voice" ? "voice note" : type} message`,
              data: {
                kind: "message",
                chatId,
                messageId: message._id.toString(),
              },
            })
          )
      );

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, messageId: message._id });
      }
    } catch (error) {
      logger.error("SEND_MESSAGE failed", { userId: currentUserId, error: error.message });
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to send message" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.DELETE_MESSAGE, async (payload, acknowledgement) => {
    try {
      const { messageId, scope } = payload || {};

      if (!messageId || !scope) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "messageId and scope are required" });
        }
        return;
      }

      const result = await deleteMessage({
        messageId,
        currentUserId,
        scope,
      });

      const chat = await Chat.findById(result.message.chatId).lean();

      if (scope === "everyone" && chat) {
        chat.participants.forEach((participantId) => {
          emitToUser(io, participantId.toString(), SOCKET_EVENTS.MESSAGE_DELETED, {
            scope,
            message: result.message,
            chatId: result.message.chatId.toString(),
          });
        });
      } else {
        emitToUser(io, currentUserId, SOCKET_EVENTS.MESSAGE_DELETED, {
          scope,
          messageId: result.messageId,
          chatId: result.chatId,
        });
      }

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true });
      }
    } catch (error) {
      logger.error("DELETE_MESSAGE failed", { userId: currentUserId, error: error.message });
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to delete message" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.REACTION_ADDED, async (payload, acknowledgement) => {
    try {
      const { messageId, emoji } = payload || {};

      if (!messageId || !emoji) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "messageId and emoji are required" });
        }
        return;
      }

      const message = await addReaction({
        messageId,
        currentUserId,
        emoji,
      });

      const chat = await Chat.findById(message.chatId).lean();
      if (chat) {
        chat.participants.forEach((participantId) => {
          emitToUser(io, participantId.toString(), SOCKET_EVENTS.REACTION_ADDED, {
            message,
            userId: currentUserId,
            userName: currentUserName,
            emoji,
          });
        });
      }

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, message });
      }
    } catch (error) {
      logger.error("REACTION_ADDED failed", { userId: currentUserId, error: error.message });
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to add reaction" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.REACTION_REMOVED, async (payload, acknowledgement) => {
    try {
      const { messageId, emoji } = payload || {};

      if (!messageId || !emoji) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "messageId and emoji are required" });
        }
        return;
      }

      const message = await removeReaction({
        messageId,
        currentUserId,
        emoji,
      });

      const chat = await Chat.findById(message.chatId).lean();
      if (chat) {
        chat.participants.forEach((participantId) => {
          emitToUser(io, participantId.toString(), SOCKET_EVENTS.REACTION_REMOVED, {
            message,
            userId: currentUserId,
            emoji,
          });
        });
      }

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, message });
      }
    } catch (error) {
      logger.error("REACTION_REMOVED failed", { userId: currentUserId, error: error.message });
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to remove reaction" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.TYPING, async ({ chatId }) => {
    try {
      if (!chatId) {
        return;
      }

      const chat = await Chat.findOne({
        _id: chatId,
        participants: currentUserId,
      }).lean();

      if (!chat) {
        return;
      }

      socket.to(getChatRoom(chatId)).emit(SOCKET_EVENTS.TYPING, {
        chatId,
        userId: currentUserId,
        userName: currentUserName,
        isTyping: true,
      });
    } catch (error) {
      logger.error("TYPING failed", { userId: currentUserId, error: error.message });
    }
  });

  socket.on(SOCKET_EVENTS.STOP_TYPING, async ({ chatId }) => {
    try {
      if (!chatId) {
        return;
      }

      const chat = await Chat.findOne({
        _id: chatId,
        participants: currentUserId,
      }).lean();

      if (!chat) {
        return;
      }

      socket.to(getChatRoom(chatId)).emit(SOCKET_EVENTS.STOP_TYPING, {
        chatId,
        userId: currentUserId,
        userName: currentUserName,
        isTyping: false,
      });
    } catch (error) {
      logger.error("STOP_TYPING failed", { userId: currentUserId, error: error.message });
    }
  });

  socket.on("disconnect", () => {
    const becameOffline = removeOnlineUser(currentUserId, socket.id);

    if (becameOffline) {
      emitPresence(io, SOCKET_EVENTS.USER_OFFLINE, currentUserId);
    }
  });

  socket.on("error", (error) => {
    logger.error("Socket error", { userId: currentUserId, error: error.message });
    emitSocketError(socket, "Connection error occurred", "CONNECTION_ERROR");
  });
};

module.exports = {
  registerSocketHandlers,
};
