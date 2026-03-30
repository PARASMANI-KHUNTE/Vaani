const { body, param } = require("express-validator");

const createChatValidator = [
  body("participantId")
    .trim()
    .notEmpty()
    .withMessage("participantId is required")
    .isMongoId()
    .withMessage("participantId must be a valid user id"),
];

const chatIdParamValidator = [
  param("chatId").isMongoId().withMessage("chatId must be a valid id"),
];

module.exports = {
  chatIdParamValidator,
  createChatValidator,
};
