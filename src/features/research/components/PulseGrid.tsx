/**
 * PulseGrid - Dashboard-style insight cards grid
 * 
 * Displays 3-column grid of "Insight Cards":
 * - Trending: Recent news/updates from Source Nodes
 * - Watchlist: SEC filings, alerts from documents
 * - Resume: Draft documents saved recently
 */

import { useMemo } from 'react';
import { TrendingUp, Bell, FileEdit, Clock, ExternalLink, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface InsightCard {
  id: string;
  type: 'trending' | 'watchlist' | 'resume';
  title: string;
  description: string;
  source?: string;
  updatedAt?: number | Date;
  onClick?: () => void;
}

interface PulseGridProps {
  cards: InsightCard[];
  onCardClick?: (card: InsightCard) => void;
  className?: string;
  isFocused?: boolean; // When search is focused, dim the grid
}

const CARD_ICONS = {
  trending: TrendingUp,
  watchlist: Bell,
  resume: FileEdit,
};

const CARD_COLORS = {
  trending: 'from-blue-500/10 to-cyan-500/10 border-blue-200',
  watchlist: 'from-amber-500/10 to-orange-500/10 border-amber-200',
  resume: 'from-purple-500/10 to-pink-500/10 border-purple-200',
};

const ICON_COLORS = {
  trending: 'text-blue-600',
  watchlist: 'text-amber-600',
  resume: 'text-purple-600',
};

function InsightCardComponent({
  card,
  onCardClick,
}: {
  card: InsightCard;
  onCardClick?: (card: InsightCard) => void;
}) {
  const Icon = CARD_ICONS[card.type];
  const gradientClass = CARD_COLORS[card.type];
  const iconColor = ICON_COLORS[card.type];

  const timeAgo = useMemo(() => {
    if (!card.updatedAt) return null;
    try {
      return formatDistanceToNow(new Date(card.updatedAt), { addSuffix: true });
    } catch {
      return null;
    }
  }, [card.updatedAt]);

  return (
    <button
      onClick={() => onCardClick?.(card)}
      className={`
        group relative w-full text-left p-4 rounded-xl 
        bg-gradient-to-br ${gradientClass}
        border hover:border-gray-300 
        transition-all duration-200 hover:shadow-md hover:scale-[1.02]
        focus:outline-none focus:ring-2 focus:ring-gray-900/20
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg bg-white/80 shadow-sm ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        {card.source && (
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            {card.source}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1 group-hover:text-gray-700">
        {card.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-600 line-clamp-2 mb-2">
        {card.description}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {timeAgo && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </span>
        )}
        <span className="flex items-center gap-1 text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-3 h-3" />
          View
        </span>
      </div>
    </button>
  );
}

export function PulseGrid({
  cards,
  onCardClick,
  className = '',
  isFocused = false,
}: PulseGridProps) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        transition-all duration-300 ease-out
        ${isFocused ? 'opacity-20 blur-sm scale-95 pointer-events-none' : 'opacity-100 blur-0 scale-100'}
        ${className}
      `}
    >
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-amber-500" />
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Today's Pulse
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <InsightCardComponent
            key={card.id}
            card={card}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  );
}

export default PulseGrid;

