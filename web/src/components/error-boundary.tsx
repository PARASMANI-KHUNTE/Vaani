"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { handleError } from "@/lib/error-handler";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showHomeButton?: boolean;
  title?: string;
  description?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const appError = handleError(error, {
      context: "ErrorBoundary",
      severity: "high",
    });

    this.setState({ errorInfo });

    this.props.onError?.(error, errorInfo);

    if (process.env.NODE_ENV === "development") {
      console.group("ErrorBoundary caught an error:");
      console.error("Error:", error);
      console.error("Error Info:", errorInfo);
      console.error("App Error:", appError);
      console.groupEnd();
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="relative flex h-dvh flex-col items-center justify-center overflow-hidden bg-canvas p-6">
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-500/10 blur-[100px]" />
          <div className="relative max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold tracking-tight text-fg">
              {this.props.title || "Something went wrong"}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              {this.state.error?.message || this.props.description || "An unexpected error occurred. Please try again."}
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button onClick={this.handleRetry} className="btn-primary w-full sm:w-auto">
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
              {this.props.showHomeButton !== false && (
                <HomeButton />
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const HomeButton = () => {
  return (
    <button
      onClick={() => (window.location.href = "/")}
      className="btn-secondary w-full sm:w-auto"
    >
      <Home className="h-4 w-4" />
      Go home
    </button>
  );
};

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
  className?: string;
}

export const ErrorFallback = ({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
  onHome,
  className = "",
}: ErrorFallbackProps) => {
  return (
    <div className={`flex h-full min-h-[200px] flex-col items-center justify-center p-6 ${className}`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-fg">{title}</h3>
      <p className="mb-4 text-center text-sm leading-relaxed text-muted">{message}</p>
      <div className="flex gap-2">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary !px-4 !py-2 !text-xs">
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
        {onHome && (
          <button onClick={onHome} className="btn-secondary !px-4 !py-2 !text-xs">
            <Home className="h-4 w-4" />
            Home
          </button>
        )}
      </div>
    </div>
  );
};
