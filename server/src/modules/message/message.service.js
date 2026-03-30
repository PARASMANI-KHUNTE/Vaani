const Chat = require("../chat/chat.model");
const Message = require("./message.model");
const ApiError = require("../../utils/apiError");
const { ensureChatMember } = require("../chat/chat.service");
const { assertSafeMessageContent } = require("../../utils/contentSafety");
const { assertUsersCanInteract } = require("../user/user.service");
const {
  createSignedUploadParams,
  normalizeMessageMedia,
  uploadMessageMedia,
} = require("../../utils/mediaUpload");

const basePopulate = [
  { path: "senderId", select: "username name email avatar tagline" },
  {
    path: "replyTo",
    select: "content senderId deletedForEveryone createdAt",
    populate: {
      path: "senderId",
      select: "username name avatar",
    },
  },
];

const visibleMessageFilter = (userId) => ({
  deletedFor: { $ne: userId },
});

const getChatUserState = (chat, userId) =>
  (chat.userStates || []).find((entry) => entry.userId?.toString() === userId?.toString()) || null;

const createMessage = async ({ chatId, senderId, content, type = "text", replyToId = null, media = null }) => {
  const chat = await ensureChatMember(chatId, senderId);
  const otherParticipantId = chat.participants.find(
    (participantId) => participantId.toString() !== senderId.toString()
  );

  if (otherParticipantId) {
    await assertUsersCanInteract({
      currentUserId: senderId,
      targetUserId: otherParticipantId.toString(),
    });
  }

  let replyTo = null;
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  const safeContent = normalizedContent ? assertSafeMessageContent(normalizedContent) : "";
  const normalizedMedia = type === "text" ? null : normalizeMessageMedia(media, type);

  if (type === "text" && !safeContent) {
    throw new ApiError(400, "content is required for text messages");
  }

  if (replyToId) {
    replyTo = await Message.findOne({
      _id: replyToId,
      chatId,
      deletedFor: { $ne: senderId },
    }).lean();

    if (!replyTo) {
      throw new ApiError(404, "Reply target not found");
    }
  }

  const message = await Message.create({
    chatId,
    senderId,
    replyTo: replyToId || null,
    content: safeContent,
    type,
    media: normalizedMedia,
    status: "sent",
    deletedForEveryone: false,
    deletedFor: [],
  });

  await Chat.updateOne(
    { _id: chatId },
    {
      $set: {
        updatedAt: new Date(),
        "userStates.$[senderState].clearedAt": null,
        "userStates.$[senderState].manualUnread": false,
        "userStates.$[receiverState].manualUnread": true,
      },
    },
    {
      arrayFilters: [
        { "senderState.userId": senderId },
        { "receiverState.userId": { $ne: senderId } },
      ],
    }
  );

  return Message.findById(message._id)
    .populate(basePopulate)
    .lean();
};

const getMessagesByChat = async ({ chatId, userId, page = 1, limit = 20 }) => {
  const chat = await ensureChatMember(chatId, userId);
  const currentUserState = getChatUserState(chat, userId);
  const visibilityFilter = {
    ...visibleMessageFilter(userId),
    ...(currentUserState?.clearedAt
      ? {
          createdAt: {
            $gt: currentUserState.clearedAt,
          },
        }
      : {}),
  };

  const deliveredCount = await markMessagesAsDelivered({
    chatId,
    currentUserId: userId,
  });

  const safePage = Number(page);
  const safeLimit = Number(limit);
  const skip = (safePage - 1) * safeLimit;

  const [messages, total] = await Promise.all([
    Message.find({ chatId, ...visibilityFilter })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate(basePopulate)
      .lean(),
    Message.countDocuments({ chatId, ...visibilityFilter }),
  ]);

  return {
    messages: messages.reverse(),
    deliveredCount,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
      hasNextPage: skip + safeLimit < total,
    },
  };
};

const markMessagesAsDelivered = async ({ chatId, currentUserId }) => {
  const result = await Message.updateMany(
    {
      chatId,
      senderId: { $ne: currentUserId },
      status: "sent",
    },
    {
      $set: {
        status: "delivered",
        deliveredAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

const markMessageAsDelivered = async ({ messageId }) => {
  return Message.findByIdAndUpdate(
    messageId,
    {
      $set: {
        status: "delivered",
        deliveredAt: new Date(),
      },
    },
    {
      returnDocument: "after",
    }
  )
    .populate(basePopulate)
    .lean();
};

const markMessagesAsSeen = async ({ chatId, currentUserId }) => {
  await ensureChatMember(chatId, currentUserId);

  const result = await Message.updateMany(
    {
      chatId,
      senderId: { $ne: currentUserId },
      status: { $in: ["sent", "delivered"] },
    },
    {
      $set: {
        status: "seen",
        seenAt: new Date(),
      },
    }
  );

  return result.modifiedCount;
};

const deleteMessage = async ({ messageId, currentUserId, scope }) => {
  const message = await Message.findById(messageId).lean();

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  await ensureChatMember(message.chatId.toString(), currentUserId);

  if (scope === "everyone") {
    if (message.senderId.toString() !== currentUserId.toString()) {
      throw new ApiError(403, "Only the sender can delete for everyone");
    }

    const updatedMessage = await Message.findByIdAndUpdate(
      messageId,
      {
        $set: {
          deletedForEveryone: true,
          deletedAt: new Date(),
          deletedBy: currentUserId,
          content: "This message was deleted",
          media: null,
        },
      },
      {
        returnDocument: "after",
      }
    )
      .populate(basePopulate)
      .lean();

    return {
      message: updatedMessage,
      scope,
    };
  }

  await Message.findByIdAndUpdate(messageId, {
    $addToSet: {
      deletedFor: currentUserId,
    },
  });

  return {
    messageId,
    chatId: message.chatId,
    scope,
  };
};

const uploadMediaForMessage = async ({ file, currentUserId }) => {
  return uploadMessageMedia({
    file,
    userId: currentUserId,
  });
};

const createSignedMediaUpload = async ({ mimeType, originalName, currentUserId }) => {
  if (!mimeType) {
    throw new ApiError(400, "mimeType is required");
  }

  return createSignedUploadParams({
    mimeType,
    originalName,
    userId: currentUserId,
  });
};

module.exports = {
  createSignedMediaUpload,
  createMessage,
  deleteMessage,
  getMessagesByChat,
  markMessageAsDelivered,
  markMessagesAsDelivered,
  markMessagesAsSeen,
  uploadMediaForMessage,
};
