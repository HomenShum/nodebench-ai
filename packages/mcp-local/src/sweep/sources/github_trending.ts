/**
 * GitHub Trending source — trending repos in AI/agent space.
 * No API key needed. Scrapes the trending page.
 */

import type { SweepSignal } from "../types.js";

export async function collect(): Promise<SweepSignal[]> {
  const signals: SweepSignal[] = [];
  try {
    // Use GitHub's unofficial trending API endpoint
    const resp = await fetch("https://api.github.com/search/repositories?q=stars:>100+pushed:>2026-03-25+topic:ai-agent+topic:mcp+topic:llm&sort=stars&order=desc&per_page=10", {
      signal: AbortSignal.timeout(5000),
      headers: { "Accept": "application/vnd.github.v3+json" },
    });
    if (!resp.ok) return [];
    const data = (await resp.json()) as any;

    for (const repo of (data.items ?? []).slice(0, 10)) {
      const entity = repo.full_name?.split("/")?.[1] ?? repo.name ?? "unknown";
      const stars = repo.stargazers_count ?? 0;
      const score = Math.min(100, Math.round(stars / 100));

      signals.push({
        id: `gh_${repo.id}`,
        source: "github_trending",
        entity,
        headline: `${repo.full_name}: ${(repo.description ?? "").slice(0, 80)}`,
        url: repo.html_url,
        score,
        category: "product",
        severity: stars > 5000 ? "flash" : stars > 1000 ? "priority" : "routine",
        metadata: { stars, forks: repo.forks_count, language: repo.language },
        collectedAt: new Date().toISOString(),
      });
    }
  } catch { /* GitHub unavailable */ }
  return signals;
}
