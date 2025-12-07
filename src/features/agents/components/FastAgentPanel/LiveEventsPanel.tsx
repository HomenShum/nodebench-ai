// src/components/FastAgentPanel/LiveEventsPanel.tsx
// Modern AG-UI panel for displaying live agent events with filtering

import React, { useState, useEffect, useRef } from 'react';
import { X, Filter, Wrench, Bot, Zap, Trash2, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveEventCard, type LiveEvent, type LiveEventType } from './LiveEventCard';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

type FilterType = 'all' | 'tools' | 'agents' | 'memory';

interface LiveEventsPanelProps {
  events: LiveEvent[];
  onClose: () => void;
  onClear?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function filterEvents(events: LiveEvent[], filter: FilterType): LiveEvent[] {
  switch (filter) {
    case 'tools':
      return events.filter(e =>
        e.type === 'tool_start' ||
        e.type === 'tool_end' ||
        e.type === 'tool_error'
      );
    case 'agents':
      return events.filter(e =>
        e.type === 'agent_spawn' ||
        e.type === 'agent_complete'
      );
    case 'memory':
      return events.filter(e =>
        e.type === 'memory_read' ||
        e.type === 'memory_write'
      );
    case 'all':
    default:
      return events;
  }
}

function getFilterCounts(events: LiveEvent[]) {
  return {
    all: events.length,
    tools: events.filter(e => e.type.startsWith('tool_')).length,
    agents: events.filter(e => e.type.startsWith('agent_')).length,
    memory: events.filter(e => e.type.startsWith('memory_')).length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER BUTTON
// ═══════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  filter: FilterType;
  currentFilter: FilterType;
  count: number;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function FilterButton({ filter, currentFilter, count, icon, label, onClick }: FilterButtonProps) {
  const isActive = currentFilter === filter;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-150",
        isActive
          ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-transparent"
      )}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && (
        <span className={cn(
          "px-1 py-0.5 rounded text-[9px]",
          isActive
            ? "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-300"
            : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function LiveEventsPanel({ events, onClose, onClear }: LiveEventsPanelProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const filteredEvents = filterEvents(events, filter);
  const counts = getFilterCounts(events);
  const runningCount = events.filter(e => e.status === 'running').length;

  return (
    <div className="flex flex-col h-full w-[360px] bg-[var(--bg-primary)] border-l border-[var(--border-color)]">
      {/* Header */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Live Events</h3>
            {runningCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                {runningCount} running
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onClear && events.length > 0 && (
              <button
                onClick={onClear}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Clear all events"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterButton
            filter="all"
            currentFilter={filter}
            count={counts.all}
            icon={<Zap className="w-3 h-3" />}
            label="All"
            onClick={() => setFilter('all')}
          />
          <FilterButton
            filter="tools"
            currentFilter={filter}
            count={counts.tools}
            icon={<Wrench className="w-3 h-3" />}
            label="Tools"
            onClick={() => setFilter('tools')}
          />
          <FilterButton
            filter="agents"
            currentFilter={filter}
            count={counts.agents}
            icon={<Bot className="w-3 h-3" />}
            label="Agents"
            onClick={() => setFilter('agents')}
          />
        </div>
      </div>

      {/* Events list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3">
              <Activity className="w-6 h-6 text-blue-500 animate-pulse" />
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Listening for Events
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Events will appear as the agent works
            </p>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gray-400" />
                <span>Tool calls</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gray-400" />
                <span>Agent spawns</span>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-gray-400" />
                <span>Memory updates</span>
              </div>
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-3 italic">
              💡 Tip: Cached results won't generate events
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {filteredEvents.map((event, index) => (
              <LiveEventCard
                key={event.id}
                event={event}
                showTimeline={true}
                isLast={index === filteredEvents.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer - auto-scroll indicator */}
      {!autoScroll && events.length > 5 && (
        <div className="flex-shrink-0 px-3 py-1.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50">
          <button
            onClick={() => {
              setAutoScroll(true);
              if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
              }
            }}
            className="w-full text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
          >
            ↓ Scroll to latest
          </button>
        </div>
      )}
    </div>
  );
}

export default LiveEventsPanel;
