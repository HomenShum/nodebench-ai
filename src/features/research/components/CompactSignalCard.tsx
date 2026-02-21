import React from 'react';
import { ExternalLink, TrendingUp, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// Source icons/colors mapping
const SOURCE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'Hugging Face': { icon: '🤗', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'YCombinator': { icon: '🟧', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'TechCrunch': { icon: '📰', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'ArXiv': { icon: '📄', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'GitHub': { icon: '🐙', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'BioPharma Dive': { icon: '💊', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'FierceBiotech': { icon: '🧬', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'Bloomberg': { icon: '📊', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'Financial Times': { icon: '📈', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'OpenAI Blog': { icon: '🤖', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'Google AI Blog': { icon: '🔬', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'The Hacker News': { icon: '🔒', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
  'default': { icon: '📌', color: 'text-content-secondary', bg: 'bg-surface-secondary dark:bg-white/[0.06]' },
};

const CATEGORY_STYLES: Record<string, { style: string; label: string }> = {
  'ai_ml': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: 'AI & ML' },
  'research': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: 'Research' },
  'finance': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: 'Finance' },
  'startups': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: 'Startups' },
  'biotech': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: 'Biotech' },
  'tech': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: 'Tech' },
  'security': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: 'Security' },
  'default': { style: 'bg-surface-secondary dark:bg-white/[0.06] text-content-secondary', label: '' },
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
  const categoryConfig = CATEGORY_STYLES[category || 'default'] || CATEGORY_STYLES.default;
  const timeAgo = getTimeAgo(publishedAt);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex items-start gap-2 p-2.5 rounded-lg border border-transparent',
        'hover:bg-surface-hover hover:border-edge dark:hover:border-white/10 cursor-pointer transition-all duration-150',
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
        <h4 className="text-[13px] font-medium text-content leading-snug line-clamp-2 group-hover:text-content dark:group-hover:text-white transition-colors">
          {title}
        </h4>

        {/* Summary - only when expanded */}
        {showSummary && summary && (
          <p className="mt-1 text-xs text-content-secondary leading-relaxed line-clamp-2">
            {summary}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-content-secondary">
          <span className={cn('font-medium', sourceConfig.color)}>{source}</span>
          {timeAgo && (
            <>
              <span className="text-gray-300 dark:text-content-secondary">•</span>
              <span className="flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {timeAgo}
              </span>
            </>
          )}
          {category && (
            <>
              <span className="text-gray-300 dark:text-content-secondary">•</span>
              <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium whitespace-nowrap', categoryConfig.style)}>
                {categoryConfig.label || category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </>
          )}
          {isHot && (
            <span className="flex items-center gap-0.5 text-content-muted">
              <TrendingUp className="w-2.5 h-2.5" />
              Trending
            </span>
          )}
        </div>
      </div>

      {/* Score / Action */}
      <div className="flex items-center gap-1 shrink-0">
        {score !== undefined && score > 70 && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-surface-secondary dark:bg-white/[0.06] text-content-muted rounded text-xs font-medium">
            {score}
          </div>
        )}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-content-muted hover:text-indigo-600 dark:hover:text-indigo-400"
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
        <div className="text-center py-2 text-xs text-content-muted">
          +{remaining} more signals
        </div>
      )}
    </div>
  );
}

