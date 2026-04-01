/**
 * OpenBB-style financial data source.
 * Uses free Yahoo Finance API (same pattern as OpenBB's data providers).
 * No API key needed.
 *
 * Tracks: major AI/tech company fundamentals that founders care about.
 */

import type { SweepSignal } from "../types.js";

const TRACKED_TICKERS: Record<string, string> = {
  "GOOGL": "Alphabet/Google", "MSFT": "Microsoft", "META": "Meta",
  "NVDA": "NVIDIA", "AMD": "AMD", "CRM": "Salesforce",
  "PLTR": "Palantir", "SNOW": "Snowflake", "NET": "Cloudflare",
};

export async function collect(): Promise<SweepSignal[]> {
  const signals: SweepSignal[] = [];
  try {
    const tickers = Object.keys(TRACKED_TICKERS).join(",");
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${tickers}&fields=regularMarketPrice,regularMarketChangePercent,marketCap,fiftyDayAverage`,
      { signal: AbortSignal.timeout(5000), headers: { "User-Agent": "NodeBench/1.0" } }
    );
    if (!resp.ok) return [];
    const data = (await resp.json()) as any;
    const quotes = data?.quoteResponse?.result ?? [];

    for (const q of quotes) {
      const changePct = q.regularMarketChangePercent ?? 0;
      const absChange = Math.abs(changePct);
      if (absChange < 1.5) continue; // Only significant moves

      const name = TRACKED_TICKERS[q.symbol] ?? q.symbol;
      const mcap = q.marketCap ? `$${(q.marketCap / 1e9).toFixed(0)}B` : "";

      signals.push({
        id: `fin_${q.symbol}_${new Date().toISOString().slice(0, 10)}`,
        source: "openbb_finance",
        entity: name,
        headline: `${name} (${q.symbol}) ${changePct > 0 ? "↑" : "↓"} ${absChange.toFixed(1)}% ${mcap ? `— ${mcap} market cap` : ""}`,
        url: `https://finance.yahoo.com/quote/${q.symbol}`,
        score: Math.min(100, Math.round(absChange * 15)),
        category: "market",
        severity: absChange > 5 ? "flash" : absChange > 3 ? "priority" : "routine",
        metadata: { ticker: q.symbol, price: q.regularMarketPrice, changePct, marketCap: q.marketCap },
        collectedAt: new Date().toISOString(),
      });
    }
  } catch { /* Yahoo unavailable */ }
  return signals;
}
