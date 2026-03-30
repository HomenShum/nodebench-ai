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

import { memo, useCallback, useMemo, useState } from "react";
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
  Briefcase,
  BookOpen,
  Check,
  ClipboardCopy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  GitCompare,
  HelpCircle,
  Layers3,
  Network,
  Pin,
  Share2,
  TrendingUp,
  Waypoints,
} from "lucide-react";
import type { LensId, ResultPacket } from "./searchTypes";
import { TrajectoryPanel } from "@/features/telemetry/TrajectoryPanel";
import type { TrajectoryData } from "@/features/telemetry/types";
import { ensureProofPacket } from "./proofModel";
import { SyncProvenanceBadge } from "./SyncProvenanceBadge";
import { CitationFootnote } from "./CitationFootnote";
import { SourcesBar } from "./SourcesBar";

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

function ProofStatusBadge({ value }: { value: string }) {
  const tone =
    value === "verified"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : value === "drifting"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
        : value === "provisional" || value === "loading"
          ? "border-[#d97757]/20 bg-[#d97757]/10 text-[#f2b49f]"
          : "border-rose-500/20 bg-rose-500/10 text-rose-300";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {value}
    </span>
  );
}

function SourceStatusBadge({ value }: { value: string }) {
  const tone =
    value === "cited"
      ? "bg-emerald-500/10 text-emerald-300"
      : value === "discarded"
        ? "bg-zinc-500/10 text-zinc-400"
        : "bg-[#d97757]/10 text-[#f2b49f]";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {value}
    </span>
  );
}

function StrategicAngleStatusBadge({ value }: { value: "strong" | "watch" | "unknown" }) {
  const tone =
    value === "strong"
      ? "bg-emerald-500/10 text-emerald-300"
      : value === "watch"
        ? "bg-amber-500/10 text-amber-300"
        : "bg-white/[0.06] text-content-muted";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {value}
    </span>
  );
}

function VisibilityBadge({ value }: { value: "internal" | "workspace" | "public" }) {
  const tone =
    value === "public"
      ? "bg-emerald-500/10 text-emerald-300"
      : value === "workspace"
        ? "bg-[#d97757]/10 text-[#f2b49f]"
        : "bg-white/[0.06] text-content-muted";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {value}
    </span>
  );
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
  onPublishSharedContext?: () => void;
  onDelegate?: (target: "claude_code" | "openclaw") => void;
  onPublishStrategicAngle?: (angleId: string) => void;
  onDelegateStrategicAngle?: (angleId: string, target: "claude_code" | "openclaw") => void;
  onMonitor?: () => void;
  /** Optional live trajectory data. Falls back to demo trajectory if absent. */
  trajectory?: TrajectoryData;
  handoffState?: {
    status: "idle" | "publishing" | "published" | "delegating" | "delegated" | "error";
    message?: string;
    contextId?: string;
    taskId?: string;
    targetLabel?: string;
    installCommand?: string;
    handoffPrompt?: string;
  };
}

export const ResultWorkspace = memo(function ResultWorkspace({
  packet,
  lens,
  onFollowUp,
  onExport,
  onPublishSharedContext,
  onDelegate,
  onPublishStrategicAngle,
  onDelegateStrategicAngle,
  onMonitor,
  trajectory,
  handoffState,
}: ResultWorkspaceProps) {
  const proofPacket = useMemo(() => ensureProofPacket(packet, lens), [packet, lens]);
  const trajectoryData = trajectory ?? buildDemoTrajectory(proofPacket);
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSlackReport, setCopiedSlackReport] = useState(false);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedAnswerBlockId, setSelectedAnswerBlockId] = useState<string | null>(
    proofPacket.answerBlocks[0]?.id ?? null,
  );
  const handoffBusy =
    handoffState?.status === "publishing" || handoffState?.status === "delegating";

  const activeAnswerBlock = useMemo(
    () =>
      proofPacket.answerBlocks.find((block) => block.id === selectedAnswerBlockId) ??
      proofPacket.answerBlocks[0] ??
      null,
    [proofPacket.answerBlocks, selectedAnswerBlockId],
  );

  const activeSourceIds = useMemo(() => {
    const sourceIds = new Set<string>();
    if (activeAnswerBlock) {
      activeAnswerBlock.sourceRefIds.forEach((sourceId) => sourceIds.add(sourceId));
    }
    if (selectedSourceId) sourceIds.add(selectedSourceId);
    if (hoveredSourceId) sourceIds.add(hoveredSourceId);
    return sourceIds;
  }, [activeAnswerBlock, hoveredSourceId, selectedSourceId]);

  const activeSource = useMemo(() => {
    const preferredId =
      selectedSourceId ?? hoveredSourceId ?? activeAnswerBlock?.sourceRefIds[0] ?? null;
    if (!preferredId) return null;
    return proofPacket.sourceRefs.find((source) => source.id === preferredId) ?? null;
  }, [activeAnswerBlock, hoveredSourceId, proofPacket.sourceRefs, selectedSourceId]);

  const activeClaims = useMemo(() => {
    if (!activeAnswerBlock) return [];
    return proofPacket.claimRefs.filter((claim) => activeAnswerBlock.claimIds.includes(claim.id));
  }, [activeAnswerBlock, proofPacket.claimRefs]);

  const handleShare = useCallback(() => {
    const id = generateMemoId();
    const memoData: ShareableMemoData = {
      id,
      company: proofPacket.entityName,
      date: new Date().toISOString().slice(0, 10),
      question: proofPacket.query,
      answer: proofPacket.answer,
      confidence: proofPacket.confidence,
      sourceCount: proofPacket.sourceCount,
      variables: proofPacket.variables.map((v) => ({
        rank: v.rank,
        name: v.name,
        direction: v.direction,
        impact: v.impact,
      })),
      scenarios: proofPacket.scenarios?.map((s) => ({
        label: s.label,
        probability: s.probability,
        outcome: s.outcome,
      })) ?? [],
      actions: proofPacket.interventions?.map((a) => ({
        action: a.action,
        impact: a.impact,
      })) ?? proofPacket.nextQuestions?.slice(0, 3).map((q) => ({
        action: q,
        impact: "medium" as const,
      })) ?? [],
    };
    saveMemoToStorage(memoData);
    copyMemoUrl(id);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  }, [proofPacket]);

  const handleCopyPrompt = useCallback(async () => {
    if (!handoffState?.handoffPrompt || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(handoffState.handoffPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  }, [handoffState?.handoffPrompt]);

  const handleCopySlackReport = useCallback(async () => {
    const artifact = proofPacket.shareableArtifacts.find((item) => item.type === "slack_onepage");
    const text = typeof artifact?.payload?.text === "string" ? artifact.payload.text : null;
    if (!text || !navigator.clipboard?.writeText) return;
    await navigator.clipboard.writeText(text);
    setCopiedSlackReport(true);
    setTimeout(() => setCopiedSlackReport(false), 2500);
  }, [proofPacket.shareableArtifacts]);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* ── Header bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-content truncate">{proofPacket.entityName}</h2>
          <p className="text-xs text-content-muted mt-0.5 truncate">{proofPacket.query}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <ConfidenceBadge value={proofPacket.confidence} />
          <ProofStatusBadge value={proofPacket.proofStatus} />
          <VisibilityBadge value={proofPacket.visibility} />
          <SyncProvenanceBadge compact />
          <span className="text-[11px] text-content-muted">
            {proofPacket.explorationMemory.citedSourceCount}/
            {proofPacket.explorationMemory.exploredSourceCount} cited
          </span>
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

      {/* ── Sources bar ───────────────────────────────────────────────────── */}
      {proofPacket.sourceRefs.length > 0 && (
        <SourcesBar sources={proofPacket.sourceRefs} />
      )}

      {/* ── 1. Entity Truth ────────────────────────────────────────────────── */}
      <Section id="truth" icon={BookOpen} title="Entity Truth">
        <p className="text-sm leading-relaxed text-content">{proofPacket.answer}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr]">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-content-muted">
              Uncertainty Boundary
            </div>
            <p className="mt-2 text-xs leading-relaxed text-content-muted">
              {proofPacket.uncertaintyBoundary}
            </p>
          </div>
          <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/[0.05] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#f2b49f]">
              Recommended Next Action
            </div>
            <p className="mt-2 text-sm leading-relaxed text-content">
              {proofPacket.recommendedNextAction}
            </p>
          </div>
        </div>
        {proofPacket.keyMetrics && proofPacket.keyMetrics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-4">
            {proofPacket.keyMetrics.map((m) => (
              <div key={m.label} className="min-w-[100px]">
                <div className="text-[10px] uppercase tracking-[0.15em] text-content-muted">{m.label}</div>
                <div className="mt-0.5 text-lg font-bold tabular-nums text-content">{m.value}</div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="memory" icon={Layers3} title="Exploration Memory">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {[
            ["Sources explored", proofPacket.explorationMemory.exploredSourceCount],
            ["Sources cited", proofPacket.explorationMemory.citedSourceCount],
            ["Sources dropped", proofPacket.explorationMemory.discardedSourceCount],
            ["Entities retained", proofPacket.explorationMemory.entityCount],
            ["Claims retained", proofPacket.explorationMemory.claimCount],
            ["Contradictions", proofPacket.explorationMemory.contradictionCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
            >
              <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                {label}
              </div>
              <div className="mt-1 text-lg font-semibold text-content">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {proofPacket.answerBlocks.map((block, index) => {
            const isActive = activeAnswerBlock?.id === block.id;
            return (
              <button
                key={block.id}
                type="button"
                onClick={() => {
                  setSelectedAnswerBlockId(block.id);
                  setSelectedSourceId(block.sourceRefIds[0] ?? null);
                }}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                  isActive
                    ? "border-[#d97757]/30 bg-[#d97757]/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.06] text-[10px] font-semibold text-content-muted">
                      {index + 1}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-content">{block.title}</div>
                      <div className="mt-1 text-[11px] text-content-muted">
                        {block.sourceRefIds.length} linked sources · {block.claimIds.length} linked claims
                      </div>
                    </div>
                  </div>
                  <SourceStatusBadge value={block.status} />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-content-muted">
                  {block.text}
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {proofPacket.strategicAngles.length > 0 && (
        <Section
          id="pressure-test"
          icon={GitCompare}
          title={lens === "founder" ? "Founder Pressure Test" : "Strategic Pressure Test"}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {proofPacket.strategicAngles.map((angle) => (
              <div
                key={angle.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-content">{angle.title}</div>
                    <div className="mt-1 text-xs leading-relaxed text-content-muted">
                      {angle.summary}
                    </div>
                  </div>
                  <StrategicAngleStatusBadge value={angle.status} />
                </div>
                <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                    Why this matters
                  </div>
                  <div className="mt-1 text-xs leading-relaxed text-content-muted">
                    {angle.whyItMatters}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {angle.evidenceRefIds.slice(0, 2).map((sourceId) => {
                    const source = proofPacket.sourceRefs.find((item) => item.id === sourceId);
                    if (!source) return null;
                    return (
                      <button
                        key={sourceId}
                        type="button"
                        onClick={() => setSelectedSourceId(sourceId)}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-content-muted transition-colors hover:border-[#d97757]/30 hover:text-content"
                      >
                        {source.label}
                      </button>
                    );
                  })}
                </div>
                {angle.nextQuestion && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onFollowUp?.(angle.nextQuestion!)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#d97757]/20 bg-[#d97757]/10 px-3 py-2 text-xs font-medium text-[#f2b49f] transition hover:bg-[#d97757]/15"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      {angle.nextQuestion}
                    </button>
                    {onPublishStrategicAngle ? (
                      <button
                        type="button"
                        onClick={() => onPublishStrategicAngle(angle.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-content-secondary transition hover:border-white/[0.14] hover:text-content"
                      >
                        <Network className="h-3.5 w-3.5" />
                        Publish issue packet
                      </button>
                    ) : null}
                    {onDelegateStrategicAngle && angle.status !== "strong" ? (
                      <button
                        type="button"
                        onClick={() => onDelegateStrategicAngle(angle.id, "claude_code")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Delegate issue
                      </button>
                    ) : null}
                  </div>
                )}
                {!angle.nextQuestion && (onPublishStrategicAngle || onDelegateStrategicAngle) ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {onPublishStrategicAngle ? (
                      <button
                        type="button"
                        onClick={() => onPublishStrategicAngle(angle.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-content-secondary transition hover:border-white/[0.14] hover:text-content"
                      >
                        <Network className="h-3.5 w-3.5" />
                        Publish issue packet
                      </button>
                    ) : null}
                    {onDelegateStrategicAngle && angle.status !== "strong" ? (
                      <button
                        type="button"
                        onClick={() => onDelegateStrategicAngle(angle.id, "claude_code")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        <ArrowRight className="h-3.5 w-3.5" />
                        Delegate issue
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      )}

      {lens === "founder" && proofPacket.progressionProfile ? (
        <Section id="progression" icon={Briefcase} title="Founder Progression Layer">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Current Stage</div>
                  <div className="mt-1 text-sm font-medium text-content">{proofPacket.progressionProfile.currentStageLabel}</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Readiness</div>
                  <div className="mt-1 text-sm font-medium text-content">{proofPacket.progressionProfile.readinessScore}/100</div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Status</div>
                  <div className="mt-1 text-sm font-medium text-content">
                    {proofPacket.progressionProfile.onTrackStatus.replace("_", " ")}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Missing Foundations</div>
                  <div className="mt-2 space-y-2 text-xs leading-relaxed text-content-muted">
                    {(proofPacket.progressionProfile.missingFoundations.length > 0
                      ? proofPacket.progressionProfile.missingFoundations
                      : ["No obvious missing foundations flagged in this packet."]
                    ).map((item) => (
                      <div key={item}>• {item}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Hidden Risks</div>
                  <div className="mt-2 space-y-2 text-xs leading-relaxed text-content-muted">
                    {(proofPacket.progressionProfile.hiddenRisks.length > 0
                      ? proofPacket.progressionProfile.hiddenRisks.slice(0, 4)
                      : ["No hidden risks surfaced yet."]
                    ).map((item) => (
                      <div key={item}>• {item}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Delegable Work</div>
                  <div className="mt-2 space-y-2 text-xs leading-relaxed text-content-muted">
                    {proofPacket.progressionProfile.delegableWork.map((item) => (
                      <div key={item}>• {item}</div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Founder-only Work</div>
                  <div className="mt-2 space-y-2 text-xs leading-relaxed text-content-muted">
                    {proofPacket.progressionProfile.founderOnlyWork.map((item) => (
                      <div key={item}>• {item}</div>
                    ))}
                  </div>
                </div>
              </div>

              {proofPacket.companyNamingPack ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Starter Company Profile</div>
                      <div className="mt-1 text-sm font-medium text-content">
                        {proofPacket.companyNamingPack.recommendedName}
                      </div>
                    </div>
                    <VisibilityBadge value={proofPacket.visibility} />
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-content-muted">
                    {proofPacket.companyNamingPack.starterProfile.oneLineDescription}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {proofPacket.companyNamingPack.suggestedNames.slice(0, 5).map((name) => (
                      <span
                        key={name}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-content-muted"
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                  Pricing and Unlock Progress
                </div>
                <div className="mt-2 space-y-2">
                  {proofPacket.progressionTiers.map((tier) => {
                    const isCurrent = tier.id === proofPacket.progressionProfile.currentStage;
                    return (
                      <div
                        key={tier.id}
                        className={`rounded-lg border px-3 py-2 ${
                          isCurrent
                            ? "border-[#d97757]/30 bg-[#d97757]/[0.06]"
                            : "border-white/[0.06] bg-black/20"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-content">{tier.label}</div>
                            <div className="mt-1 text-[11px] text-content-muted">{tier.priceLabel}</div>
                          </div>
                          <StrategicAngleStatusBadge value={isCurrent ? "strong" : "unknown"} />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {tier.unlocks.slice(0, 3).map((unlock) => (
                            <span
                              key={unlock}
                              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-content-muted"
                            >
                              {unlock}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Recommended Next Unlocks</div>
                <div className="mt-2 space-y-2">
                  {proofPacket.unlocks.map((unlock) => (
                    <div key={unlock.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-content">{unlock.title}</div>
                        <StrategicAngleStatusBadge value={unlock.status === "ready" ? "strong" : unlock.status === "watch" ? "watch" : "unknown"} />
                      </div>
                      <div className="mt-1 text-[11px] text-content-muted">
                        {unlock.requiredSignals.join(" · ")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Qualification Gaps and Materials</div>
                <div className="mt-2 space-y-2 text-xs leading-relaxed text-content-muted">
                  {proofPacket.materialsChecklist.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                      <div>
                        <div className="text-sm text-content">{item.label}</div>
                        <div className="mt-1 text-[11px] text-content-muted">{item.whyItMatters}</div>
                      </div>
                      <StrategicAngleStatusBadge value={item.status === "ready" ? "strong" : item.status === "watch" ? "watch" : "unknown"} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                    Operating Model and Packet Router
                  </div>
                  <VisibilityBadge value={proofPacket.operatingModel.packetRouter.visibility} />
                </div>
                <div className="mt-2 text-sm font-medium text-content">
                  {proofPacket.operatingModel.packetRouter.packetType}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-content-muted">
                  {proofPacket.operatingModel.packetRouter.rationale}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      Company Mode
                    </div>
                    <div className="mt-1 text-sm text-content">
                      {proofPacket.operatingModel.packetRouter.companyMode.replaceAll("_", " ")}
                    </div>
                    <div className="mt-1 text-[11px] text-content-muted">
                      Action {proofPacket.operatingModel.packetRouter.shouldDelegate ? "delegate" : proofPacket.operatingModel.packetRouter.shouldExport ? "export" : proofPacket.operatingModel.packetRouter.shouldMonitor ? "monitor" : "investigate"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      Role Default
                    </div>
                    <div className="mt-1 text-sm text-content">
                      {proofPacket.operatingModel.roleDefault.defaultPacketType}
                    </div>
                    <div className="mt-1 text-[11px] text-content-muted">
                      Artifact {proofPacket.operatingModel.roleDefault.defaultArtifactType}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                    Canonical Execution Order
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {proofPacket.operatingModel.executionOrder.map((step) => (
                      <span
                        key={step.id}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-content-muted"
                      >
                        {step.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">2-week / 3-month Plan</div>
                <div className="mt-2 space-y-2">
                  {proofPacket.scorecards.map((scorecard) => (
                    <div key={scorecard.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-content">{scorecard.label}</div>
                        <StrategicAngleStatusBadge value={scorecard.status === "on_track" ? "strong" : scorecard.status === "watch" ? "watch" : "unknown"} />
                      </div>
                      <div className="mt-1 text-[11px] text-content-muted">{scorecard.summary}</div>
                      <div className="mt-2 space-y-1 text-[11px] text-content-muted">
                        {scorecard.mustHappen.map((item) => (
                          <div key={item}>• {item}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                  Vertical Diligence Pack
                </div>
                <div className="mt-1 text-sm font-medium text-content">{proofPacket.diligencePack.label}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-content-muted">
                  {proofPacket.diligencePack.summary}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      External Evaluators
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-content-muted">
                      {proofPacket.diligencePack.externalEvaluators.slice(0, 3).map((item) => (
                        <div key={item}>• {item}</div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      Ready Means
                    </div>
                    <div className="mt-2 text-[11px] leading-relaxed text-content-muted">
                      {proofPacket.diligencePack.readyDefinition}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                  Workflow Compare
                </div>
                <div className="mt-2 text-sm font-medium text-content">
                  {proofPacket.workflowComparison.objective}
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      Current Path
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-content-muted">
                      {proofPacket.workflowComparison.currentPath.map((step) => (
                        <div key={step}>• {step}</div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.06] px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                      Optimized Path
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-emerald-100/85">
                      {proofPacket.workflowComparison.optimizedPath.map((step) => (
                        <div key={step}>• {step}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-content-muted">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                    Time saved {proofPacket.workflowComparison.estimatedSavings.timePercent}%
                  </span>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                    Cost saved {proofPacket.workflowComparison.estimatedSavings.costPercent}%
                  </span>
                  <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
                    Verdict {proofPacket.workflowComparison.verdict}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {proofPacket.operatingModel.queueTopology.map((queue) => (
                    <div key={queue.id} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                      <div className="text-sm text-content">{queue.label}</div>
                      <div className="mt-1 text-[11px] text-content-muted">{queue.purpose}</div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {queue.outputs.slice(0, 3).map((job) => (
                          <span
                            key={job}
                            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-content-muted"
                          >
                            {job}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                  Benchmark Proof and Distribution
                </div>
                <div className="mt-3 space-y-2">
                  {proofPacket.benchmarkEvidence.slice(0, 2).map((benchmark) => (
                    <div key={benchmark.benchmarkId} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-content">{benchmark.lane}</div>
                        <span className="text-[11px] text-content-muted">
                          reuse {benchmark.reuseScore}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-content-muted">
                        {benchmark.summary}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {proofPacket.companyReadinessPacket.distributionSurfaceStatus.slice(0, 4).map((surface) => (
                    <div key={surface.surfaceId} className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm text-content">{surface.label}</div>
                        <StrategicAngleStatusBadge
                          value={surface.status === "ready" ? "strong" : surface.status === "partial" ? "watch" : "unknown"}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-content-muted">{surface.whyItMatters}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      Sharing Sensitivity
                    </div>
                    <VisibilityBadge value={proofPacket.companyReadinessPacket.sensitivity} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {proofPacket.companyReadinessPacket.allowedDestinations.map((destination) => (
                      <span
                        key={destination}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-content-muted"
                      >
                        {destination}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      Source Trust Policy
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-content-muted">
                      {proofPacket.operatingModel.sourcePolicies.slice(0, 4).map((policy) => (
                        <div key={policy.sourceType}>
                          • {policy.sourceType.replaceAll("_", " ")}: {policy.exportPolicy.replaceAll("_", " ")}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                      Benchmark Oracles
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-content-muted">
                      {proofPacket.operatingModel.benchmarkOracles.slice(0, 2).map((oracle) => (
                        <div key={oracle.lane}>
                          • {oracle.lane.replaceAll("_", " ")}: {oracle.deterministicChecks[0]}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      <Section id="sources" icon={Waypoints} title="Source Map">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-2">
            {proofPacket.sourceRefs.map((source) => {
              const isPinned = selectedSourceId === source.id;
              const isHighlighted = activeSourceIds.has(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  onMouseEnter={() => setHoveredSourceId(source.id)}
                  onMouseLeave={() =>
                    setHoveredSourceId((current) => (current === source.id ? null : current))
                  }
                  onFocus={() => setHoveredSourceId(source.id)}
                  onBlur={() =>
                    setHoveredSourceId((current) => (current === source.id ? null : current))
                  }
                  onClick={() =>
                    setSelectedSourceId((current) => (current === source.id ? null : source.id))
                  }
                  aria-pressed={isPinned}
                  aria-label={`Source: ${source.title ?? source.label}${isPinned ? " (pinned)" : ""}`}
                  className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                    isPinned
                      ? "border-[#d97757]/30 bg-[#d97757]/[0.06]"
                      : isHighlighted
                        ? "border-emerald-500/20 bg-emerald-500/[0.05]"
                        : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-medium text-content">
                          {source.title ?? source.label}
                        </div>
                        <SourceStatusBadge value={source.status ?? "explored"} />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-content-muted">
                        <span>{source.domain}</span>
                        {source.publishedAt ? <span>{source.publishedAt}</span> : null}
                        <span>{source.confidence ?? proofPacket.confidence}% confidence</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {source.href ? (
                        <a
                          href={source.href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.04] p-1.5 text-content-muted transition-colors hover:text-content"
                          aria-label={`Open ${source.title ?? source.label}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      <span
                        className={`rounded-lg border p-1.5 ${
                          isPinned
                            ? "border-[#d97757]/30 bg-[#d97757]/10 text-[#f2b49f]"
                            : "border-white/[0.06] bg-white/[0.04] text-content-muted"
                        }`}
                        aria-hidden="true"
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-content-muted">
                    {source.excerpt}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-content-muted">
              Source Preview
            </div>
            {activeSource ? (
              <div className="mt-3 space-y-3">
                <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  {activeSource.thumbnailUrl ? (
                    <img
                      src={activeSource.thumbnailUrl}
                      alt={activeSource.title ?? activeSource.label}
                      className="h-32 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(217,119,87,0.18),_transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))] px-5 text-center text-xs text-content-muted">
                      Thumbnail unavailable. Showing structured preview from retained source metadata.
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-content">
                    {activeSource.title ?? activeSource.label}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-content-muted">
                    <span>{activeSource.domain}</span>
                    <span>{activeSource.type ?? "doc"}</span>
                    {activeSource.publishedAt ? <span>{activeSource.publishedAt}</span> : null}
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-content-muted">{activeSource.excerpt}</p>
                <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">
                    Linked Answer Block
                  </div>
                  <div className="mt-2 text-sm text-content">
                    {activeAnswerBlock?.title ?? "Executive Summary"}
                  </div>
                  <div className="mt-1 text-xs text-content-muted">
                    {activeClaims.length
                      ? `${activeClaims.length} supporting claims linked`
                      : "No retained claims linked yet"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-white/[0.08] px-4 py-5 text-xs leading-relaxed text-content-muted">
                Hover or pin a cited source to inspect its preview, linked claims, and original location.
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section id="graph" icon={Network} title="Connection Graph">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex flex-wrap gap-2">
              {proofPacket.graphSummary.primaryPath.map((step) => (
                <span
                  key={step}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-content-muted"
                >
                  {step}
                </span>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Nodes</div>
                <div className="mt-1 text-lg font-semibold text-content">
                  {proofPacket.graphSummary.nodeCount}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Edges</div>
                <div className="mt-1 text-lg font-semibold text-content">
                  {proofPacket.graphSummary.edgeCount}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Clusters</div>
                <div className="mt-1 text-lg font-semibold text-content">
                  {proofPacket.graphSummary.clusterCount}
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-content-muted">
              Hierarchical Trace Path
            </div>
            <div className="mt-3 space-y-2">
              {[
                `Query -> ${proofPacket.query}`,
                `Lens -> ${lens}`,
                `Persona -> ${proofPacket.graphNodes.find((node) => node.kind === "persona")?.label ?? "Unknown"}`,
                `Answer block -> ${activeAnswerBlock?.title ?? proofPacket.answerBlocks[0]?.title ?? "Summary"}`,
                `Source -> ${activeSource?.label ?? proofPacket.sourceRefs[0]?.label ?? "Awaiting source"}`,
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-xs text-content-muted"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── 2. What Changed / Why Now ──────────────────────────────────────── */}
      {proofPacket.changes && proofPacket.changes.length > 0 && (
        <Section id="changes" icon={TrendingUp} title="What Changed / Why Now">
          <div className="space-y-2.5">
            {proofPacket.changes.map((c, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#d97757]/10 text-[10px] font-bold text-[#d97757]">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <span className="text-content">{c.description}</span>
                  {c.sourceIdx != null && (
                    <CitationFootnote
                      index={c.sourceIdx}
                      source={proofPacket.sourceRefs[c.sourceIdx]}
                    />
                  )}
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
          {proofPacket.variables.map((v) => (
            <div key={v.rank} className="flex items-center gap-3 text-sm">
              <span className="w-5 text-right text-[11px] tabular-nums text-content-muted">{v.rank}</span>
              <DirectionArrow direction={v.direction} />
              <span className="flex-1 text-content">
                {v.name}
                {v.sourceIdx != null && (
                  <CitationFootnote
                    index={v.sourceIdx}
                    source={proofPacket.sourceRefs[v.sourceIdx]}
                  />
                )}
              </span>
              <ImpactTag impact={v.impact} />
            </div>
          ))}
        </div>
      </Section>

      {/* ── 4. Risks / Contradictions ──────────────────────────────────────── */}
      {proofPacket.risks && proofPacket.risks.length > 0 && (
        <Section id="risks" icon={AlertTriangle} title="Risks / Contradictions">
          <div className="space-y-3">
            {proofPacket.risks.map((r, i) => (
              <div key={i} className="rounded-lg border border-rose-500/10 bg-rose-500/[0.03] p-3">
                <div className="text-sm font-medium text-content">
                  {r.title}
                  {r.sourceIdx != null && (
                    <CitationFootnote
                      index={r.sourceIdx}
                      source={proofPacket.sourceRefs[r.sourceIdx]}
                    />
                  )}
                </div>
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
      {proofPacket.comparables && proofPacket.comparables.length > 0 && (
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
                {proofPacket.comparables.map((c) => (
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
      {proofPacket.nextQuestions && proofPacket.nextQuestions.length > 0 && (
        <Section id="next" icon={HelpCircle} title="Recommended Next Questions">
          <div className="space-y-2">
            {proofPacket.nextQuestions.map((q, i) => (
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
          {proofPacket.shareableArtifacts.some((item) => item.type === "slack_onepage") ? (
            <button
              type="button"
              onClick={handleCopySlackReport}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              {copiedSlackReport ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
              {copiedSlackReport ? "Slack report copied" : "Report for Slack"}
            </button>
          ) : null}
        </div>
      </Section>

      {/* ── 8. Keep Warm / Monitor ─────────────────────────────────────────── */}
      {(onPublishSharedContext || onDelegate) && (
        <Section id="delegate" icon={Share2} title="Publish and Delegate" defaultOpen={false}>
          <div className="flex flex-wrap gap-2">
            {onPublishSharedContext ? (
              <button
                type="button"
                onClick={onPublishSharedContext}
                disabled={handoffBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-content transition-all hover:border-[#d97757]/20 hover:bg-[#d97757]/[0.04] hover:text-[#d97757] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Share2 className="h-4 w-4" />
                Publish to Shared Context
              </button>
            ) : null}
            {onDelegate ? (
              <button
                type="button"
                onClick={() => onDelegate("claude_code")}
                disabled={handoffBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-[#d97757] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c96a4d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight className="h-4 w-4" />
                Delegate to Claude Code
              </button>
            ) : null}
            {onDelegate ? (
              <button
                type="button"
                onClick={() => onDelegate("openclaw")}
                disabled={handoffBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-sm font-medium text-content transition-all hover:border-[#d97757]/20 hover:bg-[#d97757]/[0.04] hover:text-[#d97757] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowRight className="h-4 w-4" />
                Delegate to OpenClaw
              </button>
            ) : null}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-content-muted">
            Publish this result as a versioned shared-context packet, then hand the same packet to a coding agent so the company truth does not have to be restated across separate threads.
          </p>
          {handoffState?.status && handoffState.status !== "idle" ? (
            <div
              className={`mt-3 rounded-xl border px-3 py-3 text-sm ${
                handoffState.status === "error"
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              <div className="font-medium">{handoffState.message}</div>
              {(handoffState.contextId || handoffState.taskId) ? (
                <div className="mt-1 text-xs opacity-90">
                  {handoffState.contextId ? `Context ${handoffState.contextId}` : ""}
                  {handoffState.contextId && handoffState.taskId ? " · " : ""}
                  {handoffState.taskId ? `Task ${handoffState.taskId}` : ""}
                </div>
              ) : null}
              {handoffState.installCommand ? (
                <div className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-[11px] text-content-secondary">
                  {handoffState.installCommand}
                </div>
              ) : null}
            </div>
          ) : null}
          {handoffState?.handoffPrompt ? (
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">
                  Agent Handoff Prompt
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyPrompt()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-content-muted transition-colors hover:bg-white/[0.08] hover:text-content"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCopy className="h-3 w-3" />
                      Copy prompt
                    </>
                  )}
                </button>
              </div>
              <pre className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-content-secondary">
                {handoffState.handoffPrompt}
              </pre>
            </div>
          ) : null}
        </Section>
      )}

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
