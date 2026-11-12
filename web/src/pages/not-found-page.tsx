import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";

export const NotFoundPage = () => {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-6 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-brand/15 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-accent/10 blur-[110px]" />

      <div className="surface-panel relative w-full max-w-md rounded-[32px] px-8 py-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand">404</p>
        <h1 className="soft-heading mt-3 text-4xl font-semibold text-fg">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The page you were trying to reach does not exist. Head back to the chat workspace and keep the conversation moving.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Link to="/" className="btn-primary w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" />
            Back to chats
          </Link>
          <Link to="/explore" className="btn-secondary w-full sm:w-auto">
            <Compass className="h-4 w-4" />
            Explore people
          </Link>
        </div>
      </div>
    </main>
  );
};
