import { v } from "convex/values";
import { query } from "../../_generated/server";

function buildDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const getSignalTimeseries = query({
  args: {
    keyword: v.string(),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const days = Math.max(3, Math.min(args.days ?? 14, 30));
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - (days - 1));

    const from = buildDateKey(start);
    const to = buildDateKey(now);

    const items = await ctx.db
      .query("feedItems")
      .withIndex("by_published", (q) => q.gte("publishedAt", from).lte("publishedAt", `${to}T23:59:59.999Z`))
      .collect();

    const term = args.keyword.toLowerCase();
    const counts = new Map<string, number>();
    const events = new Map<string, Array<{ title: string; url?: string; source?: string }>>();
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      counts.set(buildDateKey(d), 0);
      events.set(buildDateKey(d), []);
    }

    items.forEach((item) => {
      const haystack = `${item.title ?? ""} ${item.summary ?? ""} ${(item.tags ?? []).join(" ")}`.toLowerCase();
      if (!haystack.includes(term)) return;
      const dayKey = buildDateKey(new Date(item.publishedAt));
      if (counts.has(dayKey)) {
        counts.set(dayKey, (counts.get(dayKey) ?? 0) + 1);
      }
      if (events.has(dayKey)) {
        const list = events.get(dayKey) ?? [];
        if (list.length < 3) {
          list.push({
            title: item.title ?? "Signal",
            url: item.url ?? undefined,
            source: item.source ?? undefined,
          });
        }
        events.set(dayKey, list);
      }
    });

    return Array.from(counts.entries()).map(([date, count]) => ({
      date,
      count,
      events: events.get(date) ?? [],
    }));
  },
});
