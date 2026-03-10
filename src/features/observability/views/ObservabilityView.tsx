/**
 * ObservabilityView - System Health, Self-Healing, and SLO Dashboard
 *
 * Surfaces live data from:
 *  - convex/domains/observability/healthMonitor.ts  (8 component health checks)
 *  - convex/domains/observability/selfHealer.ts     (autonomous healing actions)
 *  - convex/domains/operations/sloDashboardQueries.ts (SLO executive dashboard)
 */

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  RefreshCw,
  Shield,
  XCircle,
  Wrench,
  TrendingUp,
  Zap,
  Database,
  Send,
  Truck,
  Users,
  ShieldCheck,
  Wallet,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  healthy: { color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2, label: "Healthy" },
  degraded: { color: "text-amber-400", bg: "bg-amber-500/10", icon: AlertTriangle, label: "Degraded" },
  unhealthy: { color: "text-red-400", bg: "bg-red-500/10", icon: XCircle, label: "Unhealthy" },
  down: { color: "text-red-400", bg: "bg-red-500/10", icon: XCircle, label: "Down" },
  unknown: { color: "text-content-muted", bg: "bg-surface-overlay", icon: Clock, label: "Unknown" },
} as const;

const COMPONENT_ICONS: Record<string, typeof Activity> = {
  signal_ingestion: Zap,
  research_queue: TrendingUp,
  publishing: Send,
  delivery: Truck,
  entity_lifecycle: Users,
  validation: ShieldCheck,
  budget: Wallet,
  database: Database,
};

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatAge(ts: number): string {
  if (!ts) return "never";
  const age = Date.now() - ts;
  if (age < 60_000) return "just now";
  if (age < 3_600_000) return `${Math.round(age / 60_000)}m ago`;
  if (age < 86_400_000) return `${Math.round(age / 3_600_000)}h ago`;
  return `${Math.round(age / 86_400_000)}d ago`;
}

function formatUptime(ms: number): string {
  if (ms <= 0) return "0m";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ── Component Health Card ────────────────────────────────────────────────────

function HealthCard({ component, data }: {
  component: string;
  data?: { status?: string; latencyMs?: number; issues?: string[]; metrics?: Record<string, number>; timestamp?: number };
}) {
  const status = typeof data?.status === "string" ? data.status : "unknown";
  const latencyMs = typeof data?.latencyMs === "number" ? data.latencyMs : 0;
  const issues = Array.isArray(data?.issues) ? data.issues : [];
  const metrics = data?.metrics && typeof data.metrics === "object" ? data.metrics : {};
  const timestamp = typeof data?.timestamp === "number" ? data.timestamp : 0;
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown;
  const Icon = COMPONENT_ICONS[component] ?? Activity;
  const StatusIcon = cfg.icon;

  return (
    <div className={`rounded-lg border border-border/50 ${cfg.bg} p-4 transition-colors`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-content-muted" />
          <span className="text-sm font-medium text-content capitalize">
            {component.replace(/_/g, " ")}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-content-muted mb-2">
        <span>Latency: {formatMs(latencyMs)}</span>
        <span>{formatAge(timestamp)}</span>
      </div>

      {issues.length > 0 && (
        <div className="space-y-1 mt-2">
          {issues.slice(0, 3).map((issue, i) => (
            <div key={i} className="text-xs text-amber-300/80 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{issue}</span>
            </div>
          ))}
        </div>
      )}

      {Object.keys(metrics).length > 0 && issues.length === 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {Object.entries(metrics).slice(0, 4).map(([key, val]) => (
            <span key={key} className="text-xs text-content-muted">
              {key.replace(/([A-Z])/g, " $1").trim()}: <span className="text-content">{typeof val === "number" && val < 1 && val > 0 ? `${(val * 100).toFixed(0)}%` : val}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Healing Action Row ───────────────────────────────────────────────────────

function HealingRow({ action }: {
  action: {
    _id: string;
    issue: string;
    actionType: string;
    status: string;
    component: string;
    automated: boolean;
    timestamp: number;
    reason: string;
    result?: string;
  };
}) {
  const statusColors: Record<string, string> = {
    completed: "text-emerald-400",
    failed: "text-red-400",
    pending: "text-amber-400",
    executing: "text-blue-400",
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-surface-overlay/50 transition-colors border-b border-border/30 last:border-0">
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        action.status === "completed" ? "bg-emerald-400" :
        action.status === "failed" ? "bg-red-400" :
        action.status === "pending" ? "bg-amber-400" : "bg-blue-400"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-content truncate">{action.issue}</span>
          {action.automated && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 shrink-0">auto</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-content-muted">
          <span className="capitalize">{action.actionType.replace(/_/g, " ")}</span>
          <span>on {action.component}</span>
          <span className={statusColors[action.status] ?? "text-content-muted"}>{action.status}</span>
        </div>
      </div>
      <span className="text-xs text-content-muted shrink-0">{formatAge(action.timestamp)}</span>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────

export function ObservabilityView() {
  const health = useQuery(api.domains.observability.healthMonitor.getSystemHealth);
  const healingActions = useQuery(api.domains.observability.selfHealer.getRecentHealingActions, { hours: 24, limit: 20 });
  const healingStats = useQuery(api.domains.observability.selfHealer.getHealingStatsSummary, { hours: 24 });
  const sloDashboard = useQuery(api.domains.operations.sloDashboardQueries.getExecutiveHealthDashboard);
  const healthComponents = health?.components && typeof health.components === "object" ? Object.entries(health.components) : [];
  const recentHealingActions = Array.isArray(healingActions) ? healingActions : [];
  const activeSloCount = typeof (sloDashboard as any)?.activeAlerts === "number" ? (sloDashboard as any).activeAlerts : 0;
  const sloItems = Array.isArray((sloDashboard as any)?.slos) ? (sloDashboard as any).slos : [];

  const isLoading = health === undefined;

  const overallCfg = health
    ? STATUS_CONFIG[health.overall as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.unknown
    : STATUS_CONFIG.unknown;
  const OverallIcon = overallCfg.icon;

  return (
    <div className="h-full overflow-auto bg-surface px-6 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${overallCfg.bg}`}>
            <HeartPulse className={`w-5 h-5 ${overallCfg.color}`} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-content">System Observability</h1>
            <p className="text-xs text-content-muted">
              {isLoading ? "Loading..." : (
                <>
                  <OverallIcon className={`w-3 h-3 inline mr-1 ${overallCfg.color}`} />
                  {overallCfg.label} — {health?.activeAlerts ?? 0} active alerts — checked {formatAge(health?.lastChecked ?? 0)}
                  {health?.uptime ? ` — uptime ${formatUptime(health.uptime)}` : ""}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Health Grid */}
      <section className="mb-8">
        <h2 className="text-sm font-medium text-content-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" /> Component Health
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 rounded-lg bg-surface-overlay animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {healthComponents.map(([key, data]) => (
              <HealthCard key={key} component={key} data={data as any} />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Healing Actions */}
        <section>
          <h2 className="text-sm font-medium text-content-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Self-Healing Actions (24h)
          </h2>
          <div className="rounded-lg border border-border/50 bg-surface-overlay/30">
            {/* Stats bar */}
            {healingStats && (
              <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border/30 text-xs">
                <span className="text-content-muted">Attempted: <span className="text-content font-medium">{healingStats.attempted}</span></span>
                <span className="text-emerald-400">Succeeded: {healingStats.succeeded}</span>
                <span className="text-red-400">Failed: {healingStats.failed}</span>
                {healingStats.escalated > 0 && <span className="text-amber-400">Escalated: {healingStats.escalated}</span>}
              </div>
            )}

            {/* Actions list */}
            <div className="max-h-80 overflow-y-auto">
              {!healingActions ? (
                <div className="flex items-center justify-center py-8 text-content-muted text-sm">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading...
                </div>
              ) : recentHealingActions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-content-muted">
                  <CheckCircle2 className="w-6 h-6 mb-2 text-emerald-400" />
                  <span className="text-sm">No healing actions in the last 24h</span>
                  <span className="text-xs mt-1">System is self-maintaining normally</span>
                </div>
              ) : (
                recentHealingActions.map((action: any) => (
                  <HealingRow key={action._id} action={action} />
                ))
              )}
            </div>
          </div>
        </section>

        {/* SLO Executive Dashboard */}
        <section>
          <h2 className="text-sm font-medium text-content-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> SLO Executive Summary
          </h2>
          <div className="rounded-lg border border-border/50 bg-surface-overlay/30">
            {!sloDashboard ? (
              <div className="flex items-center justify-center py-8 text-content-muted text-sm">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading SLOs...
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Overall compliance */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-content">Overall Compliance</span>
                  <span className={`text-lg font-semibold ${
                    (sloDashboard as any).overallCompliance >= 99 ? "text-emerald-400" :
                    (sloDashboard as any).overallCompliance >= 95 ? "text-amber-400" : "text-red-400"
                  }`}>
                    {typeof (sloDashboard as any).overallCompliance === "number"
                      ? `${(sloDashboard as any).overallCompliance.toFixed(1)}%`
                      : "N/A"}
                  </span>
                </div>

                {/* SLO items */}
                {sloItems.slice(0, 6).map((slo: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-t border-border/20">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-content truncate">{slo.name || slo.sloId}</div>
                      <div className="text-xs text-content-muted">{slo.description || slo.type}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <div className="w-20 h-1.5 rounded-full bg-surface-overlay overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            (slo.compliance ?? slo.value ?? 0) >= 99 ? "bg-emerald-400" :
                            (slo.compliance ?? slo.value ?? 0) >= 95 ? "bg-amber-400" : "bg-red-400"
                          }`}
                          style={{ width: `${Math.min(100, slo.compliance ?? slo.value ?? 0)}%` }}
                        />
                      </div>
                      <span className="text-xs text-content-muted w-12 text-right">
                        {typeof (slo.compliance ?? slo.value) === "number"
                          ? `${(slo.compliance ?? slo.value).toFixed(1)}%`
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Active alerts from SLO */}
                {activeSloCount > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-xs text-amber-400">
                      {activeSloCount} active SLO alert{activeSloCount > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ObservabilityView;
