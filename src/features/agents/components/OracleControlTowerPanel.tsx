import React, { memo } from "react";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Beaker,
  CheckCircle2,
  ExternalLink,
  FileText,
  Flag,
  Loader2,
  Lightbulb,
  Radio,
  ShieldAlert,
  Swords,
  Timer,
  Waypoints,
  Wrench,
  Zap,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { TrajectorySummaryBand } from "@/features/trajectory/components/TrajectorySummaryBand";
import type { TrajectorySummaryData } from "@/features/trajectory/types";
import { SuccessLoopsPanel } from "@/features/agents/components/successLoops/SuccessLoopsPanel";
import type { SuccessLoopsDashboardSnapshot } from "@/features/agents/components/successLoops/types";
import { AgentResponseFlywheelPanel } from "./AgentResponseFlywheelPanel";
import {
  formatCompactNumber,
  formatDurationCompact,
  formatGoalReference,
  formatRelativeTime,
  formatUsd,
  getCrossCheckPresentation,
  getDogfoodPresentation,
  getInstitutionalVerdictPresentation,
} from "./oracleControlTowerUtils";
import {
  getTemporalPhasePresentation,
  summarizeTemporalCounts,
} from "./oracleTemporalOsUtils";

interface OracleControlTowerSnapshot {
  summary: {
    activeSessions: number;
    violatedCount: number;
    driftingCount: number;
    failedSessions: number;
    pendingConfirmations: number;
    totalTokens: number;
    totalCostUsd: number;
    avgLatencyMs: number;
    institutionalVerdict:
      | "institutional_memory_aligned"
      | "watch"
      | "institutional_hallucination_risk";
  };
  latestDogfood: null | {
    _id: string;
    createdAt: number;
    source: string;
    model: string;
    summary: string;
    verdict: "missing" | "watch" | "fail" | "pass";
    label: string;
    p0: number;
    p1: number;
    p2: number;
    p3: number;
    totalIssues: number;
  };
  pendingConfirmations: Array<{
    _id: string;
    toolName: string;
    riskTier: string;
    actionSummary: string;
    createdAt: number;
    expiresAt: number;
  }>;
  openFailures: Array<{
    kind: string;
    title: string;
    detail: string;
  }>;
  recentSessions: Array<{
    _id: string;
    title: string;
    description?: string;
    status: string;
    type: string;
    startedAt: number;
    completedAt?: number;
    totalDurationMs: number;
    totalTokens: number;
    estimatedCostUsd: number;
    goalId?: string;
    visionSnapshot?: string;
    successCriteria: string[];
    sourceRefs: Array<{ label: string; href?: string; note?: string; kind?: string }>;
    crossCheckStatus?: "aligned" | "drifting" | "violated";
    deltaFromVision?: string;
    dogfoodRunId?: string;
    toolsUsed: string[];
    traceCount: number;
    traceTimeline: Array<{
      _id: string;
      traceId: string;
      workflowName: string;
      status: string;
      startedAt: number;
      totalDurationMs: number;
      totalTokens: number;
      estimatedCostUsd: number;
      crossCheckStatus?: "aligned" | "drifting" | "violated";
      deltaFromVision?: string;
      toolSequence: string[];
    }>;
    topToolSequence: string[];
  }>;
  temporalOs: {
    loopFormula: string[];
    counts: {
      observations: number;
      signals: number;
      causalChains: number;
      zeroDrafts: number;
      proofPacks: number;
    };
    phases: Array<{
      id: string;
      title: string;
      window: string;
      objective: string;
      progress: number;
      status: "completed" | "in_progress" | "pending";
      current: boolean;
    }>;
  };
  successLoops: SuccessLoopsDashboardSnapshot;
  responseFlywheel: {
    summary: {
      totalReviews: number;
      passCount: number;
      watchCount: number;
      failCount: number;
      passRate: number;
      averageOverallScore: number;
      weakestDimension: null | {
        key: string;
        label: string;
        averageScore: number;
      };
      strongestDimension: null | {
        key: string;
        label: string;
        averageScore: number;
      };
      hottestQuestionCategory: null | {
        key: string;
        label: string;
        count: number;
      };
      latestReviewedAt: number | null;
    };
    dimensions: Array<{
      key: string;
      label: string;
      averageScore: number;
      status: "strong" | "watch" | "weak";
    }>;
    categories: Array<{
      key: string;
      label: string;
      count: number;
      outputVariables: string[];
    }>;
    recentFindings: Array<{
      reviewKey: string;
      messageId: string;
      promptSummary: string;
      status: "pass" | "watch" | "fail";
      overallScore: number;
      matchedCategoryKeys: string[];
      weaknesses: string[];
      recommendations: string[];
      reviewedAt: number;
    }>;
  };
  nextRecommendedAction: string;
  industryMetrics?: {
    toolCalls: {
      last24h: number;
      successRate24h: number;
      failedLast24h: number;
      avgDurationMs: number;
      totalWeek: number;
      topTools: Array<{ name: string; count: number }>;
    };
    evidence: {
      totalArtifacts: number;
      totalPacks: number;
      totalChainLinks: number;
    };
    narrative: {
      newInsightsThisWeek: number;
      totalEvents: number;
      hypotheses: {
        active: number;
        supported: number;
        weakened: number;
        total: number;
      };
    };
    signals: {
      totalIngested: number;
      pending: number;
      processed: number;
    };
    eval: {
      totalRuns: number;
      avgPassRate: number | null;
    };
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-edge bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-content-muted">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-content">{value}</div>
      {sub ? <div className="mt-1 text-xs text-content-secondary">{sub}</div> : null}
    </div>
  );
}

// ── Compact metric row ──────────────────────────────────────────────────────
function MetricRow({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <Icon className={cn("h-3.5 w-3.5 shrink-0", accent ?? "text-content-muted")} />
      <span className="text-xs text-content-secondary flex-1 truncate">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-content">{value}</span>
      {sub ? <span className="text-[11px] text-content-muted">{sub}</span> : null}
    </div>
  );
}

// ── Progress bar ────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-background/60 overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Industry Metrics Panel ──────────────────────────────────────────────────
function IndustryMetricsSection({
  metrics,
}: {
  metrics: NonNullable<OracleControlTowerSnapshot["industryMetrics"]>;
}) {
  const { toolCalls, evidence, narrative, signals, eval: evalData } = metrics;

  return (
    <div className="rounded-xl border border-edge bg-surface p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-content">
        <BarChart3 className="h-4 w-4 text-accent" />
        Industry Metrics
      </div>

      {/* Tool Calls */}
      <div className="rounded-lg border border-edge bg-background/40 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-content">Tool Execution</span>
          <span className="text-[11px] text-content-muted">24h / 7d</span>
        </div>
        <MetricRow
          icon={Wrench}
          label="Calls (24h)"
          value={formatCompactNumber(toolCalls.last24h)}
          accent="text-blue-400"
        />
        <MetricRow
          icon={Zap}
          label="Success rate"
          value={`${toolCalls.successRate24h}%`}
          accent={toolCalls.successRate24h >= 95 ? "text-emerald-400" : toolCalls.successRate24h >= 80 ? "text-amber-400" : "text-red-400"}
        />
        {toolCalls.failedLast24h > 0 && (
          <MetricRow
            icon={AlertTriangle}
            label="Failed"
            value={toolCalls.failedLast24h}
            accent="text-red-400"
          />
        )}
        <MetricRow
          icon={Timer}
          label="Avg latency"
          value={toolCalls.avgDurationMs > 0 ? formatDurationCompact(toolCalls.avgDurationMs) : "N/A"}
          accent="text-violet-400"
        />
        <MetricRow
          icon={Wrench}
          label="Total (7d)"
          value={formatCompactNumber(toolCalls.totalWeek)}
          accent="text-blue-400"
        />

        {toolCalls.topTools.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[10px] uppercase tracking-widest text-content-muted">Top tools</div>
            {toolCalls.topTools.slice(0, 5).map((tool) => (
              <div key={tool.name} className="flex items-center gap-2">
                <span className="text-[11px] text-content-secondary truncate flex-1">{tool.name}</span>
                <MiniBar value={tool.count} max={toolCalls.topTools[0].count} color="bg-blue-500/60" />
                <span className="text-[10px] tabular-nums text-content-muted w-6 text-right">{tool.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Evidence & Artifacts */}
      <div className="rounded-lg border border-edge bg-background/40 p-3 space-y-1.5">
        <span className="text-xs font-medium text-content">Evidence Gathered</span>
        <MetricRow
          icon={FileText}
          label="Source artifacts"
          value={formatCompactNumber(evidence.totalArtifacts)}
          accent="text-emerald-400"
        />
        <MetricRow
          icon={Swords}
          label="Evidence packs"
          value={formatCompactNumber(evidence.totalPacks)}
          accent="text-amber-400"
        />
        <MetricRow
          icon={Waypoints}
          label="Chain/deduction links"
          value={formatCompactNumber(evidence.totalChainLinks)}
          accent="text-cyan-400"
        />
      </div>

      {/* Narrative Intelligence */}
      <div className="rounded-lg border border-edge bg-background/40 p-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-content">Narrative Intelligence</span>
          {narrative.newInsightsThisWeek > 0 && (
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
              +{narrative.newInsightsThisWeek} new this week
            </span>
          )}
        </div>
        <MetricRow
          icon={Lightbulb}
          label="New insights (7d)"
          value={narrative.newInsightsThisWeek}
          accent="text-amber-400"
        />
        <MetricRow
          icon={Lightbulb}
          label="Total events tracked"
          value={formatCompactNumber(narrative.totalEvents)}
          accent="text-pink-400"
        />

        {narrative.hypotheses.total > 0 && (
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            <div className="rounded-md border border-edge bg-surface px-2 py-1.5 text-center">
              <div className="text-sm font-semibold tabular-nums text-emerald-400">{narrative.hypotheses.active}</div>
              <div className="text-[10px] text-content-muted">Active</div>
            </div>
            <div className="rounded-md border border-edge bg-surface px-2 py-1.5 text-center">
              <div className="text-sm font-semibold tabular-nums text-blue-400">{narrative.hypotheses.supported}</div>
              <div className="text-[10px] text-content-muted">Supported</div>
            </div>
            <div className="rounded-md border border-edge bg-surface px-2 py-1.5 text-center">
              <div className="text-sm font-semibold tabular-nums text-amber-400">{narrative.hypotheses.weakened}</div>
              <div className="text-[10px] text-content-muted">Weakened</div>
            </div>
          </div>
        )}
      </div>

      {/* Signals */}
      <div className="rounded-lg border border-edge bg-background/40 p-3 space-y-1.5">
        <span className="text-xs font-medium text-content">Signal Pipeline</span>
        <MetricRow
          icon={Radio}
          label="Total ingested"
          value={formatCompactNumber(signals.totalIngested)}
          accent="text-violet-400"
        />
        <MetricRow
          icon={CheckCircle2}
          label="Processed"
          value={formatCompactNumber(signals.processed)}
          accent="text-emerald-400"
        />
        {signals.pending > 0 && (
          <MetricRow
            icon={Loader2}
            label="Pending"
            value={signals.pending}
            accent="text-amber-400"
          />
        )}
        {signals.totalIngested > 0 && (
          <MiniBar
            value={signals.processed}
            max={signals.totalIngested}
            color="bg-emerald-500/60"
          />
        )}
      </div>

      {/* Eval */}
      {evalData.totalRuns > 0 && (
        <div className="rounded-lg border border-edge bg-background/40 p-3 space-y-1.5">
          <span className="text-xs font-medium text-content">Evaluation</span>
          <MetricRow
            icon={Beaker}
            label="Eval runs"
            value={evalData.totalRuns}
            accent="text-cyan-400"
          />
          {evalData.avgPassRate !== null && (
            <MetricRow
              icon={CheckCircle2}
              label="Avg pass rate"
              value={`${evalData.avgPassRate}%`}
              accent={evalData.avgPassRate >= 80 ? "text-emerald-400" : evalData.avgPassRate >= 60 ? "text-amber-400" : "text-red-400"}
            />
          )}
        </div>
      )}
    </div>
  );
}

export const OracleControlTowerPanel = memo(function OracleControlTowerPanel() {
  const snapshot = useQuery(api.domains.taskManager.queries.getOracleControlTowerSnapshot, {
    limit: 6,
  }) as OracleControlTowerSnapshot | undefined;
  const trajectoryDashboard = useQuery(api.domains.trajectory.queries.getTrajectoryDashboardSnapshot, {
    windowDays: 90,
  }) as
    | {
        product?: {
          summary: TrajectorySummaryData;
        };
      }
    | undefined;
  const industryMetrics = useQuery(api.domains.taskManager.queries.getIndustryMetrics) as
    | NonNullable<OracleControlTowerSnapshot["industryMetrics"]>
    | undefined;

  if (snapshot === undefined) {
    return (
      <div className="nb-surface-card p-6">
        <div className="flex items-center gap-2 text-sm text-content-secondary">
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
          Loading Oracle control tower...
        </div>
      </div>
    );
  }

  const institutionalTone = getInstitutionalVerdictPresentation(snapshot.summary.institutionalVerdict);
  const dogfoodTone = getDogfoodPresentation(snapshot.latestDogfood?.verdict ?? "missing");
  const temporalOs = snapshot.temporalOs ?? {
    loopFormula: [
      "Ingest unstructured data",
      "Extract temporal signals",
      "Forecast the outcome",
      "Execute the zero-draft behavior",
      "Log the proof pack",
    ],
    counts: {
      observations: 0,
      signals: 0,
      causalChains: 0,
      zeroDrafts: 0,
      proofPacks: 0,
    },
    phases: [
      {
        id: "phase_1",
        title: "Temporal substrate & ingestion",
        window: "Weeks 1-3",
        objective: "Ingest messy source material and anchor facts to exact source references.",
        progress: 0,
        status: "in_progress" as const,
        current: true,
      },
      {
        id: "phase_2",
        title: "Temporal math & causal API",
        window: "Weeks 4-6",
        objective: "Detect temporal breaks and expose causal chains as structured outputs.",
        progress: 0,
        status: "pending" as const,
        current: false,
      },
      {
        id: "phase_3",
        title: "Gamified Oracle & zero-drafting",
        window: "Weeks 7-9",
        objective: "Pre-draft artifacts behind approval gates so the operator starts from momentum, not blank pages.",
        progress: 0,
        status: "pending" as const,
        current: false,
      },
      {
        id: "phase_4",
        title: "Enterprise proof-pack execution",
        window: "Weeks 10-12",
        objective: "Package deterministic replay, activity monitoring, and quality review evidence into a proof pack.",
        progress: 0,
        status: "pending" as const,
        current: false,
      },
    ],
  };

  return (
    <div className="nb-surface-card overflow-hidden">
      <div className="border-b border-white/[0.06] bg-white/[0.03] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-content">
              <Waypoints className="h-4 w-4 text-accent" />
              Oracle Control Tower
            </div>
            <p className="mt-1 max-w-3xl text-sm text-content-secondary">
                  Continuous health monitoring for goal alignment, execution quality, evidence collection, and approval gates.
                </p>
              </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                institutionalTone.className,
              )}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {institutionalTone.label}
            </span>
            <a
              href="/dogfood"
              className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface px-2.5 py-1 text-xs text-content-secondary transition-colors hover:text-content"
            >
              Review evidence <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="md:col-span-2 xl:col-span-4">
          <TrajectorySummaryBand
            summary={trajectoryDashboard?.product?.summary ?? null}
            loading={trajectoryDashboard === undefined}
            emptyLabel="The product-level trajectory cache has not been backfilled yet. The Oracle control tower is still reading the older monitoring surfaces directly."
          />
        </div>
        <div className="md:col-span-2 xl:col-span-4">
          <SuccessLoopsPanel snapshot={snapshot.successLoops ?? null} />
        </div>
        <StatCard
          label="Active quests"
          value={String(snapshot.summary.activeSessions)}
          sub={`${snapshot.summary.pendingConfirmations} pending confirmations`}
          icon={Swords}
        />
        <StatCard
          label="Drift pressure"
          value={`${snapshot.summary.violatedCount}/${snapshot.summary.driftingCount}`}
          sub="violated / drifting"
          icon={Flag}
        />
        <StatCard
          label="Budget load"
          value={`${formatCompactNumber(snapshot.summary.totalTokens)} tokens`}
          sub={`${formatUsd(snapshot.summary.totalCostUsd)} total cost`}
          icon={Zap}
        />
        <StatCard
          label="Trace latency"
          value={snapshot.summary.avgLatencyMs > 0 ? formatDurationCompact(snapshot.summary.avgLatencyMs) : "No traces"}
          sub={`${snapshot.summary.failedSessions} failed sessions in view`}
          icon={Timer}
        />
      </div>

      <div className="grid gap-5 border-t border-edge p-5 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">
              Next recommended action
            </div>
            <div className="mt-2 flex items-start gap-3">
              <ArrowRight className="mt-0.5 h-4 w-4 text-accent" />
              <p className="text-sm leading-6 text-content">{snapshot.nextRecommendedAction}</p>
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-content">Unified Temporal Agentic OS</div>
                <div className="mt-1 text-xs text-content-muted">
                  {summarizeTemporalCounts(temporalOs.counts)}
                </div>
              </div>
              <span className="rounded-full border border-edge bg-background/50 px-2 py-0.5 text-[11px] text-content-secondary">
                loop until done
              </span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-lg border border-edge bg-background/40 p-3 text-xs text-content-secondary">
                <div className="font-medium text-content">Observations</div>
                <div className="mt-1 text-lg font-semibold text-content">{formatCompactNumber(temporalOs.counts.observations)}</div>
              </div>
              <div className="rounded-lg border border-edge bg-background/40 p-3 text-xs text-content-secondary">
                <div className="font-medium text-content">Signals</div>
                <div className="mt-1 text-lg font-semibold text-content">
                  {formatCompactNumber(temporalOs.counts.signals)}
                </div>
              </div>
              <div className="rounded-lg border border-edge bg-background/40 p-3 text-xs text-content-secondary">
                <div className="font-medium text-content">Causal chains</div>
                <div className="mt-1 text-lg font-semibold text-content">
                  {formatCompactNumber(temporalOs.counts.causalChains)}
                </div>
              </div>
              <div className="rounded-lg border border-edge bg-background/40 p-3 text-xs text-content-secondary">
                <div className="font-medium text-content">Zero-drafts</div>
                <div className="mt-1 text-lg font-semibold text-content">
                  {formatCompactNumber(temporalOs.counts.zeroDrafts)}
                </div>
              </div>
              <div className="rounded-lg border border-edge bg-background/40 p-3 text-xs text-content-secondary">
                <div className="font-medium text-content">Proof packs</div>
                <div className="mt-1 text-lg font-semibold text-content">
                  {formatCompactNumber(temporalOs.counts.proofPacks)}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {temporalOs.loopFormula.map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-edge bg-surface px-2 py-0.5 text-[11px] text-content-secondary"
                >
                  {step}
                </span>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {temporalOs.phases.map((phase) => {
                const tone = getTemporalPhasePresentation(phase.status);
                return (
                  <div key={phase.id} className="rounded-lg border border-edge bg-background/40 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-medium text-content">{phase.title}</div>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              tone.className,
                            )}
                          >
                            {tone.label}
                          </span>
                          {phase.current ? (
                            <span className="rounded-full border border-accent/30 bg-[var(--accent-primary-bg)] px-2 py-0.5 text-[11px] text-accent">
                              current bottleneck
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[11px] text-content-muted">{phase.window}</div>
                      </div>
                      <div className="text-right text-[11px] text-content-muted">
                        <div>{phase.progress}%</div>
                        <div>progress</div>
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-content-secondary">{phase.objective}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-content">Recent loops</div>
              <div className="text-xs text-content-muted">{snapshot.recentSessions.length} tracked sessions</div>
            </div>
            <div className="mt-4 space-y-3">
              {snapshot.recentSessions.length === 0 ? (
                <div className="text-sm text-content-secondary">No builder sessions have been instrumented yet.</div>
              ) : (
                snapshot.recentSessions.map((session) => {
                  const tone = getCrossCheckPresentation(session.crossCheckStatus);
                  return (
                    <div key={session._id} className="rounded-lg border border-edge bg-background/40 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-medium text-content">{session.title}</div>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                tone.className,
                              )}
                            >
                              {tone.questLabel}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-content-muted">
                            {formatRelativeTime(session.startedAt)}
                            {session.goalId ? ` · ${formatGoalReference(session.goalId)}` : ""}
                            {session.traceCount ? ` · ${session.traceCount} traces` : ""}
                          </div>
                        </div>
                        <div className="text-right text-xs text-content-muted">
                          <div>{formatCompactNumber(session.totalTokens)} tokens</div>
                          <div>{formatUsd(session.estimatedCostUsd)}</div>
                        </div>
                      </div>

                      {session.deltaFromVision ? (
                        <p className="mt-2 text-xs leading-5 text-content-secondary">{session.deltaFromVision}</p>
                      ) : null}

                      {session.topToolSequence.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {session.topToolSequence.map((tool) => (
                            <span
                              key={`${session._id}-${tool}`}
                              className="rounded-full border border-edge bg-surface px-2 py-0.5 text-[11px] text-content-secondary"
                            >
                              {tool}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {session.traceTimeline.length > 0 ? (
                        <div className="mt-3 space-y-1.5">
                          {session.traceTimeline.slice(0, 3).map((trace) => (
                            <div
                              key={trace._id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-edge/70 bg-surface px-2.5 py-1.5 text-[11px]"
                            >
                              <div className="flex items-center gap-2 text-content-secondary">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    trace.status === "completed"
                                      ? "bg-emerald-500"
                                      : trace.status === "error"
                                        ? "bg-red-500"
                                        : "bg-amber-500",
                                  )}
                                />
                                <span className="font-medium text-content">{trace.workflowName}</span>
                              </div>
                              <div className="flex items-center gap-3 text-content-muted">
                                <span>{formatCompactNumber(trace.totalTokens)} tok</span>
                                <span>{trace.totalDurationMs ? formatDurationCompact(trace.totalDurationMs) : "pending"}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* ── Industry Metrics ─────────────────────────────────────── */}
          {industryMetrics && <IndustryMetricsSection metrics={industryMetrics} />}

          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-content">Quality review verdict</div>
              <span
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  dogfoodTone.className,
                )}
              >
                {dogfoodTone.label}
              </span>
            </div>
            {snapshot.latestDogfood ? (
              <div className="mt-3 space-y-2 text-sm text-content-secondary">
                <div className="text-xs text-content-muted">
                  {formatRelativeTime(snapshot.latestDogfood.createdAt)} · {snapshot.latestDogfood.source} · {snapshot.latestDogfood.model}
                </div>
                <p className="leading-6 text-content">{snapshot.latestDogfood.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-red-700 dark:text-red-300">
                    P0 {snapshot.latestDogfood.p0}
                  </span>
                  <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                    P1 {snapshot.latestDogfood.p1}
                  </span>
                  <span className="rounded-full border border-edge bg-surface px-2 py-0.5 text-content-secondary">
                    Total {snapshot.latestDogfood.totalIssues}
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-content-secondary">
                No quality review is attached yet. Run the builder-facing loop and attach the latest evidence to the session.
              </p>
            )}
          </div>

          <AgentResponseFlywheelPanel snapshot={snapshot.responseFlywheel} />

          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="text-sm font-semibold text-content">Pending confirmations</div>
            <div className="mt-3 space-y-2">
              {snapshot.pendingConfirmations.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-content-secondary">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No blocked write operations right now.
                </div>
              ) : (
                snapshot.pendingConfirmations.slice(0, 5).map((draft) => (
                  <div key={draft._id} className="rounded-lg border border-edge bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-content">{draft.toolName}</div>
                      <span className="rounded-full border border-edge bg-surface px-2 py-0.5 text-[11px] text-content-secondary">
                        {draft.riskTier}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-5 text-content-secondary">{draft.actionSummary}</div>
                    <div className="mt-2 text-[11px] text-content-muted">Expires {formatRelativeTime(draft.expiresAt)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="text-sm font-semibold text-content">Attention queue</div>
            <div className="mt-3 space-y-2">
              {snapshot.openFailures.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-content-secondary">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  No open failure cards in the current slice.
                </div>
              ) : (
                snapshot.openFailures.map((failure, idx) => (
                  <div key={`${failure.kind}-${failure.title}-${idx}`} className="rounded-lg border border-edge bg-background/40 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-content">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      {failure.title}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-content-secondary">{failure.detail}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default OracleControlTowerPanel;
