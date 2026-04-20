/**
 * ChatHome -- Perplexity-style answer page.
 *
 * Answer first. Sources next. Trace later.
 * Single centered column, clean typography, inline citations.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConvex, useMutation, useQuery } from "convex/react";
import { ArrowUp, ChevronDown, ChevronUp, Link2, Search } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { staggerDelay } from "@/lib/ui/stagger";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { LENSES, type LensId, type ResultPacket } from "@/features/controlPlane/components/searchTypes";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { loadProductDraft, saveProductDraft, shouldPersistDraftQueryInUrl } from "@/features/product/lib/productSession";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { useStreamingSearch, type ToolStage } from "@/hooks/useStreamingSearch";
import { useConvexApi } from "@/lib/convexApi";
import { buildOperatorContextHint, buildOperatorContextLabel } from "@/features/product/lib/operatorContext";
import { ProductIntakeComposer } from "@/features/product/components/ProductIntakeComposer";
import { SessionArtifactsPanel } from "@/features/chat/components/SessionArtifactsPanel";
import { uploadProductDraftFiles } from "@/features/product/lib/uploadDraftFiles";
import { deriveReportArtifactMode, getReportArtifactLabel, type ReportArtifactMode } from "../../../../shared/reportArtifacts";
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
          ? packet.answer || "No clear summary was returned."
          : section.id === "why-it-matters"
            ? "The agent did not return a distinct why-this-matters section."
            : section.id === "what-is-missing"
              ? "No explicit gap was returned."
              : "No next action was returned."),
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

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export const ChatHome = memo(function ChatHome() {
  useProductBootstrap();

  const navigate = useNavigate();
  const convex = useConvex();
  const api = useConvexApi();
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("q");
  const lensParam = searchParams.get("lens");
  const entityParam = searchParams.get("entity");
  const anonymousSessionId = getAnonymousProductSessionId();
  const draft = useMemo(() => loadProductDraft(), []);
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
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [savedEntitySlug, setSavedEntitySlug] = useState<string | null>(null);
  const [reportPinned, setReportPinned] = useState(false);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [draftFiles, setDraftFiles] = useState(() => draft?.files ?? []);
  const streaming = useStreamingSearch();
  const startedQueryRef = useRef<string | null>(null);
  const routingRef = useRef<typeof streaming.routing>(null);
  const recordedMilestonesRef = useRef({
    firstSignal: false,
    firstSource: false,
    firstPartialAnswer: false,
    reportSaved: false,
  });

  useEffect(() => {
    routingRef.current = streaming.routing;
  }, [streaming.routing]);

  /* ---- begin run ---- */

  const beginRun = useCallback(
    async (nextQuery: string, nextLens: LensId) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) return;

      startedQueryRef.current = trimmed;
      recordedMilestonesRef.current = { firstSignal: false, firstSource: false, firstPartialAnswer: false, reportSaved: false };
      setSavedReportId(null);
      setSavedEntitySlug(null);
      setReportPinned(false);
      setPersistenceMessage(null);

      saveProductDraft({ query: trimmed, lens: nextLens, files: draftFiles });
      const nextSearch = new URLSearchParams();
      nextSearch.set("surface", "chat");
      nextSearch.set("lens", nextLens);
      if (shouldPersistDraftQueryInUrl(trimmed)) {
        nextSearch.set("q", trimmed);
      } else {
        nextSearch.set("draft", "1");
      }
      if (entityParam?.trim()) nextSearch.set("entity", entityParam.trim());
      if (window.location.search !== `?${nextSearch.toString()}`) {
        navigate(`/?${nextSearch.toString()}`, { replace: true });
      }
      trackEvent("chat_run_started", { queryLength: trimmed.length, uploads: draft?.files?.length ?? 0, lens: nextLens });

      let sessionId: string | null = null;
      if (api?.domains.product.chat.startSession) {
        try {
          const result: any = await convex.mutation(api.domains.product.chat.startSession, {
            anonymousSessionId,
            query: trimmed,
            lens: nextLens,
            files: draftFiles,
            contextHint: runtimeContextHint ?? undefined,
            contextLabel: operatorContextLabel ?? undefined,
          });
          sessionId = result?.sessionId ?? null;
          setActiveSessionId(sessionId);
        } catch (error) {
          setPersistenceMessage(error instanceof Error ? error.message : "Could not start canonical session.");
        }
      }

      streaming.startStream(trimmed, nextLens, {
        onToolStart: (payload) => {
          if (!sessionId || !api?.domains.product.chat.recordToolStart) return;
          void convex.mutation(api.domains.product.chat.recordToolStart, {
            anonymousSessionId,
            sessionId: sessionId as any,
            tool: payload.tool,
            provider: payload.provider,
            model: payload.model,
            step: payload.step,
            totalPlanned: payload.totalPlanned,
            reason: payload.reason,
          });
        },
        onToolDone: (payload) => {
          if (!sessionId || !api?.domains.product.chat.recordToolDone) return;
          void convex.mutation(api.domains.product.chat.recordToolDone, {
            anonymousSessionId,
            sessionId: sessionId as any,
            tool: payload.tool,
            step: payload.step,
            durationMs: payload.durationMs,
            tokensIn: payload.tokensIn,
            tokensOut: payload.tokensOut,
            preview: payload.preview,
          });
        },
        onComplete: (payload) => {
          if (!sessionId || !api?.domains.product.chat.completeSession) return;
          void convex
            .mutation(api.domains.product.chat.completeSession, {
              anonymousSessionId,
              sessionId: sessionId as any,
              packet: payload.packet ?? payload,
              entitySlugHint: entityParam?.trim() || undefined,
              routing: routingRef.current ?? undefined,
              totalDurationMs: payload.totalDurationMs,
            })
            .then((result: any) => {
              setSavedReportId(result?.reportId ?? null);
              setSavedEntitySlug(result?.entitySlug ?? null);
              setPersistenceMessage("Report saved automatically.");
            })
            .catch((error: unknown) => {
              setPersistenceMessage(error instanceof Error ? error.message : "Could not save report.");
            });
        },
        onError: (message) => {
          setPersistenceMessage(message);
          if (!sessionId || !api?.domains.product.chat.completeSession) return;
          void convex.mutation(api.domains.product.chat.completeSession, {
            anonymousSessionId,
            sessionId: sessionId as any,
            packet: { answer: "", sourceRefs: [] },
            entitySlugHint: entityParam?.trim() || undefined,
            routing: routingRef.current ?? undefined,
            error: message,
          });
        },
      }, { contextHint: runtimeContextHint ?? undefined });
    },
    [anonymousSessionId, api, convex, draftFiles, entityParam, navigate, operatorContextLabel, runtimeContextHint, streaming.startStream],
  );

  /* ---- search-param sync ---- */

  useEffect(() => {
    const nextQuery = queryParam;
    const nextLens = lensParam;
    if (nextQuery) setInput(nextQuery);
    if (isLensId(nextLens)) setLens(nextLens);
  }, [lensParam, queryParam]);

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
    const nextQuery = queryParam ?? draft?.query ?? "";
    const nextLens = resolvePreferredLens({
      lensParam,
      draftQuery: draft?.query,
      draftLens: draft?.lens,
      preferredLens: operatorProfile?.preferredLens,
    });
    if (!nextQuery.trim()) return;
    if (startedQueryRef.current === nextQuery.trim()) return;
    setInput(nextQuery);
    setLens(nextLens);
    void beginRun(nextQuery, nextLens);
  }, [beginRun, draft?.lens, draft?.query, lensParam, operatorProfile?.preferredLens, queryParam]);

  const handleSubmit = useCallback(() => { void beginRun(input, lens); }, [beginRun, input, lens]);
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); handleSubmit(); }
    },
    [handleSubmit],
  );

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
        saveProductDraft({
          query: input,
          lens,
          files: nextFiles,
        });
      } finally {
        setUploadingFiles(false);
      }
    },
    [anonymousSessionId, api, generateUploadUrl, input, lens, pendingFiles, saveFileMutation],
  );

  /* ---- derived state (must be before effects that reference them) ---- */

  const packet = normalizePacket(streaming.result);
  const artifactMode = deriveReportArtifactMode(startedQueryRef.current ?? input);
  const reportSections = deriveReportSections(
    packet,
    streaming.isStreaming,
    streaming.stages,
    streaming.liveAnswerPreview,
    artifactMode,
  );
  const sources = packet?.sourceRefs?.length ? packet.sourceRefs : streaming.sourcePreview;
  const routing = streaming.routing;
  const hasRun = Boolean(startedQueryRef.current?.trim() || streaming.milestones.startedAt || packet);
  const followUps = ["Go deeper", "Show risks", "Draft reply", "What changed?"];
  const showLaunchState = !hasRun && !streaming.isStreaming;

  const buildFollowUpQuery = useCallback((label: string) => {
    const baseQuery = startedQueryRef.current?.trim();
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
  }, []);

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
    if (!savedReportId || recordedMilestonesRef.current.reportSaved) return;
    recordedMilestonesRef.current.reportSaved = true;
    trackEvent("report_saved", { reportId: savedReportId, sources: sources.length, uploads: pendingFiles.length });
  }, [pendingFiles.length, savedReportId, sources.length]);

  /* ---- share link ---- */

  const copyShareLink = useCallback(() => {
    const url = savedEntitySlug
      ? new URL(`${window.location.origin}/entity/${encodeURIComponent(savedEntitySlug)}`)
      : new URL(window.location.href);
    if (!savedEntitySlug && startedQueryRef.current) url.searchParams.set("q", startedQueryRef.current);
    if (!savedEntitySlug) url.searchParams.set("lens", lens);
    void navigator.clipboard.writeText(url.toString());
    trackEvent("chat_share_link", { hasReport: savedReportId ? 1 : 0, hasSources: sources.length });
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [lens, savedEntitySlug, savedReportId, sources.length]);

  /* ---- pin report ---- */

  const pinReport = useCallback(async () => {
    if (!savedReportId || !api?.domains.product.chat.pinReport) {
      navigate(buildCockpitPath({ surfaceId: "packets" }));
      return;
    }
    try {
      await convex.mutation(api.domains.product.chat.pinReport, { reportId: savedReportId as any });
      setReportPinned(true);
      setPersistenceMessage("Report pinned to your workspace.");
    } catch {
      navigate(buildCockpitPath({ surfaceId: "packets" }));
    }
  }, [api, convex, navigate, savedReportId]);

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[720px] flex-col px-4 py-6 pb-24 md:px-0 md:py-10">
      {showLaunchState ? (
        <section className="flex flex-1 flex-col items-center justify-start pb-10 pt-10 text-center sm:justify-center sm:pb-20 sm:pt-6">
          <div className="w-full max-w-[680px]">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d97757]" aria-hidden="true" />
              New conversation
            </div>
            <h1 className="mt-4 text-[1.5rem] font-semibold leading-[1.15] tracking-tight text-gray-900 dark:text-gray-100 md:text-[1.75rem]">
              Start a conversation.
            </h1>
            <p className="mx-auto mt-2 max-w-[520px] text-sm leading-6 text-gray-500 dark:text-gray-400">
              Ask anything. Follow up with more questions. Save the result as a report when it's useful.
            </p>
            {operatorContextLabel ? (
              <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300">
                <span className="font-medium">Saved context ready</span>
                <span className="text-gray-400 dark:text-gray-500">{operatorContextLabel}</span>
              </div>
            ) : null}

            <div className="mt-6 sm:mt-8">
              <ProductIntakeComposer
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                onFilesSelected={handleFilesSelected}
                files={pendingFiles}
                lens={lens}
                onLensChange={setLens}
                operatorContextLabel={operatorContextLabel}
                operatorContextHint={operatorContextHint}
                uploadingFiles={uploadingFiles}
                submitPending={streaming.isStreaming}
                placeholder="Ask anything. Paste notes, URLs, or files to ground the answer."
                helperText="Your lens and saved context shape how NodeBench answers."
                submitLabel="Run advisor"
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-2 sm:mt-6 sm:flex sm:flex-wrap sm:justify-center">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setInput(prompt);
                    void beginRun(prompt, lens);
                  }}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[var(--accent-primary)]/30 hover:text-gray-900 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 motion-reduce:transform-none motion-reduce:transition-none dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300 dark:hover:border-[var(--accent-primary)]/40 dark:hover:bg-[#20262d] dark:hover:text-white"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* ---- Query heading ---- */}
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {startedQueryRef.current || input || "Ask anything"}
          </h1>

          {(routing || operatorContextLabel || artifactMode === "prep_brief") && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {artifactMode === "prep_brief" ? (
                <span className="rounded-full border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/8 px-2.5 py-1 text-xs font-medium text-[var(--accent-primary)]">
                  {getReportArtifactLabel(artifactMode)}
                </span>
              ) : null}
              {routing ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    routing.routingMode === "advisor"
                      ? "bg-[var(--accent-primary)]/12 text-[var(--accent-primary)]"
                      : "bg-gray-100 text-gray-600 dark:bg-[#171c22] dark:text-gray-300"
                  }`}
                >
                  {routing.routingMode === "advisor" ? "Deep reasoning" : "Fast path"}
                </span>
              ) : null}
              {operatorContextLabel ? (
                <span className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300">
                  Using your context: {operatorContextLabel}
                </span>
              ) : null}
              {routing?.routingReason ? (
                <span className="text-xs text-gray-500 dark:text-gray-400">{routing.routingReason}</span>
              ) : null}
            </div>
          )}

          {/* ---- Source cards row ---- */}
          {sources.length > 0 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
              {sources.slice(0, 5).map((s, i) => (
                <a
                  key={s.id ?? i}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-[180px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition hover:border-[var(--accent-primary)] dark:border-white/[0.12] dark:bg-[#171c22] dark:hover:bg-[#1d232a]"
                >
                  <span className="text-xs text-gray-400">{i + 1}</span>
                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                    {s.label || s.domain || "Source"}
                  </span>
                </a>
              ))}
              {sources.length > 5 && (
                <span className="self-center whitespace-nowrap text-sm text-gray-400">+{sources.length - 5} more</span>
              )}
            </div>
          )}

          {/* ---- Searching indicator ---- */}
          {streaming.isStreaming && !packet && (
            <p className="mt-6 animate-pulse text-sm text-gray-500 dark:text-gray-400">Searching...</p>
          )}

          {/* ---- Persistence message ---- */}
          {persistenceMessage && (
            <p className="mt-4 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm text-gray-600 dark:border-white/[0.08] dark:bg-[#171c22] dark:text-gray-300">
              {persistenceMessage}
            </p>
          )}

          {/* ---- Answer sections ---- */}
          {hasRun && (
            <div className="mt-6 space-y-8">
              {reportSections.map((section, sectionIndex) =>
                section.skeleton ? null : (
                  <div
                    key={section.id}
                    className={`starting-point-card ${section.status === "building" ? "animate-pulse motion-reduce:animate-none" : ""}`}
                    style={staggerDelay(sectionIndex)}
                  >
                    <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {section.title}
                    </h2>
                    <div
                      className={`text-base leading-relaxed text-gray-700 dark:text-gray-300 ${
                        streaming.isStreaming && section.status === "building"
                          ? "stream-caret"
                          : ""
                      }`}
                    >
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
                    {streaming.isStreaming && section.status === "building" && streaming.sourcePreview.length > 0 && section.id === "what-it-is" && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {streaming.sourcePreview.slice(0, 3).map((sp, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-primary)]/10 px-2 py-0.5 text-xs text-[var(--accent-primary)]">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-primary)]" />
                            {sp.label || sp.domain || "Searching..."}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}

          {/* ---- Follow-up chips ---- */}
          {hasRun && !streaming.isStreaming && (
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
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300 dark:hover:border-[var(--accent-primary)] dark:hover:bg-[#1d232a]"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* ---- Action bar (save / open / share) ---- */}
          {hasRun && !streaming.isStreaming && packet && (
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={pinReport}
                className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-primary-hover)]"
              >
                {reportPinned ? "Pinned" : "Save to workspace"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (savedEntitySlug) { navigate(`/entity/${encodeURIComponent(savedEntitySlug)}`); return; }
                  navigate(buildCockpitPath({ surfaceId: "packets", extra: savedReportId ? { report: savedReportId } : undefined }));
                }}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:border-gray-400 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300 dark:hover:border-white/[0.24] dark:hover:bg-[#1d232a]"
              >
                Open full report
              </button>
              <button
                type="button"
                onClick={copyShareLink}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition hover:border-gray-400 dark:border-white/[0.12] dark:bg-[#171c22] dark:text-gray-300 dark:hover:border-white/[0.24] dark:hover:bg-[#1d232a]"
              >
                <Link2 className="h-4 w-4" />
                {copiedLink ? "Copied!" : "Share link"}
              </button>
            </div>
          )}

          {/* ---- Collapsible trace ---- */}
          {hasRun && streaming.stages.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-4 dark:border-white/[0.1]">
              <button
                type="button"
                onClick={() => setTraceOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {traceOpen ? "Hide trace" : "Show trace"}
                {traceOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              {traceOpen && (
                <div className="mt-3 space-y-2">
                  {streaming.stages.map((stage, i) => (
                    <div key={`${stage.tool}-${stage.step}-${i}`} className="flex items-center gap-3 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-white/[0.08] dark:bg-[#171c22]">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          stage.status === "done" ? "bg-emerald-400" : stage.status === "running" ? "bg-[var(--accent-primary)]" : "bg-red-400"
                        }`}
                      />
                      <span className="text-gray-700 dark:text-gray-300">
                        {stage.tool?.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) || "Working"}
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
              )}
            </div>
          )}

          {/* ---- Session artifacts panel ----
               Ambient review rail for agent-generated candidates. Renders only
               once the run has an active session id so the panel isn't
               orphaned. See docs/architecture/AGENT_PIPELINE.md + Session
               Artifacts section. Backend: convex/domains/product/sessionArtifacts.ts */}
          {activeSessionId ? (
            <div className="mt-6">
              <SessionArtifactsPanel sessionId={activeSessionId} defaultCollapsed />
            </div>
          ) : null}

          {/* ---- Sticky bottom composer ---- */}
          <div className="sticky bottom-0 z-10 mt-8 border-t border-gray-200 bg-[var(--bg-primary,#fff)] pb-4 pt-4 dark:border-white/[0.1] dark:bg-[var(--bg-primary,#111418)]">
            <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-white/[0.1] dark:bg-[#171c22]">
              <Search className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                id="chat-query"
                name="chatQuery"
                aria-label="Ask a follow-up"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={hasRun ? "Ask a follow-up..." : "Ask anything..."}
                className="w-full bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
                disabled={streaming.isStreaming}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={streaming.isStreaming || !input.trim()}
                aria-label="Submit"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white transition hover:bg-[var(--accent-primary-hover)] disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {LENSES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLens(option.id)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                    lens === option.id
                      ? "bg-[var(--accent-primary)] text-white"
                      : "border border-gray-200 text-gray-500 hover:border-gray-400 dark:border-white/[0.12] dark:bg-[#161b20] dark:text-gray-300 dark:hover:border-white/[0.24] dark:hover:bg-[#20262d]"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default ChatHome;
