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
        <div className="flex h-dvh flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              {this.props.title || "Something went wrong"}
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              {this.state.error?.message || this.props.description || "An unexpected error occurred. Please try again."}
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 active:scale-[0.98]"
              >
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
      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
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
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
      <p className="mb-4 text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>
      <div className="flex gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        )}
        {onHome && (
          <button
            onClick={onHome}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <Home className="h-4 w-4" />
            Home
          </button>
        )}
      </div>
    </div>
  );
};
