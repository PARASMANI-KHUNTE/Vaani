import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldOff, UserMinus, Search } from "lucide-react";
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
      <main className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <main className="flex h-screen items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <ShieldOff className="h-8 w-8 text-slate-400" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">Authentication Required</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">You must be signed in to view blocked users.</p>
          <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
            <ArrowLeft className="h-4 w-4" />
            Go to App
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col bg-white dark:bg-slate-950">
      <NavHeader title="Blocked Users" showBackButton backTo="/me/profile" showNav={false} />

      {error && (
        <div className="mx-6 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/10">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-900 mb-4">
              <ShieldOff className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">No Blocked Users</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xs">
              When you block someone, they'll appear here. You can unblock them anytime.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search blocked users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-blue-400"
                />
              </div>
            </div>

            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-3">
                    <Avatar src={user.avatar} name={user.name} className="h-12 w-12 rounded-xl" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-slate-500">@{user.username || "unknown"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => void handleUnblock(user._id)}
                    disabled={unblockingId === user._id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <UserMinus className="h-4 w-4" />
                    {unblockingId === user._id ? "Unblocking..." : "Unblock"}
                  </button>
                </div>
              ))}
            </div>

            {filteredUsers.length === 0 && searchQuery && (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No blocked users match your search.</p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};
