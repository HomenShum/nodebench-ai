/**
 * TaskSessionCard - Card component for displaying task session summary
 * 
 * Features:
 * - Status indicator with icon and color
 * - Task type badge
 * - Duration and token metrics
 * - Click to select for detail view
 */

import React from 'react';
import {
  Clock,
  Zap,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskSession, TaskSessionStatus, TaskSessionType } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// STATUS CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const statusConfig: Record<TaskSessionStatus, { dotColor: string; label: string }> = {
  pending: {
    dotColor: 'bg-content-muted',
    label: 'Pending'
  },
  running: { 
    dotColor: 'bg-[var(--accent-primary)]',
    label: 'Running' 
  },
  completed: {
    dotColor: 'bg-emerald-500',
    label: 'Completed'
  },
  failed: {
    dotColor: 'bg-red-500',
    label: 'Failed'
  },
  cancelled: {
    dotColor: 'bg-content-secondary',
    label: 'Cancelled'
  },
};

const typeConfig: Record<TaskSessionType, { dotColor: string; label: string }> = {
  manual: {
    dotColor: 'bg-content-secondary',
    label: 'Manual'
  },
  cron: {
    dotColor: 'bg-content-secondary',
    label: 'Automated'
  },
  scheduled: {
    dotColor: 'bg-content-secondary',
    label: 'Scheduled'
  },
  agent: {
    dotColor: 'bg-[var(--accent-primary)]',
    label: 'Agent'
  },
  swarm: {
    dotColor: 'bg-[var(--accent-primary)]',
    label: 'Swarm'
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
  return `${Math.floor(ms / 3600000)}h ${Math.round((ms % 3600000) / 60000)}m`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}k`;
  return `${(tokens / 1000000).toFixed(1)}M`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface TaskSessionCardProps {
  session: TaskSession;
  isSelected?: boolean;
  onClick?: () => void;
}

export function TaskSessionCard({ session, isSelected, onClick }: TaskSessionCardProps) {
  const statusCfg = statusConfig[session.status];
  const typeCfg = typeConfig[session.type];
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border cursor-pointer transition-all",
        "hover:bg-surface-secondary hover:border-[var(--accent-primary)]/30",
        isSelected 
          ? "bg-surface-secondary border-[var(--accent-primary)]/30 ring-1 ring-[var(--accent-primary)]" 
          : "bg-surface border-edge"
      )}
      onClick={onClick}
    >
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-content truncate">
            {session.title.replace(/^Cron:\s*/i, 'Scheduled: ')}
          </h3>
          {session.description && (
            <p className="text-[13px] leading-snug text-content-secondary line-clamp-2 mt-1">
              {session.description}
            </p>
          )}
        </div>
        <div className="inline-flex items-center gap-1.5 text-[10px] text-content-muted" title={statusCfg.label}>
          <span
            className={cn(
              "w-2 h-2 rounded-full shrink-0",
              statusCfg.dotColor,
              session.status === 'running' && "motion-safe:animate-pulse"
            )}
          />
          <span className="hidden sm:inline">{statusCfg.label}</span>
        </div>
      </div>

      {/* Type badge + Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type badge */}
        <span className="flex items-center gap-1.5 text-[10px] text-content-muted">
          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", typeCfg.dotColor)} />
          <span>{typeCfg.label}</span>
        </span>

        {/* Date */}
        <span className="flex items-center gap-1 text-[11px] text-content-muted">
          <Clock className="w-3 h-3" />
          {formatDate(session.startedAt)}
        </span>

        {/* Duration */}
        {session.totalDurationMs && (
          <>
            <span className="text-content-muted opacity-35">·</span>
            <span className="text-[11px] text-content-muted">
              {formatDuration(session.totalDurationMs)}
            </span>
          </>
        )}

        {/* Tokens */}
        {session.totalTokens && (
          <span className="flex items-center gap-1 text-[11px] text-content-muted" title={`${formatTokens(session.totalTokens)} tokens`}>
            <Zap className="w-3 h-3" />
            {formatTokens(session.totalTokens)}
          </span>
        )}

        {/* Tools count */}
        {session.toolsUsed && session.toolsUsed.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-content-muted" title={`${session.toolsUsed.length} ${session.toolsUsed.length === 1 ? 'tool' : 'tools'} used`}>
            <Wrench className="w-3 h-3" />
            {session.toolsUsed.length}
          </span>
        )}
      </div>

      {/* Error message if failed */}
      {session.status === 'failed' && session.errorMessage && (
        <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
            {session.errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}

export default TaskSessionCard;
