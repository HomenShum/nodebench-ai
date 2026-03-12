/**
 * LLM-based text evaluation judge.
 * Uses fetch to call Gemini (default) or any configurable LLM endpoint.
 */
import type { JudgeResult, TextJudgeConfig } from "../types.js";
import { callLLM } from "./llm-client.js";

// ── Prompt templates ─────────────────────────────────────────────────

function buildSystemPrompt(config: TextJudgeConfig): string {
  const rubricSection = config.rubric
    ? `\n\nRubric:\n${config.rubric}`
    : "";
  return `You are an expert evaluation judge. Score the given text against the criteria.${rubricSection}

Respond ONLY with valid JSON matching this schema:
{
  "score": <number 0-100>,
  "passed": <boolean>,
  "reasoning": "<string explaining the score>",
  "evidence": ["<supporting evidence 1>", "<supporting evidence 2>", ...]
}

The threshold for passing is ${config.threshold ?? 70}/100.
Be precise and cite specific parts of the text as evidence.`;
}

function buildEvalPrompt(text: string, criteria: string): string {
  return `Criteria: ${criteria}

Text to evaluate:
---
${text}
---

Evaluate the text against the criteria. Return your JSON verdict.`;
}

function buildPairPrompt(
  expected: string,
  actual: string,
  criteria: string,
): string {
  return `Criteria: ${criteria}

Expected output:
---
${expected}
---

Actual output:
---
${actual}
---

Compare the actual output against the expected output using the criteria. Return your JSON verdict.`;
}

// ── Raw response shape ───────────────────────────────────────────────

interface RawJudgeResponse {
  score: number;
  passed: boolean;
  reasoning: string;
  evidence: string[];
}

function normalizeResponse(
  raw: RawJudgeResponse,
  threshold: number,
  durationMs: number,
): JudgeResult {
  const score = Math.max(0, Math.min(100, Math.round(raw.score)));
  return {
    score,
    passed: raw.passed ?? score >= threshold,
    reasoning: raw.reasoning ?? "",
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    durationMs,
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Evaluate a single text against criteria.
 */
export async function evaluateText(
  text: string,
  config: TextJudgeConfig,
  signal?: AbortSignal,
): Promise<JudgeResult> {
  const threshold = config.threshold ?? 70;
  const model = config.model ?? "gemini-2.5-flash";
  const start = Date.now();

  const raw = await callLLM<RawJudgeResponse>({
    model,
    systemPrompt: buildSystemPrompt(config),
    userPrompt: buildEvalPrompt(text, config.criteria),
    timeoutMs: 30_000,
    signal,
  });

  return normalizeResponse(raw, threshold, Date.now() - start);
}

/**
 * Evaluate actual text against expected text.
 */
export async function evaluatePair(
  expected: string,
  actual: string,
  config: TextJudgeConfig,
  signal?: AbortSignal,
): Promise<JudgeResult> {
  const threshold = config.threshold ?? 70;
  const model = config.model ?? "gemini-2.5-flash";
  const start = Date.now();

  const raw = await callLLM<RawJudgeResponse>({
    model,
    systemPrompt: buildSystemPrompt(config),
    userPrompt: buildPairPrompt(expected, actual, config.criteria),
    timeoutMs: 30_000,
    signal,
  });

  return normalizeResponse(raw, threshold, Date.now() - start);
}

/**
 * Evaluate multiple items in parallel with concurrency control.
 */
export async function batchEvaluate(
  items: Array<{ text: string; config: TextJudgeConfig }>,
  options?: { concurrency?: number; signal?: AbortSignal },
): Promise<JudgeResult[]> {
  const concurrency = options?.concurrency ?? 4;
  const results: JudgeResult[] = new Array(items.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const idx = cursor++;
      const item = items[idx];
      results[idx] = await evaluateText(item.text, item.config, options?.signal);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}
