"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, Check, MessageCircle, UserPlus, X } from "lucide-react";
import { NotificationItem } from "@/lib/types";
import { formatConversationDate } from "@/lib/utils";

type NotificationPanelProps = {
  notifications: NotificationItem[];
  isOpen: boolean;
  onToggle: () => void;
  onOpenChat: (chatId?: string, notificationId?: string) => void;
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: string) => void;
  onAcceptFriendRequest?: (userId: string, notificationId: string) => Promise<void> | void;
  onRejectFriendRequest?: (userId: string, notificationId: string) => Promise<void> | void;
};

const getNotificationIcon = (kind: NotificationItem["kind"]) => {
  switch (kind) {
    case "friend_request":
      return <UserPlus className="h-4 w-4" />;
    case "message":
    default:
      return <MessageCircle className="h-4 w-4" />;
  }
};

const getNotificationColor = (kind: NotificationItem["kind"]) => {
  switch (kind) {
    case "friend_request":
      return "bg-lagoon";
    case "message":
    default:
      return "bg-ember";
  }
};

export const NotificationPanel = ({
  notifications,
  isOpen,
  onToggle,
  onOpenChat,
  onMarkAllRead,
  onMarkRead,
  onAcceptFriendRequest,
  onRejectFriendRequest,
}: NotificationPanelProps) => {
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="relative z-[200]" ref={panelRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        className="relative inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm text-ink transition hover:-translate-y-0.5 hover:bg-shell"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {unreadCount > 0 ? (
          <Bell className="h-4 w-4" aria-hidden="true" />
        ) : (
          <BellOff className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Notifications</span>
        {unreadCount > 0 && (
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-white shadow-sm"
            aria-hidden="true"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-[220] mt-2 w-[min(360px,calc(100vw-2rem))] animate-in fade-in slide-in-from-top-2 duration-200 rounded-[26px] border border-white/80 bg-white/98 p-4 shadow-panel backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Notifications panel"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-lagoon/70">
                Alerts
              </p>
              <h3 className="soft-heading mt-0.5 text-2xl font-semibold text-ink">Notifications</h3>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-lagoon transition hover:bg-lagoon/10"
                aria-label="Mark all as read"
              >
                <Check className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div
            className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1"
            role="list"
            aria-label="Notification list"
          >
            {notifications.length === 0 ? (
              <div className="rounded-2xl bg-shell/50 px-4 py-10 text-center">
                <Bell className="mx-auto mb-3 h-8 w-8 text-ink/20" />
                <p className="text-sm font-medium text-ink/50">No notifications yet</p>
                <p className="mt-1 text-xs text-ink/30">
                  Messages and friend requests will appear here
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex w-full items-start gap-3 rounded-[18px] px-3 py-3 text-left transition-all ${
                    notification.read
                      ? "hover:bg-shell/60"
                      : "bg-lagoon/5 hover:bg-lagoon/10 border border-lagoon/10"
                  }`}
                  role="listitem"
                >
                  <div
                    className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white ${getNotificationColor(
                      notification.kind
                    )}`}
                  >
                    {notification.fromUser?.avatar ? (
                      <div className="relative h-10 w-10 overflow-hidden rounded-xl">
                        <Image
                          src={notification.fromUser.avatar}
                          alt={notification.fromUser.name}
                          fill
                          className="object-cover"
                        />
                      </div>
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
                          className={`truncate text-sm font-medium ${
                            notification.read ? "text-ink/70" : "text-ink"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-ink/40">
                          {formatConversationDate(notification.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink/50">
                        {notification.body}
                      </p>
                    </button>
                    {notification.kind === "friend_request" && notification.action === "received" && notification.userId ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onAcceptFriendRequest?.(notification.userId!, notification.id);
                          }}
                          className="rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-3 py-1.5 text-[11px] font-semibold text-white"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void onRejectFriendRequest?.(notification.userId!, notification.id);
                          }}
                          className="rounded-full border border-ink/10 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                  {!notification.read && (
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ember"
                      aria-label="Unread"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
