/**
 * Canonical shared ErrorBoundary implementation.
 *
 * Legacy compatibility imports from `src/components/ErrorBoundary.tsx` re-export
 * this file so active shared and cockpit code can depend on one real source.
 */

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { reportError } from "@/lib/errorReporting";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  section?: string;
  /**
   * Legacy alias for `section`. Many existing callers (App.tsx, CockpitLayout,
   * ActiveSurfaceHost, etc.) pass `title` to label the failing region in the
   * fallback. Accepting both keeps the ~15 existing call sites type-clean
   * without requiring a rename sweep.
   */
  title?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private static isRecoverableChunkError(error: unknown): boolean {
    const message = String((error as any)?.message ?? error ?? "").toLowerCase();
    return (
      message.includes("failed to fetch dynamically imported module") ||
      message.includes("loading chunk") ||
      message.includes("chunkloaderror") ||
      message.includes("importing a module script failed")
    );
  }

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? `:${this.props.section}` : ""}] Error caught:`, error, errorInfo);
    reportError(error, { section: this.props.section });
    this.props.onError?.(error, errorInfo);

    if (typeof window !== "undefined" && ErrorBoundary.isRecoverableChunkError(error)) {
      const marker = `nb:chunk-reload:${window.location.pathname}`;
      if (sessionStorage.getItem(marker) !== "1") {
        sessionStorage.setItem(marker, "1");
        window.setTimeout(() => window.location.reload(), 120);
      }
    }
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
        <ErrorFallback
          section={this.props.section ?? this.props.title}
          error={this.state.error}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  section?: string;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function ErrorFallback({ section, error, onRetry, className = "" }: ErrorFallbackProps) {
  // Only show raw error messages in development — production users see a generic message
  const isDev = typeof import.meta !== "undefined" && (import.meta as any).env?.DEV;
  const userMessage = isDev && error?.message
    ? error.message
    : "An unexpected error occurred. Please try again.";

  return (
    <div className={`rounded-lg border border-red-200 bg-red-50 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-sm font-semibold text-red-800">
            {section ? `${section} failed to load` : "Something went wrong"}
          </h3>
          <p className="mb-3 text-sm text-red-600">
            {userMessage}
          </p>
          {onRetry ? (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-surface px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function FeedErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      section="Feed"
      error={new Error("Failed to load feed items. The news sources may be temporarily unavailable.")}
      onRetry={onRetry}
    />
  );
}

export function DigestErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      section="Morning Digest"
      error={new Error("Failed to generate your morning briefing. Please try refreshing.")}
      onRetry={onRetry}
    />
  );
}

export function BriefingErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      section="Briefing"
      error={new Error("Failed to load the executive brief. The data may still be generating.")}
      onRetry={onRetry}
    />
  );
}

export default ErrorBoundary;
