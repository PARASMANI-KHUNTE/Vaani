import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, MessageSquare, UserRound, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getProfileByUserId, getProfileByUsername } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UserProfile } from "@/lib/types";

export const SharedProfilePage = () => {
  const navigate = useNavigate();
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
          } else if (errorMessage.includes("403") || errorMessage.includes("disabled") || errorMessage.includes("deleted")) {
            setError("Your account may have an issue. Please log out and log in again.");
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
      <main className="flex min-h-dvh w-full items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Loading Profile</p>
        </div>
      </main>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <UserRound className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Authentication Required</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">You must be signed in to view workspace profiles.</p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
      <main className="flex min-h-dvh w-full items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30">
            <UserRound className="h-8 w-8 text-rose-500" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Profile Unavailable</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">{error || "This profile could not be loaded."}</p>
          <div className="mt-8 flex flex-col gap-3 w-full">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Link>
          </div>
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
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">User Profile</h1>
          </div>
          <Link to="/" className="rounded-lg px-4 py-2 text-sm font-bold text-slate-900 border border-slate-200 transition-all hover:bg-slate-50 dark:text-white dark:border-slate-800 dark:hover:bg-slate-800">Open App</Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
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
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{profile.friendsCount || 0}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Friends</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {profile.isFriend ? "Friends" : profile.requestSent ? "Sent" : profile.requestReceived ? "Received" : "Not Friends"}
                  </p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Relationship</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-8">
            <div className="max-w-2xl">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Biography</label>
              <p className="text-lg font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                {profile.bio || "This user hasn't shared a bio yet."}
              </p>
              
              <div className="mt-12 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-6 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Need to talk?</h4>
                  <p className="mt-1 text-xs text-slate-500">Start a conversation with {profile.name.split(' ')[0]} to collaborate in realtime.</p>
                  <button
                    onClick={() => navigate("/explore")}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Send Message
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};
