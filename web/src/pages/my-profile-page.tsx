import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, ChevronRight, ShieldOff, UserRoundPen } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSocialData } from "@/hooks/use-social-data";
import { Avatar } from "@/components/ui/avatar";
import { registerPushToken, unregisterPushToken } from "@/lib/api";
import { AlertDialog, ConfirmDialog } from "@/components/confirm-dialog";

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

export const MyProfilePage = () => {
  const { session, status, logout } = useAuth();
  const token = session?.backendAccessToken;
  const {
    profile,
    error,
    isLoadingProfile,
    saveProfile,
    disableAccount,
    deleteAccount,
    clearError,
  } = useSocialData({ token });
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushBlockedOpen, setPushBlockedOpen] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPushEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleTogglePush = async () => {
    if (!token) return;
    
    try {
      setPushLoading(true);
      
      if (Notification.permission === "granted" && pushEnabled) {
        await unregisterPushToken(token);
        setPushEnabled(false);
      } else if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          const registration = await navigator.serviceWorker.ready;
          const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidKey ? urlBase64ToUint8Array(vapidKey) as unknown as string : undefined,
          });
          await registerPushToken(token, subscription.endpoint, "web");
          setPushEnabled(true);
        }
      } else if (Notification.permission === "denied") {
        setPushBlockedOpen(true);
      }
    } catch (err) {
      console.error("Push notification error:", err);
    } finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    if (!profile) {
      return;
    }
    setName(profile.name);
    setTagline(profile.tagline || "");
    setBio(profile.bio || "");
  }, [profile]);

  const handleTaglineChange = (value: string) => {
    setTagline(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4));
  };

  if (status === "loading" || isLoadingProfile) {
    return (
      <main className="ambient-grid flex min-h-dvh items-center justify-center p-6">
        <div className="surface-panel rounded-[30px] px-8 py-10">Loading profile...</div>
      </main>
    );
  }

  if (!token || !profile) {
    return (
      <main className="ambient-grid flex min-h-dvh items-center justify-center p-6">
        <div className="surface-panel rounded-[30px] px-8 py-10 text-center">
          <h1 className="text-2xl font-semibold text-ink">Sign in to view your profile</h1>
          <Link to="/" className="mt-4 inline-flex rounded-full bg-lagoon/10 px-4 py-2 text-sm font-semibold text-lagoon">
            Back to chat
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-white dark:bg-slate-950">
      <header className="z-50 shrink-0 border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-100 dark:hover:bg-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Profile Settings</h1>
          </div>
          <button onClick={logout} className="rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-50 dark:hover:bg-rose-900/20">Sign out</button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-400">
            {error}{" "}
            <button type="button" className="font-bold underline" onClick={clearError}>Dismiss</button>
          </div>
        ) : null}

        <div className="grid border-b border-slate-200 dark:border-slate-800 lg:grid-cols-[400px_1fr]">
          <section className="border-r border-slate-200 p-8 dark:border-slate-800">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-xl ring-1 ring-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-700">
                <Avatar
                  src={profile.avatar}
                  name={profile.name}
                  className="h-full w-full rounded-xl"
                  textClassName="text-3xl font-bold"
                />
              </div>
              <p className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</p>
              <p className="text-sm font-medium text-slate-500">@{profile.username}</p>
              <p className="mt-4 inline-flex rounded-lg bg-slate-100 px-3 py-1 text-sm font-bold tracking-widest text-slate-900 uppercase dark:bg-slate-800 dark:text-white">
                {profile.tagline || "----"}
              </p>
              <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-slate-100 pt-8 dark:border-slate-800">
                <div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{profile.friendsCount}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Friends</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">Active</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-8">
            <div className="max-w-2xl space-y-8">
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Display name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Tagline</label>
                <input
                  value={tagline}
                  onChange={(event) => handleTaglineChange(event.target.value)}
                  maxLength={4}
                  placeholder="CODE"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-widest outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-blue-400"
                />
                <p className="mt-1.5 text-[11px] text-slate-500">A 4-character uppercase alphanumeric code.</p>
              </div>
              <div>
                <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Bio</label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-blue-400"
                />
              </div>
              <button
                type="button"
                onClick={() => void saveProfile({ name, tagline: tagline || undefined, bio })}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                <UserRoundPen className="h-4 w-4" />
                Update Profile
              </button>
            </div>
          </section>
        </div>

        <section className="border-b border-slate-200 p-8 dark:border-slate-800">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Notifications</h2>
            <p className="mt-1 text-sm text-slate-500">
              Receive push notifications for new messages and friend requests.
            </p>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                {pushEnabled ? (
                  <Bell className="h-5 w-5 text-blue-600" />
                ) : (
                  <BellOff className="h-5 w-5 text-slate-400" />
                )}
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    Push Notifications
                  </p>
                  <p className="text-xs text-slate-500">
                    {pushEnabled ? "Notifications are enabled" : "Notifications are disabled"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pushEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600"
                } ${pushLoading ? "opacity-50" : ""}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 p-8 dark:border-slate-800">
          <div className="max-w-2xl">
            <Link
              to="/me/blocked"
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <div className="flex items-center gap-3">
                <ShieldOff className="h-5 w-5 text-slate-400" />
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Blocked Users</p>
                  <p className="text-xs text-slate-500">Manage your blocked users list</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          </div>
        </section>

        <section className="p-8">
          <div className="max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Account Control</h2>
            <p className="mt-1 text-sm text-slate-500">
              Manage your identity and access. Disabling your account is reversible, but deletion is permanent.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setDisableConfirmOpen(true)}
                className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-700 transition-all hover:bg-amber-100 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-400"
              >
                Disable account
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-900/20"
              >
                Delete account
              </button>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        isOpen={disableConfirmOpen}
        title="Disable Account"
        message="Disable your account now? You will be signed out immediately."
        variant="warning"
        confirmLabel="Disable"
        isLoading={disableLoading}
        onConfirm={() => {
          setDisableLoading(true);
          disableAccount().then((ok) => {
            setDisableLoading(false);
            if (ok) logout();
          });
          setDisableConfirmOpen(false);
        }}
        onCancel={() => setDisableConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Account"
        message="Delete your account permanently? This action cannot be undone."
        variant="danger"
        confirmLabel="Delete"
        isLoading={deleteLoading}
        onConfirm={() => {
          setDeleteLoading(true);
          deleteAccount().then((ok) => {
            setDeleteLoading(false);
            if (ok) logout();
          });
          setDeleteConfirmOpen(false);
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      <AlertDialog
        isOpen={pushBlockedOpen}
        title="Notifications Blocked"
        message="Notifications are blocked. Please enable them in your browser settings."
        onDismiss={() => setPushBlockedOpen(false)}
      />
    </main>
  );
};
