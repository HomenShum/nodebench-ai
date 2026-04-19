/**
 * diligenceProjectionWriter — the orchestrator-facing write path for
 * structured diligence projections.
 *
 * Pattern: scratchpad-first → structure → deterministic merge → overlay.
 *          This module is the "merge" step's single entry point. Any
 *          orchestrator pass that emits a structured projection for a block
 *          calls emitDiligenceProjection(...). The function then routes
 *          through Convex's upsertFromStructuringPass mutation.
 *
 * Prior art:
 *   - Anthropic "Building Effective Agents" — orchestrator-workers with merge
 *   - Manus AI — structured output derived from virtual workspace
 *   - Cognition Devin — structured notes extracted from raw markdown
 *
 * See: .claude/rules/scratchpad_first.md
 *      .claude/rules/orchestrator_workers.md
 *      .claude/rules/agentic_reliability.md  (HONEST_STATUS, DETERMINISTIC)
 *      convex/domains/product/diligenceProjections.ts
 *      src/features/entities/components/notebook/DiligenceDecorationPlugin.ts
 *
 * Invariants enforced by the helper:
 *   - Block type must be one of the 10 canonical diligence blocks (or "projection")
 *   - Entity slug + scratchpadRunId + blockType are the dedupe key
 *   - Version must be monotonic: the caller is responsible for passing a
 *     higher version on each structuring pass. DETERMINISTIC guidance:
 *     use the structuring pass's wall-clock start time, or a monotonic
 *     counter on the orchestrator run.
 *   - HONEST_STATUS: the helper returns the raw status from the mutation
 *     so the caller (orchestrator) can decide what to do with "stale".
 */

export type BlockType =
  | "projection"
  | "founder"
  | "product"
  | "funding"
  | "news"
  | "hiring"
  | "patent"
  | "publicOpinion"
  | "competitor"
  | "regulatory"
  | "financial";

export type OverallTier =
  | "verified"
  | "corroborated"
  | "single-source"
  | "unverified";

export type EmitProjectionArgs = {
  entitySlug: string;
  blockType: BlockType;
  scratchpadRunId: string;
  version: number;
  overallTier: OverallTier;
  headerText: string;
  bodyProse?: string;
  /** Optional block-specific candidate payload — e.g. FounderCandidate[] */
  payload?: unknown;
  sourceSectionId?: string;
};

export type EmitProjectionResult =
  | { status: "created"; entitySlug: string; blockType: BlockType; version: number }
  | { status: "updated"; entitySlug: string; blockType: BlockType; version: number }
  | { status: "stale"; entitySlug: string; blockType: BlockType; currentVersion: number };

/**
 * Convex mutation caller — parameterized so the helper stays testable.
 *
 * The real orchestrator (running inside a Convex action or a Node worker
 * with the Convex HTTP client) supplies a matching callable. In unit tests
 * we supply a spy.
 */
export type UpsertProjectionMutation = (args: {
  entitySlug: string;
  blockType: BlockType;
  scratchpadRunId: string;
  version: number;
  overallTier: OverallTier;
  headerText: string;
  bodyProse?: string;
  payload?: unknown;
  sourceSectionId?: string;
}) => Promise<{ status: "created" } | { status: "updated" } | { status: "stale"; currentVersion: number }>;

const VALID_BLOCK_TYPES = new Set<BlockType>([
  "projection",
  "founder",
  "product",
  "funding",
  "news",
  "hiring",
  "patent",
  "publicOpinion",
  "competitor",
  "regulatory",
  "financial",
]);

const VALID_TIERS = new Set<OverallTier>([
  "verified",
  "corroborated",
  "single-source",
  "unverified",
]);

/**
 * Validate an EmitProjectionArgs payload against the schema constraints.
 * Throws a descriptive Error on any violation.
 *
 * Called implicitly by emitDiligenceProjection so orchestrator bugs fail
 * loudly instead of producing malformed rows. Exported for unit tests.
 */
export function validateEmitArgs(args: EmitProjectionArgs): void {
  if (!args.entitySlug || args.entitySlug.trim().length === 0) {
    throw new Error("emitDiligenceProjection: entitySlug is required");
  }
  if (!VALID_BLOCK_TYPES.has(args.blockType)) {
    throw new Error(
      `emitDiligenceProjection: invalid blockType "${args.blockType}"`,
    );
  }
  if (!args.scratchpadRunId || args.scratchpadRunId.trim().length === 0) {
    throw new Error("emitDiligenceProjection: scratchpadRunId is required");
  }
  if (typeof args.version !== "number" || Number.isNaN(args.version) || args.version < 0) {
    throw new Error(
      `emitDiligenceProjection: version must be a non-negative number (got ${String(args.version)})`,
    );
  }
  if (!VALID_TIERS.has(args.overallTier)) {
    throw new Error(
      `emitDiligenceProjection: invalid overallTier "${args.overallTier}"`,
    );
  }
  if (!args.headerText || args.headerText.trim().length === 0) {
    throw new Error("emitDiligenceProjection: headerText is required");
  }
}

/**
 * Emit one projection via the Convex upsert mutation.
 *
 * Usage from the orchestrator:
 *
 *   const result = await emitDiligenceProjection(
 *     convex.mutation(api.domains.product.diligenceProjections.upsertFromStructuringPass),
 *     {
 *       entitySlug: "acme-ai",
 *       blockType: "founder",
 *       scratchpadRunId: run.id,
 *       version: run.structuringPassStartedAt,
 *       overallTier: "verified",
 *       headerText: "Founders",
 *       bodyProse: structured.prose,
 *       payload: structured.candidates,
 *     },
 *   );
 *
 *   if (result.status === "stale") {
 *     // Another later run already wrote this block; discard this projection
 *   }
 */
export async function emitDiligenceProjection(
  mutation: UpsertProjectionMutation,
  args: EmitProjectionArgs,
): Promise<EmitProjectionResult> {
  validateEmitArgs(args);

  const raw = await mutation({
    entitySlug: args.entitySlug,
    blockType: args.blockType,
    scratchpadRunId: args.scratchpadRunId,
    version: args.version,
    overallTier: args.overallTier,
    headerText: args.headerText,
    bodyProse: args.bodyProse,
    payload: args.payload,
    sourceSectionId: args.sourceSectionId,
  });

  if (raw.status === "stale") {
    return {
      status: "stale",
      entitySlug: args.entitySlug,
      blockType: args.blockType,
      currentVersion: raw.currentVersion,
    };
  }
  return {
    status: raw.status,
    entitySlug: args.entitySlug,
    blockType: args.blockType,
    version: args.version,
  };
}

/**
 * Emit many projections in parallel. Returns per-projection results so the
 * caller can triage stale/created/updated individually without losing rows
 * if one call fails.
 *
 * Settled results: each entry is either { ok: true, result } or
 * { ok: false, error, args } so one failure doesn't short-circuit the batch
 * (reexamine_resilience — partial failures don't discard the successes).
 */
export type EmitBatchOutcome =
  | { ok: true; result: EmitProjectionResult }
  | { ok: false; error: Error; args: EmitProjectionArgs };

export async function emitDiligenceProjectionBatch(
  mutation: UpsertProjectionMutation,
  batch: readonly EmitProjectionArgs[],
): Promise<ReadonlyArray<EmitBatchOutcome>> {
  return Promise.all(
    batch.map(async (args): Promise<EmitBatchOutcome> => {
      try {
        const result = await emitDiligenceProjection(mutation, args);
        return { ok: true, result };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err : new Error(String(err)),
          args,
        };
      }
    }),
  );
}
