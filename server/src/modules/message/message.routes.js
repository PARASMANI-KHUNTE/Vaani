const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const { singleMessageMediaUpload } = require("../../middlewares/uploadMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const { uploadRateLimiter, messageRateLimiter } = require("../../middlewares/rateLimiter");
const messageController = require("./message.controller");
const {
  createMessageValidator,
  deleteMessageValidator,
  getMessagesValidator,
  reactionValidator,
  removeReactionValidator,
} = require("./message.validators");

const router = express.Router();

router.use(authMiddleware);

router.post("/upload/signature", uploadRateLimiter, messageController.createUploadSignature);
router.post("/upload", uploadRateLimiter, singleMessageMediaUpload("file"), messageController.uploadMedia);
router.get("/:chatId", getMessagesValidator, validateRequest, messageController.getMessages);
router.post("/", messageRateLimiter, createMessageValidator, validateRequest, messageController.postMessage);
router.post("/:messageId/reaction", reactionValidator, validateRequest, messageController.addReaction);
router.delete("/:messageId/reaction", removeReactionValidator, validateRequest, messageController.removeReaction);
router.delete("/:messageId", deleteMessageValidator, validateRequest, messageController.removeMessage);
router.put("/:messageId", messageRateLimiter, createMessageValidator, validateRequest, messageController.editMessage);
router.post("/:messageId/forward", messageRateLimiter, messageController.forwardMessage);

module.exports = router;
