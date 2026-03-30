"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Compass, LogOut, Sparkles, UserRound } from "lucide-react";
import { ChatWindow } from "@/components/ChatWindow/ChatWindow";
import { CallScreen } from "@/components/Call/CallScreen";
import { IncomingCallModal } from "@/components/Call/IncomingCallModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ExplorePanel } from "@/components/explore-panel";
import { NotificationPanel } from "@/components/notification-panel";
import { NotificationToastStack } from "@/components/notification-toast-stack";
import { ProfilePanel } from "@/components/profile-panel";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { Toast } from "@/components/toast";
import { useCall } from "@/hooks/use-call";
import { useChatData } from "@/hooks/use-chat-data";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSocialData } from "@/hooks/use-social-data";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";

export const ChatShell = () => {
  const { data: session, status } = useSession();
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const selectChat = useChatStore((state) => state.selectChat);
  const notifications = useChatStore((state) => state.notifications);
  const typingByChat = useChatStore((state) => state.typingByChat);
  const onlineUserIds = useChatStore((state) => state.onlineUserIds);
  const markNotificationRead = useChatStore((state) => state.markNotificationRead);
  const markNotificationsRead = useChatStore((state) => state.markNotificationsRead);
  const [searchTerm, setSearchTerm] = useState("");
  const [exploreQuery, setExploreQuery] = useState("");
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(searchTerm, 250);
  const debouncedExploreQuery = useDebouncedValue(exploreQuery, 250);
  const {
    activeCall,
    incomingCall,
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isVideoOn,
    error: callError,
    startCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endActiveCall,
    toggleMute,
    toggleVideo,
    clearCallError,
  } = useCall({
    token: session?.backendAccessToken,
    currentUserId: session?.backendUser?._id,
  });
  const {
    chats,
    messages,
    isLoadingChats,
    isLoadingMessages,
    isSearchingUsers,
    error,
    mediaTransfer,
    clearError,
    dismissMediaTransfer,
    cancelMediaUpload,
    startChatWithUser,
    sendChatMessage,
    sendMediaMessage,
    retryLastMediaUpload,
    notifyTyping,
    deleteChatMessage,
    clearSelectedChatMessages,
    deleteSelectedChat,
    markSelectedChatRead,
    markSelectedChatUnread,
  } = useChatData({
    token: session?.backendAccessToken,
    currentUserId: session?.backendUser?._id,
  });
  const {
    directoryUsers,
    callHistory,
    error: socialError,
    clearError: clearSocialError,
    acceptRequestByUserId,
    isLoadingDirectory,
    isLoadingProfile,
    profile,
    rejectRequestByUserId,
    saveProfile,
    sendRequest,
    toggleBlock,
    unfriend,
  } = useSocialData({
    token: session?.backendAccessToken,
    exploreQuery: debouncedExploreQuery,
  });

  const filteredChats = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    if (!query) {
      return chats;
    }

    return chats.filter((chat) =>
      chat.otherParticipant?.name.toLowerCase().includes(query)
    );
  }, [chats, debouncedSearch]);

  const activeChat = chats.find((chat) => chat._id === selectedChatId) || null;
  const activeTyping = selectedChatId ? typingByChat[selectedChatId] : null;
  const isActiveUserOnline = activeChat
    ? onlineUserIds.includes(activeChat.otherParticipant?._id || "")
    : false;

  useEffect(() => {
    if (isExploreOpen || isProfileOpen) {
      setIsNotificationPanelOpen(false);
    }
  }, [isExploreOpen, isProfileOpen]);

  if (status === "loading") {
    return (
      <div className="surface-panel rounded-[36px] p-8 md:p-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-3 w-20 animate-pulse rounded-full bg-shell" />
              <div className="h-8 w-56 animate-pulse rounded-2xl bg-shell" />
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-28 animate-pulse rounded-2xl bg-shell" />
              <div className="h-11 w-28 animate-pulse rounded-2xl bg-shell" />
            </div>
          </div>
          <div className="grid min-h-[65vh] grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-22 animate-pulse rounded-[28px] bg-shell" />
              ))}
            </div>
            <div className="hidden rounded-[36px] bg-shell/40 xl:block" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <section className="surface-panel relative overflow-hidden rounded-[40px] px-8 py-14 md:px-12 md:py-16">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,94,117,0.1),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.12),transparent_35%)]" />
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-lagoon/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-ember/5 to-transparent rounded-full blur-3xl" />
        
        <div className="relative mx-auto max-w-2xl text-center">
          <div className="animate-fade-down">
            <p className="inline-flex items-center gap-2 rounded-full border border-lagoon/20 bg-lagoon/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-lagoon">
              <Sparkles className="h-4 w-4" />
              Welcome
            </p>
          </div>
          
          <h1 className="soft-heading mt-8 text-4xl font-semibold tracking-tight text-ink md:text-5xl lg:text-6xl">
            <span className="text-gradient">Canvas</span> Chat
          </h1>
          
          <p className="mx-auto mt-6 max-w-lg text-base leading-8 text-ink/65 md:text-lg">
            A warmer, calmer space for real-time conversation. 
            Connect with your team in a workspace that feels polished, 
            focused, and ready for collaboration.
          </p>
          
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void signIn("google")}
              className="btn-primary group"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
              <span className="transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>
          
          <p className="mt-8 text-xs text-ink/40">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-4 px-3 pb-3 pt-3 sm:space-y-5 sm:px-0 sm:pb-0 sm:pt-0">
      {error || socialError || callError ? (
        <Toast 
          message={error || socialError || callError || ""} 
          onDismiss={() => {
            if (error) clearError();
            if (socialError) clearSocialError();
            if (callError) clearCallError();
          }}
        />
      ) : null}
      <NotificationToastStack
        notifications={notifications}
        onOpenChat={(chatId) => {
          if (chatId) {
            selectChat(chatId);
          }
        }}
        onMarkRead={markNotificationRead}
      />

      <div className="surface-elevated relative overflow-visible rounded-[28px] px-4 py-4 sm:rounded-[32px] sm:px-6 sm:py-5 lg:py-5">
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
        
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lagoon/70">
                Authenticated
              </p>
            </div>
            <h1 className="soft-heading text-[1.45rem] font-semibold leading-tight text-ink sm:text-[1.75rem] md:text-2xl">
              Welcome back, <span className="text-gradient">{session.backendUser?.name?.split(" ")[0]}</span>
            </h1>
            <p className="max-w-xl text-sm text-ink/50">
              Your conversations, connections, and notifications in one beautiful space.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => {
                setIsNotificationPanelOpen(false);
                setIsExploreOpen(true);
              }}
              className="btn-secondary group w-full sm:w-auto"
            >
              <Compass className="h-4 w-4 text-lagoon" />
              <span>Explore</span>
              <span className="transition-transform group-hover:scale-110">☆</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsNotificationPanelOpen(false);
                setIsProfileOpen(true);
              }}
                className="btn-secondary w-full sm:w-auto"
            >
              <UserRound className="h-4 w-4 text-lagoon" />
              <span>Profile</span>
            </button>
            <NotificationPanel
              notifications={notifications}
              isOpen={isNotificationPanelOpen}
              onToggle={() => setIsNotificationPanelOpen((value) => !value)}
              onOpenChat={(chatId, notificationId) => {
                if (notificationId) {
                  markNotificationRead(notificationId);
                }
                if (chatId) {
                  selectChat(chatId);
                }
                setIsNotificationPanelOpen(false);
              }}
              onMarkAllRead={markNotificationsRead}
              onMarkRead={markNotificationRead}
              onAcceptFriendRequest={async (userId, notificationId) => {
                await acceptRequestByUserId(userId);
                markNotificationRead(notificationId);
              }}
              onRejectFriendRequest={async (userId, notificationId) => {
                await rejectRequestByUserId(userId);
                markNotificationRead(notificationId);
              }}
            />
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn-secondary col-span-2 w-full text-ink/60 hover:text-rose-600 sm:col-span-1 sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid min-h-[70vh] grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)] xl:gap-5">
        <div className={cn(selectedChatId ? "hidden xl:block" : "block")}>
          <Sidebar
            chats={filteredChats}
            selectedChatId={selectedChatId}
            currentUserId={session.backendUser?._id}
            onSelectChat={selectChat}
            onDeleteChat={(chatId) => void deleteSelectedChat(chatId)}
            onClearChatMessages={(chatId) => void clearSelectedChatMessages(chatId)}
            onMarkChatRead={(chatId) => void markSelectedChatRead(chatId)}
            onMarkChatUnread={(chatId) => void markSelectedChatUnread(chatId)}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            isLoading={isLoadingChats}
            onlineUserIds={onlineUserIds}
            selectedChatIds={selectedChatIds}
            onSelectChats={setSelectedChatIds}
            isSelectionMode={isSelectionMode}
            onToggleSelectionMode={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) {
                setSelectedChatIds([]);
              }
            }}
          />
        </div>
        <div className={cn(!selectedChatId ? "hidden xl:block" : "block")}>
          <ChatWindow
            chat={activeChat}
            messages={messages}
            currentUserId={session.backendUser?._id}
            isLoading={isLoadingMessages}
            mediaTransfer={mediaTransfer}
            onSendMessage={sendChatMessage}
            onSendMedia={sendMediaMessage}
            onRetryMedia={retryLastMediaUpload}
            onDismissMedia={dismissMediaTransfer}
            onCancelMedia={cancelMediaUpload}
            onTyping={notifyTyping}
            onDeleteMessage={deleteChatMessage}
            onBack={selectedChatId ? () => selectChat(null) : undefined}
            onClose={selectedChatId ? () => selectChat(null) : undefined}
            isOnline={isActiveUserOnline}
            typingLabel={activeTyping ? `${activeTyping.userName} is typing...` : null}
            onStartAudioCall={
              activeChat ? () => void startCall({ chat: activeChat, callType: "audio" }) : undefined
            }
            onStartVideoCall={
              activeChat ? () => void startCall({ chat: activeChat, callType: "video" }) : undefined
            }
            callStatus={callStatus}
          />
        </div>
      </div>

      <IncomingCallModal
        call={incomingCall}
        onAccept={() => void acceptIncomingCall()}
        onReject={() => void rejectIncomingCall()}
      />

      <CallScreen
        call={activeCall}
        status={callStatus}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        error={callError}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onEndCall={() => void endActiveCall()}
      />

      <ExplorePanel
        isOpen={isExploreOpen}
        query={exploreQuery}
        users={directoryUsers}
        isLoading={isLoadingDirectory || isSearchingUsers}
        onClose={() => setIsExploreOpen(false)}
        onQueryChange={setExploreQuery}
        onStartChat={(userId) => {
          void startChatWithUser(userId);
          setIsExploreOpen(false);
        }}
        onSendRequest={(user) => void sendRequest(user)}
        onUnfriend={(user) => void unfriend(user)}
        onToggleBlock={(user) => void toggleBlock(user)}
      />

      <ProfilePanel
        isOpen={isProfileOpen}
        profile={profile}
        callHistory={callHistory}
        isLoading={isLoadingProfile}
        onClose={() => setIsProfileOpen(false)}
        onSave={saveProfile}
      />
    </div>
  );
};
