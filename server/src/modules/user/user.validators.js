const { body, param, query } = require("express-validator");

const searchUsersValidator = [
  query("q")
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage("Search query must be between 1 and 80 characters"),
];

const registerPushTokenValidator = [
  body().custom((value) => {
    const token = value.token ?? value.pushToken;
    if (!token) {
      throw new Error("push token is required");
    }
    return true;
  }),
  body(["token", "pushToken"]).custom((value) => {
    if (value === undefined) return true;
    if (typeof value !== "string" || !value.trim()) {
      throw new Error("token must be a non-empty string");
    }
    return true;
  }),
  body("platform")
    .optional()
    .isIn(["android", "ios", "web"])
    .withMessage("platform must be android, ios, or web"),
];

const unregisterPushTokenValidator = [
  body().custom((value) => {
    if (!value.token && !value.pushToken) {
      throw new Error("token is required");
    }
    return true;
  }),
];

module.exports = {
  registerPushTokenValidator,
  relationshipUserIdValidator: [
    param("userId").isMongoId().withMessage("userId must be a valid id"),
  ],
  searchUsersValidator,
  unregisterPushTokenValidator,
  updateProfileValidator: [
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage("Name must be between 2 and 80 characters"),
    body("tagline")
      .optional()
      .trim()
      .isLength({ min: 4, max: 4 })
      .matches(/^[A-Za-z0-9]{4}$/)
      .withMessage("Tagline must be exactly 4 letters, numbers, or a mix of both"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 280 })
      .withMessage("Bio must be 280 characters or fewer"),
    body().custom((value) => {
      const hasName = value.name !== undefined;
      const hasTagline = value.tagline !== undefined;
      const hasBio = value.bio !== undefined;

      if (!hasName && !hasTagline && !hasBio) {
        throw new Error("At least one of name, tagline, or bio must be provided");
      }
      return true;
    }),
  ],
  usernameParamValidator: [
    param("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("username is invalid"),
  ],
};
