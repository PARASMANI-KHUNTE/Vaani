export const NotFoundPage = () => {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="surface-panel max-w-md rounded-[32px] px-8 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-lagoon/70">404</p>
        <h1 className="soft-heading mt-3 text-4xl font-semibold text-ink">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-ink/60">
          The page you were trying to reach does not exist. Head back to the chat workspace and keep the conversation moving.
        </p>
      </div>
    </main>
  );
};
