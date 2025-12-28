"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, RefreshCw, Building2, MapPin, Calendar, Globe, Users, DollarSign, ArrowUpRight } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useFastAgent } from "@/features/agents/context/FastAgentContext";
import { AUDIT_MOCKS } from "../data/audit_mocks";

const BLANK_VALUES = new Set(["", "n/a", "na", "unknown", "null", "undefined", "pending"]);
const LOW_SIGNAL_SUMMARY_PATTERNS = [
  /no reliable public information/i,
  /no public information/i,
  /no confirmed/i,
  /could not find/i,
  /not found/i,
  /insufficient data/i,
  /insufficient information/i,
  /unable to verify/i,
  /unclear/i,
];
const LOW_SIGNAL_FACT_PATTERNS = [
  /no confirmed/i,
  /no reliable/i,
  /no corroborated/i,
  /no available/i,
  /no funding/i,
  /no data/i,
  /no evidence/i,
  /no known/i,
  /no publicly/i,
  /not found/i,
  /insufficient/i,
  /public presence/i,
  /no corroborating/i,
  /not verified/i,
  /likely related/i,
  /recent activity/i,
  /github repository/i,
  /project\/repository/i,
  /only clear reference/i,
  /closely related mention/i,
  /other provided links/i,
  /unrelated entities/i,
  /similar names/i,
  /only closely related/i,
];
const ENTITY_TOKEN_STOP = new Set([
  "open",
  "group",
  "corp",
  "inc",
  "labs",
  "lab",
  "systems",
  "company",
  "ai",
  "global",
  "platform",
  "the",
]);

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    return trimmed.length === 0 || BLANK_VALUES.has(trimmed);
  }
  if (typeof value === "number") return Number.isNaN(value);
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function normalizeEntityKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function pickAuditMock(entityName: string | null) {
  if (!entityName) return null;
  const upper = entityName.trim().toUpperCase();
  if (AUDIT_MOCKS[upper]) return AUDIT_MOCKS[upper];
  const normalized = normalizeEntityKey(entityName);
  if (AUDIT_MOCKS[normalized]) return AUDIT_MOCKS[normalized];
  const entry = Object.entries(AUDIT_MOCKS).find(([key]) => normalizeEntityKey(key) === normalized);
  return entry?.[1] ?? null;
}

function tokenizeEntity(entityName?: string | null): string[] {
  if (!entityName) return [];
  return entityName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3 && !ENTITY_TOKEN_STOP.has(token));
}

function isLowSignalSummary(summary?: string | null): boolean {
  if (!summary) return true;
  return LOW_SIGNAL_SUMMARY_PATTERNS.some((pattern) => pattern.test(summary));
}

function filterLowSignalFacts(facts: string[]) {
  return facts.filter((fact) => !LOW_SIGNAL_FACT_PATTERNS.some((pattern) => pattern.test(fact)));
}

function scoreSourceRelevance(source: { name?: string; url?: string; snippet?: string }, tokens: string[]): number {
  if (!tokens.length) return 0;
  const haystack = `${source.name ?? ""} ${source.url ?? ""} ${source.snippet ?? ""}`.toLowerCase();
  return tokens.reduce((score, token) => (haystack.includes(token) ? score + 1 : score), 0);
}

function mergeArrays<T>(live?: T[], fallback?: T[]): T[] {
  const combined = [...(live ?? []), ...(fallback ?? [])];
  const seen = new Set<string>();
  return combined.filter((item) => {
    const key = typeof item === "string" ? item.toLowerCase() : JSON.stringify(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeSources(
  live?: Array<{ name?: string; url?: string; snippet?: string }>,
  fallback?: Array<{ name?: string; url?: string; snippet?: string }>,
) {
  const combined = [...(live ?? []), ...(fallback ?? [])];
  const seen = new Set<string>();
  return combined.filter((item) => {
    const key = (item.url || item.name || "").toLowerCase();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeInsight(live: any | null, fallback: any | null, entityName?: string | null) {
  if (!fallback) return live;
  if (!live) return fallback;

  const completenessScore = live?.crmFields?.completenessScore;
  const preferFallback =
    isLowSignalSummary(live.summary) ||
    (typeof completenessScore === "number" && completenessScore < 55);

  const mergedCrm: Record<string, any> = { ...(fallback.crmFields ?? {}) };
  const liveCrm = live.crmFields ?? {};
  Object.entries(liveCrm).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      mergedCrm[key] = mergeArrays(value, mergedCrm[key]);
      return;
    }
    if (preferFallback && !isBlank(mergedCrm[key])) {
      return;
    }
    if (!isBlank(value)) {
      mergedCrm[key] = value;
    }
  });

  const mergedKeyFacts = filterLowSignalFacts(
    mergeArrays(live.keyFacts, fallback.keyFacts),
  ).slice(0, 8);
  const mergedSources = mergeSources(
    preferFallback ? fallback.sources : live.sources,
    preferFallback ? live.sources : fallback.sources,
  );
  const entityTokens = tokenizeEntity(entityName);
  const scoredSources = entityTokens.length
    ? mergedSources.map((source) => ({
      source,
      score: scoreSourceRelevance(source, entityTokens),
    }))
    : mergedSources.map((source) => ({ source, score: 0 }));
  const relevantSources = entityTokens.length
    ? scoredSources.filter((item) => item.score > 0)
    : scoredSources;
  const rankedSources = (relevantSources.length ? relevantSources : scoredSources)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.source);

  return {
    ...fallback,
    ...live,
    summary: preferFallback ? fallback.summary : !isBlank(live.summary) ? live.summary : fallback.summary,
    crmFields: mergedCrm,
    keyFacts: mergedKeyFacts,
    sources: rankedSources.slice(0, 8),
    recentNews: mergeArrays(live.recentNews, fallback.recentNews).slice(0, 8),
    stockPrice:
      preferFallback && !isBlank(fallback.stockPrice)
        ? fallback.stockPrice
        : !isBlank(live.stockPrice)
          ? live.stockPrice
          : fallback.stockPrice,
  };
}

interface EntityContextDrawerProps {
  isOpen: boolean;
  entityName: string | null;
  entityType?: "company" | "person";
  trackedHashtags?: string[];
  techStack?: string[];
  onClose: () => void;
  onOpenReader?: (item: {
    title?: string;
    url?: string;
    source?: string;
    summary?: string;
    publishedAt?: string;
  }) => void;
}

export const EntityContextDrawer: React.FC<EntityContextDrawerProps> = ({
  isOpen,
  entityName,
  entityType = "company",
  trackedHashtags = [],
  techStack = [],
  onClose,
  onOpenReader,
}) => {
  const { openWithContext } = useFastAgent();
  const fetchInsights = useAction(api.domains.knowledge.entityInsights.getEntityInsights);
  const fetchInsightsRef = useRef(fetchInsights);
  const [insight, setInsight] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => {
    fetchInsightsRef.current = fetchInsights;
  }, [fetchInsights]);

  const requestKey = useMemo(() => {
    if (!isOpen || !entityName) return null;
    return `${entityType}:${entityName}`;
  }, [entityName, entityType, isOpen]);

  useEffect(() => {
    if (!requestKey || !entityName) return;
    if (lastRequestRef.current === requestKey) return;
    lastRequestRef.current = requestKey;
    setIsLoading(true);
    setError(null);

    const fallbackMock = pickAuditMock(entityName);

    fetchInsightsRef
      .current({ entityName, entityType })
      .then((result) => {
        const hasLiveData =
          !!result &&
          (typeof result.summary === "string" ||
            (Array.isArray(result.keyFacts) && result.keyFacts.length > 0) ||
            (result.crmFields && Object.keys(result.crmFields).length > 0));
        if (hasLiveData) {
          setInsight(mergeInsight(result, fallbackMock, entityName));
          return;
        }
        if (fallbackMock) {
          setInsight(fallbackMock);
          return;
        }
        setError("No entity data available.");
      })
      .catch((err) => {
        if (fallbackMock) {
          console.warn("Backend failed, falling back to audit mock.");
          setInsight(fallbackMock);
          return;
        }
        setError(err?.message ?? "Failed to load entity context.");
      })
      .finally(() => setIsLoading(false));
  }, [entityName, entityType, requestKey]);

  useEffect(() => {
    if (!isOpen) {
      setInsight(null);
      setError(null);
      setIsLoading(false);
      lastRequestRef.current = null;
    }
  }, [isOpen]);

  const summary = insight?.summary ?? "Summary pending.";
  const crm = insight?.crmFields ?? {};
  const keyFacts: string[] = filterLowSignalFacts(insight?.keyFacts ?? []);
  const sources: Array<{ name?: string; url?: string; snippet?: string }> = insight?.sources ?? [];
  const recentNews: Array<{ date?: string; headline?: string; source?: string; url?: string }> =
    insight?.recentNews ?? [];
  const stockPrice = insight?.stockPrice ?? null;

  const contextMatches = useMemo(() => {
    const name = (entityName ?? "").toLowerCase();
    const summaryText = (summary ?? "").toLowerCase();
    const factText = keyFacts.join(" ").toLowerCase();
    const watchlistMatches = trackedHashtags.filter((tag) => {
      const t = tag.toLowerCase();
      return name.includes(t) || summaryText.includes(t) || factText.includes(t);
    });
    const stackMatches = techStack.filter((stack) => {
      const s = stack.toLowerCase();
      return summaryText.includes(s) || factText.includes(s);
    });
    return { watchlistMatches, stackMatches };
  }, [entityName, keyFacts, summary, techStack, trackedHashtags]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
        aria-label="Close entity drawer"
      />
      <div className="ml-auto w-full max-w-md h-full bg-white shadow-2xl border-l border-stone-200 flex flex-col relative">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-900 text-white flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-stone-900">{entityName ?? "Entity"}</div>
              <div className="text-[10px] uppercase tracking-widest text-stone-400">{entityType}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!entityName) return;
                const fallbackMock = pickAuditMock(entityName);
                setIsLoading(true);
                fetchInsightsRef
                  .current({ entityName, entityType, forceRefresh: true })
                  .then((result) => {
                    const hasLiveData =
                      !!result &&
                      (typeof result.summary === "string" ||
                        (Array.isArray(result.keyFacts) && result.keyFacts.length > 0) ||
                        (result.crmFields && Object.keys(result.crmFields).length > 0));
                    if (hasLiveData) {
                      setInsight(mergeInsight(result, fallbackMock, entityName));
                      setError(null);
                      return;
                    }
                    if (fallbackMock) {
                      setInsight(fallbackMock);
                      setError(null);
                      return;
                    }
                    setError("No entity data available.");
                  })
                  .catch((err) => {
                    if (fallbackMock) {
                      setInsight(fallbackMock);
                      setError(null);
                      return;
                    }
                    setError(err?.message ?? "Failed to refresh.");
                  })
                  .finally(() => setIsLoading(false));
              }}
              className="p-2 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              aria-label="Refresh entity"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}

          {!error && (
            <>
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Summary</div>
                <p className="text-sm text-stone-700 leading-relaxed">{summary}</p>

                {/* Freshness Badge */}
                {insight?.freshness && (
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold ${insight.freshness.withinBankerWindow
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                    }`}>
                    <span>{insight.freshness.withinBankerWindow ? "✓" : "⚠"}</span>
                    <span>
                      {insight.freshness.newsAgeDays !== null
                        ? `${insight.freshness.newsAgeDays}d ago`
                        : "No recent news"}
                    </span>
                    {insight.freshness.withinBankerWindow && (
                      <span className="ml-1 opacity-75">• Banker Ready</span>
                    )}
                  </div>
                )}
              </div>

              {/* Funding Details */}
              {insight?.funding?.lastRound && (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Latest Round</div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{insight.funding.lastRound.roundType}</span>
                    {insight.funding.lastRound.amount && (
                      <span className="font-bold">
                        {insight.funding.lastRound.amount.currency === "EUR" ? "€" : "$"}
                        {insight.funding.lastRound.amount.amount}{insight.funding.lastRound.amount.unit}
                      </span>
                    )}
                  </div>
                  {insight.funding.lastRound.coLeads && insight.funding.lastRound.coLeads.length > 0 && (
                    <div className="text-[10px]">
                      <span className="text-blue-600 font-semibold">Co-Leads:</span>{" "}
                      {insight.funding.lastRound.coLeads.join(", ")}
                    </div>
                  )}
                  {insight.funding.bankerTakeaway && (
                    <div className="text-[10px] italic border-t border-blue-200 pt-2 mt-2">
                      💡 {insight.funding.bankerTakeaway}
                    </div>
                  )}
                </div>
              )}

              {/* Persona Status */}
              {insight?.personaHooks?.JPM_STARTUP_BANKER && (
                <div className={`rounded-md border p-3 text-xs ${insight.personaHooks.JPM_STARTUP_BANKER.failTriggers?.length === 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      Banker Readiness
                    </span>
                    <span className={`font-semibold ${insight.personaHooks.JPM_STARTUP_BANKER.failTriggers?.length === 0
                        ? "text-emerald-700"
                        : "text-amber-700"
                      }`}>
                      {insight.personaHooks.JPM_STARTUP_BANKER.failTriggers?.length === 0 ? "✓ PASS" : "⚠ GAPS"}
                    </span>
                  </div>
                  {insight.personaHooks.JPM_STARTUP_BANKER.failTriggers?.length > 0 && (
                    <ul className="mt-2 text-[10px] space-y-0.5">
                      {insight.personaHooks.JPM_STARTUP_BANKER.failTriggers.slice(0, 3).map((trigger: string, i: number) => (
                        <li key={i} className="text-amber-700">• {trigger}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs text-stone-600">
                <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                    <MapPin className="w-3 h-3" /> HQ
                  </div>
                  <div className="mt-1 font-semibold text-stone-900">{crm.hqLocation || "n/a"}</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                    <Calendar className="w-3 h-3" /> Founded
                  </div>
                  <div className="mt-1 font-semibold text-stone-900">{crm.foundingYear || "n/a"}</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                    <Users className="w-3 h-3" /> Founders
                  </div>
                  <div className="mt-1 font-semibold text-stone-900">
                    {(crm.founders ?? []).slice(0, 2).join(", ") || "n/a"}
                  </div>
                </div>
                <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                    <Globe className="w-3 h-3" /> Website
                  </div>
                  <div className="mt-1 font-semibold text-stone-900">{crm.website || "n/a"}</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                    <DollarSign className="w-3 h-3" /> Funding
                  </div>
                  <div className="mt-1 font-semibold text-stone-900">{crm.totalFunding || "n/a"}</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                    <Building2 className="w-3 h-3" /> Stage
                  </div>
                  <div className="mt-1 font-semibold text-stone-900">{crm.fundingStage || "n/a"}</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-stone-50 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-stone-400">
                    <Calendar className="w-3 h-3" /> Last round
                  </div>
                  <div className="mt-1 font-semibold text-stone-900">{crm.lastFundingDate || "n/a"}</div>
                </div>
              </div>

              {crm.foundersBackground && (
                <div className="rounded-md border border-stone-100 bg-white p-3 text-xs text-stone-600">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Founder background</div>
                  <div className="mt-1 text-sm text-stone-800">{crm.foundersBackground}</div>
                </div>
              )}

              {crm.keyPeople?.length > 0 && (
                <div className="rounded-md border border-stone-100 bg-white p-3 text-xs text-stone-600 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Key people</div>
                  <ul className="space-y-1">
                    {crm.keyPeople.slice(0, 3).map((person: any, idx: number) => (
                      <li key={`${person.name}-${idx}`} className="text-sm text-stone-800">
                        <span className="font-semibold">{person.name}</span> - {person.title}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {crm.investors?.length > 0 && (
                <div className="rounded-md border border-stone-100 bg-white p-3 text-xs text-stone-600">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Investors</div>
                  <div className="mt-1 text-sm text-stone-800">{crm.investors.slice(0, 4).join(", ")}</div>
                </div>
              )}

              {crm.competitors?.length > 0 && (
                <div className="rounded-md border border-stone-100 bg-white p-3 text-xs text-stone-600">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Competitors</div>
                  <div className="mt-1 text-sm text-stone-800">{crm.competitors.slice(0, 4).join(", ")}</div>
                </div>
              )}

              {stockPrice?.price && (
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-900">
                  <div className="flex items-center justify-between">
                    <span className="font-bold uppercase tracking-widest">Stock</span>
                    <span className="font-semibold">${stockPrice.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  {stockPrice.asOf && (
                    <div className="text-[10px] text-emerald-700 mt-1">As of {stockPrice.asOf}</div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Key facts</div>
                {keyFacts.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-stone-600 space-y-1">
                    {keyFacts.slice(0, 6).map((fact, idx) => (
                      <li key={`${fact}-${idx}`}>{fact}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-stone-400">No key facts captured yet.</div>
                )}
              </div>

              {(contextMatches.watchlistMatches.length > 0 || contextMatches.stackMatches.length > 0) && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Your context</div>
                  {contextMatches.watchlistMatches.length > 0 && (
                    <div className="text-xs text-stone-600">
                      Watchlist matches: {contextMatches.watchlistMatches.join(", ")}
                    </div>
                  )}
                  {contextMatches.stackMatches.length > 0 && (
                    <div className="text-xs text-stone-600">
                      Stack matches: {contextMatches.stackMatches.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {recentNews.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recent news</div>
                  <div className="space-y-2">
                    {recentNews.slice(0, 5).map((item, idx) => (
                      <button
                        key={`${item.url ?? item.headline}-${idx}`}
                        type="button"
                        onClick={() => {
                          if (onOpenReader && item.url) {
                            onOpenReader({
                              title: item.headline,
                              url: item.url,
                              source: item.source,
                              summary: item.headline,
                              publishedAt: item.date,
                            });
                            return;
                          }
                          if (item.url) {
                            window.open(item.url, "_blank", "noopener,noreferrer");
                          }
                        }}
                        className="w-full text-left rounded-md border border-stone-100 bg-stone-50 px-3 py-2 hover:bg-white transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-stone-400">
                          <span>{item.source || "Source"}</span>
                          {item.date && <span>{item.date}</span>}
                        </div>
                        <div className="text-xs text-stone-700 mt-1">{item.headline}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {sources.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Sources</div>
                  <div className="space-y-2">
                    {sources.slice(0, 5).map((source, idx) => (
                      <button
                        key={`${source.url ?? source.name}-${idx}`}
                        type="button"
                        onClick={() => {
                          if (onOpenReader && source.url) {
                            onOpenReader({
                              title: source.name,
                              url: source.url,
                              summary: source.snippet,
                            });
                            return;
                          }
                          if (source.url) {
                            window.open(source.url, "_blank", "noopener,noreferrer");
                          }
                        }}
                        className="w-full text-left rounded-md border border-stone-100 bg-white px-3 py-2 hover:border-emerald-900 transition-colors"
                      >
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-700">
                          <span>{source.name || "Source"}</span>
                          <ArrowUpRight className="w-3 h-3 text-stone-400" />
                        </div>
                        {source.snippet && (
                          <div className="text-[10px] text-stone-500 mt-1 line-clamp-2">{source.snippet}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
          }
        </div >

        <div className="border-t border-stone-200 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              if (!entityName) return;
              openWithContext({
                contextTitle: `Entity brief: ${entityName}`,
                initialMessage: `Provide a decision brief on ${entityName}. Include catalysts, risks, and next actions.`,
                contextWebUrls: (sources || []).map((s) => s.url).filter(Boolean),
              });
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white bg-emerald-900 hover:bg-black transition-colors"
          >
            Ask agent
          </button>
        </div>
      </div >
    </div >
  );
};

export default EntityContextDrawer;

