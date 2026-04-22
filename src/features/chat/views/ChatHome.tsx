/**
 * ChatHome -- Perplexity-style answer page.
 *
 * Answer first. Sources next. Trace later.
 * Single centered column, clean typography, inline citations.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Check, ChevronDown, ChevronRight, ChevronUp, Circle, Clock3, FileText, Link2, MessageSquareText, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { staggerDelay } from "@/lib/ui/stagger";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { LENSES, type LensId, type ResultPacket } from "@/features/controlPlane/components/searchTypes";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import {
  loadProductDraft,
  saveLastChatPath,
  saveProductDraft,
  shouldPersistDraftQueryInUrl,
} from "@/features/product/lib/productSession";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { useStreamingSearch, type ToolStage } from "@/hooks/useStreamingSearch";
import { useConvexApi } from "@/lib/convexApi";
import { buildOperatorContextHint, buildOperatorContextLabel } from "@/features/product/lib/operatorContext";
import { ProductIntakeComposer, type ProductComposerMode } from "@/features/product/components/ProductIntakeComposer";
import { ProductFileAssetPicker, type ProductFileAsset } from "@/features/product/components/ProductFileAssetPicker";
import { SaveToNotebookButton } from "@/features/agents/components/SaveToNotebookButton";
import { buildEntityPath } from "@/features/entities/lib/entityExport";
import { SessionArtifactsPanel } from "@/features/chat/components/SessionArtifactsPanel";
import { ClassificationChip } from "@/features/chat/components/ClassificationChip";
import { ChatShareSheet } from "@/features/chat/components/ChatShareSheet";
import { classifyPrompt, type PromptClassification } from "@/features/chat/lib/classifyPrompt";
import { buildChatSessionPath, buildChatShareUrl } from "@/features/chat/lib/threadRouting";
import { ThreadActionsSheet } from "@/features/chat/components/ThreadActionsSheet";
import { LowConfidenceCard, type LowConfidenceCardPayload } from "@/features/chat/components/LowConfidenceCard";
import {
  useConversationEngine,
  type ProductConversationActionItem,
  type ProductConversationCompiledTruthSection,
  type ProductConversationInterrupt,
  type ProductConversationProviderBudgetSummary,
  type ProductConversationRunEvent,
} from "@/features/chat/hooks/useConversationEngine";
import { uploadProductDraftFiles } from "@/features/product/lib/uploadDraftFiles";
import {
  deriveReportArtifactMode,
  extractEntitySubjectFromQuery,
  getReportArtifactLabel,
  type ReportArtifactMode,
} from "../../../../shared/reportArtifacts";
import { deriveCanonicalReportSections } from "../../../../shared/reportSections";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ReportSection = {
  id: string;
  title: string;
  body: string;
  status: "pending" | "building" | "complete";
  sourceRefIds?: string[];
};

type ReportSectionWithSkeleton = ReportSection & { skeleton?: boolean };

type EntityWorkspacePreview = {
  entity?: {
    slug?: string | null;
    name?: string | null;
  } | null;
  latest?: {
    sections?: unknown;
    sources?: unknown;
  } | null;
  timeline?: Array<{
    sections?: unknown;
    sources?: unknown;
  }> | null;
};

type RoutingInfo = {
  routingMode?: string;
  routingReason?: string;
  [key: string]: unknown;
};

const DEFAULT_LENS: LensId = "founder";
const STARTER_PROMPTS = [
  "What does this company actually do, and why does it matter now?",
  "Turn this job post into a role-fit report with risks and gaps.",
  "Summarize this company from my notes, screenshots, and saved context.",
  "Stripe prep brief for tomorrow's call.",
] as const;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizePacket(packet: Record<string, unknown> | null): ResultPacket | null {
  if (!packet) return null;
  return packet as unknown as ResultPacket;
}

function isLensId(value: string | null | undefined): value is LensId {
  return Boolean(value && LENSES.some((option) => option.id === value));
}

function resolvePreferredLens(args: {
  lensParam?: string | null;
  draftQuery?: string | null;
  draftLens?: string | null;
  preferredLens?: string | null;
}): LensId {
  if (isLensId(args.lensParam)) return args.lensParam;
  if (args.draftQuery?.trim() && isLensId(args.draftLens)) return args.draftLens;
  if (isLensId(args.preferredLens)) return args.preferredLens;
  if (isLensId(args.draftLens)) return args.draftLens;
  return DEFAULT_LENS;
}

function humanizeEntitySlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ");
  if (!normalized) return null;
  return normalized.replace(/\b\w/g, (match) => match.toUpperCase());
}

function slugifyEntityCandidate(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['".,()[\]{}]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function stageVisibility(stages: ToolStage[]): number {
  const doneTools = new Set(stages.filter((s) => s.status === "done").map((s) => s.tool?.toLowerCase()));
  if (doneTools.has("package")) return 4;
  if (doneTools.has("analyze")) return 4;
  if (doneTools.has("search")) return 2;
  if (doneTools.has("classify")) return 1;
  const doneCount = stages.filter((s) => s.status === "done").length;
  if (doneCount >= 3) return 4;
  if (doneCount >= 2) return 2;
  if (doneCount >= 1) return 1;
  return 0;
}

function deriveReportSections(
  packet: ResultPacket | null,
  isStreaming: boolean,
  stages: ToolStage[] = [],
  liveAnswerPreview: string | null = null,
  mode: ReportArtifactMode = "report",
): ReportSectionWithSkeleton[] {
  const sectionTitles =
    mode === "prep_brief"
      ? {
          whatItIs: "What to walk in knowing",
          whyItMatters: "Why they'll care",
          whatIsMissing: "Likely questions or objections",
          whatToDoNext: "Talk track and next move",
        }
      : {
          whatItIs: "What it is",
          whyItMatters: "Why it matters",
          whatIsMissing: "What is missing",
          whatToDoNext: "What to do next",
        };

  if (packet) {
    return deriveCanonicalReportSections(packet, { mode }).map((section) => ({
      id: section.id,
      title: section.title,
      body:
        section.body ||
        (section.id === "what-it-is"
          ? packet.answer || ""
          : ""),
      status: "complete",
      sourceRefIds: section.sourceRefIds,
    }));
  }

  if (!isStreaming) {
    return [
      { id: "what-it-is", title: sectionTitles.whatItIs, body: "Ask a question to start the report.", status: "pending" },
      { id: "why-it-matters", title: sectionTitles.whyItMatters, body: "The report will explain why this matters once the run starts.", status: "pending" },
      { id: "what-is-missing", title: sectionTitles.whatIsMissing, body: "Missing evidence and open questions will appear here.", status: "pending" },
      { id: "what-to-do-next", title: sectionTitles.whatToDoNext, body: "A concrete next move will appear here.", status: "pending" },
    ];
  }

  const visible = stageVisibility(stages);
  const templates: { id: string; title: string; buildingBody: string }[] = [
    { id: "what-it-is", title: sectionTitles.whatItIs, buildingBody: "The agent is classifying the request and gathering first sources." },
    { id: "why-it-matters", title: sectionTitles.whyItMatters, buildingBody: "This section fills in after the agent has enough signal." },
    { id: "what-is-missing", title: sectionTitles.whatIsMissing, buildingBody: "Gaps and uncertainties appear once the source sweep finishes." },
    { id: "what-to-do-next", title: sectionTitles.whatToDoNext, buildingBody: "The recommended next move is being assembled from the evidence." },
  ];

  return templates.map((t, i) => {
    if (i < visible) {
      return {
        id: t.id,
        title: t.title,
        body: i === 0 && liveAnswerPreview ? liveAnswerPreview : t.buildingBody,
        status: "building" as const,
      };
    }
    return { id: t.id, title: t.title, body: "", status: "pending" as const, skeleton: true };
  });
}

function normalizeStoredSections(value: unknown): ReportSectionWithSkeleton[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((section): ReportSectionWithSkeleton | null => {
      if (!section || typeof section !== "object") return null;
      const record = section as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : null;
      const title = typeof record.title === "string" ? record.title : null;
      const body = typeof record.body === "string" ? record.body : "";
      if (!id || !title) return null;
      const status: ReportSectionWithSkeleton["status"] =
        record.status === "pending" ||
        record.status === "building" ||
        record.status === "complete"
          ? record.status
          : "complete";
      return {
        id,
        title,
        body,
        status,
        sourceRefIds: Array.isArray(record.sourceRefIds)
          ? record.sourceRefIds.filter((entry): entry is string => typeof entry === "string")
          : undefined,
      };
    })
    .filter((section): section is ReportSectionWithSkeleton => section !== null);
}

function normalizeStoredSources(
  value: unknown,
): NonNullable<ResultPacket["sourceRefs"]> {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (source): source is NonNullable<ResultPacket["sourceRefs"]>[number] =>
      Boolean(source && typeof source === "object"),
  );
}

function normalizeCompiledTruthSections(
  value: ProductConversationCompiledTruthSection[] | null | undefined,
): ReportSectionWithSkeleton[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((section): ReportSectionWithSkeleton | null => {
      if (!section || typeof section !== "object") return null;
      const title = typeof section.title === "string" ? section.title.trim() : "";
      const sentences = Array.isArray(section.sentences)
        ? section.sentences
            .map((sentence) =>
              sentence && typeof sentence.text === "string" ? sentence.text.trim() : "",
            )
            .filter((sentence) => sentence.length > 0)
        : [];
      if (!title || sentences.length === 0) return null;
      return {
        id: section.id,
        title,
        body: sentences.join("\n\n"),
        status: "complete",
      };
    })
    .filter((section): section is ReportSectionWithSkeleton => section !== null);
}

function normalizeCompilerActions(
  value: ProductConversationActionItem[] | null | undefined,
): ProductConversationActionItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProductConversationActionItem =>
      Boolean(
        item &&
          typeof item.type === "string" &&
          typeof item.label === "string" &&
          typeof item.rationale === "string" &&
          typeof item.enabled === "boolean",
      ),
  );
}

function extractCompilerActionsFromRunEvents(
  value: ProductConversationRunEvent[] | null | undefined,
): ProductConversationActionItem[] {
  if (!Array.isArray(value)) return [];
  const latestActionEvent = [...value]
    .filter((event) => event.kind === "actions_compiled")
    .sort((left, right) => right.createdAt - left.createdAt)[0];
  const actions = (latestActionEvent?.payload as
    | { actions?: ProductConversationActionItem[] }
    | null)?.actions;
  return normalizeCompilerActions(actions ?? null);
}

function formatRuntimeDuration(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "n/a";
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(1)}s`;
}

function formatRuntimeTokens(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function formatCostUsd(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "$0.00";
  return `$${value.toFixed(2)}`;
}

function runtimeStatusClasses(status: "ok" | "warning" | "exceeded") {
  if (status === "exceeded") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }
  if (status === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
}

function runtimeStatusLabel(status: "ok" | "warning" | "exceeded") {
  if (status === "exceeded") return "Budget exceeded";
  if (status === "warning") return "Budget warning";
  return "Budget stable";
}

function formatRelativeTime(timestamp: number | null | undefined) {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp) || timestamp <= 0) return "Just now";
  const deltaMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.max(1, Math.round(deltaMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

function scrollClosestOverflowParentToTop(node: HTMLElement | null) {
  if (typeof window === "undefined" || !node) return;
  let current: HTMLElement | null = node;
  while (current) {
    const style = window.getComputedStyle(current);
    const overflowY = style.overflowY || style.overflow;
    const isScrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      current.scrollHeight > current.clientHeight + 1;
    if (isScrollable) {
      current.scrollTo({ top: 0, left: 0, behavior: "auto" });
      return;
    }
    current = current.parentElement;
  }
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function verdictLabel(
  verdict: "verified" | "provisionally_verified" | "needs_review" | "failed" | null | undefined,
) {
  if (verdict === "verified") return "Verified";
  if (verdict === "provisionally_verified") return "Provisionally verified";
  if (verdict === "needs_review") return "Needs review";
  if (verdict === "failed") return "Failed";
  return "In progress";
}

function verdictClasses(
  verdict: "verified" | "provisionally_verified" | "needs_review" | "failed" | null | undefined,
) {
  if (verdict === "verified") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
  }
  if (verdict === "provisionally_verified") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300";
  }
  if (verdict === "needs_review") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
  }
  if (verdict === "failed") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
  }
  return "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/[0.12] dark:bg-white/[0.05] dark:text-gray-300";
}

/* ------------------------------------------------------------------ */
/*  Citation chip                                                      */
/* ------------------------------------------------------------------ */

function CitationChip({ index, label, href }: { index: number; label: string; href?: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
    >
      [{index}]
      <span className="max-w-[100px] truncate">{label}</span>
    </a>
  );
}

function formatToolLabel(value: string | null | undefined) {
  if (!value) return "Working";
  return value
    .split("_")
    .join(" ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function progressStateClasses(state: "complete" | "active" | "pending") {
  if (state === "complete") {
    return "text-gray-100";
  }
  if (state === "active") {
    return "text-gray-100";
  }
  return "text-gray-400";
}

export type ConversationProgressItem = {
  id: string;
  label: string;
  detail: string;
  state: "complete" | "active" | "pending";
  children?: ReadonlyArray<{
    id: string;
    label: string;
    tone?: "complete" | "active" | "pending";
  }>;
};

function progressChildToneClasses(tone: "complete" | "active" | "pending" = "pending") {
  if (tone === "complete") {
    return "bg-[#151a20] text-gray-200";
  }
  if (tone === "active") {
    return "bg-[#171d25] text-gray-100";
  }
  return "bg-white/[0.03] text-gray-400";
}

function shouldShowProgressChildren(item: ConversationProgressItem, expandedItemId: string | null) {
  if (!item.children?.length) return false;
  return expandedItemId === item.id;
}

export function ConversationProgressCard({
  progressItems,
  completedProgressCount,
  isStreaming,
  defaultCollapsed = false,
}: {
  progressItems: readonly ConversationProgressItem[];
  completedProgressCount: number;
  isStreaming: boolean;
  defaultCollapsed?: boolean;
}) {
  const preferredExpandedId = useMemo(
    () =>
      progressItems.find((item) => item.state === "active" && (item.children?.length ?? 0) > 0)?.id ?? null,
    [progressItems],
  );
  const [expandedItemId, setExpandedItemId] = useState<string | null>(preferredExpandedId);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const previousPreferredExpandedIdRef = useRef<string | null>(preferredExpandedId);
  const collapsedSummaryItem = useMemo(
    () =>
      progressItems.find((item) => item.state === "active") ??
      progressItems.find((item) => item.state === "pending") ??
      progressItems.at(-1) ??
      null,
    [progressItems],
  );

  useEffect(() => {
    if (!expandedItemId) return;
    const currentExists = progressItems.some((item) => item.id === expandedItemId);
    if (!currentExists) {
      setExpandedItemId(preferredExpandedId);
    }
  }, [expandedItemId, preferredExpandedId, progressItems]);

  useEffect(() => {
    if (previousPreferredExpandedIdRef.current === preferredExpandedId) return;
    previousPreferredExpandedIdRef.current = preferredExpandedId;
    setExpandedItemId(preferredExpandedId);
  }, [preferredExpandedId]);

  useEffect(() => {
    setCollapsed(defaultCollapsed);
  }, [defaultCollapsed]);

  return (
    <div className="rounded-[28px] border border-white/[0.08] bg-[#161c24]/98 px-3 py-3 text-gray-100 shadow-[0_24px_56px_-38px_rgba(0,0,0,0.9)]">
      <button
        type="button"
        onClick={() => setCollapsed((open) => !open)}
        aria-expanded={!collapsed}
          className="flex w-full items-center gap-2 px-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
      >
        <span
          className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            isStreaming
              ? "border-sky-400/25 bg-sky-500/12 text-sky-200"
              : completedProgressCount === progressItems.length
                ? "border-emerald-400/18 bg-emerald-500/10 text-emerald-200"
                : "border-white/[0.08] bg-white/[0.03] text-gray-400"
          }`}
          aria-hidden
        >
          {completedProgressCount === progressItems.length && !isStreaming ? (
            <Check className="h-3.5 w-3.5" />
          ) : isStreaming ? (
            <Circle className="h-2.5 w-2.5 fill-current" />
          ) : (
            <Clock3 className="h-3.5 w-3.5" />
          )}
        </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-semibold tracking-[0.01em] text-white">Task Progress</div>
            {collapsed && collapsedSummaryItem ? (
              <div className="truncate pt-0.5 text-[11px] leading-4 text-gray-300">
                {collapsedSummaryItem.label}
              </div>
            ) : null}
          </div>
          <div className="ml-auto rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tracking-[0.08em] text-gray-300">
            {completedProgressCount}/{progressItems.length}
          </div>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02] text-gray-400">
          {collapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </span>
      </button>
      {!collapsed ? (
      <div className="mt-2 space-y-1.5">
        {progressItems.map((item) => {
          const itemExpanded = expandedItemId === item.id;
          return (
            <div
              key={item.id}
              className={`${
                item.state === "active"
                  ? "rounded-[20px] border border-sky-400/12 bg-[#1a2230] px-2.5 py-2.5"
                  : item.state === "complete"
                    ? "rounded-[16px] border border-white/[0.05] bg-[#192028] px-2 py-2"
                    : "rounded-[16px] border border-transparent px-1 py-1.25"
              } ${progressStateClasses(item.state)}`}
            >
              <button
                type="button"
                onClick={() =>
                  item.children?.length
                    ? setExpandedItemId(expandedItemId === item.id ? null : item.id)
                    : undefined
                }
                className="flex w-full items-start gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
                aria-expanded={item.children?.length ? itemExpanded : undefined}
              >
                <span
                  className={`mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center ${
                    item.state === "complete"
                      ? "text-emerald-400"
                      : item.state === "active"
                      ? "text-sky-300"
                      : "text-gray-500"
                }`}
                aria-hidden
                >
                  {item.state === "complete" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : item.state === "active" ? (
                    <Circle className="h-2.5 w-2.5 fill-current" />
                  ) : (
                    <Clock3 className="h-3.5 w-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-[1.1rem] text-white">{item.label}</p>
                  {item.detail ? (
                    <p className="mt-0.5 text-[11px] leading-[1.02rem] text-gray-300">{item.detail}</p>
                  ) : null}
                </div>
                {item.children?.length ? (
                  <span className="mt-0.5 inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-white/[0.05] bg-white/[0.02] text-gray-400">
                    {itemExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </span>
                ) : null}
              </button>
              {shouldShowProgressChildren(item, expandedItemId) ? (
                <div className="space-y-1 pl-6 pr-0.5 pb-0.25 pt-1.25">
                  {item.children.map((child) => (
                    <div
                      key={child.id}
                      className={`flex items-center gap-1.5 rounded-[12px] px-2 py-1 text-[10px] leading-[0.92rem] ${progressChildToneClasses(child.tone)}`}
                    >
                      <span
                        className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center ${
                          child.tone === "complete"
                            ? "text-emerald-300"
                            : child.tone === "active"
                              ? "text-sky-300"
                              : "text-gray-500"
                        }`}
                        aria-hidden
                      >
                        {child.tone === "complete" ? (
                          <Check className="h-3 w-3" />
                        ) : child.tone === "active" ? (
                          <Circle className="h-2 w-2 fill-current" />
                        ) : (
                          <Clock3 className="h-3 w-3" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">{child.label}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}

function ConversationArtifactCard({
  label,
  title,
  detail,
  preview,
  ctaLabel,
  onOpen,
  statusPill,
}: {
  label: string;
  title: string;
  detail: string;
  preview?: string | null;
  ctaLabel: string;
  onOpen: () => void;
  statusPill: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-[22px] border border-white/[0.08] bg-[#171e27]/98 px-3 py-3 text-left shadow-[0_18px_44px_-34px_rgba(0,0,0,0.9)] transition hover:border-white/[0.14] hover:bg-[#1b232d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-white/[0.08] bg-white/[0.05] text-gray-100">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-400">
              {label}
            </span>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-1.75 py-0.5 text-[9px] font-medium text-gray-200">
              {statusPill}
            </span>
          </div>
          <div className="mt-0.5 truncate text-[13px] font-medium text-white">{title}</div>
          <p
            className="mt-0.75 overflow-hidden text-[11px] leading-[1rem] text-gray-300"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {preview?.trim() || detail}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[9.5px] text-gray-400">
            <span>{detail}</span>
            <span aria-hidden>&bull;</span>
            <span className="font-medium text-gray-200 transition group-hover:text-white">{ctaLabel}</span>
          </div>
        </div>
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-gray-200">
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
}

function compactStatusMessage(value: string | null | undefined) {
  if (!value) return "";
  if (value.includes("could not reach the live search service")) {
    return "Search is reconnecting";
  }
  if (value.includes("Live refresh is unavailable right now")) {
    return "Refresh is reconnecting";
  }
  if (value.includes("Showing your latest saved report")) {
    return "Showing latest saved report";
  }
  return value;
}

function buildStreamingAssistantLead(
  liveAnswerPreview: string | null | undefined,
  condensedStatusMessage: string,
) {
  if (liveAnswerPreview?.trim()) return liveAnswerPreview.trim();
  if (condensedStatusMessage.toLowerCase().includes("reconnecting")) {
    return "Understood. I'm reconnecting search, checking what is already in this thread, and rebuilding the answer.";
  }
  if (condensedStatusMessage.toLowerCase().includes("saved report")) {
    return "Understood. I'm refreshing the answer and keeping the latest saved report available while I work.";
  }
  return "Understood. I'm gathering sources and shaping the first answer.";
}

const REPORT_SECTION_PLACEHOLDERS = new Set([
  "No clear summary was returned.",
  "The agent did not return a distinct why-this-matters section.",
  "No explicit gap was returned.",
  "No next action was returned.",
  "Ask a question to start the report.",
  "The report will explain why this matters once the run starts.",
  "Missing evidence and open questions will appear here.",
  "A concrete next move will appear here.",
]);

function sanitizeReportSectionBody(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  return REPORT_SECTION_PLACEHOLDERS.has(trimmed) ? "" : trimmed;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ChatHome = memo(function ChatHome() {
  useProductBootstrap();

  const navigate = useNavigate();
  const api = useConvexApi();
  const [searchParams] = useSearchParams();
  const surfaceParam = searchParams.get("surface");
  const queryParam = searchParams.get("q");
  const lensParam = searchParams.get("lens");
  const entityParam = searchParams.get("entity");
  const sessionParam = searchParams.get("session");
  const anonymousSessionId = getAnonymousProductSessionId();
  const [draft, setDraft] = useState(() => loadProductDraft());
  const meSnapshot = useQuery(
    api?.domains.product.me.getMeSnapshot ?? "skip",
    api?.domains.product.me.getMeSnapshot
      ? { anonymousSessionId }
      : "skip",
  );
  const generateUploadUrl = useMutation(
    api?.domains.product.me.generateUploadUrl ?? ("skip" as any),
  );
  const saveFileMutation = useMutation(
    api?.domains.product.me.saveFile ?? ("skip" as any),
  );
  const saveContextCapture = useMutation(
    api?.domains.product.me.saveContextCapture ?? ("skip" as any),
  );
  const resolveSessionInterrupt = useMutation(
    api?.domains?.product?.chat?.resolveSessionInterrupt ?? ("skip" as any),
  );
  const deleteSessionMutation = useMutation(
    api?.domains?.product?.chat?.deleteSession ?? ("skip" as any),
  );
  const renameSessionMutation = useMutation(
    api?.domains?.product?.chat?.renameSession ?? ("skip" as any),
  );
  const operatorProfile = meSnapshot?.profile ?? null;
  const operatorContextHint = useMemo(() => buildOperatorContextHint(operatorProfile), [operatorProfile]);
  const operatorContextLabel = useMemo(() => buildOperatorContextLabel(operatorProfile), [operatorProfile]);
  const entityContextHint = useMemo(() => {
    const entityName = humanizeEntitySlug(entityParam);
    return entityName
      ? `Primary entity for this run: ${entityName}. Keep the brief anchored on this subject unless the user explicitly changes it.`
      : null;
  }, [entityParam]);
  const runtimeContextHint = useMemo(
    () => [entityContextHint, operatorContextHint].filter(Boolean).join("\n\n") || null,
    [entityContextHint, operatorContextHint],
  );
  const initialQuery = queryParam ?? draft?.query ?? "";
  const initialLens = resolvePreferredLens({
    lensParam,
    draftQuery: draft?.query,
    draftLens: draft?.lens,
    preferredLens: operatorProfile?.preferredLens,
  });

  const [input, setInput] = useState(initialQuery);
  const [lens, setLens] = useState<LensId>(initialLens);
  const [copiedLink, setCopiedLink] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [draftFiles, setDraftFiles] = useState(() => draft?.files ?? []);
  const [composerMode, setComposerMode] = useState<ProductComposerMode>("ask");
  const [savingCapture, setSavingCapture] = useState(false);
  const [runtimeOpen, setRuntimeOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"conversation" | "steps" | "artifacts" | "files">("conversation");
  const detailContentRef = useRef<HTMLDivElement | null>(null);
  const threadSurfaceRef = useRef<HTMLDivElement | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [showThreadShelf, setShowThreadShelf] = useState(false);
  const [inferredClassification, setInferredClassification] = useState<PromptClassification | null>(null);
  const [lockedClassification, setLockedClassification] = useState<PromptClassification | null>(null);
  const [threadActionsOpen, setThreadActionsOpen] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const skipNextDraftAutostartRef = useRef(false);
  const previousActiveSessionIdRef = useRef<string | null>(sessionParam?.trim() || null);
  const [favoriteSessionIds, setFavoriteSessionIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.localStorage.getItem("nb.chat.favorites");
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set<string>(parsed) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < 3) {
      setInferredClassification(null);
      return;
    }
    const timer = window.setTimeout(() => {
      setInferredClassification(classifyPrompt(trimmed));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [input]);
  const persistDraft = useCallback(
    (next: { query: string; lens: LensId; files?: ProductFileAsset[] | typeof draftFiles }) => {
      const normalizedFiles = next.files ?? [];
      const updatedAt = Date.now();
      setDraft({
        query: next.query,
        lens: next.lens,
        files: normalizedFiles,
        updatedAt,
      });
      saveProductDraft({
        query: next.query,
        lens: next.lens,
        files: normalizedFiles,
      });
    },
    [],
  );
  const handleConversationSessionChange = useCallback(
    (sessionId: string | null) => {
      const nextUrl = buildChatSessionPath({
        entitySlug: entityParam?.trim() || null,
        lens,
        sessionId,
      });
      if (`/?${window.location.search.replace(/^\?/, "")}` !== nextUrl) {
        navigate(nextUrl, { replace: true });
      }
    },
    [entityParam, lens, navigate],
  );
  const conversation = useConversationEngine({
    anonymousSessionId,
    entitySlugHint: entityParam?.trim() || null,
    contextHint: runtimeContextHint ?? null,
    contextLabel: operatorContextLabel ?? null,
    includeSessionList: true,
    sessionListLimit: 24,
    activeSessionId: sessionParam?.trim() || null,
    onActiveSessionChange: handleConversationSessionChange,
  });
  const queryEntitySubject = useMemo(
    () =>
      extractEntitySubjectFromQuery(
        conversation.startedQuery ?? queryParam ?? draft?.query ?? null,
      ) ?? null,
    [conversation.startedQuery, draft?.query, queryParam],
  );
  const cachedEntityLookupTerm = useMemo(
    () => humanizeEntitySlug(entityParam) ?? queryEntitySubject,
    [entityParam, queryEntitySubject],
  );
  const cachedEntitySlug = useMemo(() => {
    if (entityParam?.trim()) return entityParam.trim();
    const derived = slugifyEntityCandidate(cachedEntityLookupTerm);
    return derived || null;
  }, [cachedEntityLookupTerm, entityParam]);
  const cachedWorkspace = useQuery(
    api?.domains.product.entities.getEntityWorkspace ?? "skip",
    api?.domains.product.entities.getEntityWorkspace && cachedEntitySlug
      ? { anonymousSessionId, entitySlug: cachedEntitySlug }
      : "skip",
  ) as EntityWorkspacePreview | null | undefined;
  const systemWorkspace = useQuery(
    api?.domains?.product?.systemIntelligence?.getSystemEntityWorkspace ?? "skip",
    api?.domains?.product?.systemIntelligence?.getSystemEntityWorkspace && cachedEntitySlug
      ? { entitySlug: cachedEntitySlug }
      : "skip",
  ) as EntityWorkspacePreview | null | undefined;
  const streaming = conversation.streaming;
  const recordedMilestonesRef = useRef({
    firstSignal: false,
    firstSource: false,
    firstPartialAnswer: false,
    reportSaved: false,
  });

  /* ---- begin run ---- */

  const beginRun = useCallback(
    async (nextQuery: string, nextLens: LensId) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) return;

      recordedMilestonesRef.current = { firstSignal: false, firstSource: false, firstPartialAnswer: false, reportSaved: false };

      persistDraft({ query: trimmed, lens: nextLens, files: draftFiles });
      const nextSearch = new URLSearchParams();
      nextSearch.set("surface", "chat");
      nextSearch.set("lens", nextLens);
      if (shouldPersistDraftQueryInUrl(trimmed)) {
        nextSearch.set("q", trimmed);
      } else {
        nextSearch.set("draft", "1");
      }
      nextSearch.delete("session");
      if (entityParam?.trim()) nextSearch.set("entity", entityParam.trim());
      if (window.location.search !== `?${nextSearch.toString()}`) {
        navigate(`/?${nextSearch.toString()}`, { replace: true });
      }
      setInput("");
      trackEvent("chat_run_started", { queryLength: trimmed.length, uploads: draft?.files?.length ?? 0, lens: nextLens });
      await conversation.beginRun({
        query: trimmed,
        lens: nextLens,
        files: draftFiles,
      });
    },
    [conversation, draft?.files?.length, draftFiles, entityParam, navigate, persistDraft],
  );

  /* ---- search-param sync ---- */

  useEffect(() => {
    const nextQuery = queryParam;
    const nextLens = lensParam;
    if (!sessionParam && nextQuery) setInput(nextQuery);
    if (isLensId(nextLens)) setLens(nextLens);
  }, [lensParam, queryParam, sessionParam]);

  useEffect(() => {
    const nextLens = resolvePreferredLens({
      lensParam,
      draftQuery: draft?.query,
      draftLens: draft?.lens,
      preferredLens: operatorProfile?.preferredLens,
    });
    if (lens !== nextLens) {
      setLens(nextLens);
    }
  }, [draft?.lens, draft?.query, lens, lensParam, operatorProfile?.preferredLens]);

  useEffect(() => {
    if (sessionParam?.trim()) return;
    if (skipNextDraftAutostartRef.current) {
      skipNextDraftAutostartRef.current = false;
      return;
    }
    const nextQuery = queryParam ?? draft?.query ?? "";
    const nextLens = resolvePreferredLens({
      lensParam,
      draftQuery: draft?.query,
      draftLens: draft?.lens,
      preferredLens: operatorProfile?.preferredLens,
    });
    if (!nextQuery.trim()) return;
    if (conversation.startedQuery === nextQuery.trim()) return;
    setInput(nextQuery);
    setLens(nextLens);
    void beginRun(nextQuery, nextLens);
  }, [beginRun, conversation.startedQuery, draft?.lens, draft?.query, lensParam, operatorProfile?.preferredLens, queryParam, sessionParam]);

  const handleLensChange = useCallback(
    (nextLens: LensId) => {
      setLens(nextLens);
      persistDraft({
        query: input,
        lens: nextLens,
        files: draftFiles,
      });

      const nextSearch = new URLSearchParams(window.location.search);
      nextSearch.set("surface", "chat");
      nextSearch.set("lens", nextLens);
      if (conversation.activeSessionId?.trim()) {
        nextSearch.set("session", conversation.activeSessionId.trim());
        nextSearch.delete("q");
        nextSearch.delete("draft");
      } else {
        const trimmed = input.trim();
        if (trimmed && shouldPersistDraftQueryInUrl(trimmed)) {
          nextSearch.set("q", trimmed);
          nextSearch.delete("draft");
        } else if (trimmed) {
          nextSearch.set("draft", "1");
          nextSearch.delete("q");
        }
      }
      if (entityParam?.trim()) {
        nextSearch.set("entity", entityParam.trim());
      }
      const nextUrl = `/?${nextSearch.toString()}`;
      if (`/?${window.location.search.replace(/^\?/, "")}` !== nextUrl) {
        navigate(nextUrl, { replace: true });
      }
    },
    [conversation.activeSessionId, draftFiles, entityParam, input, navigate, persistDraft],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const classification = classifyPrompt(trimmed);
    setLockedClassification(classification);
    const inferredLens = classification.personas[0] ?? lens;
    if (inferredLens !== lens) setLens(inferredLens);
    trackEvent("chat_inference", {
      personas: classification.personas.join(","),
      intents: classification.intents.join(","),
      runtime: classification.runtime,
      confidence: classification.confidence,
    });
    void beginRun(trimmed, inferredLens);
  }, [beginRun, input, lens]);

  const activeSessionId = conversation.activeSessionId ?? null;
  const isCurrentFavorite = activeSessionId ? favoriteSessionIds.has(activeSessionId) : false;

  const persistFavorites = useCallback((next: Set<string>) => {
    setFavoriteSessionIds(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("nb.chat.favorites", JSON.stringify(Array.from(next)));
      } catch {
        /* quota exceeded — ignore */
      }
    }
  }, []);

  const handleFavoriteThread = useCallback(() => {
    if (!activeSessionId) {
      toast.message("Start a thread to favorite it.");
      return;
    }
    const next = new Set(favoriteSessionIds);
    const wasFavorite = next.has(activeSessionId);
    if (wasFavorite) {
      next.delete(activeSessionId);
      persistFavorites(next);
      toast.message("Removed from favorites");
    } else {
      next.add(activeSessionId);
      persistFavorites(next);
      toast.success("Added to favorites");
    }
    trackEvent("chat_thread_favorite", { sessionId: activeSessionId, favorited: wasFavorite ? 0 : 1 });
  }, [activeSessionId, favoriteSessionIds, persistFavorites]);

  const handleRenameThread = useCallback(async () => {
    if (!activeSessionId || !api) return;
    const next = typeof window !== "undefined" ? window.prompt("Rename thread", "") : null;
    if (!next || next.trim().length === 0) return;
    const trimmed = next.trim().slice(0, 200);
    try {
      await renameSessionMutation({
        anonymousSessionId,
        sessionId: activeSessionId as any,
        title: trimmed,
      });
      toast.success(`Renamed to "${trimmed.slice(0, 40)}"`);
      trackEvent("chat_thread_rename", { sessionId: activeSessionId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to rename thread";
      toast.error(message);
    }
  }, [activeSessionId, api, anonymousSessionId, renameSessionMutation]);

  const handleViewAllFiles = useCallback(() => {
    const nextSearch = new URLSearchParams();
    nextSearch.set("surface", "me");
    nextSearch.set("section", "files");
    if (activeSessionId) nextSearch.set("session", activeSessionId);
    navigate(`/?${nextSearch.toString()}`);
    trackEvent("chat_thread_view_files", { sessionId: activeSessionId ?? "none" });
  }, [activeSessionId, navigate]);

  const handleRunDetails = useCallback(() => {
    if (!activeSessionId) {
      toast.message("No active thread to inspect.");
      return;
    }
    const nextSearch = new URLSearchParams();
    nextSearch.set("surface", "telemetry");
    nextSearch.set("session", activeSessionId);
    navigate(`/?${nextSearch.toString()}`);
    trackEvent("chat_thread_run_details", { sessionId: activeSessionId });
  }, [activeSessionId, navigate]);

  const handleDeleteThread = useCallback(async () => {
    if (!activeSessionId || !api) return;
    const confirmed = typeof window !== "undefined"
      ? window.confirm("Delete this thread? Messages, attached files, and trace history will be removed.")
      : false;
    if (!confirmed) return;
    const targetId = activeSessionId;
    try {
      await deleteSessionMutation({
        anonymousSessionId,
        sessionId: targetId as any,
      });
      toast.success("Thread deleted");
      trackEvent("chat_thread_delete", { sessionId: targetId });
      const params = new URLSearchParams(window.location.search);
      params.delete("session");
      params.delete("runId");
      navigate(`/?${params.toString()}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete thread";
      toast.error(message);
    }
  }, [activeSessionId, api, anonymousSessionId, deleteSessionMutation, navigate]);

  const pendingFiles = draftFiles;

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      if (!files.length || !api) return;
      setUploadingFiles(true);
      try {
        const uploaded = await uploadProductDraftFiles({
          files,
          anonymousSessionId,
          generateUploadUrl,
          saveFileMutation,
        });
        const nextFiles = [...pendingFiles, ...uploaded];
        setDraftFiles(nextFiles);
        persistDraft({
          query: input,
          lens,
          files: nextFiles,
        });
        toast.success("Saved to Files · View");
      } finally {
        setUploadingFiles(false);
      }
    },
    [anonymousSessionId, api, generateUploadUrl, input, lens, pendingFiles, persistDraft, saveFileMutation],
  );

  const handleSelectVaultFile = useCallback(
    (file: ProductFileAsset) => {
      const nextFile = {
        evidenceId: file._id as never,
        name: file.label || "Saved file",
        type: file.mimeType || file.type || "application/octet-stream",
        size: typeof file.size === "number" ? file.size : undefined,
      };
      const nextFiles = [
        nextFile,
        ...pendingFiles.filter((candidate) => candidate.evidenceId !== nextFile.evidenceId),
      ];
      setDraftFiles(nextFiles);
      persistDraft({
        query: input,
        lens,
        files: nextFiles,
      });
      setShowFilePicker(false);
      toast.success("Attached from Files");
    },
    [input, lens, pendingFiles, persistDraft],
  );

  const handleSaveCapture = useCallback(
    async (mode: Exclude<ProductComposerMode, "ask">, value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setSavingCapture(true);
      try {
        await saveContextCapture({
          anonymousSessionId,
          type: mode,
          content: trimmed,
          entitySlug: entityParam?.trim() || undefined,
        });
        setInput("");
        setComposerMode("ask");
        persistDraft({
          query: "",
          lens,
          files: draftFiles,
        });
        toast.success(mode === "note" ? "Note saved to inbox" : "Task saved to inbox");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save quick capture");
      } finally {
        setSavingCapture(false);
      }
    },
    [anonymousSessionId, draftFiles, entityParam, lens, persistDraft, saveContextCapture],
  );

  /* ---- derived state (must be before effects that reference them) ---- */

  const packet = normalizePacket(streaming.result);
  const persistedReport = (conversation.sessionResult?.report ?? null) as
    | {
        _id: string;
        entitySlug?: string | null;
        pinned?: boolean;
        summary?: string | null;
        sections?: unknown;
        sources?: unknown;
        routing?: RoutingInfo | null;
      }
    | null;
  const persistedReportSections = useMemo(
    () => normalizeStoredSections(persistedReport?.sections ?? null),
    [persistedReport?.sections],
  );
  const draftSections = useMemo(
    () =>
      normalizeStoredSections(
        (conversation.sessionResult?.draft as { sections?: unknown } | null | undefined)?.sections ?? null,
      ),
    [conversation.sessionResult?.draft],
  );
  const persistedSources = useMemo(
    () => normalizeStoredSources(persistedReport?.sources ?? null),
    [persistedReport?.sources],
  );
  const cachedWorkspaceLatest = useMemo(
    () => cachedWorkspace?.latest ?? cachedWorkspace?.timeline?.[0] ?? null,
    [cachedWorkspace?.latest, cachedWorkspace?.timeline],
  );
  const systemWorkspaceLatest = useMemo(
    () => systemWorkspace?.latest ?? systemWorkspace?.timeline?.[0] ?? null,
    [systemWorkspace?.latest, systemWorkspace?.timeline],
  );
  const cachedSections = useMemo(
    () => normalizeStoredSections(cachedWorkspaceLatest?.sections ?? null),
    [cachedWorkspaceLatest?.sections],
  );
  const systemSections = useMemo(
    () => normalizeStoredSections(systemWorkspaceLatest?.sections ?? null),
    [systemWorkspaceLatest?.sections],
  );
  const cachedSources = useMemo(
    () => normalizeStoredSources(cachedWorkspaceLatest?.sources ?? null),
    [cachedWorkspaceLatest?.sources],
  );
  const systemSources = useMemo(
    () => normalizeStoredSources(systemWorkspaceLatest?.sources ?? null),
    [systemWorkspaceLatest?.sources],
  );
  const artifactMode = deriveReportArtifactMode(conversation.startedQuery ?? input);
  const liveSections = deriveReportSections(
    packet,
    streaming.isStreaming,
    streaming.stages,
    streaming.liveAnswerPreview,
    artifactMode,
  );
  const compiledTruthSections = useMemo(
    () =>
      normalizeCompiledTruthSections(
        persistedReport?.compiledAnswerV2?.truthSections ?? null,
      ),
    [persistedReport?.compiledAnswerV2?.truthSections],
  );
  const compiledActionItems = useMemo(
    () => {
      const persisted = normalizeCompilerActions(
        persistedReport?.compiledAnswerV2?.actions ?? null,
      );
      if (persisted.length > 0) return persisted;
      return extractCompilerActionsFromRunEvents(
        (conversation.sessionResult?.runEvents as ProductConversationRunEvent[] | null | undefined) ??
          null,
      );
    },
    [conversation.sessionResult?.runEvents, persistedReport?.compiledAnswerV2?.actions],
  );
  const reportSections =
    packet
      ? liveSections
      : compiledTruthSections.length > 0
        ? compiledTruthSections
        : persistedReportSections.length > 0
        ? persistedReportSections
        : cachedSections.length > 0
          ? cachedSections
          : systemSections.length > 0
            ? systemSections
            : !streaming.isStreaming && draftSections.length > 0
            ? draftSections
            : liveSections;
  const conversationReportSections = useMemo(
    () =>
      reportSections
        .filter((section) => !section.skeleton && section.status === "complete")
        .map((section) => ({
          ...section,
          body: sanitizeReportSectionBody(section.body),
        }))
        .filter((section) => Boolean(section.body)),
    [reportSections],
  );
  const sources: NonNullable<ResultPacket["sourceRefs"]> =
    packet?.sourceRefs && packet.sourceRefs.length > 0
      ? packet.sourceRefs
      : streaming.sourcePreview.length > 0
        ? (streaming.sourcePreview as NonNullable<ResultPacket["sourceRefs"]>)
        : persistedSources.length > 0
          ? persistedSources
          : cachedSources.length > 0
            ? cachedSources
            : systemSources;
  const routing = (streaming.routing ?? persistedReport?.routing ?? conversation.session?.routing ?? null) as RoutingInfo | null;
  const resolvedEntitySlug =
    conversation.savedEntitySlug ??
    persistedReport?.entitySlug ??
    cachedWorkspace?.entity?.slug ??
    systemWorkspace?.entity?.slug ??
    cachedEntitySlug ??
    entityParam?.trim() ??
    null;
  const resolvedEntityName =
    cachedWorkspace?.entity?.name?.trim() ||
    systemWorkspace?.entity?.name?.trim() ||
    humanizeEntitySlug(resolvedEntitySlug) ||
    null;
  const fullReportPath = resolvedEntitySlug
    ? `${buildEntityPath(resolvedEntitySlug)}?view=read`
    : null;
  const hasArtifactFallback =
    cachedSections.length > 0 || systemSections.length > 0;
  const hasRun = Boolean(
    conversation.startedQuery?.trim() ||
      conversation.activeSessionId ||
      streaming.milestones.startedAt ||
      packet ||
      persistedReportSections.length > 0 ||
      cachedSections.length > 0 ||
      systemSections.length > 0 ||
      persistedSources.length > 0 ||
      cachedSources.length > 0 ||
      systemSources.length > 0,
  );
  const runEvents = useMemo(
    () =>
      Array.isArray(conversation.sessionResult?.runEvents)
        ? (conversation.sessionResult.runEvents as ProductConversationRunEvent[])
        : [],
    [conversation.sessionResult?.runEvents],
  );
  const providerBudgetSummary = (conversation.sessionResult?.providerBudgetSummary ??
    null) as ProductConversationProviderBudgetSummary | null;
  const claimSummary = useMemo(
    () =>
      conversation.sessionResult?.claimSummary && typeof conversation.sessionResult.claimSummary === "object"
        ? conversation.sessionResult.claimSummary
        : null,
    [conversation.sessionResult?.claimSummary],
  );
  const resolutionCandidates = useMemo(
    () =>
      Array.isArray(conversation.sessionResult?.resolutionCandidates)
        ? conversation.sessionResult.resolutionCandidates
        : [],
    [conversation.sessionResult?.resolutionCandidates],
  );
  const interrupts = useMemo(
    () =>
      Array.isArray(conversation.sessionResult?.interrupts)
        ? (conversation.sessionResult.interrupts as ProductConversationInterrupt[])
        : [],
    [conversation.sessionResult?.interrupts],
  );
  const pendingInterrupts = useMemo(
    () => interrupts.filter((interrupt) => interrupt.status === "pending"),
    [interrupts],
  );
  const runtimeHasData = Boolean(
    streaming.stages.length > 0 ||
      runEvents.length > 0 ||
      pendingInterrupts.length > 0 ||
      (providerBudgetSummary?.providers.length ?? 0) > 0 ||
      (claimSummary?.totalClaims ?? 0) > 0 ||
      resolutionCandidates.length > 0 ||
      conversation.session?.resolutionState ||
      conversation.session?.artifactState,
  );
  const latestRuntimeEvents = useMemo(
    () => [...runEvents].sort((left, right) => right.createdAt - left.createdAt).slice(0, 6),
    [runEvents],
  );
  const sessionList = conversation.sessionList ?? [];
  const sessionSections = useMemo(() => {
    const active = sessionList.filter((session) => session.status === "streaming" || session.status === "queued");
    const attention = sessionList.filter(
      (session) =>
        session.needsAttention &&
        !active.some((candidate) => candidate._id === session._id),
    );
    const recent = sessionList.filter(
      (session) =>
        !active.some((candidate) => candidate._id === session._id) &&
        !attention.some((candidate) => candidate._id === session._id),
    );
    return [
      { id: "active", label: "Active", items: active },
      { id: "recent", label: "Recent", items: recent },
      { id: "attention", label: "Needs attention", items: attention },
    ];
  }, [sessionList]);
  const sessionFiles = useMemo(
    () =>
      Array.isArray(conversation.sessionResult?.sessionFiles)
        ? conversation.sessionResult.sessionFiles
        : [],
    [conversation.sessionResult?.sessionFiles],
  );
  const selectedSessionSummary = useMemo(() => {
    if (conversation.session) return conversation.session;
    if (!conversation.activeSessionId) return null;
    return sessionList.find((session) => session._id === conversation.activeSessionId) ?? null;
  }, [conversation.activeSessionId, conversation.session, sessionList]);
  const visibleMessages = useMemo(
    () => conversation.sessionMessages.filter((message) => message.content?.trim().length > 0),
    [conversation.sessionMessages],
  );
  const threadTitle =
    selectedSessionSummary?.title?.trim() ||
    conversation.startedQuery?.trim() ||
    input.trim() ||
    "New thread";
  const threadSummary =
    selectedSessionSummary?.latestSummary?.trim() ||
    conversation.currentSummary?.trim() ||
    (packet?.answer ? String(packet.answer).trim() : "") ||
    "";
  const normalizedThreadSummary = sanitizeReportSectionBody(threadSummary);
  const gateResults = selectedSessionSummary?.gateResults ?? [];
  const sessionResolutionState =
    conversation.session?.resolutionState ??
    (selectedSessionSummary as
      | {
          resolutionState?: "exact" | "probable" | "ambiguous" | "unresolved" | null;
        }
      | null
      | undefined)?.resolutionState ??
    null;
  const sessionArtifactState =
    conversation.session?.artifactState ??
    (selectedSessionSummary as
      | {
          artifactState?: "none" | "draft" | "saved" | "published" | null;
        }
      | null
      | undefined)?.artifactState ??
    null;
  const sessionSaveEligibility =
    conversation.session?.saveEligibility ??
    (selectedSessionSummary as
      | {
          saveEligibility?: "blocked" | "draft_only" | "save_ready" | "publish_ready" | null;
        }
      | null
      | undefined)?.saveEligibility ??
    null;
  const sessionSaveEligibilityReason = conversation.session?.saveEligibilityReason ?? null;
  const sessionStatus =
    conversation.session?.status ??
    selectedSessionSummary?.status ??
    null;
  const sessionNeedsAttention = Boolean(selectedSessionSummary?.needsAttention);
  const sessionLookupPending = Boolean(
    conversation.activeSessionId &&
      !streaming.isStreaming &&
      (conversation.sessionResult === undefined || sessionList === undefined),
  );
  const sessionLookupMissing = Boolean(
    conversation.activeSessionId &&
      !streaming.isStreaming &&
      conversation.sessionResult === null &&
      sessionList !== undefined &&
      !selectedSessionSummary,
  );
  const sessionIsHydrating = Boolean(
    conversation.activeSessionId &&
      sessionLookupPending &&
      !conversation.session &&
      !selectedSessionSummary,
  );
  const hasRenderableThread = Boolean(
    conversation.activeSessionId ||
      conversation.startedQuery?.trim() ||
      streaming.isStreaming ||
      packet ||
      sessionLookupPending ||
      sessionLookupMissing,
  );
  const sessionIsLive =
    streaming.isStreaming || sessionStatus === "streaming" || sessionStatus === "queued";
  const hasMeaningfulPacketAnswer = Boolean(sanitizeReportSectionBody(packet?.answer));
  const hasSettledAnswerContent = Boolean(
    normalizedThreadSummary.trim() ||
      hasMeaningfulPacketAnswer ||
      conversationReportSections.length > 0,
  );
  const threadHasSettledSummary = Boolean(
    hasSettledAnswerContent ||
      sessionArtifactState === "saved" ||
      sessionArtifactState === "published" ||
      sessionSaveEligibility === "save_ready" ||
      sessionSaveEligibility === "publish_ready",
  );
  const displayNeedsAttention =
    sessionNeedsAttention && !(hasArtifactFallback || threadHasSettledSummary);
  const canOpenFullReport = Boolean(
    fullReportPath &&
      (sessionArtifactState === "saved" ||
        sessionArtifactState === "published" ||
        persistedReport?.status === "saved" ||
        persistedReport?.status === "published"),
  );
  const canPinReport = Boolean(
    (conversation.savedReportId || persistedReport) &&
      !streaming.isStreaming &&
      (sessionArtifactState === "saved" ||
        sessionArtifactState === "published" ||
        persistedReport?.status === "saved" ||
        persistedReport?.status === "published"),
  );
  const statusMessage =
    streaming.error && hasArtifactFallback
      ? "Live refresh is unavailable right now. Showing your latest saved report."
      : streaming.error && canOpenFullReport
        ? "Live refresh is unavailable right now. Open the current report while the backend reconnects."
      : streaming.isStreaming && !packet && hasArtifactFallback
        ? "Showing your latest saved report while NodeBench refreshes it."
        : conversation.persistenceMessage;
  const condensedStatusMessage = compactStatusMessage(statusMessage);
  const followUps = ["Go deeper", "Show risks", "Draft reply", "What changed?"];
  const currentLensLabel =
    LENSES.find((option) => option.id === lens)?.label ?? "Founder";
  const syntheticAssistantContent = useMemo(() => {
    const hasMeaningfulAssistantLikeMessage = visibleMessages.some(
      (message) =>
        message.role !== "user" &&
        message.role !== "system" &&
        String(message.content ?? "").trim().length > 0,
    );
    if (hasMeaningfulAssistantLikeMessage) return null;
    if (streaming.isStreaming) {
      return buildStreamingAssistantLead(streaming.liveAnswerPreview, condensedStatusMessage);
    }
    if (normalizedThreadSummary?.trim()) {
      return normalizedThreadSummary.trim();
    }
    if (conversation.startedQuery?.trim()) {
      const normalizedStatus = condensedStatusMessage.toLowerCase();
      if (
        selectedSessionSummary?.verdict === "failed" ||
        normalizedStatus.includes("reconnect") ||
        normalizedStatus.includes("unavailable")
      ) {
        return "Understood. The run reconnected before the first clean answer landed. I kept the trace and draft below so you can retry from this thread.";
      }
      if (hasRun) {
        return "Understood. I'm locking the request, gathering current sources, and drafting the first answer below.";
      }
      if (condensedStatusMessage) {
        return condensedStatusMessage;
      }
    }
    return null;
  }, [
    condensedStatusMessage,
    conversation.startedQuery,
    hasRun,
    normalizedThreadSummary,
    selectedSessionSummary?.verdict,
    streaming.isStreaming,
    streaming.liveAnswerPreview,
    visibleMessages,
  ]);
  const transcriptMessages = useMemo(() => {
    const nonSystemMessages = visibleMessages.filter((message) => message.role !== "system");
    if (nonSystemMessages.length > 0) {
      const recentMessages = nonSystemMessages.slice(-8);
      const hasMeaningfulAssistantLikeMessage = recentMessages.some(
        (message) => message.role !== "user" && String(message.content ?? "").trim().length > 0,
      );
      if (syntheticAssistantContent && !hasMeaningfulAssistantLikeMessage) {
        return [
          ...recentMessages,
          {
            id: "synthetic-assistant",
            role: "assistant" as const,
            label: "NodeBench",
            content: syntheticAssistantContent,
            createdAt: Date.now() + 1,
            status: streaming.isStreaming ? ("streaming" as const) : ("complete" as const),
          },
        ];
      }
      return recentMessages;
    }
    if (conversation.startedQuery?.trim()) {
      const messages = [
        {
          id: "synthetic-user",
          role: "user" as const,
          label: "You",
          content: conversation.startedQuery.trim(),
          createdAt: Date.now(),
          status: "complete" as const,
        },
      ];
      if (syntheticAssistantContent) {
        messages.push({
          id: "synthetic-assistant",
          role: "assistant" as const,
          label: "NodeBench",
          content: syntheticAssistantContent,
          createdAt: Date.now() + 1,
          status: streaming.isStreaming ? ("streaming" as const) : ("complete" as const),
        });
      }
      return messages;
    }
    return [];
  }, [conversation.startedQuery, streaming.isStreaming, syntheticAssistantContent, visibleMessages]);
  const hasAssistantTranscript = transcriptMessages.some(
    (message) => message.role !== "user" && String(message.content ?? "").trim().length > 0,
  );
  const hasVisibleReportContent = conversationReportSections.length > 0;
  const hasConversationContent =
    transcriptMessages.length > 0 ||
    hasVisibleReportContent ||
    sources.length > 0 ||
    hasMeaningfulPacketAnswer;
  const showMinimalIntro =
    !hasRenderableThread &&
    transcriptMessages.length === 0 &&
    !streaming.isStreaming &&
    !hasVisibleReportContent &&
    sources.length === 0 &&
    !hasMeaningfulPacketAnswer &&
    pendingFiles.length === 0 &&
    sessionFiles.length === 0 &&
    pendingInterrupts.length === 0;
  const showRecoveryCard = Boolean(
    hasRenderableThread &&
      transcriptMessages.length === 0 &&
      !sessionLookupMissing &&
      !sessionIsLive &&
      !hasSettledAnswerContent &&
      !hasAssistantTranscript &&
      !syntheticAssistantContent &&
      (Boolean(condensedStatusMessage) || selectedSessionSummary?.verdict === "failed"),
  );
  const showThreadUnavailableCard = sessionLookupMissing;
  const showConversationProgress =
    !showThreadUnavailableCard &&
    hasRenderableThread &&
    (sessionIsLive ||
      sessionIsHydrating ||
      latestRuntimeEvents.length > 0 ||
      displayNeedsAttention ||
      !hasSettledAnswerContent ||
      sessionArtifactState === "draft");
  const showToolbarActions =
    sessionList.length > 0 || hasRun || input.trim().length > 0 || draftFiles.length > 0;
  const detailTabs = useMemo<
    Array<{ id: "conversation" | "steps" | "artifacts" | "files"; label: string }>
  >(() => {
    const tabs: Array<{ id: "conversation" | "steps" | "artifacts" | "files"; label: string }> = [
      { id: "conversation", label: "Conversation" },
    ];
    if (showRecoveryCard) {
      return tabs;
    }
    const hasStepsTab =
      showConversationProgress ||
      pendingInterrupts.length > 0 ||
      (providerBudgetSummary?.providers.length ?? 0) > 0 ||
      latestRuntimeEvents.length > 0 ||
      streaming.stages.length > 0;
    const hasArtifactsTab = Boolean(
      (!sessionLookupMissing && conversation.activeSessionId) ||
        canOpenFullReport ||
        conversation.savedReportId ||
        sessionArtifactState === "draft" ||
        sessionArtifactState === "saved" ||
        sessionArtifactState === "published",
    );
    const hasFilesTab = pendingFiles.length > 0 || sessionFiles.length > 0;

    if (hasStepsTab) tabs.push({ id: "steps", label: "Steps" });
    if (hasArtifactsTab) tabs.push({ id: "artifacts", label: "Artifacts" });
    if (hasFilesTab) tabs.push({ id: "files", label: "Files" });

    return tabs;
  }, [
    canOpenFullReport,
    conversation.activeSessionId,
    conversation.savedReportId,
    latestRuntimeEvents.length,
    pendingFiles.length,
    pendingInterrupts.length,
    providerBudgetSummary?.providers.length,
    sessionArtifactState,
    sessionFiles.length,
    sessionLookupMissing,
    showConversationProgress,
    streaming.stages.length,
  ]);
  const showDetailTabs = !showMinimalIntro && detailTabs.length > 1;
  const showMobileDetailTabs = showDetailTabs && detailTab !== "conversation";
  const previewActionItems = useMemo(
    () =>
      !streaming.isStreaming && hasRenderableThread && hasSettledAnswerContent
        ? compiledActionItems
            .filter((item) => item.enabled && (item.type !== "save_draft" || sessionArtifactState !== "draft"))
            .slice(0, 3)
        : [],
    [compiledActionItems, hasRenderableThread, hasSettledAnswerContent, sessionArtifactState, streaming.isStreaming],
  );
  const showArtifactTeaser = Boolean(
    !showThreadUnavailableCard &&
      hasRenderableThread &&
      !streaming.isStreaming &&
      (sessionArtifactState === "draft" ||
        sessionArtifactState === "saved" ||
        sessionArtifactState === "published" ||
        canOpenFullReport ||
        conversation.savedReportId),
  );
  const artifactTeaserLabel =
    sessionArtifactState === "published"
      ? "Published report"
      : sessionArtifactState === "saved"
        ? "Saved report"
        : "Draft report";
  const artifactTeaserDetail =
    sessionArtifactState === "published"
      ? "The canonical report is published and linked from this thread."
      : sessionArtifactState === "saved"
        ? "The canonical report is ready to review or share from this thread."
        : sessionSaveEligibilityReason?.trim() ||
          "NodeBench kept this as a draft so you can review the work before treating it as canonical.";
  const conversationArtifactLabel =
    showArtifactTeaser
      ? artifactTeaserLabel
      : displayNeedsAttention || selectedSessionSummary?.verdict === "failed"
        ? "Draft report"
        : "Working draft";
  const conversationArtifactDetail =
    showArtifactTeaser
      ? artifactTeaserDetail
      : displayNeedsAttention || selectedSessionSummary?.verdict === "failed"
        ? "Held as a draft until the thread lands a clean answer."
        : "Reusable output for this thread.";
  const conversationArtifactPreview =
    normalizedThreadSummary.trim() ||
    conversationReportSections
      .map((section) => sanitizeReportSectionBody(section.body))
      .find((value) => value.trim().length > 0) ||
    syntheticAssistantContent ||
    null;
  const compactComposer = Boolean(conversation.activeSessionId);
  const useMinimalLandingShell = showMinimalIntro;
  const useMobileTranscriptShell = Boolean(
    conversation.activeSessionId &&
      !showMinimalIntro &&
      !showThreadUnavailableCard,
  );
  const hideMobileChromeForThread = Boolean(
    conversation.activeSessionId ||
      streaming.isStreaming ||
      showThreadUnavailableCard ||
      showRecoveryCard,
  );
  const showConversationArtifactCard = Boolean(
    useMobileTranscriptShell &&
      hasRenderableThread &&
      !showThreadUnavailableCard &&
      !streaming.isStreaming &&
      (showArtifactTeaser ||
        canOpenFullReport ||
        sessionArtifactState === "saved" ||
        sessionArtifactState === "published"),
  );
  const collapseConversationProgress = Boolean(
    useMobileTranscriptShell &&
      !streaming.isStreaming,
  );
  const progressItems = useMemo(() => {
    const routeComplete = hasRun || Boolean(routing?.routingMode) || Boolean(sessionStatus);
    const inferredSettledOutput = !sessionIsLive && threadHasSettledSummary;
    const sourceComplete =
      sources.length > 0 ||
      Boolean(streaming.milestones.firstSourceAt) ||
      inferredSettledOutput;
    const answerComplete =
      hasMeaningfulPacketAnswer ||
      conversationReportSections.length > 0 ||
      inferredSettledOutput;
    const artifactComplete =
      sessionArtifactState === "draft" ||
      sessionArtifactState === "saved" ||
      sessionArtifactState === "published";
    const sourceActive = sessionIsLive && !sourceComplete;
    const answerActive =
      sessionIsLive &&
      sourceComplete &&
      (!answerComplete || Boolean(streaming.liveAnswerPreview?.trim()));
    const artifactActive = sessionIsLive && answerComplete && !artifactComplete;
    const needsArtifactClarification = displayNeedsAttention;
    const artifactDetail =
      sessionArtifactState === "published"
        ? "Published report is linked from this thread."
        : sessionArtifactState === "saved"
          ? "Saved report is linked from this thread."
          : sessionArtifactState === "draft"
            ? "Draft artifact is ready. Keep researching before treating it as canonical."
            : needsArtifactClarification
              ? "NodeBench needs clarification before it can save a canonical report."
              : artifactActive
                ? "Saving the draft artifact for reuse."
                : canOpenFullReport
                ? "Canonical report is ready to open."
                  : "No saved report yet.";
    const routeChildren = [
      routing?.routingMode
        ? {
            id: "route-mode",
            label: routing.routingMode === "advisor" ? "Deep reasoning path selected" : "Fast path selected",
            tone: routeComplete ? ("complete" as const) : ("active" as const),
          }
        : null,
      conversation.startedQuery?.trim()
        ? {
            id: "route-query",
            label: `Prompt locked: ${conversation.startedQuery.trim().slice(0, 88)}`,
            tone: routeComplete ? ("complete" as const) : ("active" as const),
          }
        : null,
      sessionIsHydrating
        ? {
            id: "route-restore",
            label: "Restoring the last thread state from Convex.",
            tone: "active" as const,
          }
        : null,
    ].filter(Boolean);
    const sourceChildren = (
      sources.length > 0
        ? sources.slice(0, 3).map((source, index) => ({
            id: `source-${source.id ?? index}`,
            label: source.label || source.domain || "Source linked",
            tone: "complete" as const,
          }))
        : streaming.stages.slice(-3).map((stage, index) => ({
            id: `stage-${stage.tool}-${stage.step}-${index}`,
            label: `${formatToolLabel(stage.tool)} ${stage.status === "done" ? "completed" : stage.status === "running" ? "running" : stage.status}`,
            tone: stage.status === "done" ? ("complete" as const) : ("active" as const),
          }))
    ).filter(Boolean);
    const answerChildren = (
      streaming.liveAnswerPreview?.trim()
        ? [
            {
              id: "answer-preview",
              label: streaming.liveAnswerPreview.trim().slice(0, 120),
              tone: "active" as const,
            },
          ]
        : latestRuntimeEvents.slice(0, 3).map((event, index) => ({
            id: `event-${event.kind}-${index}`,
            label: event.label,
            tone:
              event.status === "success"
                ? ("complete" as const)
                : event.status === "warning" || event.status === "error"
                  ? ("pending" as const)
                  : ("active" as const),
          }))
    ).filter(Boolean);
    const artifactChildren = [
      sessionArtifactState
        ? {
            id: "artifact-state",
            label: `Artifact state: ${sessionArtifactState.replace(/_/g, " ")}`,
            tone: artifactComplete ? ("complete" as const) : artifactActive ? ("active" as const) : ("pending" as const),
          }
        : null,
      ...gateResults
        .filter((gate) => !gate.passed)
        .slice(0, 2)
        .map((gate, index) => ({
          id: `gate-${gate.gateKey}-${index}`,
          label: gate.label || gate.gateKey.replace(/_/g, " "),
          tone: "pending" as const,
        })),
    ].filter(Boolean);

    return [
      {
        id: "route",
        label: sessionIsHydrating
          ? "Restore the thread"
          : "Understand the request",
        detail:
          sessionIsHydrating
            ? "Restoring the latest thread state from your workspace."
            : routing?.routingMode === "advisor"
              ? "Deep reasoning path selected."
              : routing?.routingMode === "fast"
                ? "Fast path selected."
                : conversation.startedQuery?.trim()
                  ? "NodeBench has the brief and context."
                  : "Waiting for your first prompt.",
        state: sessionIsHydrating ? "active" : routeComplete ? "complete" : hasRun ? "active" : "pending",
        children: routeChildren,
      },
      {
        id: "sources",
        label: "Gather current sources",
        detail:
          sources.length > 0
            ? `${sources.length} source${sources.length === 1 ? "" : "s"} linked to this thread.`
            : inferredSettledOutput
              ? "Restored from the latest settled thread state."
              : sourceActive
                ? "Searching and checking the first references."
                : "No sources attached yet.",
        state: sourceComplete ? "complete" : sourceActive ? "active" : "pending",
        children: sourceChildren,
      },
      {
        id: "answer",
        label: "Draft the first answer",
        detail:
          answerComplete
              ? inferredSettledOutput && !hasMeaningfulPacketAnswer
                ? "The latest settled answer is restored for this thread."
                : "The main brief is ready in the conversation."
            : streaming.liveAnswerPreview?.trim()
              ? streaming.liveAnswerPreview.trim()
              : answerActive
                ? "Compiling sections and contradictions."
                : "No answer drafted yet.",
        state: answerComplete ? "complete" : answerActive ? "active" : "pending",
        children: answerChildren,
      },
      {
        id: "artifact",
        label:
          needsArtifactClarification
            ? "Clarify before saving the report"
            : artifactComplete
              ? "Report ready"
              : "Prepare the report",
        detail: artifactDetail,
        state: artifactComplete ? "complete" : artifactActive ? "active" : "pending",
        children: artifactChildren,
      },
    ] as const;
  }, [
    canOpenFullReport,
    conversation.activeSessionId,
    conversation.session,
    conversation.startedQuery,
    gateResults,
    hasRun,
    hasMeaningfulPacketAnswer,
    conversationReportSections.length,
    latestRuntimeEvents,
    routing?.routingMode,
    sessionArtifactState,
    sessionIsHydrating,
    sessionIsLive,
    displayNeedsAttention,
    sessionSaveEligibility,
    sessionStatus,
    sources.length,
    sources,
    streaming.isStreaming,
    streaming.liveAnswerPreview,
    streaming.milestones.firstSourceAt,
    streaming.stages,
    threadHasSettledSummary,
  ]);
  const completedProgressCount = useMemo(
    () => progressItems.filter((item) => item.state === "complete").length,
    [progressItems],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("nodebench:chat-detail-state", {
        detail: { hideMobileChrome: hideMobileChromeForThread },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("nodebench:chat-detail-state", {
          detail: { hideMobileChrome: false },
        }),
      );
    };
  }, [hideMobileChromeForThread]);

  useEffect(() => {
    setDetailTab("conversation");
  }, [conversation.activeSessionId]);

  useEffect(() => {
    const nextSessionId = conversation.activeSessionId?.trim() || null;
    const previousSessionId = previousActiveSessionIdRef.current;
    if (nextSessionId && nextSessionId !== previousSessionId) {
      setInput((current) => {
        const currentTrimmed = current.trim();
        const startedTrimmed = conversation.startedQuery?.trim() ?? "";
        return currentTrimmed && currentTrimmed === startedTrimmed ? "" : current;
      });
    }
    previousActiveSessionIdRef.current = nextSessionId;
  }, [conversation.activeSessionId, conversation.startedQuery]);

  useEffect(() => {
    if (detailTabs.some((tab) => tab.id === detailTab)) return;
    setDetailTab("conversation");
  }, [detailTab, detailTabs]);

  useEffect(() => {
    if (!conversation.activeSessionId?.trim()) {
      saveLastChatPath(null);
      return;
    }
    if (showRecoveryCard || showThreadUnavailableCard || (displayNeedsAttention && !threadHasSettledSummary)) {
      saveLastChatPath(null);
      return;
    }
    const nextSearch = new URLSearchParams();
    nextSearch.set("surface", "chat");
    nextSearch.set("session", conversation.activeSessionId.trim());
    if (entityParam?.trim()) {
      nextSearch.set("entity", entityParam.trim());
    } else if (lens?.trim()) {
      nextSearch.set("lens", lens.trim());
    }
    saveLastChatPath(`/?${nextSearch.toString()}`);
  }, [
    conversation.activeSessionId,
    displayNeedsAttention,
    entityParam,
    lens,
    showRecoveryCard,
    showThreadUnavailableCard,
    threadHasSettledSummary,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const frame = window.requestAnimationFrame(() => {
      const panel =
        detailContentRef.current?.querySelector<HTMLElement>(`#chat-detail-panel-${detailTab}`) ??
        detailContentRef.current;
      if (!panel) return;
      scrollClosestOverflowParentToTop(panel);
      panel.scrollIntoView({ block: "start", inline: "nearest" });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detailTab]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!conversation.activeSessionId?.trim()) return;
    const frame = window.requestAnimationFrame(() => {
      const anchor = threadSurfaceRef.current ?? detailContentRef.current;
      if (!anchor) return;
      scrollClosestOverflowParentToTop(anchor);
      anchor.scrollIntoView({ block: "start", inline: "nearest" });
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [conversation.activeSessionId]);

  useEffect(() => {
    if (surfaceParam === "chat" || surfaceParam === "workspace") return;
    conversation.streaming.resetStream();
    conversation.setPersistenceMessage(null);
  }, [conversation.setPersistenceMessage, conversation.streaming.resetStream, surfaceParam]);

  useEffect(() => {
    if (sessionList.length === 0) {
      setShowThreadShelf(false);
    }
  }, [sessionList.length]);

  const handleInterruptDecision = useCallback(
    async (interruptId: string, decisionType: "approve" | "reject") => {
      if (!conversation.activeSessionId) return;
      try {
        await resolveSessionInterrupt({
          anonymousSessionId,
          sessionId: conversation.activeSessionId as never,
          interruptId: interruptId as never,
          decisionType,
        });
        toast.success(decisionType === "approve" ? "Interrupt approved" : "Interrupt rejected");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not resolve interrupt");
      }
    },
    [anonymousSessionId, conversation.activeSessionId, resolveSessionInterrupt],
  );

  const handleCandidateResolve = useCallback(
    async (candidateLabel: string) => {
      const nextQuery = `What is ${candidateLabel} and what matters most right now?`;
      setInput(nextQuery);
      await beginRun(nextQuery, lens);
    },
    [beginRun, lens],
  );

  const handleResetUnavailableThread = useCallback(() => {
    conversation.clearSession();
    saveLastChatPath(null);
    setShowThreadShelf(true);
    const nextSearch = new URLSearchParams();
    nextSearch.set("surface", "chat");
    nextSearch.set("lens", lens);
    if (entityParam?.trim()) {
      nextSearch.set("entity", entityParam.trim());
    }
    navigate(`/?${nextSearch.toString()}`, { replace: true });
  }, [conversation, entityParam, lens, navigate]);

  const buildFollowUpQuery = useCallback((label: string) => {
    const baseQuery = conversation.startedQuery?.trim();
    if (!baseQuery) return label;
    switch (label) {
      case "Go deeper":
        return `${baseQuery}\n\nGo deeper. Show tradeoffs, contradictions, and what would change the conclusion.`;
      case "Show risks":
        return `${baseQuery}\n\nFocus on the main risks, failure modes, and unresolved questions.`;
      case "Draft reply":
        return `${baseQuery}\n\nDraft a reply or follow-up message using the current findings.`;
      case "What changed?":
        return `${baseQuery}\n\nWhat changed recently, and what matters most now?`;
      default:
        return label;
    }
  }, [conversation.startedQuery]);
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setInput("");
      setShowThreadShelf(false);
      conversation.setActiveSessionId(sessionId);
    },
    [conversation],
  );
  const handleNewThread = useCallback(() => {
    const nextUrl = buildChatSessionPath({
      entitySlug: entityParam?.trim() || null,
      lens,
      sessionId: null,
    });
    skipNextDraftAutostartRef.current = true;
    conversation.clearSession();
    setDraftFiles([]);
    setInput("");
    setDetailTab("conversation");
    setShowThreadShelf(false);
    setShareSheetOpen(false);
    setComposerMode("ask");
    setLockedClassification(null);
    setInferredClassification(null);
    persistDraft({
      query: "",
      lens,
      files: [],
    });
    navigate(nextUrl, { replace: true });
  }, [conversation, entityParam, lens, navigate, persistDraft]);

  useEffect(() => {
    const handleHeaderAction = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action;
      if (action === "threads") {
        setShowThreadShelf((open) => !open);
        return;
      }
      if (action === "share-thread") {
        setShareSheetOpen(true);
        return;
      }
      if (action === "thread-actions") {
        setThreadActionsOpen(true);
        return;
      }
      if (action === "new-thread") {
        handleNewThread();
      }
    };

    window.addEventListener("nodebench:chat-header-action", handleHeaderAction as EventListener);
    return () =>
      window.removeEventListener(
        "nodebench:chat-header-action",
        handleHeaderAction as EventListener,
      );
  }, [handleNewThread]);

  /* ---- milestone tracking ---- */

  useEffect(() => {
    if (!streaming.milestones.startedAt) return;
    if (streaming.milestones.firstStageAt && !recordedMilestonesRef.current.firstSignal) {
      recordedMilestonesRef.current.firstSignal = true;
      trackEvent("first_partial_signal_ms", { durationMs: Math.max(0, streaming.milestones.firstStageAt - streaming.milestones.startedAt) });
    }
    if (streaming.milestones.firstSourceAt && !recordedMilestonesRef.current.firstSource) {
      recordedMilestonesRef.current.firstSource = true;
      trackEvent("first_source_ms", { durationMs: Math.max(0, streaming.milestones.firstSourceAt - streaming.milestones.startedAt) });
    }
    if (streaming.milestones.firstPartialAnswerAt && !recordedMilestonesRef.current.firstPartialAnswer) {
      recordedMilestonesRef.current.firstPartialAnswer = true;
      trackEvent("first_partial_answer_ms", { durationMs: Math.max(0, streaming.milestones.firstPartialAnswerAt - streaming.milestones.startedAt) });
    }
  }, [streaming.milestones.firstPartialAnswerAt, streaming.milestones.firstSourceAt, streaming.milestones.firstStageAt, streaming.milestones.startedAt]);

  useEffect(() => {
    if (
      !conversation.savedReportId ||
      recordedMilestonesRef.current.reportSaved ||
      (sessionArtifactState !== "saved" && sessionArtifactState !== "published")
    ) {
      return;
    }
    recordedMilestonesRef.current.reportSaved = true;
    trackEvent("report_saved", { reportId: conversation.savedReportId, sources: sources.length, uploads: pendingFiles.length });
  }, [conversation.savedReportId, pendingFiles.length, sessionArtifactState, sources.length]);

  /* ---- share link ---- */

  const shareUrl = useMemo(
    () =>
      buildChatShareUrl({
        origin: window.location.origin,
        currentHref: window.location.href,
        resolvedEntitySlug,
        activeSessionId: conversation.activeSessionId,
        entitySlug: entityParam?.trim() || null,
        startedQuery: conversation.startedQuery,
        lens,
      }),
    [conversation.activeSessionId, conversation.startedQuery, entityParam, lens, resolvedEntitySlug],
  );

  const copyShareLink = useCallback(() => {
    const url = shareUrl;
    void navigator.clipboard.writeText(url.toString());
    trackEvent("chat_share_link", { hasReport: conversation.savedReportId ? 1 : 0, hasSources: sources.length });
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [conversation.savedReportId, shareUrl, sources.length]);

  const handleOpenShareSheet = useCallback(() => {
    setShareSheetOpen(true);
  }, []);

  const handleSystemShare = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.share) {
      copyShareLink();
      return;
    }
    try {
      await navigator.share({
        title: resolvedEntityName || "NodeBench thread",
        text: conversation.startedQuery?.trim() || "Shared from NodeBench",
        url: shareUrl,
      });
      trackEvent("chat_share_native", { hasReport: conversation.savedReportId ? 1 : 0, hasSources: sources.length });
      setShareSheetOpen(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "Could not open share options");
    }
  }, [conversation.savedReportId, conversation.startedQuery, copyShareLink, resolvedEntityName, shareUrl, sources.length]);

  const handleActionItem = useCallback(
    async (item: ProductConversationActionItem) => {
      if (!item.enabled) {
        toast.message(item.blockedReason ?? item.rationale);
        return;
      }
      switch (item.type) {
        case "open_report":
          if (fullReportPath) {
            navigate(fullReportPath);
            return;
          }
          break;
        case "share":
          handleOpenShareSheet();
          return;
        case "continue_research": {
          const nextQuery = buildFollowUpQuery("Go deeper");
          setInput(nextQuery);
          await beginRun(nextQuery, lens);
          return;
        }
        case "save_draft":
          setDetailTab("artifacts");
          toast.success("Draft preserved in the thread artifacts.");
          return;
        case "inspect_sources":
          document
            .getElementById("chat-source-strip")
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return;
        case "clarify_target":
        case "ask_follow_up":
        case "paste_source_url":
        case "choose_candidate":
          toast.message(item.rationale);
          return;
        default:
          toast.message(item.rationale);
          return;
      }
      toast.message(item.rationale);
    },
    [beginRun, buildFollowUpQuery, fullReportPath, handleOpenShareSheet, lens, navigate],
  );

  /* ---- pin report ---- */

  const pinReport = useCallback(async () => {
    if (!conversation.savedReportId) {
      navigate(buildCockpitPath({ surfaceId: "packets" }));
      return;
    }
    const ok = await conversation.pinReport(true);
    if (!ok) {
      navigate(buildCockpitPath({ surfaceId: "packets" }));
    }
  }, [conversation, navigate]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div
      className={`mx-auto flex min-h-screen w-full max-w-[940px] flex-col gap-2 px-2.5 py-2 ${
        conversation.activeSessionId ? "pb-[8.75rem] sm:pb-32" : "pb-[10.25rem] sm:pb-40"
      } sm:gap-3 sm:px-5 sm:py-5`}
    >
      <ProductFileAssetPicker
        open={showFilePicker}
        title="Attach from Files"
        description="Use a file that already lives in your vault."
        actionLabel="Attach"
        onClose={() => setShowFilePicker(false)}
        onSelect={handleSelectVaultFile}
      />

      {(() => {
        // Low-confidence card — rendered when the backend guard attached one
        // to the /search response. Checkpoint 4 ("trust is enforced, not implied")
        // demo surface. Payload shape: convex/domains/agents/safety/lowConfidenceGuard.ts
        const rawResult = streaming.result as Record<string, unknown> | null;
        const card = rawResult?.lowConfidenceCard;
        if (!card || typeof card !== "object") return null;
        const typedCard = card as LowConfidenceCardPayload;
        return (
          <LowConfidenceCard
            payload={typedCard}
            onEscalate={() => {
              // Re-submit the current query with the routing override to deep/slow.
              // Fallback: navigate to deep-sim with the query pre-populated.
              const q = typeof streaming.result?.query === "string" ? streaming.result.query : "";
              navigate(`/deep-sim${q ? `?q=${encodeURIComponent(q)}` : ""}`);
            }}
          />
        );
      })()}

      <section className="hidden rounded-[22px] border border-gray-200 bg-white/95 p-2 text-gray-900 shadow-[0_20px_64px_-54px_rgba(15,23,42,0.2)] backdrop-blur sm:block sm:rounded-[26px] sm:p-3 sm:shadow-[0_24px_80px_-60px_rgba(15,23,42,0.24)] dark:border-white/[0.08] dark:bg-[#0f141b]/95 dark:text-gray-100 dark:shadow-[0_20px_64px_-54px_rgba(0,0,0,0.92)] sm:dark:shadow-[0_24px_80px_-60px_rgba(0,0,0,0.92)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white">
              <Search className="h-4 w-4 text-[var(--accent-primary)]" />
              NodeBench chat
            </div>
            <div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
              Lens: {currentLensLabel}
            </div>
            {operatorContextLabel ? (
              <div className="hidden max-w-[280px] truncate rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 sm:block">
                Context: {operatorContextLabel}
              </div>
            ) : null}
          </div>
          {showToolbarActions ? (
            <div className="flex shrink-0 items-center gap-2">
            {sessionList.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowThreadShelf((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05]"
                aria-label={showThreadShelf ? "Hide threads" : "Show threads"}
              >
                <MessageSquareText className="h-4 w-4" />
                <span className="hidden sm:inline">{showThreadShelf ? "Hide" : "Threads"}</span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-500 dark:border-white/[0.08] dark:bg-black/20 dark:text-gray-300">
                  {sessionList.length}
                </span>
              </button>
            ) : null}
            {hasRun ? (
              <button
                type="button"
                onClick={handleOpenShareSheet}
                className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-2.5 text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05] sm:gap-1.5 sm:px-3 sm:py-1.5"
                aria-label={copiedLink ? "Share link copied" : "Share thread"}
              >
                <Link2 className="h-4 w-4" />
                <span className="hidden sm:inline">{copiedLink ? "Copied" : "Share"}</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleNewThread}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-3 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
              aria-label="Start a new thread"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New thread</span>
            </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className={useMobileTranscriptShell ? "space-y-2" : "space-y-3.5"}>
        {showThreadShelf && sessionList.length > 0 ? (
        <aside>
          <div className="rounded-[30px] border border-gray-200 bg-white p-4 text-gray-900 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.18)] dark:border-white/[0.08] dark:bg-[#10161d] dark:text-gray-100 dark:shadow-[0_20px_60px_-48px_rgba(0,0,0,0.85)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Threads
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Active work stays reachable, but it should not dominate the whole page.
                </p>
              </div>
              <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
                {sessionList.length}
              </span>
            </div>

            <div className="mt-4 space-y-4">
              {sessionSections.map((section) => (
                <section key={section.id} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                      {section.label}
                    </h2>
                    <span className="text-xs text-gray-500">
                      {section.items.length}
                    </span>
                  </div>
                  {section.items.length === 0 ? (
                    <div className="rounded-[24px] border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500 dark:border-white/[0.08]">
                      {section.id === "active"
                        ? "No active runs right now."
                        : section.id === "attention"
                          ? "Nothing is blocked at the moment."
                          : "Completed threads will stack here as you use NodeBench."}
                    </div>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {section.items.map((session) => {
                        const selected = conversation.activeSessionId === session._id;
                        const sessionChip =
                          session.status === "streaming" || session.status === "queued"
                            ? {
                                label: session.status === "streaming" ? "Running" : "Queued",
                                className:
                                  "border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]",
                              }
                            : {
                                label: session.needsAttention ? "Needs attention" : verdictLabel(session.verdict),
                                className: session.needsAttention
                                  ? "border-amber-400/25 bg-amber-500/10 text-amber-200"
                                  : verdictClasses(session.verdict),
                              };
                        return (
                          <button
                            key={session._id}
                            type="button"
                            onClick={() => handleSelectSession(session._id)}
                            className={`w-full rounded-[24px] border px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35 ${
                              selected
                                ? "border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/10 shadow-[0_18px_60px_-48px_rgba(217,119,87,0.6)]"
                                : "border-white/[0.08] bg-white/[0.03] hover:border-white/[0.14] hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-100">
                                  {session.title || session.query}
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-400">
                                  {session.latestSummary || session.lastMessage || session.query}
                                </p>
                              </div>
                              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${sessionChip.className}`}>
                                {sessionChip.label}
                              </span>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                              <span>{formatRelativeTime(session.updatedAt || session.lastMessageAt)}</span>
                              {typeof session.fileCount === "number" ? <span>{session.fileCount} files</span> : null}
                              {typeof session.artifactCount === "number" ? <span>{session.artifactCount} artifacts</span> : null}
                              {typeof session.costUsd === "number" ? <span>{formatCostUsd(session.costUsd)}</span> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </aside>
        ) : null}

        <div ref={threadSurfaceRef} className="min-w-0">
          <div
            className={
              useMobileTranscriptShell || useMinimalLandingShell
                ? "border-0 bg-transparent p-0 text-gray-900 shadow-none dark:border-transparent dark:bg-transparent dark:text-gray-100 dark:shadow-none sm:rounded-[34px] sm:border sm:border-gray-200 sm:bg-white sm:p-5 sm:shadow-[0_32px_110px_-74px_rgba(15,23,42,0.18)] sm:dark:border-[var(--nb-border-soft)] sm:dark:bg-[var(--nb-surface-raised)] sm:dark:shadow-[0_32px_110px_-74px_rgba(0,0,0,0.95)]"
                : "rounded-[24px] border border-gray-100 bg-white/80 p-4 text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[var(--nb-border-faint)] dark:bg-[var(--nb-surface-raised)] dark:text-gray-100 dark:shadow-[0_1px_0_rgba(255,255,255,0.025)_inset,0_12px_40px_-24px_rgba(0,0,0,0.8)] sm:rounded-[34px] sm:border-gray-200 sm:bg-white sm:p-5 sm:shadow-[0_32px_110px_-74px_rgba(15,23,42,0.18)] sm:dark:border-[var(--nb-border-soft)] sm:dark:bg-[var(--nb-surface-raised)] sm:dark:shadow-[0_32px_110px_-74px_rgba(0,0,0,0.95)]"
            }
          >
              <div className={`flex flex-col ${useMobileTranscriptShell ? "gap-2.5" : "gap-4"}`}>
                {!useMobileTranscriptShell ? (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {artifactMode === "prep_brief" ? (
                      <span className="rounded-full border border-[var(--accent-primary)]/18 bg-[var(--accent-primary)]/8 px-2.5 py-1 text-[11px] font-medium text-[var(--accent-primary)]">
                        {getReportArtifactLabel(artifactMode)}
                      </span>
                    ) : null}
                    {!showMinimalIntro && routing ? (
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
                          routing.routingMode === "advisor"
                            ? "border-[var(--accent-primary)]/16 bg-[var(--accent-primary)]/8 text-[var(--accent-primary)]"
                            : "border-gray-200 bg-gray-50 text-gray-600 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-300"
                        } hidden sm:inline-flex`}
                      >
                        {routing.routingMode === "advisor" ? "Deep reasoning" : "Fast path"}
                      </span>
                    ) : null}
                    {(selectedSessionSummary?.verdict && selectedSessionSummary.verdict !== "failed") ||
                    displayNeedsAttention ? (
                      <span className={`hidden rounded-full border px-2.5 py-1 text-[11px] font-medium sm:inline-flex ${displayNeedsAttention ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/18 dark:bg-amber-500/[0.08] dark:text-amber-200" : verdictClasses(selectedSessionSummary?.verdict)}`}>
                        {displayNeedsAttention ? "Needs attention" : verdictLabel(selectedSessionSummary?.verdict)}
                      </span>
                    ) : null}
                    {!showMinimalIntro && selectedSessionSummary?.updatedAt ? (
                      <span className="hidden items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-500 sm:inline-flex">
                        <Clock3 className="h-3 w-3" />
                        {formatRelativeTime(selectedSessionSummary.updatedAt)}
                      </span>
                    ) : null}
                  </div>
                  {showMinimalIntro ? (
                    <div className="mt-1 space-y-1.5 sm:mt-3">
                      <h2 className="hidden text-[26px] font-semibold tracking-[-0.03em] text-gray-900 dark:text-white sm:block">
                        Ask NodeBench
                      </h2>
                    </div>
                  ) : (
                    <h2 className="nb-text-display mt-3 max-w-[560px] text-gray-900 dark:text-white">
                      {threadTitle}
                    </h2>
                  )}
                  {!showMinimalIntro && normalizedThreadSummary ? (
                    <p className="nb-text-body mt-2 max-w-[680px] text-gray-600 dark:text-gray-300">
                      {normalizedThreadSummary}
                    </p>
                  ) : null}
                  {!showMinimalIntro && condensedStatusMessage && (streaming.error || hasArtifactFallback) ? (
                    <div className="mt-3 hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-400 sm:inline-flex">
                      <span className={`h-1.5 w-1.5 rounded-full ${streaming.error ? "bg-amber-300" : "bg-emerald-300"}`} />
                      {condensedStatusMessage}
                    </div>
                  ) : null}
                </div>

                <div className="hidden flex-wrap gap-2 sm:flex">
                  {canPinReport ? (
                    <button
                      type="button"
                      onClick={pinReport}
                      className="rounded-full bg-[var(--accent-primary)] px-3.5 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
                    >
                      {conversation.reportPinned ? "Pinned" : "Save to Reports"}
                    </button>
                  ) : null}
                  {canOpenFullReport ? (
                    <button
                      type="button"
                      onClick={() => navigate(fullReportPath!)}
                      className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
                    >
                      Open report
                    </button>
                  ) : null}
                </div>
              </div>
              ) : null}

              <div ref={detailContentRef} className={useMobileTranscriptShell ? "space-y-2" : "space-y-4"}>
              {showDetailTabs ? (
              <div
                role="tablist"
                aria-label="Thread detail views"
                className={`no-scrollbar -mx-1 items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex sm:flex-wrap sm:overflow-visible sm:px-0 ${
                  showMobileDetailTabs ? "flex" : "hidden"
                }`}
              >
                {detailTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    id={`chat-detail-tab-${tab.id}`}
                    aria-controls={`chat-detail-panel-${tab.id}`}
                    aria-selected={detailTab === tab.id}
                    data-state={detailTab === tab.id ? "active" : "inactive"}
                    onClick={() => setDetailTab(tab.id as typeof detailTab)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35 sm:px-3.5 sm:text-[12px] ${
                      detailTab === tab.id
                        ? "border-[var(--accent-primary)]/35 bg-[var(--accent-primary)]/12 text-[var(--accent-primary)] shadow-sm dark:border-[var(--accent-primary)]/35 dark:bg-[var(--accent-primary)]/18 dark:text-white"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-900 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-gray-400 dark:hover:border-white/[0.08] dark:hover:bg-white/[0.04] dark:hover:text-gray-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              ) : null}

              {detailTab === "conversation" ? (
                <div
                  role="tabpanel"
                  id="chat-detail-panel-conversation"
                  aria-labelledby="chat-detail-tab-conversation"
                  className={useMobileTranscriptShell ? "space-y-2.5" : "space-y-4"}
                >
            {transcriptMessages.length > 0 ? (
              <div className={useMobileTranscriptShell ? "space-y-2" : "space-y-3"}>
                {transcriptMessages.map((message, index) => {
                  const isUser = message.role === "user";
                  const isSystem = message.role === "system";
                  if (isSystem) {
                    return (
                      <div
                        key={message.id ?? `${message.createdAt}-${index}`}
                        className="flex justify-start"
                      >
                        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-gray-400">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" aria-hidden />
                          <span className="truncate">
                            {compactStatusMessage(message.content) || message.content}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={message.id ?? `${message.createdAt}-${index}`}
                      className={isUser ? "flex justify-end" : "flex items-start gap-2.5"}
                    >
                      <div
                        className={`${
                          isUser
                            ? "max-w-[84%] rounded-[20px] border border-white/[0.08] bg-[#40444d] px-3.5 py-2.75 text-gray-100 shadow-[0_12px_28px_-24px_rgba(0,0,0,0.9)] sm:max-w-[76%]"
                            : "max-w-[94%] rounded-none border-0 bg-transparent px-0 py-0 text-gray-800 shadow-none dark:text-gray-100"
                        }`}
                      >
                        <div
                          className={`mb-1 flex items-center gap-2 text-gray-500 ${
                            isUser ? "hidden" : ""
                          }`}
                        >
                          {!isUser ? (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-sky-300">
                              <Sparkles className="h-2.75 w-2.75" />
                            </span>
                          ) : null}
                          <span className="text-[12.5px] font-semibold tracking-[0.01em] text-white">
                            {isUser ? "You" : "NodeBench"}
                          </span>
                          {!isUser ? (
                            <>
                              <span aria-hidden className="text-gray-600">&bull;</span>
                              <span className="text-[10px] uppercase tracking-[0.12em] text-gray-500">
                                {new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                              </span>
                            </>
                          ) : null}
                        </div>
                        <div
                          className={`whitespace-pre-wrap ${
                            isUser
                              ? "text-[13.5px] font-medium leading-[1.34rem] sm:text-[13.9px] sm:leading-[1.42rem]"
                              : "text-[13.6px] leading-[1.42rem] sm:text-[13.9px] sm:leading-[1.48rem]"
                           }`}
                         >
                           {message.content}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : showMinimalIntro ? (
                <div className="space-y-4">
                  <div className="space-y-2 px-0.5 sm:hidden">
                    <p className="text-[12.5px] leading-[1.15rem] text-gray-300">
                      Ask about a company, person, market, role, or attach files for context.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {STARTER_PROMPTS.slice(0, 2).map((prompt) => (
                        <button
                          key={prompt}
                        type="button"
                        onClick={() => {
                          void beginRun(prompt, lens);
                        }}
                          className="max-w-[236px] rounded-[20px] border border-white/[0.08] bg-[#171d24]/98 px-3.5 py-2.5 text-left text-[12px] leading-[1.15rem] text-gray-200 shadow-[0_12px_24px_-20px_rgba(0,0,0,0.72)] transition hover:border-white/[0.14] hover:bg-[#1c232c] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
                        >
                          {prompt}
                        </button>
                    ))}
                  </div>
                </div>
                <div className="hidden rounded-[28px] border border-gray-200 bg-white p-5 dark:border-white/[0.08] dark:bg-white/[0.04] sm:block">
                  <div className="flex flex-wrap gap-2">
                    {STARTER_PROMPTS.slice(0, 2).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => {
                          void beginRun(prompt, lens);
                        }}
                        className="rounded-[22px] border border-gray-200 bg-gray-50 px-3.5 py-2 text-left text-sm leading-5 text-gray-700 transition hover:border-gray-300 hover:bg-white hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35 dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.05] dark:hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {showRecoveryCard ? (
              <div className="rounded-[24px] border border-gray-200 bg-white/90 px-4 py-3.5 dark:border-white/[0.08] dark:bg-[#10161d]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Reconnecting
                    </div>
                    <p className="mt-1 text-[13px] leading-5 text-gray-600 dark:text-gray-300">
                      This pass stalled before a clean answer landed. Retry from the composer or reopen the saved report once the backend is back.
                    </p>
                  </div>
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" aria-hidden />
                </div>
                {canOpenFullReport ? (
                  <button
                    type="button"
                    onClick={() => navigate(fullReportPath!)}
                    className="mt-3 inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1.5 text-sm text-amber-900 transition hover:border-amber-300 hover:bg-amber-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
                  >
                    Open saved report
                  </button>
                ) : null}
              </div>
            ) : null}

            {showThreadUnavailableCard ? (
              <div className="rounded-[22px] border border-gray-200 bg-gray-50/85 px-4 py-3.5 dark:border-white/[0.06] dark:bg-[#121821]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                      Thread unavailable
                    </div>
                    <p className="mt-1 text-[13px] leading-5 text-gray-600 dark:text-gray-300">
                      This thread is not available from the current workspace context. Start a fresh thread or reopen one from the thread shelf.
                    </p>
                  </div>
                  <span className="mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" aria-hidden />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleResetUnavailableThread}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
                  >
                    Start a new thread
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowThreadShelf(true)}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-100 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
                  >
                    Show recent threads
                  </button>
                </div>
              </div>
            ) : null}

            {showConversationProgress ? (
              <ConversationProgressCard
                progressItems={progressItems}
                completedProgressCount={completedProgressCount}
                isStreaming={streaming.isStreaming}
                defaultCollapsed={collapseConversationProgress}
              />
            ) : null}
            {showConversationArtifactCard ? (
                <div className={useMobileTranscriptShell ? "pt-1.5" : ""}>
                  <ConversationArtifactCard
                    label={conversationArtifactLabel}
                    title={threadTitle}
                    detail={conversationArtifactDetail}
                    preview={conversationArtifactPreview}
                    statusPill={canOpenFullReport ? "Ready" : sessionArtifactState === "draft" ? "Draft" : "In review"}
                    ctaLabel={canOpenFullReport ? "Open report" : "Review draft"}
                    onOpen={() => {
                      if (canOpenFullReport && fullReportPath) {
                        navigate(fullReportPath);
                        return;
                      }
                      setDetailTab("artifacts");
                    }}
                  />
                </div>
            ) : showArtifactTeaser && !useMobileTranscriptShell ? (
                <div className="rounded-[22px] border border-white/[0.08] bg-[#11161d]/96 px-3.5 py-3 shadow-[0_22px_64px_-48px_rgba(0,0,0,0.92)] scroll-mb-52">
                  <button
                  type="button"
                  onClick={() => {
                    if (canOpenFullReport && fullReportPath) {
                      navigate(fullReportPath);
                      return;
                    }
                    setDetailTab("artifacts");
                  }}
                  className="flex w-full items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
                >
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-white/[0.08] bg-white/[0.03] text-gray-200">
                    <FileText className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {artifactTeaserLabel}
                    </div>
                    <div className="mt-1 truncate text-[15px] font-medium text-gray-50">
                      {threadTitle}
                    </div>
                    <div className="mt-1 truncate text-[12px] text-gray-400">
                      {artifactTeaserDetail}
                    </div>
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-gray-400">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
                {canPinReport ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={pinReport}
                      className="rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-gray-200 transition hover:border-white/[0.18] hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35"
                    >
                      {conversation.reportPinned ? "Pinned" : "Save to Reports"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {sources.length > 0 ? (
              <div id="chat-source-strip" className="hidden gap-2 overflow-x-auto pb-2 sm:flex">
                {sources.slice(0, 6).map((s, i) => (
                  <a
                    key={s.id ?? i}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-[180px] items-center gap-2 rounded-[18px] border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
                  >
                    <span className="text-xs text-gray-500">{i + 1}</span>
                    <span className="truncate font-medium">
                      {s.label || s.domain || "Source"}
                    </span>
                  </a>
                ))}
                {sources.length > 6 ? (
                  <span className="self-center whitespace-nowrap text-sm text-gray-500">+{sources.length - 6} more</span>
                ) : null}
              </div>
            ) : null}

          {resolutionCandidates.length > 1 && !hasSettledAnswerContent && !streaming.isStreaming ? (
            <div className="mt-4 rounded-[26px] border border-amber-400/25 bg-amber-500/10 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-200">
                  Clarify target
                </span>
                <span className="text-sm text-amber-900/90 dark:text-amber-100/90">
                  Multiple entities match this thread. Pick one before NodeBench saves anything.
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {resolutionCandidates.slice(0, 4).map((candidate) => (
                  <button
                    key={`${candidate.slug}-${candidate.confidence}`}
                    type="button"
                    onClick={() => void handleCandidateResolve(candidate.label)}
                    className="rounded-full border border-amber-400/30 bg-white/90 px-3 py-1.5 text-sm font-medium text-amber-900 transition hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40"
                  >
                    {candidate.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* ---- Answer sections ---- */}
          {hasRenderableThread && (
            <div className={`mt-6 space-y-8 ${transcriptMessages.length > 0 ? "hidden sm:block" : ""}`}>
              {conversationReportSections.map((section, sectionIndex) => (
                  <div
                    key={section.id}
                    className="border-0 bg-transparent p-0 sm:rounded-[28px] sm:border sm:border-gray-200 sm:bg-white sm:p-4 sm:dark:border-white/[0.08] sm:dark:bg-[#121922]"
                    style={staggerDelay(sectionIndex)}
                  >
                    <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 sm:text-lg sm:normal-case sm:tracking-normal sm:text-gray-900 sm:dark:text-white">
                      {section.title}
                    </h2>
                    <div className="whitespace-pre-wrap text-[15px] leading-7 text-gray-700 dark:text-gray-300 sm:text-[15px] sm:leading-6">
                      {section.body}
                    </div>
                    {section.sourceRefIds && section.sourceRefIds.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {section.sourceRefIds
                          .map((id) => sources.find((s) => s.id === id))
                          .filter(Boolean)
                          .slice(0, 4)
                          .map((source, idx) => (
                            <CitationChip
                              key={source!.id ?? idx}
                              index={idx + 1}
                              label={source!.label || source!.domain || "Source"}
                              href={source!.href}
                            />
                          ))}
                      </div>
                    )}
                    {/* Save-to-notebook CTA — surfaces per-section only when
                        the chat is scoped to an entity (via ?entity=slug).
                        Writes the section body as an agent-authored pending
                        suggestion into that entity's notebook. Unifies the
                        cross-surface agent flow: Chat and Panel both route
                        into the same productBlocks stream as inline /ai. */}
                    {entityParam?.trim() && typeof section.body === "string" && section.body.trim() && (
                      <div className="mt-2">
                        <SaveToNotebookButton
                          entitySlug={entityParam.trim()}
                          text={`## ${section.title}\n\n${section.body}`}
                          surface="chat"
                          compact
                        />
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          {previewActionItems.length > 0 && !streaming.isStreaming && !useMobileTranscriptShell ? (
            <div className="mt-8 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Recommended next actions
              </div>
              <div className="flex flex-wrap gap-2">
                {previewActionItems.map((item) => (
                  <button
                    key={`${item.type}-${item.label}`}
                    type="button"
                    onClick={() => void handleActionItem(item)}
                    disabled={!item.enabled}
                    className={`rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/35 ${
                      item.enabled
                        ? "border-gray-200 bg-white text-gray-700 hover:border-[var(--accent-primary)]/35 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:text-white"
                        : "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-500 dark:border-white/[0.06] dark:bg-white/[0.02]"
                    }`}
                    title={item.blockedReason ?? item.rationale}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                {previewActionItems.map((item) => (
                  <span key={`${item.type}-rationale`} className="rounded-full bg-gray-100 px-2.5 py-1 dark:bg-white/[0.04]">
                    {item.label}: {item.blockedReason ?? item.rationale}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* ---- Follow-up chips ---- */}
          {hasRun && hasSettledAnswerContent && !streaming.isStreaming && !useMobileTranscriptShell && (
            <div className="mt-8 flex flex-wrap gap-2">
              {followUps.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    const nextQuery = buildFollowUpQuery(item);
                    setInput(nextQuery);
                    void beginRun(nextQuery, lens);
                  }}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:border-[var(--accent-primary)]/35 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:text-white"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* ---- Action bar (save / open / share) ---- */}
          {hasRun &&
            hasSettledAnswerContent &&
            !streaming.isStreaming &&
            !useMobileTranscriptShell &&
            (packet || persistedReport || hasArtifactFallback || fullReportPath) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {canPinReport ? (
                <button
                  type="button"
                  onClick={pinReport}
                  className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-primary-hover)]"
                >
                  {conversation.reportPinned ? "Pinned" : "Save to Reports"}
                </button>
              ) : null}
              {canOpenFullReport ? (
                <button
                  type="button"
                  onClick={() => navigate(fullReportPath!)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
                >
                  Open full report
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleOpenShareSheet}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:border-white/[0.14] dark:hover:bg-white/[0.06]"
              >
                <Link2 className="h-4 w-4" />
                {copiedLink ? "Copied!" : "Share link"}
              </button>
            </div>
          )}
                </div>
              ) : null}

          {/* ---- Runtime ---- */}
          {detailTab === "steps" && hasRun && runtimeHasData && (
            <div
              role="tabpanel"
              id="chat-detail-panel-steps"
              aria-labelledby="chat-detail-tab-steps"
              className="mt-8 space-y-4 border-t border-gray-200 pt-4 dark:border-white/[0.1]"
            >
              <ConversationProgressCard
                progressItems={progressItems}
                completedProgressCount={completedProgressCount}
                isStreaming={streaming.isStreaming}
                defaultCollapsed={false}
              />
              <button
                type="button"
                onClick={() => setRuntimeOpen((open) => !open)}
                className="flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {runtimeOpen ? "Hide runtime" : "Show runtime"}
                {runtimeOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {providerBudgetSummary ? (
                  <span
                    className={`ml-2 rounded-full border px-2 py-0.5 text-[11px] font-medium ${runtimeStatusClasses(providerBudgetSummary.overallStatus)}`}
                  >
                    {runtimeStatusLabel(providerBudgetSummary.overallStatus)}
                  </span>
                ) : null}
                {pendingInterrupts.length > 0 ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    {pendingInterrupts.length} interrupt{pendingInterrupts.length === 1 ? "" : "s"}
                  </span>
                ) : null}
              </button>
              {runtimeOpen && (
                <div className="mt-3 space-y-4">
                  {sessionResolutionState || sessionArtifactState || sessionSaveEligibility || claimSummary ? (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                        Answer control
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-gray-100 px-3 py-3 text-sm dark:border-white/[0.08] dark:bg-[#171c22]">
                          <div className="text-xs uppercase tracking-[0.14em] text-gray-400">Resolution</div>
                          <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                            {sessionResolutionState ?? "unresolved"}
                          </div>
                          {conversation.session?.resolutionReason ? (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {conversation.session.resolutionReason}
                            </p>
                          ) : null}
                        </div>
                        <div className="rounded-lg border border-gray-100 px-3 py-3 text-sm dark:border-white/[0.08] dark:bg-[#171c22]">
                          <div className="text-xs uppercase tracking-[0.14em] text-gray-400">Artifact state</div>
                          <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                            {sessionArtifactState ?? "none"}
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {conversation.session?.saveEligibilityReason ??
                              (sessionSaveEligibility ? `Save eligibility: ${sessionSaveEligibility}` : "No durable artifact yet.")}
                          </p>
                        </div>
                        {claimSummary ? (
                          <div className="rounded-lg border border-gray-100 px-3 py-3 text-sm dark:border-white/[0.08] dark:bg-[#171c22] sm:col-span-2">
                            <div className="text-xs uppercase tracking-[0.14em] text-gray-400">Claim ledger</div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                              <span>{claimSummary.totalClaims} total</span>
                              <span>{claimSummary.publishableClaims} publishable</span>
                              {claimSummary.rejectedClaims > 0 ? <span>{claimSummary.rejectedClaims} rejected</span> : null}
                              {claimSummary.contradictedClaims > 0 ? <span>{claimSummary.contradictedClaims} contradicted</span> : null}
                              {claimSummary.corroboratedClaims > 0 ? <span>{claimSummary.corroboratedClaims} corroborated</span> : null}
                            </div>
                            {claimSummary.rejectionReasons.length > 0 ? (
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Rejection reasons: {claimSummary.rejectionReasons.join(", ")}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                        {resolutionCandidates.length > 1 ? (
                          <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/10 sm:col-span-2">
                            <div className="text-xs uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">Candidates</div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {resolutionCandidates.slice(0, 4).map((candidate) => (
                                <span
                                  key={`${candidate.slug}-${candidate.confidence}`}
                                  className="rounded-full border border-amber-300/80 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-400/30 dark:text-amber-200"
                                >
                                  {candidate.label} · {Math.round(candidate.confidence * 100)}%
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {pendingInterrupts.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                        Interrupts
                      </h3>
                      {pendingInterrupts.map((interrupt) => (
                        <div
                          key={interrupt._id}
                          className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-500/20 dark:bg-amber-500/10"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                                {interrupt.description}
                              </p>
                              <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-300/80">
                                {interrupt.arguments?.kind
                                  ? `${interrupt.arguments.kind} • ${interrupt.toolName}`
                                  : interrupt.toolName}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleInterruptDecision(interrupt._id, "approve")}
                                className="rounded-md bg-amber-900 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-amber-950 dark:bg-amber-300 dark:text-amber-950 dark:hover:bg-amber-200"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleInterruptDecision(interrupt._id, "reject")}
                                className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-400/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {providerBudgetSummary && providerBudgetSummary.providers.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                        Provider budgets
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {providerBudgetSummary.providers.map((provider) => (
                          <div
                            key={provider.provider}
                            className={`rounded-lg border p-3 ${runtimeStatusClasses(provider.status)}`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium">
                                  {provider.provider}
                                </p>
                                <p className="text-xs opacity-80">
                                  {provider.calls}/{provider.callBudget} calls
                                  {provider.tokenBudget ? ` · ${formatRuntimeTokens(provider.totalTokens)}/${formatRuntimeTokens(provider.tokenBudget)} tokens` : ""}
                                </p>
                              </div>
                              <span className="text-xs font-semibold">
                                {provider.utilizationPct}%
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] opacity-80">
                              <span>{provider.completedCalls} done</span>
                              {provider.erroredCalls > 0 ? <span>{provider.erroredCalls} error</span> : null}
                              {provider.runningCalls > 0 ? <span>{provider.runningCalls} running</span> : null}
                              {provider.avgDurationMs > 0 ? <span>{formatRuntimeDuration(provider.avgDurationMs)} avg</span> : null}
                              {provider.dominantModel ? <span>{provider.dominantModel}</span> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {latestRuntimeEvents.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                        Recent runtime events
                      </h3>
                      <div className="space-y-2">
                        {latestRuntimeEvents.map((event, index) => (
                          <div
                            key={`${event.kind}-${event.createdAt}-${index}`}
                            className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-white/[0.08] dark:bg-[#171c22]"
                          >
                            <span
                              className={`mt-1 h-2 w-2 rounded-full ${
                                event.status === "success"
                                  ? "bg-emerald-400"
                                  : event.status === "warning" || event.status === "pending"
                                    ? "bg-amber-400"
                                    : event.status === "error"
                                      ? "bg-red-400"
                                      : "bg-[var(--accent-primary)]"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-gray-700 dark:text-gray-300">{event.label}</p>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
                                {event.provider ? <span>{event.provider}</span> : null}
                                {typeof event.step === "number" ? (
                                  <span>
                                    Step {event.step}
                                    {event.totalPlanned ? ` / ${event.totalPlanned}` : ""}
                                  </span>
                                ) : null}
                                <span>{new Date(event.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {streaming.stages.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                        Live tool trace
                      </h3>
                      <div className="space-y-2">
                        {streaming.stages.map((stage, i) => (
                          <div key={`${stage.tool}-${stage.step}-${i}`} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-white/[0.08] dark:bg-[#171c22]">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                stage.status === "done" ? "bg-emerald-400" : stage.status === "running" ? "bg-[var(--accent-primary)]" : "bg-red-400"
                              }`}
                            />
                            <span className="text-gray-700 dark:text-gray-300">
                              {formatToolLabel(stage.tool)}
                            </span>
                            <span className="ml-auto text-xs text-gray-400">
                              Step {stage.step}{stage.totalPlanned ? ` / ${stage.totalPlanned}` : ""}
                            </span>
                            <span className={`text-xs font-medium ${stage.status === "done" ? "text-emerald-500" : stage.status === "running" ? "text-[var(--accent-primary)]" : "text-gray-400"}`}>
                              {stage.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

              {detailTab === "artifacts" ? (
                <div
                  role="tabpanel"
                  id="chat-detail-panel-artifacts"
                  aria-labelledby="chat-detail-tab-artifacts"
                  data-testid="chat-artifacts-content"
                  className="space-y-4"
                >
                  <div className="rounded-[24px] border border-gray-200 bg-white px-4 py-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                      Artifacts
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Artifacts for this thread
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Review generated entities, report links, and saved candidates here before treating them as durable workspace state.
                    </p>
                  </div>
                  {showThreadUnavailableCard ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-white/[0.08] dark:text-gray-400">
                      This thread is unavailable from the current workspace context, so NodeBench cannot restore its artifacts here.
                    </div>
                  ) : conversation.activeSessionId ? (
                    <SessionArtifactsPanel sessionId={conversation.activeSessionId} defaultCollapsed={false} />
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-white/[0.08] dark:text-gray-400">
                      Artifacts appear once a thread is running. This tab keeps generated candidates reviewable instead of buried in the conversation.
                    </div>
                  )}
                  {canOpenFullReport ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(fullReportPath!)}
                        className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 transition hover:border-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:border-white/[0.24]"
                      >
                        Open canonical report
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {detailTab === "files" ? (
                <div
                  role="tabpanel"
                  id="chat-detail-panel-files"
                  aria-labelledby="chat-detail-tab-files"
                  className="space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Thread files
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Files live globally in Me, but this thread shows what is attached or generated here.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilePicker(true)}
                      className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-sm text-gray-700 transition hover:border-[var(--accent-primary)]/35 hover:text-[var(--accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 dark:border-white/[0.12] dark:bg-white/[0.03] dark:text-gray-200 dark:hover:border-[var(--accent-primary)]/35"
                    >
                      Attach from Files
                    </button>
                  </div>

                  {pendingFiles.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        Ready for next run
                      </h4>
                      <div className="space-y-2">
                        {pendingFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.03]"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">{file.name}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span>{file.type}</span>
                              {typeof file.size === "number" ? <span>{file.size} bytes</span> : null}
                              {file.evidenceId ? <span>Vault linked</span> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {sessionFiles.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                        Attached to this thread
                      </h4>
                      <div className="space-y-2">
                        {sessionFiles.map((file) => (
                          <div
                            key={file._id}
                            className="flex flex-col gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm dark:border-white/[0.08] dark:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-medium text-gray-900 dark:text-gray-100">
                                {file.label || "Saved file"}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                                {file.type ? <span className="capitalize">{file.type}</span> : null}
                                {file.mimeType ? <span>{file.mimeType}</span> : null}
                                {typeof file.size === "number" ? <span>{file.size} bytes</span> : null}
                              </div>
                            </div>
                            {file.storageUrl ? (
                              <a
                                href={file.storageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex shrink-0 items-center justify-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-gray-400 dark:border-white/[0.12] dark:text-gray-200 dark:hover:border-white/[0.24]"
                              >
                                View file
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {pendingFiles.length === 0 && sessionFiles.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 dark:border-white/[0.08] dark:text-gray-400">
                      Upload in Chat or attach something from Files. Anything linked here stays reusable from the report notebook later.
                    </div>
                  ) : null}
                </div>
              ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

        <div
          className={`fixed inset-x-0 z-20 sm:sticky sm:bottom-[max(10px,env(safe-area-inset-bottom))] sm:mx-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none ${
            conversation.activeSessionId
              ? "bottom-0 border-t border-white/[0.06] bg-[#0d1117]/96 px-2.5 pt-2 pb-[calc(env(safe-area-inset-bottom)+4px)] shadow-[0_-22px_52px_-32px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
              : "bottom-[calc(44px+env(safe-area-inset-bottom))] bg-[linear-gradient(180deg,rgba(12,15,20,0),rgba(12,15,20,0.86)_18%,rgba(12,15,20,0.96))] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+6px)] backdrop-blur-xl"
          }`}
        >
          <div className={`relative flex flex-col ${conversation.activeSessionId ? "gap-0.5" : "gap-1"}`}>
            {(lockedClassification || inferredClassification) ? (
              <div className="hidden justify-center sm:flex">
                <ClassificationChip
                  classification={lockedClassification ?? inferredClassification}
                  variant={lockedClassification ? "active" : "preview"}
                />
              </div>
            ) : null}
            <ProductIntakeComposer
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
              onFilesSelected={handleFilesSelected}
              files={pendingFiles}
              lens={lens}
              onLensChange={handleLensChange}
              operatorContextLabel={operatorContextLabel}
              operatorContextHint={operatorContextHint}
              uploadingFiles={uploadingFiles}
              submitPending={streaming.isStreaming}
              placeholder="Message NodeBench"
              helperText=""
              submitLabel={conversation.activeSessionId ? "Send" : "Ask NodeBench"}
              showOperatorContextChip={false}
              showOperatorContextHint={false}
              autoFocus={!conversation.activeSessionId}
              mode={composerMode}
              onModeChange={setComposerMode}
              showCaptureModes={false}
              showLensSelector={false}
              onSaveCapture={handleSaveCapture}
              captureSavePending={savingCapture}
              variant="chat"
              compact={compactComposer}
              className="w-full max-w-none sm:mx-auto sm:max-w-[960px]"
            />
          </div>
        </div>

      <ThreadActionsSheet
        open={threadActionsOpen}
        onClose={() => setThreadActionsOpen(false)}
        onFavorite={handleFavoriteThread}
        onRename={handleRenameThread}
        onViewFiles={handleViewAllFiles}
        onRunDetails={handleRunDetails}
        onDelete={handleDeleteThread}
        isFavorite={isCurrentFavorite}
        hasActiveSession={Boolean(activeSessionId)}
      />
      <ChatShareSheet
        open={shareSheetOpen}
        onClose={() => setShareSheetOpen(false)}
        threadLabel={resolvedEntityName || "NodeBench thread"}
        shareUrl={shareUrl}
        linkCopied={copiedLink}
        onCopyLink={copyShareLink}
        onSystemShare={handleSystemShare}
        onOpenCanonicalReport={canOpenFullReport ? () => navigate(fullReportPath!) : undefined}
        canSystemShare={typeof navigator !== "undefined" && typeof navigator.share === "function"}
        canOpenCanonicalReport={canOpenFullReport}
      />
    </div>
  );
});

export default ChatHome;
