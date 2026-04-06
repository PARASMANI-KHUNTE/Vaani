import { create } from "zustand";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "@/lib/auth/storage";
import { unregisterMobilePushToken } from "@/lib/api/client";
import { MobileSession } from "@/lib/types";
import { useNotificationStore } from "@/store/notification-store";

type SessionState = {
  hydrated: boolean;
  session: MobileSession | null;
  hydrate: () => Promise<void>;
  setSession: (session: MobileSession) => Promise<void>;
  clearSession: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set) => ({
  hydrated: false,
  session: null,
  hydrate: async () => {
    const session = await loadStoredSession();
    set({
      hydrated: true,
      session,
    });
  },
  setSession: async (session) => {
    await saveStoredSession(session);
    set({ session });
  },
  clearSession: async () => {
    const pushToken = useNotificationStore.getState().getPushToken();
    const currentSession = useSessionStore.getState().session;

    if (pushToken && currentSession?.accessToken) {
      try {
        await unregisterMobilePushToken(currentSession.accessToken, pushToken);
      } catch {
      }
    }

    await useNotificationStore.getState().setPushToken(null);
    await clearStoredSession();
    set({ session: null });
  },
}));
