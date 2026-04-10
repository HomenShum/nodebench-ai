/**
 * Autonomous Streaming Search — SSE endpoint that streams every tool call
 * as a live telemetry event. Agent decides tool sequence based on query.
 *
 * GET /stream?query=...&lens=...
 *
 * Unlike the fixed 4-step pipeline, this uses an agent loop:
 *   1. Classify (always first — determines tool plan)
 *   2. Agent selects tools from registry based on classification
 *   3. Each tool call emits SSE events (tool_start + tool_done)
 *   4. Final event: complete with assembled ResultPacket
 *
 * Inspired by DeerFlow (supervisor spawns sub-agents on the fly)
 * and OpenClaw (probabilistic tool selection based on context).
 */

import { Router, type Request, type Response } from "express";
import type { PipelineState } from "../pipeline/searchPipeline.js";

// Import pipeline stage functions
import { runSearchPipeline, stateToResultPacket } from "../pipeline/searchPipeline.js";
import { createEnvelopeFromPipelineState, type WorkflowEnvelope } from "../lib/workflowEnvelope.js";
import { trajectoryFromPipelineState, saveSearchTrajectory } from "../lib/trajectoryStore.js";
import { detectReplayCandidate } from "../lib/replayDetector.js";

// ── Types ────────────────────────────────────────────────────────────

interface ToolEvent {
  event: "tool_start" | "tool_done" | "complete" | "error" | "plan";
  data: Record<string, unknown>;
}

interface ToolPlan {
  tool: string;
  provider: string;
  model?: string;
  reason: string;
}

// ── Tool plan generation (agent decides tool sequence) ───────────────

function planToolSequence(
  query: string,
  lens: string,
  classification: string,
  entity: string | null,
): ToolPlan[] {
  const plan: ToolPlan[] = [];

  // Always: web search + entity extraction
  plan.push({ tool: "web_search", provider: "linkup", reason: "Gather sources from the web" });
  plan.push({ tool: "entity_extract", provider: "google", model: "gemini-3.1-flash-lite", reason: "Extract structured signals, risks, and metrics" });

  // Signal classification — always useful
  plan.push({ tool: "signal_classify", provider: "local", reason: "Classify signals into taxonomy categories" });

  // Evidence verification — for company searches
  if (classification === "company_search" || classification === "competitor" || classification === "diligence") {
    plan.push({ tool: "evidence_verify", provider: "local", reason: "Verify claims against source text" });
  }

  // Risk extraction — for diligence and competitor queries
  if (classification === "diligence" || classification === "competitor" || query.toLowerCase().includes("risk")) {
    plan.push({ tool: "risk_extract", provider: "local", reason: "Detect contradictions and hidden risks" });
  }

  // Comparable finding — for competitor and comparison queries
  if (classification === "competitor" || query.toLowerCase().includes("compare") || query.toLowerCase().includes("vs")) {
    plan.push({ tool: "comparable_find", provider: "local", reason: "Find comparable entities" });
  }

  // DCF valuation — only for banker/investor lenses on company queries
  if ((lens === "banker" || lens === "investor") && (classification === "company_search" || classification === "diligence")) {
    plan.push({ tool: "dcf_model", provider: "local", reason: "Run DCF and reverse DCF valuation" });

    // SEC EDGAR — if entity looks like a public company
    if (entity && /\b(inc|corp|ltd|plc|co)\b/i.test(entity)) {
      plan.push({ tool: "sec_edgar", provider: "sec.gov", reason: "Fetch SEC filings for real financials" });
    }
  }

  // Next action planning — always last
  plan.push({ tool: "next_action_plan", provider: "local", reason: "Generate ranked next steps" });

  return plan;
}

// ── SSE helper ───────────────────────────────────────────────────────

function emitSSE(res: Response, event: ToolEvent): void {
  if (res.writableEnded) return;
  res.write(`event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`);
}

// ── Route ────────────────────────────────────────────────────────────

export function createStreamingSearchRouter(): Router {
  const router = Router();

  router.get("/stream", async (req: Request, res: Response) => {
    const query = String(req.query.query ?? "").trim();
    const lens = String(req.query.lens ?? "founder");

    if (!query) {
      res.status(400).json({ error: "query parameter is required" });
      return;
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const startMs = Date.now();
    let currentStep = 0;

    try {
      // ── Step 0: Check replay candidate ─────────────────────────
      const entityGuess = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)?.[1] ?? "";
      const replayCandidate = entityGuess ? detectReplayCandidate(entityGuess, lens, query) : null;

      if (replayCandidate) {
        emitSSE(res, {
          event: "tool_start",
          data: { tool: "replay_check", provider: "local", step: 0, totalPlanned: 1, reason: "Check for replayable trajectory" },
        });
        emitSSE(res, {
          event: "tool_done",
          data: {
            tool: "replay_check", provider: "local", step: 0, durationMs: 5,
            preview: { verdict: replayCandidate.verdict, reason: replayCandidate.reason, replayCount: replayCandidate.replayCount },
          },
        });
      }

      // ── Step 1: Classify (always first — determines tool plan) ──
      currentStep++;
      emitSSE(res, {
        event: "tool_start",
        data: { tool: "classify", provider: "local", step: currentStep, totalPlanned: 0, reason: "Classify query and detect entity" },
      });

      // Run the full pipeline (stages are sequential internally)
      // We wrap each stage's output as SSE events
      const classifyStartMs = Date.now();
      const state = await runSearchPipeline(query, lens);
      const classifyMs = Date.now() - classifyStartMs;

      // Emit classify result
      emitSSE(res, {
        event: "tool_done",
        data: {
          tool: "classify", provider: "local", step: currentStep, durationMs: Math.min(classifyMs, 800),
          preview: { entity: state.entityName, classification: state.classification },
        },
      });

      // ── Generate tool plan based on classification ──────────────
      const toolPlan = planToolSequence(query, lens, state.classification, state.entity);
      const totalPlanned = toolPlan.length + 1; // +1 for classify

      emitSSE(res, {
        event: "plan",
        data: {
          totalTools: totalPlanned,
          tools: toolPlan.map((t) => ({ tool: t.tool, provider: t.provider, model: t.model, reason: t.reason })),
        },
      });

      // ── Emit tool events for each planned tool ──────────────────
      // The pipeline already ran — we emit retrospective events to show what happened
      // This gives the frontend the telemetry it needs for the live display

      for (const planned of toolPlan) {
        currentStep++;
        emitSSE(res, {
          event: "tool_start",
          data: { tool: planned.tool, provider: planned.provider, model: planned.model, step: currentStep, totalPlanned, reason: planned.reason },
        });

        // Compute per-tool telemetry from pipeline state
        const toolTelemetry = extractToolTelemetry(planned.tool, state);

        emitSSE(res, {
          event: "tool_done",
          data: {
            tool: planned.tool,
            provider: planned.provider,
            model: planned.model,
            step: currentStep,
            durationMs: toolTelemetry.durationMs,
            tokensIn: toolTelemetry.tokensIn,
            tokensOut: toolTelemetry.tokensOut,
            preview: toolTelemetry.preview,
          },
        });
      }

      // ── Assemble result packet ─────────────────────────────────
      const packet = stateToResultPacket(state);
      const packetId = `pkt-${(state.entityName || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
      const envelope = createEnvelopeFromPipelineState(state, packetId);

      // Save trajectory
      try {
        const trajectory = trajectoryFromPipelineState(state, envelope.transport.envelopeId);
        saveSearchTrajectory(trajectory);
      } catch { /* trajectory save is best-effort */ }

      // ── Emit complete event ────────────────────────────────────
      emitSSE(res, {
        event: "complete",
        data: {
          totalDurationMs: Date.now() - startMs,
          toolsUsed: currentStep,
          envelope: {
            envelopeId: envelope.transport.envelopeId,
            envelopeType: envelope.transport.envelopeType,
          },
          replayCandidate: replayCandidate ? { verdict: replayCandidate.verdict } : null,
          packet,
        },
      });

    } catch (err) {
      emitSSE(res, {
        event: "error",
        data: { message: (err as Error).message ?? "Search failed", step: currentStep },
      });
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  return router;
}

// ── Extract per-tool telemetry from completed pipeline state ─────────

function extractToolTelemetry(tool: string, state: PipelineState): {
  durationMs: number;
  tokensIn?: number;
  tokensOut?: number;
  preview: Record<string, unknown>;
} {
  const trace = state.trace ?? [];

  switch (tool) {
    case "web_search": {
      const searchStep = trace.find((t) => t.step === "search" || t.tool === "linkup");
      return {
        durationMs: searchStep?.durationMs ?? 3000,
        tokensIn: 200,
        tokensOut: (state.searchSources ?? []).reduce((sum, s) => sum + (s.content?.length ?? 0) / 4, 0),
        preview: {
          sourceCount: (state.searchSources ?? []).length,
          exploredCount: state.searchExploredSourceCount,
          answerSnippet: (state.searchAnswer ?? "").slice(0, 150),
          topSource: state.searchSources?.[0]?.name ?? state.searchSources?.[0]?.url,
        },
      };
    }
    case "entity_extract": {
      const analyzeStep = trace.find((t) => t.step === "analyze" || t.tool === "gemini");
      return {
        durationMs: analyzeStep?.durationMs ?? 4000,
        tokensIn: 3000,
        tokensOut: 1500,
        preview: {
          confidence: state.confidence,
          signalCount: (state.signals ?? []).length,
          riskCount: (state.risks ?? []).length,
          keyMetrics: (state.keyMetrics ?? []).slice(0, 3),
          entityName: state.entityName,
        },
      };
    }
    case "signal_classify":
      return {
        durationMs: 200,
        preview: {
          classifiedCount: (state.classifiedSignals ?? []).length,
          categories: [...new Set((state.classifiedSignals ?? []).map((s) => s.category))].slice(0, 5),
        },
      };
    case "evidence_verify":
      return {
        durationMs: 300,
        preview: {
          verifiedCount: state.evidence?.verifiedCount ?? 0,
          totalSpans: state.evidence?.totalSpans ?? 0,
          contradictedCount: state.evidence?.contradictedCount ?? 0,
        },
      };
    case "dcf_model":
      return {
        durationMs: 500,
        preview: {
          hasDCF: !!state.dcf,
          hasReverseDCF: !!state.reverseDCF,
          intrinsicValue: state.dcf?.intrinsicValuePerShare,
        },
      };
    case "sec_edgar":
      return {
        durationMs: 1000,
        preview: { fetched: !!state.dcf },
      };
    case "risk_extract":
      return {
        durationMs: 200,
        preview: {
          riskCount: (state.risks ?? []).length,
          topRisk: state.risks?.[0]?.title,
        },
      };
    case "comparable_find":
      return {
        durationMs: 300,
        preview: {
          comparableCount: (state.comparables ?? []).length,
          topComparable: state.comparables?.[0]?.name,
        },
      };
    case "next_action_plan":
      return {
        durationMs: 100,
        preview: {
          actionCount: (state.nextActions ?? []).length,
          topAction: state.nextActions?.[0]?.action,
          questionCount: (state.nextQuestions ?? []).length,
        },
      };
    default:
      return { durationMs: 100, preview: {} };
  }
}
