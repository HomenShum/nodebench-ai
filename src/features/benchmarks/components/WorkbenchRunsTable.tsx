/**
 * WorkbenchRunsTable — Recent benchmark runs (Vercel deployments pattern)
 *
 * Columns: Model · Scenario · Score · Grade · Duration · Status · When
 * Status dots: pulsing blue = running, green = passed, red = failed
 * Empty state: FlaskConical icon + helpful copy for Phase 1 (no runs yet)
 *
 * NOTE for Codex: Wire `runs` prop to:
 *   useQuery(api.domains.evaluation.workbenchQueries.listWorkbenchRuns, { limit: 25 })
 *   when Phase 2 execution engine is ready. Replace the static empty state
 *   with a loading skeleton while the query is in flight.
 */

import { FlaskConical, CheckCircle2, XCircle, Clock } from "lucide-react";
import { WORKBENCH_SCENARIOS } from "./ScenarioCatalog";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkbenchRunRow {
  _id: string;
  model: string;
  provider: string;
  scenarioId: string;
  status: "running" | "completed" | "failed";
  compositeScore?: number;
  grade?: string;
  runDurationMs?: number;
  startedAt: number;
  completedAt?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatModel(slug: string): string {
  const MAP: Record<string, string> = {
    "claude-sonnet-4-6":       "Claude 4.6 Sonnet",
    "claude-opus-4-6":         "Claude 4.6 Opus",
    "claude-haiku-4.5":        "Haiku 4.5",
    "gemini-3-flash-preview":  "Gemini 3 Flash",
    "gemini-3-flash":          "Gemini 3 Flash",
    "gemini-3.1-pro-preview":  "Gemini 3.1 Pro",
    "gpt-4o":                  "GPT-4o",
    "gpt-5-mini":              "GPT-5 Mini",
    "deepseek-v3.2":           "DeepSeek V3.2",
    "qwen3-235b":              "Qwen 3 235B",
    "minimax-m2.1":            "MiniMax M2.1",
    "deepseek-r1":             "DeepSeek R1",
  };
  return MAP[slug] ?? slug;
}

function formatScenario(id: string): string {
  return WORKBENCH_SCENARIOS.find((s) => s.id === id)?.name ?? id;
}

function formatDuration(ms?: number): string {
  if (!ms) return "—";
  const min = Math.round(ms / 60_000);
  if (min < 1) return "<1m";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function scoreColor(score?: number): string {
  if (score === undefined) return "text-content-muted";
  if (score >= 80) return "text-emerald-500 dark:text-emerald-400";
  if (score >= 60) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: WorkbenchRunRow["status"] }) {
  if (status === "running") {
    return (
      <span className="flex items-center gap-1.5 text-blue-500 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        Running
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1.5 text-emerald-500 text-xs">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Done
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-red-500 text-xs">
      <XCircle className="w-3.5 h-3.5" />
      Failed
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-xl bg-surface-secondary border border-edge flex items-center justify-center mb-4">
        <FlaskConical className="w-6 h-6 text-content-muted" />
      </div>
      <p className="text-sm font-medium text-content-secondary mb-1">No benchmark runs yet</p>
      <p className="text-xs text-content-muted max-w-sm leading-relaxed">
        Runs will appear here once you configure a workbench app and trigger a benchmark.
        Phase 2 will add the execution engine — connect a frozen repo, pick a scenario, and compare models.
      </p>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────

function RunRow({ run }: { run: WorkbenchRunRow }) {
  const ts = run.completedAt ?? run.startedAt;

  return (
    <tr className="border-t border-edge hover:bg-surface-secondary/50 transition-colors group">
      {/* Model */}
      <td className="px-4 py-3">
        <span className="text-sm font-medium text-content">{formatModel(run.model)}</span>
      </td>
      {/* Scenario */}
      <td className="px-4 py-3">
        <span className="text-sm text-content-secondary">{formatScenario(run.scenarioId)}</span>
      </td>
      {/* Score */}
      <td className="px-4 py-3 tabular-nums">
        {run.compositeScore !== undefined ? (
          <span className={`text-sm font-semibold ${scoreColor(run.compositeScore)}`}>
            {run.compositeScore}
          </span>
        ) : (
          <span className="text-sm text-content-muted">—</span>
        )}
      </td>
      {/* Grade */}
      <td className="px-4 py-3">
        {run.grade ? (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-surface ${scoreColor(run.compositeScore)}`}>
            {run.grade}
          </span>
        ) : (
          <span className="text-sm text-content-muted">—</span>
        )}
      </td>
      {/* Duration */}
      <td className="px-4 py-3 tabular-nums">
        <span className="text-xs text-content-muted flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDuration(run.runDurationMs)}
        </span>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <StatusIndicator status={run.status} />
      </td>
      {/* When */}
      <td className="px-4 py-3">
        <span className="text-xs text-content-muted">{timeAgo(ts)}</span>
      </td>
    </tr>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkbenchRunsTable({
  // NOTE for Codex: replace runs with:
  //   useQuery(api.domains.evaluation.workbenchQueries.listWorkbenchRuns, { limit: 25 }) ?? []
  runs,
}: {
  runs?: WorkbenchRunRow[];
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wide">
          Runs
        </h2>
        {(runs?.length ?? 0) > 0 && (
          <span className="text-xs text-content-muted">Last 30 days</span>
        )}
      </div>

      <div className="rounded-lg border border-edge bg-surface overflow-hidden">
        {runs === undefined ? (
          <LoadingState />
        ) : runs.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-secondary">
                {["Model", "Scenario", "Score", "Grade", "Duration", "Status", "When"].map((col) => (
                  <th
                    key={col}
                    className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-content-muted first:rounded-tl-lg last:rounded-tr-lg"
                  >
                    {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <RunRow key={run._id} run={run} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  </section>
);
}

function LoadingState() {
  return (
    <div className="p-4 animate-pulse">
      <div className="h-8 rounded-md bg-surface-secondary mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 rounded-md bg-surface-secondary" />
        ))}
      </div>
    </div>
  );
}
