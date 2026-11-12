import React, { useEffect, useState, useRef } from "react";
import { 
  X, Palette, Image as ImageIcon, CheckCircle2, RefreshCw, Check, Link2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Chat } from "@/lib/types";
import { patchChatSettings, uploadMedia } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

interface ChatAppearanceModalProps {
  chat: Chat;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedChat: Chat) => void;
}

export const ChatAppearanceModal = ({ chat, isOpen, onClose, onUpdate }: ChatAppearanceModalProps) => {
  const { session } = useAuth();
  const [theme, setTheme] = useState(chat?.theme || "default");
  const [wallpaper, setWallpaper] = useState<string | null>(chat?.wallpaper || null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingWallpaper, setUploadingWallpaper] = useState(false);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Keep the form in sync when the modal is reopened for another chat.
  useEffect(() => {
    if (!isOpen) return;
    setTheme(chat?.theme || "default");
    setWallpaper(chat?.wallpaper || null);
    setError(null);
  }, [chat?._id, chat?.theme, chat?.wallpaper, isOpen]);

  if (!isOpen || !chat) return null;

  const handleSave = async () => {
    if (!session?.backendAccessToken) return;

    const currentTheme = chat.theme || "default";
    const currentWallpaper = chat.wallpaper || null;
    const nextWallpaper = wallpaper || null;
    const updates: { theme?: string; wallpaper?: string | null } = {};

    if (theme !== currentTheme) {
      updates.theme = theme;
    }
    if (nextWallpaper !== currentWallpaper) {
      updates.wallpaper = nextWallpaper;
    }

    if (Object.keys(updates).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const result = await patchChatSettings(session.backendAccessToken, chat._id, updates);
      onUpdate?.(result.chat);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update appearance";
      console.error("Chat appearance error:", err);
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.backendAccessToken) return;

    try {
      setUploadingWallpaper(true);
      const result = await uploadMedia(session.backendAccessToken, file);
      setWallpaper(result.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to upload wallpaper";
      console.error("Wallpaper upload error:", err);
      setError(message);
    } finally {
      setUploadingWallpaper(false);
      if (wallpaperInputRef.current) wallpaperInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm animate-in fade-in zoom-in duration-200 rounded-[28px] border border-line bg-elevated p-6 shadow-float"
      >
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
              <Palette className="h-4 w-4" />
            </div>
            <h2 className="text-lg font-bold tracking-tight text-fg">Chat Appearance</h2>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-xs font-medium text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          <div>
            <div className="mb-3 flex items-center gap-2 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Color Palette</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: "default", color: "bg-brand" },
                { id: "emerald", color: "bg-emerald-500" },
                { id: "rose", color: "bg-rose-500" },
                { id: "amber", color: "bg-amber-500" },
                { id: "violet", color: "bg-violet-500" },
                { id: "cyan", color: "bg-cyan-500" },
                { id: "dark", color: "bg-slate-800" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  aria-label={`${t.id} theme`}
                  className={cn(
                    "group relative flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-all hover:scale-110",
                    t.color,
                    theme === t.id && "ring-2 ring-brand ring-offset-2 ring-offset-elevated"
                  )}
                >
                  {theme === t.id && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 px-1">
              <ImageIcon className="h-3.5 w-3.5 text-brand" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-faint">Background Style</span>
            </div>
            <div className="space-y-4">
              <div className="scrollbar-hide flex gap-2.5 overflow-x-auto pb-1">
                {[
                  { id: null, label: "None", bg: "bg-subtle border border-line" },
                  { id: "mesh", label: "Mesh", bg: "bg-gradient-to-tr from-brand-100 to-accent/25" },
                  { id: "doodles", label: "Pattern", bg: "bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800" },
                  { id: "abstract", label: "Glassy", bg: "bg-brand/10" },
                ].map((w) => (
                  <button
                    key={String(w.id)}
                    onClick={() => setWallpaper(w.id)}
                    className={cn(
                      "flex h-16 w-20 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border text-[10px] font-bold uppercase transition-all",
                      wallpaper === w.id
                        ? "border-brand bg-brand/[0.06] text-brand ring-2 ring-brand/15"
                        : "border-line bg-surface text-muted hover:border-brand/25 hover:bg-subtle"
                    )}
                  >
                    <div className={cn("h-7 w-12 rounded-lg shadow-sm", w.bg)} />
                    {w.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <input
                    type="text"
                    value={wallpaper?.startsWith("http") ? wallpaper : ""}
                    onChange={(e) => setWallpaper(e.target.value || null)}
                    className="w-full rounded-xl border border-line bg-subtle/60 py-2.5 pl-9 pr-3 text-sm text-fg outline-none transition-all placeholder:text-faint focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/12"
                    placeholder="Custom image URL..."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => wallpaperInputRef.current?.click()}
                  disabled={uploadingWallpaper}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-brand transition-colors hover:bg-brand/5 disabled:opacity-50"
                  aria-label="Upload wallpaper"
                >
                  {uploadingWallpaper ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                </button>
                <input
                  type="file"
                  hidden
                  ref={wallpaperInputRef}
                  accept="image/*"
                  onChange={handleWallpaperUpload}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl border border-line bg-surface py-3.5 text-sm font-bold text-muted shadow-sm transition-colors hover:bg-subtle hover:text-fg"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
