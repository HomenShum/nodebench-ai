/**
 * Web signals source — uses NodeBench's own web_search to find
 * today's top AI/agent news. This is the bridge between Crucix-style
 * OSINT and NodeBench's existing search infrastructure.
 */

import type { SweepSignal } from "../types.js";

const SIGNAL_QUERIES = [
  "AI agent startup funding raised 2026",
  "MCP model context protocol news today",
  "AI coding tool launch announcement",
  "enterprise AI competitive landscape shifts",
];

export async function collect(): Promise<SweepSignal[]> {
  const signals: SweepSignal[] = [];
  try {
    // Use NodeBench's own search API to find signals
    const query = SIGNAL_QUERIES[new Date().getHours() % SIGNAL_QUERIES.length];

    const resp = await fetch("https://www.nodebenchai.com/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, lens: "investor" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as any;

    const result = data.result;
    if (!result) return [];

    // Extract signals from the search result
    for (const sig of (result.signals ?? []).slice(0, 5)) {
      signals.push({
        id: `ws_${Date.now()}_${signals.length}`,
        source: "web_signals",
        entity: sig.name?.split(/[:\-–]/)?.map((s: string) => s.trim())?.[0]?.slice(0, 30) ?? "AI Market",
        headline: sig.name?.slice(0, 120) ?? "",
        score: sig.impact === "high" ? 80 : sig.impact === "medium" ? 50 : 30,
        category: "trend",
        severity: sig.impact === "high" ? "priority" : "routine",
        metadata: { direction: sig.direction, impact: sig.impact },
        collectedAt: new Date().toISOString(),
      });
    }

    // Extract entity from the result
    const entityName = result.canonicalEntity?.name;
    if (entityName && entityName.length > 1) {
      const answer = result.canonicalEntity?.canonicalMission ?? "";
      signals.unshift({
        id: `ws_entity_${Date.now()}`,
        source: "web_signals",
        entity: entityName,
        headline: answer.slice(0, 120) || `Intelligence on ${entityName}`,
        score: result.canonicalEntity?.identityConfidence ?? 50,
        category: "company",
        severity: "priority",
        metadata: { confidence: result.canonicalEntity?.identityConfidence },
        collectedAt: new Date().toISOString(),
      });
    }
  } catch { /* search unavailable */ }
  return signals;
}
