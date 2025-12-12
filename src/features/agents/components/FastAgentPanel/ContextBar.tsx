// src/features/agents/components/FastAgentPanel/ContextBar.tsx
// Context Companion - Shows active constraints above input

import React, { useState } from 'react';
import { Brain, X, Edit3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ContextConstraint {
    id: string;
    label: string;
    value?: string;
    type?: 'tech' | 'rule' | 'preference' | 'custom';
}

interface ContextBarProps {
    constraints: ContextConstraint[];
    onRemoveConstraint?: (id: string) => void;
    onEditConstraints?: () => void;
    onAddConstraint?: () => void;
    className?: string;
}

/**
 * ContextBar - Shows active constraints/scratchpad above input
 * 
 * Displays current context tags that the agent is using
 * Hover reveals edit options
 */
export function ContextBar({
    constraints,
    onRemoveConstraint,
    onEditConstraints,
    onAddConstraint,
    className,
}: ContextBarProps) {
    const [isHovered, setIsHovered] = useState(false);

    // Don't render if no constraints
    if (constraints.length === 0) {
        return null;
    }

    const getTypeColor = (type?: ContextConstraint['type']) => {
        switch (type) {
            case 'tech':
                return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'rule':
                return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
            case 'preference':
                return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
            default:
                return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    return (
        <div
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 min-h-[28px]",
                "bg-[var(--bg-secondary)] border-b border-[var(--border-color)]",
                "text-[11px] text-[var(--text-muted)]",
                "transition-colors duration-150",
                className
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Context label */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <Brain className="w-3 h-3" />
                <span className="font-medium">Context:</span>
            </div>

            {/* Constraint tags */}
            <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                {constraints.slice(0, 5).map((constraint) => (
                    <span
                        key={constraint.id}
                        className={cn(
                            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                            getTypeColor(constraint.type),
                            "group"
                        )}
                    >
                        {constraint.label}
                        {constraint.value && (
                            <span className="opacity-70">: {constraint.value}</span>
                        )}
                        {isHovered && onRemoveConstraint && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveConstraint(constraint.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-600 transition-opacity"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </span>
                ))}

                {constraints.length > 5 && (
                    <span className="text-[10px] text-[var(--text-muted)]">
                        +{constraints.length - 5} more
                    </span>
                )}
            </div>

            {/* Action buttons (visible on hover) */}
            <div className={cn(
                "flex items-center gap-1 ml-auto flex-shrink-0 transition-opacity duration-150",
                isHovered ? "opacity-100" : "opacity-0"
            )}>
                {onAddConstraint && (
                    <button
                        onClick={onAddConstraint}
                        className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Add constraint"
                    >
                        <Plus className="w-3 h-3" />
                    </button>
                )}
                {onEditConstraints && (
                    <button
                        onClick={onEditConstraints}
                        className="p-1 rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        title="Edit context"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default ContextBar;
