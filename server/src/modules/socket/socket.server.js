const { Server } = require("socket.io");
const env = require("../../config/env");
const { SOCKET_EVENTS } = require("./socket.constants");
const { attachCallTimeoutBridge } = require("./call.handler");
const { registerSocketHandlers } = require("./socket.handlers");
const { authenticateSocket } = require("./socket.service");
const { setSocketIO } = require("./socket.notifications");

const initializeSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  setSocketIO(io);
  attachCallTimeoutBridge(io);

  io.use(authenticateSocket);
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    registerSocketHandlers(io, socket);
  });

  return io;
};

module.exports = {
  initializeSocketServer,
};
