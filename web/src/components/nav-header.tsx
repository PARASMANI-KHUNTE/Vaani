import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Compass, LogOut, Menu, MessageSquare, Settings, UserRound, X } from "lucide-react";
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
    <header className="z-50 shrink-0 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-4">
        {/* Left */}
        <div className="flex min-w-0 items-center gap-3">
          {showBackButton ? (
            <Link
              to={backTo || "/"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-900"
              aria-label="Back"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Link>
          ) : null}

          <Link to="/" className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Home">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
              <img src="/linkup-logo.png" alt="LinkUp Logo" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">LinkUp</p>
              <p className="truncate text-[11px] font-medium text-slate-400">{title}</p>
            </div>
          </Link>
        </div>

        {/* Center */}
        {showNav ? (
          <nav className="hidden items-center gap-6 lg:flex">
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
                    "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                    t.active 
                      ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900" 
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        {/* Right */}
        <div className="flex shrink-0 items-center gap-2">
          {rightContent}

          {/* Mobile hamburger */}
          {showNav ? (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-900 lg:hidden"
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
              className="flex h-9 items-center gap-2 rounded-xl px-2 py-1.5 text-slate-600 transition-all hover:bg-slate-100 active:scale-[0.98] dark:text-slate-300 dark:hover:bg-slate-900"
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
            >
              <div className="h-7 w-7 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
                <Avatar
                  src={session?.backendUser?.avatar || null}
                  name={session?.backendUser?.name || "Me"}
                  className="h-7 w-7"
                  textClassName="text-xs font-bold"
                />
              </div>
              <span className="hidden md:inline text-sm font-semibold text-slate-900 dark:text-slate-100">
                {session?.backendUser?.name?.split(" ")[0]}
              </span>
            </button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-full z-[240] mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
                <div className="px-3 py-2.5">
                  <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">Signed in as</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">{session?.backendUser?.name}</p>
                </div>
                <div className="mx-3 h-px bg-slate-200 dark:bg-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/10"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
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
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="absolute inset-x-4 top-4 mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:absolute sm:left-1/2 sm:top-6 sm:inset-x-auto sm:mx-0 sm:w-[min(520px,calc(100vw-2rem))] sm:-translate-x-1/2"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Menu</p>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 active:scale-95 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-2">
                {[
                  { label: "Messages", icon: MessageSquare, onClick: () => navigate("/") },
                  { label: "Explore", icon: Compass, onClick: () => navigate("/explore") },
                  { label: "Profile", icon: UserRound, onClick: () => navigate("/me/profile") },
                  { label: "Settings", icon: Settings, onClick: () => navigate("/settings") },
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
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <Icon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                      {item.label}
                      <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

    </header>
  );
};
