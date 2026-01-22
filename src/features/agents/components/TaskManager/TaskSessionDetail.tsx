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
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TelemetrySpanTree } from './TelemetrySpanTree';
import type { TaskSession, TaskTrace, TaskSpan } from './types';
import type { Id } from '../../../../../convex/_generated/dataModel';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UTILITIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TRACE ITEM COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
    : trace.status === 'completed'
    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
    : <AlertCircle className="w-3.5 h-3.5 text-red-500" />;

  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
      {/* Trace header */}
      <button
        type="button"
        className="w-full flex items-center gap-2 p-3 hover:bg-[var(--bg-secondary)] transition-colors"
        onClick={onToggle}
      >
        {isExpanded 
          ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
          : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
        }
        
        <GitBranch className="w-4 h-4 text-purple-500" />
        
        <span className="flex-1 text-sm font-medium text-[var(--text-primary)] text-left truncate">
          {trace.workflowName}
        </span>

        {trace.tokenUsage && (
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Zap className="w-3 h-3" />
            {formatTokens(trace.tokenUsage.total)}
          </span>
        )}

        {trace.totalDurationMs && (
          <span className="text-xs text-[var(--text-muted)]">
            {formatDuration(trace.totalDurationMs)}
          </span>
        )}

        {statusIcon}
      </button>

      {/* Expanded content - Span tree */}
      {isExpanded && (
        <div className="border-t border-[var(--border-color)] p-3 bg-[var(--bg-primary)]">
          {!spansData ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-[var(--text-muted)] animate-spin" />
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
        <Loader2 className="w-6 h-6 text-[var(--text-muted)] animate-spin" />
      </div>
    );
  }

  const { session, traces } = sessionData;

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-[var(--border-color)]">
        {onBack && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-2"
            onClick={onBack}
          >
            <ChevronLeft className="w-4 h-4" />
            Back to list
          </button>
        )}

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {session.title}
        </h2>

        {session.description && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {session.description}
          </p>
        )}

        {/* Metrics row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5" />
            {formatDateTime(session.startedAt)}
          </span>

          {session.totalDurationMs && (
            <span className="text-xs text-[var(--text-muted)]">
              Duration: {formatDuration(session.totalDurationMs)}
            </span>
          )}

          {session.totalTokens && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Zap className="w-3.5 h-3.5" />
              {formatTokens(session.totalTokens)} tokens
            </span>
          )}

          {session.toolsUsed && session.toolsUsed.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Wrench className="w-3.5 h-3.5" />
              {session.toolsUsed.length} tools
            </span>
          )}

          {session.agentsInvolved && session.agentsInvolved.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Users className="w-3.5 h-3.5" />
              {session.agentsInvolved.length} agents
            </span>
          )}
        </div>
      </div>

      {/* Traces section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-[var(--accent-primary)]" />
          <h3 className="text-sm font-medium text-[var(--text-primary)]">
            Traces ({traces.length})
          </h3>
        </div>

        {traces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <GitBranch className="w-8 h-8 text-[var(--text-muted)] mb-2" />
            <p className="text-sm text-[var(--text-secondary)]">No traces recorded</p>
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


