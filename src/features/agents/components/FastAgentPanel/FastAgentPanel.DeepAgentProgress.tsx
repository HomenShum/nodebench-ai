/**
 * FastAgentPanel.DeepAgentProgress.tsx
 *
 * Deep Agent 2.0 Progress Indicator
 *
 * Displays real-time progress for long-running agent operations:
 * - Search and context gathering
 * - Reasoning and task tracking
 * - Delegation to specialized agents
 * - Multi-step workflow execution
 *
 * This component addresses the latency challenge of Deep Agent 2.0
 * by providing progressive feedback to keep users informed.
 */

import React, { useState, useEffect } from 'react';
import { Loader2, Search, Brain, Users, CheckCircle, Clock, Zap } from 'lucide-react';

export interface DeepAgentProgressStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  duration?: number; // in milliseconds
  details?: string;
}

export interface DeepAgentProgressProps {
  steps: DeepAgentProgressStep[];
  currentStepId?: string;
  estimatedTotalDuration?: number; // in milliseconds
  onCancel?: () => void;
  showTimeline?: boolean;
}

const STEP_ICONS: Record<string, React.ReactNode> = {
  search: <Search className="w-4 h-4" />,
  context: <Search className="w-4 h-4" />,
  reasoning: <Brain className="w-4 h-4" />,
  delegation: <Users className="w-4 h-4" />,
  execution: <Zap className="w-4 h-4" />,
  completion: <CheckCircle className="w-4 h-4" />,
};

export function DeepAgentProgress({
  steps,
  currentStepId,
  estimatedTotalDuration,
  onCancel,
  showTimeline = true,
}: DeepAgentProgressProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStepIcon = (step: DeepAgentProgressStep) => {
    const iconKey = step.id.split('_')[0]; // e.g., "search_context" -> "search"
    return STEP_ICONS[iconKey] || <Loader2 className="w-4 h-4" />;
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)]">
            Deep Agent Processing
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(elapsedTime)}</span>
          </div>
          {estimatedTotalDuration && (
            <span className="text-[var(--text-muted)] dark:text-[var(--text-secondary)]">
              / ~{formatDuration(estimatedTotalDuration)}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full bg-[var(--border-color)] dark:bg-[var(--bg-secondary)] rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 dark:from-violet-400 dark:to-indigo-400 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)]">
          <span>{completedSteps} of {steps.length} steps completed</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
      </div>

      {/* Timeline */}
      {showTimeline && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {steps.map((step, index) => {
            const isActive = step.id === currentStepId;
            const isCompleted = step.status === 'completed';
            const isError = step.status === 'error';
            const isPending = step.status === 'pending';

            return (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-2 rounded-md transition-all ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700'
                    : isCompleted
                    ? 'bg-green-50 dark:bg-green-950/20'
                    : isError
                    ? 'bg-red-50 dark:bg-red-950/20'
                    : 'opacity-50'
                }`}
              >
                {/* Icon */}
                <div
                  className={`flex-shrink-0 mt-0.5 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 animate-pulse'
                      : isCompleted
                      ? 'text-green-600 dark:text-green-400'
                      : isError
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-[var(--text-muted)] dark:text-[var(--text-secondary)]'
                  }`}
                >
                  {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isCompleted && <CheckCircle className="w-4 h-4" />}
                  {isPending && getStepIcon(step)}
                  {isError && <span className="text-xs">⚠️</span>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isActive
                          ? 'text-blue-900 dark:text-blue-100'
                          : isCompleted
                          ? 'text-green-900 dark:text-green-100'
                          : isError
                          ? 'text-red-900 dark:text-red-100'
                          : 'text-[var(--text-primary)] dark:text-[var(--text-muted)]'
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.duration && (
                      <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] flex-shrink-0">
                        {formatDuration(step.duration)}
                      </span>
                    )}
                  </div>
                  {step.details && (
                    <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] mt-0.5 truncate">
                      {step.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      {onCancel && (
        <div className="flex justify-end pt-2 border-t border-[var(--border-color)] dark:border-[var(--border-color)]">
          <button
            onClick={onCancel}
            className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-muted)] hover:text-[var(--text-primary)] dark:hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel Operation
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Preset step configurations for common Deep Agent 2.0 workflows
 */
export const DEEP_AGENT_WORKFLOW_PRESETS = {
  documentAnalysis: [
    { id: 'search_context', label: 'Gathering context', status: 'pending' as const },
    { id: 'reasoning_plan', label: 'Planning analysis', status: 'pending' as const },
    { id: 'delegation_document', label: 'Delegating to DocumentAgent', status: 'pending' as const },
    { id: 'execution_analysis', label: 'Analyzing document', status: 'pending' as const },
    { id: 'completion', label: 'Completing response', status: 'pending' as const },
  ],
  documentEditing: [
    { id: 'search_context', label: 'Understanding request', status: 'pending' as const },
    { id: 'reasoning_plan', label: 'Planning edits', status: 'pending' as const },
    { id: 'delegation_document', label: 'Delegating to DocumentAgent', status: 'pending' as const },
    { id: 'execution_edit', label: 'Applying edits', status: 'pending' as const },
    { id: 'completion', label: 'Verifying changes', status: 'pending' as const },
  ],
  spreadsheetCreation: [
    { id: 'search_context', label: 'Parsing data requirements', status: 'pending' as const },
    { id: 'reasoning_plan', label: 'Structuring spreadsheet', status: 'pending' as const },
    { id: 'execution_create', label: 'Creating spreadsheet', status: 'pending' as const },
    { id: 'execution_format', label: 'Applying formatting', status: 'pending' as const },
    { id: 'completion', label: 'Finalizing document', status: 'pending' as const },
  ],
  multiStepResearch: [
    { id: 'search_initial', label: 'Initial search', status: 'pending' as const },
    { id: 'context_gathering', label: 'Gathering context from sources', status: 'pending' as const },
    { id: 'reasoning_synthesis', label: 'Synthesizing information', status: 'pending' as const },
    { id: 'delegation_specialist', label: 'Delegating to specialist agents', status: 'pending' as const },
    { id: 'execution_research', label: 'Deep research execution', status: 'pending' as const },
    { id: 'execution_analysis', label: 'Analyzing findings', status: 'pending' as const },
    { id: 'completion', label: 'Generating final report', status: 'pending' as const },
  ],
};

/**
 * Hook for managing Deep Agent progress state
 */
export function useDeepAgentProgress(workflowType: keyof typeof DEEP_AGENT_WORKFLOW_PRESETS) {
  const [steps, setSteps] = useState<DeepAgentProgressStep[]>(
    DEEP_AGENT_WORKFLOW_PRESETS[workflowType]
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const advanceStep = (details?: string) => {
    setSteps(prev => {
      const updated = [...prev];
      if (currentStepIndex < updated.length) {
        updated[currentStepIndex] = {
          ...updated[currentStepIndex],
          status: 'completed',
          duration: Date.now() - (updated[currentStepIndex] as any)._startTime,
        };
      }
      if (currentStepIndex + 1 < updated.length) {
        updated[currentStepIndex + 1] = {
          ...updated[currentStepIndex + 1],
          status: 'active',
          details,
          _startTime: Date.now(),
        } as any;
      }
      return updated;
    });
    setCurrentStepIndex(prev => Math.min(prev + 1, steps.length - 1));
  };

  const setStepError = (error: string) => {
    setSteps(prev => {
      const updated = [...prev];
      if (currentStepIndex < updated.length) {
        updated[currentStepIndex] = {
          ...updated[currentStepIndex],
          status: 'error',
          details: error,
        };
      }
      return updated;
    });
  };

  const reset = () => {
    setSteps(DEEP_AGENT_WORKFLOW_PRESETS[workflowType]);
    setCurrentStepIndex(0);
  };

  return {
    steps,
    currentStepId: steps[currentStepIndex]?.id,
    advanceStep,
    setStepError,
    reset,
  };
}
