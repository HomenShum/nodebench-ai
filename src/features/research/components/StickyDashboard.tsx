"use client";

import React from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { ShieldAlert, Code, Vote, Cpu, Activity, Zap, Brain, Lock, PieChart, CheckCircle2, Circle, Loader2 } from "lucide-react";
import EnhancedLineChart, { type ChartDataPointContext } from "./EnhancedLineChart";
import type { DashboardState, MarketShareSegment } from "@/features/research/types";
import { formatBriefMonthYear } from "@/lib/briefDate";
import { useEvidence } from "../contexts/EvidenceContext";
import { DeltaIndicator } from "./DeltaIndicator";

export interface WorkflowStep {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

// Icon Mapping for capabilities
const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  hacking: ShieldAlert,
  coding: Code,
  politics: Vote,
  robotics: Cpu,
  forecasting: Activity,
  reasoning: Brain,
  uptime: Zap,
  safety: Lock,
};

const normalizeCapabilityScore = (score: number) => {
  if (!Number.isFinite(score)) return 0;
  const raw = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(raw)));
};

const keyStatHints: Record<string, string> = {
  "Gap Width": "Capability vs reliability delta",
  "Reasoning": "Model reasoning score",
  "Avg Heat": "Average engagement score",
};

const getKeyStatHint = (label: string) => {
  if (!label) return null;
  const direct = keyStatHints[label];
  if (direct) return direct;
  const labelLower = label.toLowerCase();
  if (labelLower.includes("gap")) return "Capability vs reliability delta";
  if (labelLower.includes("heat")) return "Average engagement score";
  if (labelLower.includes("reason")) return "Model reasoning score";
  return null;
};

const formatKeyStatValue = (label: string, value: unknown): string => {
  if (value === null || value === undefined) return "-";
  const labelLower = label.toLowerCase();
  const applyNumericFormat = (num: number) => {
    if (labelLower.includes("reason") || labelLower.includes("confidence") || labelLower.includes("score")) {
      const pct = num <= 1 ? num * 100 : num;
      return `${Math.round(pct)}%`;
    }
    if (labelLower.includes("gap")) return `${Math.round(num)} pts`;
    if (labelLower.includes("heat")) return `${Math.round(num)} pts`;
    if (num > 0 && num < 1) return `${Math.round(num * 100)}%`;
    return `${Math.round(num)}`;
  };

  if (typeof value === "number" && Number.isFinite(value)) {
    return applyNumericFormat(value);
  }

  const raw = String(value).trim();
  if (!raw) return "-";
  const hasUnit = /[a-z%]/i.test(raw);
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || hasUnit) return raw;
  return applyNumericFormat(numeric);
};

interface StickyDashboardProps {
  data: DashboardState;
  /** Callback for chart data point clicks (AI agent integration) */
  onDataPointClick?: (point: ChartDataPointContext) => void;
  activeAct?: "actI" | "actII" | "actIII";
  workflowSteps?: WorkflowStep[];
  /** Temporal deltas for "What Changed" indicators */
  deltas?: {
    keyStats: Array<{ label: string; delta: number }>;
    capabilities: Array<{ label: string; delta: number | null }>;
    techReadiness?: {
      existing: number | null;
      emerging: number | null;
      sciFi: number | null;
    } | null;
  } | null;
}

export const StickyDashboard: React.FC<StickyDashboardProps> = ({
  data,
  onDataPointClick,
  activeAct = "actI",
  workflowSteps = [],
  deltas
}) => {
  // Evidence context for chart ↔ evidence linking
  const evidenceCtx = useEvidence();

  if (!data) return null;

  // Safe defaults
  const safeMeta = data.meta ?? { currentDate: "Jan 2025", timelineProgress: 0 };
  const safeCharts = {
    trendLine: data.charts?.trendLine,
    marketShare: data.charts?.marketShare ?? [],
  };
  const safeTech = data.techReadiness ?? { existing: 0, emerging: 0, sciFi: 0 };
  const capabilities = data.capabilities ?? [];
  const keyStats = data.keyStats ?? [];
  const agentCount = data.agentCount;

  // Build evidence map for tooltip display
  const evidenceMap = new Map(
    evidenceCtx.getEvidenceList().map((ev) => [ev.id, ev])
  );

  // Calculate top market share for the donut center
  const topShare = safeCharts.marketShare.length > 0
    ? safeCharts.marketShare.reduce((prev, current) => (prev.value > current.value ? prev : current))
    : { label: "N/A", value: 0, color: "gray" as const };

  const monthYearLabel = formatBriefMonthYear(safeMeta.currentDate);
  const [monthLabel, yearLabel] = monthYearLabel.split(" ");

  return (
    <div className="w-full font-mono text-slate-900 select-none">
      <div className="z-10 transition-all duration-500 shadow-none space-y-5">

        {/* --- ROW 1: HEADER & CHART --- */}
        <div className="relative mb-4">
          {/* Date Pill */}
          <div className="absolute top-0 left-0 z-10">
            <div className="flex items-center bg-black text-white px-2 py-1 rounded-[4px] text-[10px] tracking-widest gap-2 shadow-sm">
              <span>{monthLabel}</span>
              <span className="font-bold">{yearLabel || "2025"}</span>
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-[180px] w-full mt-2">
            {safeCharts.trendLine ? (
              <EnhancedLineChart
                config={{
                  ...safeCharts.trendLine,
                  timeWindow: safeCharts.trendLine.timeWindow ?? "Last 7 days",
                  yAxisUnit: safeCharts.trendLine.yAxisUnit ?? "%",
                  lastUpdated: "today",
                }}
                onEvidenceClick={evidenceCtx.scrollToEvidence}
                onDataPointClick={onDataPointClick}
                evidenceMap={evidenceMap}
              />
            ) : (
              <div className="w-full h-full bg-slate-50 rounded flex items-center justify-center text-slate-300 text-xs">
                No chart data
              </div>
            )}
          </div>
        </div>

        {/* --- ROW 2: SPLIT GRID (Capabilities vs Donut) --- */}
        <div className="grid grid-cols-12 gap-4 mb-4">
          {/* LEFT COL (7/12): CAPABILITIES GRID */}
          <div className="col-span-7 flex flex-col justify-end">
            <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-100 pb-1">
              AI Capabilities
            </div>
            <div className="grid grid-cols-2 gap-2">
              {capabilities.map((cap, i) => {
                const capDelta = deltas?.capabilities?.[i]?.delta;
                return (
                  <CapabilityBar
                    key={cap.label}
                    label={cap.label}
                    score={cap.score}
                    icon={cap.icon}
                    delta={capDelta ?? null}
                  />
                );
              })}
            </div>
          </div>

          {/* RIGHT COL (5/12): DONUT & BUCKETS */}
          <div className="col-span-5 flex flex-col justify-between h-full">
            {/* Donut - Only render if we have data */}
            {safeCharts.marketShare.length > 0 ? (
              <div className="flex justify-center items-center relative h-20 mb-2">
                <DonutChart data={safeCharts.marketShare} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[7px] font-bold uppercase text-slate-400 leading-none mb-0.5">
                    {topShare.label}
                  </span>
                  <NumberFlow value={topShare.value} suffix="%" className="text-sm font-bold text-slate-900 leading-none" />
                  <span className="text-[6px] text-slate-300 mt-0.5">of sources</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-20 mb-2 bg-slate-50 rounded">
                <PieChart className="w-6 h-6 text-slate-200 mb-1" />
                <span className="text-[8px] text-slate-300">No share data</span>
              </div>
            )}

            {/* Tech Readiness Buckets */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[7px] uppercase tracking-wider text-slate-400">
                <span>Exist</span><span>Emerging</span><span>Sci-Fi</span>
              </div>
              <div className="flex justify-between gap-1 h-8">
                <BucketColumn count={safeTech.existing} color="bg-slate-900" delta={deltas?.techReadiness?.existing} />
                <BucketColumn count={safeTech.emerging} color="bg-indigo-500" delta={deltas?.techReadiness?.emerging} />
                <BucketColumn count={safeTech.sciFi} color="bg-slate-200" delta={deltas?.techReadiness?.sciFi} />
              </div>
            </div>
          </div>
        </div>

        {/* --- ROW 1: HEADER & ACT INDICATOR --- */}
        <div className="border-b border-emerald-900/10 pb-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-4xl font-serif font-medium text-emerald-950 tracking-tight">
              Pulse
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-emerald-900/40 uppercase tracking-widest">
                {formatBriefMonthYear(new Date().toISOString())}
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>

          {/* Minimalist Act Stepper */}
          <div className="flex items-center gap-3">
            {[
              { id: 'actI', label: 'Synthesis' },
              { id: 'actII', label: 'Briefing' },
              { id: 'actIII', label: 'Signals' }
            ].map((act, i) => (
              <React.Fragment key={act.id}>
                {i > 0 && <div className="w-8 h-px bg-stone-200" />}
                <div className={`flex items-center gap-2 transition-opacity duration-500 ${activeAct === act.id ? 'opacity-100' : 'opacity-30 grayscale'
                  }`}>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900`}>
                    {act.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* --- ROW 3: KEY STATS WITH DELTAS --- */}
        <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-3 mb-3">
          {keyStats.map((stat, i) => {
            const statDelta = deltas?.keyStats?.[i]?.delta;
            const statHint = getKeyStatHint(stat.label);
            const displayContext = stat.context ?? statHint;
            const displayValue = formatKeyStatValue(stat.label, stat.value);
            return (
              <div key={i} className="flex flex-col">
                <span
                  className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5"
                  title={statHint ?? undefined}
                >
                  {stat.label}
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-slate-900">{displayValue}</span>
                  {statDelta !== undefined && statDelta !== null && statDelta !== 0 && (
                    <DeltaIndicator value={statDelta} size="sm" />
                  )}
                  {displayContext && <span className="text-[8px] font-bold text-slate-400">{displayContext}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* --- ROW 4: AGENT FOOTER --- */}
        <AgentFooter workflowSteps={workflowSteps} />
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const CapabilityBar = ({ label, score, icon, delta }: { label: string, score: number, icon: string, delta?: number | null }) => (
  <div className="flex flex-col gap-1 mb-3 group">
    <div className="flex justify-between items-end mb-1">
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-stone-500 font-bold group-hover:text-emerald-900 transition-colors leading-none">{label}</span>
        {delta !== undefined && delta !== null && delta !== 0 && (
          <div className="mt-0.5">
            <DeltaIndicator value={delta} unit="pts" />
          </div>
        )}
      </div>
      <span className="text-xs font-mono font-bold text-gray-900">{normalizeCapabilityScore(score)}%</span>
    </div>
    <div className="h-1.5 w-full bg-stone-200 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${normalizeCapabilityScore(score)}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="h-full bg-emerald-900"
      />
    </div>
  </div>
);

const BucketColumn = ({ count, color, delta }: { count: number, color: string, delta?: number | null }) => {
  // Map old colors to new theme
  const themeColor = color.includes('indigo') || color.includes('slate-900') ? 'bg-emerald-900' : 'bg-stone-300';

  return (
    <div className="flex flex-col-reverse gap-[1px] w-full items-center group relative">
      {[...Array(6)].map((_, i) => (
        <div key={i} className={`w-full h-1 rounded-none ${i < count ? themeColor : "bg-stone-100"}`} />
      ))}
      {delta !== undefined && delta !== null && delta !== 0 && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
          <DeltaIndicator value={delta} unit="u" size="sm" />
        </div>
      )}
    </div>
  );
};

const DonutChart = ({ data }: { data: MarketShareSegment[] }) => {
  const topValue = data[0]?.value || 0;
  const pathLength = topValue / 100;

  return (
    <div className="relative w-full h-full flex-shrink-0">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        <circle cx="50" cy="50" r="40" stroke="#E5E5E2" strokeWidth="12" fill="none" />
        <motion.circle
          initial={{ pathLength: 0 }}
          animate={{ pathLength }}
          transition={{ duration: 2, ease: "easeOut" }}
          cx="50"
          cy="50"
          r="40"
          stroke="#163628"
          strokeWidth="12"
          fill="none"
          strokeDasharray="1 1"
        />
      </svg>
    </div>
  );
};

const AgentFooter = ({ workflowSteps }: { workflowSteps: WorkflowStep[] }) => {
  const activeStep = workflowSteps.find(s => s.status === 'in_progress');
  const completedCount = workflowSteps.filter(s => s.status === 'completed').length;
  const totalCount = workflowSteps.length;

  return (
    <div className="mt-8 pt-6 border-t border-stone-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="px-1.5 py-1 bg-emerald-900 text-[#faf9f6] text-[9px] font-bold uppercase tracking-widest">
            Agent Workflow
          </div>
          <div className="text-[10px] font-mono text-stone-500 uppercase tracking-wider">
            {completedCount}/{totalCount} PROCESSED
          </div>
        </div>
        {activeStep && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-3 h-3 text-emerald-700 animate-spin" />
            <span className="text-[9px] font-black text-emerald-900 uppercase tracking-widest">Live</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {workflowSteps.slice(0, 3).map((step, i) => (
          <div key={i} className="flex items-center gap-3 group">
            <div className={`shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center border ${step.status === 'completed' ? 'bg-emerald-900 border-emerald-900' :
              step.status === 'in_progress' ? 'border-emerald-900 animate-pulse' :
                'border-stone-200'
              }`}>
              {step.status === 'completed' && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
              {step.status === 'in_progress' && <div className="w-1.5 h-1.5 bg-emerald-900 rounded-full" />}
            </div>
            <span className={`text-[11px] font-serif transition-colors ${step.status === 'completed' ? 'text-stone-400 line-through' :
              step.status === 'in_progress' ? 'text-emerald-900 font-bold' :
                'text-stone-500'
              }`}>
              {step.name}
            </span>
          </div>
        ))}
      </div>

      {activeStep && (
        <div className="mt-4 p-3 bg-emerald-50/50 border border-emerald-900/10">
          <p className="text-[10px] font-mono text-emerald-900/60 uppercase tracking-tighter mb-1">Current Task</p>
          <p className="text-[12px] font-serif font-medium text-emerald-950 italic">
            "{activeStep.name} in progress..."
          </p>
        </div>
      )}

      <div className="mt-4 flex gap-1">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 bg-emerald-900 rounded-none transition-opacity duration-1000`}
            style={{
              opacity: activeStep ? Math.random() * 0.8 + 0.2 : 0.05,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default StickyDashboard;

