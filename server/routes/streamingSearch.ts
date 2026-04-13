/**
 * Streaming Search — SSE endpoint that emits real-time progress events
 * as each pipeline stage (classify → search → analyze → package) executes.
 *
 * GET /stream?query=...&lens=...
 *
 * Uses the onProgress callback in runSearchPipeline so SSE events are
 * emitted between actual pipeline stages — not retrospectively.
 */

import { Router, type Request, type Response } from "express";
import {
  runSearchPipeline,
  stateToResultPacket,
  type PipelineProgressEvent,
} from "../pipeline/searchPipeline.js";
import { createEnvelopeFromPipelineState } from "../lib/workflowEnvelope.js";
import { trajectoryFromPipelineState, saveSearchTrajectory } from "../lib/trajectoryStore.js";
import { detectReplayCandidate } from "../lib/replayDetector.js";
import { saveReport, createNudge } from "../lib/canonicalModels.js";

// ── SSE helpers ──────────────────────────────────────────────────────

function emitSSE(
  res: Response,
  event: string,
  data: Record<string, unknown>,
): void {
  if (res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

const STAGE_META: Record<string, { tool: string; provider: string; model?: string; reason: string }> = {
  classify: { tool: "classify", provider: "local", reason: "Classify query and detect entity" },
  search:   { tool: "web_search", provider: "linkup", reason: "Search the web for sources" },
  analyze:  { tool: "entity_extract", provider: "google", model: "gemini-3.1-flash-lite", reason: "Extract structured intelligence from sources" },
  package:  { tool: "package", provider: "local", reason: "Build evidence spans, classify signals, run valuation" },
};

function stagePreview(event: PipelineProgressEvent): Record<string, unknown> {
  const s = event.state;
  switch (event.stage) {
    case "classify":
      return { entity: s.entity, classification: s.classification };
    case "search":
      return {
        sourceCount: s.searchSources.length,
        exploredCount: s.searchExploredSourceCount,
        topSource: s.searchSources[0]?.name,
        topSources: s.searchSources.slice(0, 4).map((source, index) => ({
          id: `preview-source-${index}`,
          label: source.name,
          href: source.url,
          domain: source.domain,
        })),
        answerSnippet:
          s.searchSources.length > 0
            ? `The first source sweep is in. ${s.searchSources.length} sources are ready for the report build.`
            : undefined,
      };
    case "analyze":
      return {
        entityName: s.entityName,
        confidence: s.confidence,
        signalCount: s.signals.length,
        riskCount: s.risks.length,
        keyMetrics: s.keyMetrics.slice(0, 3),
      };
    case "package":
      return {
        classifiedSignals: s.classifiedSignals.length,
        evidenceSpans: s.evidence.totalSpans,
        verifiedCount: s.evidence.verifiedCount,
        contradictedCount: s.evidence.contradictedCount,
        hasDCF: !!s.dcf,
      };
    default:
      return {};
  }
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
    if (query.length > 2000) {
      res.status(400).json({ error: "query too long (max 2000 chars)" });
      return;
    }

    // SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const startMs = Date.now();
    const TOTAL_STAGES = 4; // classify, search, analyze, package
    let stepCounter = 0;

    try {
      // ── Replay check (instant, before pipeline) ────────────────
      const entityGuess = query.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/)?.[1] ?? "";
      const replayCandidate = entityGuess ? detectReplayCandidate(entityGuess, lens, query) : null;

      if (replayCandidate) {
        emitSSE(res, "tool_start", { tool: "replay_check", provider: "local", step: 0, totalPlanned: TOTAL_STAGES, reason: "Check for replayable trajectory" });
        emitSSE(res, "tool_done", {
          tool: "replay_check", provider: "local", step: 0, durationMs: 5,
          preview: { verdict: replayCandidate.verdict, reason: replayCandidate.reason, replayCount: replayCandidate.replayCount },
        });
      }

      // ── Emit plan event ────────────────────────────────────────
      emitSSE(res, "plan", {
        totalTools: TOTAL_STAGES,
        tools: ["classify", "search", "analyze", "package"].map((stage) => STAGE_META[stage]),
      });

      // ── Run pipeline with real-time progress callback ──────────
      const onProgress = (event: PipelineProgressEvent): void => {
        if (res.writableEnded) return;
        const meta = STAGE_META[event.stage] ?? { tool: event.stage, provider: "local", reason: event.stage };

        if (event.phase === "start") {
          stepCounter++;
          emitSSE(res, "tool_start", {
            tool: meta.tool,
            provider: meta.provider,
            model: meta.model,
            step: stepCounter,
            totalPlanned: TOTAL_STAGES,
            reason: meta.reason,
          });
        } else {
          // done
          emitSSE(res, "tool_done", {
            tool: meta.tool,
            provider: meta.provider,
            model: meta.model,
            step: stepCounter,
            durationMs: event.durationMs,
            preview: stagePreview(event),
          });
        }
      };

      const state = await runSearchPipeline(query, lens, onProgress);

      // ── Assemble result packet ─────────────────────────────────
      const packet = stateToResultPacket(state);
      const packetId = `pkt-${(state.entityName || "unknown").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;
      const envelope = createEnvelopeFromPipelineState(state, packetId);

      // Save trajectory (best-effort)
      try {
        const trajectory = trajectoryFromPipelineState(state, envelope.transport.envelopeId);
        saveSearchTrajectory(trajectory);
      } catch { /* best-effort */ }

      // Auto-save report to canonical backend (best-effort)
      try {
        const reportId = saveReport({
          title: state.entityName || query,
          entityName: state.entityName || undefined,
          type: state.classification || "company",
          summary: (state.answer ?? "").slice(0, 500),
          confidence: state.confidence ?? 0,
          lens,
          query,
          packetJson: JSON.stringify(packet).slice(0, 50000),
          envelopeId: envelope.transport.envelopeId,
          sourceCount: state.searchSources?.length ?? 0,
          contradictionCount: state.risks?.length ?? 0,
          pinned: false,
          status: "saved",
        });

        // Create nudge if confidence is low or contradictions are high
        if ((state.confidence ?? 0) < 50 || (state.risks?.length ?? 0) > 5) {
          createNudge({
            type: "follow_up_due",
            title: `${state.entityName || query} needs deeper review`,
            summary: `Confidence ${state.confidence}%, ${state.risks?.length ?? 0} contradictions detected. Consider follow-up research.`,
            priority: (state.confidence ?? 0) < 30 ? "high" : "normal",
            status: "active",
            linkedReportId: reportId,
            actionLabel: "Open in Chat",
            actionTarget: `/chat?q=${encodeURIComponent(query)}`,
          });
        }
      } catch { /* auto-save is best-effort */ }

      // ── Emit complete ──────────────────────────────────────────
      emitSSE(res, "complete", {
        totalDurationMs: Date.now() - startMs,
        toolsUsed: stepCounter,
        envelope: {
          envelopeId: envelope.transport.envelopeId,
          envelopeType: envelope.transport.envelopeType,
        },
        replayCandidate: replayCandidate ? { verdict: replayCandidate.verdict } : null,
        packet,
      });

    } catch (err) {
      emitSSE(res, "error", { message: (err as Error).message ?? "Search failed", step: stepCounter });
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  return router;
}
