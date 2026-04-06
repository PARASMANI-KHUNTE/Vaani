import { useEffect, useRef } from "react";
import { disconnectMobileSocket, getMobileSocket } from "@/lib/socket/client";
import { mobileSocketEvents } from "@/lib/socket/events";
import { MobileChat, MobileMessage, MobileNotificationItem } from "@/lib/types";
import { useChatStore } from "@/store/chat-store";
import { useNotificationStore } from "@/store/notification-store";

type UseMobileRealtimeParams = {
  token?: string;
  currentUserId?: string;
};

const getNotificationPreview = (message: MobileMessage) => {
  if (message.type === "text") {
    return message.content || "Sent you a message";
  }

  return `Sent a ${message.type} message`;
};

export const useMobileRealtime = ({ token, currentUserId }: UseMobileRealtimeParams) => {
  const upsertChat = useChatStore((state) => state.upsertChat);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const setOnlineUsers = useNotificationStore((state) => state.setOnlineUsers);
  const setUserOnlineState = useNotificationStore((state) => state.setUserOnlineState);
  const updateFriendStatus = useNotificationStore((state) => state.updateFriendStatus);
  const tokenRef = useRef(token);

  useEffect(() => {
    if (!token) {
      disconnectMobileSocket();
      return;
    }

    if (tokenRef.current && tokenRef.current !== token) {
      disconnectMobileSocket();
    }
    tokenRef.current = token;

    const socket = getMobileSocket(token);

    const handlePresenceSync = ({ onlineUserIds }: { onlineUserIds: string[] }) => {
      setOnlineUsers(onlineUserIds);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setUserOnlineState(userId, true);
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setUserOnlineState(userId, false);
    };

    const handleNewMessage = ({
      message,
      chat,
    }: {
      message: MobileMessage;
      chat: MobileChat;
      clientTempId?: string;
    }) => {
      upsertChat(chat);
      const senderId = typeof message.senderId === "string" ? message.senderId : message.senderId._id;

      if (senderId !== currentUserId) {
        addNotification({
          id: `msg-${message._id}`,
          title: typeof message.senderId === "string" ? chat.otherParticipant?.name || "Someone" : message.senderId.name,
          body: getNotificationPreview(message),
          createdAt: message.createdAt,
          chatId: chat._id,
          userId: senderId,
          read: false,
          kind: "message",
        });
      }
    };

    const handleChatUpdated = ({ chat }: { chat: MobileChat }) => {
      upsertChat(chat);
    };

    const handleFriendRequestReceived = (notification: MobileNotificationItem) => {
      addNotification(notification);
    };

    const handleFriendRequestAccepted = (notification: MobileNotificationItem) => {
      addNotification(notification);
      if (notification.fromUser?._id) {
        updateFriendStatus({
          userId: notification.fromUser._id,
          isFriend: true,
          requestSent: false,
          requestReceived: false,
        });
      }
    };

    const handleFriendRequestRejected = (notification: MobileNotificationItem) => {
      addNotification(notification);
      if (notification.fromUser?._id) {
        updateFriendStatus({
          userId: notification.fromUser._id,
          isFriend: false,
          requestSent: false,
          requestReceived: false,
        });
      }
    };

    const handleReactionAdded = ({
      message,
      userId,
      userName,
      emoji,
    }: {
      message: MobileMessage;
      userId: string;
      userName: string;
      emoji: string;
    }) => {
      if (userId !== currentUserId) {
        addNotification({
          id: `reaction-${message._id}-${Date.now()}`,
          title: userName,
          body: `${emoji} reacted to your message`,
          createdAt: new Date().toISOString(),
          userId,
          read: false,
          kind: "reaction",
        });
      }
    };

    const handleReactionRemoved = ({
      message,
    }: {
      message: MobileMessage;
    }) => {
    };

    const handleMessageDeleted = ({
      scope,
      chatId,
      messageId,
      message,
    }: {
      scope: "me" | "everyone";
      chatId: string;
      messageId?: string;
      message?: MobileMessage;
    }) => {
    };

    socket.on(mobileSocketEvents.presenceSync, handlePresenceSync);
    socket.on(mobileSocketEvents.userOnline, handleUserOnline);
    socket.on(mobileSocketEvents.userOffline, handleUserOffline);
    socket.on(mobileSocketEvents.newMessage, handleNewMessage);
    socket.on(mobileSocketEvents.chatUpdated, handleChatUpdated);
    socket.on(mobileSocketEvents.friendRequestReceived, handleFriendRequestReceived);
    socket.on(mobileSocketEvents.friendRequestAccepted, handleFriendRequestAccepted);
    socket.on(mobileSocketEvents.friendRequestRejected, handleFriendRequestRejected);
    socket.on(mobileSocketEvents.reactionAdded, handleReactionAdded);
    socket.on(mobileSocketEvents.reactionRemoved, handleReactionRemoved);
    socket.on(mobileSocketEvents.messageDeleted, handleMessageDeleted);

    return () => {
      socket.off(mobileSocketEvents.presenceSync, handlePresenceSync);
      socket.off(mobileSocketEvents.userOnline, handleUserOnline);
      socket.off(mobileSocketEvents.userOffline, handleUserOffline);
      socket.off(mobileSocketEvents.newMessage, handleNewMessage);
      socket.off(mobileSocketEvents.chatUpdated, handleChatUpdated);
      socket.off(mobileSocketEvents.friendRequestReceived, handleFriendRequestReceived);
      socket.off(mobileSocketEvents.friendRequestAccepted, handleFriendRequestAccepted);
      socket.off(mobileSocketEvents.friendRequestRejected, handleFriendRequestRejected);
      socket.off(mobileSocketEvents.reactionAdded, handleReactionAdded);
      socket.off(mobileSocketEvents.reactionRemoved, handleReactionRemoved);
      socket.off(mobileSocketEvents.messageDeleted, handleMessageDeleted);
    };
  }, [addNotification, currentUserId, setOnlineUsers, setUserOnlineState, token, upsertChat, updateFriendStatus]);
};
