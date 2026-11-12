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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-8">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand/15 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-accent/10 blur-[110px]" />

      <div className="surface-panel relative w-full max-w-lg rounded-[30px] p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand">Group Invite</p>
        {isLoading ? (
          <div className="mt-4 flex items-center gap-2.5 text-sm text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
            Loading invite...
          </div>
        ) : null}
        {!isLoading && error ? (
          <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
            {error}
          </div>
        ) : null}
        {!isLoading && !error && preview ? (
          <div className="mt-4">
            <div className="flex items-center gap-3.5">
              <Avatar src={preview.groupAvatar} name={preview.groupName} className="h-14 w-14 rounded-2xl shadow-sm" />
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold tracking-tight text-fg">{preview.groupName}</h1>
                <p className="text-sm text-muted">{preview.memberCount} members</p>
              </div>
            </div>
            <p className="mt-3 text-xs font-medium text-faint">
              Expires on {new Date(preview.expiresAt).toLocaleString()}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
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
                className="btn-primary"
                disabled={isJoining}
              >
                {preview.isAlreadyMember ? "Open Group" : isJoining ? "Joining..." : "Join Group"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="btn-secondary"
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
