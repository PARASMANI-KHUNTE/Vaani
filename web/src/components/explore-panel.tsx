"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Ban, Check, MessageCircle, Search, UserPlus2, UserRoundMinus, Users, X } from "lucide-react";
import { BackendUser } from "@/lib/types";

type ExplorePanelProps = {
  isOpen: boolean;
  variant?: "overlay" | "page";
  query: string;
  users: BackendUser[];
  isLoading: boolean;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onStartChat: (userId: string) => void;
  onSendRequest: (user: BackendUser) => void;
  onUnfriend: (user: BackendUser) => void;
  onToggleBlock: (user: BackendUser) => void;
  onOpenProfile: (user: BackendUser) => void;
  onCreateGroup: (groupName: string, participantIds: string[]) => Promise<void>;
};

export const ExplorePanel = ({
  isOpen,
  variant = "overlay",
  query,
  users,
  isLoading,
  onClose,
  onQueryChange,
  onStartChat,
  onSendRequest,
  onUnfriend,
  onToggleBlock,
  onOpenProfile,
  onCreateGroup,
}: ExplorePanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const canCreateGroup = groupName.trim().length >= 2 && selectedUserIds.length >= 2 && !isCreatingGroup;

  const selectedUsersLabel = useMemo(() => {
    if (selectedUserIds.length === 0) {
      return "No members selected";
    }
    if (selectedUserIds.length === 1) {
      return "1 member selected";
    }
    return `${selectedUserIds.length} members selected`;
  }, [selectedUserIds.length]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (variant !== "overlay") {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, variant]);

  if (!isOpen) {
    return null;
  }

  const panelBody = (
    <div
      ref={panelRef}
      className={
        variant === "overlay"
          ? "surface-elevated absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-ink/8 dark:border-white/10 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:max-w-xl sm:p-6"
          : "surface-elevated h-full w-full overflow-y-auto rounded-[30px] border border-ink/8 dark:border-white/10 p-4 sm:p-6"
      }
      role="dialog"
      aria-modal="true"
      aria-label="Explore users panel"
    >
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lagoon/60 dark:text-lagoon/50">
            Discover
          </p>
          <h2 className="soft-heading mt-1 text-2xl font-semibold text-ink dark:text-slate-100">Explore users</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="btn-secondary !py-2.5 !px-2.5"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mb-4 flex items-center gap-3 rounded-2xl border border-ink/8 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 px-4 py-3 shadow-soft transition-all focus-within:border-lagoon/30 dark:focus-within:border-lagoon/40 focus-within:shadow-md">
        <Search className="h-4 w-4 text-ink/40 dark:text-slate-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name, username, or tagline..."
          className="w-full bg-transparent text-sm text-ink dark:text-slate-100 outline-none placeholder:text-ink/40 dark:placeholder:text-slate-500"
          aria-label="Search users"
        />
      </label>

      <div className="mb-5 rounded-2xl border border-ink/8 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-ink/70 dark:text-slate-200">Create Group</p>
            <p className="text-[11px] text-ink/50 dark:text-slate-400">Select at least 2 users and set a group name.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsGroupMode((value) => !value);
              setSelectedUserIds([]);
            }}
            className="rounded-full border border-lagoon/20 bg-lagoon/5 px-3 py-1.5 text-xs font-semibold text-lagoon"
          >
            {isGroupMode ? "Cancel" : "New Group"}
          </button>
        </div>

        {isGroupMode ? (
          <div className="mt-3 space-y-2">
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group name"
              className="w-full rounded-xl border border-ink/10 bg-white/85 px-3 py-2 text-sm outline-none dark:border-white/10 dark:bg-slate-900/60"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-ink/55 dark:text-slate-400">{selectedUsersLabel}</span>
              <button
                type="button"
                disabled={!canCreateGroup}
                onClick={async () => {
                  if (!canCreateGroup) {
                    return;
                  }
                  setIsCreatingGroup(true);
                  try {
                    await onCreateGroup(groupName.trim(), selectedUserIds);
                    setGroupName("");
                    setSelectedUserIds([]);
                    setIsGroupMode(false);
                  } finally {
                    setIsCreatingGroup(false);
                  }
                }}
                className="rounded-full bg-[linear-gradient(135deg,#172033,#25304a)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                {isCreatingGroup ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 overflow-y-auto pb-10" role="list" aria-label="User list">
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-[26px] bg-white/70 dark:bg-slate-800/50" />
            ))
          : null}

        {!isLoading && users.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-ink/10 dark:border-white/10 bg-white/60 dark:bg-slate-800/40 px-6 py-10 text-center">
            {query ? (
              <>
                <Search className="mx-auto mb-4 h-10 w-10 text-ink/30 dark:text-slate-500" />
                <p className="text-base font-semibold text-ink dark:text-slate-100">No results found</p>
                <p className="mt-2 text-sm text-ink/60 dark:text-slate-400">
                  Try a different search term
                </p>
              </>
            ) : (
              <>
                <Users className="mx-auto mb-4 h-10 w-10 text-ink/30 dark:text-slate-500" />
                <p className="text-base font-semibold text-ink dark:text-slate-100">No users yet</p>
                <p className="mt-2 text-sm text-ink/60 dark:text-slate-400">
                  Be the first to join! More users will appear here as they sign up.
                </p>
              </>
            )}
          </div>
        ) : null}

        {users.map((user) => (
          <div
            key={user._id}
            className="surface-card cursor-pointer rounded-[30px] p-4 transition duration-300 hover:-translate-y-0.5"
            onClick={() => {
              if (isGroupMode) {
                setSelectedUserIds((current) =>
                  current.includes(user._id) ? current.filter((id) => id !== user._id) : [...current, user._id]
                );
                return;
              }
              onOpenProfile(user);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpenProfile(user);
              }
            }}
          >
            <div className="flex items-start gap-4">
              <div className="relative h-14 w-14">
                <Avatar
                  src={user.avatar}
                  name={user.name}
                  className="warm-outline h-full w-full rounded-[18px]"
                  textClassName="text-lg"
                />
                {isGroupMode ? (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-lagoon text-white shadow">
                    {selectedUserIds.includes(user._id) ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink dark:text-slate-100">{user.name}</p>
                    <p className="text-xs text-ink/55 dark:text-slate-400">@{user.username}</p>
                  </div>
                  <span className="rounded-full bg-white/85 dark:bg-slate-700/85 px-3 py-1 text-xs text-ink/60 dark:text-slate-300 shadow-soft">
                    {user.friendsCount || 0} friends
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink/70 dark:text-slate-300">{user.tagline || "No tagline yet."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onStartChat(user._id);
                    }}
                    disabled={isGroupMode || user.isBlocked || user.hasBlocked}
                    className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#172033,#25304a)] px-4 py-2 text-xs font-semibold text-white shadow-soft disabled:opacity-50"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Message
                  </button>
                  {user.isFriend ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onUnfriend(user);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-ink/10 dark:border-white/10 bg-white/80 dark:bg-slate-700/80 px-4 py-2 text-xs font-semibold text-ink dark:text-slate-100"
                    >
                      <UserRoundMinus className="h-3.5 w-3.5" />
                      Unfriend
                    </button>
                  ) : null}
                  {!user.isFriend && !user.requestSent && !user.requestReceived ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSendRequest(user);
                      }}
                      disabled={isGroupMode || user.isBlocked || user.hasBlocked}
                      className="inline-flex items-center gap-2 rounded-full border border-ink/10 dark:border-white/10 bg-white/80 dark:bg-slate-700/80 px-4 py-2 text-xs font-semibold text-ink dark:text-slate-100 disabled:opacity-50"
                    >
                      <UserPlus2 className="h-3.5 w-3.5" />
                      Send request
                    </button>
                  ) : null}
                  {user.requestSent ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      Pending request
                    </span>
                  ) : null}
                  {user.requestReceived ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-lagoon/20 dark:border-lagoon/30 bg-lagoon/5 dark:bg-lagoon/10 px-4 py-2 text-xs font-semibold text-lagoon dark:text-lagoon">
                      Respond from notifications
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleBlock(user);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-800/40 bg-white/80 dark:bg-slate-700/80 px-4 py-2 text-xs font-semibold text-red-700 dark:text-red-400"
                  >
                    <Ban className="h-3.5 w-3.5" />
                    {user.hasBlocked ? "Unblock" : "Block"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenProfile(user);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-lagoon/20 bg-lagoon/5 px-4 py-2 text-xs font-semibold text-lagoon"
                  >
                    View profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (variant === "page") {
    return <div className="h-full min-h-0">{panelBody}</div>;
  }

  return (
    <div className="fixed inset-0 z-[320] bg-ink/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" role="presentation">
      {panelBody}
    </div>
  );
};
