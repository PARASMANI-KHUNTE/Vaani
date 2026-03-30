"use client";

import { Chat, Message, NotificationItem } from "@/lib/types";
import { create } from "zustand";

type ChatState = {
  chats: Chat[];
  selectedChatId: string | null;
  messagesByChat: Record<string, Message[]>;
  typingByChat: Record<string, { userId: string; userName: string } | null>;
  onlineUserIds: string[];
  notifications: NotificationItem[];
  setChats: (chats: Chat[]) => void;
  selectChat: (chatId: string | null) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  upsertMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updater: (message: Message) => Message) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  replaceOptimisticMessage: (chatId: string, optimisticId: string, message: Message) => void;
  upsertChat: (chat: Chat) => void;
  removeChat: (chatId: string) => void;
  setTypingState: (chatId: string, value: { userId: string; userName: string } | null) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnlineState: (userId: string, isOnline: boolean) => void;
  addNotification: (notification: NotificationItem) => void;
  markNotificationRead: (notificationId: string) => void;
  markNotificationsRead: () => void;
  clearNotifications: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  selectedChatId: null,
  messagesByChat: {},
  typingByChat: {},
  onlineUserIds: [],
  notifications: [],
  setChats: (chats) => {
    const state = get();
    const shouldAutoSelect = !state.selectedChatId && !state.chats.length;
    
    set({
      chats,
      selectedChatId: state.selectedChatId || (shouldAutoSelect ? chats[0]?._id || null : null),
    });
  },
  selectChat: (chatId) => set({ selectedChatId: chatId }),
  setMessages: (chatId, messages) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: messages,
      },
    })),
  upsertMessage: (chatId, message) =>
    set((state) => {
      const existingMessages = state.messagesByChat[chatId] || [];
      const alreadyExists = existingMessages.some((entry) => entry._id === message._id);

      return {
        messagesByChat: {
          ...state.messagesByChat,
          [chatId]: alreadyExists ? existingMessages : [...existingMessages, message],
        },
      };
    }),
  updateMessage: (chatId, messageId, updater) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] || []).map((entry) =>
          entry._id === messageId ? updater(entry) : entry
        ),
      },
    })),
  removeMessage: (chatId, messageId) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] || []).filter((entry) => entry._id !== messageId),
      },
    })),
  replaceOptimisticMessage: (chatId, optimisticId, message) =>
    set((state) => ({
      messagesByChat: {
        ...state.messagesByChat,
        [chatId]: (state.messagesByChat[chatId] || []).map((entry) =>
          entry._id === optimisticId ? message : entry
        ),
      },
    })),
  upsertChat: (chat) =>
    set((state) => {
      const nextChats = [chat, ...state.chats.filter((entry) => entry._id !== chat._id)];

      return {
        chats: nextChats,
        selectedChatId: state.selectedChatId || chat._id,
      };
    }),
  removeChat: (chatId) =>
    set((state) => {
      const nextChats = state.chats.filter((entry) => entry._id !== chatId);
      const nextMessagesByChat = { ...state.messagesByChat };
      delete nextMessagesByChat[chatId];

      return {
        chats: nextChats,
        selectedChatId: state.selectedChatId === chatId ? nextChats[0]?._id || null : state.selectedChatId,
        messagesByChat: nextMessagesByChat,
      };
    }),
  setTypingState: (chatId, value) =>
    set((state) => ({
      typingByChat: {
        ...state.typingByChat,
        [chatId]: value,
      },
    })),
  setOnlineUsers: (userIds) => set({ onlineUserIds: userIds }),
  setUserOnlineState: (userId, isOnline) =>
    set((state) => ({
      onlineUserIds: isOnline
        ? Array.from(new Set([...state.onlineUserIds, userId]))
        : state.onlineUserIds.filter((entry) => entry !== userId),
    })),
  addNotification: (notification) =>
    set((state) => {
      const exists = state.notifications.some((n) => n.id === notification.id);
      if (exists) {
        return {
          notifications: state.notifications.map((n) =>
            n.id === notification.id ? { ...notification, read: false } : n
          ),
        };
      }
      return {
        notifications: [notification, ...state.notifications].slice(0, 20),
      };
    }),
  markNotificationRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      ),
    })),
  markNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    })),
  clearNotifications: () => set({ notifications: [] }),
}));
