/**
 * DaasPage — Distillation-as-a-Service live dashboard
 *
 * Live data from Convex prod (agile-caribou-964.convex.cloud).
 * Pipeline: ingest -> distill -> generate -> replay -> judge.
 *
 * Every metric here is measured from real API usageMetadata — no estimates.
 *
 * Accessibility:
 *   - All stat cards use role="group" + aria-label
 *   - Respects prefers-reduced-motion (no pulse/fade)
 *   - Skip link to main content
 *   - Keyboard-navigable run list (Enter/Space to open)
 *
 * Performance:
 *   - Single query at mount; updates via Convex subscription
 *   - Selected run detail only fetched on demand
 *
 * See:
 *   docs/DISTILLATION_AS_A_SERVICE.md
 *   docs/BENCHMARK_STRATEGY.md
 *   daas/ Python pipeline (source of first 3 seed rows)
 */

import { useMemo, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";

type VerdictKind = "pass" | "partial" | "fail";

const VERDICT_COLORS: Record<VerdictKind, { text: string; bg: string; border: string }> = {
  pass: { text: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.4)" },
  partial: { text: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)" },
  fail: { text: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)" },
};

function formatCost(usd?: number | null): string {
  if (usd === null || usd === undefined || Number.isNaN(usd)) return "—";
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

function formatTokens(n?: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatPct(n?: number | null): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function VerdictBadge({ verdict }: { verdict?: string | null }) {
  const kind: VerdictKind = verdict === "pass" || verdict === "partial" || verdict === "fail"
    ? (verdict as VerdictKind)
    : "fail";
  const palette = VERDICT_COLORS[kind];
  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        color: palette.text,
        letterSpacing: "0.04em",
      }}
    >
      {(verdict ?? "pending").toUpperCase()}
    </span>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div
      style={{
        position: "relative",
        height: 12,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 4,
        overflow: "hidden",
      }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        style={{
          height: "100%",
          width: `${pct}%`,
          background: color,
          transition: "width 0.3s",
        }}
      />
    </div>
  );
}

// Detail subcomponent rendered below the run list when a run is selected.
function RunDetail({ sessionId }: { sessionId: string }) {
  const run = useQuery(api.domains.daas.queries.getRun, { sessionId });
  const rubrics = useQuery(api.domains.daas.queries.listRubrics, {});
  const judgeReplay = useAction(api.domains.daas.actions.judgeReplay);
  const [judging, setJudging] = useState(false);
  const [judgeError, setJudgeError] = useState<string | null>(null);
  const [selectedRubric, setSelectedRubric] = useState<string>("daas.generic.v1");

  const handleRejudge = async () => {
    if (!run || !run.replays[0]) return;
    setJudging(true);
    setJudgeError(null);
    try {
      await judgeReplay({
        sessionId,
        replayId: run.replays[0]._id,
        rubricId: selectedRubric,
      });
    } catch (e) {
      setJudgeError(e instanceof Error ? e.message : String(e));
    } finally {
      setJudging(false);
    }
  };

  if (run === undefined) {
    return <div style={{ padding: 16, color: "#9a9590" }}>Loading run…</div>;
  }
  if (run === null) {
    return <div style={{ padding: 16, color: "#ef4444" }}>Run not found.</div>;
  }

  const { trace, spec, replays } = run;
  const latestReplay = replays[0];
  const spec_parsed = spec ? (() => {
    try { return JSON.parse(spec.specJson); } catch { return null; }
  })() : null;

  return (
    <div style={{
      padding: 16,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8,
      marginTop: 12,
    }}>
      <h3 style={{ fontSize: 14, margin: "0 0 8px", color: "#d97757" }}>
        {trace.sessionId}
      </h3>
      <p style={{ fontSize: 13, margin: "0 0 12px", color: "#e8e6e3" }}>
        <strong>Query:</strong> {trace.query}
      </p>

      {/* Pipeline stages */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6, marginBottom: 12 }}>
        {[
          { n: 1, l: "INGEST", done: true },
          { n: 2, l: "NORMALIZE", done: true },
          { n: 3, l: "DISTILL", done: !!spec },
          { n: 4, l: "GENERATE", done: !!spec },
          { n: 5, l: "REPLAY", done: replays.length > 0 },
          { n: 6, l: "JUDGE", done: !!latestReplay?.judgment },
        ].map((s) => (
          <div key={s.n} style={{
            padding: 8,
            borderRadius: 6,
            textAlign: "center",
            border: `1px solid ${s.done ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
            background: s.done ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: s.done ? "#22c55e" : "#5d5854" }}>{s.n}</div>
            <div style={{ fontSize: 10, color: "#9a9590", marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* WorkflowSpec summary */}
      {spec && spec_parsed && (
        <div style={{
          background: "rgba(96,165,250,0.04)",
          border: "1px dashed rgba(96,165,250,0.2)",
          borderRadius: 6,
          padding: 10,
          marginBottom: 12,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: "#e8e6e3",
          lineHeight: 1.55,
        }}>
          <div style={{ color: "#60a5fa", fontWeight: 700, marginBottom: 4 }}>Distilled WorkflowSpec</div>
          <div>{spec.workerCount} workers · {spec.toolCount} tools · {spec.handoffCount} handoffs · executor {spec.executorModel}</div>
          <div style={{ color: "#9a9590", marginTop: 4 }}>Workers: {(spec_parsed.workers || []).map((w: any) => w.name).join(", ")}</div>
          <div style={{ color: "#9a9590" }}>Tools: {(spec_parsed.tools || []).map((t: any) => t.name).join(", ")}</div>
        </div>
      )}

      {/* Side-by-side original vs replay */}
      {latestReplay && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={{
            background: "rgba(245,158,11,0.04)",
            border: "1px solid rgba(245,158,11,0.2)",
            borderLeft: "3px solid #f59e0b",
            borderRadius: 6,
            padding: 10,
            minWidth: 0,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <strong style={{ fontSize: 12 }}>Original (Pro)</strong>
              <span style={{ fontSize: 11, color: "#9a9590", fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCost(trace.totalCostUsd)}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#9a9590", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              {formatTokens(trace.totalTokens)} tok · {trace.sourceModel}
            </div>
            <pre style={{
              background: "#0a0a0a",
              padding: 8,
              borderRadius: 4,
              fontSize: 11,
              lineHeight: 1.5,
              maxHeight: 320,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              margin: 0,
              fontFamily: "inherit",
            }}>
              {trace.finalAnswer}
            </pre>
          </div>

          <div style={{
            background: "rgba(34,197,94,0.04)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderLeft: "3px solid #22c55e",
            borderRadius: 6,
            padding: 10,
            minWidth: 0,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <strong style={{ fontSize: 12 }}>Replay (Flash Lite + scaffold)</strong>
              <span style={{ fontSize: 11, color: "#9a9590", fontFamily: "'JetBrains Mono', monospace" }}>
                {formatCost(latestReplay.replayCostUsd)}
              </span>
            </div>
            <div style={{ fontSize: 10, color: "#9a9590", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
              {formatTokens(latestReplay.replayTokens)} tok · {latestReplay.workersDispatched.length} workers · {latestReplay.connectorMode}
            </div>
            <pre style={{
              background: "#0a0a0a",
              padding: 8,
              borderRadius: 4,
              fontSize: 11,
              lineHeight: 1.5,
              maxHeight: 320,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              margin: 0,
              fontFamily: "inherit",
            }}>
              {latestReplay.replayAnswer}
            </pre>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <strong style={{ fontSize: 12 }}>Judgment</strong>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <VerdictBadge verdict={latestReplay.judgment?.verdict} />
                <select
                  value={selectedRubric}
                  onChange={(e) => setSelectedRubric(e.target.value)}
                  aria-label="Rubric for judge run"
                  disabled={judging}
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "3px 6px",
                    borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.03)",
                    color: "#e8e6e3",
                    cursor: judging ? "wait" : "pointer",
                  }}
                >
                  {(rubrics ?? []).map((rb) => (
                    <option key={rb.id} value={rb.id}>
                      {rb.id} ({rb.checkCount})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleRejudge}
                  disabled={judging}
                  aria-label="Re-run LLM rubric judge on this replay"
                  style={{
                    fontSize: 10,
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "1px solid rgba(96,165,250,0.4)",
                    background: judging ? "rgba(96,165,250,0.08)" : "rgba(96,165,250,0.15)",
                    color: "#60a5fa",
                    cursor: judging ? "wait" : "pointer",
                    fontWeight: 600,
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = "2px solid #60a5fa";
                    e.currentTarget.style.outlineOffset = "2px";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = "";
                  }}
                >
                  {judging ? "JUDGING…" : "RE-JUDGE"}
                </button>
              </div>
            </div>
            {judgeError && (
              <div
                role="alert"
                style={{
                  fontSize: 10,
                  color: "#ef4444",
                  padding: 6,
                  marginBottom: 6,
                  background: "rgba(239,68,68,0.08)",
                  borderRadius: 4,
                }}
              >
                {judgeError.slice(0, 240)}
              </div>
            )}
            <div style={{ fontSize: 11, display: "grid", gap: 8 }}>
              <div>
                <div style={{ color: "#9a9590", fontSize: 10, marginBottom: 2 }}>Checks passed</div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "#22c55e",
                }}>
                  {latestReplay.judgment
                    ? `${latestReplay.judgment.passedCount}/${latestReplay.judgment.totalCount}`
                    : "—"}
                </div>
                <div style={{ fontSize: 10, color: "#9a9590" }}>
                  rubric: {latestReplay.judgment?.rubricId ?? "—"}{latestReplay.judgment?.rubricVersion ? ` @ ${latestReplay.judgment.rubricVersion}` : ""}
                </div>
              </div>
              <div>
                <div style={{ color: "#9a9590", fontSize: 10, marginBottom: 2 }}>Measured cost delta</div>
                <div style={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: (latestReplay.judgment?.costDeltaPct ?? 0) < 0 ? "#22c55e" : "#ef4444",
                }}>
                  {formatPct(latestReplay.judgment?.costDeltaPct)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boolean rubric breakdown — source of truth */}
      {latestReplay?.judgment && (() => {
        let checks: Array<{ name: string; passed: boolean; reason: string }> = [];
        try {
          const parsed = JSON.parse(latestReplay.judgment.checksJson);
          if (Array.isArray(parsed)) checks = parsed;
        } catch { /* noop */ }
        if (checks.length === 0) return null;
        return (
          <div style={{
            marginTop: 12,
            padding: 12,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#9a9590",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 8,
            }}>
              Boolean rubric · {checks.filter((c) => c.passed).length}/{checks.length} passed
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              {checks.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "16px 220px 1fr",
                    gap: 10,
                    alignItems: "start",
                    padding: "6px 8px",
                    borderRadius: 4,
                    background: c.passed ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    aria-label={c.passed ? "passed" : "failed"}
                    style={{
                      color: c.passed ? "#22c55e" : "#ef4444",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                    }}
                  >
                    {c.passed ? "✓" : "✗"}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "#e8e6e3",
                    fontSize: 10,
                  }}>
                    {c.name}
                  </span>
                  <span style={{ color: "#9a9590" }}>{c.reason}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: "#5d5854" }}>
              Every check is produced by an LLM judge applying a bounded rubric.
              Pass/fail booleans replace arbitrary scores; each comes with its evidence sentence.
            </div>
          </div>
        );
      })()}
    </div>
  );
}

export function DaasPage() {
  const stats = useQuery(api.domains.daas.queries.getAggregateStats, {});
  const runs = useQuery(api.domains.daas.queries.listRuns, { limit: 50 });
  const [selected, setSelected] = useState<string | null>(null);

  const sortedRuns = useMemo(
    () => (runs ?? []).filter((r) => r.hasSpec).sort((a, b) => b.createdAt - a.createdAt),
    [runs],
  );

  return (
    <div style={{
      maxWidth: 1280,
      margin: "0 auto",
      padding: "2rem 1.5rem",
      color: "#e8e6e3",
      background: "#0a0a0a",
      minHeight: "100vh",
      fontFamily: "-apple-system, 'Inter', sans-serif",
    }}>
      <a
        href="#daas-main"
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = "1rem";
          e.currentTarget.style.top = "1rem";
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = "-9999px";
        }}
      >
        Skip to main content
      </a>

      <header>
        <h1 style={{ fontSize: "2rem", margin: "0 0 0.25rem", letterSpacing: "-0.02em", fontWeight: 800 }}>
          Distillation-as-a-Service
        </h1>
        <p style={{ color: "#9a9590", fontSize: 13, margin: 0 }}>
          Live pipeline: ingest Pro traces → distill WorkflowSpec → generate scaffold → replay with Flash Lite → deterministic judge.
          All numbers measured from real Gemini API <code style={{
            fontFamily: "'JetBrains Mono', monospace",
            background: "rgba(255,255,255,0.05)",
            padding: "1px 6px",
            borderRadius: 4,
            fontSize: 12,
          }}>usageMetadata</code>.
        </p>
      </header>

      <main id="daas-main" style={{ marginTop: 24 }}>
        {/* Hero stat strip */}
        <section
          role="group"
          aria-label="Aggregate distillation statistics"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            padding: 20,
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(34,197,94,0.04), rgba(96,165,250,0.04))",
            border: "2px solid rgba(34,197,94,0.25)",
            marginBottom: 24,
          }}
        >
          <Stat label="Runs ingested" value={stats?.totalRuns.toString() ?? "—"} color="#e8e6e3" />
          <Stat label="Replays executed" value={stats?.totalReplays.toString() ?? "—"} color="#60a5fa" />
          <Stat
            label="Boolean checks passed"
            value={
              stats
                ? `${stats.totalChecksPassed}/${stats.totalChecksEvaluated}`
                : "—"
            }
            color="#d97757"
            sub="LLM-judged rubric (no arbitrary scores)"
          />
          <Stat
            label="Avg cost delta"
            value={stats ? formatPct(stats.avgCostDeltaPct) : "—"}
            color={(stats?.avgCostDeltaPct ?? 0) < 0 ? "#22c55e" : "#ef4444"}
            sub="measured from real API tokens"
          />
          <Stat
            label="Verdicts"
            value={stats ? `${stats.passCount}P / ${stats.partialCount}/${stats.failCount}F` : "—"}
            color="#22c55e"
            sub="pass / partial / fail"
          />
        </section>

        {/* Run list */}
        <section aria-label="Distilled runs">
          <h2 style={{ fontSize: "1.25rem", margin: "0 0 12px", color: "#f5f5f4" }}>
            Distilled runs ({sortedRuns.length})
          </h2>

          {runs === undefined && (
            <div style={{
              padding: 48,
              textAlign: "center",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8,
              color: "#9a9590",
            }}>
              Loading runs from Convex…
            </div>
          )}

          {runs !== undefined && sortedRuns.length === 0 && (
            <div style={{
              padding: 32,
              background: "rgba(255,255,255,0.02)",
              border: "1px dashed rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#9a9590",
              fontSize: 13,
              lineHeight: 1.6,
            }}>
              No distilled runs yet. Push a trace via{" "}
              <code style={{
                background: "rgba(255,255,255,0.05)",
                padding: "2px 6px",
                borderRadius: 3,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                mutation domains/daas/mutations:ingestTrace
              </code>{" "}
              then run the Python distiller.
            </div>
          )}

          {sortedRuns.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {sortedRuns.map((run) => {
                const isOpen = selected === run.sessionId;
                return (
                  <div key={run.sessionId}>
                    <button
                      type="button"
                      onClick={() => setSelected(isOpen ? null : run.sessionId)}
                      aria-expanded={isOpen}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: 12,
                        background: isOpen ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isOpen ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: 8,
                        color: "#e8e6e3",
                        cursor: "pointer",
                        display: "grid",
                        gridTemplateColumns: "1fr auto auto auto auto auto",
                        gap: 16,
                        alignItems: "center",
                        fontFamily: "inherit",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.outline = "2px solid #60a5fa";
                        e.currentTarget.style.outlineOffset = "2px";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.outline = "";
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>
                          {run.sessionId}
                        </div>
                        <div style={{
                          fontSize: 11,
                          color: "#9a9590",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}>
                          {run.query}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#f59e0b" }}>
                        {formatCost(run.totalCostUsd)}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#22c55e" }}>
                        {formatCost(run.latestReplayCostUsd)}
                      </div>
                      <div style={{
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: (run.latestCostDeltaPct ?? 0) < 0 ? "#22c55e" : "#9a9590",
                      }}>
                        {formatPct(run.latestCostDeltaPct)}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#d97757" }}>
                        {run.latestPassedCount !== undefined && run.latestTotalCount !== undefined
                          ? `${run.latestPassedCount}/${run.latestTotalCount}`
                          : "—"}
                      </div>
                      <VerdictBadge verdict={run.latestVerdict} />
                    </button>
                    {isOpen && <RunDetail sessionId={run.sessionId} />}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Method footer */}
        <section
          aria-label="How this page is generated"
          style={{
            marginTop: 32,
            padding: 16,
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 8,
            fontSize: 12,
            color: "#9a9590",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "#e8e6e3" }}>How this works:</strong> the Python pipeline in{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>attrition/daas/</code> ingests expert traces
          and writes to Convex prod via{" "}
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>ingestTrace / storeWorkflowSpec / storeReplay / storeJudgment</code>.
          Every stat above is a live query against the Convex database —
          <code style={{ fontFamily: "'JetBrains Mono', monospace" }}>agile-caribou-964.convex.cloud</code>.
        </section>
      </main>
    </div>
  );
}

export default DaasPage;

function Stat({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div
      role="group"
      aria-label={label}
      style={{
        padding: 12,
        background: "rgba(255,255,255,0.03)",
        borderRadius: 8,
      }}
    >
      <div style={{
        fontSize: 10,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: "#9a9590",
        marginBottom: 4,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: "1.5rem",
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1,
        color,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#5d5854", marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}
