"use client";

/**
 * ActAwareDashboard - Right-rail dashboard that changes with active Act
 *
 * Act I (Setup) → Trust & coverage view
 * Act II (Signals) → What changed view (signal-specific chart)
 * Act III (Actions) → Decision framing view
 */

import React from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { Database, Clock, Shield, TrendingUp, Target, AlertTriangle } from "lucide-react";
import InteractiveLineChart from "./InteractiveLineChart";
import type { DashboardState } from "@/features/research/types";
import type { QualityMetrics, Signal, Action } from "../types/dailyBriefSchema";
import { useEvidence } from "../contexts/EvidenceContext";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActiveAct = "actI" | "actII" | "actIII";

export interface ActAwareDashboardProps {
  /** Currently active act */
  activeAct: ActiveAct;
  /** Dashboard state for charts */
  dashboardState?: DashboardState;
  /** Quality metrics for Act I */
  quality?: QualityMetrics;
  /** Source breakdown for Act I coverage chart */
  sourceBreakdown?: Record<string, number>;
  /** Active signal for Act II (optional) */
  activeSignal?: Signal;
  /** Actions for Act III */
  actions?: Action[];
  /** Annotations for line chart */
  annotations?: Array<{ x: number; text: string }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT I: TRUST & COVERAGE VIEW
// ═══════════════════════════════════════════════════════════════════════════

interface ActICoverageViewProps {
  quality?: QualityMetrics;
  sourceBreakdown?: Record<string, number>;
}

function ActICoverageView({ quality, sourceBreakdown }: ActICoverageViewProps) {
  const sources = sourceBreakdown ? Object.entries(sourceBreakdown) : [];
  const totalItems = sources.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="space-y-4">
      {/* Coverage Header */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <Database className="w-3.5 h-3.5" />
        <span>Coverage & Trust</span>
      </div>

      {/* Source Breakdown Stacked Bar */}
      <div className="space-y-2">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider">Sources</div>
        <div className="flex h-6 rounded overflow-hidden bg-slate-100">
          {sources.map(([source, count], i) => {
            const pct = totalItems > 0 ? (count / totalItems) * 100 : 0;
            const colors = ["bg-slate-900", "bg-indigo-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500"];
            return (
              <motion.div
                key={source}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className={`${colors[i % colors.length]} flex items-center justify-center min-w-[20px]`}
                title={`${source}: ${count} items`}
              >
                {pct > 10 && (
                  <span className="text-[8px] text-white font-bold truncate px-1">{source}</span>
                )}
              </motion.div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-slate-400">
          <span>{sources.length} sources</span>
          <span>{totalItems} items</span>
        </div>
      </div>

      {/* Freshness Indicator */}
      {quality?.freshness && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Freshness</div>
          <div className="flex items-center gap-3 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-200">
            <Clock className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-sm font-semibold text-emerald-700">
                {quality.freshness.medianAgeHours < 1 ? "< 1h" : `${Math.round(quality.freshness.medianAgeHours)}h`} median
              </div>
              <div className="text-[10px] text-emerald-600">{quality.freshness.windowLabel} window</div>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Indicator */}
      {quality?.confidence && (
        <div className="space-y-2">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Confidence</div>
          <div className={`flex items-center gap-3 rounded-lg px-3 py-2 border ${
            quality.confidence.level === "high" 
              ? "bg-emerald-50 border-emerald-200" 
              : quality.confidence.level === "low"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <Shield className={`w-4 h-4 ${
              quality.confidence.level === "high" ? "text-emerald-600" 
              : quality.confidence.level === "low" ? "text-red-600" 
              : "text-amber-600"
            }`} />
            <div>
              <div className={`text-sm font-semibold ${
                quality.confidence.level === "high" ? "text-emerald-700"
                : quality.confidence.level === "low" ? "text-red-700"
                : "text-amber-700"
              }`}>
                {quality.confidence.score}% confidence
              </div>
              <div className={`text-[10px] ${
                quality.confidence.level === "high" ? "text-emerald-600"
                : quality.confidence.level === "low" ? "text-red-600"
                : "text-amber-600"
              }`}>
                {quality.confidence.hasDisagreement ? "Sources disagree" : "Sources agree"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT II: WHAT CHANGED VIEW
// ═══════════════════════════════════════════════════════════════════════════

interface ActIIChangeViewProps {
  dashboardState?: DashboardState;
  activeSignal?: Signal;
  annotations?: Array<{ x: number; text: string }>;
}

function ActIIChangeView({ dashboardState, activeSignal, annotations = [] }: ActIIChangeViewProps) {
  const evidenceCtx = useEvidence();
  const evidenceMap = new Map(evidenceCtx.getEvidenceList().map((ev) => [ev.id, ev]));

  return (
    <div className="space-y-4">
      {/* Change Header */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>What Changed</span>
      </div>

      {/* Active Signal Context */}
      {activeSignal && (
        <div className="bg-indigo-50 rounded-lg px-3 py-2 border border-indigo-200">
          <div className="text-[10px] text-indigo-500 uppercase tracking-wider mb-1">Active Signal</div>
          <div className="text-sm font-semibold text-indigo-900">{activeSignal.headline}</div>
          {activeSignal.deltaSummary && (
            <div className="text-xs text-indigo-700 mt-1">{activeSignal.deltaSummary}</div>
          )}
        </div>
      )}

      {/* Trend Chart */}
      {dashboardState?.charts?.trendLine ? (
        <div className="h-[140px] w-full">
          <InteractiveLineChart
            config={dashboardState.charts.trendLine}
            annotations={annotations}
            onEvidenceClick={evidenceCtx.scrollToEvidence}
            evidenceMap={evidenceMap}
          />
        </div>
      ) : (
        <div className="h-[100px] bg-slate-50 rounded flex items-center justify-center text-slate-300 text-xs">
          No trend data
        </div>
      )}

      {/* Key Stats */}
      {dashboardState?.keyStats && dashboardState.keyStats.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {dashboardState.keyStats.slice(0, 4).map((stat, i) => (
            <div key={i} className="bg-slate-50 rounded px-2 py-1.5">
              <div className="text-[8px] text-slate-400 uppercase tracking-wider">{stat.label}</div>
              <div className="text-sm font-bold text-slate-900">{stat.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACT III: DECISION FRAMING VIEW
// ═══════════════════════════════════════════════════════════════════════════

interface ActIIIDecisionViewProps {
  actions?: Action[];
}

function ActIIIDecisionView({ actions = [] }: ActIIIDecisionViewProps) {
  // Filter to proposed/in_progress actions only
  const validActions = actions.filter(a =>
    a.status === "proposed" || a.status === "in_progress" || a.status === "completed"
  );

  // Simple impact/effort matrix (priority maps to effort, 1 = low effort/high impact)
  const getPosition = (action: Action, idx: number) => {
    const priority = action.priority ?? (idx + 1);
    // Lower priority number = higher impact, lower effort
    const impact = Math.max(20, 100 - (priority - 1) * 20);
    const effort = Math.min(80, 20 + (priority - 1) * 15);
    return { x: effort, y: impact };
  };

  return (
    <div className="space-y-4">
      {/* Decision Header */}
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <Target className="w-3.5 h-3.5" />
        <span>Decision Framing</span>
      </div>

      {/* Impact vs Effort Matrix */}
      <div className="relative h-[160px] bg-slate-50 rounded-lg border border-slate-200 p-2">
        {/* Quadrant Labels */}
        <div className="absolute top-1 left-1 text-[8px] text-emerald-600 font-medium">High Impact</div>
        <div className="absolute bottom-1 left-1 text-[8px] text-slate-400">Low Impact</div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-slate-400">← Less Effort | More Effort →</div>

        {/* Grid Lines */}
        <div className="absolute inset-4 border-l border-b border-slate-200 border-dashed" />
        <div className="absolute top-1/2 left-4 right-4 border-t border-slate-200 border-dashed" />
        <div className="absolute left-1/2 top-4 bottom-4 border-l border-slate-200 border-dashed" />

        {/* Action Points */}
        {validActions.map((action, i) => {
          const pos = getPosition(action, i);
          const colors = ["bg-emerald-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];
          return (
            <motion.div
              key={action.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`absolute w-4 h-4 rounded-full ${colors[i % colors.length]} shadow-sm cursor-pointer hover:scale-125 transition-transform`}
              style={{ left: `${pos.x}%`, bottom: `${pos.y}%`, transform: "translate(-50%, 50%)" }}
              title={action.label}
            />
          );
        })}
      </div>

      {/* Action Summary */}
      <div className="space-y-2">
        {validActions.slice(0, 3).map((action, i) => {
          const colors = ["bg-emerald-500", "bg-indigo-500", "bg-amber-500"];
          return (
            <div key={action.id} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${colors[i % colors.length]}`} />
              <span className="text-xs text-slate-700 truncate flex-1">{action.label}</span>
              {action.deliverable && (
                <span className="text-[9px] text-slate-400 truncate">{action.deliverable}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Risk Callout */}
      {validActions.some(a => a.risks) && (
        <div className="flex items-start gap-2 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-[10px] text-amber-700">
            {validActions.find(a => a.risks)?.risks}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ActAwareDashboard({
  activeAct,
  dashboardState,
  quality,
  sourceBreakdown,
  activeSignal,
  actions,
  annotations,
}: ActAwareDashboardProps) {
  return (
    <div className="sticky top-24 rounded-xl border border-slate-200 bg-white shadow-sm p-4 transition-all duration-300">
      {/* Act Indicator Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-slate-100 pb-2">
        {(["actI", "actII", "actIII"] as ActiveAct[]).map((act) => (
          <div
            key={act}
            className={`px-2 py-1 text-[10px] font-medium rounded transition-colors ${
              activeAct === act
                ? "bg-slate-900 text-white"
                : "text-slate-400"
            }`}
          >
            {act === "actI" ? "Coverage" : act === "actII" ? "Signals" : "Actions"}
          </div>
        ))}
      </div>

      {/* Content based on active act */}
      <motion.div
        key={activeAct}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {activeAct === "actI" && (
          <ActICoverageView quality={quality} sourceBreakdown={sourceBreakdown} />
        )}
        {activeAct === "actII" && (
          <ActIIChangeView
            dashboardState={dashboardState}
            activeSignal={activeSignal}
            annotations={annotations}
          />
        )}
        {activeAct === "actIII" && (
          <ActIIIDecisionView actions={actions} />
        )}
      </motion.div>
    </div>
  );
}

export default ActAwareDashboard;

