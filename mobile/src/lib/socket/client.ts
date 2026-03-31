import { io, Socket } from "socket.io-client";
import { mobileConfig } from "@/lib/config";

let socketInstance: Socket | null = null;

export const getMobileSocket = (token: string) => {
  if (!socketInstance) {
    socketInstance = io(mobileConfig.apiUrl, {
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

export const disconnectMobileSocket = () => {
  socketInstance?.disconnect();
  socketInstance = null;
};
