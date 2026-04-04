import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { MobileNotificationItem } from "@/lib/types";

const SOUND_PREF_KEY = "canvas-chat-mobile-pref-sound-enabled";

type NotificationState = {
  notifications: MobileNotificationItem[];
  onlineUserIds: string[];
  soundEnabled: boolean;
  hydratePreferences: () => Promise<void>;
  setSoundEnabled: (enabled: boolean) => void;
  addNotification: (notification: MobileNotificationItem) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  setOnlineUsers: (userIds: string[]) => void;
  setUserOnlineState: (userId: string, isOnline: boolean) => void;
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  onlineUserIds: [],
  soundEnabled: true,
  hydratePreferences: async () => {
    const raw = await SecureStore.getItemAsync(SOUND_PREF_KEY);
    if (!raw) return;
    set({ soundEnabled: raw !== "false" });
  },
  setSoundEnabled: (enabled) => {
    set({ soundEnabled: enabled });
    void SecureStore.setItemAsync(SOUND_PREF_KEY, enabled ? "true" : "false").catch(() => undefined);
  },
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
}));
