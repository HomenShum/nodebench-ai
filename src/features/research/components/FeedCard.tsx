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
  MessageCircle
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
}

export const FeedCard: React.FC<FeedCardProps> = ({ item, onClick, onAnalyze, onBookmark, isSelected }) => {
  const [isBookmarked, setIsBookmarked] = useState(item.isBookmarked ?? false);
  const isSignal = item.type === 'signal';
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

  return (
    <div
      onClick={onClick}
      className={`
        group relative break-inside-avoid cursor-pointer overflow-hidden rounded-xl border transition-all duration-300
        ${isSignal
          ? 'bg-slate-900 border-slate-800 text-white hover:border-green-500/50'
          : 'bg-white border-gray-200 text-gray-900 hover:shadow-lg hover:-translate-y-0.5'}
        ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2' : ''}
      `}
    >
      {/* Relevance indicator bar */}
      {item.relevanceScore && item.relevanceScore > 70 && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500" />
      )}
      {/* Bloomberg Vibe: Accent bar for Signals */}
      {isSignal && (
        <div className="absolute top-0 left-0 w-1 bg-green-500 h-full" />
      )}

      <div className="p-5">
        {/* Header: Type badge + Sentiment + Timestamp */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isDossier && <div className="p-1.5 bg-purple-100 rounded-md text-purple-600"><FileText size={12}/></div>}
            {isSignal && <div className="p-1.5 bg-green-500/20 rounded-md text-green-400"><TrendingUp size={12}/></div>}
            {item.type === 'news' && <div className="p-1.5 bg-blue-100 rounded-md text-blue-600"><MessageSquare size={12}/></div>}
            {isRepo && <div className="p-1.5 bg-gray-800 rounded-md text-white"><GitBranch size={12}/></div>}
            {isProduct && <div className="p-1.5 bg-orange-100 rounded-md text-orange-600"><Package size={12}/></div>}
            <span className={`text-[10px] uppercase tracking-wider font-semibold ${isSignal ? 'text-slate-400' : 'text-gray-400'}`}>
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
        <h3 className={`text-lg font-semibold leading-tight mb-2 ${isDossier ? 'font-serif' : 'font-sans'} ${isSignal ? 'text-white' : 'text-gray-900'}`}>
          {item.title}
        </h3>

        {item.subtitle && (
          <p className={`text-sm line-clamp-3 mb-4 ${isSignal ? 'text-slate-400' : 'text-gray-600'}`}>
            {item.subtitle}
          </p>
        )}

        {/* Data Metrics Row (Pitchbook/Bloomberg Style) */}
        {item.metrics && item.metrics.length > 0 && (
          <div className={`flex items-center gap-4 mt-3 pt-3 border-t border-dashed ${isSignal ? 'border-slate-700' : 'border-gray-200'}`}>
            {item.metrics.map((m, i) => (
              <div key={i} className="flex flex-col">
                <span className={`text-[10px] uppercase ${isSignal ? 'text-slate-500' : 'text-gray-400'}`}>{m.label}</span>
                <span className={`text-sm font-mono font-bold flex items-center gap-1 ${isSignal ? 'text-white' : 'text-gray-900'}`}>
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
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  isSignal
                    ? 'bg-slate-800 border-slate-700 text-slate-300'
                    : 'bg-gray-50 border-gray-100 text-gray-500'
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Quick Action Bar (always visible on right edge) */}
      <div className="absolute top-3 right-3 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={handleBookmark}
          className={`p-1.5 rounded-lg transition-all ${
            isBookmarked 
              ? 'bg-amber-100 text-amber-600' 
              : isSignal ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 text-gray-400 hover:text-gray-600'
          }`}
          title={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          {isBookmarked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        </button>
      </div>

      {/* Hover Overlay (Instagram Style) - with actions */}
      <div className={`
        absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]
        ${isSignal ? 'bg-white/10' : 'bg-white/60'}
      `}>
         {/* Primary action: View/Read */}
         <div className="bg-black text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform">
            {isSignal ? 'View Signal' : isDossier ? 'Read Dossier' : isRepo ? 'View Repo' : isProduct ? 'View Product' : 'View Article'}
         </div>

         {/* Secondary action: Analyze with AI (only if handler provided) */}
         {onAnalyze && (
           <button
             type="button"
             onClick={handleAnalyzeClick}
             className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium px-4 py-2 rounded-full shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-transform hover:from-purple-500 hover:to-indigo-500"
           >
             <Sparkles size={12} />
             Analyze
           </button>
         )}
      </div>

      {/* Bookmarked indicator */}
      {isBookmarked && (
        <div className="absolute top-0 right-4 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-amber-500" />
      )}
    </div>
  );
};
