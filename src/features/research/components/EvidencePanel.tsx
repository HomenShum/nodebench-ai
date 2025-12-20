import React, { useState } from 'react';
import { ExternalLink, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { Evidence } from '../types';

interface EvidencePanelProps {
    /** Array of evidence items to display */
    evidence: Evidence[];
    /** Maximum items to show before "Show more" (default: 4) */
    maxVisible?: number;
    /** Optional title override */
    title?: string;
}

/**
 * EvidencePanel - Collapsible panel showing cited sources
 * 
 * Builds trust by showing users where the AI's claims come from.
 */
export function EvidencePanel({
    evidence,
    maxVisible = 4,
    title = "Cited Sources"
}: EvidencePanelProps) {
    const [expanded, setExpanded] = useState(false);

    if (!evidence || evidence.length === 0) {
        return null;
    }

    const visible = expanded ? evidence : evidence.slice(0, maxVisible);
    const hasMore = evidence.length > maxVisible;

    return (
        <div className="border-t border-stone-200/60 pt-5 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FileText className="w-3 h-3 text-emerald-900/50" />
                    <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">
                        {title}
                    </h4>
                    <span className="text-[9px] font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                        {evidence.length}
                    </span>
                </div>

                {hasMore && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-1 text-[10px] text-emerald-700 hover:text-emerald-900 transition-colors"
                    >
                        {expanded ? (
                            <>
                                <span>Show less</span>
                                <ChevronUp className="w-3 h-3" />
                            </>
                        ) : (
                            <>
                                <span>+{evidence.length - maxVisible} more</span>
                                <ChevronDown className="w-3 h-3" />
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Evidence List */}
            <ul className="space-y-2.5">
                {visible.map((ev, i) => (
                    <li key={i} className="group flex items-start gap-2.5">
                        {/* Index Badge */}
                        <span className="text-[9px] font-mono text-stone-400 bg-stone-100 w-5 h-5 flex items-center justify-center rounded shrink-0">
                            {i + 1}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            {ev.url ? (
                                <a
                                    href={ev.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[11px] text-stone-600 hover:text-emerald-900 transition-colors flex items-start gap-1.5 group/link"
                                >
                                    <span className="truncate flex-1">
                                        {ev.title || ev.source || ev.url}
                                    </span>
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity mt-0.5" />
                                </a>
                            ) : (
                                <span className="text-[11px] text-stone-600 truncate block">
                                    {ev.title || ev.source}
                                </span>
                            )}

                            {/* Source Badge */}
                            {ev.source && ev.title && (
                                <span className="text-[9px] text-stone-400 mt-0.5 block">
                                    via {ev.source}
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {/* Collapsed indicator */}
            {!expanded && hasMore && (
                <div className="mt-3 pt-2 border-t border-dashed border-stone-200/50 text-center">
                    <span className="text-[9px] text-stone-400 italic">
                        {evidence.length - maxVisible} additional sources available
                    </span>
                </div>
            )}
        </div>
    );
}

export default EvidencePanel;
