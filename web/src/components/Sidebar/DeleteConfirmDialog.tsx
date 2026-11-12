"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  chatName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmDialog = ({
  isOpen,
  chatName = "this user",
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onCancel]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 25 }}
            role="alertdialog"
            aria-modal="true"
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-line bg-elevated shadow-float"
          >
            <div className="relative p-6">
              <button
                type="button"
                onClick={onCancel}
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-faint transition-colors hover:bg-subtle hover:text-fg"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20 dark:text-rose-400">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <h3 className="mb-2 text-lg font-bold tracking-tight text-fg">
                Delete conversation?
              </h3>

              <p className="mb-6 text-sm leading-relaxed text-muted">
                Are you sure you want to delete your conversation with{" "}
                <span className="font-semibold text-fg">{chatName}</span>?
                This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-bold text-muted shadow-sm transition-colors hover:bg-subtle hover:text-fg active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-rose-700 active:scale-[0.98]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
