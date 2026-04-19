/**
 * useDiligenceBlocks — focused subscription for diligence structured outputs.
 *
 * Pattern: subscription-per-concern (PR7). Diligence updates should ONLY
 *          touch decoration state, never the editor subtree's reactive path.
 *
 * Prior art:
 *   - Anthropic Claude Code tool-card updates (isolated from chat message loop)
 *   - Perplexity Agent Mode step cards
 *
 * See: .claude/rules/orchestrator_workers.md
 *      .claude/rules/scratchpad_first.md
 *      src/features/entities/components/notebook/DiligenceDecorationPlugin.ts
 *
 * Phase 1 scope: type-safe scaffold. Concrete Convex wiring lands alongside
 * the orchestrator runtime in Phase 2. The shape is final so callers can
 * integrate now.
 *
 * ANTI-GOAL: do NOT trigger the editor subtree to re-render when a diligence
 * block changes. Only the DiligenceDecorationPlugin should consume this
 * hook's output — never the main EntityNotebookLive render loop.
 */

import { useMemo } from "react";
import type { EvidenceTier } from "@/features/entities/components/EvidenceChip";
import type {
  DiligenceDecorationData,
} from "./DiligenceDecorationPlugin";

export type DiligenceBlockProjection = DiligenceDecorationData;

export type DiligenceBlocksSubscription = {
  /** True until the first snapshot has arrived. */
  isLoading: boolean;
  /** Stable array of projections — identity only changes when content changes. */
  projections: ReadonlyArray<DiligenceBlockProjection>;
  /** Overall tier across all blocks (worst-of aggregate). */
  overallTier: EvidenceTier | null;
  /** Pending blocks that haven't finished their first pass. */
  pendingBlockCount: number;
};

const EMPTY: DiligenceBlocksSubscription = {
  isLoading: true,
  projections: [],
  overallTier: null,
  pendingBlockCount: 0,
};

/**
 * Phase 1 scaffold. Returns a stable "loading" shape so integration can
 * proceed against the final API without Convex query wiring yet.
 *
 * When implemented, this will:
 *   - Query `api.domains.product.diligenceProjections.listForEntity`
 *   - Apply cheap memoization over stable keys (scratchpadRunId + version)
 *   - Skip unchanged projections (identity-preserving update)
 */
export function useDiligenceBlocks(_entitySlug: string): DiligenceBlocksSubscription {
  return useMemo(() => EMPTY, []);
}
