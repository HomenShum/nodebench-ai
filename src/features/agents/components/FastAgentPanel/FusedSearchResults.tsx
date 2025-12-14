/**
 * FusedSearchResults - Display multi-source search results with facets and attribution
 * 
 * Features:
 * - Per-source facet filters (toggle sources on/off)
 * - Source attribution badges with icons
 * - Partial failure warnings
 * - Consistent citation display
 */

import React, { useState, useMemo } from 'react';
import { 
  Globe, FileText, Youtube, BookOpen, Newspaper, Database, Building2,
  AlertTriangle, Filter, X, ExternalLink, Clock, ChevronDown, ChevronUp
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

/** Source badge with icon */
function SourceBadge({ source, count, active, onClick }: { 
  source: SearchSource; count: number; active: boolean; onClick: () => void 
}) {
  const config = SOURCE_CONFIG[source];
  const Icon = config.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
        active ? config.color : "bg-gray-100 text-gray-400 border-gray-200 opacity-50"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
      <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/50 text-[10px]">{count}</span>
    </button>
  );
}

/** Partial failure warning banner */
function PartialFailureWarning({ errors }: { errors: SourceError[] }) {
  const [expanded, setExpanded] = useState(false);
  if (errors.length === 0) return null;
  
  return (
    <div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-2 text-left">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
        <span className="text-sm font-medium text-amber-800">
          {errors.length} source{errors.length > 1 ? 's' : ''} unavailable
        </span>
        {expanded ? <ChevronUp className="w-4 h-4 ml-auto text-amber-600" /> : <ChevronDown className="w-4 h-4 ml-auto text-amber-600" />}
      </button>
      {expanded && (
        <ul className="mt-2 space-y-1 text-xs text-amber-700">
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

/** Single result card with source attribution */
function ResultCard({ result, citationNumber }: { result: FusedResult; citationNumber?: number }) {
  const config = SOURCE_CONFIG[result.source];
  const Icon = config.icon;

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block p-3 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all bg-white"
    >
      <div className="flex items-start gap-3">
        {/* Source icon */}
        <div className={cn("flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", config.color.split(' ')[0])}>
          <Icon className="w-4 h-4" />
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">{result.title}</h4>
            {citationNumber !== undefined && (
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-semibold">
                {citationNumber}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 line-clamp-2">{result.snippet}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
            <span className={cn("px-1.5 py-0.5 rounded", config.color)}>{config.label}</span>
            {result.publishedAt && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{result.publishedAt}</span>
            )}
            {result.fusedRank && <span>Rank #{result.fusedRank}</span>}
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
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
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
          </span>
          {activeSources.size < sourcesQueried.length && (
            <button type="button" onClick={resetFilters} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <X className="w-3 h-3" /> Reset filters
            </button>
          )}
        </div>
        {totalTimeMs && (
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {(totalTimeMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {/* Source facets */}
      <div className="flex flex-wrap gap-2">
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

      {/* Results list */}
      <div className="space-y-2">
        {displayedResults.map((result, idx) => (
          <ResultCard
            key={result.id}
            result={result}
            citationNumber={showCitations ? idx + 1 : undefined}
          />
        ))}
      </div>

      {/* Show more button */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-1"
        >
          {showAll ? (
            <><ChevronUp className="w-4 h-4" /> Show less</>
          ) : (
            <><ChevronDown className="w-4 h-4" /> Show {filteredResults.length - INITIAL_COUNT} more</>
          )}
        </button>
      )}
    </div>
  );
}

