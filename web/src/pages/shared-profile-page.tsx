import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Home, UserRound, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getProfileByUserId, getProfileByUsername } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UserProfile } from "@/lib/types";

export const SharedProfilePage = () => {
  const { username = "", userId = "" } = useParams();
  const { session, status } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.backendAccessToken) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const profileResponse = userId
          ? await getProfileByUserId(session.backendAccessToken, userId)
          : await getProfileByUsername(session.backendAccessToken, username);
        if (active) {
          setProfile(profileResponse.profile);
        }
      } catch (err) {
        if (active) {
          const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
          if (errorMessage.includes("404") || errorMessage.includes("not found") || errorMessage.includes("User not found")) {
            setError("This user doesn't exist or has been removed.");
          } else if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
            setError("You don't have permission to view this profile.");
          } else {
            setError("Unable to load profile. Please try again later.");
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [session?.backendAccessToken, status, username, userId]);

  if (status === "loading" || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="surface-panel max-w-md rounded-[32px] px-8 py-10 text-center shadow-panel">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 animate-pulse rounded-full bg-shell" />
          </div>
          <p className="text-sm text-ink/60">Loading profile...</p>
        </div>
      </main>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="max-w-md rounded-[32px] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-panel backdrop-blur">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-lagoon/10">
              <UserRound className="h-8 w-8 text-lagoon" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-ink">Sign in to view this profile</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">Profiles are private to authenticated workspace users.</p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Go to App
          </Link>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="max-w-md rounded-[32px] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-panel backdrop-blur">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ember/10">
              <UserRound className="h-8 w-8 text-ember" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-ink">Profile not found</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">{error}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              to="/app"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/10 bg-white/80 px-6 py-3 text-sm font-semibold text-ink transition hover:bg-shell"
            >
              <Home className="h-4 w-4" />
              Go to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-[36px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm font-medium text-ink transition hover:bg-shell dark:border-white/10 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600/50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="flex items-start gap-6">
          <div className="relative h-24 w-24 overflow-hidden rounded-3xl border-2 border-white/70 bg-sand/80 shadow-soft">
            <Avatar
              src={profile.avatar}
              name={profile.name}
              className="h-full w-full rounded-3xl"
              textClassName="text-3xl font-semibold"
            />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lagoon/70">Shared profile</p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">{profile.name}</h1>
            <p className="mt-0.5 text-sm text-ink/55">@{profile.username}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="rounded-2xl bg-shell/80 px-4 py-3 text-sm text-ink/75">{profile.tagline || "----"}</p>
        </div>

        <p className="mt-5 text-sm leading-7 text-ink/65">{profile.bio || "No bio shared yet."}</p>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-ink/60">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>{profile.friendsCount || 0} friends</span>
          </div>
          <span className="rounded-full bg-shell/60 px-3 py-1">
            {profile.isFriend ? "Friends" : profile.requestSent ? "Request Sent" : profile.requestReceived ? "Request Received" : "Not friends"}
          </span>
        </div>

        <div className="mt-8">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Open in App
          </Link>
        </div>
      </div>
    </main>
  );
};
