import { useEffect, useState } from "react";
import { Camera, Check, Pencil, Loader2, ShieldOff, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useSocialData } from "@/hooks/use-social-data";
import { Avatar } from "@/components/ui/avatar";
import { NavHeader } from "@/components/nav-header";
import { cn } from "@/lib/utils";

export const MyProfilePage = () => {
  const { session, status } = useAuth();
  const token = session?.backendAccessToken;
  const {
    profile,
    error,
    isLoadingProfile,
    saveProfile,
    clearError,
  } = useSocialData({ token });
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.name);
    setTagline(profile.tagline || "");
    setBio(profile.bio || "");
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!token || !name.trim()) return;
    setIsSaving(true);
    try {
      await saveProfile({ name, tagline: tagline || undefined, bio });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setName(profile.name);
      setTagline(profile.tagline || "");
      setBio(profile.bio || "");
    }
    setIsEditing(false);
  };

  const handleTaglineChange = (value: string) => {
    setTagline(value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4));
  };

  if (status === "loading" || isLoadingProfile) {
    return (
      <main className="flex min-h-dvh w-full flex-col bg-canvas">
        <NavHeader title="Profile" showBackButton backTo="/" showNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-sm font-medium text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
            Loading profile...
          </div>
        </div>
      </main>
    );
  }

  if (!token || !profile) {
    return (
      <main className="flex min-h-dvh w-full flex-col bg-canvas">
        <NavHeader title="Profile" showBackButton backTo="/" showNav />
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="surface-panel max-w-sm rounded-3xl p-8 text-center">
            <h1 className="text-xl font-bold tracking-tight text-fg">Sign in to view your profile</h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-canvas">
      <NavHeader title="Profile" showBackButton backTo="/" showNav />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-lg">
          {error && (
            <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
              <span>{error}</span>
              <button onClick={clearError} className="shrink-0 font-semibold underline underline-offset-2">
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-6">
            {/* Profile Preview Card */}
            {!isEditing && (
              <div className="surface-panel overflow-hidden rounded-[28px]">
                <div className="relative h-28 bg-brand-gradient">
                  <div className="absolute inset-0 bg-paper-grid opacity-40" />
                  <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl" />
                </div>

                <div className="px-6 pb-8">
                  <div className="-mt-14 flex flex-col items-center text-center">
                    <div className="group relative">
                      <div className="h-28 w-28 overflow-hidden rounded-[26px] shadow-float ring-4 ring-surface">
                        <Avatar
                          src={profile.avatar}
                          name={profile.name}
                          className="h-full w-full"
                          textClassName="text-3xl font-bold"
                        />
                      </div>
                      <div className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-[26px] bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                        <Camera className="h-8 w-8 text-white" />
                      </div>
                    </div>

                    <h2 className="mt-5 text-2xl font-bold tracking-tight text-fg">{profile.name}</h2>
                    <p className="text-sm font-medium text-muted">@{profile.username}</p>

                    {profile.tagline && (
                      <span className="mt-3 inline-flex rounded-xl bg-brand/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.2em] text-brand ring-1 ring-inset ring-brand/15">
                        {profile.tagline}
                      </span>
                    )}

                    {profile.bio && (
                      <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
                        {profile.bio}
                      </p>
                    )}

                    <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-line pt-6">
                      <div>
                        <p className="text-2xl font-bold tabular-nums text-fg">{profile.friendsCount}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-faint">Friends</p>
                      </div>
                      <div>
                        <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Active
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-faint">Status</p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-primary mt-7 w-full sm:w-auto"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Profile
                    </button>

                    <Link
                      to="/settings/blocked"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-faint transition-colors hover:text-brand"
                    >
                      <ShieldOff className="h-3.5 w-3.5" />
                      Manage blocked users
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditing && (
              <div className="surface-panel rounded-[28px] p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <h3 className="text-lg font-bold tracking-tight text-fg">Edit Profile</h3>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-faint">
                      Display Name
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input"
                      placeholder="Enter your name"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-faint">
                      Tagline
                    </label>
                    <input
                      value={tagline}
                      onChange={(e) => handleTaglineChange(e.target.value)}
                      maxLength={4}
                      placeholder="CODE"
                      className="input font-bold uppercase tracking-widest"
                    />
                    <p className="mt-1.5 text-xs text-faint">A 4-character uppercase alphanumeric code</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-faint">
                      Bio
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      className="input resize-none"
                      placeholder="Tell others about yourself..."
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleCancelEdit}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving || !name.trim()}
                    className={cn(
                      "btn flex-1",
                      isSaving || !name.trim() ? "cursor-not-allowed bg-subtle text-faint" : "btn-primary"
                    )}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <Check className="h-4 w-4" />
                        Saved!
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
