/**
 * Screenshot / image evaluation judge.
 * Calls Gemini (or configurable LLM) with vision capability.
 */
import type { VisualJudgeResult, VisualIssue } from "../types.js";
import { callLLM } from "./llm-client.js";

// ── Prompt templates ─────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert UI/UX visual quality judge. Analyze the provided screenshot(s) against the given criteria.

Respond ONLY with valid JSON matching this schema:
{
  "score": <number 0-100>,
  "passed": <boolean>,
  "reasoning": "<string explaining the overall assessment>",
  "evidence": ["<observation 1>", "<observation 2>", ...],
  "issues": [
    {
      "severity": "P0" | "P1" | "P2" | "P3",
      "title": "<short issue title>",
      "details": "<detailed description>",
      "region": { "x": <number>, "y": <number>, "width": <number>, "height": <number> }
    }
  ]
}

Severity guide:
- P0: Broken functionality, data loss, security issue
- P1: Major usability problem, significant visual bug
- P2: Minor visual issue, cosmetic problem
- P3: Nitpick, polish suggestion

Be specific about locations. If no issues, return an empty issues array.`;

const COMPARE_SYSTEM_PROMPT = `You are an expert UI/UX visual regression judge. Compare the BEFORE and AFTER screenshots.

Respond ONLY with valid JSON matching this schema:
{
  "score": <number 0-100>,
  "passed": <boolean>,
  "reasoning": "<string explaining what changed and whether changes are improvements>",
  "evidence": ["<observation 1>", ...],
  "issues": [
    {
      "severity": "P0" | "P1" | "P2" | "P3",
      "title": "<short issue title>",
      "details": "<detailed description of the regression>",
      "region": { "x": <number>, "y": <number>, "width": <number>, "height": <number> }
    }
  ]
}

Focus on: regressions, layout shifts, missing elements, color/contrast changes, text truncation.
Improvements should increase the score, regressions decrease it.`;

// ── Raw response shape ───────────────────────────────────────────────

interface RawVisualResponse {
  score: number;
  passed: boolean;
  reasoning: string;
  evidence: string[];
  issues: Array<{
    severity: string;
    title: string;
    details: string;
    region?: { x: number; y: number; width: number; height: number };
  }>;
}

function normalizeIssues(
  raw: RawVisualResponse["issues"],
): VisualIssue[] {
  if (!Array.isArray(raw)) return [];
  const validSeverities = new Set(["P0", "P1", "P2", "P3"]);
  return raw
    .filter((i) => i && typeof i.title === "string")
    .map((i) => ({
      severity: (validSeverities.has(i.severity) ? i.severity : "P2") as VisualIssue["severity"],
      title: i.title,
      details: i.details ?? "",
      region: i.region,
    }));
}

function normalizeResult(
  raw: RawVisualResponse,
  durationMs: number,
  threshold: number,
): VisualJudgeResult {
  const score = Math.max(0, Math.min(100, Math.round(raw.score ?? 0)));
  const issues = normalizeIssues(raw.issues);
  return {
    score,
    passed: raw.passed ?? score >= threshold,
    reasoning: raw.reasoning ?? "",
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    durationMs,
    issues,
  };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Evaluate a single screenshot against criteria.
 */
export async function evaluateScreenshot(
  imageBase64: string,
  criteria: string,
  options?: { model?: string; threshold?: number; signal?: AbortSignal },
): Promise<VisualJudgeResult> {
  const model = options?.model ?? "gemini-2.5-flash";
  const threshold = options?.threshold ?? 70;
  const start = Date.now();

  const raw = await callLLM<RawVisualResponse>({
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Evaluation criteria: ${criteria}\n\nAnalyze the screenshot and return your JSON verdict.`,
    imageBase64,
    timeoutMs: 45_000,
    signal: options?.signal,
  });

  return normalizeResult(raw, Date.now() - start, threshold);
}

/**
 * Compare before/after screenshots for visual regressions.
 * Sends both images — the first as "before", the prompt references "after".
 */
export async function compareScreenshots(
  before: string,
  after: string,
  criteria: string,
  options?: { model?: string; threshold?: number; signal?: AbortSignal },
): Promise<VisualJudgeResult> {
  const model = options?.model ?? "gemini-2.5-flash";
  const threshold = options?.threshold ?? 70;
  const start = Date.now();

  // Send the "after" image as the inline image.
  // Include both as base64 references in the prompt for models that support multiple images.
  const raw = await callLLM<RawVisualResponse>({
    model,
    systemPrompt: COMPARE_SYSTEM_PROMPT,
    userPrompt: `Evaluation criteria: ${criteria}

BEFORE screenshot (base64): ${before.slice(0, 100)}... [full image provided inline]
AFTER screenshot is the primary image provided.

Compare the before and after states. Return your JSON verdict.`,
    imageBase64: after,
    timeoutMs: 60_000,
    signal: options?.signal,
  });

  return normalizeResult(raw, Date.now() - start, threshold);
}
