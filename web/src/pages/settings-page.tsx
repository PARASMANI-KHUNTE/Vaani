import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell, BellOff, ShieldOff, Shield, Eye, EyeOff, Smartphone,
  ChevronRight, Palette, Sun, Moon, Check, AlertTriangle,
  Trash2, UserRound,
} from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NavHeader } from "@/components/nav-header";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
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
  { id: "default", name: "Iris", color: "bg-brand" },
  { id: "emerald", name: "Emerald", color: "bg-emerald-500" },
  { id: "rose", name: "Rose", color: "bg-rose-500" },
  { id: "amber", name: "Amber", color: "bg-amber-500" },
  { id: "violet", name: "Violet", color: "bg-violet-500" },
  { id: "cyan", name: "Cyan", color: "bg-cyan-500" },
  { id: "dark", name: "Graphite", color: "bg-slate-800" },
];

const WALLPAPERS = [
  { id: "none", name: "None", preview: "" },
  { id: "mesh", name: "Mesh", preview: "mesh" },
  { id: "abstract", name: "Abstract", preview: "abstract" },
  { id: "doodles", name: "Doodles", preview: "doodles" },
];

type SettingsSection = "notifications" | "privacy" | "account" | "appearance";

const Toggle = ({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={onChange}
    disabled={disabled}
    className={cn(
      "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
      checked ? "bg-brand" : "bg-line",
      disabled && "cursor-not-allowed opacity-50"
    )}
  >
    <motion.span
      initial={false}
      animate={{ x: checked ? 22 : 2 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="inline-block h-5 w-5 rounded-full bg-white shadow-md"
    />
  </button>
);

const SettingRow = ({
  icon,
  iconClass,
  title,
  description,
  children,
  as = "div",
  onClick,
}: {
  icon: React.ReactNode;
  iconClass: string;
  title: React.ReactNode;
  description: string;
  children?: React.ReactNode;
  as?: "div" | "button";
  onClick?: () => void;
}) => {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3.5">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconClass)}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{title}</p>
          <p className="truncate text-sm text-muted">{description}</p>
        </div>
      </div>
      {children}
    </>
  );

  const classes =
    "flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand/20";

  if (as === "button") {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
};

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-6">
    <h2 className="text-xl font-bold tracking-tight text-fg">{title}</h2>
    <p className="mt-1 text-sm text-muted">{description}</p>
  </div>
);

export const SettingsPage = () => {
  const { session, logout } = useAuth();
  const { isDark, setTheme } = useTheme();
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

  const sections = [
    { id: "notifications" as const, label: "Notifications", icon: Bell, description: "Push alerts and sounds" },
    { id: "privacy" as const, label: "Privacy & Security", icon: Shield, description: "Visibility and safety" },
    { id: "appearance" as const, label: "Appearance", icon: Palette, description: "Themes and wallpapers" },
    { id: "account" as const, label: "Account", icon: UserRound, description: "Profile and sessions" },
  ];

  return (
    <main className="flex min-h-dvh w-full flex-col bg-canvas">
      <NavHeader title="Settings" showBackButton backTo="/" showNav />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-line bg-surface/60 p-4 lg:block">
          <nav className="space-y-1">
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all",
                    isActive ? "bg-brand/[0.07]" : "hover:bg-subtle"
                  )}
                >
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand" aria-hidden="true" />
                  )}
                  <section.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive ? "text-brand" : "text-faint group-hover:text-muted"
                    )}
                  />
                  <div className="min-w-0">
                    <p className={cn("truncate text-sm font-semibold", isActive ? "text-fg" : "text-muted group-hover:text-fg")}>
                      {section.label}
                    </p>
                    <p className="truncate text-xs text-faint">{section.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-line bg-surface/95 pb-safe backdrop-blur-xl lg:hidden">
          <div className="flex">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 transition-all active:scale-95",
                  activeSection === section.id ? "font-bold text-brand" : "text-faint hover:text-muted"
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
          <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:p-8">
            {activeSection === "notifications" && (
              <>
                <SectionHeading title="Notifications" description="Choose how LinkUp keeps you in the loop." />
                <div className="space-y-3">
                  <SettingRow
                    icon={pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                    iconClass={pushEnabled ? "bg-brand/10 text-brand" : "bg-subtle text-faint"}
                    title="Push Notifications"
                    description="Receive alerts for new messages"
                  >
                    <Toggle
                      checked={pushEnabled}
                      onChange={handleTogglePush}
                      disabled={pushLoading}
                      label="Toggle push notifications"
                    />
                  </SettingRow>

                  <SettingRow
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    }
                    iconClass={soundEnabled ? "bg-violet-500/10 text-violet-600 dark:text-violet-400" : "bg-subtle text-faint"}
                    title="Notification Sound"
                    description="Play a soft chime for new messages"
                  >
                    <Toggle
                      checked={soundEnabled}
                      onChange={() => setSoundEnabled(!soundEnabled)}
                      label="Toggle notification sound"
                    />
                  </SettingRow>
                </div>
              </>
            )}

            {activeSection === "privacy" && (
              <>
                <SectionHeading title="Privacy & Security" description="Control what others can see and who can reach you." />
                <div className="space-y-3">
                  <SettingRow
                    icon={showOnlineStatus ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    title="Online Status"
                    description="Let others see when you're online"
                  >
                    <Toggle
                      checked={showOnlineStatus}
                      onChange={() => setShowOnlineStatus(!showOnlineStatus)}
                      label="Toggle online status"
                    />
                  </SettingRow>

                  <SettingRow
                    icon={<Check className="h-5 w-5" />}
                    iconClass="bg-brand/10 text-brand"
                    title="Read Receipts"
                    description="Send read confirmations"
                  >
                    <Toggle
                      checked={showReadReceipts}
                      onChange={() => setShowReadReceipts(!showReadReceipts)}
                      label="Toggle read receipts"
                    />
                  </SettingRow>

                  <Link
                    to="/settings/blocked"
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-rose-500/25 hover:bg-rose-500/[0.03]"
                  >
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <ShieldOff className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-fg">Blocked Users</p>
                        <p className="truncate text-sm text-muted">Manage blocked contacts</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-faint" />
                  </Link>
                </div>
              </>
            )}

            {activeSection === "appearance" && (
              <>
                <SectionHeading title="Appearance" description="Make the workspace feel like yours." />

                <div className="mb-8 rounded-2xl border border-line bg-surface p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-subtle text-muted">
                        {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-fg">Dark Mode</p>
                        <p className="truncate text-sm text-muted">Switch between light and dark themes</p>
                      </div>
                    </div>
                    <Toggle
                      checked={isDark}
                      onChange={() => setTheme(isDark ? "light" : "dark")}
                      label="Toggle dark mode"
                    />
                  </div>
                </div>

                {/* Chat Theme */}
                <div className="mb-8">
                  <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-faint">Accent Color</h3>
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                    {THEMES.map((theme) => {
                      const isActive = selectedTheme === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setSelectedTheme(theme.id)}
                          className="group flex flex-col items-center gap-2"
                          aria-label={`${theme.name} accent`}
                          aria-pressed={isActive}
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-all",
                              theme.color,
                              isActive
                                ? "scale-105 ring-2 ring-fg/70 ring-offset-2 ring-offset-canvas"
                                : "group-hover:scale-105"
                            )}
                          >
                            {isActive && <Check className="h-5 w-5 text-white" />}
                          </div>
                          <span className={cn("text-[10px] font-medium", isActive ? "text-fg" : "text-faint")}>
                            {theme.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wallpaper */}
                <div>
                  <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-faint">Chat Wallpaper</h3>
                  <div className="grid grid-cols-4 gap-3">
                    {WALLPAPERS.map((wallpaper) => {
                      const isActive = selectedWallpaper === wallpaper.id;
                      return (
                        <button
                          key={wallpaper.id}
                          onClick={() => setSelectedWallpaper(wallpaper.id)}
                          aria-pressed={isActive}
                          className={cn(
                            "relative flex h-16 items-center justify-center overflow-hidden rounded-xl border-2 transition-all",
                            isActive
                              ? "border-brand ring-2 ring-brand/20"
                              : "border-line hover:border-brand/30",
                            wallpaper.id === "none" && "bg-subtle"
                          )}
                        >
                          {wallpaper.id === "none" ? (
                            <span className="text-xs font-medium text-faint">None</span>
                          ) : wallpaper.id === "mesh" ? (
                            <div className="h-full w-full bg-gradient-to-br from-brand/25 via-violet-400/20 to-accent/25" />
                          ) : wallpaper.id === "abstract" ? (
                            <div className="h-full w-full bg-brand/10" />
                          ) : (
                            <div className="h-full w-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat opacity-30" />
                          )}
                          {isActive && (
                            <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {activeSection === "account" && (
              <>
                <SectionHeading title="Account" description="Your profile, sessions, and account lifecycle." />
                <div className="space-y-3">
                  {/* Profile */}
                  <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
                    <Avatar
                      src={profile?.avatar}
                      name={profile?.name}
                      className="h-14 w-14"
                      textClassName="text-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-fg">{profile?.name || "Loading..."}</p>
                      <p className="truncate text-sm text-muted">@{profile?.username}</p>
                    </div>
                    <Link to="/me/profile" className="btn-secondary shrink-0 !px-3.5 !py-2 !text-xs">
                      Edit
                    </Link>
                  </div>

                  {/* Devices */}
                  <SettingRow
                    icon={<Smartphone className="h-5 w-5" />}
                    iconClass="bg-subtle text-muted"
                    title="Active Sessions"
                    description="Manage your logged-in devices"
                  />

                  <div className="h-2" />

                  {/* Disable Account */}
                  <button
                    onClick={() => setDisableConfirmOpen(true)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-amber-500/30 hover:bg-amber-500/[0.04]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-amber-600 dark:text-amber-400">Disable Account</p>
                      <p className="truncate text-sm text-muted">Temporarily deactivate your account</p>
                    </div>
                  </button>

                  {/* Delete Account */}
                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="flex w-full items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-rose-500/30 hover:bg-rose-500/[0.04]"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                      <Trash2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-rose-600 dark:text-rose-400">Delete Account</p>
                      <p className="truncate text-sm text-muted">Permanently delete your account and data</p>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
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
