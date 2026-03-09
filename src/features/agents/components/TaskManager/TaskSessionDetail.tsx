/**
 * TaskSessionDetail - Detailed view of a task session with traces and spans
 * 
 * Features:
 * - Full session description
 * - Trace list with expandable telemetry
 * - Span tree visualization
 * - Token usage and timing metrics
 */

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { 
  ChevronLeft,
  Clock, 
  Zap,
  Wrench,
  Users,
  FileText,
  GitBranch,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Target,
  Link2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TelemetrySpanTree } from './TelemetrySpanTree';
import type { TaskSession, TaskTrace, TaskSpan } from './types';
import type { Id } from '../../../../../convex/_generated/dataModel';
import {
  formatDurationCompact,
  formatGoalReference,
  formatUsd,
  getCrossCheckPresentation,
} from '../oracleControlTowerUtils';

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toLocaleString();
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatLinkLabel(href?: string): string {
  if (!href) return "Reference";
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TRACE ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface TraceItemProps {
  trace: TaskTrace;
  isExpanded: boolean;
  onToggle: () => void;
}

function TraceItem({ trace, isExpanded, onToggle }: TraceItemProps) {
  // Fetch spans when expanded
  const spansData = useQuery(
    api.domains.taskManager.queries.getTraceSpans,
    isExpanded ? { traceId: trace._id } : 'skip'
  );

  const statusIcon = trace.status === 'running' 
    ? <Loader2 className="w-3.5 h-3.5 motion-safe:animate-spin text-indigo-600 dark:text-indigo-400" />
    : trace.status === 'completed'
    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
    : <AlertCircle className="w-3.5 h-3.5 text-red-500" />;

  return (
    <div className="border border-edge rounded-lg overflow-hidden">
      {/* Trace header */}
      <button
        type="button"
        className="w-full flex items-center gap-2 p-3 hover:bg-surface-secondary transition-colors"
        onClick={onToggle}
      >
        {isExpanded 
          ? <ChevronDown className="w-4 h-4 text-content-muted" />
          : <ChevronRight className="w-4 h-4 text-content-muted" />
        }
        
        <GitBranch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        
        <span className="flex-1 text-sm font-medium text-content text-left truncate">
          {trace.workflowName}
        </span>

        {trace.tokenUsage && (
          <span className="flex items-center gap-1 text-xs text-content-muted">
            <Zap className="w-3 h-3" />
            {formatTokens(trace.tokenUsage.total)}
          </span>
        )}

            {trace.totalDurationMs && (
              <span className="text-xs text-content-muted">
                {formatDurationCompact(trace.totalDurationMs)}
              </span>
            )}

        {statusIcon}
      </button>

      {/* Expanded content - Span tree */}
      {isExpanded && (
        <div className="border-t border-edge p-3 bg-surface">
          {!spansData ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-content-muted motion-safe:animate-spin" />
            </div>
          ) : (
            <TelemetrySpanTree 
              spans={spansData.spans as TaskSpan[]}
              rootSpans={spansData.rootSpans as TaskSpan[]}
              childrenByParent={spansData.childrenByParent as Record<string, TaskSpan[]>}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface TaskSessionDetailProps {
  sessionId: Id<"agentTaskSessions">;
  onBack?: () => void;
  className?: string;
}

export function TaskSessionDetail({ sessionId, onBack, className }: TaskSessionDetailProps) {
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  // Fetch session detail with traces
  const sessionData = useQuery(
    api.domains.taskManager.queries.getTaskSessionDetail,
    { sessionId }
  );

  const toggleTrace = (traceId: string) => {
    setExpandedTraces(prev => {
      const next = new Set(prev);
      if (next.has(traceId)) {
        next.delete(traceId);
      } else {
        next.add(traceId);
      }
      return next;
    });
  };

  if (!sessionData) {
    return (
      <div className={cn("flex items-center justify-center h-full", className)}>
        <Loader2 className="w-6 h-6 text-content-muted motion-safe:animate-spin" />
      </div>
    );
  }

  const { session, traces } = sessionData;
  const crossCheck = getCrossCheckPresentation(session.crossCheckStatus);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-edge">
        {onBack && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-content-secondary hover:text-content mb-2"
            onClick={onBack}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to list
          </button>
        )}

        <h2 className="text-lg font-semibold text-content">
          {session.title}
        </h2>

        {session.description && (
          <p className="text-sm text-content-secondary mt-1">
            {session.description}
          </p>
        )}

        {/* Metrics row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium",
              crossCheck.className,
            )}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {crossCheck.questLabel}
          </span>

          <span className="flex items-center gap-1 text-xs text-content-muted">
            <Clock className="w-3.5 h-3.5" />
            {formatDateTime(session.startedAt)}
          </span>

          {session.totalDurationMs && (
            <span className="text-xs text-content-muted">
              Duration: {formatDurationCompact(session.totalDurationMs)}
            </span>
          )}

          {session.totalTokens && (
            <span className="flex items-center gap-1 text-xs text-content-muted">
              <Zap className="w-3.5 h-3.5" />
              {formatTokens(session.totalTokens)} tokens
            </span>
          )}

          {session.estimatedCostUsd !== undefined && (
            <span className="text-xs text-content-muted">
              Cost: {formatUsd(session.estimatedCostUsd)}
            </span>
          )}

          {session.toolsUsed && session.toolsUsed.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-content-muted">
              <Wrench className="w-3.5 h-3.5" />
              {session.toolsUsed.length} tools
            </span>
          )}

          {session.agentsInvolved && session.agentsInvolved.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-content-muted">
              <Users className="w-3.5 h-3.5" />
              {session.agentsInvolved.length} agents
            </span>
          )}
        </div>

        {(session.goalId || session.deltaFromVision || session.successCriteria?.length || session.sourceRefs?.length) && (
          <div className="mt-4 rounded-lg border border-edge bg-surface p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-content">
              <Target className="w-4 h-4 text-accent" />
              Oracle Cross-Check
            </div>

            {session.goalId && (
              <div className="mt-2 text-xs text-content-muted">
                Goal reference: <span className="font-mono text-content">{formatGoalReference(session.goalId)}</span>
              </div>
            )}

            {session.visionSnapshot && (
              <p className="mt-2 text-sm leading-6 text-content-secondary">{session.visionSnapshot}</p>
            )}

            {session.deltaFromVision && (
              <div className="mt-2 rounded-md border border-edge bg-background/40 p-2 text-xs leading-5 text-content-secondary">
                {session.deltaFromVision}
              </div>
            )}

            {session.successCriteria && session.successCriteria.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">
                  Success Criteria
                </div>
                <ul className="mt-2 space-y-1 text-sm text-content-secondary">
                  {session.successCriteria.map((criterion) => (
                    <li key={criterion} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {session.sourceRefs && session.sourceRefs.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-content-muted">
                  Source References
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {session.sourceRefs.map((ref, idx) => (
                    ref.href ? (
                      <a
                        key={`${ref.label}-${idx}`}
                        href={ref.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface px-2 py-1 text-xs text-content-secondary hover:text-content"
                      >
                        <Link2 className="w-3 h-3" />
                        {ref.label || formatLinkLabel(ref.href)}
                      </a>
                    ) : (
                      <span
                        key={`${ref.label}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-full border border-edge bg-surface px-2 py-1 text-xs text-content-secondary"
                      >
                        <Link2 className="w-3 h-3" />
                        {ref.label}
                      </span>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Traces section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-medium text-content">
            Traces ({traces.length})
          </h3>
        </div>

        {traces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GitBranch className="w-8 h-8 text-content-muted mb-2" />
            <p className="text-sm text-content-secondary">No traces recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {traces.map((trace) => (
              <TraceItem
                key={trace._id}
                trace={trace as TaskTrace}
                isExpanded={expandedTraces.has(trace._id as string)}
                onToggle={() => toggleTrace(trace._id as string)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default TaskSessionDetail;
