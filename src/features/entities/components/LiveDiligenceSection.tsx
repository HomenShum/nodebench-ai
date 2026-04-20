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
  // Auto-expand on any real activity; user can override via toggle.
  const autoExpanded = Boolean(hasDriftWarning || hasPendingRetries || hasActiveRun);
  const [userExpanded, setUserExpanded] = useState<boolean | null>(null);
  const expanded = userExpanded ?? autoExpanded;

  const lastRunLabel = lastRunAt ? `last run ${formatRelative(lastRunAt)}` : "not yet run";

  if (!expanded) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-content-muted", className)}>
        <button
          type="button"
          onClick={() => setUserExpanded(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-content-muted transition hover:border-[color:var(--accent-primary)]/40 hover:text-content"
          aria-label="Open live diligence panels"
          aria-expanded="false"
          title="Show live diligence"
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Run diligence</span>
          <span className="text-content-muted/70">·</span>
          <span>{lastRunLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <section
      className={cn("space-y-3", className)}
      aria-label="Live diligence"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-content-muted">
          <Activity className="h-3 w-3" />
          <span>Live diligence</span>
        </div>
        {userExpanded === true && !autoExpanded ? (
          <button
            type="button"
            onClick={() => setUserExpanded(false)}
            className="text-[11px] text-content-muted transition hover:text-content"
            aria-label="Hide live diligence"
          >
            Hide
          </button>
        ) : null}
      </div>
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
      <ErrorBoundary section="Pipeline verdicts">
        <Suspense fallback={null}>
          <DiligenceVerdictPanel entitySlug={entitySlug} limit={8} />
        </Suspense>
      </ErrorBoundary>
    </section>
  );
});

LiveDiligenceSection.displayName = "LiveDiligenceSection";
