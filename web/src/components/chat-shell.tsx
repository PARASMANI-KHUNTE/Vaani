"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { Compass, LogOut, MailCheck, MailMinus, MessageSquare, Sparkles, Trash2, UserRound, Users } from "lucide-react";
import { ChatWindow } from "@/components/ChatWindow/ChatWindow";
import { CallScreen } from "@/components/Call/CallScreen";
import { IncomingCallModal } from "@/components/Call/IncomingCallModal";
import { NotificationPanel } from "@/components/notification-panel";
import { NotificationToastStack } from "@/components/notification-toast-stack";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toast } from "@/components/toast";
import { useCall } from "@/hooks/use-call";
import { useChatData } from "@/hooks/use-chat-data";
import { useSocialData } from "@/hooks/use-social-data";
import { useAuth } from "@/lib/auth-context";
import { BackendUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";

export const ChatShell = () => {
  const navigate = useNavigate();
  const { session, status, loginWithGoogleCredential, logout } = useAuth();
  const selectedChatId = useChatStore((state) => state.selectedChatId);
  const selectChat = useChatStore((state) => state.selectChat);
  const notifications = useChatStore((state) => state.notifications);
  const typingByChat = useChatStore((state) => state.typingByChat);
  const onlineUserIds = useChatStore((state) => state.onlineUserIds);
  const markNotificationRead = useChatStore((state) => state.markNotificationRead);
  const markNotificationsRead = useChatStore((state) => state.markNotificationsRead);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([]);
  const [notificationToneEnabled, setNotificationToneEnabled] = useState(() => {
    const stored = localStorage.getItem("notificationToneEnabled");
    return stored !== null ? JSON.parse(stored) : true;
  });
  const debouncedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    localStorage.setItem("notificationToneEnabled", JSON.stringify(notificationToneEnabled));
  }, [notificationToneEnabled]);

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
    error,
    mediaTransfer,
    clearError,
    dismissMediaTransfer,
    cancelMediaUpload,
    renameGroupConversation,
    updateGroupAvatar,
    addMembersToGroup,
    removeMemberFromGroup,
    promoteMemberToAdmin,
    demoteAdminToMember,
    transferGroupOwner,
    leaveGroupConversation,
    createGroupConversation,
    createInviteLinkForGroup,
    sendChatMessage,
    sendMediaMessage,
    retryLastMediaUpload,
    notifyTyping,
    deleteChatMessage,
    clearSelectedChatMessages,
    deleteSelectedChat,
    markSelectedChatRead,
    markSelectedChatUnread,
    toggleReaction,
  } = useChatData({
    token: session?.backendAccessToken,
    currentUserId: session?.backendUser?._id,
  });
  const {
    directoryUsers,
    error: socialError,
    clearError: clearSocialError,
    acceptRequestByUserId,
    rejectRequestByUserId,
  } = useSocialData({
    token: session?.backendAccessToken,
  });

  const filteredChats = useMemo(() => {
    const source = debouncedSearch
      ? chats.filter((chat) => {
          const label = chat.isGroup ? chat.groupName || "" : chat.otherParticipant?.name || "";
          return label.toLowerCase().includes(debouncedSearch);
        })
      : chats;

    return [...source].sort((a, b) => {
      const aTime = new Date(a.lastMessage?.createdAt || a.updatedAt || a.createdAt).getTime();
      const bTime = new Date(b.lastMessage?.createdAt || b.updatedAt || b.createdAt).getTime();
      return bTime - aTime;
    });
  }, [chats, debouncedSearch]);

  const activeChat = chats.find((chat) => chat._id === selectedChatId) || null;
  const activeTyping = selectedChatId ? typingByChat[selectedChatId] : null;
  const isActiveUserOnline = activeChat
    ? !activeChat.isGroup && onlineUserIds.includes(activeChat.otherParticipant?._id || "")
    : false;
  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const selectedChats = useMemo(
    () => filteredChats.filter((chat) => selectedChatIds.includes(chat._id)),
    [filteredChats, selectedChatIds]
  );
  useEffect(() => {
    if (!selectedChatIds.length) {
      return;
    }
    const visibleIdSet = new Set(filteredChats.map((chat) => chat._id));
    const nextSelectedIds = selectedChatIds.filter((chatId) => visibleIdSet.has(chatId));
    if (nextSelectedIds.length !== selectedChatIds.length) {
      setSelectedChatIds(nextSelectedIds);
    }
  }, [filteredChats, selectedChatIds]);
  const openUserProfile = useCallback(
    (user: BackendUser) => {
      const path = user.username
        ? `/profile/${encodeURIComponent(user.username)}`
        : `/profile/user/${encodeURIComponent(user._id)}`;
      navigate(path);
    },
    [navigate]
  );

  const handleGoogleLoginSuccess = useCallback(
    (credentialResponse: CredentialResponse) => {
      void loginWithGoogleCredential(credentialResponse).catch((error) => {
        clearError();
        clearSocialError();
        clearCallError();
        console.error(error);
      });
    },
    [clearCallError, clearError, clearSocialError, loginWithGoogleCredential]
  );

  const handleGoogleLoginError = useCallback(() => {
    console.error("Google sign-in failed");
  }, []);

  const handleBulkMarkRead = useCallback(async () => {
    await Promise.allSettled(selectedChatIds.map(async (chatId) => markSelectedChatRead(chatId)));
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [markSelectedChatRead, selectedChatIds]);

  const handleBulkMarkUnread = useCallback(async () => {
    await Promise.allSettled(selectedChatIds.map(async (chatId) => markSelectedChatUnread(chatId)));
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [markSelectedChatUnread, selectedChatIds]);

  const handleBulkDelete = useCallback(async () => {
    const deletableIds = selectedChats.filter((chat) => !chat.isGroup).map((chat) => chat._id);
    const groupCount = selectedChats.length - deletableIds.length;

    if (groupCount > 0) {
      window.alert("Group chats were skipped. Leave group first to remove them from list.");
    }
    if (deletableIds.length === 0) {
      return;
    }

    await Promise.allSettled(deletableIds.map(async (chatId) => deleteSelectedChat(chatId)));
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [deleteSelectedChat, selectedChats]);

  const handleBulkLeaveGroups = useCallback(async () => {
    const groupIds = selectedChats.filter((chat) => chat.isGroup).map((chat) => chat._id);
    if (groupIds.length === 0) {
      window.alert("No groups selected.");
      return;
    }

    if (!window.confirm(`Leave ${groupIds.length} selected group(s)?`)) {
      return;
    }

    await Promise.allSettled(groupIds.map(async (chatId) => leaveGroupConversation(chatId)));
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [leaveGroupConversation, selectedChats]);

  const handleBulkMakeGroup = useCallback(async () => {
    const participantIds = Array.from(
      new Set(
        selectedChats
          .filter((chat) => !chat.isGroup && chat.otherParticipant?._id)
          .map((chat) => chat.otherParticipant!._id)
      )
    );

    if (participantIds.length < 2) {
      window.alert("Select at least two direct chats to create a group.");
      return;
    }

    const groupName = window.prompt("Group name");
    if (!groupName || groupName.trim().length < 2) {
      window.alert("Group name must be at least 2 characters.");
      return;
    }

    await createGroupConversation(groupName.trim(), participantIds);
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [createGroupConversation, selectedChats]);

  if (status === "loading") {
    return (
      <div className="surface-panel rounded-[36px] p-8 md:p-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-3 w-20 animate-pulse rounded-full bg-shell dark:bg-slate-700" />
              <div className="h-8 w-56 animate-pulse rounded-2xl bg-shell dark:bg-slate-700" />
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-28 animate-pulse rounded-2xl bg-shell dark:bg-slate-700" />
              <div className="h-11 w-28 animate-pulse rounded-2xl bg-shell dark:bg-slate-700" />
            </div>
          </div>
          <div className="grid min-h-[65vh] grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-22 animate-pulse rounded-[28px] bg-shell dark:bg-slate-700" />
              ))}
            </div>
            <div className="hidden rounded-[36px] bg-shell/40 dark:bg-slate-800/40 xl:block" />
          </div>
        </div>
      </div>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <section className="surface-panel relative overflow-hidden rounded-[40px] px-8 py-14 md:px-12 md:py-16">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(21,94,117,0.1),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.12),transparent_35%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(21,94,117,0.15),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.08),transparent_35%)]" />
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-lagoon/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-ember/5 to-transparent rounded-full blur-3xl" />
        
          <div className="relative mx-auto max-w-2xl text-center">
          <div className="animate-fade-down mb-6">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-lagoon to-teal flex items-center justify-center shadow-xl">
              <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                <path d="M8 10c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4"/>
                <circle cx="9" cy="14" r="1" fill="currentColor"/>
                <circle cx="15" cy="14" r="1" fill="currentColor"/>
                <path d="M9 17c.5.5 1.5 1 3 1s2.5-.5 3-1"/>
              </svg>
            </div>
          </div>
          
          <div className="animate-fade-down">
            <p className="inline-flex items-center gap-2 rounded-full border border-lagoon/20 bg-lagoon/5 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-lagoon">
              <Sparkles className="h-4 w-4" />
              Welcome
            </p>
          </div>
          
          <h1 className="soft-heading mt-8 text-4xl font-semibold tracking-tight text-ink dark:text-slate-100 md:text-5xl lg:text-6xl">
            <span className="text-gradient">Vaani</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-lg text-base leading-8 text-ink/65 dark:text-slate-400 md:text-lg">
            A warmer, calmer space for real-time conversation. 
            Connect with your team in a workspace that feels polished, 
            focused, and ready for collaboration.
          </p>
          
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <GoogleLogin
              theme="filled_blue"
              shape="pill"
              size="large"
              text="continue_with"
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
            />
          </div>
          
          <p className="mt-8 text-xs text-ink/40 dark:text-slate-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col space-y-3 px-2 pb-2 pt-2 sm:space-y-4 sm:px-3 sm:pb-3 sm:pt-3 md:px-4 md:pb-4 md:pt-4 lg:px-5 lg:pb-5 lg:pt-5">
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="surface-elevated relative overflow-visible rounded-[28px] px-4 py-3 sm:rounded-[32px] sm:px-6 sm:py-4"
      >
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/40 to-transparent pointer-events-none dark:from-white/5" />

        <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-6">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-lagoon/70">
                  Online
                </p>
              </div>
              <h1 className="soft-heading text-lg font-semibold leading-tight text-ink dark:text-slate-100 sm:text-xl">
                <span className="text-gradient">{session.backendUser?.name?.split(" ")[0]}</span>
              </h1>
            </div>

            <nav className="hidden items-center gap-1 sm:flex">
              <button
                type="button"
                className="group relative flex items-center gap-2 rounded-xl bg-lagoon/10 px-4 py-2.5 text-sm font-semibold text-lagoon transition-all dark:bg-lagoon/15"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Messages</span>
                {totalUnread > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember px-1.5 text-[10px] font-bold text-white">
                    {totalUnread > 99 ? "99+" : totalUnread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationPanelOpen(false);
                  navigate("/explore");
                }}
                className="group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-ink/50 transition-all hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
              >
                <Compass className="h-4 w-4" />
                <span>Explore</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationPanelOpen(false);
                  navigate("/me/profile");
                }}
                className="group flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-ink/50 transition-all hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
              >
                <UserRound className="h-4 w-4" />
                <span>Profile</span>
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 sm:hidden">
              <button
                type="button"
                onClick={() => {
                  setIsNotificationPanelOpen(false);
                  navigate("/explore");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink/50 transition-all hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
                title="Explore (Alt+E)"
              >
                <Compass className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNotificationPanelOpen(false);
                  navigate("/me/profile");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-ink/50 transition-all hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
                title="Profile (Alt+P)"
              >
                <UserRound className="h-4 w-4" />
              </button>
            </div>

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
              notificationToneEnabled={notificationToneEnabled}
              onNotificationToneChange={setNotificationToneEnabled}
            />
            <button
              type="button"
              onClick={logout}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink/50 transition-all hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
            <ThemeToggle />
          </div>
        </div>
      </motion.div>

      {isSelectionMode && selectedChatIds.length > 0 ? (
        <div className="surface-elevated flex flex-wrap items-center gap-2 rounded-2xl border border-lagoon/20 bg-lagoon/5 px-3 py-2.5">
          <span className="rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-lagoon">
            {selectedChatIds.length} selected
          </span>
          <button
            type="button"
            onClick={() => void handleBulkMarkRead()}
            className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-ink/70"
          >
            <MailCheck className="h-3.5 w-3.5" />
            Mark read
          </button>
          <button
            type="button"
            onClick={() => void handleBulkMarkUnread()}
            className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-ink/70"
          >
            <MailMinus className="h-3.5 w-3.5" />
            Mark unread
          </button>
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-rose-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            type="button"
            onClick={() => void handleBulkMakeGroup()}
            className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-lagoon"
          >
            <Users className="h-3.5 w-3.5" />
            Make group
          </button>
          <button
            type="button"
            onClick={() => void handleBulkLeaveGroups()}
            className="inline-flex items-center gap-1 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-rose-600"
          >
            <LogOut className="h-3.5 w-3.5" />
            Leave groups
          </button>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, delay: 0.05 }}
        className="relative z-10 grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden sm:grid-cols-[300px_minmax(0,1fr)] md:gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:gap-5"
      >
        <div className={cn(
          "min-h-0 h-full transition-all duration-200",
          selectedChatId ? "hidden sm:block" : "block"
        )}>
          <Sidebar
            chats={filteredChats}
            selectedChatId={selectedChatId}
            currentUserId={session.backendUser?._id}
            onSelectChat={selectChat}
            onDeleteChat={(chatId) => void deleteSelectedChat(chatId)}
            onLeaveGroup={(chatId) => void leaveGroupConversation(chatId)}
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
            onOpenUserProfile={openUserProfile}
          />
        </div>
        <div className={cn(
          "min-h-0 h-full transition-all duration-200",
          !selectedChatId ? "hidden sm:block" : "block"
        )}>
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
            onReact={toggleReaction}
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
            onOpenUserProfile={openUserProfile}
            groupDirectoryUsers={directoryUsers}
            onGroupRename={(chatId, groupName) => renameGroupConversation(chatId, groupName)}
            onGroupAvatarUpdate={(chatId, groupAvatar) => updateGroupAvatar(chatId, groupAvatar)}
            onGroupAddMembers={(chatId, memberIds) => addMembersToGroup(chatId, memberIds)}
            onGroupRemoveMember={(chatId, memberId) => removeMemberFromGroup(chatId, memberId)}
            onGroupPromoteAdmin={(chatId, memberId) => promoteMemberToAdmin(chatId, memberId)}
            onGroupDemoteAdmin={(chatId, memberId) => demoteAdminToMember(chatId, memberId)}
            onGroupTransferOwnership={(chatId, nextOwnerId) => transferGroupOwner(chatId, nextOwnerId)}
            onGroupLeave={(chatId) => leaveGroupConversation(chatId)}
            onGroupCreateInviteLink={(chatId, options) => createInviteLinkForGroup(chatId, options)}
            onOpenGroupInfo={(chatId) => navigate(`/group/${encodeURIComponent(chatId)}`)}
            callStatus={callStatus}
          />
        </div>
      </motion.div>

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
    </div>
  );
};

