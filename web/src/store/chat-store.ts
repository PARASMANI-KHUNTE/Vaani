"use client";

import { Chat, Message, NotificationItem } from "@/lib/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type FriendStatusUpdate = {
  userId: string;
  isFriend: boolean;
  requestSent: boolean;
  requestReceived: boolean;
  friendsCount?: number;
};

type ChatState = {
  chats: Chat[];
  selectedChatId: string | null;
  hasExplicitlyClosedChat: boolean;
  messagesByChat: Record<string, Message[]>;
  typingByChat: Record<string, { userId: string; userName: string }[]>;
  onlineUserIds: string[];
  notifications: NotificationItem[];
  directoryUsers: Record<string, {
    isFriend: boolean;
    requestSent: boolean;
    requestReceived: boolean;
    friendsCount: number;
  }>;
  setChats: (chats: Chat[]) => void;
  selectChat: (chatId: string | null) => void;
  setMessages: (chatId: string, messages: Message[]) => void;
  upsertMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, updater: (message: Message) => Message) => void;
  removeMessage: (chatId: string, messageId: string) => void;
  replaceOptimisticMessage: (chatId: string, optimisticId: string, message: Message) => void;
  markMessageFailed: (chatId: string, optimisticId: string) => void;
  upsertChat: (chat: Chat) => void;
  removeChat: (chatId: string) => void;
  setTypingState: (chatId: string, userId: string, userName: string, isTyping: boolean) => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnlineState: (userId: string, isOnline: boolean) => void;
  addNotification: (notification: NotificationItem) => void;
  markNotificationRead: (notificationId: string) => void;
  markNotificationsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;
  updateFriendStatus: (update: FriendStatusUpdate) => void;
  batchUpdateFriendStatuses: (updates: FriendStatusUpdate[]) => void;
  removeFriendRequest: (userId: string) => void;
  updateNotificationAction: (notificationId: string, action: "accepted" | "rejected") => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      selectedChatId: null,
      hasExplicitlyClosedChat: false,
      messagesByChat: {},
      typingByChat: {},
      onlineUserIds: [],
      notifications: [],
      directoryUsers: {},
      setChats: (chats) => {
        const state = get();
        const selectedChatStillExists = state.selectedChatId
          ? chats.some((chat) => chat._id === state.selectedChatId)
          : false;
        const nextSelectedChatId = selectedChatStillExists
          ? state.selectedChatId
          : !state.hasExplicitlyClosedChat && chats.length > 0
            ? chats[0]._id
            : null;
        const shouldAutoSelect =
          !state.selectedChatId &&
          !state.hasExplicitlyClosedChat &&
          !state.chats.length;

        set({
          chats,
          selectedChatId: shouldAutoSelect ? chats[0]?._id || null : nextSelectedChatId,
          hasExplicitlyClosedChat: selectedChatStillExists ? false : state.hasExplicitlyClosedChat,
        });
      },
      selectChat: (chatId) =>
        set((state) => ({
          selectedChatId: chatId,
          hasExplicitlyClosedChat: chatId === null,
          chats: state.chats.map((chat) =>
            chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
          ),
        })),
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
          const nextMessages = alreadyExists ? existingMessages : [...existingMessages, message];

          // Update the chat object in the list
          const nextChats = state.chats.map((chat) => {
            if (chat._id === chatId) {
              const isUnread = state.selectedChatId !== chatId;
              return {
                ...chat,
                lastMessage: message,
                unreadCount: isUnread ? chat.unreadCount + 1 : 0,
                updatedAt: message.createdAt,
              };
            }
            return chat;
          });

          // Sort chats by updatedAt
          nextChats.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

          return {
            messagesByChat: {
              ...state.messagesByChat,
              [chatId]: nextMessages,
            },
            chats: nextChats,
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
      markMessageFailed: (chatId, optimisticId) =>
        set((state) => ({
          messagesByChat: {
            ...state.messagesByChat,
            [chatId]: (state.messagesByChat[chatId] || []).map((entry) =>
              entry._id === optimisticId ? { ...entry, failed: true } : entry
            ),
          },
        })),
      upsertChat: (chat) =>
        set((state) => {
          const chatWithDefaults = { ...chat, unreadCount: chat.unreadCount || 0 };
          const nextChats = [
            chatWithDefaults,
            ...state.chats.filter((entry) => entry._id !== chat._id),
          ];
          nextChats.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

          return {
            chats: nextChats,
            selectedChatId:
              state.selectedChatId || state.hasExplicitlyClosedChat
                ? state.selectedChatId
                : chat._id,
          };
        }),
      removeChat: (chatId) =>
        set((state) => {
          const nextChats = state.chats.filter((entry) => entry._id !== chatId);
          const nextMessagesByChat = { ...state.messagesByChat };
          delete nextMessagesByChat[chatId];
          const nextSelectedChatId =
            state.selectedChatId === chatId ? nextChats[0]?._id || null : state.selectedChatId;

          return {
            chats: nextChats,
            selectedChatId: nextSelectedChatId,
            hasExplicitlyClosedChat: state.selectedChatId === chatId ? false : state.hasExplicitlyClosedChat,
            messagesByChat: nextMessagesByChat,
          };
        }),
      setTypingState: (chatId, userId, userName, isTyping) =>
        set((state) => {
          const currentTyping = state.typingByChat[chatId] || [];
          let newTyping = [...currentTyping];

          if (isTyping) {
            if (!newTyping.some((t) => t.userId === userId)) {
              newTyping.push({ userId, userName });
            }
          } else {
            newTyping = newTyping.filter((t) => t.userId !== userId);
          }

          return {
            typingByChat: {
              ...state.typingByChat,
              [chatId]: newTyping,
            },
          };
        }),
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
          const newNotifications = [notification, ...state.notifications];
          if (newNotifications.length <= 20) {
            return { notifications: newNotifications };
          }
          return {
            notifications: newNotifications.slice(0, 20),
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
      removeNotification: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.filter((notification) => notification.id !== notificationId),
        })),
      clearNotifications: () => set({ notifications: [] }),
      updateFriendStatus: (update) =>
        set((state) => {
          const existing = state.directoryUsers[update.userId] || {
            isFriend: false,
            requestSent: false,
            requestReceived: false,
            friendsCount: 0,
          };
          return {
            directoryUsers: {
              ...state.directoryUsers,
              [update.userId]: {
                ...existing,
                isFriend: update.isFriend,
                requestSent: update.requestSent,
                requestReceived: update.requestReceived,
                friendsCount: update.friendsCount ?? existing.friendsCount,
              },
            },
          };
        }),
      batchUpdateFriendStatuses: (updates) =>
        set((state) => {
          const nextDirectoryUsers = { ...state.directoryUsers };
          updates.forEach((update) => {
            const existing = nextDirectoryUsers[update.userId] || {
              isFriend: false,
              requestSent: false,
              requestReceived: false,
              friendsCount: 0,
            };
            nextDirectoryUsers[update.userId] = {
              ...existing,
              isFriend: update.isFriend,
              requestSent: update.requestSent,
              requestReceived: update.requestReceived,
              friendsCount: update.friendsCount ?? existing.friendsCount,
            };
          });
          return { directoryUsers: nextDirectoryUsers };
        }),
      removeFriendRequest: (userId) =>
        set((state) => {
          const existing = state.directoryUsers[userId];
          if (!existing) return state;
          return {
            directoryUsers: {
              ...state.directoryUsers,
              [userId]: {
                ...existing,
                requestSent: false,
                requestReceived: false,
              },
            },
          };
        }),
      updateNotificationAction: (notificationId, action) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, action } : n
          ),
        })),
    }),
    {
      name: "canvas-chat-ui-state",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedChatId: state.selectedChatId,
        hasExplicitlyClosedChat: state.hasExplicitlyClosedChat,
        directoryUsers: state.directoryUsers,
      }),
    }
  )
);
