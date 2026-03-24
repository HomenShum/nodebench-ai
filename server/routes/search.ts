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

    if (lq.includes("weekly reset") || lq.includes("founder reset") || lq.includes("founder weekly")
        || lq.includes("weekly summary") || lq.includes("week in review") || lq.match(/weekly\b.*\b(next moves|recap|update)/)) {
      return { type: "weekly_reset", lens: "founder" };
    }
    if (lq.includes("pre-delegation") || lq.includes("delegation packet") || lq.includes("agent-ready")
        || lq.includes("handoff brief") || lq.includes("handoff packet") || lq.includes("agent delegation")
        || (lq.includes("delegation") && lq.includes("agent"))) {
      return { type: "pre_delegation", lens: "founder" };
    }
    if (lq.includes("important change") || lq.includes("what changed") || lq.includes("since my last")
        || lq.includes("what's different") || lq.includes("what is different") || lq.includes("since yesterday")
        || lq.includes("biggest contradictions") || lq.includes("recent changes")) {
      return { type: "important_change", lens: "founder" };
    }
    if (lq.includes("competitor") || lq.includes("supermemory") || lq.includes("versus") || lq.includes(" vs ")
        || lq.includes("compare ") || lq.includes("competitive landscape")) {
      const entityMatch = query.match(/(?:competitor|analyze|compare)\s+(\w+)/i);
      return { type: "competitor", entity: entityMatch?.[1] ?? undefined, lens: "researcher" };
    }

    // Skip company search if the query is about user's own documents/uploads or is a general strategic question
    const isUploadContext = lq.match(/\b(meeting transcript|meeting notes|uploaded|my documents|my files|research files|my research)\b/);
    const isGeneralStrategic = lq.match(/\b(should i track|should i build|should i present|for my thesis|as a legal|as a banker|as an investor|what deals|portfolio companies)\b/);
    if (isUploadContext || isGeneralStrategic) {
      return { type: "general", lens: "founder" };
    }

    // Company search — detect entity names
    const companyPatterns = [
      /(?:analyze|search|tell me about|company|profile|diligence on|research)\s+(.+?)(?:\s+for\b|\s+from\b|\s+—|$)/i,
      /^(.+?)\s+(?:competitive position|strategy|valuation|revenue|risk|overview)/i,
      /^search\s+(.+?)(?:\s+—|\s+–|\s+-|$)/i,
      /(?:top \d+ risks across|risks across|landscape for)\s+(.+?)$/i,
    ];
    for (const pattern of companyPatterns) {
      const match = query.match(pattern);
      if (match?.[1]) {
        // Clean entity name: strip possessives, trailing descriptors, and stop words
        const entity = match[1].trim()
          .replace(/['"]/g, "")
          .replace(/'s\b/g, "")                    // "Anthropic's" → "Anthropic"
          .replace(/\s+(competitive|position|strategy|valuation|revenue|risk|overview|market|enterprise|positioning|infrastructure|moat|product|data|lakehouse|developer|platform|payments|AI|search|commerce).*$/i, "")
          .trim();
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

    // Execution trace — records every step for trajectory visualization
    const trace: Array<{ step: string; tool?: string; startMs: number; endMs?: number; status: "ok" | "error" | "skip"; detail?: string }> = [];
    function traceStep(step: string, tool?: string) {
      const entry = { step, tool, startMs: Date.now(), status: "ok" as const, detail: undefined as string | undefined };
      trace.push(entry);
      return {
        ok(detail?: string) { entry.endMs = Date.now(); entry.status = "ok"; entry.detail = detail; },
        error(detail?: string) { entry.endMs = Date.now(); entry.status = "error"; entry.detail = detail; },
        skip(detail?: string) { entry.endMs = Date.now(); entry.status = "skip"; entry.detail = detail; },
      };
    }

    const classifyTrace = traceStep("classify_query");
    classifyTrace.ok(`type=${classification.type}, entity=${classification.entity ?? "none"}`);

    // Fix P2 #10: Compute context bundle BEFORE tool dispatch so tools can use it
    const ctxTrace = traceStep("build_context_bundle");
    const contextBundle = buildContextBundle(query.trim());
    ctxTrace.ok(`tokens=${contextBundle.totalEstimatedTokens}`);

    try {
      let result: any;

      switch (classification.type) {
        case "weekly_reset": {
          const t = traceStep("tool_call", "founder_local_weekly_reset");
          result = await callTool("founder_local_weekly_reset", { daysBack: daysBack ?? 7 });
          t.ok();
          break;
        }

        case "pre_delegation":
        case "important_change": {
          const t = traceStep("tool_call", "founder_local_synthesize");
          result = await callTool("founder_local_synthesize", {
            packetType: classification.type,
            daysBack: daysBack ?? 7,
          });
          t.ok();
          break;
        }

        case "company_search":
        case "competitor": {
          const entityName = classification.entity ?? query.trim().split(/\s+/).slice(0, 3).join(" ");

          // Run web_search + recon + local context in parallel
          const webTrace = traceStep("tool_call", "web_search");
          const reconTrace = traceStep("tool_call", "run_recon");
          const gatherTrace = traceStep("tool_call", "founder_local_gather");
          const [webResult, reconResult, localCtx] = await Promise.all([
            Promise.race([
              callTool("web_search", {
                query: `${entityName} company overview strategy funding ${new Date().getFullYear()}`,
                maxResults: 5,
              }),
              new Promise(resolve => setTimeout(() => resolve(null), 8_000)), // 8s timeout
            ]).then(r => { webTrace.ok(`${(r as any)?.resultCount ?? 0} results`); return r; }).catch(() => { webTrace.error("web_search failed"); return null; }),
            callTool("run_recon", {
              target: entityName,
              focus: query.trim(),
            }).then(r => { reconTrace.ok(); return r; }).catch(() => { reconTrace.error("recon failed"); return null; }),
            callTool("founder_local_gather", { daysBack: daysBack ?? 7 }).then(r => { gatherTrace.ok(); return r; }).catch(() => { gatherTrace.error("gather failed"); return null; }),
          ]);

          const web = webResult as any;
          const recon = reconResult as any;
          const local = localCtx as any;

          // Extract data from web search results
          const webResults = web?.results ?? [];
          const webSnippets = webResults.map((r: any) => r.snippet ?? r.description ?? "").filter(Boolean);
          const webSummary = webSnippets.slice(0, 3).join(" ").slice(0, 800);
          const webSources = webResults.map((r: any) => r.url ?? r.link).filter(Boolean);

          // Extract data from recon
          const reconSources = recon?.plan?.sources ?? recon?.sources ?? [];
          const reconFindings = recon?.findings ?? [];
          const competitors = recon?.competitors ?? recon?.comparables ?? [];

          // Use Gemini to extract structured entity intelligence from web results
          let geminiExtracted: any = null;
          if (webSnippets.length > 0 && process.env.GEMINI_API_KEY) {
            const extractTrace = traceStep("llm_extract", "gemini-3.1-flash-lite-preview");
            try {
              const geminiResp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: `Extract structured entity intelligence from these web search results about "${entityName}" for a ${resolvedLens} user.

WEB RESULTS:
${webSnippets.slice(0, 5).join("\n\n")}

Return ONLY valid JSON with these fields:
{
  "summary": "2-3 sentence description of ${entityName}",
  "signals": [{"name": "signal name", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "what changed", "date": "YYYY-MM-DD or null"}],
  "risks": [{"title": "risk title", "description": "risk description"}],
  "comparables": [{"name": "competitor name", "relevance": "high|medium|low", "note": "why relevant"}],
  "metrics": [{"label": "metric name", "value": "metric value"}]
}` }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 1500, responseMimeType: "application/json" },
                  }),
                  signal: AbortSignal.timeout(10_000),
                },
              );
              if (geminiResp.ok) {
                const gJson = await geminiResp.json() as any;
                const gText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (gText) {
                  const cleaned = gText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
                  if (jsonMatch) {
                    geminiExtracted = JSON.parse(jsonMatch[0].replace(/,\s*([\]}])/g, "$1"));
                  }
                }
              }
              extractTrace.ok(`extracted ${geminiExtracted ? "ok" : "empty"}`);
            } catch { extractTrace.error("gemini extraction failed"); }
          }

          // Merge all sources: gemini extracted > recon > web > defaults
          const ge = geminiExtracted ?? {};

          const mergedSignals = (ge.signals ?? []).slice(0, 5).map((s: any, i: number) => ({
            name: s.name ?? `${entityName} signal ${i + 1}`,
            direction: s.direction ?? "neutral",
            impact: s.impact ?? (i < 2 ? "high" : "medium"),
          }));

          const mergedChanges = (ge.changes ?? []).slice(0, 5).map((c: any) => ({
            description: c.description ?? String(c),
            date: c.date ?? new Date().toISOString().slice(0, 10),
          }));

          const mergedRisks = (ge.risks ?? []).slice(0, 3).map((r: any) => ({
            claim: r.title ?? r.claim ?? String(r),
            evidence: r.description ?? r.evidence ?? "",
          }));

          const mergedComparables = (ge.comparables ?? competitors).slice(0, 4).map((c: any) => ({
            name: typeof c === "string" ? c : c.name ?? String(c),
            relevance: c.relevance ?? "medium",
            note: typeof c === "string" ? "" : c.note ?? c.description ?? "",
          }));

          const mergedMetrics = (ge.metrics ?? []).slice(0, 6).map((m: any) => ({
            label: m.label ?? "Metric",
            value: String(m.value ?? "N/A"),
          }));

          // Fallback signals only if gemini + recon both empty
          const hasRealData = mergedSignals.length > 0 || reconFindings.length > 0;
          const finalSignals = mergedSignals.length > 0 ? mergedSignals
            : reconSources.slice(0, 4).map((s: any, i: number) => ({
                name: typeof s === "string" ? s : s.name ?? String(s),
                direction: "neutral", impact: i < 2 ? "high" : "medium",
              }));
          const finalChanges = mergedChanges.length > 0 ? mergedChanges
            : reconFindings.slice(0, 5).map((f: any) => ({
                description: typeof f === "string" ? f : f.summary ?? String(f),
                date: new Date().toISOString().slice(0, 10),
              }));
          const finalRisks = mergedRisks.length > 0 ? mergedRisks
            : [{ claim: `${entityName} competitive risks need deeper analysis`, evidence: `Web search returned ${webResults.length} results. Run deeper research or upload documents for risk detection.` }];

          const entitySummary = ge.summary ?? recon?.summary ?? recon?.overview
            ?? (webSummary ? `${entityName}: ${webSummary.slice(0, 300)}` : `${entityName} entity profile. ${hasRealData ? "" : "Upload documents or connect agents for deeper intelligence."}`);

          const confidence = Math.min(95, 40 + webResults.length * 3 + (geminiExtracted ? 20 : 0) + reconFindings.length * 5);

          result = {
            canonicalEntity: {
              name: entityName,
              canonicalMission: entitySummary,
              identityConfidence: confidence,
            },
            memo: true,
            whatChanged: finalChanges.length > 0 ? finalChanges : [{ description: `${entityName} profile created from ${webResults.length} web sources`, date: new Date().toISOString().slice(0, 10) }],
            signals: finalSignals.length > 0 ? finalSignals : [{ name: `${entityName} analysis in progress`, direction: "neutral", impact: "high" }],
            contradictions: finalRisks,
            comparables: mergedComparables,
            keyMetrics: mergedMetrics,
            nextActions: [
              { action: `Deep-dive ${entityName}'s financials and unit economics` },
              { action: `Map ${entityName}'s competitive landscape` },
              { action: `Monitor ${entityName} for material changes` },
              { action: `Compare ${entityName} to closest competitors` },
            ],
            nextQuestions: [
              `What are ${entityName}'s key competitive advantages?`,
              `How does ${entityName} compare to its closest competitors?`,
              `What are the main risks facing ${entityName}?`,
              `What changed for ${entityName} in the last quarter?`,
            ],
            webSources: webSources.slice(0, 5),
            localContext: local,
          };
          break;
        }

        default: {
          // General query — gather local context and map to ResultPacket shape
          const gt = traceStep("tool_call", "founder_local_gather");
          const gather = await callTool("founder_local_gather", { daysBack: daysBack ?? 7 }) as any;
          gt.ok();
          const g = gather ?? {};

          const gChanges = (g.recentActions ?? g.changes ?? []).slice(0, 5).map((a: any) => ({
            description: typeof a === "string" ? a : a.description ?? a.action ?? String(a),
            date: a.date ?? a.timestamp,
          }));
          const gSignals = (g.signals ?? g.milestones ?? []).slice(0, 5).map((s: any, i: number) => ({
            name: typeof s === "string" ? s : s.name ?? s.title ?? String(s),
            direction: s.direction ?? "neutral",
            impact: i < 2 ? "high" : "medium",
          }));
          const gContradictions = (g.contradictions ?? []).slice(0, 3).map((c: any) => ({
            claim: typeof c === "string" ? c : c.claim ?? c.title ?? String(c),
            evidence: typeof c === "string" ? "" : c.evidence ?? c.description ?? "",
          }));
          const gActions = (g.nextActions ?? g.pendingActions ?? []).slice(0, 4).map((a: any) => ({
            action: typeof a === "string" ? a : a.action ?? a.title ?? String(a),
          }));

          result = {
            canonicalEntity: {
              name: g.company?.name ?? "Your Workspace",
              canonicalMission: g.company?.canonicalMission ?? g.summary ?? `Workspace intelligence for: "${query.trim()}". Upload documents, connect agents, or search specific entities for deeper results.`,
              identityConfidence: g.company?.identityConfidence ?? 50,
            },
            memo: true,
            whatChanged: gChanges.length > 0 ? gChanges : [
              { description: `Query received: "${query.trim().slice(0, 60)}"`, date: new Date().toISOString().slice(0, 10) },
              { description: "Upload documents or connect agents for richer context", date: new Date().toISOString().slice(0, 10) },
            ],
            signals: gSignals.length > 0 ? gSignals : [
              { name: "Current workspace context", direction: "neutral", impact: "high" },
              { name: "Agent connection status", direction: "neutral", impact: "medium" },
              { name: "Upload pipeline readiness", direction: "up", impact: "medium" },
            ],
            contradictions: gContradictions.length > 0 ? gContradictions : [
              { claim: "Limited context available", evidence: "General queries work best with local context. Try a founder weekly reset or search a specific entity for richer results." },
            ],
            nextActions: gActions.length > 0 ? gActions : [
              { action: "Generate a founder weekly reset for structured insights" },
              { action: "Search a specific company for entity intelligence" },
              { action: "Upload documents to build your knowledge base" },
            ],
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

      const latencyMs = Date.now() - startMs;

      // Finalize trace
      const assembleTrace = traceStep("assemble_response");
      assembleTrace.ok(`latency=${latencyMs}ms`);

      // Use the pre-computed contextBundle (computed before dispatch)
      return res.json({
        success: true,
        classification: classification.type,
        lens: resolvedLens,
        entity: classification.entity ?? null,
        latencyMs,
        result,
        judge: judgeVerdict,
        // Execution trace — every step timestamped for trajectory visualization
        trace: trace.map(t => ({
          step: t.step,
          tool: t.tool,
          durationMs: t.endMs ? t.endMs - t.startMs : 0,
          status: t.status,
          detail: t.detail,
        })),
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

  // ── GET /search/eval-history — Eval run results for trajectory visualization ──
  router.get("/eval-history", (_req, res) => {
    try {
      const db = getDb();
      const runs = db.prepare(
        `SELECT run_id, timestamp, total_queries, passed, failed, pass_rate, avg_latency_ms, judge_model, structural_pass_rate, gemini_pass_rate, created_at
         FROM eval_runs ORDER BY created_at DESC LIMIT 20`
      ).all() as any[];

      // For the latest run, include per-query results
      let latestResults: any[] = [];
      if (runs.length > 0) {
        const latest = db.prepare(
          `SELECT results_json FROM eval_runs WHERE run_id = ?`
        ).get(runs[0].run_id) as any;
        if (latest?.results_json) {
          latestResults = JSON.parse(latest.results_json);
        }
      }

      return res.json({
        success: true,
        totalRuns: runs.length,
        runs: runs.map(r => ({
          runId: r.run_id,
          timestamp: r.timestamp,
          totalQueries: r.total_queries,
          passed: r.passed,
          failed: r.failed,
          passRate: r.pass_rate,
          avgLatencyMs: r.avg_latency_ms,
          judgeModel: r.judge_model,
          structuralPassRate: r.structural_pass_rate,
          geminiPassRate: r.gemini_pass_rate,
        })),
        latestResults: latestResults.map((r: any) => ({
          queryId: r.queryId,
          query: r.query,
          lens: r.lens,
          expectedType: r.expectedType,
          actualType: r.actualType,
          latencyMs: r.latencyMs,
          structuralPass: r.structuralPass,
          structuralScore: r.structuralScore,
          geminiVerdict: r.geminiVerdict,
          geminiScore: r.geminiScore,
          combinedPass: r.combinedPass,
        })),
      });
    } catch (err: any) {
      return res.json({ success: true, totalRuns: 0, runs: [], latestResults: [] });
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
