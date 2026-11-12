import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CredentialResponse } from "@react-oauth/google";
import {
  exchangeGoogleLogin,
  getAuthMe,
  refreshAccessToken,
  revokeSession,
  setAuthRefreshHandler,
  unregisterPushToken,
} from "@/lib/api";
import { secureStorage } from "@/lib/secure-storage";

type BackendSession = {
  backendAccessToken: string;
  backendRefreshToken?: string;
  backendUser: {
    _id: string;
    name: string;
    email: string;
    avatar: string | null;
    lastSeen?: string | null;
  };
};

type AuthContextValue = {
  session: BackendSession | null;
  status: "loading" | "authenticated" | "unauthenticated";
  loginWithGoogleCredential: (response: CredentialResponse) => Promise<void>;
  logout: () => void;
  enableSessionMode: () => void;
  disableSessionMode: () => void;
  isSessionMode: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const normalizeSession = (
  accessToken: string,
  refreshToken: string | undefined,
  user: BackendSession["backendUser"]
): BackendSession => ({
  backendAccessToken: accessToken,
  backendRefreshToken: refreshToken,
  backendUser: {
    _id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    lastSeen: user.lastSeen || null,
  },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [session, setSession] = useState<BackendSession | null>(null);
  const [isSessionMode, setIsSessionMode] = useState(false);
  const sessionRef = useRef<BackendSession | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Let the API client transparently refresh expired access tokens.
  useEffect(() => {
    setAuthRefreshHandler({
      refresh: async () => {
        const refreshToken = sessionRef.current?.backendRefreshToken;
        if (!refreshToken) {
          return null;
        }

        try {
          const result = await refreshAccessToken(refreshToken);
          const currentSession = sessionRef.current;
          if (!currentSession) {
            return null;
          }

          const nextSession: BackendSession = {
            ...currentSession,
            backendAccessToken: result.accessToken,
          };

          sessionRef.current = nextSession;
          setSession(nextSession);
          secureStorage.set(nextSession);
          return result.accessToken;
        } catch {
          return null;
        }
      },
      onRefreshFailed: () => {
        sessionRef.current = null;
        secureStorage.remove();
        setSession(null);
        setStatus("unauthenticated");
      },
    });

    return () => {
      setAuthRefreshHandler(null);
    };
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setIsSessionMode(secureStorage.isSessionMode());
      const storedSession = secureStorage.get<BackendSession>();

      if (!storedSession?.backendAccessToken) {
        setStatus("unauthenticated");
        return;
      }

      try {
        const me = await getAuthMe(storedSession.backendAccessToken);
        const normalizedSession = normalizeSession(
          storedSession.backendAccessToken,
          storedSession.backendRefreshToken,
          me.user
        );
        sessionRef.current = normalizedSession;
        setSession(normalizedSession);
        secureStorage.set(normalizedSession);
        setStatus("authenticated");
      } catch {
        sessionRef.current = null;
        secureStorage.remove();
        setSession(null);
        setStatus("unauthenticated");
      }
    };

    void bootstrap();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      status,
      loginWithGoogleCredential: async (response: CredentialResponse) => {
        const idToken = response.credential;
        if (!idToken) {
          throw new Error("Google did not return an ID token");
        }

        const nextSession = await exchangeGoogleLogin(idToken);
        const normalizedSession = normalizeSession(
          nextSession.accessToken,
          nextSession.refreshToken,
          nextSession.user
        );

        sessionRef.current = normalizedSession;
        setSession(normalizedSession);
        secureStorage.set(normalizedSession);
        setStatus("authenticated");
      },
      logout: () => {
        const currentSession = sessionRef.current;
        const token = currentSession?.backendAccessToken;
        const refreshToken = currentSession?.backendRefreshToken;
        const endpoint = token ? localStorage.getItem("webPushEndpoint") : null;

        if (token && endpoint) {
          void unregisterPushToken(token, endpoint).catch(console.error);
          localStorage.removeItem("webPushEndpoint");
        }
        if (refreshToken) {
          void revokeSession(refreshToken).catch(console.error);
        }

        sessionRef.current = null;
        secureStorage.remove();
        setSession(null);
        setStatus("unauthenticated");
      },
      enableSessionMode: () => {
        secureStorage.enableSessionMode();
        setIsSessionMode(true);
      },
      disableSessionMode: () => {
        secureStorage.disableSessionMode();
        setIsSessionMode(false);
      },
      isSessionMode,
    }),
    [session, status, isSessionMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
};
