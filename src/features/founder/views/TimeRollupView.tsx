/**
 * TimeRollupView — Phase 10D
 *
 * Day / Week / Month / Quarter / Year comparison dashboard.
 * Shows metric snapshots with delta comparisons across periods.
 *
 * Sections:
 *   1. Period Selector — tab bar for granularity
 *   2. Metric Grid — key metrics with delta badges
 *   3. Comparison Panel — side-by-side period comparison
 *   4. Narrative Summary — (Phase 2: LLM-generated)
 */

import { memo, useState, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCausalMemory } from "../lib/useCausalMemory";

// ── Types ──────────────────────────────────────────────────────────────

type PeriodType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly";

interface RollupMetrics {
  initiativeCount: number;
  initiativesActive: number;
  initiativesBlocked: number;
  initiativesCompleted: number;
  interventionsSuggested: number;
  interventionsStarted: number;
  interventionsCompleted: number;
  signalsIngested: number;
  avgSignalImportance: number;
  identityConfidence: number;
  avgInitiativePriority: number;
  eventsRecorded: number;
  pathStepsRecorded: number;
  diffsRecorded: number;
  packetsGenerated: number;
  memosGenerated: number;
  agentsHealthy: number;
  agentsDrifting: number;
  importantChangesDetected: number;
  importantChangesResolved: number;
}

// Demo fixtures sourced from useCausalMemory hook

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: "Day",
  weekly: "Week",
  monthly: "Month",
  quarterly: "Quarter",
  yearly: "Year",
};

// ── Metric Card ────────────────────────────────────────────────────────

function MetricCard({
  label,
  current,
  prior,
  isPercentage,
}: {
  label: string;
  current: number;
  prior: number;
  isPercentage?: boolean;
}) {
  const delta = current - prior;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const fmt = (v: number) => (isPercentage ? `${(v * 100).toFixed(1)}%` : String(v));

  return (
    <div className="rounded-lg border border-white/[0.10] bg-white/[0.06] p-3">
      <div className="text-[9px] uppercase tracking-wider text-white/35">{label}</div>
      <div className="mt-1 flex items-baseline justify-between">
        <span className="text-lg font-light tabular-nums text-white/80">{fmt(current)}</span>
        <span className={cn("flex items-center gap-0.5 text-[10px] tabular-nums", direction === "up" ? "text-emerald-400" : direction === "down" ? "text-red-400" : "text-white/30")}>
          {direction === "up" && <ArrowUpRight className="h-3 w-3" />}
          {direction === "down" && <ArrowDownRight className="h-3 w-3" />}
          {direction === "flat" && <Minus className="h-3 w-3" />}
          {isPercentage ? `${(delta * 100).toFixed(1)}pp` : delta > 0 ? `+${delta}` : String(delta)}
        </span>
      </div>
      <div className="mt-0.5 text-[9px] text-white/25">Prior: {fmt(prior)}</div>
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

function TimeRollupViewInner() {
  const [period, setPeriod] = useState<PeriodType>("daily");
  const { rollups } = useCausalMemory();
  const data = rollups[period];
  const c = data.current.metrics;
  const p = data.prior.metrics;

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Time Rollups</h1>
          <div className="flex gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] p-0.5">
            {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((pt) => (
              <button
                key={pt}
                onClick={() => setPeriod(pt)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                  period === pt ? "bg-accent-primary/20 text-accent-primary" : "text-white/40 hover:text-white/60",
                )}
              >
                {PERIOD_LABELS[pt]}
              </button>
            ))}
          </div>
        </div>

        {/* Period Labels */}
        <div className="flex items-center justify-between rounded-xl border border-white/[0.20] bg-white/[0.12] p-4">
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider text-white/30">Current</div>
            <div className="mt-0.5 text-sm font-medium text-white/70">{data.current.key}</div>
          </div>
          <div className="text-[10px] text-white/20">vs</div>
          <div className="text-center">
            <div className="text-[9px] uppercase tracking-wider text-white/30">Prior</div>
            <div className="mt-0.5 text-sm font-medium text-white/70">{data.prior.key}</div>
          </div>
        </div>

        {/* Execution */}
        <div>
          <h2 className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/30">Execution</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard label="Initiatives" current={c.initiativeCount} prior={p.initiativeCount} />
            <MetricCard label="Active" current={c.initiativesActive} prior={p.initiativesActive} />
            <MetricCard label="Blocked" current={c.initiativesBlocked} prior={p.initiativesBlocked} />
            <MetricCard label="Completed" current={c.initiativesCompleted} prior={p.initiativesCompleted} />
          </div>
        </div>

        {/* Interventions */}
        <div>
          <h2 className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/30">Interventions</h2>
          <div className="grid grid-cols-3 gap-2">
            <MetricCard label="Suggested" current={c.interventionsSuggested} prior={p.interventionsSuggested} />
            <MetricCard label="Started" current={c.interventionsStarted} prior={p.interventionsStarted} />
            <MetricCard label="Completed" current={c.interventionsCompleted} prior={p.interventionsCompleted} />
          </div>
        </div>

        {/* Intelligence */}
        <div>
          <h2 className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/30">Intelligence</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard label="Signals" current={c.signalsIngested} prior={p.signalsIngested} />
            <MetricCard label="Avg Importance" current={c.avgSignalImportance} prior={p.avgSignalImportance} isPercentage />
            <MetricCard label="Identity Conf." current={c.identityConfidence} prior={p.identityConfidence} isPercentage />
            <MetricCard label="Events" current={c.eventsRecorded} prior={p.eventsRecorded} />
          </div>
        </div>

        {/* Artifacts */}
        <div>
          <h2 className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/30">Artifacts</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard label="Packets" current={c.packetsGenerated} prior={p.packetsGenerated} />
            <MetricCard label="Memos" current={c.memosGenerated} prior={p.memosGenerated} />
            <MetricCard label="Diffs" current={c.diffsRecorded} prior={p.diffsRecorded} />
            <MetricCard label="Path Steps" current={c.pathStepsRecorded} prior={p.pathStepsRecorded} />
          </div>
        </div>

        {/* Health */}
        <div>
          <h2 className="mb-2 text-[10px] uppercase tracking-[0.15em] text-white/30">Health</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricCard label="Agents Healthy" current={c.agentsHealthy} prior={p.agentsHealthy} />
            <MetricCard label="Agents Drifting" current={c.agentsDrifting} prior={p.agentsDrifting} />
            <MetricCard label="Changes Detected" current={c.importantChangesDetected} prior={p.importantChangesDetected} />
            <MetricCard label="Changes Resolved" current={c.importantChangesResolved} prior={p.importantChangesResolved} />
          </div>
        </div>
      </div>
    </div>
  );
}

const TimeRollupView = memo(TimeRollupViewInner);
export default TimeRollupView;
