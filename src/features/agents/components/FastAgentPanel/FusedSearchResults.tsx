/**
 * FusedSearchResults - Display multi-source search results with facets and attribution
 *
 * Features:
 * - Per-source facet filters (toggle sources on/off)
 * - Source attribution badges with icons
 * - Partial failure warnings with expandable details
 * - Consistent citation numbering
 * - Accessible keyboard navigation and screen reader support
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * STREAMING BEHAVIOR DOCUMENTATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Current Implementation:
 * - This component receives COMPLETE tool results, not streaming partial results
 * - The fusionSearch action returns a single FusionSearchPayload after all sources complete
 * - Per-source "pending" state is NOT currently implemented at the streaming level
 *
 * Source Status Indicators:
 * - "completed": Source returned results (shown in facet with count > 0)
 * - "failed": Source returned an error (shown in PartialFailureWarning)
 * - "disabled": Source not queried based on mode (not in sourcesQueried)
 * - "pending": NOT IMPLEMENTED - would require streaming partial payloads
 *
 * Future Streaming Support:
 * To implement true streaming with pending indicators, the backend would need to:
 * 1. Emit incremental FusionSearchPayload updates as each source completes
 * 2. Include SourceStreamingStatus[] in the payload (see types.ts)
 * 3. UI would update progressively as partial results arrive
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * RENDER PRECEDENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This component is rendered INSTEAD OF the default ToolStep for fusion search tools.
 * See FastAgentPanel.UIMessageBubble.tsx for render precedence logic:
 *
 * 1. Check if tool is fusion search (isFusionSearchTool)
 * 2. If yes AND tool-result: render FusedSearchResults
 * 3. If yes AND tool-call: skip rendering (no spinner shown)
 * 4. If no: render default ToolStep
 *
 * This ensures:
 * - Only ONE representation per tool (no duplicate ToolStep + FusedSearchResults)
 * - Clean UI with results only shown after completion
 *
 * @module FastAgentPanel/FusedSearchResults
 */

import React, { useState, useMemo } from 'react';
import {
  Globe, FileText, Youtube, BookOpen, Newspaper, Database, Building2,
  AlertTriangle, Filter, X, ExternalLink, Clock, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type SearchSource = "linkup" | "sec" | "rag" | "documents" | "news" | "youtube" | "arxiv";

export interface FusedResult {
  id: string;
  source: SearchSource;
  title: string;
  snippet: string;
  url?: string;
  score: number;
  originalRank: number;
  fusedRank?: number;
  contentType: "text" | "pdf" | "video" | "image" | "filing" | "news";
  publishedAt?: string;
  author?: string;
  metadata?: Record<string, unknown>;
}

export interface SourceError {
  source: SearchSource;
  error: string;
}

export interface FusedSearchResultsProps {
  results: FusedResult[];
  sourcesQueried: SearchSource[];
  errors?: SourceError[];
  timing?: Record<SearchSource, number>;
  totalTimeMs?: number;
  showCitations?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const SOURCE_CONFIG: Record<SearchSource, { icon: React.ElementType; label: string; color: string }> = {
  linkup: { icon: Globe, label: "Web", color: "bg-blue-100 text-blue-700 border-blue-200" },
  sec: { icon: Building2, label: "SEC", color: "bg-amber-100 text-amber-700 border-amber-200" },
  rag: { icon: Database, label: "Internal", color: "bg-purple-100 text-purple-700 border-purple-200" },
  documents: { icon: FileText, label: "Docs", color: "bg-green-100 text-green-700 border-green-200" },
  news: { icon: Newspaper, label: "News", color: "bg-red-100 text-red-700 border-red-200" },
  youtube: { icon: Youtube, label: "YouTube", color: "bg-rose-100 text-rose-700 border-rose-200" },
  arxiv: { icon: BookOpen, label: "arXiv", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

/** Source badge with icon - accessible toggle button */
function SourceBadge({ source, count, active, onClick }: {
  source: SearchSource; count: number; active: boolean; onClick: () => void
}) {
  const config = SOURCE_CONFIG[source];
  const Icon = config.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      onKeyDown={(e) => {
        // Support keyboard navigation with Enter and Space
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={active}
      aria-label={`Filter by ${config.label} source (${count} result${count !== 1 ? 's' : ''})`}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
        "focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-1",
        active ? config.color : "bg-[var(--bg-hover)] text-[var(--text-muted)] border-[var(--border-color)] opacity-50"
      )}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{config.label}</span>
      <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/50 text-[10px]" aria-label={`${count} results`}>{count}</span>
    </button>
  );
}

/** Partial failure warning banner - accessible alert */
function PartialFailureWarning({ errors }: { errors: SourceError[] }) {
  const [expanded, setExpanded] = useState(false);
  if (errors.length === 0) return null;

  return (
    <div
      className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200"
      role="alert"
      aria-live="polite"
    >
      {/*
        eslint-disable-next-line jsx-a11y/aria-proptypes
        aria-expanded accepts boolean in React, converted to "true"/"false" string at runtime.
        This is valid per WAI-ARIA 1.2 spec and React's DOM attribute handling.
      */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 rounded"
        aria-expanded={expanded}
        aria-controls="source-error-details"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium text-amber-800">
          {errors.length} source{errors.length > 1 ? 's' : ''} unavailable
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 ml-auto text-amber-600" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 ml-auto text-amber-600" aria-hidden="true" />}
      </button>
      {expanded && (
        <ul id="source-error-details" className="mt-2 space-y-1 text-xs text-amber-700">
          {errors.map((e, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="font-medium">{SOURCE_CONFIG[e.source]?.label || e.source}:</span>
              <span className="truncate">{e.error}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Single result card with source attribution - accessible link card */
function ResultCard({ result, citationNumber }: { result: FusedResult; citationNumber?: number }) {
  const config = SOURCE_CONFIG[result.source];
  const Icon = config.icon;

  // Build accessible label
  const ariaLabel = citationNumber !== undefined
    ? `Result ${citationNumber} from ${config.label}: ${result.title}${result.fusedRank ? `, ranked #${result.fusedRank}` : ''}`
    : `${config.label} result: ${result.title}`;

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
      className="group block p-3 rounded-lg border border-[var(--border-color)] hover:border-[var(--border-color)] hover:shadow-md transition-all bg-[var(--bg-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-1"
    >
      <div className="flex items-start gap-3">
        {/* Source icon */}
        <div className={cn("flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", config.color.split(' ')[0])} aria-hidden="true">
          <Icon className="w-4 h-4" />
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-blue-600">{result.title}</h4>
            {citationNumber !== undefined && (
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold"
                aria-label={`Citation ${citationNumber}`}
              >
                {citationNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{result.snippet}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
            <span className={cn("px-1.5 py-0.5 rounded", config.color)}>{config.label}</span>
            {result.publishedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                <span aria-label={`Published ${result.publishedAt}`}>{result.publishedAt}</span>
              </span>
            )}
            {result.fusedRank && <span aria-label={`Fusion rank ${result.fusedRank}`}>Rank #{result.fusedRank}</span>}
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] flex-shrink-0" aria-hidden="true" />
      </div>
    </a>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * FusedSearchResults - Main component for displaying multi-source search results
 */
export function FusedSearchResults({
  results,
  sourcesQueried,
  errors = [],
  timing,
  totalTimeMs,
  showCitations = true,
  className,
}: FusedSearchResultsProps) {
  // Track which sources are active (for filtering)
  const [activeSources, setActiveSources] = useState<Set<SearchSource>>(new Set(sourcesQueried));
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 10;

  // Count results per source
  const sourceCounts = useMemo(() => {
    const counts: Record<SearchSource, number> = {} as any;
    for (const r of results) {
      counts[r.source] = (counts[r.source] || 0) + 1;
    }
    return counts;
  }, [results]);

  // Filter results by active sources
  const filteredResults = useMemo(() => {
    return results.filter(r => activeSources.has(r.source));
  }, [results, activeSources]);

  const displayedResults = showAll ? filteredResults : filteredResults.slice(0, INITIAL_COUNT);
  const hasMore = filteredResults.length > INITIAL_COUNT;

  // Toggle source filter
  const toggleSource = (source: SearchSource) => {
    setActiveSources(prev => {
      const next = new Set(prev);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  };

  // Reset filters
  const resetFilters = () => setActiveSources(new Set(sourcesQueried));

  if (results.length === 0 && errors.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Partial failure warning */}
      <PartialFailureWarning errors={errors} />

      {/* Header with timing */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-secondary)]" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
          </span>
          {activeSources.size < sourcesQueried.length && (
            <button type="button" onClick={resetFilters} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Reset filters
            </button>
          )}
        </div>
        {totalTimeMs && (
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <Clock className="w-3 h-3" /> {(totalTimeMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Source facets - accessible filter group */}
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter results by source"
      >
        {sourcesQueried.map(source => (
          <SourceBadge
            key={source}
            source={source}
            count={sourceCounts[source] || 0}
            active={activeSources.has(source)}
            onClick={() => toggleSource(source)}
          />
        ))}
      </div>

      {/* Results list - accessible list */}
      <div
        className="space-y-2"
        role="list"
        aria-label="Search results"
      >
        {displayedResults.map((result, idx) => (
          <div key={`${result.id}-${idx}`} role="listitem">
            <ResultCard
              result={result}
              citationNumber={showCitations ? idx + 1 : undefined}
            />
          </div>
        ))}
      </div>

      {/*
        Show more button - accessible
        eslint-disable-next-line jsx-a11y/aria-proptypes
        aria-expanded boolean is valid in React, per WAI-ARIA 1.2
      */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-violet-600 hover:text-violet-700 font-medium flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:ring-offset-1 rounded"
          aria-expanded={showAll}
          aria-label={showAll ? "Show fewer results" : `Show ${filteredResults.length - INITIAL_COUNT} more results`}
        >
          {showAll ? (
            <><ChevronUp className="w-4 h-4" aria-hidden="true" /> Show less</>
          ) : (
            <><ChevronDown className="w-4 h-4" aria-hidden="true" /> Show {filteredResults.length - INITIAL_COUNT} more</>
          )}
        </button>
      )}
    </div>
  );
}
