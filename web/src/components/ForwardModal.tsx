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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="forward-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Forward className="h-4 w-4" />
            </div>
            <h2 id="forward-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
              Forward Message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="bg-slate-50 dark:bg-slate-800/50 px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <span className="font-semibold text-slate-400">Content:</span>
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
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl bg-slate-100 dark:bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
          {filteredChats.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
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
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={avatar}
                      name={name || "Chat"}
                      className="h-9 w-9 shrink-0"
                    />
                    <div className="truncate">
                      <p className="truncate text-sm font-semibold">{name || "Conversation"}</p>
                      <p className="truncate text-xs text-slate-400">
                        {chat.isGroup ? "Group Chat" : "Direct Message"}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-3.5 bg-slate-50/50 dark:bg-slate-800/20">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedChatId || isSending || sentSuccess}
            onClick={handleForward}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all",
              sentSuccess
                ? "bg-emerald-600"
                : "bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
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
