import { useEffect, useState } from "react";
import { Camera, Check, Pencil, Loader2 } from "lucide-react";
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
      <main className="flex min-h-dvh w-full flex-col bg-slate-50 dark:bg-slate-950">
        <NavHeader title="Profile" showBackButton backTo="/" showNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading profile...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!token || !profile) {
    return (
      <main className="flex min-h-dvh w-full flex-col bg-slate-50 dark:bg-slate-950">
        <NavHeader title="Profile" showBackButton backTo="/" showNav />
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm dark:bg-slate-900">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Sign in to view your profile</h1>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-slate-50 dark:bg-slate-950">
      <NavHeader title="Profile" showBackButton backTo="/" showNav />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-lg">
          {error && (
            <div className="mb-6 flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
              <span>{error}</span>
              <button onClick={clearError} className="font-medium underline">Dismiss</button>
            </div>
          )}

          <div className="space-y-6">
            {/* Profile Preview Card */}
            {!isEditing && (
              <div className="card text-center">
                <div className="flex flex-col items-center">
                  {/* Avatar */}
                  <div className="relative group">
                    <div className="h-28 w-28 overflow-hidden rounded-2xl shadow-lg ring-4 ring-slate-100 dark:ring-slate-800">
                      <Avatar
                        src={profile.avatar}
                        name={profile.name}
                        className="h-full w-full"
                        textClassName="text-3xl font-bold"
                      />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                  </div>

                  {/* Name & Username */}
                  <h2 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">{profile.name}</h2>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">@{profile.username}</p>

                  {/* Tagline */}
                  {profile.tagline && (
                    <span className="mt-3 inline-flex rounded-lg bg-slate-100 px-4 py-1.5 text-sm font-bold uppercase tracking-widest text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {profile.tagline}
                    </span>
                  )}

                  {/* Bio */}
                  {profile.bio && (
                    <p className="mt-4 max-w-xs text-sm text-slate-600 dark:text-slate-400">
                      {profile.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="mt-8 flex justify-center gap-16 border-t border-slate-100 pt-6 dark:border-slate-800">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{profile.friendsCount}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Friends</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-600">Active</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
                    </div>
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 active:scale-95"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </button>
                </div>
              </div>
            )}

            {/* Edit Form */}
            {isEditing && (
              <div className="card">
                <h3 className="mb-6 text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h3>

                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Tagline
                    </label>
                    <input
                      value={tagline}
                      onChange={(e) => handleTaglineChange(e.target.value)}
                      maxLength={4}
                      placeholder="CODE"
                      className="input font-bold uppercase tracking-widest"
                    />
                    <p className="mt-1.5 text-xs text-slate-400">A 4-character uppercase alphanumeric code</p>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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
                    className="btn btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving || !name.trim()}
                    className={cn(
                      "btn flex-1",
                      isSaving || !name.trim() ? "bg-slate-400 cursor-not-allowed" : "btn-primary"
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
