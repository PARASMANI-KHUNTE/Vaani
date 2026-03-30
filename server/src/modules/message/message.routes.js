const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const { singleMessageMediaUpload } = require("../../middlewares/uploadMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const messageController = require("./message.controller");
const {
  createMessageValidator,
  deleteMessageValidator,
  getMessagesValidator,
} = require("./message.validators");

const router = express.Router();

router.use(authMiddleware);

router.post("/upload/signature", messageController.createUploadSignature);
router.post("/upload", singleMessageMediaUpload("file"), messageController.uploadMedia);
router.get("/:chatId", getMessagesValidator, validateRequest, messageController.getMessages);
router.post("/", createMessageValidator, validateRequest, messageController.postMessage);
router.delete("/:messageId", deleteMessageValidator, validateRequest, messageController.removeMessage);

module.exports = router;
