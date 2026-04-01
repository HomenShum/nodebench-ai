/**
 * Yahoo Finance source — live market data for key AI/tech stocks.
 * No API key needed. Pattern from Crucix's yfinance.mjs.
 */

import type { SweepSignal } from "../types.js";

// Key AI/tech tickers that founders track
const TICKERS = ["GOOGL", "MSFT", "META", "NVDA", "AMD", "PLTR", "SNOW", "CRM"];

export async function collect(): Promise<SweepSignal[]> {
  const signals: SweepSignal[] = [];
  try {
    // Use Yahoo Finance v8 API (no key needed)
    const tickerStr = TICKERS.join(",");
    const resp = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${tickerStr}&range=1d&interval=1d`,
      { signal: AbortSignal.timeout(5000), headers: { "User-Agent": "NodeBench/1.0" } }
    );
    if (!resp.ok) return [];
    const data = (await resp.json()) as any;

    for (const ticker of TICKERS) {
      const spark = data?.spark?.result?.find((r: any) => r.symbol === ticker);
      if (!spark?.response?.[0]?.indicators?.quote?.[0]) continue;

      const quote = spark.response[0].indicators.quote[0];
      const close = quote.close?.filter(Boolean);
      if (!close?.length) continue;

      const current = close[close.length - 1];
      const prev = close[0];
      const changePct = prev > 0 ? ((current - prev) / prev) * 100 : 0;
      const absChange = Math.abs(changePct);

      if (absChange < 2) continue; // Only signal meaningful moves

      signals.push({
        id: `yf_${ticker}_${new Date().toISOString().slice(0, 10)}`,
        source: "yahoo_finance",
        entity: ticker,
        headline: `${ticker} ${changePct > 0 ? "up" : "down"} ${absChange.toFixed(1)}% today ($${current.toFixed(2)})`,
        url: `https://finance.yahoo.com/quote/${ticker}`,
        score: Math.min(100, Math.round(absChange * 10)),
        category: "market",
        severity: absChange > 5 ? "flash" : absChange > 3 ? "priority" : "routine",
        metadata: { price: current, changePct: Math.round(changePct * 100) / 100 },
        collectedAt: new Date().toISOString(),
      });
    }
  } catch { /* Yahoo unavailable */ }
  return signals;
}
