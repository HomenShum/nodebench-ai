// src/components/FastAgentPanel/StepTimelineItem.tsx
// Memoized timeline step item for smooth rendering with minimal re-renders

import React, { memo, useCallback } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Loader2, XCircle, Clock, Wrench, Users, FileText, BarChart3, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineStep } from './StepTimeline';

interface StepTimelineItemProps {
  step: TimelineStep;
  isExpanded: boolean;
  onToggle: (stepId: string) => void;
  onSelectToolResult?: (toolName: string, result: unknown, args?: unknown, error?: string) => void;
}

// Agent role icons
const agentIcons = {
  coordinator: Users,
  documentAgent: FileText,
  mediaAgent: BarChart3,
  secAgent: BarChart3,
  webAgent: Globe,
};

// Status icons
const statusIcons = {
  pending: Clock,
  running: Loader2,
  complete: CheckCircle2,
  error: XCircle,
};

// Status colors
const statusColors = {
  pending: 'text-gray-400',
  running: 'text-blue-500',
  complete: 'text-green-500',
  error: 'text-red-500',
};

/**
 * StepTimelineItem - Memoized timeline step component
 * Optimized for smooth rendering with minimal re-renders
 * Uses transform/opacity animations instead of height changes
 */
const StepTimelineItemComponent = memo(
  ({
    step,
    isExpanded,
    onToggle,
    onSelectToolResult,
  }: StepTimelineItemProps) => {
    const hasDetails = step.description || step.result || step.error;
    const StatusIcon = statusIcons[step.status];
    const AgentIcon = step.agentRole ? agentIcons[step.agentRole] : Wrench;

    const handleToggle = useCallback(() => {
      if (hasDetails) {
        onToggle(step.id);
      }
    }, [step.id, hasDetails, onToggle]);

    const handleToolResultClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSelectToolResult && step.toolName) {
          onSelectToolResult(step.toolName, step.result, step.args, step.error);
        }
      },
      [step.toolName, step.result, step.args, step.error, onSelectToolResult]
    );

    return (
      <div className="relative pl-10 animate-fadeIn">
        {/* Timeline Node - GPU-accelerated with transform */}
        <div
          className={cn(
            'absolute left-2 top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center transition-all duration-300',
            step.status === 'complete' && 'border-green-500',
            step.status === 'running' && 'border-blue-500',
            step.status === 'error' && 'border-red-500',
            step.status === 'pending' && 'border-gray-300'
          )}
        >
          <StatusIcon
            className={cn(
              'h-2.5 w-2.5 transition-all duration-300',
              statusColors[step.status],
              step.status === 'running' && 'animate-spin'
            )}
          />
        </div>

        {/* Step Content - Smooth transitions */}
        <div
          className={cn(
            'bg-white border rounded-lg p-3 shadow-sm transition-all duration-200',
            step.status === 'error' && 'border-red-200 bg-red-50',
            step.status === 'running' && 'border-blue-200 bg-blue-50',
            step.status === 'complete' && 'border-green-200',
            hasDetails && 'cursor-pointer hover:shadow-md'
          )}
          onClick={handleToggle}
        >
          {/* Step Header */}
          <div className="flex items-start gap-2">
            {/* Agent/Tool Icon */}
            <div
              className={cn(
                'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors duration-200',
                step.type === 'delegation' && 'bg-purple-100',
                step.type === 'tool' && 'bg-blue-100',
                step.type === 'result' && 'bg-green-100',
                step.type === 'error' && 'bg-red-100'
              )}
            >
              <AgentIcon
                className={cn(
                  'h-3.5 w-3.5 transition-colors duration-200',
                  step.type === 'delegation' && 'text-purple-600',
                  step.type === 'tool' && 'text-blue-600',
                  step.type === 'result' && 'text-green-600',
                  step.type === 'error' && 'text-red-600'
                )}
              />
            </div>

            {/* Step Title and Metadata */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{step.title}</span>
                {step.elapsedMs && (
                  <span className="text-xs text-gray-500">({step.elapsedMs}ms)</span>
                )}
              </div>
              {step.toolName && (
                <button
                  onClick={handleToolResultClick}
                  className="text-xs text-gray-600 mt-0.5 hover:text-blue-600 transition-colors duration-150"
                >
                  Tool:{' '}
                  <code className="bg-gray-100 px-1 rounded hover:bg-blue-100 cursor-pointer">
                    {step.toolName}
                  </code>
                </button>
              )}
            </div>

            {/* Expand/Collapse Icon - Smooth rotation */}
            {hasDetails && (
              <div className="flex-shrink-0">
                <div
                  className={cn(
                    'transition-transform duration-200',
                    isExpanded && 'rotate-90'
                  )}
                >
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            )}
          </div>

          {/* Expanded Details - Smooth opacity transition */}
          {isExpanded && hasDetails && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2 animate-fadeIn">
              {step.description && (
                <div className="text-xs text-gray-600">{step.description}</div>
              )}
              {step.result && (
                <div className="text-xs">
                  <div className="font-medium text-gray-700 mb-2">Results:</div>
                  <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40 text-gray-700">
                    {typeof step.result === 'string'
                      ? step.result
                      : JSON.stringify(step.result, null, 2)}
                  </pre>
                </div>
              )}
              {step.error && (
                <div className="text-xs text-red-600">
                  <div className="font-medium mb-1">Error:</div>
                  <pre className="bg-red-50 p-2 rounded overflow-auto max-h-40">
                    {step.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
  // Custom comparison for memoization
  (prevProps, nextProps) => {
    // Re-render if step data changed
    if (prevProps.step !== nextProps.step) return false;
    // Re-render if expanded state changed
    if (prevProps.isExpanded !== nextProps.isExpanded) return false;
    // Otherwise skip re-render
    return true;
  }
);

StepTimelineItemComponent.displayName = 'StepTimelineItem';

export const StepTimelineItem = StepTimelineItemComponent;

