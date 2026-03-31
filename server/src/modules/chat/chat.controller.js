const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const { SOCKET_EVENTS } = require("../socket/socket.constants");
const { emitToUser } = require("../socket/socket.notifications");
const {
  addGroupMembers,
  createGroupInviteLink,
  clearChatMessagesForUser,
  createGroupChat,
  createOrGetDirectChat,
  demoteGroupAdmin,
  deleteChatForUser,
  getChatSummary,
  getGroupInvitePreview,
  joinGroupByInvite,
  leaveGroup,
  listUserChats,
  markChatRead,
  markChatUnread,
  promoteGroupAdmin,
  removeGroupMember,
  transferGroupOwnership,
  updateGroupProfile,
} = require("./chat.service");

const broadcastGroupMutation = async ({ participantIds = [], chatId, auditMessage = null }) => {
  await Promise.all(
    participantIds.map(async (participantId) => {
      const chat = await getChatSummary(chatId, participantId);
      emitToUser(participantId, SOCKET_EVENTS.CHAT_UPDATED, { chat });
      if (auditMessage) {
        emitToUser(participantId, SOCKET_EVENTS.NEW_MESSAGE, { message: auditMessage, chat });
      }
    })
  );
};

const getChats = asyncHandler(async (req, res) => {
  const chats = await listUserChats(req.user._id.toString());

  return sendSuccess(res, 200, "Chats fetched successfully", {
    chats,
  });
});

const createChat = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const chat = req.body.isGroup
    ? await createGroupChat({
        currentUserId,
        groupName: req.body.groupName,
        participantIds: req.body.participantIds || [],
      })
    : await createOrGetDirectChat(currentUserId, req.body.participantId);

  return sendSuccess(res, 201, "Chat ready", {
    chat,
  });
});

const readChat = asyncHandler(async (req, res) => {
  const chat = await markChatRead({
    chatId: req.params.chatId,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Chat marked as read", {
    chat,
  });
});

const unreadChat = asyncHandler(async (req, res) => {
  const chat = await markChatUnread({
    chatId: req.params.chatId,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Chat marked as unread", {
    chat,
  });
});

const removeChat = asyncHandler(async (req, res) => {
  const result = await deleteChatForUser({
    chatId: req.params.chatId,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Chat removed from your list", result);
});

const clearChatMessages = asyncHandler(async (req, res) => {
  const chat = await clearChatMessagesForUser({
    chatId: req.params.chatId,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Messages cleared successfully", {
    chat,
  });
});

const patchGroupProfile = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await updateGroupProfile({
    chatId: req.params.chatId,
    currentUserId,
    groupName: req.body.groupName,
    groupAvatar: req.body.groupAvatar,
  });

  await broadcastGroupMutation({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  const chat = await getChatSummary(req.params.chatId, currentUserId);
  return sendSuccess(res, 200, "Group updated successfully", { chat });
});

const addMembers = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await addGroupMembers({
    chatId: req.params.chatId,
    currentUserId,
    memberIds: req.body.memberIds || [],
  });

  await broadcastGroupMutation({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  const chat = await getChatSummary(req.params.chatId, currentUserId);
  return sendSuccess(res, 200, "Members added successfully", { chat });
});

const removeMember = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await removeGroupMember({
    chatId: req.params.chatId,
    currentUserId,
    memberId: req.params.memberId,
  });

  await broadcastGroupMutation({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });
  if (result.removedMemberId) {
    emitToUser(result.removedMemberId, SOCKET_EVENTS.CHAT_REMOVED, {
      chatId: req.params.chatId,
    });
  }

  const chat = await getChatSummary(req.params.chatId, currentUserId);
  return sendSuccess(res, 200, "Member removed successfully", { chat });
});

const promoteAdmin = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await promoteGroupAdmin({
    chatId: req.params.chatId,
    currentUserId,
    memberId: req.params.memberId,
  });

  await broadcastGroupMutation({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  const chat = await getChatSummary(req.params.chatId, currentUserId);
  return sendSuccess(res, 200, "Admin promoted successfully", { chat });
});

const demoteAdmin = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await demoteGroupAdmin({
    chatId: req.params.chatId,
    currentUserId,
    memberId: req.params.memberId,
  });

  await broadcastGroupMutation({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  const chat = await getChatSummary(req.params.chatId, currentUserId);
  return sendSuccess(res, 200, "Admin demoted successfully", { chat });
});

const transferOwnership = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await transferGroupOwnership({
    chatId: req.params.chatId,
    currentUserId,
    nextOwnerId: req.body.nextOwnerId,
  });

  await broadcastGroupMutation({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  const chat = await getChatSummary(req.params.chatId, currentUserId);
  return sendSuccess(res, 200, "Ownership transferred successfully", { chat });
});

const leaveGroupChat = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await leaveGroup({
    chatId: req.params.chatId,
    currentUserId,
  });

  if (result.wasDeleted) {
    return sendSuccess(res, 200, "Group left successfully", {
      chatId: req.params.chatId,
      deleted: true,
    });
  }

  await broadcastGroupMutation({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  return sendSuccess(res, 200, "Group left successfully", {
    chatId: req.params.chatId,
    deleted: false,
  });
});

const createInviteLink = asyncHandler(async (req, res) => {
  const invite = await createGroupInviteLink({
    chatId: req.params.chatId,
    currentUserId: req.user._id.toString(),
    expiresInHours: req.body.expiresInHours,
    maxUses: req.body.maxUses,
  });

  return sendSuccess(res, 201, "Invite link generated successfully", {
    invite: {
      token: invite.token,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
    },
  });
});

const previewInviteLink = asyncHandler(async (req, res) => {
  const invite = await getGroupInvitePreview({
    token: req.params.token,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Invite preview fetched successfully", {
    invite,
  });
});

const joinGroupViaInvite = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await joinGroupByInvite({
    token: req.params.token,
    currentUserId,
  });

  if (result.auditMessage) {
    await broadcastGroupMutation({
      participantIds: result.participantIds,
      chatId: result.auditMessage.chatId.toString(),
      auditMessage: result.auditMessage,
    });
  }

  const chatId = result.chatId || result.auditMessage?.chatId?.toString() || null;
  const chat = chatId ? await getChatSummary(chatId, currentUserId) : null;

  return sendSuccess(res, 200, result.joined ? "Joined group successfully" : "Already a group member", {
    chat,
    joined: result.joined,
  });
});

module.exports = {
  addMembers,
  clearChatMessages,
  createChat,
  demoteAdmin,
  getChats,
  createInviteLink,
  leaveGroupChat,
  patchGroupProfile,
  previewInviteLink,
  promoteAdmin,
  joinGroupViaInvite,
  readChat,
  removeMember,
  removeChat,
  transferOwnership,
  unreadChat,
};
