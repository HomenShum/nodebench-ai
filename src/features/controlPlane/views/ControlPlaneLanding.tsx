/**
 * ControlPlaneLanding — Search-first entity intelligence canvas.
 *
 * Design reference stack:
 *   - PitchBook/Crunchbase simplicity (search-first entity profiles)
 *   - Perplexity Labs artifact-first (reports, sheets, decks from queries)
 *   - Bloomberg density (rich intelligence workspace after search)
 *   - Clado natural-language (describe what you need, not filter soup)
 *
 * The first interaction is: type, paste, or upload what you need to understand.
 * Not: pick a mode, configure agents, browse a dashboard.
 */

import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { useConvexSearch } from "@/hooks/useConvexSearch";
import { PUBLIC_SEARCH_API_ENDPOINT, PUBLIC_SEARCH_UPLOAD_API_ENDPOINT, PUBLIC_PIPELINE_API_ENDPOINT } from "@/lib/searchApi";
import {
  getFounderEpisodeFinalizeUrl,
  getFounderEpisodeStartUrl,
  getFounderEpisodesUrl,
  getSharedContextDelegateUrl,
  getSharedContextPublishUrl,
  getSubconsciousWhisperUrl,
} from "@/lib/syncBridgeApi";
import {
  ArrowRight,
  ArrowUp,
  Briefcase,
  Check,
  ClipboardCopy,
  GraduationCap,
  Landmark,
  Mic,
  Scale,
  Search,
  Sparkles,
  Upload,
  User,
} from "lucide-react";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { type MainView } from "@/lib/registry/viewRegistry";
import { trackEvent } from "@/lib/analytics";
import { ResultWorkspace } from "../components/ResultWorkspace";
import { ResultWorkspaceSkeleton } from "../components/ResultWorkspaceSkeleton";
import { LivePipelineProgress, type PipelineStep } from "../components/LivePipelineProgress";
import { PlanProposalPanel } from "@/features/founder/components/PlanProposalPanel";
import type { FeaturePlan } from "@/features/founder/types/planProposal";
import { SearchTrace, type TraceStep } from "../components/SearchTrace";
import { RecentSearchHistory, type RecentSearchHistoryItem } from "../components/RecentSearchHistory";
import {
  type LensId,
  type ResultPacket,
  LENSES,
  DEMO_PACKETS,
} from "../components/searchTypes";
import { ensureProofPacket } from "../components/proofModel";
import { ChatThread } from "../components/ChatThread";
import { EvidenceBoard, type EvidenceItem } from "../components/EvidenceBoard";
import type { ChatEntry } from "../components/ChatMessage";
import { FounderEpisodePanel, type FounderEpisodeRecord, type FounderEpisodeSpan } from "../components/FounderEpisodePanel";
import { ForecastGateCard } from "../components/ForecastGateCard";
import type { TrajectoryData } from "@/features/telemetry/types";

const SinceLastSession = lazy(() => import("../../founder/components/SinceLastSession"));
const FeedbackSummary = lazy(() => import("../../founder/components/FeedbackSummary").then(m => ({ default: m.FeedbackSummary })));

/* ─── Demo packet keyword aliases (shared across submit + example click) ── */

const DEMO_ALIASES: Record<string, string[]> = {
  anthropic: ["anthropic", "foundation model"],
  shopify: ["shopify", "ai commerce"],
  nodebench: ["weekly reset", "founder reset", "founder weekly"],
  legal_openai: ["legal risk", "data governance", "regulatory exposure", "openai enterprise"],
  student_shopify: ["plain language", "study brief", "student lens", "student summary"],
  banker_series_b: ["series b startup", "diligence memo", "banker lens", "meeting notes"],
  plan: ["plan a", "feature plan", "implementation plan", "should we build", "propose integration", "extension plan"],
};

function findDemoPacket(query: string): string | undefined {
  const lq = query.toLowerCase();
  const exactMatch = Object.keys(DEMO_PACKETS).find((key) => DEMO_PACKETS[key].query.toLowerCase() === lq);
  if (exactMatch) return exactMatch;

  const aliasMatch = Object.keys(DEMO_PACKETS).find((key) => {
    const aliases = DEMO_ALIASES[key];
    return aliases?.some((alias) => lq.includes(alias));
  });
  if (aliasMatch) return aliasMatch;

  return Object.keys(DEMO_PACKETS).find((key) => key !== "nodebench" && lq.includes(key));
}

function shouldPreferDemoPacket(demoKey?: string): boolean {
  if (!demoKey || typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const forceLiveSearch =
    params.get("liveSearch") === "1" ||
    window.localStorage.getItem("nodebench-force-live-search") === "1";
  if (forceLiveSearch) {
    return false;
  }

  const { hostname, port } = window.location;
  const isLocalShell = (hostname === "127.0.0.1" || hostname === "localhost") && port !== "8020";
  const forceDemo =
    params.get("demo") === "1" ||
    window.localStorage.getItem("nodebench-force-demo-packets") === "1";

  return isLocalShell || forceDemo;
}

function FounderLiveLoadingCard({
  query,
  lens,
}: {
  query: string;
  lens: LensId;
}) {
  const queryLabel = query.trim() || "your company";

  return (
    <div
      className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
      data-testid="landing-live-loading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#d97757]/20 bg-[#d97757]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f2b49f]">
            <Search className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Founder Research In Progress
          </div>
          <h2 className="mt-3 text-lg font-semibold text-content">
            Building a cited founder packet for {queryLabel}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-content-secondary">
            Cross-checking independent sources, separating observed facts from estimates, and preparing a clean next move through the {lens} lens.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-content-muted">
          No internal trace clutter while the packet is assembling
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "Truth",
            detail: "Find the canonical company record and filter out lookalikes or weak matches.",
          },
          {
            title: "Proof",
            detail: "Prefer external corroboration before promoting a claim into the surfaced packet.",
          },
          {
            title: "Handoff",
            detail: "Package the result so a founder, operator, or engineer can act on it immediately.",
          },
        ].map((step) => (
          <div
            key={step.title}
            className="rounded-xl border border-white/[0.06] bg-black/20 px-4 py-3"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">
              {step.title}
            </div>
            <div className="mt-2 text-sm leading-relaxed text-content">{step.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function slugifyValue(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getFounderHarnessSessionKey(): string {
  if (typeof window === "undefined") {
    return "session:ssr";
  }
  const existing = window.sessionStorage.getItem("nodebench-founder-session-key");
  if (existing) return existing;
  const created = `session:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem("nodebench-founder-session-key", created);
  return created;
}

/* ─── Lens icon map ──────────────────────────────────────────────────────── */

const LENS_ICONS: Record<LensId, React.ElementType> = {
  founder: Sparkles,
  investor: Briefcase,
  banker: Landmark,
  ceo: User,
  legal: Scale,
  student: GraduationCap,
};

/* ─── Install commands (collapsed below fold) ────────────────────────────── */

const INSTALL_COMMANDS = [
  { tab: "Claude Code", code: "claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon" },
  { tab: "Cursor", code: "npx -y nodebench-mcp --preset=hackathon", note: "Add to .cursor/mcp.json" },
  { tab: "Windsurf", code: "npx -y nodebench-mcp --preset=hackathon", note: "Add to .windsurf/mcp.json" },
  { tab: "Hackathon + QA", code: "RETENTION_TEAM=<CODE> curl -sL retention.sh/install.sh | bash && claude mcp add nodebench -- npx -y nodebench-mcp --preset=hackathon", note: "Full stack: intelligence + QA" },
] as const;

const SEARCH_STREAM_TIMEOUT_MS = 60_000;

type PacketLineageNode = {
  id: string;
  label: string;
  detail: string;
  status: "complete" | "active" | "pending";
};

type SubconsciousPreview = {
  mode: "off" | "whisper" | "packet" | "full" | "review";
  classification: string;
  whisperText: string;
  suppressed: boolean;
  suppressionReason?: string | null;
  contradictions: string[];
  stalePackets: string[];
  blockIdsUsed: string[];
};

// Persona-aware quick prompts — shown based on active lens
const LENS_QUICK_PROMPTS: Record<string, Array<{
  id: string;
  label: string;
  description: string;
  prompt: string;
}>> = {
  founder: [
    { id: "f1", label: "What am I actually building?", description: "Company truth, hidden requirements, and your next 3 moves.", prompt: "Analyze my startup and tell me what I am actually building, what is weak, and what to do next." },
    { id: "f2", label: "Who should I talk to first?", description: "Warm paths, decision-makers, and centers of influence.", prompt: "Who are the most important people I should reach out to in this space, and why?" },
    { id: "f3", label: "What changed recently?", description: "New signals, contradictions, and what matters now.", prompt: "What changed in the last 90 days that affects my company or market position?" },
    { id: "f4", label: "Compare me vs competitors", description: "Side-by-side brief with cited evidence.", prompt: "Compare my company against the top 3 competitors with evidence and positioning gaps." },
  ],
  investor: [
    { id: "i1", label: "Is this company investable?", description: "Team, traction, market, and hidden risks.", prompt: "Evaluate this company for investment: team quality, traction, market size, and hidden risks." },
    { id: "i2", label: "What would kill this deal?", description: "Contradictions, founder risks, and market gaps.", prompt: "What are the top reasons this investment could fail? Surface contradictions and hidden risks." },
    { id: "i3", label: "Find comparable deals", description: "Recent raises, valuations, and relevant exits.", prompt: "Find comparable funding rounds, valuations, and exits in this market segment." },
    { id: "i4", label: "Diligence this founder", description: "Track record, credibility signals, and red flags.", prompt: "Run diligence on this founder: background, track record, credibility signals, and any red flags." },
  ],
  banker: [
    { id: "b1", label: "Quick company snapshot", description: "2-minute brief for coverage prep.", prompt: "Give me a quick company snapshot: what they do, who matters, recent signals, and whether this is worth a follow-up." },
    { id: "b2", label: "Who are the decision-makers?", description: "Key people, titles, and relationship map.", prompt: "Who are the key decision-makers at this company and what is the best angle for outreach?" },
    { id: "b3", label: "CRM-ready meeting notes", description: "Turn this conversation into next steps.", prompt: "Turn my notes into CRM-ready output: who, company, context, why relevant, next action, and follow-up date." },
    { id: "b4", label: "Strategic buyer map", description: "Who would acquire this and why.", prompt: "Map the most relevant strategic buyers or sponsors for this company and explain the fit." },
  ],
  ceo: [
    { id: "c1", label: "What should I know about this company?", description: "Executive summary with risks and opportunities.", prompt: "Give me an executive summary of this company: what they do, strengths, risks, and why it matters." },
    { id: "c2", label: "Market landscape", description: "Key players, trends, and positioning.", prompt: "Map the market landscape: key players, recent trends, and where the opportunities are." },
    { id: "c3", label: "What would a board ask?", description: "The questions your board will have.", prompt: "What questions would a board of directors ask about this company or market?" },
    { id: "c4", label: "Compare two companies", description: "Side-by-side for decision-making.", prompt: "Compare these two companies head-to-head for a strategic decision." },
  ],
  legal: [
    { id: "l1", label: "Risk and compliance overview", description: "Regulatory exposure and legal signals.", prompt: "What are the key regulatory risks, compliance requirements, and legal signals for this company?" },
    { id: "l2", label: "Who are the key stakeholders?", description: "Ownership, investors, and governance.", prompt: "Map the ownership structure, key investors, and governance for this entity." },
    { id: "l3", label: "Recent material changes", description: "Filings, announcements, and legal events.", prompt: "What material changes, filings, or legal events happened recently for this company?" },
    { id: "l4", label: "Diligence checklist", description: "What to verify before proceeding.", prompt: "Generate a diligence checklist: what should be verified before making a decision on this entity?" },
  ],
  student: [
    { id: "s1", label: "Explain this company simply", description: "What they do, why they matter, in plain English.", prompt: "Explain this company in simple terms: what they do, why they matter, and what makes them interesting." },
    { id: "s2", label: "How does this industry work?", description: "Business model, value chain, and key players.", prompt: "Explain how this industry works: the business model, value chain, key players, and where the money flows." },
    { id: "s3", label: "What questions should I ask?", description: "The smart follow-up questions for learning.", prompt: "What are the most important follow-up questions I should ask to deeply understand this company or market?" },
    { id: "s4", label: "Career paths in this space", description: "Roles, skills, and how to break in.", prompt: "What are the main career paths in this industry and what skills matter most to break in?" },
  ],
};

// Fallback for any lens not explicitly mapped
const DEFAULT_QUICK_PROMPTS = LENS_QUICK_PROMPTS.founder!;

// Legacy type compat
const FOUNDER_QUICK_ACTIONS = DEFAULT_QUICK_PROMPTS.map((p) => ({
  ...p,
  lens: "founder" as LensId,
  kind: "prompt" as const,
}));

function buildSearchAbortSignal(controller: AbortController, timeoutMs: number): AbortSignal {
  const timeoutFactory = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout.bind(AbortSignal)
    : null;
  const anyFactory = typeof AbortSignal !== "undefined" && typeof AbortSignal.any === "function"
    ? AbortSignal.any.bind(AbortSignal)
    : null;

  if (!timeoutFactory) {
    return controller.signal;
  }

  const timeoutSignal = timeoutFactory(timeoutMs);
  if (!anyFactory) {
    return controller.signal;
  }

  return anyFactory([controller.signal, timeoutSignal]);
}

function buildTrajectoryFromSearchTrace(
  query: string,
  trace: TraceStep[],
  latencyMs: number,
): TrajectoryData {
  const completedAt = new Date().toISOString();
  return {
    query,
    steps: trace.map((step, index) => ({
      id: step.traceId ?? `${step.step}:${step.tool ?? "none"}:${index}`,
      toolName: step.tool ?? step.step,
      domain: step.tool ? "search" : "orchestration",
      latencyMs: step.durationMs ?? 0,
      status:
        step.status === "error"
          ? "fail"
          : step.isRunning
            ? "pending"
            : "pass",
      inputSummary: step.tool ? `${step.step} via ${step.tool}` : step.step,
      outputPreview: step.detail ?? step.status,
      timestamp: completedAt,
      tokenEstimate: 0,
    })),
    totalLatencyMs: latencyMs,
    toolCount: new Set(trace.map((step) => step.tool ?? step.step)).size,
    totalTokenEstimate: 0,
    startedAt: new Date(Date.now() - Math.max(latencyMs, 0)).toISOString(),
    completedAt,
  };
}

function collectTraceTools(traceEntries: TraceStep[]): string[] {
  return Array.from(
    new Set(
      traceEntries
        .flatMap((step) => String(step.tool ?? "").split(","))
        .map((tool) => tool.trim())
        .filter(Boolean),
    ),
  );
}

function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const deduped: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

function looksStructuredMetric(metric: { label?: string; value?: string } | null | undefined): boolean {
  const label = String(metric?.label ?? "").trim().toLowerCase();
  const value = String(metric?.value ?? "").trim();
  if (!label || !value) return false;
  if (["confidence", "changes", "contradictions", "actions"].includes(label)) return false;
  return /[$€£]?\d/.test(value) || /%|x\b|basis points|bps/i.test(value);
}

function scorePacketCandidate(packet: ResultPacket | null | undefined): number {
  if (!packet) return -1;

  const answer = packet.answer?.trim() ?? "";
  const sourceRefs = packet.sourceRefs ?? [];
  const answerBlocks = packet.answerBlocks ?? [];
  const keyMetrics = packet.keyMetrics ?? [];
  const comparables = packet.comparables ?? [];
  const risks = packet.risks ?? [];
  const changes = packet.changes ?? [];

  let score = 0;
  if (answer.length >= 120) score += 20;
  if (answer.length >= 260) score += 8;
  if (/\$|\d+%|\billion\b|\bmillion\b/i.test(answer)) score += 12;
  score += Math.min(24, sourceRefs.filter((source) => Boolean(source?.href)).length * 6);
  score += Math.min(24, answerBlocks.length * 4);
  score += Math.min(24, keyMetrics.filter((metric) => looksStructuredMetric(metric)).length * 6);
  score += Math.min(10, comparables.length * 5);
  score += Math.min(10, risks.length * 5);
  score += Math.min(8, changes.length * 4);

  if (/confidence|changes|contradictions|actions/i.test(keyMetrics.map((metric) => metric.label).join(" "))) {
    score -= 4;
  }

  return score;
}

function mergePacketCandidates(primary: ResultPacket, secondary: ResultPacket | null): ResultPacket {
  if (!secondary) return primary;

  return {
    ...secondary,
    ...primary,
    answer: primary.answer || secondary.answer,
    entityName: primary.entityName || secondary.entityName,
    canonicalEntity: primary.canonicalEntity || secondary.canonicalEntity,
    confidence: primary.confidence || secondary.confidence,
    sourceCount: Math.max(primary.sourceCount ?? 0, secondary.sourceCount ?? 0),
    variables: primary.variables?.length ? primary.variables : secondary.variables,
    keyMetrics:
      primary.keyMetrics?.length || !secondary.keyMetrics?.length
        ? primary.keyMetrics
        : secondary.keyMetrics,
    changes: primary.changes?.length ? primary.changes : secondary.changes,
    risks: primary.risks?.length ? primary.risks : secondary.risks,
    comparables: primary.comparables?.length ? primary.comparables : secondary.comparables,
    whyThisTeam: primary.whyThisTeam ?? secondary.whyThisTeam,
    packetId: primary.packetId ?? secondary.packetId,
    packetType: primary.packetType ?? secondary.packetType,
    sourceRefs: dedupeByKey(
      [...(primary.sourceRefs ?? []), ...(secondary.sourceRefs ?? [])],
      (source) => String(source.id ?? source.href ?? source.label ?? ""),
    ),
    claimRefs: dedupeByKey(
      [...(primary.claimRefs ?? []), ...(secondary.claimRefs ?? [])],
      (claim) => String(claim.id ?? claim.text ?? ""),
    ),
    answerBlocks: dedupeByKey(
      [...(primary.answerBlocks ?? []), ...(secondary.answerBlocks ?? [])],
      (block) => String(block.id ?? block.title ?? ""),
    ),
    interventions:
      primary.interventions?.length || !secondary.interventions?.length
        ? primary.interventions
        : secondary.interventions,
    nextQuestions: dedupeByKey(
      [...(primary.nextQuestions ?? []), ...(secondary.nextQuestions ?? [])],
      (value) => String(value).trim().toLowerCase(),
    ),
  };
}

function buildPacketFromStructuredResult(structuredResult: any, query: string): ResultPacket | null {
  if (!structuredResult?.canonicalEntity && !structuredResult?.packetId && !structuredResult?.answerBlocks?.length) {
    return null;
  }

  const canonicalEntityName =
    typeof structuredResult?.canonicalEntity === "string"
      ? structuredResult.canonicalEntity
      : structuredResult?.canonicalEntity?.name ?? structuredResult?.entity ?? "NodeBench";

  return {
    query,
    entityName: canonicalEntityName,
    answer: structuredResult?.canonicalEntity?.canonicalMission ?? structuredResult?.summary ?? "",
    confidence: structuredResult?.canonicalEntity?.identityConfidence ?? structuredResult?.confidence ?? 70,
    sourceCount:
      structuredResult?.sourceRefs?.length ??
      structuredResult?.sourcesUsed?.length ??
      (structuredResult?.whatChanged?.length ?? 0) + (structuredResult?.signals?.length ?? 0),
    variables: (structuredResult?.signals ?? []).slice(0, 5).map((signal: any, index: number) => ({
      rank: index + 1,
      name: signal.name ?? String(signal),
      direction: signal.direction ?? "neutral",
      impact: signal.impact ?? "medium",
    })),
    keyMetrics: [
      { label: "Confidence", value: `${structuredResult?.canonicalEntity?.identityConfidence ?? structuredResult?.confidence ?? 0}%` },
      { label: "Changes", value: String(structuredResult?.whatChanged?.length ?? 0) },
      { label: "Contradictions", value: String(structuredResult?.contradictions?.length ?? 0) },
      { label: "Actions", value: String(structuredResult?.nextActions?.length ?? 0) },
    ],
    changes: structuredResult?.whatChanged?.map((change: any) => ({
      description: change.description ?? String(change),
      date: change.date,
    })),
    risks: structuredResult?.contradictions?.map((contradiction: any) => ({
      title: contradiction.claim ?? "Contradiction",
      description: contradiction.evidence ?? "",
      falsification: contradiction.falsification,
    })),
    comparables: structuredResult?.comparables?.map((comparable: any) => ({
      name: comparable.name ?? String(comparable),
      relevance: comparable.relevance ?? "medium",
      note: comparable.note ?? "",
    })),
    whyThisTeam: structuredResult?.whyThisTeam ?? null,
    packetId: structuredResult?.packetId,
    packetType: structuredResult?.packetType ?? "founder_packet",
    canonicalEntity: canonicalEntityName,
    sourceRefs:
      structuredResult?.sourceRefs ??
      structuredResult?.sourcesUsed?.map((source: any, index: number) => ({
        id: source.id ?? `source:${index}`,
        label: source.title ?? source.label ?? source.url ?? `Source ${index + 1}`,
        href: source.url,
        type: source.type ?? "web",
        status: source.status ?? "cited",
        title: source.title ?? source.label,
        domain: source.domain,
        publishedAt: source.publishedAtIso ?? source.publishedAt,
        thumbnailUrl: source.thumbnailUrl,
        excerpt: source.excerpt ?? source.summary,
        confidence: source.confidence,
      })),
    claimRefs: structuredResult?.claimRefs,
    answerBlocks: structuredResult?.answerBlocks,
    explorationMemory: structuredResult?.explorationMemory,
    graphSummary: structuredResult?.graphSummary,
    proofStatus: structuredResult?.proofStatus,
    uncertaintyBoundary: structuredResult?.uncertaintyBoundary,
    recommendedNextAction:
      structuredResult?.recommendedNextAction ?? structuredResult?.nextActions?.[0]?.action,
    graphNodes: structuredResult?.graphNodes,
    graphEdges: structuredResult?.graphEdges,
    strategicAngles: structuredResult?.strategicAngles,
    progressionProfile: structuredResult?.progressionProfile,
    progressionTiers: structuredResult?.progressionTiers,
    diligencePack: structuredResult?.diligencePack,
    readinessScore: structuredResult?.readinessScore,
    unlocks: structuredResult?.unlocks,
    materialsChecklist: structuredResult?.materialsChecklist,
    scorecards: structuredResult?.scorecards,
    shareableArtifacts: structuredResult?.shareableArtifacts,
    visibility: structuredResult?.visibility,
    benchmarkEvidence: structuredResult?.benchmarkEvidence,
    workflowComparison: structuredResult?.workflowComparison,
    operatingModel: structuredResult?.operatingModel,
    distributionSurfaceStatus: structuredResult?.distributionSurfaceStatus,
    companyReadinessPacket: structuredResult?.companyReadinessPacket,
    companyNamingPack: structuredResult?.companyNamingPack,
    forecastGate: structuredResult?.forecastGate,
    temporalTrajectory: structuredResult?.temporalTrajectory,
    interventions: structuredResult?.nextActions?.slice(0, 4).map((action: any) => ({
      action: action.action ?? String(action),
      impact: action.impact ?? "medium",
    })),
    nextQuestions:
      structuredResult?.nextQuestions ?? structuredResult?.nextActions?.map((action: any) => action.action) ?? [],
    rawPacket: structuredResult?.rawPacket,
  };
}

function resolveStreamResultPacket(data: any, query: string): ResultPacket | null {
  const explicitPacket =
    data?.resultPacket && typeof data.resultPacket === "object"
      ? (data.resultPacket as ResultPacket)
      : null;
  const structuredPacket = buildPacketFromStructuredResult(data?.result, query);

  if (explicitPacket && structuredPacket) {
    const explicitScore = scorePacketCandidate(explicitPacket);
    const structuredScore = scorePacketCandidate(structuredPacket);
    return explicitScore >= structuredScore
      ? mergePacketCandidates(explicitPacket, structuredPacket)
      : mergePacketCandidates(structuredPacket, explicitPacket);
  }

  return explicitPacket ?? structuredPacket;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

interface ControlPlaneLandingProps {
  onNavigate: (view: MainView, path?: string) => void;
  onOpenFastAgent?: () => void;
  onOpenFastAgentWithPrompt?: (prompt: string) => void;
}

type HandoffState = {
  status: "idle" | "publishing" | "published" | "delegating" | "delegated" | "error";
  message?: string;
  contextId?: string;
  taskId?: string;
  targetLabel?: string;
  installCommand?: string;
  handoffPrompt?: string;
};

export const ControlPlaneLanding = memo(function ControlPlaneLanding({
  onNavigate,
  onOpenFastAgent: _onOpenFastAgent,
  onOpenFastAgentWithPrompt,
}: ControlPlaneLandingProps) {
  // ── Convex-native search (10-min budget, realtime updates) ──
  const convexSearch = useConvexSearch();

  const traceEntryId = useCallback(
    (entry: { step: string; tool?: string; startMs?: number }, fallbackIndex?: number) =>
      `${entry.step}:${entry.tool ?? "none"}:${entry.startMs ?? fallbackIndex ?? 0}`,
    [],
  );
  const [input, setInput] = useState("");
  const inputRef = useRef("");
  const [activeLens, setActiveLens] = useState<LensId>(() => {
    try {
      const stored = localStorage.getItem('nodebench-selected-role');
      const valid: LensId[] = ["founder", "investor", "banker", "ceo", "legal", "student"];
      if (stored && valid.includes(stored as LensId)) return stored as LensId;
    } catch { /* ignore */ }
    return "founder";
  });
  // Persist lens selection to localStorage
  useEffect(() => {
    localStorage.setItem('nodebench-selected-role', activeLens);
  }, [activeLens]);

  const [activeResult, setActiveResult] = useState<ResultPacket | null>(null);
  const [activeTrace, setActiveTrace] = useState<{ trace: TraceStep[]; latencyMs: number; classification: string; judge?: any } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showFullWorkspace, setShowFullWorkspace] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [conversation, setConversation] = useState<ChatEntry[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const { ref: revealRef, isVisible, instant } = useRevealOnMount();
  const pendingVoiceSubmitRef = useRef(false);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [activeInstallTab, setActiveInstallTab] = useState(0);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [handoffState, setHandoffState] = useState<HandoffState>({ status: "idle" });
  const [activeEpisode, setActiveEpisode] = useState<FounderEpisodeRecord | null>(null);
  const [recentEpisodes, setRecentEpisodes] = useState<FounderEpisodeRecord[]>([]);
  const [subconsciousPreview, setSubconsciousPreview] = useState<SubconsciousPreview | null>(null);
  const [isSubconsciousLoading, setIsSubconsciousLoading] = useState(false);
  const founderHarnessSessionKeyRef = useRef(getFounderHarnessSessionKey());
  const connectCardRef = useRef<HTMLDivElement>(null);
  const activeSearchRef = useRef<{
    requestId: string;
    controller: AbortController;
    episodeId: string;
    correlationId: string;
    traceEntries: TraceStep[];
    query: string;
    lens: LensId;
    convexSessionId?: string;
    fallbackStarted?: boolean;
  } | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 1023px)").matches
      : false,
  );
  const latestConversationEntry = conversation.length > 0 ? conversation[conversation.length - 1] : null;
  const hasPendingConversationPacket = isSearching && latestConversationEntry?.packet === null;
  const showSimplifiedLiveLoading = hasPendingConversationPacket;

  const voice = useVoiceInput({
    onTranscript: useCallback((text: string) => {
      inputRef.current = text;
      setInput(text);
    }, []),
    onEnd: useCallback((finalText: string) => {
      if (finalText.trim()) {
        inputRef.current = finalText.trim();
        setInput(finalText.trim());
        pendingVoiceSubmitRef.current = true;
      }
    }, []),
    mode: "browser",
  });

  // Broadcast voice listening state
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("nodebench:voice-listening", { detail: { isListening: voice.isListening } }),
    );
  }, [voice.isListening]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const handleViewportChange = () => setIsMobileViewport(mediaQuery.matches);
    handleViewportChange();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }
    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  const stagger = useCallback(
    (delay: string): React.CSSProperties => ({
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? "none" : "translateY(8px)",
      transition: instant ? "none" : "opacity 0.25s ease-out, transform 0.25s ease-out",
      transitionDelay: instant ? "0s" : delay,
    }),
    [isVisible, instant],
  );

  // Keep ref in sync so handleSubmit always reads latest input
  useEffect(() => { inputRef.current = input; }, [input]);

  // Save last searched entity for next visit
  useEffect(() => {
    if (conversation.length > 0) {
      const lastPacket = conversation[conversation.length - 1]?.packet;
      if (lastPacket?.entityName && lastPacket.entityName.length > 1) {
        localStorage.setItem("nodebench-last-entity", lastPacket.entityName);
      }
    }
  }, [conversation]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const refreshRecentEpisodes = useCallback(async () => {
    try {
      const response = await fetch(
        getFounderEpisodesUrl({
          sessionKey: founderHarnessSessionKeyRef.current,
          limit: 6,
        }),
      );
      const json = await response.json();
      if (!response.ok || !json?.success || !Array.isArray(json.episodes)) return;
      setRecentEpisodes(json.episodes as FounderEpisodeRecord[]);
    } catch {
      // Founder harness is observational. Fail quietly.
    }
  }, []);

  useEffect(() => {
    void refreshRecentEpisodes();
  }, [refreshRecentEpisodes]);

  const workspaceTrajectory = useMemo(() => {
    if (!activeTrace) return undefined;
    const query = activeResult?.query ?? submittedQuery;
    if (!query || activeTrace.trace.length === 0) return undefined;
    return buildTrajectoryFromSearchTrace(query, activeTrace.trace, activeTrace.latencyMs);
  }, [activeResult?.query, activeTrace, submittedQuery]);

  const packetLineage = useMemo<PacketLineageNode[]>(() => {
    const packetLabel = activeResult?.packetType ?? activeEpisode?.packetType ?? "founder_packet";
    const contextId = activeEpisode?.contextId ?? handoffState.contextId;
    const taskId = activeEpisode?.taskId ?? handoffState.taskId;
    const traceCount = activeEpisode?.traceStepCount ?? activeTrace?.trace.length ?? 0;

    return [
      {
        id: "query",
        label: "Founder question captured",
        detail: submittedQuery || activeEpisode?.query || "Waiting for a founder question.",
        status: submittedQuery || activeEpisode?.query ? "complete" : "pending",
      },
      {
        id: "packet",
        label: "Canonical packet compiled",
        detail: activeResult
          ? `${packetLabel} for ${activeResult.entityName ?? "current company"}${traceCount > 0 ? ` from ${traceCount} trace steps` : ""}`
          : "The packet is still being assembled.",
        status: activeResult ? "complete" : activeEpisode ? "active" : "pending",
      },
      {
        id: "context",
        label: "Shared context published",
        detail: contextId ? `Context ${contextId}` : "Publish when you want durable reuse and packet handoff.",
        status: contextId ? "complete" : "pending",
      },
      {
        id: "handoff",
        label: "Delegation ready",
        detail: taskId
          ? `${handoffState.targetLabel ?? "Coding agent"} task ${taskId}`
          : "No downstream task prepared yet.",
        status: taskId ? "complete" : handoffState.status === "delegating" ? "active" : "pending",
      },
    ];
  }, [
    activeEpisode,
    activeResult,
    activeTrace?.trace.length,
    handoffState.contextId,
    handoffState.status,
    handoffState.targetLabel,
    handoffState.taskId,
    submittedQuery,
  ]);

  useEffect(() => {
    if (!showInstallGuide) return;
    if (typeof connectCardRef.current?.scrollIntoView === "function") {
      connectCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [showInstallGuide]);

  const handleQuickAction = useCallback((action: (typeof FOUNDER_QUICK_ACTIONS)[number]) => {
    if (action.kind === "connect") {
      setShowInstallGuide(true);
      return;
    }
    if (action.prompt) {
      const nextLens = action.lens ?? activeLens;
      trackEvent("quick_action_click", { action: action.id, lens: nextLens });
      setActiveLens(nextLens);
      setInput(action.prompt);
      handleSubmit(action.prompt);
    }
  }, [activeLens]);

  useEffect(() => {
    if (!activeResult && !submittedQuery) {
      setSubconsciousPreview(null);
      return;
    }

    const prompt = activeResult?.query ?? submittedQuery;
    if (!prompt) {
      setSubconsciousPreview(null);
      return;
    }

    const controller = new AbortController();
    const fallbackPreview = (): SubconsciousPreview => {
      const contradictionHint =
        activeResult?.risks?.[0]?.title ??
        activeResult?.uncertaintyBoundary ??
        (activeEpisode?.contradictionsDetected ? `${activeEpisode.contradictionsDetected} contradictions still need resolution.` : "");
      const staleHint =
        activeEpisode?.importantChangesDetected && activeEpisode.importantChangesDetected > 0
          ? [`${activeEpisode.importantChangesDetected} important changes should refresh the packet before shipping.`]
          : [];
      const primaryHint =
        activeResult?.recommendedNextAction ??
        activeResult?.nextActions?.[0]?.action ??
        activeResult?.nextQuestions?.[0] ??
        "Route the current packet before asking the founder to restate context.";

      return {
        mode: activeEpisode?.taskId ? "packet" : "whisper",
        classification: activeLens,
        whisperText: primaryHint,
        suppressed: false,
        suppressionReason: null,
        contradictions: contradictionHint ? [contradictionHint] : [],
        stalePackets: staleHint,
        blockIdsUsed: contextId ? ["packet_lineage"] : ["company_identity"],
      };
    };

    const contextId = activeEpisode?.contextId ?? handoffState.contextId;

    setIsSubconsciousLoading(true);
    fetch(getSubconsciousWhisperUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        mode: activeEpisode?.taskId ? "packet" : "whisper",
        session_id: founderHarnessSessionKeyRef.current,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        setSubconsciousPreview({
          mode: json.mode ?? (activeEpisode?.taskId ? "packet" : "whisper"),
          classification: json.classification?.classification ?? activeLens,
          whisperText: String(json.whisperText ?? "").replace(/<\/?nodebench_whisper>/g, "").trim(),
          suppressed: Boolean(json.suppressed),
          suppressionReason: json.suppressionReason ?? null,
          contradictions: Array.isArray(json.contradictions) ? json.contradictions : [],
          stalePackets: Array.isArray(json.stalePackets) ? json.stalePackets : [],
          blockIdsUsed: Array.isArray(json.blockIdsUsed) ? json.blockIdsUsed : [],
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSubconsciousPreview(fallbackPreview());
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsSubconsciousLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    activeEpisode?.contextId,
    activeEpisode?.contradictionsDetected,
    activeEpisode?.importantChangesDetected,
    activeEpisode?.taskId,
    activeLens,
    activeResult,
    handoffState.contextId,
    submittedQuery,
  ]);

  const upsertActiveEpisodeSpan = useCallback((episodeId: string, nextSpan: FounderEpisodeSpan) => {
    setActiveEpisode((prev) => {
      if (!prev || prev.episodeId !== episodeId) return prev;
      const spans = [...prev.spans];
      const replaceIndex = spans.findIndex((span) => span.stage === nextSpan.stage && span.type === nextSpan.type);
      if (replaceIndex >= 0) {
        spans[replaceIndex] = nextSpan;
      } else {
        spans.push(nextSpan);
      }
      return {
        ...prev,
        spans,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const finalizeFounderEpisode = useCallback(async (
    episodeId: string,
    payload: Record<string, unknown>,
  ) => {
    try {
      const response = await fetch(getFounderEpisodeFinalizeUrl(episodeId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (response.ok && json?.success && json.episode) {
        setActiveEpisode(json.episode as FounderEpisodeRecord);
        void refreshRecentEpisodes();
      }
    } catch {
      // Best-effort observation only.
    }
  }, [refreshRecentEpisodes]);

  const clearActiveSearch = useCallback((requestId?: string) => {
    if (!activeSearchRef.current) return;
    if (requestId && activeSearchRef.current.requestId !== requestId) return;
    activeSearchRef.current = null;
  }, []);

  const abortActiveSearch = useCallback(() => {
    const active = activeSearchRef.current;
    if (active) {
      active.controller.abort();
      void finalizeFounderEpisode(active.episodeId, {
        status: "aborted",
        summary: "Founder episode was interrupted before completion.",
        finalSpan: {
          stage: "after",
          type: "search_aborted",
          status: "error",
          label: "Search interrupted",
          detail: "The in-flight founder episode was replaced or cancelled before a packet was produced.",
          timestamp: new Date().toISOString(),
        },
      });
    }
    activeSearchRef.current = null;
  }, [finalizeFounderEpisode]);

  useEffect(() => () => {
    abortActiveSearch();
  }, [abortActiveSearch]);

  const showResult = useCallback((packet: ResultPacket, lensOverride?: LensId, targetEntryId?: string) => {
    const enriched = ensureProofPacket(packet, lensOverride ?? activeLens);
    setActiveResult(enriched);
    setShowFullWorkspace(!isMobileViewport);
    setHandoffState({ status: "idle" });
    setIsSearching(false);
    // Append to conversation thread
    setConversation((prev) => {
      if (targetEntryId) {
        let didUpdate = false;
        const next = prev.map((entry) => {
          if (entry.id !== targetEntryId) return entry;
          didUpdate = true;
          return { ...entry, packet: enriched };
        });
        return didUpdate ? next : prev;
      }
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && lastEntry.packet === null) {
        // Fill in the pending entry
        return prev.map((e) => (e.id === lastEntry.id ? { ...e, packet: enriched } : e));
      }
      return prev;
    });
    setTimeout(() => {
      if (typeof resultRef.current?.scrollIntoView === "function") {
        resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }, [activeLens, isMobileViewport]);

  // ── Bridge Convex search results into the existing UI ──
  const convexResultHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!convexSearch.state.result) return;
    const rid = convexSearch.state.sessionId;
    if (!rid || convexResultHandledRef.current === rid) return;
    const active = activeSearchRef.current;
    if (!active?.convexSessionId || active.convexSessionId !== rid) return;

    convexResultHandledRef.current = rid;

    const traceEntries = convexSearch.state.trace.map((entry, index) => ({
      step: entry.step,
      tool: entry.tool,
      durationMs: entry.durationMs ?? 0,
      status: entry.status as "ok" | "error",
      detail: entry.detail,
      traceId: `${entry.step}:${entry.tool ?? "none"}:${entry.startedAt ?? index}`,
      isRunning: !entry.durationMs && convexSearch.state.status !== "complete",
    }));
    active.traceEntries = traceEntries;

    const packet = ensureProofPacket(convexSearch.state.result as ResultPacket, active.lens);
    const toolsInvoked = collectTraceTools(traceEntries);
    const finalSpan: FounderEpisodeSpan = {
      stage: "after",
      type: "packet_compiled",
      status: "ok",
      label: "Founder packet ready",
      detail: packet.recommendedNextAction ?? packet.answer,
      timestamp: new Date().toISOString(),
      metrics: {
        confidence: packet.confidence,
        sources: packet.sourceCount,
        tools: toolsInvoked.length,
      },
    };

    clearActiveSearch(active.requestId);
    showResult(packet, active.lens, active.requestId);
    setActiveEpisode((prev) => prev && prev.episodeId === active.episodeId ? {
      ...prev,
      status: "completed",
      entityName: packet.entityName,
      packetId: packet.packetId ?? null,
      packetType: packet.packetType ?? null,
      summary: packet.recommendedNextAction ?? packet.answer,
      traceStepCount: traceEntries.length,
      toolsInvoked,
      artifactsProduced: ["founder_packet"],
      importantChangesDetected: packet.changes?.length ?? 0,
      contradictionsDetected: packet.risks?.length ?? 0,
      updatedAt: finalSpan.timestamp,
      completedAt: finalSpan.timestamp,
      spans: [...prev.spans.filter((span) => !(span.stage === "during" && span.type === "trace_progress")), finalSpan],
    } : prev);
    void finalizeFounderEpisode(active.episodeId, {
      status: "completed",
      entityName: packet.entityName,
      packetId: packet.packetId,
      packetType: packet.packetType,
      workspaceId: packet.canonicalEntity ? `workspace:${slugifyValue(packet.canonicalEntity) || "control-plane"}` : undefined,
      summary: packet.recommendedNextAction ?? packet.answer,
      toolsInvoked,
      artifactsProduced: ["founder_packet"],
      traceStepCount: traceEntries.length,
      importantChangesDetected: packet.changes?.length ?? 0,
      contradictionsDetected: packet.risks?.length ?? 0,
      stateAfter: {
        entityName: packet.entityName,
        confidence: packet.confidence,
        sourceCount: packet.sourceCount,
        packetId: packet.packetId ?? null,
        packetType: packet.packetType ?? null,
      },
      finalSpan,
    });
    setIsSearching(false);
  }, [clearActiveSearch, convexSearch.state.result, convexSearch.state.sessionId, convexSearch.state.status, convexSearch.state.trace, finalizeFounderEpisode, showResult]);

  // Sync Convex trace into activeTrace for the LiveAgentProgress component
  useEffect(() => {
    if (convexSearch.state.trace.length === 0) return;
    const active = activeSearchRef.current;
    if (!active?.convexSessionId || active.convexSessionId !== convexSearch.state.sessionId) return;
    const normalizedTrace = convexSearch.state.trace.map((t, i) => ({
      step: t.step,
      tool: t.tool,
      durationMs: t.durationMs ?? 0,
      status: t.status as "ok" | "error",
      detail: t.detail,
      traceId: `${t.step}:${t.tool ?? "none"}:${t.startedAt ?? i}`,
      isRunning: !t.durationMs && !["complete", "error"].includes(convexSearch.state.status ?? ""),
    }));
    active.traceEntries = normalizedTrace;
    setActiveTrace({
      trace: normalizedTrace,
      latencyMs: 0,
      classification: convexSearch.state.status ?? "unknown",
    });
    upsertActiveEpisodeSpan(active.episodeId, {
      stage: "during",
      type: "trace_progress",
      status: "running",
      label: "Convex founder search in progress",
      detail: `${normalizedTrace.length} steps captured across classification, search, and synthesis.`,
      timestamp: new Date().toISOString(),
      metrics: {
        trace_steps: normalizedTrace.length,
      },
    });
  }, [convexSearch.state.sessionId, convexSearch.state.status, convexSearch.state.trace, upsertActiveEpisodeSpan]);

  // Show Convex search error
  useEffect(() => {
    if (!convexSearch.state.error || convexSearch.state.status !== "error") return;
    const active = activeSearchRef.current;
    if (!active?.convexSessionId || active.convexSessionId !== convexSearch.state.sessionId) {
      setIsSearching(false);
      return;
    }

    const fallbackPacket: ResultPacket = {
      query: active.query,
      entityName: active.query.split(/\s+/).slice(0, 4).join(" "),
      answer: `NodeBench captured your founder query but the live search pipeline failed before the packet completed. Retry the search, or refine the entity and wedge so the next packet can be assembled cleanly.`,
      confidence: 32,
      sourceCount: 0,
      variables: [],
      nextQuestions: [
        "What company am I actually building here?",
        "What changed since the last meaningful founder session?",
        "What contradiction or missing proof should I resolve before delegating work?",
      ],
    };
    const finalSpan: FounderEpisodeSpan = {
      stage: "after",
      type: "convex_search_error",
      status: "error",
      label: "Convex founder search failed",
      detail: convexSearch.state.error,
      timestamp: new Date().toISOString(),
    };

    clearActiveSearch(active.requestId);
    showResult(fallbackPacket, active.lens, active.requestId);
    setActiveEpisode((prev) => prev && prev.episodeId === active.episodeId ? {
      ...prev,
      status: "error",
      entityName: fallbackPacket.entityName,
      summary: convexSearch.state.error,
      artifactsProduced: ["fallback_packet"],
      updatedAt: finalSpan.timestamp,
      completedAt: finalSpan.timestamp,
      spans: [...prev.spans.filter((span) => !(span.stage === "during" && span.type === "trace_progress")), finalSpan],
    } : prev);
    void finalizeFounderEpisode(active.episodeId, {
      status: "error",
      entityName: fallbackPacket.entityName,
      summary: convexSearch.state.error,
      artifactsProduced: ["fallback_packet"],
      traceStepCount: active.traceEntries.length,
      finalSpan,
      stateAfter: {
        entityName: fallbackPacket.entityName,
        confidence: fallbackPacket.confidence,
      },
    });
    setIsSearching(false);
  }, [clearActiveSearch, convexSearch.state.error, convexSearch.state.sessionId, convexSearch.state.status, finalizeFounderEpisode, showResult]);

  const handleSubmit = useCallback((queryOverride?: string) => {
    const trimmed = (queryOverride ?? inputRef.current).trim();
    if (!trimmed) return;
    const demoKey = findDemoPacket(trimmed);
    const entryId = `chat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const episodeId = `episode:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const correlationId = `corr:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    const controller = new AbortController();
    const beforeSpan: FounderEpisodeSpan = {
      stage: "before",
      type: "search_submitted",
      status: "ok",
      label: "Founder query captured",
      detail: trimmed,
      timestamp: new Date().toISOString(),
      metrics: {
        lens: activeLens,
        conversation_turns: conversation.length,
      },
    };
    const optimisticEpisode: FounderEpisodeRecord = {
      episodeId,
      correlationId,
      sessionKey: founderHarnessSessionKeyRef.current,
      workspaceId: "workspace:control-plane",
      surface: "web",
      episodeType: "entity_search",
      status: "active",
      query: trimmed,
      lens: activeLens,
      spans: [beforeSpan],
      toolsInvoked: [],
      artifactsProduced: [],
      startedAt: beforeSpan.timestamp,
      updatedAt: beforeSpan.timestamp,
    };

    abortActiveSearch();
    activeSearchRef.current = {
      requestId: entryId,
      controller,
      episodeId,
      correlationId,
      traceEntries: [],
      query: trimmed,
      lens: activeLens,
    };

    trackEvent("search_submit", { query: trimmed.slice(0, 80), lens: activeLens });
    setSubmittedQuery(trimmed);
    setIsSearching(true);
    setActiveEpisode(optimisticEpisode);
    // Add pending entry to conversation
    setConversation((prev) => [
      ...prev,
      { id: entryId, query: trimmed, lens: activeLens, packet: null, timestamp: new Date() },
    ]);
    setInput("");

    void fetch(getFounderEpisodeStartUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodeId,
        correlationId,
        sessionKey: founderHarnessSessionKeyRef.current,
        workspaceId: "workspace:control-plane",
        surface: "web",
        episodeType: "entity_search",
        query: trimmed,
        lens: activeLens,
        stateBefore: {
          route: typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/",
          conversationTurns: conversation.length,
          previousEntity: activeResult?.entityName ?? null,
          handoffStatus: handoffState.status,
        },
        initialSpan: beforeSpan,
      }),
    }).then(() => refreshRecentEpisodes()).catch(() => {
      // Best-effort observation only.
    });

    const runLegacySearch = () => {
      if (activeSearchRef.current?.requestId !== entryId) return;
      if (activeSearchRef.current) {
        activeSearchRef.current.fallbackStarted = true;
      }
      setActiveTrace({ trace: [], latencyMs: 0, classification: "unknown" });

      if (shouldPreferDemoPacket(demoKey)) {
      setTimeout(() => {
        if (activeSearchRef.current?.requestId !== entryId) return;
        clearActiveSearch(entryId);
        showResult(DEMO_PACKETS[demoKey], activeLens, entryId);
        const packet = ensureProofPacket(DEMO_PACKETS[demoKey], activeLens);
        const finalSpan: FounderEpisodeSpan = {
          stage: "after",
          type: "packet_compiled",
          status: "ok",
          label: "Founder packet ready",
          detail: packet.recommendedNextAction ?? packet.answer,
          timestamp: new Date().toISOString(),
          metrics: {
            confidence: packet.confidence,
            sources: packet.sourceCount,
          },
        };
        setActiveEpisode((prev) => prev && prev.episodeId === episodeId ? {
          ...prev,
          status: "completed",
          entityName: packet.entityName,
          packetId: packet.packetId ?? null,
          packetType: packet.packetType ?? null,
          summary: packet.recommendedNextAction ?? packet.answer,
          traceStepCount: 0,
          toolsInvoked: [],
          artifactsProduced: ["founder_packet"],
          updatedAt: finalSpan.timestamp,
          completedAt: finalSpan.timestamp,
          spans: [...prev.spans, finalSpan],
        } : prev);
        void finalizeFounderEpisode(episodeId, {
          status: "completed",
          entityName: packet.entityName,
          packetId: packet.packetId,
          packetType: packet.packetType,
          summary: packet.recommendedNextAction ?? packet.answer,
          artifactsProduced: ["founder_packet"],
          traceStepCount: 0,
          importantChangesDetected: packet.changes?.length ?? 0,
          contradictionsDetected: packet.risks?.length ?? 0,
          stateAfter: {
            entityName: packet.entityName,
            packetId: packet.packetId ?? null,
            packetType: packet.packetType ?? null,
            confidence: packet.confidence,
            sourceCount: packet.sourceCount,
          },
          finalSpan,
        });
      }, 300);
      trackEvent("search_demo_result", { query: trimmed.slice(0, 80), lens: activeLens, demoKey });
      return;
    }

    (async () => {
      // Try Pipeline v2 first (Linkup → Gemini 3.1 → taxonomy), fall back to legacy stream
      try {
        const v2Resp = await fetch(PUBLIC_PIPELINE_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, lens: activeLens }),
          signal: buildSearchAbortSignal(controller, 45_000),
        });
        if (v2Resp.ok) {
          const v2Data = await v2Resp.json();
          if (v2Data.success && (v2Data.variables?.length > 0 || v2Data.answer)) {
            if (activeSearchRef.current?.requestId !== entryId) return;
            if (v2Data.trace) {
              activeSearchRef.current.traceEntries = (v2Data.trace ?? []).map((t: any, i: number) => ({
                ...t, traceId: `${t.step}:${i}`, isRunning: false,
              }));
              setActiveTrace({ trace: activeSearchRef.current.traceEntries, latencyMs: v2Data.latencyMs ?? 0, classification: v2Data.classification ?? "unknown" });
            }
            clearActiveSearch(entryId);
            showResult(v2Data, activeLens, entryId);
            setIsSearching(false);
            trackEvent("search_pipeline_v2", { query: trimmed.slice(0, 80), lens: activeLens, signals: v2Data.variables?.length ?? 0 });
            return;
          }
        }
      } catch { /* Pipeline v2 failed — fall through to legacy */ }

      try {
        const response = await fetch(`${PUBLIC_SEARCH_API_ENDPOINT}?stream=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: trimmed, lens: activeLens }),
          signal: buildSearchAbortSignal(controller, SEARCH_STREAM_TIMEOUT_MS),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const contentType = response.headers.get("content-type") || "";
        let didShowResult = false;

        const processResultPayload = (data: any) => {
          if (activeSearchRef.current?.requestId !== entryId) return;
          if (!data?.success) throw new Error("No result");
          
          if (data.trace) {
            activeSearchRef.current.traceEntries = data.trace.map((entry: TraceStep, index: number) => ({
              ...entry,
              traceId: entry.traceId ?? traceEntryId(entry, index),
              isRunning: false,
            }));
            setActiveTrace({
              trace: data.trace.map((entry: TraceStep, index: number) => ({
                ...entry,
                traceId: entry.traceId ?? traceEntryId(entry, index),
                isRunning: false,
              })),
              latencyMs: data.latencyMs ?? 0,
              classification: data.classification ?? "unknown",
              judge: data.judge,
            });
            upsertActiveEpisodeSpan(episodeId, {
              stage: "during",
              type: "trace_progress",
              status: "ok",
              label: "Evidence path assembled",
              detail: `${data.trace.length ?? 0} steps across classification, exploration, and verification.`,
              timestamp: new Date().toISOString(),
              metrics: {
                trace_steps: data.trace.length ?? 0,
                latency_ms: data.latencyMs ?? 0,
              },
            });
          }

          const resolvedPacket = resolveStreamResultPacket(data, trimmed);
          if (resolvedPacket) {
            const traceEntries = activeSearchRef.current?.traceEntries ?? [];
            const toolsInvoked = collectTraceTools(traceEntries);
            const traceStepCount = traceEntries.length;
            clearActiveSearch(entryId);
            showResult(resolvedPacket, activeLens, entryId);
            const packet = ensureProofPacket(resolvedPacket, activeLens);
            const finalSpan: FounderEpisodeSpan = {
              stage: "after",
              type: "packet_compiled",
              status: "ok",
              label: "Founder packet ready",
              detail: packet.recommendedNextAction ?? packet.answer,
              timestamp: new Date().toISOString(),
              metrics: {
                confidence: packet.confidence,
                sources: packet.sourceCount,
                tools: toolsInvoked.length,
              },
            };
            setActiveEpisode((prev) => prev && prev.episodeId === episodeId ? {
              ...prev,
              status: "completed",
              entityName: packet.entityName,
              packetId: packet.packetId ?? null,
              packetType: packet.packetType ?? null,
              summary: packet.recommendedNextAction ?? packet.answer,
              traceStepCount,
              toolsInvoked,
              artifactsProduced: ["founder_packet"],
              importantChangesDetected: packet.changes?.length ?? 0,
              contradictionsDetected: packet.risks?.length ?? 0,
              updatedAt: finalSpan.timestamp,
              completedAt: finalSpan.timestamp,
              spans: [...prev.spans.filter((span) => !(span.stage === "during" && span.type === "trace_progress")), finalSpan],
            } : prev);
            void finalizeFounderEpisode(episodeId, {
              status: "completed",
              entityName: packet.entityName,
              packetId: packet.packetId,
              packetType: packet.packetType,
              workspaceId: packet.canonicalEntity ? `workspace:${slugifyValue(packet.canonicalEntity) || "control-plane"}` : undefined,
              summary: packet.recommendedNextAction ?? packet.answer,
              toolsInvoked,
              artifactsProduced: ["founder_packet"],
              traceStepCount,
              importantChangesDetected: packet.changes?.length ?? 0,
              contradictionsDetected: packet.risks?.length ?? 0,
              stateAfter: {
                entityName: packet.entityName,
                confidence: packet.confidence,
                sourceCount: packet.sourceCount,
                packetId: packet.packetId ?? null,
                packetType: packet.packetType ?? null,
              },
              finalSpan,
            });
            trackEvent("search_live_result", { entity: packet.entityName, type: data.classification });
            didShowResult = true;
            return;
          }
          throw new Error("Unstructured result");
        };

        if (contentType.includes("application/json")) {
          // Graceful fallback if backend hasn't been restarted with SSE support
          const data = await response.json();
          processResultPayload(data);
          return;
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              if (!dataStr) continue;
              
              try {
                const event = JSON.parse(dataStr);
                
                if (event.type === 'trace') {
                  const entry = event.entry;
                  if (activeSearchRef.current?.requestId !== entryId) {
                    continue;
                  }
                  const traceId = traceEntryId(entry);
                  const normalizedEntry: TraceStep = {
                    step: entry.step,
                    tool: entry.tool,
                    durationMs: entry.endMs ? (entry.endMs - entry.startMs) : 0,
                    status: entry.status,
                    detail: entry.detail,
                    traceId,
                    isRunning: !entry.endMs,
                  };
                  const traceEntries = activeSearchRef.current?.traceEntries ?? [];
                  const existingTraceIndex = traceEntries.findIndex((item) => item.traceId === traceId);
                  if (existingTraceIndex >= 0) {
                    traceEntries[existingTraceIndex] = normalizedEntry;
                  } else {
                    traceEntries.push(normalizedEntry);
                  }
                  setActiveTrace(prev => {
                    const trace = [...(prev?.trace || [])];
                    const existingIdx = trace.findIndex(t => t.traceId === traceId);
                    if (existingIdx >= 0) {
                      trace[existingIdx] = normalizedEntry;
                    } else {
                      trace.push(normalizedEntry);
                    }
                    return { ...prev, trace, latencyMs: prev?.latencyMs ?? 0, classification: prev?.classification ?? "unknown" };
                  });
                  const runningSpan: FounderEpisodeSpan = {
                    stage: "during",
                    type: "trace_progress",
                    status: entry.endMs ? "ok" : "running",
                    label: entry.tool ? `${entry.step} → ${entry.tool}` : entry.step,
                    detail: entry.detail,
                    timestamp: new Date().toISOString(),
                    metrics: {
                      trace_steps: traceEntries.length,
                      running: entry.endMs ? 0 : 1,
                    },
                  };
                  upsertActiveEpisodeSpan(episodeId, runningSpan);
                } else if (event.type === 'result') {
                  processResultPayload(event.payload);
                } else if (event.type === 'error') {
                  throw new Error(event.error?.message || "Search failed");
                }
              } catch (e) {
                // Ignore JSON parse errors from partial chunks unless it's the intended throw
                if (e instanceof Error && e.message !== "Unexpected end of JSON input") {
                  throw e;
                }
              }
            }
          }
        }
        
        if (!didShowResult) {
           throw new Error("Stream closed without result");
        }
      } catch {
        if (controller.signal.aborted || activeSearchRef.current?.requestId !== entryId) {
          return;
        }
        // Fallback implementation on error
        if (demoKey) {
          setTimeout(() => {
            if (activeSearchRef.current?.requestId !== entryId) return;
            clearActiveSearch(entryId);
            showResult(DEMO_PACKETS[demoKey], activeLens, entryId);
            const packet = ensureProofPacket(DEMO_PACKETS[demoKey], activeLens);
            const finalSpan: FounderEpisodeSpan = {
              stage: "after",
              type: "fallback_demo_packet",
              status: "error",
              label: "Search degraded to local founder packet",
              detail: packet.answer,
              timestamp: new Date().toISOString(),
            };
            setActiveEpisode((prev) => prev && prev.episodeId === episodeId ? {
              ...prev,
              status: "error",
              entityName: packet.entityName,
              packetId: packet.packetId ?? null,
              packetType: packet.packetType ?? null,
              summary: "Search fell back to a local demo packet after a live retrieval failure.",
              artifactsProduced: ["founder_packet", "fallback_packet"],
              updatedAt: finalSpan.timestamp,
              completedAt: finalSpan.timestamp,
              spans: [...prev.spans.filter((span) => !(span.stage === "during" && span.type === "trace_progress")), finalSpan],
            } : prev);
            void finalizeFounderEpisode(episodeId, {
              status: "error",
              entityName: packet.entityName,
              packetId: packet.packetId,
              packetType: packet.packetType,
              summary: "Search fell back to a local demo packet after a live retrieval failure.",
              artifactsProduced: ["founder_packet", "fallback_packet"],
              traceStepCount: activeSearchRef.current?.traceEntries.length ?? 0,
              finalSpan,
            });
          }, 300);
          return;
        }
        // 3. Final fallback: build an inline acknowledgment packet
        const fallbackPacket: ResultPacket = {
          query: trimmed,
          entityName: trimmed.split(/\s+/).slice(0, 3).join(" "),
          answer: `Your query "${trimmed.slice(0, 60)}" has been received. NodeBench is analyzing this using ${activeLens} lens. For the richest results, try one of the example prompts — they demonstrate the full intelligence workspace with live entity truth, signals, risks, and exportable packets.`,
          confidence: 40,
          sourceCount: 0,
          variables: [],
          nextQuestions: [
            "Generate my founder weekly reset — what changed, main contradiction, next 3 moves",
            "Analyze Anthropic's competitive position in the foundation model market",
            "What changed in AI commerce strategy for Shopify, Amazon, and Google this quarter?",
          ],
        };
        clearActiveSearch(entryId);
        showResult(fallbackPacket, activeLens, entryId);
        const finalSpan: FounderEpisodeSpan = {
          stage: "after",
          type: "fallback_acknowledgement",
          status: "error",
          label: "Search returned degraded fallback",
          detail: fallbackPacket.answer,
          timestamp: new Date().toISOString(),
          metrics: {
            confidence: fallbackPacket.confidence,
          },
        };
        setActiveEpisode((prev) => prev && prev.episodeId === episodeId ? {
          ...prev,
          status: "error",
          entityName: fallbackPacket.entityName,
          summary: "Search failed before founder packet synthesis completed.",
          artifactsProduced: ["fallback_packet"],
          updatedAt: finalSpan.timestamp,
          completedAt: finalSpan.timestamp,
          spans: [...prev.spans.filter((span) => !(span.stage === "during" && span.type === "trace_progress")), finalSpan],
        } : prev);
        void finalizeFounderEpisode(episodeId, {
          status: "error",
          entityName: fallbackPacket.entityName,
          summary: "Search failed before founder packet synthesis completed.",
          artifactsProduced: ["fallback_packet"],
          traceStepCount: activeSearchRef.current?.traceEntries.length ?? 0,
          finalSpan,
          stateAfter: {
            entityName: fallbackPacket.entityName,
            confidence: fallbackPacket.confidence,
          },
        });
        trackEvent("search_fallback", { query: trimmed.slice(0, 40), lens: activeLens });
      }
      })();
    };

    if (convexSearch.isAvailable && !shouldPreferDemoPacket(demoKey)) {
      setActiveTrace({ trace: [], latencyMs: 0, classification: "unknown" });
      convexSearch.reset();
      convexResultHandledRef.current = null;
      void convexSearch.startSearch(trimmed, activeLens).then((sid) => {
        if (activeSearchRef.current?.requestId !== entryId) return;
        if (sid) {
          activeSearchRef.current = {
            ...activeSearchRef.current!,
            convexSessionId: sid,
          };
          return;
        }
        console.warn("[search] Convex startSearch returned null, falling back to SSE");
        runLegacySearch();
      });
      return;
    }

    runLegacySearch();
  }, [
    abortActiveSearch,
    activeLens,
    activeResult?.entityName,
    clearActiveSearch,
    conversation.length,
    convexSearch,
    finalizeFounderEpisode,
    handoffState.status,
    refreshRecentEpisodes,
    showResult,
    traceEntryId,
    upsertActiveEpisodeSpan,
  ]);

  // Auto-submit when voice transcript finishes
  useEffect(() => {
    if (pendingVoiceSubmitRef.current && input.trim()) {
      pendingVoiceSubmitRef.current = false;
      handleSubmit();
    }
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const handleExampleClick = useCallback(
    (prompt: string, lens: LensId) => {
      trackEvent("example_click", { prompt: prompt.slice(0, 40), lens });
      setActiveLens(lens);
      setInput(prompt);

      // Check for demo packet — same alias matching as handleSubmit
      const demoKey = findDemoPacket(prompt);

      if (demoKey) {
        setIsSearching(true);
        setTimeout(() => showResult(DEMO_PACKETS[demoKey], lens), 600);
      } else {
        // Use the same live API path as handleSubmit — pass query directly to avoid stale closure
        setInput(prompt);
        handleSubmit(prompt);
      }
    },
    [showResult, handleSubmit],
  );

  const handleFollowUp = useCallback(
    (question: string) => {
      setInput(question);
      textareaRef.current?.focus();
      if (onOpenFastAgentWithPrompt) {
        onOpenFastAgentWithPrompt(question);
      }
    },
    [onOpenFastAgentWithPrompt],
  );

  const handleCopyInstall = useCallback(() => {
    navigator.clipboard.writeText(INSTALL_COMMANDS[activeInstallTab].code);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  }, [activeInstallTab]);

  const handlePublishSharedContext = useCallback(async () => {
    if (!activeResult) return;
    setHandoffState({ status: "publishing", message: "Publishing packet to shared context..." });
    try {
      const response = await fetch(getSharedContextPublishUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packet: ensureProofPacket(activeResult, activeLens),
          episodeId: activeEpisode?.episodeId,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message ?? `HTTP ${response.status}`);
      }
      trackEvent("publish_shared_context", {
        entity: activeResult.entityName,
        contextId: json.contextId,
      });
      setHandoffState({
        status: "published",
        message: "Shared context packet is live and ready for delegation.",
        contextId: json.contextId,
      });
      if (activeEpisode?.episodeId) {
        const span: FounderEpisodeSpan = {
          stage: "after",
          type: "packet_published",
          status: "ok",
          label: "Founder packet published",
          detail: "Shared context now has the canonical packet for delegation.",
          timestamp: new Date().toISOString(),
          contextId: json.contextId,
        };
        upsertActiveEpisodeSpan(activeEpisode.episodeId, span);
        setActiveEpisode((prev) => prev && prev.episodeId === activeEpisode.episodeId ? {
          ...prev,
          contextId: json.contextId,
          updatedAt: span.timestamp,
        } : prev);
        void refreshRecentEpisodes();
      }
    } catch (error) {
      setHandoffState({
        status: "error",
        message: error instanceof Error ? error.message : "Failed to publish shared context packet.",
      });
    }
  }, [activeEpisode?.episodeId, activeLens, activeResult, refreshRecentEpisodes, upsertActiveEpisodeSpan]);

  const handlePublishStrategicAngle = useCallback(
    async (strategicAngleId: string) => {
      if (!activeResult) return;
      setHandoffState({
        status: "publishing",
        message: "Publishing pressure-test issue packet to shared context...",
      });
      try {
        const response = await fetch(getSharedContextPublishUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packet: ensureProofPacket(activeResult, activeLens),
            strategicAngleId,
            episodeId: activeEpisode?.episodeId,
          }),
        });
        const json = await response.json();
        if (!response.ok || !json?.success) {
          throw new Error(json?.message ?? `HTTP ${response.status}`);
        }
        trackEvent("publish_strategic_issue", {
          entity: activeResult.entityName,
          strategicAngleId,
          contextId: json.contextId,
        });
        setHandoffState({
          status: "published",
          message: "Strategic issue packet is live and ready for a worker.",
          contextId: json.contextId,
        });
        if (activeEpisode?.episodeId) {
          const span: FounderEpisodeSpan = {
            stage: "after",
            type: "strategic_issue_published",
            status: "ok",
            label: "Strategic issue packet published",
            detail: "A bounded founder issue packet is ready for a worker handoff.",
            timestamp: new Date().toISOString(),
            contextId: json.contextId,
          };
          upsertActiveEpisodeSpan(activeEpisode.episodeId, span);
          setActiveEpisode((prev) => prev && prev.episodeId === activeEpisode.episodeId ? {
            ...prev,
            contextId: json.contextId,
            updatedAt: span.timestamp,
          } : prev);
          void refreshRecentEpisodes();
        }
      } catch (error) {
        setHandoffState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to publish strategic issue packet.",
        });
      }
    },
    [activeEpisode?.episodeId, activeLens, activeResult, refreshRecentEpisodes, upsertActiveEpisodeSpan],
  );

  const handleDelegate = useCallback(
    async (target: "claude_code" | "openclaw") => {
      if (!activeResult) return;
      const targetLabel = target === "claude_code" ? "Claude Code" : "OpenClaw";
      setHandoffState({
        status: "delegating",
        message: `Preparing ${targetLabel} handoff...`,
        targetLabel,
      });
      try {
        const response = await fetch(getSharedContextDelegateUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packet: ensureProofPacket(activeResult, activeLens),
            targetAgent: target,
            episodeId: activeEpisode?.episodeId,
          }),
        });
        const json = await response.json();
        if (!response.ok || !json?.success) {
          throw new Error(json?.message ?? `HTTP ${response.status}`);
        }
        trackEvent("delegate_shared_context", {
          entity: activeResult.entityName,
          target,
          contextId: json.contextId,
          taskId: json.taskId,
        });
        setHandoffState({
          status: "delegated",
          message: `${json.targetLabel ?? targetLabel} handoff is ready through NodeBench MCP.`,
          contextId: json.contextId,
          taskId: json.taskId,
          targetLabel: json.targetLabel ?? targetLabel,
          installCommand: json.installCommand,
          handoffPrompt: json.handoffPrompt,
        });
        if (activeEpisode?.episodeId) {
          const span: FounderEpisodeSpan = {
            stage: "after",
            type: "agent_delegated",
            status: "ok",
            label: `${json.targetLabel ?? targetLabel} handoff ready`,
            detail: json.handoffPrompt ?? `Delegation packet prepared for ${json.targetLabel ?? targetLabel}.`,
            timestamp: new Date().toISOString(),
            contextId: json.contextId,
            taskId: json.taskId,
          };
          upsertActiveEpisodeSpan(activeEpisode.episodeId, span);
          setActiveEpisode((prev) => prev && prev.episodeId === activeEpisode.episodeId ? {
            ...prev,
            contextId: json.contextId,
            taskId: json.taskId,
            updatedAt: span.timestamp,
          } : prev);
          void refreshRecentEpisodes();
        }
      } catch (error) {
        setHandoffState({
          status: "error",
          message: error instanceof Error ? error.message : `Failed to prepare ${targetLabel} handoff.`,
        });
      }
    },
    [activeEpisode?.episodeId, activeLens, activeResult, refreshRecentEpisodes, upsertActiveEpisodeSpan],
  );

  const handleDelegateStrategicAngle = useCallback(
    async (strategicAngleId: string, target: "claude_code" | "openclaw") => {
      if (!activeResult) return;
      const targetLabel = target === "claude_code" ? "Claude Code" : "OpenClaw";
      setHandoffState({
        status: "delegating",
        message: `Preparing ${targetLabel} issue handoff...`,
        targetLabel,
      });
      try {
        const response = await fetch(getSharedContextDelegateUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            packet: ensureProofPacket(activeResult, activeLens),
            targetAgent: target,
            strategicAngleId,
            episodeId: activeEpisode?.episodeId,
          }),
        });
        const json = await response.json();
        if (!response.ok || !json?.success) {
          throw new Error(json?.message ?? `HTTP ${response.status}`);
        }
        trackEvent("delegate_strategic_issue", {
          entity: activeResult.entityName,
          target,
          strategicAngleId,
          contextId: json.contextId,
          taskId: json.taskId,
        });
        setHandoffState({
          status: "delegated",
          message: `${json.targetLabel ?? targetLabel} issue handoff is ready through NodeBench MCP.`,
          contextId: json.contextId,
          taskId: json.taskId,
          targetLabel: json.targetLabel ?? targetLabel,
          installCommand: json.installCommand,
          handoffPrompt: json.handoffPrompt,
        });
        if (activeEpisode?.episodeId) {
          const span: FounderEpisodeSpan = {
            stage: "after",
            type: "strategic_issue_delegated",
            status: "ok",
            label: `${json.targetLabel ?? targetLabel} issue handoff ready`,
            detail: json.handoffPrompt ?? `Strategic issue packet delegated to ${json.targetLabel ?? targetLabel}.`,
            timestamp: new Date().toISOString(),
            contextId: json.contextId,
            taskId: json.taskId,
          };
          upsertActiveEpisodeSpan(activeEpisode.episodeId, span);
          setActiveEpisode((prev) => prev && prev.episodeId === activeEpisode.episodeId ? {
            ...prev,
            contextId: json.contextId,
            taskId: json.taskId,
            updatedAt: span.timestamp,
          } : prev);
          void refreshRecentEpisodes();
        }
      } catch (error) {
        setHandoffState({
          status: "error",
          message: error instanceof Error ? error.message : `Failed to prepare ${targetLabel} issue handoff.`,
        });
      }
    },
    [activeEpisode?.episodeId, activeLens, activeResult, refreshRecentEpisodes, upsertActiveEpisodeSpan],
  );

  // File upload handler — reads text from files and submits to ingestion
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsSearching(true);
    const results: string[] = [];

    for (const file of fileArray.slice(0, 5)) { // Max 5 files
      try {
        const text = await file.text();
        if (!text.trim()) continue;

        // Send to ingestion endpoint
        const resp = await fetch(PUBLIC_SEARCH_UPLOAD_API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: text.slice(0, 100_000),
            fileName: file.name,
            fileType: file.type || "text/plain",
          }),
        });
        const data = await resp.json();
        if (data.success && data.result) {
          const r = data.result;
          results.push(
            `${file.name}: ${r.extractedEntities?.length ?? 0} entities, ` +
            `${r.extractedSignals ?? 0} signals, ${r.extractedActions ?? 0} actions`
          );
        }
      } catch { /* non-fatal */ }
    }

    // Show upload summary as a result packet
    const entityNames = results.join("; ");
    const packet: ResultPacket = {
      query: `Uploaded ${fileArray.length} file(s): ${fileArray.map(f => f.name).join(", ")}`,
      entityName: "Upload Ingestion",
      answer: `Successfully ingested ${fileArray.length} file(s). ${entityNames || "Processing entities..."}. Content is queued for canonicalization and will enrich future searches.`,
      confidence: 60,
      sourceCount: fileArray.length,
      variables: [],
      nextQuestions: [
        "Generate my founder weekly reset — what changed, main contradiction, next 3 moves",
        "What entities were mentioned in the uploaded files?",
        "Build a pre-delegation packet from my uploaded context",
      ],
    };
    showResult(packet, activeLens);
    trackEvent("upload_complete", { fileCount: fileArray.length });
  }, [activeLens, showResult]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleRestoreHistory = useCallback((item: RecentSearchHistoryItem) => {
    setSubmittedQuery(item.query);
    setActiveTrace({
      trace: item.trace,
      latencyMs: item.latencyMs,
      classification: item.classification,
    });
    showResult(item.packet, item.lens as LensId);
    trackEvent("search_history_restore", {
      runId: item.runId,
      lens: item.lens,
      entity: item.entityName,
    });
  }, [showResult]);

  // Focus search on mount
  useEffect(() => {
    const timer = setTimeout(() => textareaRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div ref={revealRef} className="mx-auto flex min-h-full max-w-4xl flex-col px-6 py-8 lg:py-12">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            SEARCH CANVAS — The hero. Hidden when conversation active.
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {conversation.length === 0 && <div className="hidden text-center sm:block">
          <h1
            style={stagger("0s")}
            className="text-2xl font-semibold tracking-tight text-content sm:text-3xl lg:text-4xl text-balance"
          >
            Search any <span className="text-[#d97757]">company</span>, <span className="text-[#d97757]">founder</span>,{"\n"}or <span className="text-[#d97757]">market</span>.
          </h1>
          <p
            style={stagger("0.08s")}
            className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-content-secondary"
          >
            Get a research packet with evidence, contradictions, and next steps in minutes — not hours.
          </p>
        </div>}

        {/* ── Search input with upload dropzone ─────────────────────────── */}
        {/* On mobile during active search: show compact status instead of full input */}
        {isSearching && isMobileViewport && conversation.length > 0 && (
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#d97757]/30 bg-[#d97757]/10 px-4 py-3 sm:hidden">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#d97757]/30 border-t-[#d97757]" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-content">Researching {submittedQuery}...</div>
              <div className="text-[10px] text-content-muted">{activeLens} lens · deep diligence in progress</div>
            </div>
          </div>
        )}
        <div style={stagger("0.12s")} className={`mt-4 sm:mt-8 ${isSearching && isMobileViewport ? "hidden sm:block" : ""}`}>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`group relative rounded-2xl border transition-all duration-200 ${
              isDragging
                ? "border-white/[0.15] bg-white/[0.04] shadow-lg"
                : isSearching
                  ? "border-[#d97757]/30 bg-white/[0.02] shadow-[0_0_12px_rgba(217,119,87,0.15)] animate-pulse"
                  : "border-white/[0.06] bg-white/[0.02] shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
            } focus-within:border-white/[0.12] focus-within:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_4px_16px_rgba(0,0,0,0.25)] motion-reduce:animate-none`}
          >
            {isDragging && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[#d97757]/[0.08] backdrop-blur-sm">
                <div className="flex items-center gap-2 text-[#d97757]">
                  <Upload className="h-5 w-5" />
                  <span className="text-sm font-medium">Drop files to analyze</span>
                </div>
              </div>
            )}
            <textarea
              ref={textareaRef}
              id="nodebench-search-input"
              name="nodebenchSearch"
              value={input}
              onChange={(e) => {
                inputRef.current = e.target.value;
                setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search a company, describe your startup, upload files, or ask what to do next..."
              rows={1}
              className="w-full resize-none bg-transparent px-5 py-4 pr-36 text-[15px] text-content placeholder:text-content-muted/60 focus:outline-none min-h-[56px]"
              aria-label="Search NodeBench"
              data-testid="landing-search-input"
            />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFileUpload(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="absolute inset-y-0 right-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition-all hover:text-content-secondary hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 active:scale-[0.96]"
                aria-label="Upload files"
                title="Upload files (PDF, DOCX, CSV, JSON, TXT)"
              >
                <Upload className="h-4 w-4" />
              </button>
              {voice.isSupported && (
                <button
                  type="button"
                  onClick={() => voice.toggle()}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full text-content-muted transition-all hover:bg-white/[0.06] hover:text-content-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 active:scale-[0.96]"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                  {voice.isListening && (
                    <span className="absolute right-0.5 top-0.5 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSubmit(); }}
                disabled={!input.trim() && !isSearching}
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-[#d97757] text-white shadow-sm transition-all hover:bg-[#c4603f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100"
                aria-label="Search"
                data-testid="landing-search-submit"
              >
                {isSearching ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Lens selector ────────────────────────────────────────────────── */}
        <div style={stagger("0.16s")} className={`mt-4 flex flex-wrap items-center justify-center gap-1 ${isSearching && isMobileViewport ? "hidden sm:flex" : ""}`}>

          {LENSES.map((lens) => {
            const Icon = LENS_ICONS[lens.id];
            const isActive = activeLens === lens.id;
            return (
              <button
                key={lens.id}
                type="button"
                onClick={() => {
                  setActiveLens(lens.id);
                  trackEvent("lens_select", { lens: lens.id });
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                  isActive
                    ? "bg-white/[0.08] text-content border border-white/[0.12]"
                    : "text-content-muted border border-transparent hover:text-content-secondary hover:bg-white/[0.04]"
                }`}
                title={lens.description}
                aria-pressed={isActive}
                data-testid={`landing-lens-${lens.id}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {lens.label}
              </button>
            );
          })}
        </div>

        {/* ── Evidence Board: upload screenshots/media to compile into packet ── */}
        {conversation.length === 0 && !isSearching && (
          <EvidenceBoard
            onCompile={(_items: EvidenceItem[], suggestedQuery: string) => {
              setInput(suggestedQuery);
              handleSubmit(suggestedQuery);
            }}
          />
        )}

        {/* ── Visible aha: show what you get before you search ──────────── */}
        {conversation.length === 0 && (
          <div style={stagger("0.16s")} className="mx-auto mt-5 hidden max-w-2xl sm:block">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">Example: "Anthropic AI"</div>
              <div className="mt-2 text-[13px] leading-relaxed text-content">
                Anthropic holds a strong #2 position with differentiated safety research creating a defensible moat.
                <span className="ml-1 rounded bg-accent-primary/15 px-1 py-0.5 text-[10px] font-medium text-accent-primary">S1</span>
                <span className="ml-0.5 rounded bg-accent-primary/15 px-1 py-0.5 text-[10px] font-medium text-accent-primary">S4</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">95% confidence</span>
                <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-content-muted">20 sources</span>
                <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-content-muted">3 signals</span>
                <span className="rounded-md bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-400">2 contradictions</span>
              </div>
              <div className="mt-2 flex gap-3 text-[10px] text-content-muted">
                <span>Missing: install plan, benchmark memo, Slack one-pager</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Quick actions ──────────────────────────────────────────────── */}
        {conversation.length === 0 && (
          <div style={stagger("0.18s")} className="mt-4 space-y-4 sm:mt-6">
            {/* Mobile: compact lens-aware chips */}
            {isMobileViewport ? <div className="flex flex-wrap gap-2 sm:hidden" data-testid="landing-mobile-chips">
              {(LENS_QUICK_PROMPTS[activeLens] ?? DEFAULT_QUICK_PROMPTS).slice(0, 4).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setInput(chip.prompt);
                    handleSubmit(chip.prompt);
                  }}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-content-muted transition-all hover:bg-white/[0.06] hover:text-content"
                >
                  {chip.label}
                </button>
              ))}
            </div> : null}
            {/* Desktop: persona-aware prompt cards based on active lens */}
            {!isMobileViewport ? <div className="hidden gap-3 sm:grid sm:grid-cols-2" data-testid="landing-example-prompts">
              {(LENS_QUICK_PROMPTS[activeLens] ?? DEFAULT_QUICK_PROMPTS).map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setInput(action.prompt);
                    handleSubmit(action.prompt);
                  }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-white/[0.12] hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-content">{action.label}</div>
                      <p className="mt-1 text-xs leading-relaxed text-content-muted">{action.description}</p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-content-muted" aria-hidden="true" />
                  </div>
                </button>
              ))}
            </div> : null}

            {recentEpisodes.length > 0 ? (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted">
                  Continue From Recent Founder Episodes
                </div>
                <div className="mt-3 grid gap-2">
                  {recentEpisodes.slice(0, 2).map((episode) => (
                    <button
                      key={episode.episodeId}
                      type="button"
                      onClick={() => {
                        const nextQuery = episode.query ?? episode.entityName ?? "";
                        setInput(nextQuery);
                        textareaRef.current?.focus();
                      }}
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm text-content">{episode.entityName ?? episode.query ?? episode.episodeType}</div>
                        <div className="truncate text-xs text-content-muted">{episode.summary ?? `${episode.traceStepCount ?? 0} trace steps`}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-content-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {conversation.length === 0 && false && (
          <div style={stagger("0.2s")} className="mt-6">
            <div className="flex flex-wrap justify-center gap-2" data-testid="landing-example-prompts">
              {EXAMPLE_PROMPTS.map((example, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleExampleClick(example.text, example.lens)}
                  className="group inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-left text-[13px] text-content-muted transition-all duration-150 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  <span className="line-clamp-1">{example.text}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-content-muted/20 group-hover:text-content-muted/50 transition-colors" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Founder value prop (replaces internal dev data) ────────────── */}
        {conversation.length === 0 && false && (
          <div style={stagger("0.24s")} className="mt-12">
            <h2 className="text-center text-lg font-semibold text-content sm:text-xl">
              The invisible checklist VCs use to filter you out
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-sm text-content-muted">
              Before you write a single line of code, investors are scoring you on criteria they never share.
              NodeBench makes those criteria visible — starting from just an idea.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Is this a real market?",
                  description: "VCs check TAM, existing players, and timing before reading your deck. See exactly how they'd size your opportunity.",
                },
                {
                  title: "Why you, why now?",
                  description: "The #1 question every investor asks. NodeBench shows your founder-market fit gaps and what evidence you need.",
                },
                {
                  title: "What's your unfair advantage?",
                  description: "Distribution moat, technical defensibility, regulatory capture — which one do you have? Which one do they expect?",
                },
                {
                  title: "Who's already funded here?",
                  description: "See who raised, at what stage, from whom. Know the landscape before investors tell you about it.",
                },
                {
                  title: "What kills this idea?",
                  description: "Every VC looks for reasons to say no. Find the objections before your pitch and have answers ready.",
                },
                {
                  title: "What should you do first?",
                  description: "Ranked next steps based on your stage: validate the wedge, talk to users, build a prototype, or go straight to pitch.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-5 transition-colors hover:bg-white/[0.04] hover:border-white/[0.08]">
                  <div className="text-[13px] font-medium text-content">{item.title}</div>
                  <p className="mt-2 text-xs leading-relaxed text-content-muted/80">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading state — progressive skeleton + pipeline progress ─── */}
        {showSimplifiedLiveLoading && (
          <div className="mt-6 space-y-4">
            <LivePipelineProgress
              currentStep={convexSearch.state.status as PipelineStep ?? (activeTrace ? "searching" : null)}
              traceSteps={activeTrace?.trace}
              sourceCount={activeTrace?.trace?.filter((t) => t.step?.includes("search") || t.tool?.includes("search")).length ?? undefined}
              entityName={submittedQuery.split(/\s+/).slice(0, 3).join(" ") || undefined}
              elapsedMs={activeSearchRef.current?.startedAt ? Date.now() - activeSearchRef.current.startedAt : undefined}
            />
            <ResultWorkspaceSkeleton />
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            CHAT THREAD — Conversational results
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {activeResult && conversation.length > 0 && showFullWorkspace && !showSimplifiedLiveLoading && (
          <div ref={resultRef} className="mt-4" data-testid="landing-result-workspace">
            <ResultWorkspace
              packet={activeResult}
              lens={activeLens}
              trajectory={workspaceTrajectory}
              handoffState={handoffState}
              onFollowUp={(query) => {
                setInput(query);
                handleSubmit(query);
              }}
              onPublishSharedContext={handlePublishSharedContext}
              onDelegate={handleDelegate}
              onPublishStrategicAngle={handlePublishStrategicAngle}
              onDelegateStrategicAngle={handleDelegateStrategicAngle}
            />
          </div>
        )}

        {!showFullWorkspace && !showSimplifiedLiveLoading && (
          <div>
            <ChatThread
              entries={conversation}
              onFollowUp={(query) => {
                setInput(query);
                handleSubmit(query);
              }}
              onNewConversation={() => {
                abortActiveSearch();
                convexSearch.reset();
                convexResultHandledRef.current = null;
                setConversation([]);
                setActiveResult(null);
                setActiveTrace(null);
                setActiveEpisode(null);
                setIsSearching(false);
                setSubmittedQuery("");
                setInput("");
                setShowFullWorkspace(false);
                textareaRef.current?.focus();
              }}
            />
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            BELOW THE FOLD — Trust, Install, Proof
            Hidden when conversation is active (chat takes over the page)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {conversation.length === 0 && showInstallGuide && (<div ref={connectCardRef}>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShowInstallGuide(false)}
            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[12px] text-content-muted transition-all hover:bg-white/[0.06] hover:text-content"
          >
            Hide MCP steps
          </button>
        </div>


        {/* ── How it works ─────────────────────────────────────────────────── */}
        <div style={stagger("0.28s")} className="mt-12">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted text-center">
            How it works
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { step: "1", title: "Type your idea in one sentence", description: "\"AI tutoring for college students\" is enough. NodeBench identifies your market, stage, and the investor criteria that apply to you." },
              { step: "2", title: "See the invisible scorecard", description: "Get the exact checklist VCs, accelerators, and banks use to evaluate startups like yours — with your gaps highlighted." },
              { step: "3", title: "Know your next move", description: "Ranked actions: validate your wedge, find comparable raises, build the missing evidence, or generate a pitch-ready memo." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-semibold text-content-muted">
                  {item.step}
                </div>
                <div className="mt-3 text-[13px] font-medium text-content">{item.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-content-muted/80">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── MCP Bridge — connect your context ────────────────────────────── */}
        <div style={stagger("0.32s")} className="mt-12">
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            <h2 className="text-center text-base font-semibold text-content">
              Already building? Connect your context.
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center text-xs leading-relaxed text-content-muted">
              If you have a codebase, docs, or pitch deck — connect NodeBench-MCP.
              It indexes everything and keeps your investor readiness scorecard live as you build.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                { step: "1", label: "Install", detail: "One command" },
                { step: "2", label: "Init", detail: "Choose sources" },
                { step: "3", label: "Index", detail: "Auto-explore" },
                { step: "4", label: "Dashboard", detail: "Live and ready" },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center gap-1 text-center">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-semibold text-content-muted">
                    {s.step}
                  </div>
                  <div className="text-xs font-medium text-content">{s.label}</div>
                  <div className="text-[10px] text-content-muted">{s.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Install ──────────────────────────────────────────────────────── */}
        <div style={stagger("0.36s")} className="mt-8">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted text-center">
            Install in 10 seconds
          </div>
          <div className="mx-auto max-w-xl rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
            <div className="flex border-b border-white/[0.06]">
              {INSTALL_COMMANDS.map((cmd, i) => (
                <button
                  key={cmd.tab}
                  type="button"
                  onClick={() => { setActiveInstallTab(i); setCopiedInstall(false); }}
                  className={`flex-1 px-4 py-2.5 text-[12px] font-medium transition-colors ${
                    i === activeInstallTab
                      ? "text-content border-b-2 border-content bg-white/[0.03]"
                      : "text-content-muted hover:text-content-secondary"
                  }`}
                >
                  {cmd.tab}
                </button>
              ))}
            </div>
            <div className="relative px-5 py-4">
              {"note" in INSTALL_COMMANDS[activeInstallTab] && INSTALL_COMMANDS[activeInstallTab].note && (
                <div className="mb-2 text-[10px] text-content-muted">{INSTALL_COMMANDS[activeInstallTab].note}</div>
              )}
              <pre className="overflow-x-auto rounded-lg bg-white/[0.04] px-4 py-3 text-[12px] leading-relaxed text-content-secondary font-mono">
                {INSTALL_COMMANDS[activeInstallTab].code}
              </pre>
              <button
                type="button"
                onClick={handleCopyInstall}
                className="absolute right-6 top-5 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-medium text-content-muted transition-colors hover:bg-white/[0.08] hover:text-content"
                aria-label={copiedInstall ? "Copied" : "Copy to clipboard"}
              >
                {copiedInstall ? (
                  <><Check className="h-3 w-3 text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
                ) : (
                  <><ClipboardCopy className="h-3 w-3" />Copy</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Built by + status (single condensed line) ─────────────────── */}
        <div style={stagger("0.4s")} className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] text-content-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Operational
          </span>
          <span>Built by Homen Shum (Meta, JPMorgan)</span>
          <span>350 agent tools</span>
          <span>Open source</span>
          <button
            type="button"
            onClick={() => onNavigate("developers" as MainView, "/developers")}
            className="text-[#d97757] hover:underline"
          >
            View architecture
          </button>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={stagger("0.5s")} className="mt-16 mb-8 border-t border-white/[0.06] pt-6">
          <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-[12px] text-content-muted" aria-label="Footer">
            {[
              { label: "Dashboard", view: "founder-dashboard", path: "/founder" },
              { label: "Research", view: "research", path: "/research" },
              { label: "Decision Workbench", view: "deep-sim", path: "/deep-sim" },
              { label: "Developers", view: "developers", path: "/developers" },
              { label: "Pricing", view: "pricing", path: "/pricing" },
              { label: "Changelog", view: "changelog", path: "/changelog" },
              { label: "Legal", view: "legal", path: "/legal" },
            ].map((link, i) => (
              <span key={link.label} className="flex items-center">
                {i > 0 && <span aria-hidden="true" className="mr-1">&middot;</span>}
                <button
                  type="button"
                  onClick={() => onNavigate(link.view as MainView, link.path)}
                  className="px-2 py-1 transition-colors hover:text-content-secondary"
                >
                  {link.label}
                </button>
              </span>
            ))}
          </nav>
        </div>
        </div>)}
      </div>
    </div>
  );
});

export default ControlPlaneLanding;
