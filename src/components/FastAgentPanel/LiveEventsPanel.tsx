// src/components/FastAgentPanel/LiveEventsPanel.tsx
// Right sidebar showing real-time event stream with AG-UI styling

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { 
  Activity, 
  X, 
  Filter, 
  ChevronDown,
  Pause,
  Play,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LiveEventCard, type LiveEvent, type EventType } from './LiveEventCard';

interface LiveEventsPanelProps {
  events: LiveEvent[];
  onClose?: () => void;
  className?: string;
  isStreaming?: boolean;
}

// Event type filter options
const EVENT_FILTERS: { type: EventType | 'all'; label: string }[] = [
  { type: 'all', label: 'All Events' },
  { type: 'tool_start', label: 'Tools' },
  { type: 'text_content', label: 'Messages' },
  { type: 'state_update', label: 'State' },
  { type: 'delegation', label: 'Delegation' },
  { type: 'memory_update', label: 'Memory' },
];

/**
 * LiveEventsPanel - Real-time event stream sidebar
 * Shows all agent events as they happen with filtering and auto-scroll
 */
export function LiveEventsPanel({ 
  events, 
  onClose,
  className,
  isStreaming = false,
}: LiveEventsPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<EventType | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return events;
    
    // Group related event types
    const typeGroups: Record<string, EventType[]> = {
      'tool_start': ['tool_start', 'tool_end', 'tool_error'],
      'text_content': ['text_start', 'text_content', 'text_end'],
      'state_update': ['state_update'],
      'step_start': ['step_start', 'step_end'],
      'delegation': ['delegation'],
      'memory_update': ['memory_update'],
    };
    
    const allowedTypes = typeGroups[filterType] || [filterType];
    return events.filter(e => allowedTypes.includes(e.type));
  }, [events, filterType]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents.length, autoScroll]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  };

  // Get count of running events
  const runningCount = events.filter(e => e.status === 'running').length;

  return (
    <div className={cn(
      "flex flex-col h-full bg-gray-50 border-l border-gray-200",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Activity className={cn(
            "w-4 h-4",
            isStreaming ? "text-blue-500 animate-pulse" : "text-gray-500"
          )} />
          <span className="font-semibold text-sm text-gray-900">Live Events</span>
          {runningCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">
              {runningCount} active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-1.5 rounded hover:bg-gray-100 transition-colors",
              showFilters && "bg-gray-100"
            )}
            title="Filter events"
          >
            <Filter className="w-4 h-4 text-gray-500" />
          </button>
          
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "p-1.5 rounded hover:bg-gray-100 transition-colors",
              autoScroll && "bg-blue-50"
            )}
            title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
          >
            {autoScroll ? (
              <Pause className="w-4 h-4 text-blue-500" />
            ) : (
              <Play className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Filter dropdown */}
      {showFilters && (
        <div className="px-3 py-2 bg-white border-b border-gray-200">
          <div className="flex flex-wrap gap-1">
            {EVENT_FILTERS.map(filter => (
              <button
                key={filter.type}
                onClick={() => setFilterType(filter.type)}
                className={cn(
                  "px-2 py-1 text-xs rounded-full transition-colors",
                  filterType === filter.type
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Events list */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3"
      >
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No events yet</p>
            <p className="text-xs">Events will appear as the agent works</p>
          </div>
        ) : (
          <>
            {filteredEvents.map((event, index) => (
              <LiveEventCard
                key={event.id}
                event={event}
                isLatest={index === filteredEvents.length - 1}
              />
            ))}
          </>
        )}
      </div>

      {/* Footer with stats */}
      <div className="px-4 py-2 bg-white border-t border-gray-200 text-xs text-gray-500">
        <div className="flex items-center justify-between">
          <span>
            {filteredEvents.length} events
            {filterType !== 'all' && ` (filtered)`}
          </span>
          {!autoScroll && (
            <button
              onClick={() => {
                setAutoScroll(true);
                if (scrollRef.current) {
                  scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              <ChevronDown className="w-3 h-3" />
              Jump to latest
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveEventsPanel;
