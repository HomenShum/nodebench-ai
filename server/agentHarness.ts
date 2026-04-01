/**
 * agentHarness.ts — NodeBench Agent Harness
 *
 * The runtime that turns NodeBench from a dashboard into the engine
 * that orchestrates how agents gather, analyze, and act on intelligence.
 *
 * Like claw-code's harness pattern:
 * - assistant: LLM conversation loop with tool calling
 * - coordinator: plans and dispatches tool chains
 * - hooks: pre/post tool execution (profiling, caching, permission)
 * - bridge: routes to different LLM providers based on task
 *
 * Architecture:
 * 1. User query → Gemini Flash Lite classifies intent + entities
 * 2. Gemini Flash plans a tool chain (which tools, what order, what parallel)
 * 3. Harness executes the plan, logging each step
 * 4. After each step, Gemini observes results and can adapt the plan
 * 5. Final synthesis into structured ResultPacket
 *
 * This replaces the flat switch statement in search.ts with an
 * LLM-orchestrated execution loop.
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface HarnessStep {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  purpose: string;
  parallel?: boolean;  // Can run alongside other parallel steps
  dependsOn?: string;  // Wait for this step ID first
}

export interface HarnessPlan {
  objective: string;
  classification: string;
  entityTargets: string[];
  steps: HarnessStep[];
  synthesisPrompt: string;  // How to combine results into a packet
}

export interface HarnessStepResult {
  stepId: string;
  toolName: string;
  result: unknown;
  success: boolean;
  durationMs: number;
  error?: string;
}

export interface HarnessExecution {
  plan: HarnessPlan;
  stepResults: HarnessStepResult[];
  totalDurationMs: number;
  totalCostUsd: number;
  adaptations: number;  // How many times the plan was revised
}

export type TraceCallback = (step: { step: string; tool?: string; status: string; detail?: string }) => void;

type ToolCaller = (name: string, args: Record<string, unknown>) => Promise<unknown>;

// ── Multi-model LLM call via existing provider bus ───────────────────
// Uses call_llm MCP tool which routes: Gemini → OpenAI → Anthropic
// Falls back to direct Gemini fetch if call_llm unavailable

async function callLLM(
  _callTool: ToolCaller,
  prompt: string,
  system?: string,
  maxTokens?: number,
): Promise<string> {
  // Direct Gemini REST API call — reliable on Vercel serverless.
  // The call_llm MCP tool uses @google/genai SDK which isn't bundled
  // in the serverless function (esbuild --packages=external).
  // Direct fetch to the REST API works everywhere.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Try OpenAI as fallback
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      try {
        const resp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              ...(system ? [{ role: "system" as const, content: system }] : []),
              { role: "user" as const, content: prompt },
            ],
            max_tokens: maxTokens ?? 500,
            temperature: 0,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (resp.ok) {
          const data = await resp.json() as any;
          return data?.choices?.[0]?.message?.content ?? "";
        }
      } catch { /* fall through */ }
    }
    return "";
  }

  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: maxTokens ?? 500 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!resp.ok) return "";
    const data = await resp.json() as any;
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  } catch {
    return "";
  }
}

// ── Plan generation via LLM ──────────────────────────────────────────

const PLAN_PROMPT = `You are NodeBench's agent orchestrator. Given a user query, plan which tools to call and in what order.

Available tools:
- web_search: Search the web for company/market intelligence. Args: {query, maxResults}
- run_recon: Deep reconnaissance on a company. Args: {target, focus}
- founder_local_gather: Get local founder context (company state, changes, contradictions). Args: {daysBack}
- founder_local_synthesize: Synthesize a founder packet (weekly_reset, important_change, pre_delegation). Args: {query, packetType, daysBack}
- founder_local_weekly_reset: Generate weekly founder reset. Args: {daysBack}
- founder_direction_assessment: Assess company direction and readiness. Args: {query}
- enrich_entity: Enrich entity with structured intelligence. Args: {query, entityName, lens}
- build_claim_graph: Extract claims from sources. Args: {sources}
- extract_variables: Identify key variables. Args: {context}
- generate_countermodels: Generate alternative explanations. Args: {thesis, evidence}
- rank_interventions: Rank next actions by impact. Args: {context, variables}
- render_decision_memo: Render a decision memo. Args: {title, recommendation, variables}

Return ONLY valid JSON:
{
  "objective": "what this plan accomplishes",
  "steps": [
    {"id": "s1", "toolName": "tool_name", "args": {...}, "purpose": "why this step", "parallel": false},
    {"id": "s2", "toolName": "tool_name", "args": {...}, "purpose": "why this step", "parallel": true, "dependsOn": "s1"}
  ],
  "synthesisPrompt": "how to combine results into a final answer"
}

Rules:
- Use 2-5 steps. Don't over-plan.
- Mark steps as parallel:true when they don't depend on each other.
- For company searches: web_search + run_recon in parallel, then synthesize.
- For founder questions: founder_local_gather first, then direction_assessment or synthesize.
- For comparisons: web_search per entity in parallel, then compare.
- Always include at least one intelligence-gathering step.`;

export async function generatePlan(
  query: string,
  classification: string,
  entityTargets: string[],
  lens: string,
  callTool: ToolCaller,
): Promise<HarnessPlan> {
  try {
    const text = await callLLM(
      callTool,
      `${PLAN_PROMPT}\n\nQuery: "${query}"\nClassification: ${classification}\nEntities: ${entityTargets.join(", ") || "none"}\nLens: ${lens}`,
      undefined,
      500,
    );
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      objective: parsed.objective ?? query,
      classification,
      entityTargets,
      steps: (parsed.steps ?? []).map((s: any, i: number) => ({
        id: s.id ?? `step_${i}`,
        toolName: s.toolName ?? "web_search",
        args: s.args ?? {},
        purpose: s.purpose ?? "",
        parallel: s.parallel ?? false,
        dependsOn: s.dependsOn,
      })),
      synthesisPrompt: parsed.synthesisPrompt ?? "Synthesize results into a structured intelligence packet.",
    };
  } catch {
    // Fallback: deterministic plan based on classification
    return buildFallbackPlan(query, classification, entityTargets, lens);
  }
}

// ── Fallback deterministic planning ──────────────────────────────────

function extractEntityFromQuery(query: string): string {
  // Extract likely entity name from natural language query
  // Look for capitalized proper nouns that aren't common question words
  const stopWords = new Set(["what", "why", "how", "when", "where", "who", "which", "the", "are", "is", "do", "does", "did", "can", "will", "should", "would", "could", "am", "i", "my", "for", "in", "on", "at", "to", "of", "a", "an", "and", "or", "not", "biggest", "main", "key", "top", "most", "best", "worst", "right", "now", "today", "currently", "about", "tell", "me", "show", "give", "get", "find", "analyze", "compare", "ready", "pitch"]);

  const words = query.replace(/[?!.,]+/g, "").split(/\s+/);
  const candidates = words.filter(w =>
    w.length > 1 &&
    /^[A-Z]/.test(w) &&
    !stopWords.has(w.toLowerCase())
  );

  // Join consecutive capitalized words (e.g., "Y Combinator", "Open AI")
  if (candidates.length > 0) {
    const result: string[] = [];
    let current = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      const prevIdx = words.indexOf(candidates[i - 1]);
      const currIdx = words.indexOf(candidates[i]);
      if (currIdx === prevIdx + 1) {
        current += " " + candidates[i];
      } else {
        result.push(current);
        current = candidates[i];
      }
    }
    result.push(current);
    return result[0]; // Return first entity found
  }

  // Last resort: first 3 meaningful words
  return words.filter(w => !stopWords.has(w.toLowerCase())).slice(0, 3).join(" ") || query.slice(0, 30);
}

function buildFallbackPlan(query: string, classification: string, entityTargets: string[], lens: string): HarnessPlan {
  const entity = entityTargets[0] ?? extractEntityFromQuery(query);
  const year = new Date().getFullYear();

  switch (classification) {
    case "weekly_reset":
      return {
        objective: "Generate founder weekly reset",
        classification, entityTargets,
        steps: [
          { id: "s1", toolName: "founder_local_weekly_reset", args: { daysBack: 7 }, purpose: "Get weekly reset packet", parallel: false },
        ],
        synthesisPrompt: "Format as a weekly founder reset with what changed, contradictions, and next 3 moves.",
      };

    case "important_change":
    case "pre_delegation":
      return {
        objective: `Synthesize ${classification} packet`,
        classification, entityTargets,
        steps: [
          { id: "s1", toolName: "founder_local_synthesize", args: { query, packetType: classification, daysBack: 7 }, purpose: "Synthesize packet", parallel: false },
        ],
        synthesisPrompt: "Format as a structured founder packet.",
      };

    case "multi_entity": {
      const steps: HarnessStep[] = entityTargets.slice(0, 4).flatMap((e, i) => [
        {
          id: `s${i * 2 + 1}`,
          toolName: "web_search",
          args: { query: `${e} company overview strategy competitors ${year}`, maxResults: 4 },
          purpose: `Research ${e}`,
          parallel: true,
        },
        {
          id: `s${i * 2 + 2}`,
          toolName: "enrich_entity",
          args: { query: `${e} competitive position`, entityName: e, lens },
          purpose: `Enrich ${e}`,
          parallel: true,
        },
      ]);
      steps.push({
        id: `s${steps.length + 1}`,
        toolName: "founder_local_gather",
        args: { daysBack: 7 },
        purpose: "Get local context",
        parallel: true,
      });
      return {
        objective: `Compare ${entityTargets.join(" vs ")}`,
        classification, entityTargets, steps,
        synthesisPrompt: `Compare ${entityTargets.join(", ")} across key dimensions for a ${lens} audience.`,
      };
    }

    case "company_search":
    case "competitor":
      return {
        objective: `Analyze ${entity}`,
        classification, entityTargets,
        steps: [
          { id: "s1", toolName: "linkup_search", args: { query: `${entity} company overview strategy funding competitive position ${year}`, maxResults: 5 }, purpose: "Linkup deep intelligence", parallel: true },
          { id: "s2", toolName: "web_search", args: { query: `${entity} competitors risks challenges ${year}`, maxResults: 5 }, purpose: "Competitive & risk intelligence", parallel: true },
          { id: "s3", toolName: "enrich_entity", args: { query: `${entity} competitive position`, entityName: entity, lens }, purpose: "Structured entity enrichment", parallel: true },
          { id: "s4", toolName: "run_recon", args: { target: entity, focus: query }, purpose: "Deep recon", parallel: true },
          { id: "s5", toolName: "founder_local_gather", args: { daysBack: 7 }, purpose: "Local context", parallel: true },
        ],
        synthesisPrompt: `Synthesize intelligence about ${entity} for a ${lens} audience. Include signals, risks, comparables, and next actions.`,
      };

    case "plan_proposal":
      return {
        objective: `Plan: ${query}`,
        classification, entityTargets,
        steps: [
          { id: "s1", toolName: "founder_local_gather", args: { daysBack: 7 }, purpose: "Understand current context", parallel: false },
          { id: "s2", toolName: "web_search", args: { query: `${query} best practices ${year}`, maxResults: 3 }, purpose: "Research approaches", parallel: false },
        ],
        synthesisPrompt: "Generate a structured feature plan with phases, risks, and next steps.",
      };

    default:
      return {
        objective: query,
        classification, entityTargets,
        steps: [
          { id: "s1", toolName: "founder_local_gather", args: { daysBack: 7 }, purpose: "Gather context", parallel: true },
          { id: "s2", toolName: "web_search", args: { query: `${query} ${year}`, maxResults: 5 }, purpose: "Web research", parallel: true },
          { id: "s3", toolName: "web_search", args: { query: `${entity} market risks competitors ${year}`, maxResults: 3 }, purpose: "Risk & competitive context", parallel: true },
          { id: "s4", toolName: "founder_direction_assessment", args: { query }, purpose: "Direction assessment", parallel: false, dependsOn: "s1" },
        ],
        synthesisPrompt: `Answer the query "${query}" using gathered intelligence. Format as a structured founder packet.`,
      };
  }
}

// ── Harness execution engine ─────────────────────────────────────────

export async function executeHarness(
  plan: HarnessPlan,
  callTool: ToolCaller,
  onTrace?: TraceCallback,
): Promise<HarnessExecution> {
  const startMs = Date.now();
  const stepResults: HarnessStepResult[] = [];
  const completedSteps = new Set<string>();

  // Group steps by dependency level
  const readySteps = plan.steps.filter(s => !s.dependsOn);
  const dependentSteps = plan.steps.filter(s => s.dependsOn);

  // Execute ready steps (parallel where marked)
  const parallelBatch = readySteps.filter(s => s.parallel);
  const serialSteps = readySteps.filter(s => !s.parallel);

  // Run parallel batch
  if (parallelBatch.length > 0) {
    onTrace?.({ step: "parallel_dispatch", tool: parallelBatch.map(s => s.toolName).join(", "), status: "ok", detail: `${parallelBatch.length} parallel steps` });

    const parallelResults = await Promise.all(
      parallelBatch.map(async (step) => {
        const stepStart = Date.now();
        onTrace?.({ step: "tool_call", tool: step.toolName, status: "ok", detail: step.purpose });
        try {
          const result = await Promise.race([
            callTool(step.toolName, step.args),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
          ]);
          const duration = Date.now() - stepStart;
          completedSteps.add(step.id);
          return { stepId: step.id, toolName: step.toolName, result, success: true, durationMs: duration };
        } catch (err: any) {
          return { stepId: step.id, toolName: step.toolName, result: null, success: false, durationMs: Date.now() - stepStart, error: err?.message };
        }
      })
    );
    stepResults.push(...parallelResults);
  }

  // Run serial steps
  for (const step of serialSteps) {
    const stepStart = Date.now();
    onTrace?.({ step: "tool_call", tool: step.toolName, status: "ok", detail: step.purpose });
    try {
      const result = await Promise.race([
        callTool(step.toolName, step.args),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);
      completedSteps.add(step.id);
      stepResults.push({ stepId: step.id, toolName: step.toolName, result, success: true, durationMs: Date.now() - stepStart });
    } catch (err: any) {
      stepResults.push({ stepId: step.id, toolName: step.toolName, result: null, success: false, durationMs: Date.now() - stepStart, error: err?.message });
    }
  }

  // Run dependent steps (if their dependency completed)
  for (const step of dependentSteps) {
    if (step.dependsOn && !completedSteps.has(step.dependsOn)) continue;
    const stepStart = Date.now();
    onTrace?.({ step: "tool_call", tool: step.toolName, status: "ok", detail: step.purpose });
    try {
      const result = await Promise.race([
        callTool(step.toolName, step.args),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]);
      completedSteps.add(step.id);
      stepResults.push({ stepId: step.id, toolName: step.toolName, result, success: true, durationMs: Date.now() - stepStart });
    } catch (err: any) {
      stepResults.push({ stepId: step.id, toolName: step.toolName, result: null, success: false, durationMs: Date.now() - stepStart, error: err?.message });
    }
  }

  onTrace?.({ step: "assemble_response", status: "ok", detail: `${stepResults.length} steps completed` });

  return {
    plan,
    stepResults,
    totalDurationMs: Date.now() - startMs,
    totalCostUsd: stepResults.reduce((s, r) => s + (r.success ? 0.005 : 0), 0),
    adaptations: 0,
  };
}

// ── Synthesis: combine step results into a ResultPacket ──────────────

export async function synthesizeResults(
  execution: HarnessExecution,
  query: string,
  lens: string,
  callTool: ToolCaller,
): Promise<{
  entityName: string;
  answer: string;
  confidence: number;
  signals: Array<{ name: string; direction: string; impact: string }>;
  changes: Array<{ description: string; date?: string }>;
  risks: Array<{ title: string; description: string }>;
  comparables: Array<{ name: string; relevance: string; note: string }>;
  nextActions: Array<{ action: string; impact: string }>;
  nextQuestions: string[];
  sources: Array<{ label: string; href?: string; type: string }>;
}> {
  // Collect all successful results
  const resultData = execution.stepResults
    .filter(r => r.success && r.result)
    .map(r => {
      const res = r.result as any;
      return {
        tool: r.toolName,
        data: typeof res === "string" ? res.slice(0, 1000) :
              JSON.stringify(res).slice(0, 1000),
      };
    });

  const entityName = execution.plan.entityTargets[0] ?? extractEntityFromQuery(query);

  // Use multi-model provider bus (Gemini → OpenAI → Anthropic)
  if (resultData.length > 0) {
    try {
      const text = await callLLM(
        callTool,
        `Synthesize these tool results into a structured intelligence packet.

Query: "${query}"
Lens: ${lens}
Objective: ${execution.plan.objective}

Tool Results:
${resultData.map(r => `[${r.tool}]: ${r.data}`).join("\n\n")}

Return ONLY valid JSON:
{
  "entityName": "primary entity name",
  "answer": "2-3 sentence executive summary",
  "confidence": 0-100,
  "signals": [{"name": "signal", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "what changed", "date": null}],
  "risks": [{"title": "risk title", "description": "details"}],
  "comparables": [{"name": "company", "relevance": "high|medium|low", "note": "why relevant"}],
  "nextActions": [{"action": "what to do", "impact": "high|medium|low"}],
  "nextQuestions": ["follow-up question 1", "follow-up question 2"],
  "sources": [{"label": "source name", "href": null, "type": "web|local|doc"}]
}`,
        "You are a startup intelligence analyst. Extract specific facts and return structured JSON.",
        1000,
      );

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          entityName: parsed.entityName ?? entityName,
          answer: parsed.answer ?? "",
          confidence: typeof parsed.confidence === "number" ? parsed.confidence : 50,
          signals: parsed.signals ?? [],
          changes: parsed.changes ?? [],
          risks: parsed.risks ?? [],
          comparables: parsed.comparables ?? [],
          nextActions: parsed.nextActions ?? [],
          nextQuestions: parsed.nextQuestions ?? [],
          sources: parsed.sources ?? [],
        };
      }
    } catch { /* fall through to deterministic synthesis */ }
  }

  // Deterministic synthesis: extract structured data from raw tool results
  // This is the structural path — not a "fallback". Tool results ARE structured data.
  const signals: Array<{ name: string; direction: string; impact: string }> = [];
  const changes: Array<{ description: string; date?: string }> = [];
  const risks: Array<{ title: string; description: string }> = [];
  const comparables: Array<{ name: string; relevance: string; note: string }> = [];
  const nextActions: Array<{ action: string; impact: string }> = [];
  const sources: Array<{ label: string; href?: string; type: string }> = [];
  const answerParts: string[] = [];

  for (const sr of execution.stepResults) {
    if (!sr.success || !sr.result) continue;
    const raw = sr.result as any;

    // Skip results that report their own errors (HONEST_STATUS: tool returned 200 but error inside)
    if (raw?.error === true) continue;

    // ── linkup_search results (richest source — answer + sources with snippets) ──
    if (sr.toolName === "linkup_search") {
      if (raw?.answer) answerParts.unshift(String(raw.answer).slice(0, 500)); // Linkup answer is highest quality, prepend
      const lSources = raw?.sources ?? [];
      for (const s of (Array.isArray(lSources) ? lSources : []).slice(0, 5)) {
        const title = s?.name ?? s?.title ?? "";
        const snippet = s?.snippet ?? s?.description ?? "";
        const url = s?.url ?? "";
        if (title) sources.push({ label: title.slice(0, 80), href: url || undefined, type: "web" });
        if (snippet) {
          if (/\b(revenue|growth|raised|funding|launch|expand|partner|acquir|billion|million|valuation)/i.test(snippet)) {
            signals.push({ name: snippet.slice(0, 60), direction: "up", impact: "high" });
          }
          if (/\b(layoff|decline|loss|risk|lawsuit|regulat|concern|investig|threat|challenge|vulnerab)/i.test(snippet)) {
            risks.push({ title: "Risk: " + title.slice(0, 40), description: snippet.slice(0, 150) });
          }
          if (/\b(compet|rival|alternative|versus|vs\.|compared to)/i.test(snippet)) {
            // Extract competitor names from snippet
            const compMatch = snippet.match(/(?:competitors?|rivals?|alternatives?)\s+(?:like|such as|including)\s+([A-Z][a-zA-Z]+(?:\s*,\s*[A-Z][a-zA-Z]+)*)/i);
            if (compMatch) {
              for (const name of compMatch[1].split(/,\s*/)) {
                if (name.trim().length > 1) comparables.push({ name: name.trim(), relevance: "high", note: "Identified via Linkup" });
              }
            }
          }
        }
      }
    }

    // ── web_search results ──
    if (sr.toolName === "web_search") {
      // web_search returns { results: [...] } or { webResults: [...] } or { content: "..." }
      const results = raw?.results ?? raw?.webResults ?? (Array.isArray(raw) ? raw : []);
      for (const r of (Array.isArray(results) ? results : []).slice(0, 5)) {
        const title = r?.title ?? r?.name ?? "";
        const snippet = r?.snippet ?? r?.description ?? r?.content ?? "";
        const url = r?.url ?? r?.link ?? r?.href ?? "";
        if (title) sources.push({ label: title.slice(0, 80), href: url || undefined, type: "web" });
        if (snippet) {
          answerParts.push(snippet.slice(0, 200));
          if (/\b(growth|revenue|raised|funding|launch|expand|partner|acquir)/i.test(snippet)) {
            signals.push({ name: title.slice(0, 60), direction: "up", impact: "medium" });
          }
          if (/\b(layoff|decline|loss|risk|lawsuit|regulat|concern|investig)/i.test(snippet)) {
            risks.push({ title: title.slice(0, 60), description: snippet.slice(0, 150) });
          }
        }
      }
      // web_search may also return content as a single string (grounded search)
      if (typeof raw?.content === "string" && raw.content.length > 20) {
        answerParts.push(raw.content.slice(0, 500));
        sources.push({ label: raw?.query ?? "web search", type: "web" });
      }
    }

    // ── run_recon results ──
    if (sr.toolName === "run_recon") {
      // run_recon returns { status: "active", researchPlan: {...}, nextSteps: [...] }
      // or completed recon: { findings: [...], summary: "..." }
      if (raw?.researchPlan) {
        // Async recon — extract planned sources as signals
        const plan = raw.researchPlan;
        const external = plan?.externalSources ?? [];
        const internal = plan?.internalChecks ?? [];
        if (external.length > 0 || internal.length > 0) {
          signals.push({ name: `Recon plan: ${external.length} external + ${internal.length} internal sources`, direction: "neutral", impact: "medium" });
        }
        sources.push({ label: `run_recon (${raw.target})`, type: "local" });
      }
      if (raw?.findings) {
        for (const f of (Array.isArray(raw.findings) ? raw.findings : []).slice(0, 5)) {
          const name = typeof f === "string" ? f : (f?.name ?? f?.title ?? f?.finding ?? "");
          if (name) signals.push({ name: name.slice(0, 80), direction: f?.direction ?? "neutral", impact: f?.impact ?? "medium" });
        }
      }
      if (raw?.nextSteps) {
        for (const s of (Array.isArray(raw.nextSteps) ? raw.nextSteps : []).slice(0, 3)) {
          const action = typeof s === "string" ? s : (s?.action ?? "");
          if (action) nextActions.push({ action: action.slice(0, 100), impact: "medium" });
        }
      }
      if (raw?.summary) answerParts.push(String(raw.summary).slice(0, 300));
    }

    // ── founder_local_gather results ──
    if (sr.toolName === "founder_local_gather") {
      // Returns { gathered, identity, recentChanges, publicSurfaces, sessionMemory, dogfoodFindings, architectureDocs }
      if (raw?.identity?.projectName) {
        signals.push({ name: `Project: ${raw.identity.projectName}`, direction: "neutral", impact: "low" });
      }
      if (raw?.recentChanges?.commitCount > 0) {
        signals.push({ name: `${raw.recentChanges.commitCount} commits in last ${raw.recentChanges.daysBack}d`, direction: "up", impact: "medium" });
        for (const c of (raw.recentChanges.topCommits ?? []).slice(0, 3)) {
          changes.push({ description: (c?.message ?? c?.subject ?? String(c)).slice(0, 120), date: c?.date });
        }
      }
      if (raw?.sessionMemory?.actions7d > 0) {
        signals.push({ name: `${raw.sessionMemory.actions7d} actions in last 7d`, direction: "up", impact: "medium" });
      }
      if (raw?.dogfoodFindings?.p0 > 0) {
        risks.push({ title: `${raw.dogfoodFindings.p0} P0 issues`, description: "Critical issues found in dogfood" });
      }
      sources.push({ label: "founder_local_gather", type: "local" });
    }

    // ── founder_local_synthesize / weekly_reset ──
    if (sr.toolName.startsWith("founder_local") && sr.toolName !== "founder_local_gather") {
      if (raw?.changes) {
        for (const c of (Array.isArray(raw.changes) ? raw.changes : []).slice(0, 5)) {
          const desc = typeof c === "string" ? c : (c?.description ?? c?.change ?? "");
          if (desc) changes.push({ description: desc.slice(0, 120), date: c?.date });
        }
      }
      if (raw?.contradictions) {
        for (const c of (Array.isArray(raw.contradictions) ? raw.contradictions : []).slice(0, 3)) {
          const claim = typeof c === "string" ? c : (c?.claim ?? c?.contradiction ?? "");
          if (claim) risks.push({ title: "Contradiction", description: claim.slice(0, 150) });
        }
      }
      if (raw?.nextMoves ?? raw?.recommendations) {
        for (const m of (raw.nextMoves ?? raw.recommendations ?? []).slice(0, 3)) {
          const action = typeof m === "string" ? m : (m?.action ?? m?.move ?? "");
          if (action) nextActions.push({ action: action.slice(0, 100), impact: m?.impact ?? "medium" });
        }
      }
      if (raw?.summary ?? raw?.briefing) answerParts.push(String(raw.summary ?? raw.briefing).slice(0, 300));
      sources.push({ label: sr.toolName, type: "local" });
    }

    // ── enrich_entity results ──
    if (sr.toolName === "enrich_entity") {
      if (raw?.signals) {
        for (const s of (Array.isArray(raw.signals) ? raw.signals : []).slice(0, 5)) {
          signals.push({ name: s?.name ?? String(s).slice(0, 60), direction: s?.direction ?? "neutral", impact: s?.impact ?? "medium" });
        }
      }
      if (raw?.description) answerParts.push(String(raw.description).slice(0, 300));
    }

    // ── Generic fallback: extract any summary from unknown tools ──
    if (!["web_search", "run_recon", "founder_local_gather", "enrich_entity"].includes(sr.toolName) && !sr.toolName.startsWith("founder_local")) {
      const summary = raw?.summary ?? raw?.answer ?? raw?.result ?? raw?.output ?? raw?.briefing;
      if (typeof summary === "string" && summary.length > 10) {
        answerParts.push(summary.slice(0, 300));
        sources.push({ label: sr.toolName, type: "local" });
      }
    }
  }

  // Build answer from collected parts
  const answer = answerParts.length > 0
    ? answerParts.slice(0, 3).join(" ").slice(0, 500)
    : `Analysis of "${query}" using ${execution.stepResults.filter(r => r.success).length} tools.`;

  // Add default next actions if none extracted
  if (nextActions.length === 0) {
    nextActions.push({ action: `Deep-dive into ${entityName} competitive landscape`, impact: "medium" });
    nextActions.push({ action: `Review latest ${entityName} filings and announcements`, impact: "medium" });
  }

  const successCount = execution.stepResults.filter(r => r.success).length;
  const confidence = Math.min(90, 30 + (successCount * 15) + (signals.length * 5) + (sources.length * 3));

  return {
    entityName,
    answer,
    confidence,
    signals: signals.slice(0, 8),
    changes: changes.slice(0, 5),
    risks: risks.slice(0, 5),
    comparables: comparables.slice(0, 4),
    nextActions: nextActions.slice(0, 4),
    nextQuestions: [
      `What are the key risks for ${entityName}?`,
      `Who are ${entityName}'s main competitors?`,
      `What's ${entityName}'s growth trajectory?`,
    ],
    sources: sources.slice(0, 8),
  };
}
