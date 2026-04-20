/**
 * LiveDiligenceSection — collapses the five operator-facing diligence
 * panels behind a single quiet affordance when idle.
 *
 * Before this component:
 *   - DiligenceDriftBanner, PipelineReliabilityChip, EntityMemoryPanel,
 *     ExtendedRunPanel, DiligenceVerdictPanel were all rendered as
 *     prominent siblings above the notebook article.
 *   - On a fresh entity with no runs and no drift, the page still
 *     showed five "tooling" shells — the reader felt like they'd
 *     opened an ops dashboard, not a notebook.
 *
 * After:
 *   - When all five panels are idle (no drift, no pending retries, no
 *     in-progress extended runs, no verdicts), this component shows a
 *     single tiny row:   "Run diligence · last run 9h ago" (or
 *     "Run diligence" if never run).
 *   - When ANY panel has real content, the expanded view renders the
 *     five panels in a quiet container.
 *   - A user-controlled "Show diligence" toggle lets the operator
 *     open the full view even when idle (for debugging or review).
 *
 * Principle (Ive / Linear / Notion): earned complexity. If the system
 * has nothing urgent, it says nothing. The notebook becomes the
 * product, not the dashboard.
 *
 * We deliberately do NOT move the panels' data gating into this
 * wrapper — each panel still decides internally when to return null.
 * We only compute an aggregate "hasAnyLiveActivity" signal to decide
 * whether to auto-expand.
 */

import { memo, Suspense, useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { DiligenceDriftBanner } from "@/features/entities/components/notebook/DiligenceDriftBanner";
import { PipelineReliabilityChip } from "@/features/entities/components/notebook/PipelineReliabilityChip";
import { EntityMemoryPanel } from "@/features/entities/components/notebook/EntityMemoryPanel";
import { ExtendedRunPanel } from "@/features/entities/components/notebook/ExtendedRunPanel";
import { DiligenceVerdictPanel } from "@/features/entities/components/notebook/DiligenceVerdictPanel";
import { AgentFlowRail } from "@/features/agents/primitives/AgentFlowRail";
import { useRunGraph } from "@/features/agents/hooks/useRunGraph";
import { cn } from "@/lib/utils";

export interface LiveDiligenceSectionProps {
  entitySlug: string;
  canEdit: boolean;
  /**
   * Optional signals the caller can pass if they've already read them.
   * When any is truthy, the section auto-expands because there's
   * something worth showing.
   */
  hasDriftWarning?: boolean;
  hasPendingRetries?: boolean;
  hasActiveRun?: boolean;
  lastRunAt?: number | null;
  className?: string;
}

function formatRelative(ts: number): string {
  const delta = Math.max(0, Date.now() - ts);
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export const LiveDiligenceSection = memo(function LiveDiligenceSection({
  entitySlug,
  canEdit,
  hasDriftWarning,
  hasPendingRetries,
  hasActiveRun,
  lastRunAt,
  className,
}: LiveDiligenceSectionProps) {
  // Pull the real run graph — isActive + lastRunAt from the runtime are
  // more authoritative than caller-provided props, so we prefer them
  // when present. Callers can still pass explicit overrides for tests.
  const runGraph = useRunGraph(entitySlug);

  // Auto-expand on any real activity; user can override via toggle.
  const effectiveActiveRun = hasActiveRun ?? runGraph.isActive;
  const effectiveLastRunAt = lastRunAt ?? runGraph.lastRunAt;
  const autoExpanded = Boolean(hasDriftWarning || hasPendingRetries || effectiveActiveRun);
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? autoExpanded;

  const lastRunLabel = effectiveLastRunAt
    ? `last run ${formatRelative(effectiveLastRunAt)}`
    : "not yet run";
  const summaryLabel = effectiveActiveRun
    ? "Live run in progress"
    : `Idle · ${lastRunLabel}`;

  if (!expanded) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <button
          type="button"
          onClick={() => setUserExpanded(true)}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition hover:border-[color:var(--accent-primary)]/40 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:text-gray-100"
          aria-label="Open runtime details"
          aria-expanded="false"
          title="Show runtime details"
        >
          <Activity className="h-3.5 w-3.5" />
          <span className="font-medium uppercase tracking-[0.14em]">Runtime details</span>
          <span className="text-gray-300 dark:text-white/20">·</span>
          <span>{summaryLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-gray-200/80 bg-gradient-to-b from-gray-50/80 to-white px-4 py-4 shadow-sm dark:border-white/[0.08] dark:from-white/[0.03] dark:to-white/[0.02]",
        className,
      )}
      aria-label="Notebook runtime details"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            <Activity className="h-3 w-3" />
            <span>Notebook runtime</span>
          </div>
          <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
            {effectiveActiveRun
              ? "A live diligence run is still shaping the notebook. Open the details below when you need the flow, checkpoints, verdicts, or memory state."
              : `No active run. ${lastRunLabel} — reopen this section when you need trace, reliability, or verdict detail.`}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="rounded-full border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
            {summaryLabel}
          </span>
          {userExpanded === true && !autoExpanded ? (
            <button
              type="button"
              onClick={() => setUserExpanded(false)}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] text-gray-600 transition hover:border-gray-300 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:text-gray-100"
              aria-label="Hide runtime details"
            >
              Hide
            </button>
          ) : null}
        </div>
      </div>
      {/*
        Flow graph — appears first when there IS a run to show.
        Mirrors the v4 prototype's right-rail FlowPanel: a visual
        answer to "what are the agents doing right now?" Draggable,
        pulses the active checkpoint, dash-animates the live edge.
        Hidden entirely when no run exists so the section stays calm
        (silent-when-idle principle).
      */}
      <div className="mt-4 space-y-3">
        {runGraph.hasRun ? (
          <div className="space-y-2 rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                Run map
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                {effectiveActiveRun ? "Live flow" : lastRunLabel}
              </div>
            </div>
          {runGraph.runHeadline ? (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                {runGraph.isActive ? "Running" : "Last run"}:
                </span>{" "}
              {runGraph.runHeadline}
              </div>
          ) : null}
          <AgentFlowRail
            nodes={runGraph.nodes}
            edges={runGraph.edges}
            height={Math.max(200, Math.min(360, 36 + Math.ceil(runGraph.nodes.length / 2) * 88))}
          />
          </div>
        ) : null}
        <div className="grid gap-3 xl:grid-cols-2">
          <ErrorBoundary section="Drift banner">
            <Suspense fallback={null}>
              <DiligenceDriftBanner entitySlug={entitySlug} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary section="Reliability chip">
            <Suspense fallback={null}>
              <PipelineReliabilityChip entitySlug={entitySlug} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary section="Memory index">
            <Suspense fallback={null}>
              <EntityMemoryPanel entitySlug={entitySlug} />
            </Suspense>
          </ErrorBoundary>
          <ErrorBoundary section="Extended run">
            <Suspense fallback={null}>
              <ExtendedRunPanel entitySlug={entitySlug} canEdit={canEdit} />
            </Suspense>
          </ErrorBoundary>
        </div>
        <ErrorBoundary section="Pipeline verdicts">
          <Suspense fallback={null}>
            <DiligenceVerdictPanel entitySlug={entitySlug} limit={8} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </section>
  );
});

LiveDiligenceSection.displayName = "LiveDiligenceSection";
