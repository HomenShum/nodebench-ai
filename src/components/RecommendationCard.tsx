import React from 'react';
import { motion } from 'framer-motion';
import { X, Lightbulb, FileText, Users, Bell, Sparkles, ChevronRight } from 'lucide-react';
import { Id } from '../../convex/_generated/dataModel';

interface RecommendationCardProps {
  id: Id<"recommendations">;
  type: "pattern" | "idle_content" | "collaboration" | "external_trigger" | "smart_suggestion";
  priority: "high" | "medium" | "low";
  message: string;
  actionLabel: string;
  icon?: string;
  onDismiss: (id: Id<"recommendations">) => void;
  onClick: (id: Id<"recommendations">) => void;
}

const typeIcons = {
  pattern: Lightbulb,
  idle_content: FileText,
  collaboration: Users,
  external_trigger: Bell,
  smart_suggestion: Sparkles,
};

const priorityColors = {
  high: 'border-l-red-500 bg-red-50',
  medium: 'border-l-amber-500 bg-amber-50',
  low: 'border-l-blue-500 bg-blue-50',
};

export function RecommendationCard({
  id,
  type,
  priority,
  message,
  actionLabel,
  onDismiss,
  onClick,
}: RecommendationCardProps) {
  const Icon = typeIcons[type] || Lightbulb;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`relative rounded-lg border-l-4 p-3 shadow-sm ${priorityColors[priority]}`}
    >
      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/10 transition-colors"
        aria-label="Dismiss recommendation"
      >
        <X className="h-3.5 w-3.5 text-gray-500" />
      </button>

      {/* Content */}
      <div className="flex items-start gap-3 pr-6">
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug">{message}</p>
          <button
            onClick={() => onClick(id)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {actionLabel}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default RecommendationCard;

