const mongoose = require("mongoose");
const env = require("./env");
const logger = require("../utils/logger");

const connectDatabase = async () => {
  try {
    mongoose.set("bufferCommands", false); // CRITICAL: fail fast, don't hang
    const options = {
      autoIndex: env.nodeEnv !== "production",
      serverSelectionTimeoutMS: 2500,
    };

    await mongoose.connect(env.mongodbUri, options);
    logger.info("MongoDB connected successfully");
    return mongoose.connection;
  } catch (error) {
    logger.warn("[AI Studio] MongoDB not connected — running with offline fallback", {
      error: error.message,
    });
    return mongoose.connection;
  }
};

const getConnection = () => mongoose.connection;

const startSession = () => mongoose.startSession();

const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

const isTransactionSupported = () => {
  const state = mongoose.connection.readyState;
  if (state !== 1) return false;

  const topologyType = mongoose.connection.getClient()?.topology?.description?.type;
  // Transactions are only allowed on Replica Sets or Sharded (mongos) clusters.
  // A standalone instance will have the type 'Single'.
  return topologyType && topologyType !== "Single" && topologyType !== "Unknown";
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getConnection,
  startSession,
  isTransactionSupported,
};
