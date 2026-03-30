import { ChatShell } from "@/components/chat-shell";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-10">
      <div className="animate-drift absolute left-[-8rem] top-[-5rem] h-64 w-64 rounded-full bg-ember/10 blur-3xl" />
      <div className="animate-drift absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-lagoon/10 blur-3xl [animation-delay:1.2s]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),transparent)]" />
      <div className="relative mx-auto max-w-7xl animate-fade-up">
        <ChatShell />
      </div>
    </main>
  );
}
