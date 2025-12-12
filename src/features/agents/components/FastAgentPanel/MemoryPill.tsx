// src/features/agents/components/FastAgentPanel/MemoryPill.tsx
// Inline memory update pill for chat stream

import React, { useState } from 'react';
import { Zap, AlertCircle, CheckCircle2, FileText, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MemoryEventType =
    | 'plan_update'
    | 'test_result'
    | 'memory_write'
    | 'constraint_change'
    | 'feature_complete'
    | 'error';

export interface MemoryEvent {
    id: string;
    type: MemoryEventType;
    title: string;
    details?: string;
    timestamp: number;
    status?: 'success' | 'failure' | 'info';
}

interface MemoryPillProps {
    event: MemoryEvent;
    className?: string;
}

/**
 * MemoryPill - Inline system event displayed between chat messages
 * 
 * Small, centered, low-contrast pill that expands on click
 * Shows memory updates, test results, plan changes
 */
export function MemoryPill({ event, className }: MemoryPillProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const getIcon = () => {
        switch (event.type) {
            case 'plan_update':
                return <Zap className="w-3 h-3" />;
            case 'test_result':
                return event.status === 'success'
                    ? <CheckCircle2 className="w-3 h-3 text-green-500" />
                    : <AlertCircle className="w-3 h-3 text-red-500" />;
            case 'memory_write':
                return <FileText className="w-3 h-3" />;
            case 'constraint_change':
                return <Settings className="w-3 h-3" />;
            case 'feature_complete':
                return <CheckCircle2 className="w-3 h-3 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-3 h-3 text-red-500" />;
            default:
                return <Zap className="w-3 h-3" />;
        }
    };

    const getStatusColor = () => {
        switch (event.status) {
            case 'success':
                return 'text-green-600 dark:text-green-400';
            case 'failure':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-[var(--text-muted)]';
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className={cn("flex justify-center my-2", className)}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                    "bg-[var(--bg-secondary)] border border-[var(--border-color)]",
                    "text-[10px] font-medium transition-all duration-150",
                    "hover:bg-[var(--bg-tertiary)] hover:shadow-sm",
                    "focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]",
                    getStatusColor()
                )}
            >
                {getIcon()}
                <span className="max-w-[200px] truncate">{event.title}</span>
                {event.details && (
                    isExpanded
                        ? <ChevronUp className="w-2.5 h-2.5 opacity-50" />
                        : <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                )}
            </button>

            {/* Expanded details */}
            {isExpanded && event.details && (
                <div className={cn(
                    "absolute mt-8 left-1/2 -translate-x-1/2 z-20",
                    "max-w-xs p-2.5 rounded-lg shadow-lg",
                    "bg-[var(--bg-primary)] border border-[var(--border-color)]",
                    "text-xs text-[var(--text-secondary)]"
                )}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-[var(--text-primary)]">{event.title}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                            {formatTime(event.timestamp)}
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap">{event.details}</p>
                </div>
            )}
        </div>
    );
}

export default MemoryPill;
