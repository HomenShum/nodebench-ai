// src/components/FastAgentPanel/LiveEventCard.tsx
// Modern AG-UI card component for displaying live agent events

import React from 'react';
import { 
  Wrench, 
  CheckCircle2, 
  XCircle, 
  Bot, 
  Loader2, 
  Zap,
  Search,
  FileText,
  Database,
  Globe,
  Brain
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type LiveEventType = 
  | 'tool_start' 
  | 'tool_end' 
  | 'tool_error'
  | 'agent_spawn' 
  | 'agent_complete'
  | 'step_complete'
  | 'thinking'
  | 'memory_read'
  | 'memory_write';

export type LiveEventStatus = 'running' | 'success' | 'error' | 'pending';

export interface LiveEvent {
  id: string;
  type: LiveEventType;
  status: LiveEventStatus;
  title: string;
  details?: string;
  toolName?: string;
  agentName?: string;
  timestamp: number;
  duration?: number; // ms
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function getEventIcon(event: LiveEvent) {
  const iconClass = "w-3.5 h-3.5";
  
  switch (event.type) {
    case 'tool_start':
    case 'tool_end':
    case 'tool_error':
      // Try to guess icon based on tool name
      if (event.toolName?.toLowerCase().includes('search')) {
        return <Search className={iconClass} />;
      }
      if (event.toolName?.toLowerCase().includes('document')) {
        return <FileText className={iconClass} />;
      }
      if (event.toolName?.toLowerCase().includes('memory')) {
        return <Database className={iconClass} />;
      }
      if (event.toolName?.toLowerCase().includes('web') || event.toolName?.toLowerCase().includes('linkup')) {
        return <Globe className={iconClass} />;
      }
      return <Wrench className={iconClass} />;
    
    case 'agent_spawn':
    case 'agent_complete':
      return <Bot className={iconClass} />;
    
    case 'thinking':
      return <Brain className={iconClass} />;
    
    case 'memory_read':
    case 'memory_write':
      return <Database className={iconClass} />;
    
    case 'step_complete':
      return <Zap className={iconClass} />;
    
    default:
      return <Zap className={iconClass} />;
  }
}

function getStatusStyles(status: LiveEventStatus) {
  switch (status) {
    case 'running':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-violet-700 dark:text-violet-400',
        icon: 'text-violet-500',
        dot: 'bg-violet-500',
      };
    case 'success':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-400',
        icon: 'text-green-500',
        dot: 'bg-green-500',
      };
    case 'error':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        icon: 'text-red-500',
        dot: 'bg-red-500',
      };
    case 'pending':
    default:
      return {
        bg: 'bg-[var(--bg-secondary)] dark:bg-gray-800/50',
        border: 'border-[var(--border-color)] dark:border-[var(--border-color)]',
        text: 'text-[var(--text-secondary)] dark:text-[var(--text-secondary)]',
        icon: 'text-[var(--text-muted)]',
        dot: 'bg-[var(--text-muted)]',
      };
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface LiveEventCardProps {
  event: LiveEvent;
  showTimeline?: boolean;
  isLast?: boolean;
}

export function LiveEventCard({ event, showTimeline = true, isLast = false }: LiveEventCardProps) {
  const styles = getStatusStyles(event.status);
  const icon = getEventIcon(event);

  return (
    <div className={cn(
      "relative",
      showTimeline && "pl-6"
    )}>
      {/* Timeline connector */}
      {showTimeline && (
        <>
          {/* Vertical line */}
          {!isLast && (
            <div className="absolute left-[9px] top-5 bottom-0 w-0.5 bg-[var(--border-color)] dark:bg-[var(--border-color)]" />
          )}
          {/* Status dot */}
          <div className={cn(
            "absolute left-1 top-2 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-[var(--bg-primary)] dark:bg-gray-900 z-10",
            event.status === 'running' && "border-violet-500 animate-pulse",
            event.status === 'success' && "border-green-500",
            event.status === 'error' && "border-red-500",
            event.status === 'pending' && "border-[var(--text-muted)]"
          )}>
            <div className={cn("w-1.5 h-1.5 rounded-full", styles.dot)} />
          </div>
        </>
      )}

      {/* Card */}
      <div className={cn(
        "mb-2 rounded-lg border p-2.5 transition-all duration-200",
        "hover:shadow-sm",
        styles.bg,
        styles.border,
        event.status === 'running' && "animate-in fade-in slide-in-from-left-2 duration-300"
      )}>
        {/* Header row */}
        <div className="flex items-center gap-2">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 p-1 rounded",
            styles.bg,
            styles.icon
          )}>
            {event.status === 'running' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : event.status === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : event.status === 'error' ? (
              <XCircle className="w-3.5 h-3.5" />
            ) : (
              icon
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className={cn(
              "text-xs font-medium truncate",
              styles.text
            )}>
              {event.title}
            </div>
            {event.toolName && (
              <div className="text-[10px] font-mono text-[var(--text-secondary)] dark:text-[var(--text-secondary)] truncate">
                {event.toolName}
              </div>
            )}
          </div>

          {/* Status badge / Duration */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            {event.duration !== undefined && event.status === 'success' && (
              <span className="text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)]">
                {formatDuration(event.duration)}
              </span>
            )}
            {event.status === 'running' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium">
                Running
              </span>
            )}
          </div>
        </div>

        {/* Details (if any) */}
        {event.details && (
          <div className="mt-1.5 text-[10px] text-[var(--text-secondary)] dark:text-[var(--text-secondary)] line-clamp-2">
            {event.details}
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-1 text-[9px] text-[var(--text-muted)] dark:text-[var(--text-muted)]">
          {formatTimestamp(event.timestamp)}
        </div>
      </div>
    </div>
  );
}

export default LiveEventCard;
