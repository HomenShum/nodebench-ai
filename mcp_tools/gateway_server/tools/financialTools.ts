/**
 * Financial data tools — a TypeScript port of a Python OpenBB-style financial
 * data server.  Uses only built-in `fetch()` (no npm packages).
 *
 * Data sources:
 *   - Stooq  (equity / crypto CSV quotes & history)
 *   - Yahoo Finance  (quote, fundamentals, news)
 *   - World Bank  (GDP, inflation)
 */

import type { McpTool } from "./researchTools.js";

// ─── helpers ────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 15_000;

function nowIso(): string {
  return new Date().toISOString();
}

/** Create an AbortSignal that fires after `ms` milliseconds. */
function timeoutSignal(ms = TIMEOUT_MS): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Parse Stooq-style CSV (header row + one data row). "N/D" → null. */
function parseStooqCsv(text: string): Record<string, string | null> {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return {};
  const headers = lines[0].split(",").map((h) => h.trim());
  const values = lines[1].split(",").map((v) => v.trim());
  const obj: Record<string, string | null> = {};
  for (let i = 0; i < headers.length; i++) {
    const val = values[i] ?? null;
    obj[headers[i]] = val === "N/D" ? null : val;
  }
  return obj;
}

/** Normalise a symbol for Stooq: append `.us` when there is no dot. */
function stooqSymbol(symbol: string): string {
  return symbol.includes(".") ? symbol.toLowerCase() : `${symbol.toLowerCase()}.us`;
}

/** Fetch a real-time CSV quote from Stooq. */
async function fetchStooqQuote(
  symbol: string,
): Promise<Record<string, string | null>> {
  const s = stooqSymbol(symbol);
  const url = `https://stooq.com/q/l/?s=${s}&f=sd2t2ohlcv&h=1&e=csv`;
  const res = await fetch(url, { signal: timeoutSignal() });
  if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
  const text = await res.text();
  if (text.includes("Exceeded the daily hits limit")) {
    throw new Error("Stooq daily rate limit exceeded");
  }
  const parsed = parseStooqCsv(text);
  return {
    symbol: parsed["Symbol"] ?? symbol.toUpperCase(),
    date: parsed["Date"] ?? null,
    time: parsed["Time"] ?? null,
    open: parsed["Open"] ?? null,
    high: parsed["High"] ?? null,
    low: parsed["Low"] ?? null,
    close: parsed["Close"] ?? null,
    volume: parsed["Volume"] ?? null,
  };
}

/** Fetch a quote snapshot from Yahoo Finance v7. */
async function fetchYahooQuote(symbol: string): Promise<Record<string, any> | null> {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
  const res = await fetch(url, {
    signal: timeoutSignal(),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const results = json?.quoteResponse?.result;
  if (!Array.isArray(results) || results.length === 0) return null;
  return results[0];
}

/** Fetch a World Bank indicator for a country. Returns the most recent non-null data point. */
async function fetchWorldBank(
  country: string,
  indicator: string,
): Promise<{ value: number | null; year: string | null }> {
  const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=10`;
  const res = await fetch(url, { signal: timeoutSignal() });
  if (!res.ok) throw new Error(`World Bank HTTP ${res.status}`);
  const json = (await res.json()) as any;

  // World Bank returns [metadata, dataPoints[]]
  const dataPoints: any[] | undefined = json?.[1];
  if (!Array.isArray(dataPoints)) {
    return { value: null, year: null };
  }

  for (const dp of dataPoints) {
    if (dp.value != null) {
      return { value: dp.value, year: dp.date ?? null };
    }
  }
  return { value: null, year: null };
}

// ─── tool implementations ───────────────────────────────────────────────────

async function equityPriceQuoteHandler(args: {
  symbol: string;
}): Promise<unknown> {
  const { symbol } = args;
  try {
    // Try Stooq first
    try {
      const sq = await fetchStooqQuote(symbol);
      if (sq.close && sq.close !== "N/D") {
        return {
          symbol: sq.symbol,
          price: Number(sq.close),
          currency: "USD",
          marketCap: null,
          dayHigh: sq.high ? Number(sq.high) : null,
          dayLow: sq.low ? Number(sq.low) : null,
          open: sq.open ? Number(sq.open) : null,
          volume: sq.volume ? Number(sq.volume) : null,
          source: "stooq",
          fetchedAt: nowIso(),
        };
      }
    } catch {
      // fall through to Yahoo
    }

    // Fallback: Yahoo Finance
    const yq = await fetchYahooQuote(symbol);
    if (yq) {
      return {
        symbol: yq.symbol ?? symbol.toUpperCase(),
        price: yq.regularMarketPrice ?? null,
        currency: yq.currency ?? "USD",
        marketCap: yq.marketCap ?? null,
        dayHigh: yq.regularMarketDayHigh ?? null,
        dayLow: yq.regularMarketDayLow ?? null,
        open: yq.regularMarketOpen ?? null,
        volume: yq.regularMarketVolume ?? null,
        source: "yahoo",
        fetchedAt: nowIso(),
      };
    }

    return {
      symbol: symbol.toUpperCase(),
      error: "No data available from any source",
      fetchedAt: nowIso(),
    };
  } catch (err: any) {
    return {
      symbol: symbol.toUpperCase(),
      error: err?.message ?? String(err),
      fetchedAt: nowIso(),
    };
  }
}

async function equityPriceHistoricalHandler(args: {
  symbol: string;
  start_date?: string;
  end_date?: string;
}): Promise<unknown> {
  const { symbol, start_date, end_date } = args;
  try {
    const s = stooqSymbol(symbol);
    const url = `https://stooq.com/q/d/l/?s=${s}&i=d`;
    const res = await fetch(url, { signal: timeoutSignal() });
    if (!res.ok) throw new Error(`Stooq HTTP ${res.status}`);
    const text = await res.text();

    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) {
      return { symbol: symbol.toUpperCase(), count: 0, points: [], source: "stooq", fetchedAt: nowIso() };
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const dateIdx = headers.indexOf("Date");
    const openIdx = headers.indexOf("Open");
    const highIdx = headers.indexOf("High");
    const lowIdx = headers.indexOf("Low");
    const closeIdx = headers.indexOf("Close");
    const volIdx = headers.indexOf("Volume");

    const points: {
      t: string;
      open: number | null;
      high: number | null;
      low: number | null;
      close: number | null;
      volume: number | null;
    }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim());
      const date = cols[dateIdx] ?? "";
      if (!date) continue;

      // Filter by date range
      if (start_date && date < start_date) continue;
      if (end_date && date > end_date) continue;

      const parseNum = (v: string | undefined): number | null => {
        if (!v || v === "N/D") return null;
        const n = Number(v);
        return Number.isNaN(n) ? null : n;
      };

      points.push({
        t: date,
        open: parseNum(cols[openIdx]),
        high: parseNum(cols[highIdx]),
        low: parseNum(cols[lowIdx]),
        close: parseNum(cols[closeIdx]),
        volume: parseNum(cols[volIdx]),
      });
    }

    return {
      symbol: symbol.toUpperCase(),
      count: points.length,
      points,
      source: "stooq",
      fetchedAt: nowIso(),
    };
  } catch (err: any) {
    return {
      symbol: symbol.toUpperCase(),
      error: err?.message ?? String(err),
      fetchedAt: nowIso(),
    };
  }
}

async function equityFundamentalOverviewHandler(args: {
  symbol: string;
}): Promise<unknown> {
  const { symbol } = args;
  try {
    // Get price quote
    const quote = (await equityPriceQuoteHandler({ symbol })) as Record<string, any>;

    // Try Yahoo for fundamentals
    let fundamentals: Record<string, any> = {};
    try {
      const yq = await fetchYahooQuote(symbol);
      if (yq) {
        fundamentals = {
          longName: yq.longName ?? yq.shortName ?? null,
          sector: yq.sector ?? null,
          industry: yq.industry ?? null,
          marketCap: yq.marketCap ?? null,
          trailingPE: yq.trailingPE ?? null,
          forwardPE: yq.forwardPE ?? null,
          dividendYield: yq.dividendYield ?? yq.trailingAnnualDividendYield ?? null,
          fiftyTwoWeekHigh: yq.fiftyTwoWeekHigh ?? null,
          fiftyTwoWeekLow: yq.fiftyTwoWeekLow ?? null,
          averageVolume: yq.averageDailyVolume3Month ?? null,
          beta: yq.beta ?? null,
          earningsDate: yq.earningsTimestamp ?? null,
        };
      }
    } catch {
      // Fundamentals unavailable — continue with price-only data
    }

    return {
      ...quote,
      ...fundamentals,
      fetchedAt: nowIso(),
    };
  } catch (err: any) {
    return {
      symbol: symbol.toUpperCase(),
      error: err?.message ?? String(err),
      fetchedAt: nowIso(),
    };
  }
}

/** Normalise crypto for Stooq: "BTC" → "BTC.V", "ETH" → "ETH.V". */
function cryptoStooqSymbol(symbol: string): string {
  const base = symbol.replace(/-USD$/i, "").toUpperCase();
  return `${base}.V`;
}

/** Normalise crypto for Yahoo: "BTC" → "BTC-USD". */
function cryptoYahooSymbol(symbol: string): string {
  return symbol.includes("-") ? symbol.toUpperCase() : `${symbol.toUpperCase()}-USD`;
}

async function cryptoPriceQuoteHandler(args: { symbol: string }): Promise<unknown> {
  const { symbol } = args;
  try {
    // Try Stooq first with .V suffix
    try {
      const sq = await fetchStooqQuote(cryptoStooqSymbol(symbol));
      if (sq.close && sq.close !== "N/D") {
        return {
          symbol: symbol.toUpperCase(),
          price: Number(sq.close),
          currency: "USD",
          marketCap: null,
          dayHigh: sq.high ? Number(sq.high) : null,
          dayLow: sq.low ? Number(sq.low) : null,
          open: sq.open ? Number(sq.open) : null,
          volume: sq.volume ? Number(sq.volume) : null,
          source: "stooq",
          fetchedAt: nowIso(),
        };
      }
    } catch {
      // fall through to Yahoo
    }
    // Fallback: Yahoo Finance with -USD suffix
    const yq = await fetchYahooQuote(cryptoYahooSymbol(symbol));
    if (yq) {
      return {
        symbol: yq.symbol ?? symbol.toUpperCase(),
        price: yq.regularMarketPrice ?? null,
        currency: yq.currency ?? "USD",
        marketCap: yq.marketCap ?? null,
        dayHigh: yq.regularMarketDayHigh ?? null,
        dayLow: yq.regularMarketDayLow ?? null,
        open: yq.regularMarketOpen ?? null,
        volume: yq.regularMarketVolume ?? null,
        source: "yahoo",
        fetchedAt: nowIso(),
      };
    }
    return { symbol: symbol.toUpperCase(), error: "No data available from any source", fetchedAt: nowIso() };
  } catch (err: any) {
    return { symbol: symbol.toUpperCase(), error: err?.message ?? String(err), fetchedAt: nowIso() };
  }
}

async function cryptoPriceHistoricalHandler(args: {
  symbol: string;
  start_date?: string;
  end_date?: string;
}): Promise<unknown> {
  // Stooq historical with .V suffix for crypto
  return equityPriceHistoricalHandler({
    symbol: cryptoStooqSymbol(args.symbol),
    start_date: args.start_date,
    end_date: args.end_date,
  });
}

async function economyGdpHandler(args: { country?: string }): Promise<unknown> {
  const country = args.country ?? "US";
  try {
    const { value, year } = await fetchWorldBank(country, "NY.GDP.MKTP.CD");
    return {
      country,
      value,
      year,
      unit: "USD",
      source: "world_bank",
      fetchedAt: nowIso(),
    };
  } catch (err: any) {
    return {
      country,
      error: err?.message ?? String(err),
      fetchedAt: nowIso(),
    };
  }
}

async function economyInflationHandler(args: { country?: string }): Promise<unknown> {
  const country = args.country ?? "US";
  try {
    const { value, year } = await fetchWorldBank(country, "FP.CPI.TOTL.ZG");
    return {
      country,
      value,
      year,
      unit: "percent",
      source: "world_bank",
      fetchedAt: nowIso(),
    };
  } catch (err: any) {
    return {
      country,
      error: err?.message ?? String(err),
      fetchedAt: nowIso(),
    };
  }
}

async function newsCompanyHandler(args: {
  symbol: string;
  limit?: number;
}): Promise<unknown> {
  const { symbol, limit = 10 } = args;
  try {
    // Try Yahoo Finance news (v8 endpoint, fall back to v7-style)
    const urls = [
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?events=news`,
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}&fields=messageBoardId`,
    ];

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    for (const url of urls) {
      try {
        const res = await fetch(url, { signal: timeoutSignal(), headers });
        if (!res.ok) continue;
        const json = (await res.json()) as any;

        // Try to extract news items from various Yahoo response shapes
        const newsItems: any[] =
          json?.chart?.result?.[0]?.events?.news ??
          json?.news ??
          [];

        const items = (Array.isArray(newsItems) ? newsItems : Object.values(newsItems))
          .slice(0, limit)
          .map((item: any) => ({
            title: item.title ?? item.headline ?? null,
            url: item.link ?? item.url ?? null,
            publishedAt: item.providerPublishTime
              ? new Date(item.providerPublishTime * 1000).toISOString()
              : item.publishedAt ?? null,
            source: item.publisher ?? item.source ?? null,
          }));

        if (items.length > 0) {
          return {
            symbol: symbol.toUpperCase(),
            count: items.length,
            items,
            source: "yahoo",
            fetchedAt: nowIso(),
          };
        }
      } catch {
        // try next URL
      }
    }

    return {
      symbol: symbol.toUpperCase(),
      count: 0,
      items: [],
      note: "Yahoo Finance news endpoint may be rate-limited or blocked",
      source: "yahoo",
      fetchedAt: nowIso(),
    };
  } catch (err: any) {
    return {
      symbol: symbol.toUpperCase(),
      count: 0,
      items: [],
      error: err?.message ?? String(err),
      fetchedAt: nowIso(),
    };
  }
}

async function newsWorldHandler(_args: { limit?: number }): Promise<unknown> {
  return {
    count: 0,
    items: [],
    note: "world news requires external news API",
    source: "none",
    fetchedAt: nowIso(),
  };
}

// ─── tool definitions ───────────────────────────────────────────────────────

export const financialTools: McpTool[] = [
  {
    name: "equity_price_quote",
    description:
      "Get the latest equity/stock price quote for a given ticker symbol. Tries Stooq first, then Yahoo Finance as fallback.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol (e.g. AAPL, MSFT, TSLA)",
        },
      },
      required: ["symbol"],
    },
    handler: equityPriceQuoteHandler,
  },
  {
    name: "equity_price_historical",
    description:
      "Get historical daily OHLCV price data for a given equity ticker. Optionally filter by start/end date (YYYY-MM-DD).",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol (e.g. AAPL, MSFT)",
        },
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format (inclusive)",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format (inclusive)",
        },
      },
      required: ["symbol"],
    },
    handler: equityPriceHistoricalHandler,
  },
  {
    name: "equity_fundamental_overview",
    description:
      "Get a fundamental overview for an equity ticker including price, sector, industry, P/E ratios, market cap, and other key metrics.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol (e.g. AAPL, MSFT)",
        },
      },
      required: ["symbol"],
    },
    handler: equityFundamentalOverviewHandler,
  },
  {
    name: "crypto_price_quote",
    description:
      "Get the latest cryptocurrency price quote. Accepts symbols like BTC, ETH, or BTC-USD.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: 'Crypto symbol (e.g. BTC, ETH, BTC-USD)',
        },
      },
      required: ["symbol"],
    },
    handler: cryptoPriceQuoteHandler,
  },
  {
    name: "crypto_price_historical",
    description:
      "Get historical daily price data for a cryptocurrency. Optionally filter by date range.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: 'Crypto symbol (e.g. BTC, ETH, BTC-USD)',
        },
        start_date: {
          type: "string",
          description: "Start date in YYYY-MM-DD format (inclusive)",
        },
        end_date: {
          type: "string",
          description: "End date in YYYY-MM-DD format (inclusive)",
        },
      },
      required: ["symbol"],
    },
    handler: cryptoPriceHistoricalHandler,
  },
  {
    name: "economy_gdp",
    description:
      "Get the latest GDP data for a country from the World Bank. Defaults to the US.",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: 'ISO 3166-1 alpha-2 country code (default "US")',
        },
      },
    },
    handler: economyGdpHandler,
  },
  {
    name: "economy_inflation",
    description:
      "Get the latest consumer price inflation rate (CPI) for a country from the World Bank. Defaults to the US.",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: 'ISO 3166-1 alpha-2 country code (default "US")',
        },
      },
    },
    handler: economyInflationHandler,
  },
  {
    name: "news_company",
    description:
      "Get recent news articles for a specific company/ticker symbol from Yahoo Finance.",
    inputSchema: {
      type: "object",
      properties: {
        symbol: {
          type: "string",
          description: "Ticker symbol (e.g. AAPL, TSLA)",
        },
        limit: {
          type: "number",
          description: "Maximum number of news items to return (default 10)",
        },
      },
      required: ["symbol"],
    },
    handler: newsCompanyHandler,
  },
  {
    name: "news_world",
    description:
      "Get world/market news headlines. Currently returns a placeholder — requires an external news API for full functionality.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of news items to return (default 10)",
        },
      },
    },
    handler: newsWorldHandler,
  },
];
