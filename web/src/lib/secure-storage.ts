const STORAGE_KEY = "linkup-web-session";
const USE_SESSION_ONLY_KEY = "linkup-session-mode";
const ENCRYPTION_KEY_NAME = "linkup-encryption-key";

const generateEncryptionKey = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getOrCreateEncryptionKey = (): string => {
  const stored = sessionStorage.getItem(ENCRYPTION_KEY_NAME);
  if (stored) return stored;

  const newKey = generateEncryptionKey();
  sessionStorage.setItem(ENCRYPTION_KEY_NAME, newKey);
  return newKey;
};

const xorEncrypt = (data: string, key: string): string => {
  const keyChars = key.split("");
  const dataChars = data.split("");
  const result: string[] = [];

  for (let i = 0; i < dataChars.length; i++) {
    const dataChar = dataChars[i].charCodeAt(0);
    const keyChar = keyChars[i % keyChars.length].charCodeAt(0);
    result.push(String.fromCharCode(dataChar ^ keyChar));
  }

  return btoa(result.join(""));
};

const xorDecrypt = (encrypted: string, key: string): string => {
  try {
    const decoded = atob(encrypted);
    const keyChars = key.split("");
    const result: string[] = [];

    for (let i = 0; i < decoded.length; i++) {
      const dataChar = decoded.charCodeAt(i);
      const keyChar = keyChars[i % keyChars.length].charCodeAt(0);
      result.push(String.fromCharCode(dataChar ^ keyChar));
    }

    return result.join("");
  } catch {
    return "";
  }
};

const encode = (data: unknown): string => {
  try {
    const json = JSON.stringify(data);
    const key = getOrCreateEncryptionKey();
    return xorEncrypt(json, key);
  } catch {
    return "";
  }
};

const decode = <T>(encoded: string): T | null => {
  try {
    const key = getOrCreateEncryptionKey();
    const decrypted = xorDecrypt(encoded, key);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as T;
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

export const clearAllSecureStorage = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(`${STORAGE_KEY}-session`);
  sessionStorage.removeItem(ENCRYPTION_KEY_NAME);
};
