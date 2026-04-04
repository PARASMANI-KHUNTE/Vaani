import { useEffect, useState } from "react";

const LOCAL_EVENT = "local-storage";

export const useLocalStorageBoolean = (key: string, defaultValue: boolean) => {
  const [value, setValue] = useState<boolean>(() => {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    try {
      return JSON.parse(stored) as boolean;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    const handle = () => {
      const stored = localStorage.getItem(key);
      if (stored === null) {
        setValue(defaultValue);
        return;
      }
      try {
        setValue(JSON.parse(stored) as boolean);
      } catch {
        setValue(defaultValue);
      }
    };

    window.addEventListener("storage", handle);
    window.addEventListener(LOCAL_EVENT, handle);
    return () => {
      window.removeEventListener("storage", handle);
      window.removeEventListener(LOCAL_EVENT, handle);
    };
  }, [defaultValue, key]);

  const setStoredValue = (next: boolean | ((prev: boolean) => boolean)) => {
    const nextValue = typeof next === "function" ? (next as (p: boolean) => boolean)(value) : next;
    setValue(nextValue);
    localStorage.setItem(key, JSON.stringify(nextValue));
    window.dispatchEvent(new Event(LOCAL_EVENT));
  };

  return [value, setStoredValue] as const;
};

