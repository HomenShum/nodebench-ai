/**
 * useCompanyAnalysis — Fetches live company analysis from the /search backend,
 * maps the response into the card structures used by CompanyAnalysisView,
 * and falls back to Shopify fixtures on error or empty response.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  CompanySnapshot,
  BusinessQualitySignal,
  NewsSignal,
  PlatformReadinessSignal,
  RegulatorySignal,
  ComparableCompany,
  NextQuestion,
  SearchLens,
} from "../views/founderFixtures";
import {
  SHOPIFY_SNAPSHOT,
  SHOPIFY_BUSINESS_QUALITY,
  SHOPIFY_NEWS_SIGNALS,
  SHOPIFY_PLATFORM_READINESS,
  SHOPIFY_REGULATORY,
  SHOPIFY_COMPARABLES,
  SHOPIFY_NEXT_QUESTIONS,
} from "../views/founderFixtures";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CompanyAnalysisData {
  snapshot: CompanySnapshot;
  businessQuality: BusinessQualitySignal[];
  newsSignals: NewsSignal[];
  platformReadiness: PlatformReadinessSignal[];
  regulatory: RegulatorySignal[];
  comparables: ComparableCompany[];
  nextQuestions: NextQuestion[];
  isLive: boolean;
}

interface UseCompanyAnalysisReturn {
  data: CompanyAnalysisData;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/* ------------------------------------------------------------------ */
/*  Fixture fallback (Shopify demo data)                               */
/* ------------------------------------------------------------------ */

const FIXTURE_DATA: CompanyAnalysisData = {
  snapshot: SHOPIFY_SNAPSHOT,
  businessQuality: SHOPIFY_BUSINESS_QUALITY,
  newsSignals: SHOPIFY_NEWS_SIGNALS,
  platformReadiness: SHOPIFY_PLATFORM_READINESS,
  regulatory: SHOPIFY_REGULATORY,
  comparables: SHOPIFY_COMPARABLES,
  nextQuestions: SHOPIFY_NEXT_QUESTIONS,
  isLive: false,
};

/* ------------------------------------------------------------------ */
/*  Cache helpers                                                      */
/* ------------------------------------------------------------------ */

const CACHE_PREFIX = "nodebench-company-analysis-";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCached(companyName: string): CompanyAnalysisData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + companyName.toLowerCase());
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: CompanyAnalysisData; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + companyName.toLowerCase());
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(companyName: string, data: CompanyAnalysisData): void {
  try {
    localStorage.setItem(
      CACHE_PREFIX + companyName.toLowerCase(),
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    // localStorage full — non-critical
  }
}

/* ------------------------------------------------------------------ */
/*  Response → card data mappers                                       */
/* ------------------------------------------------------------------ */

function clampConfidence(n: unknown): number {
  const v = typeof n === "number" ? n : 50;
  return Math.max(0, Math.min(100, v)) / 100;
}

function ratingFromDirection(dir: string): BusinessQualitySignal["rating"] {
  if (dir === "up") return "strong";
  if (dir === "down") return "weak";
  if (dir === "neutral") return "watch";
  return "improving";
}

function mapSnapshot(result: any, entityName: string): CompanySnapshot {
  const ce = result.canonicalEntity ?? {};
  return {
    name: ce.name ?? entityName,
    ticker: undefined, // backend doesn't return ticker yet
    sector: "Unknown",
    hq: "",
    founded: 0,
    employees: "",
    revenueAnnual: "",
    revenueGrowthYoY: "",
    freeCashFlow: "",
    marketCap: undefined,
    description: ce.canonicalMission ?? "",
    wedge: (result.signals?.[0]?.name) ?? "",
    identityConfidence: clampConfidence(ce.identityConfidence),
  };
}

function mapBusinessQuality(signals: any[]): BusinessQualitySignal[] {
  return (signals ?? []).slice(0, 6).map((s: any, i: number) => ({
    id: `bq-${i}`,
    dimension: s.name ?? `Signal ${i + 1}`,
    rating: ratingFromDirection(s.direction),
    evidence: s.evidence ?? s.detail ?? "",
    source: s.source ?? "Web search",
  }));
}

function mapNewsSignals(changes: any[]): NewsSignal[] {
  return (changes ?? []).slice(0, 5).map((c: any, i: number) => ({
    id: `ns-${i}`,
    headline: c.description ?? c.title ?? "",
    category: (c.category ?? "market") as NewsSignal["category"],
    date: c.date ?? new Date().toISOString().slice(0, 10),
    source: c.source ?? "Web",
    relevance: c.relevance ?? 80,
    implication: c.implication ?? c.impact ?? "",
  }));
}

function mapPlatformReadiness(metrics: any[]): PlatformReadinessSignal[] {
  return (metrics ?? []).slice(0, 4).map((m: any, i: number) => ({
    id: `pr-${i}`,
    dimension: m.name ?? m.label ?? `Metric ${i + 1}`,
    status: m.status === "leading" ? "leading" : m.status === "lagging" ? "lagging" : "building",
    evidence: m.value ?? m.evidence ?? "",
  }));
}

function mapRegulatory(risks: any[]): RegulatorySignal[] {
  return (risks ?? []).slice(0, 4).map((r: any, i: number) => ({
    id: `reg-${i}`,
    title: r.title ?? r.claim ?? `Risk ${i + 1}`,
    jurisdiction: r.jurisdiction ?? "Global",
    risk: (r.risk ?? r.severity ?? "medium") as RegulatorySignal["risk"],
    detail: r.description ?? r.evidence ?? r.detail ?? "",
    timeline: r.timeline ?? "",
  }));
}

function mapComparables(comps: any[]): ComparableCompany[] {
  return (comps ?? []).slice(0, 4).map((c: any, i: number) => ({
    id: `comp-${i}`,
    name: c.name ?? `Comparable ${i + 1}`,
    relationship: c.relevance === "high" ? "direct" : c.relevance === "low" ? "aspirational" : "adjacent",
    metric: c.metric ?? c.note ?? "",
    implication: c.implication ?? c.note ?? "",
  }));
}

function mapNextQuestions(questions: any[], lens: SearchLens): NextQuestion[] {
  return (questions ?? []).slice(0, 6).map((q: any, i: number) => ({
    id: `nq-${i}`,
    question: typeof q === "string" ? q : q.question ?? "",
    lens: (typeof q === "object" && q.lens) ? q.lens : lens,
    priority: i < 2 ? "high" : i < 4 ? "medium" : "low",
  }));
}

/* ------------------------------------------------------------------ */
/*  Main hook                                                          */
/* ------------------------------------------------------------------ */

export function useCompanyAnalysis(
  companyName: string | null,
  lens: SearchLens = "banker",
): UseCompanyAnalysisReturn {
  const [data, setData] = useState<CompanyAnalysisData>(FIXTURE_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fetchCountRef = useRef(0);

  const fetchAnalysis = useCallback(async (name: string, currentLens: SearchLens) => {
    // Check cache first
    const cached = getCached(name);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const fetchId = ++fetchCountRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `company analysis: ${name}`,
          lens: currentLens,
        }),
        signal: controller.signal,
      });

      if (fetchId !== fetchCountRef.current) return; // stale

      if (!res.ok) {
        throw new Error(`Search failed (${res.status})`);
      }

      const json = await res.json();
      const result = json.result;

      if (!result || !result.canonicalEntity) {
        // Empty result — fall back to fixtures
        setData(FIXTURE_DATA);
        setIsLoading(false);
        return;
      }

      const mapped: CompanyAnalysisData = {
        snapshot: mapSnapshot(result, name),
        businessQuality: mapBusinessQuality(result.signals),
        newsSignals: mapNewsSignals(result.whatChanged),
        platformReadiness: mapPlatformReadiness(result.keyMetrics),
        regulatory: mapRegulatory(result.contradictions),
        comparables: mapComparables(result.comparables),
        nextQuestions: mapNextQuestions(result.nextQuestions, currentLens),
        isLive: true,
      };

      setData(mapped);
      setCache(name, mapped);
      setIsLoading(false);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      if (fetchId !== fetchCountRef.current) return;
      console.error("[useCompanyAnalysis] fetch failed, using fixtures:", err);
      setError(err?.message ?? "Search failed");
      setData(FIXTURE_DATA);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!companyName || companyName.toLowerCase() === "shopify") {
      // Use fixtures directly for Shopify or empty
      setData(FIXTURE_DATA);
      setIsLoading(false);
      setError(null);
      return;
    }

    fetchAnalysis(companyName, lens);

    return () => {
      abortRef.current?.abort();
    };
  }, [companyName, lens, fetchAnalysis]);

  const refetch = useCallback(() => {
    if (!companyName) return;
    // Clear cache to force fresh fetch
    localStorage.removeItem(CACHE_PREFIX + companyName.toLowerCase());
    fetchAnalysis(companyName, lens);
  }, [companyName, lens, fetchAnalysis]);

  return { data, isLoading, error, refetch };
}
