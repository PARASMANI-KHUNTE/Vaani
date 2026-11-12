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
  Video,
  Mic,
  ChevronLeft,
  ChevronRight,
  MessagesSquare,
  X,
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
    case "video": return <Video className="h-3.5 w-3.5" />;
    case "voice": return <Mic className="h-3.5 w-3.5" />;
    default: return <Paperclip className="h-3.5 w-3.5" />;
  }
};

const SkeletonRow = () => (
  <div className="mb-1 flex items-center gap-3 rounded-2xl px-3 py-3">
    <div className="skeleton h-11 w-11 shrink-0 rounded-xl" />
    <div className="min-w-0 flex-1 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton h-3 w-28" />
        <div className="skeleton h-2.5 w-9" />
      </div>
      <div className="skeleton h-2.5 w-40 max-w-[70%]" />
    </div>
  </div>
);

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

  const totalUnread = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);

  /* ----------------------------------------------------------------------
   * Collapsed rail — compact but still useful: expand, compose, jump to a
   * conversation, and see unread indicators at a glance.
   * -------------------------------------------------------------------- */
  if (isCollapsed) {
    return (
      <aside className="relative flex h-full w-[68px] shrink-0 flex-col items-center gap-2 border-r border-line bg-surface py-4">
        <button
          type="button"
          onClick={onExpand}
          className="icon-btn shrink-0 border border-line bg-surface shadow-sm"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenNewChat?.()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-glow transition-all hover:bg-brand-hover active:scale-95"
          title="New chat"
          aria-label="New chat"
        >
          <Plus className="h-5 w-5" />
        </button>

        <div className="my-1 h-px w-8 shrink-0 bg-line" />

        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-1.5 overflow-y-auto px-2 scrollbar-hide">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-10 shrink-0 rounded-xl" />
              ))
            : chats.map((chat) => {
                const displayName = chat.isGroup ? chat.groupName || "Group" : chat.otherParticipant?.name || "User";
                const displayAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;
                const isSelected = selectedChatId === chat._id;
                const isOnline = !chat.isGroup && !!chat.otherParticipant?._id && onlineUserIds.includes(chat.otherParticipant._id);

                return (
                  <button
                    key={chat._id}
                    type="button"
                    onClick={() => onSelectChat(chat._id)}
                    className={cn(
                      "group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
                      isSelected
                        ? "bg-brand/12 ring-1 ring-brand/35"
                        : "hover:bg-subtle"
                    )}
                    title={displayName}
                    aria-label={displayName}
                  >
                    <Avatar src={displayAvatar} name={displayName} className="h-8 w-8 rounded-lg" textClassName="text-[11px]" />
                    {isOnline ? (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500" />
                    ) : null}
                    {chat.unreadCount > 0 ? (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold leading-none text-white">
                        {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-line bg-surface">
      {/* Header --------------------------------------------------------- */}
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <MessagesSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="truncate text-[15px] font-bold tracking-tight text-fg">Chats</h2>
                {totalUnread > 0 ? (
                  <span className="badge-primary shrink-0 !px-1.5 !py-0 !text-[10px] tabular-nums">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-[11px] font-medium text-faint">Your conversations</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {onToggleSelectionMode ? (
              <button
                type="button"
                onClick={onToggleSelectionMode}
                className={cn(
                  "icon-btn border",
                  isSelectionMode
                    ? "border-brand bg-brand text-white shadow-sm hover:bg-brand-hover"
                    : "border-line bg-surface hover:bg-subtle"
                )}
                title={isSelectionMode ? "Exit selection" : "Select chats"}
                aria-pressed={isSelectionMode}
              >
                <Check className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onOpenNewChat?.()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">New</span>
            </button>
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="icon-btn hidden border border-line bg-surface hover:bg-subtle sm:inline-flex"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search ------------------------------------------------------- */}
        <div
          className={cn(
            "mt-3.5 flex items-center gap-2 rounded-xl border bg-subtle/60 px-3 py-2 transition-all duration-200",
            isSearchFocused
              ? "border-brand/40 bg-surface ring-2 ring-brand/12"
              : "border-line hover:border-fg/15"
          )}
        >
          <Search className={cn("h-4 w-4 shrink-0 transition-colors", isSearchFocused ? "text-brand" : "text-faint")} />
          <input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Search chats..."
            className="w-full bg-transparent text-sm font-medium text-fg outline-none placeholder:text-faint"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="shrink-0 rounded-md p-0.5 text-faint transition-colors hover:text-fg"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* List ----------------------------------------------------------- */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        {isLoading ? (
          Array.from({ length: 7 }).map((_, i) => <SkeletonRow key={i} />)
        ) : filteredBySearch.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-faint">
              {searchTerm ? <Search className="h-6 w-6" /> : <MessagesSquare className="h-6 w-6" />}
            </div>
            <p className="mt-4 text-sm font-semibold text-fg">
              {searchTerm ? "No matches found" : "No conversations yet"}
            </p>
            <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-faint">
              {searchTerm
                ? `Nothing matches "${searchTerm}". Try a different name or keyword.`
                : "Start a new conversation to see it appear here."}
            </p>
            {!searchTerm && onOpenNewChat ? (
              <button type="button" onClick={() => onOpenNewChat()} className="btn-primary mt-5 !px-3.5 !py-2 !text-xs">
                <Plus className="h-3.5 w-3.5" />
                New chat
              </button>
            ) : null}
          </div>
        ) : (
          filteredBySearch.map((chat) => {
            const isSelected = selectedChatId === chat._id;
            const preview = getChatPreview(chat);
            const displayName = chat.isGroup ? chat.groupName || "Group" : chat.otherParticipant?.name || "User";
            const displayAvatar = chat.isGroup ? chat.groupAvatar : chat.otherParticipant?.avatar;
            const hasUnread = chat.unreadCount > 0;
            const isOnline = !chat.isGroup && !!chat.otherParticipant?._id && onlineUserIds.includes(chat.otherParticipant._id);
            const isChecked = selectedChatIds.includes(chat._id);

            return (
              <div
                key={chat._id}
                className={cn(
                  "group relative mb-0.5 flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors duration-150",
                  isSelected
                    ? "bg-brand/[0.07]"
                    : "hover:bg-subtle/80",
                  isSelectionMode && isChecked && "bg-brand/10"
                )}
                onClick={() => handleChatClick(chat._id)}
                onContextMenu={(e) => contextMenu.open(e, chat._id)}
              >
                {/* Active accent bar */}
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-brand transition-all duration-200",
                    isSelected ? "opacity-100" : "opacity-0"
                  )}
                />

                {isSelectionMode && (
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
                    isChecked
                      ? "border-brand bg-brand shadow-sm"
                      : "border-line bg-surface"
                  )}>
                    {isChecked && <Check className="h-3 w-3 text-white stroke-[3]" />}
                  </div>
                )}

                <div className="relative shrink-0">
                  <Avatar
                    src={displayAvatar}
                    name={displayName}
                    className={cn(
                      "h-11 w-11 rounded-xl shadow-sm transition-transform duration-200",
                      "group-hover:scale-[1.02]",
                      isSelected && "ring-2 ring-brand/25"
                    )}
                  />
                  {isOnline ? (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500" />
                  ) : null}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className={cn(
                      "truncate text-[13.5px] tracking-tight",
                      hasUnread ? "font-bold text-fg" : "font-semibold text-fg/90"
                    )}>
                      {displayName}
                    </h3>
                    <span className={cn(
                      "shrink-0 text-[10px] font-semibold tabular-nums",
                      hasUnread ? "text-brand" : "text-faint"
                    )}>
                      {formatConversationDate(chat.lastMessage?.createdAt || chat.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className={cn(
                      "flex min-w-0 items-center gap-1.5 truncate text-[12.5px] leading-tight",
                      hasUnread ? "font-medium text-muted" : "font-normal text-faint"
                    )}>
                      {preview.isMedia ? (
                        <span className="shrink-0 text-faint">
                          <MessageTypeIcon type={preview.type} />
                        </span>
                      ) : null}
                      <span className="truncate">{preview.text}</span>
                    </p>
                    {hasUnread && (
                      <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[9px] font-bold text-white tabular-nums shadow-sm">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
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
