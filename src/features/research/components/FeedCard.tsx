import React, { useState } from 'react';
import {
  TrendingUp,
  FileText,
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  GitBranch,
  Package,
  Bookmark,
  BookmarkCheck,
  Zap,
} from 'lucide-react';

export type FeedItemType = 'dossier' | 'signal' | 'news' | 'repo' | 'product';

export type SentimentType = 'bullish' | 'bearish' | 'neutral';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  title: string;
  subtitle?: string;
  timestamp: string;
  metrics?: { label: string; value: string; trend?: 'up' | 'down' }[];
  sourceIcon?: React.ReactNode;
  source?: string;
  tags: string[];
  url?: string;  // External URL for live feed items (opens in new tab)
  sentiment?: SentimentType;  // AI-detected sentiment
  relevanceScore?: number;    // 0-100 relevance to watchlist
  isBookmarked?: boolean;     // User bookmark state
}

interface FeedCardProps {
  item: FeedItem;
  onClick: () => void;
  /** Handler for "Analyze with AI" action - opens global agent with context */
  onAnalyze?: () => void;
  /** Handler for bookmark action */
  onBookmark?: () => void;
  /** Whether this card is currently selected (for keyboard nav) */
  isSelected?: boolean;
  variant?: "default" | "minimal" | "signal";
}

export const FeedCard: React.FC<FeedCardProps> = ({ item, onClick, onAnalyze, onBookmark, isSelected, variant = "default" }) => {
  const [isBookmarked, setIsBookmarked] = useState(item.isBookmarked ?? false);
  const isSignal = item.type === 'signal' || variant === "signal";
  const isDossier = item.type === 'dossier';
  const isRepo = item.type === 'repo';
  const isProduct = item.type === 'product';

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    onBookmark?.();
  };

  const getSentimentBadge = () => {
    if (!item.sentiment) return null;
    const badges = {
      bullish: { icon: '🐂', label: 'Bullish', color: 'bg-green-50 text-green-700 border-green-200' },
      bearish: { icon: '🐻', label: 'Bearish', color: 'bg-red-50 text-red-700 border-red-200' },
      neutral: { icon: '⚖️', label: 'Neutral', color: 'bg-gray-50 text-gray-600 border-gray-200' },
    };
    const badge = badges[item.sentiment];
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.color}`}>
        {badge.icon} {badge.label}
      </span>
    );
  };

  const handleAnalyzeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card onClick
    onAnalyze?.();
  };

  const renderMinimal = () => {
    const safeTags = item.tags || [];
    return (
      <div
        onClick={onClick}
        className={`
          group relative p-5 rounded-2xl transition-all duration-200 cursor-pointer
          bg-white border border-gray-100 hover:border-gray-300 hover:shadow-md
          ${isSignal ? 'bg-slate-900 border-slate-800 text-white hover:border-slate-700' : ''}
        `}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSignal ? 'text-blue-300' : 'text-blue-600'}`}>
            {item.sourceIcon ? 'Source' : 'News'}
          </span>
          <span className="text-gray-300 text-[10px]">•</span>
          <span className={`text-xs ${isSignal ? 'text-gray-400' : 'text-gray-500'}`}>{item.timestamp}</span>
        </div>
        <h3 className={`text-base font-semibold leading-snug mb-2 ${isSignal ? 'text-white' : 'text-gray-900'}`}>
          {item.title}
        </h3>
        {item.subtitle && (
          <p className={`text-sm leading-relaxed ${isSignal ? 'text-gray-400' : 'text-gray-600'}`}>
            {item.subtitle}
          </p>
        )}
        {safeTags.length > 0 && (
          <div className="flex gap-2 mt-4">
            {safeTags.slice(0, 3).map(tag => (
              <span key={tag} className={`text-[10px] px-2 py-1 rounded-md ${isSignal ? 'bg-slate-800 text-slate-300' : 'bg-gray-50 text-gray-500'}`}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (variant === "minimal" || variant === "signal") {
    return renderMinimal();
  }

  return (
    <div
      onClick={onClick}
      className={`
        group relative break-inside-avoid cursor-pointer overflow-hidden rounded-xl border transition-all duration-200 bg-white text-gray-900
        border-gray-200 hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
      `}
    >
      {item.relevanceScore && item.relevanceScore > 70 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
      )}

      <div className="p-5">
        {/* Header: Type badge + Sentiment + Timestamp */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isDossier && <div className="p-1.5 bg-purple-50 rounded-md text-purple-600 border border-purple-100"><FileText size={12} /></div>}
            {isSignal && <div className="p-1.5 bg-blue-50 rounded-md text-blue-600 border border-blue-100"><TrendingUp size={12} /></div>}
            {item.type === 'news' && <div className="p-1.5 bg-blue-50 rounded-md text-blue-600 border border-blue-100"><MessageSquare size={12} /></div>}
            {isRepo && <div className="p-1.5 bg-gray-100 rounded-md text-gray-800 border border-gray-200"><GitBranch size={12} /></div>}
            {isProduct && <div className="p-1.5 bg-orange-50 rounded-md text-orange-600 border border-orange-100"><Package size={12} /></div>}
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
              {item.type === 'repo' ? 'GitHub' : item.type === 'product' ? 'Product' : item.type}
            </span>
            {getSentimentBadge()}
          </div>
          <div className="flex items-center gap-2">
            {/* Relevance Score */}
            {item.relevanceScore && item.relevanceScore > 50 && (
              <span className="text-[10px] text-purple-500 font-medium flex items-center gap-0.5">
                <Zap className="w-3 h-3" />
                {item.relevanceScore}%
              </span>
            )}
            <span className={`text-xs ${isSignal ? 'text-slate-500' : 'text-gray-400'}`}>{item.timestamp}</span>
          </div>
        </div>

        {/* Title: Serif for dossiers (newsletter feel), Sans for data */}
        <h3 className={`text-lg font-semibold leading-tight mb-2 ${isDossier ? 'font-serif' : 'font-sans'} text-gray-900`}>
          {item.title}
        </h3>

        {item.subtitle && (
          <p className="text-sm line-clamp-3 mb-4 text-gray-600">
            {item.subtitle}
          </p>
        )}

        {/* Data Metrics Row (Pitchbook/Bloomberg Style) */}
        {item.metrics && item.metrics.length > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-dashed border-gray-200">
            {item.metrics.map((m, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] uppercase text-gray-400">{m.label}</span>
                <span className="text-sm font-mono font-bold flex items-center gap-1 text-gray-900">
                  {m.value}
                  {m.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-500" />}
                  {m.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-500" />}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tags (LinkedIn/Twitter Style) */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {item.tags.map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-100 text-gray-500"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-4 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-400 flex items-center gap-1">
          <ArrowUpRight className="w-3 h-3 text-gray-300" />
          {isSignal ? "View Signal" : isDossier ? "Read Dossier" : "Open"}
        </div>
        <div className="flex items-center gap-2">
          {onAnalyze && (
            <button
              type="button"
              onClick={handleAnalyzeClick}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
            >
              <Sparkles size={12} />
              Analyze
            </button>
          )}
          <button
            type="button"
            onClick={handleBookmark}
            className={`p-2 rounded-lg border text-gray-500 hover:text-gray-700 hover:border-gray-300 ${isBookmarked ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white'}`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          >
            {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};
