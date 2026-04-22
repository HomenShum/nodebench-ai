/**
 * SourcesBar — Horizontal scrollable row of source pills at the top of results.
 *
 * Each pill shows: local domain monogram + domain name + numbered badge.
 * Click opens the URL in a new tab.
 *
 * Usage:
 *   <SourcesBar sources={packet.sourceRefs} />
 */

import { memo } from "react";
import { SourceChip } from "@/shared/ui";
import type { ResultSourceRef } from "./searchTypes";

interface SourcesBarProps {
  sources: ResultSourceRef[];
}

export const SourcesBar = memo(function SourcesBar({ sources }: SourcesBarProps) {
  const citedSources = sources.filter(
    (s) => s.status !== "discarded" && s.href,
  );

  if (citedSources.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-content-muted">
          Sources
        </span>
        <span className="rounded-full bg-[#d97757]/15 px-1.5 py-0.5 text-[9px] font-bold text-[#d97757]">
          {citedSources.length}
        </span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        role="list"
        aria-label="Sources used in this result"
      >
        {citedSources.map((source, index) => {
          const domain = source.domain ?? extractDomain(source.href);
          const monogram = buildMonogram(domain ?? source.label);

          return (
            <SourceChip
              key={source.id}
              href={source.href}
              prefix={
                <span className="flex h-4 w-4 items-center justify-center rounded bg-white/[0.06] text-[9px] font-semibold uppercase text-content-muted">
                  {monogram}
                </span>
              }
              badge={index + 1}
              label={domain ?? source.label}
              tone="accent"
              truncate
              className="group shrink-0 rounded-lg border-white/[0.08] bg-white/[0.02]"
            />
          );
        })}
      </div>
    </div>
  );
});

/* ─── Helper ───────────────────────────────────────────────────────────────── */

function extractDomain(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function buildMonogram(value: string): string {
  const segments = value
    .replace(/^www\./, "")
    .split(/[.\s-]+/)
    .filter(Boolean);
  const joined = segments.slice(0, 2).map((segment) => segment[0]?.toUpperCase() ?? "").join("");
  return joined || "•";
}
