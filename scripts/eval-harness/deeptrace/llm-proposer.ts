/**
 * LLM-Powered Proposer — Real Code Mutation via Claude Sonnet
 *
 * Replaces the simulated nodebench-proposer with actual LLM-driven mutations.
 * Each iteration:
 *   1. Reads DeepTrace source files from the worktree
 *   2. Sends them to Claude Sonnet 4.6 with the baseline metrics and iteration context
 *   3. Receives back: file edits (unified diff or full replacement), estimated metric deltas, rationale
 *   4. Applies edits to the worktree
 *   5. Returns the proposal with cost tracking
 *
 * Contract: export a default function matching OptimizerProposeFn.
 *   (worktreePath: string, baseline: BaselineSnapshot, iteration: number)
 *   => Promise<OptimizerProposal | null>
 */

import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

import type { OptimizerProposal } from "./optimizerRunner.js";
import {
  type BaselineSnapshot,
  type CostEntry,
  computeCostUsd,
} from "./optimizerTypes.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MODEL = "claude-sonnet-4-6-20250514";
const MAX_TOKENS = 8192;

/** DeepTrace files the LLM can read and propose mutations to */
const MUTABLE_FILES = [
  "convex/domains/deepTrace/heuristics.ts",
  "convex/domains/deepTrace/researchCell.ts",
  "convex/domains/deepTrace/dimensionEngine.ts",
  "convex/domains/deepTrace/dimensions.ts",
  "convex/workflows/deepTrace.ts",
] as const;

/** Read-only context files the LLM sees but cannot mutate */
const CONTEXT_FILES = [
  "convex/domains/deepTrace/dimensionModel.ts",
  "convex/domains/deepTrace/schema.ts",
] as const;

/** Strategy focus areas — one per iteration, cycles if iterations > strategies */
const STRATEGY_SEQUENCE = [
  "evidence_gap_fill",
  "counter_hypothesis",
  "dimension_coverage",
  "source_diversification",
  "branch_budget_tuning",
  "prompt_precision",
  "merge_quality",
  "trigger_threshold",
  "deduplication",
  "receipt_completeness",
  "factual_precision",
  "relationship_mapping",
  "causal_chain_quality",
  "wall_clock_optimization",
  "tool_call_reduction",
] as const;

// ---------------------------------------------------------------------------
// File I/O helpers
// ---------------------------------------------------------------------------

function readFileFromWorktree(worktreePath: string, relPath: string): string | null {
  const fullPath = path.join(worktreePath, relPath);
  try {
    return fs.readFileSync(fullPath, "utf-8");
  } catch {
    return null;
  }
}

function writeFileToWorktree(worktreePath: string, relPath: string, content: string): void {
  const fullPath = path.join(worktreePath, relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
}

// ---------------------------------------------------------------------------
// LLM interaction
// ---------------------------------------------------------------------------

interface LLMProposalResponse {
  /** Which file to edit (relative path) */
  edits: Array<{
    filePath: string;
    newContent: string;
  }>;
  /** Estimated metric deltas */
  metricDeltas: {
    taskCompletionRate: number;
    timeToFirstDraftMs: number;
    humanEditDistance: number;
    wallClockMs: number;
    toolCallCount: number;
    factualPrecision: number;
    relationshipPrecision: number;
    evidenceLinkage: number;
    receiptCompleteness: number;
    falseConfidenceRate: number;
    canaryRelativeUplift: number;
  };
  /** Why this change should improve throughput/quality */
  rationale: string;
  /** Candidate label */
  candidateId: string;
}

function buildSystemPrompt(): string {
  return `You are an expert optimizer for the DeepTrace research intelligence system.
Your job: propose targeted code mutations to DeepTrace source files that improve
operator throughput (faster time-to-first-draft, lower human edit distance, higher
task completion) WITHOUT regressing quality (factual precision, evidence linkage,
receipt completeness, false confidence rate).

RULES:
1. Each proposal must change 1-3 files maximum. Small, targeted mutations only.
2. Changes must be syntactically valid TypeScript that compiles.
3. Focus on the strategy area assigned to you for this iteration.
4. Estimate metric deltas honestly — DO NOT inflate numbers. Conservative estimates preferred.
5. Return your response as a single JSON object matching the schema below.

METRIC DELTA CONVENTIONS:
- Positive = improvement for: taskCompletionRate, factualPrecision, relationshipPrecision, evidenceLinkage, receiptCompleteness, canaryRelativeUplift
- Negative = improvement for: timeToFirstDraftMs (faster), humanEditDistance (less editing), wallClockMs (faster), toolCallCount (fewer), falseConfidenceRate (lower is better)
- Typical useful changes produce deltas of 0.01-0.05 for rates, -500 to -2000 for ms, -5 to -30 for edit distance

RESPONSE SCHEMA (JSON only, no markdown fences):
{
  "candidateId": "string — descriptive kebab-case id like 'evidence-gap-prioritization-v1'",
  "rationale": "string — 2-3 sentences explaining the change and expected impact",
  "edits": [
    {
      "filePath": "relative/path/to/file.ts",
      "newContent": "full file content after edit"
    }
  ],
  "metricDeltas": {
    "taskCompletionRate": 0.0,
    "timeToFirstDraftMs": 0,
    "humanEditDistance": 0,
    "wallClockMs": 0,
    "toolCallCount": 0,
    "factualPrecision": 0.0,
    "relationshipPrecision": 0.0,
    "evidenceLinkage": 0.0,
    "receiptCompleteness": 0.0,
    "falseConfidenceRate": 0.0,
    "canaryRelativeUplift": 0.0
  }
}`;
}

function buildUserPrompt(
  baseline: BaselineSnapshot,
  iteration: number,
  strategy: string,
  mutableFileSources: Record<string, string>,
  contextFileSources: Record<string, string>,
): string {
  const baselineJson = JSON.stringify(
    { throughput: baseline.throughputMetrics, quality: baseline.qualityMetrics },
    null,
    2,
  );

  const mutableSection = Object.entries(mutableFileSources)
    .map(([fp, content]) => `### ${fp}\n\`\`\`typescript\n${content}\n\`\`\``)
    .join("\n\n");

  const contextSection = Object.entries(contextFileSources)
    .map(([fp, content]) => `### ${fp} (READ-ONLY context)\n\`\`\`typescript\n${content}\n\`\`\``)
    .join("\n\n");

  return `## Iteration ${iteration} — Strategy Focus: ${strategy}

## Current Baseline Metrics
${baselineJson}

## Quality Guards (must not violate)
- factualPrecision drop ≤ 1pp from baseline
- relationshipPrecision drop ≤ 1pp from baseline
- evidenceLinkage ≥ 0.75
- receiptCompleteness ≥ 0.80
- falseConfidenceRate ≤ 0.10
- canaryRelativeUplift ≥ 0.03

## Mutable Source Files
${mutableSection}

## Context Files (read-only, for understanding)
${contextSection}

Propose a targeted mutation focused on "${strategy}" that improves operator throughput
while maintaining quality guards. Return ONLY the JSON response object.`;
}

// ---------------------------------------------------------------------------
// Proposer
// ---------------------------------------------------------------------------

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

export default async function propose(
  worktreePath: string,
  baseline: BaselineSnapshot,
  iteration: number,
): Promise<OptimizerProposal | null> {
  if (iteration >= STRATEGY_SEQUENCE.length) return null;

  const strategy = STRATEGY_SEQUENCE[iteration % STRATEGY_SEQUENCE.length];
  const costEntries: CostEntry[] = [];

  // 1. Read source files from worktree
  const mutableFileSources: Record<string, string> = {};
  for (const fp of MUTABLE_FILES) {
    const content = readFileFromWorktree(worktreePath, fp);
    if (content) mutableFileSources[fp] = content;
  }

  const contextFileSources: Record<string, string> = {};
  for (const fp of CONTEXT_FILES) {
    const content = readFileFromWorktree(worktreePath, fp);
    if (content) contextFileSources[fp] = content;
  }

  if (Object.keys(mutableFileSources).length === 0) {
    console.warn(`[iter ${iteration}] No mutable files found in worktree, skipping`);
    return null;
  }

  // 2. Call Claude Sonnet for mutation proposal
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(baseline, iteration, strategy, mutableFileSources, contextFileSources);

  let response: LLMProposalResponse;
  try {
    const apiResponse = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // Track cost
    const inputTokens = apiResponse.usage.input_tokens;
    const outputTokens = apiResponse.usage.output_tokens;
    costEntries.push({
      phase: "propose",
      model: MODEL,
      inputTokens,
      outputTokens,
      costUsd: computeCostUsd(MODEL, inputTokens, outputTokens),
      timestamp: new Date().toISOString(),
    });

    // Extract text content
    const textBlock = apiResponse.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.warn(`[iter ${iteration}] No text response from LLM`);
      return null;
    }

    // Parse JSON — strip markdown fences if present
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    response = JSON.parse(jsonText) as LLMProposalResponse;
  } catch (err: unknown) {
    console.error(`[iter ${iteration}] LLM call failed:`, err instanceof Error ? err.message : err);
    return null;
  }

  // 3. Validate edits are within mutable files
  const allowedPaths = new Set<string>(MUTABLE_FILES);
  for (const edit of response.edits) {
    if (!allowedPaths.has(edit.filePath)) {
      console.warn(`[iter ${iteration}] LLM proposed edit to non-mutable file: ${edit.filePath}, skipping`);
      return null;
    }
  }

  // 4. Apply edits to worktree
  for (const edit of response.edits) {
    writeFileToWorktree(worktreePath, edit.filePath, edit.newContent);
  }

  // 5. Build proposal with deltas applied to baseline
  const d = response.metricDeltas;
  const bt = baseline.throughputMetrics;
  const bq = baseline.qualityMetrics;

  return {
    candidateId: response.candidateId || `llm-${strategy}-iter${iteration}`,
    throughput: {
      taskCompletionRate: Math.min(1.0, bt.taskCompletionRate + (d.taskCompletionRate ?? 0)),
      timeToFirstDraftMs: Math.max(0, bt.timeToFirstDraftMs + (d.timeToFirstDraftMs ?? 0)),
      humanEditDistance: Math.max(0, bt.humanEditDistance + (d.humanEditDistance ?? 0)),
      wallClockMs: Math.max(0, bt.wallClockMs + (d.wallClockMs ?? 0)),
      toolCallCount: Math.max(0, bt.toolCallCount + (d.toolCallCount ?? 0)),
    },
    quality: {
      factualPrecision: clamp01(bq.factualPrecision + (d.factualPrecision ?? 0)),
      relationshipPrecision: clamp01(bq.relationshipPrecision + (d.relationshipPrecision ?? 0)),
      evidenceLinkage: clamp01(bq.evidenceLinkage + (d.evidenceLinkage ?? 0)),
      receiptCompleteness: clamp01(bq.receiptCompleteness + (d.receiptCompleteness ?? 0)),
      falseConfidenceRate: clamp01(bq.falseConfidenceRate + (d.falseConfidenceRate ?? 0)),
      canaryRelativeUplift: bq.canaryRelativeUplift + (d.canaryRelativeUplift ?? 0),
    },
    rationale: response.rationale,
    costEntries,
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
