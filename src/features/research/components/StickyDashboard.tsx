import React, { useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";
import { ShieldAlert, Code, Vote, Cpu, Globe } from "lucide-react";
import ChartTooltip from "./ChartTooltip";
import InteractiveLineChart from "./InteractiveLineChart";
import type { Annotation, DashboardState } from "@/features/research/types";

const IconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "shield-alert": ShieldAlert,
  code: Code,
  vote: Vote,
  globe: Globe,
};

interface StickyDashboardProps {
  data: DashboardState;
}

export const StickyDashboard: React.FC<StickyDashboardProps> = ({ data }) => {
  const [hoveredAnnotation, setHoveredAnnotation] = useState<Annotation | null>(null);

  const [monthToken, yearToken] = data.meta.currentDate.split(" ");
  const yearNumeric = Number.parseInt((yearToken || "").replace(/\D/g, ""), 10) || 0;
  const timelinePct = Math.min(Math.max(data.meta.timelineProgress, 0), 1) * 100;

  return (
    <div className="w-full font-mono text-slate-900 relative">
      <div className="sticky top-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden transition-all duration-500">
        <div className="absolute inset-0 pointer-events-none z-50">
          <ChartTooltip active={!!hoveredAnnotation} data={hoveredAnnotation} />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center bg-black text-white px-2 py-1 rounded text-xs gap-2 shadow-sm">
            <span className="text-gray-300">{monthToken || "Now"}</span>
            <NumberFlow value={yearNumeric} className="font-bold" />
          </div>
          <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${timelinePct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="relative h-[140px] w-full mb-8">
          <span className="absolute top-0 left-0 text-[9px] text-gray-400 uppercase tracking-wider">
            {data.charts.trendLine.label}
          </span>
          <InteractiveLineChart
            data={data.charts.trendLine.data}
            annotations={data.annotations}
            onHover={setHoveredAnnotation}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="flex justify-center items-center relative">
            <DonutChart data={data.charts.marketShare} />
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-[10px] font-bold uppercase">Compute</span>
            </div>
          </div>
          <div className="flex flex-col justify-end gap-1">
            <div className="flex justify-between text-[8px] uppercase tracking-wider text-slate-400">
              <span>Exist</span>
              <span>Emerging</span>
              <span>Sci-Fi</span>
            </div>
            <div className="flex justify-between gap-1">
              <BucketColumn count={data.techReadiness.existing} color="bg-slate-900" align="start" />
              <BucketColumn count={data.techReadiness.emerging} color="bg-indigo-600" align="center" />
              <BucketColumn count={data.techReadiness.sciFi} color="bg-slate-300" align="end" />
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-2 border-t border-b border-slate-100 py-4 mb-4">
          {data.keyStats.map((stat, i) => {
            const { numericValue, format } = normalizeStatValue(stat.value);
            return (
              <div key={i} className="flex flex-col min-w-0">
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">{stat.label}</span>
                <div className="flex items-baseline gap-0.5">
                  <NumberFlow value={numericValue} format={format} className="text-sm font-bold text-slate-900" />
                  {stat.sub && <span className="text-[10px] font-bold text-slate-400">{stat.sub}</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 h-full flex items-center">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mr-2 rotate-180 [writing-mode:vertical-rl]">
              AI Capabilities
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pl-6">
            {data.capabilities.map((cap) => (
              <CapabilityBar key={cap.label} label={cap.label} score={cap.score} icon={cap.icon} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Sub-components ---

const DonutChart = ({ data }: { data: Array<{ value: number; color: string }> }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  const colorMap: Record<string, string> = {
    black: "text-slate-900",
    accent: "text-indigo-600",
    gray: "text-slate-300",
  };

  return (
    <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
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
            strokeWidth="20"
            stroke="currentColor"
            className={colorMap[segment.color] || "text-slate-200"}
            initial={{ strokeDasharray: `0 ${circumference}`, strokeDashoffset: offset }}
            animate={{ strokeDasharray, strokeDashoffset: offset }}
            transition={{ duration: 1, delay: i * 0.2 }}
          />
        );
      })}
    </svg>
  );
};

const BucketColumn = ({ count, color, align }: { count: number; color: string; align: "start" | "center" | "end" }) => {
  const totalSlots = 8;
  const safeCount = Math.max(0, Math.min(totalSlots, Math.round(count)));
  const alignmentClass = align === "center" ? "items-center" : align === "end" ? "items-end" : "items-start";
  return (
    <div className={`flex flex-col-reverse gap-0.5 w-1/3 ${alignmentClass}`}>
      {Array.from({ length: totalSlots }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-[1px] ${i < safeCount ? color : "bg-slate-100"}`} />
      ))}
    </div>
  );
};

const CapabilityBar = ({ label, score, icon }: { label: string; score: number; icon: string }) => {
  const Icon = IconMap[icon] || Cpu;
  const safeScore = Math.max(0, Math.min(100, score));
  return (
    <div className="w-[48%] h-7 bg-slate-50 rounded overflow-hidden relative border border-slate-100">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${safeScore}%` }}
        transition={{ duration: 1 }}
        className="absolute left-0 top-0 h-full bg-slate-900 z-0"
      />
      <div className="absolute inset-0 flex items-center px-2 z-10 mix-blend-difference text-white">
        <Icon size={12} className="mr-2" />
        <span className="text-[10px] font-bold tracking-widest uppercase truncate">{label}</span>
      </div>
    </div>
  );
};

// Normalizes "value" strings like "-25%", "$18B", "900" into NumberFlow-friendly props
const normalizeStatValue = (
  raw: string,
): { numericValue: number; format?: Intl.NumberFormatOptions } => {
  const isPercent = raw.trim().includes("%");
  const isCurrency = raw.trim().startsWith("$");
  const numeric = Number.parseFloat(raw.replace(/[^0-9.-]+/g, "")) || 0;

  if (isPercent) {
    return {
      numericValue: numeric / 100,
      format: { style: "percent", minimumFractionDigits: 0, maximumFractionDigits: 0 },
    };
  }

  if (isCurrency) {
    return {
      numericValue: numeric,
      format: { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 },
    };
  }

  return {
    numericValue: numeric,
    format: { notation: "compact", maximumFractionDigits: 1 },
  };
};

export default StickyDashboard;
