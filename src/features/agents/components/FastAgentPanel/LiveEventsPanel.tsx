// src/components/FastAgentPanel/LiveEventsPanel.tsx
// Seamlessly integrated Live Activity panel matching FastAgentPanel styling

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, Wrench, Bot, Zap, Trash2, Activity, ChevronDown, 
  CheckCircle2, XCircle, Loader2, Database, Sparkles, Timer, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type LiveEvent } from './LiveEventCard';

type FilterType = 'all' | 'tools' | 'agents';

interface LiveEventsPanelProps {
  events: LiveEvent[];
  onClose: () => void;
  onClear?: () => void;
  isStreaming?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPACT EVENT ITEM - Matches FastAgentPanel message styling
// ═══════════════════════════════════════════════════════════════════════════

function EventItem({ event, isLast }: { event: LiveEvent; isLast: boolean }) {
  const config = useMemo(() => {
    const configs: Record<string, { icon: typeof Wrench; color: string; bg: string }> = {
      tool_start: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-100' },
      tool_end: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
      tool_error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
      agent_spawn: { icon: Bot, color: 'text-violet-600', bg: 'bg-violet-100' },
      agent_complete: { icon: Sparkles, color: 'text-violet-600', bg: 'bg-violet-100' },
      memory_read: { icon: Database, color: 'text-cyan-600', bg: 'bg-cyan-100' },
      memory_write: { icon: Database, color: 'text-cyan-600', bg: 'bg-cyan-100' },
      thinking: { icon: Cpu, color: 'text-blue-600', bg: 'bg-blue-100' },
    };
    return configs[event.type] || { icon: Zap, color: 'text-[var(--text-muted)]', bg: 'bg-[var(--bg-secondary)]' };
  }, [event.type]);

  const Icon = config.icon;
  const isRunning = event.status === 'running';

  return (
    <div className="relative flex items-start gap-2.5 py-2 group">
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[11px] top-8 bottom-0 w-px bg-[var(--border-color)]" />
      )}
      
      {/* Icon */}
      <div className={cn(
        "relative z-10 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
        config.bg
      )}>
        {isRunning ? (
          <Loader2 className={cn("w-3 h-3 animate-spin", config.color)} />
        ) : (
          <Icon className={cn("w-3 h-3", config.color)} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", config.color)}>
            {event.type.replace(/_/g, ' ')}
          </span>
          {event.duration && (
            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
              <Timer className="w-2.5 h-2.5" />
              {event.duration}ms
            </span>
          )}
          {isRunning && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          )}
        </div>
        <p className="text-xs text-[var(--text-primary)] truncate">
          {event.title || event.toolName || event.agentName || 'Processing...'}
        </p>
        {event.details && (
          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {event.details}
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT - Matches FastAgentPanel design language
// ═══════════════════════════════════════════════════════════════════════════

export function LiveEventsPanel({ events, onClose, onClear, isStreaming, className }: LiveEventsPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
    }
  };

  // Computed values
  const filteredEvents = useMemo(() => {
    switch (filter) {
      case 'tools': return events.filter(e => e.type.startsWith('tool_'));
      case 'agents': return events.filter(e => e.type.startsWith('agent_'));
      default: return events;
    }
  }, [events, filter]);

  const stats = useMemo(() => ({
    total: events.length,
    running: events.filter(e => e.status === 'running').length,
    success: events.filter(e => e.status === 'success').length,
    tools: events.filter(e => e.type.startsWith('tool_')).length,
    agents: events.filter(e => e.type.startsWith('agent_')).length,
  }), [events]);

  const filters: { key: FilterType; label: string; icon: typeof Zap }[] = [
    { key: 'all', label: 'All', icon: Activity },
    { key: 'tools', label: 'Tools', icon: Wrench },
    { key: 'agents', label: 'Agents', icon: Bot },
  ];

  return (
    <div className={cn(
      "flex flex-col h-full bg-[var(--bg-primary)] border-l border-[var(--border-color)]",
      className
    )}>
      {/* Header - Matches FastAgentPanel header style */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-[var(--border-color)]">
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className={cn(
              "w-4 h-4",
              isStreaming ? "text-blue-500 animate-pulse" : "text-[var(--text-muted)]"
            )} />
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                Live Activity
                {stats.running > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] bg-blue-500 text-white rounded-full font-medium">
                    {stats.running}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                {stats.total} events · {stats.success} completed
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {onClear && events.length > 0 && (
              <button
                onClick={onClear}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter tabs - Matches FastAgentPanel tab styling */}
        <div className="flex gap-1">
          {filters.map(({ key, label, icon: Icon }) => {
            const count = key === 'all' ? stats.total : key === 'tools' ? stats.tools : stats.agents;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors border",
                  filter === key
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border-color)]"
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
                {count > 0 && (
                  <span className={cn(
                    "px-1 py-0.5 rounded text-[9px] font-semibold",
                    filter === key ? "bg-blue-200 text-blue-800" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3 py-2"
      >
        {filteredEvents.length === 0 ? (
          /* Empty state - Simple and clean */
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
              "bg-[var(--bg-secondary)]"
            )}>
              <Activity className={cn(
                "w-5 h-5",
                isStreaming ? "text-blue-500 animate-pulse" : "text-[var(--text-muted)]"
              )} />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
              {isStreaming ? 'Listening...' : 'No Activity Yet'}
            </p>
            <p className="text-xs text-[var(--text-muted)] max-w-[180px]">
              {isStreaming 
                ? 'Events will appear as the agent works'
                : 'Start a conversation to see live events'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {filteredEvents.map((event, index) => (
              <EventItem
                key={event.id}
                event={event}
                isLast={index === filteredEvents.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - Jump to latest */}
      {!autoScroll && events.length > 3 && (
        <div className="flex-shrink-0 px-3 py-2 border-t border-[var(--border-color)]">
          <button
            onClick={() => {
              setAutoScroll(true);
              scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Jump to latest
          </button>
        </div>
      )}
    </div>
  );
}

export default LiveEventsPanel;
