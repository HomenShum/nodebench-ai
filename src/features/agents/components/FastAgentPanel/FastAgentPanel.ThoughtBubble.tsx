// src/components/FastAgentPanel/FastAgentPanel.ThoughtBubble.tsx
// Component for displaying agent reasoning/thinking

import React from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThoughtBubbleProps {
  thought: string;
  isStreaming?: boolean;
  className?: string;
}

/**
 * ThoughtBubble - Displays agent's reasoning between tasks
 * Shows the "why" behind agent actions for transparency
 */
export function ThoughtBubble({ 
  thought, 
  isStreaming = false,
  className 
}: ThoughtBubbleProps) {
  if (!thought) return null;

  return (
    <div className={cn(
      "mb-4 p-3 rounded-lg border-l-4 border-yellow-500",
      "bg-yellow-50/50 backdrop-blur-sm",
      "transition-all duration-300",
      isStreaming && "animate-in slide-in-from-top-2",
      className
    )}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {isStreaming ? (
            <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
          ) : (
            <Brain className="h-4 w-4 text-yellow-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">💭</span>
            <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">
              Agent Reasoning
            </span>
          </div>
          <p className="text-sm text-yellow-800 italic leading-relaxed">
            {thought}
          </p>
        </div>
      </div>
    </div>
  );
}
