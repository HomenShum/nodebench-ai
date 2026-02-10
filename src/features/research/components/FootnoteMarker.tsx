"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import { ExternalLink, FileText, Quote, BarChart3, Brain, Link2 } from "lucide-react";
import type { Citation, CitationType } from "../types/citationSchema";

interface FootnoteMarkerProps {
  /** Citation data */
  citation: Citation;
  /** Whether to show preview tooltip on hover */
  showPreview?: boolean;
  /** Callback when marker is clicked */
  onClick?: (citation: Citation) => void;
  /** Custom class name */
  className?: string;
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
 * Get color classes for citation type
 */
const getCitationColors = (type: CitationType) => {
  switch (type) {
    case "source":
      return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200";
    case "data":
      return "bg-indigo-100 text-gray-700 hover:bg-indigo-200 border-indigo-200";
    case "quote":
      return "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200";
    case "analysis":
      return "bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200";
    case "internal":
      return "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] hover:bg-[color:var(--bg-tertiary)] border-[color:var(--border-color)]";
    default:
      return "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200";
  }
};

/**
 * FootnoteMarker - AI-2027.com-style footnote citation marker
 *
 * Displays as [1], [2], etc. with hover preview and click-to-navigate.
 * Supports different citation types with visual distinction.
 */
export const FootnoteMarker: React.FC<FootnoteMarkerProps> = ({
  citation,
  showPreview = true,
  onClick,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (!showPreview) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(true), 200);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setIsOpen(false), 100);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick(citation);
    } else if (citation.url) {
      window.open(citation.url, "_blank", "noopener,noreferrer");
    } else {
      // Scroll to footnotes section
      const footnoteEl = document.getElementById(`footnote-${citation.id}`);
      if (footnoteEl) {
        footnoteEl.scrollIntoView({ behavior: "smooth", block: "center" });
        footnoteEl.classList.add("ring-2", "ring-blue-500");
        setTimeout(() => footnoteEl.classList.remove("ring-2", "ring-blue-500"), 2000);
      }
    }
  };

  const Icon = getCitationIcon(citation.type);
  const colorClasses = getCitationColors(citation.type);

  return (
    <span
      className="relative inline-flex align-super"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className={`
          inline-flex items-center justify-center
          min-w-[1.25rem] h-5 px-1
          text-[10px] font-semibold
          rounded border
          transition-all duration-150
          cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
          ${colorClasses}
          ${className}
        `}
        aria-describedby={showPreview ? tooltipId : undefined}
        aria-label={`Citation ${citation.number}: ${citation.label}`}
      >
        [{citation.number}]
      </button>

      {/* Preview Tooltip */}
      {showPreview && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`
            pointer-events-none absolute left-1/2 -translate-x-1/2 top-full z-50
            w-80 mt-2 p-3
            rounded-lg border border-[color:var(--border-color)] bg-[color:var(--bg-primary)] shadow-xl ring-1 ring-black/5
            transition-all duration-200 origin-top
            ${isOpen ? "opacity-100 scale-100 visible" : "opacity-0 scale-95 invisible"}
          `}
        >
          <span className="flex flex-col gap-2">
            {/* Header */}
            <span className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-[color:var(--text-secondary)]" />
              <span className="text-xs font-semibold text-[color:var(--text-primary)] line-clamp-1">
                {citation.label}
              </span>
              <span className={`ml-auto text-[9px] px-1.5 py-0.5 rounded ${colorClasses}`}>
                {citation.type}
              </span>
            </span>

            {/* Full text preview */}
            <span className="text-sm text-[color:var(--text-primary)] line-clamp-3">
              {citation.fullText}
            </span>

            {/* Source info */}
            {(citation.author || citation.publishedAt) && (
              <span className="flex items-center gap-2 text-[10px] text-[color:var(--text-secondary)] border-t border-[color:var(--border-color)] pt-2">
                {citation.author && <span>{citation.author}</span>}
                {citation.author && citation.publishedAt && <span>•</span>}
                {citation.publishedAt && (
                  <span>{new Date(citation.publishedAt).toLocaleDateString()}</span>
                )}
              </span>
            )}

            {/* URL indicator */}
            {citation.url && (
              <span className="flex items-center gap-1 text-[10px] text-blue-500">
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{new URL(citation.url).hostname}</span>
              </span>
            )}
          </span>
        </span>
      )}
    </span>
  );
};

export default FootnoteMarker;

