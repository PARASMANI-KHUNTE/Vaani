const { body, param } = require("express-validator");

const createChatValidator = [
  body("isGroup")
    .optional()
    .isBoolean()
    .withMessage("isGroup must be a boolean"),
  body("participantId")
    .optional()
    .isMongoId()
    .withMessage("participantId must be a valid user id"),
  body("groupName")
    .optional()
    .isString()
    .withMessage("groupName must be a string")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("groupName must be between 2 and 60 characters"),
  body("participantIds")
    .optional()
    .isArray({ min: 1, max: 49 })
    .withMessage("participantIds must be an array with 1 to 49 users"),
  body("participantIds.*")
    .optional()
    .isMongoId()
    .withMessage("participantIds must contain valid user ids"),
  body().custom((_, { req }) => {
    if (req.body.isGroup === true) {
      if (!req.body.groupName || typeof req.body.groupName !== "string") {
        throw new Error("groupName is required for group chat");
      }
      if (!Array.isArray(req.body.participantIds) || req.body.participantIds.length < 1) {
        throw new Error("participantIds is required for group chat");
      }
      return true;
    }

    if (!req.body.participantId || typeof req.body.participantId !== "string") {
      throw new Error("participantId is required for direct chat");
    }

    return true;
  }),
];

const chatIdParamValidator = [
  param("chatId").isMongoId().withMessage("chatId must be a valid id"),
];

const memberIdParamValidator = [
  param("memberId").isMongoId().withMessage("memberId must be a valid id"),
];

const updateGroupProfileValidator = [
  ...chatIdParamValidator,
  body("groupName")
    .optional()
    .isString()
    .withMessage("groupName must be a string")
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage("groupName must be between 2 and 60 characters"),
  body("groupAvatar")
    .optional()
    .custom((value) => value === null || typeof value === "string")
    .withMessage("groupAvatar must be a string or null"),
  body("wallpaper")
    .optional()
    .custom((value) => value === null || typeof value === "string")
    .withMessage("wallpaper must be a string or null"),
  body("theme")
    .optional()
    .isString()
    .withMessage("theme must be a string"),
  body().custom((_, { req }) => {
    if (
      req.body.groupName === undefined &&
      req.body.groupAvatar === undefined &&
      req.body.wallpaper === undefined &&
      req.body.theme === undefined
    ) {
      throw new Error("Provide groupName, groupAvatar, wallpaper, or theme");
    }
    return true;
  }),
];

const addGroupMembersValidator = [
  ...chatIdParamValidator,
  body("memberIds")
    .isArray({ min: 1, max: 20 })
    .withMessage("memberIds must be an array with 1 to 20 users"),
  body("memberIds.*").isMongoId().withMessage("memberIds must contain valid user ids"),
];

const transferOwnershipValidator = [
  ...chatIdParamValidator,
  body("nextOwnerId")
    .notEmpty()
    .withMessage("nextOwnerId is required")
    .isMongoId()
    .withMessage("nextOwnerId must be a valid user id"),
];

const createInviteLinkValidator = [
  ...chatIdParamValidator,
  body("expiresInHours")
    .optional()
    .isInt({ min: 1, max: 24 * 30 })
    .withMessage("expiresInHours must be between 1 and 720"),
  body("maxUses")
    .optional()
    .isInt({ min: 0, max: 500 })
    .withMessage("maxUses must be between 0 and 500"),
];

const inviteTokenParamValidator = [
  param("token")
    .trim()
    .isLength({ min: 20, max: 300 })
    .withMessage("token is invalid"),
];

module.exports = {
  addGroupMembersValidator,
  chatIdParamValidator,
  createInviteLinkValidator,
  createChatValidator,
  inviteTokenParamValidator,
  memberIdParamValidator,
  transferOwnershipValidator,
  updateGroupProfileValidator,
};
