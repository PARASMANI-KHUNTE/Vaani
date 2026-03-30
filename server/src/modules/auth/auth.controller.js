const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const { loginWithGoogleProfile } = require("./auth.service");

const login = asyncHandler(async (req, res) => {
  const session = await loginWithGoogleProfile(req.body.idToken);

  return sendSuccess(res, 200, "Login successful", session);
});

const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, "Authenticated user fetched", {
    user: req.user,
  });
});

module.exports = {
  login,
  me,
};
