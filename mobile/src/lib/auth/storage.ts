import * as SecureStore from "expo-secure-store";
import { MobileSession } from "@/lib/types";

const SESSION_KEY = "canvas-chat-mobile-session";

export const loadStoredSession = async (): Promise<MobileSession | null> => {
  const rawValue = await SecureStore.getItemAsync(SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as MobileSession;
  } catch {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return null;
  }
};

export const saveStoredSession = async (session: MobileSession) => {
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
};

export const clearStoredSession = async () => {
  await SecureStore.deleteItemAsync(SESSION_KEY);
};
