import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Compass, LogOut, Menu, MessageSquare, Settings, Sparkles, UserRound, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { NotificationPanel } from "@/components/notification-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { acceptFriendRequest, rejectFriendRequest } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/store/chat-store";
import { useLocalStorageBoolean } from "@/hooks/use-local-storage-boolean";

type NavHeaderProps = {
  title?: string;
  showBackButton?: boolean;
  backTo?: string;
  showNav?: boolean;
  rightContent?: React.ReactNode;
  onLogout?: () => void;
};

export const NavHeader = ({
  title = "LinkUp",
  showBackButton = false,
  backTo,
  showNav = true,
  rightContent,
  onLogout,
}: NavHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, logout } = useAuth();

  const notifications = useChatStore((state) => state.notifications);
  const markNotificationRead = useChatStore((state) => state.markNotificationRead);
  const markNotificationsRead = useChatStore((state) => state.markNotificationsRead);
  const removeNotification = useChatStore((state) => state.removeNotification);
  const clearNotifications = useChatStore((state) => state.clearNotifications);
  const selectChat = useChatStore((state) => state.selectChat);
  const updateNotificationAction = useChatStore((state) => state.updateNotificationAction);
  const updateFriendStatus = useChatStore((state) => state.updateFriendStatus);
  const removeFriendRequest = useChatStore((state) => state.removeFriendRequest);

  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [notificationToneEnabled, setNotificationToneEnabled] = useLocalStorageBoolean("notificationToneEnabled", true);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isMessagesPage = location.pathname === "/";
  const isExplorePage = location.pathname.startsWith("/explore");
  const isProfilePage = location.pathname.startsWith("/me") || location.pathname.startsWith("/profile");
  const isSettingsPage = location.pathname.startsWith("/settings");

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!isUserMenuOpen) return;
      if (userMenuRef.current && userMenuRef.current.contains(e.target as Node)) return;
      setIsUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else logout();
  };

  const pendingRequestsRef = useRef<Set<string>>(new Set());

  const handleAcceptFriendRequest = async (userId: string, notificationId: string) => {
    if (!session?.backendAccessToken) return;
    
    const requestKey = `accept:${userId}:${notificationId}`;
    if (pendingRequestsRef.current.has(requestKey)) return;
    pendingRequestsRef.current.add(requestKey);

    const notification = useChatStore.getState().notifications.find(n => n.id === notificationId);
    const previousAction = notification?.action;
    const previousStatus = useChatStore.getState().directoryUsers[userId];

    updateNotificationAction(notificationId, "accepted");
    updateFriendStatus({
      userId,
      isFriend: true,
      requestSent: false,
      requestReceived: false,
    });
    
    try {
      await acceptFriendRequest(session.backendAccessToken, userId);
      markNotificationRead(notificationId);
    } catch (err) {
      if (previousAction === "accepted" || previousAction === "rejected") {
        updateNotificationAction(notificationId, previousAction);
      }
      if (previousStatus) {
        updateFriendStatus({
          userId,
          isFriend: previousStatus.isFriend,
          requestSent: previousStatus.requestSent,
          requestReceived: previousStatus.requestReceived,
          friendsCount: previousStatus.friendsCount,
        });
      }
      console.error("Failed to accept friend request:", err);
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  };

  const handleRejectFriendRequest = async (userId: string, notificationId: string) => {
    if (!session?.backendAccessToken) return;
    
    const requestKey = `reject:${userId}:${notificationId}`;
    if (pendingRequestsRef.current.has(requestKey)) return;
    pendingRequestsRef.current.add(requestKey);

    const notification = useChatStore.getState().notifications.find(n => n.id === notificationId);
    const previousAction = notification?.action;
    const previousStatus = useChatStore.getState().directoryUsers[userId];

    updateNotificationAction(notificationId, "rejected");
    removeFriendRequest(userId);
    
    try {
      await rejectFriendRequest(session.backendAccessToken, userId);
      markNotificationRead(notificationId);
    } catch (err) {
      if (previousAction === "accepted" || previousAction === "rejected") {
        updateNotificationAction(notificationId, previousAction);
      }
      if (previousStatus) {
        updateFriendStatus({
          userId,
          isFriend: previousStatus.isFriend,
          requestSent: previousStatus.requestSent,
          requestReceived: previousStatus.requestReceived,
          friendsCount: previousStatus.friendsCount,
        });
      }
      console.error("Failed to reject friend request:", err);
    } finally {
      pendingRequestsRef.current.delete(requestKey);
    }
  };

  return (
    <header className="z-50 shrink-0 border-b border-line bg-surface/85 px-4 py-2 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-1.5">
          {showBackButton ? (
            <Link
              to={backTo || "/"}
              className="icon-btn shrink-0"
              aria-label="Back"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
          ) : null}

          <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-subtle" aria-label="Home">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-line">
              <img src="/linkup-logo.png" alt="LinkUp Logo" className="h-full w-full object-cover" />
            </div>
            <div className="hidden min-w-0 xs:block">
              <p className="truncate text-sm font-bold tracking-tight text-fg">LinkUp</p>
              <p className="truncate text-[11px] font-medium text-faint">{title}</p>
            </div>
          </Link>
        </div>

        {/* Center */}
        {showNav ? (
          <nav className="hidden items-center gap-1 rounded-2xl border border-line bg-subtle/60 p-1 lg:flex">
            {[
              { id: "messages", label: "Messages", icon: MessageSquare, active: isMessagesPage, onClick: () => navigate("/") },
              { id: "explore", label: "Explore", icon: Compass, active: isExplorePage, onClick: () => navigate("/explore") },
              { id: "profile", label: "Profile", icon: UserRound, active: isProfilePage, onClick: () => navigate("/me/profile") },
              { id: "settings", label: "Settings", icon: Settings, active: isSettingsPage, onClick: () => navigate("/settings") },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={t.onClick}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all duration-200",
                    t.active
                      ? "bg-surface text-brand shadow-sm ring-1 ring-brand/15"
                      : "text-muted hover:bg-surface/70 hover:text-fg"
                  )}
                  aria-current={t.active ? "page" : undefined}
                >
                  <Icon className={cn("h-4 w-4", t.active && "text-brand")} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        {/* Right */}
        <div className="flex shrink-0 items-center gap-1.5">
          {rightContent}

          {/* Mobile hamburger */}
          {showNav ? (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="icon-btn lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          ) : null}

          <NotificationPanel
            notifications={notifications}
            isOpen={isNotificationPanelOpen}
            onToggle={() => setIsNotificationPanelOpen((v) => !v)}
            onOpenChat={(c, n) => {
              if (n) markNotificationRead(n);
              if (c) selectChat(c);
              setIsNotificationPanelOpen(false);
            }}
            onMarkAllRead={markNotificationsRead}
            onMarkRead={markNotificationRead}
            onDelete={removeNotification}
            onClear={() => {
              clearNotifications();
              setIsNotificationPanelOpen(false);
            }}
            onAcceptFriendRequest={handleAcceptFriendRequest}
            onRejectFriendRequest={handleRejectFriendRequest}
            notificationToneEnabled={notificationToneEnabled}
            onNotificationToneChange={setNotificationToneEnabled}
          />

          <ThemeToggle />

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen((v) => !v)}
              className="flex h-9 items-center gap-2 rounded-xl border border-transparent px-1.5 py-1.5 text-muted transition-all hover:border-line hover:bg-subtle active:scale-[0.98]"
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
            >
              <Avatar
                src={session?.backendUser?.avatar || null}
                name={session?.backendUser?.name || "Me"}
                className="h-7 w-7 rounded-lg shadow-sm ring-1 ring-line"
                textClassName="text-xs font-bold"
              />
              <span className="hidden truncate text-sm font-semibold text-fg md:inline">
                {session?.backendUser?.name?.split(" ")[0]}
              </span>
            </button>

            {isUserMenuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-[230] lg:hidden bg-black/5"
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full z-[240] mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-elevated shadow-float">
                  <div className="px-3.5 py-3">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-faint">Signed in as</p>
                    <p className="mt-1 truncate text-sm font-bold text-fg">{session?.backendUser?.name}</p>
                    <p className="truncate text-xs text-muted">{session?.backendUser?.email}</p>
                  </div>
                  <div className="mx-3 h-px bg-line" />
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Menu - Slide-in Drawer style */}
      <AnimatePresence>
        {isMobileMenuOpen ? (
          <div className="fixed inset-0 z-[9999] lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="fixed bottom-0 right-0 top-0 flex w-[300px] max-w-full flex-col border-l border-line bg-surface shadow-float"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-glow">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-bold tracking-tight text-fg">Menu</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="icon-btn"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="mb-6 rounded-2xl border border-line bg-subtle/60 px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={session?.backendUser?.avatar || null}
                      name={session?.backendUser?.name || "Me"}
                      className="h-10 w-10 rounded-xl shadow-sm ring-1 ring-line"
                      textClassName="text-sm font-bold"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-fg">{session?.backendUser?.name}</p>
                      <p className="truncate text-xs text-muted">{session?.backendUser?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  {[
                    { label: "Messages", icon: MessageSquare, active: isMessagesPage, onClick: () => navigate("/") },
                    { label: "Explore", icon: Compass, active: isExplorePage, onClick: () => navigate("/explore") },
                    { label: "Profile", icon: UserRound, active: isProfilePage, onClick: () => navigate("/me/profile") },
                    { label: "Settings", icon: Settings, active: isSettingsPage, onClick: () => navigate("/settings") },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          item.onClick();
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-semibold transition-colors",
                          item.active
                            ? "bg-brand/10 text-brand"
                            : "text-fg/80 hover:bg-subtle"
                        )}
                      >
                        <div className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg",
                          item.active ? "bg-brand text-white" : "bg-subtle text-muted"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        {item.label}
                        <ChevronRight className="ml-auto h-4 w-4 text-faint" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-auto border-t border-line p-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-500/10 px-4 py-3.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-500/15 active:scale-[0.98] dark:text-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
                <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-faint">LinkUp v2.4.0</p>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

    </header>
  );
};
