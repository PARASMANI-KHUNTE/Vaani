const Chat = require("../chat/chat.model");
const Message = require("./message.model");
const ApiError = require("../../utils/apiError");
const { ensureChatMember } = require("../chat/chat.service");
const { assertSafeMessageContent } = require("../../utils/contentSafety");
const { assertUsersCanInteract } = require("../user/user.service");
const {
  createSignedUploadParams,
  destroyMediaAsset,
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

const editMessage = async ({ messageId, chatId, currentUserId, content }) => {
  const chat = await ensureChatMember(chatId, currentUserId);

  const message = await Message.findOne({
    _id: messageId,
    chatId,
    senderId: currentUserId,
    deletedForEveryone: false,
    deletedFor: { $ne: currentUserId },
  });

  if (!message) {
    throw new ApiError(404, "Message not found or you don't have permission to edit it");
  }

  if (message.type !== "text") {
    throw new ApiError(400, "Only text messages can be edited");
  }

  const safeContent = assertSafeMessageContent(content.trim());
  if (!safeContent) {
    throw new ApiError(400, "Message content cannot be empty");
  }

  message.content = safeContent;
  message.edited = true;
  await message.save();

  return Message.findById(message._id)
    .populate(basePopulate)
    .lean();
};

const forwardMessage = async ({ messageId, chatId, currentUserId, targetChatId }) => {
  const sourceChat = await ensureChatMember(chatId, currentUserId);
  const targetChat = await ensureChatMember(targetChatId, currentUserId);

  const message = await Message.findOne({
    _id: messageId,
    chatId,
    deletedForEveryone: false,
    deletedFor: { $ne: currentUserId },
  }).populate(basePopulate).lean();

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const forwardedContent = message.content
    ? `${message.content}`
    : `Forwarded ${message.type}`;

  const forwarded = await Message.create({
    chatId: targetChatId,
    senderId: currentUserId,
    content: forwardedContent,
    type: message.type,
    media: message.media,
    replyTo: null,
    receipts: [],
    deletedForEveryone: false,
    deletedFor: [],
  });

  return Message.findById(forwarded._id)
    .populate(basePopulate)
    .lean();
};

const getChatUserState = (chat, userId) =>
  (chat.userStates || []).find((entry) => entry.userId?.toString() === userId?.toString()) || null;

const createMessage = async ({ chatId, senderId, content, type = "text", replyToId = null, media = null }) => {
  const chat = await ensureChatMember(chatId, senderId);
  const otherParticipantId =
    !chat.isGroup &&
    chat.participants.find((participantId) => participantId.toString() !== senderId.toString());

  if (otherParticipantId && !chat.isGroup) {
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
    receipts: [],
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
        "userStates.$[senderState].hidden": false,
        "userStates.$[receiverState].manualUnread": true,
        "userStates.$[receiverState].hidden": false,
      },
    },
    {
      arrayFilters: [
        { "senderState.userId": senderId },
        { "receiverState.userId": { $ne: senderId } },
      ],
    }
  );

  const populatedMessage = await Message.findById(message._id)
    .populate(basePopulate)
    .lean();

  const participantIds = chat.participants.map((p) => p.toString());

  return {
    message: populatedMessage,
    participantIds,
  };
};

const getMessagesByChat = async ({ chatId, userId, page = 1, limit = 20, cursor = null }) => {
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

  const baseQuery = { chatId, ...visibilityFilter };
  
  let messages;
  if (cursor) {
    messages = await Message.find({
      ...baseQuery,
      _id: { $lt: cursor },
    })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .populate(basePopulate)
      .lean();
    
    const total = await Message.countDocuments(baseQuery);
    const hasMore = messages.length === safeLimit;
    
    return {
      messages: messages.reverse(),
      deliveredCount,
      pagination: {
        cursor: messages[0]?._id.toString() || null,
        limit: safeLimit,
        total,
        hasNextPage: hasMore,
      },
    };
  }

  const [messagesList, total] = await Promise.all([
    Message.find(baseQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate(basePopulate)
      .lean(),
    Message.countDocuments(baseQuery),
  ]);

  return {
    messages: messagesList.reverse(),
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
  const now = new Date();
  const result = await Message.updateMany(
    {
      chatId,
      senderId: { $ne: currentUserId },
      "receipts.userId": { $ne: currentUserId },
    },
    {
      $push: {
        receipts: {
          userId: currentUserId,
          deliveredAt: now,
        },
      },
    }
  );

  return result.modifiedCount;
};

const markMessageAsDelivered = async ({ messageId, userId }) => {
  const now = new Date();
  const message = await Message.findOneAndUpdate(
    {
      _id: messageId,
      "receipts.userId": { $ne: userId },
    },
    {
      $push: {
        receipts: {
          userId,
          deliveredAt: now,
        },
      },
    },
    {
      returnDocument: "after",
    }
  )
    .populate(basePopulate)
    .lean();
  
  return message;
};

const markMessagesAsSeen = async ({ chatId, currentUserId }) => {
  await ensureChatMember(chatId, currentUserId);
  const now = new Date();

  const result = await Message.updateMany(
    {
      chatId,
      senderId: { $ne: currentUserId },
      "receipts.userId": { $ne: currentUserId },
    },
    {
      $push: {
        receipts: {
          userId: currentUserId,
          deliveredAt: now,
          seenAt: now,
        },
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

    if (message.media?.publicId) {
      await destroyMediaAsset(message.media, message.chatId.toString());
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

const addReaction = async ({ messageId, currentUserId, emoji }) => {
  if (!emoji) {
    throw new ApiError(400, "Emoji is required");
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  await ensureChatMember(message.chatId, currentUserId);

  const existingReactions = message.reactions || [];
  const userReactionIndex = existingReactions.findIndex(
    r => r.userId.toString() === currentUserId && r.emoji === emoji
  );

  if (userReactionIndex === -1) {
    existingReactions.push({
      emoji,
      userId: currentUserId,
    });
  }

  message.reactions = existingReactions;
  await message.save();

  return Message.findById(messageId).populate(basePopulate).lean();
};

const removeReaction = async ({ messageId, currentUserId, emoji }) => {
  if (!emoji) {
    throw new ApiError(400, "Emoji is required");
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  const existingReactions = message.reactions || [];
  message.reactions = existingReactions.filter(
    r => !(r.userId.toString() === currentUserId && r.emoji === emoji)
  );

  await message.save();

  return Message.findById(messageId).populate(basePopulate).lean();
};

module.exports = {
  createSignedMediaUpload,
  createMessage,
  deleteMessage,
  editMessage,
  forwardMessage,
  getMessagesByChat,
  markMessageAsDelivered,
  markMessagesAsDelivered,
  markMessagesAsSeen,
  uploadMediaForMessage,
  addReaction,
  removeReaction,
};
