const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const env = require("../../config/env");
const { SOCKET_EVENTS } = require("./socket.constants");
const { registerSocketHandlers } = require("./socket.handlers");
const { authenticateSocket } = require("./socket.service");
const { setSocketIO } = require("./socket.notifications");
const { isRedisConnected } = require("../../config/redis.client");

const allowedOrigins = [...env.clientUrls, ...env.mobileOrigins].filter(Boolean);

const initializeSocketServer = async (httpServer) => {
  let adapter = null;
  
  const useRedis = env.redis.enabled && isRedisConnected();
  const hasUpstash = env.redis.upstashUrl && env.redis.upstashToken;
  
  if (useRedis && hasUpstash) {
    console.log("Socket.IO: Using Upstash Redis (REST API) - single-node mode");
    console.log("Note: For multi-instance scaling, use @upstash/redis with Redis protocol");
  } else if (useRedis && env.redis.url) {
    try {
      const pubClient = createClient({ url: env.redis.url });
      const subClient = pubClient.duplicate();
      
      pubClient.on("error", (err) => console.error("Redis Pub Client Error:", err));
      subClient.on("error", (err) => console.error("Redis Sub Client Error:", err));
      
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
