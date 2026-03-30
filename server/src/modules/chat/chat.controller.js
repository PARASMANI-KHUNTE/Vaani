const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const {
  createOrGetDirectChat,
  deleteChatForUser,
  listUserChats,
  markChatRead,
  markChatUnread,
} = require("./chat.service");

const getChats = asyncHandler(async (req, res) => {
  const chats = await listUserChats(req.user._id.toString());

  return sendSuccess(res, 200, "Chats fetched successfully", {
    chats,
  });
});

const createChat = asyncHandler(async (req, res) => {
  const chat = await createOrGetDirectChat(
    req.user._id.toString(),
    req.body.participantId
  );

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

module.exports = {
  createChat,
  getChats,
  readChat,
  removeChat,
  unreadChat,
};
