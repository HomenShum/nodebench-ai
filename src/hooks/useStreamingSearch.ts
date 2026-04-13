/**
 * useStreamingSearch - EventSource hook for live streaming search results.
 *
 * Connects to /api/search/stream via SSE. Each tool invocation emits
 * tool_start + tool_done events with full telemetry.
 */

import { useCallback, useRef, useState } from "react";
import { PUBLIC_SEARCH_STREAM_API_ENDPOINT } from "../lib/searchApi";

export interface ToolStage {
  tool: string;
  provider: string;
  model?: string;
  step: number;
  totalPlanned: number;
  reason?: string;
  status: "running" | "done" | "error";
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  preview?: string;
  startedAt: number;
}

export interface StreamingSourcePreview {
  id: string;
  label: string;
  href?: string;
  domain?: string;
}

export interface StreamingMilestones {
  startedAt: number | null;
  firstStageAt: number | null;
  firstSourceAt: number | null;
  firstPartialAnswerAt: number | null;
  completedAt: number | null;
}

export interface StreamingSearchState {
  stages: ToolStage[];
  plan: Array<{ tool: string; provider: string; model?: string; reason: string }> | null;
  result: Record<string, unknown> | null;
  isStreaming: boolean;
  error: string | null;
  totalDurationMs: number;
  sourcePreview: StreamingSourcePreview[];
  liveAnswerPreview: string | null;
  milestones: StreamingMilestones;
}

export interface StreamingToolStartPayload {
  tool: string;
  provider: string;
  model?: string;
  step: number;
  totalPlanned: number;
  reason?: string;
}

export interface StreamingToolDonePayload {
  tool: string;
  step: number;
  durationMs?: number;
  tokensIn?: number;
  tokensOut?: number;
  preview?: unknown;
}

export interface StreamingCompletePayload {
  packet?: Record<string, unknown>;
  totalDurationMs?: number;
  [key: string]: unknown;
}

interface StreamingCallbacks {
  onToolStart?: (payload: StreamingToolStartPayload) => void;
  onToolDone?: (payload: StreamingToolDonePayload) => void;
  onComplete?: (payload: StreamingCompletePayload) => void;
  onError?: (message: string) => void;
}

function formatList(items: Array<string | null | undefined>) {
  return items.filter(Boolean).join(" ");
}

function humanizeValue(value: string) {
  return value.replaceAll("_", " ");
}

function formatPreview(preview: unknown) {
  if (typeof preview === "string") return preview.trim() || undefined;
  if (!preview || typeof preview !== "object") return undefined;

  const record = preview as Record<string, unknown>;

  if (typeof record.entity === "string" || typeof record.classification === "string") {
      return formatList([
        typeof record.entity === "string" && record.entity.trim() ? `${record.entity.trim()} detected.` : null,
        typeof record.classification === "string" && record.classification.trim()
          ? `Request looks like ${humanizeValue(record.classification.trim())}.`
          : null,
      ]);
  }

  if (
    typeof record.sourceCount === "number" ||
    typeof record.topSource === "string" ||
    typeof record.answerSnippet === "string"
  ) {
    return formatList([
      typeof record.sourceCount === "number" ? `${record.sourceCount} sources gathered.` : null,
      typeof record.topSource === "string" && record.topSource.trim() ? `Top source: ${record.topSource.trim()}.` : null,
    ]);
  }

  if (
    typeof record.entityName === "string" ||
    typeof record.signalCount === "number" ||
    typeof record.riskCount === "number"
  ) {
    return formatList([
      typeof record.entityName === "string" && record.entityName.trim() ? `${record.entityName.trim()} analyzed.` : null,
      typeof record.signalCount === "number" ? `${record.signalCount} useful signals found.` : null,
      typeof record.riskCount === "number" ? `${record.riskCount} risk areas flagged.` : null,
    ]);
  }

  if (
    typeof record.classifiedSignals === "number" ||
    typeof record.verifiedCount === "number" ||
    typeof record.contradictedCount === "number"
  ) {
    return formatList([
      typeof record.classifiedSignals === "number" ? `${record.classifiedSignals} report signals packaged.` : null,
      typeof record.verifiedCount === "number" ? `${record.verifiedCount} verified evidence spans.` : null,
      typeof record.contradictedCount === "number" && record.contradictedCount > 0
        ? `${record.contradictedCount} contradictions need review.`
        : null,
    ]);
  }

  if (typeof record.verdict === "string" || typeof record.replayCount === "number") {
    return formatList([
      typeof record.verdict === "string" ? `Replay check: ${record.verdict}.` : null,
      typeof record.replayCount === "number" ? `${record.replayCount} similar runs found.` : null,
      typeof record.reason === "string" && record.reason.trim() ? record.reason.trim() : null,
    ]);
  }

  return undefined;
}

function parseSourcePreview(preview: unknown): StreamingSourcePreview[] {
  if (!preview || typeof preview !== "object") return [];

  const previewRecord = preview as { topSources?: unknown[]; topSource?: unknown };
  const topSources = Array.isArray(previewRecord.topSources) ? previewRecord.topSources : [];
  const normalized = topSources
    .map((candidate, index) => {
      if (!candidate || typeof candidate !== "object") return null;
      const item = candidate as { id?: unknown; label?: unknown; href?: unknown; domain?: unknown };
      const label = typeof item.label === "string" ? item.label.trim() : "";
      if (!label) return null;
      return {
        id: typeof item.id === "string" && item.id ? item.id : `preview-source-${index}`,
        label,
        href: typeof item.href === "string" ? item.href : undefined,
        domain: typeof item.domain === "string" ? item.domain : undefined,
      } satisfies StreamingSourcePreview;
    })
    .filter((item): item is StreamingSourcePreview => Boolean(item));

  if (normalized.length > 0) return normalized;

  const topSource = typeof previewRecord.topSource === "string" ? previewRecord.topSource.trim() : "";
  if (!topSource) return [];
  return [{ id: "preview-source-top", label: topSource }];
}

function parseAnswerPreview(preview: unknown): string | null {
  if (!preview || typeof preview !== "object") return null;
  const answerPreview = (preview as { answerPreview?: unknown }).answerPreview;
  return typeof answerPreview === "string" && answerPreview.trim() ? answerPreview.trim() : null;
}

function parsePacketSourcePreview(packet: Record<string, unknown> | null | undefined): StreamingSourcePreview[] {
  const refs = Array.isArray(packet?.sourceRefs) ? packet.sourceRefs : [];
  return refs
    .map((source, index) => {
      if (!source || typeof source !== "object") return null;
      const ref = source as { id?: unknown; label?: unknown; href?: unknown; domain?: unknown };
      const label = typeof ref.label === "string" ? ref.label.trim() : "";
      if (!label) return null;
      return {
        id: typeof ref.id === "string" && ref.id ? ref.id : `packet-source-${index}`,
        label,
        href: typeof ref.href === "string" ? ref.href : undefined,
        domain: typeof ref.domain === "string" ? ref.domain : undefined,
      } satisfies StreamingSourcePreview;
    })
    .filter((item): item is StreamingSourcePreview => Boolean(item));
}

export function useStreamingSearch(): StreamingSearchState & {
  startStream: (query: string, lens: string, callbacks?: StreamingCallbacks) => void;
  stopStream: () => void;
} {
  const [stages, setStages] = useState<ToolStage[]>([]);
  const [plan, setPlan] = useState<StreamingSearchState["plan"]>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [sourcePreview, setSourcePreview] = useState<StreamingSourcePreview[]>([]);
  const [liveAnswerPreview, setLiveAnswerPreview] = useState<string | null>(null);
  const [milestones, setMilestones] = useState<StreamingMilestones>({
    startedAt: null,
    firstStageAt: null,
    firstSourceAt: null,
    firstPartialAnswerAt: null,
    completedAt: null,
  });
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    (query: string, lens: string, callbacks?: StreamingCallbacks) => {
      stopStream();
      setStages([]);
      setPlan(null);
      setResult(null);
      setError(null);
      setIsStreaming(true);
      setTotalDurationMs(0);
      setSourcePreview([]);
      setLiveAnswerPreview(null);
      setMilestones({
        startedAt: Date.now(),
        firstStageAt: null,
        firstSourceAt: null,
        firstPartialAnswerAt: null,
        completedAt: null,
      });

      const url = `${PUBLIC_SEARCH_STREAM_API_ENDPOINT}?query=${encodeURIComponent(query)}&lens=${encodeURIComponent(lens)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("tool_start", (event) => {
        const data = JSON.parse(event.data) as StreamingToolStartPayload;
        const now = Date.now();
        setStages((prev) => [
          ...prev,
          {
            tool: data.tool,
            provider: data.provider,
            model: data.model,
            step: data.step,
            totalPlanned: data.totalPlanned,
            reason: data.reason,
            status: "running",
            startedAt: now,
          },
        ]);
        setMilestones((prev) => ({
          ...prev,
          firstStageAt: prev.firstStageAt ?? now,
        }));
        callbacks?.onToolStart?.(data);
      });

      es.addEventListener("tool_done", (event) => {
        const data = JSON.parse(event.data) as StreamingToolDonePayload;
        const now = Date.now();
        const previewSources = parseSourcePreview(data.preview);
        const answerPreview = parseAnswerPreview(data.preview);
        setStages((prev) =>
          prev.map((stage) =>
            stage.tool === data.tool && stage.step === data.step
              ? {
                  ...stage,
                  status: "done",
                  durationMs: data.durationMs,
                  tokensIn: data.tokensIn,
                  tokensOut: data.tokensOut,
                  preview: formatPreview(data.preview),
                }
              : stage,
          ),
        );
        if (previewSources.length > 0) {
          setSourcePreview((prev) => (prev.length > 0 ? prev : previewSources));
          setMilestones((prev) => ({
            ...prev,
            firstSourceAt: prev.firstSourceAt ?? now,
          }));
        }
        if (answerPreview) {
          setLiveAnswerPreview((prev) => prev ?? answerPreview);
          setMilestones((prev) => ({
            ...prev,
            firstPartialAnswerAt: prev.firstPartialAnswerAt ?? now,
          }));
        }
        callbacks?.onToolDone?.(data);
      });

      es.addEventListener("plan", (event) => {
        const data = JSON.parse(event.data) as {
          tools: Array<{ tool: string; provider: string; model?: string; reason: string }>;
          totalTools: number;
        };
        setPlan(data.tools);
        setStages((prev) => prev.map((stage) => ({ ...stage, totalPlanned: data.totalTools })));
      });

      es.addEventListener("complete", (event) => {
        const data = JSON.parse(event.data) as StreamingCompletePayload;
        const packet = (data.packet ?? data) as Record<string, unknown>;
        const now = Date.now();
        const packetSources = parsePacketSourcePreview(packet);
        const packetAnswer = typeof packet.answer === "string" ? packet.answer.trim() : "";

        setResult(packet);
        setTotalDurationMs(data.totalDurationMs ?? 0);
        setIsStreaming(false);
        if (packetSources.length > 0) {
          setSourcePreview((prev) => (prev.length > 0 ? prev : packetSources));
        }
        if (packetAnswer) {
          setLiveAnswerPreview((prev) => prev ?? packetAnswer);
        }
        setMilestones((prev) => ({
          ...prev,
          firstSourceAt: prev.firstSourceAt ?? (packetSources.length > 0 ? now : null),
          firstPartialAnswerAt: prev.firstPartialAnswerAt ?? (packetAnswer ? now : null),
          completedAt: now,
        }));
        callbacks?.onComplete?.(data);
        es.close();
        eventSourceRef.current = null;
      });

      es.addEventListener("error", (event) => {
        let message = "Connection to search server failed. Is the server running?";
        if (event instanceof MessageEvent) {
          try {
            const data = JSON.parse(event.data) as { message?: string };
            message = data.message ?? "Search failed";
          } catch {
            message = "Connection lost";
          }
        }

        setError(message);
        setIsStreaming(false);
        callbacks?.onError?.(message);
        es.close();
        eventSourceRef.current = null;
      });

      const timeout = setTimeout(() => {
        if (eventSourceRef.current === es) {
          const message = "Search timed out after 60 seconds";
          es.close();
          eventSourceRef.current = null;
          setIsStreaming(false);
          setError(message);
          callbacks?.onError?.(message);
        }
      }, 60000);

      es.addEventListener("complete", () => clearTimeout(timeout));
    },
    [stopStream],
  );

  return {
    stages,
    plan,
    result,
    isStreaming,
    error,
    totalDurationMs,
    sourcePreview,
    liveAnswerPreview,
    milestones,
    startStream,
    stopStream,
  };
}
