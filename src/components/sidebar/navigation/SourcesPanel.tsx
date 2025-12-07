import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SOURCES } from "../../../lib/sources";

interface SourcesPanelProps {
    activeSources: string[];
    onToggleSource: (sourceId: string) => void;
}

/**
 * Sources Panel Component
 * Displays collapsible "Live Sources" section with trust scores and live indicators
 * Styled to match Welcome Landing aesthetic
 */
export function SourcesPanel({ activeSources, onToggleSource }: SourcesPanelProps) {
    const [isSourcesOpen, setIsSourcesOpen] = useState(true);

    return (
        <div className="p-3 border-b border-[var(--border-color)]">
            <button
                onClick={() => setIsSourcesOpen(!isSourcesOpen)}
                className="flex items-center justify-between w-full text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 hover:text-[var(--text-primary)]"
            >
                <span>Live Sources</span>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    {isSourcesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </div>
            </button>

            {isSourcesOpen && (
                <div className="space-y-1">
                    {SOURCES.map((source) => {
                        const isActive = activeSources.includes(source.id);
                        // Trust score color based on value
                        const trustColor = (source.trustScore ?? 0) >= 90
                            ? 'text-green-600 bg-green-50 border-green-100'
                            : (source.trustScore ?? 0) >= 75
                                ? 'text-blue-600 bg-blue-50 border-blue-100'
                                : 'text-yellow-600 bg-yellow-50 border-yellow-100';

                        return (
                            <button
                                key={source.id}
                                onClick={() => onToggleSource(source.id)}
                                className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm transition-colors select-none ${isActive
                                    ? 'bg-gray-50 text-[var(--text-primary)]'
                                    : 'text-[var(--text-secondary)] hover:bg-gray-50'
                                    }`}
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <span className={`font-bold shrink-0 transition-opacity ${source.color} ${isActive ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>
                                        {source.icon}
                                    </span>
                                    <span className={`font-medium truncate transition-colors ${isActive ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>
                                        {source.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    {source.trustScore && (
                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border tabular-nums ${trustColor}`}>
                                            {source.trustScore}%
                                        </span>
                                    )}
                                    {isActive && source.isLive && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
