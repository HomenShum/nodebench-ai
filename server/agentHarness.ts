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

// ── Context budgeting (DeerFlow pattern) ─────────────────────────────
// Instead of hardcoded char limits, calculate how much data fits in the
// model's context window and summarize overflow.

const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "gemini-3.1-flash-lite": 32000,
  "gemini-3.1-flash": 128000,
  "gemini-3.1-pro": 128000,
  "claude-sonnet-4-6": 200000,
  "claude-opus-4-6": 200000,
};

function budgetToolData(toolResults: Array<{ tool: string; data: string }>, maxTokensBudget: number): string {
  // Rough estimate: 1 token ≈ 4 chars. Reserve 40% for system prompt + output.
  const inputBudget = Math.floor(maxTokensBudget * 0.6 * 4); // chars available for tool data
  const perToolBudget = Math.floor(inputBudget / Math.max(toolResults.length, 1));

  return toolResults
    .map(r => {
      const data = r.data.length > perToolBudget
        ? r.data.slice(0, perToolBudget - 50) + "\n[...truncated to fit context budget]"
        : r.data;
      return `=== [${r.tool}] ===\n${data}`;
    })
    .join("\n\n");
}

// ── Kilo Code-style auto model routing ───────────────────────────────
// Pattern from Kilo Code: detect task complexity, route to optimal model.
// - Classification/extraction → Flash Lite (cheapest, fastest)
// - Analysis/synthesis → Flash or Pro (deeper reasoning)
// - Complex multi-step → Pro or Claude (highest capability)
// Only latest models. No deprecated models.

type TaskComplexity = "low" | "medium" | "high";

function assessComplexity(prompt: string, maxTokens: number): TaskComplexity {
  const len = prompt.length;
  if (maxTokens <= 500 && len < 2000) return "low";      // Classification, extraction
  if (maxTokens <= 1000 && len < 8000) return "medium";   // Analysis, summarization
  return "high";                                           // Deep synthesis, IB memo
}

interface ModelConfig {
  name: string;
  endpoint: string;
  apiKeyEnv: string;
  timeoutMs: number;
  contextLimit: number;
  makeBody: (prompt: string, system: string | undefined, maxTokens: number) => string;
  extractResponse: (data: any) => string;
}

const GEMINI_MODELS: Record<TaskComplexity, ModelConfig> = {
  low: {
    name: "gemini-3.1-flash-lite",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent",
    apiKeyEnv: "GEMINI_API_KEY",
    timeoutMs: 15000,
    contextLimit: 32000,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      contents: [{ parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: maxTokens },
    }),
    extractResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
  },
  medium: {
    name: "gemini-3.1-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-preview:generateContent",
    apiKeyEnv: "GEMINI_API_KEY",
    timeoutMs: 25000,
    contextLimit: 128000,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      contents: [{ parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: maxTokens },
    }),
    extractResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
  },
  high: {
    name: "gemini-3.1-pro",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
    apiKeyEnv: "GEMINI_API_KEY",
    timeoutMs: 40000,
    contextLimit: 128000,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      contents: [{ parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }],
      generationConfig: { temperature: 0, maxOutputTokens: maxTokens },
    }),
    extractResponse: (data) => data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "",
  },
};

// OpenAI models — Kilo-style complexity routing
// GPT-5.4 series (latest as of April 2026)
// nano=classification, mini=fast analysis, standard=deep synthesis, pro=complex reasoning
const OPENAI_MODELS: Record<TaskComplexity, ModelConfig> = {
  low: {
    name: "gpt-5.4-nano",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    timeoutMs: 10000,
    contextLimit: 128000,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      model: "gpt-5.4-nano",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens, temperature: 0,
    }),
    extractResponse: (data) => data?.choices?.[0]?.message?.content ?? "",
  },
  medium: {
    name: "gpt-5.4-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    timeoutMs: 20000,
    contextLimit: 128000,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      model: "gpt-5.4-mini",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens, temperature: 0,
    }),
    extractResponse: (data) => data?.choices?.[0]?.message?.content ?? "",
  },
  high: {
    name: "gpt-5.4",
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKeyEnv: "OPENAI_API_KEY",
    timeoutMs: 35000,
    contextLimit: 128000,
    makeBody: (prompt, system, maxTokens) => JSON.stringify({
      model: "gpt-5.4",
      messages: [
        ...(system ? [{ role: "system", content: system }] : []),
        { role: "user", content: prompt },
      ],
      max_tokens: maxTokens, temperature: 0,
    }),
    extractResponse: (data) => data?.choices?.[0]?.message?.content ?? "",
  },
};

async function callModel(config: ModelConfig, prompt: string, system: string | undefined, maxTokens: number): Promise<string> {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) throw new Error(`No ${config.apiKeyEnv}`);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  let url = config.endpoint;
  if (config.apiKeyEnv === "GEMINI_API_KEY") {
    url += `?key=${apiKey}`;
  } else {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const resp = await fetch(url, {
    method: "POST", headers,
    body: config.makeBody(prompt, system, maxTokens),
    signal: AbortSignal.timeout(config.timeoutMs),
  });
  if (!resp.ok) throw new Error(`${config.name} ${resp.status}`);
  const data = (await resp.json()) as any;
  return config.extractResponse(data);
}

async function callLLM(
  _callTool: ToolCaller,
  prompt: string,
  system?: string,
  maxTokens?: number,
): Promise<string> {
  const tokens = maxTokens ?? 1000;
  const complexity = assessComplexity(prompt, tokens);
  const primaryModel = GEMINI_MODELS[complexity];

  // Try primary model (complexity-matched), then fallback chain
  const chain = [primaryModel];
  // Add complexity-matched OpenAI as second choice
  chain.push(OPENAI_MODELS[complexity]);
  // Add lower-complexity Gemini as fallback
  if (complexity === "high") chain.push(GEMINI_MODELS.medium);
  if (complexity !== "low") chain.push(GEMINI_MODELS.low);
  // Lower OpenAI as final fallback
  if (complexity !== "low") chain.push(OPENAI_MODELS.low);

  for (const model of chain) {
    try {
      const result = await callModel(model, prompt, system, tokens);
      if (result && result.length > 10) return result;
    } catch { continue; }
  }
  return "";
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
          { id: "s5", toolName: "simulate_decision_paths", args: { entity, revenue: 0, marketShare: 0.01, runway: 18 }, purpose: "Monte Carlo: 3-case financial model (bull/base/bear)", parallel: true },
          // NOTE: founder_local_gather EXCLUDED from external entity searches.
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
          { id: "s1", toolName: "web_search", args: { query: `${query} ${year}`, maxResults: 5 }, purpose: "Web research", parallel: true },
          { id: "s2", toolName: "web_search", args: { query: `${entity} market risks competitors ${year}`, maxResults: 3 }, purpose: "Risk & competitive context", parallel: true },
          { id: "s3", toolName: "linkup_search", args: { query: `${query} ${year}`, maxResults: 3 }, purpose: "Deep web intelligence", parallel: true },
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
  // Collect all successful results — no hardcoded truncation
  const resultData = execution.stepResults
    .filter(r => r.success && r.result)
    .map(r => {
      const res = r.result as any;
      return {
        tool: r.toolName,
        data: typeof res === "string" ? res : JSON.stringify(res),
      };
    });

  const entityName = execution.plan.entityTargets[0] ?? extractEntityFromQuery(query);

  // Use multi-model provider bus (Gemini → OpenAI → Anthropic)
  // This is the PRIMARY synthesis path — an IB analyst writing a memo from raw data.
  if (resultData.length > 0) {
    try {
      const text = await callLLM(
        callTool,
        `You are a senior investment banking analyst writing an intelligence memo. Analyze these raw data sources and produce a structured assessment.

QUERY: "${query}"
AUDIENCE: ${lens} (tailor depth and focus accordingly)
OBJECTIVE: ${execution.plan.objective}

RAW DATA FROM ${resultData.length} SOURCES:
${budgetToolData(resultData, 32000)}

ANALYSIS REQUIREMENTS:
1. ANSWER: Write a 3-4 sentence executive summary with SPECIFIC numbers, dates, and facts from the data. No generic statements. If data says "$26B revenue" — cite it. If data mentions "70% market share" — cite it.
2. SIGNALS: Extract 3-5 key signals with direction (up/down/neutral) and impact. Each signal must reference a specific fact from the data, not a generic observation.
3. RISKS: Identify 2-3 material risks with evidence. For each risk, explain WHY it matters and what could trigger it. Not just "competition risk" — specify which competitor and what they're doing.
4. COMPARABLES: Name 2-4 direct competitors with WHY they're relevant (what they do differently, where they overlap, competitive advantage). Include evidence from the data.
5. NEXT ACTIONS: 2-3 specific, actionable steps the ${lens} should take this week. Not generic "do more research" — specific actions like "review Q4 filing for revenue breakdown" or "compare pricing vs competitor X".
6. FOLLOW-UP QUESTIONS: 3-4 specific questions that would deepen this analysis. Questions should reference gaps in the current data.
7. SOURCES: List actual source names/URLs from the data. Never list tool names like "web_search" or "run_recon". Use the actual article titles, document names, or website domains.

Return ONLY valid JSON:
{
  "entityName": "the primary company/entity name",
  "answer": "3-4 sentence executive summary with specific facts and numbers",
  "confidence": 0-100,
  "signals": [{"name": "specific signal with numbers", "direction": "up|down|neutral", "impact": "high|medium|low"}],
  "changes": [{"description": "specific recent change with date if available"}],
  "risks": [{"title": "specific risk name", "description": "2-3 sentence explanation with evidence and trigger conditions"}],
  "comparables": [{"name": "competitor name", "relevance": "high|medium|low", "note": "specific reason why they're relevant — what they do, how they compete"}],
  "nextActions": [{"action": "specific actionable step for this week", "impact": "high|medium|low"}],
  "nextQuestions": ["specific follow-up question referencing data gaps"],
  "sources": [{"label": "actual source title or domain", "href": "url if available", "type": "web|doc"}]
}`,
        "You are a senior investment banking analyst. Every claim must cite specific data. No generic statements. No placeholder text. If data is insufficient, say so honestly rather than fabricating.",
        1500,
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
        // Don't add "run_recon" as a source label — use actual findings instead
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
      sources.push({ label: "Local company context", type: "local" });
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
      sources.push({ label: "Founder intelligence synthesis", type: "local" });
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

    // ── simulate_decision_paths (Monte Carlo) results ──
    if (sr.toolName === "simulate_decision_paths") {
      const sim = raw?.summary;
      if (sim) {
        // IB three-case model: bull (p90), base (median), bear (p10)
        const bull = raw?.bestPath;
        const bear = raw?.worstPath;
        signals.push({ name: `Monte Carlo: ${sim.successRate} success rate across ${sim.paths} paths`, direction: "neutral", impact: "high" });
        signals.push({ name: `Base case payoff: ${sim.medianPayoff} (80% CI: ${sim.confidenceInterval})`, direction: "neutral", impact: "high" });
        if (bull) signals.push({ name: `Bull case: ${bull.payoff} revenue at ${bull.marketShare} market share`, direction: "up", impact: "high" });
        if (bear) signals.push({ name: `Bear case: ${bear.payoff} — ${bear.outcome}`, direction: "down", impact: "high" });
        // Decision sensitivity → risks
        for (const d of (raw?.decisionSensitivity ?? [])) {
          risks.push({ title: `Decision: ${d.decision}`, description: `Best choice: "${d.bestChoice}" (${d.impact} vs average). Wrong choice here materially affects outcomes.` });
        }
        answerParts.push(`Monte Carlo simulation (${sim.paths}, ${sim.horizon}): ${sim.successRate} success rate. Base case payoff ${sim.medianPayoff}. Survival rate ${sim.survivalRate}, failure rate ${sim.failureRate}.`);
        sources.push({ label: `Monte Carlo simulation (${sim.paths})`, type: "local" });
      }
    }

    // ── Generic fallback: extract any summary from unknown tools ──
    if (!["web_search", "run_recon", "founder_local_gather", "enrich_entity"].includes(sr.toolName) && !sr.toolName.startsWith("founder_local")) {
      const summary = raw?.summary ?? raw?.answer ?? raw?.result ?? raw?.output ?? raw?.briefing;
      if (typeof summary === "string" && summary.length > 10) {
        answerParts.push(summary.slice(0, 300));
        sources.push({ label: summary.slice(0, 40), type: "local" });
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
      `What are the specific drivers behind ${entityName}'s recent growth or decline?`,
      risks.length > 0 ? `How likely is "${risks[0]?.title}" to materialize, and what would trigger it?` : `What are the biggest threats to ${entityName}'s market position?`,
      comparables.length > 0 ? `How does ${entityName} compare to ${comparables[0]?.name} on unit economics and retention?` : `Who are ${entityName}'s most dangerous competitors and why?`,
      `What would make you change your thesis on ${entityName} — what data would you need to see?`,
    ],
    sources: sources.slice(0, 8),
  };
}
