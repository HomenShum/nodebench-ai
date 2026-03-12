/**
 * Video clip evaluation judge.
 * Calls Gemini with video capability for interaction / UX review.
 */
import type { VideoJudgeResult, VisualIssue, InteractionIssue } from "../types.js";
import { callLLM } from "./llm-client.js";

// ── Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert UI/UX interaction quality judge. Analyze the provided video clip for usability, visual quality, and interaction issues.

Respond ONLY with valid JSON matching this schema:
{
  "score": <number 0-100>,
  "passed": <boolean>,
  "reasoning": "<string explaining the overall assessment>",
  "evidence": ["<observation 1>", ...],
  "clipDurationMs": <estimated duration in ms>,
  "framesAnalyzed": <estimated number of distinct frames you examined>,
  "issues": [
    {
      "severity": "P0" | "P1" | "P2" | "P3",
      "title": "<short issue title>",
      "details": "<detailed description>",
      "region": { "x": <number>, "y": <number>, "width": <number>, "height": <number> }
    }
  ],
  "interactionIssues": [
    {
      "timestampMs": <approximate timestamp in ms>,
      "description": "<what went wrong at this moment>",
      "severity": "P0" | "P1" | "P2" | "P3"
    }
  ]
}

Focus on: layout shifts, flickering, unresponsive interactions, animation jank, loading states, error states, accessibility.
Severity guide:
- P0: Broken functionality, crash, data loss
- P1: Major jank, unresponsive > 500ms, significant visual glitch
- P2: Minor animation issue, brief flicker, cosmetic
- P3: Polish suggestion`;

// ── Raw response ─────────────────────────────────────────────────────

interface RawVideoResponse {
  score: number;
  passed: boolean;
  reasoning: string;
  evidence: string[];
  clipDurationMs: number;
  framesAnalyzed: number;
  issues: Array<{
    severity: string;
    title: string;
    details: string;
    region?: { x: number; y: number; width: number; height: number };
  }>;
  interactionIssues: Array<{
    timestampMs: number;
    description: string;
    severity: string;
  }>;
}

function normalizeIssues(
  raw: RawVideoResponse["issues"],
): VisualIssue[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(["P0", "P1", "P2", "P3"]);
  return raw
    .filter((i) => i && typeof i.title === "string")
    .map((i) => ({
      severity: (valid.has(i.severity) ? i.severity : "P2") as VisualIssue["severity"],
      title: i.title,
      details: i.details ?? "",
      region: i.region,
    }));
}

function normalizeInteractionIssues(
  raw: RawVideoResponse["interactionIssues"],
): InteractionIssue[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set(["P0", "P1", "P2", "P3"]);
  return raw
    .filter((i) => i && typeof i.description === "string")
    .map((i) => ({
      timestampMs: typeof i.timestampMs === "number" ? i.timestampMs : 0,
      description: i.description,
      severity: (valid.has(i.severity) ? i.severity : "P2") as InteractionIssue["severity"],
    }));
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Evaluate a video clip for interaction quality.
 * The videoUrl should be a Gemini-compatible file URI (uploaded via Files API)
 * or a publicly accessible URL.
 */
export async function evaluateVideoClip(
  videoUrl: string,
  criteria: string,
  options?: { model?: string; threshold?: number; signal?: AbortSignal },
): Promise<VideoJudgeResult> {
  const model = options?.model ?? "gemini-2.5-flash";
  const threshold = options?.threshold ?? 70;
  const start = Date.now();

  const raw = await callLLM<RawVideoResponse>({
    model,
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: `Evaluation criteria: ${criteria}\n\nAnalyze the video clip and return your JSON verdict.`,
    videoUrl,
    timeoutMs: 90_000,
    signal: options?.signal,
  });

  const score = Math.max(0, Math.min(100, Math.round(raw.score ?? 0)));
  return {
    score,
    passed: raw.passed ?? score >= threshold,
    reasoning: raw.reasoning ?? "",
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    durationMs: Date.now() - start,
    issues: normalizeIssues(raw.issues),
    clipDurationMs: typeof raw.clipDurationMs === "number" ? raw.clipDurationMs : 0,
    framesAnalyzed: typeof raw.framesAnalyzed === "number" ? raw.framesAnalyzed : 0,
    interactionIssues: normalizeInteractionIssues(raw.interactionIssues),
  };
}
