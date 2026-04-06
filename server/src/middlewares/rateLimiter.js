const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const requestIpKey = (req) => ipKeyGenerator(req.ip);

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => requestIpKey(req),
});

const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many requests, please slow down",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const groupMutationRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 40,
  message: {
    success: false,
    message: "Too many group or chat write operations. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many uploads. Please wait before uploading again.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id?.toString();
    return userId || requestIpKey(req);
  },
});

const messageRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: "Too many messages sent. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id?.toString();
    return userId || requestIpKey(req);
  },
});

module.exports = {
  authRateLimiter,
  apiRateLimiter,
  groupMutationRateLimiter,
  uploadRateLimiter,
  messageRateLimiter,
};
