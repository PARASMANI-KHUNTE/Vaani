"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Code2,
  Layers,
  MessageSquare,
  Server,
  Shield,
  Zap,
  Clock,
  ChevronRight,
  ArrowLeft,
  GitBranch,
  Globe,
  Cpu,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type SectionId =
  | "overview"
  | "architecture"
  | "api"
  | "tech"
  | "concepts"
  | "features"
  | "limits"
  | "status";

const sections: { id: SectionId; label: string; icon: typeof BookOpen }[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "architecture", label: "Architecture", icon: Layers },
  { id: "api", label: "API Reference", icon: Code2 },
  { id: "tech", label: "Tech Stack", icon: Cpu },
  { id: "concepts", label: "Concepts", icon: Zap },
  { id: "features", label: "Features", icon: Shield },
  { id: "limits", label: "Limits", icon: Clock },
  { id: "status", label: "Status", icon: GitBranch },
];

const CodeBlock = ({ children }: { children: React.ReactNode }) => (
  <pre className="overflow-x-auto rounded-2xl border border-white/5 bg-black/30 p-4 text-sm leading-relaxed text-slate-300 dark:border-white/5 dark:bg-black/30">
    <code>{children}</code>
  </pre>
);

const Endpoint = ({ method, path, desc }: { method: string; path: string; desc?: string }) => (
  <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 transition-colors hover:bg-white/[0.04] dark:border-white/5">
    <span
      className={cn(
        "shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        method === "GET" && "bg-emerald-500/15 text-emerald-400",
        method === "POST" && "bg-blue-500/15 text-blue-400",
        method === "PATCH" && "bg-amber-500/15 text-amber-400",
        method === "DELETE" && "bg-red-500/15 text-red-400",
        method === "SOCKET" && "bg-violet-500/15 text-violet-400"
      )}
    >
      {method}
    </span>
    <div className="min-w-0 flex-1">
      <p className="font-mono text-sm text-slate-200">{path}</p>
      {desc && <p className="mt-0.5 text-xs text-slate-400">{desc}</p>}
    </div>
  </div>
);

const SectionHeading = ({ icon: Icon, children }: { icon: typeof BookOpen; children: React.ReactNode }) => (
  <div className="mb-6 flex items-center gap-3">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-lagoon/20 to-teal/20">
      <Icon className="h-5 w-5 text-lagoon dark:text-teal" />
    </div>
    <h2 className="soft-heading text-2xl font-semibold text-ink dark:text-slate-100">{children}</h2>
  </div>
);

const SubHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-3 mt-8 text-lg font-semibold text-ink dark:text-slate-200">{children}</h3>
);

const Body = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-4 text-sm leading-7 text-ink/65 dark:text-slate-400">{children}</p>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded-full border border-lagoon/20 bg-lagoon/10 px-3 py-1 text-xs font-medium text-lagoon dark:border-teal/20 dark:bg-teal/10 dark:text-teal">
    {children}
  </span>
);

const OverviewSection = () => (
  <div>
    <SectionHeading icon={BookOpen}>Project Overview</SectionHeading>
    <Body>
      Canvas Chat is a production-oriented realtime chat platform with a React + Vite web frontend
      and an Express + Socket.IO backend. It delivers fast, polished, responsive communication
      with media sharing and a social relationship system.
    </Body>

    <SubHeading>Repository Structure</SubHeading>
    <CodeBlock>{`Chat App/
  web/     React + Vite client
  server/  Express + Socket.IO backend
  mobile/  React Native/Expo workspace (in progress)
  docs/    project documentation`}</CodeBlock>

    <SubHeading>User-Facing Capabilities</SubHeading>
    <div className="mb-4 grid gap-2 sm:grid-cols-2">
      {[
        "Google authentication",
        "1-to-1 conversations",
        "Realtime messaging with typing and presence",
        "Message replies, reactions, and delete scopes",
        "Image and file sharing",
        "Read/delivered message state",
        "Friend requests, block/unblock, unfriend",        "Profile management",
        "Account disable and delete",
      ].map((cap) => (
        <div key={cap} className="flex items-start gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 dark:border-white/5">
          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-lagoon dark:text-teal" />
          <span className="text-sm text-ink/70 dark:text-slate-300">{cap}</span>
        </div>
      ))}
    </div>

    <SubHeading>Local Development</SubHeading>
    <Body>Run the web client and server separately:</Body>
    <CodeBlock>{`# Web (Vite)
cd web
npm install
npm run dev

# Server
cd server
npm install
npm run dev`}</CodeBlock>

    <SubHeading>Environment Files</SubHeading>
    <div className="flex flex-wrap gap-2">
      <Badge>server/.env.example</Badge>
      <Badge>web/.env.example</Badge>
    </div>
  </div>
);

const ArchitectureSection = () => (
  <div>
    <SectionHeading icon={Layers}>Architecture</SectionHeading>

    <SubHeading>High-Level Flow</SubHeading>
    <div className="mb-6 space-y-3">
      {[
        { icon: Globe, label: "React + Vite Web App", desc: "REST API + Socket.IO for realtime events and signaling" },
        { icon: Server, label: "Express Server", desc: "REST controllers, Socket.IO handlers, MongoDB, and Cloudinary" },
      ].map(({ icon: Icon, label, desc }) => (
        <div key={label} className="flex items-start gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 dark:border-white/5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lagoon/10 dark:bg-teal/10">
            <Icon className="h-5 w-5 text-lagoon dark:text-teal" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink dark:text-slate-200">{label}</p>
            <p className="mt-0.5 text-xs text-ink/50 dark:text-slate-400">{desc}</p>
          </div>
        </div>
      ))}
    </div>

    <SubHeading>Frontend Architecture</SubHeading>
    <CodeBlock>{`web/src/
  main.tsx          app bootstrap and providers
  App.tsx           route map
  components/       chat shell, sidebar, chat window, panels
  hooks/            use-chat-data, use-social-data
  lib/              API client, auth context, socket, utils
  store/            Zustand chat state
  pages/            route pages`}</CodeBlock>

    <SubHeading>Backend Architecture</SubHeading>
    <CodeBlock>{`server/src/modules/
  auth/             Google login, JWT issuance
  user/             profiles, social graph
  chat/             conversation CRUD
  message/          messages, media, reactions
  socket/           realtime event handlers`}</CodeBlock>

    <SubHeading>Realtime Model</SubHeading>
    <Body>
      Per-user room <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">user:{'{userId}'}</code> and
      per-chat room <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">chat:{'{chatId}'}</code> handle
      message delivery, typing, read/delivered updates, presence, and notifications.
    </Body>

    <SubHeading>Auth Model</SubHeading>
    <div className="mb-4 space-y-2">
      {[
        "Web app gets Google identity token (GIS)",
        "Token exchanged with backend /auth/login",
        "Backend returns app JWT",
        "JWT authenticates REST + Socket.IO",
      ].map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lagoon/15 text-xs font-bold text-lagoon dark:bg-teal/15 dark:text-teal">
            {i + 1}
          </span>
          <span className="text-sm text-ink/70 dark:text-slate-300">{step}</span>
        </div>
      ))}
    </div>

    <SubHeading>Media Model</SubHeading>
    <Body>
      Primary upload path uses signed Cloudinary direct upload. Fallback path uploads through
      the backend endpoint when needed. Chat payload stores normalized media metadata.
    </Body>
  </div>
);

const ApiSection = () => (
  <div>
    <SectionHeading icon={Code2}>API Reference</SectionHeading>
    <Body>
      Base URL is configured in <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">web/.env</code> as{" "}
      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">VITE_API_URL</code>.
    </Body>

    <SubHeading>Auth</SubHeading>
    <div className="space-y-2">
      <Endpoint method="POST" path="/auth/login" desc="Exchange Google ID token for app JWT" />
      <Endpoint method="GET" path="/auth/me" desc="Fetch current user" />
      <Endpoint method="POST" path="/auth/mobile/code" desc="Issue one-time mobile auth code" />
      <Endpoint method="POST" path="/auth/mobile/redeem" desc="Redeem one-time mobile auth code" />
    </div>

    <SubHeading>Users / Social</SubHeading>
    <div className="space-y-2">
      <Endpoint method="GET" path="/users/me" />
      <Endpoint method="PATCH" path="/users/me" />
      <Endpoint method="POST" path="/users/me/disable" />
      <Endpoint method="DELETE" path="/users/me" />
      <Endpoint method="GET" path="/users/profile/:username" />
      <Endpoint method="GET" path="/users/search?q=" />
      <Endpoint method="GET" path="/users/explore" />
      <Endpoint method="POST" path="/users/:id/friend-request" />
      <Endpoint method="POST" path="/users/:id/friend-request/accept" />
      <Endpoint method="POST" path="/users/:id/friend-request/reject" />
      <Endpoint method="DELETE" path="/users/:id/friend" />
      <Endpoint method="POST" path="/users/:id/block" />
      <Endpoint method="DELETE" path="/users/:id/block" />
    </div>

    <SubHeading>Chats</SubHeading>
    <div className="space-y-2">
      <Endpoint method="GET" path="/chats" />
      <Endpoint method="POST" path="/chats" />
      <Endpoint method="PATCH" path="/chats/:chatId/read" />
      <Endpoint method="PATCH" path="/chats/:chatId/unread" />
      <Endpoint method="POST" path="/chats/:chatId/clear" />
      <Endpoint method="DELETE" path="/chats/:chatId" />
    </div>

    <SubHeading>Messages</SubHeading>
    <div className="space-y-2">
      <Endpoint method="GET" path="/messages/:chatId?page=&limit=" />
      <Endpoint method="POST" path="/messages" />
      <Endpoint method="DELETE" path="/messages/:messageId?scope=me|everyone" />
      <Endpoint method="POST" path="/messages/:messageId/reaction" />
      <Endpoint method="DELETE" path="/messages/:messageId/reaction?emoji=" />
      <Endpoint method="POST" path="/messages/upload/signature" />
      <Endpoint method="POST" path="/messages/upload" desc="Fallback upload" />
    </div>

    <SubHeading>Socket.IO Events</SubHeading>
    <div className="space-y-2">
      <Endpoint method="SOCKET" path="message:send / message:new" desc="Message lifecycle" />
      <Endpoint method="SOCKET" path="message:delivered / message:seen" desc="Delivery receipts" />
      <Endpoint method="SOCKET" path="typing:start / typing:stop" desc="Typing indicators" />
      <Endpoint method="SOCKET" path="presence:update" desc="Online/offline status" />
      <Endpoint method="SOCKET" path="notification:new" desc="Push notifications" />
    </div>
  </div>
);

const TechSection = () => (
  <div>
    <SectionHeading icon={Cpu}>Tech Stack</SectionHeading>

    <SubHeading>Web</SubHeading>
    <div className="mb-6 flex flex-wrap gap-2">
      {["React 19", "Vite 8", "TypeScript 5", "Tailwind CSS 3", "React Router 7", "Framer Motion", "Zustand", "Socket.IO Client"].map((t) => (
        <Badge key={t}>{t}</Badge>
      ))}
    </div>

    <SubHeading>Backend</SubHeading>
    <div className="mb-6 flex flex-wrap gap-2">
      {["Express 5", "Socket.IO 4", "Mongoose", "JWT", "Cloudinary SDK", "Multer"].map((t) => (
        <Badge key={t}>{t}</Badge>
      ))}
    </div>

    <SubHeading>Data & Infrastructure</SubHeading>
    <div className="mb-6 flex flex-wrap gap-2">
      {["MongoDB", "Cloudinary (media)", "Redis-ready patterns"].map((t) => (
        <Badge key={t}>{t}</Badge>
      ))}
    </div>

    <SubHeading>Build Commands</SubHeading>
    <CodeBlock>{`# Web
cd web
npm run dev     # start dev server
npm run build   # production build
npm run preview # preview build

# Server
cd server
npm run dev     # start dev server
npm run test    # run tests`}</CodeBlock>
  </div>
);

const ConceptsSection = () => (
  <div>
    <SectionHeading icon={Zap}>Concepts Used</SectionHeading>

    <SubHeading>Realtime Communication</SubHeading>
    <Body>
      Socket.IO rooms for per-user and per-chat targeting. Event-driven state updates in React and Zustand
      keep the UI in sync with server state without polling.
    </Body>

    <SubHeading>Media and Uploads</SubHeading>
    <Body>
      Signed direct Cloudinary uploads keep media off the core server. A backend fallback path handles
      edge cases. Progress and cancellation controls are managed via XHR for responsive feedback.
    </Body>
    <SubHeading>Realtime Messaging</SubHeading>
    <Body>
      Auth/session is managed via React context. Global realtime state (chats, messages, typing, presence)
      lives in Zustand. Feature-specific orchestration happens in dedicated hooks.
    </Body>
    <SubHeading>State Management</SubHeading>
    <Body>
      Zustand provides lightweight, scalable state management with persistence middleware for offline
      capability. React Query-like patterns handle server state synchronization.
    </Body>

    <SubHeading>UI/UX System</SubHeading>
    <Body>
      Tailwind utility-first styling with glassmorphism surfaces, a dark premium theme, and motion
      interactions via Framer Motion. The layout is responsive with distinct desktop and mobile behavior.
    </Body>

    <SubHeading>Security and Access</SubHeading>
    <Body>
      JWT authentication for both REST API and Socket.IO connections. Request validation and auth
      middleware protect endpoints. User-level permission checks enforce access control in services.
    </Body>
  </div>
);

const FeaturesSection = () => (
  <div>
    <SectionHeading icon={Shield}>Feature Coverage</SectionHeading>
    <Body>
      Complete feature set currently implemented in the web client.
    </Body>

    <div className="grid gap-4 sm:grid-cols-2">
      {[
        { title: "Authentication", items: ["Google sign-in", "JWT session management", "Mobile auth code flow", "Account disable/delete"] },
        { title: "Messaging", items: ["Realtime send/receive", "Message replies", "Emoji reactions", "Delete for me/everyone", "Read/delivered status"] },
        { title: "Media", items: ["Image upload", "File attachment", "Drag-and-drop support", "Upload progress + cancel"] },
        { title: "Social", items: ["Friend requests", "Accept/reject", "Block/unblock", "Unfriend", "User directory / explore"] },
        
        { title: "UI/UX", items: ["Dark theme", "Glassmorphism surfaces", "Motion animations", "Responsive layout", "Typing indicators", "Presence dots", "Notification toasts"] },
      ].map(({ title, items }) => (
        <div key={title} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 dark:border-white/5">
          <h4 className="mb-3 text-sm font-semibold text-ink dark:text-slate-200">{title}</h4>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-lagoon dark:bg-teal" />
                <span className="text-xs text-ink/60 dark:text-slate-400">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LimitsSection = () => (
  <div>
    <SectionHeading icon={Clock}>Current Limits</SectionHeading>

    <SubHeading>Technical</SubHeading>
    <div className="mb-4 space-y-2">
      {[
                "Push notifications are not finalized for production scale",
        "Large-file behavior depends on Cloudinary and client network",
      ].map((item) => (
        <div key={item} className="flex items-start gap-2 rounded-xl border border-amber-500/10 bg-amber-500/5 px-4 py-2.5 dark:border-amber-500/10 dark:bg-amber-500/5">
          <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span className="text-sm text-ink/70 dark:text-slate-300">{item}</span>
        </div>
      ))}
    </div>

    <SubHeading>Operational</SubHeading>
    <Body>
      Single-node-first deployment assumptions in parts of runtime state. Horizontal socket scaling
      requires adapter and infrastructure setup.
    </Body>

    <SubHeading>Product</SubHeading>
    <Body>
      1-to-1 communication only. Mobile app is still in active development.
    </Body>
  </div>
);

const StatusSection = () => (
  <div>
    <SectionHeading icon={GitBranch}>Project Status</SectionHeading>

    <SubHeading>Completed</SubHeading>
    <div className="mb-6 space-y-1.5">
      {[
        "Web migration to Vite completed",
        "Realtime chat and socket lifecycle integrated",
        "Social workflows (request/accept/reject/unfriend/block)",
        "Media upload pipeline with progress + fallback",
        "Notification surfaces and profile management",
        "Account disable/delete APIs and UI",
      ].map((item) => (
        <div key={item} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-sm text-ink/65 dark:text-slate-400">{item}</span>
        </div>
      ))}
    </div>

    <SubHeading>In Progress</SubHeading>
    <div className="mb-6 space-y-1.5">
      {[
        "Production hardening for large media and edge networking",
        "Mobile app parity and deep-link flows",
      ].map((item) => (
        <div key={item} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          <span className="text-sm text-ink/65 dark:text-slate-400">{item}</span>
        </div>
      ))}
    </div>

    <SubHeading>Pending</SubHeading>
    <div className="space-y-1.5">
      {[
                "Push notification production stack",
        "Full e2e automation coverage",
      ].map((item) => (
        <div key={item} className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          <span className="text-sm text-ink/65 dark:text-slate-400">{item}</span>
        </div>
      ))}
    </div>
  </div>
);

const sectionComponents: Record<SectionId, () => ReturnType<typeof OverviewSection>> = {
  overview: OverviewSection,
  architecture: ArchitectureSection,
  api: ApiSection,
  tech: TechSection,
  concepts: ConceptsSection,
  features: FeaturesSection,
  limits: LimitsSection,
  status: StatusSection,
};

export default function DocsPage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ActiveContent = sectionComponents[activeSection];

  return (
    <div className="ambient-grid relative min-h-dvh">
      {/* Ambient orbs */}
      <div className="animate-drift absolute left-[-7rem] top-[-6rem] h-72 w-72 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/15" />
      <div className="animate-drift absolute right-[-8rem] top-24 h-80 w-80 rounded-full bg-teal-400/18 blur-3xl [animation-delay:1.2s] dark:bg-teal-400/14" />
      <div className="animate-drift absolute bottom-[-8rem] left-[20%] h-72 w-72 rounded-full bg-orange-300/18 blur-3xl [animation-delay:2.2s] dark:bg-orange-400/12" />
      <div className="absolute inset-x-0 top-0 h-44 bg-[linear-gradient(180deg,rgba(255,255,255,0.52),transparent)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.55),transparent)]" />

      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-white/60 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/60">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink/50 transition hover:bg-ink/5 dark:text-slate-400 dark:hover:bg-white/5 lg:hidden"
            >
              <BookOpen className="h-4 w-4" />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-lagoon to-teal">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <span className="soft-heading text-lg font-semibold text-ink dark:text-slate-100">LinkUp</span>
            </button>
            <span className="text-ink/30 dark:text-slate-600">/</span>
            <span className="text-sm font-medium text-ink/60 dark:text-slate-400">Docs</span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-ink/50 transition hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to app
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar overlay on mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 mt-14 w-64 shrink-0 border-r border-white/5 bg-white/80 p-4 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/80 lg:sticky lg:top-14 lg:block lg:h-[calc(100dvh-3.5rem)] lg:translate-x-0 lg:bg-transparent dark:lg:bg-transparent",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <nav className="space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveSection(id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  activeSection === id
                    ? "bg-lagoon/10 text-lagoon dark:bg-teal/10 dark:text-teal"
                    : "text-ink/50 hover:bg-ink/5 hover:text-ink dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mx-auto max-w-3xl"
          >
            <ActiveContent />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
