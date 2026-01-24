/**
 * For You Feed Component
 * Pinterest-style masonry board design
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Bookmark,
  Share2,
  ExternalLink,
  Globe,
  Heart,
  MoreHorizontal,
  Sparkles,
  Zap,
  Clock,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";

export function ForYouFeed() {
  const authFeed = useQuery(api.domains.research.forYouFeed.getForYouFeed, { limit: 20 });
  const publicFeed = useQuery(api.domains.research.forYouFeed.getPublicForYouFeed, { limit: 20 });
  const recordEngagement = useMutation(api.domains.research.forYouFeed.recordEngagement);

  const isPublicMode = !authFeed?.items?.length && publicFeed?.items?.length;
  const displayFeed = authFeed?.items?.length ? authFeed : publicFeed;

  const handleEngagement = async (itemId: string, action: "view" | "click" | "save" | "share") => {
    try {
      await recordEngagement({ itemId, action });
    } catch (error) {
      console.debug("Engagement tracking requires authentication");
    }
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
    <div className="min-h-screen bg-gray-50">
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
                    ? "Trending ideas • Sign in to save"
                    : `${Math.round(displayFeed.mixRatio.outOfNetwork * 100)}% new discoveries`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(displayFeed.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pinterest-style Masonry Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {displayFeed.items.map((item: any) => (
            <PinCard
              key={item.itemId}
              item={item}
              onEngagement={handleEngagement}
            />
          ))}
        </div>

        {/* End of Feed */}
        <div className="py-10 text-center mt-8">
          <p className="text-gray-400 text-sm">You've seen all the pins!</p>
          <p className="text-gray-300 text-xs mt-1">
            Curated from {displayFeed.totalCandidates} ideas
          </p>
        </div>
      </div>
    </div>
  );
}

interface PinCardProps {
  item: any;
  onEngagement: (itemId: string, action: "view" | "click" | "save" | "share") => void;
}

function PinCard({ item, onEngagement }: PinCardProps) {
  const [saved, setSaved] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Source-based accent colors (Pinterest-inspired)
  const sourceStyles = {
    in_network: { accent: "bg-blue-500", label: "Following", icon: Heart },
    out_of_network: { accent: "bg-purple-500", label: "Discover", icon: Sparkles },
    trending: { accent: "bg-red-500", label: "Trending", icon: Zap },
  };

  const style = sourceStyles[item.source as keyof typeof sourceStyles] || sourceStyles.trending;
  const SourceIcon = style.icon;

  // Random-ish image height for masonry effect (based on content length)
  const getCardHeight = () => {
    const snippetLength = item.snippet?.length || 0;
    if (snippetLength > 200) return "h-72";
    if (snippetLength > 100) return "h-56";
    return "h-44";
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
        {/* Image/Gradient Header */}
        <div className={`relative ${getCardHeight()} bg-gradient-to-br ${getGradient(item.source, item.metadata?.source)}`}>
          {/* Source Badge */}
          <div className="absolute top-3 left-3">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm shadow-sm`}>
              <SourceIcon className={`w-3.5 h-3.5 ${getIconColor(item.source)}`} />
              <span className="text-xs font-medium text-gray-700">{style.label}</span>
            </div>
          </div>

          {/* AI Badge */}
          {item.metadata?.kind === "daily_brief" && (
            <div className="absolute top-3 right-3">
              <div className="px-2 py-1 rounded-full bg-amber-400/90 backdrop-blur-sm shadow-sm">
                <span className="text-[10px] font-bold text-white">AI</span>
              </div>
            </div>
          )}

          {/* Hover Actions Overlay */}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center gap-3 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              type="button"
              title={saved ? "Unsave" : "Save"}
              aria-label={saved ? "Unsave" : "Save"}
              onClick={handleSave}
              className={`p-3 rounded-full transition-all ${
                saved
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-red-500 hover:text-white'
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

          {/* Source Icon Watermark */}
          <div className="absolute bottom-4 right-4 opacity-20">
            <span className="text-6xl">{getSourceEmoji(item.metadata?.source)}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
            {item.title}
          </h3>

          {/* Snippet */}
          {item.snippet && (
            <p className="text-gray-500 text-xs leading-relaxed line-clamp-3 mb-3">
              {cleanSnippet(item.snippet)}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-50">
            {/* Source/Domain */}
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

            {/* Time */}
            <span className="text-[11px] text-gray-400">
              {formatTimeAgo(item.timestamp)}
            </span>
          </div>

          {/* Phoenix Score */}
          {item.phoenixScore && (
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

        {/* Quick Save Button (Mobile/Always visible) */}
        <div className="absolute bottom-4 right-4 sm:hidden">
          <button
            type="button"
            title={saved ? "Unsave" : "Save"}
            aria-label={saved ? "Unsave" : "Save"}
            onClick={handleSave}
            className={`p-2 rounded-full shadow-md ${
              saved
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-600'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
          </button>
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

function getGradient(source: string, metaSource?: string): string {
  // Pinterest-style soft gradients
  const gradients: Record<string, string> = {
    in_network: "from-blue-100 via-blue-50 to-indigo-100",
    out_of_network: "from-purple-100 via-pink-50 to-rose-100",
    trending: "from-orange-100 via-amber-50 to-yellow-100",
  };

  // Special source-specific gradients
  const sourceGradients: Record<string, string> = {
    'YCombinator': "from-orange-200 via-orange-100 to-amber-50",
    'TechCrunch': "from-green-100 via-emerald-50 to-teal-100",
    'Hugging Face': "from-yellow-100 via-amber-50 to-orange-100",
    'ArXiv': "from-red-100 via-rose-50 to-pink-100",
    'GitHub': "from-gray-200 via-slate-100 to-gray-50",
    'Reddit': "from-orange-200 via-red-100 to-orange-50",
    'Daily Brief': "from-amber-100 via-yellow-50 to-orange-100",
  };

  if (metaSource && sourceGradients[metaSource]) {
    return sourceGradients[metaSource];
  }

  return gradients[source] || gradients.trending;
}

function getIconColor(source: string): string {
  const colors: Record<string, string> = {
    in_network: "text-blue-500",
    out_of_network: "text-purple-500",
    trending: "text-red-500",
  };
  return colors[source] || colors.trending;
}

function getSourceEmoji(source?: string): string {
  const emojiMap: Record<string, string> = {
    'YCombinator': '🚀',
    'TechCrunch': '📰',
    'Hugging Face': '🤗',
    'ArXiv': '📄',
    'GitHub': '⚡',
    'Daily Brief': '☀️',
    'daily_brief_cron': '🌅',
    'Reddit': '🔥',
  };
  return emojiMap[source || ''] || '✨';
}
