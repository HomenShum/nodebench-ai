/**
 * usePlanSynthesis — Fetches plan proposals from the /search backend,
 * maps the response into FeaturePlan structure, and caches results.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { SEARCH_API_ENDPOINT } from "@/lib/searchApi";
import type { FeaturePlan } from "../types/planProposal";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UsePlanSynthesisReturn {
  plan: FeaturePlan | null;
  isLoading: boolean;
  isLive: boolean;
  error: string | null;
  refetch: () => void;
}

/* ------------------------------------------------------------------ */
/*  Cache helpers                                                      */
/* ------------------------------------------------------------------ */

const CACHE_PREFIX = "nodebench-plan-synthesis-";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCached(key: string): FeaturePlan | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: FeaturePlan; ts: number };
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key: string, data: FeaturePlan): void {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, ts: Date.now() }),
    );
  } catch {
    // localStorage full — non-critical
  }
}

/* ------------------------------------------------------------------ */
/*  Response mapper                                                    */
/* ------------------------------------------------------------------ */

function mapResponseToPlan(raw: any, query: string): FeaturePlan | null {
  // If the raw response contains a rawPacket with plan data, use it
  const packet = raw?.rawPacket ?? raw?.plan ?? raw;
  if (!packet) return null;

  // If it's already a FeaturePlan shape
  if (packet.planId && packet.phases) {
    return packet as FeaturePlan;
  }

  // Map from ResultPacket shape
  return {
    planId: packet.planId ?? `plan_${Date.now().toString(36)}`,
    planType: packet.planType ?? "feature_plan",
    title: raw?.canonicalEntity?.name ?? `Plan: ${query}`,
    summary: raw?.canonicalEntity?.canonicalMission ?? packet.summary ?? "",
    strategicFit: packet.strategicFit ?? {
      wedgeAlignment: (raw?.canonicalEntity?.identityConfidence ?? 50) / 100,
      whyNow: "",
      initiativeLinks: [],
      contradictionRisks: [],
    },
    phases: packet.phases ?? (raw?.signals ?? []).map((s: any, i: number) => ({
      id: `p${i + 1}`,
      title: s.name ?? `Phase ${i + 1}`,
      description: "",
      dependencies: i > 0 ? [`p${i}`] : [],
      estimatedEffort: "days" as const,
      affectedSurfaces: [],
      acceptanceCriteria: [],
    })),
    competitorContext: packet.competitorContext ?? [],
    codebaseReadiness: packet.codebaseReadiness ?? (raw?.whatChanged ?? []).map((c: any) => ({
      capability: c.description ?? "",
      status: "partial" as const,
      files: [],
      notes: "",
    })),
    risks: packet.risks ?? (raw?.contradictions ?? []).map((c: any) => ({
      title: c.claim ?? "",
      severity: c.severity ?? "medium",
      mitigation: c.evidence ?? "",
    })),
    delegationPacket: packet.delegationPacket ?? {
      scope: "",
      constraints: [],
      affectedFiles: [],
      desiredBehavior: "",
      acceptanceCriteria: [],
      contextNotToLose: [],
    },
    provenance: packet.provenance ?? {
      generatedAt: new Date().toISOString(),
      sourceCount: 0,
      contextSources: [],
      triggerQuery: query,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function usePlanSynthesis(
  featureQuery: string,
  lens: string = "founder",
): UsePlanSynthesisReturn {
  const [plan, setPlan] = useState<FeaturePlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);

  const doFetch = useCallback(async () => {
    if (!featureQuery.trim()) return;

    const cacheKey = `${featureQuery}-${lens}`.toLowerCase().replace(/\s+/g, "-");

    // Check cache first
    const cached = getCached(cacheKey);
    if (cached) {
      setPlan(cached);
      setIsLive(true);
      setIsLoading(false);
      return;
    }

    const currentFetch = ++fetchCountRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(SEARCH_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: featureQuery, lens }),
      });

      // Stale request guard
      if (currentFetch !== fetchCountRef.current) return;

      if (!res.ok) {
        throw new Error(`Search API returned ${res.status}`);
      }

      const json = await res.json();
      const mapped = mapResponseToPlan(json?.result ?? json, featureQuery);

      if (mapped) {
        setPlan(mapped);
        setIsLive(true);
        setCache(cacheKey, mapped);
      } else {
        setError("No plan data in response");
        setIsLive(false);
      }
    } catch (err) {
      if (currentFetch !== fetchCountRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to fetch plan");
      setIsLive(false);
    } finally {
      if (currentFetch === fetchCountRef.current) {
        setIsLoading(false);
      }
    }
  }, [featureQuery, lens]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  return { plan, isLoading, isLive, error, refetch: doFetch };
}
