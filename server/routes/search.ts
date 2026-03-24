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

// Lazy-load judge to avoid circular deps and keep startup fast
let _judgeToolOutput: ((args: any) => Promise<any>) | null = null;
async function getJudge() {
  if (!_judgeToolOutput) {
    try {
      const { llmJudgeLoopTools } = await import("../../packages/mcp-local/src/tools/llmJudgeLoop.js");
      const tool = llmJudgeLoopTools.find(t => t.name === "judge_tool_output");
      if (tool) _judgeToolOutput = tool.handler;
    } catch { /* judge not available */ }
  }
  return _judgeToolOutput;
}

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
          const entityName = classification.entity ?? query.trim().split(/\s+/).slice(0, 3).join(" ");

          // Run recon + local context in parallel
          const [reconResult, localCtx] = await Promise.all([
            callTool("run_recon", {
              target: entityName,
              focus: query.trim(),
            }).catch(() => null),
            callTool("founder_local_gather", { daysBack: daysBack ?? 7 }).catch(() => null),
          ]);

          // Map to ResultPacket-compatible shape so the frontend can render it
          const recon = reconResult as any;
          const local = localCtx as any;

          // Extract structured data from recon result
          const sources = recon?.plan?.sources ?? recon?.sources ?? [];
          const findings = recon?.findings ?? [];
          const competitors = recon?.competitors ?? recon?.comparables ?? [];

          // Build canonicalEntity + memo structure the frontend expects
          result = {
            canonicalEntity: {
              name: entityName,
              canonicalMission: recon?.summary
                ?? recon?.overview
                ?? `Entity intelligence workspace for ${entityName}. ${findings.length > 0 ? findings[0]?.summary ?? "" : "Research plan generated — execute sources for deeper analysis."}`,
              identityConfidence: Math.min(95, 50 + sources.length * 5 + findings.length * 10),
            },
            memo: true, // Signals to frontend that this is a structured result
            whatChanged: findings.slice(0, 5).map((f: any) => ({
              description: typeof f === "string" ? f : f.summary ?? f.title ?? String(f),
              date: f.date ?? new Date().toISOString().slice(0, 10),
            })),
            signals: sources.slice(0, 5).map((s: any, i: number) => ({
              name: typeof s === "string" ? s : s.name ?? s.source ?? String(s),
              direction: "neutral",
              impact: i < 2 ? "high" : "medium",
            })),
            contradictions: (recon?.risks ?? recon?.contradictions ?? []).slice(0, 3).map((r: any) => ({
              claim: typeof r === "string" ? r : r.title ?? r.claim ?? String(r),
              evidence: typeof r === "string" ? "" : r.description ?? r.evidence ?? "",
            })),
            comparables: competitors.slice(0, 4).map((c: any) => ({
              name: typeof c === "string" ? c : c.name ?? String(c),
              relevance: "medium",
              note: typeof c === "string" ? "" : c.note ?? c.description ?? "",
            })),
            nextActions: (recon?.nextSteps ?? []).slice(0, 4).map((a: any) => ({
              action: typeof a === "string" ? a : a.action ?? a.step ?? String(a),
            })),
            nextQuestions: [
              `What are ${entityName}'s key competitive advantages?`,
              `How does ${entityName} compare to its closest competitors?`,
              `What are the main risks facing ${entityName}?`,
              `What changed for ${entityName} in the last quarter?`,
            ],
            localContext: local,
          };
          break;
        }

        default: {
          // General query — gather local context and map to ResultPacket shape
          const gather = await callTool("founder_local_gather", { daysBack: daysBack ?? 7 }) as any;
          const g = gather ?? {};
          result = {
            canonicalEntity: {
              name: g.company?.name ?? "Your Workspace",
              canonicalMission: g.company?.canonicalMission ?? g.summary ?? `Analysis for: ${query.trim()}`,
              identityConfidence: g.company?.identityConfidence ?? 50,
            },
            memo: true,
            whatChanged: (g.recentActions ?? g.changes ?? []).slice(0, 5).map((a: any) => ({
              description: typeof a === "string" ? a : a.description ?? a.action ?? String(a),
              date: a.date ?? a.timestamp,
            })),
            signals: (g.signals ?? g.milestones ?? []).slice(0, 5).map((s: any, i: number) => ({
              name: typeof s === "string" ? s : s.name ?? s.title ?? String(s),
              direction: s.direction ?? "neutral",
              impact: i < 2 ? "high" : "medium",
            })),
            contradictions: (g.contradictions ?? []).slice(0, 3).map((c: any) => ({
              claim: typeof c === "string" ? c : c.claim ?? c.title ?? String(c),
              evidence: typeof c === "string" ? "" : c.evidence ?? c.description ?? "",
            })),
            nextActions: (g.nextActions ?? g.pendingActions ?? []).slice(0, 4).map((a: any) => ({
              action: typeof a === "string" ? a : a.action ?? a.title ?? String(a),
            })),
            nextQuestions: [
              "Generate my founder weekly reset — what changed, main contradiction, next 3 moves",
              "What are the most important changes in the last 7 days?",
              "Build a pre-delegation packet for my agent",
            ],
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

      // Auto-judge every search result (non-blocking — runs async, result included if fast enough)
      let judgeVerdict: any = null;
      try {
        const judge = await getJudge();
        if (judge) {
          const toolName = classification.type === "weekly_reset" ? "founder_local_weekly_reset"
            : classification.type === "pre_delegation" || classification.type === "important_change" ? "founder_local_synthesize"
            : classification.type === "company_search" || classification.type === "competitor" ? "run_recon"
            : "founder_local_gather";

          const verdict = await judge({
            scenarioId: `app_${classification.type}`,
            prompt: query.trim(),
            toolName,
            result,
          });
          judgeVerdict = {
            verdict: verdict.verdict,
            score: verdict.score,
            failingCriteria: verdict.criteria?.filter((c: any) => !c.pass).map((c: any) => c.criterion) ?? [],
            fixSuggestions: verdict.fixSuggestions ?? [],
          };
        }
      } catch { /* judge failure is non-fatal */ }

      // Use the pre-computed contextBundle (computed before dispatch)
      return res.json({
        success: true,
        classification: classification.type,
        lens: resolvedLens,
        entity: classification.entity ?? null,
        latencyMs,
        result,
        judge: judgeVerdict,
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

  // ── POST /search/upload — Ingest uploaded file content ────────────
  router.post("/upload", async (req, res) => {
    const { content, fileName, fileType } = req.body as {
      content?: string;
      fileName?: string;
      fileType?: string;
    };

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: true, message: "Content is required" });
    }

    try {
      const result = await callTool("ingest_upload", {
        content,
        fileName: fileName ?? "upload",
        fileType: fileType ?? "text/plain",
        sourceProvider: "user_upload",
      });
      return res.json({ success: true, result });
    } catch (err: any) {
      return res.status(500).json({ error: true, message: err?.message ?? "Upload ingestion failed" });
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
      "enrich_entity",
      "detect_contradictions",
      "ingest_upload",
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
