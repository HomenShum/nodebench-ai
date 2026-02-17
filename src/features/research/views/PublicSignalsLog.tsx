import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import ReactMarkdown from "react-markdown";

function utcDayString(ms = Date.now()): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function PublicSignalsLog() {
  const [day, setDay] = useState<string>(() => utcDayString());

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
          <h2 className="text-xl font-semibold text-[color:var(--text-primary)]">Signals</h2>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-sm text-[color:var(--text-primary)]" htmlFor="signals-day">
              Day (UTC)
            </label>
            <input
              id="signals-day"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="border border-[color:var(--border-color)] rounded-md px-2 py-1 text-sm"
            />
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[color:var(--text-primary)] mb-1">No signals for {day}</p>
            <p className="text-xs text-[color:var(--text-secondary)] max-w-xs">Signals are research events captured throughout the day — articles, data points, and insights. Try selecting a different date.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((e) => (
              <div key={String(e._id)} className="border border-[color:var(--border-color)] rounded-lg p-4 bg-[color:var(--bg-primary)]">
                <div className="flex items-center gap-2">
                  <div className="text-xs px-2 py-0.5 rounded bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)]">
                    {e.kind}
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
                  <ReactMarkdown>{e.markdown ?? ""}</ReactMarkdown>
                </div>

                {Array.isArray(e.tags) && e.tags.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {e.tags.map((t: string) => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                        {t}
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

