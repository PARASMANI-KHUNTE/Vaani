import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Phone, PhoneCall, UserRoundPen, Video } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useSocialData } from "@/hooks/use-social-data";
import { Avatar } from "@/components/ui/avatar";
import { formatConversationDate, formatMessageTime } from "@/lib/utils";
import { CallHistoryItem } from "@/lib/types";

const getCallLabel = (entry: CallHistoryItem) => {
  if (entry.status === "missed") {
    return entry.direction === "incoming" ? "Missed call" : "No answer";
  }
  if (entry.status === "rejected") {
    return entry.direction === "incoming" ? "Declined" : "Rejected";
  }
  if (entry.status === "failed") {
    return "Connection issue";
  }
  if (entry.status === "completed") {
    return "Completed";
  }
  return "Ended";
};

const formatDuration = (durationSeconds: number) => {
  if (!durationSeconds) {
    return "0m";
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  if (!minutes) {
    return `${seconds}s`;
  }
  if (!seconds) {
    return `${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
};

export const MyProfilePage = () => {
  const { session, status, logout } = useAuth();
  const token = session?.backendAccessToken;
  const {
    profile,
    callHistory,
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
      <main className="ambient-grid flex min-h-screen items-center justify-center p-6">
        <div className="surface-panel rounded-[30px] px-8 py-10">Loading profile...</div>
      </main>
    );
  }

  if (!token || !profile) {
    return (
      <main className="ambient-grid flex min-h-screen items-center justify-center p-6">
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
    <main className="ambient-grid min-h-screen p-3 sm:p-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="surface-elevated flex items-center justify-between rounded-[26px] p-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lagoon/60">Identity</p>
            <h1 className="soft-heading mt-1 text-2xl font-semibold text-ink">Your Profile</h1>
          </div>
          <Link to="/" className="btn-secondary inline-flex items-center gap-2 !px-3 !py-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}{" "}
            <button type="button" className="font-semibold underline" onClick={clearError}>
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="surface-elevated rounded-[30px] p-5">
            <div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-white/70 bg-sand/80 shadow-soft">
              <Avatar
                src={profile.avatar}
                name={profile.name}
                className="h-full w-full rounded-2xl"
                textClassName="text-2xl font-semibold"
              />
            </div>
            <p className="mt-4 text-2xl font-semibold text-ink">{profile.name}</p>
            <p className="text-sm text-ink/55">@{profile.username}</p>
            <p className="mt-3 inline-flex rounded-full bg-white/85 px-3 py-1 text-sm font-semibold tracking-[0.24em] text-lagoon shadow-soft">
              {profile.tagline || "----"}
            </p>
            <div className="mt-4 text-sm text-ink/65">
              <p>{profile.friendsCount} friends</p>
            </div>
          </section>

          <section className="surface-elevated rounded-[30px] p-5">
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Display name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-ink/10 bg-white/75 px-4 py-3 text-sm outline-none shadow-soft"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Tagline</label>
                <input
                  value={tagline}
                  onChange={(event) => handleTaglineChange(event.target.value)}
                  maxLength={4}
                  placeholder="AB12"
                  className="w-full rounded-2xl border border-ink/10 bg-white/75 px-4 py-3 text-sm uppercase tracking-[0.24em] outline-none shadow-soft"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Bio</label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-ink/10 bg-white/75 px-4 py-3 text-sm outline-none shadow-soft"
                />
              </div>
              <button
                type="button"
                onClick={() => void saveProfile({ name, tagline: tagline || undefined, bio })}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-5 py-3 text-sm font-semibold text-white shadow-soft"
              >
                <UserRoundPen className="h-4 w-4" />
                Save profile
              </button>
            </div>
          </section>
        </div>

        <section className="surface-elevated rounded-[30px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">Communication</p>
          <h2 className="soft-heading mt-1 text-xl font-semibold text-ink">Recent call history</h2>
          <div className="mt-4 space-y-3">
            {callHistory.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/10 bg-white/70 px-4 py-6 text-sm text-ink/50">
                Your audio and video calls will appear here once you start connecting.
              </div>
            ) : (
              callHistory.map((entry) => (
                <div key={entry._id} className="flex items-start gap-3 rounded-[22px] border border-ink/8 bg-white/75 px-4 py-3 shadow-soft">
                  <div
                    className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      entry.callType === "video" ? "bg-lagoon/12 text-lagoon" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {entry.callType === "video" ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{entry.otherUser?.name || "Unknown user"}</p>
                        <p className="mt-0.5 text-xs text-ink/50">
                          {entry.direction === "incoming" ? "Incoming" : "Outgoing"} {entry.callType} call
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-ink/40">{formatConversationDate(entry.startedAt)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-shell/80 px-2.5 py-1 font-medium text-ink/65">
                        <PhoneCall className="h-3 w-3" />
                        {getCallLabel(entry)}
                      </span>
                      <span className="rounded-full bg-white/85 px-2.5 py-1 font-medium text-ink/55">{formatDuration(entry.durationSeconds)}</span>
                      <span className="rounded-full bg-white/85 px-2.5 py-1 font-medium text-ink/45">{formatMessageTime(entry.startedAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="surface-elevated rounded-[30px] border border-amber-200/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Account Control</p>
          <p className="mt-2 text-sm text-ink/60">
            Disable account signs you out and blocks future access until reactivation. Delete account permanently removes your account data.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Disable your account now? You will be signed out immediately.")) {
                  void disableAccount().then((ok) => {
                    if (ok) {
                      logout();
                    }
                  });
                }
              }}
              className="inline-flex items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-200"
            >
              Disable account
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Delete your account permanently? This action cannot be undone.")) {
                  void deleteAccount().then((ok) => {
                    if (ok) {
                      logout();
                    }
                  });
                }
              }}
              className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Delete account
            </button>
          </div>
        </section>
      </div>
    </main>
  );
};
