import { useCallback, useMemo, useState } from "react";

/* ─── Types ──────────────────────────────────────────────────────────── */

export type ChangeCategory = "strategy" | "architecture" | "competitor" | "market";
export type ImpactLevel = "high" | "medium" | "low";

export interface SessionChange {
  id: string;
  category: ChangeCategory;
  impact: ImpactLevel;
  summary: string;
  suggestedAction: string;
  timestamp: number;
}

export interface ChangeSummary {
  strategyChanges: number;
  competitorSignals: number;
  contradictions: number;
  attentionRequired: number;
}

export interface SessionDelta {
  lastSessionAt: number;
  changeSummary: ChangeSummary;
  topChanges: SessionChange[];
  isLoading: boolean;
  refresh: () => void;
}

/* ─── Demo data ──────────────────────────────────────────────────────── */

const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const LAST_SESSION_KEY = "nodebench:lastSessionEnd";

function getLastSessionEnd(): number {
  try {
    const stored = localStorage.getItem(LAST_SESSION_KEY);
    if (stored) return Number(stored);
  } catch {
    // SSR or localStorage unavailable
  }
  return Date.now() - THREE_HOURS_MS;
}

function saveLastSessionEnd(ts: number): void {
  try {
    localStorage.setItem(LAST_SESSION_KEY, String(ts));
  } catch {
    // SSR or localStorage unavailable
  }
}

function buildDemoData(now: number): Omit<SessionDelta, "refresh"> {
  const lastSessionAt = now - THREE_HOURS_MS;

  const topChanges: SessionChange[] = [
    {
      id: "sc-1",
      category: "competitor",
      impact: "high",
      summary: "Cursor shipped MCP-native tool marketplace with 120+ verified servers",
      suggestedAction: "Audit NodeBench distribution gap vs Cursor marketplace reach",
      timestamp: now - 45 * 60 * 1000,
    },
    {
      id: "sc-2",
      category: "strategy",
      impact: "high",
      summary: "Progressive discovery adoption doubled after TOON encoding enabled by default",
      suggestedAction: "Double down on TOON — measure token savings across top 20 workflows",
      timestamp: now - 72 * 60 * 1000,
    },
    {
      id: "sc-3",
      category: "market",
      impact: "medium",
      summary: "Anthropic announced tool-use pricing changes effective April 1",
      suggestedAction: "Model cost impact on NodeBench gateway usage at current volume",
      timestamp: now - 95 * 60 * 1000,
    },
    {
      id: "sc-4",
      category: "architecture",
      impact: "medium",
      summary: "WebSocket gateway idle timeout triggered 14 false disconnects overnight",
      suggestedAction: "Add heartbeat keep-alive and review 30-min timeout threshold",
      timestamp: now - 110 * 60 * 1000,
    },
    {
      id: "sc-5",
      category: "strategy",
      impact: "low",
      summary: "CLI subcommand usage: 68% discover, 19% workflow, 8% quickref, 5% other",
      suggestedAction: "Promote workflow and quickref in onboarding wizard step 2",
      timestamp: now - 140 * 60 * 1000,
    },
  ];

  return {
    lastSessionAt,
    changeSummary: {
      strategyChanges: 3,
      competitorSignals: 2,
      contradictions: 1,
      attentionRequired: 4,
    },
    topChanges,
    isLoading: false,
  };
}

/* ─── Category inference from Convex objectType ──────────────────────── */

function inferCategory(objectType: string): ChangeCategory {
  switch (objectType) {
    case "thesis":
    case "decision":
    case "strategic_insight":
      return "strategy";
    case "competitor_signal":
      return "competitor";
    case "market_signal":
      return "market";
    case "build_item":
    case "initiative_update":
      return "architecture";
    case "contradiction":
    case "risk":
      return "strategy";
    case "opportunity":
      return "market";
    default:
      return "strategy";
  }
}

function inferImpact(confidence: number | undefined): ImpactLevel {
  if (confidence == null) return "medium";
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

/* ─── Transform Convex result → SessionDelta ─────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformConvexDelta(raw: any, lastSessionEnd: number): Omit<SessionDelta, "refresh"> {
  const topChanges: SessionChange[] = [];
  let idx = 0;

  // Merge all typed arrays into a flat change list
  const sources: Array<{ items: Array<{ title?: string; content?: string; confidence?: number; type?: string }>; defaultCategory: ChangeCategory }> = [
    { items: raw.strategyShifts ?? [], defaultCategory: "strategy" },
    { items: raw.competitorSignals ?? [], defaultCategory: "competitor" },
    { items: raw.buildItems ?? [], defaultCategory: "architecture" },
    { items: raw.contradictions ?? [], defaultCategory: "strategy" },
    { items: raw.risks ?? [], defaultCategory: "strategy" },
    { items: raw.opportunities ?? [], defaultCategory: "market" },
  ];

  for (const source of sources) {
    for (const item of source.items) {
      topChanges.push({
        id: `cv-${idx++}`,
        category: item.type ? inferCategory(item.type) : source.defaultCategory,
        impact: inferImpact(item.confidence),
        summary: item.title ?? item.content ?? "Untitled change",
        suggestedAction: item.content && item.title ? item.content.slice(0, 120) : "Review this change",
        timestamp: lastSessionEnd + idx * 60_000, // approximate ordering
      });
    }
  }

  // Sort by impact (high first), then limit to 5
  const impactOrder: Record<ImpactLevel, number> = { high: 0, medium: 1, low: 2 };
  topChanges.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
  const limitedChanges = topChanges.slice(0, 5);

  return {
    lastSessionAt: lastSessionEnd,
    changeSummary: {
      strategyChanges: (raw.strategyShifts?.length ?? 0),
      competitorSignals: (raw.competitorSignals?.length ?? 0),
      contradictions: (raw.contradictions?.length ?? 0),
      attentionRequired: raw.attentionRequired ?? 0,
    },
    topChanges: limitedChanges,
    isLoading: false,
  };
}

/* ─── Hook ───────────────────────────────────────────────────────────── */

/**
 * Returns session delta data — what changed since the user's last visit.
 *
 * Attempts to query Convex `getSessionDelta` when a companyId is available.
 * Falls back to demo data when Convex is unavailable or no company is configured.
 */
export function useSessionDelta(_companyId?: string): SessionDelta {
  const now = useMemo(() => Date.now(), []);
  const [refreshTick, setRefreshTick] = useState(0);

  // TODO: Wire to Convex `getSessionDelta` when ConvexProvider is guaranteed
  // (requires auth context). For now, use demo data on the landing page.
  // When ready:
  //   import { useQuery } from "convex/react";
  //   import { api } from "../../../../convex/_generated/api";
  //   const convexResult = useQuery(api.domains.founder.ambientIntelligenceOps.getSessionDelta, companyId ? { companyId, lastSessionEnd } : "skip");

  const data = useMemo(
    () => buildDemoData(now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now, refreshTick],
  );

  const refresh = useCallback(() => {
    saveLastSessionEnd(Date.now());
    setRefreshTick((t) => t + 1);
  }, []);

  return {
    ...data,
    isLoading: false,
    refresh,
  };
}

export default useSessionDelta;
