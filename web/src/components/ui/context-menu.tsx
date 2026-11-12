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
        "fixed z-[500] min-w-[184px] overflow-hidden rounded-2xl border border-line bg-elevated p-1.5 shadow-float animate-in fade-in zoom-in-95 duration-100",
        className
      )}
      style={{ left: position.x, top: position.y }}
      role="menu"
    >
      {actions.map((action) => (
        <div key={action.id}>
          {action.dividerBefore && (
            <div className="mx-2 my-1 h-px bg-line" />
          )}
          <button
            onClick={() => onAction(action.id)}
            disabled={action.disabled}
            className={cn(
              "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
              action.disabled
                ? "cursor-not-allowed text-faint opacity-60"
                : action.variant === "danger"
                  ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                  : action.variant === "success"
                    ? "text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                    : "text-fg/85 hover:bg-subtle hover:text-fg"
            )}
            role="menuitem"
          >
            {action.icon && (
              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center", !action.disabled && action.variant !== "danger" && "text-muted")}>
                {action.icon}
              </span>
            )}
            <span className="truncate">{action.label}</span>
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
