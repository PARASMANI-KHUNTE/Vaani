"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Ban, Compass, MessageCircle, Search, UserPlus2, UserRoundMinus, Users, X } from "lucide-react";
import { BackendUser } from "@/lib/types";

type ExplorePanelProps = {
  isOpen: boolean;
  query: string;
  users: BackendUser[];
  isLoading: boolean;
  onClose: () => void;
  onQueryChange: (value: string) => void;
  onStartChat: (userId: string) => void;
  onSendRequest: (user: BackendUser) => void;
  onUnfriend: (user: BackendUser) => void;
  onToggleBlock: (user: BackendUser) => void;
};

export const ExplorePanel = ({
  isOpen,
  query,
  users,
  isLoading,
  onClose,
  onQueryChange,
  onStartChat,
  onSendRequest,
  onUnfriend,
  onToggleBlock,
}: ExplorePanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

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
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[320] bg-ink/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        ref={panelRef}
        className="surface-elevated absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-ink/8 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:max-w-xl sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Explore users panel"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lagoon/60">
              Discover
            </p>
            <h2 className="soft-heading mt-1 text-2xl font-semibold text-ink">Explore users</h2>
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

        <label className="mb-5 flex items-center gap-3 rounded-2xl border border-ink/8 bg-white/70 px-4 py-3 shadow-soft transition-all focus-within:border-lagoon/30 focus-within:shadow-md">
          <Search className="h-4 w-4 text-ink/40" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search by name, username, or tagline..."
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            aria-label="Search users"
          />
        </label>

        <div className="space-y-3 overflow-y-auto pb-10" role="list" aria-label="User list">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-[26px] bg-white/70" />
              ))
            : null}

          {!isLoading && users.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-ink/10 bg-white/60 px-6 py-10 text-center">
              {query ? (
                <>
                  <Search className="mx-auto mb-4 h-10 w-10 text-ink/30" />
                  <p className="text-base font-semibold text-ink">No results found</p>
                  <p className="mt-2 text-sm text-ink/60">
                    Try a different search term
                  </p>
                </>
              ) : (
                <>
                  <Users className="mx-auto mb-4 h-10 w-10 text-ink/30" />
                  <p className="text-base font-semibold text-ink">No users yet</p>
                  <p className="mt-2 text-sm text-ink/60">
                    Be the first to join! More users will appear here as they sign up.
                  </p>
                </>
              )}
            </div>
          ) : null}

          {users.map((user) => (
            <div
              key={user._id}
              className="surface-card rounded-[30px] p-4 transition duration-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-4">
                <div className="warm-outline relative h-14 w-14 overflow-hidden rounded-[18px] bg-sand">
                  {user.avatar ? (
                    <Image src={user.avatar} alt={user.name} fill className="object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{user.name}</p>
                      <p className="text-xs text-ink/55">@{user.username}</p>
                    </div>
                    <span className="rounded-full bg-white/85 px-3 py-1 text-xs text-ink/60 shadow-soft">
                      {user.friendsCount || 0} friends
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink/70">{user.tagline || "No tagline yet."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onStartChat(user._id)}
                      disabled={user.isBlocked || user.hasBlocked}
                      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#172033,#25304a)] px-4 py-2 text-xs font-semibold text-white shadow-soft disabled:opacity-50"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Message
                    </button>
                    {user.isFriend ? (
                      <button
                        type="button"
                        onClick={() => onUnfriend(user)}
                        className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-xs font-semibold text-ink"
                      >
                        <UserRoundMinus className="h-3.5 w-3.5" />
                        Unfriend
                      </button>
                    ) : null}
                    {!user.isFriend && !user.requestSent && !user.requestReceived ? (
                      <button
                        type="button"
                        onClick={() => onSendRequest(user)}
                        disabled={user.isBlocked || user.hasBlocked}
                        className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-xs font-semibold text-ink disabled:opacity-50"
                      >
                        <UserPlus2 className="h-3.5 w-3.5" />
                        Send request
                      </button>
                    ) : null}
                    {user.requestSent ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                        Pending request
                      </span>
                    ) : null}
                    {user.requestReceived ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-lagoon/20 bg-lagoon/5 px-4 py-2 text-xs font-semibold text-lagoon">
                        Respond from notifications
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onToggleBlock(user)}
                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white/80 px-4 py-2 text-xs font-semibold text-red-700"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      {user.hasBlocked ? "Unblock" : "Block"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
