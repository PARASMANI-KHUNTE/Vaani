const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const env = require("../../config/env");
const logger = require("../../utils/logger");
const { SOCKET_EVENTS } = require("./socket.constants");
const { registerSocketHandlers } = require("./socket.handlers");
const { authenticateSocket } = require("./socket.service");
const { setSocketIO } = require("./socket.notifications");
const { isRedisConnected } = require("../../config/redis.client");

const allowedOrigins = [...env.clientUrls, ...env.mobileOrigins].filter(Boolean);
let pubClient = null;
let subClient = null;

const initializeSocketServer = async (httpServer) => {
  let adapter = null;
  
  const useLocalRedis = env.redis.enabled && env.redis.useLocal && isRedisConnected();
  
  if (useLocalRedis) {
    try {
      pubClient = createClient({ url: env.redis.url });
      subClient = pubClient.duplicate();
      
      pubClient.on("error", (err) => logger.error("Redis Pub Client Error", { error: err.message }));
      subClient.on("error", (err) => logger.error("Redis Sub Client Error", { error: err.message }));
      
      await Promise.all([pubClient.connect(), subClient.connect()]);
      adapter = createAdapter(pubClient, subClient);
      logger.info("Socket.IO Redis adapter initialized (multi-instance ready)");
    } catch (error) {
      logger.error("Failed to initialize Socket.IO Redis adapter", { error: error.message });
    }
  } else if (env.redis.enabled && env.redis.upstashUrl) {
    logger.info("Socket.IO: Single-node mode (Upstash REST API - no pub/sub support)");
  } else {
    logger.info("Socket.IO: Single-node mode (no Redis)");
  }

  const io = new Server(httpServer, {
    pingTimeout: 60000,
    pingInterval: 25000,
    cors: {
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowUpgrades: true,
  });

  if (adapter) {
    io.adapter(adapter);
  }

  io.on("error", (error) => {
    logger.error("SocketIO Server Error", { error: error.message });
  });

  setSocketIO(io);

  io.use(authenticateSocket);
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    registerSocketHandlers(io, socket);
  });

  return { io, adapter, cleanup: async () => {
    if (pubClient?.isOpen) await pubClient.quit();
    if (subClient?.isOpen) await subClient.quit();
  }};
};

module.exports = {
  initializeSocketServer,
};
