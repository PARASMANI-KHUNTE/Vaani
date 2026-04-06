const mongoose = require("mongoose");
const env = require("./env");

const connectDatabase = async () => {
  const options = {
    autoIndex: env.nodeEnv !== "production",
  };

  await mongoose.connect(env.mongodbUri, options);

  return mongoose.connection;
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
