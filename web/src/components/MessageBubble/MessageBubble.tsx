"use client";

import { Image } from "@/components/ui/image";
import { useEffect, useRef, useState, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Download,
  FileText,
  Pause,
  Play,
  Smile,
  Trash2,
} from "lucide-react";
import { BackendUser, Message } from "@/lib/types";
import type { PreviewItem } from "@/components/MediaPreview/MediaPreview";
import { cn, formatMessageTime } from "@/lib/utils";

const getDownloadName = (message: Message): string => {
  const originalName = message.media?.originalName;
  if (originalName) return originalName;

  const format = message.media?.format || null;
  const extFromMime =
    (message.media?.mimeType || "")
      .toLowerCase()
      .split("/")
      .pop()
      ?.replace("x-", "") || "";

  const ext =
    format ||
    extFromMime ||
    (message.type === "image"
      ? "jpg"
      : message.type === "video"
        ? "mp4"
        : message.type === "voice"
          ? "webm"
          : "bin");

  return `${message.type}-${message._id}.${ext}`;
};

type MessageBubbleProps = {
  message: Message;
  isOwnMessage: boolean;
  currentUserId?: string;
  showSenderName?: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (message: Message, scope: "me" | "everyone") => void;
  onReact?: (message: Message, emoji: string) => void;
  onMediaPreview?: (items: PreviewItem[], startIndex: number) => void;
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  isSelectionMode?: boolean;
  groupedMedia?: Message[];
  isGroup?: boolean;
  chatParticipants?: BackendUser[];
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

const formatDuration = (seconds: number) => {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getUserColor = (name: string) => {
  const colors = [
    "text-blue-500", "text-emerald-500", "text-rose-500", "text-amber-500",
    "text-violet-500", "text-cyan-500", "text-pink-500", "text-indigo-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const VoiceNotePlayer = ({ url, isOwnMessage }: { url: string; isOwnMessage: boolean }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const BAR_COUNT = 24;
  const barHeights = [30, 45, 25, 60, 40, 70, 35, 55, 25, 65, 40, 75, 50, 35, 60, 45, 65, 25, 50, 40, 70, 35, 55, 30];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => { setDuration(audio.duration); setIsLoading(false); };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnd = () => { setIsPlaying(false); setCurrentTime(0); };
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  };

  const activeBars = Math.floor((currentTime / (duration || 1)) * BAR_COUNT);

  return (
    <div className="flex items-center gap-2.5 rounded-2xl p-2.5 w-[240px]">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all active:scale-95",
          isOwnMessage ? "bg-white/20 hover:bg-white/30 text-white" : "bg-[#0084ff] text-white",
          isLoading && "opacity-50"
        )}
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-pulse rounded-full bg-white/50" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 fill-current ml-0.5" />
        ) : (
          <Play className="h-4 w-4 fill-current ml-0.5" />
        )}
      </button>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-[2px] h-5 cursor-pointer" onClick={handleSeek}>
          {Array.from({ length: BAR_COUNT }).map((_, i) => {
            const isActive = i < activeBars;
            const bh = barHeights[i % barHeights.length];
            const isAnim = isPlaying && i >= activeBars - 1 && i <= activeBars + 1;
            return (
              <motion.div
                key={i}
                className={cn(
                  "w-[2.5px] rounded-full transition-colors duration-150",
                  isActive ? (isOwnMessage ? "bg-white/80" : "bg-[#0084ff]") : (isOwnMessage ? "bg-white/30" : "bg-slate-200 dark:bg-slate-600")
                )}
                animate={{ height: isAnim ? [`${bh}%`, `${Math.min(100, bh + 15)}%`, `${bh}%`] : `${bh}%` }}
                transition={isAnim ? { duration: 0.35, repeat: Infinity, ease: "easeInOut" } : { duration: 0.15 }}
              />
            );
          })}
        </div>
        <div className="flex justify-between">
          <span className={cn("text-[10px] font-medium tabular-nums", isOwnMessage ? "text-white/60" : "text-slate-400")}>
            {formatDuration(currentTime)}
          </span>
          <span className={cn("text-[10px] font-medium tabular-nums", isOwnMessage ? "text-white/60" : "text-slate-400")}>
            {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ReactionPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className="flex items-center gap-1 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-black/5 dark:bg-slate-800"
  >
    {REACTION_EMOJIS.map((emoji) => (
      <button
        key={emoji}
        type="button"
        onClick={() => { onSelect(emoji); onClose(); }}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all hover:scale-125 active:scale-95"
      >
        {emoji}
      </button>
    ))}
  </motion.div>
);

const MessageReactions = ({
  reactions,
  currentUserId,
  onReact,
  isOwnMessage,
}: {
  reactions?: Message["reactions"];
  currentUserId?: string;
  onReact?: (emoji: string) => void;
  isOwnMessage: boolean;
}) => {
  const [showPicker, setShowPicker] = useState(false);
  if (!reactions || reactions.length === 0) return null;

  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as Record<string, typeof reactions>);

  return (
    <div className="relative">
      <div className={cn("mt-1 flex flex-wrap items-center gap-1", isOwnMessage ? "justify-end" : "justify-start")}>
        {Object.entries(grouped).map(([emoji, users]) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact?.(emoji)}
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition-all active:scale-95",
              users.some((u) => u.userId === currentUserId)
                ? "bg-[#0084ff]/15 border border-[#0084ff]/30"
                : "bg-white border border-slate-200 dark:bg-slate-700 dark:border-slate-600"
            )}
          >
            <span>{emoji}</span>
            <span className={cn("text-xs font-semibold", users.some((u) => u.userId === currentUserId) ? "text-[#0084ff]" : "text-slate-500")}>
              {users.length}
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-slate-400 transition-all hover:scale-105 active:scale-95 dark:border-slate-600"
        >
          <Smile className="h-4 w-4" />
        </button>
      </div>
      <AnimatePresence>
        {showPicker && (
          <ReactionPicker onSelect={(emoji) => { onReact?.(emoji); setShowPicker(false); }} onClose={() => setShowPicker(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const DeleteConfirmMenu = ({
  isOwnMessage,
  onDeleteMe,
  onDeleteEveryone,
}: {
  isOwnMessage: boolean;
  onDeleteMe: () => void;
  onDeleteEveryone: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className={cn(
      "absolute bottom-full mb-2 flex items-center gap-1 rounded-full bg-white p-1 shadow-xl ring-1 ring-black/5 dark:bg-slate-800 overflow-hidden",
      isOwnMessage ? "right-0" : "left-0"
    )}
  >
    <button
      onClick={onDeleteMe}
      className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      For me
    </button>
    {isOwnMessage && (
      <>
        <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-600" />
        <button
          onClick={onDeleteEveryone}
          className="rounded-full px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 active:scale-95 dark:hover:bg-red-900/20"
        >
          Everyone
        </button>
      </>
    )}
  </motion.div>
);

const MessageBubbleBase = ({
  message,
  isOwnMessage,
  currentUserId,
  showSenderName,
  onReply,
  onDelete,
  onReact,
  onMediaPreview,
  isGroupStart,
  isGroupEnd,
  isHighlighted,
  isSelected,
  onSelect,
  isSelectionMode,
  groupedMedia,
}: MessageBubbleProps) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);

  const senderName =
    typeof message.senderId === "string"
      ? "Unknown"
      : message.senderId?.name || message.senderId?.username || "Unknown";

  const handleDeleteMe = () => {
    onDelete?.(message, "me");
    setShowDeleteMenu(false);
  };

  const handleDeleteEveryone = () => {
    onDelete?.(message, "everyone");
    setShowDeleteMenu(false);
  };

  if (message.isSystem) {
    return (
      <div className="my-4 flex justify-center">
        <span className="rounded-full bg-[#d9e0e7]/70 px-4 py-1 text-[11px] font-medium text-slate-500 backdrop-blur-sm dark:bg-slate-800/70 dark:text-slate-400">
          {message.content || "Activity"}
        </span>
      </div>
    );
  }

  const getBorderRadius = () => {
    const base = "18px";
    const small = "4px";
    if (isOwnMessage) {
      return {
        borderTopLeftRadius: base,
        borderBottomLeftRadius: base,
        borderTopRightRadius: isGroupStart ? small : base,
        borderBottomRightRadius: isGroupEnd ? small : base,
      };
    }
    return {
      borderTopRightRadius: base,
      borderBottomRightRadius: base,
      borderTopLeftRadius: isGroupStart ? small : base,
      borderBottomLeftRadius: isGroupEnd ? small : base,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group relative flex flex-col py-0.5",
        isOwnMessage ? "items-end" : "items-start",
        isHighlighted && "ring-2 ring-blue-500/30 ring-offset-1 rounded-xl bg-blue-50/50 dark:bg-blue-900/10",
        isSelectionMode && "cursor-pointer"
      )}
      role="article"
      onClick={() => isSelectionMode && onSelect?.()}
    >
      {showSenderName && !isOwnMessage && (
        <span className={cn("mb-1 ml-3 text-[12px] font-semibold", getUserColor(senderName))}>
          {senderName}
        </span>
      )}

      <div className={cn("flex max-w-[80%] items-end gap-1", isOwnMessage ? "flex-row-reverse" : "flex-row")}>
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className={cn(
            "mb-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
            isSelected ? "bg-[#0084ff] border-[#0084ff]" : "bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-500"
          )}>
            {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
          </div>
        )}

        {/* Message Bubble */}
        <div
          style={getBorderRadius()}
          className={cn(
            "relative px-3 py-2 text-[14px] leading-[1.4]",
            isOwnMessage
              ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-900 dark:text-white rounded-tr-[4px]"
              : "bg-white dark:bg-[#1f232b] text-slate-900 dark:text-white rounded-tl-[4px] shadow-sm",
            isSelectionMode && isSelected && "ring-2 ring-[#0084ff]"
          )}
        >
          {/* Reply Preview */}
          {message.replyTo && (
            <div className={cn(
              "mb-2 overflow-hidden rounded-lg border-l-2 px-2 py-1.5 text-[12px]",
              isOwnMessage
                ? "bg-black/5 border-white/40 text-slate-700 dark:text-slate-300"
                : "bg-slate-100 border-[#0084ff]/40 text-slate-600 dark:bg-slate-700/50 dark:text-slate-300"
            )}>
              <p className="font-semibold text-[10px] uppercase tracking-wide opacity-60">
                {message.replyTo.senderId?.name || message.replyTo.senderId?.username || "Reply"}
              </p>
              <p className="mt-0.5 line-clamp-1 italic">
                {message.replyTo.deletedForEveryone ? "Deleted message" : message.replyTo.content}
              </p>
            </div>
          )}

          {/* Content */}
          <div className="relative">
            {message.deletedForEveryone ? (
              <p className="flex items-center gap-1.5 italic opacity-50 text-sm">
                <Trash2 className="h-3.5 w-3.5" />
                Message deleted
              </p>
            ) : (
              <>
                {/* Image */}
                {message.type === "image" && message.media?.url && (
                  <div className="relative mb-2 overflow-hidden rounded-xl">
                    <button
                      type="button"
                      className="block w-full cursor-pointer"
                      onClick={() =>
                        onMediaPreview?.(
                          [{
                            url: message.media!.url,
                            type: "image",
                            originalName: message.media!.originalName,
                            width: message.media!.width,
                            height: message.media!.height,
                            messageId: message._id,
                          }],
                          0
                        )
                      }
                    >
                      <Image
                        src={message.media.url}
                        alt={message.content || "Photo"}
                        width={message.media.width || 800}
                        height={message.media.height || 600}
                        className="max-h-[300px] w-full object-cover"
                      />
                    </button>
                    <a
                      href={message.media.url}
                      download={getDownloadName(message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Save"
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur hover:bg-black/70 active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* Video */}
                {message.type === "video" && message.media?.url && (
                  <div className="relative mb-2 overflow-hidden rounded-xl">
                    <video
                      src={message.media.url}
                      controls
                      className="max-h-[300px] w-full rounded-xl bg-black/90"
                      preload="metadata"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onMediaPreview?.(
                          [{
                            url: message.media!.url,
                            type: "video",
                            originalName: message.media!.originalName,
                            width: message.media!.width,
                            height: message.media!.height,
                            messageId: message._id,
                          }],
                          0
                        )
                      }
                      title="Expand"
                      className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur hover:bg-black/70 active:scale-95"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
                    </button>
                    <a
                      href={message.media.url}
                      download={getDownloadName(message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Save"
                      className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white backdrop-blur hover:bg-black/70 active:scale-95"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* Grouped Media */}
                {(message.type === "image" || message.type === "video") && groupedMedia && groupedMedia.length > 1 && (
                  <div className={cn(
                    "mb-2 grid gap-0.5 overflow-hidden rounded-xl",
                    groupedMedia.length === 2 ? "grid-cols-2" : "grid-cols-2 grid-rows-2"
                  )}>
                    {groupedMedia.slice(0, 4).map((mediaMsg: Message, idx: number) => {
                      const groupPreviewItems: PreviewItem[] = groupedMedia
                        .filter((m) => m.media?.url)
                        .map((m) => ({
                          url: m.media!.url,
                          type: m.type as "image" | "video",
                          originalName: m.media!.originalName,
                          width: m.media!.width,
                          height: m.media!.height,
                          messageId: m._id,
                        }));
                      return (
                        <button
                          type="button"
                          key={mediaMsg._id}
                          onClick={() => onMediaPreview?.(groupPreviewItems, idx)}
                          className={cn(
                            "relative overflow-hidden bg-slate-100 dark:bg-slate-700 cursor-pointer",
                            groupedMedia.length === 3 && idx === 0 ? "row-span-2" : ""
                          )}
                        >
                          {mediaMsg.type === "image" && mediaMsg.media?.url && (
                            <Image
                              src={mediaMsg.media.url}
                              alt="Photo"
                              width={400}
                              height={400}
                              className="h-full w-full object-cover min-h-[100px]"
                            />
                          )}
                          {mediaMsg.type === "video" && mediaMsg.media?.url && (
                            <div className="relative flex h-full min-h-[100px] items-center justify-center bg-black/20">
                              <Play className="h-8 w-8 text-white fill-current opacity-70" />
                            </div>
                          )}
                          {idx === 3 && groupedMedia.length > 4 && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                              <span className="text-xl font-bold text-white">+{groupedMedia.length - 4}</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Voice Note */}
                {message.type === "voice" && message.media?.url && (
                  <div className="mb-2 flex items-center gap-2">
                    <VoiceNotePlayer url={message.media.url} isOwnMessage={isOwnMessage} />
                    <a
                      href={message.media.url}
                      download={getDownloadName(message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Save"
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all active:scale-95",
                        isOwnMessage ? "bg-white/20 hover:bg-white/30 text-white" : "bg-[#0084ff] text-white"
                      )}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* File */}
                {message.type === "file" && message.media?.url && (
                  <div className={cn(
                    "mb-2 flex items-center gap-3 rounded-xl p-3",
                    isOwnMessage ? "bg-black/10" : "bg-slate-100 dark:bg-slate-700/50"
                  )}>
                    <div className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      isOwnMessage ? "bg-white/20" : "bg-[#0084ff]/10"
                    )}>
                      <FileText className={cn("h-5 w-5", isOwnMessage ? "text-white/80" : "text-[#0084ff]")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium", isOwnMessage ? "text-white" : "text-slate-800 dark:text-white")}>
                        {message.media.originalName || "Document"}
                      </p>
                    </div>
                    <a
                      href={message.media.url}
                      download={getDownloadName(message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Save"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95",
                        isOwnMessage ? "bg-white/20 hover:bg-white/30 text-white" : "bg-[#0084ff] text-white"
                      )}
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* Text */}
                {message.content && (
                  <p className="whitespace-pre-wrap break-words leading-[1.45]">
                    {message.content}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Timestamp + Status */}
          <div className={cn("mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums", isOwnMessage ? "text-slate-500 dark:text-white/50" : "text-slate-400")}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {isOwnMessage && message.status === "seen" && (
              <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
            )}
            {isOwnMessage && message.status === "delivered" && (
              <CheckCheck className="h-3.5 w-3.5 text-slate-400" />
            )}
            {isOwnMessage && (!message.status || message.status === "sent") && (
              <Check className="h-3.5 w-3.5 text-slate-400" />
            )}
          </div>
        </div>

        {/* Hover Actions */}
        <div className={cn(
          "mb-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150",
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}>
          <button
            onClick={() => onReply?.(message)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 hover:scale-105 active:scale-95 dark:bg-slate-700 dark:ring-white/10"
            title="Reply"
          >
            <CornerUpLeft className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 hover:scale-105 active:scale-95 dark:bg-slate-700 dark:ring-white/10"
              title="React"
            >
              <Smile className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
            </button>
            <AnimatePresence>
              {showReactionPicker && (
                <div className={cn("absolute bottom-full mb-2", isOwnMessage ? "right-0" : "left-0")}>
                  <ReactionPicker
                    onSelect={(emoji) => { onReact?.(message, emoji); setShowReactionPicker(false); }}
                    onClose={() => setShowReactionPicker(false)}
                  />
                </div>
              )}
            </AnimatePresence>
          </div>

          {isOwnMessage && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 hover:scale-105 active:scale-95 dark:bg-slate-700 dark:ring-white/10"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
              </button>
              <AnimatePresence>
                {showDeleteMenu && (
                  <DeleteConfirmMenu
                    isOwnMessage={isOwnMessage}
                    onDeleteMe={handleDeleteMe}
                    onDeleteEveryone={handleDeleteEveryone}
                  />
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Reactions */}
      <MessageReactions
        reactions={message.reactions}
        currentUserId={currentUserId}
        onReact={(emoji) => onReact?.(message, emoji)}
        isOwnMessage={isOwnMessage}
      />
    </motion.div>
  );
};

const arePropsEqual = (prev: MessageBubbleProps, next: MessageBubbleProps): boolean => {
  return (
    prev.message._id === next.message._id &&
    prev.message.content === next.message.content &&
    prev.message.status === next.message.status &&
    prev.message.edited === next.message.edited &&
    prev.message.deletedForEveryone === next.message.deletedForEveryone &&
    prev.isOwnMessage === next.isOwnMessage &&
    prev.showSenderName === next.showSenderName &&
    prev.isGroupStart === next.isGroupStart &&
    prev.isGroupEnd === next.isGroupEnd &&
    prev.isHighlighted === next.isHighlighted &&
    prev.isSelected === next.isSelected &&
    prev.isSelectionMode === next.isSelectionMode &&
    prev.isGroup === next.isGroup &&
    prev.onMediaPreview === next.onMediaPreview &&
    JSON.stringify(prev.message.reactions) === JSON.stringify(next.message.reactions) &&
    JSON.stringify(prev.message.media) === JSON.stringify(next.message.media) &&
    JSON.stringify(prev.message.replyTo) === JSON.stringify(next.message.replyTo)
  );
};

export const MessageBubble = memo(MessageBubbleBase, arePropsEqual);
