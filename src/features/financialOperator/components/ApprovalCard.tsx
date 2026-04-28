/**
 * ApprovalCard — kit match-card shape.
 *
 * Refactor: previous version was a 4-option 2x2 grid with full descriptions
 * and consequence text — information-rich but visually heavy compared to
 * the kit's match-card pattern (1 terracotta primary + 2 ghost actions
 * in a single tight row, with reasoning hidden behind "Show evidence").
 *
 * New shape mirrors `nb-match-card` from ExactChatSurface (Confirm match /
 * Keep separate / Show evidence):
 *   - Primary CTA in terracotta (the "approve" option)
 *   - Up to 2 ghost actions (the most important alternatives)
 *   - Any remaining options collapse behind "Show evidence" (or "More
 *     options" when there's no evidence to show)
 *   - Consequence text + descriptions live in the expand, not the row
 */

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { ApprovalRequestPayload, StepStatus } from "../types";

interface Props {
  runId: Id<"financialOperatorRuns">;
  stepId: Id<"financialOperatorSteps">;
  status: StepStatus;
  data: ApprovalRequestPayload;
  selectedOptionId?: ApprovalRequestPayload["options"][number]["id"];
}

const PRIMARY_VARIANTS: Array<ApprovalRequestPayload["options"][number]["id"]> = [
  "approve",
];

export function ApprovalCard({
  runId,
  stepId,
  status,
  data,
  selectedOptionId,
}: Props) {
  const recordDecision = useAction(
    api.domains.financialOperator.orchestrator.recordApprovalDecision,
  );
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);

  const isLocked =
    status === "approved" || status === "rejected" || status === "complete";

  async function handleClick(
    optionId: ApprovalRequestPayload["options"][number]["id"],
  ) {
    if (isLocked) return;
    setPendingId(optionId);
    setError(null);
    try {
      await recordDecision({ runId, stepId, optionId });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record decision");
    } finally {
      setPendingId(null);
    }
  }

  // Partition options: primary first, then up to 2 ghosts, rest in expand.
  const primary = data.options.find((o) => PRIMARY_VARIANTS.includes(o.id));
  const others = data.options.filter((o) => !PRIMARY_VARIANTS.includes(o.id));
  const ghosts = others.slice(0, 2);
  const overflow = others.slice(2);

  return (
    <div className="space-y-3">
      <p className="text-[14px] font-medium text-[var(--text-primary)]">
        {data.question}
      </p>

      {/* Primary + ghost row — kit match-card shape */}
      <div className="flex flex-wrap items-center gap-2">
        {primary && (
          <button
            type="button"
            onClick={() => handleClick(primary.id)}
            disabled={isLocked || pendingId !== null}
            aria-pressed={selectedOptionId === primary.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:color-mix(in_oklab,var(--accent-primary)_24%,transparent)] px-3 py-1.5 text-[13px] font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "var(--accent-primary)" }}
          >
            {primary.label}
            {pendingId === primary.id && (
              <span className="ml-1 text-[10px] uppercase tracking-[0.18em] opacity-80">
                ⋯
              </span>
            )}
          </button>
        )}
        {ghosts.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => handleClick(opt.id)}
            disabled={isLocked || pendingId !== null}
            aria-pressed={selectedOptionId === opt.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {opt.label}
            {pendingId === opt.id && (
              <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                ⋯
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowEvidence((v) => !v)}
          aria-expanded={showEvidence}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
        >
          {showEvidence ? "Hide evidence" : "Show evidence"}
        </button>
      </div>

      {/* Evidence expand — context, consequences, overflow options */}
      {showEvidence && (
        <div className="space-y-2 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 p-3">
          {data.context && (
            <p className="text-[13px] leading-[1.5] text-[var(--text-secondary)]">
              {data.context}
            </p>
          )}
          {data.consequences && Object.keys(data.consequences).length > 0 && (
            <ul className="space-y-1.5 border-t border-[var(--border-color)] pt-2 text-[12px] text-[var(--text-secondary)]">
              {Object.entries(data.consequences).map(([id, msg]) => (
                <li key={id} className="flex gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    {id}
                  </span>
                  <span>→ {msg}</span>
                </li>
              ))}
            </ul>
          )}
          {overflow.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-[var(--border-color)] pt-2">
              {overflow.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleClick(opt.id)}
                  disabled={isLocked || pendingId !== null}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-2.5 py-1 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-[10px] border border-[rgba(220,38,38,0.20)] bg-[rgba(220,38,38,0.06)] px-2.5 py-1.5 text-[12px] text-[var(--destructive,#DC2626)]"
        >
          {error}
        </p>
      )}
      {isLocked && (
        <p className="text-[11px] text-[var(--text-tertiary)]">
          Decision recorded — this step is locked.
        </p>
      )}
    </div>
  );
}
