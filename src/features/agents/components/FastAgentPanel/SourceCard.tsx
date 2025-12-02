// src/components/FastAgentPanel/SourceCard.tsx
// Unified source card component for displaying documents, articles, and other sources

import React, { useState } from 'react';
import { ExternalLink, FileText, Globe, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SECDocument } from './MediaGallery';

interface BaseSource {
  title: string;
  url: string;
  domain?: string;
  description?: string;
  favicon?: string;
  previewImage?: string;
}

interface SourceCardProps {
  source: BaseSource | SECDocument;
  className?: string;
  citationNumber?: number; // For inline citations like [1], [2]
}

/**
 * Helper to determine if source is an SEC document
 */
function isSECDocument(source: BaseSource | SECDocument): source is SECDocument {
  return 'formType' in source && 'accessionNumber' in source;
}

/**
 * Helper to extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
}

/**
 * SourceCard - Displays a single source with preview, title, and metadata
 * Supports both generic sources and SEC documents
 */
export function SourceCard({ source, className, citationNumber }: SourceCardProps) {
  const isSEC = isSECDocument(source);
  
  // Extract metadata
  const title = source.title;
  const url = isSEC ? source.documentUrl : source.url;
  const domain = isSEC ? 'sec.gov' : (source.domain || extractDomain(url));
  const description = isSEC 
    ? `${source.formType} • Filed ${source.filingDate}`
    : source.description;
  const previewImage = isSEC ? undefined : source.previewImage;
  const favicon = isSEC ? undefined : source.favicon;

  return (
    <a
      id={citationNumber ? `source-${citationNumber}` : undefined}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block rounded-lg border border-gray-200 hover:border-gray-300",
        "transition-all duration-200 hover:shadow-md bg-white overflow-hidden scroll-mt-4",
        className
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Preview image or icon */}
        <div className="flex-shrink-0">
          {previewImage ? (
            <img
              src={previewImage}
              alt=""
              className="w-16 h-16 rounded object-cover bg-gray-100"
              loading="lazy"
            />
          ) : (
            <div className={cn(
              "w-16 h-16 rounded flex items-center justify-center",
              isSEC ? "bg-blue-50" : "bg-gray-50"
            )}>
              {isSEC ? (
                <FileText className="h-8 w-8 text-blue-600" />
              ) : (
                <Globe className="h-8 w-8 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {title}
          </h3>

          {/* Domain/Source */}
          <div className="flex items-center gap-2 mb-1">
            {favicon && (
              <img
                src={favicon}
                alt=""
                className="w-3 h-3"
                loading="lazy"
              />
            )}
            <span className="text-xs text-gray-600 font-medium">
              {domain}
            </span>
            {isSEC && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                SEC Filing
              </span>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-gray-500 line-clamp-2">
              {description}
            </p>
          )}
        </div>

        {/* Citation number badge */}
        {citationNumber !== undefined && (
          <div className="flex-shrink-0">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
              {citationNumber}
            </div>
          </div>
        )}

        {/* External link indicator */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </a>
  );
}

/**
 * SourceGrid - Grid layout for multiple sources
 */
interface SourceGridProps {
  sources: (BaseSource | SECDocument)[];
  title?: string;
  showCitations?: boolean;
}

export function SourceGrid({ sources, title = "Sources", showCitations = false }: SourceGridProps) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_DISPLAY_COUNT = 6;

  if (sources.length === 0) return null;

  const displayedSources = showAll ? sources : sources.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = sources.length > INITIAL_DISPLAY_COUNT;

  return (
    <div className="mb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-px flex-1 bg-gray-200"></div>
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-600" />
          {title}
          <span className="text-xs font-normal text-gray-500">
            ({showAll ? sources.length : Math.min(sources.length, INITIAL_DISPLAY_COUNT)}{hasMore && !showAll ? `/${sources.length}` : ''})
          </span>
        </h3>
        <div className="h-px flex-1 bg-gray-200"></div>
      </div>

      {/* Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {displayedSources.map((source, idx) => (
          <SourceCard
            key={idx}
            source={source}
            citationNumber={showCitations ? idx + 1 : undefined}
          />
        ))}
      </div>

      {/* Show More/Less button */}
      {hasMore && (
        <div className="flex justify-center mt-3">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show {sources.length - INITIAL_DISPLAY_COUNT} More
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to convert SECDocument to BaseSource format
 */
export function secDocumentToSource(doc: SECDocument): BaseSource {
  return {
    title: doc.title,
    url: doc.documentUrl,
    domain: 'sec.gov',
    description: `${doc.formType} • Filed ${doc.filingDate}`,
  };
}

