/**
 * CoordinationTabs — Tab wrapper for the Coordination surface.
 *
 * Absorbs: Coordination Hub, Command Center, Agent Oversight, Agent Brief.
 * Route: /founder/coordination (with ?tab= for deep-linking)
 */

import { lazy, Suspense, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

const CoordinationHubView = lazy(() => import("./CoordinationHubView"));
const CommandPanelView = lazy(() => import("./CommandPanelView"));
const AgentOversightView = lazy(() => import("./AgentOversightView"));

type CoordTab = "hub" | "command" | "agents";

const TABS: { id: CoordTab; label: string }[] = [
  { id: "hub", label: "Hub" },
  { id: "command", label: "Command" },
  { id: "agents", label: "Agents" },
];

function TabSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#d97757]" />
    </div>
  );
}

export default function CoordinationTabs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as CoordTab | null;
  const [activeTab, setActiveTab] = useState<CoordTab>(
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "hub",
  );

  const switchTab = useCallback(
    (tab: CoordTab) => {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParams);
      if (tab === "hub") {
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
      <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.06] px-4 pt-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={cn(
              "relative px-3 py-2 text-[12px] font-medium transition-colors",
              activeTab === tab.id
                ? "text-[#d97757]"
                : "text-white/40 hover:text-white/60",
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#d97757]" />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <Suspense fallback={<TabSkeleton />}>
          {activeTab === "hub" && <CoordinationHubView />}
          {activeTab === "command" && <CommandPanelView />}
          {activeTab === "agents" && <AgentOversightView />}
        </Suspense>
      </div>
    </div>
  );
}
