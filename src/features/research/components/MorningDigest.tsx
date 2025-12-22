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
  // Look for common patterns like "AAPL", "NVDA", company names
  const tickerMatch = text.match(/\b([A-Z]{2,5})\b/);
  if (tickerMatch) return tickerMatch[1];

  // Look for company names
  const companies = ['Apple', 'Google', 'Microsoft', 'NVIDIA', 'Amazon', 'Meta', 'Tesla', 'OpenAI', 'Anthropic'];
  for (const company of companies) {
    if (text.includes(company)) return company;
  }
  return undefined;
}

export const MorningDigest: React.FC<MorningDigestProps> = ({
  userName = 'there',
  onItemClick,
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
    const marketCount = digestData?.marketMovers?.length ?? 0;
    const topicCount = digestData?.watchlistRelevant?.length ?? 0;
    const alertCount = digestData?.riskAlerts?.length ?? 0;

    return [
      { id: 'markets', label: 'Markets', value: marketCount, sentiment: digestSections.find(s => s.id === 'markets')?.sentiment },
      { id: 'watchlist', label: 'Topics', value: topicCount, sentiment: digestSections.find(s => s.id === 'watchlist')?.sentiment },
      { id: 'alerts', label: 'Alerts', value: alertCount, sentiment: 'neutral' as const },
      { id: 'personal', label: 'Priority', value: (digestSections.find(s => s.id === 'personal')?.items.length ?? 0), sentiment: 'neutral' as const },
    ].filter(stat => stat.value > 0);
  }, [digestData, digestSections]);

  const primarySentiment = digestStats.find((stat) => stat.sentiment)?.sentiment || 'neutral';

  const digestTotals = useMemo(() => {
    const marketCount = digestData?.marketMovers?.length ?? 0;
    const topicCount = digestData?.watchlistRelevant?.length ?? 0;
    const alertCount = digestData?.riskAlerts?.length ?? 0;
    const priorityCount = digestSections.find((section) => section.id === 'personal')?.items.length ?? 0;
    const trackedCount = digestData?.trackedHashtags?.length ?? 0;
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
  }, [citationLibrary.order.length, digestData, digestSections, entityLibrary.entities]);

  const topEntities = useMemo(() => {
    return Object.values(entityLibrary.entities || {})
      .map((entity) => entity.name)
      .slice(0, 6);
  }, [entityLibrary.entities]);

  const signalHighlights = useMemo(() => {
    const highlights: Array<{ label: string; text: string; linkedEntity?: string }> = [];
    (digestData?.marketMovers ?? []).slice(0, 2).forEach((item) => {
      highlights.push({ label: 'Market', text: item.title, linkedEntity: extractEntity(item.title) });
    });
    (digestData?.watchlistRelevant ?? []).slice(0, 2).forEach((item) => {
      highlights.push({ label: 'Topic', text: item.title, linkedEntity: extractEntity(item.title) });
    });
    (digestData?.riskAlerts ?? []).slice(0, 1).forEach((item) => {
      highlights.push({ label: 'Risk', text: item.title, linkedEntity: extractEntity(item.title) });
    });
    return highlights;
  }, [digestData]);

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
    (digestData?.marketMovers ?? []).forEach((item) => addSource(item.source));
    (digestData?.watchlistRelevant ?? []).forEach((item) => addSource(item.source));
    (digestData?.riskAlerts ?? []).forEach((item) => addSource(item.source));
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [digestData]);

  const maxSourceCount = topSources[0]?.count ?? 1;

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
      default: return 'bg-gray-50 text-gray-700 border border-gray-100';
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
    <div className="rounded-2xl border border-gray-100 bg-white/40 backdrop-blur-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-50/50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg transform -rotate-1 transition-transform hover:rotate-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-0.5">Overnight Signal</p>
            <p className="text-2xl font-serif font-bold text-gray-900 leading-tight">Hi {userName}, here’s the pulse.</p>
            <p className="text-[11px] font-medium text-gray-400 mt-0.5">{lastUpdatedText}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {digestStats.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              {digestStats.map((stat) => (
                <span
                  key={stat.id}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${stat.sentiment ? getSentimentColor(stat.sentiment) : 'bg-gray-50/50 border border-gray-100 text-gray-500'
                    }`}
                >
                  {stat.label}: {stat.value}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1.5 ml-2 pl-4 border-l border-gray-100">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100/50 transition-all active:scale-95"
              title="Refresh digest"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100/50 transition-all active:scale-95"
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
                  Executive Synthesis
                </p>
                <div className="text-xl font-serif font-medium text-gray-900 leading-relaxed italic">
                  "<InteractiveSpanParser
                    text={fullSummary}
                    citations={citationLibrary}
                    entities={entityLibrary}
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
                <p className="text-base font-serif font-bold text-gray-900">Coverage density</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {densityStats.map((stat) => (
                  <div key={stat.label} className="rounded-md border border-stone-100 bg-[#faf9f6] p-3">
                    <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{stat.label}</div>
                    <div className="text-2xl font-serif font-semibold text-gray-900">{stat.value}</div>
                    <div className="text-[10px] text-stone-400">{stat.hint}</div>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Topic focus</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(digestData?.trackedHashtags ?? []).length > 0 ? (
                    digestData?.trackedHashtags?.slice(0, 6).map((tag) => (
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
              </div>
              <div>
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Entities detected</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topEntities.length > 0 ? (
                    topEntities.map((entity) => (
                      <span
                        key={entity}
                        className="px-2 py-1 text-[10px] font-semibold border border-stone-200 bg-[#faf9f6] text-stone-600"
                      >
                        {entity}
                      </span>
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
                <p className="text-base font-serif font-bold text-gray-900">What moved overnight</p>
              </div>
              <div className="space-y-3">
                {signalHighlights.length > 0 ? (
                  signalHighlights.map((item, idx) => (
                    <button
                      key={`${item.label}-${idx}`}
                      type="button"
                      onClick={() => onItemClick?.({ text: item.text, relevance: 'high', linkedEntity: item.linkedEntity })}
                      className="w-full text-left rounded-md border border-stone-100 bg-[#faf9f6] px-4 py-3 hover:bg-white transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-900">{item.label}</span>
                        {item.linkedEntity && (
                          <span className="text-[10px] font-mono text-stone-400 uppercase tracking-tight">
                            {item.linkedEntity}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700 mt-2">{item.text}</div>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-stone-400">No highlights available yet.</div>
                )}
              </div>
            </div>

            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Source Mix</p>
                <p className="text-base font-serif font-bold text-gray-900">Where the signals came from</p>
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
            <div className="rounded-none border border-stone-200 bg-white/70 p-5 space-y-4 xl:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Signal Ledger</p>
                  <p className="text-base font-serif font-bold text-gray-900">Section density</p>
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
                      <div className="text-sm font-semibold text-gray-800">{row.title}</div>
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
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest bg-gray-50 text-gray-700 border border-gray-100">
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
                <p className="text-base font-serif font-bold text-gray-900">Runbook shortcuts</p>
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
                <span className="font-medium">Sample Intelligence Feed</span> — Connect data sources or track hashtags to see real-time signals.
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
                      <p className="text-base font-serif font-bold text-gray-900">{section.title}</p>
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
                  <div className="divide-y divide-gray-50">
                    {section.items.slice(0, 4).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onItemClick?.(item)}
                        className="w-full text-left px-4 py-3.5 flex items-start justify-between gap-4 hover:bg-white transition-colors group"
                      >
                        <div className="flex items-start gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-200 group-hover:bg-blue-400 transition-colors" />
                          <div className="text-sm font-medium text-gray-700 leading-relaxed group-hover:text-gray-900 transition-colors">
                            <CrossLinkedText text={item.text} onAskAI={(prompt) => onItemClick?.({ text: prompt, relevance: 'high' })} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.linkedEntity && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono text-gray-500 bg-gray-50 border border-gray-100 uppercase tracking-tighter">
                              {item.linkedEntity}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getRelevanceIndicator(item.relevance)}`}>
                            {item.relevance === 'high' ? 'Priority' : item.relevance === 'medium' ? 'Watch' : 'FYI'}
                          </span>
                        </div>
                      </button>
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
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50/50 px-4 py-3 text-xs font-bold text-gray-800 hover:bg-white hover:shadow-md transition-all active:translate-y-0.5"
            >
              <Sparkles className="w-4 h-4 text-gray-700" />
              Strategic Brief
            </button>
            <button
              type="button"
              onClick={() => onItemClick?.({ text: "Prepare the full market report for me", relevance: 'medium', linkedEntity: 'market report' })}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/50 hover:shadow-md transition-all active:translate-y-0.5"
            >
              <Newspaper className="w-4 h-4 text-gray-700" />
              Full Dossier
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
