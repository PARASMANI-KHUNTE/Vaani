const { body, param, query } = require("express-validator");

const getMessagesValidator = [
  param("chatId").isMongoId().withMessage("chatId must be a valid id"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("limit must be between 1 and 50"),
];

const createMessageValidator = [
  body("chatId").isMongoId().withMessage("chatId must be a valid id"),
  body("replyToId")
    .optional({ values: "falsy" })
    .isMongoId()
    .withMessage("replyToId must be a valid id"),
  body("content")
    .optional({ values: "undefined" })
    .trim()
    .isLength({ max: 5000 })
    .withMessage("content must be 5000 characters or fewer"),
  body("type")
    .optional()
    .isIn(["text", "image", "file", "video", "voice"])
    .withMessage("type must be text, image, file, video, or voice"),
  body("media").optional().isObject().withMessage("media must be an object"),
  body().custom((value) => {
    const type = value.type || "text";
    const content = typeof value.content === "string" ? value.content.trim() : "";

    if (type === "text" && !content) {
      throw new Error("content is required for text messages");
    }

    if (type !== "text" && !value.media?.url) {
      throw new Error(`media is required for ${type} messages`);
    }

    return true;
  }),
];

const deleteMessageValidator = [
  param("messageId").isMongoId().withMessage("messageId must be a valid id"),
  query("scope")
    .isIn(["me", "everyone"])
    .withMessage("scope must be either me or everyone"),
];

const reactionValidator = [
  param("messageId").isMongoId().withMessage("messageId must be a valid id"),
];

const removeReactionValidator = [
  param("messageId").isMongoId().withMessage("messageId must be a valid id"),
  query("emoji")
    .trim()
    .notEmpty()
    .withMessage("emoji is required")
    .isLength({ max: 20 })
    .withMessage("emoji must be 20 characters or fewer"),
];

module.exports = {
  createMessageValidator,
  deleteMessageValidator,
  getMessagesValidator,
  reactionValidator,
  removeReactionValidator,
};
