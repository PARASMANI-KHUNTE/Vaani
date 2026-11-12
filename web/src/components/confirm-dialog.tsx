"use client";

import { AlertTriangle, Info, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

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
    icon: "bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400",
    confirm: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40",
  },
  warning: {
    icon: "bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400",
    confirm: "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500/40",
  },
  info: {
    icon: "bg-brand/10 text-brand ring-brand/20",
    confirm: "bg-brand text-white hover:bg-brand-hover focus-visible:ring-brand/40",
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
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={finalOnCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="relative w-full max-w-sm rounded-3xl border border-line bg-elevated p-6 shadow-float"
          >
            <div className="flex items-start gap-4">
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1", variantStyles[finalVariant].icon)}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 pt-0.5">
                <h3 id="confirm-dialog-title" className="text-lg font-bold tracking-tight text-fg">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{message}</p>
              </div>
              <button
                onClick={finalOnCancel}
                disabled={finalLoading}
                className="shrink-0 rounded-lg p-1.5 text-faint transition-colors hover:bg-subtle hover:text-fg disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={finalOnCancel}
                disabled={finalLoading}
                className="flex-1 rounded-xl border border-line bg-surface py-3 text-sm font-bold text-muted shadow-sm transition-all hover:bg-subtle hover:text-fg active:scale-[0.98] disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={finalLoading}
                className={cn(
                  "flex-1 rounded-xl py-3 text-sm font-bold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50",
                  variantStyles[finalVariant].confirm
                )}
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
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={finalOnDismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-sm rounded-3xl border border-line bg-elevated p-6 shadow-float"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
                <Info className="h-6 w-6" />
              </div>
              <div className="flex-1 pt-0.5">
                <h3 className="text-lg font-bold tracking-tight text-fg">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{message}</p>
              </div>
            </div>
            <div className="mt-6">
              <button
                onClick={finalOnDismiss}
                className="w-full rounded-xl bg-brand py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-[0.98]"
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
