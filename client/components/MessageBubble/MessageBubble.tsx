"use client";

import Image from "next/image";
import { useState } from "react";
import { Check, CheckCheck, Clock3, CornerUpLeft, Trash2 } from "lucide-react";
import { Message } from "@/lib/types";
import { cn, formatMessageTime, formatStatusTime } from "@/lib/utils";

type MessageBubbleProps = {
  message: Message;
  isOwnMessage: boolean;
  onReply?: (message: Message) => void;
  onDelete?: (message: Message, scope: "me" | "everyone") => void;
};

const StatusIcon = ({ status, optimistic, timestamp }: { status: Message["status"]; optimistic?: boolean; timestamp?: string | Date | null }) => {
  const statusTime = timestamp ? formatStatusTime(timestamp) : null;

  if (optimistic) {
    return (
      <span className="flex items-center gap-1" aria-label="Sending">
        <Clock3 className="h-3.5 w-3.5" />
        {statusTime && <span className="text-[10px]">{statusTime}</span>}
      </span>
    );
  }

  if (status === "seen") {
    return (
      <span className="flex items-center gap-1" aria-label={`Seen at ${statusTime || ''}`}>
        <CheckCheck className="h-3.5 w-3.5" />
        {statusTime && <span className="text-[10px]">{statusTime}</span>}
      </span>
    );
  }

  if (status === "delivered") {
    return (
      <span className="flex items-center gap-1" aria-label={`Delivered at ${statusTime || ''}`}>
        <CheckCheck className="h-3.5 w-3.5 opacity-80" />
        {statusTime && <span className="text-[10px]">{statusTime}</span>}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1" aria-label={`Sent at ${statusTime || ''}`}>
      <Check className="h-3.5 w-3.5 opacity-80" />
      {statusTime && <span className="text-[10px]">{statusTime}</span>}
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
            "underline underline-offset-2 break-all",
            isOwnMessage ? "text-white" : "text-lagoon"
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

const formatAudioDuration = (seconds?: number | null) => {
  if (!seconds || Number.isNaN(seconds)) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
};

export const MessageBubble = ({ message, isOwnMessage, onReply, onDelete }: MessageBubbleProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteClick = (scope: "me" | "everyone") => {
    if (showDeleteConfirm) {
      onDelete?.(message, scope);
      setShowDeleteConfirm(false);
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div 
      className={cn("group flex", isOwnMessage ? "justify-end" : "justify-start")}
      role="article"
      aria-label={`Message from ${isOwnMessage ? "you" : "other user"} at ${formatMessageTime(message.createdAt)}`}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-[26px] px-4 py-3 text-sm shadow-soft transition-all duration-200 sm:max-w-[70%]",
          isOwnMessage
            ? "rounded-br-md bg-[linear-gradient(135deg,#155e75_0%,#1d6a81_58%,#104455_100%)] text-white"
            : "rounded-bl-md border border-ink/8 bg-[linear-gradient(180deg,#fffdfa,#f8f1e7)] text-ink"
        )}
        onKeyDown={handleKeyDown}
      >
        {message.replyTo ? (
          <div
            className={cn(
              "mb-3 rounded-2xl border px-3 py-2 text-xs",
              isOwnMessage
                ? "border-white/20 bg-white/10 text-white/85"
                : "border-ink/8 bg-white/75 text-ink/70"
            )}
          >
            <p className="font-semibold">
              {message.replyTo.senderId?.name || message.replyTo.senderId?.username || "Message"}
            </p>
            <p className="mt-1 line-clamp-2">
              {message.replyTo.deletedForEveryone ? "This message was deleted" : message.replyTo.content}
            </p>
          </div>
        ) : null}

        {message.deletedForEveryone ? (
          <p className="whitespace-pre-wrap break-words leading-6">This message was deleted</p>
        ) : (
          <>
            {message.type === "image" && message.media?.url ? (
              <a
                href={message.media.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 block overflow-hidden rounded-2xl"
              >
                <Image
                  src={message.media.url}
                  alt={message.content || "Shared image"}
                  width={message.media.width || 1200}
                  height={message.media.height || 900}
                  className="h-auto max-h-80 w-full object-cover"
                />
              </a>
            ) : null}

            {message.type === "video" && message.media?.url ? (
              <video
                controls
                preload="metadata"
                className="mb-3 max-h-80 w-full rounded-2xl bg-black/80"
                src={message.media.url}
              />
            ) : null}

            {message.type === "voice" && message.media?.url ? (
              <div
                className={cn(
                  "mb-3 rounded-2xl border px-3 py-3",
                  isOwnMessage ? "border-white/10 bg-white/10" : "border-ink/8 bg-white/70"
                )}
              >
                {message.media.waveform?.length ? (
                  <div className="mb-3 flex h-12 items-end gap-1">
                    {message.media.waveform.map((bar, index) => (
                      <span
                        key={`${message._id}-wave-${index}`}
                        className={cn(
                          "w-full rounded-full",
                          isOwnMessage ? "bg-white/80" : "bg-lagoon/75"
                        )}
                        style={{ height: `${Math.max(14, Math.round(bar * 100))}%` }}
                      />
                    ))}
                  </div>
                ) : null}

                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className={cn(isOwnMessage ? "text-white/75" : "text-ink/55")}>Voice note</span>
                  <span className={cn(isOwnMessage ? "text-white/75" : "text-ink/55")}>
                    {formatAudioDuration(message.media.duration)}
                  </span>
                </div>

                <audio controls preload="metadata" className="w-full" src={message.media.url} />
              </div>
            ) : null}

            {message.content ? (
              <p className="whitespace-pre-wrap break-words leading-6">
                {renderMessageContent(message.content, isOwnMessage)}
              </p>
            ) : null}
          </>
        )}

        <div
          className={cn(
            "mt-2 flex items-center justify-between gap-3 text-[11px]",
            isOwnMessage ? "text-white/75" : "text-ink/45"
          )}
        >
          <div className="flex items-center gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
            <button 
              type="button" 
              onClick={() => onReply?.(message)} 
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-white/20"
              aria-label="Reply to this message"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reply</span>
            </button>
            <button
              type="button"
              onClick={() => handleDeleteClick("me")}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 transition",
                showDeleteConfirm ? "bg-red-500 text-white animate-pulse" : "hover:bg-white/20"
              )}
              aria-label={showDeleteConfirm ? "Click again to confirm delete for me" : "Delete for me"}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{showDeleteConfirm ? "Confirm?" : "Delete"}</span>
            </button>
            {isOwnMessage && !message.deletedForEveryone ? (
              <button
                type="button"
                onClick={() => handleDeleteClick("everyone")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 transition",
                  showDeleteConfirm ? "bg-red-600 text-white animate-pulse" : "hover:bg-white/20"
                )}
                aria-label={showDeleteConfirm ? "Click again to confirm delete for everyone" : "Delete for everyone"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{showDeleteConfirm ? "Confirm?" : "Delete all"}</span>
              </button>
            ) : null}
          </div>

          <div
            className={cn(
              "flex items-center gap-1",
            isOwnMessage ? "justify-end text-white/75" : "justify-start text-ink/45"
          )}
          >
            <span aria-label={`Sent at ${formatMessageTime(message.createdAt)}`}>
              {formatMessageTime(message.createdAt)}
            </span>
            {isOwnMessage ? (
              <StatusIcon 
                status={message.status} 
                optimistic={message.optimistic}
                timestamp={message.status === 'seen' ? message.seenAt : message.status === 'delivered' ? message.deliveredAt : message.createdAt}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
