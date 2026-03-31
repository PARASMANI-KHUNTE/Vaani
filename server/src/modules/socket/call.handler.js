const {
  acceptCall,
  createPendingCall,
  endCall,
  endCallForDisconnectedUser,
  getPeerUserId,
  rejectCall,
  setCallTimeoutListener,
} = require("../call/call.service");
const {
  createGroupCall,
  disconnectUserFromGroupCalls,
  endGroupCall,
  getGroupCallRoom,
  joinGroupCall,
  leaveGroupCall,
  relayGroupSignal,
  updateGroupParticipantState,
} = require("../call/groupCall.service");
const { sendUserPushNotification } = require("./socket.notifications");
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
      void sendUserPushNotification(call.receiverId, {
        title: call.caller.name,
        body: call.callType === "video" ? "Incoming video call" : "Incoming audio call",
        data: {
          kind: "call",
          callId: call.callId,
          chatId: call.chatId,
          callType: call.callType,
        },
      });

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

  socket.on(SOCKET_EVENTS.GROUP_CALL_START, async (payload, acknowledgement) => {
    try {
      const result = await createGroupCall({
        chatId: payload?.chatId,
        initiatorId: currentUserId,
        callType: payload?.callType,
      });

      socket.join(getGroupCallRoom(result.session.callId));

      result.participantIds.forEach((participantId) => {
        emitToUser(io, participantId, SOCKET_EVENTS.GROUP_CALL_STARTED, {
          session: result.session,
          reused: result.reused,
        });
      });

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, session: result.session, reused: result.reused });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to start group call" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.GROUP_CALL_JOIN, async (payload, acknowledgement) => {
    try {
      const result = await joinGroupCall({
        callId: payload?.callId,
        userId: currentUserId,
      });

      socket.join(getGroupCallRoom(result.session.callId));
      io.to(getGroupCallRoom(result.session.callId)).emit(SOCKET_EVENTS.GROUP_CALL_PARTICIPANTS_UPDATED, {
        session: result.session,
      });

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, session: result.session });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to join group call" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.GROUP_CALL_LEAVE, async (payload, acknowledgement) => {
    try {
      const result = await leaveGroupCall({
        callId: payload?.callId,
        userId: currentUserId,
      });

      socket.leave(getGroupCallRoom(payload?.callId));

      if (result.ended) {
        result.participantIds.forEach((participantId) => {
          emitToUser(io, participantId, SOCKET_EVENTS.GROUP_CALL_ENDED, {
            session: result.session,
            reason: result.reason || "empty",
          });
        });
      } else {
        io.to(getGroupCallRoom(result.session.callId)).emit(SOCKET_EVENTS.GROUP_CALL_PARTICIPANTS_UPDATED, {
          session: result.session,
        });
      }

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, session: result.session, ended: result.ended });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to leave group call" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.GROUP_CALL_STATE_UPDATE, async (payload, acknowledgement) => {
    try {
      const result = updateGroupParticipantState({
        callId: payload?.callId,
        userId: currentUserId,
        state: payload?.state || {},
      });

      io.to(getGroupCallRoom(result.session.callId)).emit(SOCKET_EVENTS.GROUP_CALL_PARTICIPANTS_UPDATED, {
        session: result.session,
      });

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, session: result.session });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to update call state" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.GROUP_CALL_SIGNAL, async (payload, acknowledgement) => {
    try {
      const signal = relayGroupSignal({
        callId: payload?.callId,
        fromUserId: currentUserId,
        targetUserId: payload?.targetUserId || null,
        signalType: payload?.signalType,
        payload: payload?.payload,
      });

      if (signal.targetUserId) {
        emitToUser(io, signal.targetUserId, SOCKET_EVENTS.GROUP_CALL_SIGNALLED, signal);
      } else {
        socket.to(getGroupCallRoom(signal.callId)).emit(SOCKET_EVENTS.GROUP_CALL_SIGNALLED, signal);
      }

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to relay group signal" });
      }
    }
  });

  socket.on(SOCKET_EVENTS.GROUP_CALL_END, async (payload, acknowledgement) => {
    try {
      const result = await endGroupCall({
        callId: payload?.callId,
        userId: currentUserId,
        reason: payload?.reason || "ended",
      });

      result.participantIds.forEach((participantId) => {
        emitToUser(io, participantId, SOCKET_EVENTS.GROUP_CALL_ENDED, {
          session: result.session,
          reason: result.reason,
        });
      });

      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: true, session: result.session });
      }
    } catch (error) {
      if (typeof acknowledgement === "function") {
        acknowledgement({ ok: false, error: error.message || "Failed to end group call" });
      }
    }
  });
};

const handleCallDisconnect = async (io, userId) => {
  const payload = await endCallForDisconnectedUser(userId);
  if (payload) {
    const peerUserId = payload.callerId === userId ? payload.receiverId : payload.callerId;
    emitToUser(io, peerUserId, SOCKET_EVENTS.CALL_ENDED, payload);
  }

  const groupResults = await disconnectUserFromGroupCalls(userId);
  groupResults.forEach((result) => {
    if (result.ended) {
      result.participantIds.forEach((participantId) => {
        emitToUser(io, participantId, SOCKET_EVENTS.GROUP_CALL_ENDED, {
          session: result.session,
          reason: result.reason || "empty",
        });
      });
      return;
    }

    io.to(getGroupCallRoom(result.session.callId)).emit(SOCKET_EVENTS.GROUP_CALL_PARTICIPANTS_UPDATED, {
      session: result.session,
    });
  });
};

module.exports = {
  attachCallTimeoutBridge,
  handleCallDisconnect,
  registerCallHandlers,
};
