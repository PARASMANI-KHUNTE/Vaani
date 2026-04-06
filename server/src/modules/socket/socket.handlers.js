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
  editMessage: editMessageService,
  forwardMessage: forwardMessageService,
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
const {
  sendUserPushNotification,
  emitMessageCreated,
  emitMessageDeleted,
  emitReactionAdded,
  emitReactionRemoved,
  emitMessageEdited,
  emitForwardedMessage,
} = require("./socket.notifications");
const { checkAndSetDedup, storeDedup } = require("./socket.dedup");

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MESSAGES = 10;
const RATE_LIMIT_MAX_TYPING = 30;
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 60000;

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

const createRateLimiter = (maxEvents, windowMs) => {
  const userEvents = new Map();

  return {
    check: (userId) => {
      const now = Date.now();
      const key = userId;
      const userData = userEvents.get(key) || { count: 0, windowStart: now };

      if (now - userData.windowStart > windowMs) {
        userData.count = 1;
        userData.windowStart = now;
      } else {
        userData.count++;
      }

      userEvents.set(key, userData);

      if (userData.count > maxEvents) {
        return false;
      }
      return true;
    },
    cleanup: () => {
      const now = Date.now();
      for (const [key, data] of userEvents.entries()) {
        if (now - data.windowStart > windowMs * 2) {
          userEvents.delete(key);
        }
      }
    },
    getSize: () => userEvents.size,
  };
};

const messageRateLimiter = createRateLimiter(RATE_LIMIT_MAX_MESSAGES, RATE_LIMIT_WINDOW_MS);
const typingRateLimiter = createRateLimiter(RATE_LIMIT_MAX_TYPING, RATE_LIMIT_WINDOW_MS);

setInterval(() => {
  messageRateLimiter.cleanup();
  typingRateLimiter.cleanup();
}, RATE_LIMIT_CLEANUP_INTERVAL_MS);

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

  void getOnlineUserIds()
    .then((onlineUserIds) => {
      socket.emit(SOCKET_EVENTS.PRESENCE_SYNC, {
        onlineUserIds,
      });
    })
    .catch((error) => {
      logger.error("PRESENCE_SYNC failed", { userId: currentUserId, error: error.message });
      socket.emit(SOCKET_EVENTS.PRESENCE_SYNC, {
        onlineUserIds: Array.from(new Set([currentUserId])),
      });
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
      if (!messageRateLimiter.check(currentUserId)) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "Too many messages. Please slow down." });
        }
        return;
      }

      const { chatId, content = "", type = "text", media = null, clientTempId, replyToId = null } = payload || {};

      if (!chatId) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "chatId is required" });
        }
        return;
      }

      if (clientTempId) {
        const existingMessageId = await checkAndSetDedup(currentUserId, clientTempId);
        if (existingMessageId) {
          if (typeof acknowledgement === "function") {
            acknowledgement({ ok: true, messageId: existingMessageId, deduplicated: true });
          }
          return;
        }
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

      const { message, participantIds } = await createMessage({
        chatId,
        senderId: currentUserId,
        content: trimmedContent,
        type,
        replyToId,
        media,
      });

      if (clientTempId) {
        await storeDedup(currentUserId, clientTempId, message._id.toString());
      }

      const receiverIds = participantIds.filter((participantId) => participantId !== currentUserId);
      const receiverOnlineFlags = await Promise.all(receiverIds.map((participantId) => isUserOnline(participantId)));
      const firstOnlineReceiverId = receiverIds.find((id, idx) => receiverOnlineFlags[idx]);
      const offlineReceiverIds = receiverIds.filter((_, index) => !receiverOnlineFlags[index]);

      if (firstOnlineReceiverId && message.status === "sent") {
        const deliveredMessage = await markMessageAsDelivered({
          messageId: message._id,
          userId: firstOnlineReceiverId,
        });
        if (deliveredMessage) {
          message = deliveredMessage;
        }
      }

      await emitMessageCreated(message, chatId, currentUserId, currentUserName, clientTempId, participantIds);

      if (firstOnlineReceiverId) {
        emitToUser(io, currentUserId, SOCKET_EVENTS.MESSAGE_DELIVERED, {
          chatId,
          messageId: message._id,
          userId: firstOnlineReceiverId,
        });
      }

      await Promise.all(
        offlineReceiverIds.map((participantId) =>
          sendUserPushNotification(participantId, {
            title: currentUserName,
            body:
              type === "text"
                ? trimmedContent || "Sent you a message"
                : `Sent a ${type === "voice" ? "voice note" : type} message`,
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

      await emitMessageDeleted(result, scope, currentUserId);

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true });
      }
    } catch (error) {
      logger.error("DELETE_MESSAGE failed", { userId: currentUserId, error: error?.message });
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error?.message || "Failed to delete message" });
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

      await emitReactionAdded(message, currentUserId, currentUserName, emoji);

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

      await emitReactionRemoved(message, currentUserId, emoji);

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

      if (!typingRateLimiter.check(currentUserId)) {
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

  socket.on(SOCKET_EVENTS.MESSAGE_EDITED, async (payload, acknowledgement) => {
    try {
      const { messageId, chatId, content } = payload || {};

      if (!messageId || !chatId || !content) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "messageId, chatId, and content are required" });
        }
        return;
      }

      const message = await editMessageService({
        messageId,
        chatId,
        currentUserId,
        content,
      });

      await emitMessageEdited(message, chatId, currentUserId);

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, message });
      }
    } catch (error) {
      logger.error("MESSAGE_EDITED failed", { userId: currentUserId, error: error.message });
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to edit message" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.MESSAGE_FORWARDED, async (payload, acknowledgement) => {
    try {
      const { messageId, chatId, targetChatId } = payload || {};

      if (!messageId || !chatId || !targetChatId) {
        if (typeof acknowledgement === "function") {
          acknowledgement({ ok: false, error: "messageId, chatId, and targetChatId are required" });
        }
        return;
      }

      const message = await forwardMessageService({
        messageId,
        chatId,
        currentUserId,
        targetChatId,
      });

      await emitForwardedMessage(message, targetChatId, currentUserId);

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, message });
      }
    } catch (error) {
      logger.error("MESSAGE_FORWARDED failed", { userId: currentUserId, error: error.message });
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to forward message" });
      }
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
