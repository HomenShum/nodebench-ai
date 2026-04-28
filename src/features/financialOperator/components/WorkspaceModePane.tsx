/**
 * WorkspaceModePane — operator-console takeover of the chat reading area.
 *
 * Mounts when `?ws=1` is in the URL and we're on a chat surface. Renders
 * full-width inside the chat-content rectangle (between top nav, bottom
 * nav, and any agent panel) without reaching into FastAgentPanel
 * internals.
 *
 * Composition (top → bottom):
 *   1. Header: workspace label + ModelCapabilityBadge + exit button
 *   2. If no active run: 4-workflow demo picker
 *   3. If active run: FinancialOperatorTimeline (live-streaming cards)
 *   4. Quick switch back to picker if a run is in progress
 *
 * Key invariants:
 *   - Chat composer below stays live — user can ask follow-ups while
 *     the workspace pane runs in the background
 *   - URL params (?ws=1, ?finRun=<id>) drive everything; deep-links
 *     work
 *   - Reuses ALL existing components (StepCard, ModelCapabilityBadge,
 *     FinancialOperatorTimeline, demo orchestrators)
 *   - No new design tokens — every utility class is from the kit
 */

import { useState, useEffect, useCallback } from "react";
import { useAction } from "convex/react";
import {
  Calculator,
  FileSpreadsheet,
  ScrollText,
  TrendingUp,
  X,
  ArrowLeft,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FinancialOperatorTimeline } from "./FinancialOperatorTimeline";
import { ModelCapabilityBadge } from "./ModelCapabilityBadge";
import { setActiveFinancialRun } from "./FinancialOperatorOverlay";
import {
  isWorkspaceModeActive,
  setWorkspaceMode,
} from "./WorkspaceModeToggle";

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
    blurb: "Locate filing sections, extract structured values, run sandbox math, gather sources, draft a notebook + PR.",
    icon: Calculator,
    category: "Financial metric extraction",
  },
  {
    id: "crm",
    label: "CRM cleanup",
    blurb: "Profile a 387-row prospect list, dedupe, enrich, export CRM-ready CSV.",
    icon: FileSpreadsheet,
    category: "Data cleanup",
  },
  {
    id: "covenant",
    label: "Covenant compliance",
    blurb: "Locate the leverage covenant, extract terms + financials, sandbox compliance gate, draft memo.",
    icon: ScrollText,
    category: "Credit-agreement review",
  },
  {
    id: "variance",
    label: "Variance analysis",
    blurb: "Align CoA, compute per-line variance in sandbox, surface drivers, draft CFO summary.",
    icon: TrendingUp,
    category: "Monthly close",
  },
];

const ACTIVE_MODEL = "claude-opus-4-7";
const FIN_RUN_PARAM = "finRun";

function readActiveRunId(): Id<"financialOperatorRuns"> | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get(FIN_RUN_PARAM);
  return v && v.length > 0 ? (v as Id<"financialOperatorRuns">) : null;
}

export function WorkspaceModePane() {
  const [active, setActive] = useState<boolean>(() => isWorkspaceModeActive());
  const [activeRunId, setActiveRunId] = useState<Id<"financialOperatorRuns"> | null>(
    () => readActiveRunId(),
  );
  const [pendingDemoId, setPendingDemoId] = useState<DemoId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync with URL on mount + popstate
  useEffect(() => {
    const onPop = () => {
      setActive(isWorkspaceModeActive());
      setActiveRunId(readActiveRunId());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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

  const handleStart = useCallback(
    async (id: DemoId) => {
      setPendingDemoId(id);
      setError(null);
      try {
        let result: { runId: Id<"financialOperatorRuns"> };
        switch (id) {
          case "att":      result = await runAtt({}); break;
          case "crm":      result = await runCrm({}); break;
          case "covenant": result = await runCovenant({}); break;
          case "variance": result = await runVariance({}); break;
        }
        setActiveFinancialRun(result.runId);
        setActiveRunId(result.runId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start run");
      } finally {
        setPendingDemoId(null);
      }
    },
    [runAtt, runCrm, runCovenant, runVariance],
  );

  const handleClearRun = useCallback(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.delete(FIN_RUN_PARAM);
    window.history.replaceState({}, "", url.toString());
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  if (!active) return null;

  return (
    <section
      role="region"
      aria-label="Workspace mode — operator console"
      // Fixed-positioned full-content takeover. Sits above the chat
      // reading area but below modals/toasts. Padded so it never
      // crashes into the bottom nav (mobile) or the agent panel
      // (desktop).
      className={[
        "fixed inset-0 z-[55] overflow-y-auto",
        "bg-[var(--bg-app)]/95 backdrop-blur-md",
        // Desktop: leave room for the typical 320-360px right panel
        // and 56px top chrome
        "pt-14 xl:pt-12",
        // Mobile: leave room for the 56px bottom nav + safe area
        "pb-[calc(72px+env(safe-area-inset-bottom,0px))] xl:pb-12",
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-3xl space-y-5 p-4 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="type-label !tracking-[0.18em]">Workspace mode</p>
            <h2 className="type-section-title text-[var(--text-primary)]">
              {activeRunId ? "Live operator-console run" : "Pick a workflow"}
            </h2>
            <ModelCapabilityBadge model={ACTIVE_MODEL} />
          </div>
          <button
            type="button"
            onClick={() => setWorkspaceMode(false)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
            aria-label="Close workspace mode"
          >
            <X size={14} strokeWidth={1.8} aria-hidden="true" />
            Close
          </button>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-[10px] border border-[rgba(220,38,38,0.20)] bg-[rgba(220,38,38,0.06)] px-3 py-2 text-[13px] text-[var(--destructive,#DC2626)]"
          >
            {error}
          </p>
        )}

        {/* No active run → demo picker */}
        {!activeRunId && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DEMOS.map((demo) => {
              const Icon = demo.icon;
              const isPending = pendingDemoId === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleStart(demo.id)}
                  disabled={pendingDemoId !== null}
                  className="nb-panel group text-left transition-colors hover:!border-[color:color-mix(in_oklab,var(--accent-primary)_30%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] group-hover:text-[var(--accent-primary)]"
                    >
                      <Icon size={20} strokeWidth={1.8} />
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="type-card-title text-[var(--text-primary)]">
                          {demo.label}
                        </span>
                        {isPending && (
                          <span className="type-label !tracking-[0.18em] text-[var(--accent-primary)]">
                            starting…
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
                        {demo.blurb}
                      </p>
                      <p className="type-label mt-2 !tracking-[0.18em]">
                        {demo.category}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Active run → live timeline + back-to-picker affordance */}
        {activeRunId && (
          <>
            <button
              type="button"
              onClick={handleClearRun}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-[12px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              aria-label="Back to workflow picker"
            >
              <ArrowLeft size={14} strokeWidth={1.8} aria-hidden="true" />
              Back to picker
            </button>
            <FinancialOperatorTimeline runId={activeRunId} />
          </>
        )}

        <p className="border-t border-[var(--border-color)] pt-3 text-[12px] text-[var(--text-muted)]">
          Composer below stays live — ask follow-ups while the workspace runs.
          Math is sandboxed, sources are cited per field, and approvals lock
          the artifact.
        </p>
      </div>
    </section>
  );
}
