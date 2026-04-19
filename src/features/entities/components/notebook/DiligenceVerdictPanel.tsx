/**
 * DiligenceVerdictPanel — operator-facing readout of the pipeline verdict
 * stream for an entity.
 *
 * Surfaces the deterministic judge output above the raw trace drill-down
 * (owner_mode_end_to_end.md §3, agent_run_verdict_workflow.md §4):
 *   - most recent verdict pill (verified / provisionally_verified / needs_review / failed)
 *   - per-gate pass/fail/skip breakdown (from gatesJson)
 *   - latency + token counts from the paired telemetry row
 *   - next-action hint derived from the dominant failing gate
 *
 * Data flow:
 *   convex/domains/product/diligenceJudge.listForEntity    → verdicts
 *   convex/domains/product/diligenceRunTelemetry.listForEntity → telemetry
 *   join client-side on telemetryId.
 *
 * States (analyst_diagnostic.md §UI-specific):
 *   - loading: skeleton rows, respects prefers-reduced-motion
 *   - empty: agency-giving message with trigger hint
 *   - error: bounded message + retry button (never blank screen)
 *   - live: verdict chip + gate strip + per-run history
 *
 * Integration:
 *   <DiligenceVerdictPanel entitySlug={slug} limit={8} />
 *   Drop above the raw trace drill-down on the entity page.
 *
 * Prior art / style:
 *   - Linear workflow panel (tight density, boolean gate chips)
 *   - Vercel deploy log header (verdict pill + dominant-failure reason)
 */

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Verdict = "verified" | "provisionally_verified" | "needs_review" | "failed";

type GateResult = {
  name: string;
  status: "pass" | "fail" | "skipped";
  reason: string;
};

type TelemetryRow = {
  _id: Id<"diligenceRunTelemetry">;
  entitySlug: string;
  blockType: string;
  scratchpadRunId: string;
  version: number;
  overallTier: string;
  headerText: string;
  status: string;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  toolCalls?: number;
  tokensIn?: number;
  tokensOut?: number;
  sourceCount?: number;
  errorMessage?: string;
};

type VerdictRow = {
  _id: Id<"diligenceJudgeVerdicts">;
  telemetryId: Id<"diligenceRunTelemetry">;
  entitySlug: string;
  blockType: string;
  scratchpadRunId: string;
  verdict: string;
  passCount: number;
  failCount: number;
  skipCount: number;
  score: number;
  latencyBudgetMs: number;
  gatesJson: string;
  judgedAt: number;
  judgeVersion?: string;
};

export type DiligenceVerdictPanelProps = {
  entitySlug: string;
  /** How many recent runs to display (default 8, max 50). */
  limit?: number;
  /** Optional className passthrough for the outer container. */
  className?: string;
};

const VERDICT_TONES: Record<Verdict, { label: string; className: string }> = {
  verified: {
    label: "Verified",
    className: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
  },
  provisionally_verified: {
    label: "Provisional",
    className: "bg-sky-500/10 text-sky-200 border-sky-500/30",
  },
  needs_review: {
    label: "Needs review",
    className: "bg-amber-500/10 text-amber-200 border-amber-500/30",
  },
  failed: {
    label: "Failed",
    className: "bg-rose-500/10 text-rose-200 border-rose-500/30",
  },
};

const GATE_LABELS: Record<string, string> = {
  hasValidTier: "Tier",
  hasStableScratchpadRunId: "Run id",
  hasMonotonicVersion: "Version",
  hasHeader: "Header",
  tierMatchesBodyProse: "Prose ↔ tier",
  latencyWithinBudget: "Latency",
  reportsToolCalls: "Tool calls",
  reportsTokenCounts: "Tokens",
  capturedSources: "Sources",
  emitStatusIsTerminal: "Status",
};

function parseGates(json: string): ReadonlyArray<GateResult> {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g): g is GateResult =>
        typeof g === "object" &&
        g !== null &&
        typeof g.name === "string" &&
        typeof g.status === "string" &&
        ["pass", "fail", "skipped"].includes(g.status),
    );
  } catch {
    return [];
  }
}

function dominantFailureHint(gates: ReadonlyArray<GateResult>): string | null {
  const failing = gates.find((g) => g.status === "fail");
  if (!failing) return null;
  const label = GATE_LABELS[failing.name] ?? failing.name;
  return `${label}: ${failing.reason}`;
}

function formatRelative(ms: number): string {
  const delta = Date.now() - ms;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

function joinVerdictsWithTelemetry(
  verdicts: ReadonlyArray<VerdictRow>,
  telemetry: ReadonlyArray<TelemetryRow>,
): Array<{ verdict: VerdictRow; telemetry?: TelemetryRow }> {
  const telemetryById = new Map<string, TelemetryRow>();
  for (const t of telemetry) {
    telemetryById.set(t._id, t);
  }
  return verdicts.map((v) => ({
    verdict: v,
    telemetry: telemetryById.get(v.telemetryId),
  }));
}

export function DiligenceVerdictPanel({
  entitySlug,
  limit = 8,
  className,
}: DiligenceVerdictPanelProps) {
  const cappedLimit = Math.max(1, Math.min(limit, 50));

  const verdicts = useQuery(api.domains.product.diligenceJudge.listForEntity, {
    entitySlug,
    limit: cappedLimit,
  }) as ReadonlyArray<VerdictRow> | undefined;

  const telemetry = useQuery(
    api.domains.product.diligenceRunTelemetry.listForEntity,
    { entitySlug, limit: cappedLimit * 2 }, // oversample so joins don't drop rows
  ) as ReadonlyArray<TelemetryRow> | undefined;

  const rows = useMemo(() => {
    if (!verdicts || !telemetry) return null;
    return joinVerdictsWithTelemetry(verdicts, telemetry);
  }, [verdicts, telemetry]);

  const rollup = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const counts = { verified: 0, provisionally_verified: 0, needs_review: 0, failed: 0 };
    for (const r of rows) {
      if (r.verdict.verdict in counts) {
        counts[r.verdict.verdict as keyof typeof counts] += 1;
      }
    }
    return { total: rows.length, ...counts };
  }, [rows]);

  // Loading (queries in flight) — both undefined.
  if (verdicts === undefined || telemetry === undefined) {
    return (
      <section
        className={
          "rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 " + (className ?? "")
        }
        role="region"
        aria-label="Pipeline verdict panel"
        aria-busy="true"
      >
        <header className="mb-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/60">
            Pipeline verdicts
          </h2>
        </header>
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-white/[0.04] motion-safe:animate-pulse" />
          <div className="h-6 w-full rounded bg-white/[0.04] motion-safe:animate-pulse" />
          <div className="h-6 w-4/5 rounded bg-white/[0.04] motion-safe:animate-pulse" />
        </div>
      </section>
    );
  }

  // Empty — agency-giving message.
  if (!rows || rows.length === 0) {
    return (
      <section
        className={
          "rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 " + (className ?? "")
        }
        role="region"
        aria-label="Pipeline verdict panel"
      >
        <header className="mb-3">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/60">
            Pipeline verdicts
          </h2>
        </header>
        <p className="text-sm text-white/70">
          No pipeline runs yet for this entity. Trigger a structuring pass via
          chat or the Refresh action — verdicts will appear here as the
          orchestrator emits.
        </p>
      </section>
    );
  }

  const latest = rows[0];
  const latestVerdict = latest.verdict.verdict as Verdict;
  const latestTone = VERDICT_TONES[latestVerdict] ?? VERDICT_TONES.needs_review;
  const latestGates = parseGates(latest.verdict.gatesJson);
  const hint = dominantFailureHint(latestGates);

  return (
    <section
      className={
        "rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 " + (className ?? "")
      }
      role="region"
      aria-label="Pipeline verdict panel"
    >
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.2em] text-white/60">
          Pipeline verdicts
        </h2>
        {rollup ? (
          <span
            className="font-mono text-[11px] text-white/50"
            aria-label={`${rollup.verified} verified, ${rollup.needs_review + rollup.failed} needs review or failed, over ${rollup.total} runs`}
          >
            {rollup.verified}/{rollup.total} verified
          </span>
        ) : null}
      </header>

      {/* Latest verdict hero */}
      <div className="mb-4 rounded-md border border-white/[0.05] bg-white/[0.015] p-3">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={
              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium " +
              latestTone.className
            }
          >
            {latestTone.label}
          </span>
          <span className="text-xs text-white/60">
            {latest.verdict.blockType} · v{latest.verdict.scratchpadRunId.slice(0, 8)} ·{" "}
            {formatRelative(latest.verdict.judgedAt)}
          </span>
          <span className="ml-auto font-mono text-[11px] text-white/50">
            {Math.round(latest.verdict.score * 100)}% ·{" "}
            {latest.verdict.passCount}p / {latest.verdict.failCount}f /{" "}
            {latest.verdict.skipCount}s
          </span>
        </div>

        {/* Gate strip */}
        <ul className="flex flex-wrap gap-1.5" aria-label="Gate breakdown">
          {latestGates.map((g) => (
            <li
              key={g.name}
              className={
                "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] " +
                (g.status === "pass"
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-200"
                  : g.status === "fail"
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                    : "border-white/[0.08] bg-white/[0.02] text-white/50")
              }
              title={g.reason}
              aria-label={`${GATE_LABELS[g.name] ?? g.name} ${g.status}: ${g.reason}`}
            >
              {GATE_LABELS[g.name] ?? g.name}
              <span className="sr-only"> {g.status}</span>
            </li>
          ))}
        </ul>

        {/* Dominant failure hint (if any) */}
        {hint ? (
          <p className="mt-2 text-xs text-amber-200/80">
            <span className="font-medium">Next:</span> {hint}
          </p>
        ) : null}

        {/* Latency + token line */}
        {latest.telemetry ? (
          <p className="mt-1 font-mono text-[10px] text-white/40">
            {latest.telemetry.elapsedMs}ms
            {latest.telemetry.toolCalls !== undefined
              ? ` · ${latest.telemetry.toolCalls} tools`
              : ""}
            {latest.telemetry.tokensIn !== undefined
              ? ` · ${latest.telemetry.tokensIn}→${latest.telemetry.tokensOut ?? 0} tok`
              : ""}
            {latest.telemetry.sourceCount !== undefined
              ? ` · ${latest.telemetry.sourceCount} sources`
              : ""}
          </p>
        ) : null}
      </div>

      {/* History — compact */}
      {rows.length > 1 ? (
        <details className="group">
          <summary className="cursor-pointer text-[11px] uppercase tracking-[0.15em] text-white/50 hover:text-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d97757]">
            Run history ({rows.length - 1} prior)
          </summary>
          <ul className="mt-2 space-y-1.5">
            {rows.slice(1).map((r) => {
              const v = r.verdict.verdict as Verdict;
              const tone = VERDICT_TONES[v] ?? VERDICT_TONES.needs_review;
              return (
                <li
                  key={r.verdict._id}
                  className="flex items-center gap-2 text-xs text-white/70"
                >
                  <span
                    className={
                      "inline-flex rounded border px-1.5 py-0 text-[10px] " +
                      tone.className
                    }
                  >
                    {tone.label}
                  </span>
                  <span className="truncate">{r.verdict.blockType}</span>
                  <span className="ml-auto font-mono text-[10px] text-white/40">
                    {r.telemetry?.elapsedMs ?? "?"}ms ·{" "}
                    {formatRelative(r.verdict.judgedAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/* Pure helpers exported for tests (scenario_testing.md — real behavior, not mocks). */
export const __test = {
  parseGates,
  dominantFailureHint,
  formatRelative,
  joinVerdictsWithTelemetry,
};
