"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X
} from "lucide-react";
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
        className="fixed bottom-4 right-4 z-40 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 transition-all opacity-60 hover:opacity-100"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>

       {/* Shortcuts Modal */}
       <AnimatePresence>
         {isOpen && (
           <>
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setIsOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-label="Keyboard shortcuts"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
               <div className="border-b border-slate-100 p-4 dark:border-slate-700">
                 <div className="flex items-center justify-between">
                   <h2 className="text-lg font-bold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
                   <button
                     onClick={() => setIsOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Press ? or Ctrl+K anytime to see this help</p>
              </div>

               <div className="p-4">
                 <div className="space-y-3">
                   {shortcuts.map((shortcut) => (
                     <div
                      key={shortcut.key}
                      className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-700/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{shortcut.action}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{shortcut.description}</p>
                      </div>
                      <kbd className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-600 dark:text-slate-200 dark:ring-slate-600">
                        {shortcut.key}
                      </kbd>
                    </div>
                  ))}
                  </div>
                </div>
              </motion.div>
            </div>
           </>
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
