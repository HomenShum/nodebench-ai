import { useState } from "react";
import { useAction } from "convex/react";
import { Calculator, FileSpreadsheet, ScrollText, TrendingUp, Play, MessageSquare } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FinancialOperatorTimeline } from "../components/FinancialOperatorTimeline";
import { setActiveFinancialRun } from "../components/FinancialOperatorOverlay";

/**
 * Standalone demo surface for the financial operator console.
 *
 * Four canonical examples surface here:
 *   A — AT&T 10-K → ETR + after-tax cost of debt
 *   B — CRM cleanup (spreadsheet + PDF dedup + enrichment + CSV export)
 *   C — Covenant compliance (credit-agreement leverage gate)
 *   D — Variance analysis (actuals vs budget + CFO memo)
 *
 * Each example boots the same `FinancialOperatorTimeline` component, which
 * subscribes to the run's append-only step stream and renders typed cards
 * (run brief → tool calls → extraction → validation → sandbox compute →
 * evidence → artifact → approval → result).
 *
 * Long-term, the same timeline mounts inline inside the chat panel once
 * the agent's task classifier detects a financial workflow.
 */

type DemoId = "att" | "crm" | "covenant" | "variance";

interface DemoOption {
  id: DemoId;
  label: string;
  blurb: string;
  icon: typeof Calculator;
  category: string;
}

const DEMOS: DemoOption[] = [
  {
    id: "att",
    label: "AT&T 10-K — ETR & cost of debt",
    blurb:
      "Locate filing sections, extract structured values, run sandbox math, gather sources, draft a notebook + PR.",
    icon: Calculator,
    category: "Financial metric extraction",
  },
  {
    id: "crm",
    label: "CRM cleanup",
    blurb:
      "Profile a 387-row prospect list, dedupe by name + domain, enrich with sector/HQ/last round, export CRM-ready CSV.",
    icon: FileSpreadsheet,
    category: "Data cleanup",
  },
  {
    id: "covenant",
    label: "Covenant compliance",
    blurb:
      "Locate the leverage covenant, extract terms + financials, run a sandbox compliance gate, draft a reviewer memo.",
    icon: ScrollText,
    category: "Credit-agreement review",
  },
  {
    id: "variance",
    label: "Variance analysis",
    blurb:
      "Align chart of accounts, compute per-line variance in sandbox, surface drivers, draft a CFO summary.",
    icon: TrendingUp,
    category: "Monthly close",
  },
];

export function FinancialOperatorDemo() {
  const runAtt = useAction(
    api.domains.financialOperator.orchestrator.runAttCostOfDebtDemo,
  );
  const runCrm = useAction(
    api.domains.financialOperator.orchestratorExamples.runCrmCleanupDemo,
  );
  const runCovenant = useAction(
    api.domains.financialOperator.orchestratorExamples.runCovenantComplianceDemo,
  );
  const runVariance = useAction(
    api.domains.financialOperator.orchestratorExamples.runVarianceAnalysisDemo,
  );

  const [activeRunId, setActiveRunId] = useState<Id<"financialOperatorRuns"> | null>(
    null,
  );
  const [activeDemoId, setActiveDemoId] = useState<DemoId | null>(null);
  const [pendingDemoId, setPendingDemoId] = useState<DemoId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart(demo: DemoOption) {
    setPendingDemoId(demo.id);
    setError(null);
    try {
      let result: { runId: Id<"financialOperatorRuns"> };
      switch (demo.id) {
        case "att":
          result = await runAtt({});
          break;
        case "crm":
          result = await runCrm({});
          break;
        case "covenant":
          result = await runCovenant({});
          break;
        case "variance":
          result = await runVariance({});
          break;
      }
      setActiveRunId(result.runId);
      setActiveDemoId(demo.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start run");
    } finally {
      setPendingDemoId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <header className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.2em] text-content-muted">
          Financial operator console — demo
        </p>
        <h1 className="text-xl font-semibold text-content">
          Watch the agent show its work
        </h1>
        <p className="text-[13px] text-content-secondary">
          Four canonical financial workflows. Each one streams typed cards
          (plan → tool calls → extraction → validation → sandbox calculation →
          evidence → artifact → approval) so users see observable work, not
          hidden reasoning. Math runs in JavaScript, never in the language
          model.
        </p>
      </header>

      <section
        aria-label="Pick a workflow"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {DEMOS.map((demo) => {
          const Icon = demo.icon;
          const isActive = activeDemoId === demo.id;
          const isPending = pendingDemoId === demo.id;
          return (
            <button
              key={demo.id}
              type="button"
              onClick={() => handleStart(demo)}
              disabled={pendingDemoId !== null}
              aria-pressed={isActive}
              className={`group rounded-xl border bg-surface/40 p-4 text-left transition-colors hover:border-[#d97757]/40 hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/50 disabled:cursor-not-allowed disabled:opacity-60 ${
                isActive ? "border-[#d97757]/50 bg-[#d97757]/5" : "border-edge"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${
                    isActive
                      ? "border-[#d97757]/40 bg-[#d97757]/15 text-[#f5d0b8]"
                      : "border-edge bg-surface/60 text-content-muted group-hover:text-content"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-content">
                      {demo.label}
                    </span>
                    {isPending && (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-content-muted">
                        starting…
                      </span>
                    )}
                    {isActive && !isPending && (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-[#d97757]">
                        running
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12px] text-content-secondary">
                    {demo.blurb}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-content-muted">
                    {demo.category}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {error && (
        <p
          role="alert"
          className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-[13px] text-red-200"
        >
          {error}
        </p>
      )}

      {activeRunId && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-content-muted">
              <Play className="h-3 w-3" aria-hidden="true" />
              Live run
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveFinancialRun(activeRunId);
                if (typeof window !== "undefined") {
                  window.location.assign(`/?surface=ask&finRun=${activeRunId}`);
                }
              }}
              className="ml-auto inline-flex items-center gap-1.5 rounded border border-edge bg-surface/50 px-2.5 py-1 text-[12px] text-content hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]/50"
              aria-label="View this run in the chat surface"
            >
              <MessageSquare className="h-3 w-3" aria-hidden="true" />
              View in chat
            </button>
          </div>
          <FinancialOperatorTimeline runId={activeRunId} />
        </div>
      )}

      {!activeRunId && (
        <section
          aria-label="Empty state"
          className="rounded border border-dashed border-edge bg-surface/30 px-4 py-6 text-center"
        >
          <p className="text-[13px] text-content-muted">
            Pick a workflow above to start a live run. Each step appears as a
            typed card.
          </p>
        </section>
      )}
    </main>
  );
}

export default FinancialOperatorDemo;
