"use client";

import { Avatar } from "@/components/ui/avatar";
import {
  Check,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Chat } from "@/lib/types";
import { cn, formatConversationDate } from "@/lib/utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

type SidebarProps = {
  chats: Chat[];
  selectedChatId: string | null;
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
  onOpenNewChat?: () => void;
};

const MessageTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case "image": return <ImageIcon className="h-3.5 w-3.5" />;
    case "video": return <Check className="h-3.5 w-3.5" />; 
    case "voice": return <Check className="h-3.5 w-3.5" />; 
    default: return <Paperclip className="h-3.5 w-3.5" />;
  }
};

export const Sidebar = ({
  chats,
  selectedChatId,
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
  onOpenNewChat,
}: SidebarProps) => {
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "groups">("all");
  const [deleteDialogChatId, setDeleteDialogChatId] = useState<string | null>(null);

  useEffect(() => {
    setMenuOpenChatId((current) => current && chats.some((chat) => chat._id === current) ? current : null);
  }, [chats]);

  const filteredByChip = activeFilter === "all"
    ? chats
    : activeFilter === "unread" ? chats.filter((chat) => chat.unreadCount > 0) : chats.filter((chat) => chat.isGroup);

  const filteredBySearch = filteredByChip.filter((chat) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const name = chat.isGroup ? chat.groupName?.toLowerCase() : chat.otherParticipant?.name?.toLowerCase();
    const lastMsg = chat.lastMessage?.content?.toLowerCase();
    return (name && name.includes(searchLower)) || (lastMsg && lastMsg.includes(searchLower));
  });

  const unreadChats = chats.filter((chat) => chat.unreadCount > 0).length;
  const groupChats = chats.filter((chat) => chat.isGroup).length;
  const onlineChats = chats.filter((chat) => onlineUserIds.includes(chat.otherParticipant?._id || "")).length;

  const getChatPreview = (chat: Chat) => {
    if (!chat.lastMessage) return { text: "No messages yet", isMedia: false, type: "text" };
    if (chat.lastMessage.type === "image") return { text: chat.lastMessage.content || "Photo", isMedia: true, type: "image" };
    return { text: chat.lastMessage.content || "No messages yet", isMedia: false, type: chat.lastMessage.type || "text" };
  };

  const handleChatClick = (chatId: string) => {
    if (isSelectionMode && onSelectChats) {
      const nextSelection = selectedChatIds.includes(chatId) ? selectedChatIds.filter(id => id !== chatId) : [...selectedChatIds, chatId];
      onSelectChats(nextSelection);
      return;
    }
    onSelectChat(chatId);
  };

  return (
    <aside className="flex h-full w-full flex-col bg-white dark:bg-slate-900">
      {/* Header section */}
      <div className="px-5 sm:px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <h2 className="soft-heading text-xl sm:text-2xl font-bold uppercase tracking-[0.1em] text-[#2d3142] dark:text-slate-100">
            Messages
          </h2>
          <div className="flex gap-1.5 sm:gap-2">
            <button 
              onClick={() => setIsSearchFocused(!isSearchFocused)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl transition-all active:scale-95",
                isSearchFocused ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
              )}
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onOpenNewChat?.()}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all active:scale-95 dark:bg-slate-800 dark:text-slate-500"
              title="New Chat"
            >
              <Plus className="h-5 w-5" />
            </button>
            <button 
              onClick={() => onToggleSelectionMode?.()}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl transition-all active:scale-95",
                isSelectionMode 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-500"
              )}
              title="Select Mode"
            >
              <Check className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isSearchFocused && (
          <div className="mt-4 animate-fade-up">
            <input 
              value={searchTerm} 
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search conversations..."
              className="input-field shadow-sm"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Active Users Carousel */}
      <div className="mt-2 flex gap-4 overflow-x-auto px-5 sm:px-6 py-4 no-scrollbar">
        {chats
          .filter((chat) => !chat.isGroup && chat.otherParticipant)
          .slice(0, 10)
          .map((chat) => {
            const user = chat.otherParticipant;
            const isOnline = onlineUserIds.includes(user?._id || "");
            return (
              <div key={chat._id} className="flex flex-col items-center gap-2">
                <div className="relative cursor-pointer transition-transform hover:scale-105 active:scale-95" onClick={() => handleChatClick(chat._id)}>
                  <Avatar
                    src={user?.avatar}
                    name={user?.name || "?"}
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-[18px] sm:rounded-[22px] border-2 border-white shadow-md ring-1 ring-slate-100 dark:border-slate-800 dark:ring-slate-700"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-slate-800" />
                  )}
                </div>
              </div>
            );
          })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="mb-2 h-20 rounded-2xl animate-pulse bg-slate-50 dark:bg-slate-800/40" />)}
        {!isLoading && filteredBySearch.map((chat) => {
          const isSelected = selectedChatId === chat._id;
          const preview = getChatPreview(chat);
          const displayName = chat.isGroup ? chat.groupName || "Group" : chat.otherParticipant?.name || "User";
          const displayAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;
          const hasUnread = chat.unreadCount > 0;
          
          return (
            <div 
              key={chat._id} 
              className={cn(
                "group relative flex items-center gap-3.5 sm:gap-4 rounded-3xl px-3.5 py-4 transition-all duration-200 mb-1", 
                isSelected ? "bg-blue-50/50 dark:bg-slate-800/80 shadow-sm" : "hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer",
                isSelectionMode && selectedChatIds.includes(chat._id) && "ring-2 ring-blue-500/30"
              )} 
              onClick={() => handleChatClick(chat._id)}
            >
              {isSelectionMode && (
                <div className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
                  selectedChatIds.includes(chat._id) 
                    ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-500/20" 
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                )}>
                  {selectedChatIds.includes(chat._id) && (
                    <Check className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
              )}

              <div className="relative shrink-0">
                <Avatar src={displayAvatar} name={displayName} className="h-12 w-12 sm:h-14 sm:w-14 rounded-[18px] sm:rounded-[22px] shadow-sm transform transition-transform group-hover:scale-105" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <h3 className={cn(
                    "truncate text-[15px] sm:text-[16px] font-bold tracking-tight", 
                    hasUnread ? "text-blue-600 dark:text-blue-400" : "text-[#2d3142] dark:text-slate-100"
                  )}>
                    {displayName}
                  </h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">
                    {formatConversationDate(chat.lastMessage?.createdAt || chat.updatedAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-4">
                  <p className={cn(
                    "truncate text-[13px] sm:text-[14px] font-medium leading-tight", 
                    hasUnread ? "text-slate-700 dark:text-slate-300" : "text-slate-400 dark:text-slate-500"
                  )}>
                    {preview.text}
                  </p>
                  {hasUnread && (
                    <div className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[9px] font-black text-white shadow-lg shadow-blue-600/30">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DeleteConfirmDialog
        isOpen={deleteDialogChatId !== null}
        onConfirm={() => { if (deleteDialogChatId) onDeleteChat(deleteDialogChatId); setDeleteDialogChatId(null); }}
        onCancel={() => setDeleteDialogChatId(null)}
      />
    </aside>
  );
};
