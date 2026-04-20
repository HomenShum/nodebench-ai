/**
 * PipelineReliabilityChip — tiny operator chip summarizing async retry +
 * DLQ state for THIS entity.
 *
 * Silent by default. Renders only when there's something to surface:
 *   - Scheduled retries pending (+12h / +24h / +48h cadence)
 *   - Open dead-letters globally (cross-entity operator triage hint)
 *
 * Design posture (async_reliability.md + design_reduction.md):
 *   - Zero noise when pipeline is healthy
 *   - Reveals scheduled retry next-attempt time so owner knows what to
 *     expect ("patent retry scheduled 12h out")
 *   - Links implicit to /admin/dlq (future route) via the resolved count
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

type RetryRow = {
  _id: string;
  blockType: string;
  reason: string;
  attempt: number;
  nextAttemptAtMs: number;
  status: string;
};

type DlqRollup = {
  total: number;
  open: number;
  acknowledged: number;
  resolved: number;
  totalOccurrences: number;
};

export type PipelineReliabilityChipProps = {
  entitySlug: string;
  className?: string;
};

function formatRelative(ms: number): string {
  const delta = ms - Date.now();
  if (delta <= 0) return "due";
  if (delta < 3_600_000) return `in ${Math.ceil(delta / 60_000)}m`;
  if (delta < 86_400_000) return `in ${Math.ceil(delta / 3_600_000)}h`;
  return `in ${Math.ceil(delta / 86_400_000)}d`;
}

export function PipelineReliabilityChip({
  entitySlug,
  className,
}: PipelineReliabilityChipProps) {
  const retries = useQuery(
    api.domains.product.pipelineReliability.listRetriesForEntity,
    { entitySlug, limit: 10 },
  ) as ReadonlyArray<RetryRow> | undefined;

  const dlq = useQuery(
    api.domains.product.pipelineReliability.rollupDeadLetters,
    {},
  ) as DlqRollup | undefined;

  const scheduled = useMemo(
    () => (retries ?? []).filter((r) => r.status === "scheduled"),
    [retries],
  );

  if (!retries || !dlq) return null; // loading silently

  // Hide if everything is clean AND no open DLQs globally.
  if (scheduled.length === 0 && dlq.open === 0) return null;

  return (
    <div
      className={
        "flex flex-wrap items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-100 " +
        (className ?? "")
      }
      role="region"
      aria-label="Pipeline reliability state"
    >
      {scheduled.length > 0 ? (
        <span>
          <span className="font-medium">Scheduled retries:</span>{" "}
          {scheduled.slice(0, 3).map((r, i) => (
            <span key={r._id}>
              {i > 0 ? " · " : ""}
              {r.blockType} ({formatRelative(r.nextAttemptAtMs)}, attempt{" "}
              {r.attempt})
            </span>
          ))}
          {scheduled.length > 3 ? ` · +${scheduled.length - 3} more` : ""}
        </span>
      ) : null}
      {dlq.open > 0 ? (
        <span className="font-mono text-amber-200/80">
          · {dlq.open} open dead-letter{dlq.open === 1 ? "" : "s"} (
          {dlq.totalOccurrences.toLocaleString()} occurrence
          {dlq.totalOccurrences === 1 ? "" : "s"})
        </span>
      ) : null}
    </div>
  );
}
