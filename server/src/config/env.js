const dotenv = require("dotenv");

dotenv.config();

const requiredVariables = ["MONGODB_URI", "JWT_SECRET", "GOOGLE_CLIENT_ID"];

requiredVariables.forEach((variableName) => {
  if (!process.env[variableName]) {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }
});

const parseOriginList = (value) =>
  value
    ? value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : [];

const googleClientIds = process.env.GOOGLE_CLIENT_IDS
  ? process.env.GOOGLE_CLIENT_IDS.split(",")
      .map((clientId) => clientId.trim())
      .filter(Boolean)
  : [process.env.GOOGLE_CLIENT_ID].filter(Boolean);

const defaultDevOrigins = ["http://localhost:3000", "http://localhost:5173"];
const configuredClientOrigins = parseOriginList(process.env.CLIENT_URLS);
const fallbackClientOrigin = process.env.CLIENT_URL || defaultDevOrigins[1];
const allowedClientOrigins = Array.from(
  new Set(
    [
      ...configuredClientOrigins,
      fallbackClientOrigin,
      ...(process.env.NODE_ENV === "production" ? [] : defaultDevOrigins),
    ].filter(Boolean)
  )
);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: fallbackClientOrigin,
  clientUrls: allowedClientOrigins,
  mobileOrigins: parseOriginList(process.env.MOBILE_ORIGINS),
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientIds,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "canvas-chat",
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
    upstashUrl: process.env.UPSTASH_REDIS_REST_URL || null,
    upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN || null,
    enabled: process.env.REDIS_ENABLED === "true",
    cacheTtlSeconds: Number(process.env.REDIS_CACHE_TTL_SECONDS || 300),
    useLocal: process.env.NODE_ENV !== "production" && !process.env.UPSTASH_REDIS_REST_URL,
  },
  retention: {
    messageDays: Number(process.env.MESSAGE_RETENTION_DAYS || 90),
    chatDays: Number(process.env.CHAT_RETENTION_DAYS || 120),
    cleanupIntervalHours: Number(process.env.RETENTION_CLEANUP_INTERVAL_HOURS || 6),
  },
};

module.exports = env;
