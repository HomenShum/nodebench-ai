// src/components/views/WorkflowMetricsBar.tsx
// Clean, simple metrics display for agent workflow progress
// Displays: sources explored, tools used, agents called

import React from 'react';
import { FileText, Wrench, Users, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowMetrics {
  sourcesExplored: number;
  toolsUsed: string[];
  agentsCalled: string[];
  totalDurationMs?: number;
  filesChanged?: number;
  filesExamined?: number;
  editsCount?: number;
}

interface WorkflowMetricsBarProps {
  metrics: WorkflowMetrics;
  isRunning?: boolean;
  className?: string;
  compact?: boolean;
}

/**
 * WorkflowMetricsBar - Clean metrics display like Augment's style
 * Shows: "12 sources | 3 tools | 2 agents" with icons
 */
export function WorkflowMetricsBar({
  metrics,
  isRunning = false,
  className,
  compact = false,
}: WorkflowMetricsBarProps) {
  const { sourcesExplored, toolsUsed, agentsCalled, totalDurationMs, editsCount } = metrics;

  const uniqueTools = [...new Set(toolsUsed)];
  const uniqueAgents = [...new Set(agentsCalled)];

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 text-xs text-[var(--text-secondary)]", className)}>
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {sourcesExplored} sources
        </span>
        <span className="text-[var(--text-muted)]">|</span>
        <span className="flex items-center gap-1">
          <Wrench className="w-3 h-3" />
          {uniqueTools.length} tools
        </span>
        <span className="text-[var(--text-muted)]">|</span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {uniqueAgents.length} agents
        </span>
        {totalDurationMs && (
          <>
            <span className="text-[var(--text-muted)]">|</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(totalDurationMs)}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg",
      className
    )}>
      {/* Sources */}
      <MetricPill
        icon={<FileText className="w-3.5 h-3.5" />}
        value={sourcesExplored}
        label="Sources"
        color="blue"
      />

      {/* Tools */}
      <MetricPill
        icon={<Wrench className="w-3.5 h-3.5" />}
        value={uniqueTools.length}
        label="Tools Used"
        color="purple"
        tooltip={uniqueTools.length > 0 ? uniqueTools.join(', ') : undefined}
      />

      {/* Agents */}
      <MetricPill
        icon={<Users className="w-3.5 h-3.5" />}
        value={uniqueAgents.length}
        label="Agents"
        color="green"
        tooltip={uniqueAgents.length > 0 ? uniqueAgents.join(', ') : undefined}
      />

      {/* Edits (if any) */}
      {editsCount !== undefined && editsCount > 0 && (
        <MetricPill
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          value={editsCount}
          label="Edits"
          color="amber"
        />
      )}

      {/* Duration */}
      {totalDurationMs && !isRunning && (
        <MetricPill
          icon={<Clock className="w-3.5 h-3.5" />}
          value={formatDuration(totalDurationMs)}
          label=""
          color="gray"
        />
      )}

      {/* Running indicator */}
      {isRunning && (
        <div className="flex items-center gap-1.5 text-xs text-blue-600">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          Running...
        </div>
      )}
    </div>
  );
}

interface MetricPillProps {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'gray';
  tooltip?: string;
}

const colorClasses = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  gray: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-color)]',
};

function MetricPill({ icon, value, label, color, tooltip }: MetricPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
        colorClasses[color]
      )}
      title={tooltip}
    >
      {icon}
      <span className="font-semibold">{value}</span>
      {label && <span className="font-normal opacity-75">{label}</span>}
    </div>
  );
}

/**
 * Inline metrics display for headers - matches Augment's clean style
 */
export function InlineMetrics({
  metrics,
  className,
}: {
  metrics: WorkflowMetrics;
  className?: string;
}) {
  const uniqueTools = [...new Set(metrics.toolsUsed)];
  const uniqueAgents = [...new Set(metrics.agentsCalled)];

  return (
    <div className={cn("flex items-center gap-1 text-xs text-[var(--text-secondary)]", className)}>
      <span>{metrics.sourcesExplored} sources</span>
      <span>•</span>
      <span>{uniqueTools.length} tools</span>
      <span>•</span>
      <span>{uniqueAgents.length} agents</span>
    </div>
  );
}

/**
 * Helper to create empty metrics object
 */
export function createEmptyMetrics(): WorkflowMetrics {
  return {
    sourcesExplored: 0,
    toolsUsed: [],
    agentsCalled: [],
    totalDurationMs: 0,
    editsCount: 0,
  };
}

/**
 * Helper to merge/accumulate metrics
 */
export function mergeMetrics(
  existing: WorkflowMetrics,
  newMetrics: Partial<WorkflowMetrics>
): WorkflowMetrics {
  return {
    sourcesExplored: (existing.sourcesExplored || 0) + (newMetrics.sourcesExplored || 0),
    toolsUsed: [...(existing.toolsUsed || []), ...(newMetrics.toolsUsed || [])],
    agentsCalled: [...(existing.agentsCalled || []), ...(newMetrics.agentsCalled || [])],
    totalDurationMs: newMetrics.totalDurationMs ?? existing.totalDurationMs,
    editsCount: (existing.editsCount || 0) + (newMetrics.editsCount || 0),
  };
}

export default WorkflowMetricsBar;
