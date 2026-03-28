import React, { useMemo } from "react";
import { CheckCircle2, CircleDot, Loader2, Timer, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { summarizeStreamingPhases } from "./streamingPhases";

interface StreamingStatusProps {
  parts: Array<Record<string, unknown>>;
  messageText?: string;
  isStreaming: boolean;
  tokensPerSecond?: number;
  runtimeSeconds?: number;
}

function PhaseDot({
  status,
}: {
  status: "complete" | "active" | "pending";
}) {
  if (status === "complete") {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  }
  if (status === "active") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />;
  }
  return <CircleDot className="h-3.5 w-3.5 text-slate-400" />;
}

export function StreamingStatus({
  parts,
  messageText,
  isStreaming,
  tokensPerSecond,
  runtimeSeconds,
}: StreamingStatusProps) {
  const summary = useMemo(
    () =>
      summarizeStreamingPhases({
        parts,
        messageText,
        isStreaming,
        tokensPerSecond,
        runtimeSeconds,
      }),
    [isStreaming, messageText, parts, runtimeSeconds, tokensPerSecond]
  );

  if (!summary) return null;

  return (
    <div className="mb-3 rounded-xl border border-edge bg-surface-secondary/60 px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-content">
        <Timer className="h-4 w-4 text-violet-500" />
        <span>{summary.headline}</span>
        {summary.totalToolSteps > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-content-secondary">
            <Wrench className="h-3 w-3" />
            {summary.totalToolSteps}
          </span>
        )}
      </div>
      {summary.detail && (
        <p className="mt-1 text-xs text-content-muted">{summary.detail}</p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {summary.phases.map((phase) => (
          <div
            key={phase.id}
            className={cn(
              "rounded-lg border px-2.5 py-2 text-xs transition-colors",
              phase.status === "active" && "border-violet-300 bg-violet-50/70 text-violet-900 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-100",
              phase.status === "complete" && "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100",
              phase.status === "pending" && "border-edge bg-surface text-content-secondary"
            )}
          >
            <div className="flex items-center gap-2">
              <PhaseDot status={phase.status} />
              <span className="font-medium">{phase.label}</span>
            </div>
            <div className="mt-1 text-[11px] text-content-muted">{phase.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
