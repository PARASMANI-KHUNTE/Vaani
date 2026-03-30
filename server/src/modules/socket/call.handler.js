const {
  acceptCall,
  createPendingCall,
  endCall,
  endCallForDisconnectedUser,
  getPeerUserId,
  rejectCall,
  setCallTimeoutListener,
} = require("../call/call.service");
const { SOCKET_EVENTS } = require("./socket.constants");
const { getUserRoom } = require("./socket.service");

const emitToUser = (io, userId, event, payload) => {
  io.to(getUserRoom(userId)).emit(event, payload);
};

const attachCallTimeoutBridge = (io) => {
  setCallTimeoutListener((payload) => {
    emitToUser(io, payload.callerId, SOCKET_EVENTS.CALL_REJECTED, payload);
    emitToUser(io, payload.receiverId, SOCKET_EVENTS.CALL_ENDED, payload);
  });
};

const registerCallHandlers = (io, socket) => {
  const currentUserId = socket.user._id.toString();

  socket.on(SOCKET_EVENTS.CALL_USER, async (payload, acknowledgement) => {
    try {
      const call = await createPendingCall({
        callerId: currentUserId,
        receiverId: payload?.receiverId,
        chatId: payload?.chatId,
        callType: payload?.callType,
      });

      emitToUser(io, call.receiverId, SOCKET_EVENTS.INCOMING_CALL, call);

      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: true,
          call,
        });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to initiate call",
        });
      }
    }
  });

  socket.on(SOCKET_EVENTS.ACCEPT_CALL, async (payload, acknowledgement) => {
    try {
      const call = acceptCall({
        callId: payload?.callId,
        userId: currentUserId,
      });

      emitToUser(io, call.callerId, SOCKET_EVENTS.CALL_ACCEPTED, call);

      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: true,
          call,
        });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to accept call",
        });
      }
    }
  });

  socket.on(SOCKET_EVENTS.REJECT_CALL, async (payload, acknowledgement) => {
    try {
      const call = await rejectCall({
        callId: payload?.callId,
        userId: currentUserId,
        reason: payload?.reason || "rejected",
      });

      emitToUser(io, call.callerId, SOCKET_EVENTS.CALL_REJECTED, call);

      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: true,
          call,
        });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to reject call",
        });
      }
    }
  });

  socket.on(SOCKET_EVENTS.OFFER, (payload, acknowledgement) => {
    try {
      const { call, peerUserId } = getPeerUserId({
        callId: payload?.callId,
        userId: currentUserId,
      });

      emitToUser(io, peerUserId, SOCKET_EVENTS.OFFER, {
        callId: call.callId,
        chatId: call.chatId,
        fromUserId: currentUserId,
        offer: payload?.offer,
      });

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to forward offer",
        });
      }
    }
  });

  socket.on(SOCKET_EVENTS.ANSWER, (payload, acknowledgement) => {
    try {
      const { call, peerUserId } = getPeerUserId({
        callId: payload?.callId,
        userId: currentUserId,
      });

      emitToUser(io, peerUserId, SOCKET_EVENTS.ANSWER, {
        callId: call.callId,
        chatId: call.chatId,
        fromUserId: currentUserId,
        answer: payload?.answer,
      });

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to forward answer",
        });
      }
    }
  });

  socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (payload, acknowledgement) => {
    try {
      const { call, peerUserId } = getPeerUserId({
        callId: payload?.callId,
        userId: currentUserId,
      });

      emitToUser(io, peerUserId, SOCKET_EVENTS.ICE_CANDIDATE, {
        callId: call.callId,
        chatId: call.chatId,
        fromUserId: currentUserId,
        candidate: payload?.candidate,
      });

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to forward ICE candidate",
        });
      }
    }
  });

  socket.on(SOCKET_EVENTS.END_CALL, async (payload, acknowledgement) => {
    try {
      const call = await endCall({
        callId: payload?.callId,
        userId: currentUserId,
        reason: payload?.reason || "ended",
      });

      const peerUserId = call.callerId === currentUserId ? call.receiverId : call.callerId;
      emitToUser(io, peerUserId, SOCKET_EVENTS.CALL_ENDED, call);

      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: true,
          call,
        });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({
          ok: false,
          error: error.message || "Failed to end call",
        });
      }
    }
  });
};

const handleCallDisconnect = async (io, userId) => {
  const payload = await endCallForDisconnectedUser(userId);

  if (!payload) {
    return;
  }

  const peerUserId = payload.callerId === userId ? payload.receiverId : payload.callerId;
  emitToUser(io, peerUserId, SOCKET_EVENTS.CALL_ENDED, payload);
};

module.exports = {
  attachCallTimeoutBridge,
  handleCallDisconnect,
  registerCallHandlers,
};
