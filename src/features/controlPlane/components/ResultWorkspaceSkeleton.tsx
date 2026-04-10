/**
 * ResultWorkspaceSkeleton — Shimmer placeholders matching the 5-tab ResultWorkspace layout.
 *
 * Shows during search while the pipeline runs. Respects prefers-reduced-motion.
 * Tabs: Overview (confidence bar + 3 claim lines), Analysis (2 sections),
 *       Actions (3 buttons), Lens (3 cards), Sources (4 source cards).
 */

import { memo } from "react";

function ShimmerLine({ width = "100%", height = "14px", className = "" }: { width?: string; height?: string; className?: string }) {
  return (
    <div
      className={`rounded bg-white/[0.06] ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    >
      <div className="h-full w-full animate-pulse rounded bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02] bg-[length:200%_100%] motion-reduce:animate-none motion-reduce:bg-white/[0.04]" />
    </div>
  );
}

function ShimmerBadge({ width = "80px" }: { width?: string }) {
  return (
    <div className="rounded-full bg-white/[0.06]" style={{ width, height: "24px" }} aria-hidden="true">
      <div className="h-full w-full animate-pulse rounded-full bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02] bg-[length:200%_100%] motion-reduce:animate-none motion-reduce:bg-white/[0.04]" />
    </div>
  );
}

function ShimmerSection({ titleWidth = "120px", lines = 3 }: { titleWidth?: string; lines?: number }) {
  return (
    <div className="space-y-3">
      <ShimmerLine width={titleWidth} height="11px" />
      {Array.from({ length: lines }).map((_, i) => (
        <ShimmerLine key={i} width={`${70 + Math.random() * 30}%`} height="14px" />
      ))}
    </div>
  );
}

function ShimmerSourceCard() {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ShimmerBadge width="48px" />
        <ShimmerLine width="60%" height="12px" />
      </div>
      <ShimmerLine width="90%" height="12px" />
      <ShimmerLine width="50%" height="10px" />
    </div>
  );
}

function ShimmerLensCard() {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <ShimmerLine width="40%" height="13px" />
      <ShimmerLine width="80%" height="12px" />
      <ShimmerLine width="65%" height="12px" />
      <div className="pt-2">
        <ShimmerLine width="50%" height="10px" />
      </div>
    </div>
  );
}

const TAB_IDS = ["overview", "analysis", "actions", "lens", "sources"] as const;

export const ResultWorkspaceSkeleton = memo(function ResultWorkspaceSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading search results">
      {/* Tab bar skeleton */}
      <div className="flex gap-1 border-b border-white/[0.06] pb-2">
        {TAB_IDS.map((tab) => (
          <div
            key={tab}
            className="rounded-lg px-3 py-1.5"
            aria-hidden="true"
          >
            <ShimmerLine width={tab === "overview" ? "56px" : tab === "analysis" ? "52px" : tab === "actions" ? "44px" : tab === "lens" ? "32px" : "48px"} height="11px" />
          </div>
        ))}
      </div>

      {/* Overview skeleton */}
      <div className="space-y-4">
        {/* Confidence bar */}
        <div className="flex items-center gap-3">
          <ShimmerBadge width="100px" />
          <ShimmerLine width="70%" height="8px" className="rounded-full" />
        </div>

        {/* Entity name */}
        <ShimmerLine width="40%" height="18px" />

        {/* Answer lines */}
        <div className="space-y-2">
          <ShimmerLine width="95%" height="14px" />
          <ShimmerLine width="88%" height="14px" />
          <ShimmerLine width="72%" height="14px" />
        </div>

        {/* Claim sections */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <ShimmerLine width="50%" height="11px" />
            <ShimmerLine width="85%" height="12px" />
            <ShimmerLine width="70%" height="12px" />
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
            <ShimmerLine width="45%" height="11px" />
            <ShimmerLine width="80%" height="12px" />
            <ShimmerLine width="65%" height="12px" />
          </div>
        </div>
      </div>

      {/* Source cards skeleton */}
      <div className="space-y-2">
        <ShimmerLine width="60px" height="11px" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerSourceCard key={i} />
          ))}
        </div>
      </div>

      {/* Lens cards skeleton */}
      <div className="space-y-2">
        <ShimmerLine width="80px" height="11px" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <ShimmerLensCard key={i} />
          ))}
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="flex gap-2 pt-2">
        <ShimmerBadge width="80px" />
        <ShimmerBadge width="72px" />
        <ShimmerBadge width="96px" />
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only">Search results loading…</span>
    </div>
  );
});

export default ResultWorkspaceSkeleton;
