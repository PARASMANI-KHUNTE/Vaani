"use client";

import { useEffect, useState } from "react";
import { Copy, Share2, UserRoundPen, X } from "lucide-react";
import { UserProfile } from "@/lib/types";

type ProfilePanelProps = {
  isOpen: boolean;
  profile: UserProfile | null;
  isLoading: boolean;
  onClose: () => void;
  onSave: (input: { name?: string; tagline?: string; bio?: string }) => Promise<void>;
};

export const ProfilePanel = ({
  isOpen,
  profile,
  isLoading,
  onClose,
  onSave,
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

  return (
    <div className="fixed inset-0 z-[320] bg-ink/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="surface-elevated absolute right-0 top-0 h-full w-full max-w-lg overflow-y-auto border-l border-ink/8 p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lagoon/60">
              Identity
            </p>
            <h2 className="soft-heading mt-1 text-2xl font-semibold text-ink">Your Profile</h2>
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
          <div className="h-56 animate-pulse rounded-[28px] bg-white/70" />
        ) : (
          <div className="space-y-5">
            <div className="surface-card glass-sheen rounded-[30px] p-5">
              <p className="soft-heading text-3xl font-semibold uppercase tracking-tight text-ink">{profile.name}</p>
              <p className="mt-1 text-sm text-ink/55">@{profile.username}</p>
              <p className="mt-3 inline-flex rounded-full bg-white/85 px-3 py-1 text-sm font-semibold tracking-[0.24em] text-lagoon shadow-soft">
                {profile.tagline || "----"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/profile/${profile.username}`;
                    await navigator.clipboard.writeText(shareUrl);
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-xs font-semibold text-ink"
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

            <div className="surface-card space-y-3 rounded-[30px] p-5">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">
                  Display name
                </label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-ink/10 bg-white/75 px-4 py-3 text-sm outline-none shadow-soft"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">
                  Tagline
                </label>
                <input
                  value={tagline}
                  onChange={(event) => handleTaglineChange(event.target.value)}
                  maxLength={4}
                  placeholder="AB12"
                  className="w-full rounded-2xl border border-ink/10 bg-white/75 px-4 py-3 text-sm uppercase tracking-[0.24em] outline-none shadow-soft"
                />
                <p className="mt-2 text-xs text-ink/55">
                  Use exactly 4 letters, numbers, or a mix of both.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-lagoon/70">
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={5}
                  className="w-full rounded-2xl border border-ink/10 bg-white/75 px-4 py-3 text-sm outline-none shadow-soft"
                />
              </div>
              <button
                type="button"
                onClick={() => void onSave({ name, tagline: tagline || undefined, bio })}
                className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-5 py-3 text-sm font-semibold text-white shadow-soft"
              >
                <UserRoundPen className="h-4 w-4" />
                Save profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
