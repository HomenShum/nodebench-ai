/**
 * FounderDashboardTabs — Tab wrapper for the Founder Dashboard.
 *
 * Perplexity-style: one sidebar item ("Dashboard") with tabs inside
 * that absorb views previously listed as separate sidebar items.
 *
 * Route: /founder (with ?tab= for deep-linking)
 */

import { lazy, Suspense, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

/* ── Lazy-loaded sub-views ────────────────────────────────────────── */
const FounderDashboardView = lazy(() => import("./FounderDashboardView"));
const ContextIntakeView = lazy(() => import("./ContextIntakeView"));
const HistoryView = lazy(() => import("./HistoryView"));
const SessionDeltaView = lazy(() => import("./SessionDeltaView"));
const ExportView = lazy(() => import("./ExportView"));
const ChangeDetectorView = lazy(() => import("./ChangeDetectorView"));
const FounderStrategyView = lazy(() => import("./FounderStrategyView"));
const ProfilerInsights = lazy(() => import("../components/ProfilerInsights"));
const CostTransparency = lazy(() => import("../components/CostTransparency"));

/* ── Tab definitions ──────────────────────────────────────────────── */

type DashboardTab = "overview" | "strategy" | "intake" | "history" | "changes" | "delta" | "export" | "profiler" | "costs";

const PRIMARY_TABS: { id: DashboardTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "History" },
  { id: "changes", label: "Changes" },
  { id: "export", label: "Packets" },
];

const LEGACY_TAB_ALIASES: Partial<Record<DashboardTab, DashboardTab>> = {
  strategy: "overview",
  intake: "overview",
  delta: "changes",
  profiler: "overview",
  costs: "overview",
};

/* ── Skeleton ─────────────────────────────────────────────────────── */

function TabSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#d97757]" />
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */

export default function FounderDashboardTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as DashboardTab | null;
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    tabParam ? (LEGACY_TAB_ALIASES[tabParam] ?? tabParam) : "overview",
  );

  const switchTab = useCallback(
    (tab: DashboardTab) => {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParams);
      if (tab === "overview") {
        next.delete("tab");
      } else {
        next.set("tab", tab);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  return (
    <div className="flex h-full flex-col bg-[#151413]">
      <div className="shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
          Workspace
        </div>
        <div className="mt-1 text-sm text-white/70">
          Company truth, changes, packets, and next moves.
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-white/[0.06] px-4 py-2">
        {PRIMARY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={cn(
              "relative whitespace-nowrap rounded-full px-3 py-2 text-[12px] font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white/[0.06] text-accent-primary"
                : "text-white/40 hover:bg-white/[0.04] hover:text-white/70",
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent-primary" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-auto">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === "overview" && <FounderDashboardView />}
          {activeTab === "strategy" && <FounderStrategyView />}
          {activeTab === "intake" && <ContextIntakeView />}
          {activeTab === "history" && <HistoryView />}
          {activeTab === "changes" && <ChangeDetectorView />}
          {activeTab === "delta" && <SessionDeltaView />}
          {activeTab === "export" && <ExportView />}
          {activeTab === "profiler" && <div className="mx-auto max-w-4xl px-6 py-8"><ProfilerInsights /></div>}
          {activeTab === "costs" && <div className="mx-auto max-w-4xl px-6 py-8"><CostTransparency /></div>}
        </Suspense>
      </div>
    </div>
  );
}
