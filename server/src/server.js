const http = require("http");
const app = require("./app");
const env = require("./config/env");
const logger = require("./utils/logger");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { connectRedis, disconnectRedis } = require("./config/redis.client");
const { initializeSocketServer } = require("./modules/socket/socket.server");
const { initializeRetentionCleanup } = require("./utils/retentionCleanup");

let server = null;
let socketCleanup = null;

const shutdown = async (signal) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  if (server) {
    server.close(() => {
      logger.info("HTTP server closed");
    });
  }
  
  if (socketCleanup) {
    await socketCleanup();
    logger.info("Socket.IO connections closed");
  }
  
  await disconnectRedis();
  logger.info("Redis disconnected");
  
  await disconnectDatabase();
  logger.info("MongoDB disconnected");
  
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.message, stack: error.stack });
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason: String(reason) });
});

const startServer = async () => {
  await connectDatabase();
  logger.info("MongoDB connected");

  await connectRedis();

  server = http.createServer(app);
  const result = await initializeSocketServer(server);
  if (result?.cleanup) {
    socketCleanup = result.cleanup;
  }
  
  initializeRetentionCleanup();

  server.listen(env.port, () => {
    logger.info(`Server listening on port http://localhost:${env.port}`);
  });
  
  server.timeout = 30000;
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
};

startServer().catch((error) => {
  logger.error("Failed to start server", { error: error.message, stack: error.stack });
  process.exit(1);
});
