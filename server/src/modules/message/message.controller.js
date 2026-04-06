const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const {
  createSignedMediaUpload,
  createMessage,
  deleteMessage,
  getMessagesByChat,
  uploadMediaForMessage,
  addReaction: addReactionToMessage,
  removeReaction: removeReactionFromMessage,
  editMessage: editMessageService,
  forwardMessage: forwardMessageService,
} = require("./message.service");
const {
  emitMessageCreated,
  emitMessageDeleted,
  emitReactionAdded,
  emitReactionRemoved,
  emitMessageEdited,
  emitForwardedMessage,
} = require("../socket/socket.notifications");

const getMessages = asyncHandler(async (req, res) => {
  const result = await getMessagesByChat({
    chatId: req.params.chatId,
    userId: req.user._id.toString(),
    page: req.query.page || 1,
    limit: Math.min(parseInt(req.query.limit, 10) || 20, 100),
    cursor: req.query.cursor || null,
  });

  return sendSuccess(res, 200, "Messages fetched successfully", {
    ...result,
  });
});

const postMessage = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const currentUserName = req.user.name;
  
  const message = await createMessage({
    chatId: req.body.chatId,
    senderId: currentUserId,
    content: req.body.content || "",
    type: req.body.type || "text",
    replyToId: req.body.replyToId || null,
    media: req.body.media || null,
  });

  const messageChatId = message.chatId?.toString() || message.chatId;
  await emitMessageCreated(message, messageChatId, currentUserId, currentUserName, null);

  return sendSuccess(res, 201, "Message sent successfully", {
    message,
  });
});

const uploadMedia = asyncHandler(async (req, res) => {
  const media = await uploadMediaForMessage({
    file: req.file,
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 201, "Media uploaded successfully", {
    media,
  });
});

const createUploadSignature = asyncHandler(async (req, res) => {
  const signature = await createSignedMediaUpload({
    mimeType: req.body.mimeType,
    originalName: req.body.originalName || "upload",
    currentUserId: req.user._id.toString(),
  });

  return sendSuccess(res, 200, "Upload signature created successfully", {
    signature,
  });
});

const removeMessage = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  
  const result = await deleteMessage({
    messageId: req.params.messageId,
    currentUserId,
    scope: req.query.scope,
  });

  await emitMessageDeleted(result, req.query.scope, currentUserId);

  return sendSuccess(res, 200, "Message deleted successfully", result);
});

const addReaction = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const currentUserName = req.user.name;
  
  const message = await addReactionToMessage({
    messageId: req.params.messageId,
    currentUserId,
    emoji: req.body.emoji,
  });

  await emitReactionAdded(message, currentUserId, currentUserName, req.body.emoji);

  return sendSuccess(res, 200, "Reaction added successfully", { message });
});

const removeReaction = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  
  const message = await removeReactionFromMessage({
    messageId: req.params.messageId,
    currentUserId,
    emoji: req.query.emoji,
  });

  await emitReactionRemoved(message, currentUserId, req.query.emoji);

  return sendSuccess(res, 200, "Reaction removed successfully", { message });
});

const editMessage = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const chatId = req.body.chatId;
  
  const message = await editMessageService({
    messageId: req.params.messageId,
    chatId,
    currentUserId,
    content: req.body.content,
  });

  const messageChatId = message.chatId?.toString() || chatId;
  await emitMessageEdited(message, messageChatId, currentUserId);

  return sendSuccess(res, 200, "Message edited successfully", { message });
});

const forwardMessage = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id.toString();
  const targetChatId = req.body.targetChatId;
  
  const message = await forwardMessageService({
    messageId: req.params.messageId,
    chatId: req.body.chatId,
    currentUserId,
    targetChatId,
  });

  await emitForwardedMessage(message, targetChatId, currentUserId);

  return sendSuccess(res, 201, "Message forwarded successfully", { message });
});

module.exports = {
  getMessages,
  postMessage,
  removeMessage,
  addReaction,
  removeReaction,
  createUploadSignature,
  uploadMedia,
  editMessage,
  forwardMessage,
};
