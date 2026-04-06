import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { MobileNotificationItem } from "@/lib/types";

const SOUND_PREF_KEY = "canvas-chat-mobile-pref-sound-enabled";
const PUSH_TOKEN_KEY = "canvas-chat-mobile-push-token";

type FriendStatusUpdate = {
  userId: string;
  isFriend: boolean;
  requestSent: boolean;
  requestReceived: boolean;
  friendsCount?: number;
};

type NotificationState = {
  notifications: MobileNotificationItem[];
  onlineUserIds: string[];
  soundEnabled: boolean;
  pushToken: string | null;
  directoryUsers: Record<string, {
    isFriend: boolean;
    requestSent: boolean;
    requestReceived: boolean;
    friendsCount: number;
  }>;
  hydratePreferences: () => Promise<void>;
  setSoundEnabled: (enabled: boolean) => void;
  setPushToken: (token: string | null) => Promise<void>;
  getPushToken: () => string | null;
  addNotification: (notification: MobileNotificationItem) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnlineState: (userId: string, isOnline: boolean) => void;
  updateFriendStatus: (update: FriendStatusUpdate) => void;
  batchUpdateFriendStatuses: (updates: FriendStatusUpdate[]) => void;
  removeFriendRequest: (userId: string) => void;
  updateNotificationAction: (notificationId: string, action: "accepted" | "rejected") => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  onlineUserIds: [],
  soundEnabled: true,
  pushToken: null,
  directoryUsers: {},
  hydratePreferences: async () => {
    const raw = await SecureStore.getItemAsync(SOUND_PREF_KEY);
    if (!raw) return;
    set({ soundEnabled: raw !== "false" });
  },
  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    void SecureStore.setItemAsync(SOUND_PREF_KEY, enabled ? "true" : "false").catch(() => undefined);
  },
  setPushToken: async (token) => {
    set({ pushToken: token });
    if (token) {
      await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => undefined);
    } else {
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => undefined);
    }
  },
  getPushToken: () => get().pushToken,
  addNotification: (notification) =>
    set((state) => {
      const existing = state.notifications.find((entry) => entry.id === notification.id);

      if (existing) {
        return {
          notifications: state.notifications.map((entry) =>
            entry.id === notification.id ? { ...notification, read: false } : entry
          ),
        };
      }

      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
      };
    }),
  markRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((entry) =>
        entry.id === notificationId ? { ...entry, read: true } : entry
      ),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((entry) => ({ ...entry, read: true })),
    })),
  setOnlineUsers: (userIds) => set({ onlineUserIds: userIds }),
  setUserOnlineState: (userId, isOnline) =>
    set((state) => ({
      onlineUserIds: isOnline
        ? Array.from(new Set([...state.onlineUserIds, userId]))
        : state.onlineUserIds.filter((entry) => entry !== userId),
    })),
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
}));
