import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { useStreamingSearch } from "@/hooks/useStreamingSearch";
import { useConvexApi } from "@/lib/convexApi";
import type { LensId } from "@/features/controlPlane/components/searchTypes";

export type ProductDraftFileInput = {
  evidenceId?: string;
  name: string;
  type: string;
  size?: number;
};

export type ProductConversationSessionSummary = {
  _id: string;
  _creationTime: number;
  title: string;
  query: string;
  status: "queued" | "streaming" | "complete" | "error";
  latestSummary?: string | null;
  lastMessage: string;
  lastMessageAt: number;
  reportId?: string | null;
  entitySlug?: string | null;
  pinned?: boolean;
  updatedAt: number;
  createdAt: number;
};

export type ProductConversationMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  label: string;
  content: string;
  createdAt: number;
  status: "complete" | "error";
  reportId?: string | null;
};

export type ProductConversationReportSection = {
  id: string;
  title: string;
  body: string;
  status?: "pending" | "building" | "complete";
  sourceRefIds?: string[];
};

export type ProductConversationSource = {
  id?: string;
  label?: string;
  href?: string;
  domain?: string;
  [key: string]: unknown;
};

export type ProductConversationReport = {
  _id: string;
  entitySlug?: string | null;
  pinned?: boolean;
  summary?: string | null;
  title?: string;
  sections?: ProductConversationReportSection[];
  sources?: ProductConversationSource[];
  routing?: unknown;
  status?: string;
};

type UseConversationEngineOptions = {
  anonymousSessionId: string;
  entitySlugHint?: string | null;
  contextHint?: string | null;
  contextLabel?: string | null;
  includeSessionList?: boolean;
  sessionListLimit?: number;
  activeSessionId?: string | null;
  onActiveSessionChange?: (sessionId: string | null) => void;
};

type BeginRunArgs = {
  query: string;
  lens: LensId;
  files?: ProductDraftFileInput[];
};

export function useConversationEngine(options: UseConversationEngineOptions) {
  const {
    anonymousSessionId,
    entitySlugHint,
    contextHint,
    contextLabel,
    includeSessionList = false,
    sessionListLimit = 20,
    activeSessionId: controlledActiveSessionId,
    onActiveSessionChange,
  } = options;
  const api = useConvexApi();
  const convex = useConvex();
  const streaming = useStreamingSearch();
  const [internalActiveSessionId, setInternalActiveSessionId] = useState<string | null>(
    controlledActiveSessionId ?? null,
  );
  const [startedQuery, setStartedQuery] = useState<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [savedEntitySlug, setSavedEntitySlug] = useState<string | null>(null);
  const [reportPinned, setReportPinned] = useState(false);
  const [persistenceMessage, setPersistenceMessage] = useState<string | null>(null);
  const routingRef = useRef<typeof streaming.routing>(null);

  const activeSessionId =
    controlledActiveSessionId !== undefined ? controlledActiveSessionId : internalActiveSessionId;

  const setActiveSessionId = useCallback(
    (sessionId: string | null) => {
      if (controlledActiveSessionId === undefined) {
        setInternalActiveSessionId(sessionId);
      }
      onActiveSessionChange?.(sessionId);
    },
    [controlledActiveSessionId, onActiveSessionChange],
  );

  useEffect(() => {
    routingRef.current = streaming.routing;
  }, [streaming.routing]);

  const sessionResult = useQuery(
    api?.domains?.product?.chat?.getSession ?? ("skip" as never),
    api?.domains?.product?.chat?.getSession && activeSessionId
      ? { anonymousSessionId, sessionId: activeSessionId as never }
      : "skip",
  ) as
    | {
        session: {
          query: string;
          status: string;
          latestSummary?: string | null;
          autoSavedReportId?: string | null;
          routing?: unknown;
        };
        events: unknown[];
        toolEvents: unknown[];
        sourceEvents: unknown[];
        draft: unknown;
        report: ProductConversationReport | null;
      }
    | undefined
    | null;

  const sessionMessages = useQuery(
    api?.domains?.product?.chat?.getSessionMessages ?? ("skip" as never),
    api?.domains?.product?.chat?.getSessionMessages && activeSessionId
      ? { anonymousSessionId, sessionId: activeSessionId as never }
      : "skip",
  ) as ProductConversationMessage[] | undefined;

  const sessionList = useQuery(
    api?.domains?.product?.chat?.listSessions ?? ("skip" as never),
    api?.domains?.product?.chat?.listSessions && includeSessionList
      ? { anonymousSessionId, limit: sessionListLimit }
      : "skip",
  ) as ProductConversationSessionSummary[] | undefined;

  useEffect(() => {
    if (!sessionResult?.session) return;
    setStartedQuery(sessionResult.session.query);
    if (sessionResult.report?._id) {
      setSavedReportId(String(sessionResult.report._id));
      setSavedEntitySlug(sessionResult.report.entitySlug ?? null);
      setReportPinned(Boolean(sessionResult.report.pinned));
    }
  }, [sessionResult?.report?._id, sessionResult?.report?.entitySlug, sessionResult?.report?.pinned, sessionResult?.session]);

  const clearSession = useCallback(() => {
    streaming.stopStream();
    setActiveSessionId(null);
    setStartedQuery(null);
    setSavedReportId(null);
    setSavedEntitySlug(null);
    setReportPinned(false);
    setPersistenceMessage(null);
  }, [setActiveSessionId, streaming]);

  const selectSession = useCallback(
    (sessionId: string | null) => {
      streaming.stopStream();
      setActiveSessionId(sessionId);
      setStartedQuery(null);
      setSavedReportId(null);
      setSavedEntitySlug(null);
      setReportPinned(false);
      setPersistenceMessage(null);
    },
    [setActiveSessionId, streaming],
  );

  const beginRun = useCallback(
    async ({ query, lens, files = [] }: BeginRunArgs) => {
      const trimmed = query.trim();
      if (!trimmed || !api?.domains?.product?.chat?.startSession) return null;

      setStartedQuery(trimmed);
      setSavedReportId(null);
      setSavedEntitySlug(null);
      setReportPinned(false);
      setPersistenceMessage(null);

      let sessionId: string | null = null;
      try {
        const result = await convex.mutation(api.domains.product.chat.startSession, {
          anonymousSessionId,
          query: trimmed,
          lens,
          files,
          contextHint: contextHint?.trim() || undefined,
          contextLabel: contextLabel?.trim() || undefined,
        });
        sessionId = String((result as { sessionId?: unknown })?.sessionId ?? "");
        setActiveSessionId(sessionId || null);
      } catch (error) {
        setPersistenceMessage(error instanceof Error ? error.message : "Could not start canonical session.");
        return null;
      }

      streaming.startStream(
        trimmed,
        lens,
        {
          onToolStart: (payload) => {
            if (!sessionId || !api?.domains?.product?.chat?.recordToolStart) return;
            void convex.mutation(api.domains.product.chat.recordToolStart, {
              anonymousSessionId,
              sessionId: sessionId as never,
              tool: payload.tool,
              provider: payload.provider,
              model: payload.model,
              step: payload.step,
              totalPlanned: payload.totalPlanned,
              reason: payload.reason,
            });
          },
          onToolDone: (payload) => {
            if (!sessionId || !api?.domains?.product?.chat?.recordToolDone) return;
            void convex.mutation(api.domains.product.chat.recordToolDone, {
              anonymousSessionId,
              sessionId: sessionId as never,
              tool: payload.tool,
              step: payload.step,
              durationMs: payload.durationMs,
              tokensIn: payload.tokensIn,
              tokensOut: payload.tokensOut,
              preview: payload.preview,
            });
          },
          onComplete: (payload) => {
            if (!sessionId || !api?.domains?.product?.chat?.completeSession) return;
            void convex
              .mutation(api.domains.product.chat.completeSession, {
                anonymousSessionId,
                sessionId: sessionId as never,
                packet: payload.packet ?? payload,
                entitySlugHint: entitySlugHint?.trim() || undefined,
                routing: routingRef.current ?? undefined,
                totalDurationMs: payload.totalDurationMs,
              })
              .then((result: unknown) => {
                const record = (result ?? {}) as { reportId?: unknown; entitySlug?: unknown };
                setSavedReportId(typeof record.reportId === "string" ? record.reportId : record.reportId ? String(record.reportId) : null);
                setSavedEntitySlug(typeof record.entitySlug === "string" ? record.entitySlug : null);
                setPersistenceMessage("Report saved automatically.");
              })
              .catch((error: unknown) => {
                setPersistenceMessage(error instanceof Error ? error.message : "Could not save report.");
              });
          },
          onError: (message) => {
            setPersistenceMessage(message);
            if (!sessionId || !api?.domains?.product?.chat?.completeSession) return;
            void convex.mutation(api.domains.product.chat.completeSession, {
              anonymousSessionId,
              sessionId: sessionId as never,
              packet: { answer: "", sourceRefs: [] },
              entitySlugHint: entitySlugHint?.trim() || undefined,
              routing: routingRef.current ?? undefined,
              error: message,
            });
          },
        },
        { contextHint: contextHint?.trim() || undefined },
      );

      return sessionId;
    },
    [anonymousSessionId, api, contextHint, contextLabel, convex, entitySlugHint, setActiveSessionId, streaming],
  );

  const currentReportId = useMemo(() => {
    if (savedReportId) return savedReportId;
    if (sessionResult?.report?._id) return String(sessionResult.report._id);
    return null;
  }, [savedReportId, sessionResult?.report?._id]);

  const currentEntitySlug = useMemo(() => {
    if (savedEntitySlug) return savedEntitySlug;
    return sessionResult?.report?.entitySlug ?? null;
  }, [savedEntitySlug, sessionResult?.report?.entitySlug]);

  const currentSummary = useMemo(() => {
    return (
      sessionResult?.session?.latestSummary ??
      sessionResult?.report?.summary ??
      sessionList?.find((session) => session._id === activeSessionId)?.latestSummary ??
      null
    );
  }, [activeSessionId, sessionList, sessionResult?.report?.summary, sessionResult?.session?.latestSummary]);

  const pinReport = useCallback(
    async (pinned = true) => {
      if (!currentReportId || !api?.domains?.product?.chat?.pinReport) {
        return false;
      }
      try {
        await convex.mutation(api.domains.product.chat.pinReport, {
          anonymousSessionId,
          reportId: currentReportId as never,
          pinned,
        });
        setReportPinned(pinned);
        setPersistenceMessage(pinned ? "Report pinned to your workspace." : "Report unpinned.");
        return true;
      } catch (error) {
        setPersistenceMessage(error instanceof Error ? error.message : "Could not update pinned state.");
        return false;
      }
    },
    [anonymousSessionId, api, convex, currentReportId],
  );

  return {
    activeSessionId,
    setActiveSessionId: selectSession,
    clearSession,
    beginRun,
    sessions: sessionList ?? [],
    session: sessionResult?.session ?? null,
    sessionMessages: sessionMessages ?? [],
    sessionResult: sessionResult ?? null,
    startedQuery,
    savedReportId: currentReportId,
    savedEntitySlug: currentEntitySlug,
    currentSummary,
    reportPinned: reportPinned || Boolean(sessionResult?.report?.pinned),
    persistenceMessage,
    setPersistenceMessage,
    pinReport,
    streaming,
  };
}

export default useConversationEngine;
