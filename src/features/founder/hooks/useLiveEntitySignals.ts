/**
 * useLiveEntitySignals — Fetches real-time signals for dashboard entities
 * via POST /search. Falls back to fixtures on error or when server is offline.
 *
 * Flow: dashboard loads → fires parallel searches for top entities →
 * parses ResultPacket responses → maps to ChangeEntry/ExternalSignal shapes →
 * merges with fixture data (fixtures are fallback, live data takes priority)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { SEARCH_API_ENDPOINT } from "@/lib/searchApi";
import type { ChangeEntry, ExternalSignal } from "../views/founderFixtures";

/* ─── Types ────────────────────────────────────────────────────────────────── */

interface SearchResult {
  canonicalEntity?: { name: string; type?: string; confidence?: number };
  signals?: Array<{ title: string; body?: string; url?: string; source?: string }>;
  whatChanged?: Array<{ title: string; detail?: string }>;
  contradictions?: Array<{ claim: string; evidence?: string }>;
  nextActions?: Array<{ action: string; priority?: string }>;
  trace?: Array<{ step: string; tool?: string; status: string; durationMs?: number; detail?: string }>;
  judgment?: { verdict: string; score: number; failingCriteria?: string[] };
}

export interface LiveEntityResult {
  entityName: string;
  query: string;
  status: "loading" | "success" | "error" | "offline";
  data?: SearchResult;
  changes: ChangeEntry[];
  signals: ExternalSignal[];
  fetchedAt?: string;
  latencyMs?: number;
  error?: string;
}

export interface UseLiveEntitySignalsReturn {
  results: LiveEntityResult[];
  isLoading: boolean;
  isLive: boolean;
  totalFetched: number;
  totalErrors: number;
  refresh: () => void;
  lastRefreshAt: string | null;
}

/* ─── Entity queries to run ────────────────────────────────────────────────── */

const ENTITY_QUERIES = [
  { entity: "NodeBench AI", query: "NodeBench AI MCP server progressive discovery agent tools 2026" },
  { entity: "Meta (Tests Assured)", query: "Meta AI testing QA automation platform MCP agent 2026" },
  { entity: "Stripe", query: "Stripe MCP integration benchmark agent tool use 2026" },
  { entity: "GitHub", query: "GitHub Copilot MCP extensions agent tools 2026" },
  { entity: "Salesforce", query: "Salesforce Einstein GPT MCP tool orchestration enterprise 2026" },
  { entity: "ServiceNow", query: "ServiceNow AI agent marketplace enterprise IT 2026" },
  { entity: "Cursor", query: "Cursor MCP tool marketplace IDE agent integration 2026" },
  { entity: "JPMorgan Chase", query: "JPMorgan Chase AI automation enterprise LLM agent banking 2026" },
  { entity: "Booking.com", query: "Booking.com AI agent workflow travel automation 2026" },
  { entity: "QuickBooks", query: "Intuit QuickBooks AI agent financial software automation 2026" },
];

/* ─── Mapper: SearchResult → ChangeEntry[] ─────────────────────────────────── */

function mapToChanges(entity: string, data: SearchResult): ChangeEntry[] {
  const changes: ChangeEntry[] = [];
  const now = new Date();

  // Map signals to changes
  (data.signals ?? []).forEach((sig, i) => {
    changes.push({
      id: `live-sig-${entity}-${i}`,
      timestamp: new Date(now.getTime() - i * 3600000).toISOString(),
      relativeTime: i === 0 ? "just now" : `${i}h ago`,
      type: "signal",
      description: sig.title || "Untitled signal",
    });
  });

  // Map whatChanged to changes
  (data.whatChanged ?? []).forEach((ch, i) => {
    changes.push({
      id: `live-chg-${entity}-${i}`,
      timestamp: new Date(now.getTime() - (i + 2) * 3600000).toISOString(),
      relativeTime: `${i + 2}h ago`,
      type: "initiative",
      description: ch.title || "Untitled change",
    });
  });

  return changes.slice(0, 5); // Cap at 5 per entity
}

/* ─── Mapper: SearchResult → ExternalSignal[] ──────────────────────────────── */

function mapToExternalSignals(entity: string, data: SearchResult): ExternalSignal[] {
  const now = new Date();
  return (data.signals ?? []).slice(0, 3).map((sig, i) => ({
    id: `live-ext-${entity}-${i}`,
    title: sig.title || "Untitled",
    summary: sig.body || "",
    category: "market" as const,
    source: sig.source || entity,
    sourceUrl: sig.url,
    publishedAt: new Date(now.getTime() - i * 7200000).toISOString(),
    relativeTime: i === 0 ? "just now" : `${i * 2}h ago`,
    relevanceScore: Math.max(60, 95 - i * 8),
    howItAffectsYou: `Live signal from ${entity} — verify and assess impact on NodeBench strategy.`,
    isNew: i === 0,
  }));
}

/* ─── Single entity fetch ──────────────────────────────────────────────────── */

async function fetchEntitySignals(
  entity: string,
  query: string,
  signal: AbortSignal,
): Promise<LiveEntityResult> {
  const start = Date.now();
  try {
    const resp = await fetch(SEARCH_API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        lens: "founder",
        context: { company: entity },
      }),
      signal,
    });

    if (!resp.ok) {
      return {
        entityName: entity, query, status: "error",
        changes: [], signals: [],
        error: `HTTP ${resp.status}`, latencyMs: Date.now() - start,
      };
    }

    const data: SearchResult = await resp.json();
    return {
      entityName: entity, query, status: "success",
      data,
      changes: mapToChanges(entity, data),
      signals: mapToExternalSignals(entity, data),
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const isAbort = msg.includes("abort");
    return {
      entityName: entity, query,
      status: isAbort ? "offline" : "error",
      changes: [], signals: [],
      error: msg, latencyMs: Date.now() - start,
    };
  }
}

/* ─── Hook ─────────────────────────────────────────────────────────────────── */

export function useLiveEntitySignals(
  /** Max entities to fetch in parallel. Default: 5 (first 5 most important) */
  maxParallel = 5,
  /** Auto-refresh interval in ms. 0 = no auto-refresh. Default: 5 min */
  refreshIntervalMs = 5 * 60 * 1000,
): UseLiveEntitySignalsReturn {
  const [results, setResults] = useState<LiveEntityResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    // Abort any in-flight requests
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    // Fetch top N entities in parallel
    const queries = ENTITY_QUERIES.slice(0, maxParallel);
    const promises = queries.map((q) =>
      fetchEntitySignals(q.entity, q.query, controller.signal),
    );

    const fetched = await Promise.allSettled(promises);
    if (controller.signal.aborted) return;

    const newResults = fetched.map((r) =>
      r.status === "fulfilled"
        ? r.value
        : {
            entityName: "Unknown",
            query: "",
            status: "error" as const,
            changes: [],
            signals: [],
            error: String(r.reason),
          },
    );

    setResults(newResults);
    setIsLoading(false);
    setLastRefreshAt(new Date().toISOString());
  }, [maxParallel]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    void refresh();
    if (refreshIntervalMs > 0) {
      const interval = setInterval(() => void refresh(), refreshIntervalMs);
      return () => {
        clearInterval(interval);
        abortRef.current?.abort();
      };
    }
    return () => abortRef.current?.abort();
  }, [refresh, refreshIntervalMs]);

  const isLive = results.some((r) => r.status === "success");
  const totalFetched = results.filter((r) => r.status === "success").length;
  const totalErrors = results.filter((r) => r.status === "error").length;

  return { results, isLoading, isLive, totalFetched, totalErrors, refresh, lastRefreshAt };
}
