"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Smile, UserPlus, X } from "lucide-react";
import { NotificationItem } from "@/lib/types";
import { cn } from "@/lib/utils";

type NotificationToastStackProps = {
  notifications: NotificationItem[];
  onOpenChat: (chatId?: string, notificationId?: string) => void;
  onMarkRead: (notificationId: string) => void;
  notificationToneEnabled?: boolean;
};

interface ToastItem extends NotificationItem {
  toastId: string;
  timestamp: number;
}

const playNotificationSound = () => {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();

    const now = audioContext.currentTime;
    const createCalmNote = (frequency: number, startOffset: number, duration: number, gainValue: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.linearRampToValueAtTime(gainValue, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);

      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration + 0.02);
    };

    createCalmNote(523.25, 0, 0.35, 0.018);
    createCalmNote(659.25, 0.12, 0.42, 0.015);
  } catch {
    // Silently ignore audio errors - notification sound is non-critical
  }
};

export const NotificationToastStack = ({
  notifications,
  onOpenChat,
  onMarkRead,
  notificationToneEnabled = true,
}: NotificationToastStackProps) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const previousNotificationsRef = useRef<NotificationItem[]>([]);

  useEffect(() => {
    const previousIds = new Set(previousNotificationsRef.current.map((n) => n.id));
    const newNotifications = notifications.filter(
      (n) => !n.read && !previousIds.has(n.id) && !dismissedIds.has(n.id)
    );

    if (newNotifications.length > 0) {
      if (notificationToneEnabled) {
      playNotificationSound();
      }

      const newToasts: ToastItem[] = newNotifications.map((notification) => ({
        ...notification,
        toastId: `${notification.id}-${Date.now()}`,
        timestamp: Date.now(),
      }));

      setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
    }

    previousNotificationsRef.current = notifications;
  }, [notifications, dismissedIds, notificationToneEnabled]);

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
            "rounded-[20px] border border-white/80 dark:border-white/5 bg-white/95 dark:bg-slate-800/95 p-3.5 shadow-xl backdrop-blur-md sm:p-4",
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
            toast.kind === "friend_request" ? "from-lagoon/10 to-transparent" : 
            toast.kind === "reaction" ? "from-violet-500/10 to-transparent" : 
            "from-ember/10 to-transparent"
          )} />

          <div className="relative flex items-start gap-3.5">
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md",
                toast.kind === "friend_request" ? "bg-gradient-to-br from-lagoon to-lagoon/80" : 
                toast.kind === "reaction" ? "bg-gradient-to-br from-violet-500 to-violet-600" : 
                "bg-gradient-to-br from-ember to-ember/80"
              )}
            >
              {toast.kind === "friend_request" ? (
                <UserPlus className="h-5 w-5" />
              ) : toast.kind === "reaction" ? (
                <Smile className="h-5 w-5" />
              ) : (
                <MessageCircle className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">
                {toast.title}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-ink/55 dark:text-slate-400">
                {toast.body}
              </p>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDismiss(toast.toastId, toast.id);
              }}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/40 dark:text-slate-500 transition-all hover:bg-ink/5 dark:hover:bg-white/5 hover:text-ink/70 dark:hover:text-slate-300"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-ink/5 dark:bg-white/10">
            <div
              className={cn(
                "h-full transition-all duration-1000 ease-linear",
                toast.kind === "friend_request" ? "bg-lagoon/60" : 
                toast.kind === "reaction" ? "bg-violet-500/60" : 
                "bg-ember/60"
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
