import { io, Socket } from "socket.io-client";

let socketInstance: Socket | null = null;

export const socketEvents = {
  sendMessage: "SEND_MESSAGE",
  joinChat: "JOIN_CHAT",
  typing: "TYPING",
  stopTyping: "STOP_TYPING",
  deleteMessage: "DELETE_MESSAGE",
  newMessage: "NEW_MESSAGE",
  messageDelivered: "MESSAGE_DELIVERED",
  messageSeen: "MESSAGE_SEEN",
  messageDeleted: "MESSAGE_DELETED",
  messageEdited: "MESSAGE_EDITED",
  chatUpdated: "CHAT_UPDATED",
  chatRemoved: "CHAT_REMOVED",
  chatCreated: "CHAT_CREATED",
  userOnline: "USER_ONLINE",
  userOffline: "USER_OFFLINE",
  presenceSync: "PRESENCE_SYNC",
  friendRequestReceived: "FRIEND_REQUEST_RECEIVED",
  friendRequestAccepted: "FRIEND_REQUEST_ACCEPTED",
  friendRequestRejected: "FRIEND_REQUEST_REJECTED",
  reactionAdded: "REACTION_ADDED",
  reactionRemoved: "REACTION_REMOVED",
  memberAddedToGroup: "MEMBER_ADDED_TO_GROUP",
  socketError: "SOCKET_ERROR",
} as const;

export type SocketErrorPayload = {
  code: string;
  message: string;
  timestamp: string;
};

export const getSocketClient = (token: string) => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  if (!socketInstance) {
    socketInstance = io(apiUrl, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
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
