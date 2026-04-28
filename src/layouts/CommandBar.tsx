/**
 * CommandBar - bottom cockpit control strip.
 *
 * Left: mode-specific sub-views
 * Center: command surface entry point
 * Right: agent panel toggle
 */

import { useNavigate } from "react-router-dom";
import { memo, useCallback, useMemo } from "react";
import { useConvexAuth, useQuery} from "convex/react";
import { useConvexApi } from "@/lib/convexApi";
import { MessageSquare } from "lucide-react";
import {
  ICON_MAP,
  MODES,
  type CockpitMode,
  VIEW_TITLES,
} from "./cockpitModes";
import type { MainView } from "@/lib/registry/viewRegistry";
import { buildCockpitPathForView } from "@/lib/registry/viewRegistry";
import { haptic } from "@/lib/haptics";

const isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.userAgent);

interface CommandBarProps {
  mode: CockpitMode;
  currentView: MainView;
  onViewChange: (view: MainView) => void;
  onOpenPalette: () => void;
  onToggleAgent?: () => void;
  agentOpen?: boolean;
}

/** Badge counts from live Convex subscriptions — isolated here to avoid re-rendering CockpitLayout. */
function useBadgeCounts(): Partial<Record<CockpitMode, number>> {
  const api = useConvexApi();

  const { isAuthenticated } = useConvexAuth();
  const agentStats = useQuery(
    isAuthenticated && api?.domains.agents.agentHubQueries.getAgentStats
      ? api.domains.agents.agentHubQueries.getAgentStats
      : "skip",
    isAuthenticated ? {} : "skip",
  );
  const pendingHITL = useQuery(
    isAuthenticated && api?.domains.hitl.adjudicationWorkflow.getPendingAdjudicationRequests
      ? api.domains.hitl.adjudicationWorkflow.getPendingAdjudicationRequests
      : "skip",
    isAuthenticated ? {} : "skip",
  );
  return useMemo(() => {
    const counts: Partial<Record<CockpitMode, number>> = {};
    const activeAgents = agentStats?.activeNow ?? 0;
    if (activeAgents > 0) counts.agents = activeAgents;
    const pendingCount = Array.isArray(pendingHITL) ? pendingHITL.length : 0;
    if (pendingCount > 0) counts.system = pendingCount;
    return counts;
  }, [agentStats, pendingHITL]);
}

export const CommandBar = memo(function CommandBar({
  mode,
  currentView,
  onViewChange,
  onOpenPalette,
  onToggleAgent,
  agentOpen,
}: CommandBarProps) {
  const navigate = useNavigate();
  const badgeCounts = useBadgeCounts();
  const modeConfig = MODES.find((entry) => entry.id === mode);
  const modeViews = modeConfig?.views ?? [];

  const handleViewClick = useCallback((view: MainView) => {
    haptic("light");
    onViewChange(view);
    navigate(buildCockpitPathForView({ view }));
  }, [navigate, onViewChange]);



  return (
    <footer
      className="hud-border-t hud-glass hud-depth-bottom hud-mono shrink-0 select-none"
      aria-label="Command bar"
      data-agent-id="cockpit:command-bar"
    >
      {/* ── Desktop: sub-view tabs within current mode (unchanged) ── */}
      {modeViews.length > 1 && (
        <div
          role="navigation"
          className="hidden lg:flex overflow-x-auto scrollbar-none hud-border-b"
          aria-label="Sub-view navigation"
        >
          {modeViews.map((view) => {
            const isViewActive = view === currentView;
            return (
              <button
                key={view}
                type="button"
                className="hud-tab flex-none h-8"
                data-active={isViewActive ? "true" : undefined}
                aria-current={isViewActive ? "page" : undefined}
                style={isViewActive ? { color: modeConfig?.color } : undefined}
                onClick={() => handleViewClick(view)}
                data-agent-id={`cockpit:mobile-view:${view}`}
                data-agent-action="navigate"
                data-agent-label={VIEW_TITLES[view] ?? view}
              >
                {VIEW_TITLES[view] ?? view}
              </button>
            );
          })}
        </div>
      )}

      {/* Mobile surface navigation has been moved to MobileTabBar.tsx.
          The legacy Mission/Intel/Build/Agents/System mode bar that used
          to render here has been removed — it diverged from the current
          design kit (which uses Home/Chat/Reports/Inbox/Me as the
          canonical surface nav). The desktop Cmd+K palette hint also
          went with it; the keyboard shortcut still fires the palette,
          and the empty footer keeps grid-area: trace from collapsing.
          See the design alignment doc for the canonical chrome. */}
    </footer>
  );
});
