import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  Wrench,
  MessageSquare,
  BrainCircuit,
  Database,
  Zap,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export type EventType = 'tool' | 'message' | 'state' | 'delegation' | 'memory' | 'other';

export interface LiveEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  status: 'running' | 'success' | 'error' | 'pending';
  timestamp: Date;
  metadata?: Record<string, any>;
  agentRole?: string;
}

interface LiveEventCardProps {
  event: LiveEvent;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function LiveEventCard({ event, isExpanded: defaultExpanded = false, onToggle }: LiveEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const getIcon = () => {
    switch (event.type) {
      case 'tool': return <Wrench className="w-3.5 h-3.5" />;
      case 'message': return <MessageSquare className="w-3.5 h-3.5" />;
      case 'state': return <Zap className="w-3.5 h-3.5" />;
      case 'delegation': return <ArrowRight className="w-3.5 h-3.5" />;
      case 'memory': return <Database className="w-3.5 h-3.5" />;
      default: return <BrainCircuit className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'running': return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'success': return 'text-green-500 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'error': return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-gray-500 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusDot = () => {
    switch (event.status) {
      case 'running': return <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span></span>;
      case 'success': return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case 'error': return <div className="h-2 w-2 rounded-full bg-red-500" />;
      default: return <div className="h-2 w-2 rounded-full bg-gray-300" />;
    }
  };

  return (
    <div className="group relative pl-4 pb-4 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-2 bottom-0 w-px bg-gray-200 dark:bg-gray-800 group-last:hidden" />

      {/* Timeline dot */}
      <div className="absolute left-0 top-2.5">
        {getStatusDot()}
      </div>

      <div className={cn(
        "rounded-lg border transition-all duration-200 hover:shadow-sm",
        isExpanded ? "bg-[var(--bg-secondary)] border-[var(--border-color)]" : "bg-[var(--bg-primary)] border-transparent hover:border-[var(--border-color)]"
      )}>
        <button
          onClick={handleToggle}
          className="w-full text-left p-2 flex items-start gap-3"
        >
          <div className={cn(
            "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center border",
            getStatusColor()
          )}>
            {getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                {event.title}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 tabular-nums">
                {formatDistanceToNow(event.timestamp, { addSuffix: true })}
              </span>
            </div>

            {event.description && (
              <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                {event.description}
              </p>
            )}
          </div>
        </button>

        {isExpanded && event.metadata && (
          <div className="px-2 pb-2 pl-11">
            <div className="text-[10px] font-mono bg-[var(--bg-tertiary)] p-2 rounded border border-[var(--border-color)] overflow-x-auto">
              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
