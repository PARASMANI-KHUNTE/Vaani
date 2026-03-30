const http = require("http");
const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { initializeSocketServer } = require("./modules/socket/socket.server");
const { initializeRetentionCleanup } = require("./utils/retentionCleanup");

const startServer = async () => {
  await connectDatabase();
  console.log("MongoDB connected");

  const server = http.createServer(app);
  initializeSocketServer(server);
  initializeRetentionCleanup();

  server.listen(env.port, () => {
    console.log(`Server listening on port http://localhost:${env.port}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
