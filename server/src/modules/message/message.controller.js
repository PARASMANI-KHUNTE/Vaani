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

const getMessages = asyncHandler(async (req, res) => {
  const result = await getMessagesByChat({
    chatId: req.params.chatId,
    userId: req.user._id.toString(),
    page: req.query.page || 1,
    limit: req.query.limit || 20,
  });

  return sendSuccess(res, 200, "Messages fetched successfully", {
    ...result,
  });
});

const postMessage = asyncHandler(async (req, res) => {
  const message = await createMessage({
    chatId: req.body.chatId,
    senderId: req.user._id.toString(),
    content: req.body.content || "",
    type: req.body.type || "text",
    replyToId: req.body.replyToId || null,
    media: req.body.media || null,
  });

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
  const result = await deleteMessage({
    messageId: req.params.messageId,
    currentUserId: req.user._id.toString(),
    scope: req.query.scope,
  });

  return sendSuccess(res, 200, "Message deleted successfully", result);
});

const addReaction = asyncHandler(async (req, res) => {
  const message = await addReactionToMessage({
    messageId: req.params.messageId,
    currentUserId: req.user._id.toString(),
    emoji: req.body.emoji,
  });

  return sendSuccess(res, 200, "Reaction added successfully", { message });
});

const removeReaction = asyncHandler(async (req, res) => {
  const message = await removeReactionFromMessage({
    messageId: req.params.messageId,
    currentUserId: req.user._id.toString(),
    emoji: req.query.emoji,
  });

  return sendSuccess(res, 200, "Reaction removed successfully", { message });
});

const editMessage = asyncHandler(async (req, res) => {
  const message = await editMessageService({
    messageId: req.params.messageId,
    chatId: req.body.chatId,
    currentUserId: req.user._id.toString(),
    content: req.body.content,
  });

  return sendSuccess(res, 200, "Message edited successfully", { message });
});

const forwardMessage = asyncHandler(async (req, res) => {
  const message = await forwardMessageService({
    messageId: req.params.messageId,
    chatId: req.body.chatId,
    currentUserId: req.user._id.toString(),
    targetChatId: req.body.targetChatId,
  });

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
