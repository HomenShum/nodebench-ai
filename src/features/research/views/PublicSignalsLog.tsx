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
          <div className="text-sm text-[color:var(--text-secondary)]">No entries for {day}.</div>
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

