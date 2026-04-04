"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  addGroupMembers,
  clearChatMessages,
  createGroupInviteLink,
  createChat,
  createGroupChat,
  demoteGroupAdmin,
  deleteChat,
  deleteMessage,
  getChats,
  getMessages,
  leaveGroup,
  markChatRead,
  markChatUnread,
  promoteGroupAdmin,
  removeGroupMember,
  searchUsers,
  sendMessage,
  transferGroupOwnership,
  updateGroupProfile,
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
  fileType: string | null;
  error: string | null;
  canRetry: boolean;
  canCancel: boolean;
};

type MediaMessageInput = {
  file: File;
  content?: string;
  replyToId?: string | null;
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
  const selectChat = useChatStore((state) => state.selectChat);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [userResults, setUserResults] = useState<BackendUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mediaTransfer, setMediaTransfer] = useState<MediaTransferState>({
    isUploading: false,
    progress: 0,
    fileName: null,
    fileType: null,
    error: null,
    canRetry: false,
    canCancel: false,
  });
  const [isPending, startTransition] = useTransition();
  const typingTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const searchAbortControllerRef = useRef<AbortController | null>(null);
  const failedMediaRef = useRef<MediaMessageInput | null>(null);

  const getNotificationPreview = (message: Message) => {
    if (message.type === "image") {
      return message.content ? `📷 ${message.content}` : "Sent a photo";
    }
    if (message.type === "video") {
      return message.content ? `🎬 ${message.content}` : "Sent a video";
    }
    if (message.type === "voice") {
      return "Sent a voice note 🎙️";
    }
    if (message.type === "file") {
      return message.content ? `📎 ${message.content}` : "Sent a file";
    }
    const text = message.content || "";
    return text.length > 50 ? `${text.slice(0, 50)}...` : text;
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
            // Merge logic: If we have a selectedChatId, make sure that specific chat 
            // stays in the list even if the server response is slightly stale.
            const currentSelectedId = useChatStore.getState().selectedChatId;
            const currentChats = useChatStore.getState().chats;
            const selectedChat = currentSelectedId ? currentChats.find(c => c._id === currentSelectedId) : null;
            
            let finalChats = response.chats;
            if (selectedChat && !finalChats.find(c => c._id === selectedChat._id)) {
              finalChats = [selectedChat, ...finalChats];
            }
            
            setChats(finalChats);
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
        const response = await getMessages(
          token,
          selectedChatId,
          1,
          20,
          abortControllerRef.current?.signal
        );

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
        const response = await searchUsers(
          token,
          searchQuery,
          searchAbortControllerRef.current?.signal
        );

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

    const handleReactionAdded = (payload: {
      message: Message;
      userId: string;
      userName: string;
      emoji: string;
    }) => {
      const { message, userId, userName, emoji } = payload;
      const chatId = message.chatId;
      if (chatId && typeof chatId === "string") {
        updateMessage(chatId, message._id, () => message);
        if (userId !== currentUserId) {
          addNotification({
            id: `reaction-${message._id}-${Date.now()}`,
            title: userName,
            body: `${emoji} reacted to your message`,
            createdAt: new Date().toISOString(),
            userId,
            read: false,
            kind: "reaction",
          });
        }
      }
    };

    const handleReactionRemoved = (payload: {
      message: Message;
      userId: string;
      emoji: string;
    }) => {
      const { message } = payload;
      const chatId = message.chatId;
      if (chatId && typeof chatId === "string") {
        updateMessage(chatId, message._id, () => message);
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

    const handleChatRemoved = ({ chatId }: { chatId: string }) => {
      if (!chatId) {
        return;
      }
      removeChat(chatId);
      if (selectedChatId === chatId) {
        selectChat(null);
      }
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
      if (userId === currentUserId) {
        return;
      }
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

    const handleChatCreated = ({ chat }: { chat: Chat }) => {
      upsertChat(chat);
      if (chat.groupName) {
        addNotification({
          id: `chat-created-${chat._id}`,
          title: "New Group",
          body: `You were added to "${chat.groupName}"`,
          createdAt: new Date().toISOString(),
          chatId: chat._id,
          read: false,
          kind: "message",
        });
      }
    };

    const handleMemberAddedToGroup = (payload: {
      chat: Chat;
      addedByUserId: string;
      addedByUserName: string;
      addedUserId: string;
      chatId: string;
    }) => {
      upsertChat(payload.chat);
      if (payload.addedUserId === currentUserId) {
        addNotification({
          id: `member-added-${payload.chatId}-${Date.now()}`,
          title: "Added to Group",
          body: `${payload.addedByUserName} added you to "${payload.chat.groupName || "a group"}"`,
          createdAt: new Date().toISOString(),
          chatId: payload.chatId,
          read: false,
          kind: "message",
        });
      }
    };

    const handleSocketError = (payload: { code: string; message: string }) => {
      setError(payload.message || "An error occurred. Please try again.");
    };

    socket.on(socketEvents.presenceSync, handlePresenceSync);
    socket.on(socketEvents.userOnline, handleUserOnline);
    socket.on(socketEvents.userOffline, handleUserOffline);
    socket.on(socketEvents.newMessage, handleNewMessage);
    socket.on(socketEvents.messageDelivered, handleMessageDelivered);
    socket.on(socketEvents.messageSeen, handleMessageSeen);
    socket.on(socketEvents.messageDeleted, handleMessageDeleted);
    socket.on(socketEvents.chatUpdated, handleChatUpdated);
    socket.on(socketEvents.chatRemoved, handleChatRemoved);
    socket.on(socketEvents.typing, handleTyping);
    socket.on(socketEvents.friendRequestReceived, handleFriendRequestReceived);
    socket.on(socketEvents.friendRequestAccepted, handleFriendRequestAccepted);
    socket.on(socketEvents.friendRequestRejected, handleFriendRequestRejected);
    socket.on(socketEvents.reactionAdded, handleReactionAdded);
    socket.on(socketEvents.reactionRemoved, handleReactionRemoved);
    socket.on(socketEvents.chatCreated, handleChatCreated);
    socket.on(socketEvents.memberAddedToGroup, handleMemberAddedToGroup);
    socket.on(socketEvents.socketError, handleSocketError);

    return () => {
      socket.off(socketEvents.presenceSync, handlePresenceSync);
      socket.off(socketEvents.userOnline, handleUserOnline);
      socket.off(socketEvents.userOffline, handleUserOffline);
      socket.off(socketEvents.newMessage, handleNewMessage);
      socket.off(socketEvents.messageDelivered, handleMessageDelivered);
      socket.off(socketEvents.messageSeen, handleMessageSeen);
      socket.off(socketEvents.messageDeleted, handleMessageDeleted);
      socket.off(socketEvents.chatUpdated, handleChatUpdated);
      socket.off(socketEvents.chatRemoved, handleChatRemoved);
      socket.off(socketEvents.typing, handleTyping);
      socket.off(socketEvents.friendRequestReceived, handleFriendRequestReceived);
      socket.off(socketEvents.friendRequestAccepted, handleFriendRequestAccepted);
      socket.off(socketEvents.friendRequestRejected, handleFriendRequestRejected);
      socket.off(socketEvents.reactionAdded, handleReactionAdded);
      socket.off(socketEvents.reactionRemoved, handleReactionRemoved);
      socket.off(socketEvents.chatCreated, handleChatCreated);
      socket.off(socketEvents.memberAddedToGroup, handleMemberAddedToGroup);
      socket.off(socketEvents.socketError, handleSocketError);
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
    selectChat,
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
      // Wait for store to update
      useChatStore.getState().upsertChat(response.chat);
      useChatStore.getState().selectChat(response.chat._id);
      setUserResults([]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to start chat");
    }
  };

  const createGroupConversation = async (groupName: string, participantIds: string[]) => {
    if (!token) {
      return;
    }

    try {
      const response = await createGroupChat(token, {
        groupName,
        participantIds,
      });
      upsertChat(response.chat);
      useChatStore.getState().selectChat(response.chat._id);
      setUserResults([]);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create group chat");
    }
  };

  const renameGroupConversation = async (chatId: string, groupName: string) => {
    if (!token) {
      return;
    }

    try {
      const response = await updateGroupProfile(token, chatId, { groupName });
      upsertChat(response.chat);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to rename group");
    }
  };

  const updateGroupAvatar = async (chatId: string, groupAvatar: string | null) => {
    if (!token) {
      return;
    }

    try {
      const response = await updateGroupProfile(token, chatId, { groupAvatar });
      upsertChat(response.chat);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update group avatar");
    }
  };

  const addMembersToGroup = async (chatId: string, memberIds: string[]) => {
    if (!token) {
      return;
    }
    try {
      const response = await addGroupMembers(token, chatId, memberIds);
      upsertChat(response.chat);
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "Failed to add members");
    }
  };

  const removeMemberFromGroup = async (chatId: string, memberId: string) => {
    if (!token) {
      return;
    }
    try {
      const response = await removeGroupMember(token, chatId, memberId);
      upsertChat(response.chat);
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "Failed to remove member");
    }
  };

  const promoteMemberToAdmin = async (chatId: string, memberId: string) => {
    if (!token) {
      return;
    }
    try {
      const response = await promoteGroupAdmin(token, chatId, memberId);
      upsertChat(response.chat);
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "Failed to promote admin");
    }
  };

  const demoteAdminToMember = async (chatId: string, memberId: string) => {
    if (!token) {
      return;
    }
    try {
      const response = await demoteGroupAdmin(token, chatId, memberId);
      upsertChat(response.chat);
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "Failed to demote admin");
    }
  };

  const transferGroupOwner = async (chatId: string, nextOwnerId: string) => {
    if (!token) {
      return;
    }
    try {
      const response = await transferGroupOwnership(token, chatId, nextOwnerId);
      upsertChat(response.chat);
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "Failed to transfer ownership");
    }
  };

  const leaveGroupConversation = async (chatId: string) => {
    if (!token) {
      return;
    }
    try {
      await leaveGroup(token, chatId);
      removeChat(chatId);
      if (selectedChatId === chatId) {
        selectChat(null);
      }
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "Failed to leave group");
    }
  };

  const createInviteLinkForGroup = async (
    chatId: string,
    options?: { expiresInHours?: number; maxUses?: number }
  ) => {
    if (!token) {
      return null;
    }

    try {
      const response = await createGroupInviteLink(token, chatId, options);
      return response.invite;
    } catch (groupError) {
      setError(groupError instanceof Error ? groupError.message : "Failed to generate invite link");
      return null;
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
    } catch {
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
  }: MediaMessageInput) => {
    if (!token || !selectedChatId || !currentUserId) {
      return;
    }

    try {
      failedMediaRef.current = null;
      let fileType: string;
      const mimeType = file.type.toLowerCase();
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
      const isVideo = mimeType.startsWith("video/") || ["mp4", "webm", "mov", "ogg"].includes(extension);
      const isAudio = mimeType.startsWith("audio/") || ["webm", "ogg", "mp3", "wav", "m4a"].includes(extension);
      
      if (isImage) {
        fileType = "image";
      } else if (isVideo) {
        fileType = "video";
      } else if (isAudio) {
        fileType = "voice";
      } else {
        fileType = "file";
      }
      setMediaTransfer({
        isUploading: true,
        progress: 0,
        fileName: file.name,
        fileType,
        error: null,
        canRetry: false,
        canCancel: true,
      });

      const uploadResponse = await uploadMessageMedia(
        token,
        file,
        (progress) => {
          setMediaTransfer({
            isUploading: true,
            progress,
            fileName: file.name,
            fileType,
            error: null,
            canRetry: false,
            canCancel: true,
          });
        },
        (xhr) => {
          xhrRef.current = xhr;
        }
      );
      const media = uploadResponse.media;
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
        // Socket failed, fallback to HTTP API
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
        fileType: null,
        error: null,
        canRetry: false,
        canCancel: false,
      });
      xhrRef.current = null;
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Failed to upload media";
      failedMediaRef.current = {
        file,
        content,
        replyToId,
      };
      setError(message);
      const errorFileType = file.type.startsWith('image/') ? 'image' : 'file';
      setMediaTransfer({
        isUploading: false,
        progress: 0,
        fileName: file.name,
        fileType: errorFileType,
        error: message,
        canRetry: true,
        canCancel: false,
      });
      xhrRef.current = null;
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
      fileType: null,
      error: null,
      canRetry: false,
      canCancel: false,
    });
  };

  const cancelMediaUpload = () => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }
    failedMediaRef.current = null;
    setMediaTransfer({
      isUploading: false,
      progress: 0,
      fileName: null,
      fileType: null,
      error: null,
      canRetry: false,
      canCancel: false,
    });
  };

  const sendTypingState = useCallback((isTyping: boolean) => {
    if (!token || !selectedChatId) {
      return;
    }

    const socket = getSocketClient(token);
    socket.emit(isTyping ? socketEvents.typing : socketEvents.stopTyping, {
      chatId: selectedChatId,
    });
  }, [selectedChatId, token]);

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
  }, [sendTypingState]);

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
    } catch {
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
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!token || !selectedChatId) {
      return;
    }

    const messages = messagesByChat[selectedChatId] || [];
    const message = messages.find(m => m._id === messageId);
    if (!message) {
      return;
    }

    const currentReactions = message.reactions || [];
    const hasReacted = currentReactions.some(
      r => r.userId === currentUserId && r.emoji === emoji
    );

    const socket = getSocketClient(token);
    const eventName = hasReacted ? socketEvents.reactionRemoved : socketEvents.reactionAdded;

    socket.emit(eventName, { messageId, emoji }, (acknowledgement: { ok: boolean; error?: string }) => {
      if (!acknowledgement?.ok) {
        setError(acknowledgement.error || "Failed to update reaction");
      }
    });
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
      if (selectedChatId === chatId) {
        selectChat(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to remove chat");
    }
  };

  const clearSelectedChatMessages = async (chatId: string) => {
    if (!token) {
      return;
    }

    try {
      const response = await clearChatMessages(token, chatId);
      setMessages(chatId, []);
      upsertChat(response.chat);

      if (selectedChatId === chatId) {
        selectChat(chatId);
      }
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : "Failed to clear messages");
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
    cancelMediaUpload,
    startChatWithUser,
    createGroupConversation,
    renameGroupConversation,
    updateGroupAvatar,
    addMembersToGroup,
    removeMemberFromGroup,
    promoteMemberToAdmin,
    demoteAdminToMember,
    transferGroupOwner,
    leaveGroupConversation,
    createInviteLinkForGroup,
    sendChatMessage,
    sendMediaMessage,
    retryLastMediaUpload,
    notifyTyping,
    deleteChatMessage,
    toggleReaction,
    clearSelectedChatMessages,
    deleteSelectedChat,
    markSelectedChatRead,
    markSelectedChatUnread,
  };
};
