const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const { SOCKET_EVENTS } = require("../socket/socket.constants");
const { emitToUser, emitToUsers } = require("../socket/socket.notifications");
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
  updateChatSettings,
} = require("./chat.service");

const broadcastChatUpdate = async ({ participantIds = [], chatId, auditMessage = null }) => {
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
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
  const offset = parseInt(req.query.offset, 10) || 0;
  
  const result = await listUserChats(req.user._id.toString(), { limit, offset });

  return sendSuccess(res, 200, "Chats fetched successfully", result);
});

const getChat = asyncHandler(async (req, res) => {
  const chat = await getChatSummary(req.params.chatId, req.user._id.toString());

  return sendSuccess(res, 200, "Chat fetched successfully", {
    chat,
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

  // Broadcast to other participants that a chat was created
  const otherParticipantIds = chat.participants
    .map(p => p._id ? p._id.toString() : p.toString())
    .filter(id => id !== currentUserId);
    
  if (otherParticipantIds.length > 0) {
    emitToUsers(otherParticipantIds, SOCKET_EVENTS.CHAT_CREATED, { chat });
  }

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

const patchChatSettings = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const result = await updateChatSettings({
    chatId: req.params.chatId,
    currentUserId,
    groupName: req.body.groupName,
    groupAvatar: req.body.groupAvatar,
    wallpaper: req.body.wallpaper,
    theme: req.body.theme,
  });

  await broadcastChatUpdate({
    participantIds: result.participantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  const chat = await getChatSummary(req.params.chatId, currentUserId);
  return sendSuccess(res, 200, "Settings updated successfully", { chat });
});

const addMembers = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const memberIdsToAdd = req.body.memberIds || [];
  
  const result = await addGroupMembers({
    chatId: req.params.chatId,
    currentUserId,
    memberIds: memberIdsToAdd,
  });

  // the service returns participantIds (which includes the existing and newly added members)
  const existingParticipantIds = result.participantIds.filter(id => !memberIdsToAdd.includes(id));
  
  // existing members just get a CHAT_UPDATED + optional message
  await broadcastChatUpdate({
    participantIds: existingParticipantIds,
    chatId: req.params.chatId,
    auditMessage: result.auditMessage,
  });

  // new members get MEMBER_ADDED_TO_GROUP
  if (memberIdsToAdd.length > 0) {
    await Promise.all(
      memberIdsToAdd.map(async (memberId) => {
        const chatSummary = await getChatSummary(req.params.chatId, memberId);
        emitToUser(memberId, SOCKET_EVENTS.MEMBER_ADDED_TO_GROUP, { 
          chat: chatSummary,
          addedByUserId: currentUserId,
          addedByUserName: req.user.name,
          addedUserId: memberId,
          chatId: req.params.chatId
        });
        // Also send them the audit message as a NEW_MESSAGE so they see the context
        if (result.auditMessage) {
          emitToUser(memberId, SOCKET_EVENTS.NEW_MESSAGE, { message: result.auditMessage, chat: chatSummary });
        }
      })
    );
  }

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

  await broadcastChatUpdate({
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

  await broadcastChatUpdate({
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

  await broadcastChatUpdate({
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

  await broadcastChatUpdate({
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

  await broadcastChatUpdate({
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
    await broadcastChatUpdate({
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
  getChat,
  getChats,
  createInviteLink,
  leaveGroupChat,
  patchChatSettings,
  previewInviteLink,
  promoteAdmin,
  joinGroupViaInvite,
  readChat,
  removeMember,
  removeChat,
  transferOwnership,
  unreadChat,
};
