/**
 * AutonomousOperationsPanel.tsx
 *
 * Displays the status of autonomous cron jobs in the research system.
 * Shows health status, last run time, and key metrics for each job.
 */

import React, { memo, useState } from "react";
import { useQuery } from "convex/react";
import {
  Activity,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CircleDot,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";

// ============================================================================
// Types
// ============================================================================

interface CronStatus {
  component: string;
  displayName: string;
  interval: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastRun: number | null;
  latencyP50: number | null;
  latencyP99: number | null;
  errorRate: number | null;
  queueDepth: number | null;
  isHealthy: boolean;
  isDelayed: boolean;
}

// ============================================================================
// Status Indicator
// ============================================================================

const StatusIcon = memo(function StatusIcon({
  status,
  isDelayed,
}: {
  status: CronStatus["status"];
  isDelayed: boolean;
}) {
  if (isDelayed) {
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
  }

  switch (status) {
    case "healthy":
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "degraded":
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
    case "down":
      return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    default:
      return <CircleDot className="w-3.5 h-3.5 text-[var(--text-muted)]" />;
  }
});

// ============================================================================
// Cron Job Card
// ============================================================================

const CronJobCard = memo(function CronJobCard({ job }: { job: CronStatus }) {
  const formatTimeAgo = (timestamp: number | null): string => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const statusColor = job.isDelayed
    ? "border-amber-500/30 bg-amber-500/5"
    : job.status === "healthy"
      ? "border-green-500/30 bg-green-500/5"
      : job.status === "degraded"
        ? "border-amber-500/30 bg-amber-500/5"
        : job.status === "down"
          ? "border-red-500/30 bg-red-500/5"
          : "border-[var(--border-color)]";

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        statusColor
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon status={job.status} isDelayed={job.isDelayed} />
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {job.displayName}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />
              {job.interval}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(job.lastRun)}
            </span>
          </div>
        </div>
        {job.latencyP50 !== null && (
          <div className="text-right text-[11px]">
            <div className="text-[var(--text-muted)]">P50</div>
            <div className="font-mono text-[var(--text-secondary)]">
              {job.latencyP50 < 1000
                ? `${job.latencyP50}ms`
                : `${(job.latencyP50 / 1000).toFixed(1)}s`}
            </div>
          </div>
        )}
      </div>
      {job.queueDepth !== null && job.queueDepth > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
          <span className="text-[11px] text-[var(--text-muted)]">
            Queue depth: <span className="font-mono">{job.queueDepth}</span>
          </span>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const AutonomousOperationsPanel = memo(function AutonomousOperationsPanel() {
  const [isExpanded, setIsExpanded] = useState(true);

  const cronStatuses = useQuery(
    api.domains.agents.agentHubQueries.getAutonomousCronStatus
  ) as CronStatus[] | undefined;

  const healthyCount = cronStatuses?.filter((c) => c.isHealthy).length ?? 0;
  const totalCount = cronStatuses?.length ?? 0;

  return (
    <div className="bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--bg-hover)] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Autonomous Operations
          </h3>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
              healthyCount === totalCount
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            )}
          >
            {healthyCount}/{totalCount} healthy
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-4">
          {cronStatuses === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : cronStatuses.length === 0 ? (
            <div className="text-center py-6 text-sm text-[var(--text-muted)]">
              No autonomous operations configured
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {cronStatuses.map((job) => (
                <CronJobCard key={job.component} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AutonomousOperationsPanel;
