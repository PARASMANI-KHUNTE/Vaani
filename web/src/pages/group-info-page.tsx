import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Home, Link as LinkIcon, Shield, Users, Crown, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { getChatById } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Chat } from "@/lib/types";
import { formatConversationDate } from "@/lib/utils";

export const GroupInfoPage = () => {
  const { chatId = "" } = useParams();
  const { session, status } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!session?.backendAccessToken) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadChat = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getChatById(session.backendAccessToken, chatId);
        if (active) {
          setChat(response.chat);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load group info");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadChat();

    return () => {
      active = false;
    };
  }, [session?.backendAccessToken, status, chatId]);

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/app?chat=${chatId}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="surface-panel max-w-md rounded-[32px] px-8 py-10 text-center shadow-panel">
          <div className="mb-4 flex justify-center">
            <div className="h-16 w-16 animate-pulse rounded-full bg-shell" />
          </div>
          <p className="text-sm text-ink/60">Loading group info...</p>
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
              <Users className="h-8 w-8 text-lagoon" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-ink">Sign in to view this group</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">Group info is only available to authenticated users.</p>
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

  if (error || !chat) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="max-w-md rounded-[32px] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-panel backdrop-blur">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ember/10">
              <Users className="h-8 w-8 text-ember" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-ink">Group not found</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">{error || "This group doesn't exist or has been removed."}</p>
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

  if (!chat.isGroup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="max-w-md rounded-[32px] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-panel backdrop-blur">
          <h1 className="text-3xl font-semibold text-ink">Not a group chat</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">This page is only for group chats.</p>
          <Link
            to="/app"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#155e75,#1d6a81)] px-6 py-3 text-sm font-semibold text-white shadow-soft transition hover:opacity-90"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Link>
        </div>
      </main>
    );
  }

  const owner = chat.participants.find((p) => p._id === chat.createdBy);
  const admins = chat.participants.filter((p) => chat.adminIds?.includes(p._id) && p._id !== chat.createdBy);
  const members = chat.participants.filter((p) => !chat.adminIds?.includes(p._id) && p._id !== chat.createdBy);

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
            {chat.groupAvatar ? (
              <img
                src={chat.groupAvatar}
                alt={chat.groupName || "Group"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#172033,#25304a)]">
                <Users className="h-10 w-10 text-white/80" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lagoon/70">Group Info</p>
            <h1 className="mt-1 text-3xl font-semibold text-ink">{chat.groupName || "Unnamed Group"}</h1>
            <p className="mt-0.5 text-sm text-ink/55">
              Created {formatConversationDate(chat.createdAt)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={copyInviteLink}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/10 bg-white/80 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-shell dark:border-white/10 dark:bg-slate-700/80 dark:text-slate-200 dark:hover:bg-slate-600/50"
          >
            <LinkIcon className="h-4 w-4" />
            {copied ? "Link copied!" : "Copy invite link"}
            <Copy className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-ink">Owner</h2>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-800/50">
            <div className="flex items-center gap-3">
              <Avatar
                src={owner?.avatar}
                name={owner?.name || "Unknown"}
                className="h-12 w-12 rounded-xl"
                textClassName="text-lg font-semibold"
              />
              <div>
                <p className="font-semibold text-ink dark:text-slate-100">{owner?.name || "Unknown"}</p>
                <p className="text-sm text-ink/55">@{owner?.username || "unknown"}</p>
              </div>
            </div>
          </div>
        </div>

        {admins.length > 0 && (
          <div className="mt-6">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-lagoon" />
              <h2 className="text-lg font-semibold text-ink">Admins ({admins.length})</h2>
            </div>
            <div className="space-y-3">
              {admins.map((admin) => (
                <div
                  key={admin._id}
                  className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-800/50"
                >
                  <Avatar
                    src={admin.avatar}
                    name={admin.name}
                    className="h-12 w-12 rounded-xl"
                    textClassName="text-lg font-semibold"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-ink dark:text-slate-100">{admin.name}</p>
                    <p className="text-sm text-ink/55">@{admin.username || "unknown"}</p>
                  </div>
                  <Shield className="h-5 w-5 text-lagoon/60" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-lagoon/70" />
            <h2 className="text-lg font-semibold text-ink">Members ({members.length})</h2>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-800/50"
              >
                <Avatar
                  src={member.avatar}
                  name={member.name}
                  className="h-12 w-12 rounded-xl"
                  textClassName="text-lg font-semibold"
                />
                <div className="flex-1">
                  <p className="font-semibold text-ink dark:text-slate-100">{member.name}</p>
                  <p className="text-sm text-ink/55">@{member.username || "unknown"}</p>
                </div>
              </div>
            ))}
          </div>
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
