/**
 * ResultWorkspace — 8-section entity intelligence result page.
 *
 * Canonical structure:
 *   1. Entity Truth (executive summary)
 *   2. What Changed / Why Now
 *   3. Key Signals
 *   4. Risks / Contradictions
 *   5. Comparables / Related Entities
 *   6. Recommended Next Questions
 *   7. Packet Actions (export)
 *   8. Keep Warm / Monitor
 *
 * Adapts section ordering and emphasis based on active lens.
 */

import { memo, useCallback, useState } from "react";
import {
  saveMemoToStorage,
  generateMemoId,
  copyMemoUrl,
  type ShareableMemoData,
} from "@/features/founder/views/ShareableMemoView";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Check,
  ClipboardCopy,
  Download,
  Eye,
  FileText,
  GitCompare,
  HelpCircle,
  Share2,
  TrendingUp,
} from "lucide-react";
import type { LensId, ResultPacket } from "./searchTypes";
import { TrajectoryPanel } from "@/features/telemetry/TrajectoryPanel";
import type { TrajectoryData } from "@/features/telemetry/types";

/* ─── Section shell ──────────────────────────────────────────────────────── */

function Section({
  id,
  icon: Icon,
  title,
  children,
  defaultOpen = true,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      id={`result-${id}`}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden transition-all"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={open}
        aria-controls={`result-${id}-content`}
      >
        <Icon className="h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted flex-1">
          {title}
        </span>
        <span
          className={`text-content-muted transition-transform text-xs ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          &#9662;
        </span>
      </button>
      {open && (
        <div id={`result-${id}-content`} className="border-t border-white/[0.06] px-5 py-4">
          {children}
        </div>
      )}
    </section>
  );
}

/* ─── Confidence badge ──────────────────────────────────────────────────── */

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 75
      ? "bg-emerald-500/15 text-emerald-400"
      : value >= 50
        ? "bg-amber-500/15 text-amber-400"
        : "bg-rose-500/15 text-rose-400";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {value}% confidence
    </span>
  );
}

/* ─── Impact tag ────────────────────────────────────────────────────────── */

function ImpactTag({ impact }: { impact: "high" | "medium" | "low" }) {
  const cls =
    impact === "high"
      ? "text-amber-400 bg-amber-500/10"
      : impact === "medium"
        ? "text-blue-400 bg-blue-500/10"
        : "text-zinc-400 bg-zinc-500/10";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {impact}
    </span>
  );
}

/* ─── Direction arrow ───────────────────────────────────────────────────── */

function DirectionArrow({ direction }: { direction: "up" | "down" | "neutral" }) {
  if (direction === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (direction === "down") return <TrendingUp className="h-3.5 w-3.5 rotate-180 text-rose-400" />;
  return <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />;
}

/* ─── Main component ────────────────────────────────────────────────────── */

/* ─── Demo trajectory generator ────────────────────────────────────────── */

function buildDemoTrajectory(packet: ResultPacket): TrajectoryData {
  const now = Date.now();
  const toolSteps: Array<{
    tool: string;
    domain: string;
    ms: number;
    status: "pass" | "fail" | "skipped";
    input: string;
    output: string;
    tokens: number;
  }> = [
    { tool: "classify_query", domain: "search", ms: 12, status: "pass", input: `query="${packet.query}"`, output: `type=company_search, lens=${packet.entityName}`, tokens: 85 },
    { tool: "build_context_bundle", domain: "context", ms: 45, status: "pass", input: `entity="${packet.entityName}"`, output: "pinned=185tok, injected=210tok", tokens: 120 },
    { tool: "search_entities", domain: "entity", ms: 230, status: "pass", input: `name="${packet.entityName}", fuzzy=true`, output: `matched 1 entity, confidence=92%`, tokens: 340 },
    { tool: "founder_local_gather", domain: "founder", ms: 180, status: "pass", input: `entityId="${packet.entityName.toLowerCase()}", daysBack=30`, output: `${packet.sourceCount} actions gathered`, tokens: 520 },
    { tool: "run_recon", domain: "recon", ms: 1200, status: "pass", input: `target="${packet.entityName}", depth=standard`, output: `${packet.variables.length} signals, ${packet.risks?.length ?? 0} risks identified`, tokens: 1850 },
    { tool: "linkup_search", domain: "search", ms: 890, status: "pass", input: `q="${packet.entityName} competitive position 2025"`, output: `answer=${packet.answer.slice(0, 60)}...`, tokens: 780 },
    { tool: "judge_tool_output", domain: "eval", ms: 340, status: "pass", input: "structural + semantic criteria", output: `pass_rate=90%, criteria_rate=85%`, tokens: 420 },
    { tool: "build_result_packet", domain: "synthesis", ms: 95, status: "pass", input: `entity="${packet.entityName}", sections=8`, output: `confidence=${packet.confidence}%, sources=${packet.sourceCount}`, tokens: 290 },
  ];

  let totalMs = 0;
  let totalTokens = 0;
  const steps = toolSteps.map((t, i) => {
    totalMs += t.ms;
    totalTokens += t.tokens;
    return {
      id: `step-${i}`,
      toolName: t.tool,
      domain: t.domain,
      latencyMs: t.ms,
      status: t.status as "pass" | "fail" | "pending" | "skipped",
      inputSummary: t.input,
      outputPreview: t.output,
      timestamp: new Date(now - (toolSteps.length - i) * 1000).toISOString(),
      tokenEstimate: t.tokens,
    };
  });

  return {
    query: packet.query,
    steps,
    totalLatencyMs: totalMs,
    toolCount: new Set(toolSteps.map((t) => t.tool)).size,
    totalTokenEstimate: totalTokens,
    startedAt: new Date(now - totalMs).toISOString(),
    completedAt: new Date(now).toISOString(),
  };
}

/* ─── Main component ────────────────────────────────────────────────────── */

interface ResultWorkspaceProps {
  packet: ResultPacket;
  lens: LensId;
  onFollowUp?: (question: string) => void;
  onExport?: (type: "brief" | "sheet" | "deck" | "html") => void;
  onMonitor?: () => void;
  /** Optional live trajectory data. Falls back to demo trajectory if absent. */
  trajectory?: TrajectoryData;
}

export const ResultWorkspace = memo(function ResultWorkspace({
  packet,
  lens,
  onFollowUp,
  onExport,
  onMonitor,
  trajectory,
}: ResultWorkspaceProps) {
  const trajectoryData = trajectory ?? buildDemoTrajectory(packet);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = useCallback(() => {
    const id = generateMemoId();
    const memoData: ShareableMemoData = {
      id,
      company: packet.entityName,
      date: new Date().toISOString().slice(0, 10),
      question: packet.query,
      answer: packet.answer,
      confidence: packet.confidence,
      sourceCount: packet.sourceCount,
      variables: packet.variables.map((v) => ({
        rank: v.rank,
        name: v.name,
        direction: v.direction,
        impact: v.impact,
      })),
      scenarios: packet.scenarios?.map((s) => ({
        label: s.label,
        probability: s.probability,
        outcome: s.outcome,
      })) ?? [],
      actions: packet.interventions?.map((a) => ({
        action: a.action,
        impact: a.impact,
      })) ?? packet.nextQuestions?.slice(0, 3).map((q) => ({
        action: q,
        impact: "medium" as const,
      })) ?? [],
    };
    saveMemoToStorage(memoData);
    copyMemoUrl(id);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  }, [packet]);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-content truncate">{packet.entityName}</h2>
          <p className="text-xs text-content-muted mt-0.5 truncate">{packet.query}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge value={packet.confidence} />
          <span className="text-[11px] text-content-muted">{packet.sourceCount} sources</span>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px] font-medium text-content-muted transition-colors hover:bg-white/[0.06] hover:text-content"
            aria-label={copiedShare ? "Link copied" : "Share result"}
          >
            {copiedShare ? (
              <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
            ) : (
              <><Share2 className="h-3 w-3" />Share</>
            )}
          </button>
        </div>
      </div>

      {/* ── 1. Entity Truth ────────────────────────────────────────────────── */}
      <Section id="truth" icon={BookOpen} title="Entity Truth">
        <p className="text-sm leading-relaxed text-content">{packet.answer}</p>
        {packet.keyMetrics && packet.keyMetrics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4">
            {packet.keyMetrics.map((m) => (
              <div key={m.label} className="min-w-[100px]">
                <div className="text-[10px] uppercase tracking-[0.15em] text-content-muted">{m.label}</div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-content">{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── 2. What Changed / Why Now ──────────────────────────────────────── */}
      {packet.changes && packet.changes.length > 0 && (
        <Section id="changes" icon={TrendingUp} title="What Changed / Why Now">
          <div className="space-y-2.5">
            {packet.changes.map((c, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#d97757]/10 text-[10px] font-bold text-[#d97757]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <span className="text-content">{c.description}</span>
                  {c.date && (
                    <span className="ml-2 text-[10px] text-content-muted">{c.date}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 3. Key Signals ─────────────────────────────────────────────────── */}
      <Section id="signals" icon={BarChart3} title="Key Signals">
        <div className="space-y-2">
          {packet.variables.map((v) => (
            <div key={v.rank} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-right text-[11px] tabular-nums text-content-muted">{v.rank}</span>
              <DirectionArrow direction={v.direction} />
              <span className="flex-1 text-content">{v.name}</span>
              <ImpactTag impact={v.impact} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 4. Risks / Contradictions ──────────────────────────────────────── */}
      {packet.risks && packet.risks.length > 0 && (
        <Section id="risks" icon={AlertTriangle} title="Risks / Contradictions">
          <div className="space-y-3">
            {packet.risks.map((r, i) => (
              <div key={i} className="rounded-lg border border-rose-500/10 bg-rose-500/[0.03] p-3">
                <div className="text-sm font-medium text-content">{r.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-content-muted">{r.description}</p>
                {r.falsification && (
                  <p className="mt-1.5 text-[10px] text-rose-400/80 italic">
                    Falsify: {r.falsification}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── 5. Comparables ─────────────────────────────────────────────────── */}
      {packet.comparables && packet.comparables.length > 0 && (
        <Section id="comparables" icon={GitCompare} title="Comparables / Related Entities">
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.15em] text-content-muted">
                  <th className="px-2 py-1.5 text-left font-semibold">Entity</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Relevance</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {packet.comparables.map((c) => (
                  <tr key={c.name} className="hover:bg-white/[0.02]">
                    <td className="px-2 py-2 font-medium text-content">{c.name}</td>
                    <td className="px-2 py-2"><ImpactTag impact={c.relevance} /></td>
                    <td className="px-2 py-2 text-content-muted text-xs">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── 6. Recommended Next Questions ──────────────────────────────────── */}
      {packet.nextQuestions && packet.nextQuestions.length > 0 && (
        <Section id="next" icon={HelpCircle} title="Recommended Next Questions">
          <div className="space-y-2">
            {packet.nextQuestions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onFollowUp?.(q)}
                className="group flex w-full items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.01] px-3 py-2.5 text-left text-sm text-content transition-all hover:border-[#d97757]/20 hover:bg-[#d97757]/[0.03]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.05] text-[10px] font-bold text-content-muted group-hover:bg-[#d97757]/10 group-hover:text-[#d97757]">
                  {i + 1}
                </span>
                <span className="flex-1">{q}</span>
                <ArrowRight className="h-3.5 w-3.5 text-content-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* ── 7. Packet Actions ──────────────────────────────────────────────── */}
      <Section id="actions" icon={Download} title="Export Packet" defaultOpen={false}>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { type: "brief" as const, label: "Brief", icon: FileText },
              { type: "sheet" as const, label: "Sheet", icon: BarChart3 },
              { type: "deck" as const, label: "Deck", icon: Eye },
              { type: "html" as const, label: "HTML", icon: Share2 },
            ] as const
          ).map(({ type, label, icon: BtnIcon }) => (
            <button
              key={type}
              type="button"
              onClick={() => onExport?.(type)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-content transition-all hover:border-[#d97757]/20 hover:bg-[#d97757]/[0.04] hover:text-[#d97757]"
            >
              <BtnIcon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── 8. Keep Warm / Monitor ─────────────────────────────────────────── */}
      <Section id="monitor" icon={Bell} title="Keep Warm / Monitor" defaultOpen={false}>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onMonitor}
            className="inline-flex items-center gap-2 rounded-lg bg-[#d97757] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c96a4d]"
          >
            <Bell className="h-4 w-4" />
            Add to Watchlist
          </button>
          <p className="text-xs text-content-muted">
            Get notified when material changes occur. Daily or weekly digest available.
          </p>
        </div>
      </Section>

      {/* ── 9. Agent Trajectory ─────────────────────────────────────────────── */}
      <TrajectoryPanel data={trajectoryData} defaultCollapsed={true} />
    </div>
  );
});
