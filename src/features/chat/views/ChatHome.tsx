/**
 * ChatHome - the live agent workspace.
 *
 * Shows the active query, live stage progress, tool/source activity,
 * evidence cards, and a plain-English report build as the run completes.
 */

import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConvex } from "convex/react";
import { ArrowUp, ChevronDown, ChevronUp, ExternalLink, Link2, Search } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { buildCockpitPath } from "@/lib/registry/viewRegistry";
import { LENSES, type LensId, type ResultPacket } from "@/features/controlPlane/components/searchTypes";
import { getAnonymousProductSessionId } from "@/features/product/lib/productIdentity";
import { loadProductDraft, saveProductDraft } from "@/features/product/lib/productSession";
import { useProductBootstrap } from "@/features/product/lib/useProductBootstrap";
import { ProductWorkspaceHeader } from "@/features/product/components/ProductWorkspaceHeader";
import { useStreamingSearch, type ToolStage } from "@/hooks/useStreamingSearch";
import { useConvexApi } from "@/lib/convexApi";
import { SkeletonText } from "@/components/skeletons/Skeleton";

type ReportSection = {
  id: string;
  title: string;
  body: string;
  status: "pending" | "building" | "complete";
  sourceRefIds?: string[];
};

function formatLensLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatToolLabel(value?: string) {
  const normalized = value?.toLowerCase();
  switch (normalized) {
    case "classify":
      return "Classify request";
    case "web_search":
      return "Gather sources";
    case "entity_extract":
      return "Read evidence";
    case "package":
      return "Build report";
    case "replay_check":
      return "Check prior runs";
    default:
      if (!value) return "Working";
      return value.replaceAll("_", " ").replace(/\b\w/g, (match) => match.toUpperCase());
  }
}

function normalizePacket(packet: Record<string, unknown> | null): ResultPacket | null {
  if (!packet) return null;
  return packet as unknown as ResultPacket;
}

/** Map stage index to the number of report sections visible (progressive reveal). */
function stageVisibility(stages: ToolStage[]): number {
  const doneTools = new Set(stages.filter((s) => s.status === "done").map((s) => s.tool?.toLowerCase()));
  if (doneTools.has("package")) return 4;
  if (doneTools.has("analyze")) return 4;
  if (doneTools.has("search")) return 2;
  if (doneTools.has("classify")) return 1;
  // Fallback: count done stages
  const doneCount = stages.filter((s) => s.status === "done").length;
  if (doneCount >= 3) return 4;
  if (doneCount >= 2) return 2;
  if (doneCount >= 1) return 1;
  return 0;
}

type ReportSectionWithSkeleton = ReportSection & { skeleton?: boolean };

function deriveReportSections(
  packet: ResultPacket | null,
  isStreaming: boolean,
  stages: ToolStage[] = [],
  liveAnswerPreview: string | null = null,
): ReportSectionWithSkeleton[] {
  if (packet) {
    return [
      {
        id: "what-it-is",
        title: "What it is",
        body: packet.answerBlocks?.[0]?.text || packet.answer || "No clear summary was returned.",
        status: "complete",
        sourceRefIds: packet.answerBlocks?.[0]?.sourceRefIds ?? [],
      },
      {
        id: "why-it-matters",
        title: "Why it matters",
        body:
          packet.changes?.[0]?.description ||
          packet.variables?.[0]?.name ||
          "The agent did not return a distinct why-this-matters section.",
        status: "complete",
      },
      {
        id: "what-is-missing",
        title: "What is missing",
        body:
          packet.risks?.[0]?.description ||
          packet.nextQuestions?.[0] ||
          packet.uncertaintyBoundary ||
          "No explicit gap was returned.",
        status: "complete",
      },
      {
        id: "what-to-do-next",
        title: "What to do next",
        body:
          packet.recommendedNextAction ||
          packet.interventions?.[0]?.action ||
          packet.nextQuestions?.[0] ||
          "No next action was returned.",
        status: "complete",
      },
    ];
  }

  // Not streaming and no packet — idle state
  if (!isStreaming) {
    return [
      { id: "what-it-is", title: "What it is", body: "Ask a question to start the report.", status: "pending" },
      { id: "why-it-matters", title: "Why it matters", body: "The report will explain why this matters once the run starts.", status: "pending" },
      { id: "what-is-missing", title: "What is missing", body: "Missing evidence and open questions will appear here.", status: "pending" },
      { id: "what-to-do-next", title: "What to do next", body: "A concrete next move will appear here.", status: "pending" },
    ];
  }

  // Streaming: progressive reveal based on completed stages
  const visible = stageVisibility(stages);
  const templates: { id: string; title: string; buildingBody: string }[] = [
    { id: "what-it-is", title: "What it is", buildingBody: "The agent is classifying the request and gathering first sources." },
    { id: "why-it-matters", title: "Why it matters", buildingBody: "This section fills in after the agent has enough signal." },
    { id: "what-is-missing", title: "What is missing", buildingBody: "Gaps and uncertainties appear once the source sweep finishes." },
    { id: "what-to-do-next", title: "What to do next", buildingBody: "The recommended next move is being assembled from the evidence." },
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
    // Not yet visible — show skeleton placeholder
    return { id: t.id, title: t.title, body: "", status: "pending" as const, skeleton: true };
  });
}

export const ChatHome = memo(function ChatHome() {
  useProductBootstrap();

  const navigate = useNavigate();
  const convex = useConvex();
  const api = useConvexApi();
  const [searchParams] = useSearchParams();
  const anonymousSessionId = getAnonymousProductSessionId();
  const draft = useMemo(() => loadProductDraft(), []);
  const initialQuery = searchParams.get("q") ?? draft?.query ?? "";
  const initialLens = (searchParams.get("lens") ?? draft?.lens ?? "founder") as LensId;

  const [input, setInput] = useState(initialQuery);
  const [lens, setLens] = useState<LensId>(initialLens);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [savedEntitySlug, setSavedEntitySlug] = useState<string | null>(null);
  const [reportPinned, setReportPinned] = useState(false);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [traceExpanded, setTraceExpanded] = useState(false);
  const streaming = useStreamingSearch();
  const startedQueryRef = useRef<string | null>(null);
  const recordedMilestonesRef = useRef({
    firstSignal: false,
    firstSource: false,
    firstPartialAnswer: false,
    reportSaved: false,
  });

  const beginRun = useCallback(
    async (nextQuery: string, nextLens: LensId) => {
      const trimmed = nextQuery.trim();
      if (!trimmed) return;

      startedQueryRef.current = trimmed;
      recordedMilestonesRef.current = {
        firstSignal: false,
        firstSource: false,
        firstPartialAnswer: false,
        reportSaved: false,
      };
      setSavedReportId(null);
      setSavedEntitySlug(null);
      setReportPinned(false);
      setPersistenceMessage(null);

      saveProductDraft({
        query: trimmed,
        lens: nextLens,
        files: draft?.files ?? [],
      });
      trackEvent("chat_run_started", {
        queryLength: trimmed.length,
        uploads: draft?.files?.length ?? 0,
        lens: nextLens,
      });

      let sessionId: string | null = null;
      if (api?.domains.product.chat.startSession) {
        try {
          const result: any = await convex.mutation(api.domains.product.chat.startSession, {
            anonymousSessionId,
            query: trimmed,
            lens: nextLens,
            files: draft?.files ?? [],
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
          if (!sessionId || !api?.domains.product.chat.completeSession) {
            return;
          }
          void convex
            .mutation(api.domains.product.chat.completeSession, {
              anonymousSessionId,
              sessionId: sessionId as any,
              packet: payload.packet ?? payload,
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
          if (!sessionId || !api?.domains.product.chat.completeSession) {
            return;
          }
          void convex.mutation(api.domains.product.chat.completeSession, {
            anonymousSessionId,
            sessionId: sessionId as any,
            packet: {
              answer: "",
              sourceRefs: [],
            },
            error: message,
          });
        },
      });
    },
    [anonymousSessionId, api, convex, draft?.files, streaming],
  );

  useEffect(() => {
    const nextQuery = searchParams.get("q");
    const nextLens = searchParams.get("lens");
    if (nextQuery) setInput(nextQuery);
    if (nextLens && LENSES.some((option) => option.id === nextLens)) {
      setLens(nextLens as LensId);
    }
  }, [searchParams]);

  useEffect(() => {
    const nextQuery = searchParams.get("q") ?? draft?.query ?? "";
    const nextLens = (searchParams.get("lens") ?? draft?.lens ?? lens) as LensId;
    if (!nextQuery.trim()) return;
    if (startedQueryRef.current === nextQuery.trim()) return;
    setInput(nextQuery);
    setLens(nextLens);
    void beginRun(nextQuery, nextLens);
  }, [beginRun, draft?.lens, draft?.query, lens, searchParams]);

  const handleSubmit = useCallback(() => {
    void beginRun(input, lens);
  }, [beginRun, input, lens]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  const packet = normalizePacket(streaming.result);
  const reportSections = deriveReportSections(packet, streaming.isStreaming, streaming.stages, streaming.liveAnswerPreview);
  const sources = packet?.sourceRefs?.length ? packet.sourceRefs : streaming.sourcePreview;
  const hasRun = Boolean(startedQueryRef.current?.trim() || streaming.milestones.startedAt || packet);
  const pendingFiles = draft?.files ?? [];
  const followUps = ["Go deeper", "Show risks", "Draft reply", "What changed?"];
  const primaryCitations = packet?.answerBlocks?.[0]?.sourceRefIds?.length
    ? packet.answerBlocks[0].sourceRefIds
        .map((sourceId) => packet.sourceRefs?.find((source) => source.id === sourceId))
        .filter(Boolean)
    : sources.slice(0, 3);
  useEffect(() => {
    if (!streaming.milestones.startedAt) return;

    if (streaming.milestones.firstStageAt && !recordedMilestonesRef.current.firstSignal) {
      recordedMilestonesRef.current.firstSignal = true;
      trackEvent("first_partial_signal_ms", {
        durationMs: Math.max(0, streaming.milestones.firstStageAt - streaming.milestones.startedAt),
      });
    }

    if (streaming.milestones.firstSourceAt && !recordedMilestonesRef.current.firstSource) {
      recordedMilestonesRef.current.firstSource = true;
      trackEvent("first_source_ms", {
        durationMs: Math.max(0, streaming.milestones.firstSourceAt - streaming.milestones.startedAt),
      });
    }

    if (streaming.milestones.firstPartialAnswerAt && !recordedMilestonesRef.current.firstPartialAnswer) {
      recordedMilestonesRef.current.firstPartialAnswer = true;
      trackEvent("first_partial_answer_ms", {
        durationMs: Math.max(0, streaming.milestones.firstPartialAnswerAt - streaming.milestones.startedAt),
      });
    }
  }, [streaming.milestones.firstPartialAnswerAt, streaming.milestones.firstSourceAt, streaming.milestones.firstStageAt, streaming.milestones.startedAt]);

  useEffect(() => {
    if (!savedReportId || recordedMilestonesRef.current.reportSaved) return;
    recordedMilestonesRef.current.reportSaved = true;
    trackEvent("report_saved", {
      hasSources: sources.length,
      hasUploads: pendingFiles.length,
    });
  }, [pendingFiles.length, savedReportId, sources.length]);

  return (
    <div className="nb-public-shell mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-6 py-8 xl:px-8 xl:py-10">
      <ProductWorkspaceHeader
        kicker="Chat"
        title={startedQueryRef.current || input || "Start a live session"}
        description="The answer stays primary. Sources and live activity stay visible as support, not as competing panels."
        aside={
          <div className="nb-panel-soft flex items-center gap-3 px-4 py-3 text-sm text-content-muted">
            <span className={`nb-status-dot ${streaming.isStreaming ? "bg-[#d97757]" : packet ? "bg-emerald-400" : "bg-white/35"}`} />
            {streaming.isStreaming ? "Searching live" : packet ? "Run complete" : "Ready"}
          </div>
        }
      />

      <section className="nb-enter grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="order-1 space-y-4 xl:order-none">
          <article className="px-5 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="nb-section-kicker">Answer</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="nb-chip nb-chip-active">{formatLensLabel(lens)} lens</div>
                  {activeSessionId ? <div className="nb-chip">Run {activeSessionId.slice(0, 8)}</div> : null}
                  {pendingFiles.length > 0 ? (
                    <div className="nb-chip">{pendingFiles.length} upload{pendingFiles.length === 1 ? "" : "s"} attached</div>
                  ) : null}
                </div>
              </div>
            </div>

            {persistenceMessage ? (
              <div className="nb-panel-soft mt-4 rounded-2xl px-4 py-3 text-sm text-content-muted">
                {persistenceMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <div className="nb-chip nb-chip-active">{startedQueryRef.current || input || "Waiting for a question"}</div>
              {sources.slice(0, 4).map((source) => (
                <a
                  key={`inline-${source.id}`}
                  href={source.href}
                  target="_blank"
                  rel="noreferrer"
                  className="nb-chip nb-hover-lift inline-flex items-center gap-2 text-content-muted"
                >
                  <span className="truncate">{source.label}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {reportSections[0] && !reportSections[0].skeleton ? (
                <section
                  className={`nb-answer-surface relative overflow-hidden rounded-[22px] p-5 ${
                    reportSections[0].status === "building" ? "nb-loading-sheen" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-content">{reportSections[0].title}</h3>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-content-muted">{reportSections[0].status}</span>
                  </div>
                  <p className="mt-3 max-w-none text-[15px] leading-7 text-content">
                    {reportSections[0].body}
                  </p>
                  {primaryCitations.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {primaryCitations.slice(0, 4).map((source, idx) => (
                        <a
                          key={`primary-${source?.id ?? source?.label}`}
                          href={source?.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-content-muted transition hover:bg-white/[0.08] hover:text-content"
                        >
                          <span className="font-mono text-[#d97757]">[{idx + 1}]</span>
                          <span className="max-w-[120px] truncate">{source?.label || source?.domain || "Source"}</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {streaming.isStreaming && reportSections[0].status === "building" && streaming.sourcePreview.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in">
                      {streaming.sourcePreview.slice(0, 3).map((sp, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-[#d97757]/10 px-2 py-0.5 text-[10px] text-[#d97757]">
                          <span className="h-1 w-1 animate-pulse rounded-full bg-[#d97757]" />
                          {sp.tool || "Searching..."}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ) : reportSections[0]?.skeleton ? (
                <section className="nb-answer-surface relative overflow-hidden rounded-[22px] p-5 opacity-50">
                  <SkeletonText lines={2} />
                </section>
              ) : null}

              <div className="grid gap-3 xl:grid-cols-2">
                {reportSections.slice(1).map((section) =>
                  section.skeleton ? (
                    <section key={section.id} className="nb-panel-inset p-4 opacity-50">
                      <div className="mb-2 text-sm font-semibold text-content-muted">{section.title}</div>
                      <SkeletonText lines={2} />
                    </section>
                  ) : (
                    <section
                      key={section.id}
                      className={`nb-panel-inset p-4 ${section.status === "building" ? "nb-loading-sheen" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-content">{section.title}</h3>
                        <span className="text-[11px] uppercase tracking-[0.18em] text-content-muted">{section.status}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-content-muted">{section.body}</p>
                      {section.sourceRefIds && section.sourceRefIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {section.sourceRefIds
                            .map((id) => sources.find((s) => s.id === id))
                            .filter(Boolean)
                            .slice(0, 3)
                            .map((source, idx) => (
                              <a
                                key={source!.id || idx}
                                href={source!.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-content-muted transition hover:bg-white/[0.08] hover:text-content"
                              >
                                <span className="font-mono text-[#d97757]">[{idx + 1}]</span>
                                <span className="max-w-[120px] truncate">{source!.label || source!.domain || "Source"}</span>
                              </a>
                            ))}
                        </div>
                      )}
                      {streaming.isStreaming && section.status === "building" && streaming.sourcePreview.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5 animate-in fade-in">
                          {streaming.sourcePreview.slice(0, 3).map((sp, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-[#d97757]/10 px-2 py-0.5 text-[10px] text-[#d97757]">
                              <span className="h-1 w-1 animate-pulse rounded-full bg-[#d97757]" />
                              {sp.tool || "Searching..."}
                            </span>
                          ))}
                        </div>
                      )}
                    </section>
                  ),
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {followUps.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setInput(item === "Go deeper" ? `Go deeper on ${startedQueryRef.current || "this report"}.` : item)}
                  className="nb-secondary-button px-3 py-1.5 text-xs"
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="sticky bottom-0 z-10 border-t border-white/6 bg-[var(--bg-primary)] pt-3 pb-2">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="nb-input-shell flex min-w-0 flex-1 items-center gap-3 rounded-[18px] px-4 py-3">
                  <Search className="h-4 w-4 shrink-0 text-content-muted" />
                  <input
                    id="chat-query"
                    name="chatQuery"
                    aria-label="Continue the live session"
                    type="text"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Continue the live session..."
                    className="w-full bg-transparent text-base text-content placeholder:text-content-muted/55 focus:outline-none"
                    disabled={streaming.isStreaming}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() || streaming.isStreaming}
                  className="nb-primary-button min-h-14 md:min-w-[140px]"
                >
                  {streaming.isStreaming ? "Running" : "Send"}
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
                {LENSES.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setLens(option.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                      lens === option.id
                        ? "nb-chip nb-chip-active"
                        : "nb-chip"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={async () => {
                  if (!savedReportId || !api?.domains.product.chat.pinReport) {
                    navigate(buildCockpitPath({ surfaceId: "packets" }));
                    return;
                  }
                  await convex.mutation(api.domains.product.chat.pinReport, {
                    anonymousSessionId,
                    reportId: savedReportId as any,
                    pinned: true,
                  });
                  setReportPinned(true);
                }}
                className="nb-secondary-button px-4 py-2 text-sm"
              >
                {reportPinned ? "Saved report" : "Save report"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (savedEntitySlug) {
                    navigate(`/entity/${encodeURIComponent(savedEntitySlug)}`);
                    return;
                  }
                  navigate(
                    buildCockpitPath({
                      surfaceId: "packets",
                      entity: savedEntitySlug,
                      extra: savedReportId ? { report: savedReportId } : undefined,
                    }),
                  );
                }}
                className="nb-secondary-button px-4 py-2 text-sm"
              >
                Open full report
              </button>
              <button
                type="button"
                onClick={() => {
                  const url = savedEntitySlug
                    ? new URL(`${window.location.origin}/entity/${encodeURIComponent(savedEntitySlug)}`)
                    : new URL(window.location.href);
                  if (!savedEntitySlug && startedQueryRef.current) url.searchParams.set("q", startedQueryRef.current);
                  if (!savedEntitySlug) url.searchParams.set("lens", lens);
                  void navigator.clipboard.writeText(url.toString());
                  trackEvent("chat_share_link", {
                    hasReport: savedReportId ? 1 : 0,
                    hasSources: sources.length,
                  });
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="nb-secondary-button flex items-center justify-center gap-2 px-4 py-2 text-sm"
              >
                <Link2 className="h-4 w-4" />
                {copiedLink ? "Copied!" : "Share link"}
              </button>
            </div>
          </article>
        </main>

        <aside className="order-3 space-y-8 xl:order-none xl:sticky xl:top-24 xl:self-start">
          <article className="px-5 py-6">
            <div className="nb-section-kicker">Sources</div>
            <div className="mt-4 space-y-2 xl:max-h-[380px] xl:overflow-y-auto xl:pr-1">
              {sources.length > 0 ? (
                sources.map((source) => (
                  <a
                    key={source.id}
                    href={source.href}
                    target="_blank"
                    rel="noreferrer"
                    className="nb-panel-inset nb-hover-lift flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-content">{source.label}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-content-muted">
                        {source.domain || source.type || "Source"}
                      </div>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-content-muted" />
                  </a>
                ))
              ) : hasRun ? (
                <div className="nb-empty-blueprint rounded-2xl px-4 py-5">
                  <div className="text-sm font-medium text-content">Sources land here as evidence arrives</div>
                  <p className="mt-2 text-sm leading-6 text-content-muted">
                    Expect company sites, uploaded files, screenshots, and saved reports to show up here without switching tabs.
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-content-muted">
                  Start a run and the cited sources will collect here while the answer builds in the center.
                </p>
              )}
            </div>
          </article>

          {hasRun ? (
          <article className="px-5 py-6">
            <div className="flex items-center justify-between gap-3">
              <div className="nb-section-kicker">Work stream</div>
              <button
                type="button"
                onClick={() => setTraceExpanded((current) => !current)}
                className="nb-secondary-button px-3 py-1.5 text-[11px]"
                data-density="compact"
                aria-expanded={traceExpanded}
              >
                {traceExpanded ? "Less detail" : "More detail"}
                {traceExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="mt-4 space-y-3 xl:max-h-[420px] xl:overflow-y-auto xl:pr-1">
              {streaming.stages.length > 0 ? (
                streaming.stages.map((stage, index) => (
                  <div key={`${stage.tool}-${stage.step}-${index}`} className="nb-panel-inset p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`nb-status-dot ${stage.status === "done" ? "bg-emerald-400" : stage.status === "running" ? "bg-[#d97757]" : "bg-red-400"}`} />
                          <div className="text-sm font-medium text-content">{formatToolLabel(stage.tool)}</div>
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-content-muted">
                          Step {stage.step}{stage.totalPlanned ? ` of ${stage.totalPlanned}` : ""}
                        </div>
                      </div>
                      <div className={`nb-status-badge ${stage.status === "done" ? "nb-status-badge-success" : stage.status === "running" ? "nb-status-badge-accent" : ""}`}>{stage.status}</div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-content-muted">
                      {stage.preview || stage.reason || "Waiting for the next useful signal."}
                    </p>
                    {traceExpanded ? (
                      <div className="mt-3 grid gap-2 text-[11px] text-content-muted">
                        <div className="flex items-center justify-between gap-3">
                          <span>Provider</span>
                          <span className="font-medium text-content">{stage.provider || "local"}</span>
                        </div>
                        {stage.model ? (
                          <div className="flex items-center justify-between gap-3">
                            <span>Model</span>
                            <span className="font-medium text-content">{stage.model}</span>
                          </div>
                        ) : null}
                        {stage.reason ? (
                          <div className="nb-panel-soft rounded-2xl px-3 py-2">
                            <span className="text-[10px] uppercase tracking-[0.18em] text-content-muted">Why this step ran</span>
                            <div className="mt-1 text-sm leading-6 text-content-muted">{stage.reason}</div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="nb-empty-blueprint rounded-2xl px-4 py-5">
                  <div className="text-sm font-medium text-content">This rail shows how the answer is being built</div>
                  <p className="mt-2 text-sm leading-6 text-content-muted">
                    Source gathering, reading, and packaging land here live so you can judge trust without leaving Chat.
                  </p>
                </div>
              )}
            </div>
          </article>
          ) : null}
        </aside>
      </section>
    </div>
  );
});

export default ChatHome;
