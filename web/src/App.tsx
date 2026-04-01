import { Route, Routes, Navigate } from "react-router-dom";
import { ChatShell } from "@/components/chat-shell";
import { MobileAuthPage } from "@/pages/mobile-auth-page";
import { ExplorePage } from "@/pages/explore-page";
import { GroupInfoPage } from "@/pages/group-info-page";
import { GroupInvitePage } from "@/pages/group-invite-page";
import { MyProfilePage } from "@/pages/my-profile-page";
import { NotFoundPage } from "@/pages/not-found-page";
import { SharedProfilePage } from "@/pages/shared-profile-page";
import LandingPage from "@/pages/landing-page";
import DocsPage from "@/pages/docs-page";
import { BlockedUsersPage } from "@/pages/blocked-users-page";
import { useAuth } from "@/lib/auth-context";

const ChatApp = () => <ChatShell />;

export default function App() {
  const { status, session } = useAuth();
  
  if (status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent flex items-center justify-center">
          <div className="h-4 w-4 rounded-full bg-blue-600/20" />
        </div>
      </div>
    );
  }
  
  return (
    <Routes>
      <Route
        path="/landing"
        element={session?.backendAccessToken ? <Navigate to="/" replace /> : <LandingPage />}
      />
      <Route
        path="/"
        element={
          session?.backendAccessToken ? <ChatApp /> : <Navigate to="/landing" replace />
        }
      />
      <Route
        path="/explore"
        element={
          session?.backendAccessToken ? <ExplorePage /> : <Navigate to="/landing" replace />
        }
      />
      <Route
        path="/groups/join/:token"
        element={
          session?.backendAccessToken ? <GroupInvitePage /> : <Navigate to="/landing" replace />
        }
      />
      <Route path="/mobile-auth" element={<MobileAuthPage />} />
      <Route path="/me/profile" element={session?.backendAccessToken ? <MyProfilePage /> : <Navigate to="/landing" replace />} />
      <Route path="/me/blocked" element={session?.backendAccessToken ? <BlockedUsersPage /> : <Navigate to="/landing" replace />} />
      <Route path="/profile/:username" element={session?.backendAccessToken ? <SharedProfilePage /> : <Navigate to="/landing" replace />} />
      <Route path="/profile/user/:userId" element={session?.backendAccessToken ? <SharedProfilePage /> : <Navigate to="/landing" replace />} />
      <Route path="/group/:chatId" element={<GroupInfoPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
