import { create } from "zustand";
import { clearStoredSession, loadStoredSession, saveStoredSession } from "@/lib/auth/storage";
import { MobileSession } from "@/lib/types";

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
    await clearStoredSession();
    set({ session: null });
  },
}));
