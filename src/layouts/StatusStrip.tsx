/**
 * StatusStrip - top cockpit ambient telemetry strip.
 */

import { memo, useEffect, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { VIEW_TITLES } from "./cockpitModes";
import type { MainView } from "../hooks/useMainLayoutRouting";

interface StatusStripProps {
  currentView: MainView;
  modeLabel: string;
  modeColor: string;
  modeDescription: string;
  entityName?: string | null;
}

function useClockTime() {
  const [time, setTime] = useState(() => formatTime());

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    let timeoutId: ReturnType<typeof setTimeout>;

    const start = () => {
      const tick = () => setTime(formatTime());
      const msToNextMinute = 60_000 - (Date.now() % 60_000);
      timeoutId = setTimeout(() => {
        tick();
        intervalId = setInterval(tick, 60_000);
      }, msToNextMinute);
    };

    const stop = () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        setTime(formatTime());
        start();
      }
    };

    start();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return time;
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export const StatusStrip = memo(function StatusStrip({
  currentView,
  modeLabel,
  modeColor,
  modeDescription,
  entityName,
}: StatusStripProps) {
  const time = useClockTime();
  const viewTitle = VIEW_TITLES[currentView] ?? currentView;
  const { isAuthenticated, isLoading } = useConvexAuth();
  const dashboardSnapshot = useQuery(api.domains.research.dashboardQueries.getLatestDashboardSnapshot);
  const dealFlow = useQuery(api.domains.research.dealFlowQueries.getDealFlow);
  const trendingRepos = useQuery(api.domains.research.githubExplorer.getTrendingRepos, { limit: 3 });
  const systemHealth = useQuery(api.domains.observability.healthMonitor.getSystemHealth);
  const agentStats = useQuery(
    api.domains.agents.agentHubQueries.getAgentStats,
    isAuthenticated ? {} : "skip",
  );

  const dotClass = isLoading
    ? "bg-amber-400"
    : isAuthenticated
      ? "bg-emerald-500"
      : "bg-red-500";
  const dotTitle = isLoading ? "Reconnecting..." : isAuthenticated ? "Connected" : "Disconnected";

  const deals = Array.isArray(dealFlow) ? dealFlow : [];
  const repos = Array.isArray(trendingRepos) ? trendingRepos : [];
  const topRepo = repos[0]?.fullName ?? repos[0]?.name ?? "repo feed warming";
  const topStat = dashboardSnapshot?.dashboardMetrics?.keyStats?.[0];

  const segment = !isAuthenticated
    ? `${modeDescription} | guest mode | sign in to unlock deeper workflows | `
    : agentStats === undefined
      ? `${modeDescription} | syncing control plane | `
      : `${modeDescription} | ${agentStats.activeNow} agents active | ${agentStats.tasksCompleted} tasks completed | ${deals.length} capital signals live | ${topRepo} on GitHub radar | health:${systemHealth?.overall ?? "monitoring"} | ${topStat?.label ?? "dashboard"} ${topStat?.value ?? "pending"} | `;
  const tickerContent = segment + segment;
  const tickerDuration = `${Math.max(16, Math.round(segment.length * 0.18))}s`;

  return (
    <header
      className="flex items-center h-8 px-3 gap-3 hud-border-b hud-glass hud-depth-top hud-border-beam hud-mono shrink-0 select-none"
      role="banner"
      data-agent-id="cockpit:status-strip"
    >
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <span
          key={modeLabel}
          className="hud-label hud-label-active hud-label-acquire hud-text-emit shrink-0"
          style={{ color: modeColor }}
        >
          {modeLabel}
        </span>
        <span className="hud-label" aria-hidden="true">/</span>
        <span className="hud-label hud-label-active truncate">{viewTitle}</span>
        {entityName ? (
          <>
            <span className="hud-label" aria-hidden="true">/</span>
            <span className="hud-label hud-label-active truncate max-w-[120px]" title={entityName}>
              {entityName}
            </span>
          </>
        ) : null}
      </div>

      <div className="flex-1 overflow-hidden min-w-0 flex items-center" aria-hidden="true">
        <span
          className="hud-ticker hud-label whitespace-nowrap inline-block px-4"
          style={{ animationDuration: tickerDuration }}
        >
          {tickerContent}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden xl:inline hud-label text-[var(--hud-text-dim)]">
          {dashboardSnapshot?.dateString ?? "live"}
        </span>
        <span className="hud-label tabular-nums">{time}</span>
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass} hud-dot-pulse`}
          title={dotTitle}
          aria-label={dotTitle}
        />
      </div>
    </header>
  );
});
