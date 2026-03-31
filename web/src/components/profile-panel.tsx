"use client";

import { useEffect, useState } from "react";
import { Copy, Phone, PhoneCall, Share2, UserRoundPen, Video, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { CallHistoryItem, UserProfile } from "@/lib/types";
import { formatConversationDate, formatMessageTime } from "@/lib/utils";

type ProfilePanelProps = {
  isOpen: boolean;
  profile: UserProfile | null;
  callHistory?: CallHistoryItem[];
  isLoading: boolean;
  onClose: () => void;
  onSave: (input: { name?: string; tagline?: string; bio?: string }) => Promise<void>;
  onDisableAccount?: () => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
};

export const ProfilePanel = ({
  isOpen,
  profile,
  callHistory = [],
  isLoading,
  onClose,
  onSave,
  onDisableAccount,
  onDeleteAccount,
}: ProfilePanelProps) => {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");

  const handleTaglineChange = (value: string) => {
    const nextTagline = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    setTagline(nextTagline);
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    setName(profile.name);
    setTagline(profile.tagline || "");
    setBio(profile.bio || "");
  }, [profile]);

  if (!isOpen) {
    return null;
  }

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

  return (
    <div className="fixed inset-0 z-[320] bg-ink/20 dark:bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 sm:hidden" role="presentation">
      <div className="surface-elevated absolute right-0 top-0 h-full w-full max-w-[100vw] overflow-y-auto border-l border-ink/8 dark:border-white/10 p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] sm:max-w-lg sm:p-6 sm:border-l-0">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lagoon/60 dark:text-lagoon/50">
              Identity
            </p>
            <h2 className="soft-heading mt-1 text-2xl font-semibold text-ink dark:text-slate-100">Your Profile</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary !py-2.5 !px-2.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isLoading || !profile ? (
          <div className="h-56 animate-pulse rounded-[28px] bg-white/70 dark:bg-slate-800/50" />
        ) : (
          <div className="space-y-5">
            <div className="surface-card glass-sheen rounded-[26px] p-4 sm:rounded-[30px] sm:p-5">
              <div className="mb-4 flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/70 bg-sand/80 shadow-soft">
                  <Avatar
                    src={profile.avatar}
                    name={profile.name}
                    className="h-full w-full rounded-2xl"
                    textClassName="text-xl font-semibold"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70 dark:text-lagoon/60">
                    Profile Photo
                  </p>
                  <p className="mt-1 text-xs text-ink/50 dark:text-slate-400">
                    Synced from your Google account
                  </p>
                </div>
              </div>
              <p className="soft-heading text-2xl font-semibold uppercase tracking-tight text-ink dark:text-slate-100 sm:text-3xl">{profile.name}</p>
              <p className="mt-1 text-sm text-ink/55 dark:text-slate-400">@{profile.username}</p>
              <p className="mt-3 inline-flex rounded-full bg-white/85 dark:bg-slate-700/85 px-3 py-1 text-sm font-semibold tracking-[0.24em] text-lagoon shadow-soft">
                {profile.tagline || "----"}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/profile/${profile.username}`;
                    await navigator.clipboard.writeText(shareUrl);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/10 dark:border-white/10 bg-white/80 dark:bg-slate-700/80 px-4 py-2 text-xs font-semibold text-ink dark:text-slate-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy profile link
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/profile/${profile.username}`;
                    if (navigator.share) {
                      await navigator.share({
                        title: `${profile.name}'s profile`,
                        text: profile.tagline,
                        url: shareUrl,
                      });
                    } else {
                      await navigator.clipboard.writeText(shareUrl);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#172033,#25304a)] px-4 py-2 text-xs font-semibold text-white shadow-soft"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share profile
                </button>
              </div>
            </div>

            <div className="surface-card space-y-3 rounded-[26px] p-4 sm:rounded-[30px] sm:p-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70 dark:text-lagoon/60">
                  Display name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-ink/10 dark:border-white/10 bg-white/75 dark:bg-slate-800/60 dark:text-slate-100 px-4 py-3 text-sm outline-none shadow-soft"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70 dark:text-lagoon/60">
                  Tagline
                </label>
                <input
                  value={tagline}
                  onChange={(event) => handleTaglineChange(event.target.value)}
                  maxLength={4}
                  placeholder="AB12"
                  className="w-full rounded-2xl border border-ink/10 dark:border-white/10 bg-white/75 dark:bg-slate-800/60 dark:text-slate-100 px-4 py-3 text-sm uppercase tracking-[0.24em] outline-none shadow-soft"
                />
                <p className="mt-2 text-xs text-ink/55 dark:text-slate-400">
                  Use exactly 4 letters, numbers, or a mix of both.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70 dark:text-lagoon/60">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-ink/10 dark:border-white/10 bg-white/75 dark:bg-slate-800/60 dark:text-slate-100 px-4 py-3 text-sm outline-none shadow-soft"
                />
              </div>
              <button
                type="button"
                onClick={() => void onSave({ name, tagline: tagline || undefined, bio })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-5 py-3 text-sm font-semibold text-white shadow-soft sm:w-auto"
              >
                <UserRoundPen className="h-4 w-4" />
                Save profile
              </button>
            </div>

            <div className="surface-card space-y-3 rounded-[26px] border border-amber-200/80 p-4 sm:rounded-[30px] sm:p-5 dark:border-amber-800/40">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                Account Control
              </p>
              <p className="text-sm text-ink/60 dark:text-slate-300">
                Disable account signs you out and blocks future access until an admin reactivates it. Delete account permanently removes your account data.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    if (!onDisableAccount) {
                      return;
                    }
                    if (window.confirm("Disable your account now? You will be signed out immediately.")) {
                      void onDisableAccount();
                    }
                  }}
                  className="inline-flex w-full items-center justify-center rounded-full border border-amber-300 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/25 dark:text-amber-300 dark:hover:bg-amber-900/35 sm:w-auto"
                >
                  Disable account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!onDeleteAccount) {
                      return;
                    }
                    if (window.confirm("Delete your account permanently? This action cannot be undone.")) {
                      void onDeleteAccount();
                    }
                  }}
                  className="inline-flex w-full items-center justify-center rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 sm:w-auto"
                >
                  Delete account
                </button>
              </div>
            </div>

            <div className="surface-card rounded-[26px] p-4 sm:rounded-[30px] sm:p-5">
              <div className="mb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70 dark:text-lagoon/60">
                  Communication
                </p>
                <h3 className="soft-heading mt-1 text-xl font-semibold text-ink dark:text-slate-100">Recent call history</h3>
              </div>

              {callHistory.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-ink/10 dark:border-white/10 bg-white/70 dark:bg-slate-800/40 px-4 py-6 text-sm text-ink/50 dark:text-slate-400">
                  Your audio and video calls will appear here once you start connecting.
                </div>
              ) : (
                <div className="space-y-3">
                  {callHistory.map((entry) => (
                    <div
                      key={entry._id}
                      className="flex items-start gap-3 rounded-[22px] border border-ink/8 dark:border-white/10 bg-white/75 dark:bg-slate-800/50 px-4 py-3 shadow-soft"
                    >
                      <div
                        className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                          entry.callType === "video"
                            ? "bg-lagoon/12 text-lagoon"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                        }`}
                      >
                        {entry.callType === "video" ? (
                          <Video className="h-5 w-5" />
                        ) : (
                          <Phone className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink dark:text-slate-100">
                              {entry.otherUser?.name || "Unknown user"}
                            </p>
                            <p className="mt-0.5 text-xs text-ink/50 dark:text-slate-400">
                              {entry.direction === "incoming" ? "Incoming" : "Outgoing"} {entry.callType} call
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-ink/40 dark:text-slate-500">
                            {formatConversationDate(entry.startedAt)}
                          </span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 rounded-full bg-shell/80 dark:bg-slate-700/60 px-2.5 py-1 font-medium text-ink/65 dark:text-slate-300">
                            <PhoneCall className="h-3 w-3" />
                            {getCallLabel(entry)}
                          </span>
                          <span className="rounded-full bg-white/85 dark:bg-slate-700/85 px-2.5 py-1 font-medium text-ink/55 dark:text-slate-400">
                            {formatDuration(entry.durationSeconds)}
                          </span>
                          <span className="rounded-full bg-white/85 dark:bg-slate-700/85 px-2.5 py-1 font-medium text-ink/45 dark:text-slate-500">
                            {formatMessageTime(entry.startedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

