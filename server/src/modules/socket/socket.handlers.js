const Chat = require("../chat/chat.model");
const User = require("../user/user.model");
const { getChatSummary } = require("../chat/chat.service");
const {
  createMessage,
  deleteMessage,
  markMessageAsDelivered,
  markMessagesAsSeen,
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
const { handleCallDisconnect, registerCallHandlers } = require("./call.handler");

const emitPresence = (io, eventName, userId) => {
  io.emit(eventName, {
    userId,
  });
};

const emitFriendRequestNotification = (io, targetUserId, payload) => {
  io.to(getUserRoom(targetUserId)).emit(payload.event, payload.data);
};

const registerSocketHandlers = (io, socket) => {
  const currentUserId = socket.user._id.toString();

  addOnlineUser(currentUserId, socket.id);
  socket.join(getUserRoom(currentUserId));

  socket.emit(SOCKET_EVENTS.PRESENCE_SYNC, {
    onlineUserIds: getOnlineUserIds(),
  });
  emitPresence(io, SOCKET_EVENTS.USER_ONLINE, currentUserId);
  registerCallHandlers(io, socket);

  socket.on(SOCKET_EVENTS.JOIN_CHAT, async ({ chatId }) => {
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
            io.to(getUserRoom(participantId)).emit(SOCKET_EVENTS.MESSAGE_SEEN, {
              chatId,
              seenByUserId: currentUserId,
              count: seenCount,
            });
            io.to(getUserRoom(participantId)).emit(SOCKET_EVENTS.CHAT_UPDATED, {
              chat: updatedChat,
            });
          });

        io.to(getUserRoom(currentUserId)).emit(SOCKET_EVENTS.CHAT_UPDATED, {
          chat: updatedChat,
        });
      }
    } catch (error) {
      console.error("JOIN_CHAT failed", error);
    }
  });

  socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload, acknowledgement) => {
    try {
      const { chatId, content = "", type = "text", media = null, clientTempId, replyToId = null } = payload || {};

      if (!chatId) {
        throw new Error("chatId is required");
      }

      let message = await createMessage({
        chatId,
        senderId: currentUserId,
        content,
        type,
        replyToId,
        media,
      });

      const chat = await Chat.findById(chatId).lean();
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

        io.to(getUserRoom(participantId)).emit(SOCKET_EVENTS.NEW_MESSAGE, {
          message,
          chat: chatSummary,
          clientTempId: participantId === currentUserId ? clientTempId : undefined,
        });
        })
      );

      if (deliveredToOnlineUser) {
        io.to(getUserRoom(currentUserId)).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, {
          chatId,
          messageId: message._id,
        });
      }

      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: true,
          messageId: message._id,
        });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to send message",
        });
      }
    }
  });

  socket.on(SOCKET_EVENTS.DELETE_MESSAGE, async (payload, acknowledgement) => {
    try {
      const { messageId, scope } = payload || {};

      if (!messageId || !scope) {
        throw new Error("messageId and scope are required");
      }

      const result = await deleteMessage({
        messageId,
        currentUserId,
        scope,
      });

      if (scope === "everyone") {
        const chatId = result.message.chatId.toString();
        const chat = await Chat.findById(chatId).lean();
        chat.participants.forEach((participantId) => {
          io.to(getUserRoom(participantId.toString())).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
            scope,
            message: result.message,
            chatId,
          });
        });
      } else {
        io.to(getUserRoom(currentUserId)).emit(SOCKET_EVENTS.MESSAGE_DELETED, {
          scope,
          messageId: result.messageId,
          chatId: result.chatId,
        });
      }

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to delete message",
        });
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
        userName: socket.user.name,
        isTyping: true,
      });
    } catch (error) {
      console.error("TYPING failed", error);
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

      socket.to(getChatRoom(chatId)).emit(SOCKET_EVENTS.TYPING, {
        chatId,
        userId: currentUserId,
        userName: socket.user.name,
        isTyping: false,
      });
    } catch (error) {
      console.error("STOP_TYPING failed", error);
    }
  });

  socket.on("disconnect", () => {
    const becameOffline = removeOnlineUser(currentUserId, socket.id);
    handleCallDisconnect(io, currentUserId);

    if (becameOffline) {
      emitPresence(io, SOCKET_EVENTS.USER_OFFLINE, currentUserId);
    }
  });
};

module.exports = {
  registerSocketHandlers,
};
