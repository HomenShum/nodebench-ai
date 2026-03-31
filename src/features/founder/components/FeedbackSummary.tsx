/**
 * FeedbackSummary — Dashboard card showing aggregated user feedback.
 *
 * Glass card DNA styling. Reads from localStorage via useFeedbackStore.
 * Shows count, average rating, category breakdown, recent comments, and export.
 */

import { memo, useCallback } from "react";
import {
  useFeedbackStore,
  FEEDBACK_CATEGORIES,
  type FeedbackCategory,
} from "../hooks/useFeedbackStore";

// ── Star display ─────────────────────────────────────────────────────────────

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={star <= Math.round(value) ? "#d97757" : "none"}
          stroke={star <= Math.round(value) ? "#d97757" : "currentColor"}
          strokeWidth="1.5"
          className={star <= Math.round(value) ? "" : "text-content-muted/30"}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

// ── Category bar ─────────────────────────────────────────────────────────────

function CategoryBar({
  label,
  count,
  maxCount,
}: {
  label: string;
  count: number;
  maxCount: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="w-24 shrink-0 truncate text-content-muted">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
        <div
          className="h-full rounded-full bg-accent-primary/70 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right tabular-nums text-content-muted/70">{count}</span>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export const FeedbackSummary = memo(function FeedbackSummary() {
  const { feedbackItems, averageRating, totalCount, categoryBreakdown } =
    useFeedbackStore();

  const maxCategoryCount = Math.max(
    1,
    ...Object.values(categoryBreakdown),
  );

  const recentComments = feedbackItems
    .filter((item) => item.comment.length > 0)
    .slice(-3)
    .reverse();

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(feedbackItems, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nodebench-feedback-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [feedbackItems]);

  if (totalCount === 0) {
    return (
      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-content-muted mb-3">
          User Feedback
        </h3>
        <p className="text-[13px] text-content-muted/60">
          No feedback collected yet. Use the feedback button to share your
          thoughts.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-content-muted">
          User Feedback
        </h3>
        <button
          type="button"
          onClick={handleExport}
          className="text-[11px] text-accent-primary/80 hover:text-accent-primary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent-primary rounded px-1"
          aria-label="Export feedback as JSON"
        >
          Export JSON
        </button>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Stars value={averageRating} />
          <span className="text-[15px] font-semibold text-content tabular-nums">
            {averageRating.toFixed(1)}
          </span>
        </div>
        <span className="text-[12px] text-content-muted/60">
          {totalCount} response{totalCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Category breakdown */}
      <div className="space-y-1.5">
        <h4 className="text-[11px] uppercase tracking-[0.2em] text-content-muted/70">
          By category
        </h4>
        {FEEDBACK_CATEGORIES.map((cat: FeedbackCategory) => (
          <CategoryBar
            key={cat}
            label={cat}
            count={categoryBreakdown[cat]}
            maxCount={maxCategoryCount}
          />
        ))}
      </div>

      {/* Recent comments */}
      {recentComments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-[11px] uppercase tracking-[0.2em] text-content-muted/70">
            Recent comments
          </h4>
          {recentComments.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-2 text-[12px] text-content-muted"
            >
              <span className="shrink-0 text-accent-primary/70">
                {"*".repeat(item.rating)}
              </span>
              <span className="line-clamp-2">{item.comment}</span>
              <span className="ml-auto shrink-0 text-[11px] text-content-muted/40 tabular-nums">
                {new Date(item.timestamp).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});
