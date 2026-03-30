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
  chatUpdated: "CHAT_UPDATED",
  userOnline: "USER_ONLINE",
  userOffline: "USER_OFFLINE",
  presenceSync: "PRESENCE_SYNC",
  friendRequestReceived: "FRIEND_REQUEST_RECEIVED",
  friendRequestAccepted: "FRIEND_REQUEST_ACCEPTED",
  friendRequestRejected: "FRIEND_REQUEST_REJECTED",
} as const;

export const getSocketClient = (token: string) => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("Socket base URL is not configured");
  }

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
