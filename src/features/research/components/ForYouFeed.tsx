/**
 * For You Feed Component
 * Modern card-based design inspired by X.com and Instagram
 */

import React, { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  TrendingUp,
  Bookmark,
  Share2,
  ExternalLink,
  Globe,
  MessageCircle,
  Heart,
  MoreHorizontal,
  Sparkles,
  Zap,
  Clock,
  ArrowUpRight,
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
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your feed...</p>
        </div>
      </div>
    );
  }

  if (!displayFeed.items?.length) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-10 h-10 text-slate-600" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">No items yet</h2>
          <p className="text-slate-400">Check back soon for trending content and personalized recommendations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-slate-900/80 border-b border-slate-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isPublicMode ? 'bg-orange-500/20' : 'bg-blue-500/20'}`}>
                {isPublicMode ? (
                  <Globe className="w-5 h-5 text-orange-400" />
                ) : (
                  <Sparkles className="w-5 h-5 text-blue-400" />
                )}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">
                  {isPublicMode ? "Discover" : "For You"}
                </h1>
                <p className="text-xs text-slate-500">
                  {isPublicMode
                    ? "Trending • Sign in to personalize"
                    : `${Math.round(displayFeed.mixRatio.outOfNetwork * 100)}% discovery`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(displayFeed.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feed Content */}
      <div className="max-w-2xl mx-auto">
        {displayFeed.items.map((item: any, index: number) => (
          <FeedCard
            key={item.itemId}
            item={item}
            onEngagement={handleEngagement}
            isFirst={index === 0}
          />
        ))}

        {/* End of Feed */}
        <div className="py-12 text-center border-t border-slate-800 mx-4">
          <p className="text-slate-500 text-sm">You're all caught up!</p>
          <p className="text-slate-600 text-xs mt-1">
            Generated from {displayFeed.totalCandidates} candidates
          </p>
        </div>
      </div>
    </div>
  );
}

interface FeedCardProps {
  item: any;
  onEngagement: (itemId: string, action: "view" | "click" | "save" | "share") => void;
  isFirst?: boolean;
}

function FeedCard({ item, onEngagement, isFirst }: FeedCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // Generate a gradient based on the item source
  const gradients = {
    in_network: "from-blue-600/20 to-indigo-600/20",
    out_of_network: "from-purple-600/20 to-pink-600/20",
    trending: "from-orange-600/20 to-red-600/20",
  };

  const sourceConfig = {
    in_network: { label: "Following", icon: Heart, color: "text-blue-400", bg: "bg-blue-500/20" },
    out_of_network: { label: "Discover", icon: Sparkles, color: "text-purple-400", bg: "bg-purple-500/20" },
    trending: { label: "Trending", icon: Zap, color: "text-orange-400", bg: "bg-orange-500/20" },
  };

  const config = sourceConfig[item.source as keyof typeof sourceConfig] || sourceConfig.trending;
  const SourceIcon = config.icon;

  // Extract domain from URL for display
  const getDomain = (url?: string) => {
    if (!url) return null;
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  };

  const domain = getDomain(item.metadata?.url);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(!liked);
    onEngagement(item.itemId, "click");
  };

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
    <article
      className={`border-b border-slate-800 hover:bg-slate-800/30 transition-all duration-200 cursor-pointer group ${isFirst ? 'border-t-0' : ''}`}
      onClick={handleOpen}
    >
      <div className="px-4 py-5">
        {/* Card Header */}
        <div className="flex items-start gap-3 mb-3">
          {/* Source Avatar */}
          <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 ring-2 ring-slate-800`}>
            <SourceIcon className={`w-5 h-5 ${config.color}`} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Source & Time Row */}
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-sm font-semibold ${config.color}`}>
                {item.metadata?.source || config.label}
              </span>
              {item.metadata?.kind === "daily_brief" && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full border border-amber-500/30">
                  AI Curated
                </span>
              )}
              <span className="text-slate-600">·</span>
              <span className="text-xs text-slate-500">
                {formatTimeAgo(item.timestamp)}
              </span>
              <div className="ml-auto">
                <button
                  type="button"
                  title="More options"
                  aria-label="More options"
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 hover:bg-slate-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-[15px] font-medium text-white leading-snug mb-2 group-hover:text-blue-400 transition-colors">
              {item.title}
            </h3>
          </div>
        </div>

        {/* Content Preview */}
        {item.snippet && (
          <p className="text-[15px] text-slate-300 leading-relaxed mb-3 line-clamp-3 pl-[52px]">
            {cleanSnippet(item.snippet)}
          </p>
        )}

        {/* Link Preview Card */}
        {domain && (
          <div className="ml-[52px] mb-3 rounded-xl border border-slate-700 overflow-hidden hover:border-slate-600 transition-colors">
            <div className={`h-32 bg-gradient-to-br ${gradients[item.source as keyof typeof gradients] || gradients.trending} flex items-center justify-center`}>
              <div className="text-4xl opacity-30">
                {getSourceEmoji(item.metadata?.source)}
              </div>
            </div>
            <div className="p-3 bg-slate-800/50">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                <ExternalLink className="w-3 h-3" />
                <span>{domain}</span>
              </div>
              <p className="text-sm text-slate-300 font-medium line-clamp-1">
                {item.title}
              </p>
            </div>
          </div>
        )}

        {/* Phoenix Score Badge */}
        {item.phoenixScore && (
          <div className="ml-[52px] mb-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-green-400">{item.phoenixScore}% match</span>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between pl-[52px] pt-2">
          <div className="flex items-center gap-1">
            {/* Comment/View */}
            <button
              type="button"
              title="View details"
              aria-label="View details"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-blue-500/10 text-slate-500 hover:text-blue-400 transition-all group/btn"
            >
              <MessageCircle className="w-[18px] h-[18px]" />
              <span className="text-xs font-medium opacity-0 group-hover/btn:opacity-100 transition-opacity">View</span>
            </button>

            {/* Like */}
            <button
              type="button"
              title={liked ? "Unlike" : "Like"}
              aria-label={liked ? "Unlike" : "Like"}
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                liked
                  ? 'text-pink-500 hover:bg-pink-500/10'
                  : 'text-slate-500 hover:bg-pink-500/10 hover:text-pink-400'
              }`}
            >
              <Heart className={`w-[18px] h-[18px] ${liked ? 'fill-current' : ''}`} />
            </button>

            {/* Save */}
            <button
              type="button"
              title={saved ? "Unsave" : "Save"}
              aria-label={saved ? "Unsave" : "Save"}
              onClick={handleSave}
              className={`flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                saved
                  ? 'text-blue-500 hover:bg-blue-500/10'
                  : 'text-slate-500 hover:bg-blue-500/10 hover:text-blue-400'
              }`}
            >
              <Bookmark className={`w-[18px] h-[18px] ${saved ? 'fill-current' : ''}`} />
            </button>

            {/* Share */}
            <button
              type="button"
              title="Share"
              aria-label="Share"
              onClick={handleShare}
              className="flex items-center gap-2 px-3 py-2 rounded-full text-slate-500 hover:bg-green-500/10 hover:text-green-400 transition-all"
            >
              <Share2 className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Open Link */}
          <button
            type="button"
            title="Open in new tab"
            aria-label="Open in new tab"
            onClick={(e) => {
              e.stopPropagation();
              handleOpen();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <span>Open</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
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
  // Remove JSON-like content that sometimes appears in snippets
  if (snippet.startsWith('{') || snippet.startsWith('[')) {
    return 'View full content →';
  }
  return snippet;
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
