const { body, param, query } = require("express-validator");

const searchUsersValidator = [
  query("q")
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage("Search query must be between 1 and 80 characters"),
];

module.exports = {
  relationshipUserIdValidator: [
    param("userId").isMongoId().withMessage("userId must be a valid id"),
  ],
  searchUsersValidator,
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
      .matches(/^[a-zA-Z0-9]{4}$/)
      .withMessage("Tagline must be exactly 4 letters, numbers, or a mix of both"),
    body("bio")
      .optional()
      .trim()
      .isLength({ max: 280 })
      .withMessage("Bio must be 280 characters or fewer"),
  ],
  usernameParamValidator: [
    param("username")
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage("username is invalid"),
  ],
};
