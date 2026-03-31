const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const env = require("../../config/env");
const ApiError = require("../../utils/apiError");
const { findOrCreateUser } = require("../user/user.service");

const googleClient = new OAuth2Client();

const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};

const verifyGoogleIdToken = async (idToken) => {
  let ticket;

  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: env.googleClientIds,
    });
  } catch (error) {
    throw new ApiError(401, "Failed to verify Google identity");
  }

  const payload = ticket.getPayload();

  if (!payload || !payload.email || !payload.name) {
    throw new ApiError(401, "Invalid Google account payload");
  }

  if (!payload.email_verified) {
    throw new ApiError(401, "Google email is not verified");
  }

  return {
    email: payload.email,
    name: payload.name,
    avatar: payload.picture || null,
  };
};

const loginWithGoogleProfile = async (idToken) => {
  const profile = await verifyGoogleIdToken(idToken);
  const user = await findOrCreateUser(profile);
  const accessToken = createAccessToken(user);

  return {
    user,
    accessToken,
  };
};

module.exports = {
  loginWithGoogleProfile,
  verifyGoogleIdToken,
};
