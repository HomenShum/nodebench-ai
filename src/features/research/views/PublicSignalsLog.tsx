import { useMemo, useState, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import { ChevronLeft, ChevronRight } from "lucide-react";

function utcDayString(ms = Date.now()): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDayLabel(isoDay: string): string {
  const [yyyy, mm, dd] = isoDay.split("-").map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return d.toLocaleDateString('en-US', { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function offsetDay(isoDay: string, offset: number): string {
  const [yyyy, mm, dd] = isoDay.split("-").map(Number);
  const d = new Date(Date.UTC(yyyy, mm - 1, dd + offset));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const KIND_LABELS: Record<string, string> = {
  daily_brief: 'Daily Brief',
  daily_snapshot: 'Snapshot',
  signal: 'Signal',
  linkedin_funding: 'Funding',
  linkedin_post: 'Post',
  news: 'News',
  research: 'Research',
  repo: 'Repository',
  product: 'Product',
  alert: 'Alert',
};

function formatKindLabel(kind: string): string {
  return KIND_LABELS[kind] || kind.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Sanitize markdown content from API — replace raw slugs with readable labels,
 *  hide nonsensical trend indicators (e.g., "0.0% (Rising)"). */
function formatUrlLabel(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function sanitizeSignalMarkdown(raw: string): string {
  let text = raw;
  // Map common category slugs to readable labels
  text = text.replace(/\bai_ml\b/gi, 'AI & ML');
  text = text.replace(/\bopen_source\b/gi, 'Open Source');
  text = text.replace(/\bopensource\b/gi, 'Open Source');
  text = text.replace(/\bmachine_learning\b/gi, 'Machine Learning');
  text = text.replace(/\bdeep_learning\b/gi, 'Deep Learning');
  text = text.replace(/\bdata_science\b/gi, 'Data Science');
  text = text.replace(/\bnatural_language_processing\b/gi, 'NLP');
  text = text.replace(/\bcomputer_vision\b/gi, 'Computer Vision');
  // Hide trend indicators when value is 0.0 — logically meaningless
  text = text.replace(/\b0\.0%?\s*\((Rising|Falling)\)/gi, '0.0%');
  // Remove redundant inline "Dashboard" links — they repeat navigation already available in sidebar
  text = text.replace(/\[?Open Full Dashboard\]?\([^)]*\)/gi, '');
  text = text.replace(/\[?Open Signals Log\]?\([^)]*\)/gi, '');
  text = text.replace(/\s*\[?Dashboard\]?\(\/[^)]*\)/g, '');
  return text;
}

export function PublicSignalsLog() {
  const [day, setDay] = useState<string>(() => utcDayString());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const today = utcDayString();
  const isToday = day === today;

  const prevDay = useCallback(() => setDay((d) => offsetDay(d, -1)), []);
  const nextDay = useCallback(() => setDay((d) => offsetDay(d, 1)), []);

  const entries = useQuery((api as any).domains.landing.landingPageLog.listPublic, {
    day,
    limit: 250,
  }) as Array<any> | undefined;

  const sorted = useMemo(() => {
    const list = entries ?? [];
    return [...list].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }, [entries]);

  return (
    <div className="h-full w-full overflow-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">Signals</h2>
            <p className="text-xs text-[color:var(--text-secondary)] mt-0.5">Research events captured throughout the day — articles, data points, insights</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={prevDay}
              aria-label="Previous day"
              className="p-1.5 rounded-md hover:bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="relative">
              <span className="block px-3 py-1 text-sm border border-[color:var(--border-color)] rounded-md bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] min-w-[160px] text-center">
                {formatDayLabel(day)}
              </span>
              <input
                id="signals-day"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                aria-label="Select date"
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </div>
            <button
              type="button"
              onClick={nextDay}
              disabled={isToday}
              aria-label="Next day"
              className="p-1.5 rounded-md hover:bg-[color:var(--bg-secondary)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-[color:var(--text-primary)] mb-2">No signals for {formatDayLabel(day)}</p>
            <p className="text-sm text-[color:var(--text-secondary)] max-w-xs">Signals are research events captured throughout the day — articles, data points, and insights. Use the arrows above to navigate to a different date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((e) => (
              <div key={String(e._id)} className="border border-[color:var(--border-color)] rounded-lg p-4 bg-[color:var(--bg-primary)]">
                <div className="flex items-center gap-2">
                  <div className="text-xs px-2 py-0.5 rounded bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)]">
                    {formatKindLabel(e.kind)}
                  </div>
                  <div className="text-sm font-semibold text-[color:var(--text-primary)]">{e.title}</div>
                  <div className="ml-auto text-xs text-[color:var(--text-secondary)]">
                    {typeof e.createdAt === "number" ? new Date(e.createdAt).toLocaleTimeString() : ""}
                  </div>
                </div>

                {e.url ? (
                  <div className="mt-1 text-xs">
                    <a className="text-blue-600 hover:underline" href={e.url} target="_blank" rel="noreferrer">
                      {e.url}
                    </a>
                  </div>
                ) : null}

                <div className="prose prose-sm max-w-none mt-3">
                  <ReactMarkdown>{sanitizeSignalMarkdown(e.markdown ?? "")}</ReactMarkdown>
                </div>

                {Array.isArray(e.tags) && e.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {e.tags.map((t: string) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {t.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
