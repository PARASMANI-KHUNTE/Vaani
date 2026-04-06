const { body } = require("express-validator");

const loginValidator = [
  body("idToken")
    .trim()
    .notEmpty()
    .withMessage("Google idToken is required"),
];

const mobileCodeRedeemValidator = [
  body("code")
    .trim()
    .notEmpty()
    .withMessage("mobile auth code is required"),
];

const refreshTokenValidator = [
  body("refreshToken")
    .trim()
    .notEmpty()
    .withMessage("Refresh token is required"),
];

module.exports = {
  loginValidator,
  mobileCodeRedeemValidator,
  refreshTokenValidator,
};
