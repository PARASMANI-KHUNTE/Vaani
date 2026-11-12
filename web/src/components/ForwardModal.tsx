"use client";

import { useState } from "react";
import { X, Search, Forward, Check } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Chat, Message } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  currentChatId?: string | null;
  message: Message | null;
  onForward: (targetChatId: string) => Promise<void>;
}

export const ForwardModal = ({
  isOpen,
  onClose,
  chats,
  currentChatId,
  message,
  onForward,
}: ForwardModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen || !message) return null;

  const availableChats = chats.filter((c) => c._id !== currentChatId);
  const filteredChats = availableChats.filter((c) => {
    const name = c.isGroup ? c.groupName : c.otherParticipant?.name;
    return (name || "").toLowerCase().includes(searchTerm.trim().toLowerCase());
  });

  const handleForward = async () => {
    if (!selectedChatId) return;
    try {
      setIsSending(true);
      await onForward(selectedChatId);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        setSelectedChatId(null);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Forward failed", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div 
        className="w-full max-w-md animate-in fade-in zoom-in-95 overflow-hidden rounded-2xl border border-line bg-elevated shadow-float duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Forward className="h-4 w-4" />
            </div>
            <h2 id="forward-dialog-title" className="text-base font-bold tracking-tight text-fg">
              Forward Message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="flex items-center gap-2 border-b border-line bg-subtle/50 px-5 py-2.5 text-xs text-muted">
          <span className="font-semibold text-faint">Content:</span>
          <span className="truncate italic">
            {message.type === "text"
              ? message.content
              : message.type === "image"
                ? "Photo"
                : message.type === "video"
                  ? "Video"
                  : message.type === "voice"
                    ? "Voice message"
                    : "File attachment"}
          </span>
        </div>

        {/* Search */}
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-line bg-subtle/60 py-2 pl-9 pr-4 text-sm text-fg outline-none transition-all placeholder:text-faint focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/12"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="max-h-64 space-y-1 overflow-y-auto p-2">
          {filteredChats.length === 0 ? (
            <div className="py-8 text-center text-sm text-faint">
              No conversations found
            </div>
          ) : (
            filteredChats.map((chat) => {
              const name = chat.isGroup ? chat.groupName : chat.otherParticipant?.name;
              const avatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;
              const isSelected = selectedChatId === chat._id;

              return (
                <button
                  key={chat._id}
                  onClick={() => setSelectedChatId(chat._id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors",
                    isSelected
                      ? "bg-brand/[0.07] text-brand"
                      : "text-fg/85 hover:bg-subtle"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar
                      src={avatar}
                      name={name || "Chat"}
                      className="h-9 w-9 shrink-0 rounded-xl"
                    />
                    <div className="truncate">
                      <p className="truncate text-sm font-semibold">{name || "Conversation"}</p>
                      <p className="truncate text-[11px] text-faint">
                        {chat.isGroup ? "Group Chat" : "Direct Message"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-line bg-subtle/40 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-subtle hover:text-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedChatId || isSending || sentSuccess}
            onClick={handleForward}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98]",
              sentSuccess
                ? "bg-emerald-600"
                : "bg-brand hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            {sentSuccess ? (
              <>
                <Check className="h-4 w-4" />
                <span>Forwarded!</span>
              </>
            ) : isSending ? (
              <span>Sending...</span>
            ) : (
              <>
                <Forward className="h-4 w-4" />
                <span>Forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
