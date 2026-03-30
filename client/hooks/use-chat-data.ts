"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  createChat,
  deleteChat,
  deleteMessage,
  getChats,
  getMessages,
  markChatRead,
  markChatUnread,
  searchUsers,
  sendMessage,
  uploadMessageMedia,
} from "@/lib/api";
import { disconnectSocketClient, getSocketClient, socketEvents } from "@/lib/socket";
import { BackendUser, Chat, Message, MessageType, SocketNewMessagePayload } from "@/lib/types";
import { useChatStore } from "@/store/chat-store";

type UseChatDataParams = {
  token?: string;
  currentUserId?: string;
  searchQuery?: string;
};

type MediaTransferState = {
  isUploading: boolean;
  progress: number;
  fileName: string | null;
  error: string | null;
  canRetry: boolean;
};

type MediaMessageInput = {
  file: File;
  content?: string;
  replyToId?: string | null;
  waveform?: number[];
};

export const useChatData = ({ token, currentUserId, searchQuery }: UseChatDataParams) => {
  const {
    chats,
    messagesByChat,
    selectedChatId,
    setChats,
    setMessages,
    upsertMessage,
    updateMessage,
    removeMessage,
    replaceOptimisticMessage,
    upsertChat,
    removeChat,
    setTypingState,
    setOnlineUsers,
    setUserOnlineState,
    addNotification,
  } = useChatStore();
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userResults, setUserResults] = useState<BackendUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mediaTransfer, setMediaTransfer] = useState<MediaTransferState>({
    isUploading: false,
    progress: 0,
    fileName: null,
    error: null,
    canRetry: false,
  });
  const [isPending, startTransition] = useTransition();
  const typingTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const failedMediaRef = useRef<MediaMessageInput | null>(null);

  const getNotificationPreview = (message: Message) => {
    if (message.type === "image") {
      return message.content ? `Photo: ${message.content}` : "Sent a photo";
    }

    if (message.type === "video") {
      return message.content ? `Video: ${message.content}` : "Sent a video";
    }

    if (message.type === "voice") {
      return "Sent a voice note";
    }

    return message.content.length > 50 ? `${message.content.slice(0, 50)}...` : message.content;
  };

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    const loadChats = async () => {
      try {
        setIsLoadingChats(true);
        const response = await getChats(token);

        if (active) {
          startTransition(() => {
            setChats(response.chats);
          });
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load chats");
        }
      } finally {
        if (active) {
          setIsLoadingChats(false);
        }
      }
    };

    void loadChats();

    return () => {
      active = false;
    };
  }, [setChats, startTransition, token]);

  useEffect(() => {
    if (!token || !selectedChatId || messagesByChat[selectedChatId]) {
      return;
    }

    let active = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const loadMessages = async () => {
      try {
        setIsLoadingMessages(true);
        const response = await getMessages(token, selectedChatId);

        if (active && !abortControllerRef.current?.signal.aborted) {
          setMessages(selectedChatId, response.messages);
        }
      } catch (loadError) {
        if (active && !(loadError instanceof Error && loadError.name === "AbortError")) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load messages");
        }
      } finally {
        if (active) {
          setIsLoadingMessages(false);
        }
      }
    };

    void loadMessages();

    return () => {
      active = false;
      abortControllerRef.current?.abort();
    };
  }, [selectedChatId, token, messagesByChat, setMessages]);

  useEffect(() => {
    if (!token || !selectedChatId) {
      return;
    }

    const selectedChat = chats.find((chat) => chat._id === selectedChatId);

    if (!selectedChat || selectedChat.unreadCount === 0) {
      return;
    }

    void markChatRead(token, selectedChatId)
      .then((response) => {
        upsertChat(response.chat);
      })
      .catch((markError) => {
        setError(markError instanceof Error ? markError.message : "Failed to mark chat as read");
      });
  }, [chats, selectedChatId, token, upsertChat]);

  useEffect(() => {
    if (!token || !searchQuery?.trim()) {
      setUserResults([]);
      return undefined;
    }

    let active = true;

    if (searchAbortControllerRef.current) {
      searchAbortControllerRef.current.abort();
    }
    searchAbortControllerRef.current = new AbortController();

    const runSearch = async () => {
      try {
        setIsSearchingUsers(true);
        const response = await searchUsers(token, searchQuery);

        if (active && !searchAbortControllerRef.current?.signal.aborted) {
          setUserResults(response.users);
        }
      } catch (searchError) {
        if (active && !(searchError instanceof Error && searchError.name === "AbortError")) {
          setError(searchError instanceof Error ? searchError.message : "Failed to search users");
        }
      } finally {
        if (active) {
          setIsSearchingUsers(false);
        }
      }
    };

    void runSearch();

    return () => {
      active = false;
      searchAbortControllerRef.current?.abort();
    };
  }, [searchQuery, token]);

  useEffect(() => {
    if (!token || !currentUserId) {
      disconnectSocketClient();
      return;
    }

    const socket = getSocketClient(token);

    const handlePresenceSync = (payload: { onlineUserIds: string[] }) => {
      setOnlineUsers(payload.onlineUserIds);
    };

    const handleUserOnline = ({ userId }: { userId: string }) => {
      setUserOnlineState(userId, true);
    };

    const handleUserOffline = ({ userId }: { userId: string }) => {
      setUserOnlineState(userId, false);
    };

    const handleNewMessage = ({ message, chat, clientTempId }: SocketNewMessagePayload) => {
      upsertChat(chat);

      if (clientTempId) {
        replaceOptimisticMessage(chat._id, clientTempId, message);
      } else {
        upsertMessage(chat._id, message);
      }

      const senderId = typeof message.senderId === "string" ? message.senderId : message.senderId._id;

      if (senderId !== currentUserId && selectedChatId === chat._id) {
        socket.emit(socketEvents.joinChat, { chatId: chat._id });
      }

      if (senderId !== currentUserId && selectedChatId !== chat._id) {
        const senderName = typeof message.senderId === "string" 
          ? "Someone" 
          : message.senderId.name || "Someone";
        
        addNotification({
          id: `msg-${message._id}`,
          title: senderName,
          body: getNotificationPreview(message),
          createdAt: message.createdAt,
          chatId: chat._id,
          userId: senderId,
          read: false,
          kind: "message",
        });
      }
    };

    const handleMessageDeleted = (payload: {
      scope: "me" | "everyone";
      chatId: string;
      messageId?: string;
      message?: Message;
    }) => {
      if (payload.scope === "everyone" && payload.message) {
        updateMessage(payload.chatId, payload.message._id, () => payload.message as Message);
        return;
      }

      if (payload.scope === "me" && payload.messageId) {
        removeMessage(payload.chatId, payload.messageId);
      }
    };

    const handleMessageDelivered = ({
      chatId,
      messageId,
    }: {
      chatId: string;
      messageId: string;
    }) => {
      updateMessage(chatId, messageId, (message) => ({
        ...message,
        status: "delivered",
      }));
    };

    const handleMessageSeen = ({ chatId }: { chatId: string }) => {
      const existingMessages = useChatStore.getState().messagesByChat[chatId] || [];

      existingMessages.forEach((message) => {
        const senderId = typeof message.senderId === "string" ? message.senderId : message.senderId._id;
        if (senderId === currentUserId) {
          updateMessage(chatId, message._id, (entry) => ({
            ...entry,
            status: "seen",
          }));
        }
      });
    };

    const handleChatUpdated = ({ chat }: { chat: Chat }) => {
      upsertChat(chat);
    };

    const handleTyping = ({
      chatId,
      userId,
      userName,
      isTyping,
    }: {
      chatId: string;
      userId: string;
      userName: string;
      isTyping: boolean;
    }) => {
      setTypingState(chatId, isTyping ? { userId, userName } : null);
    };

    const handleFriendRequestReceived = (notification: {
      id: string;
      title: string;
      body: string;
      createdAt: string;
      userId: string;
      read: boolean;
      kind: "friend_request";
      action?: "received" | "accepted" | "rejected";
      fromUser?: {
        _id: string;
        name: string;
        username?: string;
        avatar?: string | null;
      };
    }) => {
      addNotification({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        userId: notification.userId,
        read: notification.read,
        kind: "friend_request",
        action: notification.action,
        fromUser: notification.fromUser,
      });
    };

    const handleFriendRequestAccepted = (notification: {
      id: string;
      title: string;
      body: string;
      createdAt: string;
      userId: string;
      read: boolean;
      kind: "friend_request";
      action?: "received" | "accepted" | "rejected";
      fromUser?: {
        _id: string;
        name: string;
        username?: string;
        avatar?: string | null;
      };
    }) => {
      addNotification({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        userId: notification.userId,
        read: notification.read,
        kind: "friend_request",
        action: notification.action,
        fromUser: notification.fromUser,
      });
    };

    const handleFriendRequestRejected = (notification: {
      id: string;
      title: string;
      body: string;
      createdAt: string;
      userId: string;
      read: boolean;
      kind: "friend_request";
      action?: "received" | "accepted" | "rejected";
      fromUser?: {
        _id: string;
        name: string;
        username?: string;
        avatar?: string | null;
      };
    }) => {
      addNotification({
        id: notification.id,
        title: notification.title,
        body: notification.body,
        createdAt: notification.createdAt,
        userId: notification.userId,
        read: notification.read,
        kind: "friend_request",
        action: notification.action,
        fromUser: notification.fromUser,
      });
    };

    socket.on(socketEvents.presenceSync, handlePresenceSync);
    socket.on(socketEvents.userOnline, handleUserOnline);
    socket.on(socketEvents.userOffline, handleUserOffline);
    socket.on(socketEvents.newMessage, handleNewMessage);
    socket.on(socketEvents.messageDelivered, handleMessageDelivered);
    socket.on(socketEvents.messageSeen, handleMessageSeen);
    socket.on(socketEvents.messageDeleted, handleMessageDeleted);
    socket.on(socketEvents.chatUpdated, handleChatUpdated);
    socket.on(socketEvents.typing, handleTyping);
    socket.on(socketEvents.friendRequestReceived, handleFriendRequestReceived);
    socket.on(socketEvents.friendRequestAccepted, handleFriendRequestAccepted);
    socket.on(socketEvents.friendRequestRejected, handleFriendRequestRejected);

    return () => {
      socket.off(socketEvents.presenceSync, handlePresenceSync);
      socket.off(socketEvents.userOnline, handleUserOnline);
      socket.off(socketEvents.userOffline, handleUserOffline);
      socket.off(socketEvents.newMessage, handleNewMessage);
      socket.off(socketEvents.messageDelivered, handleMessageDelivered);
      socket.off(socketEvents.messageSeen, handleMessageSeen);
      socket.off(socketEvents.messageDeleted, handleMessageDeleted);
      socket.off(socketEvents.chatUpdated, handleChatUpdated);
      socket.off(socketEvents.typing, handleTyping);
      socket.off(socketEvents.friendRequestReceived, handleFriendRequestReceived);
      socket.off(socketEvents.friendRequestAccepted, handleFriendRequestAccepted);
      socket.off(socketEvents.friendRequestRejected, handleFriendRequestRejected);
    };
  }, [
    addNotification,
    currentUserId,
    replaceOptimisticMessage,
    selectedChatId,
    setOnlineUsers,
    setTypingState,
    setUserOnlineState,
    token,
    upsertChat,
    upsertMessage,
    updateMessage,
    removeMessage,
    removeChat,
  ]);

  useEffect(() => {
    if (!token || !selectedChatId) {
      return;
    }

    const socket = getSocketClient(token);
    socket.emit(socketEvents.joinChat, { chatId: selectedChatId });
  }, [selectedChatId, token]);

  const startChatWithUser = async (participantId: string) => {
    if (!token) {
      return;
    }

    try {
      const response = await createChat(token, participantId);
      upsertChat(response.chat);
      useChatStore.getState().selectChat(response.chat._id);
      setUserResults([]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to start chat");
    }
  };

  const sendChatMessage = async (content: string, replyToId?: string | null) => {
    if (!token || !selectedChatId || !currentUserId) {
      return;
    }

    const optimisticId = `temp-${Date.now()}`;
    const replyToMessage = replyToId
      ? (messagesByChat[selectedChatId] || []).find((message) => message._id === replyToId)
      : null;
    const optimisticMessage: Message = {
      _id: optimisticId,
      chatId: selectedChatId,
      senderId: currentUserId,
      content,
      type: "text",
      status: "sent",
      createdAt: new Date().toISOString(),
      replyTo: replyToMessage
        ? {
            _id: replyToMessage._id,
            content: replyToMessage.content,
            createdAt: replyToMessage.createdAt,
            senderId: typeof replyToMessage.senderId === "string" ? undefined : replyToMessage.senderId,
          }
        : null,
      optimistic: true,
    };

    upsertMessage(selectedChatId, optimisticMessage);

    try {
      const socket = getSocketClient(token);

      socket.emit(
        socketEvents.sendMessage,
        {
          chatId: selectedChatId,
          content,
          type: "text",
          replyToId: replyToId || null,
          clientTempId: optimisticId,
        },
        (acknowledgement: { ok: boolean; error?: string }) => {
          if (!acknowledgement?.ok) {
            setError(acknowledgement.error || "Failed to send message");
          }
        }
      );
    } catch (sendError) {
      try {
        const response = await sendMessage(token, {
          chatId: selectedChatId,
          content,
          replyToId: replyToId || null,
        });

        replaceOptimisticMessage(selectedChatId, optimisticId, response.message);
      } catch (fallbackError) {
        setError(fallbackError instanceof Error ? fallbackError.message : "Failed to send message");
      }
    }
  };

  const sendMediaMessage = async ({
    file,
    content,
    replyToId,
    waveform,
  }: MediaMessageInput) => {
    if (!token || !selectedChatId || !currentUserId) {
      return;
    }

    try {
      failedMediaRef.current = null;
      setMediaTransfer({
        isUploading: true,
        progress: 0,
        fileName: file.name,
        error: null,
        canRetry: false,
      });

      const uploadResponse = await uploadMessageMedia(token, file, (progress) => {
        setMediaTransfer({
          isUploading: true,
          progress,
          fileName: file.name,
          error: null,
          canRetry: false,
        });
      });
      const media = {
        ...uploadResponse.media,
        waveform: waveform?.length ? waveform : uploadResponse.media.waveform,
      };
      const type = media.messageType as Exclude<MessageType, "text">;
      const optimisticId = `temp-media-${Date.now()}`;
      const replyToMessage = replyToId
        ? (messagesByChat[selectedChatId] || []).find((message) => message._id === replyToId)
        : null;

      upsertMessage(selectedChatId, {
        _id: optimisticId,
        chatId: selectedChatId,
        senderId: currentUserId,
        content: content || "",
        type,
        media,
        status: "sent",
        createdAt: new Date().toISOString(),
        replyTo: replyToMessage
          ? {
              _id: replyToMessage._id,
              content: replyToMessage.content,
              createdAt: replyToMessage.createdAt,
              senderId: typeof replyToMessage.senderId === "string" ? undefined : replyToMessage.senderId,
            }
          : null,
        optimistic: true,
      });

      try {
        const socket = getSocketClient(token);
        socket.emit(
          socketEvents.sendMessage,
          {
            chatId: selectedChatId,
            content: content || "",
            type,
            media,
            replyToId: replyToId || null,
            clientTempId: optimisticId,
          },
          (acknowledgement: { ok: boolean; error?: string }) => {
            if (!acknowledgement?.ok) {
              setError(acknowledgement.error || "Failed to send media message");
            }
          }
        );
      } catch {
        const response = await sendMessage(token, {
          chatId: selectedChatId,
          content: content || "",
          type,
          media,
          replyToId: replyToId || null,
        });
        replaceOptimisticMessage(selectedChatId, optimisticId, response.message);
      }
      setMediaTransfer({
        isUploading: false,
        progress: 0,
        fileName: null,
        error: null,
        canRetry: false,
      });
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Failed to upload media";
      failedMediaRef.current = {
        file,
        content,
        replyToId,
        waveform,
      };
      setError(message);
      setMediaTransfer({
        isUploading: false,
        progress: 0,
        fileName: file.name,
        error: message,
        canRetry: true,
      });
    }
  };

  const retryLastMediaUpload = async () => {
    if (!failedMediaRef.current) {
      return;
    }

    await sendMediaMessage(failedMediaRef.current);
  };

  const dismissMediaTransfer = () => {
    failedMediaRef.current = null;
    setMediaTransfer({
      isUploading: false,
      progress: 0,
      fileName: null,
      error: null,
      canRetry: false,
    });
  };

  const sendTypingState = (isTyping: boolean) => {
    if (!token || !selectedChatId) {
      return;
    }

    const socket = getSocketClient(token);
    socket.emit(isTyping ? socketEvents.typing : socketEvents.stopTyping, {
      chatId: selectedChatId,
    });
  };

  const notifyTyping = () => {
    sendTypingState(true);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      sendTypingState(false);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
        sendTypingState(false);
      }
    };
  }, []);

  const deleteChatMessage = async (messageId: string, scope: "me" | "everyone") => {
    if (!token || !selectedChatId) {
      return;
    }

    try {
      const socket = getSocketClient(token);
      socket.emit(
        socketEvents.deleteMessage,
        {
          messageId,
          scope,
        },
        async (acknowledgement: { ok: boolean; error?: string }) => {
          if (!acknowledgement?.ok) {
            try {
              const result = await deleteMessage(token, messageId, scope);
              if (scope === "everyone" && result.message) {
                updateMessage(selectedChatId, messageId, () => result.message as Message);
              } else {
                removeMessage(selectedChatId, messageId);
              }
            } catch (fallbackError) {
              setError(
                fallbackError instanceof Error ? fallbackError.message : "Failed to delete message"
              );
            }
          }
        }
      );
    } catch (error) {
      try {
        const result = await deleteMessage(token, messageId, scope);
        if (scope === "everyone" && result.message) {
          updateMessage(selectedChatId, messageId, () => result.message as Message);
        } else {
          removeMessage(selectedChatId, messageId);
        }
      } catch (fallbackError) {
        setError(fallbackError instanceof Error ? fallbackError.message : "Failed to delete message");
      }
    }
  };

  const markSelectedChatRead = async (chatId: string) => {
    if (!token) {
      return;
    }

    try {
      const response = await markChatRead(token, chatId);
      upsertChat(response.chat);
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Failed to mark chat as read");
    }
  };

  const markSelectedChatUnread = async (chatId: string) => {
    if (!token) {
      return;
    }

    try {
      const response = await markChatUnread(token, chatId);
      upsertChat(response.chat);
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Failed to mark chat as unread");
    }
  };

  const deleteSelectedChat = async (chatId: string) => {
    if (!token) {
      return;
    }

    try {
      await deleteChat(token, chatId);
      removeChat(chatId);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to remove chat");
    }
  };

  return {
    chats,
    messages: selectedChatId ? messagesByChat[selectedChatId] || [] : [],
    selectedChatId,
    isLoadingChats,
    isLoadingMessages,
    isSearchingUsers,
    isPending,
    error,
    mediaTransfer,
    userResults,
    clearError: () => setError(null),
    dismissMediaTransfer,
    startChatWithUser,
    sendChatMessage,
    sendMediaMessage,
    retryLastMediaUpload,
    notifyTyping,
    deleteChatMessage,
    deleteSelectedChat,
    markSelectedChatRead,
    markSelectedChatUnread,
  };
};
