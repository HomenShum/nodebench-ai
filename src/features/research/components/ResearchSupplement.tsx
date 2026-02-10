"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  BookOpen,
  BarChart3,
  Users,
  Building2,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type SupplementType =
  | "deep_dive"      // In-depth analysis
  | "data_appendix"  // Data tables and charts
  | "methodology"    // Research methodology
  | "sources"        // Source bibliography
  | "timeline"       // Historical timeline
  | "comparison"     // Competitive comparison
  | "risk_analysis"; // Risk assessment

export interface SupplementSection {
  /** Unique section ID */
  id: string;
  /** Section title */
  title: string;
  /** Section type for icon/styling */
  type: SupplementType;
  /** Section content (markdown or structured) */
  content: string;
  /** Optional structured data */
  data?: Record<string, unknown>;
  /** Whether section is expanded by default */
  defaultExpanded?: boolean;
  /** Related citation IDs */
  citationIds?: string[];
  /** Last updated timestamp */
  updatedAt?: string;
}

export interface ResearchSupplement {
  /** Unique supplement ID */
  id: string;
  /** Supplement title */
  title: string;
  /** Brief description */
  description: string;
  /** Parent brief/dossier ID */
  parentId: string;
  /** Sections within the supplement */
  sections: SupplementSection[];
  /** Overall status */
  status: "draft" | "complete" | "updating";
  /** Created timestamp */
  createdAt: string;
  /** Last updated timestamp */
  updatedAt: string;
}

interface ResearchSupplementProps {
  /** Supplement data */
  supplement: ResearchSupplement;
  /** Callback when a section is expanded */
  onSectionExpand?: (sectionId: string) => void;
  /** Callback when a citation is clicked */
  onCitationClick?: (citationId: string) => void;
  /** Custom class name */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const getSupplementIcon = (type: SupplementType) => {
  switch (type) {
    case "deep_dive":
      return BookOpen;
    case "data_appendix":
      return BarChart3;
    case "methodology":
      return Lightbulb;
    case "sources":
      return FileText;
    case "timeline":
      return Clock;
    case "comparison":
      return Users;
    case "risk_analysis":
      return AlertTriangle;
    default:
      return FileText;
  }
};

const getSupplementColors = (type: SupplementType) => {
  switch (type) {
    case "deep_dive":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "data_appendix":
      return "bg-indigo-50 text-gray-700 border-indigo-200";
    case "methodology":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "sources":
      return "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] border-[color:var(--border-color)]";
    case "timeline":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "comparison":
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    case "risk_analysis":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] border-[color:var(--border-color)]";
  }
};

const getStatusBadge = (status: ResearchSupplement["status"]) => {
  switch (status) {
    case "complete":
      return { icon: CheckCircle, text: "Complete", color: "text-green-600 bg-green-50" };
    case "updating":
      return { icon: Clock, text: "Updating", color: "text-amber-600 bg-amber-50" };
    case "draft":
    default:
      return { icon: FileText, text: "Draft", color: "text-[color:var(--text-primary)] bg-[color:var(--bg-secondary)]" };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface SupplementSectionCardProps {
  section: SupplementSection;
  isExpanded: boolean;
  onToggle: () => void;
  onCitationClick?: (citationId: string) => void;
}

const SupplementSectionCard: React.FC<SupplementSectionCardProps> = ({
  section,
  isExpanded,
  onToggle,
  onCitationClick,
}) => {
  const Icon = getSupplementIcon(section.type);
  const colors = getSupplementColors(section.type);

  return (
    <div className="border border-[color:var(--border-color)] rounded-lg overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-4 text-left hover:bg-[color:var(--bg-hover)] transition-colors ${
          isExpanded ? "bg-[color:var(--bg-secondary)]" : ""
        }`}
      >
        <span className={`p-2 rounded-lg ${colors}`}>
          <Icon className="w-4 h-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="font-medium text-[color:var(--text-primary)] block">{section.title}</span>
          <span className="text-xs text-[color:var(--text-secondary)] capitalize">{section.type.replace("_", " ")}</span>
        </span>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-[color:var(--text-secondary)]" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[color:var(--text-secondary)]" />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-[color:var(--border-color)]">
              {/* Markdown content */}
              <div className="prose prose-sm max-w-none text-[color:var(--text-primary)]">
                {section.content}
              </div>

              {/* Citation links */}
              {section.citationIds && section.citationIds.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[color:var(--border-color)]">
                  <span className="text-xs text-[color:var(--text-secondary)] uppercase tracking-wider">
                    Related Sources:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {section.citationIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onCitationClick?.(id)}
                        className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        [{id}]
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Updated timestamp */}
              {section.updatedAt && (
                <div className="mt-2 text-[10px] text-[color:var(--text-secondary)]">
                  Updated: {new Date(section.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * ResearchSupplement - Deep-dive research supplement component
 *
 * Displays expandable sections of supplementary research content
 * linked to daily briefs with citation references.
 */
export const ResearchSupplementView: React.FC<ResearchSupplementProps> = ({
  supplement,
  onSectionExpand,
  onCitationClick,
  className = "",
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    supplement.sections.forEach((s) => {
      if (s.defaultExpanded) initial.add(s.id);
    });
    return initial;
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
        onSectionExpand?.(sectionId);
      }
      return next;
    });
  };

  const statusBadge = getStatusBadge(supplement.status);
  const StatusIcon = statusBadge.icon;

  return (
    <div className={`bg-[color:var(--bg-primary)] rounded-xl border border-[color:var(--border-color)] shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-[color:var(--border-color)]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-[color:var(--text-secondary)]" />
              <h2 className="text-lg font-semibold text-[color:var(--text-primary)]">{supplement.title}</h2>
            </div>
            <p className="text-sm text-[color:var(--text-primary)]">{supplement.description}</p>
          </div>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusBadge.color}`}>
            <StatusIcon className="w-3 h-3" />
            {statusBadge.text}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-[color:var(--text-secondary)]">
          <span>{supplement.sections.length} sections</span>
          <span>•</span>
          <span>Updated {new Date(supplement.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Sections */}
      <div className="p-4 space-y-2">
        {supplement.sections.map((section) => (
          <SupplementSectionCard
            key={section.id}
            section={section}
            isExpanded={expandedSections.has(section.id)}
            onToggle={() => toggleSection(section.id)}
            onCitationClick={onCitationClick}
          />
        ))}
      </div>
    </div>
  );
};

export default ResearchSupplementView;

