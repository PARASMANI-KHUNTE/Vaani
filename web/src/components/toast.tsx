"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  duration?: number;
  onDismiss?: () => void;
  type?: "error" | "success" | "info";
};

const toastStyles = {
  error: {
    accent: "bg-rose-500",
    icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    text: "text-fg",
    button: "text-muted hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400",
    ring: "ring-rose-500/15",
  },
  success: {
    accent: "bg-emerald-500",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    text: "text-fg",
    button: "text-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
    ring: "ring-emerald-500/15",
  },
  info: {
    accent: "bg-brand",
    icon: "bg-brand/10 text-brand",
    text: "text-fg",
    button: "text-muted hover:bg-brand/10 hover:text-brand",
    ring: "ring-brand/15",
  },
};

const toastIcons = {
  error: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

export const Toast = ({ message, duration = 5000, onDismiss, type = "error" }: ToastProps) => {
  const [isLeaving, setIsLeaving] = useState(false);

  const style = toastStyles[type];
  const Icon = toastIcons[type];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(() => {
        onDismiss?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  if (isLeaving && !onDismiss) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-x-3 top-3 z-[600] overflow-hidden rounded-2xl border border-line bg-elevated px-4 py-3.5",
        "shadow-float ring-1 backdrop-blur-md",
        style.ring,
        "transition-all duration-300 ease-out sm:inset-x-auto sm:right-4 sm:top-4 sm:max-w-sm",
        isLeaving
          ? "translate-y-2 opacity-0 sm:translate-x-4 sm:translate-y-0"
          : "translate-x-0 translate-y-0 animate-slide-in-right opacity-100"
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-1", style.accent)} aria-hidden="true" />
      <div className="flex items-start gap-3 pl-1.5">
        <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", style.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={cn("flex-1 text-sm font-medium leading-snug", style.text)}>{message}</span>
        <button
          onClick={handleDismiss}
          className={cn("shrink-0 rounded-lg p-1.5 transition-colors", style.button)}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
