import { memo, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  BookOpen,
  Download,
  ExternalLink,
  GitCompare,
  Layers3,
  Network,
  Share2,
} from "lucide-react";
import { TrajectoryPanel } from "@/features/telemetry/TrajectoryPanel";
import type { TrajectoryData } from "@/features/telemetry/types";
import { CitationFootnote } from "./CitationFootnote";
import { ForecastGateCard } from "./ForecastGateCard";
import { ensureProofPacket, type ProofReadyResultPacket } from "./proofModel";
import { SourcesBar } from "./SourcesBar";
import { DCFCard } from "./DCFCard";
import { DelegationModal } from "./DelegationModal";
import type { LensId, ResultPacket } from "./searchTypes";

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

type LineItem = {
  text: string;
  sourceIds: string[];
};

function Section({
  id,
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  icon: ElementType;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`result-${id}`}
      >
        <Icon className="h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          {title}
        </span>
        <span className={`text-content-muted transition-transform text-xs ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      {open ? (
        <div id={`result-${id}`} className="border-t border-white/[0.06] px-5 py-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const tone =
    value >= 75
      ? "bg-emerald-500/15 text-emerald-300"
      : value >= 50
        ? "bg-amber-500/15 text-amber-300"
        : "bg-rose-500/15 text-rose-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{value}% confidence</span>;
}

function ProofBadge({ value }: { value: ProofReadyResultPacket["proofStatus"] }) {
  const tone =
    value === "verified"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : value === "drifting"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
        : value === "incomplete"
          ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
          : "border-[#d97757]/20 bg-[#d97757]/10 text-[#f2b49f]";
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {value}
    </span>
  );
}

function VisibilityBadge({ value }: { value: ProofReadyResultPacket["visibility"] }) {
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

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs font-medium text-content-secondary transition hover:border-white/[0.14] hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
      onClick={onClick}
      disabled={disabled || !onClick}
    >
      {children}
    </button>
  );
}

function dedupeLines(lines: LineItem[]): LineItem[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.text.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function splitSentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isLowSignalClaim(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const words = trimmed.split(/\s+/).filter(Boolean);
  const hasDigits = /\d/.test(trimmed);
  const hasSentencePunctuation = /[.!?:]/.test(trimmed);
  const looksLikePersonName = /^[A-Z][a-z]+(?:\s+[A-Z][a-z.]+){0,2}$/.test(trimmed);
  const looksLikeInitialSequence = /^(?:[A-Z]\.)+(?:\s+[A-Z]\.)*$/.test(trimmed) || /^[A-Z]\.$/.test(trimmed);
  if (looksLikePersonName || looksLikeInitialSequence) return true;
  if (words.length <= 3 && !hasDigits && !hasSentencePunctuation) return true;
  if (trimmed.length < 24 && !hasDigits && !hasSentencePunctuation) return true;
  return false;
}

function buildHeadlineClaim(packet: ProofReadyResultPacket): LineItem | null {
  const answerBlock = packet.answerBlocks.find((block) => block.status !== "discarded" && block.text.trim().length > 0);
  const answerSentence = answerBlock ? splitSentences(answerBlock.text)[0] : splitSentences(packet.answer)[0];
  if (answerSentence) {
    return {
      text: answerSentence,
      sourceIds: answerBlock?.sourceRefIds ?? packet.sourceRefs.slice(0, 1).map((source) => source.id),
    };
  }
  return null;
}

function buildSummaryClaims(packet: ProofReadyResultPacket): LineItem[] {
  const claimLines = packet.claimRefs
    .filter((claim) => claim.status !== "discarded" && !isLowSignalClaim(claim.text))
    .slice(0, 5)
    .map((claim) => ({ text: claim.text, sourceIds: claim.sourceRefIds }));
  if (claimLines.length > 0) return dedupeLines(claimLines);
  const fallbackSourceIds = packet.answerBlocks[0]?.sourceRefIds ?? packet.sourceRefs.slice(0, 1).map((source) => source.id);
  const answerLines = splitSentences(packet.answer)
    .filter((text) => !isLowSignalClaim(text))
    .map((text) => ({
      text,
      sourceIds: fallbackSourceIds,
    }));
  const metricLines = (packet.keyMetrics ?? []).slice(0, 3).map((metric) => ({
    text: `${metric.label}: ${metric.value}`,
    sourceIds: fallbackSourceIds,
  }));
  const changeLines = (packet.changes ?? []).slice(0, 2).map((change) => ({
    text: change.date ? `${change.description} (${change.date})` : change.description,
    sourceIds: fallbackSourceIds,
  }));
  const riskLines = (packet.risks ?? []).slice(0, 2).map((risk) => ({
    text: risk.description ? `${risk.title}: ${risk.description}` : risk.title,
    sourceIds: fallbackSourceIds,
  }));
  return dedupeLines([...answerLines, ...metricLines, ...changeLines, ...riskLines]).slice(0, 5);
}

function buildObservedLines(packet: ProofReadyResultPacket): LineItem[] {
  const fromMetrics = (packet.keyMetrics ?? []).slice(0, 3).map((metric) => ({
    text: `${metric.label}: ${metric.value}`,
    sourceIds: packet.sourceRefs.slice(0, 1).map((source) => source.id),
  }));
  const fromSignals = packet.variables.slice(0, 3).map((signal) => ({
    text: signal.name,
    sourceIds:
      signal.sourceIdx !== undefined && packet.sourceRefs[signal.sourceIdx]
        ? [packet.sourceRefs[signal.sourceIdx]!.id]
        : packet.sourceRefs.slice(0, 1).map((source) => source.id),
  }));
  const fromChanges = (packet.changes ?? []).slice(0, 2).map((change) => ({
    text: change.date ? `${change.description} (${change.date})` : change.description,
    sourceIds:
      change.sourceIdx !== undefined && packet.sourceRefs[change.sourceIdx]
        ? [packet.sourceRefs[change.sourceIdx]!.id]
        : packet.sourceRefs.slice(0, 1).map((source) => source.id),
  }));
  return dedupeLines([...fromMetrics, ...fromSignals, ...fromChanges]).slice(0, 4);
}

function buildEstimatedLines(packet: ProofReadyResultPacket): LineItem[] {
  const estimatePattern = /\b(estimate|estimated|target|forecast|projected|valuation|arr|revenue|burn)\b/i;
  const claimEstimates = packet.claimRefs
    .filter((claim) => claim.status !== "discarded" && estimatePattern.test(claim.text))
    .map((claim) => ({ text: claim.text, sourceIds: claim.sourceRefIds }));
  const answerEstimates = splitSentences(packet.answer)
    .filter((sentence) => estimatePattern.test(sentence))
    .map((text) => ({
      text,
      sourceIds: packet.answerBlocks[0]?.sourceRefIds ?? packet.sourceRefs.slice(0, 1).map((source) => source.id),
    }));
  return dedupeLines([...claimEstimates, ...answerEstimates]).slice(0, 3);
}

function buildGapLines(packet: ProofReadyResultPacket): LineItem[] {
  const gaps: string[] = [
    ...(packet.progressionProfile.missingFoundations ?? []),
    ...(packet.companyReadinessPacket.contradictionsAndHiddenRisks ?? []),
    ...(packet.nextQuestions ?? []),
  ];
  return dedupeLines(
    gaps.map((text) => ({
      text,
      sourceIds: packet.sourceRefs.slice(0, 1).map((source) => source.id),
    })),
  ).slice(0, 4);
}

function buildComparables(packet: ProofReadyResultPacket) {
  return (packet.comparables ?? [])
    .filter((item) => item.name?.trim() || item.note?.trim())
    .slice(0, 6);
}

function buildDemoTrajectory(packet: ProofReadyResultPacket): TrajectoryData {
  const now = Date.now();
  const steps = [
    {
      id: "query",
      toolName: "receive_query",
      domain: "search",
      latencyMs: 18,
      status: "pass" as const,
      inputSummary: packet.query,
      outputPreview: `lens=${packet.operatingModel.packetRouter.role}`,
      timestamp: new Date(now - 900).toISOString(),
      tokenEstimate: 80,
    },
    {
      id: "proof",
      toolName: "assemble_packet",
      domain: "packet",
      latencyMs: 220,
      status: "pass" as const,
      inputSummary: `${packet.sourceRefs.length} retained sources`,
      outputPreview: `${packet.claimRefs.length} claims, ${packet.answerBlocks.length} answer blocks`,
      timestamp: new Date(now - 500).toISOString(),
      tokenEstimate: 340,
    },
    {
      id: "handoff",
      toolName: "prepare_next_move",
      domain: "workflow",
      latencyMs: 96,
      status: "pass" as const,
      inputSummary: packet.recommendedNextAction,
      outputPreview: packet.operatingModel.packetRouter.shouldDelegate ? "delegation available" : "follow-up only",
      timestamp: new Date(now - 120).toISOString(),
      tokenEstimate: 110,
    },
  ];
  return {
    query: packet.query,
    steps,
    totalLatencyMs: steps.reduce((sum, step) => sum + step.latencyMs, 0),
    toolCount: steps.length,
    totalTokenEstimate: steps.reduce((sum, step) => sum + (step.tokenEstimate ?? 0), 0),
    startedAt: new Date(now - 1000).toISOString(),
    completedAt: new Date(now).toISOString(),
  };
}

function ClaimLine({
  item,
  packet,
  sourceIndex,
}: {
  item: LineItem;
  packet: ProofReadyResultPacket;
  sourceIndex: Map<string, number>;
}) {
  return (
    <li className="text-sm leading-relaxed text-content">
      <span>{item.text}</span>
      <span className="ml-1 inline-flex items-center">
        {item.sourceIds.slice(0, 3).map((sourceId) => {
          const index = sourceIndex.get(sourceId);
          if (index === undefined) return null;
          return (
            <CitationFootnote
              key={sourceId}
              index={index}
              source={packet.sourceRefs[index]}
            />
          );
        })}
      </span>
    </li>
  );
}

function ClaimText({
  item,
  packet,
  sourceIndex,
  className,
}: {
  item: LineItem;
  packet: ProofReadyResultPacket;
  sourceIndex: Map<string, number>;
  className?: string;
}) {
  return (
    <div className={className}>
      <span>{item.text}</span>
      <span className="ml-1 inline-flex items-center align-middle">
        {item.sourceIds.slice(0, 3).map((sourceId) => {
          const index = sourceIndex.get(sourceId);
          if (index === undefined) return null;
          return (
            <CitationFootnote
              key={sourceId}
              index={index}
              source={packet.sourceRefs[index]}
            />
          );
        })}
      </span>
    </div>
  );
}

/* ── Tab IDs ────────────────────────────────────────────────────────── */
type ResultTab = "overview" | "analysis" | "actions" | "sources";

const TAB_LABELS: { id: ResultTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "analysis", label: "Analysis" },
  { id: "actions", label: "Actions" },
  { id: "sources", label: "Sources" },
];

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
  const [activeTab, setActiveTab] = useState<ResultTab>("overview");
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const proofPacket = useMemo(() => ensureProofPacket(packet, lens), [packet, lens]);
  const sourceIndex = useMemo(
    () => new Map(proofPacket.sourceRefs.map((source, index) => [source.id, index])),
    [proofPacket.sourceRefs],
  );
  const summaryClaims = useMemo(() => buildSummaryClaims(proofPacket), [proofPacket]);
  const observedLines = useMemo(() => buildObservedLines(proofPacket), [proofPacket]);
  const estimatedLines = useMemo(() => buildEstimatedLines(proofPacket), [proofPacket]);
  const gapLines = useMemo(() => buildGapLines(proofPacket), [proofPacket]);
  const comparables = useMemo(() => buildComparables(proofPacket), [proofPacket]);
  const citedCount = proofPacket.explorationMemory.citedSourceCount || proofPacket.sourceRefs.filter((source) => source.status === "cited").length;
  const exploredCount = proofPacket.explorationMemory.exploredSourceCount || proofPacket.sourceCount;
  const contradictions = (proofPacket.risks ?? []).slice(0, 3);
  const founderMove = proofPacket.recommendedNextAction;
  const diligenceMove = proofPacket.nextQuestions[0] ?? proofPacket.progressionProfile.hiddenRisks[0] ?? "Tighten the missing evidence before expanding the packet.";
  const delegationMove =
    handoffState?.message ??
    (proofPacket.operatingModel.packetRouter.shouldDelegate
      ? `Delegate ${proofPacket.packetType} with packet ${proofPacket.packetId}.`
      : "No bounded delegation is prepared yet.");
  const handoffBusy = handoffState?.status === "publishing" || handoffState?.status === "delegating";
  const trajectoryData = trajectory ?? buildDemoTrajectory(proofPacket);
  const headlineClaim = useMemo(() => buildHeadlineClaim(proofPacket), [proofPacket]);
  const supportingClaims = (headlineClaim
    ? summaryClaims.filter((claim) => claim.text !== headlineClaim.text)
    : summaryClaims
  ).slice(0, 2);
  const hasDCF = !!(proofPacket as any).dcf || !!(proofPacket as any).reverseDCF;
  const hasPain = Array.isArray((proofPacket as any).painResolutions) && (proofPacket as any).painResolutions.length > 0;

  return (
    <div className="space-y-3" data-testid="result-workspace">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          COMPACT HEADER — always visible, Crunchbase-style entity card
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold text-content truncate">{proofPacket.entityName}</h2>
            <div className="mt-0.5 text-xs text-content-muted">
              {lens} lens · {proofPacket.packetType.replace(/_/g, " ")}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ConfidenceBadge value={proofPacket.confidence} />
            <ProofBadge value={proofPacket.proofStatus} />
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-content-muted">
              {citedCount}/{exploredCount} cited
            </span>
          </div>
        </div>
        {headlineClaim ? (
          <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 px-4 py-3">
            <ClaimText
              item={headlineClaim}
              packet={proofPacket}
              sourceIndex={sourceIndex}
              className="text-sm leading-relaxed text-content"
            />
          </div>
        ) : null}
        {/* Key metrics — compact row */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <div><span className="text-content-muted">Claims </span><span className="font-semibold text-content">{summaryClaims.length}</span></div>
          <div><span className="text-content-muted">Contradictions </span><span className="font-semibold text-content">{proofPacket.explorationMemory.contradictionCount}</span></div>
          <div><span className="text-content-muted">Sources </span><span className="font-semibold text-content">{citedCount}</span></div>
          {hasDCF && <div><span className="text-content-muted">DCF </span><span className="font-semibold text-emerald-400">available</span></div>}
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TABS — Crunchbase/PitchBook style, one content area at a time
          ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1" role="tablist" aria-label="Result sections">
        {TAB_LABELS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${
              activeTab === tab.id
                ? "bg-white/[0.08] text-content shadow-sm"
                : "text-content-muted hover:text-content-secondary hover:bg-white/[0.03]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Overview ─────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="space-y-3" role="tabpanel" aria-label="Overview">
          <SourcesBar sources={proofPacket.sourceRefs} />

          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Founder Read</h3>
            </div>
            <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Bottom Line</div>
              {headlineClaim ? (
                <ClaimText
                  item={headlineClaim}
                  packet={proofPacket}
                  sourceIndex={sourceIndex}
                  className="mt-2 text-sm leading-relaxed text-content"
                />
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-content">{proofPacket.answer}</p>
              )}
            </div>
            {supportingClaims.length > 0 ? (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {supportingClaims.map((claim) => (
                  <div key={claim.text} className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3">
                    <ClaimText
                      item={claim}
                      packet={proofPacket}
                      sourceIndex={sourceIndex}
                      className="text-sm leading-relaxed text-content-secondary"
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Founder Truth</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {summaryClaims.map((claim) => (
                <ClaimLine key={claim.text} item={claim} packet={proofPacket} sourceIndex={sourceIndex} />
              ))}
            </ul>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Observed</div>
                <ul className="mt-3 space-y-2">
                  {observedLines.map((line) => (
                    <ClaimLine key={line.text} item={line} packet={proofPacket} sourceIndex={sourceIndex} />
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Estimated</div>
                <ul className="mt-3 space-y-2">
                  {(estimatedLines.length > 0 ? estimatedLines : [{ text: "No explicit estimate strong enough yet.", sourceIds: [] }]).map((line) =>
                    line.sourceIds.length > 0 ? (
                      <ClaimLine key={line.text} item={line} packet={proofPacket} sourceIndex={sourceIndex} />
                    ) : (
                      <li key={line.text} className="text-sm leading-relaxed text-content-muted">{line.text}</li>
                    ),
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/[0.05] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#f2b49f]">Missing To Believe This</div>
                <ul className="mt-3 space-y-2">
                  {gapLines.map((line) => (
                    <li key={line.text} className="text-sm leading-relaxed text-content">{line.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Why This Holds / Breaks</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Supported By</div>
                <div className="mt-2 text-2xl font-semibold text-content">{citedCount}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Contradicted By</div>
                <div className="mt-2 text-2xl font-semibold text-content">{proofPacket.explorationMemory.contradictionCount}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Uncertainty</div>
                <p className="mt-2 text-sm leading-relaxed text-content-muted">{proofPacket.uncertaintyBoundary}</p>
              </div>
            </div>
            {contradictions.length > 0 ? (
              <div className="mt-3 space-y-2">
                {contradictions.map((risk) => (
                  <div key={risk.title} className="rounded-xl border border-rose-500/10 bg-rose-500/[0.04] p-4">
                    <div className="text-sm font-medium text-content">{risk.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-content-muted">{risk.description}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {proofPacket.strategicAngles.slice(0, 2).map((angle) => (
              <div key={angle.id} className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-content">{angle.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">{angle.summary}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                    {angle.status}
                  </span>
                </div>
                {(onPublishStrategicAngle || onDelegateStrategicAngle) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton onClick={onPublishStrategicAngle ? () => onPublishStrategicAngle(angle.id) : undefined}>
                      Publish issue packet
                    </ActionButton>
                    <ActionButton onClick={onDelegateStrategicAngle ? () => onDelegateStrategicAngle(angle.id, "claude_code") : undefined}>
                      Delegate issue
                    </ActionButton>
                  </div>
                )}
              </div>
            ))}
          </section>

          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Next Move</h3>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Founder Move</div>
                <p className="mt-2 text-sm leading-relaxed text-content">{founderMove}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Diligence Move</div>
                <p className="mt-2 text-sm leading-relaxed text-content">{diligenceMove}</p>
                <div className="mt-3">
                  <ActionButton onClick={onFollowUp ? () => onFollowUp(diligenceMove) : undefined}>Run follow-up</ActionButton>
                </div>
              </div>
              <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/[0.05] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#f2b49f]">Delegation Move</div>
                <p className="mt-2 text-sm leading-relaxed text-content">{delegationMove}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton onClick={onPublishSharedContext} disabled={handoffBusy}>Publish to shared context</ActionButton>
                  <ActionButton onClick={onDelegate ? () => onDelegate("claude_code") : undefined} disabled={handoffBusy}>
                    Delegate to Claude Code
                  </ActionButton>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Ready Packet</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Packet</div>
                <div className="mt-2 text-sm font-medium text-content">{proofPacket.packetId}</div>
                <div className="mt-1 text-xs text-content-muted">{proofPacket.packetType} Â· {handoffState?.status ?? "idle"}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Workflow Asset</div>
                <div className="mt-2 text-sm font-medium text-content">{proofPacket.workflowAsset.assetId}</div>
                <div className="mt-1 text-xs text-content-muted">
                  {proofPacket.workflowAsset.assetType} Â· {proofPacket.workflowAsset.state}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Destinations</div>
                <div className="mt-2 text-sm font-medium text-content">
                  {(proofPacket.companyReadinessPacket.allowedDestinations ?? []).join(", ") || "No export route defined"}
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Workflow State</span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                  {proofPacket.workflowAsset.replayReady ? "replay ready" : "replay pending"}
                </span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                  {proofPacket.workflowAsset.delegationReady ? "delegation ready" : "delegation pending"}
                </span>
              </div>
              <div className="mt-2 text-xs leading-relaxed text-content-muted">
                {proofPacket.workflowAsset.stages.join(" -> ")}
              </div>
              {handoffState?.message ? <p className="mt-3 text-sm text-content">{handoffState.message}</p> : null}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-content-muted">
                <span>Context {handoffState?.contextId ?? proofPacket.workflowAsset.currentContextId ?? "pending"}</span>
                <span>Task {handoffState?.taskId ?? proofPacket.workflowAsset.lastTaskId ?? "pending"}</span>
              </div>
              {handoffState?.handoffPrompt ? (
                <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs leading-relaxed text-content-muted">
                  {handoffState.handoffPrompt}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton onClick={onExport ? () => onExport("brief") : undefined}><Download className="h-3.5 w-3.5" />Export packet</ActionButton>
              <ActionButton onClick={onPublishSharedContext} disabled={handoffBusy}><Share2 className="h-3.5 w-3.5" />Publish to shared context</ActionButton>
              <ActionButton onClick={onDelegate ? () => onDelegate("openclaw") : undefined} disabled={handoffBusy}><ExternalLink className="h-3.5 w-3.5" />Delegate to OpenClaw</ActionButton>
              <ActionButton onClick={() => setActiveTab("sources")}><Network className="h-3.5 w-3.5" />Inspect sources</ActionButton>
              <ActionButton onClick={onMonitor}><Bell className="h-3.5 w-3.5" />Monitor</ActionButton>
            </div>
          </section>
        </div>
      )}

      {/* ── TAB: Analysis ─────────────────────────────────────────────── */}
      {activeTab === "analysis" && (
        <div className="space-y-3" role="tabpanel" aria-label="Analysis">
          {/* Founder Truth */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Founder Truth</h3>
            </div>
            <ul className="mt-4 space-y-3">
              {summaryClaims.map((claim) => (
                <ClaimLine key={claim.text} item={claim} packet={proofPacket} sourceIndex={sourceIndex} />
              ))}
            </ul>
            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Observed</div>
                <ul className="mt-3 space-y-2">
                  {observedLines.map((line) => (
                    <ClaimLine key={line.text} item={line} packet={proofPacket} sourceIndex={sourceIndex} />
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Estimated</div>
                <ul className="mt-3 space-y-2">
                  {(estimatedLines.length > 0 ? estimatedLines : [{ text: "No explicit estimate strong enough yet.", sourceIds: [] }]).map((line) =>
                    line.sourceIds.length > 0 ? (
                      <ClaimLine key={line.text} item={line} packet={proofPacket} sourceIndex={sourceIndex} />
                    ) : (
                      <li key={line.text} className="text-sm leading-relaxed text-content-muted">{line.text}</li>
                    ),
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/[0.05] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#f2b49f]">Missing To Believe This</div>
                <ul className="mt-3 space-y-2">
                  {gapLines.map((line) => (
                    <li key={line.text} className="text-sm leading-relaxed text-content">{line.text}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Why This Holds / Breaks */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Why This Holds / Breaks</h3>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Supported By</div>
                <div className="mt-2 text-2xl font-semibold text-content">{citedCount}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Contradicted By</div>
                <div className="mt-2 text-2xl font-semibold text-content">{proofPacket.explorationMemory.contradictionCount}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Uncertainty</div>
                <p className="mt-2 text-sm leading-relaxed text-content-muted">{proofPacket.uncertaintyBoundary}</p>
              </div>
            </div>
            {contradictions.length > 0 && (
              <div className="mt-3 space-y-2">
                {contradictions.map((risk) => (
                  <div key={risk.title} className="rounded-xl border border-rose-500/10 bg-rose-500/[0.04] p-4">
                    <div className="text-sm font-medium text-content">{risk.title}</div>
                    <p className="mt-1 text-sm leading-relaxed text-content-muted">{risk.description}</p>
                  </div>
                ))}
              </div>
            )}
            {proofPacket.strategicAngles.slice(0, 2).map((angle) => (
              <div key={angle.id} className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-content">{angle.title}</div>
                    <p className="mt-1 text-xs leading-relaxed text-content-muted">{angle.summary}</p>
                  </div>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                    {angle.status}
                  </span>
                </div>
                {(onPublishStrategicAngle || onDelegateStrategicAngle) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton onClick={onPublishStrategicAngle ? () => onPublishStrategicAngle(angle.id) : undefined}>
                      Publish issue
                    </ActionButton>
                    <ActionButton onClick={onDelegateStrategicAngle ? () => onDelegateStrategicAngle(angle.id, "claude_code") : undefined}>
                      Delegate issue
                    </ActionButton>
                  </div>
                )}
              </div>
            ))}
          </section>
        </div>
      )}

      {/* ── TAB: Actions ──────────────────────────────────────────────── */}
      {activeTab === "actions" && (
        <div className="space-y-3" role="tabpanel" aria-label="Actions">
          {/* Next Move */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Next Move</h3>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Founder Move</div>
                <p className="mt-2 text-sm leading-relaxed text-content">{founderMove}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Diligence Move</div>
                <p className="mt-2 text-sm leading-relaxed text-content">{diligenceMove}</p>
                <div className="mt-3">
                  <ActionButton onClick={onFollowUp ? () => onFollowUp(diligenceMove) : undefined}>Run follow-up</ActionButton>
                </div>
              </div>
              <div className="rounded-xl border border-[#d97757]/20 bg-[#d97757]/[0.05] p-4">
                <div className="text-[10px] uppercase tracking-[0.16em] text-[#f2b49f]">Delegation Move</div>
                <p className="mt-2 text-sm leading-relaxed text-content">{delegationMove}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ActionButton onClick={onPublishSharedContext} disabled={handoffBusy}>Publish context</ActionButton>
                  <ActionButton onClick={onDelegate ? () => onDelegate("claude_code") : undefined} disabled={handoffBusy}>
                    Delegate
                  </ActionButton>
                </div>
              </div>
            </div>
          </section>

          {/* Ready Packet */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Ready Packet</h3>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Packet</div>
                <div className="mt-2 text-sm font-medium text-content">{proofPacket.packetId}</div>
                <div className="mt-1 text-xs text-content-muted">{proofPacket.packetType} · {handoffState?.status ?? "idle"}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Workflow Asset</div>
                <div className="mt-2 text-sm font-medium text-content">{proofPacket.workflowAsset.assetId}</div>
                <div className="mt-1 text-xs text-content-muted">
                  {proofPacket.workflowAsset.assetType} · {proofPacket.workflowAsset.state}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Destinations</div>
                <div className="mt-2 text-sm font-medium text-content">
                  {(proofPacket.companyReadinessPacket.allowedDestinations ?? []).join(", ") || "No export route defined"}
                </div>
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Workflow State</span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                  {proofPacket.workflowAsset.replayReady ? "replay ready" : "replay pending"}
                </span>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                  {proofPacket.workflowAsset.delegationReady ? "delegation ready" : "delegation pending"}
                </span>
              </div>
              <div className="mt-2 text-xs leading-relaxed text-content-muted">
                {proofPacket.workflowAsset.stages.join(" -> ")}
              </div>
              {handoffState?.message ? <p className="mt-3 text-sm text-content">{handoffState.message}</p> : null}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-content-muted">
                <span>Context {handoffState?.contextId ?? proofPacket.workflowAsset.currentContextId ?? "pending"}</span>
                <span>Task {handoffState?.taskId ?? proofPacket.workflowAsset.lastTaskId ?? "pending"}</span>
              </div>
              {handoffState?.handoffPrompt ? (
                <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] p-3 text-xs leading-relaxed text-content-muted">
                  {handoffState.handoffPrompt}
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <ActionButton onClick={onExport ? () => onExport("brief") : undefined}><Download className="h-3.5 w-3.5" />Export</ActionButton>
              <ActionButton onClick={onPublishSharedContext} disabled={handoffBusy}><Share2 className="h-3.5 w-3.5" />Publish</ActionButton>
              <ActionButton onClick={onDelegate ? () => onDelegate("openclaw") : undefined} disabled={handoffBusy}><ExternalLink className="h-3.5 w-3.5" />OpenClaw</ActionButton>
              <ActionButton onClick={() => setShowDelegationModal(true)} disabled={handoffBusy}><ArrowRight className="h-3.5 w-3.5" />Delegate with scope</ActionButton>
              <ActionButton onClick={onMonitor}><Bell className="h-3.5 w-3.5" />Monitor</ActionButton>
            </div>
          </section>
        </div>
      )}

      {/* ── TAB: Sources ──────────────────────────────────────────────── */}
      {activeTab === "sources" && (
        <div className="space-y-3" role="tabpanel" aria-label="Sources">
          {/* Inline source list — no collapsible wrapper needed */}
          <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Network className="h-4 w-4 text-content-muted" />
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">Sources ({proofPacket.sourceRefs.filter((s) => s.status !== "discarded").length})</h3>
            </div>
            <div className="space-y-2">
              {proofPacket.sourceRefs
                .filter((source) => source.status !== "discarded")
                .map((source, index) => (
                  <div key={source.id} className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#d97757]/15 text-[10px] font-bold text-[#d97757]">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-content truncate">{source.title ?? source.label}</div>
                      <div className="text-xs text-content-muted">{source.domain ?? source.type ?? "source"}</div>
                      {source.excerpt ? <p className="mt-1 text-xs leading-relaxed text-content-muted line-clamp-2">{source.excerpt}</p> : null}
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* Claim Ledger — compact */}
          <Section id="claims" title={`Claim Ledger (${proofPacket.claimRefs.length})`} icon={BookOpen}>
            <div className="space-y-2">
              {proofPacket.claimRefs.slice(0, 12).map((claim) => (
                <div key={claim.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                  <div className="text-sm leading-relaxed text-content">{claim.text}</div>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted shrink-0">
                    {claim.status}
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* Comparables */}
          {comparables.length > 0 && (
            <Section id="comparables" title={`Comparables (${comparables.length})`} icon={GitCompare}>
              <div className="space-y-2">
                {comparables.map((comparable) => (
                  <div key={`${comparable.name}-${comparable.note}`} className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                    <div>
                      <div className="text-sm font-medium text-content">{comparable.name || "Unnamed"}</div>
                      <p className="mt-1 text-xs text-content-muted">{comparable.note}</p>
                    </div>
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted shrink-0">
                      {comparable.relevance}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Agent Trajectory */}
          <Section id="trajectory" title="Agent Trajectory" icon={AlertTriangle}>
            <TrajectoryPanel data={trajectoryData} defaultCollapsed={false} />
          </Section>
        </div>
      )}

      {/* ── Delegation Modal ──────────────────────────────────────────── */}
      <DelegationModal
        isOpen={showDelegationModal}
        onClose={() => setShowDelegationModal(false)}
        packetId={proofPacket.packetId}
        packetSummary={headlineClaim?.text ?? proofPacket.answer}
      />
    </div>
  );
});

export default ResultWorkspace;
