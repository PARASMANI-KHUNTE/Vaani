const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const env = require("../../config/env");
const { SOCKET_EVENTS } = require("./socket.constants");
const { registerSocketHandlers } = require("./socket.handlers");
const { authenticateSocket } = require("./socket.service");
const { setSocketIO } = require("./socket.notifications");
const { getRedisClient, isRedisConnected } = require("../../config/redis.client");

const allowedOrigins = [...env.clientUrls, ...env.mobileOrigins].filter(Boolean);

const initializeSocketServer = async (httpServer) => {
  let adapter = null;
  
  if (env.redis.enabled && isRedisConnected()) {
    try {
      const pubClient = getRedisClient();
      const subClient = pubClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      adapter = createAdapter(pubClient, subClient);
      console.log("Socket.IO Redis adapter initialized");
    } catch (error) {
      console.error("Failed to initialize Socket.IO Redis adapter:", error);
    }
  } else {
    console.log("Socket.IO running without Redis adapter (single-node mode)");
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
  });

  if (adapter) {
    io.adapter(adapter);
  }

  io.on("error", (error) => {
    console.error("SocketIO Server Error:", error);
  });

  setSocketIO(io);

  io.use(authenticateSocket);
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    registerSocketHandlers(io, socket);
  });

  return io;
};

module.exports = {
  initializeSocketServer,
};
