import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useRecommendations } from '../hooks/useRecommendations';
import { RecommendationCard } from './RecommendationCard';

interface RecommendationPanelProps {
  className?: string;
  onActionClick?: (actionType: string, actionData: unknown) => void;
}

export function RecommendationPanel({ className = '', onActionClick }: RecommendationPanelProps) {
  const { recommendations, isLoading, dismiss, click, recordFeedback } = useRecommendations();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleClick = async (id: typeof recommendations[0]['_id']) => {
    const rec = recommendations.find((r) => r._id === id);
    if (rec) {
      await click(id);
      onActionClick?.(rec.actionType ?? 'default', rec.actionData);
    }
  };

  const handleFeedback = async (
    id: typeof recommendations[0]['_id'],
    action: "accepted" | "rejected",
    rating?: number,
    reason?: string
  ) => {
    await recordFeedback(id, action, rating, reason);
  };

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="motion-safe:animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Don't show panel if no recommendations
  }

  return (
    <div className={`bg-white dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] shadow-sm dark:shadow-none overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Suggestions</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded-full">
            {recommendations.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <AnimatePresence mode="popLayout">
                {recommendations.map((rec) => (
                  <RecommendationCard
                    key={rec._id}
                    id={rec._id}
                    type={rec.type}
                    priority={rec.priority}
                    message={rec.message}
                    actionLabel={rec.actionLabel}
                    icon={rec.icon ?? undefined}
                    onDismiss={dismiss}
                    onClick={handleClick}
                    onFeedback={handleFeedback}
                    showFeedback={true}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RecommendationPanel;

