import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldOff, UserMinus, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NavHeader } from "@/components/nav-header";
import { getBlockedUsers, unblockUser } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { BackendUser } from "@/lib/types";

export const BlockedUsersPage = () => {
  const { session, status } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BackendUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading" || !session?.backendAccessToken) {
      setIsLoading(false);
      return;
    }

    let active = true;

    const loadBlockedUsers = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getBlockedUsers(session.backendAccessToken);
        if (active) {
          setBlockedUsers(response.blockedUsers);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : "Failed to load blocked users");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadBlockedUsers();

    return () => {
      active = false;
    };
  }, [session?.backendAccessToken, status]);

  const handleUnblock = async (userId: string) => {
    if (!session?.backendAccessToken) return;

    try {
      setUnblockingId(userId);
      await unblockUser(session.backendAccessToken, userId);
      setBlockedUsers(prev => prev.filter(u => u._id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unblock user");
    } finally {
      setUnblockingId(null);
    }
  };

  const filteredUsers = blockedUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === "loading" || isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-brand/20 border-t-brand" />
          <p className="text-[11px] font-bold uppercase leading-none tracking-[0.24em] text-faint">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-4">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-line bg-surface text-faint">
            <ShieldOff className="h-8 w-8" />
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Authentication Required</h1>
          <p className="mt-2 text-sm font-medium text-muted">You must be signed in to view blocked users.</p>
          <Link to="/" className="btn-primary mt-8">
            <ArrowLeft className="h-4 w-4" />
            Go to App
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <NavHeader title="Blocked Users" showBackButton backTo="/me/profile" showNav={false} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          {error && (
            <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3 text-sm font-medium text-rose-600 dark:text-rose-300">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-rose-500/10"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {blockedUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-surface/60 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-subtle text-faint">
                <ShieldOff className="h-8 w-8" />
              </div>
              <h2 className="text-lg font-bold tracking-tight text-fg">No Blocked Users</h2>
              <p className="mt-2 max-w-xs text-sm text-muted">
                When you block someone, they'll appear here. You can unblock them anytime.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <div className="group relative">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition-colors group-focus-within:text-brand" />
                  <input
                    type="text"
                    placeholder="Search blocked users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-subtle/60 py-3 pl-11 pr-4 text-sm font-medium text-fg outline-none transition-all placeholder:text-faint focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/12"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brand/20 hover:bg-subtle/30"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar src={user.avatar} name={user.name} className="h-12 w-12 rounded-xl" />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-fg">{user.name}</p>
                        <p className="truncate text-sm text-muted">@{user.username || "unknown"}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => void handleUnblock(user._id)}
                      disabled={unblockingId === user._id}
                      className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-semibold text-muted transition-all hover:border-brand/30 hover:bg-brand/5 hover:text-brand disabled:opacity-50"
                    >
                      <UserMinus className="h-4 w-4" />
                      {unblockingId === user._id ? "Unblocking..." : "Unblock"}
                    </button>
                  </div>
                ))}
              </div>

              {filteredUsers.length === 0 && searchQuery && (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted">No blocked users match your search.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
};
