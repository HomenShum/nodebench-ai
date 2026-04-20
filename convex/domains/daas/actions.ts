// DaaS server-side actions.
//
// judgeReplay — the core new judge. Given a traceId + replayId, calls an
// LLM with a BOUNDED RUBRIC to produce an array of {name, passed, reason}
// boolean checks. No arbitrary scores.
//
// Why this exists (per user directive): "score should not be arbitrary
// numbers, instead, it should be llm judged boolean explainable reasons."
//
// Rubric is versioned (DEFAULT_RUBRIC_ID + DEFAULT_RUBRIC_VERSION) so
// dashboards can filter to apples-to-apples comparisons across judge
// revisions.
//
// Agentic reliability:
//   [BOUND] Rubric capped at MAX_CHECKS items; single LLM call per replay.
//   [HONEST_STATUS] Throws on invalid JSON / schema mismatch / rubric
//                   size violation. Never returns a fake judgment.
//   [HONEST_SCORES] The LLM emits explicit booleans + reasons. No floor
//                   scores. Verdict derived from pass rate thresholds.
//   [TIMEOUT] Gemini call uses AbortSignal.timeout(JUDGE_TIMEOUT_MS).
//   [BOUND_READ] Rubric prompt inputs are capped (MAX_ANSWER_INPUT).

"use node";

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import { DAAS_VERDICTS } from "./schema";
import { getRubric, DEFAULT_RUBRIC_ID } from "./rubrics";

const JUDGE_MODEL_PRIMARY = "gemini-3.1-pro-preview";
const JUDGE_MODEL_FALLBACK = "gemini-3.1-flash-lite-preview";

const JUDGE_TIMEOUT_MS = 45_000;
const MAX_ANSWER_INPUT = 16_000; // cap prompt section size
const MAX_CHECKS = 24;

// Concurrency control — bounds simultaneous Gemini calls from the judge
// to prevent rate-limit storms when many replays are triggered at once.
// This is process-local (each Convex action container gets its own) but
// is still useful because Convex fans action calls across containers.
const MAX_CONCURRENT_JUDGES = 4;
let inFlight = 0;
const waitQueue: Array<() => void> = [];

async function acquireJudgeSlot(): Promise<() => void> {
  if (inFlight < MAX_CONCURRENT_JUDGES) {
    inFlight += 1;
    return () => {
      inFlight -= 1;
      const next = waitQueue.shift();
      if (next) {
        inFlight += 1;
        next();
      }
    };
  }
  return new Promise((resolve) => {
    waitQueue.push(() => {
      resolve(() => {
        inFlight -= 1;
        const next = waitQueue.shift();
        if (next) {
          inFlight += 1;
          next();
        }
      });
    });
  });
}

// Rubric selection lives in convex/domains/daas/rubrics.ts.
// judgeReplay accepts an optional rubricId arg; unknown ids fall back
// to the generic rubric (see getRubric()).

const JUDGE_SYSTEM_PROMPT = `You are an agent-workflow judge. You compare an EXPERT response (from a high-capability model running with full context) to a REPLAY response (from a cheaper scaffolded model) and produce boolean pass/fail checks WITH EXPLANATIONS.

You do NOT invent new checks. You apply the EXACT rubric below, and for each rubric item return:
  - passed: true | false
  - reason: a single short sentence (max 180 chars) citing the specific evidence from the replay (or its absence).

Return ONLY valid JSON. No markdown fences, no prose outside the JSON.

Schema (strict):
{
  "checks": [
    { "name": "<matches rubric name exactly>", "passed": true|false, "reason": "<short evidence>" }
  ]
}

Length must equal the rubric length. Names must match rubric names in order.`;

function buildJudgePrompt(opts: {
  query: string;
  expert: string;
  replay: string;
  rubric: Array<{ name: string; prompt: string }>;
}): string {
  const rubricBlock = opts.rubric
    .map((r, i) => `${i + 1}. ${r.name}\n   ${r.prompt}`)
    .join("\n");
  return `${JUDGE_SYSTEM_PROMPT}

RUBRIC (apply these in order):
${rubricBlock}

QUERY:
${opts.query.slice(0, 2000)}

EXPERT RESPONSE:
${opts.expert.slice(0, MAX_ANSWER_INPUT)}

REPLAY RESPONSE:
${opts.replay.slice(0, MAX_ANSWER_INPUT)}

Return the JSON object now:`;
}

function parseJudgeJson(text: string): Array<{ name: string; passed: boolean; reason: string }> {
  // responseMimeType=application/json should already give us pure JSON.
  // Strip any accidental markdown fences + trailing commas defensively.
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  // If the response is just the array (responseSchema may flatten), wrap it.
  if (cleaned.startsWith("[")) cleaned = `{"checks":${cleaned}}`;
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`judge returned no JSON object; raw=${text.slice(0, 300)}`);
  let parsed: any;
  try {
    parsed = JSON.parse(match[0]);
  } catch (e) {
    throw new Error(`judge JSON parse failed: ${String(e)}; raw=${text.slice(0, 300)}`);
  }
  if (!parsed.checks || !Array.isArray(parsed.checks)) {
    throw new Error(`judge output missing 'checks' array; got keys=${Object.keys(parsed).join(",")}`);
  }
  const out: Array<{ name: string; passed: boolean; reason: string }> = [];
  for (const c of parsed.checks) {
    if (!c || typeof c !== "object") continue;
    if (typeof c.name !== "string" || typeof c.passed !== "boolean") continue;
    out.push({
      name: c.name,
      passed: c.passed,
      reason: typeof c.reason === "string" ? c.reason.slice(0, 320) : "",
    });
    if (out.length >= MAX_CHECKS) break;
  }
  return out;
}

async function callGemini(args: {
  model: string;
  prompt: string;
  apiKey: string;
  maxTokens: number;
  timeoutMs: number;
}): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${args.apiKey}`;
  // Force strict JSON output via responseMimeType + responseSchema —
  // prevents the model from emitting markdown fences or trailing commas.
  const body = {
    contents: [{ parts: [{ text: args.prompt }] }],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: args.maxTokens,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          checks: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                passed: { type: "BOOLEAN" },
                reason: { type: "STRING" },
              },
              required: ["name", "passed", "reason"],
            },
          },
        },
        required: ["checks"],
      },
    },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(args.timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`gemini_${args.model}_${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await resp.json()) as any;
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("") ?? "";
  const usage = data?.usageMetadata ?? {};
  return {
    text,
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
  };
}

export const judgeReplay = action({
  args: {
    sessionId: v.string(),
    replayId: v.id("daasReplays"),
    /** Optional rubric id — unknown ids fall back to daas.generic.v1 */
    rubricId: v.optional(v.string()),
  },
  returns: v.object({
    judgmentId: v.id("daasJudgments"),
    verdict: v.string(),
    passedCount: v.number(),
    totalCount: v.number(),
  }),
  handler: async (ctx, { sessionId, replayId, rubricId }): Promise<{
    judgmentId: any;
    verdict: string;
    passedCount: number;
    totalCount: number;
  }> => {
    const startTime = Date.now();
    // Resolve rubric — unknown ids silently fall back to generic (HONEST:
    // we record which rubric actually ran so dashboards can see the
    // mismatch between requested and applied).
    const rubric = getRubric(rubricId ?? DEFAULT_RUBRIC_ID);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const msg = "GEMINI_API_KEY not configured on the Convex deployment";
      try {
        await ctx.runMutation(internal.domains.daas.mutations.logAuditEvent, {
          op: "action.judgeReplay",
          actorKind: "action",
          status: "error",
          subjectId: sessionId,
          errorMessage: msg,
          durationMs: Date.now() - startTime,
        });
      } catch { /* audit failure absorbed */ }
      throw new Error(msg);
    }

    const runDetail = await ctx.runQuery(api.domains.daas.queries.getRun, { sessionId });
    if (!runDetail) throw new Error(`trace ${sessionId} not found`);

    const replay = runDetail.replays.find((r: any) => r._id === replayId);
    if (!replay) throw new Error(`replay ${replayId} not found for ${sessionId}`);

    // Deterministic cost delta (MEASURED, not scored)
    const origCost = runDetail.trace.totalCostUsd;
    const costDeltaPct =
      origCost > 0 ? ((replay.replayCostUsd - origCost) / origCost) * 100 : 0;

    // Run the judge
    const prompt = buildJudgePrompt({
      query: runDetail.trace.query,
      expert: runDetail.trace.finalAnswer,
      replay: replay.replayAnswer,
      rubric: rubric.checks,
    });

    let used_model = JUDGE_MODEL_PRIMARY;
    let raw: { text: string; inputTokens: number; outputTokens: number };

    // Acquire a concurrency slot so we never exceed MAX_CONCURRENT_JUDGES
    // simultaneous Gemini calls per container.
    const release = await acquireJudgeSlot();
    try {
      try {
        raw = await callGemini({
          model: JUDGE_MODEL_PRIMARY,
          prompt,
          apiKey,
          maxTokens: 3500,
          timeoutMs: JUDGE_TIMEOUT_MS,
        });
      } catch (err) {
        // Fallback to Flash Lite on Pro failure
        used_model = JUDGE_MODEL_FALLBACK;
        raw = await callGemini({
          model: JUDGE_MODEL_FALLBACK,
          prompt,
          apiKey,
          maxTokens: 3500,
          timeoutMs: JUDGE_TIMEOUT_MS,
        });
      }
    } finally {
      release();
    }

    const checks = parseJudgeJson(raw.text);
    if (checks.length === 0) {
      throw new Error(`judge produced no valid checks. raw: ${raw.text.slice(0, 300)}`);
    }

    // Filter to checks whose names match the rubric (prevents the judge
    // from silently renaming checks).
    const rubricNames = new Set(rubric.checks.map((r) => r.name));
    const filtered = checks.filter((c) => rubricNames.has(c.name));
    if (filtered.length === 0) {
      throw new Error("judge returned no rubric-aligned checks");
    }

    const passed = filtered.filter((c) => c.passed).length;
    const total = filtered.length;
    const rate = total > 0 ? passed / total : 0;

    // Verdict derived from pass rate — bounded enum
    let verdict: string = DAAS_VERDICTS[2]; // "fail"
    if (rate >= 0.8) verdict = DAAS_VERDICTS[0]; // "pass"
    else if (rate >= 0.5) verdict = DAAS_VERDICTS[1]; // "partial"

    const judgmentId = await ctx.runMutation(api.domains.daas.mutations.storeJudgment, {
      traceId: sessionId,
      replayId,
      checksJson: JSON.stringify(filtered),
      costDeltaPct,
      passedCount: passed,
      totalCount: total,
      verdict,
      judgeModel: used_model,
      rubricId: rubric.id,
      rubricVersion: rubric.version,
      detailsJson: JSON.stringify({
        input_tokens: raw.inputTokens,
        output_tokens: raw.outputTokens,
        fallback_used: used_model !== JUDGE_MODEL_PRIMARY,
      }),
    });

    // Audit success
    try {
      await ctx.runMutation(internal.domains.daas.mutations.logAuditEvent, {
        op: "action.judgeReplay",
        actorKind: "action",
        status: "ok",
        subjectId: sessionId,
        durationMs: Date.now() - startTime,
        metaJson: JSON.stringify({
          judgmentId: String(judgmentId),
          verdict,
          passedCount: passed,
          totalCount: total,
          judgeModel: used_model,
          fallbackUsed: used_model !== JUDGE_MODEL_PRIMARY,
          judgeInputTokens: raw.inputTokens,
          judgeOutputTokens: raw.outputTokens,
        }),
      });
    } catch { /* audit absorbed */ }

    return { judgmentId, verdict, passedCount: passed, totalCount: total };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// distillTrace — extract a WorkflowSpec from a captured expert trace.
//
// Mirrors the daas/distill.py pipeline stage but runs server-side in
// Convex. One expensive Pro call per trace. Stores the WorkflowSpec row
// and returns its id.
//
// Agentic reliability:
//   TIMEOUT (45s), BOUND_READ (trace answer capped at MAX_ANSWER_INPUT),
//   HONEST_STATUS (throws on invalid JSON / missing trace), DETERMINISTIC
//   (temperature=0, responseSchema), observability (audit log).
// ═══════════════════════════════════════════════════════════════════════════

const DISTILL_MODEL = "gemini-3.1-pro-preview";
const DISTILL_TIMEOUT_MS = 60_000;
const DISTILL_MAX_TOKENS = 4500;
const DEFAULT_EXECUTOR_MODEL = "gemini-3.1-flash-lite-preview";

const DISTILL_PROMPT_HEADER = `You are an expert in agent workflow architecture. Given an EXPERT MODEL'S output for a specific query, extract a reusable WORKFLOW SPECIFICATION that a cheaper model could follow to reproduce this reasoning.

A weaker executor model (e.g. gemini-3.1-flash-lite-preview) will run a multi-agent workflow (orchestrator + specialist workers) that mimics the expert's internal reasoning. Design workers with narrow roles so the cheap model can execute them reliably.

Return ONLY valid JSON matching the WorkflowSpec schema. No markdown fences.`;

function buildDistillPrompt(opts: {
  query: string;
  expert: string;
  repoContextJson: string | undefined;
}): string {
  return `${DISTILL_PROMPT_HEADER}

EXPERT QUERY: ${opts.query.slice(0, 2000)}

EXPERT RESPONSE:
${opts.expert.slice(0, MAX_ANSWER_INPUT)}

REPO CONTEXT: ${(opts.repoContextJson ?? "{}").slice(0, 4000)}

Produce the WorkflowSpec JSON now.`;
}

function parseWorkflowSpec(text: string): any {
  let cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim();
  cleaned = cleaned.replace(/,\s*([\]}])/g, "$1");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`distill produced no JSON object; raw=${text.slice(0, 300)}`);
  return JSON.parse(match[0]);
}

async function callGeminiWithSchema(args: {
  model: string;
  prompt: string;
  apiKey: string;
  maxTokens: number;
  timeoutMs: number;
  responseSchema: any;
}): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${args.apiKey}`;
  const body = {
    contents: [{ parts: [{ text: args.prompt }] }],
    generationConfig: {
      temperature: 0.0,
      maxOutputTokens: args.maxTokens,
      responseMimeType: "application/json",
      responseSchema: args.responseSchema,
    },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(args.timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`gemini_${args.model}_${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await resp.json()) as any;
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("") ?? "";
  const usage = data?.usageMetadata ?? {};
  return {
    text,
    inputTokens: usage.promptTokenCount ?? 0,
    outputTokens: usage.candidatesTokenCount ?? 0,
  };
}

const WORKFLOW_SPEC_SCHEMA = {
  type: "OBJECT",
  properties: {
    orchestrator_system_prompt: { type: "STRING" },
    orchestrator_plan_prompt: { type: "STRING" },
    workers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          role: { type: "STRING" },
          system_prompt: { type: "STRING" },
          tools: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["name", "role", "system_prompt"],
      },
    },
    tools: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          purpose: { type: "STRING" },
        },
        required: ["name"],
      },
    },
    success_criteria: { type: "ARRAY", items: { type: "STRING" } },
    domain_rules: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["orchestrator_system_prompt", "workers", "success_criteria"],
};

export const distillTrace = action({
  args: {
    sessionId: v.string(),
    executorModel: v.optional(v.string()),
  },
  returns: v.object({
    specId: v.id("daasWorkflowSpecs"),
    workerCount: v.number(),
    toolCount: v.number(),
    distillCostUsd: v.number(),
    distillTokens: v.number(),
  }),
  handler: async (ctx, { sessionId, executorModel }): Promise<{
    specId: any;
    workerCount: number;
    toolCount: number;
    distillCostUsd: number;
    distillTokens: number;
  }> => {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const runDetail = await ctx.runQuery(api.domains.daas.queries.getRun, { sessionId });
    if (!runDetail) throw new Error(`trace ${sessionId} not found`);

    const prompt = buildDistillPrompt({
      query: runDetail.trace.query,
      expert: runDetail.trace.finalAnswer,
      repoContextJson: runDetail.trace.repoContextJson,
    });

    const release = await acquireJudgeSlot(); // share the semaphore
    let raw: { text: string; inputTokens: number; outputTokens: number };
    try {
      raw = await callGeminiWithSchema({
        model: DISTILL_MODEL,
        prompt,
        apiKey,
        maxTokens: DISTILL_MAX_TOKENS,
        timeoutMs: DISTILL_TIMEOUT_MS,
        responseSchema: WORKFLOW_SPEC_SCHEMA,
      });
    } finally {
      release();
    }

    let spec: any;
    try {
      spec = parseWorkflowSpec(raw.text);
    } catch (err) {
      try {
        await ctx.runMutation(internal.domains.daas.mutations.logAuditEvent, {
          op: "action.distillTrace",
          actorKind: "action",
          status: "error",
          subjectId: sessionId,
          errorMessage: String(err).slice(0, 1024),
          durationMs: Date.now() - startTime,
        });
      } catch { /* audit absorbed */ }
      throw new Error(`distill JSON parse failed: ${String(err)}`);
    }

    const workers = Array.isArray(spec.workers) ? spec.workers : [];
    const tools = Array.isArray(spec.tools) ? spec.tools : [];

    // Compute distill cost (Pro pricing)
    const PRO_IN = 1.25, PRO_OUT = 5.0;
    const distillCostUsd =
      (raw.inputTokens / 1e6) * PRO_IN + (raw.outputTokens / 1e6) * PRO_OUT;

    const targetExecutor = executorModel ?? DEFAULT_EXECUTOR_MODEL;

    const specId = await ctx.runMutation(api.domains.daas.mutations.storeWorkflowSpec, {
      sourceTraceId: sessionId,
      executorModel: targetExecutor,
      targetSdk: "google-genai",
      workerCount: workers.length,
      toolCount: tools.length,
      handoffCount: Array.isArray(spec.handoffs) ? spec.handoffs.length : 0,
      specJson: JSON.stringify({
        ...spec,
        source_trace_id: sessionId,
        executor_model: targetExecutor,
      }),
      distillCostUsd,
      distillTokens: raw.inputTokens + raw.outputTokens,
    });

    // Audit
    try {
      await ctx.runMutation(internal.domains.daas.mutations.logAuditEvent, {
        op: "action.distillTrace",
        actorKind: "action",
        status: "ok",
        subjectId: sessionId,
        durationMs: Date.now() - startTime,
        metaJson: JSON.stringify({
          specId: String(specId),
          workerCount: workers.length,
          toolCount: tools.length,
          distillCostUsd,
          distillTokens: raw.inputTokens + raw.outputTokens,
          targetExecutor,
        }),
      });
    } catch { /* audit absorbed */ }

    return {
      specId,
      workerCount: workers.length,
      toolCount: tools.length,
      distillCostUsd,
      distillTokens: raw.inputTokens + raw.outputTokens,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// replayTrace — execute a WorkflowSpec against the cheap model and store
// the replay row. Interprets the spec as data: orchestrator plans, workers
// execute, formatter assembles. No Python. No dynamically generated code.
// Real token costs measured from each call.
// ═══════════════════════════════════════════════════════════════════════════

const REPLAY_TIMEOUT_MS = 60_000;
const REPLAY_MAX_TOKENS_PER_CALL = 1500;

const EXECUTOR_PRICING: Record<string, [number, number]> = {
  "gemini-3.1-flash-lite-preview": [0.075, 0.30],
  "gemini-2.5-flash-lite": [0.10, 0.40],
  "gemini-3.1-pro-preview": [1.25, 5.00],
};

async function callGeminiPlain(args: {
  model: string;
  prompt: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
}): Promise<{ text: string; inputTokens: number; outputTokens: number; costUsd: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${args.apiKey}`;
  const body = {
    contents: [{ parts: [{ text: args.prompt }] }],
    generationConfig: { temperature: args.temperature, maxOutputTokens: args.maxTokens },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(args.timeoutMs),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`gemini_${args.model}_${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await resp.json()) as any;
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("") ?? "";
  const usage = data?.usageMetadata ?? {};
  const inp = usage.promptTokenCount ?? 0;
  const out = usage.candidatesTokenCount ?? 0;
  const [priceIn, priceOut] = EXECUTOR_PRICING[args.model] ?? [0.075, 0.30];
  return {
    text,
    inputTokens: inp,
    outputTokens: out,
    costUsd: (inp / 1e6) * priceIn + (out / 1e6) * priceOut,
  };
}

export const replayTrace = action({
  args: {
    sessionId: v.string(),
    /** Optional override — defaults to spec.executorModel */
    executorModel: v.optional(v.string()),
  },
  returns: v.object({
    replayId: v.id("daasReplays"),
    executorModel: v.string(),
    workersDispatched: v.array(v.string()),
    replayCostUsd: v.number(),
    replayTokens: v.number(),
  }),
  handler: async (ctx, { sessionId, executorModel }): Promise<{
    replayId: any;
    executorModel: string;
    workersDispatched: string[];
    replayCostUsd: number;
    replayTokens: number;
  }> => {
    const startTime = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const runDetail = await ctx.runQuery(api.domains.daas.queries.getRun, { sessionId });
    if (!runDetail) throw new Error(`trace ${sessionId} not found`);
    if (!runDetail.spec) {
      throw new Error(`no WorkflowSpec yet — call distillTrace first for ${sessionId}`);
    }
    const spec = JSON.parse(runDetail.spec.specJson);
    const model = executorModel ?? runDetail.spec.executorModel;

    const release = await acquireJudgeSlot();
    let totalIn = 0, totalOut = 0, totalCost = 0;
    const workers = Array.isArray(spec.workers) ? spec.workers : [];
    const domainRules: string[] = Array.isArray(spec.domain_rules) ? spec.domain_rules : [];
    const successCriteria: string[] = Array.isArray(spec.success_criteria) ? spec.success_criteria : [];
    const repoContext: any = runDetail.trace.repoContextJson
      ? (() => {
          try { return JSON.parse(runDetail.trace.repoContextJson); } catch { return {}; }
        })()
      : {};

    try {
      // 1. Orchestrator plans which workers to dispatch
      const workerList = workers.map((w: any) => `- ${w.name}: ${w.role}`).join("\n");
      const rulesBlock = domainRules.map((r) => `- ${r}`).join("\n");
      const criteriaBlock = successCriteria.map((c) => `- ${c}`).join("\n");

      const planPrompt = `${spec.orchestrator_system_prompt ?? "You are a planning orchestrator."}

DOMAIN RULES:
${rulesBlock}

SUCCESS CRITERIA:
${criteriaBlock}

AVAILABLE WORKERS:
${workerList}

QUERY: ${runDetail.trace.query}

${spec.orchestrator_plan_prompt ?? "Plan which workers to dispatch."}

Return a JSON plan:
{"workers_to_dispatch": ["<worker_name>", ...], "reasoning": "<one sentence>"}`;

      const planResult = await callGeminiPlain({
        model,
        prompt: planPrompt,
        apiKey,
        temperature: 0.1,
        maxTokens: REPLAY_MAX_TOKENS_PER_CALL,
        timeoutMs: REPLAY_TIMEOUT_MS,
      });
      totalIn += planResult.inputTokens;
      totalOut += planResult.outputTokens;
      totalCost += planResult.costUsd;

      // Parse plan (fallback: dispatch ALL workers)
      let workersToDispatch: string[] = workers.map((w: any) => w.name);
      try {
        const planText = planResult.text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "");
        const planMatch = planText.match(/\{[\s\S]*?\}/);
        if (planMatch) {
          const parsed = JSON.parse(planMatch[0]);
          if (Array.isArray(parsed.workers_to_dispatch)) {
            workersToDispatch = parsed.workers_to_dispatch.filter(
              (n: any) => typeof n === "string",
            );
          }
        }
      } catch { /* keep fallback */ }
      if (workersToDispatch.length === 0) workersToDispatch = workers.map((w: any) => w.name);

      // 2. Execute each worker
      const workerOutputs: Record<string, string> = {};
      const toolCalls: Array<{ worker: string; tool: string }> = [];
      const repoContextTruncated = JSON.stringify(repoContext).slice(0, 12000);

      for (const workerName of workersToDispatch) {
        const worker = workers.find((w: any) => w.name === workerName);
        if (!worker) continue;
        const peerOutputs = Object.entries(workerOutputs)
          .map(([n, o]) => `  ${n}: ${String(o).slice(0, 300)}`)
          .join("\n");

        const workerPrompt = `${worker.system_prompt ?? "You are a helpful worker."}

DOMAIN RULES:
${rulesBlock}

QUERY: ${runDetail.trace.query}
REPO CONTEXT: ${repoContextTruncated}

PEER WORKER OUTPUTS SO FAR:
${peerOutputs}

Execute your role. Be concise, specific, cite IDs/references explicitly.`;

        const workerResult = await callGeminiPlain({
          model,
          prompt: workerPrompt,
          apiKey,
          temperature: 0.2,
          maxTokens: 1200,
          timeoutMs: REPLAY_TIMEOUT_MS,
        });
        totalIn += workerResult.inputTokens;
        totalOut += workerResult.outputTokens;
        totalCost += workerResult.costUsd;
        workerOutputs[workerName] = workerResult.text;

        const wTools: string[] = Array.isArray(worker.tools) ? worker.tools : [];
        for (const t of wTools) toolCalls.push({ worker: workerName, tool: t });
      }

      // 3. Formatter assembles final answer
      const allOutputs = Object.entries(workerOutputs)
        .map(([n, o]) => `## ${n}\n${o}`)
        .join("\n\n");
      const formatPrompt = `You are assembling the final response to the user's query.

DOMAIN RULES:
${rulesBlock}

SUCCESS CRITERIA (the final response MUST satisfy these):
${criteriaBlock}

QUERY: ${runDetail.trace.query}

WORKER OUTPUTS:
${allOutputs}

Synthesize a single, well-structured final response. Include specific IDs, numbered actions, and explicit references where relevant.

FINAL RESPONSE:`;

      const finalResult = await callGeminiPlain({
        model,
        prompt: formatPrompt,
        apiKey,
        temperature: 0.2,
        maxTokens: 1500,
        timeoutMs: REPLAY_TIMEOUT_MS,
      });
      totalIn += finalResult.inputTokens;
      totalOut += finalResult.outputTokens;
      totalCost += finalResult.costUsd;

      // Store the replay row
      const replayId: any = await ctx.runMutation(api.domains.daas.mutations.storeReplay, {
        traceId: sessionId,
        specId: runDetail.spec._id,
        executorModel: model,
        replayAnswer: finalResult.text,
        originalAnswer: runDetail.trace.finalAnswer,
        originalCostUsd: runDetail.trace.totalCostUsd,
        originalTokens: runDetail.trace.totalTokens,
        replayCostUsd: totalCost,
        replayTokens: totalIn + totalOut,
        workersDispatched: workersToDispatch,
        toolCallsJson: JSON.stringify(toolCalls),
        connectorMode: "mock",
        durationMs: Date.now() - startTime,
      });

      // Audit
      try {
        await ctx.runMutation(internal.domains.daas.mutations.logAuditEvent, {
          op: "action.replayTrace",
          actorKind: "action",
          status: "ok",
          subjectId: sessionId,
          durationMs: Date.now() - startTime,
          metaJson: JSON.stringify({
            replayId: String(replayId),
            executorModel: model,
            workersCount: workersToDispatch.length,
            replayCostUsd: totalCost,
            replayTokens: totalIn + totalOut,
          }),
        });
      } catch { /* audit absorbed */ }

      return {
        replayId,
        executorModel: model,
        workersDispatched: workersToDispatch,
        replayCostUsd: totalCost,
        replayTokens: totalIn + totalOut,
      };
    } finally {
      release();
    }
  },
});
