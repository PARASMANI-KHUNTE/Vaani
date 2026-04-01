import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ExplorePanel } from "@/components/explore-panel";
import { Toast } from "@/components/toast";
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
    unfriend,
    toggleBlock,
  } = useSocialData({
    token: session?.backendAccessToken,
    exploreQuery: debouncedQuery,
  });

  return (
    <main className="h-dvh overflow-hidden">
      {chatError || socialError ? (
        <Toast
          message={chatError || socialError || ""}
          onDismiss={() => {
            clearChatError();
            clearSocialError();
          }}
        />
      ) : null}

      <div className="h-full w-full">
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
