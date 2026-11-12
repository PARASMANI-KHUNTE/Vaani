"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { 
  Ban, 
  MessageCircle, 
  UserPlus2, 
  UserRoundMinus, 
  Users, 
  Search,
  UserCheck,
  Wifi,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { BackendUser } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  onAcceptRequest: (user: BackendUser) => void;
  onRejectRequest?: (user: BackendUser) => void;
  onUnfriend: (user: BackendUser) => void;
  onToggleBlock: (user: BackendUser) => void;
  onOpenProfile: (user: BackendUser) => void;
};

type FilterTab = "all" | "friends" | "suggested" | "online";

const UserCard = ({
  user,
  openMenuUserId,
  setOpenMenuUserId,
  onStartChat,
  onSendRequest,
  onAcceptRequest,
  onUnfriend,
  onToggleBlock,
  onOpenProfile,
}: {
  user: BackendUser;
  openMenuUserId: string | null;
  setOpenMenuUserId: (id: string | null) => void;
  onStartChat: (userId: string) => void;
  onSendRequest: (user: BackendUser) => void;
  onAcceptRequest: (user: BackendUser) => void;
  onUnfriend: (user: BackendUser) => void;
  onToggleBlock: (user: BackendUser) => void;
  onOpenProfile: (user: BackendUser) => void;
}) => (
  <div
    className="group relative cursor-pointer rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-brand/25 hover:shadow-soft-lg"
    onClick={() => onOpenProfile(user)}
  >
    {/* Online Indicator */}
    {user.isOnline && (
      <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 ring-1 ring-emerald-500/20">
        <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Online</span>
      </div>
    )}

    {/* Avatar */}
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar
          src={user.avatar}
          name={user.name}
          className="h-20 w-20 rounded-2xl shadow-sm ring-2 ring-line transition-all group-hover:ring-brand/30"
          textClassName="text-2xl font-bold"
        />
      </div>

      {/* User Info */}
      <div className="mt-4 w-full text-center">
        <h3 className="max-w-full truncate text-base font-bold tracking-tight text-fg">{user.name}</h3>
        <p className="truncate text-sm text-muted">@{user.username}</p>
        {user.tagline && (
          <p className="mt-2 line-clamp-1 text-[10px] font-semibold uppercase tracking-wider text-faint">{user.tagline}</p>
        )}
      </div>

      {/* Friends Count */}
      <div className="mt-3 flex items-center gap-1.5 text-faint">
        <Users className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{user.friendsCount || 0} friends</span>
      </div>
    </div>

    {/* Action Buttons */}
    <div className="mt-5 flex gap-2">
      {user.isFriend ? (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onStartChat(user._id); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUnfriend(user); }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-muted transition-all hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-500"
            title="Unfriend"
          >
            <UserRoundMinus className="h-4 w-4" />
          </button>
        </>
      ) : user.requestSent ? (
        <button
          disabled
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Request Sent
        </button>
      ) : user.requestReceived ? (
        <button
          onClick={(e) => { e.stopPropagation(); onAcceptRequest(user); }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95"
        >
          <UserCheck className="h-4 w-4" />
          Accept Request
        </button>
      ) : (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onSendRequest(user); }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95"
          >
            <UserPlus2 className="h-4 w-4" />
            Add Friend
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onStartChat(user._id); }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-muted transition-all hover:border-brand/30 hover:bg-brand/5 hover:text-brand"
            title="Message"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
        </>
      )}
    </div>

    {/* More Options */}
    <button
      onClick={(e) => { e.stopPropagation(); setOpenMenuUserId(openMenuUserId === user._id ? null : user._id); }}
      className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-subtle text-muted opacity-0 transition-all hover:bg-line hover:text-fg group-hover:opacity-100"
      aria-label="More options"
    >
      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="5" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="12" cy="19" r="2" />
      </svg>
    </button>

    {/* Dropdown Menu */}
    {openMenuUserId === user._id && (
      <div 
        className="absolute left-4 top-14 z-50 w-48 rounded-xl border border-line bg-elevated p-1.5 shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onOpenProfile(user); setOpenMenuUserId(null); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-fg/85 transition-colors hover:bg-subtle hover:text-fg"
        >
          View Profile
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleBlock(user); setOpenMenuUserId(null); }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
        >
          <Ban className="h-4 w-4" />
          {user.hasBlocked ? "Unblock" : "Block"}
        </button>
      </div>
    )}
  </div>
);

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
  onAcceptRequest,
  onUnfriend,
  onToggleBlock,
  onOpenProfile,
}: ExplorePanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [openMenuUserId, setOpenMenuUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [focusedSearch, setFocusedSearch] = useState(false);

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

  const onlineUsers = users.filter(u => u.isOnline);
  const friends = users.filter(u => u.isFriend);
  const suggested = users.filter(u => !u.isFriend && !u.requestSent && !u.requestReceived);

  const getFilteredUsers = () => {
    switch (activeFilter) {
      case "online":
        return onlineUsers;
      case "friends":
        return friends;
      case "suggested":
        return suggested;
      default:
        return users;
    }
  };

  const filteredUsers = getFilteredUsers();

  const filterTabs: { id: FilterTab; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    { id: "online", label: "Online", count: onlineUsers.length },
    { id: "friends", label: "Friends", count: friends.length },
    { id: "suggested", label: "Suggested", count: suggested.length },
  ];

  const cardProps = {
    openMenuUserId,
    setOpenMenuUserId,
    onStartChat,
    onSendRequest,
    onAcceptRequest,
    onUnfriend,
    onToggleBlock,
    onOpenProfile,
  };

  const panelBody = (
    <div
      ref={panelRef}
      className={cn(
        "flex flex-col",
        variant === "overlay"
          ? "absolute right-0 top-0 h-full w-full overflow-hidden border-l border-line bg-canvas sm:max-w-md"
          : "h-full w-full overflow-y-auto bg-canvas"
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 border-b border-line bg-canvas/90 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className={cn(
          "mb-5 transition-all duration-300",
          variant === "page" ? "mx-auto max-w-5xl" : ""
        )}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-fg">Explore</h1>
              <p className="mt-0.5 text-sm text-muted">Discover and connect with new people</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1.5 ring-1 ring-emerald-500/20">
              <Wifi className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{onlineUsers.length} online</span>
            </div>
            {variant === "overlay" ? (
              <button onClick={onClose} className="icon-btn shrink-0" aria-label="Close explore">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Search */}
        <div className={cn(
          "relative transition-all duration-300",
          variant === "page" ? "mx-auto max-w-5xl" : ""
        )}>
          <div className={cn(
            "relative flex items-center gap-3 rounded-2xl border bg-subtle/60 px-4 py-3 transition-all duration-300",
            focusedSearch && "border-brand/40 bg-surface ring-2 ring-brand/12"
          )}>
            <Search className={cn(
              "h-5 w-5 shrink-0 transition-colors",
              focusedSearch ? "text-brand" : "text-faint"
            )} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setFocusedSearch(true)}
              onBlur={() => setFocusedSearch(false)}
              placeholder="Search by name or username..."
              className="flex-1 bg-transparent text-sm font-medium text-fg outline-none placeholder:text-faint"
            />
            {query && (
              <button
                onClick={() => onQueryChange("")}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-line text-muted transition-colors hover:bg-fg/20 hover:text-fg"
                aria-label="Clear search"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={cn(
          "scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1",
          variant === "page" ? "mx-auto max-w-5xl" : ""
        )}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all",
                activeFilter === tab.id
                  ? "bg-brand text-white shadow-sm"
                  : "border border-line bg-surface text-muted hover:bg-subtle hover:text-fg"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                  activeFilter === tab.id ? "bg-white/20" : "bg-subtle text-faint"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 overflow-y-auto p-4 sm:p-6",
        variant === "page" ? "mx-auto w-full max-w-5xl" : ""
      )}>
        {/* Sections for "all" filter */}
        {activeFilter === "all" && !query && (
          <>
            {/* Suggested Users */}
            {suggested.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                  <Sparkles className="h-5 w-5 text-brand" />
                  Suggested for You
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {suggested.slice(0, 8).map((user) => (
                    <UserCard key={user._id} user={user} {...cardProps} />
                  ))}
                </div>
              </section>
            )}

            {/* Online Users */}
            {onlineUsers.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  Online Now
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {onlineUsers.map((user) => (
                    <UserCard key={user._id} user={user} {...cardProps} />
                  ))}
                </div>
              </section>
            )}

            {/* All Users */}
            {users.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold tracking-tight text-fg">
                  <Users className="h-5 w-5 text-faint" />
                  All People
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {users.map((user) => (
                    <UserCard key={user._id} user={user} {...cardProps} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Filtered/ Search Results */}
        {(activeFilter !== "all" || query) && (
          <section>
            <h2 className="mb-4 text-lg font-bold tracking-tight text-fg">
              {query ? `Search Results` : filterTabs.find(t => t.id === activeFilter)?.label}
              <span className="ml-2 text-sm font-normal text-faint">({filteredUsers.length})</span>
            </h2>
            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredUsers.map((user) => (
                  <UserCard key={user._id} user={user} {...cardProps} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-subtle/40 py-16 text-center">
                <Users className="mb-4 h-12 w-12 text-faint" />
                <h3 className="text-lg font-semibold text-fg">No users found</h3>
                <p className="mt-2 text-sm text-faint">
                  {query ? "Try searching something else" : "Check back later for more suggestions"}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-line bg-surface p-5">
                <div className="flex flex-col items-center">
                  <div className="skeleton h-20 w-20 rounded-2xl" />
                  <div className="skeleton mt-4 h-4 w-24" />
                  <div className="skeleton mt-2 h-3 w-16" />
                  <div className="skeleton mt-3 h-6 w-20 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-subtle text-faint">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-fg">No users found</h3>
            <p className="mt-2 max-w-xs text-sm text-muted">
              {query ? "Try searching something else" : "Be the first to join! More users will appear here."}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  if (variant === "page") {
    return panelBody;
  }

  return (
    <div className="fixed inset-0 z-[320] bg-slate-950/40 backdrop-blur-sm">
      {panelBody}
    </div>
  );
};
