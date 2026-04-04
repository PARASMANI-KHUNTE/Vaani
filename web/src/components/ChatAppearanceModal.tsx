import React, { useState, useRef } from "react";
import { 
  X, Palette, Image as ImageIcon, CheckCircle2, RefreshCw, Check
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

  if (!isOpen || !chat) return null;

  const handleSave = async () => {
    if (!session?.backendAccessToken) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await patchChatSettings(session.backendAccessToken, chat._id, {
        theme,
        wallpaper: wallpaper || undefined,
      });
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-[32px] border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-all scale-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chat Appearance</h2>
          </div>
          <button 
            onClick={onClose} 
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-6">
          {error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs font-medium text-rose-600 dark:bg-rose-900/10 dark:text-rose-400">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Color Palette</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {[
                { id: "default", color: "bg-[#6d7af7]" },
                { id: "emerald", color: "bg-emerald-500" },
                { id: "rose", color: "bg-rose-500" },
                { id: "amber", color: "bg-amber-500" },
                { id: "violet", color: "bg-violet-500" },
                { id: "cyan", color: "bg-cyan-500" },
                { id: "dark", color: "bg-slate-900" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-110",
                    t.color,
                    theme === t.id && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900"
                  )}
                >
                  {theme === t.id && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <ImageIcon className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Background Style</span>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: null, label: "None", bg: "bg-slate-100 dark:bg-slate-800" },
                  { id: "mesh", label: "Mesh", bg: "bg-gradient-to-tr from-blue-100 to-rose-100 dark:from-blue-900/20 dark:to-rose-900/20" },
                  { id: "doodles", label: "Pattern", bg: "bg-slate-200 dark:bg-slate-700" },
                  { id: "abstract", label: "Glassy", bg: "bg-[#6d7af7]/5 dark:bg-[#6d7af7]/10" },
                ].map((w) => (
                  <button
                    key={String(w.id)}
                    onClick={() => setWallpaper(w.id)}
                    className={cn(
                      "flex h-16 w-20 shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border text-[10px] font-bold uppercase transition-all hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                      wallpaper === w.id
                        ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/10 dark:border-blue-500 dark:bg-blue-900/10"
                        : "border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900"
                    )}
                  >
                    <div className={cn("h-7 w-12 rounded-lg shadow-sm", w.bg)} />
                    {w.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={wallpaper?.startsWith("http") ? wallpaper : ""}
                  onChange={(e) => setWallpaper(e.target.value || null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Custom image URL..."
                />
                <button
                  type="button"
                  onClick={() => wallpaperInputRef.current?.click()}
                  disabled={uploadingWallpaper}
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
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
            className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-2xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
