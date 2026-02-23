/**
 * ModelLeaderboard — Horizontal scrollable strip of model score cards
 *
 * Renders all tracked models as fixed-width cards showing their best
 * composite score from workbenchRuns. Falls back to pass-rate data
 * from LATEST_EVAL_DATA (tool-call eval harness) if no workbench runs exist.
 *
 * NOTE for Codex: When Phase 2 execution engine lands, wire the
 *   `liveScores` prop to a useQuery(api.domains.evaluation.workbenchQueries.getWorkbenchLeaderboard)
 *   result and remove the LATEST_EVAL_DATA fallback.
 */

import { useMemo } from "react";
import { LATEST_EVAL_DATA } from "@/features/research/components/ModelEvalDashboard";
import type { ModelEvalResult } from "@/features/research/components/ModelEvalDashboard";
import { WORKBENCH_SCENARIOS } from "./ScenarioCatalog";

// ─── Static model registry (expand as models are tested) ─────────────────────

export const BENCHMARK_MODELS: Array<{
  id: string;
  displayName: string;
  provider: "anthropic" | "openai" | "google" | "open-source";
  providerLabel: string;
  evalSlug?: string; // maps to LATEST_EVAL_DATA.model
}> = [
  { id: "claude-sonnet-4-6",       displayName: "Claude 4.6",     provider: "anthropic",    providerLabel: "Anthropic",  evalSlug: undefined },
  { id: "claude-haiku-4.5",        displayName: "Haiku 4.5",      provider: "anthropic",    providerLabel: "Anthropic",  evalSlug: "claude-haiku-4.5" },
  { id: "gemini-3-flash-preview",  displayName: "Gemini 3 Flash", provider: "google",        providerLabel: "Google",     evalSlug: "gemini-3-flash" },
  { id: "gpt-5-mini",              displayName: "GPT-5 Mini",     provider: "openai",        providerLabel: "OpenAI",     evalSlug: "gpt-5-mini" },
  { id: "deepseek-v3.2",           displayName: "DeepSeek V3",    provider: "open-source",   providerLabel: "DeepSeek",   evalSlug: "deepseek-v3.2" },
  { id: "qwen3-235b",              displayName: "Qwen 3 235B",    provider: "open-source",   providerLabel: "Alibaba",    evalSlug: "qwen3-235b" },
  { id: "minimax-m2.1",            displayName: "MiniMax M2",     provider: "open-source",   providerLabel: "MiniMax",    evalSlug: "minimax-m2.1" },
];

// ─── Provider accent colors (muted, dark-mode safe) ──────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  anthropic:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  openai:       "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  google:       "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "open-source":"bg-purple-500/10 text-purple-600 dark:text-purple-400",
};

// ─── Score styling ────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score === null) return "text-content-muted";
  if (score >= 80) return "text-emerald-500 dark:text-emerald-400";
  if (score >= 60) return "text-amber-500 dark:text-amber-400";
  return "text-red-500 dark:text-red-400";
}

function scoreBarWidth(score: number | null): string {
  if (score === null) return "0%";
  return `${Math.max(2, score)}%`;
}

function scoreBarColor(score: number | null): string {
  if (score === null) return "bg-surface-secondary";
  if (score >= 80) return "bg-emerald-500/70";
  if (score >= 60) return "bg-amber-500/70";
  return "bg-red-500/70";
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  modelId: string;
  displayName: string;
  provider: "anthropic" | "openai" | "google" | "open-source";
  providerLabel: string;
  score: number | null;      // null = not yet run
  grade: string | null;
  sourceLabel: string;       // "Tool-call eval" | "Workbench run" | "Not yet run"
  lastRunAt: number | null;
  lastScenarioId: string | null;
  runCount: number | null;
}

export function ModelLeaderboard({
  // NOTE for Codex: replace liveScores with useQuery result from workbenchQueries.getWorkbenchLeaderboard
  liveScores,
}: {
  liveScores?: Array<{
    model: string;
    provider?: string;
    bestScore: number;
    bestGrade: string;
    lastScenarioId?: string;
    lastRunAt?: number;
    runCount?: number;
  }>;
}) {
  // Build display entries: prefer live workbench scores, fall back to tool-call eval data
  const evalBySlug = useMemo(() => {
    const m = new Map<string, ModelEvalResult>();
    for (const e of LATEST_EVAL_DATA) m.set(e.model, e);
    return m;
  }, []);

  const liveByModel = useMemo(() => {
    const m = new Map<
      string,
      { bestScore: number; bestGrade: string; lastScenarioId?: string; lastRunAt?: number; runCount?: number }
    >();
    for (const e of (liveScores ?? [])) m.set(e.model, e);
    return m;
  }, [liveScores]);

  const entries: LeaderboardEntry[] = useMemo(() =>
    BENCHMARK_MODELS.map((bm) => {
      const live = liveByModel.get(bm.id);
      if (live) {
        return {
          modelId: bm.id,
          displayName: bm.displayName,
          provider: bm.provider,
          providerLabel: bm.providerLabel,
          score: live.bestScore,
          grade: live.bestGrade,
          sourceLabel: "Workbench run",
          lastRunAt: live.lastRunAt ?? null,
          lastScenarioId: live.lastScenarioId ?? null,
          runCount: live.runCount ?? null,
        };
      }
      // Fall back to tool-call eval pass rate (scale 0-100)
      if (bm.evalSlug) {
        const evalEntry = evalBySlug.get(bm.evalSlug);
        if (evalEntry) {
          const s = evalEntry.passRate;
          return {
            modelId: bm.id,
            displayName: bm.displayName,
            provider: bm.provider,
            providerLabel: bm.providerLabel,
            score: s,
            grade: scoreToGrade(s),
            sourceLabel: "Tool-call eval",
            lastRunAt: null,
            lastScenarioId: null,
            runCount: null,
          };
        }
      }
      return {
        modelId: bm.id,
        displayName: bm.displayName,
        provider: bm.provider,
        providerLabel: bm.providerLabel,
        score: null,
        grade: null,
        sourceLabel: "Not yet run",
        lastRunAt: null,
        lastScenarioId: null,
        runCount: null,
      };
    }), [evalBySlug, liveByModel]);

  return (
    <section>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wide">
          Leaderboard
        </h2>
        <span className="text-xs text-content-muted">All time</span>
      </div>

      {/* Horizontal scroll strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
        {entries.map((entry) => (
          <ModelCard key={entry.modelId} entry={entry} />
        ))}
      </div>
    </section>
  );
}

// ─── Single model card ────────────────────────────────────────────────────────

function ModelCard({ entry }: { entry: LeaderboardEntry }) {
  const providerBadgeCls = PROVIDER_COLORS[entry.provider] ?? "bg-surface-secondary text-content-muted";

  const runMeta = (() => {
    if (!entry.lastRunAt) return null;
    const scenarioName = entry.lastScenarioId
      ? (WORKBENCH_SCENARIOS.find((s) => s.id === entry.lastScenarioId)?.name ?? entry.lastScenarioId)
      : null;
    return { scenarioName, when: timeAgo(entry.lastRunAt) };
  })();

  return (
    <div
      className="
        flex-none w-44 rounded-lg border border-edge bg-surface-secondary
        p-3 flex flex-col gap-2
        hover:border-content-muted/30 transition-colors
      "
    >
      {/* Provider badge + model name */}
      <div className="flex items-start justify-between gap-1">
        <span className="text-sm font-semibold text-content leading-tight">
          {entry.displayName}
        </span>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${providerBadgeCls}`}>
          {entry.providerLabel}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1 bg-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(entry.score)}`}
          style={{ width: scoreBarWidth(entry.score) }}
        />
      </div>

      {/* Score number + source */}
      <div className="flex items-end justify-between">
        {entry.score !== null ? (
          <span className={`text-xl font-bold tabular-nums ${scoreColor(entry.score)}`}>
            {entry.score}
            <span className="text-xs font-medium text-content-muted ml-0.5">/100</span>
          </span>
        ) : (
          <span className="text-sm text-content-muted">—</span>
        )}
        {entry.grade && (
          <span className={`text-xs font-bold ${scoreColor(entry.score)}`}>
            {entry.grade}
          </span>
        )}
      </div>

      {/* Source label */}
      {runMeta ? (
        <div className="text-[10px] text-content-muted leading-none flex items-center justify-between gap-2">
          <span className="truncate">{runMeta.scenarioName ?? "Last run"}</span>
          <span className="shrink-0">{runMeta.when}</span>
        </div>
      ) : (
        <span className="text-[10px] text-content-muted leading-none">
          {entry.sourceLabel}
        </span>
      )}
    </div>
  );
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
