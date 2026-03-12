/**
 * Token and cost tracking.
 * In-memory store with per-model and per-tool breakdowns.
 * No runtime dependencies — pricing is hardcoded for current models.
 */
import type { CostEvent, CostSummary } from "../types.js";

// ── Model pricing (per million tokens, USD) ──────────────────────────

export interface ModelPricing {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

/**
 * Pricing per million tokens for supported models.
 * Sources: official pricing pages as of 2025-Q4 / 2026-Q1.
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic
  "claude-opus-4": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "claude-sonnet-4": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "claude-haiku-3.5": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 },

  // Google
  "gemini-2.5-flash": { input: 0.15, output: 0.60, cacheRead: 0.0375, cacheWrite: 0.15 },
  "gemini-2.5-pro": { input: 1.25, output: 10, cacheRead: 0.3125, cacheWrite: 1.25 },

  // OpenAI
  "gpt-4o": { input: 2.5, output: 10, cacheRead: 1.25, cacheWrite: 2.5 },
  "gpt-4o-mini": { input: 0.15, output: 0.60, cacheRead: 0.075, cacheWrite: 0.15 },
  "o3-mini": { input: 1.10, output: 4.40, cacheRead: 0.55, cacheWrite: 1.10 },
};

/**
 * Compute cost in USD for a single request.
 */
export function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Unknown model — use gpt-4o pricing as conservative estimate
    const fallback = MODEL_PRICING["gpt-4o"];
    return (
      (inputTokens * fallback.input +
        outputTokens * fallback.output +
        cacheReadTokens * fallback.cacheRead +
        cacheWriteTokens * fallback.cacheWrite) /
      1_000_000
    );
  }
  return (
    (inputTokens * pricing.input +
      outputTokens * pricing.output +
      cacheReadTokens * pricing.cacheRead +
      cacheWriteTokens * pricing.cacheWrite) /
    1_000_000
  );
}

// ── In-memory store ──────────────────────────────────────────────────

let events: CostEvent[] = [];

/**
 * Track a cost event. Appends to the in-memory store.
 */
export function trackCost(event: CostEvent): void {
  events.push(event);
}

/**
 * Get a summary of all tracked costs.
 */
export function getSummary(): CostSummary {
  let totalCostUsd = 0;
  let totalTokens = 0;
  let totalLatencyMs = 0;
  const byModel: CostSummary["byModel"] = {};
  const byTool: CostSummary["byTool"] = {};

  for (const e of events) {
    const tokens = e.inputTokens + e.outputTokens + (e.cacheReadTokens ?? 0) + (e.cacheWriteTokens ?? 0);
    totalCostUsd += e.costUsd;
    totalTokens += tokens;
    totalLatencyMs += e.latencyMs;

    // By model
    const m = byModel[e.model] ??= { cost: 0, tokens: 0, calls: 0 };
    m.cost += e.costUsd;
    m.tokens += tokens;
    m.calls += 1;

    // By tool
    if (e.toolName) {
      const t = byTool[e.toolName] ??= { cost: 0, tokens: 0, calls: 0 };
      t.cost += e.costUsd;
      t.tokens += tokens;
      t.calls += 1;
    }
  }

  return { totalCostUsd, totalTokens, totalLatencyMs, byModel, byTool };
}

/**
 * Reset the in-memory cost tracker.
 */
export function resetTracker(): void {
  events = [];
}

/**
 * Get all raw events (for export / persistence).
 */
export function getEvents(): readonly CostEvent[] {
  return events;
}
