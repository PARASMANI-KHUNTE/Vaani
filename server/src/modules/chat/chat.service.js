const mongoose = require("mongoose");
const crypto = require("crypto");
const Chat = require("./chat.model");
const GroupInvite = require("./groupInvite.model");
const Message = require("../message/message.model");
const User = require("../user/user.model");
const ApiError = require("../../utils/apiError");
const { destroyMediaAssets } = require("../../utils/mediaUpload");
const MAX_GROUP_MEMBERS = 50;
const DEFAULT_INVITE_EXPIRY_HOURS = 24 * 7;
const MAX_INVITE_EXPIRY_HOURS = 24 * 365 * 10;

let assertUsersCanInteract;
let mapUserProfile;

const getUserService = () => {
  if (!assertUsersCanInteract) {
    ({ assertUsersCanInteract, mapUserProfile } = require("../user/user.service"));
  }
  return { assertUsersCanInteract, mapUserProfile };
};

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

const normalizeUniqueIds = (ids = []) => [...new Set(ids.map((value) => normalizeId(value)).filter(Boolean))];
const hashInviteToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const createOrGetDirectChat = async (currentUserId, participantId) => {
  if (currentUserId === participantId) {
    throw new ApiError(400, "You cannot start a chat with yourself");
  }

  await assertParticipantExists(participantId);
  await getUserService().assertUsersCanInteract({
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

    // Unhide the chat if it was hidden for this user.
    // NOTE: Do NOT reset clearedAt — old messages must remain permanently
    // deleted from this user's view. Only new messages (after clearedAt)
    // will be visible when the conversation is re-opened.
    const normalizedUserId = normalizeId(currentUserId);
    await Chat.findOneAndUpdate(
      {
        _id: chat._id,
        "userStates.userId": normalizedUserId,
        "userStates.hidden": true,
      },
      {
        $set: {
          "userStates.$.hidden": false,
        },
      }
    );

    // Re-fetch with fresh userStates so formatChatForList doesn't use the
    // stale in-memory object (which still has hidden: true / old clearedAt)
    // and incorrectly return null.
    chat = await Chat.findById(chat._id)
      .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
      .lean();
  }

  return await formatChatForList(chat, currentUserId);
};

const createGroupChat = async ({ currentUserId, groupName, participantIds = [] }) => {
  const normalizedCurrentUserId = normalizeId(currentUserId);
  const normalizedParticipants = normalizeUniqueIds(participantIds);

  const participantsWithoutOwner = normalizedParticipants.filter(
    (participantId) => participantId !== normalizedCurrentUserId
  );
  const allParticipants = normalizeUniqueIds([normalizedCurrentUserId, ...participantsWithoutOwner]);

  if (allParticipants.length < 3) {
    throw new ApiError(400, "A group requires at least 3 members including you");
  }

  if (allParticipants.length > MAX_GROUP_MEMBERS) {
    throw new ApiError(400, `A group can have at most ${MAX_GROUP_MEMBERS} members`);
  }

  const trimmedGroupName = typeof groupName === "string" ? groupName.trim() : "";
  if (!trimmedGroupName || trimmedGroupName.length < 2 || trimmedGroupName.length > 60) {
    throw new ApiError(400, "groupName must be between 2 and 60 characters");
  }

  await Promise.all(
    participantsWithoutOwner.map(async (participantId) => {
      await assertParticipantExists(participantId);
      await getUserService().assertUsersCanInteract({
        currentUserId: normalizedCurrentUserId,
        targetUserId: participantId,
      });
    })
  );

  const chat = await Chat.create({
    participants: allParticipants,
    isGroup: true,
    groupName: trimmedGroupName,
    groupAvatar: null,
    createdBy: normalizedCurrentUserId,
    admins: [normalizedCurrentUserId],
    userStates: buildDefaultUserStates(allParticipants),
  });

  const hydratedChat = await Chat.findById(chat._id)
    .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
    .lean();

  await createGroupSystemMessage({
    chatId: chat._id,
    actorId: normalizedCurrentUserId,
    eventType: "group_created",
    content: "Group created.",
    metadata: {
      groupName: trimmedGroupName,
      participantIds: allParticipants,
    },
  });

  return formatChatForList(hydratedChat, normalizedCurrentUserId);
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
  const isGroup = Boolean(chat.isGroup);
  const otherParticipantRaw =
    chat.participants.find(
      (participant) => normalizeId(participant._id || participant) !== normalizedCurrentUserId
    ) || null;
  const otherParticipant = !isGroup && otherParticipantRaw
    ? getUserService().mapUserProfile(otherParticipantRaw, normalizedCurrentUserId)
    : null;

  const lastMessage = await Message.findOne({
    chatId: chat._id,
    deletedFor: { $ne: currentUserId },
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
    deletedForEveryone: false,
    deletedFor: { $ne: currentUserId },
    senderId: { $ne: currentUserId },
    status: { $in: ["sent", "delivered"] },
    ...getVisibleMessageFilter(currentUserState),
  });

  return {
    _id: chat._id,
    isGroup,
    groupName: isGroup ? chat.groupName || "Untitled Group" : null,
    groupAvatar: isGroup ? chat.groupAvatar || null : null,
    createdBy: chat.createdBy ? normalizeId(chat.createdBy) : null,
    adminIds: isGroup ? (chat.admins || []).map((adminId) => normalizeId(adminId)).filter(Boolean) : [],
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    participants: chat.participants.map((participant) =>
      getUserService().mapUserProfile(participant, normalizedCurrentUserId)
    ),
    otherParticipant,
    lastMessage,
    unreadCount: Math.max(unreadCount, currentUserState?.manualUnread ? 1 : 0),
    manuallyMarkedUnread: Boolean(currentUserState?.manualUnread),
  };
};

const listUserChats = async (currentUserId, options = {}) => {
  const { limit = 50, offset = 0 } = options;
  const normalizedUserId = normalizeId(currentUserId);

  const pipeline = [
    { $match: { participants: normalizedUserId } },
    { $addFields: { userState: { $filter: { input: "$userStates", as: "s", cond: { $eq: ["$$s.userId", normalizedUserId] } } } } },
    { $match: { "userState.hidden": { $ne: true } } },
    { $sort: { updatedAt: -1, createdAt: -1 } },
    { $facet: {
      metadata: [{ $count: "total" }],
      data: [
        { $skip: offset },
        { $limit: limit },
        {
          $lookup: {
            from: "users",
            localField: "participants",
            foreignField: "_id",
            as: "participants",
            pipeline: [{ $project: { username: 1, name: 1, email: 1, avatar: 1, tagline: 1, bio: 1, lastSeen: 1, friends: 1, createdAt: 1 } }],
          },
        },
        {
          $lookup: {
            from: "messages",
            let: { chatId: "$_id", userStateClearedAt: { $arrayElemAt: ["$userState.clearedAt", 0] } },
            pipeline: [
              { $match: { $expr: { $eq: ["$chatId", "$$chatId"] }, deletedFor: { $ne: normalizedUserId }, ...(true ? {} : {}) } },
              { $match: { $expr: { $or: [{ $eq: ["$$userStateClearedAt", null] }, { $gt: ["$createdAt", "$$userStateClearedAt"] }] } } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { content: 1, type: 1, status: 1, senderId: 1, createdAt: 1, deliveredAt: 1, seenAt: 1 } },
            ],
            as: "lastMessageArr",
          },
        },
        {
          $lookup: {
            from: "messages",
            let: { chatId: "$_id", userStateClearedAt: { $arrayElemAt: ["$userState.clearedAt", 0] } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$chatId", "$$chatId"] },
                  deletedForEveryone: false,
                  deletedFor: { $ne: normalizedUserId },
                  senderId: { $ne: normalizedUserId },
                  status: { $in: ["sent", "delivered"] },
                  ...(true ? {} : {}),
                },
              },
              { $match: { $expr: { $or: [{ $eq: ["$$userStateClearedAt", null] }, { $gt: ["$createdAt", "$$userStateClearedAt"] }] } } },
              { $count: "unreadCount" },
            ],
            as: "unreadArr",
          },
        },
      ],
    }},
  ];

  const [result] = await Chat.aggregate(pipeline).allowDiskUse(true);
  const total = result.metadata[0]?.total || 0;
  const chatDocs = result.data;

  const formattedChats = await Promise.all(
    chatDocs.map(async (chat) => {
      const otherParticipant = !chat.isGroup
        ? chat.participants.find((p) => p._id.toString() !== normalizedUserId)
        : null;

      const lastMessage = chat.lastMessageArr[0] || null;
      const unreadCount = (chat.unreadArr[0]?.unreadCount || 0);
      const currentUserState = chat.userState[0] || {};

      return {
        _id: chat._id,
        isGroup: chat.isGroup,
        groupName: chat.isGroup ? chat.groupName || "Untitled Group" : null,
        groupAvatar: chat.isGroup ? chat.groupAvatar || null : null,
        createdBy: chat.createdBy ? normalizeId(chat.createdBy) : null,
        adminIds: chat.isGroup ? (chat.admins || []).map((adminId) => normalizeId(adminId)).filter(Boolean) : [],
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        participants: chat.participants.map((p) => ({
          ...p,
          _id: p._id.toString(),
          isFriend: normalizedUserId !== p._id.toString() ? false : undefined,
          requestSent: false,
          requestReceived: false,
          friendsCount: 0,
        })),
        otherParticipant,
        lastMessage,
        unreadCount: Math.max(unreadCount, currentUserState.manualUnread ? 1 : 0),
        manuallyMarkedUnread: Boolean(currentUserState.manualUnread),
      };
    })
  );

  return {
    chats: formattedChats,
    pagination: { total, limit, offset, hasMore: offset + chatDocs.length < total },
  };
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

const getChatSummariesForParticipants = async (chatId, participantIds) => {
  const normalizedChatId = normalizeId(chatId);
  const normalizedParticipantIds = participantIds.map((id) => normalizeId(id));

  const [chat, lastMessages] = await Promise.all([
    Chat.findById(normalizedChatId)
      .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
      .lean(),
    Message.aggregate([
      { $match: { chatId: new mongoose.Types.ObjectId(normalizedChatId), deletedFor: { $nin: normalizedParticipantIds } } },
      { $sort: { createdAt: -1 } },
      { $limit: 1 },
    ]),
  ]);

  if (!chat) {
    return {};
  }

  const lastMessage = lastMessages[0] || null;

  const summaries = {};
  for (const userId of normalizedParticipantIds) {
    const normalizedUserId = normalizeId(userId);
    const userState = getUserState(chat, normalizedUserId);

    const otherParticipantRaw =
      !chat.isGroup &&
      chat.participants.find((p) => normalizeId(p._id) !== normalizedUserId);

    summaries[normalizedUserId] = {
      _id: chat._id,
      isGroup: Boolean(chat.isGroup),
      groupName: chat.isGroup ? chat.groupName || "Untitled Group" : null,
      groupAvatar: chat.isGroup ? chat.groupAvatar || null : null,
      createdBy: chat.createdBy ? normalizeId(chat.createdBy) : null,
      adminIds: chat.isGroup ? (chat.admins || []).map((a) => normalizeId(a)).filter(Boolean) : [],
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      participants: chat.participants.map((p) => getUserService().mapUserProfile(p, normalizedUserId)),
      otherParticipant: otherParticipantRaw ? getUserService().mapUserProfile(otherParticipantRaw, normalizedUserId) : null,
      lastMessage: lastMessage ? {
        _id: lastMessage._id,
        content: lastMessage.content,
        type: lastMessage.type,
        status: lastMessage.status,
        senderId: lastMessage.senderId,
        createdAt: lastMessage.createdAt,
        deliveredAt: lastMessage.deliveredAt,
        seenAt: lastMessage.seenAt,
      } : null,
      unreadCount: userState?.manualUnread ? 1 : 0,
      manuallyMarkedUnread: Boolean(userState?.manualUnread),
    };
  }

  return summaries;
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
  const chat = await ensureChatMember(chatId, currentUserId);

  if (chat.isGroup) {
    throw new ApiError(400, "Leave the group to remove it from your chat list");
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

const ensureGroupChatMember = async (chatId, userId) => {
  const chat = await ensureChatMember(chatId, userId);
  if (!chat.isGroup) {
    throw new ApiError(400, "This operation is only available for group chats");
  }
  return chat;
};

const isGroupAdmin = (chat, userId) => {
  const normalizedUserId = normalizeId(userId);
  const adminIds = (chat.admins || []).map((adminId) => normalizeId(adminId));
  return adminIds.includes(normalizedUserId);
};

const isGroupOwner = (chat, userId) =>
  normalizeId(chat.createdBy) && normalizeId(chat.createdBy) === normalizeId(userId);

const assertGroupAdmin = (chat, userId) => {
  if (!isGroupAdmin(chat, userId)) {
    throw new ApiError(403, "Only group admins can perform this action");
  }
};

const assertGroupOwner = (chat, userId) => {
  if (!isGroupOwner(chat, userId)) {
    throw new ApiError(403, "Only the group owner can perform this action");
  }
};

const getParticipantIds = (chat) => normalizeUniqueIds((chat.participants || []).map((entry) => normalizeId(entry)));

const createGroupSystemMessage = async ({
  chatId,
  actorId,
  content,
  eventType,
  metadata = null,
}) => {
  const message = await Message.create({
    chatId,
    senderId: actorId,
    content,
    type: "text",
    status: "sent",
    deletedForEveryone: false,
    deletedFor: [],
    isSystem: true,
    systemEvent: {
      eventType,
      metadata,
    },
  });

  await Chat.updateOne(
    { _id: chatId },
    {
      $set: {
        updatedAt: new Date(),
        "userStates.$[senderState].clearedAt": null,
        "userStates.$[senderState].manualUnread": false,
        "userStates.$[senderState].hidden": false,
        // Do NOT reset clearedAt for receivers — if they deleted the chat,
        // old messages must remain gone; only this new message is visible.
        "userStates.$[receiverState].manualUnread": true,
        "userStates.$[receiverState].hidden": false,
      },
    },
    {
      arrayFilters: [
        { "senderState.userId": actorId },
        { "receiverState.userId": { $ne: actorId } },
      ],
    }
  );

  return Message.findById(message._id)
    .populate("senderId", "username name email avatar tagline")
    .lean();
};

const updateChatSettings = async ({ chatId, currentUserId, groupName, groupAvatar, wallpaper, theme }) => {
  const chat = await ensureChatMember(chatId, currentUserId);
  const isGroup = chat.isGroup;

  const nextName = typeof groupName === "string" ? groupName.trim() : undefined;
  const nextAvatar =
    groupAvatar === null ? null : typeof groupAvatar === "string" ? groupAvatar.trim() : undefined;
  const nextWallpaper =
    wallpaper === null ? null : typeof wallpaper === "string" ? wallpaper.trim() : undefined;
  const nextTheme = typeof theme === "string" ? theme.trim() : undefined;

  const update = {};
  const changes = [];

  // Group-specific profile updates
  if (isGroup) {
    if (nextName !== undefined && nextName !== chat.groupName) {
      assertGroupAdmin(chat, currentUserId);
      if (nextName.length < 2 || nextName.length > 60) {
        throw new ApiError(400, "groupName must be between 2 and 60 characters");
      }
      update.groupName = nextName;
      changes.push("name");
    }

    if (nextAvatar !== undefined && nextAvatar !== chat.groupAvatar) {
      assertGroupAdmin(chat, currentUserId);
      update.groupAvatar = nextAvatar;
      changes.push("avatar");
    }
  }

  // Common appearance updates
  if (nextWallpaper !== undefined && nextWallpaper !== chat.wallpaper) {
    update.wallpaper = nextWallpaper;
    changes.push("wallpaper");
  }

  if (nextTheme !== undefined && nextTheme !== chat.theme) {
    update.theme = nextTheme;
    changes.push("theme");
  }

  if (changes.length === 0) {
    throw new ApiError(400, "No changes detected");
  }

  await Chat.updateOne({ _id: chatId }, { $set: update });
  const actor = await User.findById(currentUserId).select("name").lean();

  let auditMessage = null;
  if (isGroup) {
    let eventType = "group_updated";
    let content = `${actor?.name || "Someone"} updated the group profile.`;

    if (changes.length === 1) {
      const field = changes[0];
      if (field === "name") {
        eventType = "group_renamed";
        content = `${actor?.name || "Someone"} renamed the group to "${nextName}".`;
      } else if (field === "avatar") {
        eventType = "group_avatar_updated";
        content = `${actor?.name || "Someone"} updated the group avatar.`;
      } else if (field === "wallpaper") {
        eventType = "group_wallpaper_updated";
        content = `${actor?.name || "Someone"} updated the group wallpaper.`;
      } else if (field === "theme") {
        eventType = "group_theme_updated";
        content = `${actor?.name || "Someone"} updated the group theme to "${nextTheme}".`;
      }
    } else {
      const changeList = changes.join(", ");
      content = `${actor?.name || "Someone"} updated the group ${changeList}.`;
    }

    auditMessage = await createGroupSystemMessage({
      chatId,
      actorId: currentUserId,
      eventType,
      content,
      metadata: {
        ...(update.groupName !== undefined ? { groupName: update.groupName } : {}),
        ...(update.groupAvatar !== undefined ? { groupAvatar: update.groupAvatar } : {}),
        ...(update.wallpaper !== undefined ? { wallpaper: update.wallpaper } : {}),
        ...(update.theme !== undefined ? { theme: update.theme } : {}),
      },
    });
  }

  const updatedChat = await Chat.findById(chatId).lean();
  return {
    chat: updatedChat,
    participantIds: getParticipantIds(updatedChat),
    auditMessage,
  };
};

const addGroupMembers = async ({ chatId, currentUserId, memberIds = [] }) => {
  const chat = await ensureGroupChatMember(chatId, currentUserId);
  assertGroupAdmin(chat, currentUserId);

  const normalizedMemberIds = normalizeUniqueIds(memberIds);
  if (!normalizedMemberIds.length) {
    throw new ApiError(400, "memberIds is required");
  }

  const existingParticipants = getParticipantIds(chat);
  const membersToAdd = normalizedMemberIds.filter((memberId) => !existingParticipants.includes(memberId));
  if (!membersToAdd.length) {
    throw new ApiError(400, "All users are already in this group");
  }

  const projectedSize = existingParticipants.length + membersToAdd.length;
  if (projectedSize > MAX_GROUP_MEMBERS) {
    throw new ApiError(400, `A group can have at most ${MAX_GROUP_MEMBERS} members`);
  }

  const usersToAdd = await User.find({
    _id: { $in: membersToAdd },
    accountStatus: "active",
  })
    .select("name")
    .lean();

  if (usersToAdd.length !== membersToAdd.length) {
    throw new ApiError(404, "One or more members were not found");
  }

  await Promise.all(
    membersToAdd.map((memberId) =>
      getUserService().assertUsersCanInteract({
        currentUserId,
        targetUserId: memberId,
      })
    )
  );

  await Chat.updateOne(
    { _id: chatId },
    {
      $addToSet: {
        participants: { $each: membersToAdd },
        userStates: {
          $each: membersToAdd.map((memberId) => ({
            userId: memberId,
            clearedAt: null,
            manualUnread: true,
            hidden: false,
          })),
        },
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  );

  const actor = await User.findById(currentUserId).select("name").lean();
  const addedNames = usersToAdd.map((entry) => entry.name).join(", ");
  const auditMessage = await createGroupSystemMessage({
    chatId,
    actorId: currentUserId,
    eventType: "member_added",
    content: `${actor?.name || "Someone"} added ${addedNames} to the group.`,
    metadata: {
      memberIds: membersToAdd,
    },
  });

  const updatedChat = await Chat.findById(chatId).lean();
  return {
    participantIds: getParticipantIds(updatedChat),
    auditMessage,
  };
};

const removeGroupMember = async ({ chatId, currentUserId, memberId }) => {
  const chat = await ensureGroupChatMember(chatId, currentUserId);
  assertGroupAdmin(chat, currentUserId);

  const normalizedMemberId = normalizeId(memberId);
  const participantIds = getParticipantIds(chat);
  if (!participantIds.includes(normalizedMemberId)) {
    throw new ApiError(404, "Member is not part of this group");
  }

  if (isGroupOwner(chat, normalizedMemberId)) {
    throw new ApiError(400, "Transfer ownership before removing the group owner");
  }

  await Chat.updateOne(
    { _id: chatId },
    {
      $pull: {
        participants: normalizedMemberId,
        admins: normalizedMemberId,
        userStates: { userId: normalizedMemberId },
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  );

  const [actor, removedUser] = await Promise.all([
    User.findById(currentUserId).select("name").lean(),
    User.findById(normalizedMemberId).select("name").lean(),
  ]);
  const auditMessage = await createGroupSystemMessage({
    chatId,
    actorId: currentUserId,
    eventType: "member_removed",
    content: `${actor?.name || "Someone"} removed ${removedUser?.name || "a member"} from the group.`,
    metadata: {
      memberId: normalizedMemberId,
    },
  });

  const updatedChat = await Chat.findById(chatId).lean();
  return {
    participantIds: getParticipantIds(updatedChat),
    removedMemberId: normalizedMemberId,
    auditMessage,
  };
};

const promoteGroupAdmin = async ({ chatId, currentUserId, memberId }) => {
  const chat = await ensureGroupChatMember(chatId, currentUserId);
  assertGroupOwner(chat, currentUserId);

  const normalizedMemberId = normalizeId(memberId);
  if (!getParticipantIds(chat).includes(normalizedMemberId)) {
    throw new ApiError(404, "Member is not part of this group");
  }
  if (isGroupAdmin(chat, normalizedMemberId)) {
    throw new ApiError(400, "Member is already an admin");
  }

  await Chat.updateOne(
    { _id: chatId },
    {
      $addToSet: {
        admins: normalizedMemberId,
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  );

  const [actor, promotedUser] = await Promise.all([
    User.findById(currentUserId).select("name").lean(),
    User.findById(normalizedMemberId).select("name").lean(),
  ]);
  const auditMessage = await createGroupSystemMessage({
    chatId,
    actorId: currentUserId,
    eventType: "admin_promoted",
    content: `${actor?.name || "Someone"} promoted ${promotedUser?.name || "a member"} to admin.`,
    metadata: {
      memberId: normalizedMemberId,
    },
  });

  const updatedChat = await Chat.findById(chatId).lean();
  return {
    participantIds: getParticipantIds(updatedChat),
    auditMessage,
  };
};

const demoteGroupAdmin = async ({ chatId, currentUserId, memberId }) => {
  const chat = await ensureGroupChatMember(chatId, currentUserId);
  assertGroupOwner(chat, currentUserId);

  const normalizedMemberId = normalizeId(memberId);
  if (!getParticipantIds(chat).includes(normalizedMemberId)) {
    throw new ApiError(404, "Member is not part of this group");
  }
  if (!isGroupAdmin(chat, normalizedMemberId)) {
    throw new ApiError(400, "Member is not an admin");
  }
  if (isGroupOwner(chat, normalizedMemberId)) {
    throw new ApiError(400, "Group owner cannot be demoted");
  }

  const remainingAdmins = (chat.admins || [])
    .map((entry) => normalizeId(entry))
    .filter((entry) => entry !== normalizedMemberId);
  if (remainingAdmins.length < 1) {
    throw new ApiError(400, "Group must have at least one admin");
  }

  await Chat.updateOne(
    { _id: chatId },
    {
      $pull: {
        admins: normalizedMemberId,
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  );

  const [actor, demotedUser] = await Promise.all([
    User.findById(currentUserId).select("name").lean(),
    User.findById(normalizedMemberId).select("name").lean(),
  ]);
  const auditMessage = await createGroupSystemMessage({
    chatId,
    actorId: currentUserId,
    eventType: "admin_demoted",
    content: `${actor?.name || "Someone"} removed admin role from ${demotedUser?.name || "a member"}.`,
    metadata: {
      memberId: normalizedMemberId,
    },
  });

  const updatedChat = await Chat.findById(chatId).lean();
  return {
    participantIds: getParticipantIds(updatedChat),
    auditMessage,
  };
};

const transferGroupOwnership = async ({ chatId, currentUserId, nextOwnerId }) => {
  const chat = await ensureGroupChatMember(chatId, currentUserId);
  assertGroupOwner(chat, currentUserId);

  const normalizedNextOwnerId = normalizeId(nextOwnerId);
  if (!getParticipantIds(chat).includes(normalizedNextOwnerId)) {
    throw new ApiError(404, "Selected user is not part of this group");
  }
  if (normalizedNextOwnerId === normalizeId(currentUserId)) {
    throw new ApiError(400, "Selected user is already the owner");
  }

  await Chat.updateOne(
    { _id: chatId },
    {
      $set: {
        createdBy: normalizedNextOwnerId,
        updatedAt: new Date(),
      },
      $addToSet: {
        admins: normalizedNextOwnerId,
      },
    }
  );

  const [actor, nextOwner] = await Promise.all([
    User.findById(currentUserId).select("name").lean(),
    User.findById(normalizedNextOwnerId).select("name").lean(),
  ]);
  const auditMessage = await createGroupSystemMessage({
    chatId,
    actorId: currentUserId,
    eventType: "ownership_transferred",
    content: `${actor?.name || "Someone"} transferred group ownership to ${nextOwner?.name || "another member"}.`,
    metadata: {
      nextOwnerId: normalizedNextOwnerId,
    },
  });

  const updatedChat = await Chat.findById(chatId).lean();
  return {
    participantIds: getParticipantIds(updatedChat),
    auditMessage,
  };
};

const leaveGroup = async ({ chatId, currentUserId }) => {
  const chat = await ensureGroupChatMember(chatId, currentUserId);
  const participantIds = getParticipantIds(chat);
  const normalizedCurrentUserId = normalizeId(currentUserId);

  if (!participantIds.includes(normalizedCurrentUserId)) {
    throw new ApiError(404, "You are not part of this group");
  }

  if (isGroupOwner(chat, normalizedCurrentUserId) && participantIds.length > 1) {
    throw new ApiError(400, "Transfer ownership before leaving the group");
  }

  if (participantIds.length === 1) {
    await permanentlyDeleteChat(chatId);
    return {
      participantIds: [],
      auditMessage: null,
      wasDeleted: true,
    };
  }

  const actor = await User.findById(currentUserId).select("name").lean();
  const auditMessage = await createGroupSystemMessage({
    chatId,
    actorId: currentUserId,
    eventType: "member_left",
    content: `${actor?.name || "A member"} left the group.`,
    metadata: {
      memberId: normalizedCurrentUserId,
    },
  });

  await Chat.updateOne(
    { _id: chatId },
    {
      $pull: {
        participants: normalizedCurrentUserId,
        admins: normalizedCurrentUserId,
        userStates: { userId: normalizedCurrentUserId },
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  );

  const updatedChat = await Chat.findById(chatId).lean();
  return {
    participantIds: getParticipantIds(updatedChat),
    auditMessage,
    wasDeleted: false,
  };
};

const createGroupInviteLink = async ({
  chatId,
  currentUserId,
  expiresInHours = DEFAULT_INVITE_EXPIRY_HOURS,
  maxUses = 0,
}) => {
  const chat = await ensureGroupChatMember(chatId, currentUserId);
  assertGroupAdmin(chat, currentUserId);

  const safeExpiryHours = Number.isFinite(Number(expiresInHours))
    ? Number(expiresInHours)
    : DEFAULT_INVITE_EXPIRY_HOURS;
  const safeMaxUses = Number.isFinite(Number(maxUses)) ? Number(maxUses) : 0;

  if (safeExpiryHours < 1 || safeExpiryHours > MAX_INVITE_EXPIRY_HOURS) {
    throw new ApiError(
      400,
      `expiresInHours must be between 1 and ${MAX_INVITE_EXPIRY_HOURS} hours`
    );
  }

  if (safeMaxUses < 0 || safeMaxUses > 500) {
    throw new ApiError(400, "maxUses must be between 0 and 500");
  }

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashInviteToken(token);
  const expiresAt = new Date(Date.now() + safeExpiryHours * 60 * 60 * 1000);

  await GroupInvite.updateMany(
    {
      chatId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );

  await GroupInvite.create({
    chatId,
    createdBy: currentUserId,
    tokenHash,
    expiresAt,
    maxUses: safeMaxUses,
  });

  return {
    token,
    expiresAt,
    maxUses: safeMaxUses,
  };
};

const resolveValidInvite = async (token) => {
  if (!token || typeof token !== "string") {
    throw new ApiError(400, "Invite token is required");
  }

  const invite = await GroupInvite.findOne({
    tokenHash: hashInviteToken(token),
  }).lean();

  if (!invite) {
    throw new ApiError(404, "Invite link is invalid");
  }

  if (invite.revokedAt) {
    throw new ApiError(400, "Invite link has been revoked");
  }

  if (new Date(invite.expiresAt).getTime() <= Date.now()) {
    throw new ApiError(400, "Invite link has expired");
  }

  if (invite.maxUses > 0 && invite.useCount >= invite.maxUses) {
    throw new ApiError(400, "Invite link has reached its usage limit");
  }

  return invite;
};

const getGroupInvitePreview = async ({ token, currentUserId }) => {
  const invite = await resolveValidInvite(token);
  const chat = await Chat.findById(invite.chatId)
    .populate("participants", "username name email avatar tagline bio lastSeen friends createdAt")
    .lean();

  if (!chat || !chat.isGroup) {
    throw new ApiError(404, "Group no longer exists");
  }

  const participantIds = getParticipantIds(chat);
  const normalizedCurrentUserId = normalizeId(currentUserId);

  return {
    chatId: chat._id.toString(),
    groupName: chat.groupName || "Untitled Group",
    groupAvatar: chat.groupAvatar || null,
    memberCount: participantIds.length,
    isAlreadyMember: participantIds.includes(normalizedCurrentUserId),
    expiresAt: invite.expiresAt,
    maxUses: invite.maxUses,
    useCount: invite.useCount,
  };
};

const joinGroupByInvite = async ({ token, currentUserId }) => {
  const invite = await resolveValidInvite(token);
  const chat = await Chat.findById(invite.chatId).lean();

  if (!chat || !chat.isGroup) {
    throw new ApiError(404, "Group no longer exists");
  }

  const participantIds = getParticipantIds(chat);
  const normalizedCurrentUserId = normalizeId(currentUserId);

  if (participantIds.includes(normalizedCurrentUserId)) {
    await GroupInvite.updateOne(
      { _id: invite._id },
      {
        $set: {
          lastUsedAt: new Date(),
        },
      }
    );

    return {
      chatId: chat._id.toString(),
      joined: false,
      participantIds,
      auditMessage: null,
    };
  }

  if (participantIds.length >= MAX_GROUP_MEMBERS) {
    throw new ApiError(400, "This group is full");
  }

  await assertParticipantExists(normalizedCurrentUserId);

  await Chat.updateOne(
    { _id: chat._id },
    {
      $addToSet: {
        participants: normalizedCurrentUserId,
        userStates: {
          userId: normalizedCurrentUserId,
          clearedAt: null,
          manualUnread: true,
          hidden: false,
        },
      },
      $set: {
        updatedAt: new Date(),
      },
    }
  );

  const nextUseCount = invite.useCount + 1;
  const shouldRevoke = invite.maxUses > 0 && nextUseCount >= invite.maxUses;

  await GroupInvite.updateOne(
    { _id: invite._id },
    {
      $set: {
        useCount: nextUseCount,
        lastUsedAt: new Date(),
        ...(shouldRevoke ? { revokedAt: new Date() } : {}),
      },
    }
  );

  const joinedUser = await User.findById(normalizedCurrentUserId).select("name").lean();
  const auditMessage = await createGroupSystemMessage({
    chatId: chat._id,
    actorId: normalizedCurrentUserId,
    eventType: "member_added",
    content: `${joinedUser?.name || "A member"} joined via invite link.`,
    metadata: {
      memberIds: [normalizedCurrentUserId],
      source: "invite_link",
    },
  });

  const updatedChat = await Chat.findById(chat._id).lean();
  return {
    chatId: chat._id.toString(),
    joined: true,
    participantIds: getParticipantIds(updatedChat),
    auditMessage,
  };
};

const permanentlyDeleteChat = async (chatId) => {
  const messages = await Message.find({ chatId }).select("media").lean();
  await destroyMediaAssets(messages.map((message) => message.media));
  await Message.deleteMany({ chatId });
  await Chat.deleteOne({ _id: chatId });
};

module.exports = {
  addGroupMembers,
  clearChatMessagesForUser,
  createGroupChat,
  demoteGroupAdmin,
  createGroupInviteLink,
  createOrGetDirectChat,
  deleteChatForUser,
  ensureChatMember,
  ensureGroupChatMember,
  getChatSummary,
  getChatSummariesForParticipants,
  isGroupAdmin,
  leaveGroup,
  getGroupInvitePreview,
  joinGroupByInvite,
  listUserChats,
  markChatRead,
  markChatUnread,
  permanentlyDeleteChat,
  promoteGroupAdmin,
  removeGroupMember,
  transferGroupOwnership,
};
