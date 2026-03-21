/**
 * StatusStrip — Clean top breadcrumb bar.
 * Left: NODEBENCH / Surface Title breadcrumb. Right: connection dot.
 * No ticker. No scrolling text. No data fetching.
 */

import { memo } from "react";
import { useConvexAuth } from "convex/react";
import { VIEW_TITLES } from "./cockpitModes";
import type { MainView } from "@/lib/registry/viewRegistry";

interface StatusStripProps {
  currentView: MainView;
  entityName?: string | null;
}

export const StatusStrip = memo(function StatusStrip({
  currentView,
  entityName,
}: StatusStripProps) {
  const viewTitle = VIEW_TITLES[currentView] ?? currentView;
  const { isAuthenticated, isLoading } = useConvexAuth();

  const dotClass = isLoading
    ? "bg-amber-400"
    : isAuthenticated
      ? "bg-emerald-500"
      : "bg-[var(--accent-primary)]";
  const dotTitle = isLoading ? "Reconnecting..." : isAuthenticated ? "Connected" : "Guest";

  return (
    <header
      className="flex items-center h-8 px-4 gap-3 border-b border-white/[0.06] bg-white/[0.01] shrink-0 select-none"
      role="banner"
      data-agent-id="cockpit:status-strip"
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 min-w-0 text-[11px] tracking-wide" aria-label="Breadcrumb">
        <span className="font-semibold uppercase text-content-muted">NODEBENCH</span>
        <span className="text-content-muted/60" aria-hidden="true">/</span>
        <span className="font-medium text-content-muted truncate">{viewTitle}</span>
        {entityName ? (
          <>
            <span className="text-content-muted/60" aria-hidden="true">/</span>
            <span className="font-medium text-content-muted truncate max-w-[160px]" title={entityName}>
              {entityName}
            </span>
          </>
        ) : null}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: connection dot only — timestamp lives in trace bar */}
      <div className="flex items-center gap-2 shrink-0 text-[11px] text-content-muted/70">
        <span>{dotTitle}</span>
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`}
          title={dotTitle}
          aria-label={dotTitle}
        />
      </div>
    </header>
  );
});
