import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { getGroupInvitePreview, joinGroupViaInvite } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useChatStore } from "@/store/chat-store";

type InvitePreview = {
  chatId: string;
  groupName: string;
  groupAvatar: string | null;
  memberCount: number;
  isAlreadyMember: boolean;
  expiresAt: string;
  maxUses: number;
  useCount: number;
};

export const GroupInvitePage = () => {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const { session } = useAuth();
  const upsertChat = useChatStore((state) => state.upsertChat);
  const selectChat = useChatStore((state) => state.selectChat);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.backendAccessToken || !token) {
      setIsLoading(false);
      return;
    }

    let active = true;
    const loadPreview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getGroupInvitePreview(session.backendAccessToken, token);
        if (active) {
          setPreview(response.invite);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load invite");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [session?.backendAccessToken, token]);

  if (!session?.backendAccessToken) {
    return null;
  }

  return (
    <main className="ambient-grid flex min-h-screen items-center justify-center px-4 py-8">
      <div className="surface-panel w-full max-w-lg rounded-[30px] p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lagoon/70">Group Invite</p>
        {isLoading ? <p className="mt-3 text-sm text-ink/60">Loading invite...</p> : null}
        {!isLoading && error ? (
          <div className="mt-4 rounded-2xl border border-red-300/40 bg-red-50/70 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {!isLoading && !error && preview ? (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <Avatar src={preview.groupAvatar} name={preview.groupName} className="h-14 w-14 rounded-2xl" />
              <div>
                <h1 className="text-xl font-semibold text-ink dark:text-slate-100">{preview.groupName}</h1>
                <p className="text-sm text-ink/60 dark:text-slate-400">{preview.memberCount} members</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink/55 dark:text-slate-400">
              Expires on {new Date(preview.expiresAt).toLocaleString()}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!session?.backendAccessToken || !token) {
                    return;
                  }
                  try {
                    setIsJoining(true);
                    setError(null);
                    const response = await joinGroupViaInvite(session.backendAccessToken, token);
                    if (response.chat) {
                      upsertChat(response.chat);
                      selectChat(response.chat._id);
                    }
                    navigate("/");
                  } catch (joinError) {
                    setError(joinError instanceof Error ? joinError.message : "Unable to join group");
                  } finally {
                    setIsJoining(false);
                  }
                }}
                className="rounded-full bg-[linear-gradient(135deg,#172033,#25304a)] px-4 py-2 text-sm font-semibold text-white"
                disabled={isJoining}
              >
                {preview.isAlreadyMember ? "Open Group" : isJoining ? "Joining..." : "Join Group"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-full border border-ink/15 bg-white/70 px-4 py-2 text-sm font-semibold text-ink/70"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
};
