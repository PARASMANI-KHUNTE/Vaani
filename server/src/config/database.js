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
  return state === 1;
};

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getConnection,
  startSession,
  isTransactionSupported,
};
