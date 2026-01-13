import React from 'react';
import { ExternalLink, TrendingUp, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Source icons/colors mapping
const SOURCE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'Hugging Face': { icon: '🤗', color: 'text-yellow-700', bg: 'bg-yellow-50' },
  'YCombinator': { icon: '🟧', color: 'text-orange-700', bg: 'bg-orange-50' },
  'TechCrunch': { icon: '📰', color: 'text-green-700', bg: 'bg-green-50' },
  'ArXiv': { icon: '📄', color: 'text-blue-700', bg: 'bg-blue-50' },
  'GitHub': { icon: '🐙', color: 'text-purple-700', bg: 'bg-purple-50' },
  'BioPharma Dive': { icon: '💊', color: 'text-pink-700', bg: 'bg-pink-50' },
  'FierceBiotech': { icon: '🧬', color: 'text-rose-700', bg: 'bg-rose-50' },
  'Bloomberg': { icon: '📊', color: 'text-blue-700', bg: 'bg-blue-50' },
  'Financial Times': { icon: '📈', color: 'text-amber-700', bg: 'bg-amber-50' },
  'OpenAI Blog': { icon: '🤖', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  'Google AI Blog': { icon: '🔬', color: 'text-cyan-700', bg: 'bg-cyan-50' },
  'The Hacker News': { icon: '🔒', color: 'text-red-700', bg: 'bg-red-50' },
  'default': { icon: '📌', color: 'text-stone-700', bg: 'bg-stone-50' },
};

const CATEGORY_STYLES: Record<string, string> = {
  'ai_ml': 'bg-violet-100 text-violet-800',
  'research': 'bg-blue-100 text-blue-800',
  'finance': 'bg-emerald-100 text-emerald-800',
  'startups': 'bg-orange-100 text-orange-800',
  'biotech': 'bg-pink-100 text-pink-800',
  'tech': 'bg-cyan-100 text-cyan-800',
  'security': 'bg-red-100 text-red-800',
  'default': 'bg-stone-100 text-stone-700',
};

interface CompactSignalCardProps {
  title: string;
  source: string;
  category?: string;
  url?: string;
  publishedAt?: string | Date;
  score?: number;
  isHot?: boolean;
  summary?: string;
  showSummary?: boolean;
  onClick?: () => void;
  className?: string;
}

function getTimeAgo(date: string | Date | undefined): string {
  if (!date) return '';
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function CompactSignalCard({
  title,
  source,
  category,
  url,
  publishedAt,
  score,
  isHot,
  summary,
  showSummary = false,
  onClick,
  className,
}: CompactSignalCardProps) {
  const sourceConfig = SOURCE_CONFIG[source] || SOURCE_CONFIG.default;
  const categoryStyle = CATEGORY_STYLES[category || 'default'] || CATEGORY_STYLES.default;
  const timeAgo = getTimeAgo(publishedAt);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-start gap-2 p-2.5 rounded-lg border border-transparent',
        'hover:bg-stone-50 hover:border-stone-200 cursor-pointer transition-all duration-150',
        showSummary && 'py-3',
        className
      )}
    >
      {/* Source Icon */}
      <div className={cn('w-6 h-6 rounded flex items-center justify-center text-xs shrink-0 mt-0.5', sourceConfig.bg)}>
        {sourceConfig.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title - truncated to 2 lines */}
        <h4 className="text-[13px] font-medium text-stone-800 leading-snug line-clamp-2 group-hover:text-emerald-900 transition-colors">
          {title}
        </h4>

        {/* Summary - only when expanded */}
        {showSummary && summary && (
          <p className="mt-1 text-[11px] text-stone-500 leading-relaxed line-clamp-2">
            {summary}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-stone-500">
          <span className={cn('font-medium', sourceConfig.color)}>{source}</span>
          {timeAgo && (
            <>
              <span className="text-stone-300">•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {timeAgo}
              </span>
            </>
          )}
          {category && (
            <>
              <span className="text-stone-300">•</span>
              <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase', categoryStyle)}>
                {category.replace('_', '/')}
              </span>
            </>
          )}
          {isHot && (
            <span className="flex items-center gap-0.5 text-orange-600">
              <TrendingUp className="w-2.5 h-2.5" />
              Hot
            </span>
          )}
        </div>
      </div>

      {/* Score / Action */}
      <div className="flex items-center gap-1 shrink-0">
        {score !== undefined && score > 70 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold">
            <Zap className="w-2.5 h-2.5" />
            {score}
          </div>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-stone-400 hover:text-emerald-600"
            title="Open article"
            aria-label="Open article in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function CompactSignalList({
  signals,
  maxItems = 10,
  onSignalClick,
}: {
  signals: Array<{
    id: string;
    title: string;
    source: string;
    category?: string;
    url?: string;
    publishedAt?: string | Date;
    score?: number;
  }>;
  maxItems?: number;
  onSignalClick?: (id: string) => void;
}) {
  const displaySignals = signals.slice(0, maxItems);
  const remaining = signals.length - maxItems;

  return (
    <div className="space-y-0.5">
      {displaySignals.map((signal) => (
        <CompactSignalCard
          key={signal.id}
          {...signal}
          isHot={signal.score !== undefined && signal.score > 80}
          onClick={() => onSignalClick?.(signal.id)}
        />
      ))}
      {remaining > 0 && (
        <div className="text-center py-2 text-[11px] text-stone-400">
          +{remaining} more signals
        </div>
      )}
    </div>
  );
}

