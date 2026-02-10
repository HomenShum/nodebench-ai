"use client";

import React from "react";
import { ExternalLink, FileText, Quote, BarChart3, Brain, Link2, ArrowUp } from "lucide-react";
import type { Citation, CitationType, CitationLibrary } from "../types/citationSchema";
import { getOrderedCitations } from "../types/citationSchema";

interface FootnotesSectionProps {
  /** Citation library containing all citations */
  library: CitationLibrary;
  /** Section title */
  title?: string;
  /** Whether to show back-links to occurrences */
  showBackLinks?: boolean;
  /** Custom class name */
  className?: string;
  /** Callback to open internal reader */
  onOpenReader?: (item: { id: string; title: string; url?: string; source?: string; publishedAt?: string }) => void;
}

/**
 * Get icon for citation type
 */
const getCitationIcon = (type: CitationType) => {
  switch (type) {
    case "source":
      return ExternalLink;
    case "data":
      return BarChart3;
    case "quote":
      return Quote;
    case "analysis":
      return Brain;
    case "internal":
      return FileText;
    default:
      return Link2;
  }
};

/**
 * Get color classes for citation type badge
 */
const getTypeBadgeColors = (type: CitationType) => {
  switch (type) {
    case "source":
      return "bg-blue-50 text-blue-600 border-blue-200";
    case "data":
      return "bg-indigo-50 text-indigo-600 border-indigo-200";
    case "quote":
      return "bg-amber-50 text-amber-600 border-amber-200";
    case "analysis":
      return "bg-purple-50 text-purple-600 border-purple-200";
    case "internal":
      return "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] border-[color:var(--border-color)]";
    default:
      return "bg-blue-50 text-blue-600 border-blue-200";
  }
};

/**
 * Single footnote entry
 */
const FootnoteEntry: React.FC<{
  citation: Citation;
  showBackLinks: boolean;
  onOpenReader?: (item: { id: string; title: string; url?: string; source?: string; publishedAt?: string }) => void;
}> = ({ citation, showBackLinks, onOpenReader }) => {
  const Icon = getCitationIcon(citation.type);
  const badgeColors = getTypeBadgeColors(citation.type);

  const handleBackLinkClick = (occurrenceId: string) => {
    const el = document.getElementById(occurrenceId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-yellow-100");
      setTimeout(() => el.classList.remove("bg-yellow-100"), 2000);
    }
  };

  return (
    <div
      id={`footnote-${citation.id}`}
      className="group flex gap-3 p-3 rounded-lg hover:bg-[color:var(--bg-hover)] transition-colors"
    >
      {/* Number badge */}
      <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] font-semibold text-sm">
        {citation.number}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-[color:var(--text-secondary)]" />
          <span className="font-medium text-[color:var(--text-primary)] text-sm">{citation.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeColors}`}>
            {citation.type}
          </span>
        </div>

        {/* Full text */}
        <p className="text-sm text-[color:var(--text-primary)] leading-relaxed mb-2">
          {citation.fullText}
        </p>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--text-secondary)]">
          {citation.author && <span>{citation.author}</span>}
          {citation.publishedAt && (
            <span>{new Date(citation.publishedAt).toLocaleDateString()}</span>
          )}
          {citation.url && (
            <button
              onClick={() => {
                if (onOpenReader) {
                  onOpenReader({
                    id: citation.id,
                    title: citation.label,
                    url: citation.url,
                    source: citation.author,
                    publishedAt: citation.publishedAt,
                  });
                } else {
                  window.open(citation.url, "_blank");
                }
              }}
              className="flex items-center gap-1 text-blue-500 hover:text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
            >
              <ExternalLink className="w-3 h-3" />
              <span className="truncate max-w-[200px]">{new URL(citation.url).hostname}</span>
            </button>
          )}
          {citation.accessedAt && (
            <span className="text-[color:var(--text-secondary)]">
              Accessed {new Date(citation.accessedAt).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Back-links */}
        {showBackLinks && citation.occurrences.length > 0 && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[color:var(--border-color)]">
            <span className="text-[10px] text-[color:var(--text-secondary)] uppercase tracking-wider">Jump to:</span>
            {citation.occurrences.map((occ, idx) => (
              <button
                key={occ.id}
                onClick={() => handleBackLinkClick(occ.id)}
                className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-600 hover:underline"
              >
                <ArrowUp className="w-3 h-3" />
                <span>↩{idx + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * FootnotesSection - Displays all citations in a document
 *
 * AI-2027.com-inspired footnotes section with:
 * - Numbered entries matching inline markers
 * - Type badges for visual distinction
 * - Back-links to jump to citation occurrences
 * - External link indicators
 */
export const FootnotesSection: React.FC<FootnotesSectionProps> = ({
  library,
  title = "Sources & References",
  showBackLinks = true,
  className = "",
  onOpenReader,
}) => {
  const citations = getOrderedCitations(library);

  if (citations.length === 0) {
    return null;
  }

  return (
    <section className={`mt-12 pt-8 border-t-2 border-[color:var(--border-color)] ${className}`}>
      <h3 className="text-lg font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-[color:var(--text-secondary)]" />
        {title}
        <span className="text-sm font-normal text-[color:var(--text-secondary)]">({citations.length})</span>
      </h3>

      <div className="space-y-1 divide-y divide-[color:var(--border-color)]">
        {citations.map((citation) => (
          <FootnoteEntry
            key={citation.id}
            citation={citation}
            showBackLinks={showBackLinks}
            onOpenReader={onOpenReader}
          />
        ))}
      </div>
    </section>
  );
};

export default FootnotesSection;
