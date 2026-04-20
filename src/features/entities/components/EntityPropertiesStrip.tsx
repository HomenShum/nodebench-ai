/**
 * EntityPropertiesStrip — compact chips row that reads like Notion's
 * page properties.
 *
 * Design intent: this is the "what is this entity" answer for the
 * reader's first glance. Chips are quiet, monospace-numeric-tabular,
 * and wrap naturally. No background card, no heavy shell — they sit
 * between the title and the notebook body like page metadata.
 *
 * Empty props are omitted entirely (not rendered as "—"). A strip
 * with zero resolved chips returns null so the first fold tightens
 * up for brand-new entities.
 *
 * Pattern: Notion page properties + Linear issue metadata row.
 */

import { memo } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EntityPropertiesStripProps {
  /** Optional stage (Seed, Series A, etc.). */
  stage?: string | null;
  /** Industry / sector. */
  sector?: string | null;
  /** Resolved source count (evidence). */
  sourceCount?: number | null;
  /** User-authored notes count. */
  noteCount?: number | null;
  /** Completed agent-run count. */
  runCount?: number | null;
  /** Last-updated timestamp in ms. Shown as "9h ago". */
  updatedAt?: number | null;
  /** Extra chips (backlinks count, tracked status, etc.). */
  extraChips?: ReactNode;
  className?: string;
}

function formatRelative(ts: number): string {
  const delta = Math.max(0, Date.now() - ts);
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function Chip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs">
      <span className="text-content-muted">{label}</span>
      <span className="font-medium tabular-nums text-content">{value}</span>
    </span>
  );
}

export const EntityPropertiesStrip = memo(function EntityPropertiesStrip({
  stage,
  sector,
  sourceCount,
  noteCount,
  runCount,
  updatedAt,
  extraChips,
  className,
}: EntityPropertiesStripProps) {
  const chips: ReactNode[] = [];
  if (stage) chips.push(<Chip key="stage" label="Stage" value={stage} />);
  if (sector) chips.push(<Chip key="sector" label="Sector" value={sector} />);
  if (typeof sourceCount === "number" && sourceCount > 0) {
    chips.push(<Chip key="sources" label="Sources" value={sourceCount} />);
  }
  if (typeof noteCount === "number" && noteCount > 0) {
    chips.push(<Chip key="notes" label="Notes" value={noteCount} />);
  }
  if (typeof runCount === "number" && runCount > 0) {
    chips.push(<Chip key="runs" label="Runs" value={runCount} />);
  }
  if (typeof updatedAt === "number" && updatedAt > 0) {
    chips.push(<Chip key="updated" label="Updated" value={formatRelative(updatedAt)} />);
  }
  if (chips.length === 0 && !extraChips) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-1.5 text-content",
        className,
      )}
      role="group"
      aria-label="Entity properties"
    >
      {chips}
      {extraChips}
    </div>
  );
});

EntityPropertiesStrip.displayName = "EntityPropertiesStrip";
