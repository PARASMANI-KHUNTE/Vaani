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
  Loader2
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
  onUnfriend: (user: BackendUser) => void;
  onToggleBlock: (user: BackendUser) => void;
  onOpenProfile: (user: BackendUser) => void;
};

type FilterTab = "all" | "friends" | "suggested" | "online";

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

  const UserCard = ({ user }: { user: BackendUser }) => (
    <div
      className="group relative rounded-2xl border border-slate-800/50 bg-slate-900/80 p-5 transition-all duration-300 hover:border-slate-700 hover:bg-slate-800/90 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20"
      onClick={() => onOpenProfile(user)}
    >
      {/* Online Indicator */}
      {user.isOnline && (
        <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-1">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] font-medium text-emerald-400">Online</span>
        </div>
      )}

      {/* Avatar */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <Avatar
            src={user.avatar}
            name={user.name}
            className="h-20 w-20 rounded-2xl ring-2 ring-slate-700/50 transition-all group-hover:ring-slate-600"
            textClassName="text-2xl font-bold"
          />
        </div>

        {/* User Info */}
        <div className="mt-4 text-center">
          <h3 className="text-base font-semibold text-white truncate max-w-full">{user.name}</h3>
          <p className="text-sm text-slate-400">@{user.username}</p>
          {user.tagline && (
            <p className="mt-2 text-xs font-medium text-slate-500 uppercase tracking-wider">{user.tagline}</p>
          )}
        </div>

        {/* Friends Count */}
        <div className="mt-3 flex items-center gap-1.5 text-slate-500">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs">{user.friendsCount || 0} friends</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex gap-2">
        {user.isFriend ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onStartChat(user._id); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600/20 px-4 py-2.5 text-sm font-medium text-blue-400 transition-all hover:bg-blue-600/30 active:scale-95"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onUnfriend(user); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 text-slate-400 transition-all hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10"
              title="Unfriend"
            >
              <UserRoundMinus className="h-4 w-4" />
            </button>
          </>
        ) : user.requestSent ? (
          <button
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm font-medium text-amber-400"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Request Sent
          </button>
        ) : user.requestReceived ? (
          <button
            onClick={(e) => { e.stopPropagation(); onSendRequest(user); }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-emerald-500 active:scale-95"
          >
            <UserCheck className="h-4 w-4" />
            Accept Request
          </button>
        ) : (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onSendRequest(user); }}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-500 active:scale-95"
            >
              <UserPlus2 className="h-4 w-4" />
              Add Friend
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onStartChat(user._id); }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 text-slate-400 transition-all hover:border-slate-600 hover:text-white hover:bg-slate-700/50"
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
        className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 opacity-0 transition-all hover:bg-slate-700 hover:text-white group-hover:opacity-100"
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
          className="absolute left-4 top-14 z-50 w-48 rounded-xl border border-slate-700/50 bg-slate-900 p-1.5 shadow-xl shadow-black/20"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onOpenProfile(user); setOpenMenuUserId(null); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            View Profile
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBlock(user); setOpenMenuUserId(null); }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
          >
            <Ban className="h-4 w-4" />
            {user.hasBlocked ? "Unblock" : "Block"}
          </button>
        </div>
      )}
    </div>
  );

  const panelBody = (
    <div
      ref={panelRef}
      className={cn(
        "flex flex-col",
        variant === "overlay"
          ? "absolute right-0 top-0 h-full w-full overflow-hidden border-l border-slate-800/50 bg-[var(--bg-page)] sm:max-w-md"
          : "h-full w-full overflow-y-auto bg-[var(--bg-page)]"
      )}
    >
      {/* Header */}
      <div       className="sticky top-0 z-20 border-b border-slate-800/50 bg-[var(--bg-page)]/95 backdrop-blur-xl p-4 sm:p-6">
        <div className={cn(
          "mb-5 transition-all duration-300",
          variant === "page" ? "max-w-5xl mx-auto" : ""
        )}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Explore</h1>
              <p className="mt-1 text-sm text-slate-400">Discover and connect with new people</p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1.5">
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-emerald-400">{onlineUsers.length} online</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className={cn(
          "relative transition-all duration-300",
          variant === "page" ? "max-w-5xl mx-auto" : ""
        )}>
          <div className={cn(
            "relative flex items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-900/80 px-4 py-3 transition-all duration-300",
            focusedSearch && "border-blue-500/50 bg-slate-900 shadow-lg shadow-blue-500/10"
          )}>
            <Search className={cn(
              "h-5 w-5 text-slate-500 transition-colors",
              focusedSearch && "text-blue-400"
            )} />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onFocus={() => setFocusedSearch(true)}
              onBlur={() => setFocusedSearch(false)}
              placeholder="Search by name or username..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
            {query && (
              <button
                onClick={() => onQueryChange("")}
                className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-slate-400 hover:text-white transition-colors"
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
          "mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide",
          variant === "page" ? "max-w-5xl mx-auto" : ""
        )}>
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all",
                activeFilter === tab.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px]",
                  activeFilter === tab.id ? "bg-white/20" : "bg-slate-700"
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
        variant === "page" ? "max-w-5xl mx-auto w-full" : ""
      )}>
        {/* Sections for "all" filter */}
        {activeFilter === "all" && !query && (
          <>
            {/* Suggested Users */}
            {suggested.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <UserPlus2 className="h-5 w-5 text-blue-400" />
                  Suggested for You
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {suggested.slice(0, 8).map((user) => (
                    <UserCard key={user._id} user={user} />
                  ))}
                </div>
              </section>
            )}

            {/* Online Users */}
            {onlineUsers.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Online Now
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {onlineUsers.map((user) => (
                    <UserCard key={user._id} user={user} />
                  ))}
                </div>
              </section>
            )}

            {/* All Users */}
            {users.length > 0 && (
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                  <Users className="h-5 w-5 text-slate-400" />
                  All People
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {users.map((user) => (
                    <UserCard key={user._id} user={user} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Filtered/ Search Results */}
        {(activeFilter !== "all" || query) && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              {query ? `Search Results` : filterTabs.find(t => t.id === activeFilter)?.label}
              <span className="ml-2 text-sm font-normal text-slate-400">({filteredUsers.length})</span>
            </h2>
            {filteredUsers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredUsers.map((user) => (
                  <UserCard key={user._id} user={user} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/50 bg-slate-900/50 py-16 text-center">
                <Users className="mb-4 h-12 w-12 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-300">No users found</h3>
                <p className="mt-2 text-sm text-slate-500">
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
              <div key={i} className="animate-pulse rounded-2xl border border-slate-800/50 bg-slate-900/80 p-5">
                <div className="flex flex-col items-center">
                  <div className="h-20 w-20 rounded-2xl bg-slate-800" />
                  <div className="mt-4 h-4 w-24 rounded bg-slate-800" />
                  <div className="mt-2 h-3 w-16 rounded bg-slate-800" />
                  <div className="mt-3 h-6 w-20 rounded-full bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && users.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/50">
              <Users className="h-10 w-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-300">No users found</h3>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
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
    <div className="fixed inset-0 z-[320] bg-black/60 backdrop-blur-sm">
      {panelBody}
    </div>
  );
};
