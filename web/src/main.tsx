import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "@/lib/theme-context";
import { BrowserRouter } from "react-router-dom";
import App from "@/App";
import { AuthProvider } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import "@/globals.css";

if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = (...args: Parameters<typeof console.error>) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Cross-Origin-Opener-Policy")
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </ErrorBoundary>
);

