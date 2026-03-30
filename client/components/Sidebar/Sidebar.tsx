"use client";

import Image from "next/image";
import {
  Check,
  CheckCheck,
  EllipsisVertical,
  MailCheck,
  MailMinus,
  MessageCircleMore,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Chat } from "@/lib/types";
import { cn, formatConversationDate } from "@/lib/utils";

type SidebarProps = {
  chats: Chat[];
  selectedChatId: string | null;
  currentUserId?: string;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onMarkChatRead: (chatId: string) => void;
  onMarkChatUnread: (chatId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  onlineUserIds: string[];
};

export const Sidebar = ({
  chats,
  selectedChatId,
  currentUserId,
  onSelectChat,
  onDeleteChat,
  onMarkChatRead,
  onMarkChatUnread,
  searchTerm,
  onSearchChange,
  isLoading,
  onlineUserIds,
}: SidebarProps) => {
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);

  const getChatPreview = (chat: Chat) => {
    if (!chat.lastMessage) {
      return "No messages yet";
    }

    if (chat.lastMessage.type === "image") {
      return chat.lastMessage.content || "Photo";
    }

    if (chat.lastMessage.type === "video") {
      return chat.lastMessage.content || "Video";
    }

    if (chat.lastMessage.type === "voice") {
      return "Voice note";
    }

    return chat.lastMessage.content || "No messages yet";
  };

  useEffect(() => {
    setMenuOpenChatId((current) =>
      current && chats.some((chat) => chat._id === current) ? current : null
    );
  }, [chats]);

  return (
    <aside className="surface-elevated flex h-full w-full flex-col rounded-[32px] p-4 xl:max-w-sm">
      <div className="mb-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-lagoon/60">
              Messages
            </p>
            <h2 className="soft-heading mt-1 text-2xl font-semibold text-ink">Conversations</h2>
          </div>
          <span className="rounded-2xl bg-white/60 px-3.5 py-1.5 text-xs font-medium text-ink/50 shadow-soft">
            {chats.length} {chats.length === 1 ? 'chat' : 'chats'}
          </span>
        </div>
      </div>

      <label className="mb-5 flex items-center gap-3 rounded-2xl border border-ink/8 bg-white/60 px-4 py-3 shadow-soft transition-all focus-within:border-lagoon/30 focus-within:shadow-md">
        <Search className="h-4 w-4 text-ink/40" />
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search conversations..."
          className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/30"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange('')}
            className="rounded-full p-0.5 text-ink/40 hover:bg-ink/5 hover:text-ink"
          >
            ×
          </button>
        )}
      </label>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[28px] border border-ink/5 bg-white/50 p-4"
              >
                <div className="mb-3 h-13 w-13 rounded-2xl bg-shell" />
                <div className="mb-2 h-4 w-32 rounded-full bg-shell" />
                <div className="h-3 w-44 rounded-full bg-shell" />
              </div>
            ))
          : null}

        {!isLoading && chats.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[32px] border border-dashed border-ink/10 bg-white/40 px-6 py-12 text-center">
            <div className="mb-4 rounded-3xl bg-lagoon/5 p-4">
              <MessageCircleMore className="h-8 w-8 text-lagoon/40" />
            </div>
            <p className="text-base font-semibold text-ink/60">No conversations yet</p>
            <p className="mt-2 text-sm text-ink/40">
              Start a chat with someone and your conversations will appear here.
            </p>
          </div>
        ) : null}

        {chats.map((chat, index) => {
          const isSelected = selectedChatId === chat._id;
          const isMenuOpen = menuOpenChatId === chat._id;
          const isOnline = onlineUserIds.includes(chat.otherParticipant?._id || "");

          return (
            <div
              key={chat._id}
              className={cn(
                "group relative rounded-[28px] border px-4 py-4 transition-all duration-300",
                isSelected
                  ? "border-lagoon/30 bg-gradient-to-br from-lagoon/10 to-lagoon/5 shadow-md"
                  : "border-white/60 bg-white/50 hover:border-sand/50 hover:bg-white hover:shadow-md hover:-translate-y-0.5"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                type="button"
                onClick={() => onSelectChat(chat._id)}
                className="flex w-full items-start gap-3.5 text-left"
              >
                <div className="warm-outline relative h-13 w-13 shrink-0 overflow-hidden rounded-2xl bg-sand">
                  {chat.otherParticipant?.avatar ? (
                    <Image
                      src={chat.otherParticipant.avatar}
                      alt={chat.otherParticipant?.name || "User avatar"}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand to-sand/70 text-lg font-semibold text-ink/50">
                      {(chat.otherParticipant?.name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white transition-colors",
                      isOnline ? "bg-emerald-400" : "bg-slate-300"
                    )}
                  />
                </div>

                <div className="min-w-0 flex-1 pr-10">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {chat.otherParticipant?.name || "Unknown user"}
                    </p>
                    <span className={cn("shrink-0 text-xs", isSelected ? "text-lagoon/70" : "text-ink/40")}>
                      {formatConversationDate(chat.lastMessage?.createdAt || chat.updatedAt)}
                    </span>
                  </div>
                  
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {chat.lastMessage && currentUserId ? (
                      (() => {
                        const senderId = typeof chat.lastMessage.senderId === 'string' 
                          ? chat.lastMessage.senderId 
                          : chat.lastMessage.senderId?._id;
                        const isSentByMe = senderId === currentUserId;
                        
                        if (isSentByMe && chat.lastMessage.status) {
                          return (
                            <span className="shrink-0" title={chat.lastMessage.status}>
                              {chat.lastMessage.status === 'seen' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-lagoon" />
                              ) : chat.lastMessage.status === 'delivered' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-ink/50" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-ink/50" />
                              )}
                            </span>
                          );
                        }
                        return null;
                      })()
                    ) : null}
                    <p className={cn("truncate text-sm", isSelected ? "text-ink/70" : "text-ink/50")}>
                      {getChatPreview(chat)}
                    </p>
                  </div>
                </div>

                {chat.unreadCount > 0 ? (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-ember to-ember/80 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                    {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                  </span>
                ) : null}
              </button>

              <div className="absolute right-3 top-3">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenuOpenChatId((current) => (current === chat._id ? null : chat._id));
                  }}
                  className={cn(
                    "rounded-xl p-2 transition-all",
                    isSelected 
                      ? "text-lagoon/70 hover:bg-lagoon/10" 
                      : "text-ink/40 hover:bg-ink/5 hover:text-ink"
                  )}
                  aria-label="Chat actions"
                >
                  <EllipsisVertical className="h-4 w-4" />
                </button>

                {isMenuOpen ? (
                  <div
                    className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-ink/10 bg-white/95 p-2 text-ink shadow-lg animate-fade-in"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onMarkChatRead(chat._id);
                        setMenuOpenChatId(null);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all hover:bg-lagoon/5 hover:text-lagoon"
                    >
                      <MailCheck className="h-4 w-4" />
                      Mark as read
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onMarkChatUnread(chat._id);
                        setMenuOpenChatId(null);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all hover:bg-lagoon/5 hover:text-lagoon"
                    >
                      <MailMinus className="h-4 w-4" />
                      Mark unread
                    </button>
                    <div className="my-1 border-t border-ink/5" />
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteChat(chat._id);
                        setMenuOpenChatId(null);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-rose-600 transition-all hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete chat
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
