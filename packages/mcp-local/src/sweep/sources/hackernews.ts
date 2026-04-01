/**
 * HackerNews source — top stories mentioning AI/agent/startup companies.
 * No API key needed. Uses official HN Firebase API.
 * Pattern: Crucix's self-contained source module with briefing() export.
 */

import type { SweepSignal } from "../types.js";

const HN_TOP_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

// AI/agent/startup keywords that matter to founders
const SIGNAL_KEYWORDS = /\b(AI|GPT|Claude|Anthropic|OpenAI|LLM|agent|MCP|startup|YC|funding|Series [A-D]|acquisition|IPO|valuation|launch|open.?source|developer tool|API|infra|vector|RAG|fine.?tun)/i;

export async function collect(): Promise<SweepSignal[]> {
  const signals: SweepSignal[] = [];
  try {
    const resp = await fetch(HN_TOP_URL, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return [];
    const ids = (await resp.json()) as number[];

    // Fetch top 30 stories in parallel
    const items = await Promise.all(
      ids.slice(0, 30).map(async (id) => {
        try {
          const r = await fetch(HN_ITEM_URL(id), { signal: AbortSignal.timeout(3000) });
          return r.ok ? await r.json() : null;
        } catch { return null; }
      })
    );

    for (const item of items as any[]) {
      if (!item?.title) continue;
      if (!SIGNAL_KEYWORDS.test(item.title)) continue;

      // Extract entity from title
      const entityMatch = item.title.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)/);
      const entity = entityMatch?.[0] ?? item.title.split(/[:\-–—]/).map((s: string) => s.trim())[0].slice(0, 30);

      const score = Math.min(100, Math.round((item.score ?? 0) / 5));
      const severity = score > 60 ? "flash" : score > 30 ? "priority" : "routine";

      signals.push({
        id: `hn_${item.id}`,
        source: "hackernews",
        entity,
        headline: item.title.slice(0, 120),
        url: item.url ?? `https://news.ycombinator.com/item?id=${item.id}`,
        score,
        category: /fund|rais|series|valuation/i.test(item.title) ? "funding"
          : /launch|ship|release|announce/i.test(item.title) ? "launch"
          : /acqui|merge|IPO/i.test(item.title) ? "market"
          : "trend",
        severity,
        metadata: { points: item.score, comments: item.descendants },
        collectedAt: new Date().toISOString(),
      });
    }
  } catch { /* HN unavailable — non-fatal */ }
  return signals;
}
