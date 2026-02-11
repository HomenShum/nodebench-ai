import type { TextLlmClient } from "./textLlm.js";

function normalizeBasic(value: string): string {
  return String(value ?? "")
    .trim()
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .replace(/^["']|["']$/g, "")
    .replace(/[.]+$/g, "")
    .toLowerCase();
}

const SIMPLE_NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function tryParseLeadingInt(text: string): number | null {
  const m = String(text ?? "").match(/-?\d+/);
  if (!m) return null;
  const n = Number.parseInt(m[0], 10);
  return Number.isFinite(n) ? n : null;
}

function expectedIsStrictInt(expectedNorm: string): boolean {
  return /^-?\d+$/.test(expectedNorm);
}

/**
 * GAIA capability scoring helper (deterministic, synchronous).
 *
 * Conservative rules:
 * - Case/whitespace normalization for all answers
 * - For integer-only expected answers: leading integer extraction + number words
 */
export function answersMatch(expectedRaw: string, actualRaw: string): boolean {
  const expected = normalizeBasic(expectedRaw);
  const actual = normalizeBasic(actualRaw);
  if (!expected) return false;

  if (expectedIsStrictInt(expected)) {
    const expectedInt = Number.parseInt(expected, 10);
    const actualInt = tryParseLeadingInt(actual);
    if (actualInt !== null) return actualInt === expectedInt;

    const word = SIMPLE_NUMBER_WORDS[actual];
    if (typeof word === "number") return word === expectedInt;
    return false;
  }

  return actual === expected;
}

// ---------- LLM Judge ----------

const JUDGE_SYSTEM_PROMPT = `You are a strict but fair answer-equivalence judge for the GAIA benchmark.

Given:
- EXPECTED: the ground-truth answer
- ACTUAL: the candidate answer

Decide whether ACTUAL is semantically equivalent to EXPECTED.

Rules:
1. MATCH if both convey the same factual content, even with:
   - Minor typos or spelling variations (e.g. "Ploybius" vs "Polybius")
   - Different punctuation, capitalization, or trailing periods
   - Reworded but equivalent phrasing (e.g. "85 points" vs "85")
   - Number format variations (e.g. "1,000" vs "1000")
2. NO MATCH if:
   - The factual content differs (different numbers, names, dates)
   - One answer is a subset but missing key information
   - The answers are about different things entirely

Respond with ONLY a single JSON object:
{"match": true, "reason": "brief explanation"}
or
{"match": false, "reason": "brief explanation"}`;

export type AnswerJudgeResult = {
  /** Deterministic tier matched (no LLM call needed) */
  deterministicMatch: boolean;
  /** LLM judge was invoked */
  judgeInvoked: boolean;
  /** Which judge provider was used */
  judgeProvider?: string;
  /** Final verdict: match or no match */
  match: boolean;
  /** Judge reasoning (only if LLM was invoked) */
  reason?: string;
};

// ---------- OpenRouter free model auto-discovery ----------

/**
 * Free models on OpenRouter (ordered by preference for judge tasks).
 * These require an OPENROUTER_API_KEY but cost $0.
 */
const OPENROUTER_FREE_MODELS = [
  "google/gemini-3-flash:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

let _cachedFreeJudge: TextLlmClient | null | "unavailable" = null;

/**
 * Try to create a free OpenRouter judge client.
 * Uses OpenAI-compatible API. Returns null if no API key or all models fail.
 */
async function tryCreateOpenRouterFreeJudge(): Promise<TextLlmClient | null> {
  if (_cachedFreeJudge === "unavailable") return null;
  if (_cachedFreeJudge) return _cachedFreeJudge;

  const apiKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_KEY ||
    "";
  if (!apiKey) {
    _cachedFreeJudge = "unavailable";
    return null;
  }

  // Probe the first available model with a tiny request
  for (const model of OPENROUTER_FREE_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://github.com/nodebench/nodebench-ai",
          "X-Title": "nodebench-gaia-judge",
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with only: OK" }],
          temperature: 0,
          max_tokens: 5,
        }),
      });

      if (!response.ok) continue;

      const data = (await response.json()) as any;
      const text = data?.choices?.[0]?.message?.content ?? "";
      if (!text) continue;

      // Model works — create a reusable client
      const client: TextLlmClient = {
        provider: "openrouter" as any,
        model,
        generateText: async ({ prompt, temperature, maxOutputTokens }) => {
          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://github.com/nodebench/nodebench-ai",
              "X-Title": "nodebench-gaia-judge",
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: prompt }],
              temperature: typeof temperature === "number" ? temperature : 0,
              max_tokens: typeof maxOutputTokens === "number" ? maxOutputTokens : 200,
            }),
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            throw new Error(`OpenRouter ${res.status}: ${errText.slice(0, 200)}`);
          }
          const json = (await res.json()) as any;
          return String(json?.choices?.[0]?.message?.content ?? "").trim();
        },
      };

      _cachedFreeJudge = client;
      return client;
    } catch {
      continue;
    }
  }

  _cachedFreeJudge = "unavailable";
  return null;
}

/**
 * Auto-discover the best available judge client.
 *
 * Priority:
 *   1. OpenRouter free model ($0, just needs OPENROUTER_API_KEY)
 *   2. Provided paid LLM client (Gemini/OpenAI/Anthropic)
 *   3. null (deterministic-only fallback)
 */
export async function autoDiscoverJudge(
  paidFallback?: TextLlmClient | null,
): Promise<TextLlmClient | null> {
  // Try free first
  const free = await tryCreateOpenRouterFreeJudge();
  if (free) return free;

  // Fall back to paid client (if available and not a noop)
  if (paidFallback && paidFallback.provider !== "none") return paidFallback;

  return null;
}

/**
 * Tiered answer matching: deterministic first, LLM judge fallback.
 *
 * Tier 0 (instant, free): `answersMatch()` — normalization + integer fuzzy
 * Tier 1 (async, free):   OpenRouter free model judge — semantic equivalence
 * Tier 2 (async, paid):   Provided LLM client — semantic equivalence
 * Tier 3 (instant, free): No API key → deterministic only
 *
 * If no `judge` client is provided, auto-discovers via `autoDiscoverJudge()`.
 */
export async function answersMatchWithJudge(
  expectedRaw: string,
  actualRaw: string,
  judge?: TextLlmClient | null,
): Promise<AnswerJudgeResult> {
  // Tier 0: deterministic
  const detMatch = answersMatch(expectedRaw, actualRaw);
  if (detMatch) {
    return { deterministicMatch: true, judgeInvoked: false, match: true };
  }

  // If no actual answer was produced, skip the judge
  const actual = normalizeBasic(actualRaw);
  if (!actual) {
    return { deterministicMatch: false, judgeInvoked: false, match: false };
  }

  // Resolve judge: use provided client or auto-discover
  const resolvedJudge = judge !== undefined ? judge : await autoDiscoverJudge();
  if (!resolvedJudge || (resolvedJudge as any).provider === "none") {
    return { deterministicMatch: false, judgeInvoked: false, match: false };
  }

  try {
    const prompt = [
      JUDGE_SYSTEM_PROMPT,
      "",
      `EXPECTED: ${expectedRaw}`,
      `ACTUAL: ${actualRaw}`,
    ].join("\n");

    const response = await resolvedJudge.generateText({
      prompt,
      temperature: 0,
      maxOutputTokens: 200,
    });

    const parsed = parseJudgeResponse(response);
    return {
      deterministicMatch: false,
      judgeInvoked: true,
      judgeProvider: `${resolvedJudge.provider}:${resolvedJudge.model}`,
      match: parsed.match,
      reason: parsed.reason,
    };
  } catch (err: any) {
    return {
      deterministicMatch: false,
      judgeInvoked: true,
      judgeProvider: `${resolvedJudge.provider}:${resolvedJudge.model}`,
      match: false,
      reason: `judge error: ${err?.message ?? String(err)}`,
    };
  }
}

function parseJudgeResponse(text: string): { match: boolean; reason: string } {
  const trimmed = String(text ?? "").trim();

  // Try JSON parse
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      if (typeof obj.match === "boolean") {
        return { match: obj.match, reason: String(obj.reason ?? "") };
      }
    } catch {
      // Fall through to heuristic
    }
  }

  // Heuristic fallback
  const lower = trimmed.toLowerCase();
  if (lower.includes('"match": true') || lower.includes('"match":true')) {
    return { match: true, reason: trimmed };
  }
  if (lower.includes('"match": false') || lower.includes('"match":false')) {
    return { match: false, reason: trimmed };
  }

  // Conservative default: no match
  return { match: false, reason: `unparseable judge response: ${trimmed.slice(0, 200)}` };
}
