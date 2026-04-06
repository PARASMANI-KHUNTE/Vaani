import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExplorePanel } from "@/components/explore-panel";
import { Toast } from "@/components/toast";
import { NavHeader } from "@/components/nav-header";
import { useChatData } from "@/hooks/use-chat-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSocialData } from "@/hooks/use-social-data";
import { useAuth } from "@/lib/auth-context";

export const ExplorePage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);

  const {
    startChatWithUser,
    error: chatError,
    clearError: clearChatError,
    isSearchingUsers,
  } = useChatData({
    token: session?.backendAccessToken,
    currentUserId: session?.backendUser?._id,
  });

  const {
    directoryUsers,
    error: socialError,
    clearError: clearSocialError,
    isLoadingDirectory,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
    toggleBlock,
  } = useSocialData({
    token: session?.backendAccessToken,
    exploreQuery: debouncedQuery,
  });

  return (
    <main className="flex h-dvh flex-col bg-slate-50 dark:bg-slate-950">
      <NavHeader title="Explore" showNav />
      {chatError || socialError ? (
        <Toast
          message={chatError || socialError || ""}
          onDismiss={() => {
            clearChatError();
            clearSocialError();
          }}
        />
      ) : null}

      <div className="flex-1 overflow-hidden">
        <ExplorePanel
          variant="page"
          isOpen
          query={query}
          users={directoryUsers}
          isLoading={isLoadingDirectory || isSearchingUsers}
          onClose={() => navigate("/")}
          onQueryChange={setQuery}
          onStartChat={async (userId) => {
            await startChatWithUser(userId);
            navigate("/");
          }}
          onSendRequest={(user) => void sendRequest(user)}
          onAcceptRequest={(user) => void acceptRequest(user)}
          onRejectRequest={(user) => void rejectRequest(user)}
          onUnfriend={(user) => void unfriend(user)}
          onToggleBlock={(user) => void toggleBlock(user)}
          onOpenProfile={(user) => {
            const path = user.username
              ? `/profile/${encodeURIComponent(user.username)}`
              : `/profile/user/${encodeURIComponent(user._id)}`;
            navigate(path);
          }}
        />
      </div>
    </main>
  );
};
