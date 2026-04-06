const http = require("http");
const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const { connectDatabase } = require("./config/database");
const { connectRedis } = require("./config/redis.client");
const { initializeSocketServer } = require("./modules/socket/socket.server");
const { initializeRetentionCleanup } = require("./utils/retentionCleanup");

const startServer = async () => {
  await connectDatabase();
  logger.info("MongoDB connected");

  await connectRedis();

  const server = http.createServer(app);
  await initializeSocketServer(server);
  initializeRetentionCleanup();

  server.listen(env.port, () => {
    logger.info(`Server listening on port http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  logger.error("Failed to start server", { error: error.message, stack: error.stack });
  process.exit(1);
});
