import React, { memo } from "react";
import { useQuery } from "convex/react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Flag,
  Loader2,
  ShieldAlert,
  Swords,
  Timer,
  Waypoints,
  Zap,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
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
  nextRecommendedAction: string;
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

export const OracleControlTowerPanel = memo(function OracleControlTowerPanel() {
  const snapshot = useQuery(api.domains.taskManager.queries.getOracleControlTowerSnapshot, {
    limit: 6,
  }) as OracleControlTowerSnapshot | undefined;

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
        objective: "Package deterministic replay, telemetry, and dogfood evidence into a proof pack.",
        progress: 0,
        status: "pending" as const,
        current: false,
      },
    ],
  };

  return (
    <div className="nb-surface-card overflow-hidden">
      <div className="border-b border-edge bg-gradient-to-r from-[var(--accent-primary-bg)] via-surface to-surface px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-content">
              <Waypoints className="h-4 w-4 text-accent" />
              Oracle Control Tower
            </div>
            <p className="mt-1 max-w-3xl text-sm text-content-secondary">
                  Builder-facing loop health for vision alignment, telemetry burn, dogfood evidence, and blocked write steps.
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
              Review dogfood <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
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
          <div className="rounded-xl border border-edge bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-content">Dogfood verdict</div>
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
                No dogfood run is attached yet. Run the builder-facing loop and attach the latest evidence to the session.
              </p>
            )}
          </div>

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
