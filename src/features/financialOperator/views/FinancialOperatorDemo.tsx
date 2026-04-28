import { useState } from "react";
import { useAction } from "convex/react";
import { Play } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FinancialOperatorTimeline } from "../components/FinancialOperatorTimeline";

/**
 * Standalone demo surface for the financial operator console.
 *
 * This is the "tested live" entry point: click "Run AT&T 10-K demo",
 * the orchestrator action streams typed steps, and the timeline renders
 * a full operator-console chat experience (run brief → tool calls →
 * extraction → validation → sandbox calculation → evidence → artifact →
 * approval gate).
 *
 * Long-term, this same timeline component will mount inside the chat
 * panel (FastAgentPanel) once the agent's task classifier detects a
 * financial workflow.
 */
export function FinancialOperatorDemo() {
  const runDemo = useAction(
    api.domains.financialOperator.orchestrator.runAttCostOfDebtDemo,
  );
  const [runId, setRunId] = useState<Id<"financialOperatorRuns"> | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setIsStarting(true);
    setError(null);
    try {
      const { runId: newRunId } = await runDemo({});
      setRunId(newRunId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start run");
    } finally {
      setIsStarting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content-muted">
          Financial operator console — demo
        </p>
        <h1 className="text-xl font-semibold text-content">
          AT&amp;T 10-K → effective tax rate &amp; after-tax cost of debt
        </h1>
        <p className="text-[13px] text-content-secondary">
          Watch the agent locate sources, extract structured values, validate
          inputs, run a deterministic sandbox calculation, gather source
          anchors, draft a notebook artifact, and pause for reviewer approval —
          one observable card per step. Math runs in JS, not in the language
          model.
        </p>
      </header>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={isStarting}
          className="inline-flex items-center gap-2 rounded border border-[#d97757]/40 bg-[#d97757]/15 px-3 py-1.5 text-sm font-medium text-[#f5d0b8] transition-colors hover:bg-[#d97757]/25 focus-visible:ring-2 focus-visible:ring-[#d97757]/60 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
          {runId ? "Run again" : "Run AT&T 10-K demo"}
        </button>
        {isStarting && (
          <span
            role="status"
            aria-live="polite"
            className="text-[12px] text-content-muted"
          >
            Starting orchestrator…
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-200"
        >
          {error}
        </p>
      )}

      {runId && <FinancialOperatorTimeline runId={runId} />}

      {!runId && (
        <section
          aria-label="Empty state"
          className="rounded border border-dashed border-edge bg-surface/30 px-4 py-6 text-center"
        >
          <p className="text-[13px] text-content-muted">
            Click <span className="text-[#d97757]">Run AT&amp;T 10-K demo</span>{" "}
            to start a live run. Each step appears as a typed card.
          </p>
        </section>
      )}
    </main>
  );
}

export default FinancialOperatorDemo;
