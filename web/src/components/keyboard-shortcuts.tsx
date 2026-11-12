"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

type KeyboardShortcut = {
  key: string;
  description: string;
  action: string;
};

const shortcuts: KeyboardShortcut[] = [
  { key: "Ctrl+K", description: "Search", action: "Open search" },
  { key: "Ctrl+N", description: "New chat", action: "Start new conversation" },
  { key: "Ctrl+E", description: "Explore", action: "Go to explore page" },
  { key: "Ctrl+P", description: "Profile", action: "Open your profile" },
  { key: "Esc", description: "Close", action: "Close current modal/menu" },
  { key: "Ctrl+Shift+M", description: "Mute", action: "Toggle notifications" },
];

export const KeyboardShortcutsHint = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show shortcuts modal when Ctrl+K or ? is pressed
      if ((event.ctrlKey && event.key === "k") || event.key === "?") {
        event.preventDefault();
        setIsOpen(true);
      }

      // Close modal on Escape
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Hint button in corner */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-xs font-bold text-muted opacity-60 shadow-sm transition-all hover:bg-subtle hover:text-fg hover:opacity-100"
        title="Keyboard shortcuts (?)"
        aria-label="Keyboard shortcuts"
      >
        ?
      </button>

      {/* Shortcuts Modal */}
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-line bg-elevated shadow-float"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-line p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Keyboard className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold tracking-tight text-fg">Keyboard Shortcuts</h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="icon-btn"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm text-muted">Press ? or Ctrl+K anytime to see this help</p>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.key}
                      className="flex items-center justify-between rounded-xl border border-line/70 bg-subtle/50 p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-fg">{shortcut.action}</p>
                        <p className="truncate text-xs text-faint">{shortcut.description}</p>
                      </div>
                      <kbd className="shrink-0 rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-muted shadow-sm">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

// Hook to handle keyboard shortcuts throughout the app
export const useAppKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle shortcuts when not typing in an input
    const target = event.target as HTMLElement;
    const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

    if (isTyping && event.key !== "Escape") return;

    // Ctrl/Cmd + K - Focus search
    if ((event.ctrlKey || event.metaKey) && event.key === "k") {
      event.preventDefault();
      // Could emit event or set search focus
      document.querySelector<HTMLInputElement>('[placeholder*="Search"]')?.focus();
    }

    // Ctrl/Cmd + N - New chat (if logged in)
    if ((event.ctrlKey || event.metaKey) && event.key === "n" && session) {
      event.preventDefault();
      // Emit custom event or use store to open new chat modal
      window.dispatchEvent(new CustomEvent("open-new-chat"));
    }

    // Ctrl/Cmd + E - Explore
    if ((event.ctrlKey || event.metaKey) && event.key === "e") {
      event.preventDefault();
      navigate("/explore");
    }

    // Ctrl/Cmd + P - Profile
    if ((event.ctrlKey || event.metaKey) && event.key === "p") {
      event.preventDefault();
      navigate("/me/profile");
    }

    // Escape - Close/clear
    if (event.key === "Escape") {
      window.dispatchEvent(new CustomEvent("escape-pressed"));
    }
  }, [navigate, session]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
};
