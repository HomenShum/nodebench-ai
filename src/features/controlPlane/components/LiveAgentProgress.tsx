import React, { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, Globe, Database, Cpu, Search, Zap, Loader2 } from "lucide-react";
import { type TraceStep } from "./SearchTrace";
import { buildLiveProgressModel } from "./proofModel";
import type { LensId } from "./searchTypes";

interface LiveAgentProgressProps {
  query: string;
  lens: LensId;
  trace?: TraceStep[];
}

function mapBackendStep(t: TraceStep, query: string): { id: string; label: string; icon: React.ElementType } {
  if (t.step === "classify_query") return { id: t.step, label: `Parsing intent for "${query.slice(0, 30)}..."`, icon: Cpu };
  if (t.step === "build_context_bundle") return { id: t.step, label: "Gathering local workspace context", icon: Database };
  if (t.step === "tool_call" && t.tool === "web_search") return { id: t.step, label: "Dispatching multi-agent web search", icon: Globe };
  if (t.step === "tool_call" && t.tool?.includes("founder")) return { id: t.step, label: "Executing founder synthesis tool", icon: Zap };
  if (t.step === "tool_call" && t.tool === "run_recon") return { id: t.step, label: "Running company reconnaissance", icon: Search };
  if (t.step === "llm_extract") return { id: t.step, label: "Extracting entity intelligence & signals", icon: Search };
  if (t.step === "assemble_response") return { id: t.step, label: "Synthesizing final packet", icon: Zap };
  
  return { id: t.step + (t.tool ?? ""), label: `Running ${t.tool || t.step}`, icon: Cpu };
}

export function LiveAgentProgress({ query, lens, trace = [] }: LiveAgentProgressProps) {
  const [elapsed, setElapsed] = useState(0);
  const progressModel = buildLiveProgressModel({ query, lens, trace });

  // Timer for total elapsed seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Map live trace into UI steps
  const displaySteps = trace.length > 0 
    ? trace.map(t => ({ ...t, ui: mapBackendStep(t, query) }))
    : [{ ui: { id: "init", label: "Connecting to agent network...", icon: Loader2 }, isRunning: true, durationMs: 0, detail: undefined as string | undefined }];

  return (
    <div className="mt-8 flex flex-col items-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl border border-ui-edge bg-ui-surface p-6 shadow-sm ring-1 ring-[#d97757]/10 transition-all duration-500">
        
        {/* Header */}
        <div className="mb-6 flex items-center justify-between border-b border-ui-edge pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d97757]/10 text-[#d97757]">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-content-base">Agent Network Active</h3>
              <p className="text-xs text-content-muted">Processing query through {lens} lens</p>
            </div>
          </div>
          <div className="font-mono text-xs text-content-muted">
            {elapsed.toFixed(1)}s
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-ui-edge bg-ui-surface-secondary/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-content-muted">
                Exploration Memory
              </div>
              <div className="mt-1 text-xs text-content-muted">
                {progressModel.personaId} route · {progressModel.graphSummary.nodeCount} nodes · {progressModel.graphSummary.edgeCount} edges
              </div>
            </div>
            <div className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-content-muted">
              {progressModel.proofStatus}
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3 xl:grid-cols-4">
            {progressModel.stages.map((stage) => {
              const tone =
                stage.status === "completed"
                  ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                  : stage.status === "running"
                    ? "border-[#d97757]/25 bg-[#d97757]/10 text-[#f2b49f]"
                    : stage.status === "error"
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-300"
                      : "border-white/[0.06] bg-white/[0.02] text-content-muted";
              return (
                <div key={stage.id} className={`rounded-lg border px-3 py-3 transition-colors ${tone}`}>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em]">{stage.label}</div>
                  <div className="mt-2 text-sm font-medium">{stage.countLabel}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-content-muted">
            {progressModel.graphSummary.primaryPath.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Steps List */}
        <div className="flex flex-col gap-4">
          {displaySteps.map((step, index) => {
            const isCompleted = !step.isRunning && step.status !== "error";
            const isActive = Boolean(step.isRunning);
            const isErrored = step.status === "error";
            
            return (
              <div 
                key={step.traceId ?? step.ui.id + index}
                className={`flex items-start gap-3 transition-opacity duration-300 opacity-100`}
              >
                <div className="mt-0.5 flex shrink-0 items-center justify-center">
                  {isErrored ? (
                    <CircleDashed className="h-4 w-4 text-rose-500" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : isActive ? (
                    <CircleDashed className="h-4 w-4 animate-[spin_3s_linear_infinite] text-[#d97757]" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-ui-edge" />
                  )}
                </div>
                
                <div className="flex flex-col">
                  <span className={`text-sm ${isActive ? "font-medium text-content-base" : isErrored ? "text-rose-400" : "text-content-muted"}`}>
                    {step.ui.label}
                  </span>
                  
                  {/* Subtle active state details */}
                  {isActive && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#d97757]" />
                      <span className="text-xs text-content-muted">Running node computation...</span>
                    </div>
                  )}
                  {isCompleted && step.detail && (
                    <span className="mt-1 text-xs text-content-muted/70">{step.detail}</span>
                  )}
                  {isErrored && step.detail && (
                    <span className="mt-1 text-xs text-rose-400/80">{step.detail}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
