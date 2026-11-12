import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Home, MessageSquare, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NavHeader } from "@/components/nav-header";
import { getProfileByUserId, getProfileByUsername } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useChatData } from "@/hooks/use-chat-data";
import { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

export const SharedProfilePage = () => {
  const navigate = useNavigate();
  const { username = "", userId = "" } = useParams();
  const { session, status } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startChatWithUser } = useChatData({
    token: session?.backendAccessToken,
    currentUserId: session?.backendUser?._id,
  });

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
      <main className="flex min-h-dvh w-full items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand" />
          <p className="text-[11px] font-bold uppercase leading-none tracking-[0.24em] text-faint">Loading Profile</p>
        </div>
      </main>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-canvas px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-faint">
            <UserRound className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Authentication Required</h1>
          <p className="mt-2 text-sm font-medium text-muted">You must be signed in to view workspace profiles.</p>
          <Link to="/" className="btn-primary mt-8">
            <Home className="h-4 w-4" />
            Go to App
          </Link>
        </div>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-canvas px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] text-rose-500">
            <UserRound className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Profile Unavailable</h1>
          <p className="mt-2 text-sm font-medium text-muted">{error || "This profile could not be loaded."}</p>
          <div className="mt-8 flex w-full flex-col gap-3">
            <Link to="/" className="btn-secondary">
              <ArrowLeft className="h-4 w-4" />
              Back to App
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh w-full flex-col bg-canvas">
      <NavHeader
        title="User Profile"
        showBackButton
        backTo="/"
        showNav={false}
        rightContent={
          <button
            onClick={() => navigate("/")}
            className="btn-secondary !px-4 !py-2 !text-xs"
          >
            Open App
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="grid border-b border-line lg:grid-cols-[400px_1fr]">
          <section className="border-b border-line p-8 lg:border-b-0 lg:border-r">
            <div className="flex flex-col items-center text-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-[26px] bg-subtle shadow-float ring-4 ring-surface">
                <Avatar
                  src={profile.avatar}
                  name={profile.name}
                  className="h-full w-full rounded-[22px]"
                  textClassName="text-3xl font-bold"
                />
              </div>
              <p className="mt-6 text-2xl font-bold tracking-tight text-fg">{profile.name}</p>
              <p className="text-sm font-medium text-muted">@{profile.username}</p>
              <p className="mt-4 inline-flex rounded-xl bg-brand/10 px-3 py-1 text-sm font-bold uppercase tracking-[0.2em] text-brand ring-1 ring-inset ring-brand/15">
                {profile.tagline || "----"}
              </p>
              <div className="mt-8 grid w-full grid-cols-2 gap-4 border-t border-line pt-8">
                <div>
                  <p className="text-xl font-bold tabular-nums text-fg">{profile.friendsCount || 0}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-faint">Friends</p>
                </div>
                <div>
                  <p className={cn(
                    "text-sm font-bold",
                    profile.isFriend ? "text-emerald-600 dark:text-emerald-400" : "text-brand"
                  )}>
                    {profile.isFriend ? "Friends" : profile.requestSent ? "Sent" : profile.requestReceived ? "Received" : "Not Friends"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-faint">Relationship</p>
                </div>
              </div>
            </div>
          </section>

          <section className="p-8">
            <div className="max-w-2xl">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-faint">Biography</label>
              <p className="text-lg font-medium leading-relaxed text-fg/85">
                {profile.bio || "This user hasn't shared a bio yet."}
              </p>

              <div className="mt-12 space-y-4">
                <div className="rounded-2xl border border-line bg-subtle/40 p-6">
                  <h4 className="text-sm font-bold text-fg">Need to talk?</h4>
                  <p className="mt-1 text-xs text-muted">
                    Start a conversation with {profile.name.split(" ")[0]} to collaborate in realtime.
                  </p>
                  <button
                    onClick={async () => {
                      if (!profile._id || isStartingChat) return;
                      setIsStartingChat(true);
                      try {
                        await startChatWithUser(profile._id);
                        navigate("/");
                      } catch {
                        setError("Failed to start chat. Please try again.");
                      } finally {
                        setIsStartingChat(false);
                      }
                    }}
                    disabled={isStartingChat}
                    className="btn-primary mt-4"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {isStartingChat ? "Opening..." : "Send Message"}
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
