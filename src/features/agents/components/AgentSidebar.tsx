/**
 * AgentSidebar.tsx
 *
 * Right sidebar for Agents Hub matching Documents/Calendar pattern.
 * Contains: Queue panel, Recent runs, Memory stats.
 */

import React, { memo, useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Brain,
  Activity,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import type { SwarmStatus } from "@/hooks/useSwarm";

// ============================================================================
// Types
// ============================================================================

interface AgentSidebarProps {
  className?: string;
}

interface SwarmSummary {
  _id: string;
  swarmId: string;
  name?: string;
  query: string;
  status: SwarmStatus;
  createdAt: number;
  completedAt?: number;
  elapsedMs?: number;
}

// ============================================================================
// Queue Panel Component
// ============================================================================

const QueuePanel = memo(function QueuePanel() {
  // Get active swarms
  const swarms = useQuery(api.domains.agents.swarmQueries.listUserSwarms, { limit: 5 });
  const pendingRequests = useQuery(api.domains.agents.humanInTheLoop.getAllPendingRequests);

  const activeSwarms = swarms?.filter((s) =>
    ["pending", "spawning", "executing", "gathering", "synthesizing"].includes(s.status)
  ) || [];

  const pendingCount = pendingRequests?.length || 0;
  const activeCount = activeSwarms.length;

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-3">
      <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Queue Status
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {/* Active Agents */}
        <div className="p-2 bg-[var(--bg-secondary)] rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {activeCount > 0 ? (
              <Loader2 className="w-3 h-3 animate-spin text-green-500" />
            ) : (
              <Zap className="w-3 h-3 text-[var(--text-muted)]" />
            )}
          </div>
          <div className={cn(
            "text-lg font-bold",
            activeCount > 0 ? "text-green-600" : "text-[var(--text-muted)]"
          )}>
            {activeCount}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Active</div>
        </div>

        {/* Pending Approvals */}
        <div className="p-2 bg-[var(--bg-secondary)] rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <AlertCircle className={cn(
              "w-3 h-3",
              pendingCount > 0 ? "text-amber-500" : "text-[var(--text-muted)]"
            )} />
          </div>
          <div className={cn(
            "text-lg font-bold",
            pendingCount > 0 ? "text-amber-600" : "text-[var(--text-muted)]"
          )}>
            {pendingCount}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Pending</div>
        </div>
      </div>

      {/* Active Swarm List */}
      {activeSwarms.length > 0 && (
        <div className="mt-3 space-y-2">
          {activeSwarms.slice(0, 3).map((swarm) => (
            <div
              key={swarm._id}
              className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg"
            >
              <Loader2 className="w-3 h-3 animate-spin text-[var(--accent-primary)] flex-shrink-0" />
              <span className="text-[11px] text-[var(--text-secondary)] truncate flex-1">
                {swarm.query?.slice(0, 40) || "Running..."}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] capitalize">
                {swarm.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Recent Runs Component
// ============================================================================

const RecentRuns = memo(function RecentRuns() {
  const swarms = useQuery(api.domains.agents.swarmQueries.listUserSwarms, { limit: 10 }) as SwarmSummary[] | undefined;

  const recentSwarms = swarms?.filter((s) =>
    ["completed", "failed", "cancelled"].includes(s.status)
  ).slice(0, 5) || [];

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (recentSwarms.length === 0) {
    return (
      <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-3">
        <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          Recent Runs
        </h4>
        <p className="text-[11px] text-[var(--text-muted)] text-center py-4">
          No recent agent runs
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-3">
      <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <Clock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Recent Runs
      </h4>

      <div className="space-y-2">
        {recentSwarms.map((swarm) => (
          <div
            key={swarm._id}
            className="flex items-start gap-2 p-2 bg-[var(--bg-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
          >
            {/* Status Icon */}
            {swarm.status === "completed" ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : swarm.status === "failed" ? (
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[var(--text-primary)] truncate">
                {swarm.query?.slice(0, 50) || "Agent run"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {formatTimeAgo(swarm.createdAt)}
                </span>
                {swarm.elapsedMs && (
                  <span className="text-[10px] text-[var(--text-muted)]">
                    • {formatTime(swarm.elapsedMs)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// Memory Stats Component
// ============================================================================

const MemoryStats = memo(function MemoryStats() {
  // Placeholder stats - would connect to agentMemory queries
  const stats = {
    episodicCount: 142,
    keyValueCount: 38,
    deduplicationRate: 94,
    tokenUsage: 12400,
  };

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)] p-3">
      <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <Brain className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Memory Stats
      </h4>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)]">Episodic Memories</span>
          <span className="text-[11px] font-medium text-[var(--text-primary)]">
            {stats.episodicCount}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)]">Key-Value Entries</span>
          <span className="text-[11px] font-medium text-[var(--text-primary)]">
            {stats.keyValueCount}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-muted)]">Deduplication</span>
          <span className="text-[11px] font-medium text-green-600">
            {stats.deduplicationRate}%
          </span>
        </div>

        {/* Token Usage Bar */}
        <div className="pt-2 border-t border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text-muted)]">Token Usage</span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {(stats.tokenUsage / 1000).toFixed(1)}k / 50k
            </span>
          </div>
          <div className="h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] rounded-full"
              style={{ width: `${(stats.tokenUsage / 50000) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Quick Stats Component
// ============================================================================

const QuickStats = memo(function QuickStats() {
  const swarms = useQuery(api.domains.agents.swarmQueries.listUserSwarms, { limit: 100 });

  const stats = React.useMemo(() => {
    if (!swarms) return { total: 0, completed: 0, successRate: 0 };

    const completed = swarms.filter((s) => s.status === "completed").length;
    const failed = swarms.filter((s) => s.status === "failed").length;
    const total = completed + failed;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total: swarms.length, completed, successRate };
  }, [swarms]);

  return (
    <div className="bg-gradient-to-br from-[var(--accent-primary-bg)] to-[var(--bg-secondary)] rounded-lg border border-[var(--accent-primary)]/20 p-3">
      <h4 className="text-xs font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <BarChart3 className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
        Performance
      </h4>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-[var(--accent-primary)]">
            {stats.total}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Total</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">
            {stats.completed}
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Success</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[var(--text-primary)]">
            {stats.successRate}%
          </div>
          <div className="text-[10px] text-[var(--text-muted)]">Rate</div>
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const AgentSidebar = memo(function AgentSidebar({ className }: AgentSidebarProps) {
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("agentsSidebar.open") || "true");
    } catch {
      return true;
    }
  });

  const sidebarRef = useRef<HTMLDivElement>(null);

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem("agentsSidebar.open", JSON.stringify(isOpen));
    } catch {
      // noop
    }
  }, [isOpen]);

  // Publish width for overlay padding
  useEffect(() => {
    const el = sidebarRef.current;
    const update = () => {
      if (!el) return;
      const cs = window.getComputedStyle(el);
      const pos = cs.position;
      const isOverlay = pos === "absolute" || pos === "fixed";
      const w = Math.ceil(el.getBoundingClientRect().width);
      try {
        document.documentElement.style.setProperty(
          "--right-overlay-padding",
          isOverlay && w > 0 ? `${w}px` : "0px"
        );
      } catch {
        // noop
      }
    };
    update();
    let ro: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== "undefined" && el) {
        ro = new ResizeObserver(() => update());
        ro.observe(el);
      }
    } catch {
      // noop
    }
    window.addEventListener("resize", update);
    return () => {
      try {
        document.documentElement.style.setProperty("--right-overlay-padding", "0px");
      } catch {
        // noop
      }
      window.removeEventListener("resize", update);
      if (ro) {
        try {
          ro.disconnect();
        } catch {
          // noop
        }
      }
    };
  }, [isOpen]);

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "shrink-0 border-l border-[var(--border-color)] bg-[var(--bg-primary)] relative z-20",
        isOpen ? "w-[280px] md:w-[320px] p-3" : "w-[18px] p-0",
        className
      )}
    >
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className={cn(
          "absolute -left-2 top-3 w-4 h-6 rounded-sm",
          "border border-[var(--border-color)] bg-[var(--bg-primary)]",
          "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]",
          "flex items-center justify-center shadow-sm"
        )}
      >
        {isOpen ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Sidebar Content */}
      {isOpen && (
        <div className="space-y-4">
          <QuickStats />
          <QueuePanel />
          <RecentRuns />
          <MemoryStats />
        </div>
      )}
    </aside>
  );
});

export default AgentSidebar;
