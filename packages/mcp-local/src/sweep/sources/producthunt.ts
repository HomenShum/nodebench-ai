/**
 * ProductHunt source — today's top AI/agent product launches.
 * Uses the public feed (no API key needed).
 */

import type { SweepSignal } from "../types.js";

const AI_KEYWORDS = /\b(AI|agent|LLM|GPT|Claude|copilot|automation|workflow|MCP|developer|API|no.?code|low.?code)\b/i;

export async function collect(): Promise<SweepSignal[]> {
  const signals: SweepSignal[] = [];
  try {
    // ProductHunt doesn't have a public API without OAuth, use their RSS-like endpoint
    const resp = await fetch("https://www.producthunt.com/feed?category=artificial-intelligence", {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "NodeBench/1.0", "Accept": "application/json" },
    });
    // If JSON fails, try scraping the page title patterns
    if (!resp.ok) return [];

    const text = await resp.text();
    // Extract product names and taglines from the page
    const productMatches = text.matchAll(/"name"\s*:\s*"([^"]+)".*?"tagline"\s*:\s*"([^"]+)"/g);

    for (const match of productMatches) {
      const name = match[1];
      const tagline = match[2];
      if (!AI_KEYWORDS.test(`${name} ${tagline}`)) continue;

      signals.push({
        id: `ph_${name.toLowerCase().replace(/\s+/g, "-")}`,
        source: "producthunt",
        entity: name,
        headline: `${name}: ${tagline.slice(0, 80)}`,
        url: `https://www.producthunt.com/search?q=${encodeURIComponent(name)}`,
        score: 50,
        category: "launch",
        severity: "priority",
        collectedAt: new Date().toISOString(),
      });
    }
  } catch { /* PH unavailable */ }
  return signals.slice(0, 5);
}
