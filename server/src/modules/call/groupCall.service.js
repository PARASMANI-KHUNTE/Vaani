const { randomUUID } = require("crypto");
const Chat = require("../chat/chat.model");
const User = require("../user/user.model");
const ApiError = require("../../utils/apiError");
const GroupCallSession = require("./groupCall.model");

const activeGroupCalls = new Map();
const activeCallByChatId = new Map();
const userToGroupCalls = new Map();

const toId = (value) =>
  typeof value === "string" ? value : value?._id?.toString?.() || value?.toString?.() || "";

const mapUser = (user) => ({
  _id: toId(user._id || user),
  name: user.name || "Unknown user",
  avatar: user.avatar || null,
  username: user.username || "",
});

const getGroupCallRoom = (callId) => `group-call:${callId}`;

const addUserCallIndex = (userId, callId) => {
  const normalizedUserId = toId(userId);
  const bucket = userToGroupCalls.get(normalizedUserId) || new Set();
  bucket.add(callId);
  userToGroupCalls.set(normalizedUserId, bucket);
};

const removeUserCallIndex = (userId, callId) => {
  const normalizedUserId = toId(userId);
  const bucket = userToGroupCalls.get(normalizedUserId);
  if (!bucket) {
    return;
  }

  bucket.delete(callId);
  if (bucket.size === 0) {
    userToGroupCalls.delete(normalizedUserId);
    return;
  }
  userToGroupCalls.set(normalizedUserId, bucket);
};

const assertGroupMembership = async ({ chatId, userId }) => {
  const chat = await Chat.findOne({
    _id: chatId,
    isGroup: true,
    participants: userId,
  })
    .populate("participants", "name avatar username")
    .lean();

  if (!chat) {
    throw new ApiError(404, "Group chat not found or access denied");
  }

  return chat;
};

const mapParticipantState = (entry) => ({
  userId: entry.userId,
  name: entry.name,
  avatar: entry.avatar,
  username: entry.username,
  joinedAt: entry.joinedAt,
  leftAt: entry.leftAt,
  isMuted: entry.isMuted,
  isVideoOn: entry.isVideoOn,
  isSpeaking: entry.isSpeaking,
  connectionState: entry.connectionState,
});

const buildPublicSession = (session) => ({
  callId: session.callId,
  chatId: session.chatId,
  callType: session.callType,
  startedBy: session.startedBy,
  startedAt: session.startedAt,
  endedAt: session.endedAt || null,
  status: session.status,
  participants: Array.from(session.participants.values()).map(mapParticipantState),
  activeSpeakerUserId: session.activeSpeakerUserId || null,
});

const getActiveGroupCallById = (callId) => activeGroupCalls.get(callId) || null;

const getActiveGroupCallByChatId = (chatId) => {
  const callId = activeCallByChatId.get(toId(chatId));
  return callId ? activeGroupCalls.get(callId) || null : null;
};

const createGroupCall = async ({ chatId, initiatorId, callType }) => {
  if (!["audio", "video"].includes(callType)) {
    throw new ApiError(400, "callType must be audio or video");
  }

  const chat = await assertGroupMembership({
    chatId,
    userId: initiatorId,
  });

  const existingSession = getActiveGroupCallByChatId(chatId);
  if (existingSession) {
    return {
      session: buildPublicSession(existingSession),
      participantIds: existingSession.memberIds,
      reused: true,
    };
  }

  const normalizedChatId = toId(chat._id);
  const normalizedInitiatorId = toId(initiatorId);
  const startedAt = new Date().toISOString();
  const participantsMap = new Map();
  const memberIds = (chat.participants || []).map((entry) => toId(entry)).filter(Boolean);

  for (const participant of chat.participants || []) {
    const normalizedUserId = toId(participant);
    const isInitiator = normalizedUserId === normalizedInitiatorId;
    participantsMap.set(normalizedUserId, {
      userId: normalizedUserId,
      name: participant.name,
      avatar: participant.avatar || null,
      username: participant.username || "",
      joinedAt: isInitiator ? startedAt : null,
      leftAt: null,
      isMuted: false,
      isVideoOn: callType === "video",
      isSpeaking: false,
      connectionState: isInitiator ? "connected" : "invited",
      speakerEvents: 0,
    });
  }

  const session = {
    callId: randomUUID(),
    chatId: normalizedChatId,
    callType,
    startedBy: normalizedInitiatorId,
    startedAt,
    endedAt: null,
    status: "active",
    memberIds,
    participants: participantsMap,
    activeSpeakerUserId: null,
  };

  activeGroupCalls.set(session.callId, session);
  activeCallByChatId.set(normalizedChatId, session.callId);
  addUserCallIndex(normalizedInitiatorId, session.callId);

  return {
    session: buildPublicSession(session),
    participantIds: memberIds,
    reused: false,
  };
};

const joinGroupCall = async ({ callId, userId }) => {
  const session = getActiveGroupCallById(callId);

  if (!session || session.status !== "active") {
    throw new ApiError(404, "Active group call not found");
  }

  const normalizedUserId = toId(userId);
  if (!session.memberIds.includes(normalizedUserId)) {
    throw new ApiError(403, "You are not a member of this group call");
  }

  const participant = session.participants.get(normalizedUserId);
  if (!participant) {
    throw new ApiError(404, "Participant not found in this call");
  }

  participant.joinedAt = participant.joinedAt || new Date().toISOString();
  participant.leftAt = null;
  participant.connectionState = "connected";
  participant.isSpeaking = false;

  session.participants.set(normalizedUserId, participant);
  addUserCallIndex(normalizedUserId, session.callId);

  return {
    session: buildPublicSession(session),
    participantIds: session.memberIds,
  };
};

const updateGroupParticipantState = ({ callId, userId, state = {} }) => {
  const session = getActiveGroupCallById(callId);

  if (!session || session.status !== "active") {
    throw new ApiError(404, "Active group call not found");
  }

  const normalizedUserId = toId(userId);
  if (!session.memberIds.includes(normalizedUserId)) {
    throw new ApiError(403, "You are not a member of this group call");
  }

  const participant = session.participants.get(normalizedUserId);
  if (!participant) {
    throw new ApiError(404, "Participant not found in this call");
  }

  if (typeof state.isMuted === "boolean") {
    participant.isMuted = state.isMuted;
  }
  if (typeof state.isVideoOn === "boolean") {
    participant.isVideoOn = state.isVideoOn;
  }
  if (typeof state.connectionState === "string" && state.connectionState.trim()) {
    participant.connectionState = state.connectionState.trim();
  }
  if (typeof state.isSpeaking === "boolean") {
    participant.isSpeaking = state.isSpeaking;
    if (state.isSpeaking) {
      participant.speakerEvents += 1;
      session.activeSpeakerUserId = normalizedUserId;
      for (const [id, value] of session.participants.entries()) {
        if (id !== normalizedUserId && value.isSpeaking) {
          value.isSpeaking = false;
          session.participants.set(id, value);
        }
      }
    } else if (session.activeSpeakerUserId === normalizedUserId) {
      session.activeSpeakerUserId = null;
    }
  }

  session.participants.set(normalizedUserId, participant);

  return {
    session: buildPublicSession(session),
    participantIds: session.memberIds,
  };
};

const relayGroupSignal = ({ callId, fromUserId, targetUserId = null, signalType, payload }) => {
  const session = getActiveGroupCallById(callId);

  if (!session || session.status !== "active") {
    throw new ApiError(404, "Active group call not found");
  }

  const normalizedFromUserId = toId(fromUserId);
  if (!session.memberIds.includes(normalizedFromUserId)) {
    throw new ApiError(403, "You are not a member of this group call");
  }

  if (!signalType || typeof signalType !== "string") {
    throw new ApiError(400, "signalType is required");
  }

  if (targetUserId) {
    const normalizedTargetUserId = toId(targetUserId);
    if (!session.memberIds.includes(normalizedTargetUserId)) {
      throw new ApiError(404, "Target participant not found");
    }
    return {
      callId: session.callId,
      chatId: session.chatId,
      fromUserId: normalizedFromUserId,
      targetUserId: normalizedTargetUserId,
      signalType,
      payload: payload || null,
    };
  }

  return {
    callId: session.callId,
    chatId: session.chatId,
    fromUserId: normalizedFromUserId,
    targetUserId: null,
    signalType,
    payload: payload || null,
  };
};

const persistEndedSession = async (session, reason) => {
  const endedAt = new Date();
  const participantTimeline = Array.from(session.participants.values()).map((entry) => ({
    userId: entry.userId,
    joinedAt: entry.joinedAt ? new Date(entry.joinedAt) : new Date(session.startedAt),
    leftAt: entry.leftAt ? new Date(entry.leftAt) : endedAt,
    leftReason: reason === "empty" ? "left" : reason === "failed" ? "failed" : "ended",
    isMuted: Boolean(entry.isMuted),
    isVideoOn: Boolean(entry.isVideoOn),
    speakerEvents: Number(entry.speakerEvents || 0),
  }));

  await GroupCallSession.create({
    chatId: session.chatId,
    callId: session.callId,
    callType: session.callType,
    status: reason === "failed" ? "failed" : "ended",
    startedBy: session.startedBy,
    startedAt: new Date(session.startedAt),
    endedAt,
    endedReason: reason,
    participantTimeline,
  });
};

const endGroupCall = async ({ callId, userId, reason = "ended" }) => {
  const session = getActiveGroupCallById(callId);

  if (!session || session.status !== "active") {
    throw new ApiError(404, "Active group call not found");
  }

  const normalizedUserId = toId(userId);
  if (!session.memberIds.includes(normalizedUserId)) {
    throw new ApiError(403, "You are not a member of this group call");
  }

  const endedAt = new Date().toISOString();
  session.status = "ended";
  session.endedAt = endedAt;
  session.activeSpeakerUserId = null;

  for (const [id, participant] of session.participants.entries()) {
    participant.leftAt = participant.leftAt || endedAt;
    participant.connectionState = "left";
    participant.isSpeaking = false;
    session.participants.set(id, participant);
    removeUserCallIndex(id, session.callId);
  }

  activeCallByChatId.delete(session.chatId);
  activeGroupCalls.delete(session.callId);
  await persistEndedSession(session, reason);

  return {
    session: buildPublicSession(session),
    participantIds: session.memberIds,
    reason,
  };
};

const leaveGroupCall = async ({ callId, userId, reason = "left" }) => {
  const session = getActiveGroupCallById(callId);

  if (!session || session.status !== "active") {
    throw new ApiError(404, "Active group call not found");
  }

  const normalizedUserId = toId(userId);
  if (!session.memberIds.includes(normalizedUserId)) {
    throw new ApiError(403, "You are not a member of this group call");
  }

  const participant = session.participants.get(normalizedUserId);
  if (!participant) {
    throw new ApiError(404, "Participant not found");
  }

  const leftAt = new Date().toISOString();
  participant.leftAt = leftAt;
  participant.connectionState = reason === "disconnected" ? "disconnected" : "left";
  participant.isSpeaking = false;
  session.participants.set(normalizedUserId, participant);
  removeUserCallIndex(normalizedUserId, session.callId);

  if (session.activeSpeakerUserId === normalizedUserId) {
    session.activeSpeakerUserId = null;
  }

  const connectedCount = Array.from(session.participants.values()).filter(
    (entry) => entry.connectionState === "connected"
  ).length;

  if (connectedCount === 0) {
    const ended = await endGroupCall({
      callId: session.callId,
      userId: session.startedBy,
      reason: "empty",
    });
    return {
      ...ended,
      ended: true,
    };
  }

  return {
    session: buildPublicSession(session),
    participantIds: session.memberIds,
    ended: false,
    reason,
  };
};

const disconnectUserFromGroupCalls = async (userId) => {
  const normalizedUserId = toId(userId);
  const callIds = Array.from(userToGroupCalls.get(normalizedUserId) || []);

  const results = [];
  for (const callId of callIds) {
    try {
      const result = await leaveGroupCall({
        callId,
        userId: normalizedUserId,
        reason: "disconnected",
      });
      results.push(result);
    } catch {
      // Ignore disconnected cleanup failures.
    }
  }

  return results;
};

const getGroupCallHistory = async ({ userId, limit = 20 }) => {
  const normalizedLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const history = await GroupCallSession.find({
    "participantTimeline.userId": userId,
  })
    .sort({ createdAt: -1 })
    .limit(normalizedLimit)
    .lean();

  return history.map((entry) => ({
    callId: entry.callId,
    chatId: toId(entry.chatId),
    callType: entry.callType,
    status: entry.status,
    startedAt: entry.startedAt,
    endedAt: entry.endedAt,
    endedReason: entry.endedReason,
    participantCount: (entry.participantTimeline || []).length,
  }));
};

module.exports = {
  createGroupCall,
  disconnectUserFromGroupCalls,
  endGroupCall,
  getActiveGroupCallByChatId,
  getGroupCallHistory,
  getGroupCallRoom,
  joinGroupCall,
  leaveGroupCall,
  relayGroupSignal,
  updateGroupParticipantState,
};
