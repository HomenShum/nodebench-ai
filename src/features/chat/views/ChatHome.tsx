/**
 * ChatHome — The live agent page.
 *
 * Shows: active query, streaming progress, stage pills, live tool calls,
 * live sources/URLs, evidence cards, partial report build.
 *
 * This is the heart of the product per the ultraplan.
 */

import { memo, useState, useCallback } from "react";
import { Search, ArrowUp } from "lucide-react";
import { LiveSearchTelemetry } from "@/features/controlPlane/components/LiveSearchTelemetry";
import { ResultWorkspace } from "@/features/controlPlane/components/ResultWorkspace";
import { useStreamingSearch } from "@/hooks/useStreamingSearch";

export const ChatHome = memo(function ChatHome() {
  const [input, setInput] = useState("");
  const [lens, setLens] = useState("founder");
  const streaming = useStreamingSearch();

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    streaming.startStream(trimmed, lens);
  }, [input, lens, streaming]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const LENSES = ["founder", "investor", "banker", "ceo", "legal", "student"];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-content">Chat</h1>
        <p className="text-xs text-content-muted">Watch the agent research in real-time. Ask anything.</p>
      </div>

      {/* Input bar */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
        <div className="flex items-center gap-2">
          <Search className="ml-3 h-4 w-4 shrink-0 text-content-muted" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — company, founder, market, thesis..."
            className="flex-1 bg-transparent py-3 text-sm text-content placeholder:text-content-muted/50 focus:outline-none"
            disabled={streaming.isStreaming}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!input.trim() || streaming.isStreaming}
            className="mr-1 rounded-lg bg-[#d97757] p-2 text-white transition hover:bg-[#c4684a] disabled:opacity-40"
          >
            {streaming.isStreaming ? (
              <span className="block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Lens pills */}
        <div className="flex gap-1 border-t border-white/[0.06] px-3 py-2">
          {LENSES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLens(l)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                lens === l
                  ? "bg-white/[0.08] text-content"
                  : "text-content-muted hover:text-content-secondary"
              }`}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Live telemetry stream */}
      {streaming.stages.length > 0 && (
        <div className="mt-6">
          <LiveSearchTelemetry
            stages={streaming.stages}
            query={input}
            lens={lens}
            isStreaming={streaming.isStreaming}
            error={streaming.error}
          />
        </div>
      )}

      {/* Result packet when complete */}
      {streaming.result && !streaming.isStreaming && (
        <div className="mt-6">
          <ResultWorkspace
            packet={streaming.result as any}
            lens={lens as any}
          />
        </div>
      )}

      {/* Empty state */}
      {!streaming.isStreaming && streaming.stages.length === 0 && !streaming.result && (
        <div className="mt-16 text-center">
          <div className="text-sm text-content-muted/60">
            Type a question above and watch the agent work.
          </div>
          <div className="mt-2 text-xs text-content-muted/40">
            The agent will search, analyze, and build a report in real-time.
          </div>
        </div>
      )}
    </div>
  );
});

export default ChatHome;
