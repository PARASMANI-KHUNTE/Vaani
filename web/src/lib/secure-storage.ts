const STORAGE_KEY = "vaani-web-session";
const USE_SESSION_ONLY_KEY = "vaani-session-mode";

const encode = (data: unknown): string => {
  try {
    return btoa(encodeURIComponent(JSON.stringify(data)));
  } catch {
    return "";
  }
};

const decode = <T>(encoded: string): T | null => {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as T;
  } catch {
    return null;
  }
};

const getSessionMode = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(USE_SESSION_ONLY_KEY) === "true";
};

const setSessionMode = (enabled: boolean): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USE_SESSION_ONLY_KEY, String(enabled));
};

export const secureStorage = {
  get: <T>(key: string = STORAGE_KEY): T | null => {
    if (typeof window === "undefined") return null;
    const sessionOnly = getSessionMode();
    const storageKey = sessionOnly ? `${key}-session` : key;
    const raw = sessionOnly ? sessionStorage.getItem(storageKey) : localStorage.getItem(storageKey);
    if (!raw) return null;

    const decoded = decode<T>(raw);
    return decoded;
  },

  set: <T>(data: T, key: string = STORAGE_KEY): void => {
    if (typeof window === "undefined") return;
    const sessionOnly = getSessionMode();
    const storageKey = sessionOnly ? `${key}-session` : key;
    const encoded = encode(data);

    if (sessionOnly) {
      sessionStorage.setItem(storageKey, encoded);
    } else {
      localStorage.setItem(storageKey, encoded);
    }
  },

  remove: (key: string = STORAGE_KEY): void => {
    if (typeof window === "undefined") return;
    const sessionOnly = getSessionMode();
    const storageKey = sessionOnly ? `${key}-session` : key;

    localStorage.removeItem(storageKey);
    sessionStorage.removeItem(`${key}-session`);
  },

  enableSessionMode: () => setSessionMode(true),
  disableSessionMode: () => setSessionMode(false),
  isSessionMode: getSessionMode,
};
