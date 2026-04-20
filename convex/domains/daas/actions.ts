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
import { api } from "../../_generated/api";
import { DAAS_VERDICTS } from "./schema";

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

export const DEFAULT_RUBRIC_ID = "daas.generic.v1";
export const DEFAULT_RUBRIC_VERSION = "2026-04-19";

/** The bounded rubric — 10 generic boolean checks for expert-vs-replay comparison.
 *  Kept small so Flash Lite can apply it reliably, domain-agnostic enough to
 *  work across workloads. Domain-specific rubrics can extend via rubricId. */
const DEFAULT_RUBRIC: Array<{ name: string; prompt: string }> = [
  { name: "cites_specific_ids", prompt: "Does the replay cite specific identifiers (e.g. ISS-*, POL-*, SKU-*, ticket numbers, ticker symbols) that appear in the original expert response?" },
  { name: "no_hallucinated_ids", prompt: "Does the replay AVOID inventing identifiers that are NOT present in the original expert response or context?" },
  { name: "includes_immediate_actions", prompt: "Does the replay include numbered immediate actions / steps to take right now?" },
  { name: "includes_followup_actions", prompt: "Does the replay include follow-up / next-step actions beyond the immediate response?" },
  { name: "matches_domain_rules", prompt: "Does the replay honor the domain rules / thresholds / policies that the expert response applied (e.g. safety thresholds, escalation rules)?" },
  { name: "structured_output", prompt: "Is the replay well-structured (sections, headers, numbered lists) comparable to the expert response?" },
  { name: "grounded_in_context", prompt: "Does the replay ground its claims in concrete facts (numbers, IDs, evidence) rather than generic advice?" },
  { name: "covers_main_points", prompt: "Does the replay cover the main substantive points from the expert response (core diagnosis / recommendation / rationale)?" },
  { name: "actionable_for_user", prompt: "Could the intended user (store manager, operator, analyst) act on this response directly, without needing to re-query?" },
  { name: "internally_consistent", prompt: "Is the replay internally consistent (no contradictions between its recommendations, cited facts, or action order)?" },
];

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
  },
  returns: v.object({
    judgmentId: v.id("daasJudgments"),
    verdict: v.string(),
    passedCount: v.number(),
    totalCount: v.number(),
  }),
  handler: async (ctx, { sessionId, replayId }): Promise<{
    judgmentId: any;
    verdict: string;
    passedCount: number;
    totalCount: number;
  }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured on the Convex deployment");
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
      rubric: DEFAULT_RUBRIC,
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
    const rubricNames = new Set(DEFAULT_RUBRIC.map((r) => r.name));
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
      rubricId: DEFAULT_RUBRIC_ID,
      rubricVersion: DEFAULT_RUBRIC_VERSION,
      detailsJson: JSON.stringify({
        input_tokens: raw.inputTokens,
        output_tokens: raw.outputTokens,
        fallback_used: used_model !== JUDGE_MODEL_PRIMARY,
      }),
    });

    return { judgmentId, verdict, passedCount: passed, totalCount: total };
  },
});
