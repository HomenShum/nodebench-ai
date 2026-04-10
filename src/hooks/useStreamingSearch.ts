/**
 * useStreamingSearch — EventSource hook for live streaming search results.
 *
 * Connects to /api/search/stream via SSE. Each tool invocation emits
 * tool_start + tool_done events with full telemetry. The frontend renders
 * each as a live card in the mission-control telemetry feed.
 */

import { useState, useCallback, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────

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
  preview?: Record<string, unknown>;
  startedAt: number;
}

export interface StreamingSearchState {
  stages: ToolStage[];
  plan: Array<{ tool: string; provider: string; model?: string; reason: string }> | null;
  result: Record<string, unknown> | null;
  isStreaming: boolean;
  error: string | null;
  totalDurationMs: number;
}

// ── Hook ──────────────────────────────────────────────────────────────

export function useStreamingSearch(): StreamingSearchState & {
  startStream: (query: string, lens: string) => void;
  stopStream: () => void;
} {
  const [stages, setStages] = useState<ToolStage[]>([]);
  const [plan, setPlan] = useState<StreamingSearchState["plan"]>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startStream = useCallback((query: string, lens: string) => {
    // Reset state
    setStages([]);
    setPlan(null);
    setResult(null);
    setError(null);
    setIsStreaming(true);
    setTotalDurationMs(0);
    stopStream();

    const url = `/api/search/stream?query=${encodeURIComponent(query)}&lens=${encodeURIComponent(lens)}`;
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.addEventListener("tool_start", (e) => {
      const data = JSON.parse(e.data);
      const stage: ToolStage = {
        tool: data.tool,
        provider: data.provider,
        model: data.model,
        step: data.step,
        totalPlanned: data.totalPlanned,
        reason: data.reason,
        status: "running",
        startedAt: Date.now(),
      };
      setStages((prev) => [...prev, stage]);
    });

    es.addEventListener("tool_done", (e) => {
      const data = JSON.parse(e.data);
      setStages((prev) =>
        prev.map((s) =>
          s.tool === data.tool && s.step === data.step
            ? {
                ...s,
                status: "done" as const,
                durationMs: data.durationMs,
                tokensIn: data.tokensIn,
                tokensOut: data.tokensOut,
                preview: data.preview,
              }
            : s,
        ),
      );
    });

    es.addEventListener("plan", (e) => {
      const data = JSON.parse(e.data);
      setPlan(data.tools);
      // Update totalPlanned on all existing stages
      setStages((prev) =>
        prev.map((s) => ({ ...s, totalPlanned: data.totalTools })),
      );
    });

    es.addEventListener("complete", (e) => {
      const data = JSON.parse(e.data);
      setResult(data.packet ?? data);
      setTotalDurationMs(data.totalDurationMs ?? 0);
      setIsStreaming(false);
      es.close();
      eventSourceRef.current = null;
    });

    es.addEventListener("error", (e) => {
      // SSE error event — could be connection or server error
      if (e instanceof MessageEvent) {
        try {
          const data = JSON.parse(e.data);
          setError(data.message ?? "Search failed");
        } catch {
          setError("Connection lost");
        }
      } else {
        // Connection error — EventSource will auto-reconnect, but we stop
        setError("Connection to search server failed. Is the server running?");
      }
      setIsStreaming(false);
      es.close();
      eventSourceRef.current = null;
    });

    // Timeout safety
    const timeout = setTimeout(() => {
      if (eventSourceRef.current === es) {
        es.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
        setError("Search timed out after 60 seconds");
      }
    }, 60000);

    // Cleanup timeout when complete fires
    es.addEventListener("complete", () => clearTimeout(timeout));
  }, [stopStream]);

  return { stages, plan, result, isStreaming, error, totalDurationMs, startStream, stopStream };
}
