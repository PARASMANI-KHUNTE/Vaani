const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const chatController = require("./chat.controller");
const { chatIdParamValidator, createChatValidator } = require("./chat.validators");

const router = express.Router();

router.use(authMiddleware);

router.get("/", chatController.getChats);
router.post("/", createChatValidator, validateRequest, chatController.createChat);
router.post("/:chatId/clear", chatIdParamValidator, validateRequest, chatController.clearChatMessages);
router.patch("/:chatId/read", chatIdParamValidator, validateRequest, chatController.readChat);
router.patch("/:chatId/unread", chatIdParamValidator, validateRequest, chatController.unreadChat);
router.delete("/:chatId", chatIdParamValidator, validateRequest, chatController.removeChat);

module.exports = router;
