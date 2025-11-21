import React, { Component, type ErrorInfo, type ReactNode } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { DossierViewer } from "./DossierViewer";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-100 border border-red-400 rounded">
          <h3 className="font-bold text-red-800">Error rendering DossierViewer</h3>
          <pre className="text-xs mt-2 text-red-700">{this.state.error?.message}</pre>
          <pre className="text-xs mt-1 text-red-600">{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

interface WelcomeLandingDossierViewProps {
  /**
   * Dossier document id created from the WelcomeLanding research flow.
   * This viewer keeps the layout scoped to the landing page experience.
   */
  documentId: Id<"documents">;
  /**
   * Optional className to let callers control outer spacing/height.
   */
  className?: string;
}

/**
 * WelcomeLandingDossierView
 *
 * Thin wrapper around DossierViewer that enables the "newspaper" variant
 * (Daily Prophet / WSJ style) specifically for dossiers generated from the
 * WelcomeLanding flow. Other surfaces should keep using the classic variant.
 */
export function WelcomeLandingDossierView({
  documentId,
  className,
}: WelcomeLandingDossierViewProps) {
  console.log('[WelcomeLandingDossierView] Rendering with documentId:', documentId);

  return (
    <div
      className={
        className ??
        "w-full h-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 bg-[var(--bg-secondary)]"
      }
    >
      {/* Debug info */}
      <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 rounded text-xs">
        <div><strong>Debug:</strong> WelcomeLandingDossierView is rendering</div>
        <div><strong>Document ID:</strong> {documentId}</div>
      </div>

      <ErrorBoundary>
        <DossierViewer
          documentId={documentId}
          isGridMode={false}
          isFullscreen={false}
          variant="newspaper"
        />
      </ErrorBoundary>
    </div>
  );
}

