import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CredentialResponse } from "@react-oauth/google";
import { exchangeGoogleLogin, getAuthMe, unregisterPushToken } from "@/lib/api";
import { secureStorage } from "@/lib/secure-storage";

type BackendSession = {
  backendAccessToken: string;
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [session, setSession] = useState<BackendSession | null>(null);
  const [isSessionMode, setIsSessionMode] = useState(false);

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
        const normalizedSession: BackendSession = {
          backendAccessToken: storedSession.backendAccessToken,
          backendUser: {
            _id: me.user._id,
            name: me.user.name,
            email: me.user.email,
            avatar: me.user.avatar,
            lastSeen: me.user.lastSeen || null,
          },
        };
        setSession(normalizedSession);
        secureStorage.set(normalizedSession);
        setStatus("authenticated");
      } catch {
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
        const normalizedSession: BackendSession = {
          backendAccessToken: nextSession.accessToken,
          backendUser: {
            _id: nextSession.user._id,
            name: nextSession.user.name,
            email: nextSession.user.email,
            avatar: nextSession.user.avatar,
            lastSeen: nextSession.user.lastSeen || null,
          },
        };

        setSession(normalizedSession);
        secureStorage.set(normalizedSession);
        setStatus("authenticated");
      },
      logout: () => {
        const token = session?.backendAccessToken;
        const endpoint = token ? localStorage.getItem("webPushEndpoint") : null;
        if (token && endpoint) {
          void unregisterPushToken(token, endpoint).catch(console.error);
          localStorage.removeItem("webPushEndpoint");
        }
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
