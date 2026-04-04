"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

export type ContextMenuAction = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
  dividerBefore?: boolean;
};

export type ContextMenuPosition = {
  x: number;
  y: number;
};

type ContextMenuProps = {
  actions: ContextMenuAction[];
  position: ContextMenuPosition;
  onAction: (actionId: string) => void;
  onClose: () => void;
  className?: string;
};

export const ContextMenu = ({ actions, position, onAction, onClose, className }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let adjustedX = position.x;
      let adjustedY = position.y;
      
      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 8;
      }
      
      if (position.y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 8;
      }
      
      menuRef.current.style.left = `${adjustedX}px`;
      menuRef.current.style.top = `${adjustedY}px`;
    }
  }, [position]);

  return (
    <div
      ref={menuRef}
      className={cn(
        "fixed z-[500] min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100 dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      {actions.map((action) => (
        <div key={action.id}>
          {action.dividerBefore && (
            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          )}
          <button
            onClick={() => onAction(action.id)}
            disabled={action.disabled}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
              action.disabled 
                ? "cursor-not-allowed text-slate-400 dark:text-slate-600" 
                : action.variant === "danger"
                  ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  : action.variant === "success"
                    ? "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
            )}
            role="menuitem"
          >
            {action.icon && <span className="w-4">{action.icon}</span>}
            {action.label}
          </button>
        </div>
      ))}
    </div>
  );
};

// Hook for managing context menu state
export const useContextMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });
  const [targetId, setTargetId] = useState<string | null>(null);

  const open = useCallback((event: React.MouseEvent, targetItemId: string) => {
    event.preventDefault();
    setPosition({ x: event.clientX, y: event.clientY });
    setTargetId(targetItemId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTargetId(null);
  }, []);

  return {
    isOpen,
    position,
    targetId,
    open,
    close,
  };
};
