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
    blue: "text-blue-600 bg-blue-50/50 border-blue-100",
    green: "text-emerald-600 bg-emerald-50/50 border-emerald-100",
    amber: "text-amber-600 bg-amber-50/50 border-amber-100",
    red: "text-red-600 bg-red-50/50 border-red-100",
  };

  return (
    <div className={`flex items-center gap-5 px-6 py-5 rounded-2xl border backdrop-blur-md transition-all duration-300 hover:shadow-xl hover:translate-y-[-2px] group ${colorClasses[color]}`}>
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white shadow-xl shadow-gray-200/20 group-hover:scale-110 transition-transform flex items-center justify-center">
        <div className="[&>svg]:w-6 [&>svg]:h-6">
          {icon}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 font-outfit">{label}</div>
        <div className="text-2xl font-serif font-bold leading-none tracking-tight text-gray-900">{value}</div>
        {sublabel && <div className="text-[11px] font-bold opacity-30 truncate mt-1.5 font-mono">{sublabel}</div>}
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
      className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all tracking-[0.1em] uppercase ${isSelected
        ? "bg-gray-900 text-white shadow-xl shadow-gray-400/20 translate-y-[-1px]"
        : "bg-white text-gray-400 hover:text-gray-900 hover:bg-gray-50 border border-gray-100"
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
    <header className={`bg-white/80 backdrop-blur-xl border border-gray-100 rounded-2xl shadow-sm overflow-hidden ${className ?? ""}`}>
      {/* Top row: Headline + Date */}
      <div className="px-8 py-6 border-b border-gray-50/50 bg-gradient-to-r from-gray-50/30 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-serif font-bold text-gray-900 tracking-tight italic">
              {effectiveHeadline}
            </h1>
            <p className="mt-2 text-base text-gray-500 font-medium leading-relaxed max-w-2xl">
              {effectiveThesis}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/50 rounded-full text-[11px] font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">
            <Calendar className="w-3 h-3" />
            <span>{effectiveDate}</span>
          </div>
        </div>
      </div>

      {/* KPI Tiles Row */}
      <div className="px-8 py-6 border-b border-gray-50/50">
        <div className="flex items-center gap-5">
          <KPITile
            icon={<Database className="w-5 h-5" />}
            label="Digital Coverage"
            value={coverageValue}
            sublabel={coverageSublabel}
            color="blue"
          />
          <KPITile
            icon={<Clock className="w-5 h-5" />}
            label="Signal Freshness"
            value={freshnessValue}
            sublabel={freshnessSublabel}
            color="green"
          />
          <KPITile
            icon={<Shield className="w-5 h-5" />}
            label="Asset Confidence"
            value={confidenceValue}
            sublabel={confidenceSublabel}
            color={confidenceColor}
          />
        </div>
      </div>

      {/* Filters Row */}
      <div className="px-8 py-3 flex items-center gap-8 overflow-x-auto bg-gray-50/20">
        {/* Time Window */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Horizon</span>
          <div className="flex gap-1.5">
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
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Focus</span>
            <div className="flex gap-1.5 flex-wrap">
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
      </div>
    </header>
  );
}
export default ExecutiveBriefHeader;

