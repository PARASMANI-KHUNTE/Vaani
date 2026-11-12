"use client";

import { Avatar } from "@/components/ui/avatar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Pencil,
  Compass,
  MessageSquare,
} from "lucide-react";
import { MessageBubble } from "@/components/MessageBubble/MessageBubble";
import { MediaPreview, type PreviewItem } from "@/components/MediaPreview/MediaPreview";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ForwardModal } from "@/components/ForwardModal";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
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
  isLoadingOlder?: boolean;
  hasMoreMessages?: boolean;
  onLoadOlderMessages?: () => void;
  onSendMessage: (content: string, replyToId?: string | null) => Promise<void>;
  onEditMessage?: (messageId: string, content: string) => Promise<void>;
  onForwardMessage?: (messageId: string, targetChatId: string) => Promise<void>;
  chats?: Chat[];
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
  isLoadingOlder,
  hasMoreMessages,
  onLoadOlderMessages,
  onSendMessage,
  onEditMessage,
  onForwardMessage,
  chats,
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
  onOpenNewChat,
  navigate,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    file: File;
    url: string;
    kind: "image" | "video" | "audio" | "file";
  } | null>(null);
  const [pendingBatch, setPendingBatch] = useState<
    { file: File; url: string; kind: "image" | "video" | "audio" | "file" }[] | null
  >(null);
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
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const baseDraftRef = useRef("");

  const {
    isSupported: isSpeechSupported,
    isListening: isSpeechListening,
    errorMessage: speechErrorMessage,
    startListening: startSpeechListening,
    stopListening: stopSpeechListening,
    clearError: clearSpeechError,
  } = useSpeechToText({
    onTranscriptChange: (text) => {
      const base = baseDraftRef.current;
      const prefix = base ? (base.endsWith(" ") ? base : base + " ") : "";
      setDraft(prefix + text);
      onTyping?.();
    },
  });

  const handleToggleDictation = () => {
    if (isSpeechListening) {
      stopSpeechListening();
    } else {
      baseDraftRef.current = draft;
      startSpeechListening();
    }
  };

  useEffect(() => {
    if (isSpeechListening) {
      stopSpeechListening();
    }
  }, [chat?._id, isSpeechListening, stopSpeechListening]);

  const themeConfig: Record<string, string> = {
    default: "bg-brand hover:bg-brand-hover",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    rose: "bg-rose-600 hover:bg-rose-700",
    amber: "bg-amber-600 hover:bg-amber-700",
    violet: "bg-violet-600 hover:bg-violet-700",
    cyan: "bg-cyan-600 hover:bg-cyan-700",
    dark: "bg-slate-800 hover:bg-slate-700",
  };

  const currentTheme = chat?.theme || localStorage.getItem("chatTheme") || "default";
  const currentThemeClass = themeConfig[currentTheme] || themeConfig.default;
  const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const emojiButtonRef = useRef<HTMLButtonElement | null>(null);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPrependRef = useRef<{ scrollHeight: number } | null>(null);

  const handleLoadOlderMessages = () => {
    const container = scrollContainerRef.current;
    if (!container || isLoadingOlder || !onLoadOlderMessages) {
      return;
    }
    // Remember the height so the viewport stays anchored after older
    // messages are prepended.
    pendingPrependRef.current = { scrollHeight: container.scrollHeight };
    onLoadOlderMessages();
  };

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
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const pendingPrepend = pendingPrependRef.current;
    if (pendingPrepend) {
      pendingPrependRef.current = null;
      const addedHeight = container.scrollHeight - pendingPrepend.scrollHeight;
      if (addedHeight > 0) {
        container.scrollTop += addedHeight;
      }
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (emojiButtonRef.current && emojiButtonRef.current.contains(target)) {
        return;
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(target)) {
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

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
  };

  const getMediaKind = (file: File): "image" | "video" | "audio" | "file" => {
    const mime = (file.type || "").toLowerCase();
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return "image";
    if (mime.startsWith("video/") || ["mp4", "mov", "ogg"].includes(ext)) return "video";
    if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "aac", "opus", "oga"].includes(ext)) return "audio";
    return "file";
  };

  const clearPendingMedia = () => {
    setPendingMedia((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  };

  const clearPendingBatch = () => {
    setPendingBatch((prev) => {
      if (prev) {
        prev.forEach((item) => URL.revokeObjectURL(item.url));
      }
      return null;
    });
  };

  const sendPendingMedia = async () => {
    if (!pendingMedia || !onSendMedia) return;
    setIsSendingMedia(true);
    setShowAttachMenu(false);
    try {
      await onSendMedia({
        file: pendingMedia.file,
        content: draft.trim() || undefined,
        replyToId: replyTarget?._id || null,
      });
      setDraft("");
      setReplyTarget(null);
      setShowEmojiPicker(false);
      clearPendingMedia();
    } finally {
      setIsSendingMedia(false);
    }
  };

  const sendPendingBatch = async () => {
    if (!pendingBatch || !onSendMedia) return;
    const batchToSend = [...pendingBatch];
    setIsSendingMedia(true);
    setShowAttachMenu(false);
    setPendingBatch(null);
    try {
      await Promise.all(batchToSend.map((item) => onSendMedia({ file: item.file })));
      setDraft("");
      setReplyTarget(null);
      setShowEmojiPicker(false);
    } catch {
      // Error handled by onSendMedia
    } finally {
      setIsSendingMedia(false);
    }
  };

  const submitMessage = async () => {
    if (isSpeechListening) {
      stopSpeechListening();
    }
    if (editingMessage) {
      const trimmed = draft.trim();
      if (!trimmed) return;
      const target = editingMessage;
      setEditingMessage(null);
      setDraft("");
      if (onEditMessage) {
        await onEditMessage(target._id, trimmed);
      }
      return;
    }
    if (pendingMedia) {
      await sendPendingMedia();
      return;
    }
    if (pendingBatch) {
      await sendPendingBatch();
      return;
    }
    const trimmed = draft.trim();
    if (!trimmed) return;
    setDraft("");
    await onSendMessage(trimmed, replyTarget?._id || null);
    setReplyTarget(null);
  };

  const handleSendFile = async (file: File | null) => {
    if (!file || !onSendMedia) return;
    setShowAttachMenu(false);
    clearPendingBatch();
    setPendingMedia((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return {
        file,
        url: URL.createObjectURL(file),
        kind: getMediaKind(file),
      };
    });
  };

  const handleSendMultipleFiles = async (files: FileList | null) => {
    if (!files || !onSendMedia) return;
    setShowAttachMenu(false);
    clearPendingMedia();
    clearPendingBatch();
    const nextBatch = Array.from(files).map((file) => ({
      file,
      url: URL.createObjectURL(file),
      kind: getMediaKind(file),
    }));
    setPendingBatch(nextBatch);
  };

  useEffect(() => {
    return () => {
      if (pendingMedia) {
        URL.revokeObjectURL(pendingMedia.url);
      }
    };
  }, [pendingMedia]);

  useEffect(() => {
    return () => {
      if (pendingBatch) {
        pendingBatch.forEach((item) => URL.revokeObjectURL(item.url));
      }
    };
  }, [pendingBatch]);

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

  const handleMediaPreview = useCallback((items: PreviewItem[], startIndex: number) => {
    setPreviewItems(items);
    setPreviewIndex(startIndex);
    setIsPreviewOpen(true);
  }, []);

  if (!chat) {
    return (
      <section className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-canvas p-6 text-center">
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/10 blur-[110px]" />
        <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface/80 p-8 shadow-soft backdrop-blur-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/15">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-fg">Welcome to LinkUp</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Select a conversation from the sidebar or start a new message to begin chatting in real-time.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {onOpenNewChat && (
              <button
                type="button"
                onClick={onOpenNewChat}
                className="btn-primary w-full sm:w-auto"
              >
                <MessageSquare className="h-4 w-4" />
                New Message
              </button>
            )}
            {navigate && (
              <button
                type="button"
                onClick={() => navigate("/explore")}
                className="btn-secondary w-full sm:w-auto"
              >
                <Compass className="h-4 w-4" />
                Explore People
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const chatTitle = chat.isGroup ? chat.groupName : chat.otherParticipant?.name;
  const chatAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;
  const wallpaper = chat.wallpaper || null;
  const wallpaperIsUrl = Boolean(wallpaper && /^https?:\/\//i.test(wallpaper));
  const wallpaperClass = wallpaper && !wallpaperIsUrl ? `wallpaper-${wallpaper}` : "";
  const wallpaperStyle = wallpaperIsUrl
    ? {
        backgroundImage: `url("${wallpaper}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : undefined;

  return (
    <section
      className={cn("relative flex h-full flex-col overflow-hidden bg-canvas", wallpaperClass)}
      style={wallpaperStyle}
    >
      {/* Compact Header - 56px mobile */}
      <header className="relative z-30 shrink-0 border-b border-line bg-surface/80 backdrop-blur-md">
        <div className="relative mx-auto w-full max-w-3xl">
        {/* Mobile Header */}
        <div className="flex h-14 items-center px-2 sm:px-4">
          {/* Left: Back + Avatar */}
          <div className="flex items-center gap-1 sm:gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="icon-btn sm:hidden"
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            <button
              type="button"
              className="group/header relative flex items-center gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-subtle/70 sm:gap-2.5"
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
                  className="h-9 w-9 rounded-full shadow-sm sm:h-10 sm:w-10"
                />
                {!chat.isGroup && isOnline && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500" />
                )}
              </div>
              <div className="hidden min-w-0 text-left sm:block">
                <h3 className="truncate text-[15px] font-semibold leading-tight text-fg">
                  {chatTitle}
                </h3>
                <p className={cn(
                  "truncate text-[11px] leading-tight",
                  typingLabel ? "font-medium text-brand" : "text-muted"
                )}>
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
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="icon-btn"
              aria-label="Search messages"
              aria-pressed={showSearch}
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="icon-btn"
              aria-label="Conversation options"
              aria-expanded={showHeaderMenu}
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
              className="overflow-hidden border-t border-line px-3 py-2 sm:px-4"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full rounded-full border border-line bg-subtle/60 px-4 py-2 pl-10 text-sm text-fg outline-none transition-all placeholder:text-faint focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/12"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-faint transition-colors hover:text-fg"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchQuery ? (
                <p className="mt-1.5 px-2 text-[11px] font-medium text-muted">{searchMatchCount} results</p>
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-2 top-[3.5rem] z-50 w-[280px] overflow-hidden rounded-2xl border border-line bg-elevated shadow-float"
              >
                <div className="p-1">
                  <button
                    onClick={() => {
                      setIsSelectionMode(!isSelectionMode);
                      setShowHeaderMenu(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle active:bg-subtle"
                  >
                    <CheckSquare className="h-5 w-5 text-brand" />
                    {isSelectionMode ? "Cancel Selection" : "Select Messages"}
                    {isSelectionMode && selectedMessages.size > 0 && ` (${selectedMessages.size})`}
                  </button>
                  {chat.isGroup && (
                    <button
                      onClick={() => {
                        onOpenGroupInfo?.(chat._id);
                        setShowHeaderMenu(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle active:bg-subtle"
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
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle active:bg-subtle"
                  >
                    <Trash2 className="h-5 w-5 text-amber-500" />
                    Clear Chat
                  </button>
                </div>
                {chat.isGroup && (
                  <div className="border-t border-line p-1">
                    <button
                      onClick={() => {
                        setConfirmLeaveOpen(true);
                        setShowHeaderMenu(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-500/10 active:bg-rose-500/15"
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
        </div>
      </header>

      {/* Messages Area */}
      <div 
        ref={scrollContainerRef} 
        className={cn("flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3 transition-colors", wallpaperClass)}
      >
        {/* Loading */}
        {isLoading && messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-brand" />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-1 sm:space-y-0.5">
            {(hasMoreMessages || isLoadingOlder) && onLoadOlderMessages ? (
              <div className="flex justify-center py-3">
                <button
                  type="button"
                  onClick={handleLoadOlderMessages}
                  disabled={isLoadingOlder}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/80 px-3.5 py-1.5 text-[11px] font-semibold text-muted shadow-sm backdrop-blur-sm transition-colors hover:text-fg disabled:cursor-wait disabled:opacity-70"
                >
                  {isLoadingOlder ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-line border-t-brand" />
                      Loading older messages
                    </>
                  ) : (
                    "Load older messages"
                  )}
                </button>
              </div>
            ) : null}
            {groupedMessages.map(({ message, isGroupStart, isGroupEnd, groupedMedia }, index) => {
              const prev = index > 0 ? groupedMessages[index - 1].message : null;
              const showDate = !prev || formatDateSeparator(message.createdAt) !== formatDateSeparator(prev.createdAt);
              const isHighlighted = isMessageHighlighted(message);
              return (
                <div key={message._id}>
                  {showDate && (
                    <div className="flex items-center justify-center py-4 sm:py-6">
                      <span className="rounded-full border border-line bg-surface/70 px-4 py-1 text-[11px] font-semibold text-muted backdrop-blur-sm">
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
                    onEdit={(msg) => {
                      setEditingMessage(msg);
                      setDraft(msg.content);
                    }}
                    onForward={(msg) => setForwardingMessage(msg)}
                    onReply={() => setReplyTarget(message)}
                    onMediaPreview={handleMediaPreview}
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
      <footer className="shrink-0 border-t border-line bg-surface/85 px-2.5 pb-2.5 pt-2 backdrop-blur-md sm:px-4 sm:pb-4">
        <div className="mx-auto w-full max-w-3xl">
        {/* Voice-to-Text Dictating Banner */}
        <AnimatePresence>
          {isSpeechListening && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center justify-between rounded-xl border border-brand/20 bg-brand/[0.07] px-3 py-2 text-xs text-brand shadow-sm backdrop-blur-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
                </span>
                <div className="truncate">
                  <span className="font-semibold">Voice Dictation Active:</span>
                  <span className="ml-1 text-muted">Speak into your microphone to transcribe text</span>
                </div>
              </div>
              <div className="ml-2 flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={stopSpeechListening}
                  className="rounded-lg bg-brand px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speech Recognition Error Banner */}
        <AnimatePresence>
          {speechErrorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center justify-between rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 shadow-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="truncate">{speechErrorMessage}</span>
              </div>
              <button
                type="button"
                onClick={clearSpeechError}
                className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 transition-colors"
                title="Dismiss error"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Editing Message Banner */}
        <AnimatePresence>
          {editingMessage && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center justify-between rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2 text-muted">
                <Pencil className="h-4 w-4 shrink-0 text-brand" />
                <div className="truncate">
                  <span className="font-semibold text-fg">Editing message:</span>
                  <span className="ml-1.5 truncate italic opacity-80">"{editingMessage.content}"</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setEditingMessage(null); setDraft(""); }}
                className="ml-2 rounded-lg p-1 text-muted transition-colors hover:bg-subtle hover:text-fg"
                title="Cancel edit"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reply Preview */}
        <AnimatePresence>
          {replyTarget && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-2 flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-sm"
            >
              <div className="h-6 w-1 rounded-full bg-brand" />
              <p className="flex-1 truncate text-xs text-muted">
                Reply to: <span className="italic">{replyTarget.content}</span>
              </p>
              <button
                onClick={() => setReplyTarget(null)}
                className="rounded-md p-1 text-faint transition-colors hover:bg-subtle hover:text-fg active:scale-95"
                aria-label="Cancel reply"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        {mediaTransfer?.isUploading && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <RefreshCw className="h-4 w-4 animate-spin text-brand" />
            <span className="flex-1 truncate text-xs font-medium text-muted">
              {mediaTransfer.fileName || "Uploading..."}
            </span>
            <span className="text-xs font-bold text-brand">{mediaTransfer.progress}%</span>
          </div>
        )}

        {/* Error Banner */}
        {mediaTransfer?.error && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span className="flex-1 truncate text-xs font-medium text-rose-600 dark:text-rose-300">
              {mediaTransfer.error}
            </span>
            {mediaTransfer.canRetry && onRetryMedia && (
              <button onClick={onRetryMedia} className="text-xs font-bold text-rose-500 hover:underline">
                Retry
              </button>
            )}
            {onDismissMedia && (
              <button onClick={onDismissMedia} className="p-1 text-rose-400 hover:text-rose-500" aria-label="Dismiss">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Pending Media Preview */}
        {pendingMedia && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-subtle">
              {pendingMedia.kind === "image" ? (
                <img src={pendingMedia.url} alt="Preview" className="h-full w-full object-cover" />
              ) : pendingMedia.kind === "video" ? (
                <video
                  src={pendingMedia.url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : pendingMedia.kind === "audio" ? (
                <Mic className="h-5 w-5 text-muted" />
              ) : (
                <Paperclip className="h-5 w-5 text-muted" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-fg">
                {pendingMedia.file.name}
              </div>
              {pendingMedia.kind === "audio" && (
                <audio
                  controls
                  src={pendingMedia.url}
                  preload="metadata"
                  className="mt-2 h-8 w-full max-w-[260px]"
                />
              )}
              <div className="mt-0.5 text-[11px] text-muted">
                {pendingMedia.kind.toUpperCase()} • {formatBytes(pendingMedia.file.size)}
              </div>
            </div>
            <button
              type="button"
              onClick={clearPendingMedia}
              className="rounded-lg px-2 py-1 text-xs font-bold text-muted transition-colors hover:bg-subtle hover:text-fg"
              disabled={isSendingMedia || mediaTransfer?.isUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={sendPendingMedia}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
              disabled={isSendingMedia || mediaTransfer?.isUploading}
            >
              Send
            </button>
          </div>
        )}

        {pendingBatch && pendingBatch.length > 0 && (
          <div className="mb-2 rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-fg">
                  {pendingBatch.length} files selected
                </div>
                <div className="mt-0.5 text-[11px] text-muted">
                  Click send to upload and share
                </div>
              </div>
              <button
                type="button"
                onClick={clearPendingBatch}
                className="rounded-lg px-2 py-1 text-xs font-bold text-muted transition-colors hover:bg-subtle hover:text-fg"
                disabled={isSendingMedia || mediaTransfer?.isUploading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendPendingBatch}
                className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                disabled={isSendingMedia || mediaTransfer?.isUploading}
              >
                Send all
              </button>
            </div>

            <div className="mt-2 grid grid-cols-6 gap-1">
              {pendingBatch.slice(0, 6).map((item) => (
                <div
                  key={`${item.file.name}-${item.file.size}-${item.url}`}
                  className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-subtle"
                  title={item.file.name}
                >
                  {item.kind === "image" ? (
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  ) : item.kind === "video" ? (
                    <Video className="h-5 w-5 text-muted" />
                  ) : (
                    <Paperclip className="h-5 w-5 text-muted" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-2">
          {/* Attach Button */}
          <div className="relative">
            <button
              id="attach-btn"
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition-colors hover:bg-subtle hover:text-fg active:scale-95"
              title="Attach media or file"
              aria-label="Attach media or file"
              aria-expanded={showAttachMenu}
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
                  className="absolute bottom-full left-0 z-50 mb-2 w-[200px] overflow-hidden rounded-2xl border border-line bg-elevated p-2 shadow-float"
                >
                  <button
                    onClick={() => { setShowAttachMenu(false); videoInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle active:bg-subtle"
                  >
                    <Video className="h-5 w-5 text-purple-500" />
                    Video
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); imageInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle active:bg-subtle"
                  >
                    <ImagePlus className="h-5 w-5 text-brand" />
                    Photo
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); galleryInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle active:bg-subtle"
                  >
                    <Images className="h-5 w-5 text-emerald-500" />
                    Gallery
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle active:bg-subtle"
                  >
                    <Paperclip className="h-5 w-5 text-muted" />
                    File
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text Input / Recording */}
          <div className="flex flex-1 items-end gap-2 rounded-2xl border border-line bg-surface px-2 py-2 shadow-sm transition-all focus-within:border-brand/35 focus-within:ring-2 focus-within:ring-brand/10 sm:rounded-full sm:px-4 sm:py-2.5">
            {/* Emoji Button */}
            <div className="relative shrink-0">
              <button
                ref={emojiButtonRef}
                type="button"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-faint transition-colors hover:bg-subtle hover:text-brand active:scale-95"
                aria-label="Insert emoji"
              >
                <Smile className="h-5 w-5" />
              </button>

              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
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

            {/* Textarea */}
            {isRecording ? (
              <div className="flex flex-1 items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                </span>
                <span className="text-xs font-medium text-muted">
                  Recording {formatDuration(recordingDuration)}
                </span>
              </div>
            ) : (
              <textarea
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (!isSpeechListening) {
                    baseDraftRef.current = e.target.value;
                  }
                  onTyping?.();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitMessage();
                  }
                }}
                placeholder={isSpeechListening ? "Listening... Speak now" : "Message"}
                rows={1}
                className="max-h-28 flex-1 resize-none bg-transparent py-0.5 text-[15px] text-fg outline-none placeholder:text-faint"
              />
            )}

            {/* Voice-to-Text Dictation Button */}
            {!isRecording && (
              <button
                type="button"
                id="voice-dictation-button"
                onClick={handleToggleDictation}
                title={
                  !isSpeechSupported
                    ? "Speech recognition is not supported in this browser"
                    : isSpeechListening
                    ? "Stop voice dictation"
                    : "Voice-to-text dictation (Click to speak)"
                }
                className={cn(
                  "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                  isSpeechListening
                    ? "animate-pulse bg-rose-500 text-white shadow-md ring-2 ring-rose-300 dark:ring-rose-900"
                    : isSpeechSupported
                    ? "text-faint hover:bg-subtle hover:text-brand active:scale-95"
                    : "cursor-not-allowed text-faint/60 opacity-60"
                )}
              >
                {isSpeechListening ? (
                  <span className="relative flex items-center justify-center">
                    <Mic className="h-4 w-4 text-white" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-90" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                  </span>
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>
            )}

          </div>

          {/* Send / Mic Button */}
          {isRecording ? (
            <button
              onClick={stopRecording}
              title="Stop audio recording"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm transition-transform active:scale-95"
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : draft.trim() || pendingMedia || pendingBatch ? (
            <button
              onClick={submitMessage}
              disabled={
                (!draft.trim() && !pendingMedia && !pendingBatch) ||
                isSendingMedia ||
                Boolean(mediaTransfer?.isUploading)
              }
              title="Send message"
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50",
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
              title="Record voice message (Audio)"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition-colors hover:bg-subtle hover:text-fg active:scale-95"
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </div>
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

      {/* Media Preview Lightbox */}
      <MediaPreview
        items={previewItems}
        initialIndex={previewIndex}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Forward Message Modal */}
      <ForwardModal
        isOpen={Boolean(forwardingMessage)}
        onClose={() => setForwardingMessage(null)}
        chats={chats || []}
        currentChatId={chat?._id}
        message={forwardingMessage}
        onForward={async (targetChatId) => {
          if (onForwardMessage && forwardingMessage) {
            await onForwardMessage(forwardingMessage._id, targetChatId);
          }
        }}
      />
    </section>
  );
};
