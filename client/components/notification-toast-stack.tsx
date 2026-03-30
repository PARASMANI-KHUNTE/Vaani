"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, UserPlus, X } from "lucide-react";
import { NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type NotificationToastStackProps = {
  notifications: NotificationItem[];
  onOpenChat: (chatId?: string, notificationId?: string) => void;
  onMarkRead: (notificationId: string) => void;
};

interface ToastItem extends NotificationItem {
  toastId: string;
  timestamp: number;
}

const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880;
    oscillator.type = "sine";
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    setTimeout(() => {
      oscillator.connect(audioContext.destination);
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1100;
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.05, audioContext.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.45);
      osc2.start(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 0.45);
    }, 150);
  } catch {
    // Audio blocked
  }
};

export const NotificationToastStack = ({
  notifications,
  onOpenChat,
  onMarkRead,
}: NotificationToastStackProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const seenIdsRef = useRef<Set<string>>(new Set());
  const previousNotificationsRef = useRef<NotificationItem[]>([]);

  useEffect(() => {
    const previousIds = new Set(previousNotificationsRef.current.map((n) => n.id));
    const newNotifications = notifications.filter(
      (n) => !n.read && !previousIds.has(n.id) && !dismissedIds.has(n.id)
    );

    if (newNotifications.length > 0) {
      playNotificationSound();

      const newToasts: ToastItem[] = newNotifications.map((notification) => ({
        ...notification,
        toastId: `${notification.id}-${Date.now()}`,
        timestamp: Date.now(),
      }));

      setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
    }

    previousNotificationsRef.current = notifications;
  }, [notifications, dismissedIds]);

  useEffect(() => {
    const autoDismiss = setInterval(() => {
      const now = Date.now();
      setToasts((prev) =>
        prev.filter((toast) => now - toast.timestamp < 6000)
      );
    }, 1000);

    return () => clearInterval(autoDismiss);
  }, []);

  const handleDismiss = useCallback((toastId: string, notificationId: string) => {
    setDismissedIds((prev) => new Set([...prev, notificationId]));
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const handleToastClick = useCallback(
    (toast: ToastItem) => {
      onMarkRead(toast.id);
      onOpenChat(toast.chatId, toast.id);
      setToasts((prev) => prev.filter((t) => t.toastId !== toast.toastId));
    },
    [onMarkRead, onOpenChat]
  );

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-3 top-3 z-[250] flex flex-col gap-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.toastId}
          className={cn(
            "animate-in slide-in-from-right-8 fade-in duration-300",
            "rounded-[20px] border border-white/80 bg-white/95 p-3.5 shadow-xl backdrop-blur-md sm:p-4",
            "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-2xl",
            "relative overflow-hidden"
          )}
          style={{ animationDelay: `${index * 80}ms` }}
          onClick={() => handleToastClick(toast)}
          role="alert"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleToastClick(toast);
            }
          }}
        >
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r opacity-50",
            toast.kind === "friend_request" ? "from-lagoon/10 to-transparent" : "from-ember/10 to-transparent"
          )} />

          <div className="relative flex items-start gap-3.5">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md",
                toast.kind === "friend_request" ? "bg-gradient-to-br from-lagoon to-lagoon/80" : "bg-gradient-to-br from-ember to-ember/80"
              )}
            >
              {toast.kind === "friend_request" ? (
                <UserPlus className="h-5 w-5" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-sm font-semibold text-ink">
                {toast.title}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-ink/55">
                {toast.body}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(toast.toastId, toast.id);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/40 transition-all hover:bg-ink/5 hover:text-ink/70"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink/5">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                toast.kind === "friend_request" ? "bg-lagoon/60" : "bg-ember/60"
              )}
              style={{
                width: "100%",
                animation: "shrink 6s linear forwards",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
