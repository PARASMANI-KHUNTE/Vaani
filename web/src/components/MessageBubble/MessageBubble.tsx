"use client";

import { Image } from "@/components/ui/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CheckCheck, Clock3, CornerUpLeft, FileText, Pencil, Paperclip, Pause, Play, SmilePlus, Trash2, Volume2, X } from "lucide-react";
import { Message } from "@/lib/types";
import { cn, formatMessageTime, formatStatusTime } from "@/lib/utils";

type MessageBubbleProps = {
  message: Message;
  isOwnMessage: boolean;
  currentUserId?: string;
  showSenderName?: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (message: Message, scope: "me" | "everyone") => void;
  onReact?: (message: Message, emoji: string) => void;
  onEdit?: (message: Message, newContent: string) => void;
  onForward?: (message: Message) => void;
  isGroupStart?: boolean;
  isGroupEnd?: boolean;
  isHighlighted?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  isSelectionMode?: boolean;
  groupedMedia?: Message[];
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🎉", "🔥"];

const StatusIcon = ({ status, optimistic, timestamp }: { status: Message["status"]; optimistic?: boolean; timestamp?: string | Date | null }) => {
  const statusTime = timestamp ? formatStatusTime(timestamp) : null;

  if (optimistic) {
    return (
      <span className="flex items-center gap-1" aria-label="Sending">
        <Clock3 className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (status === "seen") {
    return (
      <span className="flex items-center gap-1" aria-label={`Seen at ${statusTime || ""}`}>
        <CheckCheck className="h-4 w-4 text-white" />
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="flex items-center gap-1" aria-label={`Delivered at ${statusTime || ""}`}>
        <CheckCheck className="h-4 w-4 opacity-50" />
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1" aria-label={`Sent at ${statusTime || ""}`}>
      <Check className="h-4 w-4 opacity-50" />
    </span>
  );
};

const renderMessageContent = (content: string, isOwnMessage: boolean) => {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const segments = content.split(urlPattern);

  return segments.map((segment, index) => {
    if (/^https?:\/\/[^\s]+$/.test(segment)) {
      return (
        <a
          key={`${segment}-${index}`}
          href={segment}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "break-all underline underline-offset-2",
            isOwnMessage ? "text-white" : "text-[#6d7af7]"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {segment}
        </a>
      );
    }

    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDuration = (seconds: number) => {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getUserColor = (name: string) => {
  const colors = [
    "text-blue-500",
    "text-emerald-500",
    "text-rose-500",
    "text-amber-500",
    "text-violet-500",
    "text-cyan-500",
    "text-pink-500",
    "text-indigo-500",
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

  const BAR_COUNT = 28;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const activeBars = Math.floor((currentTime / (duration || 1)) * BAR_COUNT);

  const barHeights = [
    30, 45, 25, 60, 40, 70, 35, 55, 25, 65, 40, 75, 50, 35, 60, 45,
    65, 25, 50, 40, 70, 35, 55, 30, 60, 45, 75, 40
  ];

  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-3 rounded-2xl p-2.5 min-w-[220px] transition-all",
        isOwnMessage ? "bg-white/10" : "bg-slate-50 dark:bg-white/5"
      )}
    >
      <audio ref={audioRef} src={url} preload="metadata" />
      <button
        type="button"
        onClick={togglePlay}
        disabled={isLoading}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all shadow-sm",
          isOwnMessage
            ? "bg-white/20 hover:bg-white/30 text-white"
            : "bg-[#6d7af7] text-white hover:bg-[#5b68d6]",
          isLoading && "opacity-50 cursor-wait",
          isPlaying && "scale-105 active:scale-95"
        )}
      >
        {isLoading ? (
          <Volume2 className="h-4 w-4 animate-pulse" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 ml-0.5 fill-current" />
        )}
      </button>
      <div className="flex-1 space-y-1.5">
        <div
          className="flex items-center gap-[3px] h-6 cursor-pointer"
          onClick={handleSeek}
        >
          {Array.from({ length: BAR_COUNT }).map((_, i) => {
            const isActive = i < activeBars;
            const baseHeight = barHeights[i % barHeights.length];
            const isAnimating = isPlaying && i >= activeBars - 1 && i <= activeBars + 1;
            
            return (
              <motion.div
                key={i}
                className={cn(
                  "w-[3px] rounded-full transition-colors duration-200",
                  isActive
                    ? isOwnMessage ? "bg-white" : "bg-[#6d7af7]"
                    : isOwnMessage ? "bg-white/20" : "bg-slate-200 dark:bg-white/10"
                )}
                animate={{
                  height: isAnimating
                    ? [`${baseHeight}%`, `${Math.min(100, baseHeight + 20)}%`, `${baseHeight}%`]
                    : `${baseHeight}%`,
                }}
                transition={isAnimating ? {
                  duration: 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                } : { duration: 0.2 }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between px-0.5">
          <span className={cn("text-[9px] font-bold tabular-nums tracking-wider uppercase", isOwnMessage ? "text-white/60" : "text-slate-400")}>
            {formatDuration(currentTime)}
          </span>
          <span className={cn("text-[9px] font-bold tabular-nums tracking-wider uppercase", isOwnMessage ? "text-white/60" : "text-slate-400")}>
            {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

const ReactionPicker = ({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 6, scale: 0.96 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 4, scale: 0.96 }}
    transition={{ duration: 0.18 }}
    className="absolute bottom-full left-0 z-30 mb-2"
  >
    <div className="flex items-center gap-1 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl dark:border-white/8 dark:bg-slate-800/98">
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all hover:scale-125 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          {emoji}
        </button>
      ))}
    </div>
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

  if (!reactions || reactions.length === 0) {
    return null;
  }

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  const hasUserReacted = reactions.some((r) => r.userId === currentUserId);

  return (
    <div className="relative">
      <div
        className={cn(
          "mt-1 flex flex-wrap items-center gap-1",
          isOwnMessage ? "justify-end" : "justify-start"
        )}
      >
        {Object.entries(groupedReactions).map(([emoji, users]) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              if (onReact) {
                onReact(emoji);
              } else {
                setShowPicker(!showPicker);
              }
            }}
            className={cn(
              "flex items-center gap-1 rounded-full border bg-white px-2 py-0.5 text-sm transition-all hover:scale-105",
              users.some((u) => u.userId === currentUserId)
                ? "border-[#6d7af7]/40 bg-[#6d7af7]/5"
                : "border-slate-100 hover:border-[#6d7af7]/30"
            )}
          >
            <span>{emoji}</span>
            <span className="text-xs font-semibold text-slate-500">{users.length}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-slate-200 text-slate-400 transition-all hover:border-[#6d7af7]/30 hover:border-solid hover:text-[#6d7af7]",
            hasUserReacted && "hidden"
          )}
        >
          <SmilePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {showPicker && (
          <ReactionPicker
            onSelect={(emoji) => {
              if (onReact) {
                onReact(emoji);
              }
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export const MessageBubble = ({
  message,
  isOwnMessage,
  currentUserId,
  showSenderName,
  onReply,
  onDelete,
  onReact,
  isGroupStart,
  isGroupEnd,
  isHighlighted,
  isSelected,
  onSelect,
  isSelectionMode,
  groupedMedia,
}: MessageBubbleProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const senderName = typeof message.senderId === "string"
    ? "Unknown"
    : message.senderId?.name || message.senderId?.username || "Unknown";

  const handleDeleteClick = (scope: "me" | "everyone") => {
    onDelete?.(message, scope);
    setShowDeleteConfirm(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDeleteConfirm(false);
      setShowReactionPicker(false);
    }
  };

  const handleReact = (emoji: string) => {
    onReact?.(message, emoji);
  };

  if (message.isSystem) {
    return (
      <div className="my-6 flex justify-center">
        <div className="max-w-[92%] rounded-full bg-slate-100/60 px-5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 dark:bg-white/5 dark:text-slate-500 shadow-sm border border-slate-200/20">
          {message.content || "Activity summary"}
        </div>
      </div>
    );
  }

  // Fluid border radius logic
  const getBorderRadius = () => {
    const base = "24px";
    const small = "6px";
    
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
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.002 }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "group flex flex-col mb-1 relative",
        isOwnMessage ? "items-end pl-12" : "items-start pr-12",
        isHighlighted && "ring-2 ring-blue-500/20 ring-offset-2 rounded-2xl bg-blue-500/5",
        isSelectionMode && "cursor-pointer"
      )}
      role="article"
      onClick={() => isSelectionMode && onSelect?.()}
    >
      {showSenderName && !isOwnMessage && (
        <span className={cn(
          "mb-1.5 ml-3 text-[13px] font-bold tracking-tight",
          getUserColor(senderName)
        )}>
          {senderName}
        </span>
      )}
      
      <div className={cn(
        "flex max-w-full items-end gap-2.5",
        isOwnMessage ? "flex-row-reverse" : "flex-row"
      )}>
        {isSelectionMode && (
          <div className={cn(
            "mb-3 flex shrink-0 h-6 w-6 items-center justify-center rounded-full border-2 transition-all duration-200",
            isSelected 
              ? "bg-[#6d7af7] border-[#6d7af7]" 
              : "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700",
            isSelected && "scale-110 shadow-lg shadow-blue-500/20"
          )}>
            {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
          </div>
        )}
        
        <div
          style={getBorderRadius()}
          className={cn(
            "relative px-4 py-3.5 text-[15px] font-medium leading-[1.5] transition-all duration-300",
            isOwnMessage
              ? "bg-gradient-to-br from-[#6d7af7] to-[#5a68e6] text-white shadow-xl shadow-blue-500/10"
              : "border border-slate-100 bg-white text-slate-800 dark:border-white/5 dark:bg-slate-800/80 dark:text-slate-100 shadow-sm",
            isSelectionMode && isSelected && "ring-2 ring-[#6d7af7] ring-offset-2"
          )}
          onKeyDown={handleKeyDown}
        >
          {message.replyTo ? (
            <div
              className={cn(
                "mb-3 overflow-hidden rounded-xl border-l-[3px] px-3 py-2 text-[13px] backdrop-blur-sm",
                isOwnMessage
                  ? "bg-black/10 border-white/30 text-white/90"
                  : "bg-slate-50 border-[#6d7af7]/40 text-slate-600 dark:bg-white/5 dark:text-slate-400"
              )}
            >
              <p className="font-bold text-[11px] uppercase tracking-wider opacity-70">
                {message.replyTo.senderId?.name || message.replyTo.senderId?.username || "Replying to"}
              </p>
              <p className="mt-0.5 line-clamp-1 font-medium italic">
                {message.replyTo.deletedForEveryone ? "This message was deleted" : message.replyTo.content}
              </p>
            </div>
          ) : null}

          <div className="relative">
            {message.deletedForEveryone ? (
              <p className="flex items-center gap-2 italic opacity-60 text-sm">
                <Trash2 className="h-3.5 w-3.5" />
                This message was deleted
              </p>
            ) : (
              <>
                {message.type === "image" && message.media?.url ? (
                  <div className="mb-2.5 overflow-hidden rounded-2xl shadow-sm border border-black/5">
                    <Image
                      src={message.media.url}
                      alt={message.content || "Shared image"}
                      width={message.media.width || 800}
                      height={message.media.height || 600}
                      className="h-auto max-h-[400px] w-full object-cover transition-transform hover:scale-105 duration-500"
                    />
                  </div>
                ) : null}

                {message.type === "video" && message.media?.url ? (
                  <div className="mb-2.5 overflow-hidden rounded-2xl shadow-sm border border-black/5">
                    <video
                      src={message.media.url}
                      controls
                      className="max-h-[400px] w-full bg-black/90"
                      preload="metadata"
                    />
                  </div>
                ) : null}

                {((message.type === "image" || message.type === "video") && groupedMedia && groupedMedia.length > 1) && (
                  <div className={cn(
                    "mb-2.5 grid gap-1 relative overflow-hidden rounded-2xl shadow-sm border border-black/5",
                    groupedMedia.length === 2 ? "grid-cols-2" :
                    groupedMedia.length === 3 ? "grid-cols-2 grid-rows-2" :
                    "grid-cols-2"
                  )}>
                    {groupedMedia.slice(0, 4).map((mediaMsg: Message, idx: number) => (
                      <div 
                        key={mediaMsg._id} 
                        className={cn(
                          "relative bg-slate-900/10 overflow-hidden",
                          groupedMedia.length === 3 && idx === 0 ? "row-span-2" : ""
                        )}
                      >
                        {mediaMsg.type === "image" && mediaMsg.media?.url && (
                          <Image
                            src={mediaMsg.media.url}
                            alt="Grouped media"
                            width={400}
                            height={400}
                            className="h-full w-full object-cover min-h-[140px] transition-transform hover:scale-110 duration-500"
                          />
                        )}
                        {mediaMsg.type === "video" && mediaMsg.media?.url && (
                          <div className="relative group/video">
                            <video
                              src={mediaMsg.media.url}
                              className="h-full w-full object-cover min-h-[140px]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="h-8 w-8 text-white fill-current opacity-70 group-hover/video:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        )}
                        {idx === 3 && groupedMedia.length > 4 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-colors hover:bg-black/50">
                            <span className="text-2xl font-black text-white">+{groupedMedia.length - 4}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {message.type === "voice" && message.media?.url ? (
                  <VoiceNotePlayer url={message.media.url} isOwnMessage={isOwnMessage} />
                ) : null}

                {message.type === "file" && message.media?.url ? (
                  <div
                    className={cn(
                      "mb-2.5 flex items-center gap-3 rounded-2xl bg-white/10 p-3 shadow-inner ring-1 ring-black/5",
                      !isOwnMessage && "bg-slate-50 dark:bg-slate-900/40"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-sm",
                        isOwnMessage ? "bg-white/20" : "bg-[#6d7af7]/5 dark:bg-white/5"
                      )}
                    >
                      <FileText className={cn("h-6 w-6", isOwnMessage ? "text-white" : "text-[#6d7af7]")} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-bold tracking-tight", isOwnMessage ? "text-white" : "text-slate-800 dark:text-slate-100")}>
                        {message.media.originalName || "Document"}
                      </p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-wider opacity-60 mt-0.5", isOwnMessage ? "text-white" : "text-slate-500")}>
                        {formatFileSize(message.media.bytes)}
                      </p>
                    </div>
                    <a
                      href={message.media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-all hover:scale-110",
                        isOwnMessage ? "bg-white/20 hover:bg-white/30 text-white" : "bg-[#6d7af7] text-white hover:bg-[#5b68d6]"
                      )}
                    >
                      <Paperclip className="h-4 w-4 rotate-45" />
                    </a>
                  </div>
                ) : null}

                {message.content ? (
                  <p className="whitespace-pre-wrap break-words leading-[1.6] tracking-[-0.01em] font-medium">
                    {renderMessageContent(message.content, isOwnMessage)}
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className={cn(
            "mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-bold tabular-nums tracking-wider uppercase",
            isOwnMessage ? "text-white/60" : "text-slate-400"
          )}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {isOwnMessage && (
              <StatusIcon
                status={message.status}
                optimistic={message.optimistic}
                timestamp={message.createdAt}
              />
            )}
          </div>
          
          {/* Reaction Overlay */}
          <div className={cn(
            "absolute -bottom-2",
            isOwnMessage ? "left-0 translate-x-[2px]" : "right-0 translate-x-[-2px]"
          )}>
            <MessageReactions reactions={message.reactions} currentUserId={currentUserId} onReact={handleReact} isOwnMessage={isOwnMessage} />
          </div>
        </div>

        {/* Hover Actions Menu */}
        <div className={cn(
          "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 delay-100 self-center translate-y-[-10px] group-hover:translate-y-0 pb-6",
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}>
          <button
            onClick={() => onReply?.(message)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 hover:scale-110 transition-transform hover:text-[#6d7af7]"
            title="Reply"
          >
            <CornerUpLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-lg ring-1 ring-black/5 hover:scale-110 transition-transform hover:text-[#fbbf24]"
            title="React"
          >
            <SmilePlus className="h-4 w-4" />
          </button>
          {isOwnMessage && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full shadow-lg ring-1 ring-black/5 hover:scale-110 transition-all",
                  showDeleteConfirm ? "bg-red-500 text-white" : "bg-white dark:bg-slate-800 hover:text-red-500"
                )}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: isOwnMessage ? -10 : 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className={cn(
                      "absolute bottom-[120%] flex items-center gap-1 rounded-full bg-white dark:bg-slate-800 p-1 shadow-2xl ring-1 ring-black/10 z-50 overflow-hidden",
                      isOwnMessage ? "right-0" : "left-0"
                    )}
                  >
                    <button
                      onClick={() => handleDeleteClick("me")}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                    >
                      For Me
                    </button>
                    <div className="w-[1px] h-3 bg-slate-200 dark:bg-slate-700" />
                    <button
                      onClick={() => handleDeleteClick("everyone")}
                      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors whitespace-nowrap"
                    >
                      Everyone
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
