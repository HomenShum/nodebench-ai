/**
 * StatusStrip — Clean top breadcrumb bar.
 * Left: NODEBENCH / Surface Title breadcrumb. Right: system status + connection dot.
 * No ticker. No scrolling text. No data fetching.
 */

import { memo, useState, useEffect, useRef } from "react";
import { useConvexAuth } from "convex/react";
import { VIEW_TITLES } from "./cockpitModes";
import type { MainView } from "@/lib/registry/viewRegistry";

// ── System status types ────────────────────────────────────────────────────────

type SystemStatus = "operational" | "degraded" | "offline";

function useSystemStatus(): SystemStatus {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [convexDegraded, setConvexDegraded] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track online/offline events
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Convex degradation: if isLoading stays true for >5s, mark degraded
  useEffect(() => {
    if (isLoading) {
      loadingTimerRef.current = setTimeout(() => {
        setConvexDegraded(true);
      }, 5000);
    } else {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setConvexDegraded(false);
    }
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, [isLoading]);

  if (!isOnline) return "offline";
  if (convexDegraded) return "degraded";
  return "operational";
}

const STATUS_CONFIG: Record<SystemStatus, { dotClass: string; label: string }> = {
  operational: { dotClass: "bg-emerald-500", label: "All systems operational" },
  degraded: { dotClass: "bg-amber-400", label: "Backend connection issue" },
  offline: { dotClass: "bg-red-500", label: "You are offline" },
};

// ── Component ──────────────────────────────────────────────────────────────────

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
  const systemStatus = useSystemStatus();

  // Connection label (auth state)
  const connectionLabel = isLoading
    ? "Reconnecting..."
    : isAuthenticated
      ? "Connected"
      : "Guest";

  // System status indicator
  const { dotClass: statusDotClass, label: statusLabel } = STATUS_CONFIG[systemStatus];

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

        {/* System status dot — inline in breadcrumb area */}
        <span className="ml-2 flex items-center gap-1" title={statusLabel}>
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${statusDotClass}`}
            aria-label={statusLabel}
            role="status"
          />
        </span>
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: connection label + dot */}
      <div className="flex items-center gap-2 shrink-0 text-[11px] text-content-muted/70">
        <span>{connectionLabel}</span>
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${
            isLoading
              ? "bg-amber-400"
              : isAuthenticated
                ? "bg-emerald-500"
                : "bg-[var(--accent-primary)]"
          }`}
          title={connectionLabel}
          aria-label={connectionLabel}
        />
      </div>
    </header>
  );
});
