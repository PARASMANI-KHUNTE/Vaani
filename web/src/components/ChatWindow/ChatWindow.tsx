"use client";

import { Avatar } from "@/components/ui/avatar";
import { useEffect, useRef, useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ImagePlus,
  SendHorizonal,
  X,
  Search,
  SmilePlus,
  RefreshCw,
  AlertCircle,
  CheckSquare,
  Trash2,
  MoreVertical,
  Mic,
  Paperclip,
  Square,
  Video,
  Images,
  Plus,
  Users,
  LogOut,
  MessageCircle,
} from "lucide-react";
import { MessageBubble } from "@/components/MessageBubble/MessageBubble";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BackendUser, Chat, Message } from "@/lib/types";
import { cn, formatDateSeparator } from "@/lib/utils";

type MediaTransferState = {
  isUploading: boolean;
  progress: number;
  fileName: string | null;
  fileType: string | null;
  error: string | null;
  canRetry: boolean;
  canCancel: boolean;
};

type ChatWindowProps = {
  chat: Chat | null;
  messages: Message[];
  currentUserId?: string;
  isLoading: boolean;
  onSendMessage: (content: string, replyToId?: string | null) => Promise<void>;
  onSendMedia?: (input: {
    file: File;
    content?: string;
    replyToId?: string | null;
    waveform?: number[];
  }) => Promise<void>;
  onTyping?: () => void;
  onDeleteMessage?: (messageId: string, scope: "me" | "everyone") => Promise<void>;
  onReact?: (messageId: string, emoji: string) => Promise<void>;
  onBack?: () => void;
  onClose?: () => void;
  isOnline?: boolean;
  onlineUserIds?: string[];
  typingLabel?: string | null;
  onOpenUserProfile?: (user: BackendUser) => void;
  mediaTransfer?: MediaTransferState;
  onRetryMedia?: () => void;
  onCancelMedia?: () => void;
  onDismissMedia?: () => void;
  onError?: string | undefined;
  onDismissError?: () => void;
  onLeaveGroup?: (chatId: string) => Promise<void>;
  onOpenGroupInfo?: (chatId: string) => void;
  onClearChat?: (chatId: string) => void;
  onOpenNewChat?: () => void;
  navigate?: (path: string) => void;
  selectedMessageIds?: string[];
  onSelectMessage?: (messageId: string, selected: boolean) => void;
  onClearSelectedMessages?: () => void;
};

const getSenderId = (senderId: string | { _id: string }) =>
  typeof senderId === "string" ? senderId : senderId._id;

export const ChatWindow = ({
  chat,
  messages,
  currentUserId,
  isLoading,
  onSendMessage,
  onSendMedia,
  onTyping,
  onDeleteMessage,
  onReact,
  onBack,
  onClose,
  isOnline,
  onlineUserIds = [],
  typingLabel,
  onOpenUserProfile,
  mediaTransfer,
  onRetryMedia,
  onDismissMedia,
  onLeaveGroup,
  onOpenGroupInfo,
  onClearChat,
  onOpenNewChat,
  navigate,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  
  const themeConfig: Record<string, string> = {
    default: "bg-[#6d7af7]",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
    violet: "bg-violet-500",
    cyan: "bg-cyan-500",
    dark: "bg-slate-900",
  };

  const currentTheme = chat?.theme || localStorage.getItem("chatTheme") || "default";
  const currentThemeClass = themeConfig[currentTheme] || themeConfig.default;
  const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const getWallpaperStyle = () => {
    const wallpaper = chat?.wallpaper || localStorage.getItem("chatWallpaper") || "none";
    if (!wallpaper || wallpaper === "none") return {};
    if (wallpaper.startsWith("http")) {
      return {
        backgroundImage: `url("${wallpaper}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      };
    }
    return {};
  };

  const currentWallpaper = chat?.wallpaper || localStorage.getItem("chatWallpaper") || "none";
  
  const wallpaperOverlayClass = cn(
    "absolute inset-0 pointer-events-none opacity-40 dark:opacity-20",
    currentWallpaper === "mesh" && "bg-gradient-to-tr from-blue-400/20 via-purple-400/20 to-rose-400/20",
    currentWallpaper === "abstract" && "bg-[#6d7af7]/10",
    currentWallpaper === "doodles" && "bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat opacity-[0.03] dark:opacity-[0.07]"
  );

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setShowGroupMenu(false);
      }
    };
    if (showGroupMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showGroupMenu]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker]);

  const filteredMessages = messages;

  const isMessageHighlighted = (m: Message) =>
    !!(searchQuery.trim() && m.content?.toLowerCase().includes(searchQuery.toLowerCase()));

  const searchMatchCount = searchQuery.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase())).length
    : 0;

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleClearSelected = () => {
    setSelectedMessages(new Set());
    setIsSelectionMode(false);
  };

  const submitMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft("");
    await onSendMessage(trimmed, replyTarget?._id || null);
    setReplyTarget(null);
  };

  const handleSendFile = async (file: File | null) => {
    if (!file || !onSendMedia) return;
    setIsSendingMedia(true);
    try {
      await onSendMedia({ file, content: draft.trim() || undefined, replyToId: replyTarget?._id || null });
      setDraft("");
      setReplyTarget(null);
    } finally {
      setIsSendingMedia(false);
    }
  };

  const handleSendMultipleFiles = async (files: FileList | null) => {
    if (!files || !onSendMedia) return;
    setIsSendingMedia(true);
    try {
      for (const file of Array.from(files)) {
        await onSendMedia({ file });
      }
      setDraft("");
      setReplyTarget(null);
    } finally {
      setIsSendingMedia(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordingChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        
        if (onSendMedia) {
          handleSendFile(audioFile);
        }

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!chat) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-slate-50 p-8 text-center dark:bg-slate-900 border-none sm:border-solid border-l border-slate-100 dark:border-slate-800">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <MessageCircle className="h-10 w-10 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Welcome to your inbox</h2>
        <p className="mt-2 max-w-[240px] text-sm text-slate-500 mb-6">Select a conversation from the sidebar to start messaging.</p>
        <div className="flex gap-3">
          {onOpenNewChat && (
            <button 
              onClick={onOpenNewChat}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </button>
          )}
          {navigate && (
            <button 
              onClick={() => navigate?.("/group/create")}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <MessageCircle className="h-4 w-4" />
              New Group
            </button>
          )}
        </div>
      </section>
    );
  }

  const chatTitle = chat.isGroup ? chat.groupName : chat.otherParticipant?.name;
  const chatAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;

  return (
    <section className="relative flex h-full flex-col overflow-hidden border-none sm:border-solid border-l border-slate-100 bg-[#f8f9fb] text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="z-30 shrink-0 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="mx-auto flex w-full max-w-[700px] items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 transition-all hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
                title="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            <button
              type="button"
              className="group/header flex min-w-0 items-center gap-2.5 text-left"
              onClick={() => {
                if (chat.isGroup) {
                  onOpenGroupInfo?.(chat._id);
                } else if (chat.otherParticipant && onOpenUserProfile) {
                  onOpenUserProfile(chat.otherParticipant);
                }
              }}
            >
              <div className="relative shrink-0">
                <Avatar
                  src={chatAvatar}
                  name={chatTitle || "?"}
                  className="h-10 w-10 rounded-xl ring-1 ring-slate-200 shadow-sm dark:ring-slate-800"
                />
                {isOnline ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-slate-950" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {chatTitle}
                  </h3>
                  {chat.isGroup ? (
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 opacity-0 transition-opacity group-hover/header:opacity-100 dark:bg-slate-900 dark:text-slate-300 sm:opacity-100">
                      Group
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-1 text-[12px] font-medium text-slate-500 dark:text-slate-400">
                  {typingLabel
                    ? typingLabel
                    : chat.isGroup
                      ? (() => {
                          const onlineParticipants = (chat.participants || []).filter(
                            (p) => p._id !== currentUserId && onlineUserIds.includes(p._id)
                          );
                          const totalOthers = (chat.participants || []).filter((p) => p._id !== currentUserId).length;
                          if (onlineParticipants.length > 0) {
                            const names = onlineParticipants.map((p) => p.name || p.username).join(", ");
                            return `${names} online`;
                          }
                          return `${totalOthers} member${totalOthers !== 1 ? "s" : ""}`;
                        })()
                      : isOnline
                        ? "Online"
                        : "Offline"}
                </p>
              </div>
            </button>
          </div>

          <div className="relative flex shrink-0 items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900",
                  showSearch && "bg-slate-100 text-slate-900 dark:bg-slate-900"
                )}
                title="Search"
              >
                <Search className="h-5 w-5" />
              </button>
              {showSearch && (
                <div className="absolute right-0 mt-2 w-64 xs:w-72 rounded-2xl bg-white p-2.5 shadow-xl ring-1 ring-black/5 dark:bg-slate-900 z-[60]">
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                  />
                  {searchQuery ? (
                    <p className="mt-1.5 text-[10px] font-semibold text-slate-400">{searchMatchCount} matches</p>
                  ) : null}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGroupMenu((v) => !v)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900",
                showGroupMenu && "bg-slate-100 text-slate-900 dark:bg-slate-900"
              )}
              title="Menu"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            {onClose ? (
              <button
                onClick={onClose}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                title="Close Chat"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}

            <AnimatePresence>
              {showGroupMenu && (
                <motion.div
                  ref={groupMenuRef}
                  initial={{ opacity: 0, scale: 0.98, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 6 }}
                  transition={{ duration: 0.14 }}
                  className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden z-[60] dark:bg-slate-900"
                >
                  <div className="p-1.5">
                    <button
                      onClick={() => {
                        setIsSelectionMode(!isSelectionMode);
                        setShowGroupMenu(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                      {isSelectionMode ? "Cancel Selection" : "Select Messages"}
                      {isSelectionMode && selectedMessages.size > 0 && ` (${selectedMessages.size})`}
                    </button>
                    {chat.isGroup ? (
                      <button
                        onClick={() => {
                          onOpenGroupInfo?.(chat._id);
                          setShowGroupMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <Users className="h-4 w-4 text-emerald-600" />
                        Group Info
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        setConfirmClearOpen(true);
                        setShowGroupMenu(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4 text-amber-600" />
                      Clear Chat History
                    </button>
                  </div>
                  {chat.isGroup ? (
                    <>
                      <div className="mx-3 h-px bg-slate-100 dark:bg-slate-800" />
                      <div className="p-1.5">
                        <button
                          onClick={() => {
                            setConfirmLeaveOpen(true);
                            setShowGroupMenu(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                        >
                          <LogOut className="h-4 w-4" />
                          Leave Group
                        </button>
                      </div>
                    </>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div 
        ref={scrollContainerRef} 
        className="relative flex-1 overflow-y-auto px-4 py-6 sm:py-8 space-y-6"
        style={getWallpaperStyle()}
      >
        {currentWallpaper && currentWallpaper !== "none" && !currentWallpaper.startsWith("http") && (
          <div className={wallpaperOverlayClass} />
        )}
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="mx-auto max-w-[700px] space-y-6">
            {(() => {
              const groupedMessages: { message: Message; isGroupStart: boolean; isGroupEnd: boolean; groupedMedia?: Message[] }[] = [];
              let currentGroup: Message[] = [];
              
              filteredMessages.forEach((message) => {
                const isMedia = message.type === "image" || message.type === "video";
                const isConsecutiveMedia = currentGroup.length > 0 && currentGroup.every(m => 
                  (m.type === "image" || m.type === "video") && getSenderId(m.senderId) === getSenderId(message.senderId)
                );
                const timeDiff = currentGroup.length > 0 
                  ? new Date(message.createdAt).getTime() - new Date(currentGroup[0].createdAt).getTime()
                  : 0;
                const isWithinGroup = isMedia && isConsecutiveMedia && timeDiff < 60000;
                
                if (isWithinGroup) {
                  currentGroup.push(message);
                } else {
                  if (currentGroup.length > 0) {
                    if (currentGroup[0].type === "image" || currentGroup[0].type === "video") {
                      // Only push ONE bubble for the entire media group
                      groupedMessages.push({
                        message: currentGroup[0],
                        isGroupStart: true,
                        isGroupEnd: true,
                        groupedMedia: currentGroup,
                      });
                    } else {
                      currentGroup.forEach((m, i) => {
                        groupedMessages.push({
                          message: m,
                          isGroupStart: i === 0,
                          isGroupEnd: i === currentGroup.length - 1,
                        });
                      });
                    }
                  }
                  currentGroup = isMedia ? [message] : [];
                  if (!isMedia) {
                    groupedMessages.push({ message, isGroupStart: true, isGroupEnd: true });
                  }
                }
              });
              
              if (currentGroup.length > 0) {
                if (currentGroup[0].type === "image" || currentGroup[0].type === "video") {
                  groupedMessages.push({
                    message: currentGroup[0],
                    isGroupStart: true,
                    isGroupEnd: true,
                    groupedMedia: currentGroup,
                  });
                } else {
                  currentGroup.forEach((m, i) => {
                    groupedMessages.push({
                      message: m,
                      isGroupStart: i === 0,
                      isGroupEnd: i === currentGroup.length - 1,
                    });
                  });
                }
              }
              
                return groupedMessages.map(({ message, isGroupStart, isGroupEnd, groupedMedia }, index) => {
                const prev = index > 0 ? groupedMessages[index - 1].message : null;
                const showDate = !prev || formatDateSeparator(message.createdAt) !== formatDateSeparator(prev.createdAt);
                const isHighlighted = isMessageHighlighted(message);
                return (
                  <div key={message._id}>
                    {showDate && (
                      <div className="flex items-center justify-center py-6">
                        <span className="rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400 shadow-sm">
                          {formatDateSeparator(message.createdAt)}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      message={message}
                      isOwnMessage={getSenderId(message.senderId) === currentUserId}
                      currentUserId={currentUserId}
                      showSenderName={chat.isGroup && isGroupStart && (!prev || getSenderId(prev.senderId) !== getSenderId(message.senderId))}
                      onReact={(msg, emoji) => onReact?.(msg._id, emoji)}
                      onDelete={(msg, scope) => onDeleteMessage?.(msg._id, scope)}
                      onReply={() => setReplyTarget(message)}
                      isGroupStart={isGroupStart}
                      isGroupEnd={isGroupEnd}
                      isHighlighted={isHighlighted}
                      isSelected={selectedMessages.has(message._id)}
                      onSelect={() => toggleMessageSelection(message._id)}
                      isSelectionMode={isSelectionMode}
                      groupedMedia={groupedMedia}
                      isGroup={chat.isGroup}
                      chatParticipants={chat.participants}
                    />
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      <footer className="z-30 shrink-0 border-t border-slate-200/70 bg-[#f8f9fb]/80 p-4 pb-safe backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 sm:p-6">
        <div className="relative mx-auto max-w-[700px]">
          <AnimatePresence>
            {replyTarget && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs shadow-sm ring-1 ring-black/5 dark:bg-slate-900"
              >
                <div className="truncate border-l-[3px] border-[#6d7af7] pl-3">
                  <p className="font-bold text-[#6d7af7] mb-0.5 uppercase tracking-wider text-[10px]">Replying to</p>
                  <p className="truncate text-slate-500 dark:text-slate-400 font-medium italic">{replyTarget.content}</p>
                </div>
                <button onClick={() => setReplyTarget(null)} className="p-2 ml-2 text-slate-400 hover:text-rose-500 transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {mediaTransfer?.isUploading && (
            <div className="mb-3 rounded-2xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-600">
                    <RefreshCw className="h-4 w-4 animate-spin-slow" />
                  </div>
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate max-w-[150px] sm:max-w-[250px]">
                    {mediaTransfer.fileName || "Uploading..."}
                  </span>
                </div>
                <span className="text-[11px] font-black text-blue-600 tracking-tighter uppercase">{mediaTransfer.progress}%</span>
              </div>
              <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden dark:bg-blue-900/50 ring-1 ring-blue-200/50">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"
                  style={{ width: `${mediaTransfer.progress}%` }}
                />
              </div>
            </div>
          )}

          {mediaTransfer?.error && (
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-red-50 px-4 py-3 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-bold text-red-700 dark:text-red-300 truncate max-w-[200px]">
                  {mediaTransfer.error}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {mediaTransfer.canRetry && onRetryMedia && (
                  <button 
                    onClick={onRetryMedia}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-[10px] font-black uppercase text-white hover:bg-red-700 shadow-sm"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                )}
                {onDismissMedia && (
                  <button 
                    onClick={onDismissMedia}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="relative flex items-end gap-2 sm:gap-3 rounded-[28px] bg-white p-2 pr-2 shadow-sm ring-1 ring-black/5 dark:bg-slate-900">
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker
                  theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                  onEmojiClick={(emojiData) => {
                    setDraft((prev) => prev + emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  height={350}
                  width={320}
                />
              </div>
            )}
            <div className="flex items-center gap-1">
              {/* Attach Menu */}
              <div className="relative group/tools">
                <button 
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all active:scale-95"
                  title="Attach"
                >
                  <Plus className="h-5 w-5" />
                </button>
                
                <div className={cn(
                  "absolute bottom-full left-0 mb-2 flex-col gap-1 rounded-xl bg-white dark:bg-slate-800 p-1.5 shadow-xl ring-1 ring-black/5",
                  "opacity-0 invisible group-hover/tools:opacity-100 group-hover/tools:visible transition-all duration-150",
                  "flex"
                )}>
                  <button onClick={() => { videoInputRef.current?.click(); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <Video className="h-4 w-4" /> Video
                  </button>
                  <button onClick={() => { imageInputRef.current?.click(); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <ImagePlus className="h-4 w-4" /> Photo
                  </button>
                  <button onClick={() => { galleryInputRef.current?.click(); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <Images className="h-4 w-4" /> Gallery
                  </button>
                  <button onClick={() => { fileInputRef.current?.click(); }} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <Paperclip className="h-4 w-4" /> File
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95",
                  showEmojiPicker 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                    : "bg-slate-50 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:bg-slate-700/50"
                )}
                title="Emoji"
              >
                <SmilePlus className="h-5 w-5" />
              </button>
            </div>

            {isRecording ? (
              <div className="flex flex-1 items-center h-11 gap-3 px-3 rounded-2xl bg-red-50 dark:bg-red-900/20">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Recording</span>
                </div>
                <span className="text-xs font-black tabular-nums text-slate-600 dark:text-slate-300">
                  {formatDuration(recordingDuration)}
                </span>
                <button
                  onClick={stopRecording}
                  className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-transform active:scale-90"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              </div>
            ) : (
              <div className="flex-1 min-h-[44px] flex items-center mb-1">
                <textarea
                  value={draft}
                  onChange={(e) => { setDraft(e.target.value); onTyping?.(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); } }}
                  placeholder="Type Your Message"
                  rows={1}
                  className="w-full bg-transparent px-2 py-2 text-[15px] sm:text-[16px] font-medium outline-none dark:text-slate-100 resize-none max-h-32"
                  style={{ height: "auto" }}
                />
              </div>
            )}

            <div className="p-0.5">
              {isRecording ? null : (
                draft.trim() ? (
                    <button
                      onClick={submitMessage}
                      disabled={!draft.trim() && !isSendingMedia}
                      className={cn(
                        "h-11 w-11 flex items-center justify-center rounded-full transition-all shadow-lg active:scale-90",
                        currentThemeClass,
                        "text-white shadow-blue-500/30"
                      )}
                    >
                    <SendHorizonal className="h-5.5 w-5.5 transform rotate-[-45deg] translate-x-0.5" />
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={isSendingMedia}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all active:scale-95 dark:bg-slate-700/50"
                    title="Record Voice"
                  >
                    <Mic className="h-5.5 w-5.5" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </footer>

      <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={(e) => { handleSendFile(e.target.files?.[0] || null); e.target.value = ""; }} />
      <input type="file" hidden ref={galleryInputRef} accept="image/*" multiple onChange={(e) => { handleSendMultipleFiles(e.target.files); e.target.value = ""; }} />
      <input type="file" hidden ref={fileInputRef} onChange={(e) => { handleSendFile(e.target.files?.[0] || null); e.target.value = ""; }} />
      <input type="file" hidden ref={videoInputRef} accept="video/*" onChange={(e) => { handleSendFile(e.target.files?.[0] || null); e.target.value = ""; }} />

      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Messages"
        message={`Delete ${selectedMessages.size} message(s) for everyone? This cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => {
          onDeleteMessage?.(Array.from(selectedMessages)[0], "everyone");
          handleClearSelected();
          setConfirmDeleteOpen(false);
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmLeaveOpen}
        title="Leave Group"
        message="Are you sure you want to leave this group? You will no longer receive messages."
        variant="warning"
        confirmLabel="Leave"
        onConfirm={() => {
          onLeaveGroup?.(chat._id);
          setConfirmLeaveOpen(false);
        }}
        onCancel={() => setConfirmLeaveOpen(false)}
      />

      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Clear Chat"
        message="Clear all messages in this chat? This only removes messages for you."
        variant="warning"
        confirmLabel="Clear"
        onConfirm={() => {
          onClearChat?.(chat._id);
          setConfirmClearOpen(false);
        }}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </section>
  );
};
