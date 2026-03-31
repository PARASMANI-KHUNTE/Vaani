const asyncHandler = require("../../utils/asyncHandler");
const { sendSuccess } = require("../../utils/apiResponse");
const ApiError = require("../../utils/apiError");
const { loginWithGoogleProfile } = require("./auth.service");
const { issueMobileAuthCode, redeemMobileAuthCode } = require("./mobileAuthCodeStore");

const login = asyncHandler(async (req, res) => {
  const session = await loginWithGoogleProfile(req.body.idToken);

  return sendSuccess(res, 200, "Login successful", session);
});

const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, "Authenticated user fetched", {
    user: req.user,
  });
});

const issueMobileCode = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token is required");
  }

  const accessToken = authHeader.split(" ")[1];
  const payload = issueMobileAuthCode(accessToken);

  return sendSuccess(res, 200, "Mobile auth code created", payload);
});

const redeemMobileCode = asyncHandler(async (req, res) => {
  const accessToken = redeemMobileAuthCode(req.body.code);

  if (!accessToken) {
    throw new ApiError(400, "Invalid or expired mobile auth code");
  }

  return sendSuccess(res, 200, "Mobile auth code redeemed", {
    accessToken,
  });
});

module.exports = {
  login,
  me,
  issueMobileCode,
  redeemMobileCode,
};
