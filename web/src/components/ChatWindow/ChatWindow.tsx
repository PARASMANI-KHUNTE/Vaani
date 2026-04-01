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
  MessageCircle,
  Search,
  SmilePlus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Check,
  Trash2,
  MoreVertical,
  Mic,
  MicOff,
  Paperclip,
  Square,
  Video,
  Images,
  Plus,
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
  selectedMessageIds?: string[];
  onSelectMessage?: (messageId: string, selected: boolean) => void;
  onClearSelectedMessages?: () => void;
};

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1">
    <span className="h-1 w-1 rounded-full bg-blue-500/60 animate-bounce" />
    <span className="h-1 w-1 rounded-full bg-blue-500/60 animate-bounce [animation-delay:0.2s]" />
    <span className="h-1 w-1 rounded-full bg-blue-500/60 animate-bounce [animation-delay:0.4s]" />
  </div>
);

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
  typingLabel,
  onOpenUserProfile,
  mediaTransfer,
  onRetryMedia,
  onCancelMedia,
  onDismissMedia,
  onError,
  onDismissError,
  onLeaveGroup,
  onOpenGroupInfo,
  onClearChat,
}: ChatWindowProps) => {
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (onError) {
      setLocalError(onError);
    }
  }, [onError]);

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
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Inbox</h2>
        <p className="mt-2 max-w-[240px] text-sm text-slate-500">Pick a chat to start messaging.</p>
      </section>
    );
  }

  const chatTitle = chat.isGroup ? chat.groupName : chat.otherParticipant?.name;
  const chatAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;

  return (
    <section className="relative flex h-full flex-col bg-[#F8F9FF] dark:bg-slate-900 overflow-hidden border-none sm:border-solid border-l border-slate-100 dark:border-slate-800">
      <header className={cn(
        "blue-gradient-header relative shrink-0 flex flex-col justify-end px-4 pb-4 shadow-lg transition-all duration-300 z-30",
        "h-24 sm:h-32 rounded-b-[30px] sm:rounded-b-[40px]"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-4 overflow-hidden flex-1">
            {onBack && (
              <button 
                onClick={onBack} 
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white transition-all active:scale-95 lg:hidden"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
            )}
            <div 
              className="flex items-center gap-3 sm:gap-4 cursor-pointer hover:opacity-90 transition-opacity min-w-0 group/header"
              onClick={() => {
                if (chat.isGroup) {
                  onOpenGroupInfo?.(chat._id);
                } else if (chat.otherParticipant && onOpenUserProfile) {
                  onOpenUserProfile(chat.otherParticipant);
                }
              }}
            >
              <div className="relative shrink-0">
                <Avatar src={chatAvatar} name={chatTitle || "?"} className="h-10 w-10 sm:h-14 sm:w-14 border-2 border-white/50 rounded-[18px] sm:rounded-[22px]" />
                {isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 sm:h-4 sm:w-4 rounded-full border-2 border-white bg-emerald-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-lg sm:text-xl font-bold text-white tracking-tight leading-tight">{chatTitle}</h3>
                  {chat.isGroup && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-white opacity-0 transition-opacity group-hover/header:opacity-100 sm:opacity-100">
                      <MessageCircle className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="text-[11px] sm:text-[13px] font-semibold text-white/80 line-clamp-1">
                  {typingLabel ? typingLabel : (isOnline ? "Online" : "Offline")}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
            <div className="relative">
              <button 
                onClick={() => setShowSearch(!showSearch)}
                className={cn(
                  "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 text-white hover:bg-white/30 transition-colors",
                  showSearch && "bg-white/40"
                )}
              >
                <Search className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              {showSearch && (
                <div className="absolute right-0 mt-3 w-64 xs:w-72 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-black/5 dark:bg-slate-800 z-[60]">
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  />
                  {searchQuery && (
                    <p className="mt-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      {searchMatchCount} matches
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 text-white hover:bg-white/30 transition-colors"
                title="Options"
              >
                <MoreVertical className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
              
              <AnimatePresence>
                {showGroupMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-3 w-52 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 dark:bg-slate-800 z-[60]"
                  >
                    <button 
                      onClick={() => { setIsSelectionMode(!isSelectionMode); setShowGroupMenu(false); }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                    >
                      <Check className="h-4 w-4 text-blue-500" />
                      Select Messages
                    </button>
                    {chat.isGroup && (
                      <button 
                        onClick={() => { onOpenGroupInfo?.(chat._id); setShowGroupMenu(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                      >
                        <MessageCircle className="h-4 w-4 text-emerald-500" />
                        Group Info
                      </button>
                    )}
                    {isSelectionMode && selectedMessages.size > 0 && (
                      <button 
                        onClick={() => {
                          setConfirmDeleteOpen(true);
                          setShowGroupMenu(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 shadow-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete ({selectedMessages.size})
                      </button>
                    )}
                    <div className="my-1 h-px bg-slate-100 dark:bg-slate-700/50" />
                    {chat.isGroup && (
                      <button 
                        onClick={() => { setConfirmLeaveOpen(true); setShowGroupMenu(false); }}
                        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                      >
                        <X className="h-4 w-4" />
                        Leave Group
                      </button>
                    )}
                    <button 
                      onClick={() => { 
                        setConfirmClearOpen(true);
                        setShowGroupMenu(false); 
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                    >
                      <Trash2 className="h-4 w-4 text-amber-500" />
                      Clear Chat
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {onClose && (
              <button 
                onClick={onClose} 
                className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-white/20 text-white hover:bg-red-500 transition-colors"
                title="Close Chat"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div 
        ref={scrollContainerRef} 
        className="flex-1 overflow-y-auto px-4 py-6 sm:py-8 space-y-6 bg-slate-50/20 dark:bg-slate-900"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-blue-600" />
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
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
                      <div className="flex items-center gap-4 py-8">
                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                          {formatDateSeparator(message.createdAt)}
                        </span>
                        <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
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
                    />
                  </div>
                );
              });
            })()}
          </div>
        )}
      </div>

      <footer className="shrink-0 bg-transparent p-4 sm:p-6 pb-2 sm:pb-6 dark:bg-slate-900 z-30 mb-8 sm:mb-0">
        <div className="mx-auto max-w-4xl relative">
          <AnimatePresence>
            {replyTarget && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mb-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-xs shadow-lg dark:bg-slate-800 ring-1 ring-black/5"
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

          <div className="flex items-end gap-2 sm:gap-3 bg-white dark:bg-slate-800 rounded-[28px] sm:rounded-[30px] p-2 pr-2 sm:pr-2.5 shadow-2xl shadow-blue-500/10 ring-1 ring-black/5">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Collapsible Tool Menu for Mobile */}
              <div className="relative group/tools">
                <button 
                  className="flex h-11 w-11 sm:hidden items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all active:scale-95"
                  title="Tools"
                >
                  <Plus className="h-5 w-5" />
                </button>
                
                {/* Desktop layout: horizontal list, Mobile layout: floating popup */}
                <div className={cn(
                  "flex items-center gap-1 sm:gap-2",
                  "hidden sm:flex", // Desktop
                  "absolute bottom-[130%] left-0 flex-col sm:flex-row bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-2xl ring-1 ring-black/5 opacity-0 group-hover/tools:opacity-100 pointer-events-none group-hover/tools:pointer-events-auto transition-all duration-200 translate-y-2 group-hover/tools:translate-y-0 sm:static sm:bg-transparent sm:p-0 sm:shadow-none sm:ring-0 sm:opacity-100 sm:pointer-events-auto sm:translate-y-0"
                )}>
                  <button onClick={() => videoInputRef.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-blue-500 transition-colors" title="Video"><Video className="h-5 w-5" /></button>
                  <button onClick={() => imageInputRef.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-blue-500 transition-colors" title="Image"><ImagePlus className="h-5 w-5" /></button>
                  <button onClick={() => galleryInputRef.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-blue-500 transition-colors" title="Gallery"><Images className="h-5 w-5" /></button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:text-blue-500 transition-colors" title="File"><Paperclip className="h-5 w-5" /></button>
                </div>
              </div>

              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-2xl transition-all active:scale-95",
                  showEmojiPicker 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" 
                    : "bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-500 dark:bg-slate-700/50"
                )}
                title="Emoji"
              >
                <SmilePlus className="h-5.5 w-5.5" />
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
                  onFocus={() => setIsInputFocused(true)}
                  onBlur={() => setIsInputFocused(false)}
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
                      "bg-[#6d7af7] text-white shadow-blue-500/30"
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
