import type { ReactNode } from "react";
import type { StepKind, StepStatus } from "../types";
import { StepStatusBadge } from "./StepStatusBadge";

const KIND_LABEL: Record<StepKind, string> = {
  run_brief: "Plan",
  tool_call: "Tool",
  extraction: "Extraction",
  validation: "Validation",
  calculation: "Calculation",
  evidence: "Evidence",
  artifact: "Artifact",
  approval_request: "Approval",
  result: "Result",
};

const KIND_ACCENT: Record<StepKind, string> = {
  run_brief: "border-l-blue-400/50",
  tool_call: "border-l-slate-400/40",
  extraction: "border-l-purple-400/50",
  validation: "border-l-cyan-400/50",
  calculation: "border-l-emerald-400/50",
  evidence: "border-l-indigo-400/50",
  artifact: "border-l-amber-400/50",
  approval_request: "border-l-[#d97757]",
  result: "border-l-emerald-400",
};

interface StepShellProps {
  kind: StepKind;
  status: StepStatus;
  title: string;
  seq: number;
  durationMs?: number;
  errorMessage?: string;
  children: ReactNode;
}

/**
 * Common chrome around every step card:
 *   - Sequence number (1, 2, 3…)
 *   - Kind label (Plan / Tool / Extraction / …)
 *   - Status badge
 *   - Title + body
 *   - Optional duration + error footer
 *
 * Accent stripe on the left differentiates kinds at a glance.
 */
export function StepShell({
  kind,
  status,
  title,
  seq,
  durationMs,
  errorMessage,
  children,
}: StepShellProps) {
  return (
    <article
      className={`nb-card relative border-l-4 ${KIND_ACCENT[kind]} text-content`}
      aria-label={`Step ${seq + 1}: ${KIND_LABEL[kind]} — ${title}`}
    >
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-content-muted">
          #{(seq + 1).toString().padStart(2, "0")}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          {KIND_LABEL[kind]}
        </span>
        <h3 className="text-sm font-medium text-content">{title}</h3>
        <span className="ml-auto">
          <StepStatusBadge status={status} />
        </span>
      </header>
      <div className="text-sm text-content-secondary">{children}</div>
      {(durationMs !== undefined || errorMessage) && (
        <footer className="mt-3 flex flex-wrap items-center gap-3 border-t border-edge pt-2 text-[11px] text-content-muted">
          {durationMs !== undefined && (
            <span>Took {durationMs}ms</span>
          )}
          {errorMessage && (
            <span className="text-red-300">Error: {errorMessage}</span>
          )}
        </footer>
      )}
    </article>
  );
}
