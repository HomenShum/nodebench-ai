/**
 * AutonomousOperationsPanel.tsx
 *
 * Displays the status of autonomous cron jobs in the research system.
 * Shows health status, last run time, and key metrics for each job.
 */

import React, { memo, useState } from "react";
import { useAction, useQuery } from "convex/react";
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
  Shield,
  Wrench,
  Siren,
  Sparkles,
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

interface ControlTowerSnapshot {
  generatedAt: number;
  health: {
    overall: "healthy" | "degraded" | "unhealthy" | "unknown";
    latestCheckAt: number | null;
    activeAlertCount: number;
    unhealthyComponents: string[];
    degradedComponents: string[];
  };
  healing: {
    attempted24h: number;
    succeeded24h: number;
    failed24h: number;
    escalated24h: number;
    successRate24h: number;
    recentActions: Array<{
      issue: string;
      actionType: string;
      status: string;
      timestamp: number;
      result: string | null;
    }>;
  };
  maintenance: {
    lastRunAt: number | null;
    passed: boolean;
    workflowId: string | null;
    errorCount: number;
    warningCount: number;
    errors: string[];
    warnings: string[];
    hotspotSync: { created?: number; updated?: number; total?: number } | null;
    autoInvestigate: { investigated?: number; sessionIds?: string[] } | null;
  };
  loops: {
    intentHotspots: {
      total: number;
      byColumn: Record<string, number>;
    };
    bugCards: {
      total: number;
      byColumn: Record<string, number>;
    };
  };
  attentionItems: Array<{
    severity: "critical" | "warning" | "info";
    title: string;
    detail: string;
  }>;
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
      return <CircleDot className="w-3.5 h-3.5 text-content-muted" />;
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
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const statusColor = job.isDelayed
    ? "border-amber-500/30 bg-amber-500/5"
    : job.status === "healthy"
      ? "border-green-500/30 bg-green-500/5"
      : job.status === "degraded"
        ? "border-amber-500/30 bg-amber-500/5"
        : job.status === "down"
          ? "border-red-500/30 bg-red-500/5"
          : "border-edge";

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
            <span className="text-sm font-medium text-content truncate">
              {job.displayName}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-content-muted">
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
          <div className="text-right text-xs">
            <div className="text-content-muted">P50</div>
            <div className="font-mono text-content-secondary">
              {job.latencyP50 < 1000
                ? `${job.latencyP50}ms`
                : `${(job.latencyP50 / 1000).toFixed(1)}s`}
            </div>
          </div>
        )}
      </div>
      {job.queueDepth !== null && job.queueDepth > 0 && (
        <div className="mt-2 pt-2 border-t border-edge">
          <span className="text-xs text-content-muted">
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
  const [isRunning, setIsRunning] = useState(false);

  const cronStatuses = useQuery(
    api.domains.agents.agentHubQueries.getAutonomousCronStatus
  ) as CronStatus[] | undefined;
  const controlTower = useQuery(
    api.domains.operations.autonomousControlTower.getAutonomousControlTowerSnapshot,
  ) as ControlTowerSnapshot | undefined;
  const runAutonomousMaintenanceNow = useAction(
    api.domains.operations.autonomousControlTower.runAutonomousMaintenanceNow,
  );

  const healthyCount = cronStatuses?.filter((c) => c.isHealthy).length ?? 0;
  const totalCount = cronStatuses?.length ?? 0;
  const snapshotLoading = controlTower === undefined;
  const healthTone =
    controlTower?.health.overall === "unhealthy"
      ? "text-red-600 border-red-500/20 bg-red-500/10"
      : controlTower?.health.overall === "degraded"
        ? "text-amber-600 border-amber-500/20 bg-amber-500/10"
        : controlTower?.health.overall === "healthy"
          ? "text-green-600 border-green-500/20 bg-green-500/10"
          : "text-content-muted border-edge bg-surface-secondary/50";

  const formatTimeAgo = (timestamp: number | null): string => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-surface rounded-lg border border-edge">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md text-left transition-colors hover:bg-surface-hover"
          aria-expanded={isExpanded}
          aria-controls="autonomous-operations-panel"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm font-semibold text-content">
              Autonomous Operations
            </h3>
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-full text-xs font-medium border",
                healthyCount === totalCount && totalCount > 0
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : healthyCount === 0
                    ? "bg-surface-secondary/50 text-content-muted border-edge"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              )}
            >
              {healthyCount === 0 && totalCount > 0
                ? `${totalCount} scheduled`
                : `${healthyCount}/${totalCount} healthy`}
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-content-muted shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-content-muted shrink-0" />
          )}
        </button>

        <button
          type="button"
          disabled={isRunning}
          onClick={async () => {
            try {
              setIsRunning(true);
              await runAutonomousMaintenanceNow({ includeLlmExplanation: false });
            } finally {
              setIsRunning(false);
            }
          }}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-edge px-2 py-1 text-xs text-content-secondary transition hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? <Loader2 className="w-3 h-3 motion-safe:animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {isRunning ? "Running..." : "Run Now"}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div id="autonomous-operations-panel" className="px-4 pb-4 border-t border-edge pt-4">
          {cronStatuses === undefined ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 motion-safe:animate-spin text-content-muted" />
            </div>
          ) : cronStatuses.length === 0 ? (
            <div className="text-center py-6 text-sm text-content-muted">
              No autonomous operations configured
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className={cn("rounded-lg border p-3", healthTone)}>
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    System Health
                  </div>
                  <div className="mt-2 text-lg font-semibold capitalize">
                    {snapshotLoading ? "Loading" : controlTower?.health.overall ?? "unknown"}
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    Last check {formatTimeAgo(controlTower?.health.latestCheckAt ?? null)}
                  </div>
                </div>

                <div className="rounded-lg border border-edge p-3 bg-surface-secondary/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-content-muted">
                    <Siren className="w-3.5 h-3.5" />
                    Active Alerts
                  </div>
                  <div className="mt-2 text-lg font-semibold text-content">
                    {controlTower?.health.activeAlertCount ?? 0}
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    {controlTower?.health.unhealthyComponents.length
                      ? `Unhealthy: ${controlTower.health.unhealthyComponents.join(", ")}`
                      : controlTower?.health.degradedComponents.length
                        ? `Degraded: ${controlTower.health.degradedComponents.join(", ")}`
                        : "No current component alerts"}
                  </div>
                </div>

                <div className="rounded-lg border border-edge p-3 bg-surface-secondary/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-content-muted">
                    <Wrench className="w-3.5 h-3.5" />
                    Self-Healing
                  </div>
                  <div className="mt-2 text-lg font-semibold text-content">
                    {controlTower?.healing.successRate24h?.toFixed?.(1) ?? "0.0"}%
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    {controlTower?.healing.succeeded24h ?? 0}/{controlTower?.healing.attempted24h ?? 0} successful in 24h
                  </div>
                </div>

                <div className="rounded-lg border border-edge p-3 bg-surface-secondary/50">
                  <div className="flex items-center gap-2 text-xs font-medium text-content-muted">
                    <Sparkles className="w-3.5 h-3.5" />
                    Maintenance
                  </div>
                  <div className="mt-2 text-lg font-semibold text-content">
                    {controlTower?.maintenance.passed ? "Pass" : "Review"}
                  </div>
                  <div className="mt-1 text-xs text-content-secondary">
                    Last run {formatTimeAgo(controlTower?.maintenance.lastRunAt ?? null)}
                  </div>
                </div>
              </div>

              {!!controlTower?.attentionItems?.length && (
                <div className="rounded-lg border border-edge bg-surface-secondary/50 p-3">
                  <div className="text-sm font-semibold text-content mb-3">Attention Queue</div>
                  <div className="space-y-2">
                    {controlTower.attentionItems.map((item, index) => (
                      <div key={`${item.title}-${index}`} className="rounded-md border border-edge bg-surface px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                              item.severity === "critical"
                                ? "bg-red-500/10 text-red-600"
                                : item.severity === "warning"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-blue-500/10 text-blue-600"
                            )}
                          >
                            {item.severity}
                          </span>
                          <span className="text-sm font-medium text-content">{item.title}</span>
                        </div>
                        <div className="mt-1 text-xs text-content-secondary">{item.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                <div className="rounded-lg border border-edge bg-surface-secondary/50 p-3">
                  <div className="text-sm font-semibold text-content">Intent Loop</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Total hotspots</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.intentHotspots.total ?? 0}</div>
                    </div>
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Inbox</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.intentHotspots.byColumn.inbox ?? 0}</div>
                    </div>
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Human review</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.intentHotspots.byColumn.human_review ?? 0}</div>
                    </div>
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Done</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.intentHotspots.byColumn.done ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-edge bg-surface-secondary/50 p-3">
                  <div className="text-sm font-semibold text-content">Bug Loop</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Total cards</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.bugCards.total ?? 0}</div>
                    </div>
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Inbox</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.bugCards.byColumn.inbox ?? 0}</div>
                    </div>
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Human approve</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.bugCards.byColumn.human_approve ?? 0}</div>
                    </div>
                    <div className="rounded-md border border-edge bg-surface px-3 py-2">
                      <div className="text-content-muted">Done</div>
                      <div className="mt-1 text-base font-semibold text-content">{controlTower?.loops.bugCards.byColumn.done ?? 0}</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-edge bg-surface-secondary/50 p-3">
                  <div className="text-sm font-semibold text-content">Latest Maintenance</div>
                  <div className="mt-3 space-y-2 text-xs text-content-secondary">
                    <div>
                      Ran {formatTimeAgo(controlTower?.maintenance.lastRunAt ?? null)}
                    </div>
                    <div>
                      Errors {controlTower?.maintenance.errorCount ?? 0}, warnings {controlTower?.maintenance.warningCount ?? 0}
                    </div>
                    {controlTower?.maintenance.hotspotSync ? (
                      <div>
                        Hotspot sync created {controlTower.maintenance.hotspotSync.created ?? 0}, updated {controlTower.maintenance.hotspotSync.updated ?? 0}
                      </div>
                    ) : null}
                    {controlTower?.maintenance.autoInvestigate ? (
                      <div>
                        Auto-investigated {controlTower.maintenance.autoInvestigate.investigated ?? 0} hotspot cards
                      </div>
                    ) : null}
                    {controlTower?.maintenance.errors?.[0] ? (
                      <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-red-700 dark:text-red-300">
                        {controlTower.maintenance.errors[0]}
                      </div>
                    ) : null}
                    {!controlTower?.maintenance.errors?.length && controlTower?.maintenance.warnings?.[0] ? (
                      <div className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-amber-700 dark:text-amber-300">
                        {controlTower.maintenance.warnings[0]}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cronStatuses.map((job) => (
                  <CronJobCard key={job.component} job={job} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default AutonomousOperationsPanel;
