"use client";

/**
 * ExecutiveBriefHeader - Above-the-fold header for Morning Dossier
 *
 * Features:
 * - Day thesis (1-sentence executive summary)
 * - Three KPI tiles: Coverage, Freshness, Confidence
 * - Topic/Source filters
 */

import React from "react";
import { Database, Clock, Shield, Filter, Calendar, Tag } from "lucide-react";
import type { QualityMetrics } from "../types/dailyBriefSchema";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutiveBriefHeaderProps {
  /** Editorial headline (optional, defaults to "Morning Dossier") */
  headline?: string;
  /** Day thesis (1-sentence summary) - can also be passed as dayThesis */
  thesis?: string;
  /** Alternative prop name for thesis */
  dayThesis?: string;
  /** Date string for display */
  date?: string;
  /** Quality metrics for KPI tiles */
  quality?: QualityMetrics;
  /** Available topic tags for filtering */
  topicTags?: string[];
  /** Alternative prop name for topics */
  topics?: string[];
  /** Currently selected topics */
  selectedTopics?: string[];
  /** Available source types */
  sourceTypes?: string[];
  /** Alternative prop name for sources */
  sources?: string[];
  /** Currently selected sources */
  selectedSources?: string[];
  /** Time window options */
  timeWindows?: Array<{ label: string; value: string }>;
  /** Currently selected time window */
  selectedTimeWindow?: string;
  /** Callbacks */
  onTopicToggle?: (topic: string) => void;
  /** Alternative callback for topic filter */
  onTopicFilter?: (topic: string) => void;
  onSourceToggle?: (source: string) => void;
  /** Alternative callback for source filter */
  onSourceFilter?: (source: string) => void;
  onTimeWindowChange?: (window: string) => void;
  /** Additional className */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI TILE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface KPITileProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color: "blue" | "green" | "amber" | "red";
}

function KPITile({ icon, label, value, sublabel, color }: KPITileProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex-shrink-0">{icon}</div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
        {sublabel && <div className="text-xs opacity-60 truncate">{sublabel}</div>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FILTER CHIP COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

function FilterChip({ label, isSelected, onClick }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        isSelected
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ExecutiveBriefHeader({
  headline,
  thesis,
  dayThesis,
  date,
  quality,
  topicTags = [],
  topics = [],
  selectedTopics = [],
  sourceTypes = [],
  sources = [],
  selectedSources = [],
  timeWindows = [
    { label: "Today", value: "today" },
    { label: "24h", value: "24h" },
    { label: "3d", value: "3d" },
    { label: "7d", value: "7d" },
  ],
  selectedTimeWindow = "24h",
  onTopicToggle,
  onTopicFilter,
  onSourceToggle,
  onSourceFilter,
  onTimeWindowChange,
  className,
}: ExecutiveBriefHeaderProps) {
  // Merge alternative prop names
  const effectiveThesis = thesis ?? dayThesis ?? "AI-synthesized briefing on trends, deals, and deep dives.";
  const effectiveHeadline = headline ?? "Morning Dossier";
  const effectiveDate = date ?? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const effectiveTopics = topicTags.length > 0 ? topicTags : topics;
  const effectiveSources = sourceTypes.length > 0 ? sourceTypes : sources;
  const handleTopicClick = onTopicToggle ?? onTopicFilter;
  const handleSourceClick = onSourceToggle ?? onSourceFilter;
  // Derive KPI values from quality metrics
  const coverageValue = quality?.coverage
    ? `${quality.coverage.itemsScanned} items`
    : "—";
  const coverageSublabel = quality?.coverage
    ? `${quality.coverage.sourcesCount} sources`
    : undefined;

  const freshnessValue = quality?.freshness
    ? quality.freshness.medianAgeHours < 1
      ? "< 1h"
      : `${Math.round(quality.freshness.medianAgeHours)}h`
    : "—";
  const freshnessSublabel = quality?.freshness?.windowLabel;

  const confidenceValue = quality?.confidence
    ? `${quality.confidence.score}%`
    : "—";
  const confidenceColor = quality?.confidence?.level === "high"
    ? "green" as const
    : quality?.confidence?.level === "low"
    ? "red" as const
    : "amber" as const;
  const confidenceSublabel = quality?.confidence?.hasDisagreement
    ? "Sources disagree"
    : quality?.confidence?.level === "high"
    ? "Sources agree"
    : undefined;

  return (
    <header className={`bg-white border border-slate-200 rounded-xl shadow-sm ${className ?? ""}`}>
      {/* Top row: Headline + Date */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {effectiveHeadline}
            </h1>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              {effectiveThesis}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 flex-shrink-0">
            <Calendar className="w-4 h-4" />
            <span>{effectiveDate}</span>
          </div>
        </div>
      </div>

      {/* KPI Tiles Row */}
      <div className="px-6 py-3 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <KPITile
            icon={<Database className="w-4 h-4" />}
            label="Coverage"
            value={coverageValue}
            sublabel={coverageSublabel}
            color="blue"
          />
          <KPITile
            icon={<Clock className="w-4 h-4" />}
            label="Freshness"
            value={freshnessValue}
            sublabel={freshnessSublabel}
            color="green"
          />
          <KPITile
            icon={<Shield className="w-4 h-4" />}
            label="Confidence"
            value={confidenceValue}
            sublabel={confidenceSublabel}
            color={confidenceColor}
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="px-6 py-2 flex items-center gap-6 overflow-x-auto">
        {/* Time Window */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <div className="flex gap-1">
            {timeWindows.map((tw) => (
              <FilterChip
                key={tw.value}
                label={tw.label}
                isSelected={selectedTimeWindow === tw.value}
                onClick={() => onTimeWindowChange?.(tw.value)}
              />
            ))}
          </div>
        </div>

        {/* Topic Tags */}
        {effectiveTopics.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex gap-1 flex-wrap">
              {effectiveTopics.slice(0, 6).map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  isSelected={selectedTopics.includes(tag)}
                  onClick={() => handleTopicClick?.(tag)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Source Types */}
        {effectiveSources.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <div className="flex gap-1">
              {effectiveSources.slice(0, 4).map((source) => (
                <FilterChip
                  key={source}
                  label={source}
                  isSelected={selectedSources.includes(source)}
                  onClick={() => handleSourceClick?.(source)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default ExecutiveBriefHeader;

