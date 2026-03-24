"use client";

/**
 * TrajectoryDebugger — DEV-SIDE visual debugger for agent step trajectories.
 *
 * Shows every tool call, its inputs/outputs, timing, pass/fail, causal chain.
 * Two views: Timeline (default) and Waterfall. Matches NodeBench glass-card DNA.
 */

import React, { useState, useCallback, useMemo, memo } from "react";
import type { TrajectoryStep } from "../hooks/useTrajectoryCapture";

export type { TrajectoryStep };

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const STATUS_DOT: Record<TrajectoryStep["status"], string> = {
  pending: "bg-white/30",
  running: "bg-[#d97757] animate-pulse",
  success: "bg-emerald-500",
  error: "bg-red-500",
  skipped: "bg-amber-400",
};

const STATUS_LABEL: Record<TrajectoryStep["status"], string> = {
  pending: "Pending",
  running: "Running",
  success: "Pass",
  error: "Fail",
  skipped: "Skipped",
};

const STATUS_BAR_COLOR: Record<TrajectoryStep["status"], string> = {
  pending: "bg-white/20",
  running: "bg-[#d97757]",
  success: "bg-emerald-500",
  error: "bg-red-500",
  skipped: "bg-amber-400",
};

type StatusFilter = "all" | "success" | "error" | "skipped";
type ViewMode = "timeline" | "waterfall";

// ═══════════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════

const DEMO_TRAJECTORY: TrajectoryStep[] = [
  {
    id: "step-0",
    index: 0,
    toolName: "discover_tools",
    status: "success",
    startMs: 0,
    endMs: 142,
    durationMs: 142,
    inputSummary: '{ "query": "founder weekly reset", "limit": 10 }',
    outputSummary: "Returned 6 tools: weekly_reset, narrative_checkpoint, ops_dashboard, sync_daily_brief, get_narrative_status, decision_memo",
    outputSize: 2048,
    children: ["step-1", "step-2"],
    judge: {
      pass: true,
      criteria: [
        { criterion: "Returns relevant tools", pass: true, evidence: "6/6 tools match founder reset workflow" },
        { criterion: "Response under 500ms", pass: true, evidence: "142ms" },
        { criterion: "Includes nextTools refs", pass: true, evidence: "All entries have nextTools populated" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
  {
    id: "step-1",
    index: 1,
    toolName: "sync_daily_brief",
    status: "success",
    startMs: 150,
    endMs: 1820,
    durationMs: 1670,
    inputSummary: '{ "source": "convex", "days": 7 }',
    outputSummary: "Synced 7 daily briefs. 23 signals, 4 narratives, 12 entity mentions.",
    outputSize: 14200,
    causedBy: "step-0",
    children: ["step-3"],
    judge: {
      pass: true,
      criteria: [
        { criterion: "All 7 days synced", pass: true, evidence: "7/7 briefs retrieved" },
        { criterion: "No stale data (>24h)", pass: true, evidence: "Most recent brief is 3h old" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
  {
    id: "step-2",
    index: 2,
    toolName: "get_narrative_status",
    status: "success",
    startMs: 155,
    endMs: 920,
    durationMs: 765,
    inputSummary: '{ "depth": "full" }',
    outputSummary: "Active narratives: 3. Dominant: AI agent infrastructure. Underreported: regulatory signals in EU AI Act compliance.",
    outputSize: 4800,
    causedBy: "step-0",
    judge: {
      pass: true,
      criteria: [
        { criterion: "Returns active narratives", pass: true, evidence: "3 narratives with scores" },
        { criterion: "Includes underreported angle", pass: true, evidence: "EU AI Act flagged" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
  {
    id: "step-3",
    index: 3,
    toolName: "ops_dashboard",
    status: "success",
    startMs: 1830,
    endMs: 2400,
    durationMs: 570,
    inputSummary: '{ "period": "7d" }',
    outputSummary: "Ops: 42 tool calls, 3 errors (7.1% error rate), avg latency 340ms. Top tool: search_entities (18 calls).",
    outputSize: 3200,
    causedBy: "step-1",
    judge: {
      pass: true,
      criteria: [
        { criterion: "Error rate computed", pass: true, evidence: "7.1% computed from 3/42" },
        { criterion: "Top tools ranked", pass: true, evidence: "search_entities ranked #1 with 18 calls" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
  {
    id: "step-4",
    index: 4,
    toolName: "decision_memo",
    status: "error",
    startMs: 2410,
    endMs: 4100,
    durationMs: 1690,
    inputSummary: '{ "topic": "Weekly founder priorities", "signals": ["step-1", "step-2", "step-3"] }',
    outputSummary: "",
    error: "Token budget exceeded: 8200 tokens requested, 4096 limit. Truncated output discarded.",
    outputSize: 0,
    causedBy: "step-0",
    children: ["step-5"],
    judge: {
      pass: false,
      criteria: [
        { criterion: "Memo generated", pass: false, evidence: "Token budget exceeded" },
        { criterion: "All signal sources cited", pass: false, evidence: "No output produced" },
        { criterion: "Actionable items extracted", pass: false, evidence: "N/A due to failure" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
  {
    id: "step-5",
    index: 5,
    toolName: "decision_memo",
    status: "success",
    startMs: 4110,
    endMs: 5800,
    durationMs: 1690,
    inputSummary: '{ "topic": "Weekly founder priorities", "signals": ["step-1", "step-2", "step-3"], "maxTokens": 3000 }',
    outputSummary: "Generated memo: 3 priorities, 5 action items, 2 risk flags. Compressed to 2,841 tokens.",
    outputSize: 11400,
    causedBy: "step-4",
    judge: {
      pass: true,
      criteria: [
        { criterion: "Memo generated", pass: true, evidence: "2841 tokens, under 3000 limit" },
        { criterion: "All signal sources cited", pass: true, evidence: "3/3 sources referenced" },
        { criterion: "Actionable items extracted", pass: true, evidence: "5 action items with owners" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
  {
    id: "step-6",
    index: 6,
    toolName: "weekly_reset",
    status: "success",
    startMs: 5810,
    endMs: 6900,
    durationMs: 1090,
    inputSummary: '{ "memo": "step-5", "clearState": true }',
    outputSummary: "Reset complete. Archived 42 tool call records, rotated 3 narrative checkpoints, cleared 12 stale entity caches.",
    outputSize: 1600,
    causedBy: "step-5",
    judge: {
      pass: true,
      criteria: [
        { criterion: "State cleared", pass: true, evidence: "12 caches purged" },
        { criterion: "Archives created", pass: true, evidence: "42 records archived" },
        { criterion: "Narrative checkpoints rotated", pass: true, evidence: "3 checkpoints rotated" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
  {
    id: "step-7",
    index: 7,
    toolName: "skill_freshness_check",
    status: "skipped",
    startMs: 6910,
    durationMs: 0,
    inputSummary: '{ "scope": "founder" }',
    outputSummary: "Skipped: no stale skills detected in last 7d window.",
    outputSize: 0,
    judge: {
      pass: true,
      criteria: [
        { criterion: "Skip justified", pass: true, evidence: "All founder skills updated within 7d" },
      ],
      model: "claude-sonnet-4-20250514",
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function copyToClipboard(text: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {
      /* silent */
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// JSON VIEWER (syntax colored, no external deps)
// ═══════════════════════════════════════════════════════════════════════════

function JsonViewer({ raw }: { raw: string }) {
  // Try to parse as JSON for pretty-printing, fall back to raw
  let formatted = raw;
  try {
    const parsed = JSON.parse(raw);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // leave as-is
  }

  // Simple syntax coloring via spans
  const colored = formatted
    .replace(/"([^"\\]*(\\.[^"\\]*)*)"(?=\s*:)/g, '<span class="text-[#d97757]">"$1"</span>')
    .replace(/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g, ': <span class="text-emerald-400">"$1"</span>')
    .replace(/:\s*(\d+(\.\d+)?)/g, ': <span class="text-sky-400">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="text-amber-400">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="text-white/40">$1</span>');

  return (
    <pre
      className="font-mono text-xs text-white/70 whitespace-pre-wrap break-all max-h-64 overflow-y-auto p-3 bg-black/40 rounded-lg border border-white/[0.06]"
      dangerouslySetInnerHTML={{ __html: colored }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// JUDGE PANEL
// ═══════════════════════════════════════════════════════════════════════════

function JudgePanel({ judge }: { judge: NonNullable<TrajectoryStep["judge"]> }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-black/30 border border-white/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          Judge verdict
        </span>
        <span
          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
            judge.pass
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {judge.pass ? "PASS" : "FAIL"}
        </span>
        <span className="text-[10px] font-mono text-white/30 ml-auto">
          {judge.model}
        </span>
      </div>
      <div className="space-y-1">
        {judge.criteria.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={`mt-0.5 flex-shrink-0 ${c.pass ? "text-emerald-400" : "text-red-400"}`}>
              {c.pass ? "\u2713" : "\u2717"}
            </span>
            <span className="text-white/60">{c.criterion}</span>
            <span className="text-white/30 ml-auto text-right max-w-[50%] truncate" title={c.evidence}>
              {c.evidence}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP CARD (Timeline view)
// ═══════════════════════════════════════════════════════════════════════════

function StepCard({
  step,
  expanded,
  onToggle,
  depth,
}: {
  step: TrajectoryStep;
  expanded: boolean;
  onToggle: () => void;
  depth: number;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = step.outputSummary || step.error || "";
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [step.outputSummary, step.error]);

  const handleCite = useCallback(() => {
    const hash = step.id.slice(0, 8);
    const cite = `[Step ${step.index}: ${step.toolName} @ ${formatMs(step.startMs)} | ${STATUS_LABEL[step.status]} | id:${hash}]`;
    copyToClipboard(cite);
  }, [step]);

  const isRunning = step.status === "running";

  return (
    <div
      className="relative"
      style={{ marginLeft: depth * 24 }}
    >
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute -left-3 top-0 bottom-0 w-px bg-white/[0.08]" />
      )}
      {depth > 0 && (
        <div className="absolute -left-3 top-5 w-3 h-px bg-white/[0.08]" />
      )}

      <button
        type="button"
        onClick={onToggle}
        className={`w-full text-left rounded-xl p-4 transition-all duration-200 border ${
          isRunning
            ? "bg-white/[0.12] border-[#d97757]/40 shadow-[0_0_16px_rgba(217,119,87,0.12)]"
            : "bg-white/[0.06] border-white/[0.10] hover:bg-white/[0.10] hover:border-white/[0.16]"
        }`}
      >
        {/* Header row */}
        <div className="flex items-center gap-3">
          {/* Index */}
          <span className="font-mono text-[11px] text-white/30 w-5 text-right flex-shrink-0">
            {step.index}
          </span>

          {/* Status dot */}
          <span
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[step.status]}`}
            title={STATUS_LABEL[step.status]}
          />

          {/* Tool name */}
          <span className="font-mono text-sm text-white/90 font-medium truncate">
            {step.toolName}
          </span>

          {/* Duration badge */}
          {step.durationMs != null && step.durationMs > 0 && (
            <span className="ml-auto font-mono text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/50 flex-shrink-0">
              {formatMs(step.durationMs)}
            </span>
          )}

          {/* Status label */}
          <span
            className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded flex-shrink-0 ${
              step.status === "success"
                ? "bg-emerald-500/20 text-emerald-400"
                : step.status === "error"
                  ? "bg-red-500/20 text-red-400"
                  : step.status === "skipped"
                    ? "bg-amber-400/20 text-amber-400"
                    : step.status === "running"
                      ? "bg-[#d97757]/20 text-[#d97757]"
                      : "bg-white/10 text-white/40"
            }`}
          >
            {STATUS_LABEL[step.status]}
          </span>

          {/* Expand chevron */}
          <svg
            className={`w-4 h-4 text-white/30 transition-transform flex-shrink-0 ${
              expanded ? "rotate-90" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        {/* Summary line */}
        <p className="mt-1.5 text-xs text-white/40 pl-[44px] truncate">
          {step.error || step.outputSummary}
        </p>
      </button>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="mt-2 ml-[44px] space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {/* Input */}
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 block mb-1">
              Input
            </span>
            <JsonViewer raw={step.inputSummary} />
          </div>

          {/* Output / Error */}
          <div>
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 block mb-1">
              {step.error ? "Error" : "Output"}
            </span>
            {step.error ? (
              <div className="text-xs text-red-400 p-3 bg-red-500/10 rounded-lg border border-red-500/20 font-mono">
                {step.error}
              </div>
            ) : (
              <div className="text-xs text-white/60 p-3 bg-black/40 rounded-lg border border-white/[0.06]">
                {step.outputSummary}
                {step.outputSize != null && step.outputSize > 0 && (
                  <span className="text-white/30 ml-2">
                    ({(step.outputSize / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Metadata */}
          {step.metadata && Object.keys(step.metadata).length > 0 && (
            <div>
              <span className="text-[11px] uppercase tracking-[0.2em] text-white/40 block mb-1">
                Metadata
              </span>
              <JsonViewer raw={JSON.stringify(step.metadata)} />
            </div>
          )}

          {/* Judge */}
          {step.judge && <JudgePanel judge={step.judge} />}

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              className="text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-white/[0.12]"
            >
              {copied ? "Copied" : "Copy output"}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleCite();
              }}
              className="text-[10px] uppercase tracking-wider text-white/30 hover:text-white/60 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-white/[0.12]"
            >
              Cite this step
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WATERFALL VIEW
// ═══════════════════════════════════════════════════════════════════════════

function WaterfallBar({
  step,
  totalMs,
}: {
  step: TrajectoryStep;
  totalMs: number;
}) {
  const [hovered, setHovered] = useState(false);
  if (totalMs === 0) return null;

  const leftPct = (step.startMs / totalMs) * 100;
  const widthPct = Math.max(((step.durationMs ?? 0) / totalMs) * 100, 0.5);

  return (
    <div
      className="relative h-7 flex items-center group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Label */}
      <span className="font-mono text-[10px] text-white/40 w-36 truncate flex-shrink-0 pr-2 text-right">
        {step.toolName}
      </span>

      {/* Track */}
      <div className="flex-1 relative h-4 rounded bg-white/[0.03]">
        <div
          className={`absolute top-0 h-full rounded ${STATUS_BAR_COLOR[step.status]} transition-opacity ${
            step.status === "running" ? "animate-pulse" : ""
          }`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
        />
      </div>

      {/* Duration label */}
      <span className="font-mono text-[10px] text-white/30 w-16 text-right flex-shrink-0 pl-2">
        {step.durationMs != null && step.durationMs > 0 ? formatMs(step.durationMs) : "--"}
      </span>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute left-40 top-full z-50 mt-1 p-3 rounded-lg bg-[#18181b] border border-white/[0.12] shadow-xl max-w-xs">
          <div className="font-mono text-xs text-white/80 font-medium mb-1">
            {step.toolName}
          </div>
          <div className="text-[10px] text-white/40 space-y-0.5">
            <div>Status: {STATUS_LABEL[step.status]}</div>
            <div>Start: {formatMs(step.startMs)}</div>
            {step.durationMs != null && <div>Duration: {formatMs(step.durationMs)}</div>}
            {step.outputSize != null && step.outputSize > 0 && (
              <div>Output: {(step.outputSize / 1024).toFixed(1)} KB</div>
            )}
          </div>
          <p className="text-[10px] text-white/30 mt-1 truncate">
            {step.error || step.outputSummary}
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY BAR
// ═══════════════════════════════════════════════════════════════════════════

function SummaryBar({
  steps,
  runId,
}: {
  steps: TrajectoryStep[];
  runId?: string;
}) {
  const passed = steps.filter((s) => s.status === "success").length;
  const failed = steps.filter((s) => s.status === "error").length;
  const skipped = steps.filter((s) => s.status === "skipped").length;
  const totalDuration = steps.reduce((sum, s) => sum + (s.durationMs ?? 0), 0);
  const judgeModel = steps.find((s) => s.judge)?.judge?.model;
  const allPassed = failed === 0 && steps.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-white/[0.06] border border-white/[0.10]">
      {/* Run ID */}
      {runId && (
        <span className="font-mono text-[10px] text-white/25 truncate max-w-[120px]" title={runId}>
          {runId}
        </span>
      )}

      {/* Counts */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/40">
          {steps.length} steps
        </span>
        <span className="text-[11px] text-emerald-400">{passed} pass</span>
        {failed > 0 && (
          <span className="text-[11px] text-red-400">{failed} fail</span>
        )}
        {skipped > 0 && (
          <span className="text-[11px] text-amber-400">{skipped} skip</span>
        )}
      </div>

      {/* Duration */}
      <span className="font-mono text-[11px] text-white/40">
        {formatMs(totalDuration)}
      </span>

      {/* Judge model */}
      {judgeModel && (
        <span className="font-mono text-[10px] text-white/25 hidden sm:inline">
          judge: {judgeModel}
        </span>
      )}

      {/* Verdict */}
      <span
        className={`ml-auto text-[10px] font-bold uppercase px-2 py-1 rounded ${
          allPassed
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-red-500/20 text-red-400"
        }`}
      >
        {allPassed ? "ALL PASS" : `${failed} FAILED`}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH BAR
// ═══════════════════════════════════════════════════════════════════════════

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      placeholder="Search step outputs..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/70 placeholder:text-white/20 focus:outline-none focus:border-[#d97757]/40 focus:ring-1 focus:ring-[#d97757]/20 font-mono"
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface TrajectoryDebuggerProps {
  steps?: TrajectoryStep[];
  runId?: string;
  mode?: "dev" | "user";
}

function TrajectoryDebuggerInner({
  steps: propSteps,
  runId,
  mode = "dev",
}: TrajectoryDebuggerProps) {
  const steps = propSteps && propSteps.length > 0 ? propSteps : DEMO_TRAJECTORY;

  const [view, setView] = useState<ViewMode>("timeline");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build step-depth map for causal indentation
  const depthMap = useMemo(() => {
    const map = new Map<string, number>();
    const stepById = new Map(steps.map((s) => [s.id, s]));

    function getDepth(id: string): number {
      if (map.has(id)) return map.get(id)!;
      const s = stepById.get(id);
      if (!s?.causedBy) {
        map.set(id, 0);
        return 0;
      }
      const d = getDepth(s.causedBy) + 1;
      map.set(id, d);
      return d;
    }

    for (const s of steps) getDepth(s.id);
    return map;
  }, [steps]);

  // Filtered steps
  const filtered = useMemo(() => {
    let result = steps;
    if (filter !== "all") {
      result = result.filter((s) => {
        if (filter === "success") return s.status === "success";
        if (filter === "error") return s.status === "error";
        if (filter === "skipped") return s.status === "skipped";
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.toolName.toLowerCase().includes(q) ||
          s.outputSummary.toLowerCase().includes(q) ||
          s.inputSummary.toLowerCase().includes(q) ||
          (s.error && s.error.toLowerCase().includes(q))
      );
    }
    return result;
  }, [steps, filter, search]);

  // Waterfall total
  const waterfallTotalMs = useMemo(() => {
    let max = 0;
    for (const s of steps) {
      const end = s.endMs ?? s.startMs + (s.durationMs ?? 0);
      if (end > max) max = end;
    }
    return max;
  }, [steps]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedIds(new Set(steps.map((s) => s.id)));
  }, [steps]);

  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  return (
    <div className="space-y-4 font-[Manrope,sans-serif]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/40">
          Trajectory Debugger
          {mode === "dev" && (
            <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-[#d97757]/20 text-[#d97757] normal-case tracking-normal">
              DEV
            </span>
          )}
        </h2>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setView("timeline")}
            className={`text-[10px] px-2.5 py-1 rounded transition-colors ${
              view === "timeline"
                ? "bg-white/[0.10] text-white/80"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setView("waterfall")}
            className={`text-[10px] px-2.5 py-1 rounded transition-colors ${
              view === "waterfall"
                ? "bg-white/[0.10] text-white/80"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            Waterfall
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <SummaryBar steps={steps} runId={runId} />

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <div className="flex items-center gap-1">
          {(["all", "success", "error", "skipped"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`text-[10px] px-2 py-1 rounded transition-colors capitalize ${
                filter === f
                  ? "bg-white/[0.10] text-white/80"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {f === "all" ? "All" : f === "success" ? "Pass" : f === "error" ? "Fail" : "Skipped"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 min-w-[160px] max-w-xs">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        {/* Expand/Collapse (timeline only) */}
        {view === "timeline" && (
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={expandAll}
              className="text-[10px] text-white/30 hover:text-white/50 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-white/[0.12]"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[10px] text-white/30 hover:text-white/50 transition-colors px-2 py-1 rounded border border-white/[0.06] hover:border-white/[0.12]"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {/* Timeline view */}
      {view === "timeline" && (
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-white/20">
              No steps match the current filter.
            </div>
          )}
          {filtered.map((step) => (
            <StepCard
              key={step.id}
              step={step}
              expanded={expandedIds.has(step.id)}
              onToggle={() => toggleExpand(step.id)}
              depth={depthMap.get(step.id) ?? 0}
            />
          ))}
        </div>
      )}

      {/* Waterfall view */}
      {view === "waterfall" && (
        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] space-y-0.5">
          {/* Time axis */}
          <div className="flex items-center mb-2">
            <span className="w-36 flex-shrink-0" />
            <div className="flex-1 flex justify-between">
              <span className="font-mono text-[9px] text-white/20">0ms</span>
              <span className="font-mono text-[9px] text-white/20">
                {formatMs(waterfallTotalMs)}
              </span>
            </div>
            <span className="w-16 flex-shrink-0" />
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-white/20">
              No steps match the current filter.
            </div>
          )}
          {filtered.map((step) => (
            <WaterfallBar key={step.id} step={step} totalMs={waterfallTotalMs} />
          ))}
        </div>
      )}
    </div>
  );
}

const TrajectoryDebugger = memo(TrajectoryDebuggerInner);
export default TrajectoryDebugger;
