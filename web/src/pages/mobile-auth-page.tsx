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
    <main className="flex min-h-screen items-center justify-center bg-shell px-6 py-10 text-ink">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-700">
          LinkUp
        </p>
        <h1 className="mt-3 font-display text-4xl text-ink">
          Finishing your mobile sign-in
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          We are confirming your Google session and sending you back to the app.
        </p>

        <div className="mt-8 rounded-3xl bg-slate-100/70 p-5 text-sm text-slate-600">
          {bridgeError
            ? bridgeError
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
