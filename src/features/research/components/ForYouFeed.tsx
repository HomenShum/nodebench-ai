/**
 * For You Feed Component
 * Pinterest-style masonry board with date grouping for performance
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Bookmark,
  Share2,
  ExternalLink,
  Globe,
  Heart,
  Sparkles,
  Zap,
  Clock,
  TrendingUp,
  Linkedin,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// Virtualization: Only render items in viewport + buffer
const ITEMS_PER_PAGE = 20;
const SCROLL_BUFFER = 5;

export function ForYouFeed() {
  const authFeed = useQuery(api.domains.research.forYouFeed.getForYouFeed, { limit: 50 });
  const publicFeed = useQuery(api.domains.research.forYouFeed.getPublicForYouFeed, { limit: 50 });
  const recordEngagement = useMutation(api.domains.research.forYouFeed.recordEngagement);

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const isPublicMode = !authFeed?.items?.length && publicFeed?.items?.length;
  const displayFeed = authFeed?.items?.length ? authFeed : publicFeed;

  // Use dateGroups from feed, or create from items if not available
  const dateGroups = useMemo(() => {
    if (displayFeed?.dateGroups?.length) {
      return displayFeed.dateGroups;
    }
    // Fallback: group items by date
    if (!displayFeed?.items?.length) return [];

    const groups = new Map<string, any[]>();
    for (const item of displayFeed.items) {
      const dateStr = item.dateString || new Date(item.timestamp).toISOString().split("T")[0];
      if (!groups.has(dateStr)) {
        groups.set(dateStr, []);
      }
      groups.get(dateStr)!.push(item);
    }

    const sortedDates = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
    return sortedDates.map(dateStr => ({
      dateString: dateStr,
      displayLabel: formatDateLabel(dateStr),
      items: groups.get(dateStr)!,
    }));
  }, [displayFeed]);

  const handleEngagement = async (itemId: string, action: "view" | "click" | "save" | "share") => {
    try {
      await recordEngagement({ itemId, action });
    } catch (error) {
      console.debug("Engagement tracking requires authentication");
    }
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    if (scrollHeight - scrollTop - clientHeight < 500) {
      setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, displayFeed?.items?.length || 0));
    }
  }, [displayFeed?.items?.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const toggleDateCollapse = (dateString: string) => {
    setCollapsedDates(prev => {
      const next = new Set(prev);
      if (next.has(dateString)) {
        next.delete(dateString);
      } else {
        next.add(dateString);
      }
      return next;
    });
  };

  if (!displayFeed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your feed...</p>
        </div>
      </div>
    );
  }

  if (!displayFeed.items?.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm mx-auto px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No pins yet</h2>
          <p className="text-gray-500 text-sm">Check back soon for trending content and personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isPublicMode ? 'bg-orange-100' : 'bg-red-100'}`}>
                {isPublicMode ? (
                  <Globe className="w-5 h-5 text-orange-600" />
                ) : (
                  <Sparkles className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {isPublicMode ? "Explore" : "For You"}
                </h1>
                <p className="text-xs text-gray-500">
                  {isPublicMode
                    ? `${dateGroups.length} days of content • Sign in to personalize`
                    : `${Math.round(displayFeed.mixRatio.outOfNetwork * 100)}% new discoveries`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                <span>{dateGroups.length} days</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(displayFeed.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed with Date Sections */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {dateGroups.map((group) => {
          const isCollapsed = collapsedDates.has(group.dateString);

          return (
            <div key={group.dateString} className="mb-8">
              {/* Date Header */}
              <button
                type="button"
                onClick={() => toggleDateCollapse(group.dateString)}
                className="w-full flex items-center justify-between px-4 py-3 mb-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-base font-bold text-gray-900">{group.displayLabel}</h2>
                    <p className="text-xs text-gray-500">{group.items.length} items • {group.dateString}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Quick stats */}
                  <div className="hidden sm:flex items-center gap-3 mr-4">
                    {countByKind(group.items, 'linkedin_funding') > 0 && (
                      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                        <Linkedin className="w-3 h-3" />
                        {countByKind(group.items, 'linkedin_funding')}
                      </span>
                    )}
                    {countByKind(group.items, 'daily_brief') > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        {countByKind(group.items, 'daily_brief')}
                      </span>
                    )}
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                  )}
                </div>
              </button>

              {/* Cards Grid */}
              {!isCollapsed && (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
                  {group.items.map((item: any) => (
                    <PinCard
                      key={item.itemId}
                      item={item}
                      onEngagement={handleEngagement}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* End of Feed */}
        <div className="py-10 text-center">
          <p className="text-gray-400 text-sm">You've explored all {dateGroups.length} days!</p>
          <p className="text-gray-300 text-xs mt-1">
            Curated from {displayFeed.totalCandidates} sources
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper to count items by kind
function countByKind(items: any[], kind: string): number {
  return items.filter(item => item.metadata?.kind === kind).length;
}

// Format date label
function formatDateLabel(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) {
    return "Today";
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
}

interface PinCardProps {
  item: any;
  onEngagement: (itemId: string, action: "view" | "click" | "save" | "share") => void;
}

function PinCard({ item, onEngagement }: PinCardProps) {
  const [saved, setSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Source-based styling
  const getCardStyle = () => {
    const kind = item.metadata?.kind;
    if (kind === 'linkedin_funding') {
      return { gradient: "from-blue-100 via-blue-50 to-indigo-100", icon: Linkedin, iconColor: "text-blue-600", label: "LinkedIn" };
    }
    if (kind === 'daily_brief' || kind === 'daily_snapshot') {
      return { gradient: "from-amber-100 via-yellow-50 to-orange-100", icon: Sparkles, iconColor: "text-amber-600", label: "AI Brief" };
    }

    const source = item.source;
    if (source === 'in_network') {
      return { gradient: "from-green-100 via-emerald-50 to-teal-100", icon: Heart, iconColor: "text-green-600", label: "Following" };
    }
    if (source === 'trending') {
      return { gradient: "from-red-100 via-rose-50 to-pink-100", icon: Zap, iconColor: "text-red-600", label: "Trending" };
    }
    return { gradient: "from-purple-100 via-pink-50 to-rose-100", icon: TrendingUp, iconColor: "text-purple-600", label: "Discover" };
  };

  const style = getCardStyle();
  const CardIcon = style.icon;

  // Card height based on content
  const getCardHeight = () => {
    const snippetLength = item.snippet?.length || 0;
    if (snippetLength > 200) return "h-64";
    if (snippetLength > 100) return "h-52";
    return "h-40";
  };

  // Extract domain
  const getDomain = (url?: string) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const domain = getDomain(item.metadata?.url);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSaved(!saved);
    onEngagement(item.itemId, "save");
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEngagement(item.itemId, "share");
    if (item.metadata?.url) {
      navigator.clipboard.writeText(item.metadata.url);
    }
  };

  const handleOpen = () => {
    onEngagement(item.itemId, "view");
    if (item.metadata?.url) {
      window.open(item.metadata.url, '_blank');
    }
  };

  return (
    <div
      className="break-inside-avoid mb-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <article
        onClick={handleOpen}
        className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-gray-200"
      >
        {/* Header with gradient */}
        <div className={`relative ${getCardHeight()} bg-gradient-to-br ${style.gradient}`}>
          {/* Source Badge */}
          <div className="absolute top-3 left-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm">
              <CardIcon className={`w-3.5 h-3.5 ${style.iconColor}`} />
              <span className="text-xs font-medium text-gray-700">{style.label}</span>
            </div>
          </div>

          {/* LinkedIn Amount Badge */}
          {item.metadata?.kind === 'linkedin_funding' && item.metadata?.amount && (
            <div className="absolute top-3 right-3">
              <div className="px-2.5 py-1 rounded-full bg-green-500/90 backdrop-blur-sm shadow-sm">
                <span className="text-xs font-bold text-white">{item.metadata.amount}</span>
              </div>
            </div>
          )}

          {/* AI Badge */}
          {(item.metadata?.kind === 'daily_brief' || item.metadata?.kind === 'daily_snapshot') && (
            <div className="absolute top-3 right-3">
              <div className="px-2 py-1 rounded-full bg-amber-400/90 backdrop-blur-sm shadow-sm">
                <span className="text-[10px] font-bold text-white">AI</span>
              </div>
            </div>
          )}

          {/* Hover Actions */}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              type="button"
              title={saved ? "Unsave" : "Save"}
              aria-label={saved ? "Unsave" : "Save"}
              onClick={handleSave}
              className={`p-3 rounded-full transition-all ${
                saved ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-red-500 hover:text-white'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              title="Share"
              aria-label="Share"
              onClick={handleShare}
              className="p-3 rounded-full bg-white text-gray-700 hover:bg-gray-100 transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          {/* Watermark emoji */}
          <div className="absolute bottom-4 right-4 opacity-20">
            <span className="text-5xl">{getSourceEmoji(item.metadata?.kind, item.metadata?.source)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
            {item.title}
          </h3>

          {item.snippet && (
            <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 mb-3">
              {cleanSnippet(item.snippet)}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-gray-400">
              {domain ? (
                <>
                  <ExternalLink className="w-3 h-3" />
                  <span className="text-[11px] truncate max-w-[100px]">{domain}</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-3 h-3" />
                  <span className="text-[11px]">{item.metadata?.source || 'Feed'}</span>
                </>
              )}
            </div>
            <span className="text-[11px] text-gray-400">
              {formatTimeAgo(item.timestamp)}
            </span>
          </div>

          {/* Sector tag for LinkedIn */}
          {item.metadata?.sector && (
            <div className="mt-2">
              <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {item.metadata.sector}
              </span>
            </div>
          )}

          {/* Phoenix Score */}
          {item.phoenixScore && item.phoenixScore > 60 && (
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-full bg-gray-100 rounded-full h-1">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-1 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(item.phoenixScore, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-emerald-600 whitespace-nowrap">{item.phoenixScore}%</span>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

// Helper functions
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function cleanSnippet(snippet: string): string {
  if (snippet.startsWith('{') || snippet.startsWith('[')) {
    return 'Tap to explore →';
  }
  return snippet;
}

function getSourceEmoji(kind?: string, source?: string): string {
  if (kind === 'linkedin_funding') return '💼';
  if (kind === 'daily_brief' || kind === 'daily_snapshot') return '🌅';

  const emojiMap: Record<string, string> = {
    'YCombinator': '🚀',
    'TechCrunch': '📰',
    'Hugging Face': '🤗',
    'ArXiv': '📄',
    'GitHub': '⚡',
    'Reddit': '🔥',
    'LinkedIn': '💼',
  };
  return emojiMap[source || ''] || '✨';
}
