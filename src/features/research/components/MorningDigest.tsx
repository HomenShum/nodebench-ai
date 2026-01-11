import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Newspaper,
  Building2,
  RefreshCw,
  Zap,
  Target
} from 'lucide-react';
import { CrossLinkedText } from './CrossLinkedText';
import { InteractiveSpanParser } from './InteractiveSpanParser';
import { FootnotesSection } from './FootnotesSection';
import type { CitationLibrary } from '../types/citationSchema';
import type { EntityLibrary } from '../types/entitySchema';
import type { EntityHoverData } from './EntityHoverPreview';

interface DigestSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: DigestItem[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface DigestItem {
  text: string;
  relevance?: 'high' | 'medium' | 'low';
  linkedEntity?: string;
}

interface MorningDigestProps {
  userName?: string;
  onItemClick?: (item: DigestItem) => void;
  onEntityClick?: (entityName: string, entityType?: "company" | "person") => void;
  onRefresh?: () => void;
}

// Helper to detect sentiment from text (client-side fallback)
function detectSentimentLocal(text: string): 'bullish' | 'bearish' | 'neutral' {
  const lower = text.toLowerCase();
  const bullishWords = ['up', 'gain', 'surge', 'rise', 'growth', 'bullish', 'strong', 'positive', 'success', 'expand'];
  const bearishWords = ['down', 'fall', 'decline', 'drop', 'risk', 'concern', 'warning', 'bearish', 'weak', 'negative'];

  const bullishScore = bullishWords.filter(w => lower.includes(w)).length;
  const bearishScore = bearishWords.filter(w => lower.includes(w)).length;

  if (bullishScore > bearishScore) return 'bullish';
  if (bearishScore > bullishScore) return 'bearish';
  return 'neutral';
}

// Extract potential ticker/entity from text
function extractEntity(text: string): string | undefined {
  const cleaned = text.trim();
  if (!cleaned) return undefined;

  const stop = new Set([
    "The",
    "A",
    "An",
    "All",
    "New",
    "Today",
    "Breaking",
    "Report",
    "Study",
    "Research",
    "Analysis",
  ]);

  // Prefer known entities and audit-critical names
  const knownEntities = [
    "Clearspace",
    "SoundCloud",
    "Salesforce",
    "Open-AutoGLM",
    "OpenAI",
    "Anthropic",
    "Google",
    "NVIDIA",
    "Amazon",
    "Meta",
    "Tesla",
    "Microsoft",
    "Gemini",
  ];
  for (const entity of knownEntities) {
    if (cleaned.toLowerCase().includes(entity.toLowerCase())) return entity;
  }

  // Capture repo-style tokens like owner/repo (e.g., bellard/mquickjs)
  const repoMatch = cleaned.match(/\b([a-z0-9_.-]+)\/([a-z0-9_.-]+)\b/i);
  if (repoMatch?.[2] && /[a-z]/i.test(repoMatch[2])) return repoMatch[2];

  // Look for common ticker patterns (ignore generic terms)
  const tickerMatch = cleaned.match(/\b([A-Z]{2,5})\b/);
  if (tickerMatch && !stop.has(tickerMatch[1])) return tickerMatch[1];

  // Capture leading proper noun before parenthesis or dash
  const prefixMatch = cleaned.match(/^([A-Z][A-Za-z0-9-]+)(?:\s+\(|\s+-|\s+is\b)/);
  if (prefixMatch?.[1] && !stop.has(prefixMatch[1])) return prefixMatch[1];

  // Capture camel-cased names (e.g., SoundCloud)
  const camelMatch = cleaned.match(/\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/);
  if (camelMatch?.[1]) return camelMatch[1];

  // Capture hyphenated proper nouns (e.g., Open-AutoGLM)
  const hyphenMatch = cleaned.match(/\b([A-Z][A-Za-z0-9]+-[A-Za-z0-9-]+)\b/);
  if (hyphenMatch?.[1]) return hyphenMatch[1];

  return undefined;
}

export const MorningDigest: React.FC<MorningDigestProps> = ({
  userName = 'there',
  onItemClick,
  onEntityClick,
  onRefresh
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['markets', 'watchlist']));
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Track if we've already attempted to generate
  const hasAttemptedGeneration = useRef(false);

  // Fetch real digest data from Convex
  // Query is in separate file (morningDigestQueries) due to Convex Node.js restrictions
  const digestData = useQuery(api.domains.ai.morningDigestQueries.getDigestData);

  // Check for cached summary first (avoids LLM call on every mount)
  const cachedSummary = useQuery(api.domains.ai.morningDigestQueries.getCachedDigestSummary);

  // Fetch agent-generated digest with entity enrichment
  const agentDigest = useQuery(api.domains.agents.digestAgent.getLatestDigestWithEntities, {});

  const generateSummary = useAction(api.domains.ai.morningDigest.generateDigestSummary);
  const cacheSummary = useMutation(api.domains.ai.morningDigestQueries.cacheDigestSummary);

  // Use cached summary if available
  useEffect(() => {
    if (cachedSummary?.summary && !generatedSummary) {
      setGeneratedSummary(cachedSummary.summary);
      setIsFromCache(true);
    }
  }, [cachedSummary, generatedSummary]);

  // Sample fallback data when no real data exists
  const sampleDigestData = useMemo(() => ({
    marketMovers: [
      { title: 'NVDA surges 8% on AI infrastructure demand outlook', source: 'Bloomberg' },
      { title: 'OpenAI valued at $300B in latest funding round', source: 'TechCrunch' },
      { title: 'Anthropic announces Claude Opus 4.5 with 5-hour task horizons', source: 'The Verge' },
    ],
    watchlistRelevant: [
      { title: 'Universal Reasoning Models achieve ARC-AGI breakthroughs', source: 'ArXiv' },
      { title: 'TimeLens establishes new baseline for video temporal grounding', source: 'ArXiv' },
      { title: 'Agent reliability benchmarks show significant improvements', source: 'METR' },
    ],
    riskAlerts: [
      { title: 'EU AI Act enforcement begins Q1 2025 - compliance review recommended', source: 'Reuters' },
    ],
    trackedHashtags: ['#ai-agents', '#reasoning', '#multimodal'],
  }), []);

  // Track if using sample data
  const isUsingSampleData = !digestData || (
    !digestData.marketMovers?.length &&
    !digestData.watchlistRelevant?.length &&
    !digestData.riskAlerts?.length
  );

  // Transform feed items into digest sections
  const digestSections: DigestSection[] = useMemo(() => {
    const dataToUse = isUsingSampleData ? sampleDigestData : digestData;
    if (!dataToUse) return [];

    const sections: DigestSection[] = [];

    // Safely access arrays with fallbacks
    const marketMovers = dataToUse.marketMovers ?? [];
    const watchlistRelevant = dataToUse.watchlistRelevant ?? [];
    const riskAlerts = dataToUse.riskAlerts ?? [];
    const trackedHashtags = dataToUse.trackedHashtags ?? [];

    // Market Movers section
    if (marketMovers.length > 0) {
      const items = marketMovers.map(item => ({
        text: item.title,
        relevance: 'high' as const,
        linkedEntity: extractEntity(item.title),
      }));
      const overallSentiment = detectSentimentLocal(items.map(i => i.text).join(' '));
      sections.push({
        id: 'markets',
        title: 'Market Movers',
        icon: <TrendingUp className="w-4 h-4" />,
        sentiment: overallSentiment,
        items,
      });
    }

    // Watchlist Relevant section
    if (watchlistRelevant.length > 0) {
      const items = watchlistRelevant.map(item => ({
        text: item.title,
        relevance: 'high' as const,
        linkedEntity: extractEntity(item.title),
      }));
      const overallSentiment = detectSentimentLocal(items.map(i => i.text).join(' '));
      sections.push({
        id: 'watchlist',
        title: `Your Topics (${trackedHashtags.length})`,
        icon: <Building2 className="w-4 h-4" />,
        sentiment: overallSentiment,
        items,
      });
    } else if (trackedHashtags.length === 0) {
      // Show hint to track topics
      sections.push({
        id: 'watchlist',
        title: 'Your Topics',
        icon: <Building2 className="w-4 h-4" />,
        sentiment: 'neutral',
        items: [{
          text: 'Start tracking topics to see personalized news here. Try "#ai" or "#openai".',
          relevance: 'medium',
        }],
      });
    }

    // Risk Alerts section
    if (riskAlerts.length > 0) {
      const items = riskAlerts.map(item => ({
        text: item.title,
        relevance: 'high' as const,
        linkedEntity: extractEntity(item.title),
      }));
      sections.push({
        id: 'alerts',
        title: 'Risk Alerts',
        icon: <AlertTriangle className="w-4 h-4" />,
        sentiment: 'neutral',
        items,
      });
    }

    // Personal Overlay section (Institutional Priorities)
    const personalOverlay = (dataToUse as any).personalOverlay;
    if (personalOverlay && Array.isArray(personalOverlay.features)) {
      const passing = personalOverlay.features.filter((f: any) => f.status === 'passing');
      if (passing.length > 0) {
        sections.push({
          id: 'personal',
          title: 'Internal Priorities',
          icon: <Target className="w-4 h-4" />,
          sentiment: 'neutral',
          items: passing.map((f: any) => ({
            text: `${f.name}: ${f.resultMarkdown?.replace(/#+ /g, '').slice(0, 100)}...`,
            relevance: 'high' as const,
            linkedEntity: f.id
          }))
        });
      }
    }

    return sections;
  }, [digestData, isUsingSampleData, sampleDigestData]);

  // Generate AI summary only if not cached (avoids redundant LLM calls)
  useEffect(() => {
    // Skip if:
    // 1. No digest data yet
    // 2. Already have a summary (cached or generated)
    // 3. Already loading
    // 4. Already attempted generation this session
    // 5. Cache query still loading (undefined)
    if (!digestData || generatedSummary || isLoading || hasAttemptedGeneration.current) {
      return;
    }

    // Wait for cache query to complete
    if (cachedSummary === undefined) {
      return;
    }

    // If cache returned a summary, don't regenerate
    if (cachedSummary?.summary) {
      return;
    }

    // Mark as attempted to prevent multiple calls
    hasAttemptedGeneration.current = true;

    const marketMovers = digestData.marketMovers ?? [];
    const watchlistRelevant = digestData.watchlistRelevant ?? [];
    const riskAlerts = digestData.riskAlerts ?? [];
    const trackedHashtags = digestData.trackedHashtags ?? [];

    // Create a hash of the input data for cache invalidation
    const dataHash = JSON.stringify({
      m: marketMovers.map(m => m.title).slice(0, 3),
      w: watchlistRelevant.map(m => m.title).slice(0, 3),
      r: riskAlerts.map(m => m.title).slice(0, 2),
    });

    setIsLoading(true);
    setIsFromCache(false);

    generateSummary({
      marketMovers: marketMovers.map(m => ({
        title: m.title,
        summary: m.summary,
        tags: m.tags,
      })),
      watchlistRelevant: watchlistRelevant.map(m => ({
        title: m.title,
        summary: m.summary,
        tags: m.tags,
      })),
      riskAlerts: riskAlerts.map(m => ({
        title: m.title,
        summary: m.summary,
        tags: m.tags,
      })),
      trackedHashtags,
      userName,
    })
      .then(async (result) => {
        setGeneratedSummary(result.summary);
        // Cache the generated summary for future mounts
        try {
          await cacheSummary({
            summary: result.summary,
            dataHash,
          });
        } catch (cacheErr) {
          console.warn('Failed to cache digest summary:', cacheErr);
        }
      })
      .catch(err => {
        console.error('Failed to generate summary:', err);
        setGeneratedSummary('Check the feed for the latest updates on markets and your tracked topics.');
      })
      .finally(() => setIsLoading(false));
  }, [digestData, generatedSummary, isLoading, cachedSummary, generateSummary, cacheSummary, userName]);

  // Fallback summary if AI generation fails
  const fullSummary = generatedSummary ||
    (digestData
      ? `${(digestData.marketMovers ?? []).length} market updates and ${(digestData.watchlistRelevant ?? []).length} items matching your tracked topics. ${(digestData.riskAlerts ?? []).length > 0 ? `${(digestData.riskAlerts ?? []).length} risk alerts to monitor.` : ''}`
      : 'Loading your personalized morning briefing...');

  // Build citation library from digest data sources
  const citationLibrary: CitationLibrary = useMemo(() => {
    const citations: CitationLibrary['citations'] = {};
    const order: string[] = [];
    let citationNum = 1;

    // Add citations from market movers
    (digestData?.marketMovers ?? []).slice(0, 3).forEach((item, idx) => {
      const id = `market-${idx + 1}`;
      citations[id] = {
        id,
        number: citationNum++,
        type: 'source',
        label: item.source || 'Market Data',
        fullText: item.title,
        url: item.url,
        author: item.source,
        occurrences: [],
      };
      order.push(id);
    });

    // Add citations from watchlist items
    (digestData?.watchlistRelevant ?? []).slice(0, 2).forEach((item, idx) => {
      const id = `topic-${idx + 1}`;
      citations[id] = {
        id,
        number: citationNum++,
        type: 'source',
        label: item.source || 'Topic Update',
        fullText: item.title,
        url: item.url,
        author: item.source,
        occurrences: [],
      };
      order.push(id);
    });

    return { citations, order, updatedAt: new Date().toISOString() };
  }, [digestData]);

  // Build entity library from detected entities in digest
  const entityLibrary: EntityLibrary = useMemo(() => {
    const entities: EntityLibrary['entities'] = {};
    const nameIndex: EntityLibrary['nameIndex'] = {};

    // Extract entities from market movers
    (digestData?.marketMovers ?? []).forEach((item) => {
      const entity = extractEntity(item.title);
      if (entity && !entities[entity.toLowerCase()]) {
        const id = entity.toLowerCase();
        entities[id] = {
          id,
          name: entity,
          type: 'company',
          description: item.summary || item.title,
        };
        nameIndex[entity.toLowerCase()] = id;
      }
    });

    // Add common tech entities
    const commonEntities = [
      { id: 'openai', name: 'OpenAI', type: 'company' as const },
      { id: 'anthropic', name: 'Anthropic', type: 'company' as const },
      { id: 'google', name: 'Google', type: 'company' as const },
      { id: 'microsoft', name: 'Microsoft', type: 'company' as const },
      { id: 'nvidia', name: 'NVIDIA', type: 'company' as const },
    ];
    commonEntities.forEach((e) => {
      if (!entities[e.id]) {
        entities[e.id] = { ...e, description: `${e.name} - Technology company` };
        nameIndex[e.name.toLowerCase()] = e.id;
      }
    });

    return { entities, nameIndex, updatedAt: new Date().toISOString() };
  }, [digestData]);

  // Build entity enrichment map from agent digest for hover previews
  // Now includes adaptive enrichment fields (relationships, circle of influence, timeline, executive summary)
  const entityEnrichment = useMemo((): Record<string, EntityHoverData> | undefined => {
    if (!agentDigest?.entityEnrichment) return undefined;

    // Transform the agent's entity enrichment to EntityHoverData format
    const enrichmentMap: Record<string, EntityHoverData> = {};
    for (const [key, data] of Object.entries(agentDigest.entityEnrichment)) {
      const enrichmentData = data as any; // Type assertion for adaptive fields
      enrichmentMap[key] = {
        entityId: enrichmentData.entityId,
        name: enrichmentData.name,
        type: enrichmentData.type as EntityHoverData['type'],
        summary: enrichmentData.summary,
        keyFacts: enrichmentData.keyFacts ?? [],
        funding: enrichmentData.funding,
        sources: enrichmentData.sources as EntityHoverData['sources'],
        // Adaptive enrichment fields for medium-detail hover previews
        relationships: enrichmentData.relationships,
        circleOfInfluence: enrichmentData.circleOfInfluence,
        timelineHighlight: enrichmentData.timelineHighlight,
        executiveSummary: enrichmentData.executiveSummary,
      };
    }
    return enrichmentMap;
  }, [agentDigest?.entityEnrichment]);

  const handleRefresh = async () => {
    setIsLoading(true);
    setGeneratedSummary(null); // Reset to trigger regeneration
    setIsFromCache(false);
    hasAttemptedGeneration.current = false; // Allow regeneration
    try {
      await onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate last updated time
  const lastUpdatedText = useMemo(() => {
    if (cachedSummary?.generatedAt) {
      const mins = Math.round((Date.now() - cachedSummary.generatedAt) / 60000);
      return `AI summary ${mins < 1 ? 'just now' : `${mins}m ago`}${isFromCache ? ' (cached)' : ''}`;
    }
    if (digestData?.lastUpdated) {
      return `Updated ${Math.round((Date.now() - digestData.lastUpdated) / 60000)} min ago`;
    }
    return 'Loading...';
  }, [digestData?.lastUpdated, cachedSummary?.generatedAt, isFromCache]);

  const digestStats = useMemo(() => {
    const dataToUse = isUsingSampleData ? sampleDigestData : digestData;
    const marketCount = dataToUse?.marketMovers?.length ?? 0;
    const topicCount = dataToUse?.watchlistRelevant?.length ?? 0;
    const alertCount = dataToUse?.riskAlerts?.length ?? 0;

    return [
      { id: 'markets', label: 'Markets', value: marketCount, sentiment: digestSections.find(s => s.id === 'markets')?.sentiment },
      { id: 'watchlist', label: 'Topics', value: topicCount, sentiment: digestSections.find(s => s.id === 'watchlist')?.sentiment },
      { id: 'alerts', label: 'Alerts', value: alertCount, sentiment: 'neutral' as const },
      { id: 'personal', label: 'Priority', value: (digestSections.find(s => s.id === 'personal')?.items.length ?? 0), sentiment: 'neutral' as const },
    ].filter(stat => stat.value > 0);
  }, [digestData, digestSections, isUsingSampleData, sampleDigestData]);

  const primarySentiment = digestStats.find((stat) => stat.sentiment)?.sentiment || 'neutral';

  const digestTotals = useMemo(() => {
    const dataToUse = isUsingSampleData ? sampleDigestData : digestData;
    const marketCount = dataToUse?.marketMovers?.length ?? 0;
    const topicCount = dataToUse?.watchlistRelevant?.length ?? 0;
    const alertCount = dataToUse?.riskAlerts?.length ?? 0;
    const priorityCount = digestSections.find((section) => section.id === 'personal')?.items.length ?? 0;
    const trackedCount = dataToUse?.trackedHashtags?.length ?? 0;
    const sourceCount = citationLibrary.order.length;
    const entityCount = Object.keys(entityLibrary.entities || {}).length;
    return {
      marketCount,
      topicCount,
      alertCount,
      priorityCount,
      trackedCount,
      sourceCount,
      entityCount,
      totalSignals: marketCount + topicCount + alertCount,
    };
  }, [citationLibrary.order.length, digestData, digestSections, entityLibrary.entities, isUsingSampleData, sampleDigestData]);

  const topEntities = useMemo(() => {
    return Object.values(entityLibrary.entities || {})
      .map((entity) => entity.name)
      .slice(0, 6);
  }, [entityLibrary.entities]);

  const signalHighlights = useMemo(() => {
    const highlights: Array<{ label: string; text: string; linkedEntity?: string }> = [];
    const dataToUse = isUsingSampleData ? sampleDigestData : digestData;
    (dataToUse?.marketMovers ?? []).slice(0, 2).forEach((item) => {
      highlights.push({ label: 'Market', text: item.title, linkedEntity: extractEntity(item.title) });
    });
    (dataToUse?.watchlistRelevant ?? []).slice(0, 2).forEach((item) => {
      highlights.push({ label: 'Topic', text: item.title, linkedEntity: extractEntity(item.title) });
    });
    (dataToUse?.riskAlerts ?? []).slice(0, 1).forEach((item) => {
      highlights.push({ label: 'Risk', text: item.title, linkedEntity: extractEntity(item.title) });
    });
    return highlights;
  }, [digestData, isUsingSampleData, sampleDigestData]);

  const digestSectionRows = useMemo(() => {
    return digestSections.map((section) => {
      const counts = { high: 0, medium: 0, low: 0 };
      section.items.forEach((item) => {
        if (item.relevance === 'high') counts.high += 1;
        else if (item.relevance === 'medium') counts.medium += 1;
        else counts.low += 1;
      });
      return {
        id: section.id,
        title: section.title,
        sentiment: section.sentiment,
        total: section.items.length,
        ...counts,
      };
    });
  }, [digestSections]);

  const topSources = useMemo(() => {
    const counts = new Map<string, number>();
    const dataToUse = isUsingSampleData ? sampleDigestData : digestData;
    const addSource = (source?: string) => {
      const key = source || 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };
    (dataToUse?.marketMovers ?? []).forEach((item) => addSource(item.source));
    (dataToUse?.watchlistRelevant ?? []).forEach((item) => addSource(item.source));
    (dataToUse?.riskAlerts ?? []).forEach((item) => addSource(item.source));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [digestData, isUsingSampleData, sampleDigestData]);

  const maxSourceCount = topSources[0]?.count ?? 1;

  const digestItems = useMemo(() => {
    const dataToUse = isUsingSampleData ? sampleDigestData : digestData;
    return [
      ...(dataToUse?.marketMovers ?? []),
      ...(dataToUse?.watchlistRelevant ?? []),
      ...(dataToUse?.riskAlerts ?? []),
    ];
  }, [digestData, isUsingSampleData, sampleDigestData]);

  const signalMix = useMemo(() => {
    const mixTotal = digestTotals.totalSignals + digestTotals.priorityCount || 1;
    const mix = [
      { label: 'Markets', count: digestTotals.marketCount, tone: 'bg-emerald-900' },
      { label: 'Topics', count: digestTotals.topicCount, tone: 'bg-blue-600' },
      { label: 'Alerts', count: digestTotals.alertCount, tone: 'bg-amber-500' },
      { label: 'Priority', count: digestTotals.priorityCount, tone: 'bg-stone-500' },
    ];
    return mix
      .filter((entry) => entry.count > 0)
      .map((entry) => ({
        ...entry,
        pct: Math.round((entry.count / mixTotal) * 100),
      }));
  }, [digestTotals]);

  const tagRadar = useMemo(() => {
    const counts = new Map<string, number>();
    digestItems.forEach((item: any) => {
      (item.tags ?? []).forEach((tag: string) => {
        const normalized = tag.replace(/^#/, '').trim().toLowerCase();
        if (!normalized) return;
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [digestItems]);

  const trackedHashtags = digestData?.trackedHashtags ?? [];
  const topicFocusTags = trackedHashtags.length > 0
    ? trackedHashtags.slice(0, 6)
    : tagRadar.slice(0, 6).map((tag) => `#${tag.tag}`);
  const isTopicFocusTrending = trackedHashtags.length === 0 && topicFocusTags.length > 0;

  const freshnessStats = useMemo(() => {
    const timestamps = digestItems
      .map((item: any) => Date.parse(item.publishedAt))
      .filter((value) => Number.isFinite(value));
    if (timestamps.length === 0) {
      return { newest: null as number | null, oldest: null as number | null, windowHours: null as number | null, avgScore: null as number | null };
    }
    const newest = Math.max(...timestamps);
    const oldest = Math.min(...timestamps);
    const windowHours = Math.max(1, Math.round((newest - oldest) / 3600000));
    const totalScore = digestItems.reduce((sum: number, item: any) => sum + (item.score ?? 0), 0);
    const avgScore = digestItems.length ? Math.round(totalScore / digestItems.length) : null;
    return { newest, oldest, windowHours, avgScore };
  }, [digestItems]);

  const avgHeatValue = freshnessStats.avgScore !== null
    ? Math.round(freshnessStats.avgScore)
    : null;

  const sourceConcentration = useMemo(() => {
    const total = topSources.reduce((sum, source) => sum + source.count, 0);
    if (!total || !topSources[0]) return null;
    return Math.round((topSources[0].count / total) * 100);
  }, [topSources]);

  const latestAgeHours = freshnessStats.newest
    ? Math.max(1, Math.round((Date.now() - freshnessStats.newest) / 3600000))
    : null;

  const agentLaunchpad = [
    {
      label: 'Deep agent: summarize the pulse',
      prompt: `Summarize today's pulse and list the top 3 actions.`,
    },
    {
      label: 'Deep agent: map risk exposure',
      prompt: `Scan the alerts and highlight the top 3 risk exposures to monitor.`,
    },
    {
      label: 'Deep agent: dossier build',
      prompt: `Build a concise dossier on the top signals and why they matter.`,
    },
    {
      label: 'Deep agent: topic watchlist',
      prompt: `Create a watchlist update from today's topics and market movers.`,
    },
  ];

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-700 bg-green-50 border border-green-100';
      case 'bearish': return 'text-red-700 bg-red-50 border border-red-100';
      default: return 'text-amber-700 bg-amber-50 border border-amber-100';
    }
  };

  const getRelevanceIndicator = (relevance?: string) => {
    switch (relevance) {
      case 'high': return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'medium': return 'bg-blue-50 text-blue-700 border border-blue-100';
      default: return 'bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] border border-[color:var(--border-color)]';
    }
  };

  const densityStats = [
    { label: 'Signals', value: digestTotals.totalSignals, hint: 'market + topics + alerts' },
    { label: 'Sources', value: digestTotals.sourceCount, hint: 'linked citations' },
    { label: 'Entities', value: digestTotals.entityCount, hint: 'detected names' },
    { label: 'Topics', value: digestTotals.trackedCount, hint: 'tracked hashtags' },
    { label: 'Alerts', value: digestTotals.alertCount, hint: 'risk flags' },
    { label: 'Priority', value: digestTotals.priorityCount, hint: 'internal focus' },
  ];

  return (
    <div className="rounded-2xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)]/40 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-[color:var(--bg-secondary)]/50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[color:var(--text-primary)] text-white flex items-center justify-center shadow-lg transform -rotate-1 transition-transform hover:rotate-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--text-secondary)] mb-0.5">Overnight Signal</p>
            <p className="text-2xl font-serif font-bold text-[color:var(--text-primary)] leading-tight">Hi {userName}, here's the pulse.</p>
            <p className="text-[11px] font-medium text-[color:var(--text-secondary)] mt-0.5">{lastUpdatedText}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {digestStats.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              {digestStats.map((stat) => (
                <span
                  key={stat.id}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${stat.sentiment ? getSentimentColor(stat.sentiment) : 'bg-[color:var(--bg-secondary)]/50 border border-[color:var(--border-color)] text-[color:var(--text-secondary)]'
                    }`}
                >
                  {stat.label}: {stat.value}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-2 pl-4 border-l border-[color:var(--border-color)]">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-lg text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-hover)]/50 transition-all active:scale-95"
              title="Refresh digest"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--bg-hover)]/50 transition-all active:scale-95"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="relative overflow-hidden rounded-none border-l-4 border-emerald-900 bg-[#f2f1ed] p-8 mt-4">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Zap className="w-24 h-24 text-stone-900" />
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-1 relative z-10">
                <p className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-none transform rotate-45 ${primarySentiment === 'bullish' ? 'bg-emerald-700' : 'bg-stone-500'}`} />
                  Digest Overview
                </p>
                <div className="text-xl font-serif font-medium text-[color:var(--text-primary)] leading-relaxed italic">
                  "<InteractiveSpanParser
                    text={fullSummary}
                    citations={citationLibrary}
                    entities={entityLibrary}
                    entityEnrichment={entityEnrichment}
                    onCitationClick={(citation) => onItemClick?.({ text: `Tell me more about: ${citation.fullText}`, relevance: 'high' })}
                    onEntityClick={(entity) => onItemClick?.({ text: `Deep dive on ${entity.name}`, relevance: 'high', linkedEntity: entity.name })}
                  />"
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Briefing Snapshot</p>
                <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">Coverage density</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {densityStats.map((stat) => (
                  <div key={stat.label} className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{stat.label}</div>
                    <div className="text-2xl font-serif font-semibold text-[color:var(--text-primary)]">{stat.value}</div>
                    <div className="text-[10px] text-stone-400">{stat.hint}</div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Topic focus</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topicFocusTags.length > 0 ? (
                    topicFocusTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 text-[10px] font-bold uppercase tracking-tight border border-stone-200 bg-white text-stone-600"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-stone-400">No topics tracked yet.</span>
                  )}
                </div>
                {isTopicFocusTrending && (
                  <div className="mt-2 text-[9px] text-stone-400 uppercase tracking-widest">
                    Trending tags (not tracked yet)
                  </div>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Entities detected</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topEntities.length > 0 ? (
                    topEntities.map((entity) => (
                      <button
                        key={entity}
                        type="button"
                        onClick={() => onEntityClick?.(entity, "company")}
                        className="px-2 py-1 text-[10px] font-semibold border border-stone-200 bg-[#faf9f6] text-stone-600 hover:border-emerald-900 hover:text-emerald-900 transition-colors"
                      >
                        {entity}
                      </button>
                    ))
                  ) : (
                    <span className="text-[10px] text-stone-400">No entities detected.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Signal Highlights</p>
                <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">What moved overnight</p>
              </div>
              <div className="space-y-3">
                {signalHighlights.length > 0 ? (
                  signalHighlights.map((item, idx) => (
                    <div
                      key={`${item.label}-${idx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => onItemClick?.({ text: item.text, relevance: 'high', linkedEntity: item.linkedEntity })}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter" && event.key !== " ") return;
                        event.preventDefault();
                        onItemClick?.({ text: item.text, relevance: 'high', linkedEntity: item.linkedEntity });
                      }}
                      className="w-full text-left rounded-md border border-stone-100 bg-[#faf9f6] px-4 py-3 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">{item.label}</span>
                        {item.linkedEntity && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onEntityClick?.(item.linkedEntity, "company");
                            }}
                            className="text-[10px] font-mono text-stone-400 uppercase tracking-tight hover:text-emerald-900 transition-colors"
                          >
                            {item.linkedEntity}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-[color:var(--text-primary)] mt-2">{item.text}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-stone-400">No highlights available yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Source Mix</p>
                <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">Where the signals came from</p>
              </div>
              <div className="space-y-3">
                {topSources.length > 0 ? (
                  topSources.map((source) => (
                    <div key={source.name} className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                        <span>{source.name}</span>
                        <span>{source.count}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-emerald-900"
                          style={{ width: `${Math.max(8, (source.count / maxSourceCount) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-stone-400">No sources tracked yet.</div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Signal Mix</p>
                  <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">Distribution by channel</p>
                </div>
                <button
                  type="button"
                  onClick={() => onItemClick?.({ text: 'Analyze the signal mix and recommend watchlist adjustments.', relevance: 'high' })}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-500 hover:text-emerald-900 hover:border-emerald-900 transition-colors"
                >
                  Ask agent
                </button>
              </div>
              <div className="space-y-3">
                {signalMix.length > 0 ? (
                  signalMix.map((entry) => (
                    <div key={entry.label} className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-stone-600">
                        <span>{entry.label}</span>
                        <span>{entry.count} ({entry.pct}%)</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-white">
                        <div
                          className={`h-full rounded-full ${entry.tone}`}
                          style={{ width: `${Math.max(8, entry.pct)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-stone-400">No signals tracked yet.</div>
                )}
              </div>
              <div className="text-[10px] text-stone-400 uppercase tracking-widest">
                Total {digestTotals.totalSignals + digestTotals.priorityCount} nodes
              </div>
            </div>

            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Tag Radar</p>
                  <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">What is clustering</p>
                </div>
                <button
                  type="button"
                  onClick={() => onItemClick?.({ text: 'Summarize the top tags and highlight emerging topics.', relevance: 'high' })}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-500 hover:text-emerald-900 hover:border-emerald-900 transition-colors"
                >
                  Ask agent
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tagRadar.length > 0 ? (
                  tagRadar.map((tag) => (
                    <button
                      key={tag.tag}
                      type="button"
                      onClick={() => onItemClick?.({ text: `Track #${tag.tag} and summarize the latest movement.`, relevance: 'medium', linkedEntity: tag.tag })}
                      className="px-3 py-1 text-[10px] font-bold uppercase tracking-tight border border-stone-200 bg-white text-stone-600 hover:text-emerald-900 hover:border-emerald-900 transition-colors"
                    >
                      #{tag.tag} <span className="text-stone-400">({tag.count})</span>
                    </button>
                  ))
                ) : (
                  <span className="text-[10px] text-stone-400">No tags detected yet.</span>
                )}
              </div>
              <div className="text-[10px] text-stone-400 uppercase tracking-widest">
                {digestItems.length} signals scanned
              </div>
            </div>

            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Freshness & Heat</p>
                  <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">Recency metrics</p>
                </div>
                <button
                  type="button"
                  onClick={() => onItemClick?.({ text: 'Assess freshness and heat across today\'s signals.', relevance: 'high' })}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-500 hover:text-emerald-900 hover:border-emerald-900 transition-colors"
                >
                  Ask agent
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Latest</div>
                  <div className="text-xl font-serif font-semibold text-[color:var(--text-primary)]">
                    {latestAgeHours !== null ? `${latestAgeHours}h` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-stone-400">age of newest item</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Window</div>
                  <div className="text-xl font-serif font-semibold text-[color:var(--text-primary)]">
                    {freshnessStats.windowHours !== null ? `${freshnessStats.windowHours}h` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-stone-400">coverage span</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Avg Heat Score</div>
                  <div className="text-xl font-serif font-semibold text-[color:var(--text-primary)]">
                    {avgHeatValue !== null ? `${avgHeatValue} pts` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-stone-400">avg engagement score</div>
                </div>
                <div className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Top Source</div>
                  <div className="text-xl font-serif font-semibold text-[color:var(--text-primary)]">
                    {sourceConcentration !== null ? `${sourceConcentration}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-stone-400">share of coverage</div>
                </div>
              </div>
              <div className="text-[10px] text-stone-400 uppercase tracking-widest">{lastUpdatedText}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4 xl:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Signal Ledger</p>
                  <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">Section density</p>
                </div>
                <button
                  type="button"
                  onClick={() => onItemClick?.({ text: 'Summarize the signal ledger and surface anomalies.', relevance: 'high' })}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest border border-stone-200 text-stone-500 hover:text-emerald-900 hover:border-emerald-900 transition-colors"
                >
                  Ask agent
                </button>
              </div>
              <div className="space-y-2">
                {digestSectionRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-md border border-stone-100 bg-[#faf9f6] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--text-primary)]">{row.title}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{row.total} nodes</div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest ${getSentimentColor(row.sentiment)}`}>
                        {row.sentiment}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-purple-50 text-purple-700 border border-purple-100">
                        High {row.high}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
                        Med {row.medium}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] border border-[color:var(--border-color)]">
                        Low {row.low}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Deep Agent Launchpad</p>
                <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">Runbook shortcuts</p>
              </div>
              <div className="space-y-2">
                {agentLaunchpad.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => onItemClick?.({ text: item.prompt, relevance: 'high' })}
                    className="w-full text-left rounded-md border border-stone-100 bg-[#faf9f6] px-4 py-3 text-xs font-semibold text-stone-600 hover:text-emerald-900 hover:border-emerald-900 transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="rounded-md border border-stone-100 bg-[#faf9f6] px-4 py-3 text-xs text-stone-500">
                Agent-ready prompts are routed to the deep agent stack for synthesis, verification, and follow-up execution.
              </div>
            </div>
          </div>

          {/* Sources Section - Phase 1 Citation Provenance */}
          {citationLibrary.order.length > 0 && (
            <FootnotesSection
              library={citationLibrary}
              title="Sources"
              showBackLinks={false}
            />
          )}

          {/* Sample Data Banner */}
          {isUsingSampleData && digestSections.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <p className="text-xs text-amber-700">
                <span className="font-medium">Sample Intelligence Feed</span> - Connect data sources or track hashtags to see real-time signals.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {digestSections.map((section, sIdx) => (
              <div key={section.id} className="rounded-none border border-stone-200 bg-[#faf9f6] hover:bg-white transition-all duration-500 group" style={{ animationDelay: `${sIdx * 0.1}s` }}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 flex items-center justify-center text-emerald-900 transition-transform`}>
                      {React.cloneElement(section.icon as React.ReactElement, { className: "w-5 h-5", strokeWidth: 2 })}
                    </div>
                    <div className="text-left">
                      <p className="text-base font-serif font-bold text-[color:var(--text-primary)]">{section.title}</p>
                      <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{section.items.length} Nodes</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="p-2 text-stone-400 hover:text-emerald-900 transition-all"
                  >
                    {expandedSections.has(section.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {expandedSections.has(section.id) && (
                  <div className="divide-y divide-[color:var(--bg-secondary)]">
                    {section.items.slice(0, 4).map((item, idx) => (
                      <div
                        key={idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => onItemClick?.(item)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          onItemClick?.(item);
                        }}
                        className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-4 hover:bg-[color:var(--bg-primary)] transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[color:var(--bg-tertiary)] group-hover:bg-blue-400 transition-colors" />
                          <div className="text-sm font-medium text-[color:var(--text-primary)] leading-relaxed group-hover:text-[color:var(--text-primary)] transition-colors">
                            <CrossLinkedText
                              text={item.text}
                              entities={entityLibrary.entities}
                              onEntityClick={(name, type) => onEntityClick?.(name, type as any)}
                              onAskAI={(prompt) => onItemClick?.({ text: prompt, relevance: 'high' })}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.linkedEntity && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onEntityClick?.(item.linkedEntity, "company");
                              }}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono text-[color:var(--text-secondary)] bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] uppercase tracking-tighter hover:text-emerald-900 hover:border-emerald-900 transition-colors"
                            >
                              {item.linkedEntity}
                            </button>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getRelevanceIndicator(item.relevance)}`}>
                            {item.relevance === 'high' ? 'Priority' : item.relevance === 'medium' ? 'Watch' : 'FYI'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => onItemClick?.({ text: "Give me a quick brief for this morning", relevance: 'high', linkedEntity: 'morning brief' })}
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-secondary)]/50 px-4 py-3 text-xs font-bold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-primary)] hover:shadow-md transition-all active:translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-[color:var(--text-primary)]" />
              Strategic Brief
            </button>
            <button
              type="button"
              onClick={() => onItemClick?.({ text: "Prepare the full market report for me", relevance: 'medium', linkedEntity: 'market report' })}
              className="flex items-center justify-center gap-2 rounded-xl border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] px-4 py-3 text-xs font-bold text-[color:var(--text-primary)] hover:bg-[color:var(--bg-hover)]/50 hover:shadow-md transition-all active:translate-y-0.5"
            >
              <Newspaper className="w-4 h-4 text-[color:var(--text-primary)]" />
              Full Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
