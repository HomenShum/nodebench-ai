/**
 * FastAgentPanel.VisualCitation.tsx
 * Enhanced visual citation system with glowing border highlights
 * 
 * Features:
 * - Footnote-style superscript citations [1], [2], [3]
 * - Glowing border highlight on referenced documents when hovering
 * - Smooth scroll to source on click
 * - Document linking with visual feedback
 */

import React, { useState, useCallback, createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// CONTEXT: Citation Highlight State
// ═══════════════════════════════════════════════════════════════════════════

interface CitationHighlightContextValue {
  highlightedCitationId: string | null;
  setHighlightedCitationId: (id: string | null) => void;
}

const CitationHighlightContext = createContext<CitationHighlightContextValue>({
  highlightedCitationId: null,
  setHighlightedCitationId: () => {},
});

export function CitationHighlightProvider({ children }: { children: React.ReactNode }) {
  const [highlightedCitationId, setHighlightedCitationId] = useState<string | null>(null);
  
  return (
    <CitationHighlightContext.Provider value={{ highlightedCitationId, setHighlightedCitationId }}>
      {children}
    </CitationHighlightContext.Provider>
  );
}

export function useCitationHighlight() {
  return useContext(CitationHighlightContext);
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: InlineCitation
// ═══════════════════════════════════════════════════════════════════════════

interface InlineCitationProps {
  number: number;
  sourceId: string;
  sourceTitle?: string;
  onScrollToSource?: (sourceId: string) => void;
  className?: string;
}

/**
 * InlineCitation - Superscript citation marker [1] that highlights source on hover
 */
export function InlineCitation({
  number,
  sourceId,
  sourceTitle,
  onScrollToSource,
  className,
}: InlineCitationProps) {
  const { setHighlightedCitationId } = useCitationHighlight();

  const handleMouseEnter = useCallback(() => {
    setHighlightedCitationId(sourceId);
  }, [sourceId, setHighlightedCitationId]);

  const handleMouseLeave = useCallback(() => {
    setHighlightedCitationId(null);
  }, [setHighlightedCitationId]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onScrollToSource?.(sourceId);
    
    // Scroll to source element
    const sourceElement = document.getElementById(`source-${number}`);
    if (sourceElement) {
      sourceElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add temporary highlight
      sourceElement.classList.add('citation-flash');
      setTimeout(() => sourceElement.classList.remove('citation-flash'), 1500);
    }
  }, [number, sourceId, onScrollToSource]);

  return (
    <sup
      className={cn(
        "inline-flex items-center justify-center",
        "min-w-[1.25rem] h-4 px-1 mx-0.5",
        "text-[10px] font-semibold",
        "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
        "rounded-full cursor-pointer",
        "transition-all duration-200",
        "hover:bg-blue-200 dark:hover:bg-blue-800/60 hover:scale-110",
        "hover:shadow-sm hover:shadow-blue-300/50",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      title={sourceTitle || `Source ${number}`}
      role="button"
      tabIndex={0}
      aria-label={`Citation ${number}${sourceTitle ? `: ${sourceTitle}` : ''}`}
    >
      {number}
    </sup>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT: HighlightableSource
// ═══════════════════════════════════════════════════════════════════════════

interface HighlightableSourceProps {
  sourceId: string;
  citationNumber?: number;
  children: React.ReactNode;
  className?: string;
}

/**
 * HighlightableSource - Wrapper that adds glowing border when citation is hovered
 */
export function HighlightableSource({
  sourceId,
  citationNumber,
  children,
  className,
}: HighlightableSourceProps) {
  const { highlightedCitationId } = useCitationHighlight();
  const isHighlighted = highlightedCitationId === sourceId;

  return (
    <div
      id={citationNumber ? `source-${citationNumber}` : undefined}
      className={cn(
        "relative transition-all duration-300 rounded-lg",
        isHighlighted && [
          "ring-2 ring-blue-500 ring-offset-2",
          "shadow-lg shadow-blue-500/25",
          "scale-[1.02]",
          "z-10",
        ],
        className
      )}
    >
      {/* Glow effect overlay */}
      {isHighlighted && (
        <div className="absolute inset-0 rounded-lg bg-blue-500/5 pointer-events-none animate-pulse" />
      )}
      {children}
    </div>
  );
}

export default InlineCitation;

