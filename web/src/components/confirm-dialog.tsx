"use client";

import { AlertTriangle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
  confirmText?: string;
  loading?: boolean;
  destructive?: boolean;
};

const variantStyles = {
  danger: {
    icon: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    confirm: "bg-red-600 hover:bg-red-700 text-white shadow-red-600/20",
    cancel: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
  },
  warning: {
    icon: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    confirm: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20",
    cancel: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
  },
  info: {
    icon: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    confirm: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
    cancel: "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
  },
};

const variantIcons = {
  danger: AlertTriangle,
  warning: AlertTriangle,
  info: Info,
};

export const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "info",
  onConfirm,
  onCancel,
  onClose,
  isLoading = false,
  confirmText,
  loading,
  destructive,
}: ConfirmDialogProps) => {
  const Icon = variantIcons[variant];
  
  // Handle alternate props
  const finalLoading = loading ?? isLoading;
  const finalConfirmText = confirmText ?? confirmLabel;
  const finalDestructive = destructive ?? variant === "danger";
  const finalOnCancel = onCancel ?? onClose;
  const finalVariant = finalDestructive ? "danger" : variant;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={finalOnCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800 ring-1 ring-black/5"
          >
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${variantStyles[finalVariant].icon}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
              </div>
              <button
                onClick={finalOnCancel}
                disabled={finalLoading}
                className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={finalOnCancel}
                disabled={finalLoading}
                className={`flex-1 rounded-xl py-3 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${variantStyles[finalVariant].cancel}`}
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={finalLoading}
                className={`flex-1 rounded-xl py-3 text-sm font-bold shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 ${variantStyles[finalVariant].confirm}`}
              >
                {finalLoading ? "Processing..." : finalConfirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

type AlertDialogProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onDismiss?: () => void;
  onClose?: () => void;
};

export const AlertDialog = ({ isOpen, title, message, onDismiss, onClose }: AlertDialogProps) => {
  const finalOnDismiss = onDismiss ?? onClose;
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={finalOnDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-800 ring-1 ring-black/5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <Info className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={finalOnDismiss}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98]"
              >
                OK
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
