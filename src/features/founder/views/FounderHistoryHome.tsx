/**
 * FounderHistoryHome — Canonical "History" surface.
 *
 * Pattern: single timeline. No tabs. Most important changes at top.
 * Clear "needs attention" vs "resolved" visual split.
 */

import { lazy, Suspense } from "react";
import { ViewSkeleton } from "@/components/skeletons";
import { ForecastGateSummary } from "../components/ForecastGateSummary";

const ChangeDetectorView = lazy(() =>
  import("@/features/founder/views/ChangeDetectorView").then((mod) => ({
    default: mod.default,
  })),
);

export function FounderHistoryHome() {
  return (
    <div className="flex h-full flex-col items-center overflow-auto px-4 pb-24 pt-12">
      {/* Headline */}
      <h1 className="text-center text-3xl font-bold text-content sm:text-4xl">
        What <span className="text-accent-primary">changed</span>
      </h1>
      <p className="mt-3 max-w-lg text-center text-sm text-content-muted">
        Important changes since your last session. Review, resolve, or dismiss — most urgent first.
      </p>

      {/* Single change timeline — no tabs, just the changes */}
      <ForecastGateSummary surface="history" />

      <div className="mt-8 w-full max-w-3xl">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <Suspense fallback={<ViewSkeleton variant="default" />}>
            <ChangeDetectorView />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default FounderHistoryHome;
