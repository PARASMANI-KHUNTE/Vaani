"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, MessageSquare, Plus, Check, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useSocialData } from "@/hooks/use-social-data";
import { cn } from "@/lib/utils";

type NewChatModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (userId: string) => void;
  onCreateGroup: (name: string, userIds: string[]) => void;
  token?: string;
};

export const NewChatModal = ({
  isOpen,
  onClose,
  onStartChat,
  token,
  onCreateGroup,
}: NewChatModalProps) => {
  const [query, setQuery] = useState("");
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We reuse useSocialData to get directory but we filter for friends only
  const { directoryUsers, isLoadingDirectory } = useSocialData({
    token,
    exploreQuery: query,
  });

  const friends = useMemo(() => {
    return directoryUsers.filter(u => u.isFriend);
  }, [directoryUsers]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setIsGroupMode(false);
      setGroupName("");
      setSelectedUserIds([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAction = (userId: string) => {
    if (isGroupMode) {
      setSelectedUserIds(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      );
    } else {
      onStartChat(userId);
      onClose();
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUserIds.length < 2) return;
    setIsSubmitting(true);
    try {
      await onCreateGroup(groupName.trim(), selectedUserIds);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200 sm:p-6">
      <div 
        className="flex max-h-[85vh] w-full max-w-lg animate-in zoom-in-95 flex-col overflow-hidden rounded-[28px] border border-line bg-elevated shadow-float duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="border-b border-line p-6 pb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-fg">New Conversation</h2>
              <p className="text-xs font-medium text-muted">Choose a friend to start chatting</p>
            </div>
            <button
              onClick={onClose}
              className="icon-btn"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-1 rounded-2xl border border-line bg-subtle/60 p-1">
            <button
              onClick={() => setIsGroupMode(false)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
                !isGroupMode
                  ? "bg-surface text-brand shadow-sm ring-1 ring-brand/15"
                  : "text-muted hover:text-fg"
              )}
            >
              Direct Message
            </button>
            <button
              onClick={() => setIsGroupMode(true)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-bold transition-all",
                isGroupMode
                  ? "bg-surface text-brand shadow-sm ring-1 ring-brand/15"
                  : "text-muted hover:text-fg"
              )}
            >
              Group Chat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-[300px] flex-1 space-y-4 overflow-y-auto p-4">
          {isGroupMode && (
            <div className="rounded-2xl border border-brand/15 bg-brand/[0.05] p-4">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-brand/70">Group Details</label>
              <input
                type="text"
                placeholder="Name your group..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-fg outline-none transition-all placeholder:text-faint focus:border-brand/40 focus:ring-2 focus:ring-brand/12"
              />
              <p className="mt-2 text-[10px] font-semibold text-brand">Select at least 2 friends ({selectedUserIds.length} selected)</p>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="text"
              placeholder="Search friends..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-2xl border border-line bg-subtle/60 py-3 pl-11 pr-4 text-sm font-medium text-fg outline-none transition-all placeholder:text-faint focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/12"
            />
          </div>

          <div className="space-y-1">
            {isLoadingDirectory && friends.length === 0 ? (
              <div className="space-y-2 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl px-3 py-2.5">
                    <div className="skeleton h-11 w-11 rounded-xl" />
                    <div className="space-y-2">
                      <div className="skeleton h-3 w-28" />
                      <div className="skeleton h-2.5 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : friends.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-subtle text-faint">
                  <Users className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-fg">{query ? "No friends found" : "Your friends list is empty"}</p>
                {!query && (
                  <p className="mt-1 text-xs text-faint">Go to explore to find new connections</p>
                )}
              </div>
            ) : (
              friends.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleAction(user._id)}
                  className={cn(
                    "group flex w-full items-center justify-between rounded-2xl border p-3 transition-all",
                    selectedUserIds.includes(user._id)
                      ? "border-brand/25 bg-brand/[0.06]"
                      : "border-transparent hover:bg-subtle"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar} name={user.name} className="h-11 w-11 rounded-xl shadow-sm" />
                    <div className="min-w-0 text-left">
                      <p className="line-clamp-1 text-sm font-bold text-fg">{user.name}</p>
                      <p className="line-clamp-1 text-[11px] font-medium text-faint">@{user.username}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-lg transition-all",
                    selectedUserIds.includes(user._id)
                      ? "bg-brand text-white shadow-sm"
                      : "bg-subtle text-faint group-hover:text-muted"
                  )}>
                    {isGroupMode ? (
                      selectedUserIds.includes(user._id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        {isGroupMode && (
          <div className="border-t border-line p-5">
            <button
              disabled={!groupName.trim() || selectedUserIds.length < 2 || isSubmitting}
              onClick={handleCreateGroup}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3 font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-subtle disabled:text-faint disabled:shadow-none"
            >
              {isSubmitting ? "Creating..." : "Start Group Conversation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
