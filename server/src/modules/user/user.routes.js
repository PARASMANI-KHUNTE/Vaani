const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const userController = require("./user.controller");
const {
  registerPushTokenValidator,
  searchUsersValidator,
  updateProfileValidator,
  relationshipUserIdValidator,
  unregisterPushTokenValidator,
  usernameParamValidator,
} = require("./user.validators");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", userController.me);
router.get("/me/blocked", userController.getBlocked);
router.patch("/me", updateProfileValidator, validateRequest, userController.updateMe);
router.post("/push-token", registerPushTokenValidator, validateRequest, userController.registerDevicePushToken);
router.delete("/push-token", unregisterPushTokenValidator, validateRequest, userController.unregisterDevicePushToken);
router.post("/me/disable", userController.disableAccount);
router.delete("/me", userController.deleteAccount);
router.get("/explore", userController.explore);
router.get("/search", searchUsersValidator, validateRequest, userController.search);
router.get("/profile/:username", usernameParamValidator, validateRequest, userController.profileByUsername);
router.get("/:userId/profile", relationshipUserIdValidator, validateRequest, userController.profileByUserId);
router.post("/:userId/friend-request", relationshipUserIdValidator, validateRequest, userController.sendFriendRequest);
router.post("/:userId/friend-request/accept", relationshipUserIdValidator, validateRequest, userController.acceptFriend);
router.post("/:userId/friend-request/reject", relationshipUserIdValidator, validateRequest, userController.rejectFriend);
router.delete("/:userId/friend", relationshipUserIdValidator, validateRequest, userController.unfriend);
router.post("/:userId/block", relationshipUserIdValidator, validateRequest, userController.block);
router.delete("/:userId/block", relationshipUserIdValidator, validateRequest, userController.unblock);

module.exports = router;
