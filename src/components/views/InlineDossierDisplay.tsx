/**
 * InlineDossierDisplay - Newspaper-style display for agent research results
 * 
 * Renders funding announcements and research results inline on WelcomeLanding
 * without navigation. Uses DossierViewer's media card components for consistency.
 */

import React from 'react';
import { Building2, TrendingUp, Users, MapPin, ExternalLink, Calendar, DollarSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface FundingAnnouncement {
  companyName: string;
  description?: string;
  website?: string;
  fundingStage: string;
  amountRaised?: string;
  leadInvestors?: string[];
  otherInvestors?: string[];
  industry?: string;
  sector?: string;
  location?: string;
  announcementDate?: string;
  newsSource?: string;
  newsUrl?: string;
  keyHighlights?: string[];
}

interface InlineDossierDisplayProps {
  content: string; // Markdown content from agent
  isLoading?: boolean;
}

/**
 * Parse markdown content to extract structured funding data
 */
function parseFundingContent(markdown: string): {
  summary: string;
  announcements: FundingAnnouncement[];
  sources: Array<{ name: string; url: string }>;
} {
  // Simple parser - in production, you'd use a proper markdown parser
  // For now, we'll just display the markdown content
  // The agent's response is already well-formatted
  
  return {
    summary: '',
    announcements: [],
    sources: [],
  };
}

/**
 * Funding announcement card component
 */
function FundingCard({ announcement }: { announcement: FundingAnnouncement }) {
  return (
    <div className="group relative rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 hover:border-[var(--accent-primary)] transition-all duration-200 hover:shadow-lg">
      {/* Company Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[var(--accent-primary)]" />
            {announcement.companyName}
          </h3>
          {announcement.description && (
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
              {announcement.description}
            </p>
          )}
        </div>
        
        {/* Funding Stage Badge */}
        <div className="ml-3 flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-500/20">
            <TrendingUp className="h-3 w-3" />
            {announcement.fundingStage}
          </span>
        </div>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {announcement.amountRaised && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <span className="font-medium text-[var(--text-primary)]">{announcement.amountRaised}</span>
          </div>
        )}
        
        {announcement.location && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <span className="text-[var(--text-secondary)]">{announcement.location}</span>
          </div>
        )}
        
        {announcement.industry && (
          <div className="flex items-center gap-2 text-sm col-span-2">
            <span className="text-[var(--text-tertiary)]">Industry:</span>
            <span className="text-[var(--text-secondary)]">{announcement.industry}</span>
          </div>
        )}
      </div>
      
      {/* Investors */}
      {announcement.leadInvestors && announcement.leadInvestors.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Users className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            <span className="text-xs font-medium text-[var(--text-tertiary)]">Lead Investors</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {announcement.leadInvestors.map((investor, idx) => (
              <span
                key={idx}
                className="inline-block px-2 py-0.5 rounded-md text-xs bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]"
              >
                {investor}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Key Highlights */}
      {announcement.keyHighlights && announcement.keyHighlights.length > 0 && (
        <div className="mb-3">
          <ul className="space-y-1">
            {announcement.keyHighlights.slice(0, 3).map((highlight, idx) => (
              <li key={idx} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
                <span className="text-[var(--accent-primary)] mt-0.5">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Footer Links */}
      <div className="flex items-center gap-3 pt-3 border-t border-[var(--border-color)]">
        {announcement.website && (
          <a
            href={announcement.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
          >
            Website
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {announcement.newsUrl && (
          <a
            href={announcement.newsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--accent-primary)] hover:underline flex items-center gap-1"
          >
            {announcement.newsSource || 'Source'}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * Main inline dossier display component
 */
export function InlineDossierDisplay({ content, isLoading }: InlineDossierDisplayProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--bg-secondary)] rounded w-1/3" />
          <div className="h-4 bg-[var(--bg-secondary)] rounded w-2/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-[var(--bg-secondary)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (!content) {
    return null;
  }
  
  // For now, render the markdown content directly
  // In a future iteration, we can parse it to extract structured data
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 animate-[fadeIn_0.6s_ease-out]">
      {/* Newspaper-style header */}
      <div className="mb-8 pb-6 border-b-2 border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="h-5 w-5 text-[var(--accent-primary)]" />
          <span className="text-sm font-medium text-[var(--text-tertiary)]">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-2">
          Today's Funding Digest
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Latest seed and Series A announcements in healthcare, life sciences, and technology
        </p>
      </div>
      
      {/* Markdown content with custom styling */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-4 mt-8 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-3 mt-6 pb-2 border-b border-[var(--border-color)]">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 mt-4">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-sm text-[var(--text-secondary)] mb-3 leading-relaxed">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="space-y-2 mb-4 ml-4">
                {children}
              </ul>
            ),
            li: ({ children }) => (
              <li className="text-sm text-[var(--text-secondary)] flex items-start gap-2">
                <span className="text-[var(--accent-primary)] mt-1">•</span>
                <span>{children}</span>
              </li>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-primary)] hover:underline inline-flex items-center gap-1"
              >
                {children}
                <ExternalLink className="h-3 w-3 inline" />
              </a>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-[var(--text-primary)]">
                {children}
              </strong>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

