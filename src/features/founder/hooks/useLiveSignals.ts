/**
 * useLiveSignals — Fetches fresh external signals for the Founder Dashboard.
 *
 * Data sources (in priority order):
 *   1. POST /search with news-focused queries (requires backend running)
 *   2. HackerNews public API (free fallback when backend is offline)
 *   3. DEMO_EXTERNAL_SIGNALS fixture data (last resort)
 *
 * Caches results in localStorage with a 30-minute TTL.
 * Polls every 5 minutes (configurable). Manual refresh via `refresh()`.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  DEMO_EXTERNAL_SIGNALS,
  type ExternalSignal,
  type SignalCategory,
} from "../views/founderFixtures";

/* ─── Config ──────────────────────────────────────────────────────────────── */

const LS_CACHE_KEY = "nodebench-live-signals-cache";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const DEFAULT_POLL_MS = 5 * 60 * 1000; // 5 minutes

/** News-focused queries sent to POST /search */
const SIGNAL_QUERIES = [
  { query: "latest AI agent news MCP ecosystem 2026", category: "market" as SignalCategory },
  { query: "agentic commerce infrastructure updates 2026", category: "market" as SignalCategory },
  { query: "AI regulation policy updates 2026", category: "regulatory" as SignalCategory },
  { query: "Anthropic OpenAI Google AI model releases 2026", category: "competitive" as SignalCategory },
  { query: "MCP server tool marketplace ecosystem news 2026", category: "competitive" as SignalCategory },
];

/** Keywords for filtering HackerNews titles for AI/tech relevance */
const HN_RELEVANCE_KEYWORDS = [
  "ai", "llm", "agent", "mcp", "anthropic", "openai", "claude", "gpt",
  "gemini", "copilot", "cursor", "automation", "saas", "startup", "api",
  "developer", "machine learning", "deep learning", "model", "inference",
  "rag", "vector", "embedding", "tool use", "function calling",
];

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface CachedSignals {
  signals: ExternalSignal[];
  fetchedAt: string;
  source: "search" | "hackernews" | "demo";
}

export interface UseLiveSignalsReturn {
  signals: ExternalSignal[];
  isLoading: boolean;
  isLive: boolean;
  source: "search" | "hackernews" | "demo";
  refresh: () => void;
  lastFetchedAt: string | null;
}

/* ─── Cache helpers ───────────────────────────────────────────────────────── */

function loadCache(): CachedSignals | null {
  try {
    const raw = localStorage.getItem(LS_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedSignals = JSON.parse(raw);
    const age = Date.now() - new Date(parsed.fetchedAt).getTime();
    if (age > CACHE_TTL_MS) return null; // expired
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data: CachedSignals): void {
  try {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

/* ─── Relative time helper ────────────────────────────────────────────────── */

function relativeTime(isoOrMs: string | number): string {
  const ms = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

/* ─── Search endpoint fetch ───────────────────────────────────────────────── */

interface SearchSignal {
  title: string;
  body?: string;
  url?: string;
  source?: string;
}

interface SearchResult {
  signals?: SearchSignal[];
}

async function fetchFromSearch(signal: AbortSignal): Promise<ExternalSignal[]> {
  const results: ExternalSignal[] = [];
  const now = new Date();

  // Fire all queries in parallel with a 10s timeout
  const promises = SIGNAL_QUERIES.map(async ({ query, category }, qi) => {
    const resp = await fetch("/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, lens: "founder", context: {} }),
      signal,
    });
    if (!resp.ok) return [];
    const data: SearchResult = await resp.json();
    return (data.signals ?? []).slice(0, 3).map((sig, si): ExternalSignal => ({
      id: `live-sig-${qi}-${si}-${Date.now()}`,
      title: sig.title || "Untitled signal",
      summary: sig.body || "",
      category,
      source: sig.source || "Web Search",
      sourceUrl: sig.url,
      publishedAt: new Date(now.getTime() - si * 3600_000).toISOString(),
      relativeTime: relativeTime(now.getTime() - si * 3600_000),
      relevanceScore: Math.max(60, 95 - qi * 5 - si * 8),
      howItAffectsYou: `Live signal — verify and assess strategic impact.`,
      isNew: qi === 0 && si === 0,
    }));
  });

  const settled = await Promise.allSettled(promises);
  for (const r of settled) {
    if (r.status === "fulfilled") results.push(...r.value);
  }

  // Deduplicate by title similarity (exact match)
  const seen = new Set<string>();
  const deduped = results.filter((s) => {
    const key = s.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10);
}

/* ─── HackerNews fallback ─────────────────────────────────────────────────── */

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  by?: string;
  time?: number;
  score?: number;
}

function isRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return HN_RELEVANCE_KEYWORDS.some((kw) => lower.includes(kw));
}

async function fetchFromHackerNews(signal: AbortSignal): Promise<ExternalSignal[]> {
  // Fetch top story IDs
  const idsResp = await fetch(
    "https://hacker-news.firebaseio.com/v0/topstories.json",
    { signal },
  );
  if (!idsResp.ok) return [];
  const ids: number[] = await idsResp.json();

  // Fetch first 30 stories in parallel, then filter for relevance
  const top30 = ids.slice(0, 30);
  const itemPromises = top30.map(async (id): Promise<HNItem | null> => {
    try {
      const resp = await fetch(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
        { signal },
      );
      if (!resp.ok) return null;
      return resp.json();
    } catch {
      return null;
    }
  });

  const items = (await Promise.all(itemPromises)).filter(
    (item): item is HNItem => item !== null && !!item.title,
  );

  // Filter for AI/tech relevance
  const relevant = items.filter((item) => isRelevant(item.title!));

  return relevant.slice(0, 10).map((item, i): ExternalSignal => {
    const publishedAt = item.time
      ? new Date(item.time * 1000).toISOString()
      : new Date().toISOString();
    return {
      id: `hn-${item.id}`,
      title: item.title!,
      summary: `Trending on Hacker News with ${item.score ?? 0} points by ${item.by ?? "unknown"}.`,
      category: "market" as SignalCategory,
      source: "Hacker News",
      sourceUrl: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      publishedAt,
      relativeTime: relativeTime(publishedAt),
      relevanceScore: Math.max(50, 90 - i * 5),
      howItAffectsYou: "Trending tech signal — evaluate for strategic relevance to NodeBench.",
      isNew: i < 2,
    };
  });
}

/* ─── Main hook ───────────────────────────────────────────────────────────── */

export function useLiveSignals(
  pollIntervalMs = DEFAULT_POLL_MS,
): UseLiveSignalsReturn {
  const [signals, setSignals] = useState<ExternalSignal[]>(() => {
    const cached = loadCache();
    return cached ? cached.signals : DEMO_EXTERNAL_SIGNALS;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [source, setSource] = useState<"search" | "hackernews" | "demo">(() => {
    const cached = loadCache();
    return cached ? cached.source : "demo";
  });
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(() => {
    const cached = loadCache();
    return cached ? cached.fetchedAt : null;
  });
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);

    const now = new Date().toISOString();

    try {
      // Attempt 1: Search endpoint (requires backend)
      const searchSignals = await fetchFromSearch(controller.signal);
      if (controller.signal.aborted) return;

      if (searchSignals.length > 0) {
        setSignals(searchSignals);
        setSource("search");
        setLastFetchedAt(now);
        saveCache({ signals: searchSignals, fetchedAt: now, source: "search" });
        setIsLoading(false);
        return;
      }
    } catch {
      // Search endpoint unavailable — fall through to HackerNews
      if (controller.signal.aborted) return;
    }

    try {
      // Attempt 2: HackerNews public API (free, no auth)
      const hnSignals = await fetchFromHackerNews(controller.signal);
      if (controller.signal.aborted) return;

      if (hnSignals.length > 0) {
        setSignals(hnSignals);
        setSource("hackernews");
        setLastFetchedAt(now);
        saveCache({ signals: hnSignals, fetchedAt: now, source: "hackernews" });
        setIsLoading(false);
        return;
      }
    } catch {
      // HackerNews also failed — fall through to demo
      if (controller.signal.aborted) return;
    }

    // Attempt 3: Fall back to demo fixtures
    setSignals(DEMO_EXTERNAL_SIGNALS);
    setSource("demo");
    setIsLoading(false);
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    // Only fetch if cache is stale or missing
    const cached = loadCache();
    if (!cached) {
      void refresh();
    }

    if (pollIntervalMs > 0) {
      const interval = setInterval(() => void refresh(), pollIntervalMs);
      return () => {
        clearInterval(interval);
        abortRef.current?.abort();
      };
    }
    return () => abortRef.current?.abort();
  }, [refresh, pollIntervalMs]);

  const isLive = source !== "demo";

  return { signals, isLoading, isLive, source, refresh, lastFetchedAt };
}
