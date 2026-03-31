import { useEffect, useState } from "react";
import { getMobileChats } from "@/lib/api/client";
import { useChatStore } from "@/store/chat-store";

type UseMobileChatsParams = {
  token?: string;
};

export const useMobileChats = ({ token }: UseMobileChatsParams) => {
  const chats = useChatStore((state) => state.chats);
  const setChats = useChatStore((state) => state.setChats);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChats = async () => {
    if (!token) {
      setChats([]);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getMobileChats(token);
      setChats(response.chats);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadChats();
  }, [token]);

  return {
    chats,
    isLoading,
    error,
    refresh: loadChats,
  };
};
