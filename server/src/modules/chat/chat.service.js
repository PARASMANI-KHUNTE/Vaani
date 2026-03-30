const mongoose = require("mongoose");
const Chat = require("./chat.model");
const Message = require("../message/message.model");
const User = require("../user/user.model");
const ApiError = require("../../utils/apiError");
const { assertUsersCanInteract, mapUserProfile } = require("../user/user.service");
const { destroyMediaAssets } = require("../../utils/mediaUpload");

const normalizeId = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value._id) {
    return value._id.toString();
  }

  return value.toString();
};

const buildDefaultUserStates = (participants = []) =>
  participants.map((participantId) => ({
    userId: normalizeId(participantId),
    clearedAt: null,
    manualUnread: false,
    hidden: false,
  }));

const getUserState = (chat, userId) =>
  (chat.userStates || []).find((entry) => normalizeId(entry.userId) === normalizeId(userId)) || null;

const getVisibleMessageFilter = (userState) => ({
  ...(userState?.clearedAt
    ? {
        createdAt: {
          $gt: userState.clearedAt,
        },
      }
    : {}),
});

const ensureChatUserState = async (chat) => {
  const participantIds = (chat.participants || []).map((participantId) => normalizeId(participantId));
  const stateIds = new Set((chat.userStates || []).map((entry) => normalizeId(entry.userId)));
  const missingUserStates = participantIds
    .filter((participantId) => !stateIds.has(participantId))
    .map((participantId) => ({
      userId: participantId,
      clearedAt: null,
      manualUnread: false,
      hidden: false,
    }));

  if (!missingUserStates.length) {
    return;
  }

  await Chat.findByIdAndUpdate(chat._id, {
    $addToSet: {
      userStates: {
        $each: missingUserStates,
      },
    },
  });

  chat.userStates = [...(chat.userStates || []), ...missingUserStates];
};

const assertParticipantExists = async (participantId) => {
  const participant = await User.findById(participantId).lean();

  if (!participant) {
    throw new ApiError(404, "Participant not found");
  }

  return participant;
};

const createOrGetDirectChat = async (currentUserId, participantId) => {
  if (currentUserId === participantId) {
    throw new ApiError(400, "You cannot start a chat with yourself");
  }

  await assertParticipantExists(participantId);
  await assertUsersCanInteract({
    currentUserId,
    targetUserId: participantId,
  });

  let chat = await Chat.findOne({
    isGroup: false,
    participants: { $all: [currentUserId, participantId], $size: 2 },
  })
    .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
    .lean();

  if (!chat) {
    chat = await Chat.create({
      participants: [currentUserId, participantId],
      isGroup: false,
      userStates: buildDefaultUserStates([currentUserId, participantId]),
    });

    chat = await Chat.findById(chat._id)
      .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
      .lean();
  } else {
    await ensureChatUserState(chat);
  }

  return formatChatForList(chat, currentUserId);
};

const ensureChatMember = async (chatId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(chatId)) {
    throw new ApiError(400, "Invalid chat id");
  }

  const chat = await Chat.findOne({
    _id: chatId,
    participants: userId,
  }).lean();

  if (!chat) {
    throw new ApiError(403, "You do not have access to this chat");
  }

  await ensureChatUserState(chat);

  return chat;
};

const formatChatForList = async (chat, currentUserId) => {
  const normalizedCurrentUserId = normalizeId(currentUserId);
  const currentUserState = getUserState(chat, currentUserId);
  const otherParticipantRaw =
    chat.participants.find(
      (participant) => normalizeId(participant._id || participant) !== normalizedCurrentUserId
    ) || null;
  const otherParticipant = otherParticipantRaw
    ? mapUserProfile(otherParticipantRaw, normalizedCurrentUserId)
    : null;

  const lastMessage = await Message.findOne({
    chatId: chat._id,
    ...getVisibleMessageFilter(currentUserState),
  })
    .sort({ createdAt: -1 })
    .select("content type status senderId createdAt deliveredAt seenAt")
    .lean();

  if (!lastMessage && currentUserState?.hidden) {
    return null;
  }

  const unreadCount = await Message.countDocuments({
    chatId: chat._id,
    senderId: { $ne: currentUserId },
    status: { $in: ["sent", "delivered"] },
    ...getVisibleMessageFilter(currentUserState),
  });

  return {
    _id: chat._id,
    isGroup: chat.isGroup,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    participants: chat.participants.map((participant) =>
      mapUserProfile(participant, normalizedCurrentUserId)
    ),
    otherParticipant,
    lastMessage,
    unreadCount: Math.max(unreadCount, currentUserState?.manualUnread ? 1 : 0),
    manuallyMarkedUnread: Boolean(currentUserState?.manualUnread),
  };
};

const listUserChats = async (currentUserId) => {
  const chats = await Chat.find({
    participants: currentUserId,
  })
    .sort({ updatedAt: -1, createdAt: -1 })
    .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
    .lean();

  for (const chat of chats) {
    await ensureChatUserState(chat);
  }

  const chatItems = await Promise.all(
    chats.map((chat) => formatChatForList(chat, currentUserId))
  );

  return chatItems.filter(Boolean);
};

const getChatSummary = async (chatId, currentUserId) => {
  const chat = await Chat.findOne({
    _id: chatId,
    participants: currentUserId,
  })
    .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
    .lean();

  if (!chat) {
    throw new ApiError(403, "You do not have access to this chat");
  }

  await ensureChatUserState(chat);

  return formatChatForList(chat, currentUserId);
};

const markChatRead = async ({ chatId, currentUserId }) => {
  await ensureChatMember(chatId, currentUserId);

  const normalizedUserId = normalizeId(currentUserId);

  await Promise.all([
    Chat.findOneAndUpdate(
      {
        _id: chatId,
        userStates: {
          $elemMatch: {
            userId: normalizedUserId,
          },
        },
      },
      {
        $set: {
          "userStates.$.manualUnread": false,
        },
      }
    ),
    Message.updateMany(
      {
        chatId,
        senderId: { $ne: currentUserId },
        status: { $in: ["sent", "delivered"] },
      },
      {
        $set: {
          status: "seen",
        },
      }
    ),
  ]);

  return getChatSummary(chatId, currentUserId);
};

const markChatUnread = async ({ chatId, currentUserId }) => {
  const chat = await ensureChatMember(chatId, currentUserId);
  const currentUserState = getUserState(chat, currentUserId);

  const latestIncomingMessage = await Message.findOne({
    chatId,
    senderId: { $ne: currentUserId },
    ...getVisibleMessageFilter(currentUserState),
  })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();

  if (!latestIncomingMessage) {
    throw new ApiError(400, "No incoming messages available to mark as unread");
  }

  const normalizedUserId = normalizeId(currentUserId);

  await Chat.findOneAndUpdate(
    {
      _id: chatId,
      userStates: {
        $elemMatch: {
          userId: normalizedUserId,
        },
      },
    },
    {
      $set: {
        "userStates.$.manualUnread": true,
      },
    }
  );

  return getChatSummary(chatId, currentUserId);
};

const deleteChatForUser = async ({ chatId, currentUserId }) => {
  await ensureChatMember(chatId, currentUserId);

  const normalizedUserId = normalizeId(currentUserId);

  await Chat.findOneAndUpdate(
    {
      _id: chatId,
      userStates: {
        $elemMatch: {
          userId: normalizedUserId,
        },
      },
    },
    {
      $set: {
        "userStates.$.clearedAt": new Date(),
        "userStates.$.manualUnread": false,
        "userStates.$.hidden": true,
      },
    }
  );

  return {
    chatId,
  };
};

const clearChatMessagesForUser = async ({ chatId, currentUserId }) => {
  await ensureChatMember(chatId, currentUserId);

  const normalizedUserId = normalizeId(currentUserId);

  await Chat.findOneAndUpdate(
    {
      _id: chatId,
      userStates: {
        $elemMatch: {
          userId: normalizedUserId,
        },
      },
    },
    {
      $set: {
        "userStates.$.clearedAt": new Date(),
        "userStates.$.manualUnread": false,
        "userStates.$.hidden": false,
      },
    }
  );

  return getChatSummary(chatId, currentUserId);
};

const permanentlyDeleteChat = async (chatId) => {
  const messages = await Message.find({ chatId }).select("media").lean();
  await destroyMediaAssets(messages.map((message) => message.media));
  await Message.deleteMany({ chatId });
  await Chat.deleteOne({ _id: chatId });
};

module.exports = {
  clearChatMessagesForUser,
  createOrGetDirectChat,
  deleteChatForUser,
  ensureChatMember,
  getChatSummary,
  listUserChats,
  markChatRead,
  markChatUnread,
  permanentlyDeleteChat,
};
