/**
 * SignalMetricsDashboard - Phase 7 Signal Metrics Display
 *
 * Shows quantitative signal metrics across 5 domains for a narrative thread:
 * - attention: News/social/search volume
 * - policy: EO/regulatory activity
 * - labor: Job postings, layoffs
 * - market: Funding, M&A, insider trading
 * - sentiment: Public opinion shifts
 *
 * @module features/narrative/components/SignalMetricsDashboard
 */

import React from "react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useThreadSignalSummary } from "../../hooks/useSignalMetrics";

interface SignalMetricsDashboardProps {
  threadId: Id<"narrativeThreads">;
  className?: string;
}

const DOMAIN_META: Record<string, { label: string; icon: string; color: string }> = {
  attention: { label: "Attention", icon: "\u{1F4E2}", color: "bg-sky-500" },
  policy: { label: "Policy", icon: "\u{1F3DB}", color: "bg-indigo-500" },
  labor: { label: "Labor", icon: "\u{1F477}", color: "bg-amber-500" },
  market: { label: "Market", icon: "\u{1F4C8}", color: "bg-emerald-500" },
  sentiment: { label: "Sentiment", icon: "\u{1F4AC}", color: "bg-violet-500" },
};

const DOMAINS = ["attention", "policy", "labor", "market", "sentiment"] as const;

export function SignalMetricsDashboard({ threadId, className = "" }: SignalMetricsDashboardProps) {
  const summary = useThreadSignalSummary(threadId);

  if (!summary) {
    return (
      <div className={`animate-pulse rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        <div className="h-4 w-40 rounded bg-gray-200 mb-3" />
        <div className="grid grid-cols-5 gap-2">
          {DOMAINS.map((d) => (
            <div key={d} className="h-16 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const domains = summary.domains as Record<string, { latest: number | null; metricCount: number; avgConfidence: number }>;
  const hasAnyData = DOMAINS.some((d) => domains[d]?.metricCount > 0);

  if (!hasAnyData) {
    return null;
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">
          Signal Metrics
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Quantitative indicators across 5 domains
        </p>
      </div>

      {/* Domain Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {DOMAINS.map((domain) => {
          const meta = DOMAIN_META[domain];
          const data = domains[domain];
          const hasData = data && data.metricCount > 0;

          return (
            <div key={domain} className="px-3 py-3 text-center">
              {/* Domain icon + label */}
              <div className="text-lg mb-1">{meta.icon}</div>
              <div className="text-xs font-medium text-gray-700 mb-2">
                {meta.label}
              </div>

              {hasData ? (
                <>
                  {/* Latest value */}
                  <div className="text-lg font-bold text-gray-900">
                    {data.latest !== null
                      ? data.latest % 1 === 0
                        ? data.latest.toLocaleString()
                        : data.latest.toFixed(2)
                      : "--"}
                  </div>

                  {/* Metric count */}
                  <div className="text-xs text-gray-400 mt-1">
                    {data.metricCount} metric{data.metricCount !== 1 ? "s" : ""}
                  </div>

                  {/* Confidence indicator */}
                  <div className="mt-2 mx-auto w-12">
                    <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${meta.color}`}
                        style={{ width: `${Math.round(data.avgConfidence * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {Math.round(data.avgConfidence * 100)}%
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-300 mt-2">
                  No data
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SignalMetricsDashboard;
