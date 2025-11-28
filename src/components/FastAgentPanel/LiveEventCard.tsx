// src/components/FastAgentPanel/LiveEventCard.tsx
// Compact card for individual agent events with AG-UI styling

import React, { useState } from 'react';
import { 
  Wrench, 
  MessageSquare, 
  Database, 
  Play, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronRight,
  Loader2,
  Brain,
  Users,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EventType = 
  | 'tool_start' 
  | 'tool_end' 
  | 'tool_error'
  | 'text_start'
  | 'text_content'
  | 'text_end'
  | 'state_update'
  | 'step_start'
  | 'step_end'
  | 'delegation'
  | 'memory_update';

export type EventStatus = 'running' | 'done' | 'error';

export interface LiveEvent {
  id: string;
  type: EventType;
  status: EventStatus;
  title: string;
  details?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
  toolName?: string;
  agentName?: string;
}

interface LiveEventCardProps {
  event: LiveEvent;
  isLatest?: boolean;
}

// Format time ago
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

// Get icon for event type
function getEventIcon(type: EventType, status: EventStatus) {
  const iconClass = "w-3.5 h-3.5";
  
  switch (type) {
    case 'tool_start':
    case 'tool_end':
    case 'tool_error':
      return <Wrench className={iconClass} />;
    case 'text_start':
    case 'text_content':
    case 'text_end':
      return <MessageSquare className={iconClass} />;
    case 'state_update':
      return <Database className={iconClass} />;
    case 'step_start':
    case 'step_end':
      return <Play className={iconClass} />;
    case 'delegation':
      return <Users className={iconClass} />;
    case 'memory_update':
      return <Brain className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

// Get status color
function getStatusColor(status: EventStatus, isLatest: boolean) {
  switch (status) {
    case 'running':
      return 'bg-blue-500';
    case 'done':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

// Get event type label
function getEventLabel(type: EventType): string {
  const labels: Record<EventType, string> = {
    tool_start: 'Tool Started',
    tool_end: 'Tool Completed',
    tool_error: 'Tool Error',
    text_start: 'Response Started',
    text_content: 'Streaming',
    text_end: 'Response Complete',
    state_update: 'State Updated',
    step_start: 'Step Started',
    step_end: 'Step Completed',
    delegation: 'Delegating',
    memory_update: 'Memory Updated',
  };
  return labels[type] || type;
}

/**
 * LiveEventCard - Compact card for individual agent events
 * AG-UI inspired styling with status indicators and expandable details
 */
export function LiveEventCard({ event, isLatest = false }: LiveEventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = event.details || event.metadata;

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border bg-white shadow-sm mb-2 transition-all duration-200",
        isLatest && event.status === 'running' && "border-blue-300 shadow-blue-100 shadow-md",
        !isLatest && "border-gray-200 hover:shadow-md hover:border-gray-300",
        event.status === 'error' && "border-red-200 bg-red-50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Status dot with pulse for active */}
        <div className="flex-shrink-0 mt-0.5">
          <div className={cn(
            "w-2.5 h-2.5 rounded-full",
            getStatusColor(event.status, isLatest),
            event.status === 'running' && "animate-pulse"
          )} />
        </div>
        
        {/* Event content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Icon */}
            <div className={cn(
              "p-1 rounded",
              event.status === 'running' && "text-blue-600 bg-blue-50",
              event.status === 'done' && "text-green-600 bg-green-50",
              event.status === 'error' && "text-red-600 bg-red-50"
            )}>
              {getEventIcon(event.type, event.status)}
            </div>
            
            {/* Title */}
            <span className="font-medium text-sm text-gray-900 truncate">
              {event.toolName || event.title}
            </span>
            
            {/* Status badge */}
            {event.status === 'running' && (
              <Loader2 className="w-3 h-3 text-blue-500 animate-spin flex-shrink-0" />
            )}
            {event.status === 'done' && (
              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
            {event.status === 'error' && (
              <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
            )}
          </div>
          
          {/* Subtitle */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">
              {getEventLabel(event.type)}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-400">
              {formatTimeAgo(event.timestamp)}
            </span>
            {event.agentName && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-purple-600 font-medium">
                  {event.agentName}
                </span>
              </>
            )}
          </div>
          
          {/* Preview of details */}
          {event.details && !isExpanded && (
            <p className="text-xs text-gray-600 mt-1 truncate">
              {event.details}
            </p>
          )}
        </div>
        
        {/* Expand button */}
        {hasDetails && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      
      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {event.details && (
            <p className="text-xs text-gray-700 whitespace-pre-wrap">
              {event.details}
            </p>
          )}
          {event.metadata && (
            <pre className="mt-2 text-[10px] text-gray-500 bg-gray-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default LiveEventCard;
