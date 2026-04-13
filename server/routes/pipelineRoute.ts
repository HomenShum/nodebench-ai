/**
 * pipelineRoute.ts — Clean search pipeline route (April 2026 industry standard).
 *
 * POST /api/pipeline/search
 *   Body: { query: string, lens?: string }
 *   Returns: ResultPacket-compatible JSON
 *
 * Uses: Linkup (search) → Gemini (analyze) → taxonomy + evidence (package)
 * ~100 lines vs 3500 in the legacy search route.
 */

import { Router, type Request, type Response } from "express";
import { runSearchPipelineWithEnvelope, stateToResultPacket } from "../pipeline/searchPipeline.js";
import { evaluateTask } from "../../packages/mcp-local/src/sync/hyperloopEval.js";
import { runPromotionCycle } from "../../packages/mcp-local/src/sync/hyperloopArchive.js";
import { runPreSearchHooks, runPostSearchHooks } from "../pipeline/hooks.js";

// ── Attrition retention bridge ─────────────────────────────────
const ATTRITION_BACKEND = process.env.ATTRITION_URL || "https://attrition-7xtb75zi5q-uc.a.run.app";

/** Non-blocking push of pipeline results to attrition for capture + measurement */
function pushToAttrition(query: string, durationMs: number, packet: Record<string, unknown>, trace: unknown[]) {
  console.log(`[attrition] Pushing pipeline result: ${query.substring(0, 60)}... to ${ATTRITION_BACKEND}`);
  // Fire and forget — never block the response
  fetch(`${ATTRITION_BACKEND}/api/retention/push-packet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "delta.pipeline_run",
      subject: `Pipeline: ${query.substring(0, 80)}`,
      summary: `Score: ${packet.confidence ?? "N/A"}, Sources: ${packet.sourceCount ?? 0}, Duration: ${durationMs}ms`,
      data: {
        query,
        durationMs,
        confidence: packet.confidence,
        sourceCount: packet.sourceCount,
        entityName: packet.entityName,
        traceSteps: Array.isArray(trace) ? trace.length : 0,
        timestamp: new Date().toISOString(),
      },
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => { /* attrition unavailable — that's fine */ });

  // Also send as a webhook event for the event log
  fetch(`${ATTRITION_BACKEND}/api/retention/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "pipeline_complete",
      data: {
        query: query.substring(0, 200),
        durationMs,
        confidence: packet.confidence,
        sourceCount: packet.sourceCount,
        entityName: packet.entityName,
        traceSteps: Array.isArray(trace) ? trace.length : 0,
      },
    }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => { /* best-effort */ });
}

export function createPipelineRouter(): Router {
  const router = Router();

  router.post("/search", async (req: Request, res: Response) => {
    const startMs = Date.now();
    const query = String(req.body?.query ?? "").trim();
    const lens = String(req.body?.lens ?? "founder");

    if (!query) {
      return res.status(400).json({ error: true, message: "Query is required" });
    }

    // Pre-search hooks (block/modify)
    const preHooks = runPreSearchHooks(query, lens);
    if (!preHooks.allowed) {
      return res.status(422).json({
        error: true,
        message: preHooks.hookResults.find(h => h.decision === "deny")?.reason ?? "Query blocked by pre-search hook",
        hooks: preHooks.hookResults,
      });
    }

    try {
      // Run the 4-node pipeline with envelope + trajectory recording
      const result = await runSearchPipelineWithEnvelope(preHooks.query, preHooks.lens);
      const { state, envelope, trajectory, replayCandidate, wasReplay } = result;

      // Convert to ResultPacket format
      const packet = stateToResultPacket(state);

      // HyperLoop: evaluate and archive (best-effort)
      try {
        evaluateTask({
          episodeId: `pipeline_${Date.now()}`,
          query,
          lens,
          entity: state.entityName || null,
          classification: state.classification,
          totalSignals: state.classifiedSignals.length,
          verifiedSignals: state.evidence.verifiedCount,
          totalClaims: state.evidence.totalSpans,
          groundedClaims: state.evidence.verifiedCount + state.evidence.partialCount,
          contradictionsCaught: state.evidence.contradictedCount,
          userEditDistance: 1,
          wasExported: false,
          wasDelegated: false,
          latencyMs: state.totalDurationMs,
          costUsd: 0,
          toolCallCount: state.trace.length,
        });
        runPromotionCycle();
      } catch { /* HyperLoop is best-effort */ }

      // Post-search hooks (log, flag, auto-actions)
      const postHooks = runPostSearchHooks(state);

      // Return flat shape matching legacy /api/search so frontend parsers work unchanged
      // Plus envelope metadata for workflow-learning consumers
      // ── Push to attrition BEFORE returning (non-blocking fire-and-forget) ───
      const pipelineDuration = Date.now() - startMs;
      pushToAttrition(
        query,
        pipelineDuration,
        packet as Record<string, unknown>,
        state.trace ?? [],
      );

      const responsePayload = {
        success: true,
        hooks: { pre: preHooks.hookResults, post: postHooks.hookResults, actions: postHooks.allActions },
        pipeline: "v2-attrition-push",
        durationMs: pipelineDuration,
        latencyMs: state.totalDurationMs,
        classification: state.classification,
        envelope: {
          envelopeId: envelope.transport.envelopeId,
          envelopeType: envelope.transport.envelopeType,
          version: envelope.transport.version,
          trajectoryId: trajectory.trajectoryId,
          wasReplay,
          replayCandidate: replayCandidate ? {
            verdict: replayCandidate.verdict,
            reason: replayCandidate.reason,
            stalenessDays: replayCandidate.stalenessDays,
          } : null,
        },
        ...(packet as Record<string, unknown>),
      };

      // Push to attrition INLINE — no separate function, no caching issues
      try {
        const attritionUrl = process.env.ATTRITION_URL || "https://attrition-7xtb75zi5q-uc.a.run.app";
        console.log(`[attrition-push] Pushing to ${attritionUrl}...`);
        fetch(`${attritionUrl}/api/retention/push-packet`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "delta.pipeline_run",
            subject: `Pipeline: ${query.substring(0, 80)}`,
            summary: `Confidence: ${packet.confidence ?? "N/A"}, Sources: ${packet.sourceCount ?? 0}, Duration: ${pipelineDuration}ms`,
            data: {
              query,
              durationMs: pipelineDuration,
              confidence: packet.confidence,
              sourceCount: packet.sourceCount,
              entityName: packet.entityName,
              traceSteps: (state.trace ?? []).length,
              timestamp: new Date().toISOString(),
              // FULL TRACE DATA for proof
              answer: (packet.answer as string)?.substring(0, 500) ?? null,
              classification: packet.classification ?? null,
              trace: state.trace ?? [],
              sourceRefs: ((packet.sourceRefs as Array<{title?: string; url?: string}>) ?? []).slice(0, 10).map((s: {title?: string; url?: string}) => ({ title: s.title?.substring(0, 100), url: s.url?.substring(0, 200) })),
              nextActions: ((packet.nextActions as Array<unknown>) ?? []).slice(0, 5),
              answerBlockCount: Array.isArray(packet.answerBlocks) ? (packet.answerBlocks as unknown[]).length : 0,
              model: "gemini-3.1-flash-lite",
              tools: ["linkup", "gemini"],
            },
          }),
          signal: AbortSignal.timeout(5000),
        }).then(r => console.log(`[attrition-push] packet: ${r.status}`)).catch(e => console.log(`[attrition-push] error: ${e.message}`));

        fetch(`${attritionUrl}/api/retention/webhook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "pipeline_complete", data: {
            query: query.substring(0, 200),
            durationMs: pipelineDuration,
            confidence: packet.confidence,
            sourceCount: packet.sourceCount,
            entityName: packet.entityName,
            traceSteps: (state.trace ?? []).length,
            trace: state.trace ?? [],
            answer: (packet.answer as string)?.substring(0, 300) ?? null,
            sourceRefs: ((packet.sourceRefs as Array<{title?: string; url?: string}>) ?? []).slice(0, 5).map((s: {title?: string; url?: string}) => ({ title: s.title?.substring(0, 80), url: s.url })),
          } }),
          signal: AbortSignal.timeout(5000),
        }).then(r => console.log(`[attrition-push] webhook: ${r.status}`)).catch(e => console.log(`[attrition-push] webhook error: ${e.message}`));
      } catch (pushErr) {
        console.log(`[attrition-push] failed:`, pushErr);
      }

      return res.json(responsePayload);
    } catch (err: any) {
      if (!res.headersSent) {
        return res.status(500).json({
          error: true,
          message: err?.message ?? "Pipeline failed",
          pipeline: "v2",
        });
      }
    }
  });

  // Health check
  router.get("/health", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      pipeline: "v2",
      components: {
        linkup: !!process.env.LINKUP_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
        taxonomy: true,
        evidence: true,
        hyperloop: true,
      },
    });
  });

  return router;
}
