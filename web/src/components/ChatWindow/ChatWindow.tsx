"use client";

import { Avatar } from "@/components/ui/avatar";
import { useEffect, useMemo, useRef, useState } from "react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Square,
  Video,
  Images,
  Plus,
  Users,
  LogOut,
  MessageCircle,
  ArrowLeft,
  Search,
  MoreHorizontal,
  X,
  CheckSquare,
  Trash2,
  RefreshCw,
  AlertCircle,
  ImagePlus,
  Smile,
  Mic,
  SendHorizontal,
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
  isOnline,
  typingLabel,
  onOpenUserProfile,
  mediaTransfer,
  onRetryMedia,
  onDismissMedia,
  onLeaveGroup,
  onOpenGroupInfo,
  onClearChat,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

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

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
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
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    if (showHeaderMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showHeaderMenu]);

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const attachBtn = document.getElementById("attach-btn");
      if (attachBtn && attachBtn.contains(event.target as Node)) return;
      if (showAttachMenu) {
        setShowAttachMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAttachMenu]);

  const filteredMessages = messages;

  const groupedMessages = useMemo(() => {
    const grouped: { message: Message; isGroupStart: boolean; isGroupEnd: boolean; groupedMedia?: Message[] }[] = [];
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
            grouped.push({
              message: currentGroup[0],
              isGroupStart: true,
              isGroupEnd: true,
              groupedMedia: currentGroup,
            });
          } else {
            currentGroup.forEach((m, i) => {
              grouped.push({
                message: m,
                isGroupStart: i === 0,
                isGroupEnd: i === currentGroup.length - 1,
              });
            });
          }
        }
        currentGroup = isMedia ? [message] : [];
        if (!isMedia) {
          grouped.push({ message, isGroupStart: true, isGroupEnd: true });
        }
      }
    });
    
    if (currentGroup.length > 0) {
      if (currentGroup[0].type === "image" || currentGroup[0].type === "video") {
        grouped.push({
          message: currentGroup[0],
          isGroupStart: true,
          isGroupEnd: true,
          groupedMedia: currentGroup,
        });
      } else {
        currentGroup.forEach((m, i) => {
          grouped.push({
            message: m,
            isGroupStart: i === 0,
            isGroupEnd: i === currentGroup.length - 1,
          });
        });
      }
    }
    
    return grouped;
  }, [filteredMessages]);

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
    setShowAttachMenu(false);
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
    setShowAttachMenu(false);
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
      <section className="flex h-full flex-col items-center justify-center bg-[#f8f9fb] p-6 text-center dark:bg-slate-950 sm:bg-transparent sm:dark:bg-transparent">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <MessageCircle className="h-7 w-7 text-slate-300" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">No conversation selected</h2>
        <p className="mt-1.5 max-w-[200px] text-sm text-slate-500">Select a chat to start messaging</p>
      </section>
    );
  }

  const chatTitle = chat.isGroup ? chat.groupName : chat.otherParticipant?.name;
  const chatAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;

  return (
    <section className="relative flex h-full flex-col overflow-hidden bg-[#efeae2] dark:bg-[#0b141a]">
      {/* Compact Header - 56px mobile */}
      <header className="z-30 shrink-0 bg-[#f0f2f5] dark:bg-[#1f232b] border-b border-slate-200/50 dark:border-slate-700/50">
        {/* Mobile Header */}
        <div className="flex h-14 items-center px-2 sm:px-4">
          {/* Left: Back + Avatar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 active:scale-95 sm:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            <button
              type="button"
              className="group/header relative flex items-center gap-2 sm:gap-2.5"
              onClick={() => {
                if (chat.isGroup) {
                  onOpenGroupInfo?.(chat._id);
                } else if (chat.otherParticipant && onOpenUserProfile) {
                  onOpenUserProfile(chat.otherParticipant);
                }
              }}
            >
              <div className="relative">
                <Avatar
                  src={chatAvatar}
                  name={chatTitle || "?"}
                  className="h-9 w-9 rounded-full sm:h-10 sm:w-10"
                />
                {!chat.isGroup && isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#f0f2f5] bg-emerald-500 dark:border-[#1f232b]" />
                )}
              </div>
              <div className="hidden sm:block">
                <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-tight">
                  {chatTitle}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {typingLabel
                    ? typingLabel
                    : chat.isGroup
                      ? `${(chat.participants || []).filter((p) => p._id !== currentUserId).length} members`
                      : isOnline
                        ? "Online"
                        : "Offline"}
                </p>
              </div>
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Mobile: Show typing/status */}
            {typingLabel && (
              <p className="hidden max-w-[80px] truncate text-xs text-slate-500 sm:block sm:max-w-[120px]">
                {typingLabel}
              </p>
            )}
            
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 active:scale-95 dark:text-slate-300"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-slate-600 active:scale-95 dark:text-slate-300"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-200/50 dark:border-slate-700/50 px-3 py-2 sm:px-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full rounded-full bg-white px-4 py-2 pl-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                )}
              </div>
              {searchQuery ? (
                <p className="mt-1.5 px-2 text-[11px] text-slate-500">{searchMatchCount} results</p>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Menu Dropdown */}
        <AnimatePresence>
          {showHeaderMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowHeaderMenu(false)} />
              <motion.div
                ref={headerMenuRef}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="absolute left-1/2 top-full z-50 w-[280px] -translate-x-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800 ring-1 ring-black/5"
              >
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setShowHeaderMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-700"
                  >
                    <CheckSquare className="h-5 w-5 text-blue-500" />
                    {isSelectionMode ? "Cancel Selection" : "Select Messages"}
                    {isSelectionMode && selectedMessages.size > 0 && ` (${selectedMessages.size})`}
                  </button>
                  {chat.isGroup && (
                    <button
                      onClick={() => {
                        onOpenGroupInfo?.(chat._id);
                        setShowHeaderMenu(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-700"
                    >
                      <Users className="h-5 w-5 text-emerald-500" />
                      Group Info
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setConfirmClearOpen(true);
                      setShowHeaderMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-700"
                  >
                    <Trash2 className="h-5 w-5 text-amber-500" />
                    Clear Chat
                  </button>
                </div>
                {chat.isGroup && (
                  <div className="border-t border-slate-100 p-1 dark:border-slate-700">
                    <button
                      onClick={() => {
                        setConfirmLeaveOpen(true);
                        setShowHeaderMenu(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 active:bg-red-50 dark:active:bg-red-900/20"
                    >
                      <LogOut className="h-5 w-5" />
                      Leave Group
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3"
      >
        {/* Loading */}
        {isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-500" />
          </div>
        ) : (
          <div className="space-y-1 sm:space-y-0.5">
            {groupedMessages.map(({ message, isGroupStart, isGroupEnd, groupedMedia }, index) => {
              const prev = index > 0 ? groupedMessages[index - 1].message : null;
              const showDate = !prev || formatDateSeparator(message.createdAt) !== formatDateSeparator(prev.createdAt);
              const isHighlighted = isMessageHighlighted(message);
              return (
                <div key={message._id}>
                  {showDate && (
                    <div className="flex items-center justify-center py-4 sm:py-6">
                      <span className="rounded-full bg-[#d9e0e7]/70 px-4 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-sm dark:bg-slate-800/70 dark:text-slate-400">
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
            })}
          </div>
        )}
      </div>

      {/* Input Bar - Sticky Bottom */}
      <footer className="shrink-0 px-2 pb-safe pt-2 sm:px-4 sm:pb-4 bg-[#f0f2f5] dark:bg-[#1f232b]">
        {/* Reply Preview */}
        <AnimatePresence>
          {replyTarget && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-800"
            >
              <div className="h-6 w-1 rounded-full bg-blue-500" />
              <p className="flex-1 truncate text-xs text-slate-500 dark:text-slate-400">
                Reply to: <span className="italic">{replyTarget.content}</span>
              </p>
              <button 
                onClick={() => setReplyTarget(null)} 
                className="p-1 text-slate-400 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        {mediaTransfer?.isUploading && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm dark:bg-slate-800">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            <span className="flex-1 truncate text-xs font-medium text-slate-600 dark:text-slate-300">
              {mediaTransfer.fileName || "Uploading..."}
            </span>
            <span className="text-xs font-bold text-blue-500">{mediaTransfer.progress}%</span>
          </div>
        )}

        {/* Error Banner */}
        {mediaTransfer?.error && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            <span className="flex-1 truncate text-xs font-medium text-red-600 dark:text-red-300">
              {mediaTransfer.error}
            </span>
            {mediaTransfer.canRetry && onRetryMedia && (
              <button onClick={onRetryMedia} className="text-xs font-bold text-red-500">
                Retry
              </button>
            )}
            {onDismissMedia && (
              <button onClick={onDismissMedia} className="p-1 text-red-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-2">
          {/* Attach Button */}
          <div className="relative">
            <button
              id="attach-btn"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9e0e7] text-slate-500 active:scale-95 dark:bg-slate-700 dark:text-slate-300"
            >
              <Plus className="h-5 w-5" />
            </button>

            {/* Attach Menu */}
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 overflow-hidden rounded-2xl bg-white p-2 shadow-xl dark:bg-slate-800 ring-1 ring-black/5"
                >
                  <button
                    onClick={() => { setShowAttachMenu(false); videoInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-700"
                  >
                    <Video className="h-5 w-5 text-purple-500" />
                    Video
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); imageInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-700"
                  >
                    <ImagePlus className="h-5 w-5 text-blue-500" />
                    Photo
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); galleryInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-700"
                  >
                    <Images className="h-5 w-5 text-green-500" />
                    Gallery
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 active:bg-slate-100 dark:text-slate-200 dark:active:bg-slate-700"
                  >
                    <Paperclip className="h-5 w-5 text-slate-500" />
                    File
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Input / Recording */}
          <div className="flex flex-1 items-end gap-2 rounded-full bg-white px-4 py-2.5 shadow-sm dark:bg-slate-800">
            {/* Emoji Button */}
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 active:scale-95"
            >
              <Smile className="h-5 w-5" />
            </button>

            {/* Textarea */}
            {isRecording ? (
              <div className="flex flex-1 items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Recording {formatDuration(recordingDuration)}
                </span>
              </div>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => { setDraft(e.target.value); onTyping?.(); }}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitMessage(); } }}
                placeholder="Message"
                rows={1}
                className="max-h-28 flex-1 bg-transparent py-0.5 text-[15px] text-slate-900 placeholder:text-slate-400 outline-none dark:text-white resize-none"
              />
            )}

            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker
                  theme={isDarkMode ? Theme.DARK : Theme.LIGHT}
                  onEmojiClick={(emojiData) => {
                    setDraft((prev) => prev + emojiData.emoji);
                  }}
                  height={350}
                  width={320}
                />
              </div>
            )}
          </div>

          {/* Send / Mic Button */}
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500 text-white active:scale-95"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : draft.trim() ? (
            <button
              onClick={submitMessage}
              disabled={!draft.trim() && !isSendingMedia}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full active:scale-95",
                currentThemeClass,
                "text-white"
              )}
            >
              <SendHorizontal className="h-5 w-5 -rotate-45" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={isSendingMedia}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9e0e7] text-slate-500 active:scale-95 dark:bg-slate-700 dark:text-slate-300"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
      </footer>

      {/* Hidden File Inputs */}
      <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={(e) => { handleSendFile(e.target.files?.[0] || null); e.target.value = ""; }} />
      <input type="file" hidden ref={galleryInputRef} accept="image/*" multiple onChange={(e) => { handleSendMultipleFiles(e.target.files); e.target.value = ""; }} />
      <input type="file" hidden ref={fileInputRef} onChange={(e) => { handleSendFile(e.target.files?.[0] || null); e.target.value = ""; }} />
      <input type="file" hidden ref={videoInputRef} accept="video/*" onChange={(e) => { handleSendFile(e.target.files?.[0] || null); e.target.value = ""; }} />

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Delete Messages"
        message={`Delete ${selectedMessages.size} message(s)? This cannot be undone.`}
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
        message="Are you sure you want to leave this group?"
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
        message="Clear all messages? This only removes messages for you."
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
