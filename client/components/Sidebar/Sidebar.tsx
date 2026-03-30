"use client";

import Image from "next/image";
import {
  Check,
  CheckCheck,
  EllipsisVertical,
  Image as ImageIcon,
  MailCheck,
  MailMinus,
  MessageCircle,
  MessageCircleMore,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Pin,
  Search,
  Trash2,
  Video,
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
  onClearChatMessages: (chatId: string) => void;
  onMarkChatRead: (chatId: string) => void;
  onMarkChatUnread: (chatId: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  onlineUserIds: string[];
  selectedChatIds?: string[];
  onSelectChats?: (chatIds: string[]) => void;
  isSelectionMode?: boolean;
  onToggleSelectionMode?: () => void;
};

const MessageTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "image":
      return <ImageIcon className="h-3.5 w-3.5" />;
    case "video":
      return <Video className="h-3.5 w-3.5" />;
    case "voice":
      return <Mic className="h-3.5 w-3.5" />;
    default:
      return <Paperclip className="h-3.5 w-3.5" />;
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "seen":
      return <CheckCheck className="h-4 w-4 text-lagoon" />;
    case "delivered":
      return <CheckCheck className="h-4 w-4 text-ink/40" />;
    default:
      return <Check className="h-4 w-4 text-ink/40" />;
  }
};

export const Sidebar = ({
  chats,
  selectedChatId,
  currentUserId,
  onSelectChat,
  onDeleteChat,
  onClearChatMessages,
  onMarkChatRead,
  onMarkChatUnread,
  searchTerm,
  onSearchChange,
  isLoading,
  onlineUserIds,
  selectedChatIds = [],
  onSelectChats,
  isSelectionMode = false,
  onToggleSelectionMode,
}: SidebarProps) => {
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const getChatPreview = (chat: Chat) => {
    if (!chat.lastMessage) {
      return { text: "No messages yet", isMedia: false };
    }

    if (chat.lastMessage.type === "image") {
      return { text: chat.lastMessage.content || "Photo", isMedia: true };
    }

    if (chat.lastMessage.type === "video") {
      return { text: chat.lastMessage.content || "Video", isMedia: true };
    }

    if (chat.lastMessage.type === "voice") {
      return { text: "Voice message", isMedia: true };
    }

    return { text: chat.lastMessage.content || "No messages yet", isMedia: false };
  };

  const unreadChats = chats.filter((c) => c.unreadCount > 0).length;
  const onlineChats = chats.filter((c) => onlineUserIds.includes(c.otherParticipant?._id || "")).length;

  const handleChatClick = (chatId: string) => {
    if (isSelectionMode && onSelectChats) {
      const newSelection = selectedChatIds.includes(chatId)
        ? selectedChatIds.filter((id) => id !== chatId)
        : [...selectedChatIds, chatId];
      onSelectChats(newSelection);
    } else {
      onSelectChat(chatId);
    }
  };

  const handleCheckboxChange = (chatId: string, checked: boolean) => {
    if (onSelectChats) {
      const newSelection = checked
        ? [...selectedChatIds, chatId]
        : selectedChatIds.filter((id) => id !== chatId);
      onSelectChats(newSelection);
    }
  };

  useEffect(() => {
    setMenuOpenChatId((current) =>
      current && chats.some((chat) => chat._id === current) ? current : null
    );
  }, [chats]);

  return (
    <aside className="surface-elevated flex h-full w-full flex-col rounded-[28px] p-4 sm:rounded-[36px] sm:p-5 xl:max-w-[380px]">
      <div className="mb-4 sm:mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-lagoon/60">
                Messages
              </p>
              {isSelectionMode && selectedChatIds.length > 0 && (
                <span className="rounded-full bg-lagoon/15 px-2.5 py-0.5 text-[10px] font-bold text-lagoon">
                  {selectedChatIds.length} selected
                </span>
              )}
            </div>
            <h2 className="soft-heading text-[1.45rem] font-semibold tracking-tight text-ink sm:text-[1.75rem]">
              Conversations
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleSelectionMode}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-200",
                isSelectionMode
                  ? "border-lagoon/30 bg-lagoon/10 text-lagoon"
                  : "border-ink/10 bg-white/60 text-ink/40 hover:border-ink/20 hover:bg-white hover:text-ink"
              )}
              title={isSelectionMode ? "Cancel selection" : "Select multiple"}
            >
              <Check className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 rounded-2xl bg-lagoon/8 px-3 py-1.5">
              <MessageCircle className="h-3.5 w-3.5 text-lagoon" />
              <span className="text-xs font-semibold text-lagoon">{chats.length}</span>
            </div>
            {unreadChats > 0 && (
              <div className="flex items-center gap-1.5 rounded-2xl bg-ember/10 px-3 py-1.5">
                <span className="text-xs font-bold text-ember">{unreadChats}</span>
                <span className="text-[10px] text-ember/70">unread</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={cn(
        "relative mb-4 flex items-center gap-3 rounded-2xl border bg-white/70 px-3.5 py-3 shadow-soft transition-all duration-300 sm:mb-5 sm:px-4 sm:py-3.5",
        isSearchFocused 
          ? "border-lagoon/40 shadow-md ring-2 ring-lagoon/10" 
          : "border-ink/8 hover:border-ink/15"
      )}>
        <div className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
          isSearchFocused ? "bg-lagoon/10" : "bg-shell"
        )}>
          <Search className={cn("h-4 w-4 transition-colors", isSearchFocused ? "text-lagoon" : "text-ink/40")} />
        </div>
        <input
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search conversations..."
          className="flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-ink/30"
        />
        {searchTerm ? (
          <button
            onClick={() => onSearchChange('')}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/40 transition-all hover:bg-ink/5 hover:text-ink"
          >
            ×
          </button>
        ) : (
          <kbd className="hidden rounded-lg border border-ink/10 bg-shell/80 px-2 py-1 text-[10px] font-medium text-ink/40 sm:flex">
            /
          </kbd>
        )}
      </div>

      {isSelectionMode && selectedChatIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 animate-fade-in">
          <button
            type="button"
            onClick={() => onSelectChats?.(chats.map(c => c._id))}
            className="rounded-lg bg-lagoon/10 px-3 py-1.5 text-xs font-medium text-lagoon transition hover:bg-lagoon/20"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => onSelectChats?.([])}
            className="rounded-lg bg-ink/5 px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:bg-ink/10"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => {
              const unreadIds = chats.filter(c => c.unreadCount > 0).map(c => c._id);
              onSelectChats?.(unreadIds);
            }}
            className="rounded-lg bg-ember/10 px-3 py-1.5 text-xs font-medium text-ember transition hover:bg-ember/20"
          >
            Unread only
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0 pb-2 sm:pr-1">
        {isLoading
          ? Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse group rounded-[28px] border border-ink/5 bg-white/40 p-4"
              >
                <div className="flex gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-2xl bg-shell" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-32 rounded-full bg-shell" />
                    <div className="h-3 w-48 rounded-full bg-shell" />
                  </div>
                </div>
              </div>
            ))
          : null}

        {!isLoading && chats.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-ink/8 bg-white/30 px-6 py-14 text-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-lagoon/10 to-ember/10 blur-2xl" />
              <div className="relative rounded-full bg-gradient-to-br from-lagoon/5 to-lagoon/10 p-5">
                <MessageCircleMore className="h-10 w-10 text-lagoon/40" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-ink/70">No conversations yet</h3>
            <p className="mt-2 max-w-[220px] text-sm text-ink/45 leading-relaxed">
              Start chatting with someone and your conversations will appear here
            </p>
          </div>
        ) : null}

        {chats.map((chat, index) => {
          const isSelected = selectedChatId === chat._id;
          const isMenuOpen = menuOpenChatId === chat._id;
          const isOnline = onlineUserIds.includes(chat.otherParticipant?._id || "");
          const preview = getChatPreview(chat);
          const senderId = typeof chat.lastMessage?.senderId === 'string' 
            ? chat.lastMessage.senderId 
            : chat.lastMessage?.senderId?._id;
          const isSentByMe = senderId === currentUserId;
          const hasUnread = chat.unreadCount > 0;
          const isChecked = selectedChatIds.includes(chat._id);

          return (
            <div
              key={chat._id}
              className={cn(
                "group relative cursor-pointer rounded-[24px] border p-3.5 transition-all duration-300 sm:rounded-[28px] sm:p-4",
                isChecked
                  ? "border-lagoon/40 bg-lagoon/5 ring-1 ring-lagoon/20"
                  : isSelected
                    ? "border-lagoon/30 bg-gradient-to-br from-lagoon/8 to-lagoon/3 shadow-md ring-1 ring-lagoon/10"
                    : "border-transparent bg-white/40 hover:border-ink/10 hover:bg-white/70 hover:shadow-md hover:-translate-y-0.5"
              )}
              style={{ animationDelay: `${index * 40}ms` }}
              onClick={() => handleChatClick(chat._id)}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {isSelectionMode && (
                  <div 
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div 
                      className={cn(
                        "flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border-2 transition-all duration-200",
                        isChecked
                          ? "border-lagoon bg-lagoon text-white"
                          : "border-ink/20 bg-white hover:border-lagoon/50"
                      )}
                      onClick={() => handleCheckboxChange(chat._id, !isChecked)}
                    >
                      {isChecked && <Check className="h-3.5 w-3.5" />}
                    </div>
                  </div>
                )}
                
                <div className="relative shrink-0">
                  <div className={cn(
                    "warm-outline h-12 w-12 overflow-hidden rounded-2xl transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14",
                    hasUnread && !isSelected && !isChecked && "ring-2 ring-ember/30"
                  )}>
                    {chat.otherParticipant?.avatar ? (
                      <Image
                        src={chat.otherParticipant.avatar}
                        alt={chat.otherParticipant?.name || "User"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sand to-sand/60 text-xl font-bold text-ink/40">
                        {(chat.otherParticipant?.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white transition-transform duration-300",
                      isOnline ? "bg-emerald-400" : "bg-slate-300",
                      isOnline && "animate-pulse"
                    )}
                  >
                    {isOnline && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  {hasUnread && !isChecked && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-white shadow-md ring-2 ring-white">
                      {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "truncate font-semibold transition-colors",
                      hasUnread ? "text-ink" : "text-ink/80",
                      isSelected && "text-ink"
                    )}>
                      {chat.otherParticipant?.name || "Unknown"}
                    </p>
                    <span className={cn(
                      "shrink-0 text-[11px] font-medium sm:text-xs",
                      hasUnread ? "text-ember" : isSelected ? "text-lagoon/70" : "text-ink/40"
                    )}>
                      {formatConversationDate(chat.lastMessage?.createdAt || chat.updatedAt)}
                    </span>
                  </div>
                  
                  <div className="mt-1.5 flex items-center gap-2">
                    {isSentByMe && chat.lastMessage?.status ? (
                      <span className="shrink-0" title={chat.lastMessage.status}>
                        <StatusIcon status={chat.lastMessage.status} />
                      </span>
                    ) : null}
                    
                    {preview.isMedia && chat.lastMessage?.type && (
                      <span className={cn(
                        "shrink-0",
                        hasUnread ? "text-ember/80" : "text-ink/40"
                      )}>
                        <MessageTypeIcon type={chat.lastMessage.type} />
                      </span>
                    )}
                    
                    <p className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      hasUnread ? "font-medium text-ink/80" : "text-ink/50",
                      isSelected && "text-ink/70"
                    )}>
                      {preview.text}
                    </p>
                  </div>
                </div>

                {!isSelectionMode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setMenuOpenChatId((current) => (current === chat._id ? null : chat._id));
                      }}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200",
                        isMenuOpen || isSelected 
                          ? "bg-lagoon/10 text-lagoon" 
                          : "text-ink/30 opacity-0 group-hover:opacity-100 hover:bg-ink/5 hover:text-ink"
                      )}
                      aria-label="Chat options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {isMenuOpen && (
                      <div
                        className="absolute right-0 top-full z-40 mt-2 w-52 origin-top-right rounded-2xl border border-ink/10 bg-white/98 p-2 shadow-xl animate-fade-in sm:w-56"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            onMarkChatRead(chat._id);
                            setMenuOpenChatId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink/70 transition-all hover:bg-lagoon/5 hover:text-lagoon"
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
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink/70 transition-all hover:bg-lagoon/5 hover:text-lagoon"
                        >
                          <MailMinus className="h-4 w-4" />
                          Mark unread
                        </button>
                        <div className="my-1.5 border-t border-ink/5" />
                        <button
                          type="button"
                          onClick={() => {
                            onClearChatMessages(chat._id);
                            setMenuOpenChatId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-ink/70 transition-all hover:bg-lagoon/5 hover:text-lagoon"
                        >
                          <Trash2 className="h-4 w-4" />
                          Clear messages
                        </button>
                        <div className="my-1.5 border-t border-ink/5" />
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteChat(chat._id);
                            setMenuOpenChatId(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-rose-600 transition-all hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete chat
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-ink/8 pt-4">
        <div className="flex items-center gap-2 text-xs text-ink/40">
          <span className="flex h-2 w-2 items-center justify-center rounded-full bg-emerald-400"></span>
          <span>{onlineChats} online</span>
        </div>
        <span className="text-xs text-ink/30">{chats.length} conversations</span>
      </div>
    </aside>
  );
};
