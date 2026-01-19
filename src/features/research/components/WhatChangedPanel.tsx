"use client";

/**
 * WhatChangedPanel Component
 *
 * Displays recent changes detected in authoritative sources.
 * Part of the Knowledge Product Layer (Phase 1).
 *
 * Features:
 * - Fetches recent diffs from source registry
 * - Filters by severity, domain, or time range
 * - Integrates with ChangeCard for individual change display
 */

import React, { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  Bell,
  AlertTriangle,
  Clock,
  Filter,
  RefreshCw,
  ChevronDown,
  Zap,
  BookOpen,
} from "lucide-react";
import { ChangeCard, ChangeCardList, type SourceDiff, type Severity, type SourceInfo } from "./ChangeCard";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface WhatChangedPanelProps {
  /** Maximum number of diffs to display */
  limit?: number;
  /** Filter by severity */
  severityFilter?: Severity;
  /** Filter by domain (e.g., "anthropic", "openai") */
  domainFilter?: string;
  /** Time range in days (default: 7) */
  daysBack?: number;
  /** Show header with stats */
  showHeader?: boolean;
  /** Compact mode for embedding */
  compact?: boolean;
  /** Callback when user clicks to view source */
  onViewSource?: (url: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Components
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Filter bar for severity and time range
 */
function FilterBar({
  severity,
  onSeverityChange,
  daysBack,
  onDaysBackChange,
}: {
  severity: Severity | "all";
  onSeverityChange: (s: Severity | "all") => void;
  daysBack: number;
  onDaysBackChange: (d: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Severity Filter */}
      <div className="flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5 text-[color:var(--text-muted)]" />
        <select
          value={severity}
          onChange={(e) => onSeverityChange(e.target.value as Severity | "all")}
          className="text-xs bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded px-2 py-1 text-[color:var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Time Range Filter */}
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-[color:var(--text-muted)]" />
        <select
          value={daysBack}
          onChange={(e) => onDaysBackChange(parseInt(e.target.value))}
          className="text-xs bg-[color:var(--bg-secondary)] border border-[color:var(--border-color)] rounded px-2 py-1 text-[color:var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>
    </div>
  );
}

/**
 * Stats summary bar
 */
function StatsBar({
  total,
  critical,
  high,
  medium,
  low,
}: {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1.5 text-[color:var(--text-muted)]">
        <Zap className="w-3.5 h-3.5" />
        <span>{total} changes</span>
      </div>
      {critical > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          <span>{critical} critical</span>
        </div>
      )}
      {high > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
          <span>{high} high</span>
        </div>
      )}
      {medium > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          <span>{medium} medium</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function WhatChangedPanel({
  limit = 20,
  severityFilter,
  domainFilter,
  daysBack = 7,
  showHeader = true,
  compact = false,
  onViewSource,
}: WhatChangedPanelProps) {
  // Local filter state
  const [selectedSeverity, setSelectedSeverity] = useState<Severity | "all">(severityFilter ?? "all");
  const [selectedDaysBack, setSelectedDaysBack] = useState(daysBack);

  // Calculate time cutoff
  const sinceTime = useMemo(() => {
    return Date.now() - selectedDaysBack * 24 * 60 * 60 * 1000;
  }, [selectedDaysBack]);

  // Fetch diffs from Convex
  const diffsData = useQuery(api.domains.knowledge.sourceDiffs.getAllRecentDiffs, {
    limit,
    severityFilter: selectedSeverity === "all" ? undefined : selectedSeverity,
    sinceTime,
  });

  // Fetch all sources for lookup
  const sourcesData = useQuery(api.domains.knowledge.sourceRegistry.getAllActiveSources, {});

  // Build source lookup map
  const sourcesMap = useMemo(() => {
    const map = new Map<string, SourceInfo>();
    if (sourcesData) {
      for (const source of sourcesData) {
        map.set(source.registryId, {
          name: source.name,
          domain: source.domain,
          canonicalUrl: source.canonicalUrl,
        });
      }
    }
    return map;
  }, [sourcesData]);

  // Filter by domain if specified
  const filteredDiffs = useMemo(() => {
    if (!diffsData) return [];
    if (!domainFilter) return diffsData;

    return diffsData.filter((diff) => {
      const source = sourcesMap.get(diff.registryId);
      return source?.domain === domainFilter;
    });
  }, [diffsData, domainFilter, sourcesMap]);

  // Compute stats
  const stats = useMemo(() => {
    const s = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    for (const diff of filteredDiffs) {
      s.total++;
      s[diff.severity]++;
    }
    return s;
  }, [filteredDiffs]);

  // Handle view source
  const handleViewSource = (url: string) => {
    if (onViewSource) {
      onViewSource(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Loading state
  if (diffsData === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 text-[color:var(--text-muted)] animate-spin" />
        <span className="ml-2 text-sm text-[color:var(--text-muted)]">Loading changes...</span>
      </div>
    );
  }

  // Transform to SourceDiff type for ChangeCard
  const diffs: SourceDiff[] = filteredDiffs.map((d) => ({
    _id: d._id,
    registryId: d.registryId,
    fromSnapshotAt: d.fromSnapshotAt,
    toSnapshotAt: d.toSnapshotAt,
    changeType: d.changeType,
    severity: d.severity,
    changeTitle: d.changeTitle,
    changeSummary: d.changeSummary,
    affectedSections: d.affectedSections,
    diffHunks: d.diffHunks,
    classifiedBy: d.classifiedBy ?? undefined,
    classificationConfidence: d.classificationConfidence ?? undefined,
    detectedAt: d.detectedAt,
  }));

  return (
    <div className={`flex flex-col ${compact ? "gap-3" : "gap-4"}`}>
      {/* Header */}
      {showHeader && (
        <div className={`flex flex-col gap-3 ${compact ? "" : "pb-2 border-b border-[color:var(--border-color)]"}`}>
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-100">
                <Bell className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">
                What Changed
              </h3>
            </div>
            <StatsBar {...stats} />
          </div>

          {/* Filter Row */}
          <FilterBar
            severity={selectedSeverity}
            onSeverityChange={setSelectedSeverity}
            daysBack={selectedDaysBack}
            onDaysBackChange={setSelectedDaysBack}
          />
        </div>
      )}

      {/* Change Cards */}
      <div className={`${compact ? "space-y-3" : "space-y-4"}`}>
        <ChangeCardList
          diffs={diffs}
          sources={sourcesMap}
          emptyMessage={`No changes detected in the last ${selectedDaysBack} days`}
          onViewSource={handleViewSource}
        />
      </div>

      {/* Footer - Show more link if at limit */}
      {filteredDiffs.length >= limit && (
        <div className="text-center py-2">
          <button
            type="button"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            View all changes →
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Compact Widget for Dashboard
// ═══════════════════════════════════════════════════════════════════════════

interface WhatChangedWidgetProps {
  limit?: number;
  onViewAll?: () => void;
  onViewSource?: (url: string) => void;
}

export function WhatChangedWidget({
  limit = 5,
  onViewAll,
  onViewSource,
}: WhatChangedWidgetProps) {
  // Fetch only high-priority diffs
  const diffsData = useQuery(api.domains.knowledge.sourceDiffs.getAllRecentDiffs, {
    limit,
    sinceTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
  });

  const sourcesData = useQuery(api.domains.knowledge.sourceRegistry.getAllActiveSources, {});

  const sourcesMap = useMemo(() => {
    const map = new Map<string, SourceInfo>();
    if (sourcesData) {
      for (const source of sourcesData) {
        map.set(source.registryId, {
          name: source.name,
          domain: source.domain,
          canonicalUrl: source.canonicalUrl,
        });
      }
    }
    return map;
  }, [sourcesData]);

  // Sort by severity (critical first)
  const sortedDiffs = useMemo(() => {
    if (!diffsData) return [];
    const severityOrder: Record<Severity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return [...diffsData].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [diffsData]);

  const handleViewSource = (url: string) => {
    if (onViewSource) {
      onViewSource(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (!diffsData || diffsData.length === 0) {
    return (
      <div className="border border-[color:var(--border-color)] rounded-xl p-4 bg-[color:var(--bg-primary)]">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-[color:var(--text-muted)]" />
          <h4 className="text-sm font-medium text-[color:var(--text-primary)]">Source Updates</h4>
        </div>
        <p className="text-xs text-[color:var(--text-muted)]">
          No recent changes in tracked sources.
        </p>
      </div>
    );
  }

  const criticalCount = sortedDiffs.filter((d) => d.severity === "critical").length;
  const highCount = sortedDiffs.filter((d) => d.severity === "high").length;

  return (
    <div className="border border-[color:var(--border-color)] rounded-xl overflow-hidden bg-[color:var(--bg-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--border-color)] bg-[color:var(--bg-secondary)]/50">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-100">
            <Bell className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <h4 className="text-sm font-medium text-[color:var(--text-primary)]">What Changed</h4>
        </div>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded-full">
              {criticalCount} critical
            </span>
          )}
          {highCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-orange-100 text-orange-700 rounded-full">
              {highCount} high
            </span>
          )}
        </div>
      </div>

      {/* Compact list */}
      <div className="divide-y divide-[color:var(--border-color)]">
        {sortedDiffs.slice(0, limit).map((diff) => {
          const source = sourcesMap.get(diff.registryId);
          return (
            <div
              key={diff._id}
              className="px-4 py-3 hover:bg-[color:var(--bg-hover)] transition-colors cursor-pointer"
              onClick={() => source && handleViewSource(source.canonicalUrl)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[color:var(--text-primary)] truncate">
                    {diff.changeTitle}
                  </p>
                  <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5">
                    {source?.name ?? diff.registryId}
                  </p>
                </div>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                    diff.severity === "critical"
                      ? "bg-red-100 text-red-700"
                      : diff.severity === "high"
                      ? "bg-orange-100 text-orange-700"
                      : diff.severity === "medium"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {diff.severity}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {onViewAll && (
        <div className="px-4 py-2 border-t border-[color:var(--border-color)] bg-[color:var(--bg-secondary)]/30">
          <button
            type="button"
            onClick={onViewAll}
            className="w-full text-xs text-indigo-600 hover:text-indigo-800 font-medium text-center"
          >
            View all changes →
          </button>
        </div>
      )}
    </div>
  );
}

export default WhatChangedPanel;
