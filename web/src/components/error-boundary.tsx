"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-dvh flex-col items-center justify-center bg-slate-50 p-6 dark:bg-slate-950">
          <div className="max-w-md text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
              {this.state.error?.message || "An unexpected error occurred. Please try again."}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
