import { useCallback, useEffect, useRef, useState } from "react";
import { getMobileChats } from "@/lib/api/client";
import { useChatStore } from "@/store/chat-store";

type UseMobileChatsParams = {
  token?: string;
};

export const useMobileChats = ({ token }: UseMobileChatsParams) => {
  const chats = useChatStore((state) => state.chats);
  const setChats = useChatStore((state) => state.setChats);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const offsetRef = useRef(0);
  const [error, setError] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    if (!token) {
      setChats([]);
      offsetRef.current = 0;
      setHasMore(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getMobileChats(token, { limit: 50 });
      setChats(response.chats);
      offsetRef.current = response.chats.length;
      setHasMore(Boolean(response.pagination?.hasMore));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load chats");
    } finally {
      setIsLoading(false);
    }
  }, [setChats, token]);

  const loadMoreChats = useCallback(async () => {
    if (!token || isLoadingMore || !hasMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const response = await getMobileChats(token, { limit: 50, offset: offsetRef.current });
      const existing = useChatStore.getState().chats;
      const existingIds = new Set(existing.map((chat) => chat._id));
      const incoming = response.chats.filter((chat) => !existingIds.has(chat._id));
      setChats([...existing, ...incoming]);
      offsetRef.current += response.chats.length;
      setHasMore(Boolean(response.pagination?.hasMore));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load more chats");
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, setChats, token]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  return {
    chats,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    refresh: loadChats,
    loadMoreChats,
  };
};
