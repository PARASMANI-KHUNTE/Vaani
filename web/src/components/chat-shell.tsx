"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { Compass, LogOut, MailCheck, MailMinus, MessageSquare, Sparkles, Trash2, UserRound } from "lucide-react";
import { ChatWindow } from "@/components/ChatWindow/ChatWindow";
import { NotificationPanel } from "@/components/notification-panel";
import { ConfirmDialog, AlertDialog } from "@/components/confirm-dialog";
import { NotificationToastStack } from "@/components/notification-toast-stack";
import { Sidebar } from "@/components/Sidebar/Sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toast } from "@/components/toast";
import { useChatData } from "@/hooks/use-chat-data";
import { NewChatModal } from "@/components/new-chat-modal";
import { useAuth } from "@/lib/auth-context";
import { acceptFriendRequest, rejectFriendRequest } from "@/lib/api";
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
  const [friendRequestError, setFriendRequestError] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const debouncedSearch = searchTerm.trim().toLowerCase();

  useEffect(() => {
    localStorage.setItem("notificationToneEnabled", JSON.stringify(notificationToneEnabled));
  }, [notificationToneEnabled]);

  const {
    chats,
    messages,
    isLoadingChats,
    isLoadingMessages,
    error,
    clearError,
    sendChatMessage,
    sendMediaMessage,
    notifyTyping,
    deleteChatMessage,
    toggleReaction,
    deleteSelectedChat,
    markSelectedChatRead,
    markSelectedChatUnread,
    clearSelectedChatMessages,
    mediaTransfer,
    retryLastMediaUpload,
    cancelMediaUpload,
    dismissMediaTransfer,
    startChatWithUser,
    createGroupConversation,
    leaveGroupConversation: leaveGroup,
  } = useChatData({
    token: session?.backendAccessToken,
    currentUserId: session?.backendUser?._id,
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
  const handleGoogleLoginSuccess = useCallback(
    (credentialResponse: CredentialResponse) => {
      void loginWithGoogleCredential(credentialResponse).catch((error) => {
        clearError();
        console.error(error);
      });
    },
    [clearError, loginWithGoogleCredential]
  );

  const handleGoogleLoginError = useCallback(() => {
    console.error("Google sign-in failed");
  }, []);

  const handleBulkMarkRead = useCallback(async () => {
    await Promise.allSettled(selectedChatIds.map(async (chatId) => markSelectedChatRead(chatId)));
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [markSelectedChatRead, selectedChatIds]);

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteInfo, setBulkDeleteInfo] = useState({ groupCount: 0, dmCount: 0 });
  const [bulkDeleteComplete, setBulkDeleteComplete] = useState(false);

  const handleBulkMarkUnread = useCallback(async () => {
    await Promise.allSettled(selectedChatIds.map(async (chatId) => markSelectedChatUnread(chatId)));
    setSelectedChatIds([]);
    setIsSelectionMode(false);
  }, [markSelectedChatUnread, selectedChatIds]);

  const handleBulkDelete = useCallback(async () => {
    const deletableIds = selectedChats.filter((chat) => !chat.isGroup).map((chat) => chat._id);
    const groupCount = selectedChats.length - deletableIds.length;

    if (groupCount > 0) {
      setBulkDeleteInfo({ groupCount, dmCount: deletableIds.length });
      setBulkDeleteOpen(true);
      return;
    }
    if (deletableIds.length === 0) {
      return;
    }

    await Promise.allSettled(deletableIds.map(async (chatId) => deleteSelectedChat(chatId)));
    setSelectedChatIds([]);
    setIsSelectionMode(false);
    setBulkDeleteComplete(true);
  }, [deleteSelectedChat, selectedChats]);

  const handleAcceptFriendRequest = useCallback(async (userId: string, notificationId: string) => {
    if (!session?.backendAccessToken) return;
    try {
      await acceptFriendRequest(session.backendAccessToken, userId);
      markNotificationRead(notificationId);
    } catch (err) {
      setFriendRequestError(err instanceof Error ? err.message : "Failed to accept friend request");
    }
  }, [session, markNotificationRead]);

  const handleRejectFriendRequest = useCallback(async (userId: string, notificationId: string) => {
    if (!session?.backendAccessToken) return;
    try {
      await rejectFriendRequest(session.backendAccessToken, userId);
      markNotificationRead(notificationId);
    } catch (err) {
      setFriendRequestError(err instanceof Error ? err.message : "Failed to reject friend request");
    }
  }, [session, markNotificationRead]);

  if (status === "loading") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-base-50 dark:bg-base-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent flex items-center justify-center">
            <div className="h-4 w-4 rounded-full bg-blue-600/20" />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!session?.backendAccessToken) {
    return (
      <section className="flex h-full w-full items-center justify-center bg-base-50 p-6 dark:bg-base-950">
        <div className="w-full max-w-md surface-elevated rounded-xl p-8 shadow-flat dark:shadow-flat-dark border border-border-light dark:border-border-dark text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
            <Sparkles className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome to LinkUp</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">A secure workspace for professional real-time collaboration. Sign in to access your groups and directory.</p>
          <div className="mt-8">
            <GoogleLogin
              theme={document.documentElement.classList.contains("dark") ? "filled_black" : "outline"}
              shape="rectangular"
              size="large"
              text="continue_with"
              logo_alignment="center"
              width="100%"
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
            />
          </div>
          <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">Enterprise-grade end-to-end security.</p>
        </div>
      </section>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-white dark:bg-slate-950 overflow-hidden relative">
      {error ? (
        <Toast
          message={error}
          onDismiss={() => {
            if (error) clearError();
          }}
        />
      ) : null}
      {friendRequestError ? (
        <Toast
          message={friendRequestError}
          onDismiss={() => setFriendRequestError(null)}
        />
      ) : null}
      
      <NotificationToastStack 
        notifications={notifications} 
        notificationToneEnabled={notificationToneEnabled} 
        onOpenChat={(chatId) => { if (chatId) selectChat(chatId); }} 
        onMarkRead={markNotificationRead} 
      />

      <header className="z-50 shrink-0 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                <img src="/linkup-logo.png" alt="LinkUp Logo" className="h-full w-full object-cover" />
              </div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">LinkUp</h1>
            </div>
            
            <nav className="hidden items-center gap-1 sm:flex">
              <button 
                type="button" 
                className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-900 transition-all dark:bg-slate-800 dark:text-slate-100"
              >
                <div className="relative">
                  <MessageSquare className="h-4 w-4" />
                  {totalUnread > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white leading-none">
                      {totalUnread > 99 ? "99+" : totalUnread}
                    </span>
                  )}
                </div>
                <span>Messages</span>
              </button>
              <button onClick={() => navigate("/explore")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"><Compass className="h-4 w-4" /><span>Explore</span></button>
              <button onClick={() => navigate("/me/profile")} className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"><UserRound className="h-4 w-4" /><span>Profile</span></button>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="mr-2 hidden items-center gap-2 border-r border-slate-200 pr-4 dark:border-slate-800 xs:flex">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{session.backendUser?.name?.split(" ")[0]}</span>
            </div>
            <NotificationPanel 
              notifications={notifications} 
              isOpen={isNotificationPanelOpen} 
              onToggle={() => setIsNotificationPanelOpen((v) => !v)} 
              onOpenChat={(c, n) => { if (n) markNotificationRead(n); if (c) selectChat(c); setIsNotificationPanelOpen(false); }} 
              onMarkAllRead={markNotificationsRead} 
              onMarkRead={markNotificationRead} 
              onAcceptFriendRequest={handleAcceptFriendRequest}
              onRejectFriendRequest={handleRejectFriendRequest}
              notificationToneEnabled={notificationToneEnabled} 
              onNotificationToneChange={setNotificationToneEnabled} 
            />
            <button onClick={logout} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"><LogOut className="h-4 w-4" /></button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {isSelectionMode && selectedChatIds.length > 0 && (
        <div className="z-40 flex shrink-0 items-center justify-between border-b border-blue-100 bg-blue-50/50 px-6 py-2 dark:border-blue-900/30 dark:bg-blue-950/20">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{selectedChatIds.length} <span className="hidden xs:inline">selected</span></span>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => void handleBulkMarkRead()} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold" title="Read"><MailCheck className="h-4 w-4 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline ml-1.5">Read</span></button>
            <button type="button" onClick={() => void handleBulkMarkUnread()} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold" title="Unread"><MailMinus className="h-4 w-4 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline ml-1.5">Unread</span></button>
            <button type="button" onClick={() => void handleBulkDelete()} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm border border-slate-200 hover:bg-rose-50 dark:bg-slate-800 dark:border-slate-700 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-xs sm:font-semibold text-rose-600" title="Delete"><Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" /><span className="hidden sm:inline ml-1.5">Delete</span></button>
          </div>
        </div>
      )}

      <main className="flex min-h-0 flex-1 overflow-hidden pb-safe">
        <div className={cn("h-full w-full sm:w-[320px] md:w-[360px] lg:w-[400px] border-r border-slate-200 dark:border-slate-800", selectedChatId ? "hidden sm:block" : "block")}>
          <Sidebar
            chats={filteredChats}
            selectedChatId={selectedChatId}
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
              if (isSelectionMode) setSelectedChatIds([]);
            }}
            onOpenNewChat={() => setIsNewChatModalOpen(true)}
          />
        </div>
        <div className={cn("h-full flex-1", !selectedChatId ? "hidden sm:block" : "block")}>
          <ChatWindow
            chat={activeChat}
            messages={messages}
            currentUserId={session.backendUser?._id}
            isLoading={isLoadingMessages}
            onSendMessage={sendChatMessage}
            onSendMedia={sendMediaMessage}
            onTyping={notifyTyping}
            onDeleteMessage={deleteChatMessage}
            onReact={toggleReaction}
            onBack={selectedChatId ? () => selectChat(null) : undefined}
            onClose={selectedChatId ? () => selectChat(null) : undefined}
            isOnline={isActiveUserOnline}
            typingLabel={activeTyping ? `${activeTyping.userName} is typing...` : null}
            onOpenUserProfile={(user) => navigate(`/profile/user/${user._id}`)}
            mediaTransfer={mediaTransfer}
            onRetryMedia={retryLastMediaUpload}
            onCancelMedia={cancelMediaUpload}
            onDismissMedia={dismissMediaTransfer}
            onError={error || undefined}
            onDismissError={clearError}
            onLeaveGroup={async (chatId) => {
              await leaveGroup(chatId);
              selectChat(null);
            }}
            onOpenGroupInfo={(chatId) => navigate(`/group/${chatId}`)}
            onClearChat={(chatId) => clearSelectedChatMessages(chatId)}
          />
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      {!selectedChatId && (
        <nav className="z-50 flex shrink-0 items-center justify-around border-t border-slate-200 bg-white/80 pb-safe pt-2 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 sm:hidden">
          <button 
            type="button" 
            className="flex flex-col items-center gap-1 px-4 py-2 text-blue-600 transition-all dark:text-blue-400"
          >
            <div className="relative">
              <MessageSquare className="h-6 w-6" />
              {totalUnread > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white leading-none">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-tight">Chats</span>
          </button>
          <button 
            onClick={() => navigate("/explore")}
            className="flex flex-col items-center gap-1 px-4 py-2 text-slate-400 transition-all hover:text-slate-900 dark:hover:text-slate-100"
          >
            <Compass className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Explore</span>
          </button>
          <button 
            onClick={() => navigate("/me/profile")}
            className="flex flex-col items-center gap-1 px-4 py-2 text-slate-400 transition-all hover:text-slate-900 dark:hover:text-slate-100"
          >
            <UserRound className="h-6 w-6" />
            <span className="text-[10px] font-bold uppercase tracking-tight">Profile</span>
          </button>
        </nav>
      )}

      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onStartChat={startChatWithUser}
        onCreateGroup={createGroupConversation}
        token={session?.backendAccessToken}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        title="Delete Chats"
        message={`${bulkDeleteInfo.groupCount} group chat(s) were skipped. Leave group first to remove them. Delete ${bulkDeleteInfo.dmCount} direct message(s)?`}
        variant="danger"
        confirmLabel="Delete"
        onConfirm={async () => {
          const deletableIds = selectedChats.filter((chat) => !chat.isGroup).map((chat) => chat._id);
          await Promise.allSettled(deletableIds.map(async (chatId) => deleteSelectedChat(chatId)));
          setSelectedChatIds([]);
          setIsSelectionMode(false);
          setBulkDeleteOpen(false);
          setBulkDeleteComplete(true);
        }}
        onCancel={() => setBulkDeleteOpen(false)}
      />

      <AlertDialog
        isOpen={bulkDeleteComplete}
        title="Chats Deleted"
        message="Selected chats have been removed."
        onDismiss={() => setBulkDeleteComplete(false)}
      />
    </div>
  );
};
