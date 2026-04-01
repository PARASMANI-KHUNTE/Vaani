"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Ban, ChevronDown, MessageCircle, Search, UserPlus2, UserRoundMinus, Users, X } from "lucide-react";
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
}: ExplorePanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);

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

  const friends = users.filter(u => u.isFriend);
  const nonFriends = users.filter(u => !u.isFriend);

  const renderUserCard = (user: BackendUser) => (
    <div
      key={user._id}
      className="surface-card cursor-pointer rounded-[30px] p-4 transition duration-300 hover:-translate-y-0.5"
      onClick={() => onOpenProfile(user)}
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
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink dark:text-slate-100">{user.name}</p>
              <p className="text-xs text-ink/55 dark:text-slate-400">@{user.username}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-white/85 dark:bg-slate-700/85 px-3 py-1 text-xs text-ink/60 dark:text-slate-300 shadow-soft">
                {user.friendsCount || 0} friends
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuUserId(openMenuUserId === user._id ? null : user._id);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-slate-700/80 shadow-soft hover:bg-slate-100 dark:hover:bg-slate-600"
              >
                <ChevronDown className="h-4 w-4 text-ink/60 dark:text-slate-400" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-sm text-ink/70 dark:text-slate-300">{user.tagline || "No tagline yet."}</p>
          {openMenuUserId === user._id && (
            <div className="mt-3 rounded-xl border border-ink/10 dark:border-white/10 bg-white dark:bg-slate-800 p-2 shadow-lg">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onStartChat(user._id);
                  setOpenMenuUserId(null);
                }}
                disabled={user.isBlocked || user.hasBlocked}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </button>
              {user.isFriend ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUnfriend(user);
                    setOpenMenuUserId(null);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <UserRoundMinus className="h-4 w-4" />
                  Unfriend
                </button>
              ) : (
                <>
                  {!user.requestSent && !user.requestReceived ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSendRequest(user);
                        setOpenMenuUserId(null);
                      }}
                      disabled={user.isBlocked || user.hasBlocked}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                    >
                      <UserPlus2 className="h-4 w-4" />
                      Send request
                    </button>
                  ) : null}
                  {user.requestSent ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-amber-600">
                      Request sent
                    </div>
                  ) : null}
                  {user.requestReceived ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-lagoon">
                      Check notifications
                    </div>
                  ) : null}
                </>
              )}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenProfile(user);
                  setOpenMenuUserId(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                View profile
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleBlock(user);
                  setOpenMenuUserId(null);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Ban className="h-4 w-4" />
                {user.hasBlocked ? "Unblock" : "Block"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

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
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-5">
        <label className="flex items-center gap-2 rounded-full border border-ink/8 dark:border-white/10 bg-white/70 dark:bg-slate-800/60 px-4 py-2.5">
          <Search className="h-4 w-4 text-ink/30 dark:text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search users..."
            className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/30 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </label>
      </div>

      <div className="space-y-3 overflow-y-auto pb-10">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-[26px] bg-white/70 dark:bg-slate-800/50" />
          ))
        ) : null}

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

        {!isLoading && friends.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/50 dark:text-slate-400">Friends</h3>
            <div className="space-y-3">
              {friends.map(renderUserCard)}
            </div>
          </div>
        )}

        {!isLoading && nonFriends.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/50 dark:text-slate-400">People You May Know</h3>
            <div className="space-y-3">
              {nonFriends.map(renderUserCard)}
            </div>
          </div>
        )}
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