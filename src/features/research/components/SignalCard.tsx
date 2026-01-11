"use client";

/**
 * SignalCard Component
 *
 * Renders a single signal from Act II of the Daily Brief.
 * Features per north-star spec:
 * - Signal label (clean, human)
 * - Synthesis paragraph (2-4 sentences)
 * - What's new vs baseline (Δ metric)
 * - Evidence grid (2-6 cards)
 * - Optional micro-viz
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, LinkIcon, TrendingUp, Tag, BarChart2 } from "lucide-react";
import type { Signal } from "../types/dailyBriefSchema";
import { EvidenceGrid } from "./EvidenceGrid";

// ═══════════════════════════════════════════════════════════════════════════
// DELTA BADGE - Shows what's new vs baseline
// ═══════════════════════════════════════════════════════════════════════════

interface DeltaBadgeProps {
  deltaSummary: string;
}

function DeltaBadge({ deltaSummary }: DeltaBadgeProps) {
  // Try to detect positive/negative delta from text
  const isPositive = deltaSummary.includes("+") || deltaSummary.toLowerCase().includes("up")
    || deltaSummary.toLowerCase().includes("increase");
  const isNegative = deltaSummary.includes("-") || deltaSummary.toLowerCase().includes("down")
    || deltaSummary.toLowerCase().includes("decrease");

  const colorClass = isPositive
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : isNegative
    ? "bg-red-50 text-red-700 border-red-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
      <TrendingUp className="w-3 h-3" />
      <span>{deltaSummary}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL CARD
// ═══════════════════════════════════════════════════════════════════════════

interface SignalCardProps {
  signal: Signal;
  index: number;
  defaultExpanded?: boolean;
  onSignalClick?: (signal: Signal) => void;
  /** Show micro-viz placeholder if signal has vizArtifactId */
  showMicroViz?: boolean;
}

export function SignalCard({
  signal,
  index,
  defaultExpanded = true,
  onSignalClick,
  showMicroViz = false,
}: SignalCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const evidenceCount = signal.evidence?.length || 0;
  const signalLabel = signal.label || `Signal ${index + 1}`;

  return (
    <div
      className="group relative bg-[color:var(--bg-primary)] border border-[color:var(--border-color)] rounded-xl overflow-hidden
                 hover:border-indigo-200 hover:shadow-sm transition-all duration-200"
    >
      {/* Left Accent Border */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500" />

      {/* Header - Always Visible */}
      <button
        type="button"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSignalClick?.(signal);
        }}
        className="w-full text-left pl-5 pr-4 py-4 flex items-start gap-3"
      >
        {/* Signal Number */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700
                        flex items-center justify-center text-xs font-bold mt-0.5">
          {index + 1}
        </div>

        {/* Headline + Meta */}
        <div className="flex-1 min-w-0">
          {/* Signal Label */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />
              {signalLabel}
            </span>
            {signal.vizArtifactId && showMicroViz && (
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <BarChart2 className="w-2.5 h-2.5" />
                Chart
              </span>
            )}
          </div>

          {/* Headline */}
          <h3 className="text-base font-semibold text-[color:var(--text-primary)] leading-snug group-hover:text-indigo-700 transition-colors">
            {signal.headline}
          </h3>

          {/* Meta Row */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-[10px] font-medium text-[color:var(--text-secondary)] uppercase tracking-wide flex items-center gap-1">
              <LinkIcon className="w-3 h-3" />
              {evidenceCount} source{evidenceCount !== 1 ? "s" : ""}
            </span>
            {signal.relatedSignalIds && signal.relatedSignalIds.length > 0 && (
              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                Links to {signal.relatedSignalIds.length} signal{signal.relatedSignalIds.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Expand Toggle */}
        <div className="flex-shrink-0 text-[color:var(--text-secondary)] group-hover:text-indigo-500 transition-colors">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Delta Summary - What's new vs baseline */}
          {signal.deltaSummary && (
            <DeltaBadge deltaSummary={signal.deltaSummary} />
          )}

          {/* Synthesis Prose */}
          <div className="prose prose-sm prose-slate max-w-none">
            <p className="text-[color:var(--text-primary)] leading-relaxed">
              {signal.synthesis}
            </p>
          </div>

          {/* Evidence Grid */}
          <EvidenceGrid evidence={signal.evidence || []} />
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SIGNAL LIST (renders multiple signals)
// ═══════════════════════════════════════════════════════════════════════════

interface SignalListProps {
  signals: Signal[];
  onSignalClick?: (signal: Signal) => void;
  className?: string;
}

export function SignalList({ signals, onSignalClick, className = "" }: SignalListProps) {
  if (!signals || signals.length === 0) {
    return (
      <div className="text-center py-8 text-[color:var(--text-secondary)]">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No signals available yet.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {signals.map((signal, idx) => (
        <SignalCard
          key={signal.id || idx}
          signal={signal}
          index={idx}
          defaultExpanded={idx === 0} // Only first signal expanded by default
          onSignalClick={onSignalClick}
        />
      ))}
    </div>
  );
}

export default SignalCard;

