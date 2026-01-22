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
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle,
  Loader2,
  Bot,
  Calendar,
  Timer,
  Zap,
  Users,
  Wrench,
  PlayCircle,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskSession, TaskSessionStatus, TaskSessionType } from './types';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// STATUS CONFIGURATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const statusConfig: Record<TaskSessionStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pending: {
    icon: <Circle className="w-3.5 h-3.5" />,
    color: 'text-[var(--text-muted)]',
    bgColor: 'bg-[var(--bg-hover)]',
    label: 'Pending'
  },
  running: { 
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, 
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Running' 
  },
  completed: { 
    icon: <CheckCircle2 className="w-3.5 h-3.5" />, 
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    label: 'Completed' 
  },
  failed: { 
    icon: <AlertCircle className="w-3.5 h-3.5" />, 
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'Failed' 
  },
  cancelled: { 
    icon: <XCircle className="w-3.5 h-3.5" />, 
    color: 'text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Cancelled' 
  },
};

const typeConfig: Record<TaskSessionType, { icon: React.ReactNode; color: string; label: string }> = {
  manual: {
    icon: <PlayCircle className="w-3 h-3" />,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    label: 'Manual'
  },
  cron: {
    icon: <Timer className="w-3 h-3" />,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    label: 'Cron'
  },
  scheduled: {
    icon: <Calendar className="w-3 h-3" />,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    label: 'Scheduled'
  },
  agent: {
    icon: <Bot className="w-3 h-3" />,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30',
    label: 'Agent'
  },
  swarm: {
    icon: <Users className="w-3 h-3" />,
    color: 'text-teal-600 bg-teal-100 dark:bg-teal-900/30',
    label: 'Swarm'
  },
};

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
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// COMPONENT
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
        "hover:bg-[var(--bg-secondary)] hover:border-[var(--accent-primary)]",
        isSelected 
          ? "bg-[var(--bg-secondary)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]" 
          : "bg-[var(--bg-primary)] border-[var(--border-color)]"
      )}
      onClick={onClick}
    >
      {/* Header: Title + Status */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[var(--text-primary)] truncate">
            {session.title}
          </h3>
          {session.description && (
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">
              {session.description}
            </p>
          )}
        </div>
        <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium", statusCfg.bgColor, statusCfg.color)}>
          {statusCfg.icon}
          <span className="hidden sm:inline">{statusCfg.label}</span>
        </div>
      </div>

      {/* Type badge + Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type badge */}
        <span className={cn("flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded", typeCfg.color)}>
          {typeCfg.icon}
          {typeCfg.label}
        </span>

        {/* Date */}
        <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
          <Clock className="w-3 h-3" />
          {formatDate(session.startedAt)}
        </span>

        {/* Duration */}
        {session.totalDurationMs && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {formatDuration(session.totalDurationMs)}
          </span>
        )}

        {/* Tokens */}
        {session.totalTokens && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Zap className="w-3 h-3" />
            {formatTokens(session.totalTokens)}
          </span>
        )}

        {/* Tools count */}
        {session.toolsUsed && session.toolsUsed.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
            <Wrench className="w-3 h-3" />
            {session.toolsUsed.length}
          </span>
        )}
      </div>

      {/* Error message if failed */}
      {session.status === 'failed' && session.errorMessage && (
        <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-[10px] text-red-600 dark:text-red-400 line-clamp-2">
            {session.errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}

export default TaskSessionCard;


