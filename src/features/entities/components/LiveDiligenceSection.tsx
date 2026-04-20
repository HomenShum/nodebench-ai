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
import { NotebookTopStatusRow } from "@/features/entities/components/NotebookTopStatusRow";
import { cn } from "@/lib/utils";

export interface LiveDiligenceSectionProps {
  entitySlug: string;
  canEdit: boolean;
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
  const runGraph = useRunGraph(entitySlug);

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

  // Always-visible top status row. The row itself returns null when
  // every chip is silent (no verdict history, no drift, no active
  // run, no queue). When any signal fires, the row is always there —
  // no hiding behind a "Runtime details" pill. The expand toggle is
  // owned by the row; this component just responds to it.
  const toggle = () => setUserExpanded((prev) => !(prev ?? autoExpanded));

  if (!expanded) {
    return (
      <div className={cn(className)}>
        <NotebookTopStatusRow
          entitySlug={entitySlug}
          expanded={false}
          onToggle={toggle}
        />
      </div>
    );
  }

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Notebook runtime details"
    >
      {/*
        Top status row is the always-visible header. It owns the
        expand/collapse toggle so the user's single control surface is
        the same whether collapsed or expanded — the row is always
        there when any chip has something to say.
      */}
      <NotebookTopStatusRow
        entitySlug={entitySlug}
        expanded={true}
        onToggle={toggle}
      />

      <div className="space-y-3">
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
