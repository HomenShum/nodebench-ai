/**
 * WorkbenchView — /benchmarks route
 *
 * NodeBench Workbench: realistic cross-model benchmark on frozen app substrates.
 * Compares GPT/Claude/Gemini/Open-source on 4 task ladders (scenarios) that
 * mirror real engineering work: UI transformation, agent integration, long-run
 * reliability, and architect mode.
 *
 * Layout zones:
 *   1. Header — title, subtitle, CTA buttons (Configure App / Run)
 *   2. Model Leaderboard — horizontal score strip
 *   3. Scenario Catalog — 4 task ladder rows (Linear issue-list style)
 *   4. Runs Table — recent runs with score, grade, duration, status
 *   5. Capability Deep Dive — existing ModelEvalDashboard charts (expandable)
 *
 * NOTE for Codex: When Phase 2 execution engine lands:
 *   a. Wire leaderboard to useQuery(api.domains.evaluation.workbenchQueries.getWorkbenchLeaderboard)
 *   b. Wire scenario stats to useQuery(api.domains.evaluation.workbenchQueries.getScenarioStats)
 *   c. Wire runs table to useQuery(api.domains.evaluation.workbenchQueries.listWorkbenchRuns, { limit: 25 })
 *   d. Enable "Configure App" drawer (workbench app catalog)
 *   e. Enable "Run" button (trigger workbench run action)
 */

import React, { useState, lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import { FlaskConical, ChevronDown, ChevronUp, Settings, Play } from "lucide-react";
import { ModelLeaderboard } from "../components/ModelLeaderboard";
import { ScenarioCatalog } from "../components/ScenarioCatalog";
import { WorkbenchRunsTable } from "../components/WorkbenchRunsTable";
import { api } from "../../../../convex/_generated/api";

// Workbench live data is opt-in until the backing Convex functions are deployed
// in the current environment. This avoids noisy runtime errors in QA/dev sessions
// where the UI lands before backend rollout.
const WORKBENCH_LIVE_DATA_ENABLED = import.meta.env.VITE_ENABLE_WORKBENCH_LIVE_DATA === "1";

// Lazy-load the existing eval charts (heavy recharts bundle — split it out)
const ModelEvalDashboard = lazy(() =>
  import("@/features/research/components/ModelEvalDashboard").then((mod) => ({
    default: mod.ModelEvalDashboard,
  }))
);

// ─── Header ───────────────────────────────────────────────────────────────────

function WorkbenchHeader() {
  return (
    <div className="sticky top-0 z-10 bg-surface border-b border-edge">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-start justify-between gap-4">
        {/* Left: icon + title + subtitle */}
        <div className="flex items-start gap-3">
          <div className="flex-none w-9 h-9 rounded-lg bg-surface-secondary border border-edge flex items-center justify-center mt-0.5">
            <FlaskConical className="w-4 h-4 text-content-secondary" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-content leading-tight">
              Workbench
            </h1>
            <p className="text-xs text-content-muted mt-0.5 max-w-md">
              Benchmark models on frozen baseline apps and realistic task ladders.
              Compare UI craft, tool use, reliability, and engineering rigor across providers.
            </p>
          </div>
        </div>

        {/* Right: CTA buttons (both disabled — Phase 2) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled
            title="Configure a workbench app — coming in Phase 2"
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              border border-edge bg-surface text-content-muted
              opacity-50 cursor-not-allowed
            "
          >
            <Settings className="w-3.5 h-3.5" />
            Configure App
          </button>
          <button
            disabled
            title="Run a benchmark — coming in Phase 2"
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
              bg-content text-surface
              opacity-30 cursor-not-allowed
            "
          >
            <Play className="w-3.5 h-3.5" />
            Run Benchmark
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Capability Deep Dive (collapsible) ───────────────────────────────────────

function CapabilityDeepDive() {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="
          w-full flex items-center justify-between px-4 py-3 rounded-lg
          border border-edge bg-surface-secondary hover:bg-surface
          transition-colors text-left
        "
        aria-expanded={open}
      >
        <div>
          <span className="text-xs font-semibold text-content-secondary uppercase tracking-wide">
            Capability Deep Dive
          </span>
          <p className="text-xs text-content-muted mt-0.5">
            Evaluation results — pass rates, latency, and cost across scenarios
          </p>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-content-muted shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-content-muted shrink-0" />
        )}
      </button>

      {open && (
        <div className="mt-4 rounded-lg border border-edge bg-surface overflow-hidden">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16 text-xs text-content-muted">
                Loading charts…
              </div>
            }
          >
            <ModelEvalDashboard />
          </Suspense>
        </div>
      )}
    </section>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function WorkbenchView() {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-surface">
      <WorkbenchHeader />

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 space-y-8 pb-24">
        {/* NOTE(coworker): Keep Workbench resilient if the Convex backend isn't updated yet.
            If `useQuery` throws (missing function/schema), fall back to static empty states
            instead of a hard error page. */}
        <WorkbenchDataBoundary>
          <WorkbenchData />
        </WorkbenchDataBoundary>

        {/* 4. Existing eval charts — collapsible deep dive */}
        <CapabilityDeepDive />
      </div>
    </div>
  );
}

function WorkbenchData() {
  // NOTE(coworker): Phase 1 UI is read-only. Phase 2 will add actions to start runs.
  // Keep these subscriptions skipped by default so missing backend deployments do not
  // throw runtime errors in the frontend.
  const leaderboard = useQuery(
    api.domains.evaluation.workbenchQueries.getWorkbenchLeaderboard,
    WORKBENCH_LIVE_DATA_ENABLED ? {} : "skip",
  );
  const scenarioStats = useQuery(
    api.domains.evaluation.workbenchQueries.getScenarioStats,
    WORKBENCH_LIVE_DATA_ENABLED ? {} : "skip",
  );
  const runs = useQuery(
    api.domains.evaluation.workbenchQueries.listWorkbenchRuns,
    WORKBENCH_LIVE_DATA_ENABLED ? { limit: 25 } : "skip",
  );

  return (
    <>
      {/* 1. Model leaderboard — score strip */}
      <ModelLeaderboard liveScores={WORKBENCH_LIVE_DATA_ENABLED ? (leaderboard ?? undefined) : undefined} />

      {/* 2. Scenario catalog — 4 task ladders */}
      <ScenarioCatalog scenarioStats={WORKBENCH_LIVE_DATA_ENABLED ? (scenarioStats ?? undefined) : undefined} />

      {/* 3. Runs table — empty state in Phase 1 */}
      <WorkbenchRunsTable runs={WORKBENCH_LIVE_DATA_ENABLED ? runs : []} />
    </>
  );
}

class WorkbenchDataBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err: unknown) {
    // Most common cause: Convex functions not deployed yet for this build.
    // eslint-disable-next-line no-console
    console.warn("[Workbench] Data unavailable; rendering static Workbench UI.", err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <>
          <ModelLeaderboard />
          <ScenarioCatalog />
          <WorkbenchRunsTable runs={[]} />
        </>
      );
    }
    return this.props.children;
  }
}
