/**
 * EntityMemoryPanel — read-only view of the per-entity MEMORY.md index.
 *
 * Shows the one-liner summary for each topic file the entity has accumulated
 * across runs. Click a row to expand the full fact list (latest first).
 *
 * Layered memory (layered_memory.md L1 view):
 *   - topicCount + totalFactCount as the hero header
 *   - per-topic one-liner rows sorted by most recently compacted first
 *   - collapsible detail that loads the full topic content on expand
 *
 * Design posture:
 *   - Silent when the entity has no topic files yet (cold start)
 *   - Progressive disclosure (reexamine_performance.md)
 *   - Every fact row includes observedAt so operators see recency
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

type MemoryIndex = {
  entitySlug: string;
  topicCount: number;
  totalFactCount: number;
  lastRebuildAt: number;
  entries: Array<{
    topicName: string;
    oneLineSummary: string;
    factCount: number;
    compactedAt: number;
  }>;
};

type TopicDetail = {
  entitySlug: string;
  topicName: string;
  oneLineSummary: string;
  factCount: number;
  compactedAt: number;
  content: {
    topicName: string;
    facts: ReadonlyArray<{
      text: string;
      observedAt: number;
      sourceRefId?: string;
    }>;
    oneLineSummary: string;
    compactedAt: number;
    schemaVersion: number;
  } | null;
} | null;

export type EntityMemoryPanelProps = {
  entitySlug: string;
  className?: string;
};

function formatRelative(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function TopicDetailPanel({
  entitySlug,
  topicName,
}: {
  entitySlug: string;
  topicName: string;
}) {
  const detail = useQuery(
    api.domains.product.entityMemory.readTopic,
    { entitySlug, topicName },
  ) as TopicDetail;

  if (detail === undefined) {
    return (
      <div className="py-1 text-[11px] text-white/50">Loading facts…</div>
    );
  }
  if (!detail || !detail.content) {
    return <div className="py-1 text-[11px] text-white/50">(empty)</div>;
  }
  return (
    <ul className="mt-1 space-y-1 py-1">
      {detail.content.facts.slice(0, 12).map((f, i) => (
        <li
          key={i}
          className="flex items-start gap-2 text-xs text-white/75"
        >
          <span className="mt-0.5 text-white/40">·</span>
          <span className="flex-1">{f.text}</span>
          <span className="shrink-0 font-mono text-[10px] text-white/40">
            {formatRelative(f.observedAt)}
          </span>
        </li>
      ))}
      {detail.content.facts.length > 12 ? (
        <li className="text-[11px] text-white/40">
          +{detail.content.facts.length - 12} more facts
        </li>
      ) : null}
    </ul>
  );
}

export function EntityMemoryPanel({
  entitySlug,
  className,
}: EntityMemoryPanelProps) {
  const index = useQuery(api.domains.product.entityMemory.getMemoryIndex, {
    entitySlug,
  }) as MemoryIndex | undefined;

  const [expanded, setExpanded] = useState<string | null>(null);

  if (index === undefined) return null; // loading silently

  // Cold start: hide entirely when there are no topics yet.
  if (index.topicCount === 0) return null;

  // Sort entries by compactedAt desc.
  const sorted = [...index.entries].sort((a, b) => b.compactedAt - a.compactedAt);

  return (
    <section
      className={
        "rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 " +
        (className ?? "")
      }
      role="region"
      aria-label="Entity memory index"
    >
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/60">
          Memory index
        </h2>
        <span className="font-mono text-[11px] text-white/50">
          {index.topicCount} topic{index.topicCount === 1 ? "" : "s"} ·{" "}
          {index.totalFactCount.toLocaleString()} fact
          {index.totalFactCount === 1 ? "" : "s"}
        </span>
      </header>
      <ul className="space-y-1.5">
        {sorted.map((e) => {
          const isOpen = expanded === e.topicName;
          return (
            <li
              key={e.topicName}
              className="rounded border border-white/[0.04] bg-white/[0.01]"
            >
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : e.topicName)}
                aria-expanded={isOpen}
                className="flex w-full items-baseline gap-2 px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]"
              >
                <span className="shrink-0 text-[10px] uppercase tracking-[0.15em] text-white/50">
                  {e.topicName}
                </span>
                <span className="flex-1 truncate text-white/70">
                  {e.oneLineSummary}
                </span>
                <span className="shrink-0 font-mono text-[10px] text-white/40">
                  {e.factCount} · {formatRelative(e.compactedAt)}
                </span>
                <span
                  className="shrink-0 text-[10px] text-white/40"
                  aria-hidden="true"
                >
                  {isOpen ? "▾" : "▸"}
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-white/[0.04] px-2 pb-1">
                  <TopicDetailPanel
                    entitySlug={entitySlug}
                    topicName={e.topicName}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
