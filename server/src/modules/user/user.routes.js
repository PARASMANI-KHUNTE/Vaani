const express = require("express");
const authMiddleware = require("../../middlewares/authMiddleware");
const validateRequest = require("../../middlewares/validateRequest");
const userController = require("./user.controller");
const {
  searchUsersValidator,
  updateProfileValidator,
  relationshipUserIdValidator,
  usernameParamValidator,
} = require("./user.validators");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", userController.me);
router.patch("/me", updateProfileValidator, validateRequest, userController.updateMe);
router.get("/explore", userController.explore);
router.get("/search", searchUsersValidator, validateRequest, userController.search);
router.get("/profile/:username", usernameParamValidator, validateRequest, userController.profileByUsername);
router.post("/:userId/friend-request", relationshipUserIdValidator, validateRequest, userController.sendFriendRequest);
router.post("/:userId/friend-request/accept", relationshipUserIdValidator, validateRequest, userController.acceptFriend);
router.post("/:userId/friend-request/reject", relationshipUserIdValidator, validateRequest, userController.rejectFriend);
router.delete("/:userId/friend", relationshipUserIdValidator, validateRequest, userController.unfriend);
router.post("/:userId/block", relationshipUserIdValidator, validateRequest, userController.block);
router.delete("/:userId/block", relationshipUserIdValidator, validateRequest, userController.unblock);

module.exports = router;
