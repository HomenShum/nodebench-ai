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
import { runSearchPipeline, stateToResultPacket } from "../pipeline/searchPipeline.js";
import { evaluateTask } from "../../packages/mcp-local/src/sync/hyperloopEval.js";
import { runPromotionCycle } from "../../packages/mcp-local/src/sync/hyperloopArchive.js";

export function createPipelineRouter(): Router {
  const router = Router();

  router.post("/search", async (req: Request, res: Response) => {
    const startMs = Date.now();
    const query = String(req.body?.query ?? "").trim();
    const lens = String(req.body?.lens ?? "founder");

    if (!query) {
      return res.status(400).json({ error: true, message: "Query is required" });
    }

    try {
      // Run the 4-node pipeline: classify → search → analyze → package
      const state = await runSearchPipeline(query, lens);

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

      // Return flat shape matching legacy /api/search so frontend parsers work unchanged
      return res.json({
        success: true,
        pipeline: "v2",
        durationMs: Date.now() - startMs,
        latencyMs: state.totalDurationMs,
        classification: state.classification,
        ...(packet as Record<string, unknown>),
      });
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
