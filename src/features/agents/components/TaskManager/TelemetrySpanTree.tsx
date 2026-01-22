/**
 * TelemetrySpanTree - Hierarchical span visualization
 * 
 * Features:
 * - Parent-child hierarchy with indentation
 * - Span type icons and colors
 * - Duration and status indicators
 * - Expandable/collapsible nodes
 */

import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown,
  Bot,
  Cpu,
  Wrench,
  Shield,
  ArrowRightLeft,
  Search,
  GitBranch,
  Sparkles,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskSpan, SpanType, SpanStatus } from './types';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPAN TYPE CONFIGURATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const spanTypeConfig: Record<SpanType, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  agent: {
    icon: <Bot className="w-3 h-3" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Agent'
  },
  generation: {
    icon: <Sparkles className="w-3 h-3" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Generation'
  },
  tool: {
    icon: <Wrench className="w-3 h-3" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Tool'
  },
  guardrail: {
    icon: <Shield className="w-3 h-3" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Guardrail'
  },
  handoff: {
    icon: <ArrowRightLeft className="w-3 h-3" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    label: 'Handoff'
  },
  retrieval: {
    icon: <Search className="w-3 h-3" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    label: 'Retrieval'
  },
  delegation: {
    icon: <GitBranch className="w-3 h-3" />,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    label: 'Delegation'
  },
  custom: {
    icon: <Cpu className="w-3 h-3" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    label: 'Custom'
  },
};

const spanStatusConfig: Record<SpanStatus, { icon: React.ReactNode; color: string }> = {
  running: { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: 'text-blue-500' },
  completed: { icon: <CheckCircle2 className="w-3 h-3" />, color: 'text-emerald-500' },
  error: { icon: <AlertCircle className="w-3 h-3" />, color: 'text-red-500' },
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UTILITIES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// SPAN NODE COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface SpanNodeProps {
  span: TaskSpan;
  children?: TaskSpan[];
  childrenByParent: Record<string, TaskSpan[]>;
  defaultExpanded?: boolean;
}

function SpanNode({ span, childrenByParent, defaultExpanded = true }: SpanNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const typeCfg = spanTypeConfig[span.spanType];
  const statusCfg = spanStatusConfig[span.status];
  const children = childrenByParent[span._id as string] || [];
  const hasChildren = children.length > 0;

  return (
    <div className="relative">
      {/* Span row */}
      <div 
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded-md",
          "hover:bg-[var(--bg-secondary)] transition-colors",
          hasChildren && "cursor-pointer"
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        style={{ marginLeft: `${span.depth * 16}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          isExpanded 
            ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        ) : (
          <div className="w-3.5 h-3.5" /> // Spacer
        )}

        {/* Span type icon */}
        <span className={cn("flex items-center justify-center w-5 h-5 rounded", typeCfg.bgColor, typeCfg.color)}>
          {typeCfg.icon}
        </span>

        {/* Name */}
        <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate">
          {span.name}
        </span>

        {/* Duration */}
        {span.durationMs !== undefined && (
          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
            {formatDuration(span.durationMs)}
          </span>
        )}

        {/* Status */}
        <span className={statusCfg.color}>{statusCfg.icon}</span>
      </div>

      {/* Error message */}
      {span.error && (
        <div
          className="ml-8 mt-1 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          style={{ marginLeft: `${span.depth * 16 + 32}px` }}
        >
          <p className="text-[10px] text-red-600 dark:text-red-400">
            {span.error.message}
          </p>
        </div>
      )}

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="border-l border-[var(--border-color)]" style={{ marginLeft: `${span.depth * 16 + 12}px` }}>
          {children.map((child) => (
            <SpanNode
              key={child._id}
              span={child}
              childrenByParent={childrenByParent}
              defaultExpanded={child.depth < 2}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MAIN COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

interface TelemetrySpanTreeProps {
  spans: TaskSpan[];
  rootSpans: TaskSpan[];
  childrenByParent: Record<string, TaskSpan[]>;
  className?: string;
}

export function TelemetrySpanTree({ spans, rootSpans, childrenByParent, className }: TelemetrySpanTreeProps) {
  if (spans.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-8 text-center", className)}>
        <Cpu className="w-8 h-8 text-[var(--text-muted)] mb-2" />
        <p className="text-sm text-[var(--text-secondary)]">No spans recorded</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Telemetry spans will appear here as the agent executes
        </p>
      </div>
    );
  }

  // Summary stats
  const completedSpans = spans.filter(s => s.status === 'completed').length;
  const errorSpans = spans.filter(s => s.status === 'error').length;
  const totalDuration = spans.reduce((acc, s) => acc + (s.durationMs || 0), 0);

  return (
    <div className={className}>
      {/* Summary header */}
      <div className="flex items-center gap-3 mb-3 px-2 py-1.5 bg-[var(--bg-secondary)] rounded-md">
        <span className="text-xs text-[var(--text-primary)] font-medium">
          {spans.length} spans
        </span>
        <span className="text-[10px] text-emerald-600">
          {completedSpans} completed
        </span>
        {errorSpans > 0 && (
          <span className="text-[10px] text-red-600">
            {errorSpans} errors
          </span>
        )}
        <span className="text-[10px] text-[var(--text-muted)] ml-auto">
          Total: {formatDuration(totalDuration)}
        </span>
      </div>

      {/* Span tree */}
      <div className="space-y-0.5">
        {rootSpans.map((span) => (
          <SpanNode
            key={span._id}
            span={span}
            childrenByParent={childrenByParent}
            defaultExpanded={true}
          />
        ))}
      </div>
    </div>
  );
}

export default TelemetrySpanTree;


