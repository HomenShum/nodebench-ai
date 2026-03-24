/**
 * SearchTrace — Interactive execution trace visualization.
 *
 * Shows the step-by-step trajectory of a search query:
 * classify → context_bundle → tool_call(s) → judge → assemble
 *
 * Dev side: full trace with timing, tool names, status
 * User side: simplified "How we got this answer" citation trail
 */

import { memo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  ChevronDown,
  Clock,
  Cpu,
  Search,
  Shield,
  XCircle,
  Zap,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────────────────── */

export interface TraceStep {
  step: string;
  tool?: string;
  durationMs: number;
  status: "ok" | "error" | "skip";
  detail?: string;
}

interface SearchTraceProps {
  trace: TraceStep[];
  latencyMs: number;
  classification: string;
  judgeVerdict?: { verdict: string; score: number; failingCriteria?: string[] };
  /** "dev" shows full trace details, "user" shows simplified citation trail */
  mode?: "dev" | "user";
}

/* ─── Step icon map ────────────────────────────────────────────────────────── */

function StepIcon({ step, status }: { step: string; status: string }) {
  const color =
    status === "error" ? "text-rose-400"
    : status === "skip" ? "text-zinc-500"
    : "text-emerald-400";

  if (step === "classify_query") return <Search className={`h-3.5 w-3.5 ${color}`} />;
  if (step === "build_context_bundle") return <Cpu className={`h-3.5 w-3.5 ${color}`} />;
  if (step === "tool_call") return <Zap className={`h-3.5 w-3.5 ${color}`} />;
  if (step === "judge") return <Shield className={`h-3.5 w-3.5 ${color}`} />;
  if (step === "assemble_response") return <CheckCircle2 className={`h-3.5 w-3.5 ${color}`} />;
  return <Activity className={`h-3.5 w-3.5 ${color}`} />;
}

/* ─── Step label ───────────────────────────────────────────────────────────── */

function stepLabel(step: TraceStep, mode: "dev" | "user"): string {
  if (mode === "user") {
    if (step.step === "classify_query") return "Understood your question";
    if (step.step === "build_context_bundle") return "Loaded your context";
    if (step.step === "tool_call") return `Ran ${step.tool?.replace(/_/g, " ") ?? "analysis"}`;
    if (step.step === "judge") return "Quality checked";
    if (step.step === "assemble_response") return "Built your result";
    return step.step.replace(/_/g, " ");
  }
  // Dev mode
  if (step.tool) return `${step.step} → ${step.tool}`;
  return step.step;
}

/* ─── Duration bar ─────────────────────────────────────────────────────────── */

function DurationBar({ durationMs, maxMs }: { durationMs: number; maxMs: number }) {
  const pct = maxMs > 0 ? Math.min(100, (durationMs / maxMs) * 100) : 0;
  return (
    <div className="h-1.5 w-16 rounded-full bg-white/[0.06] overflow-hidden">
      <div
        className="h-full rounded-full bg-[#d97757]/60 transition-all duration-300"
        style={{ width: `${Math.max(2, pct)}%` }}
      />
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────────────────── */

export const SearchTrace = memo(function SearchTrace({
  trace,
  latencyMs,
  classification,
  judgeVerdict,
  mode = "user",
}: SearchTraceProps) {
  const [expanded, setExpanded] = useState(mode === "dev");
  const maxDuration = Math.max(...trace.map(t => t.durationMs), 1);
  const totalSteps = trace.length;
  const okSteps = trace.filter(t => t.status === "ok").length;
  const errorSteps = trace.filter(t => t.status === "error").length;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* ── Summary bar ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        <Activity className="h-4 w-4 text-[#d97757]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted flex-1">
          {mode === "dev" ? "Execution Trace" : "How we got this answer"}
        </span>
        <div className="flex items-center gap-2.5 text-[10px] text-content-muted">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {latencyMs}ms
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {totalSteps} steps
          </span>
          {okSteps === totalSteps ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              all ok
            </span>
          ) : errorSteps > 0 ? (
            <span className="flex items-center gap-1 text-rose-400">
              <XCircle className="h-3 w-3" />
              {errorSteps} errors
            </span>
          ) : null}
          {judgeVerdict && (
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
              judgeVerdict.verdict === "pass"
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-rose-500/15 text-rose-400"
            }`}>
              {judgeVerdict.score}%
            </span>
          )}
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-content-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {/* ── Expanded trace ───────────────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          {/* Timeline */}
          <div className="relative space-y-0">
            {trace.map((step, i) => (
              <div key={i} className="relative flex items-start gap-3 py-1.5">
                {/* Vertical line */}
                {i < trace.length - 1 && (
                  <div className="absolute left-[7px] top-[18px] w-px h-[calc(100%-4px)] bg-white/[0.08]" />
                )}
                {/* Icon */}
                <div className="relative z-10 mt-0.5">
                  <StepIcon step={step.step} status={step.status} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-content truncate">
                      {stepLabel(step, mode)}
                    </span>
                    <DurationBar durationMs={step.durationMs} maxMs={maxDuration} />
                    <span className="text-[10px] tabular-nums text-content-muted shrink-0">
                      {step.durationMs}ms
                    </span>
                  </div>
                  {mode === "dev" && step.detail && (
                    <p className="mt-0.5 text-[10px] text-content-muted/70 font-mono truncate">
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Judge verdict (dev mode) */}
          {mode === "dev" && judgeVerdict && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-[10px]">
                <Shield className="h-3.5 w-3.5 text-[#d97757]" />
                <span className="font-semibold uppercase tracking-[0.15em] text-content-muted">Judge</span>
                <span className={`rounded-full px-2 py-0.5 font-bold ${
                  judgeVerdict.verdict === "pass"
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "bg-rose-500/15 text-rose-400"
                }`}>
                  {judgeVerdict.verdict} ({judgeVerdict.score}%)
                </span>
                {judgeVerdict.failingCriteria && judgeVerdict.failingCriteria.length > 0 && (
                  <span className="text-rose-400/70">
                    Failing: {judgeVerdict.failingCriteria.join(", ")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Classification badge */}
          <div className="mt-2 flex items-center gap-2 text-[10px] text-content-muted">
            <span className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono">
              {classification}
            </span>
            <span>classification</span>
          </div>
        </div>
      )}
    </div>
  );
});
