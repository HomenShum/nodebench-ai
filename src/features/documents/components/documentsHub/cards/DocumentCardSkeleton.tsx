/**
 * DocumentCardSkeleton Component
 *
 * Lightweight loading skeleton for document cards while data is fetching.
 */

export function DocumentCardSkeleton() {
  return (
    <div className="group relative">
      <div className="document-card--hybrid animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg-primary)]" />

            <div className="w-24 h-5 rounded bg-[var(--bg-primary)]" />
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--bg-primary)]" />

            <div className="w-7 h-7 rounded-md bg-[var(--bg-primary)]" />
          </div>
        </div>

        <div className="flex-1 min-h-0 mb-2">
          <div className="h-4 bg-[var(--bg-primary)] rounded w-3/4 mb-2" />

          <div className="h-4 bg-[var(--bg-primary)] rounded w-2/3" />
        </div>

        <div className="flex-shrink-0 pt-2 border-t border-[var(--border-color)]">
          <div className="h-3 bg-[var(--bg-primary)] rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}
