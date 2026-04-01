"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Search, MessageSquare, Plus, Check, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { BackendUser } from "@/lib/types";
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
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-6 backdrop-blur-md bg-slate-900/40 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg overflow-hidden rounded-[32px] border border-white/20 bg-white/95 dark:bg-slate-900/95 shadow-2xl shadow-blue-500/10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">New Conversation</h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Choose a friend to start chatting</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setIsGroupMode(false)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                !isGroupMode 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              Direct Message
            </button>
            <button
              onClick={() => setIsGroupMode(true)}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
                isGroupMode 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              )}
            >
              Group Chat
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
          {isGroupMode && (
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-900/30">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-blue-600/60 mb-2">Group Details</label>
              <input
                type="text"
                placeholder="Name your group..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500/50 outline-none placeholder:text-slate-400"
              />
              <p className="mt-2 text-[10px] text-blue-500 font-medium">Select at least 2 friends ({selectedUserIds.length} selected)</p>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search friends..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm font-medium outline-none"
            />
          </div>

          <div className="space-y-1">
            {isLoadingDirectory && friends.length === 0 ? (
              <div className="py-10 text-center animate-pulse">
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto mb-4" />
                <div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 rounded mx-auto" />
              </div>
            ) : friends.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="h-10 w-10 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">{query ? "No friends found" : "Your friends list is empty"}</p>
                {!query && (
                  <p className="text-xs text-slate-400 mt-1">Go to explore to find new connections</p>
                )}
              </div>
            ) : (
              friends.map((user) => (
                <button
                  key={user._id}
                  onClick={() => handleAction(user._id)}
                  className={cn(
                    "flex items-center justify-between w-full p-3 rounded-2xl transition-all group",
                    selectedUserIds.includes(user._id)
                      ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar} name={user.name} className="h-11 w-11 rounded-xl" />
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{user.name}</p>
                      <p className="text-[10px] font-medium text-slate-500 line-clamp-1">@{user.username}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "h-6 w-6 rounded-lg flex items-center justify-center transition-all",
                    selectedUserIds.includes(user._id)
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 dark:bg-slate-800 text-transparent group-hover:text-slate-300"
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
          <div className="p-6 border-t border-slate-100 dark:border-slate-800">
            <button
              disabled={!groupName.trim() || selectedUserIds.length < 2 || isSubmitting}
              onClick={handleCreateGroup}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? "Creating..." : "Start Group Conversation"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
