/**
 * ErrorBoundary - Catches React errors and displays fallback UI
 *
 * Usage:
 * <ErrorBoundary fallback={<FeedErrorFallback />}>
 *   <FeedSection />
 * </ErrorBoundary>
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. If not provided, uses default error card */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Section name for error logging */
  section?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? `:${this.props.section}` : ''}] Error caught:`, error, errorInfo);
    this.props.onError?.(error, errorInfo);
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
          section={this.props.section}
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

export function ErrorFallback({ section, error, onRetry, className = '' }: ErrorFallbackProps) {
  return (
    <div className={`rounded-xl border border-red-200 bg-red-50 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            {section ? `${section} failed to load` : 'Something went wrong'}
          </h3>
          <p className="text-sm text-red-600 mb-3">
            {error?.message || 'An unexpected error occurred. Please try again.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Specialized error fallback for feed section
 */
export function FeedErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      section="Feed"
      error={new Error('Failed to load feed items. The news sources may be temporarily unavailable.')}
      onRetry={onRetry}
    />
  );
}

/**
 * Specialized error fallback for morning digest
 */
export function DigestErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      section="Morning Digest"
      error={new Error('Failed to generate your morning briefing. Please try refreshing.')}
      onRetry={onRetry}
    />
  );
}

/**
 * Specialized error fallback for briefing/acts section
 */
export function BriefingErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorFallback
      section="Briefing"
      error={new Error('Failed to load the executive brief. The data may still be generating.')}
      onRetry={onRetry}
    />
  );
}

export default ErrorBoundary;
