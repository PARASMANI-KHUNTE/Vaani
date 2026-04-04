import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Bell, BellOff, ShieldOff, Shield, Eye, EyeOff, Smartphone,
  ChevronRight, Palette, Sun, Moon, Check, AlertTriangle,
  Trash2, UserRound
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NavHeader } from "@/components/nav-header";
import { useAuth } from "@/lib/auth-context";
import { useSocialData } from "@/hooks/use-social-data";
import { registerPushToken, unregisterPushToken } from "@/lib/api";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const THEMES = [
  { id: "default", name: "Classic Blue", color: "bg-[var(--primary-blue)]" },
  { id: "emerald", name: "Emerald", color: "bg-emerald-500" },
  { id: "rose", name: "Rose", color: "bg-rose-500" },
  { id: "amber", name: "Amber", color: "bg-amber-500" },
  { id: "violet", name: "Violet", color: "bg-violet-500" },
  { id: "cyan", name: "Cyan", color: "bg-cyan-500" },
  { id: "dark", name: "Dark", color: "bg-slate-900" },
];

const WALLPAPERS = [
  { id: "none", name: "None", preview: "" },
  { id: "mesh", name: "Mesh", preview: "mesh" },
  { id: "abstract", name: "Abstract", preview: "abstract" },
  { id: "doodles", name: "Doodles", preview: "doodles" },
];

type SettingsSection = "notifications" | "privacy" | "account" | "appearance";

export const SettingsPage = () => {
  const { session, logout } = useAuth();
  const token = session?.backendAccessToken;
  const { profile, disableAccount, deleteAccount } = useSocialData({ token });
  
  const [activeSection, setActiveSection] = useState<SettingsSection>("notifications");
  
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushBlockedOpen, setPushBlockedOpen] = useState(false);
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem("notificationToneEnabled");
    return stored !== null ? JSON.parse(stored) : true;
  });
  
  const [showOnlineStatus, setShowOnlineStatus] = useState(() => {
    const stored = localStorage.getItem("showOnlineStatus");
    return stored !== "false";
  });
  
  const [showReadReceipts, setShowReadReceipts] = useState(() => {
    const stored = localStorage.getItem("showReadReceipts");
    return stored !== "false";
  });

  const [selectedTheme, setSelectedTheme] = useState(() => {
    return localStorage.getItem("chatTheme") || "default";
  });

  const [selectedWallpaper, setSelectedWallpaper] = useState(() => {
    return localStorage.getItem("chatWallpaper") || "none";
  });

  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  useEffect(() => {
    if ("Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("notificationToneEnabled", JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem("showOnlineStatus", String(showOnlineStatus));
  }, [showOnlineStatus]);

  useEffect(() => {
    localStorage.setItem("showReadReceipts", String(showReadReceipts));
  }, [showReadReceipts]);

  useEffect(() => {
    localStorage.setItem("chatTheme", selectedTheme);
    document.documentElement.setAttribute("data-theme", selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    localStorage.setItem("chatWallpaper", selectedWallpaper);
  }, [selectedWallpaper]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleTogglePush = async () => {
    if (!token) return;
    
    try {
      setPushLoading(true);
      const currentPermission = Notification.permission;
      
      if (currentPermission === "denied") {
        setPushBlockedOpen(true);
        return;
      }
      
      if (currentPermission === "granted") {
        if (pushEnabled) {
          const storedEndpoint = localStorage.getItem("webPushEndpoint");
          if (storedEndpoint) {
            await unregisterPushToken(token, storedEndpoint);
            localStorage.removeItem("webPushEndpoint");
          }
          setPushEnabled(false);
        }
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        const registration = await navigator.serviceWorker.ready;
        const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) as unknown as string : undefined,
        });
        await registerPushToken(token, subscription.endpoint, "web");
        localStorage.setItem("webPushEndpoint", subscription.endpoint);
        setPushEnabled(true);
      } else if (permission === "denied") {
        setPushBlockedOpen(true);
      }
    } catch (err) {
      console.error("Push notification error:", err);
    } finally {
      setPushLoading(false);
    }
  };

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const sections = [
    { id: "notifications" as const, label: "Notifications", icon: Bell, description: "Manage push notifications and sounds" },
    { id: "privacy" as const, label: "Privacy & Security", icon: Shield, description: "Control who can see your activity" },
    { id: "appearance" as const, label: "Appearance", icon: Palette, description: "Themes, wallpapers, and display" },
    { id: "account" as const, label: "Account", icon: UserRound, description: "Manage your account settings" },
  ];

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white dark:bg-slate-950">
      <NavHeader title="Settings" showBackButton backTo="/" showNav />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 border-r border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 lg:block">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all",
                  activeSection === section.id
                    ? "bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                    : "hover:bg-white/50 dark:hover:bg-slate-800/50"
                )}
              >
                <section.icon className={cn("h-5 w-5", activeSection === section.id ? "text-[var(--primary-blue)]" : "text-slate-400")} />
                <div>
                  <p className={cn("text-sm font-semibold", activeSection === section.id ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>
                    {section.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{section.description}</p>
                </div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:hidden">
          <div className="flex">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 transition-all",
                  activeSection === section.id ? "text-[var(--primary-blue)]" : "text-slate-400"
                )}
              >
                <section.icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold">{section.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {activeSection === "notifications" && (
            <div className="max-w-2xl p-6">
              <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Notifications</h2>
              
              <div className="space-y-4">
                {/* Push Notifications */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", pushEnabled ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500")}>
                        {pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Push Notifications</p>
                        <p className="text-sm text-slate-500">Receive alerts for new messages</p>
                      </div>
                    </div>
                    <button
                      onClick={handleTogglePush}
                      disabled={pushLoading}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                        pushEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700",
                        pushLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <motion.span
                        initial={false}
                        animate={{ x: pushEnabled ? 22 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                </div>

                {/* Sound */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", soundEnabled ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500")}>
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Notification Sound</p>
                        <p className="text-sm text-slate-500">Play sound for new messages</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                        soundEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <motion.span
                        initial={false}
                        animate={{ x: soundEnabled ? 22 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "privacy" && (
            <div className="max-w-2xl p-6">
              <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Privacy & Security</h2>
              
              <div className="space-y-4">
                {/* Online Status */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        {showOnlineStatus ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Online Status</p>
                        <p className="text-sm text-slate-500">Let others see when you're online</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowOnlineStatus(!showOnlineStatus)}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                        showOnlineStatus ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <motion.span
                        initial={false}
                        animate={{ x: showOnlineStatus ? 22 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                </div>

                {/* Read Receipts */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">Read Receipts</p>
                        <p className="text-sm text-slate-500">Send read confirmations</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowReadReceipts(!showReadReceipts)}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                        showReadReceipts ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <motion.span
                        initial={false}
                        animate={{ x: showReadReceipts ? 22 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                      />
                    </button>
                  </div>
                </div>

                {/* Blocked Users */}
                <Link
                  to="/me/blocked"
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                      <ShieldOff className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Blocked Users</p>
                      <p className="text-sm text-slate-500">Manage blocked contacts</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </Link>
              </div>
            </div>
          )}

          {activeSection === "appearance" && (
            <div className="max-w-2xl p-6">
              <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Appearance</h2>
              
              {/* Dark Mode */}
              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Dark Mode</p>
                      <p className="text-sm text-slate-500">Switch between light and dark themes</p>
                    </div>
                  </div>
                    <button
                      onClick={handleToggleDarkMode}
                      className={cn(
                        "relative inline-flex h-7 w-12 items-center rounded-full transition-colors",
                        darkMode ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <motion.span
                        initial={false}
                        animate={{ x: darkMode ? 22 : 2 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
                      />
                    </button>
                </div>
              </div>

              {/* Chat Theme */}
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Chat Theme</h3>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={cn(
                        "group relative flex flex-col items-center gap-2",
                        selectedTheme === theme.id && "scale-110"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl shadow-sm transition-all",
                        theme.color,
                        selectedTheme === theme.id ? "ring-2 ring-offset-2 ring-[var(--primary-blue)]" : "hover:scale-105"
                      )}>
                        {selectedTheme === theme.id && (
                          <div className="flex h-full w-full items-center justify-center">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{theme.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallpaper */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Chat Wallpaper</h3>
                <div className="grid grid-cols-4 gap-3">
                  {WALLPAPERS.map((wallpaper) => (
                    <button
                      key={wallpaper.id}
                      onClick={() => setSelectedWallpaper(wallpaper.id)}
                      className={cn(
                        "relative flex h-16 items-center justify-center rounded-xl border-2 transition-all",
                        selectedWallpaper === wallpaper.id
                          ? "border-[var(--primary-blue)] ring-2 ring-[var(--primary-blue)]/20"
                          : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600",
                        wallpaper.id === "none" && "bg-slate-100 dark:bg-slate-800"
                      )}
                    >
                      {wallpaper.id === "none" ? (
                        <span className="text-xs font-medium text-slate-400">None</span>
                      ) : wallpaper.id === "mesh" ? (
                        <div className="h-full w-full rounded-lg bg-gradient-to-br from-blue-400/20 via-purple-400/20 to-rose-400/20" />
                      ) : wallpaper.id === "abstract" ? (
                        <div className="h-full w-full rounded-lg bg-[var(--primary-blue)]/10" />
                      ) : (
                        <div className="h-full w-full rounded-lg bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat opacity-30" />
                      )}
                      {selectedWallpaper === wallpaper.id && (
                        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary-blue)]">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === "account" && (
            <div className="max-w-2xl p-6">
              <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">Account</h2>
              
              <div className="space-y-4">
                {/* Profile */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={profile?.avatar}
                      name={profile?.name}
                      className="h-14 w-14"
                      textClassName="text-xl"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white">{profile?.name || "Loading..."}</p>
                      <p className="text-sm text-slate-500">@{profile?.username}</p>
                    </div>
                    <Link
                      to="/me/profile"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                  </div>
                </div>

                {/* Devices */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Active Sessions</p>
                      <p className="text-sm text-slate-500">Manage your logged-in devices</p>
                    </div>
                  </div>
                </div>

                <div className="h-4" />

                {/* Disable Account */}
                <button
                  onClick={() => setDisableConfirmOpen(true)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-amber-600">Disable Account</p>
                    <p className="text-sm text-slate-500">Temporarily deactivate your account</p>
                  </div>
                </button>

                {/* Delete Account */}
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-rose-900/10"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <Trash2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-rose-600">Delete Account</p>
                    <p className="text-sm text-slate-500">Permanently delete your account and data</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Push Blocked Dialog */}
      <AlertDialog
        isOpen={pushBlockedOpen}
        onClose={() => setPushBlockedOpen(false)}
        title="Notifications Blocked"
        message="Notifications are blocked by your browser. Please enable them in your browser settings to receive push notifications."
      />

      {/* Disable Account Dialog */}
      <ConfirmDialog
        isOpen={disableConfirmOpen}
        onClose={() => setDisableConfirmOpen(false)}
        onConfirm={async () => {
          setDisableLoading(true);
          try {
            await disableAccount();
            setDisableConfirmOpen(false);
            logout();
          } catch (err) {
            console.error("Failed to disable account:", err);
          } finally {
            setDisableLoading(false);
          }
        }}
        title="Disable Account"
        message="Are you sure you want to disable your account? You can reactivate it by signing in again."
        confirmText="Disable"
        loading={disableLoading}
        destructive={false}
      />

      {/* Delete Account Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          setDeleteLoading(true);
          try {
            await deleteAccount();
            setDeleteConfirmOpen(false);
            logout();
          } catch (err) {
            console.error("Failed to delete account:", err);
          } finally {
            setDeleteLoading(false);
          }
        }}
        title="Delete Account"
        message="This action cannot be undone. All your data will be permanently deleted."
        confirmText="Delete"
        loading={deleteLoading}
        destructive
      />
    </main>
  );
};
