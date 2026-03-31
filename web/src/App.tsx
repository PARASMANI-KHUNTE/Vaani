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
import { useAuth } from "@/lib/auth-context";

const ChatApp = () => (
  <main className="ambient-grid relative h-dvh overflow-hidden p-2 sm:p-3 lg:p-4">
    <div className="animate-drift absolute left-[-7rem] top-[-6rem] h-72 w-72 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/15" />
    <div className="animate-drift absolute right-[-8rem] top-24 h-80 w-80 rounded-full bg-teal-400/18 blur-3xl [animation-delay:1.2s] dark:bg-teal-400/14" />
    <div className="animate-drift absolute bottom-[-8rem] left-[20%] h-72 w-72 rounded-full bg-orange-300/18 blur-3xl [animation-delay:2.2s] dark:bg-orange-400/12" />
    <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),transparent)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.55),transparent)]" />
    <div className="relative h-full w-full animate-fade-up depth-card">
      <ChatShell />
    </div>
  </main>
);

export default function App() {
  const { status, session } = useAuth();
  
  if (status === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center bg-gradient-to-br from-slate-50 to-cyan-50 dark:from-slate-950 dark:to-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
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
      <Route path="/me/profile" element={<MyProfilePage />} />
      <Route path="/profile/:username" element={<SharedProfilePage />} />
      <Route path="/profile/user/:userId" element={<SharedProfilePage />} />
      <Route path="/group/:chatId" element={<GroupInfoPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
