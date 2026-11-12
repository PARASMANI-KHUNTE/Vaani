"use client";

import { Avatar } from "@/components/ui/avatar";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, Check, MessageCircle, Smile, Trash2, UserPlus, Volume2, VolumeX, Settings, X } from "lucide-react";
import { NotificationItem } from "@/lib/types";
import { cn, formatConversationDate } from "@/lib/utils";

type NotificationPanelProps = {
  notifications: NotificationItem[];
  isOpen: boolean;
  onToggle: () => void;
  onOpenChat: (chatId?: string, notificationId?: string) => void;
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: string) => void;
  onDelete: (notificationId: string) => void;
  onClear: () => void;
  onAcceptFriendRequest?: (userId: string, notificationId: string) => Promise<void> | void;
  onRejectFriendRequest?: (userId: string, notificationId: string) => Promise<void> | void;
  notificationToneEnabled?: boolean;
  onNotificationToneChange?: (enabled: boolean) => void;
};

const getNotificationIcon = (kind: NotificationItem["kind"]) => {
  switch (kind) {
    case "friend_request":
      return <UserPlus className="h-4 w-4" />;
    case "reaction":
      return <Smile className="h-4 w-4" />;
    case "message":
    default:
      return <MessageCircle className="h-4 w-4" />;
  }
};

const getNotificationColor = (kind: NotificationItem["kind"]) => {
  switch (kind) {
    case "friend_request":
      return "bg-emerald-500";
    case "reaction":
      return "bg-violet-500";
    case "message":
    default:
      return "bg-brand";
  }
};

export const NotificationPanel = ({
  notifications,
  isOpen,
  onToggle,
  onOpenChat,
  onMarkAllRead,
  onMarkRead,
  onDelete,
  onClear,
  onAcceptFriendRequest,
  onRejectFriendRequest,
  notificationToneEnabled = true,
  onNotificationToneChange,
}: NotificationPanelProps) => {
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const hasNotifications = notifications.length > 0;
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "messages" | "requests" | "mentions">("all");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onToggle();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onToggle();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onToggle]);

  const handleNotificationClick = (notification: NotificationItem) => {
    onMarkRead(notification.id);
    if (notification.kind === "message") {
      onOpenChat(notification.chatId, notification.id);
    }
    onToggle();
  };

  const filtered = (() => {
    switch (activeFilter) {
      case "messages":
        return notifications.filter((n) => n.kind === "message");
      case "requests":
        return notifications.filter((n) => n.kind === "friend_request");
      case "mentions":
        return notifications.filter((n) => n.kind === "reaction");
      case "all":
      default:
        return notifications;
    }
  })();

  const grouped = (() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const today: NotificationItem[] = [];
    const yesterday: NotificationItem[] = [];
    const older: NotificationItem[] = [];

    filtered.forEach((n) => {
      const ts = new Date(n.createdAt);
      if (ts >= startOfToday) today.push(n);
      else if (ts >= startOfYesterday) yesterday.push(n);
      else older.push(n);
    });

    return { today, yesterday, older };
  })();

  return (
    <div className="relative z-[200]" ref={panelRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className="icon-btn relative"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {!notificationToneEnabled ? (
          <BellOff className="h-4 w-4 text-faint" aria-hidden="true" />
        ) : (
          <Bell className="h-4 w-4" aria-hidden="true" />
        )}
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white tabular-nums shadow-sm ring-2 ring-surface"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[210] bg-black/5 lg:hidden" 
            onClick={onToggle}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
            className="absolute right-0 top-full z-[220] mt-2 flex max-h-[560px] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-elevated shadow-float"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications panel"
          >
          <div className="shrink-0 border-b border-line bg-elevated/90 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight text-fg">Notifications</h3>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tabular-nums text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/10"
                    aria-label="Mark all as read"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Mark all</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowSettings((v) => !v)}
                  className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-fg",
                    showSettings && "bg-subtle text-fg"
                  )}
                  aria-label="Notification settings"
                  aria-expanded={showSettings}
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-1 rounded-xl border border-line bg-subtle/60 p-1">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "messages", label: "Messages" },
                  { id: "requests", label: "Requests" },
                  { id: "mentions", label: "Mentions" },
                ] as const
              ).map((t) => {
                const isActive = activeFilter === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveFilter(t.id)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold transition-all",
                      isActive
                        ? "bg-surface text-brand shadow-sm ring-1 ring-brand/15"
                        : "text-muted hover:text-fg"
                    )}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {showSettings ? (
              <div className="mt-3 rounded-xl border border-line bg-subtle/50 p-3">
                <button
                  type="button"
                  onClick={() => onNotificationToneChange?.(!notificationToneEnabled)}
                  className="flex w-full items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {notificationToneEnabled ? (
                      <Volume2 className="h-4 w-4 text-brand" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-faint" />
                    )}
                    <span className="text-sm font-semibold text-fg">Notification sound</span>
                  </div>
                  <div
                    className={cn(
                      "relative h-5 w-9 rounded-full transition-colors",
                      notificationToneEnabled ? "bg-brand" : "bg-line"
                    )}
                  >
                    <div
                      className={cn(
                        "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        notificationToneEnabled ? "translate-x-4" : "translate-x-0.5"
                      )}
                    />
                  </div>
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-3" role="list" aria-label="Notification list">
            {filtered.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-line bg-subtle/40 px-4 py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-subtle text-faint">
                    <Bell className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-fg">You're all caught up</p>
                  <p className="mt-1 text-xs text-faint">New notifications will show up here.</p>
                </div>
                {hasNotifications ? (
                  <button
                    type="button"
                    onClick={onClear}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                    aria-label="Clear notifications"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Clear notifications
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                {(
                  [
                    { label: "Today", items: grouped.today },
                    { label: "Yesterday", items: grouped.yesterday },
                    { label: "Older", items: grouped.older },
                  ] as const
                ).map((section) =>
                  section.items.length ? (
                    <div key={section.label}>
                      <div className="px-1 pb-2 pt-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-faint">{section.label}</p>
                      </div>
                      <div className="space-y-2">
                        <AnimatePresence initial={false}>
                          {section.items.map((notification) => (
                            <motion.div
                              key={notification.id}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 8 }}
                              transition={{ duration: 0.16 }}
                              className={cn(
                                "flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors",
                                notification.read
                                  ? "border-line bg-surface hover:bg-subtle/60"
                                  : "border-brand/20 bg-brand/[0.05] hover:bg-brand/[0.08]"
                              )}
                              role="listitem"
                            >
                              <div
                                className={cn(
                                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                                  getNotificationColor(notification.kind)
                                )}
                              >
                                {notification.fromUser ? (
                                  <Avatar
                                    src={notification.fromUser.avatar}
                                    name={notification.fromUser.name}
                                    className="h-10 w-10 rounded-xl"
                                    textClassName="text-sm font-semibold"
                                  />
                                ) : (
                                  getNotificationIcon(notification.kind)
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => handleNotificationClick(notification)}
                                  className="w-full text-left"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p
                                      className={cn(
                                        "truncate text-sm font-semibold",
                                        notification.read ? "text-fg/85" : "text-fg"
                                      )}
                                    >
                                      {notification.title}
                                    </p>
                                    <span className="shrink-0 text-[10px] font-semibold tabular-nums text-faint">
                                      {formatConversationDate(notification.createdAt)}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted">
                                    {notification.body}
                                  </p>
                                </button>
                                {notification.kind === "friend_request" &&
                                notification.action === "received" &&
                                notification.userId ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void onAcceptFriendRequest?.(notification.userId!, notification.id);
                                      }}
                                      className="rounded-xl bg-brand px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void onRejectFriendRequest?.(notification.userId!, notification.id);
                                      }}
                                      className="rounded-xl border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:bg-subtle hover:text-fg"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                ) : notification.kind === "friend_request" &&
                                  (notification.action === "accepted" || notification.action === "rejected") ? (
                                  <div className="mt-3">
                                    <span className={cn(
                                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                                      notification.action === "accepted"
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-subtle text-muted"
                                    )}>
                                      {notification.action === "accepted" ? (
                                        <>
                                          <Check className="h-3 w-3" />
                                          You accepted
                                        </>
                                      ) : (
                                        <>
                                          <X className="h-3 w-3" />
                                          You declined
                                        </>
                                      )}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-2">
                                {!notification.read ? (
                                  <span className="mt-1.5 h-2 w-2 rounded-full bg-brand" aria-label="Unread" />
                                ) : null}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    onDelete(notification.id);
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle hover:text-fg"
                                  aria-label="Delete notification"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ) : null
                )}

                <button
                  type="button"
                  onClick={onClear}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                  aria-label="Clear notifications"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Clear notifications
                </button>
              </div>
            )}
          </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

