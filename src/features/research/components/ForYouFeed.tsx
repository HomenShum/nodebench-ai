/**
 * For You Feed Component
 * Displays personalized content using X's For You algorithm
 * Falls back to public feed for non-authenticated users
 */

import React from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { TrendingUp, Eye, Bookmark, Share2, ExternalLink, Globe } from "lucide-react";

export function ForYouFeed() {
  // Try authenticated feed first
  const authFeed = useQuery(api.domains.research.forYouFeed.getForYouFeed, { limit: 20 });
  // Always fetch public feed as fallback
  const publicFeed = useQuery(api.domains.research.forYouFeed.getPublicForYouFeed, { limit: 20 });
  const recordEngagement = useMutation(api.domains.research.forYouFeed.recordEngagement);

  // Use authenticated feed if it has items, otherwise fall back to public
  const isPublicMode = !authFeed?.items?.length && publicFeed?.items?.length;
  const feed = isPublicMode ? publicFeed : authFeed;

  const handleEngagement = async (itemId: string, action: "view" | "click" | "save" | "share") => {
    try {
      await recordEngagement({ itemId, action });
    } catch (error) {
      // Silently fail for non-authenticated users
      console.debug("Engagement tracking requires authentication");
    }
  };

  if (!feed && !publicFeed) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        Loading your personalized feed...
      </div>
    );
  }

  // If both are empty, show message
  if (!feed?.items?.length && !publicFeed?.items?.length) {
    return (
      <div className="p-8 text-center text-[var(--text-secondary)]">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No feed items yet. Check back soon!</p>
      </div>
    );
  }

  // Use public feed if auth feed is empty
  const displayFeed = feed?.items?.length ? feed : publicFeed;
  if (!displayFeed) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          {isPublicMode ? <Globe className="w-6 h-6" /> : <TrendingUp className="w-6 h-6" />}
          {isPublicMode ? "Trending Feed" : "For You"}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {isPublicMode ? (
            <>Public feed • Sign in for personalized recommendations</>
          ) : (
            <>Personalized content • {Math.round(displayFeed.mixRatio.inNetwork * 100)}% in-network,{" "}
            {Math.round(displayFeed.mixRatio.outOfNetwork * 100)}% discovery</>
          )}
        </p>
      </div>

      {/* Feed Stats */}
      <div className="flex items-center gap-4 px-4 py-2 bg-[var(--bg-secondary)] rounded-lg text-sm">
        <span className="text-[var(--text-secondary)]">
          Generated from {displayFeed.totalCandidates} candidates
        </span>
        <span className="text-[var(--text-muted)]">•</span>
        <span className="text-[var(--text-secondary)]">
          Updated {new Date(displayFeed.generatedAt).toLocaleTimeString()}
        </span>
        {isPublicMode && (
          <>
            <span className="text-[var(--text-muted)]">•</span>
            <span className="text-orange-500 font-medium">Public Mode</span>
          </>
        )}
      </div>

      {/* Feed Items */}
      <div className="space-y-4">
        {displayFeed.items.map((item: any) => (
          <FeedItem
            key={item.itemId}
            item={item}
            onEngagement={handleEngagement}
            isPublicMode={isPublicMode}
          />
        ))}
      </div>
    </div>
  );
}

interface FeedItemProps {
  item: any;
  onEngagement: (itemId: string, action: "view" | "click" | "save" | "share") => void;
  isPublicMode?: boolean;
}

function FeedItem({ item, onEngagement, isPublicMode }: FeedItemProps) {
  const sourceColors = {
    in_network: "bg-blue-500",
    out_of_network: "bg-purple-500",
    trending: "bg-orange-500",
  };

  const sourceLabels = {
    in_network: "Following",
    out_of_network: "Discovery",
    trending: "Trending",
  };

  return (
    <div
      className="bg-[var(--bg-secondary)] rounded-lg p-5 space-y-3 hover:bg-[var(--bg-tertiary)] transition-colors"
      onClick={() => onEngagement(item.itemId, "view")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 ${sourceColors[item.source as keyof typeof sourceColors]} text-white text-xs font-medium rounded`}>
              {sourceLabels[item.source as keyof typeof sourceLabels]}
            </span>
            {item.phoenixScore && (
              <div className="flex items-center gap-1 text-green-500">
                <div className="w-2 h-2 rounded-full bg-current" />
                <span className="text-xs font-medium">{item.phoenixScore}% match</span>
              </div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {item.title}
          </h3>
          {item.snippet && (
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {item.snippet}
            </p>
          )}
          {item.relevanceReason && (
            <p className="text-xs text-[var(--text-muted)] mt-2 italic">
              Why: {item.relevanceReason}
            </p>
          )}
        </div>
      </div>

      {/* Engagement Prediction */}
      {item.engagementPrediction && (
        <div className="flex items-center gap-4 pt-3 border-t border-[var(--border-color)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Eye className="w-3.5 h-3.5" />
            <span>{Math.round(item.engagementPrediction.view * 100)}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>{Math.round(item.engagementPrediction.click * 100)}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Bookmark className="w-3.5 h-3.5" />
            <span>{Math.round(item.engagementPrediction.save * 100)}%</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <Share2 className="w-3.5 h-3.5" />
            <span>{Math.round(item.engagementPrediction.share * 100)}%</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEngagement(item.itemId, "click");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEngagement(item.itemId, "save");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
        >
          <Bookmark className="w-4 h-4" />
          Save
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEngagement(item.itemId, "share");
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-md transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>
    </div>
  );
}
