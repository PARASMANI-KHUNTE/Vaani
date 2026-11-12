import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";
import { issueMobileAuthCode } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const ALLOWED_SCHEMES = new Set(["linkup", "canvaschat"]);

const buildDeepLink = (scheme: string, code: string) => {
  const normalizedScheme = scheme.replace(/:\/?\/?$/, "");
  return `${normalizedScheme}://auth?code=${encodeURIComponent(code)}`;
};

export const MobileAuthPage = () => {
  const { session, status, loginWithGoogleCredential } = useAuth();
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const hasStartedRedirectRef = useRef(false);

  const appScheme = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const scheme = params.get("appScheme") || "linkup";
    return ALLOWED_SCHEMES.has(scheme) ? scheme : "linkup";
  }, []);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (
      status === "authenticated" &&
      session?.backendAccessToken &&
      !hasStartedRedirectRef.current
    ) {
      hasStartedRedirectRef.current = true;

      const issueCodeAndRedirect = async () => {
        try {
          const payload = await issueMobileAuthCode(session.backendAccessToken);
          window.location.replace(buildDeepLink(appScheme, payload.code));
        } catch (error) {
          setBridgeError(
            error instanceof Error
              ? error.message
              : "Failed to prepare secure mobile sign-in handoff."
          );
          hasStartedRedirectRef.current = false;
        }
      };

      void issueCodeAndRedirect();
    }
  }, [appScheme, session?.backendAccessToken, status]);

  const handleGoogleSuccess = useCallback((response: CredentialResponse) => {
    void loginWithGoogleCredential(response).catch((error) => {
      setBridgeError(error instanceof Error ? error.message : "Google sign-in failed");
    });
  }, [loginWithGoogleCredential]);

  const handleGoogleError = useCallback(() => {
    setBridgeError("Google sign-in failed");
  }, []);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-6 py-10 text-fg">
      <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-brand/15 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-[110px]" />

      <div className="surface-elevated relative w-full max-w-lg rounded-[2rem] p-8">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-surface ring-1 ring-line">
            <img src="/linkup-logo.png" alt="" className="h-full w-full object-cover" />
          </span>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand">LinkUp</p>
        </div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-fg">
          Finishing your mobile sign-in
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          We are confirming your Google session and sending you back to the app.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-subtle/60 p-5 text-sm font-medium text-muted">
          {bridgeError
            ? <span className="text-rose-600 dark:text-rose-400">{bridgeError}</span>
            : status === "authenticated"
            ? "Redirecting back to LinkUp now..."
            : "Complete Google sign-in to continue..."}
        </div>

        {!session?.backendAccessToken ? (
          <div className="mt-6 flex justify-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
          </div>
        ) : null}
      </div>
    </main>
  );
};
