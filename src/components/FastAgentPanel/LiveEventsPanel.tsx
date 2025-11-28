import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  Filter,
  Pause,
  Play,
  ArrowDown,
  X,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveEvent, LiveEventCard, EventType } from './LiveEventCard';

interface LiveEventsPanelProps {
  events: LiveEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export function LiveEventsPanel({ events, isOpen, onClose }: LiveEventsPanelProps) {
  const [filter, setFilter] = useState<EventType | 'all'>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Filter events
  const filteredEvents = events.filter(e =>
    filter === 'all' ? true : e.type === filter
  );

  // Auto-scroll logic
  useEffect(() => {
    if (autoScroll && !isPaused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredEvents.length, autoScroll, isPaused]);

  // Handle manual scroll interaction
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;

    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    } else if (isAtBottom && !autoScroll) {
      setAutoScroll(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 border-l border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-col h-full animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-500" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Live Events</span>
          <span className="text-xs bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded-full text-[var(--text-secondary)] border border-[var(--border-color)]">
            {filteredEvents.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)]"
            title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--bg-hover)] rounded text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-2 border-b border-[var(--border-color)] flex gap-1 overflow-x-auto scrollbar-none">
        {(['all', 'tool', 'message', 'state', 'delegation', 'memory'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors border",
              filter === type
                ? "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-transparent hover:border-[var(--border-color)]"
            )}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent"
      >
        {filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
            <Search className="w-8 h-8 opacity-20" />
            <p className="text-xs">No events found</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <LiveEventCard key={event.id} event={event} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Jump to latest button */}
      {!autoScroll && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              setAutoScroll(true);
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-medium shadow-lg hover:bg-purple-700 transition-colors animate-in fade-in slide-in-from-bottom-2"
          >
            <ArrowDown className="w-3 h-3" />
            Jump to latest
          </button>
        </div>
      )}
    </div>
  );
}
