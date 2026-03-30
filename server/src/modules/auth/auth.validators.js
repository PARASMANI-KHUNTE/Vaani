const { body } = require("express-validator");

const loginValidator = [
  body("idToken")
    .trim()
    .notEmpty()
    .withMessage("Google idToken is required"),
];

module.exports = {
  loginValidator,
};
