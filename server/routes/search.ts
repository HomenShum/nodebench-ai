/**
 * search.ts — Search API route for the NodeBench AI App.
 *
 * POST /search
 *   Body: { query: string, lens?: string, daysBack?: number }
 *   Returns: ResultPacket-compatible JSON
 *
 * Routes queries to the appropriate MCP tool:
 *   - "weekly reset" / "founder reset" → founder_local_weekly_reset
 *   - "important change" → founder_local_synthesize (important_change)
 *   - "pre-delegation" → founder_local_synthesize (pre_delegation)
 *   - Company name detected → run_recon + local synthesis
 *   - Fallback → founder_local_gather context dump
 *
 * This is the bridge between the browser search canvas and the MCP tool layer.
 */

import { Router } from "express";
import type { McpTool } from "../../packages/mcp-local/src/types.js";
import { buildContextBundle } from "../../packages/mcp-local/src/tools/contextInjection.js";

export function createSearchRouter(tools: McpTool[]) {
  const router = Router();

  // Find a tool by name from the loaded tool set
  function findTool(name: string): McpTool | undefined {
    return tools.find((t) => t.name === name);
  }

  // Execute a tool and return its result
  async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = findTool(name);
    if (!tool) return { error: true, message: `Tool not found: ${name}` };
    try {
      return await tool.handler(args);
    } catch (err: any) {
      return { error: true, message: err?.message ?? String(err) };
    }
  }

  // Classify query intent
  function classifyQuery(query: string): {
    type: "weekly_reset" | "pre_delegation" | "important_change" | "company_search" | "competitor" | "general";
    entity?: string;
    lens: string;
  } {
    const lq = query.toLowerCase();

    if (lq.includes("weekly reset") || lq.includes("founder reset") || lq.includes("founder weekly")) {
      return { type: "weekly_reset", lens: "founder" };
    }
    if (lq.includes("pre-delegation") || lq.includes("delegation packet") || lq.includes("agent-ready")) {
      return { type: "pre_delegation", lens: "founder" };
    }
    if (lq.includes("important change") || lq.includes("what changed") || lq.includes("since my last")) {
      return { type: "important_change", lens: "founder" };
    }
    if (lq.includes("competitor") || lq.includes("supermemory") || lq.includes("versus") || lq.includes("vs ")) {
      const entityMatch = query.match(/(?:competitor|analyze|compare)\s+(\w+)/i);
      return { type: "competitor", entity: entityMatch?.[1] ?? undefined, lens: "researcher" };
    }

    // Company search — detect entity names
    const companyPatterns = [
      /(?:analyze|search|tell me about|company|profile|diligence)\s+(.+?)(?:\s+for|\s+from|$)/i,
      /^(.+?)\s+(?:competitive position|strategy|valuation|revenue|risk)/i,
    ];
    for (const pattern of companyPatterns) {
      const match = query.match(pattern);
      if (match?.[1]) {
        const entity = match[1].trim().replace(/['"]/g, "");
        if (entity.length > 1 && entity.length < 50) {
          return { type: "company_search", entity, lens: "investor" };
        }
      }
    }

    return { type: "general", lens: "founder" };
  }

  // ── POST /search ──────────────────────────────────────────────────
  router.post("/", async (req, res) => {
    const startMs = Date.now();
    const { query, lens, daysBack } = req.body as {
      query?: string;
      lens?: string;
      daysBack?: number;
    };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return res.status(400).json({ error: true, message: "Query is required" });
    }

    const classification = classifyQuery(query.trim());
    const resolvedLens = lens ?? classification.lens;

    // Fix P2 #10: Compute context bundle BEFORE tool dispatch so tools can use it
    const contextBundle = buildContextBundle(query.trim());

    try {
      let result: any;

      switch (classification.type) {
        case "weekly_reset": {
          result = await callTool("founder_local_weekly_reset", { daysBack: daysBack ?? 7 });
          break;
        }

        case "pre_delegation":
        case "important_change": {
          result = await callTool("founder_local_synthesize", {
            packetType: classification.type,
            daysBack: daysBack ?? 7,
          });
          break;
        }

        case "company_search":
        case "competitor": {
          // First try run_recon for a research plan
          const reconResult = await callTool("run_recon", {
            target: classification.entity ?? query.trim(),
            focus: query.trim(),
          });

          // Also gather local context
          const localCtx = await callTool("founder_local_gather", { daysBack: daysBack ?? 7 });

          result = {
            packetType: "company_search",
            query: query.trim(),
            entityName: classification.entity ?? "Unknown",
            lens: resolvedLens,
            recon: reconResult,
            localContext: localCtx,
            // The frontend will need to assemble these into a ResultPacket
            // or display the recon plan + local context directly
            note: "Research plan generated. Use the recon session to execute each source, then synthesize into a packet.",
          };
          break;
        }

        default: {
          // General query — gather local context and return it
          const gather = await callTool("founder_local_gather", { daysBack: daysBack ?? 7 });
          result = {
            packetType: "general",
            query: query.trim(),
            lens: resolvedLens,
            localContext: gather,
            note: "General query. Local context gathered. For deeper analysis, use the FastAgent panel.",
          };
        }
      }

      // Track the search as an action
      await callTool("track_action", {
        action: `Search: ${query.trim().slice(0, 80)}`,
        category: "research",
        impact: "moderate",
      }).catch(() => {}); // Non-fatal

      const latencyMs = Date.now() - startMs;

      // Use the pre-computed contextBundle (computed before dispatch)
      return res.json({
        success: true,
        classification: classification.type,
        lens: resolvedLens,
        entity: classification.entity ?? null,
        latencyMs,
        result,
        context: {
          pinned: {
            mission: contextBundle.pinned.canonicalMission,
            wedge: contextBundle.pinned.wedge,
            confidence: contextBundle.pinned.identityConfidence,
            contradictions: contextBundle.pinned.activeContradictions.length,
            sessionActions: contextBundle.pinned.sessionActionCount,
            lastPacket: contextBundle.pinned.lastPacketSummary,
          },
          injected: {
            weeklyReset: contextBundle.injected.weeklyResetSummary,
            milestones: contextBundle.injected.recentMilestones.length,
            dogfood: contextBundle.injected.dogfoodVerdict,
          },
          archival: {
            totalActions: contextBundle.archival.totalActions,
            totalMilestones: contextBundle.archival.totalMilestones,
          },
          tokenBudget: contextBundle.totalEstimatedTokens,
        },
      });
    } catch (err: any) {
      return res.status(500).json({
        error: true,
        message: err?.message ?? "Search failed",
        classification: classification.type,
      });
    }
  });

  // ── GET /search/health ────────────────────────────────────────────
  router.get("/health", (_req, res) => {
    const availableTools = [
      "founder_local_weekly_reset",
      "founder_local_synthesize",
      "founder_local_gather",
      "run_recon",
      "track_action",
    ];
    const found = availableTools.filter((name) => findTool(name));
    res.json({
      status: "ok",
      toolsAvailable: found.length,
      toolsExpected: availableTools.length,
      tools: found,
    });
  });

  return router;
}
