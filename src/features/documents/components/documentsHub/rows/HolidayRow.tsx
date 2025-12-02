/**
 * HolidayRow Component
 * 
 * A row component for displaying holidays in list view with:
 * - Purple status stripe
 * - All-day checkbox (read-only)
 * - Date display
 * - Consistent styling with TaskRow
 */

import { CalendarDays } from "lucide-react";

export interface HolidayRowProps {
  h: any;
}

export const HolidayRowGlobal = ({ h }: HolidayRowProps) => {
  const title = String(h?.name ?? h?.title ?? "Holiday");

  const toLocalDate = (): string | null => {
    if (typeof h?.dateKey === "string") {
      const parts = String(h.dateKey).split("-");

      if (parts.length === 3) {
        const y = Number(parts[0]);
        const m = Number(parts[1]);
        const d = Number(parts[2]);

        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
          return new Date(y, m - 1, d, 0, 0, 0, 0).toLocaleDateString();
        }
      }
    }

    if (typeof h?.dateMs === "number")
      return new Date(h.dateMs).toLocaleDateString();

    return null;
  };

  const dateStr = toLocalDate();

  return (
    <div className="group relative">
      <div
        className={
          "document-item group/doc relative px-3 py-2 rounded-sm overflow-hidden cursor-pointer text-sm " +
          "bg-[var(--bg-secondary)] border border-[var(--border-color)] " +
          "transition-all duration-200 hover:bg-[var(--bg-hover)] " +
          "flex items-center justify-between " +
          "focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--accent-primary)] hover:ring-2 ring-1 ring-[var(--accent-primary)]/10"
        }
        role="button"
        tabIndex={0}
      >
        {/* Watermark */}
        <span
          className="document-card__bg document-row__bg text-[var(--accent-primary)]"
          aria-hidden
        >
          <CalendarDays className="h-10 w-10 rotate-12" />
        </span>

        {/* Left status bar: purple for holidays */}
        <span
          className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/70"
          aria-hidden
        />

        <div className="flex items-center gap-3 min-w-0">
          {/* Checkbox placeholder to align */}
          <input
            type="checkbox"
            checked
            readOnly
            aria-label="All-day"
            className="h-4 w-4 rounded border-[var(--border-color)] text-emerald-600 bg-white"
          />

          <div className="w-7 h-7 rounded-md bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center shrink-0">
            <CalendarDays className="h-4 w-4 group-hover/doc:text-[var(--text-primary)]" />
          </div>

          <div className="min-w-0">
            <div className="text-sm font-medium truncate text-[var(--text-primary)]">
              {title}
            </div>

            <div className="mt-1 flex items-center gap-2 flex-nowrap overflow-hidden">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] bg-amber-50 border-amber-200 text-amber-700">
                All-day
              </span>

              {dateStr && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-md border bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)]"
                  title={`Date ${dateStr}`}
                >
                  {dateStr}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="ml-2 mr-1 flex items-center">
          <div className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

