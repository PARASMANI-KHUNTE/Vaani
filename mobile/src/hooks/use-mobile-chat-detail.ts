import { useEffect, useMemo, useState } from "react";
import { addMobileReaction, deleteMobileMessage, editMobileMessage, getMobileMessages, postMobileMessage, removeMobileReaction } from "@/lib/api/client";
import { getMobileSocket } from "@/lib/socket/client";
import { mobileSocketEvents } from "@/lib/socket/events";
import { MobileChat, MobileMessage } from "@/lib/types";

type UseMobileChatDetailParams = {
  token?: string;
  userId?: string;
  chat: MobileChat | null;
};

export const useMobileChatDetail = ({ token, userId, chat }: UseMobileChatDetailParams) => {
  const [messages, setMessages] = useState<MobileMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !chat?._id) {
      setMessages([]);
      setHasOlderMessages(false);
      return;
    }

    let active = true;

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const response = await getMobileMessages(token, chat._id);

        if (active) {
          setMessages(response.messages);
          setHasOlderMessages(Boolean(response.pagination?.hasNextPage));
          setError(null);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load messages");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadMessages();

    return () => {
      active = false;
    };
  }, [chat?._id, token]);

  useEffect(() => {
    if (!token || !chat?._id) {
      return;
    }

    const socket = getMobileSocket(token);
    socket.emit(mobileSocketEvents.joinChat, { chatId: chat._id });

    const handleNewMessage = ({ message, chat: nextChat, clientTempId }: { message: MobileMessage; chat: MobileChat; clientTempId?: string }) => {
      if (nextChat._id !== chat._id) {
        return;
      }

      setMessages((current) => {
        if (current.some((entry) => entry._id === message._id)) {
          return current;
        }

        if (clientTempId && current.some((entry) => entry._id === clientTempId)) {
          return current.map((entry) => (entry._id === clientTempId ? message : entry));
        }

        return [...current, message];
      });
    };

    const handleMessageDelivered = ({
      chatId: deliveredChatId,
      messageId,
    }: {
      chatId: string;
      messageId: string;
    }) => {
      if (deliveredChatId !== chat._id) return;

      setMessages((current) =>
        current.map((msg) =>
          msg._id === messageId ? { ...msg, status: "delivered" as const } : msg
        )
      );
    };

    const handleMessageSeen = ({
      chatId: seenChatId,
      seenAt,
    }: {
      chatId: string;
      seenAt?: string;
    }) => {
      if (seenChatId !== chat._id) return;

      // Only messages that existed when the other side opened the chat are
      // seen; newer ones must keep their previous status.
      const seenAtMs = seenAt ? new Date(seenAt).getTime() : Number.POSITIVE_INFINITY;

      setMessages((current) =>
        current.map((msg) => {
          const senderId = typeof msg.senderId === "string" ? msg.senderId : msg.senderId._id;
          if (senderId !== userId || new Date(msg.createdAt).getTime() > seenAtMs) {
            return msg;
          }
          return { ...msg, status: "seen" as const };
        })
      );
    };

    const handleMessageEdited = ({
      chatId: editedChatId,
      message,
    }: {
      chatId?: string;
      message: MobileMessage;
    }) => {
      const targetChatId = editedChatId || message.chatId;
      if (targetChatId !== chat._id) return;

      setMessages((current) =>
        current.map((msg) => (msg._id === message._id ? { ...msg, ...message } : msg))
      );
    };

    const handleReactionAdded = ({
      message,
    }: {
      message: MobileMessage;
    }) => {
      if (message.chatId !== chat._id) return;

      setMessages((current) =>
        current.map((msg) =>
          msg._id === message._id ? { ...msg, reactions: message.reactions } : msg
        )
      );
    };

    const handleReactionRemoved = ({
      message,
    }: {
      message: MobileMessage;
    }) => {
      if (message.chatId !== chat._id) return;

      setMessages((current) =>
        current.map((msg) =>
          msg._id === message._id ? { ...msg, reactions: message.reactions } : msg
        )
      );
    };

    const handleMessageDeleted = ({
      scope,
      chatId,
      messageId,
      message,
    }: {
      scope: "me" | "everyone";
      chatId: string;
      messageId?: string;
      message?: MobileMessage;
    }) => {
      if (chatId !== chat._id) return;

      if (scope === "everyone" && message) {
        setMessages((current) =>
          current.map((msg) =>
            msg._id === message._id ? { ...msg, content: "", type: "text" } : msg
          )
        );
      } else if (scope === "me" && messageId) {
        setMessages((current) => current.filter((msg) => msg._id !== messageId));
      }
    };

    socket.on(mobileSocketEvents.newMessage, handleNewMessage);
    socket.on(mobileSocketEvents.messageDelivered, handleMessageDelivered);
    socket.on(mobileSocketEvents.messageSeen, handleMessageSeen);
    socket.on(mobileSocketEvents.reactionAdded, handleReactionAdded);
    socket.on(mobileSocketEvents.reactionRemoved, handleReactionRemoved);
    socket.on(mobileSocketEvents.messageDeleted, handleMessageDeleted);
    socket.on(mobileSocketEvents.messageEdited, handleMessageEdited);

    // Socket rooms are not preserved across reconnects and events sent while
    // offline are not replayed, so re-join and reload the newest page.
    const handleConnect = () => {
      socket.emit(mobileSocketEvents.joinChat, { chatId: chat._id });
      void getMobileMessages(token, chat._id)
        .then((response) => {
          setMessages(response.messages);
          setHasOlderMessages(Boolean(response.pagination?.hasNextPage));
        })
        .catch(() => undefined);
    };
    socket.on("connect", handleConnect);

    return () => {
      socket.off(mobileSocketEvents.newMessage, handleNewMessage);
      socket.off(mobileSocketEvents.messageDelivered, handleMessageDelivered);
      socket.off(mobileSocketEvents.messageSeen, handleMessageSeen);
      socket.off(mobileSocketEvents.reactionAdded, handleReactionAdded);
      socket.off(mobileSocketEvents.reactionRemoved, handleReactionRemoved);
      socket.off(mobileSocketEvents.messageDeleted, handleMessageDeleted);
      socket.off(mobileSocketEvents.messageEdited, handleMessageEdited);
      socket.off("connect", handleConnect);
    };
  }, [chat?._id, token, userId]);

  const sendMessage = async (content: string, replyToId?: string | null) => {
    if (!token || !chat?._id || !content.trim()) {
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: MobileMessage = {
      _id: tempId,
      chatId: chat._id,
      senderId: userId || "",
      content: content.trim(),
      type: "text",
      status: "sent",
      createdAt: new Date().toISOString(),
      replyTo: replyToId ? {
        _id: replyToId,
        content: "",
        type: "text",
        senderId: "",
      } : undefined,
    };

    setMessages((current) => [...current, optimisticMessage]);

    setIsSending(true);

    const socketAckPromise = new Promise<void>((resolve, reject) => {
      const socket = getMobileSocket(token);
      const timeout = setTimeout(() => {
        reject(new Error("Socket acknowledgement timed out"));
      }, 10000);

      socket.emit(
        mobileSocketEvents.sendMessage,
        {
          chatId: chat._id,
          content: content.trim(),
          type: "text",
          replyToId: replyToId || null,
          clientTempId: tempId,
        },
        (acknowledgement: { ok: boolean; error?: string }) => {
          clearTimeout(timeout);
          if (!acknowledgement?.ok) {
            reject(new Error(acknowledgement?.error || "Failed to send message"));
            return;
          }
          resolve();
        }
      );
    });

    try {
      await socketAckPromise;
    } catch {
      try {
        const response = await postMobileMessage(token, {
          chatId: chat._id,
          content: content.trim(),
          replyToId: replyToId || null,
        });

        setMessages((current) => {
          return current.map((msg) =>
            msg._id === tempId ? response.message : msg
          );
        });
        setError(null);
      } catch (fallbackError) {
        setMessages((current) => current.filter((msg) => msg._id !== tempId));
        setError(fallbackError instanceof Error ? fallbackError.message : "Failed to send message");
      }
    } finally {
      setIsSending(false);
    }
  };

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  const loadOlderMessages = async () => {
    if (!token || !chat?._id || isLoadingOlder || !hasOlderMessages) {
      return;
    }

    const oldestMessage = sortedMessages[0];
    if (!oldestMessage) {
      return;
    }

    setIsLoadingOlder(true);
    try {
      const response = await getMobileMessages(token, chat._id, {
        limit: 30,
        cursor: oldestMessage._id,
      });

      setMessages((current) => {
        const knownIds = new Set(current.map((entry) => entry._id));
        const older = response.messages.filter((entry) => !knownIds.has(entry._id));
        return [...older, ...current];
      });
      setHasOlderMessages(Boolean(response.pagination?.hasNextPage));
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load older messages");
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string, currentUserId: string) => {
    if (!token || !chat?._id) {
      return;
    }

    const message = messages.find((m) => m._id === messageId);
    if (!message) {
      return;
    }

    const currentReactions = message.reactions || [];
    const hasReacted = currentReactions.some(
      (r) => r.userId === currentUserId && r.emoji === emoji
    );

    try {
      if (hasReacted) {
        await removeMobileReaction(token, messageId, emoji);
      } else {
        await addMobileReaction(token, messageId, emoji);
      }
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : "Failed to update reaction");
    }
  };

  const deleteMessage = async (messageId: string, scope: "me" | "everyone") => {
    if (!token || !chat?._id) {
      return;
    }

    try {
      await deleteMobileMessage(token, messageId, scope);
      
      if (scope === "everyone") {
        setMessages((current) =>
          current.map((msg) =>
            msg._id === messageId ? { ...msg, content: "", type: "text" } : msg
          )
        );
      } else {
        setMessages((current) => current.filter((msg) => msg._id !== messageId));
      }
      setError(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete message");
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!token || !chat?._id) {
      return;
    }

    try {
      const response = await editMobileMessage(token, messageId, { chatId: chat._id, content });
      setMessages((current) =>
        current.map((msg) => (msg._id === messageId ? response.message : msg))
      );
      setError(null);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Failed to edit message");
    }
  };

  return {
    messages: sortedMessages,
    isLoading,
    isSending,
    isLoadingOlder,
    hasOlderMessages,
    error,
    sendMessage,
    toggleReaction,
    deleteMessage,
    editMessage,
    loadOlderMessages,
  };
};
