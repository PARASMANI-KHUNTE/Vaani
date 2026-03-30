const dotenv = require("dotenv");

dotenv.config();

const requiredVariables = ["MONGODB_URI", "JWT_SECRET", "GOOGLE_CLIENT_ID"];

requiredVariables.forEach((variableName) => {
  if (!process.env[variableName]) {
    throw new Error(`Missing required environment variable: ${variableName}`);
  }
});

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "canvas-chat",
  },
  retention: {
    messageDays: Number(process.env.MESSAGE_RETENTION_DAYS || 90),
    chatDays: Number(process.env.CHAT_RETENTION_DAYS || 120),
    cleanupIntervalHours: Number(process.env.RETENTION_CLEANUP_INTERVAL_HOURS || 6),
  },
};

module.exports = env;
