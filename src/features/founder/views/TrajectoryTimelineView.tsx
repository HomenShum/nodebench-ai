/**
 * TrajectoryTimelineView — Phase 10A/B/C
 *
 * Shows the causal event ledger, path replay, and before/after diffs
 * in a unified timeline. The core "what happened and why" surface.
 *
 * Sections:
 *   1. Trajectory Score Header — sparkline + dimension breakdown
 *   2. Event Ledger — typed events with causal chain links
 *   3. Path Replay — session path visualization
 *   4. State Diffs — before/after comparisons
 */

import { memo, useState, useMemo } from "react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Diff,
  Filter,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCausalMemory } from "../lib/useCausalMemory";

// ── Event type styling ─────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  "initiative.": "text-blue-400",
  "packet.": "text-emerald-400",
  "memo.": "text-violet-400",
  "contradiction.": "text-amber-400",
  "intervention.": "text-cyan-400",
  "agent.": "text-orange-400",
  "signal.": "text-teal-400",
  "decision.": "text-pink-400",
  "state.": "text-gray-400",
};

function getEventColor(eventType: string): string {
  const prefix = Object.keys(EVENT_COLORS).find((p) => eventType.startsWith(p));
  return prefix ? EVENT_COLORS[prefix] : "text-white/60";
}

const ACTOR_ICONS: Record<string, string> = {
  founder: "F",
  agent: "A",
  system: "S",
  background_job: "B",
};

// ── Components ─────────────────────────────────────────────────────────

function MiniSparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const trending = values[values.length - 1] > values[values.length - 2];

  return (
    <svg width={w} height={h} className={className} viewBox={`0 0 ${w} ${h}`}>
      <path d={d} fill="none" stroke={trending ? "#4ade80" : "#f87171"} strokeWidth={1.5} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={trending ? "#4ade80" : "#f87171"} />
    </svg>
  );
}

function DimensionBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-emerald-500/60" : pct >= 50 ? "bg-amber-500/60" : "bg-red-500/60";
  return (
    <div className="flex items-center gap-2">
      <span className="w-36 shrink-0 text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      <div className="h-1.5 flex-1 rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-[10px] tabular-nums text-white/50">{pct}%</span>
    </div>
  );
}

function TrajectoryHeader({ scores }: { scores: { date: string; overallScore: number; dimensions: Record<string, number>; slopeVsPriorDay: number }[] }) {
  const latest = scores[scores.length - 1];
  const prior = scores[scores.length - 2];
  const delta = latest.overallScore - prior.overallScore;
  const trending = delta >= 0;

  return (
    <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Trajectory Score</h2>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-light tabular-nums text-white/90">
              {(latest.overallScore * 100).toFixed(1)}
            </span>
            <span className={cn("flex items-center gap-1 text-sm", trending ? "text-emerald-400" : "text-red-400")}>
              {trending ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {(delta * 100).toFixed(1)}%
            </span>
          </div>
        </div>
        <MiniSparkline values={scores.map((s) => s.overallScore)} className="opacity-70" />
      </div>
      <div className="mt-4 space-y-1.5">
        {Object.entries(latest.dimensions).map(([key, val]) => (
          <DimensionBar key={key} label={key.replace(/([A-Z])/g, " $1").trim()} value={val} />
        ))}
      </div>
    </div>
  );
}

function EventLedger({ events }: { events: { id: string; eventType: string; actorType: string; entityType: string; entityLabel: string; summary: string; createdAt: number }[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = filterType === "all"
    ? events
    : events.filter((e) => e.eventType.startsWith(filterType));

  const filterOptions = ["all", "initiative.", "packet.", "memo.", "contradiction.", "intervention.", "agent.", "signal.", "decision."];

  return (
    <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Event Ledger</h2>
        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-white/30" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-transparent text-[10px] text-white/50 outline-none"
          >
            {filterOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-[#1a1918]">
                {opt === "all" ? "All events" : opt.replace(".", "")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 space-y-0">
        {filtered.map((event) => {
          const expanded = expandedId === event.id;
          const age = Date.now() - event.createdAt;
          const ageStr = age < 3_600_000 ? `${Math.round(age / 60_000)}m ago` : age < 86_400_000 ? `${Math.round(age / 3_600_000)}h ago` : `${Math.round(age / 86_400_000)}d ago`;

          return (
            <button
              key={event.id}
              onClick={() => setExpandedId(expanded ? null : event.id)}
              className="flex w-full items-start gap-3 border-b border-white/[0.04] py-2.5 text-left transition-colors hover:bg-white/[0.02]"
            >
              {/* Actor badge */}
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[9px] font-medium text-white/40">
                {ACTOR_ICONS[event.actorType] ?? "?"}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] font-medium", getEventColor(event.eventType))}>
                    {event.eventType}
                  </span>
                  <span className="text-[10px] text-white/30">{ageStr}</span>
                  {expanded ? <ChevronDown className="ml-auto h-3 w-3 text-white/20" /> : <ChevronRight className="ml-auto h-3 w-3 text-white/20" />}
                </div>
                <p className="mt-0.5 text-xs text-white/60">{event.summary}</p>
                {expanded && (
                  <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.03] p-2.5 text-[10px] text-white/40">
                    <div>Entity: <span className="text-white/60">{event.entityLabel}</span></div>
                    <div>Type: <span className="text-white/60">{event.entityType}</span></div>
                    <div>Actor: <span className="text-white/60">{event.actorType}</span></div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PathReplay({ path }: { path: { surfaceLabel: string; surfaceType: string; durationMs: number }[] }) {
  return (
    <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">Session Path</h2>
      <div className="mt-3 flex items-center gap-1 overflow-x-auto pb-2">
        {path.map((step, i) => {
          const isLast = i === path.length - 1;
          const typeColor = step.surfaceType === "entity" ? "border-cyan-500/30 text-cyan-400/80" : step.surfaceType === "artifact" ? "border-violet-500/30 text-violet-400/80" : "border-white/[0.10] text-white/60";

          return (
            <div key={i} className="flex shrink-0 items-center gap-1">
              <div className={cn("rounded-lg border px-2.5 py-1.5 text-[10px]", typeColor)}>
                <div className="font-medium">{step.surfaceLabel}</div>
                <div className="text-[9px] text-white/30">{(step.durationMs / 1000).toFixed(0)}s</div>
              </div>
              {!isLast && <ArrowRight className="h-3 w-3 shrink-0 text-white/15" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StateDiffList({ diffs }: { diffs: { id: string; entityType: string; entityLabel: string; changeType: string; changedFields: string[]; beforeState: Record<string, any>; afterState: Record<string, any>; reason?: string; createdAt: number }[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-white/[0.20] bg-white/[0.12] p-5">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">State Changes</h2>
      <div className="mt-3 space-y-2">
        {diffs.map((diff) => {
          const expanded = expandedId === diff.id;
          const age = Date.now() - diff.createdAt;
          const ageStr = age < 3_600_000 ? `${Math.round(age / 60_000)}m ago` : `${Math.round(age / 3_600_000)}h ago`;

          return (
            <button
              key={diff.id}
              onClick={() => setExpandedId(expanded ? null : diff.id)}
              className="w-full rounded-lg border border-white/[0.06] p-3 text-left transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Diff className="h-3.5 w-3.5 text-amber-400/60" />
                  <span className="text-xs font-medium text-white/70">{diff.entityLabel}</span>
                  <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] uppercase text-white/40">{diff.changeType}</span>
                </div>
                <span className="text-[10px] text-white/30">{ageStr}</span>
              </div>

              {diff.reason && (
                <p className="mt-1 text-[10px] text-white/40">{diff.reason}</p>
              )}

              {expanded && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-red-500/10 bg-red-500/[0.03] p-2.5">
                    <div className="mb-1 text-[9px] uppercase tracking-wider text-red-400/50">Before</div>
                    {Object.entries(diff.beforeState).map(([key, val]) => (
                      <div key={key} className="text-[10px]">
                        <span className="text-white/30">{key}: </span>
                        <span className="text-red-300/60">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.03] p-2.5">
                    <div className="mb-1 text-[9px] uppercase tracking-wider text-emerald-400/50">After</div>
                    {Object.entries(diff.afterState).map(([key, val]) => (
                      <div key={key} className="text-[10px]">
                        <span className="text-white/30">{key}: </span>
                        <span className="text-emerald-300/60">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main View ──────────────────────────────────────────────────────────

function TrajectoryTimelineViewInner() {
  const { trajectoryScores, events, diffs, path } = useCausalMemory();

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <TrajectoryHeader scores={trajectoryScores} />
        <PathReplay path={path} />
        <EventLedger events={events} />
        <StateDiffList diffs={diffs} />
      </div>
    </div>
  );
}

const TrajectoryTimelineView = memo(TrajectoryTimelineViewInner);
export default TrajectoryTimelineView;
