"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

type ToastProps = {
  message: string;
  duration?: number;
  onDismiss?: () => void;
  type?: "error" | "success" | "info";
};

const toastStyles = {
  error: {
    bg: "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/30 dark:to-red-900/10",
    border: "border-red-200/60 dark:border-red-800/40",
    icon: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    text: "text-red-800 dark:text-red-300",
    button: "hover:bg-red-100/50 dark:hover:bg-red-900/30",
  },
  success: {
    bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-900/10",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    icon: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    text: "text-emerald-800 dark:text-emerald-300",
    button: "hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30",
  },
  info: {
    bg: "bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/30 dark:to-blue-900/10",
    border: "border-blue-200/60 dark:border-blue-800/40",
    icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    text: "text-blue-800 dark:text-blue-300",
    button: "hover:bg-blue-100/50 dark:hover:bg-blue-900/30",
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
      className={`
        fixed inset-x-3 top-3 z-50 rounded-2xl border ${style.border} ${style.bg} px-4 py-3.5 
        shadow-lg backdrop-blur-sm sm:left-auto sm:right-4 sm:top-4 sm:max-w-sm
        transition-all duration-300 ease-out
        ${isLeaving ? 'opacity-0 translate-y-2 sm:translate-x-4 sm:translate-y-0' : 'opacity-100 translate-x-0 translate-y-0 animate-slide-in-right'}
      `}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${style.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className={`flex-1 text-sm font-medium ${style.text}`}>{message}</span>
        <button
          onClick={handleDismiss}
          className={`shrink-0 rounded-xl p-1.5 transition-colors ${style.button}`}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
