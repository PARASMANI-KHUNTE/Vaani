import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function SharedProfilePage({ params }: ProfilePageProps) {
  const session = await getServerSession(authOptions);
  const { username } = await params;

  if (!session?.backendAccessToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="max-w-md rounded-[32px] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-panel backdrop-blur">
          <h1 className="text-3xl font-semibold text-ink">Sign in to view this profile</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">
            Profiles are part of the private chat workspace. Sign in with your account, then revisit this shared link.
          </p>
        </div>
      </main>
    );
  }

  const response = await fetch(
    `${process.env.SERVER_API_URL}/users/profile/${encodeURIComponent(username)}`,
    {
      headers: {
        Authorization: `Bearer ${session.backendAccessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
        <div className="max-w-md rounded-[32px] border border-white/70 bg-white/80 px-8 py-10 text-center shadow-panel backdrop-blur">
          <h1 className="text-3xl font-semibold text-ink">Profile not found</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">
            This shared profile link does not point to an active workspace user.
          </p>
        </div>
      </main>
    );
  }

  const payload = await response.json();
  const profile = payload.data.profile;

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f5f1e8_0%,#f8f5ef_45%,#e7dcc6_100%)] px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-[36px] border border-white/70 bg-white/85 p-8 shadow-panel backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lagoon/70">Shared profile</p>
        <h1 className="mt-3 text-4xl font-semibold text-ink">{profile.name}</h1>
        <p className="mt-1 text-sm text-ink/55">@{profile.username}</p>
        <p className="mt-5 rounded-2xl bg-shell/80 px-4 py-3 text-sm text-ink/75">{profile.tagline}</p>
        <p className="mt-5 text-sm leading-7 text-ink/65">{profile.bio || "No bio shared yet."}</p>
        <div className="mt-6 flex gap-3 text-sm text-ink/60">
          <span>{profile.friendsCount} friends</span>
          <span>{profile.isFriend ? "Already in your friends list" : "Not friends yet"}</span>
        </div>
      </div>
    </main>
  );
}
