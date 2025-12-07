import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Newspaper,
  Building2,
  RefreshCw
} from 'lucide-react';

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

  // Fetch real digest data from Convex
  // Query is in separate file (morningDigestQueries) due to Convex Node.js restrictions
  const digestData = useQuery(api.domains.ai.morningDigestQueries.getDigestData);
  const generateSummary = useAction(api.domains.ai.morningDigest.generateDigestSummary);

  // Transform feed items into digest sections
  const digestSections: DigestSection[] = useMemo(() => {
    if (!digestData) return [];

    const sections: DigestSection[] = [];
    
    // Safely access arrays with fallbacks
    const marketMovers = digestData.marketMovers ?? [];
    const watchlistRelevant = digestData.watchlistRelevant ?? [];
    const riskAlerts = digestData.riskAlerts ?? [];
    const trackedHashtags = digestData.trackedHashtags ?? [];

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

    return sections;
  }, [digestData]);

  // Generate AI summary when digest data loads
  useEffect(() => {
    if (digestData && !generatedSummary && !isLoading) {
      const marketMovers = digestData.marketMovers ?? [];
      const watchlistRelevant = digestData.watchlistRelevant ?? [];
      const riskAlerts = digestData.riskAlerts ?? [];
      const trackedHashtags = digestData.trackedHashtags ?? [];
      
      setIsLoading(true);
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
        .then(result => {
          setGeneratedSummary(result.summary);
        })
        .catch(err => {
          console.error('Failed to generate summary:', err);
          setGeneratedSummary('Check the feed for the latest updates on markets and your tracked topics.');
        })
        .finally(() => setIsLoading(false));
    }
  }, [digestData, generatedSummary, isLoading, generateSummary, userName]);

  // Fallback summary if AI generation fails
  const fullSummary = generatedSummary || 
    (digestData 
      ? `${(digestData.marketMovers ?? []).length} market updates and ${(digestData.watchlistRelevant ?? []).length} items matching your tracked topics. ${(digestData.riskAlerts ?? []).length > 0 ? `${(digestData.riskAlerts ?? []).length} risk alerts to monitor.` : ''}`
      : 'Loading your personalized morning briefing...');

  const handleRefresh = async () => {
    setIsLoading(true);
    setGeneratedSummary(null); // Reset to trigger regeneration
    try {
      await onRefresh?.();
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate last updated time
  const lastUpdatedText = digestData?.lastUpdated 
    ? `Updated ${Math.round((Date.now() - digestData.lastUpdated) / 60000)} min ago`
    : 'Loading...';

  const digestStats = useMemo(() => {
    const marketCount = digestData?.marketMovers?.length ?? 0;
    const topicCount = digestData?.watchlistRelevant?.length ?? 0;
    const alertCount = digestData?.riskAlerts?.length ?? 0;

    return [
      { id: 'markets', label: 'Markets', value: marketCount, sentiment: digestSections.find(s => s.id === 'markets')?.sentiment },
      { id: 'watchlist', label: 'Topics', value: topicCount, sentiment: digestSections.find(s => s.id === 'watchlist')?.sentiment },
      { id: 'alerts', label: 'Alerts', value: alertCount, sentiment: 'neutral' as const },
    ].filter(stat => stat.value > 0);
  }, [digestData, digestSections]);

  const primarySentiment = digestStats.find((stat) => stat.sentiment)?.sentiment || 'neutral';

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

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gray-900 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase text-gray-500">Morning Digest</p>
            <p className="text-sm font-semibold text-gray-900">Hi {userName}, here’s the overnight signal</p>
            <p className="text-[11px] text-gray-500">{lastUpdatedText}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {digestStats.length > 0 && (
            <div className="hidden md:flex items-center gap-1">
              {digestStats.map((stat) => (
                <span
                  key={stat.id}
                  className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                    stat.sentiment ? getSentimentColor(stat.sentiment) : 'bg-gray-50 border border-gray-200 text-gray-700'
                  }`}
                >
                  {stat.label}: {stat.value}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title="Refresh digest"
            aria-label="Refresh digest"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            title={isExpanded ? 'Collapse digest' : 'Expand digest'}
            aria-label={isExpanded ? 'Collapse digest' : 'Expand digest'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-start gap-2">
              <span
                className={`mt-1 h-2 w-2 rounded-full ${
                  primarySentiment === 'bullish'
                    ? 'bg-green-500'
                    : primarySentiment === 'bearish'
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                }`}
              />
              <p className="text-sm text-gray-800 leading-relaxed">{fullSummary}</p>
            </div>
          </div>

          <div className="space-y-2">
            {digestSections.length === 0 && !digestData ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading digest...
              </div>
            ) : digestSections.map((section) => (
              <div key={section.id} className="rounded-lg border border-gray-100 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-9 w-9 rounded-md flex items-center justify-center ${getSentimentColor(section.sentiment)}`}>
                      {section.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                      <p className="text-[11px] text-gray-500">{section.items.length} updates</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${getSentimentColor(section.sentiment)}`}>
                      {section.sentiment}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      aria-label={expandedSections.has(section.id) ? 'Collapse section' : 'Expand section'}
                    >
                      {expandedSections.has(section.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {expandedSections.has(section.id) && (
                  <div className="divide-y divide-gray-100">
                    {section.items.slice(0, 4).map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onItemClick?.(item)}
                        className="w-full text-left px-3 py-2.5 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-gray-300" />
                          <span className="text-sm text-gray-800 leading-relaxed">{item.text}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {item.linkedEntity && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono text-gray-700 bg-gray-100 border border-gray-200">
                              ${item.linkedEntity}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${getRelevanceIndicator(item.relevance)}`}>
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

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onItemClick?.({ text: "Give me a quick brief for this morning", relevance: 'high', linkedEntity: 'morning brief' })}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-white transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-gray-700" />
              Quick brief
            </button>
            <button
              type="button"
              onClick={() => onItemClick?.({ text: "Prepare the full market report for me", relevance: 'medium', linkedEntity: 'market report' })}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <Newspaper className="w-3.5 h-3.5 text-gray-700" />
              Full report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
