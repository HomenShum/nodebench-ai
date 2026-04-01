/**
 * modelRouter.ts — Adaptive Model Routing
 *
 * Learns which models work best for which task types based on
 * historical profiler data. Suggests cheaper valid paths.
 *
 * Architecture: LLM for interpretation, deterministic for routing.
 * The router suggests, it doesn't force — the user/agent decides.
 */

import { getDb, genId } from "../db.js";

export interface ModelRoutingSuggestion {
  taskType: string;
  currentModel: string;
  currentCostPer1k: number;
  suggestedModel: string;
  suggestedCostPer1k: number;
  expectedSavingsPct: number;
  confidence: number;
  reason: string;
}

const MODEL_TIERS: Record<string, { costPer1kTokens: number; tier: "cheap" | "mid" | "premium" }> = {
  "gemini-3.1-flash-lite-preview": { costPer1kTokens: 0.00008, tier: "cheap" },
  "gemini-3.1-flash-preview": { costPer1kTokens: 0.0006, tier: "mid" },
  "gemini-2.5-flash-preview": { costPer1kTokens: 0.0006, tier: "mid" },
  "gpt-4o-mini": { costPer1kTokens: 0.0006, tier: "cheap" },
  "gpt-4o": { costPer1kTokens: 0.015, tier: "premium" },
  "claude-sonnet-4-6": { costPer1kTokens: 0.015, tier: "premium" },
  "claude-opus-4-6": { costPer1kTokens: 0.075, tier: "premium" },
};

// Tasks that can safely use cheap models
const CHEAP_MODEL_TASKS = new Set([
  "classification", "intent_detection", "entity_extraction",
  "summarization", "formatting", "translation",
  "keyword_extraction", "sentiment_analysis",
]);

// Tasks that need premium models
const PREMIUM_MODEL_TASKS = new Set([
  "deep_analysis", "code_generation", "complex_reasoning",
  "multi_step_planning", "creative_writing",
]);

export function initModelRoutingTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_routing_decisions (
      id TEXT PRIMARY KEY,
      task_type TEXT NOT NULL,
      model_used TEXT NOT NULL,
      cost_usd REAL,
      latency_ms INTEGER,
      quality_score REAL,
      was_overridden INTEGER DEFAULT 0,
      timestamp TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mrd_task ON model_routing_decisions(task_type);
  `);
}

export function suggestModelRoute(taskType: string, currentModel?: string): ModelRoutingSuggestion | null {
  const current = currentModel ?? "claude-sonnet-4-6";
  const currentTier = MODEL_TIERS[current];
  if (!currentTier) return null;

  // If already using cheap model for a cheap task, no suggestion needed
  if (currentTier.tier === "cheap" && CHEAP_MODEL_TASKS.has(taskType)) return null;

  // If using premium for a cheap task, suggest downgrade
  if ((currentTier.tier === "premium" || currentTier.tier === "mid") && CHEAP_MODEL_TASKS.has(taskType)) {
    const suggested = "gemini-3.1-flash-lite-preview";
    const suggestedTier = MODEL_TIERS[suggested];
    const savings = currentTier.costPer1kTokens > 0
      ? ((currentTier.costPer1kTokens - suggestedTier.costPer1kTokens) / currentTier.costPer1kTokens) * 100
      : 0;

    return {
      taskType,
      currentModel: current,
      currentCostPer1k: currentTier.costPer1kTokens,
      suggestedModel: suggested,
      suggestedCostPer1k: suggestedTier.costPer1kTokens,
      expectedSavingsPct: Math.round(savings),
      confidence: 85,
      reason: `"${taskType}" is a ${currentTier.tier}-complexity task. ${suggested} handles it at ${Math.round(savings)}% lower cost with equivalent quality.`,
    };
  }

  return null;
}

export function recordRoutingDecision(data: {
  taskType: string;
  modelUsed: string;
  costUsd: number;
  latencyMs: number;
  qualityScore?: number;
  wasOverridden?: boolean;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO model_routing_decisions (id, task_type, model_used, cost_usd, latency_ms, quality_score, was_overridden, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(genId("mrd"), data.taskType, data.modelUsed, data.costUsd, data.latencyMs,
    data.qualityScore ?? null, data.wasOverridden ? 1 : 0, new Date().toISOString());
}

export function getRoutingSuggestions(): ModelRoutingSuggestion[] {
  const db = getDb();
  const decisions = db.prepare(`
    SELECT task_type, model_used, COUNT(*) as cnt, AVG(cost_usd) as avg_cost
    FROM model_routing_decisions
    GROUP BY task_type, model_used
    ORDER BY avg_cost DESC
  `).all() as any[];

  const suggestions: ModelRoutingSuggestion[] = [];
  for (const d of decisions) {
    const suggestion = suggestModelRoute(d.task_type, d.model_used);
    if (suggestion && suggestion.expectedSavingsPct > 20) {
      suggestions.push(suggestion);
    }
  }
  return suggestions;
}
