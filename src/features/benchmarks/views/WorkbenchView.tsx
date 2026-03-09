/**
 * WorkbenchView — /benchmarks route
 *
 * NodeBench Workbench: realistic cross-model benchmark on frozen app substrates.
 * Compares GPT/Claude/Gemini/Open-source on 4 benchmark scenarios that
 * mirror real engineering work: UI transformation, agent integration, long-run
 * reliability, and architect mode.
 *
 * Layout zones:
 *   1. Header — title, subtitle, CTA buttons (Configure App / Run)
 *   2. Model Leaderboard — horizontal score strip
 *   3. Scenario Catalog — 4 scenario rows (Linear issue-list style)
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

import React, { useEffect, useState, lazy, Suspense } from "react";
import { useQuery } from "convex/react";
import { ChevronDown, ChevronUp, Settings, Play, CheckCircle2, AlertTriangle, Activity } from "lucide-react";
import { ModelLeaderboard } from "../components/ModelLeaderboard";
import { ScenarioCatalog } from "../components/ScenarioCatalog";
import { WorkbenchRunsTable } from "../components/WorkbenchRunsTable";
import { SignatureOrb } from "@/shared/ui/SignatureOrb";
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
      <div className="nb-page-frame px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left: icon + title + subtitle */}
        <div className="flex items-start gap-3">
          <div className="flex-none mt-0.5 rounded-lg bg-surface-secondary border border-edge p-1">
            <SignatureOrb variant="signature" size="xs" />
          </div>
          <div>
            <h1 className="type-page-title text-content leading-tight">
              Workbench
            </h1>
            <p className="type-caption mt-0.5 max-w-md">
              Benchmark models on frozen baseline apps and realistic scenarios.
              Compare UI craft, tool use, reliability, and engineering rigor across providers.
            </p>
          </div>
        </div>

        {/* Right: CTA buttons (both disabled — Phase 2) */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            disabled
            title="Configure a workbench app — coming in Phase 2"
            className="btn-outline-sm inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 opacity-60 cursor-not-allowed whitespace-nowrap disabled:pointer-events-auto disabled:hover:opacity-90"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="sm:hidden">Configure</span>
            <span className="hidden sm:inline">Configure App</span>
          </button>
          <button
            disabled
            title="Run a benchmark — coming in Phase 2"
            className="btn-primary-sm inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 opacity-55 cursor-not-allowed whitespace-nowrap disabled:pointer-events-auto disabled:hover:opacity-75"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="sm:hidden">Run</span>
            <span className="hidden sm:inline">Run Benchmark</span>
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
          nb-surface-card w-full flex items-center justify-between px-4 py-3
          hover:bg-surface transition-colors text-left
        "
        aria-expanded={open}
      >
        <div>
          <span className="type-label">
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
        <div className="nb-surface-card mt-4 overflow-hidden">
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

interface LiveGuardArtifact {
  generatedAt: string;
  checks: {
    fastSearch: {
      averageMs: number;
      p95Ms: number;
      passesBudget: boolean;
      resultCount: number;
      citationCount: number;
    };
    enterpriseInvestigation: {
      averageMs: number;
      p95Ms: number;
      passesBudget: boolean;
      causalChainLength: number;
      snapshotHashCount: number;
      replayUrl?: string | null;
    };
  };
  failures: string[];
}

function formatLatency(ms?: number) {
  if (typeof ms !== "number" || !Number.isFinite(ms)) {
    return "n/a";
  }
  return `${Math.round(ms)}ms`;
}

function LiveGuardPanel() {
  const [artifact, setArtifact] = useState<LiveGuardArtifact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArtifact() {
      try {
        const response = await fetch("/benchmarks/api-headless-live-guard-latest.json", {
          headers: { Accept: "application/json" },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json = (await response.json()) as LiveGuardArtifact;
        if (!cancelled) {
          setArtifact(json);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load live guard artifact");
        }
      }
    }

    void loadArtifact();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!artifact && !error) {
    return (
      <section className="nb-surface-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-content">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="type-label">Live API Guard</span>
        </div>
        <p className="text-xs text-content-muted mt-2">Loading the latest production benchmark artifact…</p>
      </section>
    );
  }

  if (error || !artifact) {
    return (
      <section className="nb-surface-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-content">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="type-label">Live API Guard</span>
        </div>
        <p className="text-xs text-content-muted mt-2">
          Latest production benchmark artifact is unavailable.
          {error ? ` ${error}` : ""}
        </p>
      </section>
    );
  }

  const overallPass = artifact.failures.length === 0;

  return (
    <section className="nb-surface-card p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-content">
            {overallPass ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span className="type-label">Live API Guard</span>
          </div>
          <p className="text-xs text-content-muted mt-1">
            Real deployment benchmark for public search and enterprise investigation.
          </p>
        </div>
        <div className="text-xs text-content-muted">
          {new Date(artifact.generatedAt).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="rounded-xl border border-edge bg-surface-secondary p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-content">Fast Search</span>
            <span className={artifact.checks.fastSearch.passesBudget ? "text-green-600 text-xs" : "text-amber-600 text-xs"}>
              {artifact.checks.fastSearch.passesBudget ? "Within budget" : "Over budget"}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-xs text-content-muted">
            <div>P95 latency: {formatLatency(artifact.checks.fastSearch.p95Ms)}</div>
            <div>Average latency: {formatLatency(artifact.checks.fastSearch.averageMs)}</div>
            <div>Results: {artifact.checks.fastSearch.resultCount}</div>
            <div>Citations: {artifact.checks.fastSearch.citationCount}</div>
          </div>
        </div>

        <div className="rounded-xl border border-edge bg-surface-secondary p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-content">Enterprise Investigation</span>
            <span
              className={
                artifact.checks.enterpriseInvestigation.passesBudget
                  ? "text-green-600 text-xs"
                  : "text-amber-600 text-xs"
              }
            >
              {artifact.checks.enterpriseInvestigation.passesBudget ? "Within budget" : "Over budget"}
            </span>
          </div>
          <div className="mt-2 space-y-1 text-xs text-content-muted">
            <div>P95 latency: {formatLatency(artifact.checks.enterpriseInvestigation.p95Ms)}</div>
            <div>Average latency: {formatLatency(artifact.checks.enterpriseInvestigation.averageMs)}</div>
            <div>Causal chain events: {artifact.checks.enterpriseInvestigation.causalChainLength}</div>
            <div>Source hashes: {artifact.checks.enterpriseInvestigation.snapshotHashCount}</div>
          </div>
        </div>
      </div>

      {artifact.failures.length > 0 ? (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-content">
          <div className="font-medium mb-1">Current failures</div>
          <ul className="space-y-1 text-content-muted">
            {artifact.failures.map((failure) => (
              <li key={failure}>- {failure}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-xs text-content">
          Production live guard is passing. The public API lanes are within budget and the enterprise payload still carries evidence and replay metadata.
        </div>
      )}
    </section>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function WorkbenchView() {
  return (
    <div className="nb-page-shell flex flex-col">
      <WorkbenchHeader />

      <div className="nb-page-inner pb-28 sm:pb-24">
        <div className="nb-page-frame space-y-8">
          <LiveGuardPanel />

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

      {/* 2. Scenario catalog — 4 scenarios */}
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
