import { memo, useEffect, useRef, useState } from "react";
import { useConvexAuth } from "convex/react";
import { ChevronDown, ChevronLeft, MoreHorizontal, Search, Share2 } from "lucide-react";
import { VIEW_TITLES } from "./cockpitModes";
import type { MainView } from "@/lib/registry/viewRegistry";

type SystemStatus = "operational" | "degraded" | "offline";

function useSystemStatus(): SystemStatus {
  const { isLoading } = useConvexAuth();
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [convexDegraded, setConvexDegraded] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

interface StatusStripProps {
  currentView: MainView;
  entityName?: string | null;
  chatHasSession?: boolean;
  onOpenPalette?: () => void;
}

export const StatusStrip = memo(function StatusStrip({
  currentView,
  entityName,
  chatHasSession = false,
  onOpenPalette,
}: StatusStripProps) {
  const viewTitle = VIEW_TITLES[currentView] ?? currentView;
  const isChatView = viewTitle === "Chat";
  const { isAuthenticated, isLoading } = useConvexAuth();
  const systemStatus = useSystemStatus();

  const connectionLabel = isLoading
    ? "Reconnecting..."
    : isAuthenticated
      ? "Connected"
      : "Guest";
  const { dotClass: statusDotClass, label: statusLabel } = STATUS_CONFIG[systemStatus];
  const headerTitle = entityName?.trim() || "NodeBench";
  const showDropdownCue = !chatHasSession;

  if (isChatView) {
    return (
      <header
        className="flex shrink-0 items-end justify-between border-b border-white/[0.08] bg-[rgba(15,18,23,0.98)] px-3.5 pb-2 pt-[max(8px,env(safe-area-inset-top))] shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_14px_30px_-20px_rgba(0,0,0,0.78)] backdrop-blur-2xl"
        role="banner"
        data-agent-id="cockpit:status-strip"
      >
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("nodebench:chat-header-action", {
                  detail: { action: "threads" },
                }),
              );
            }
          }}
          className="nb-pressable inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.035] text-gray-50 shadow-[0_12px_26px_-18px_rgba(0,0,0,0.92)] hover:bg-white/[0.07] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
          aria-label="Show threads"
        >
          <ChevronLeft className="h-5.5 w-5.5" />
        </button>

        <div className="flex min-w-0 flex-1 justify-center px-2.5">
          <div
            className="inline-flex min-w-0 max-w-[208px] items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.035] px-4.5 py-2.5 text-[15px] font-semibold tracking-[-0.02em] text-gray-50 shadow-[0_16px_32px_-20px_rgba(0,0,0,0.94)]"
            aria-label={`${headerTitle} · ${connectionLabel}`}
            title={statusLabel}
          >
            <span className="truncate">{headerTitle}</span>
            {showDropdownCue ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : null}
          </div>
        </div>

        <div className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.035] p-1 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.92)]">
          {chatHasSession ? (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("nodebench:chat-header-action", {
                      detail: { action: "share-thread" },
                    }),
                  );
                }
              }}
              className="nb-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-100 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              aria-label="Share thread"
            >
              <Share2 className="h-4 w-4" />
            </button>
          ) : onOpenPalette ? (
            <button
              type="button"
              onClick={onOpenPalette}
              className="nb-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-100 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              aria-label="Open search"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : null}
          {chatHasSession ? (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("nodebench:chat-header-action", {
                      detail: { action: "thread-actions" },
                    }),
                  );
                }
              }}
              className="nb-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-100 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              aria-label="Thread actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("nodebench:chat-header-action", {
                      detail: { action: "threads" },
                    }),
                  );
                }
              }}
              className="nb-pressable inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-100 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              aria-label="Show recent threads"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </header>
    );
  }

  return (
    <header
      className="flex h-8 shrink-0 select-none items-center gap-3 border-b border-white/[0.06] bg-white/[0.01] px-4"
      role="banner"
      data-agent-id="cockpit:status-strip"
    >
      <nav className="flex min-w-0 items-center gap-1.5 text-[12px] tracking-wide" aria-label="Breadcrumb">
        <span className="font-semibold uppercase text-content-muted">NODEBENCH</span>
        <span className="text-content-muted/60" aria-hidden="true">
          /
        </span>
        <span className="truncate font-medium text-content-muted">{viewTitle}</span>
        {entityName ? (
          <>
            <span className="text-content-muted/60" aria-hidden="true">
              /
            </span>
            <span className="max-w-[160px] truncate font-medium text-content-muted" title={entityName}>
              {entityName}
            </span>
          </>
        ) : null}
        <span className="ml-1.5 flex items-center gap-1" title={statusLabel}>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${statusDotClass}`}
            aria-label={statusLabel}
            role="status"
          />
        </span>
      </nav>

      <div className="flex-1" />

      {(isAuthenticated || isLoading) && (
        <div className="hidden shrink-0 items-center gap-2 text-[12px] text-content-muted/70 xl:flex">
          <span>{connectionLabel}</span>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isLoading ? "bg-amber-400" : "bg-emerald-500"
            }`}
            title={connectionLabel}
            aria-label={connectionLabel}
          />
        </div>
      )}
      {onOpenPalette ? (
        <button
          type="button"
          onClick={onOpenPalette}
          className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] text-content-muted/80 transition hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
          aria-label="Open search"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </header>
  );
});
