import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Newspaper,
  Building2,
  RefreshCw,
  Zap,
  Target,
  Activity,
  BarChart3,
  Globe2,
  ArrowUpRight,
  Clock,
  Shield,
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

  // Fetch live feed items for accurate source counts
  const liveFeed = useQuery(api.feed.get, { limit: 100 });

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
    const addSource = (source?: string) => {
      const key = source || 'Unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    };
    // Use live feed data for accurate source counts
    if (liveFeed?.length) {
      liveFeed.forEach((item: any) => addSource(item.source));
    } else {
      // Fallback to digest data if live feed not loaded
      const dataToUse = isUsingSampleData ? sampleDigestData : digestData;
      (dataToUse?.marketMovers ?? []).forEach((item) => addSource(item.source));
      (dataToUse?.watchlistRelevant ?? []).forEach((item) => addSource(item.source));
      (dataToUse?.riskAlerts ?? []).forEach((item) => addSource(item.source));
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Show more sources
  }, [liveFeed, digestData, isUsingSampleData, sampleDigestData]);

  const totalSourceCount = topSources.reduce((sum, s) => sum + s.count, 0);
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
    <div className="relative rounded-2xl border border-stone-200 dark:border-stone-700 bg-gradient-to-br from-[#faf9f6] via-[#faf9f6] to-stone-100/50 dark:from-stone-900 dark:via-stone-900 dark:to-stone-800/50 backdrop-blur-xl shadow-xl shadow-stone-900/5 dark:shadow-black/30 overflow-hidden">
      {/* Elegant gradient accent bar - warm black/amber */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-stone-800 via-amber-700 to-stone-600 opacity-90" />

      {/* Premium glass header */}
      <div className="relative flex items-center justify-between px-6 py-6 border-b border-stone-200/50 dark:border-stone-700/50 bg-gradient-to-r from-transparent via-stone-100/30 dark:via-stone-800/30 to-transparent">
        <div className="flex items-center gap-5">
          {/* Animated icon container - black/beige */}
          <div className="relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-stone-700 to-stone-900 blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            <div className="relative h-14 w-14 rounded-2xl bg-gradient-to-br from-stone-800 to-stone-950 text-amber-100 flex items-center justify-center shadow-lg shadow-stone-900/25 transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-stone-900/30">
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-600 dark:text-stone-400">Executive Synthesis</p>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <Activity className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                <span className="text-[9px] font-semibold text-amber-700 dark:text-amber-400">LIVE</span>
              </span>
            </div>
            <p className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 leading-tight tracking-tight">
              Good morning, <span className="text-stone-700 dark:text-amber-200">{userName}</span>
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Clock className="w-3 h-3 text-stone-400" />
              <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400">{lastUpdatedText}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {digestStats.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              {digestStats.map((stat, idx) => (
                <div
                  key={stat.id}
                  className={`group relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 cursor-default ${
                    stat.sentiment === 'bullish'
                      ? 'bg-gradient-to-r from-stone-100 to-amber-50 dark:from-stone-800 dark:to-amber-900/20 border border-amber-300/50 dark:border-amber-600/30 hover:border-amber-400'
                      : stat.sentiment === 'bearish'
                      ? 'bg-gradient-to-r from-stone-100 to-rose-50 dark:from-stone-800 dark:to-rose-900/20 border border-rose-300/50 dark:border-rose-600/30 hover:border-rose-400'
                      : 'bg-stone-100/50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 hover:border-stone-400'
                  }`}
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <span className={`text-lg font-bold ${
                    stat.sentiment === 'bullish' ? 'text-amber-700 dark:text-amber-400'
                    : stat.sentiment === 'bearish' ? 'text-rose-700 dark:text-rose-400'
                    : 'text-stone-800 dark:text-stone-200'
                  }`}>
                    {stat.value}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 ml-3 pl-4 border-l border-stone-200/50 dark:border-stone-700/50">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-all duration-200 active:scale-95"
              title="Refresh digest"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-all duration-200 active:scale-95"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Executive Summary - Premium glassmorphism card */}
          <div className="relative mt-4 rounded-2xl border border-stone-200 dark:border-stone-700 bg-gradient-to-br from-[#faf9f6] to-stone-100/50 dark:from-stone-900 dark:to-stone-800/50 p-5 shadow-lg shadow-stone-900/5 dark:shadow-black/20 overflow-hidden">
            {/* Decorative gradient orb - warm beige/amber */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-amber-200/30 to-stone-300/20 dark:from-amber-900/20 dark:to-stone-700/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-stone-200/50 to-amber-100/30 dark:from-stone-700/50 dark:to-amber-900/20 border border-stone-300/50 dark:border-stone-600/50">
                    <BarChart3 className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">AI Intelligence Brief</span>
                    <p className="text-[9px] text-stone-500 dark:text-stone-500 mt-0.5">Synthesized from {digestTotals.sourceCount} sources</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-100/50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
                  <Shield className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="text-[9px] font-medium text-stone-600 dark:text-stone-400">Verified</span>
                </div>
              </div>
              <div className="text-[15px] font-serif text-stone-800 dark:text-stone-200 leading-relaxed tracking-[-0.01em]">
                <InteractiveSpanParser
                  text={fullSummary}
                  citations={citationLibrary}
                  entities={entityLibrary}
                  entityEnrichment={entityEnrichment}
                  onCitationClick={(citation) => onItemClick?.({ text: `Tell me more about: ${citation.fullText}`, relevance: 'high' })}
                  onEntityClick={(entity) => onItemClick?.({ text: `Deep dive on ${entity.name}`, relevance: 'high', linkedEntity: entity.name })}
                />
              </div>
            </div>
          </div>

          {/* At-a-glance Stats - Enhanced with warm gradients */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {densityStats.slice(0, 4).map((stat, idx) => (
              <div
                key={stat.label}
                className="group relative rounded-xl border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 hover:bg-gradient-to-br hover:from-[#faf9f6] hover:to-stone-100/50 dark:hover:from-stone-900 dark:hover:to-stone-800/50 px-4 py-3 transition-all duration-300 hover:shadow-lg hover:shadow-stone-900/5 hover:scale-[1.02] hover:border-stone-400/50 dark:hover:border-stone-600 cursor-default"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-stone-800 dark:text-stone-100 leading-none">{stat.value}</span>
                  {stat.value > 0 && (
                    <ArrowUpRight className="w-3 h-3 text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <div className="mt-1.5 text-[10px] font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-widest">{stat.label}</div>
                <div className="mt-0.5 text-[9px] text-stone-500 dark:text-stone-500">{stat.hint}</div>
              </div>
            ))}
          </div>

          {/* Two-column compact layout - Enhanced */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Signals + Sources */}
            <div className="space-y-4">
              {/* Top Signals - Premium card */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-100/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30">
                      <Zap className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">Top Signals</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500">{signalHighlights.length} items</span>
                </div>
                <div className="space-y-2">
                  {signalHighlights.slice(0, 3).map((item, idx) => (
                    <div
                      key={`${item.label}-${idx}`}
                      className="group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-stone-200 dark:hover:border-stone-700 hover:bg-stone-100/50 dark:hover:bg-stone-800/50 transition-all duration-200"
                    >
                      <button
                        type="button"
                        onClick={() => onItemClick?.({ text: item.text, relevance: 'high', linkedEntity: item.linkedEntity })}
                        className="flex items-start gap-3 flex-1 text-left"
                      >
                        <span className={`shrink-0 px-2 py-1 text-[9px] font-bold uppercase tracking-wide rounded-md ${
                          item.label === 'Market' ? 'bg-stone-200/50 dark:bg-stone-700/50 text-stone-700 dark:text-stone-300 border border-stone-300/50 dark:border-stone-600/50'
                          : item.label === 'Risk' ? 'bg-rose-100/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-700/30'
                          : 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-700/30'
                        }`}>
                          {item.label}
                        </span>
                        <span className="text-sm text-stone-700 dark:text-stone-300 leading-snug line-clamp-2 group-hover:text-stone-900 dark:group-hover:text-stone-100 transition-colors">{item.text}</span>
                      </button>
                      {item.linkedEntity && (
                        <button
                          type="button"
                          onClick={() => onEntityClick?.(item.linkedEntity, "company")}
                          className="shrink-0 px-2 py-1 text-[9px] font-mono font-medium text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 bg-stone-100 dark:bg-stone-800 rounded-md border border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-all"
                          title={`Open entity: ${item.linkedEntity}`}
                        >
                          {item.linkedEntity}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sources - Enhanced with visual bars */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-stone-200/50 dark:bg-stone-700/50 border border-stone-300/50 dark:border-stone-600/50">
                      <Globe2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">Sources</span>
                  </div>
                  <span className="text-[10px] text-stone-500">{totalSourceCount} items</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topSources.slice(0, 6).map((source, idx) => (
                    <div
                      key={source.name}
                      className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-100/50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-all duration-200"
                    >
                      {/* Visual bar indicator - warm amber */}
                      <div
                        className="absolute left-0 bottom-0 h-0.5 bg-gradient-to-r from-stone-600 to-amber-600 rounded-b-lg transition-all duration-300"
                        style={{ width: `${(source.count / maxSourceCount) * 100}%` }}
                      />
                      <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300">{source.name}</span>
                      <span className="text-[10px] font-bold text-stone-800 dark:text-stone-200">{source.count}</span>
                    </div>
                  ))}
                  {topSources.length > 6 && (
                    <span className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-stone-100/30 dark:bg-stone-800/30 text-[10px] text-stone-500">
                      +{topSources.length - 6} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Tags + Entities + Actions */}
            <div className="space-y-4">
              {/* Tags - Enhanced with hover effects */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-stone-200/50 dark:bg-stone-700/50 border border-stone-300/50 dark:border-stone-600/50">
                      <TrendingUp className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">Trending</span>
                  </div>
                  <span className="text-[10px] text-stone-500">{digestItems.length} signals</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tagRadar.slice(0, 6).map((tag, idx) => (
                    <button
                      key={tag.tag}
                      type="button"
                      onClick={() => onItemClick?.({ text: `Track #${tag.tag} and summarize the latest movement.`, relevance: 'medium', linkedEntity: tag.tag })}
                      className="group px-3 py-1.5 text-[11px] font-medium border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all duration-200"
                    >
                      <span className="text-amber-700 dark:text-amber-400">#</span>{tag.tag}
                      <span className="ml-1.5 text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-400">({tag.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Entities - Enhanced with better visual treatment */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 p-4 shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-stone-200/50 dark:bg-stone-700/50 border border-stone-300/50 dark:border-stone-600/50">
                    <Building2 className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">Key Entities</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {topEntities.slice(0, 6).map((entity, idx) => (
                    <button
                      key={entity}
                      type="button"
                      onClick={() => onEntityClick?.(entity, "company")}
                      className="group px-3 py-1.5 text-[11px] font-semibold border border-stone-200 dark:border-stone-700 bg-gradient-to-br from-[#faf9f6] to-stone-100/50 dark:from-stone-900 dark:to-stone-800/50 text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded-lg transition-all duration-200 hover:shadow-sm"
                    >
                      {entity}
                      <ArrowUpRight className="inline-block ml-1 w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Shortcuts - Premium CTA buttons */}
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-gradient-to-br from-[#faf9f6] to-amber-50/30 dark:from-stone-900 dark:to-amber-900/10 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-stone-800/10 dark:bg-stone-200/10 border border-stone-300/50 dark:border-stone-600/50">
                    <Zap className="w-3.5 h-3.5 text-stone-700 dark:text-stone-300" />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400">Quick Actions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {agentLaunchpad.slice(0, 3).map((item, idx) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => onItemClick?.({ text: item.prompt, relevance: 'high' })}
                      className="group flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border border-stone-300 dark:border-stone-600 bg-gradient-to-r from-stone-100 to-amber-50/50 dark:from-stone-800 dark:to-amber-900/20 text-stone-700 dark:text-stone-300 hover:from-stone-200 hover:to-amber-100/50 dark:hover:from-stone-700 dark:hover:to-amber-800/30 hover:border-stone-400 dark:hover:border-stone-500 rounded-lg transition-all duration-200"
                    >
                      <Sparkles className="w-3 h-3" />
                      {item.label.replace('Deep agent: ', '')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sample Data Banner - Enhanced */}
          {isUsingSampleData && digestSections.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-stone-100 to-amber-50/50 dark:from-stone-800 dark:to-amber-900/20 border border-stone-200 dark:border-stone-700 rounded-xl flex items-center gap-4">
              <div className="p-2 rounded-lg bg-stone-200/50 dark:bg-stone-700/50">
                <Sparkles className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">Sample Intelligence Feed</p>
                <p className="text-xs text-stone-500 dark:text-stone-500 mt-0.5">Connect data sources or track hashtags to see real-time signals.</p>
              </div>
            </div>
          )}

          {/* Digest Sections Grid - Premium cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {digestSections.map((section, sectionIdx) => (
              <div
                key={section.id}
                className="group rounded-xl border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 hover:shadow-lg hover:shadow-stone-900/5 dark:hover:shadow-black/20 transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${sectionIdx * 100}ms` }}
              >
                {/* Section Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200/50 dark:border-stone-700/50 bg-gradient-to-r from-transparent via-stone-100/30 dark:via-stone-800/30 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      section.sentiment === 'bullish' ? 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-700/30'
                      : section.sentiment === 'bearish' ? 'bg-rose-100/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-700/30'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-200 dark:border-stone-700'
                    }`}>
                      {React.cloneElement(section.icon as React.ReactElement, { className: "w-5 h-5", strokeWidth: 2 })}
                    </div>
                    <div className="text-left">
                      <p className="text-base font-serif font-bold text-stone-800 dark:text-stone-200">{section.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-widest">{section.items.length} signals</span>
                        {section.sentiment !== 'neutral' && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${
                            section.sentiment === 'bullish' ? 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100/50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                          }`}>
                            {section.sentiment}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="p-2.5 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-all duration-200"
                  >
                    {expandedSections.has(section.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Section Items */}
                {expandedSections.has(section.id) && (
                  <div className="divide-y divide-stone-200/50 dark:divide-stone-700/50">
                    {section.items.slice(0, 4).map((item, idx) => (
                      <div
                        key={idx}
                        className="group/item px-5 py-4 flex items-start justify-between gap-4 hover:bg-stone-100/50 dark:hover:bg-stone-800/50 transition-all duration-200"
                      >
                        <div
                          onClick={() => onItemClick?.(item)}
                          className="flex items-start gap-3 flex-1 cursor-pointer"
                        >
                          <span className={`mt-2 h-2 w-2 rounded-full transition-all duration-300 ${
                            item.relevance === 'high' ? 'bg-stone-700 dark:bg-stone-300 shadow-sm shadow-stone-500/50'
                            : item.relevance === 'medium' ? 'bg-amber-600 dark:bg-amber-400 shadow-sm shadow-amber-500/50'
                            : 'bg-stone-400 dark:bg-stone-600'
                          } group-hover/item:scale-125`} />
                          <div className="text-sm font-medium text-stone-700 dark:text-stone-300 leading-relaxed group-hover/item:text-stone-900 dark:group-hover/item:text-stone-100 transition-colors">
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
                              onClick={() => onEntityClick?.(item.linkedEntity, "company")}
                              className="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-bold font-mono text-stone-500 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 uppercase tracking-tight hover:text-stone-800 dark:hover:text-stone-200 hover:border-stone-400 dark:hover:border-stone-500 transition-all"
                              title={`Open entity: ${item.linkedEntity}`}
                            >
                              {item.linkedEntity}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onItemClick?.(item)}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 hover:bg-stone-200/50 dark:hover:bg-stone-700/50 transition-all"
                            title="Open signal"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide ${
                            item.relevance === 'high' ? 'bg-stone-200/50 dark:bg-stone-700/50 text-stone-700 dark:text-stone-300 border border-stone-300/50 dark:border-stone-600/50'
                            : item.relevance === 'medium' ? 'bg-amber-100/50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-700/30'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border border-stone-200 dark:border-stone-700'
                          }`}>
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

          {/* Action Buttons - Premium CTAs */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={() => onItemClick?.({ text: "Give me a quick brief for this morning", relevance: 'high', linkedEntity: 'morning brief' })}
              className="group relative flex items-center justify-center gap-3 rounded-xl border border-stone-300 dark:border-stone-600 bg-gradient-to-r from-stone-800 to-stone-900 dark:from-stone-700 dark:to-stone-800 px-5 py-4 text-sm font-bold text-[#faf9f6] hover:from-stone-700 hover:to-stone-800 dark:hover:from-stone-600 dark:hover:to-stone-700 hover:shadow-lg hover:shadow-stone-900/20 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/0 via-amber-400/10 to-amber-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Sparkles className="w-5 h-5" />
              <span>Strategic Brief</span>
            </button>
            <button
              type="button"
              onClick={() => onItemClick?.({ text: "Prepare the full market report for me", relevance: 'medium', linkedEntity: 'market report' })}
              className="group relative flex items-center justify-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-[#faf9f6] dark:bg-stone-900 px-5 py-4 text-sm font-bold text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:shadow-lg hover:shadow-stone-900/5 transition-all duration-300 active:scale-[0.98] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-stone-400/0 via-stone-400/10 to-stone-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <Newspaper className="w-5 h-5" />
              <span>Full Dossier</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
