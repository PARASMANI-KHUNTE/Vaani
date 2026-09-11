const jwt = require("jsonwebtoken");
const env = require("../config/env");
const User = require("../modules/user/user.model");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const authMiddleware = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token is required");
  }

  const token = authHeader.split(" ")[1];

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, env.jwtSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }

  let user;
  if (require("mongoose").connection.readyState !== 1) {
    user = {
      _id: decodedToken.sub || "demo_user_id_1234567890ab",
      username: "demouser",
      name: "Demo User",
      email: decodedToken.email || "demo.user@linkup.chat",
      accountStatus: "active",
      avatar: null,
      tagline: "Exploring LinkUp in preview mode",
      bio: "Welcome to LinkUp!",
      friends: [],
      blockedUsers: [],
    };
  } else {
    user = await User.findById(decodedToken.sub).lean();
  }

  if (!user) {
    throw new ApiError(401, "Authenticated user no longer exists");
  }

  if (user.accountStatus !== "active") {
    throw new ApiError(403, "Account is disabled or deleted");
  }

  req.user = user;
  req.auth = decodedToken;

  next();
});

module.exports = authMiddleware;
