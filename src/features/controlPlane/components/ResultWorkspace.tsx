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

  return (
    <div className="space-y-4" data-testid="result-workspace">
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">Founder Read</div>
            <h2 className="mt-1 text-lg font-semibold text-content">{proofPacket.entityName}</h2>
            <div className="mt-1 text-xs uppercase tracking-[0.14em] text-content-muted">
              {lens} lens · {proofPacket.packetType.replace(/_/g, " ")}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <ConfidenceBadge value={proofPacket.confidence} />
            <ProofBadge value={proofPacket.proofStatus} />
            <VisibilityBadge value={proofPacket.visibility} />
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-content-muted">
              {citedCount}/{exploredCount} cited
            </span>
          </div>
        </div>
        {headlineClaim ? (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-content-muted">Bottom Line</div>
            <ClaimText
              item={headlineClaim}
              packet={proofPacket}
              sourceIndex={sourceIndex}
              className="mt-2 text-sm leading-relaxed text-content"
            />
          </div>
        ) : null}
        {supportingClaims.length > 0 ? (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {supportingClaims.map((claim) => (
              <div key={claim.text} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
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
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Truth Claims</div>
            <div className="mt-1 text-lg font-semibold text-content">{summaryClaims.length}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Contradictions</div>
            <div className="mt-1 text-lg font-semibold text-content">{proofPacket.explorationMemory.contradictionCount}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Packet Type</div>
            <div className="mt-1 text-sm font-semibold text-content">{proofPacket.packetType}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Memory Status</div>
            <div className="mt-1 text-sm font-semibold text-content">
              {proofPacket.shareableArtifacts.length > 0 ? "compounding" : "packet only"}
            </div>
          </div>
        </div>
      </div>

      <SourcesBar sources={proofPacket.sourceRefs} />
      <ForecastGateCard gate={proofPacket.forecastGate} />

      {/* Pain resolutions — show which real problems this result solved */}
      {Array.isArray((proofPacket as any).painResolutions) && (proofPacket as any).painResolutions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {((proofPacket as any).painResolutions as Array<{ painId: string; painLabel: string; fix: string; proof: string }>).map((pr) => (
            <div key={pr.painId} className="group relative rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-400">{pr.painLabel}</span>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-content-muted">{pr.fix}</p>
            </div>
          ))}
        </div>
      )}

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
              {(estimatedLines.length > 0 ? estimatedLines : [{ text: "No explicit estimate is strong enough to elevate above the fold yet.", sourceIds: [] }]).map((line) =>
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
            <p className="mt-2 text-xs leading-relaxed text-content-muted">Cited sources attached to the packet, not just explored in the trace.</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Contradicted By</div>
            <div className="mt-2 text-2xl font-semibold text-content">{proofPacket.explorationMemory.contradictionCount}</div>
            <p className="mt-2 text-xs leading-relaxed text-content-muted">Tracked contradictions or unresolved conflicts in the retained packet.</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Packet Shortcut</div>
            <p className="mt-2 text-sm leading-relaxed text-content">{proofPacket.workflowComparison.rationale}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-3">
            {contradictions.map((risk) => (
              <div key={risk.title} className="rounded-xl border border-rose-500/10 bg-rose-500/[0.04] p-4">
                <div className="text-sm font-medium text-content">{risk.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-content-muted">{risk.description}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="text-[10px] uppercase tracking-[0.16em] text-content-muted">Uncertainty Boundary</div>
              <p className="mt-2 text-sm leading-relaxed text-content-muted">{proofPacket.uncertaintyBoundary}</p>
            </div>
            {proofPacket.strategicAngles.slice(0, 2).map((angle) => (
              <div key={angle.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
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
                    <ActionButton
                      onClick={
                        onDelegateStrategicAngle
                          ? () => onDelegateStrategicAngle(angle.id, "claude_code")
                          : undefined
                      }
                    >
                      Delegate issue
                    </ActionButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Packet Identity</div>
            <div className="mt-2 text-sm font-medium text-content">{proofPacket.packetId}</div>
            <div className="mt-1 text-xs text-content-muted">{proofPacket.packetType}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Shared Context Status</div>
            <div className="mt-2 text-sm font-medium text-content">{handoffState?.status ?? "idle"}</div>
            <div className="mt-1 text-xs text-content-muted">{handoffState?.message ?? "Packet has not been published yet."}</div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Allowed Destinations</div>
            <div className="mt-2 text-sm font-medium text-content">
              {(proofPacket.companyReadinessPacket.allowedDestinations ?? []).join(", ") || "No export route defined"}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Compounding Memory</div>
            <div className="mt-2 text-sm font-medium text-content">
              {proofPacket.shareableArtifacts.length > 0 ? `${proofPacket.shareableArtifacts.length} reusable artifact(s)` : "No reusable artifact yet"}
            </div>
          </div>
        </div>
        {(handoffState?.contextId || handoffState?.taskId || handoffState?.handoffPrompt) && (
          <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.14em] text-content-muted">Handoff Details</div>
            {handoffState?.contextId ? <div className="mt-2 text-sm text-content">Context {handoffState.contextId}</div> : null}
            {handoffState?.taskId ? <div className="mt-1 text-sm text-content">Task {handoffState.taskId}</div> : null}
            {handoffState?.handoffPrompt ? <p className="mt-2 text-xs leading-relaxed text-content-muted">{handoffState.handoffPrompt}</p> : null}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton onClick={onExport ? () => onExport("brief") : undefined}><Download className="h-3.5 w-3.5" />Export packet</ActionButton>
          <ActionButton onClick={onPublishSharedContext} disabled={handoffBusy}><Share2 className="h-3.5 w-3.5" />Publish and handoff</ActionButton>
          <ActionButton onClick={onDelegate ? () => onDelegate("openclaw") : undefined} disabled={handoffBusy}><ExternalLink className="h-3.5 w-3.5" />Delegate to OpenClaw</ActionButton>
          <ActionButton onClick={onMonitor}><Bell className="h-3.5 w-3.5" />Keep warm / monitor</ActionButton>
        </div>
      </section>

      <Section id="sources" title="Inspect Sources" icon={Network}>
        <div className="space-y-3">
          {proofPacket.sourceRefs
            .filter((source) => source.status !== "discarded")
            .map((source, index) => (
              <div key={source.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-content">{source.title ?? source.label}</div>
                    <div className="mt-1 text-xs text-content-muted">{source.domain ?? source.type ?? "source"}</div>
                  </div>
                  <span className="rounded-full bg-[#d97757]/15 px-2 py-0.5 text-[10px] font-bold text-[#d97757]">{index + 1}</span>
                </div>
                {source.excerpt ? <p className="mt-2 text-sm leading-relaxed text-content-muted">{source.excerpt}</p> : null}
              </div>
            ))}
        </div>
      </Section>

      <Section id="claims" title="Claim Ledger" icon={BookOpen}>
        <div className="space-y-3">
          {proofPacket.claimRefs.slice(0, 12).map((claim) => (
            <div key={claim.id} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm leading-relaxed text-content">{claim.text}</div>
                <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                  {claim.status}
                </span>
              </div>
              <div className="mt-2 inline-flex items-center">
                {claim.sourceRefIds.map((sourceId) => {
                  const index = sourceIndex.get(sourceId);
                  if (index === undefined) return null;
                  return <CitationFootnote key={sourceId} index={index} source={proofPacket.sourceRefs[index]} />;
                })}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="comparables" title="Comparables" icon={GitCompare}>
        {comparables.length > 0 ? (
          <div className="space-y-3">
            {comparables.map((comparable) => (
              <div key={`${comparable.name}-${comparable.note}`} className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-content">{comparable.name || "Unnamed comparable"}</div>
                  <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-content-muted">
                    {comparable.relevance}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-content-muted">{comparable.note}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4 text-sm text-content-muted">
            No reliable comparables are strong enough to surface yet.
          </div>
        )}
      </Section>

      <Section id="trajectory" title="Agent Trajectory" icon={AlertTriangle}>
        <TrajectoryPanel data={trajectoryData} defaultCollapsed={false} />
      </Section>
    </div>
  );
});

export default ResultWorkspace;
