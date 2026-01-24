"use client";

/**
 * ChangeCard Component
 *
 * Displays a detected change from an authoritative source.
 * Part of the Knowledge Product Layer (Phase 1).
 *
 * Features:
 * - Change type badge (Added/Removed/Breaking/Deprecated)
 * - Severity indicator (Critical = red, High = orange, etc.)
 * - Title + summary
 * - Affected sections
 * - "View diff" expand button
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  AlertCircle,
  Info,
  PlusCircle,
  MinusCircle,
  Zap,
  Clock,
  ExternalLink,
  FileText,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type ChangeType =
  | "guidance_added"
  | "guidance_removed"
  | "guidance_modified"
  | "breaking_change"
  | "deprecation"
  | "new_pattern"
  | "pricing_change"
  | "api_change"
  | "model_update"
  | "minor_update";

export type Severity = "critical" | "high" | "medium" | "low";

export interface DiffHunk {
  type: "add" | "remove" | "modify";
  oldText?: string;
  newText?: string;
  context?: string;
}

export interface SourceDiff {
  _id: string;
  registryId: string;
  fromSnapshotAt: number;
  toSnapshotAt: number;
  changeType: ChangeType;
  severity: Severity;
  changeTitle: string;
  changeSummary: string;
  affectedSections: string[];
  diffHunks?: DiffHunk[];
  classifiedBy?: string;
  classificationConfidence?: number;
  detectedAt: number;
}

export interface SourceInfo {
  name: string;
  domain: string;
  canonicalUrl: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Severity badge with appropriate coloring
 */
function SeverityBadge({ severity }: { severity: Severity }) {
  const config: Record<
    Severity,
    { bg: string; text: string; border: string; icon: React.ReactNode; label: string }
  > = {
    critical: {
      bg: "bg-red-50",
      text: "text-red-700",
      border: "border-red-200",
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "Critical",
    },
    high: {
      bg: "bg-orange-50",
      text: "text-orange-700",
      border: "border-orange-200",
      icon: <AlertCircle className="w-3 h-3" />,
      label: "High",
    },
    medium: {
      bg: "bg-amber-50",
      text: "text-amber-700",
      border: "border-amber-200",
      icon: <Info className="w-3 h-3" />,
      label: "Medium",
    },
    low: {
      bg: "bg-stone-50",
      text: "text-stone-600",
      border: "border-stone-200",
      icon: <Info className="w-3 h-3" />,
      label: "Low",
    },
  };

  const { bg, text, border, icon, label } = config[severity];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${bg} ${text} ${border}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * Change type badge
 */
function ChangeTypeBadge({ changeType }: { changeType: ChangeType }) {
  const config: Record<
    ChangeType,
    { bg: string; text: string; icon: React.ReactNode; label: string }
  > = {
    guidance_added: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      icon: <PlusCircle className="w-3 h-3" />,
      label: "Added",
    },
    guidance_removed: {
      bg: "bg-red-100",
      text: "text-red-700",
      icon: <MinusCircle className="w-3 h-3" />,
      label: "Removed",
    },
    guidance_modified: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      icon: <FileText className="w-3 h-3" />,
      label: "Modified",
    },
    breaking_change: {
      bg: "bg-red-100",
      text: "text-red-700",
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "Breaking",
    },
    deprecation: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      icon: <Clock className="w-3 h-3" />,
      label: "Deprecated",
    },
    new_pattern: {
      bg: "bg-purple-100",
      text: "text-purple-700",
      icon: <Zap className="w-3 h-3" />,
      label: "New Pattern",
    },
    pricing_change: {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      icon: <Info className="w-3 h-3" />,
      label: "Pricing",
    },
    api_change: {
      bg: "bg-indigo-100",
      text: "text-indigo-700",
      icon: <Zap className="w-3 h-3" />,
      label: "API Change",
    },
    model_update: {
      bg: "bg-teal-100",
      text: "text-teal-700",
      icon: <Zap className="w-3 h-3" />,
      label: "Model Update",
    },
    minor_update: {
      bg: "bg-stone-100",
      text: "text-stone-600",
      icon: <Info className="w-3 h-3" />,
      label: "Minor",
    },
  };

  const { bg, text, icon, label } = config[changeType];

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

/**
 * Time ago helper
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Diff hunk display
 */
function DiffHunkDisplay({ hunk }: { hunk: DiffHunk }) {
  return (
    <div className="font-mono text-xs rounded border border-stone-200 overflow-hidden">
      {hunk.context && (
        <div className="bg-stone-50 px-3 py-1 text-stone-500 border-b border-stone-200">
          {hunk.context}
        </div>
      )}
      {hunk.type === "remove" && hunk.oldText && (
        <div className="bg-red-50 px-3 py-1 text-red-700">
          <span className="text-red-500">- </span>
          {hunk.oldText}
        </div>
      )}
      {hunk.type === "add" && hunk.newText && (
        <div className="bg-emerald-50 px-3 py-1 text-emerald-700">
          <span className="text-emerald-500">+ </span>
          {hunk.newText}
        </div>
      )}
      {hunk.type === "modify" && (
        <>
          {hunk.oldText && (
            <div className="bg-red-50 px-3 py-1 text-red-700">
              <span className="text-red-500">- </span>
              {hunk.oldText}
            </div>
          )}
          {hunk.newText && (
            <div className="bg-emerald-50 px-3 py-1 text-emerald-700">
              <span className="text-emerald-500">+ </span>
              {hunk.newText}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

interface ChangeCardProps {
  diff: SourceDiff;
  source?: SourceInfo;
  defaultExpanded?: boolean;
  onViewSource?: (url: string) => void;
}

export function ChangeCard({
  diff,
  source,
  defaultExpanded = false,
  onViewSource,
}: ChangeCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Determine accent color based on severity
  const accentColors: Record<Severity, string> = {
    critical: "from-red-500 to-red-600",
    high: "from-orange-500 to-orange-600",
    medium: "from-amber-500 to-amber-600",
    low: "from-slate-400 to-slate-500",
  };

  return (
    <div
      className="group relative bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl overflow-hidden
                 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
    >
      {/* Left Accent Border */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${accentColors[diff.severity]}`} />

      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left pl-5 pr-4 py-4 flex items-start gap-3"
      >
        {/* Change Type Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <ChangeTypeBadge changeType={diff.changeType} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title Row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)] leading-tight">
              {diff.changeTitle}
            </h3>
            <SeverityBadge severity={diff.severity} />
          </div>

          {/* Source & Time */}
          <div className="flex items-center gap-2 text-xs text-[color:var(--text-muted)] mb-2">
            {source && (
              <>
                <span className="font-medium text-[color:var(--text-secondary)]">
                  {source.name}
                </span>
                <span>•</span>
              </>
            )}
            <span>{formatTimeAgo(diff.detectedAt)}</span>
          </div>

          {/* Summary */}
          <p className="text-sm text-[color:var(--text-secondary)] line-clamp-2">
            {diff.changeSummary}
          </p>

          {/* Affected Sections Preview */}
          {diff.affectedSections.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {diff.affectedSections.slice(0, 3).map((section) => (
                <span
                  key={section}
                  className="px-1.5 py-0.5 text-[10px] bg-stone-100 text-stone-600 rounded"
                >
                  {section}
                </span>
              ))}
              {diff.affectedSections.length > 3 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-stone-100 text-stone-500 rounded">
                  +{diff.affectedSections.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="flex-shrink-0 text-[color:var(--text-muted)]">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="pl-5 pr-4 pb-4 border-t border-[color:var(--border-color)]">
          {/* Diff Hunks */}
          {diff.diffHunks && diff.diffHunks.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide mb-2">
                Changes
              </h4>
              {diff.diffHunks.map((hunk, i) => (
                <DiffHunkDisplay key={i} hunk={hunk} />
              ))}
            </div>
          )}

          {/* All Affected Sections */}
          {diff.affectedSections.length > 3 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-[color:var(--text-muted)] uppercase tracking-wide mb-2">
                All Affected Sections
              </h4>
              <div className="flex flex-wrap gap-1">
                {diff.affectedSections.map((section) => (
                  <span
                    key={section}
                    className="px-2 py-1 text-xs bg-stone-100 text-stone-600 rounded"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Classification Metadata */}
          {diff.classifiedBy && (
            <div className="mt-4 flex items-center gap-2 text-xs text-[color:var(--text-muted)]">
              <span>Classified by: {diff.classifiedBy}</span>
              {diff.classificationConfidence && (
                <>
                  <span>•</span>
                  <span>Confidence: {Math.round(diff.classificationConfidence * 100)}%</span>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex items-center gap-3">
            {source && (
              <button
                type="button"
                onClick={() => onViewSource?.(source.canonicalUrl)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                         bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Source
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
interface ChangeListItemProps {
  diff: SourceDiff;
  source?: SourceInfo;
  selected?: boolean;
  onSelect?: () => void;
}

export function ChangeListItem({ diff, source, selected = false, onSelect }: ChangeListItemProps) {
  const severityColor: Record<Severity, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-amber-500",
    low: "bg-stone-400",
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
        selected
          ? "border-indigo-300 bg-indigo-50/60"
          : "border-[color:var(--border-color)] bg-[color:var(--bg-primary)] hover:bg-[color:var(--bg-hover)]"
      }`}
      aria-current={selected}
    >
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 h-2 w-2 rounded-full ${severityColor[diff.severity]}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-[color:var(--text-primary)] leading-tight line-clamp-2">
              {diff.changeTitle}
            </p>
            <span className="flex-shrink-0">
              <ChangeTypeBadge changeType={diff.changeType} />
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[color:var(--text-muted)]">
            <span className="truncate">{source?.name ?? diff.registryId}</span>
            <span>•</span>
            <span>{formatTimeAgo(diff.detectedAt)}</span>
          </div>
          <p className="mt-1 text-xs text-[color:var(--text-secondary)] line-clamp-2">
            {diff.changeSummary}
          </p>
        </div>
      </div>
    </button>
  );
}

// Change Card List Component
// ═══════════════════════════════════════════════════════════════════════════

interface ChangeCardListProps {
  diffs: SourceDiff[];
  sources?: Map<string, SourceInfo>;
  emptyMessage?: string;
  onViewSource?: (url: string) => void;
}

export function ChangeCardList({
  diffs,
  sources,
  emptyMessage = "No changes detected",
  onViewSource,
}: ChangeCardListProps) {
  if (diffs.length === 0) {
    return (
      <div className="text-center py-8 text-[color:var(--text-muted)]">
        <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {diffs.map((diff) => (
        <ChangeCard
          key={diff._id}
          diff={diff}
          source={sources?.get(diff.registryId)}
          onViewSource={onViewSource}
        />
      ))}
    </div>
  );
}

export default ChangeCard;
