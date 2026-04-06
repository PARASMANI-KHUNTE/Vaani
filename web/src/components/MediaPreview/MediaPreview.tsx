"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PreviewItem = {
  url: string;
  type: "image" | "video";
  originalName?: string | null;
  width?: number | null;
  height?: number | null;
  messageId?: string;
};

type MediaPreviewProps = {
  items: PreviewItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
};

export const MediaPreview = ({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
}: MediaPreviewProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const current = items[currentIndex];
  const hasMultiple = items.length > 1;

  // Reset state when opening or changing initial index
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  // Reset zoom/pan when switching items
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, items.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(z - 0.5, 1);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
        case "0":
          handleResetZoom();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, goNext, goPrev, handleZoomIn, handleZoomOut, handleResetZoom]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (current?.type !== "image") return;
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom((z) => Math.min(z + 0.25, 5));
      } else {
        setZoom((z) => {
          const next = Math.max(z - 0.25, 1);
          if (next === 1) setPan({ x: 0, y: 0 });
          return next;
        });
      }
    },
    [current?.type]
  );

  // Pan handlers for zoomed images
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1 || current?.type !== "image") return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [zoom, pan, current?.type]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double-click to toggle zoom
  const handleDoubleClick = useCallback(() => {
    if (current?.type !== "image") return;
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2.5);
    }
  }, [zoom, current?.type]);

  const getDownloadName = (item: PreviewItem) => {
    if (item.originalName) return item.originalName;
    const ext = item.type === "image" ? "jpg" : "mp4";
    return `${item.type}-${item.messageId || "media"}.${ext}`;
  };

  if (!current) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex flex-col bg-black/95"
          onWheel={handleWheel}
        >
          {/* Top Bar */}
          <div className="flex h-14 shrink-0 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              {hasMultiple && (
                <span className="text-sm font-medium text-white/60">
                  {currentIndex + 1} / {items.length}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Zoom controls (images only) */}
              {current.type === "image" && (
                <>
                  <button
                    onClick={handleZoomOut}
                    disabled={zoom <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ZoomOut className="h-4.5 w-4.5" />
                  </button>
                  {zoom > 1 && (
                    <button
                      onClick={handleResetZoom}
                      className="flex h-9 items-center justify-center rounded-full px-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      {Math.round(zoom * 100)}%
                    </button>
                  )}
                  <button
                    onClick={handleZoomIn}
                    disabled={zoom >= 5}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <ZoomIn className="h-4.5 w-4.5" />
                  </button>
                  <div className="mx-1 h-5 w-px bg-white/20" />
                </>
              )}

              {/* Download */}
              <a
                href={current.url}
                download={getDownloadName(current)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                title="Download"
              >
                <Download className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Media Content */}
          <div
            className={cn(
              "relative flex flex-1 items-center justify-center overflow-hidden",
              zoom > 1 && current.type === "image"
                ? "cursor-grab"
                : "cursor-default",
              isDragging && "cursor-grabbing"
            )}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
          >
            {/* Navigation Arrows */}
            {hasMultiple && currentIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white active:scale-95 sm:left-4 sm:h-12 sm:w-12"
              >
                <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}
            {hasMultiple && currentIndex < items.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-white active:scale-95 sm:right-4 sm:h-12 sm:w-12"
              >
                <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            )}

            {/* Image */}
            {current.type === "image" && (
              <motion.img
                key={current.url}
                src={current.url}
                alt={current.originalName || "Image preview"}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{
                  opacity: 1,
                  scale: zoom,
                  x: pan.x,
                  y: pan.y,
                }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{
                  opacity: { duration: 0.2 },
                  scale: { type: "spring", stiffness: 300, damping: 30 },
                  x: { type: "tween", duration: isDragging ? 0 : 0.15 },
                  y: { type: "tween", duration: isDragging ? 0 : 0.15 },
                }}
                className="max-h-[calc(100vh-8rem)] max-w-[calc(100vw-2rem)] select-none object-contain"
                draggable={false}
              />
            )}

            {/* Video */}
            {current.type === "video" && (
              <motion.video
                key={current.url}
                src={current.url}
                controls
                autoPlay
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="max-h-[calc(100vh-8rem)] max-w-[calc(100vw-2rem)] rounded-lg"
              />
            )}
          </div>

          {/* Thumbnail strip for multiple items */}
          {hasMultiple && (
            <div className="flex h-16 shrink-0 items-center justify-center gap-2 px-4 pb-2">
              {items.map((item, idx) => (
                <button
                  key={`${item.url}-${idx}`}
                  onClick={() => setCurrentIndex(idx)}
                  className={cn(
                    "relative h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all",
                    idx === currentIndex
                      ? "ring-2 ring-white ring-offset-1 ring-offset-black/95"
                      : "opacity-50 hover:opacity-80"
                  )}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-white/10">
                      <span className="text-[10px] font-bold text-white/70">
                        VID
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Click backdrop to close (only when not zoomed) */}
          {zoom <= 1 && (
            <div
              className="absolute inset-0 -z-10"
              onClick={onClose}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
