// src/components/views/TaskPlanPanel.tsx
// Live stateful todo list showing agent workflow progress

import React, { useMemo } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Loader2, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { InlineMetrics, type WorkflowMetrics } from './WorkflowMetricsBar';

export interface TaskStep {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  details?: string;
  durationMs?: number;
  toolName?: string;
  agentName?: string;
  substeps?: TaskStep[];
}

interface TaskPlanPanelProps {
  steps: TaskStep[];
  metrics?: WorkflowMetrics;
  isRunning?: boolean;
  className?: string;
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

/**
 * TaskPlanPanel - Live stateful todo list showing workflow progress
 * 
 * Shows:
 * - Step-by-step tasks with status indicators
 * - Live progress updates
 * - Duration for completed steps
 * - Metrics summary
 */
export function TaskPlanPanel({
  steps,
  metrics,
  isRunning = false,
  className,
  title = "Task Plan",
  collapsible = true,
  defaultExpanded = true,
}: TaskPlanPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  
  // Calculate progress
  const completedCount = steps.filter(s => s.status === 'completed').length;
  const totalCount = steps.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  
  // Determine overall status
  const hasError = steps.some(s => s.status === 'error');
  const isComplete = !hasError && completedCount === totalCount && totalCount > 0;
  const activeStep = steps.find(s => s.status === 'in_progress');

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (steps.length === 0) return null;

  return (
    <div className={cn(
      "border border-gray-200 rounded-lg bg-white overflow-hidden",
      className
    )}>
      {/* Header */}
      <button
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between text-left transition-colors",
          collapsible && "hover:bg-gray-50 cursor-pointer",
          isComplete ? "bg-green-50" : hasError ? "bg-red-50" : "bg-gray-50"
        )}
        disabled={!collapsible}
      >
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center",
            isComplete ? "bg-green-100" : 
            hasError ? "bg-red-100" : 
            isRunning ? "bg-blue-100" : "bg-gray-100"
          )}>
            {isComplete ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : hasError ? (
              <AlertCircle className="w-4 h-4 text-red-600" />
            ) : isRunning ? (
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-gray-500" />
            )}
          </div>
          
          {/* Title and progress */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">{title}</span>
              <span className="text-xs text-gray-500">
                {completedCount} of {totalCount} steps
              </span>
            </div>
            {activeStep && isRunning && (
              <p className="text-xs text-blue-600 mt-0.5 animate-pulse">
                {activeStep.label}...
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Metrics summary */}
          {metrics && (
            <InlineMetrics metrics={metrics} className="hidden sm:flex" />
          )}
          
          {/* Expand/collapse */}
          {collapsible && (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )
          )}
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div 
          className={cn(
            "h-full transition-all duration-500 ease-out",
            isComplete ? "bg-green-500" : hasError ? "bg-red-500" : "bg-blue-500"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Steps list */}
      {isExpanded && (
        <div className="p-4">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100" />
            
            {/* Steps */}
            <div className="space-y-0">
              {steps.map((step, idx) => (
                <TaskStepItem 
                  key={step.id || idx}
                  step={step}
                  isLast={idx === steps.length - 1}
                  formatDuration={formatDuration}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TaskStepItemProps {
  step: TaskStep;
  isLast: boolean;
  formatDuration: (ms?: number) => string;
}

function TaskStepItem({ step, isLast, formatDuration }: TaskStepItemProps) {
  const isPending = step.status === 'pending';
  const isActive = step.status === 'in_progress';
  const isComplete = step.status === 'completed';
  const isError = step.status === 'error';

  return (
    <div className={cn("relative flex gap-3 pb-4", isLast && "pb-0")}>
      {/* Status indicator */}
      <div className="relative z-10 flex-shrink-0">
        <div className={cn(
          "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300",
          isComplete ? "bg-green-500 border-green-500" :
          isActive ? "bg-white border-blue-500 ring-4 ring-blue-50" :
          isError ? "bg-red-500 border-red-500" :
          "bg-white border-gray-200"
        )}>
          {isComplete ? (
            <CheckCircle2 className="w-4 h-4 text-white" />
          ) : isActive ? (
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-white" />
          ) : (
            <Circle className="w-3 h-3 text-gray-300 fill-gray-50" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 pt-0.5 transition-opacity duration-300",
        isPending && "opacity-50"
      )}>
        <div className="flex items-center justify-between">
          <h4 className={cn(
            "text-sm font-medium leading-none",
            isActive ? "text-blue-700" :
            isComplete ? "text-gray-900" :
            isError ? "text-red-700" :
            "text-gray-500"
          )}>
            {step.label}
          </h4>
          
          {/* Duration */}
          {step.durationMs && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatDuration(step.durationMs)}
            </span>
          )}
        </div>
        
        {/* Details */}
        {step.details && (
          <p className={cn(
            "text-xs mt-1 leading-relaxed",
            isError ? "text-red-600" : "text-gray-500"
          )}>
            {step.details}
          </p>
        )}
        
        {/* Tool/Agent info */}
        {(step.toolName || step.agentName) && (
          <div className="flex items-center gap-2 mt-1">
            {step.toolName && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                {step.toolName}
              </span>
            )}
            {step.agentName && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded">
                {step.agentName}
              </span>
            )}
          </div>
        )}

        {/* Substeps */}
        {step.substeps && step.substeps.length > 0 && (
          <div className="mt-2 pl-4 border-l-2 border-gray-100 space-y-2">
            {step.substeps.map((substep, idx) => (
              <div key={substep.id || idx} className="flex items-center gap-2">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  substep.status === 'completed' ? "bg-green-500" :
                  substep.status === 'in_progress' ? "bg-blue-500 animate-pulse" :
                  substep.status === 'error' ? "bg-red-500" :
                  "bg-gray-300"
                )} />
                <span className="text-xs text-gray-600">{substep.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Helper to convert workflow progress steps to TaskStep array
 */
export function workflowProgressToTaskSteps(progress: any): TaskStep[] {
  if (!progress?.steps) return [];
  
  return progress.steps.map((step: any, idx: number) => ({
    id: `step-${idx}`,
    label: step.label || `Step ${idx + 1}`,
    status: step.status === 'in_progress' ? 'in_progress' :
            step.status === 'completed' ? 'completed' :
            step.status === 'error' ? 'error' : 'pending',
    details: step.details,
    durationMs: step.durationMs,
    toolName: step.toolName,
    agentName: step.agentName,
  }));
}

export default TaskPlanPanel;
