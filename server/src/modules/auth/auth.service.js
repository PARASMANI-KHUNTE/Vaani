const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const env = require("../../config/env");
const ApiError = require("../../utils/apiError");
const { findOrCreateUser } = require("../user/user.service");
const { getRedisClient, isRedisConnected } = require("../../config/redis.client");

const googleClient = new OAuth2Client();

const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60;
const REFRESH_TOKEN_PREFIX = "refresh_token:";

const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      type: "access",
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn,
    }
  );
};

const createRefreshToken = (user) => {
  const token = crypto.randomBytes(64).toString("hex");
  const payload = jwt.sign(
    {
      sub: user._id.toString(),
      type: "refresh",
      jti: token,
    },
    env.jwtSecret,
    {
      expiresIn: "30d",
    }
  );

  if (env.redis.enabled && isRedisConnected()) {
    const redis = getRedisClient();
    if (redis) {
      redis.setEx(`${REFRESH_TOKEN_PREFIX}${token}`, REFRESH_TOKEN_TTL, user._id.toString()).catch(() => {});
    }
  }

  return { token: payload, jti: token };
};

const verifyRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, env.jwtSecret);

    if (decoded.type !== "refresh") {
      throw new ApiError(401, "Invalid token type");
    }

    if (env.redis.enabled && isRedisConnected()) {
      const redis = getRedisClient();
      if (redis) {
        const storedUserId = await redis.get(`${REFRESH_TOKEN_PREFIX}${decoded.jti}`);
        if (!storedUserId || storedUserId !== decoded.sub) {
          throw new ApiError(401, "Token revoked");
        }
      }
    }

    return decoded;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, "Invalid or expired refresh token");
  }
};

const revokeRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.decode(refreshToken);
    if (decoded?.jti && env.redis.enabled && isRedisConnected()) {
      const redis = getRedisClient();
      if (redis) {
        await redis.del(`${REFRESH_TOKEN_PREFIX}${decoded.jti}`);
      }
    }
  } catch {}
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
  const refreshToken = createRefreshToken(user);

  return {
    user,
    accessToken,
    refreshToken: refreshToken.token,
  };
};

const refreshAccessToken = async (refreshToken) => {
  const decoded = await verifyRefreshToken(refreshToken);
  const User = require("../user/user.model");
  const user = await User.findById(decoded.sub).lean();

  if (!user || user.accountStatus !== "active") {
    throw new ApiError(401, "User not found or inactive");
  }

  const accessToken = createAccessToken(user);
  return { accessToken };
};

module.exports = {
  loginWithGoogleProfile,
  verifyGoogleIdToken,
  createAccessToken,
  refreshAccessToken,
  revokeRefreshToken,
};
