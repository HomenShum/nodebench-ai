"use client";

import React from "react";
import { ArrowLeft, FileText, ExternalLink, Search } from "lucide-react";
import { FootnotesSection } from "../components/FootnotesSection";
import type { CitationLibrary } from "../types/citationSchema";

interface FootnotesPageProps {
  /** Citation library to display */
  library: CitationLibrary;
  /** Brief title for context */
  briefTitle?: string;
  /** Brief date for context */
  briefDate?: string;
  /** Callback to go back */
  onBack?: () => void;
}

/**
 * FootnotesPage - Dedicated page for viewing all citations
 * 
 * AI-2027.com-inspired full-page footnotes view with:
 * - Search/filter functionality
 * - Full citation details
 * - Back navigation
 */
export const FootnotesPage: React.FC<FootnotesPageProps> = ({
  library,
  briefTitle = "Latest Intelligence Brief",
  briefDate,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = React.useState("");
  
  // Filter citations based on search
  const filteredLibrary = React.useMemo(() => {
    if (!searchQuery.trim()) return library;
    
    const query = searchQuery.toLowerCase();
    const filteredCitations: typeof library.citations = {};
    const filteredOrder: string[] = [];
    
    for (const id of library.order) {
      const citation = library.citations[id];
      if (
        citation.label.toLowerCase().includes(query) ||
        citation.fullText.toLowerCase().includes(query) ||
        citation.author?.toLowerCase().includes(query) ||
        citation.url?.toLowerCase().includes(query)
      ) {
        filteredCitations[id] = citation;
        filteredOrder.push(id);
      }
    }
    
    return {
      ...library,
      citations: filteredCitations,
      order: filteredOrder,
    };
  }, [library, searchQuery]);

  const citationCount = library.order.length;
  const filteredCount = filteredLibrary.order.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[color:var(--bg-secondary)] to-[color:var(--bg-primary)] editorial-layout">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[color:var(--bg-primary)]/95 backdrop-blur-sm border-b border-[color:var(--border-color)] shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back to Brief</span>
                </button>
              )}
              <div className="h-6 w-px bg-[color:var(--border-color)]" />
              <div>
                <h1 className="text-lg font-semibold text-[color:var(--text-primary)] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[color:var(--text-secondary)]" />
                  Sources & References
                </h1>
                <p className="text-xs text-[color:var(--text-secondary)]">
                  {briefTitle} {briefDate && `• ${briefDate}`}
                </p>
              </div>
            </div>

            {/* Citation count */}
            <div className="text-sm text-[color:var(--text-secondary)]">
              {searchQuery ? (
                <span>{filteredCount} of {citationCount} sources</span>
              ) : (
                <span>{citationCount} sources</span>
              )}
            </div>
          </div>
          
          {/* Search bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Search sources by title, author, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-[color:var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {filteredLibrary.order.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-[color:var(--text-secondary)] mx-auto mb-4" />
            <p className="text-[color:var(--text-secondary)]">
              {searchQuery ? "No sources match your search" : "No sources available"}
            </p>
          </div>
        ) : (
          <FootnotesSection
            library={filteredLibrary}
            title=""
            showBackLinks={true}
            className="border-t-0 mt-0 pt-0"
          />
        )}
      </main>
    </div>
  );
};

export default FootnotesPage;
