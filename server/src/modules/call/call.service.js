const { randomUUID } = require("crypto");
const Chat = require("../chat/chat.model");
const User = require("../user/user.model");
const CallLog = require("./call.model");
const ApiError = require("../../utils/apiError");
const { assertUsersCanInteract } = require("../user/user.service");

const CALL_TIMEOUT_MS = 30_000;

const activeCalls = new Map();
const userCallIndex = new Map();

let timeoutListener = null;

const toId = (value) =>
  typeof value === "string" ? value : value?._id?.toString?.() || value?.toString?.() || "";

const mapCallUser = (user) => ({
  _id: user._id.toString(),
  name: user.name,
  avatar: user.avatar || null,
  username: user.username || "",
});

const buildPublicCall = (call) => ({
  callId: call.callId,
  chatId: call.chatId,
  callType: call.callType,
  callerId: call.callerId,
  receiverId: call.receiverId,
  status: call.status,
  createdAt: call.createdAt,
  acceptedAt: call.acceptedAt,
  caller: call.caller,
  receiver: call.receiver,
});

const buildCallHistoryEntry = (entry, currentUserId) => {
  const normalizedCurrentUserId = currentUserId.toString();
  const callerId = toId(entry.callerId);
  const receiverId = toId(entry.receiverId);
  const otherUser = callerId === normalizedCurrentUserId ? entry.receiverId : entry.callerId;

  return {
    _id: entry._id.toString(),
    callId: entry.callId,
    chatId: toId(entry.chatId),
    callType: entry.callType,
    status: entry.status,
    endedReason: entry.endedReason,
    startedAt: entry.startedAt,
    answeredAt: entry.answeredAt,
    endedAt: entry.endedAt,
    durationSeconds: entry.durationSeconds || 0,
    direction: callerId === normalizedCurrentUserId ? "outgoing" : "incoming",
    otherUser: otherUser
      ? {
          _id: toId(otherUser),
          name: otherUser.name,
          avatar: otherUser.avatar || null,
          username: otherUser.username || "",
        }
      : null,
  };
};

const clearTimeoutHandle = (call) => {
  if (call?.timeoutHandle) {
    clearTimeout(call.timeoutHandle);
  }
};

const removeCallIndexes = (call) => {
  if (!call) {
    return;
  }

  activeCalls.delete(call.callId);
  userCallIndex.delete(call.callerId);
  userCallIndex.delete(call.receiverId);
  clearTimeoutHandle(call);
};

const persistCallLog = async (call, reason) => {
  if (!call) {
    return null;
  }

  const endedAt = new Date();
  const startedAt = new Date(call.createdAt);
  const answeredAt = call.acceptedAt ? new Date(call.acceptedAt) : null;
  const durationSeconds = answeredAt
    ? Math.max(0, Math.round((endedAt.getTime() - answeredAt.getTime()) / 1000))
    : 0;

  let status = "cancelled";

  if (reason === "rejected" || reason === "busy") {
    status = "rejected";
  } else if (reason === "timeout") {
    status = "missed";
  } else if (reason === "disconnected" || reason === "failed") {
    status = "failed";
  } else if (call.acceptedAt) {
    status = "completed";
  }

  await CallLog.create({
    chatId: call.chatId,
    callId: call.callId,
    callType: call.callType,
    callerId: call.callerId,
    receiverId: call.receiverId,
    status,
    endedReason: reason,
    startedAt,
    answeredAt,
    endedAt,
    durationSeconds,
  });
};

const getCallRecord = (callId) => activeCalls.get(callId) || null;

const getUserCall = (userId) => {
  const callId = userCallIndex.get(userId.toString());
  return callId ? getCallRecord(callId) : null;
};

const ensureUserAvailable = (userId) => {
  if (getUserCall(userId)) {
    throw new ApiError(409, "User is already in another call");
  }
};

const getChatForCall = async ({ chatId, callerId, receiverId }) => {
  const chat = await Chat.findOne({
    _id: chatId,
    isGroup: false,
    participants: { $all: [callerId, receiverId] },
  }).lean();

  if (!chat) {
    throw new ApiError(404, "Direct chat not found for these users");
  }

  const participantIds = (chat.participants || []).map((participantId) => toId(participantId));

  if (!participantIds.includes(callerId) || !participantIds.includes(receiverId)) {
    throw new ApiError(403, "Call participants are not authorized for this chat");
  }

  return chat;
};

const setCallTimeoutListener = (listener) => {
  timeoutListener = listener;
};

const schedulePendingCallTimeout = (call) => {
  call.timeoutHandle = setTimeout(() => {
    const currentCall = activeCalls.get(call.callId);

    if (!currentCall || currentCall.status !== "pending") {
      return;
    }

    removeCallIndexes(currentCall);
    void persistCallLog(currentCall, "timeout");

    if (typeof timeoutListener === "function") {
      timeoutListener({
        ...buildPublicCall(currentCall),
        reason: "timeout",
      });
    }
  }, CALL_TIMEOUT_MS);
};

const createPendingCall = async ({ callerId, receiverId, chatId, callType }) => {
  const normalizedCallerId = callerId.toString();
  const normalizedReceiverId = receiverId.toString();

  if (!chatId) {
    throw new ApiError(400, "chatId is required");
  }

  if (!["audio", "video"].includes(callType)) {
    throw new ApiError(400, "callType must be audio or video");
  }

  if (normalizedCallerId === normalizedReceiverId) {
    throw new ApiError(400, "You cannot call yourself");
  }

  await getChatForCall({
    chatId,
    callerId: normalizedCallerId,
    receiverId: normalizedReceiverId,
  });

  await assertUsersCanInteract({
    currentUserId: normalizedCallerId,
    targetUserId: normalizedReceiverId,
  });

  ensureUserAvailable(normalizedCallerId);
  ensureUserAvailable(normalizedReceiverId);

  const [caller, receiver] = await Promise.all([
    User.findById(normalizedCallerId).select("name avatar username").lean(),
    User.findById(normalizedReceiverId).select("name avatar username").lean(),
  ]);

  if (!caller || !receiver) {
    throw new ApiError(404, "Call participants not found");
  }

  const call = {
    callId: randomUUID(),
    chatId,
    callType,
    callerId: normalizedCallerId,
    receiverId: normalizedReceiverId,
    status: "pending",
    createdAt: new Date().toISOString(),
    acceptedAt: null,
    caller: mapCallUser(caller),
    receiver: mapCallUser(receiver),
    timeoutHandle: null,
  };

  activeCalls.set(call.callId, call);
  userCallIndex.set(normalizedCallerId, call.callId);
  userCallIndex.set(normalizedReceiverId, call.callId);
  schedulePendingCallTimeout(call);

  return buildPublicCall(call);
};

const assertCallParticipant = ({ callId, userId }) => {
  const call = getCallRecord(callId);

  if (!call) {
    throw new ApiError(404, "Call not found");
  }

  const normalizedUserId = userId.toString();

  if (![call.callerId, call.receiverId].includes(normalizedUserId)) {
    throw new ApiError(403, "You are not part of this call");
  }

  return call;
};

const getPeerUserId = ({ callId, userId }) => {
  const call = assertCallParticipant({ callId, userId });
  const normalizedUserId = userId.toString();

  return {
    call,
    peerUserId: call.callerId === normalizedUserId ? call.receiverId : call.callerId,
  };
};

const acceptCall = ({ callId, userId }) => {
  const call = assertCallParticipant({ callId, userId });
  const normalizedUserId = userId.toString();

  if (call.receiverId !== normalizedUserId) {
    throw new ApiError(403, "Only the receiver can accept this call");
  }

  if (call.status !== "pending") {
    throw new ApiError(409, "Call can no longer be accepted");
  }

  call.status = "active";
  call.acceptedAt = new Date().toISOString();
  clearTimeoutHandle(call);
  call.timeoutHandle = null;

  return buildPublicCall(call);
};

const rejectCall = async ({ callId, userId, reason = "rejected" }) => {
  const call = assertCallParticipant({ callId, userId });
  removeCallIndexes(call);
  await persistCallLog(call, reason);

  return {
    ...buildPublicCall(call),
    reason,
  };
};

const endCall = async ({ callId, userId, reason = "ended" }) => {
  const call = assertCallParticipant({ callId, userId });
  removeCallIndexes(call);
  await persistCallLog(call, reason);

  return {
    ...buildPublicCall(call),
    reason,
    endedByUserId: userId.toString(),
  };
};

const endCallForDisconnectedUser = async (userId) => {
  const call = getUserCall(userId);

  if (!call) {
    return null;
  }

  removeCallIndexes(call);
  await persistCallLog(call, "disconnected");

  return {
    ...buildPublicCall(call),
    reason: "disconnected",
    endedByUserId: userId.toString(),
  };
};

const getActiveCallForUser = (userId) => {
  const call = getUserCall(userId);
  return call ? buildPublicCall(call) : null;
};

const getIceServerConfiguration = () => ({
  iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
  callTimeoutMs: CALL_TIMEOUT_MS,
});

const getCallHistory = async ({ userId, limit = 20 }) => {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);

  const history = await CallLog.find({
    $or: [{ callerId: userId }, { receiverId: userId }],
  })
    .populate("callerId", "name avatar username")
    .populate("receiverId", "name avatar username")
    .sort({ createdAt: -1 })
    .limit(normalizedLimit)
    .lean();

  return history.map((entry) => buildCallHistoryEntry(entry, userId));
};

module.exports = {
  acceptCall,
  CALL_TIMEOUT_MS,
  createPendingCall,
  endCall,
  endCallForDisconnectedUser,
  getActiveCallForUser,
  getCallHistory,
  getIceServerConfiguration,
  getPeerUserId,
  rejectCall,
  setCallTimeoutListener,
};
