import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export const socketEvents = {
  sendMessage: "SEND_MESSAGE",
  joinChat: "JOIN_CHAT",
  typing: "TYPING",
  stopTyping: "STOP_TYPING",
  deleteMessage: "DELETE_MESSAGE",
  callUser: "CALL_USER",
  acceptCall: "ACCEPT_CALL",
  rejectCall: "REJECT_CALL",
  offer: "OFFER",
  answer: "ANSWER",
  iceCandidate: "ICE_CANDIDATE",
  endCall: "END_CALL",
  groupCallStart: "GROUP_CALL_START",
  groupCallJoin: "GROUP_CALL_JOIN",
  groupCallLeave: "GROUP_CALL_LEAVE",
  groupCallEnd: "GROUP_CALL_END",
  groupCallSignal: "GROUP_CALL_SIGNAL",
  groupCallStateUpdate: "GROUP_CALL_STATE_UPDATE",
  newMessage: "NEW_MESSAGE",
  messageDelivered: "MESSAGE_DELIVERED",
  messageSeen: "MESSAGE_SEEN",
  messageDeleted: "MESSAGE_DELETED",
  chatUpdated: "CHAT_UPDATED",
  chatRemoved: "CHAT_REMOVED",
  chatCreated: "CHAT_CREATED",
  incomingCall: "INCOMING_CALL",
  callAccepted: "CALL_ACCEPTED",
  callRejected: "CALL_REJECTED",
  callEnded: "CALL_ENDED",
  groupCallStarted: "GROUP_CALL_STARTED",
  groupCallParticipantsUpdated: "GROUP_CALL_PARTICIPANTS_UPDATED",
  groupCallSignalled: "GROUP_CALL_SIGNALLED",
  groupCallEnded: "GROUP_CALL_ENDED",
  userOnline: "USER_ONLINE",
  userOffline: "USER_OFFLINE",
  presenceSync: "PRESENCE_SYNC",
  friendRequestReceived: "FRIEND_REQUEST_RECEIVED",
  friendRequestAccepted: "FRIEND_REQUEST_ACCEPTED",
  friendRequestRejected: "FRIEND_REQUEST_REJECTED",
  reactionAdded: "REACTION_ADDED",
  reactionRemoved: "REACTION_REMOVED",
  memberAddedToGroup: "MEMBER_ADDED_TO_GROUP",
} as const;

export const getSocketClient = (token: string) => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  if (!socketInstance) {
    socketInstance = io(apiUrl, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }

  socketInstance.auth = { token };

  if (!socketInstance.connected) {
    socketInstance.connect();
  }

  return socketInstance;
};

export const disconnectSocketClient = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};
