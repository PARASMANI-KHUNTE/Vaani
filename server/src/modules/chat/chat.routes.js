const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const { groupMutationRateLimiter } = require("../../middlewares/rateLimiter");
const { createIdempotencyMiddleware } = require("../../middlewares/idempotency");
const chatController = require("./chat.controller");
const {
  addGroupMembersValidator,
  chatIdParamValidator,
  createInviteLinkValidator,
  createChatValidator,
  inviteTokenParamValidator,
  memberIdParamValidator,
  transferOwnershipValidator,
  updateGroupProfileValidator,
} = require("./chat.validators");

const router = express.Router();
const idempotency = createIdempotencyMiddleware();

router.use(authMiddleware);

router.get("/", chatController.getChats);
router.get("/:chatId", chatIdParamValidator, validateRequest, chatController.getChat);
router.post(
  "/",
  groupMutationRateLimiter,
  idempotency,
  createChatValidator,
  validateRequest,
  chatController.createChat
);
router.post(
  "/:chatId/clear",
  groupMutationRateLimiter,
  idempotency,
  chatIdParamValidator,
  validateRequest,
  chatController.clearChatMessages
);
router.patch(
  "/:chatId/group",
  groupMutationRateLimiter,
  idempotency,
  updateGroupProfileValidator,
  validateRequest,
  chatController.patchGroupProfile
);
router.post(
  "/:chatId/invite-link",
  groupMutationRateLimiter,
  idempotency,
  createInviteLinkValidator,
  validateRequest,
  chatController.createInviteLink
);
router.post(
  "/:chatId/members",
  groupMutationRateLimiter,
  idempotency,
  addGroupMembersValidator,
  validateRequest,
  chatController.addMembers
);
router.delete(
  "/:chatId/members/:memberId",
  groupMutationRateLimiter,
  idempotency,
  [...chatIdParamValidator, ...memberIdParamValidator],
  validateRequest,
  chatController.removeMember
);
router.post(
  "/:chatId/admins/:memberId",
  groupMutationRateLimiter,
  idempotency,
  [...chatIdParamValidator, ...memberIdParamValidator],
  validateRequest,
  chatController.promoteAdmin
);
router.delete(
  "/:chatId/admins/:memberId",
  groupMutationRateLimiter,
  idempotency,
  [...chatIdParamValidator, ...memberIdParamValidator],
  validateRequest,
  chatController.demoteAdmin
);
router.post(
  "/:chatId/owner",
  groupMutationRateLimiter,
  idempotency,
  transferOwnershipValidator,
  validateRequest,
  chatController.transferOwnership
);
router.post(
  "/:chatId/leave",
  groupMutationRateLimiter,
  idempotency,
  chatIdParamValidator,
  validateRequest,
  chatController.leaveGroupChat
);
router.get("/invite/:token", inviteTokenParamValidator, validateRequest, chatController.previewInviteLink);
router.post(
  "/invite/:token/join",
  groupMutationRateLimiter,
  idempotency,
  inviteTokenParamValidator,
  validateRequest,
  chatController.joinGroupViaInvite
);
router.patch("/:chatId/read", chatIdParamValidator, validateRequest, chatController.readChat);
router.patch("/:chatId/unread", chatIdParamValidator, validateRequest, chatController.unreadChat);
router.delete(
  "/:chatId",
  groupMutationRateLimiter,
  idempotency,
  chatIdParamValidator,
  validateRequest,
  chatController.removeChat
);

module.exports = router;
