"use client";

import { Avatar } from "@/components/ui/avatar";
import { ContextMenu, useContextMenu, ContextMenuAction } from "@/components/ui/context-menu";
import {
  Check,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Search,
  Trash2,
  CheckCheck,
  Archive,
  Copy,
  Palette,
} from "lucide-react";
import { useState } from "react";
import { Chat } from "@/lib/types";
import { cn, formatConversationDate } from "@/lib/utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ChatAppearanceModal } from "../ChatAppearanceModal";

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
  onCollapse?: () => void;
  isCollapsed?: boolean;
  onExpand?: () => void;
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
  onCollapse,
  isCollapsed = false,
  onExpand,
}: SidebarProps) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [deleteDialogChatId, setDeleteDialogChatId] = useState<string | null>(null);
  const [appearanceModalChatId, setAppearanceModalChatId] = useState<string | null>(null);
  
  const contextMenu = useContextMenu();

  const getContextMenuActions = (chat: Chat): ContextMenuAction[] => {
    const isUnread = chat.unreadCount > 0;
    
    return [
      {
        id: "mark-read",
        label: isUnread ? "Mark as read" : "Mark as unread",
        icon: isUnread ? <CheckCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />,
        dividerBefore: false,
      },
      {
        id: "delete",
        label: "Delete chat",
        icon: <Trash2 className="h-4 w-4" />,
        variant: "danger",
      },
      {
        id: "copy-link",
        label: "Copy chat link",
        icon: <Copy className="h-4 w-4" />,
        dividerBefore: true,
      },
      {
        id: "clear",
        label: "Clear messages",
        icon: <Archive className="h-4 w-4" />,
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: <Palette className="h-4 w-4" />,
        dividerBefore: true,
      },
    ];
  };

  const handleContextMenuAction = (actionId: string, chatId: string) => {
    switch (actionId) {
      case "mark-read": {
        const target = chats.find((c) => c._id === chatId);
        const isUnread = (target?.unreadCount || 0) > 0;
        if (isUnread) onMarkChatRead(chatId);
        else onMarkChatUnread(chatId);
        break;
      }
      case "delete":
        setDeleteDialogChatId(chatId);
        break;
      case "copy-link":
        navigator.clipboard.writeText(`${window.location.origin}/?chat=${chatId}`);
        break;
      case "clear":
        onClearChatMessages(chatId);
        break;
      case "appearance":
        setAppearanceModalChatId(chatId);
        break;
    }
    contextMenu.close();
  };

  const filteredBySearch = chats.filter((chat) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const name = chat.isGroup ? chat.groupName?.toLowerCase() : chat.otherParticipant?.name?.toLowerCase();
    const lastMsg = chat.lastMessage?.content?.toLowerCase();
    return (name && name.includes(searchLower)) || (lastMsg && lastMsg.includes(searchLower));
  });

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

  if (isCollapsed) {
    return (
      <div className="relative h-full shrink-0 w-12 border-r border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
        <button
          onClick={onExpand}
          className="absolute left-1/2 top-1/2 z-10 flex h-10 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-100 shadow-md hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
          title="Expand sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-slate-600 dark:text-slate-300">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-[300px] shrink-0 flex-col border-r border-slate-200/70 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Chats
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              Your conversations
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onToggleSelectionMode ? (
              <button
                type="button"
                onClick={onToggleSelectionMode}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-95",
                  isSelectionMode
                    ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                )}
                title="Select"
              >
                <Check className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenNewChat?.()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">New</span>
            </button>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                title="Collapse sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-xl border bg-white px-3 py-2 shadow-sm transition-all dark:bg-slate-900",
            isSearchFocused
              ? "border-blue-200 ring-2 ring-blue-100 dark:border-slate-700 dark:ring-0"
              : "border-slate-200 hover:border-slate-300 dark:border-slate-800"
          )}
        >
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search chats..."
            className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none dark:text-slate-100"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isLoading && Array.from({ length: 6 }).map((_, i) => <div key={i} className="mb-2 h-20 rounded-2xl animate-pulse bg-slate-50 dark:bg-slate-800/40" />)}
        {!isLoading && filteredBySearch.map((chat) => {
          const isSelected = selectedChatId === chat._id;
          const preview = getChatPreview(chat);
          const displayName = chat.isGroup ? chat.groupName || "Group" : chat.otherParticipant?.name || "User";
          const displayAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;
          const hasUnread = chat.unreadCount > 0;
          const isOnline = !chat.isGroup && !!chat.otherParticipant?._id && onlineUserIds.includes(chat.otherParticipant._id);
          
          return (
            <div 
              key={chat._id} 
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors mb-1", 
                isSelected ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer",
                isSelectionMode && selectedChatIds.includes(chat._id) && "ring-2 ring-blue-500/30"
              )} 
              onClick={() => handleChatClick(chat._id)}
              onContextMenu={(e) => contextMenu.open(e, chat._id)}
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
                <Avatar src={displayAvatar} name={displayName} className="h-11 w-11 rounded-xl shadow-sm transform transition-transform group-hover:scale-[1.02]" />
                {isOnline ? (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 shadow-sm dark:border-slate-900" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <h3 className={cn(
                    "truncate text-sm tracking-tight", 
                    hasUnread ? "font-bold text-slate-900 dark:text-slate-50" : "font-semibold text-slate-900 dark:text-slate-100"
                  )}>
                    {displayName}
                  </h3>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 tabular-nums">
                    {formatConversationDate(chat.lastMessage?.createdAt || chat.updatedAt)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-4">
                  <p
                    className={cn(
                      "truncate text-[13px] font-medium leading-tight",
                      hasUnread ? "text-slate-600 dark:text-slate-300" : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {preview.isMedia ? (
                        <span className={cn("shrink-0", hasUnread ? "text-slate-500 dark:text-slate-300" : "text-slate-400")}>
                          <MessageTypeIcon type={preview.type} />
                        </span>
                      ) : null}
                      <span className="truncate">{preview.text}</span>
                    </span>
                  </p>
                  {hasUnread && (
                    <div className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-600 px-1.5 text-[9px] font-black text-white">
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
      
      {contextMenu.isOpen && contextMenu.targetId && (
        <ContextMenu
          position={contextMenu.position}
          actions={getContextMenuActions(chats.find(c => c._id === contextMenu.targetId)!)}
          onAction={(actionId) => handleContextMenuAction(actionId, contextMenu.targetId!)}
          onClose={contextMenu.close}
        />
      )}

      {appearanceModalChatId && (
        <ChatAppearanceModal
          isOpen={!!appearanceModalChatId}
          onClose={() => setAppearanceModalChatId(null)}
          chat={chats.find(c => c._id === appearanceModalChatId)!}
        />
      )}
    </aside>
  );
};
