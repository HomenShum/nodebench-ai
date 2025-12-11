"use client";

import React from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { ShieldAlert, Code, Vote, Cpu, Activity, Zap, Brain, Lock } from "lucide-react";
import InteractiveLineChart from "./InteractiveLineChart";
import type { DashboardState } from "@/features/research/types";

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

interface StickyDashboardProps {
  data: DashboardState;
}

export const StickyDashboard: React.FC<StickyDashboardProps> = ({ data }) => {
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
  const annotations = data.annotations ?? [];
  const agentCount = data.agentCount;

  // Calculate top market share for the donut center
  const topShare = safeCharts.marketShare.length > 0
    ? safeCharts.marketShare.reduce((prev, current) => (prev.value > current.value ? prev : current))
    : { label: "N/A", value: 0, color: "gray" as const };

  return (
    <div className="w-full font-mono text-slate-900 select-none">
      <div className="sticky top-4 z-10 rounded-xl border border-slate-200 bg-white shadow-sm p-3 transition-all duration-500">

        {/* --- ROW 1: HEADER & CHART --- */}
        <div className="relative mb-4">
          {/* Date Pill */}
          <div className="absolute top-0 left-0 z-10">
            <div className="flex items-center bg-black text-white px-2 py-1 rounded-[4px] text-[10px] tracking-widest gap-2 shadow-sm">
              <span>{safeMeta.currentDate.split(" ")[0]}</span>
              <NumberFlow value={parseInt(safeMeta.currentDate.split(" ")[1] || "2025", 10)} className="font-bold" />
            </div>
          </div>

          {/* Line Chart */}
          <div className="h-[140px] w-full mt-2">
            {safeCharts.trendLine ? (
              <InteractiveLineChart config={safeCharts.trendLine} annotations={annotations} />
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
              {capabilities.map((cap) => (
                <CapabilityBar key={cap.label} label={cap.label} score={cap.score} icon={cap.icon} />
              ))}
            </div>
          </div>

          {/* RIGHT COL (5/12): DONUT & BUCKETS */}
          <div className="col-span-5 flex flex-col justify-between h-full">
            {/* Donut */}
            <div className="flex justify-center items-center relative h-20 mb-2">
              <DonutChart data={safeCharts.marketShare} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] font-bold uppercase text-slate-400 leading-none mb-0.5">Share</span>
                <NumberFlow value={topShare.value} suffix="%" className="text-sm font-bold text-slate-900 leading-none" />
              </div>
            </div>

            {/* Tech Readiness Buckets */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[7px] uppercase tracking-wider text-slate-400">
                <span>Exist</span><span>Emerging</span><span>Sci-Fi</span>
              </div>
              <div className="flex justify-between gap-1 h-8">
                <BucketColumn count={safeTech.existing} color="bg-slate-900" />
                <BucketColumn count={safeTech.emerging} color="bg-indigo-500" />
                <BucketColumn count={safeTech.sciFi} color="bg-slate-200" />
              </div>
            </div>
          </div>
        </div>

        {/* --- ROW 3: KEY STATS --- */}
        <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-3 mb-3">
          {keyStats.map((stat, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[8px] text-slate-400 uppercase tracking-wider mb-0.5">{stat.label}</span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xs font-bold text-slate-900">{stat.value}</span>
                {stat.context && <span className="text-[8px] font-bold text-slate-400">{stat.context}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* --- ROW 4: AGENT FOOTER --- */}
        {agentCount && <AgentFooter agentCount={agentCount} />}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

interface CapabilityBarProps {
  label: string;
  score: number;
  icon: string;
}

const CapabilityBar: React.FC<CapabilityBarProps> = ({ label, score, icon }) => {
  const Icon = IconMap[icon.toLowerCase()] || Brain;
  return (
    <div className="relative h-6 w-full bg-slate-100/50 rounded overflow-hidden group">
      {/* Background Fill Animation */}
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${score}%` }}
        transition={{ duration: 1.2, ease: "circOut" }}
        className="absolute left-0 top-0 h-full bg-gradient-to-r from-slate-900 to-slate-700 z-0"
      />

      {/* Content Layer */}
      <div className="absolute inset-0 flex items-center justify-between px-2 z-10">
        <div className="flex items-center gap-1.5">
          <Icon size={10} className="text-white mix-blend-difference" />
          <span className="text-[8px] font-bold tracking-wider uppercase text-white mix-blend-difference">{label}</span>
        </div>
      </div>
    </div>
  );
};

interface BucketColumnProps {
  count: number;
  color: string;
}

const BucketColumn: React.FC<BucketColumnProps> = ({ count, color }) => (
  <div className="flex flex-col-reverse gap-[1px] w-full items-center">
    {[...Array(6)].map((_, i) => (
      <div key={i} className={`w-full h-1 rounded-[1px] ${i < count ? color : "bg-slate-100"}`} />
    ))}
  </div>
);

interface DonutChartProps {
  data: Array<{ label: string; value: number; color: "accent" | "black" | "gray" }>;
}

const DonutChart: React.FC<DonutChartProps> = ({ data }) => {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const colorMap: Record<string, string> = {
    black: "text-slate-900",
    accent: "text-indigo-500",
    gray: "text-slate-200",
  };

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
      {data.map((segment, i) => {
        const strokeDasharray = `${(segment.value / 100) * circumference} ${circumference}`;
        const offset = accumulatedOffset;
        accumulatedOffset -= (segment.value / 100) * circumference;
        return (
          <motion.circle
            key={i}
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            strokeWidth="12"
            stroke="currentColor"
            className={colorMap[segment.color]}
            initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: 0 }}
            animate={{ strokeDasharray, strokeDashoffset: offset }}
            transition={{ duration: 1, delay: i * 0.1 }}
          />
        );
      })}
    </svg>
  );
};

interface AgentFooterProps {
  agentCount: { count: number; label: string; speed: number };
}

const AgentFooter: React.FC<AgentFooterProps> = ({ agentCount }) => (
  <div className="bg-slate-50 rounded border border-slate-100 p-2 flex items-start gap-2">
    <div className="w-1 h-full bg-indigo-500 rounded-full min-h-[20px]" />
    <div>
      <div className="text-[10px] leading-tight text-slate-700">
        <span className="font-bold"><NumberFlow value={agentCount.count} /></span>
        {" "}{agentCount.label} copies operating at
        <span className="font-bold"> {agentCount.speed}x</span> human speed.
      </div>
      {/* Little green blocks visualizing agents */}
      <div className="flex gap-0.5 mt-1.5 flex-wrap">
        {[...Array(8)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-emerald-500 rounded-[1px] opacity-80" />)}
        {[...Array(4)].map((_, i) => <div key={i + 10} className="w-1.5 h-1.5 bg-slate-200 rounded-[1px]" />)}
      </div>
    </div>
  </div>
);

export default StickyDashboard;
