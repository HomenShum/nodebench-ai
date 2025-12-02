// src/components/FastAgentPanel/CollapsibleAgentProgress.tsx
// Collapsible section for agent progress details (tools, reasoning, etc.)

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StepTimeline, toolPartsToTimelineSteps } from './StepTimeline';
import type { ToolUIPart } from 'ai';
import type { CompanyOption } from './CompanySelectionCard';
import type { PersonOption } from './PeopleSelectionCard';
import type { EventOption } from './EventSelectionCard';
import type { NewsArticleOption } from './NewsSelectionCard';

interface CollapsibleAgentProgressProps {
  toolParts: ToolUIPart[];
  reasoning?: string;
  isStreaming?: boolean;
  defaultExpanded?: boolean;
  onCompanySelect?: (company: CompanyOption) => void;
  onPersonSelect?: (person: PersonOption) => void;
  onEventSelect?: (event: EventOption) => void;
  onNewsSelect?: (article: NewsArticleOption) => void;
}

/**
 * CollapsibleAgentProgress - Wraps agent process details in an expandable section
 * 
 * This component separates the "polished answer" from the "agent process" for better UX.
 * Users see a clean answer by default, with the option to expand and view detailed agent steps.
 */
export function CollapsibleAgentProgress({
  toolParts,
  reasoning,
  isStreaming,
  defaultExpanded = false,
  onCompanySelect,
  onPersonSelect,
  onEventSelect,
  onNewsSelect,
}: CollapsibleAgentProgressProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Don't render if there's no process to show
  const hasContent = toolParts.length > 0 || reasoning;
  if (!hasContent) return null;

  const stepCount = toolParts.length;

  return (
    <div className="mb-3">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg",
          "border border-gray-200 bg-gray-50 hover:bg-gray-100",
          "transition-colors text-left group",
          isExpanded && "bg-gray-100"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
            isStreaming ? "bg-green-100" : "bg-blue-100"
          )}>
            {isStreaming ? (
              <Zap className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Wrench className="h-3.5 w-3.5 text-blue-600" />
            )}
          </div>

          {/* Label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {isStreaming ? 'Agent Working...' : 'Agent Progress'}
              </span>
              {stepCount > 0 && (
                <span className="text-xs text-gray-500">
                  {stepCount} {stepCount === 1 ? 'step' : 'steps'}
                </span>
              )}
            </div>
            {!isExpanded && (
              <p className="text-xs text-gray-500 truncate">
                Click to view detailed agent actions and tool executions
              </p>
            )}
          </div>

          {/* Expand/collapse icon */}
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors" />
            )}
          </div>
        </div>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Reasoning */}
          {reasoning && (
            <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-start gap-2">
                <span className="text-sm">💭</span>
                <div className="flex-1">
                  <div className="text-xs font-medium text-purple-700 mb-1">Reasoning</div>
                  <p className="text-xs text-purple-600 italic">{reasoning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tool execution timeline */}
          {toolParts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <StepTimeline
                steps={toolPartsToTimelineSteps(toolParts)}
                isStreaming={isStreaming}
                onCompanySelect={onCompanySelect}
                onPersonSelect={onPersonSelect}
                onEventSelect={onEventSelect}
                onNewsSelect={onNewsSelect}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

