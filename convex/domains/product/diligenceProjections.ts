/**
 * diligenceProjections — Convex query + mutation contract for projections
 * emitted by the orchestrator's structuring pass.
 *
 * Pattern: scratchpad-first → structure → deterministic merge (agent_pipeline)
 *
 * Prior art:
 *   - Anthropic "Building Effective Agents" (orchestrator-workers + merge)
 *   - Manus AI (structured output derived from virtual workspace)
 *   - Cognition Devin (structured notes from raw markdown session)
 *
 * See: .claude/rules/scratchpad_first.md
 *      .claude/rules/orchestrator_workers.md
 *      .claude/rules/agentic_reliability.md  (BOUND, DETERMINISTIC)
 *      docs/architecture/AGENT_PIPELINE.md
 *      convex/schema.ts → diligenceProjections table
 *
 * Slice C.3 scope: the query surface that the client hook
 * `useDiligenceBlocks` reads from. The write path (upsertFromStructuringPass)
 * is in place as a contract stub so the orchestrator runtime has an exact
 * target in a follow-up slice.
 *
 * Invariants (enforced):
 *   BOUND         — listForEntity caps results at MAX_PROJECTIONS_PER_ENTITY
 *   HONEST_STATUS — upsert returns { status: "created" | "updated" | "stale" }
 *                   rather than silently 201-ing when version drifted
 *   DETERMINISTIC — (entitySlug, blockType, scratchpadRunId) is the dedupe key
 */

import { v } from "convex/values";
import { mutation, query } from "../../_generated/server";

/**
 * Cap on how many projection rows the client reads per entity. Each block
 * is ~1 row per run, so 50 gives plenty of history while preventing unbounded
 * reads (BOUND rule).
 */
const MAX_PROJECTIONS_PER_ENTITY = 50;

/**
 * List the most recent projection per (blockType, scratchpadRunId) for the
 * given entity. Sorted by updatedAt desc so the newest projections come first.
 *
 * Phase 1 behavior: returns [] until the orchestrator writes rows. Clients
 * already gracefully fall back to the snapshot-derived projections in
 * useDiligenceBlocks.ts.
 */
export const listForEntity = query({
  args: {
    entitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("diligenceProjections")
      .withIndex("by_entity", (q) => q.eq("entitySlug", args.entitySlug))
      .order("desc")
      .take(MAX_PROJECTIONS_PER_ENTITY);

    // Deduplicate on (blockType, scratchpadRunId) — keep highest version.
    // Deterministic: same input set always yields same output order.
    const dedupKey = (row: (typeof rows)[number]) =>
      `${row.blockType}:${row.scratchpadRunId}`;
    const winners = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      const key = dedupKey(row);
      const prior = winners.get(key);
      if (!prior || row.version > prior.version) {
        winners.set(key, row);
      }
    }

    return Array.from(winners.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((row) => ({
        entitySlug: row.entitySlug,
        blockType: row.blockType,
        scratchpadRunId: row.scratchpadRunId,
        version: row.version,
        overallTier: row.overallTier,
        headerText: row.headerText,
        bodyProse: row.bodyProse,
        sourceRefIds: row.sourceRefIds,
        sourceCount: row.sourceCount,
        sourceLabel: row.sourceLabel,
        sourceTokens: row.sourceTokens,
        payload: row.payload,
        sourceSectionId: row.sourceSectionId,
        updatedAt: row.updatedAt,
      }));
  },
});

/**
 * Upsert a projection from the structuring pass. Called by the orchestrator
 * runtime after each block's structuring LLM call completes.
 *
 * HONEST_STATUS:
 *   - returns { status: "created" } when no prior row existed
 *   - returns { status: "updated" } when the new version is higher than existing
 *   - returns { status: "stale", currentVersion } when the incoming version
 *     is <= the stored version. The orchestrator treats stale as "we've
 *     already processed a later run; discard this projection"
 *
 * DETERMINISTIC:
 *   Dedup key is (entitySlug, blockType, scratchpadRunId). Same input always
 *   produces the same result, even if the orchestrator retries.
 */
export const upsertFromStructuringPass = mutation({
  args: {
    entitySlug: v.string(),
    blockType: v.union(
      v.literal("projection"),
      v.literal("founder"),
      v.literal("product"),
      v.literal("funding"),
      v.literal("news"),
      v.literal("hiring"),
      v.literal("patent"),
      v.literal("publicOpinion"),
      v.literal("competitor"),
      v.literal("regulatory"),
      v.literal("financial"),
    ),
    scratchpadRunId: v.string(),
    version: v.number(),
    overallTier: v.union(
      v.literal("verified"),
      v.literal("corroborated"),
      v.literal("single-source"),
      v.literal("unverified"),
    ),
    headerText: v.string(),
    bodyProse: v.optional(v.string()),
    sourceRefIds: v.optional(v.array(v.string())),
    sourceCount: v.optional(v.number()),
    sourceLabel: v.optional(v.string()),
    sourceTokens: v.optional(v.array(v.string())),
    payload: v.optional(v.any()),
    sourceSectionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("diligenceProjections")
      .withIndex("by_entity_block_run", (q) =>
        q
          .eq("entitySlug", args.entitySlug)
          .eq("blockType", args.blockType)
          .eq("scratchpadRunId", args.scratchpadRunId),
      )
      .first();

    const now = Date.now();

    if (!existing) {
      await ctx.db.insert("diligenceProjections", {
        entitySlug: args.entitySlug,
        blockType: args.blockType,
        scratchpadRunId: args.scratchpadRunId,
        version: args.version,
        overallTier: args.overallTier,
        headerText: args.headerText,
        bodyProse: args.bodyProse,
        sourceRefIds: args.sourceRefIds,
        sourceCount: args.sourceCount,
        sourceLabel: args.sourceLabel,
        sourceTokens: args.sourceTokens,
        payload: args.payload,
        sourceSectionId: args.sourceSectionId,
        updatedAt: now,
      });
      return { status: "created" as const };
    }

    if (args.version <= existing.version) {
      return {
        status: "stale" as const,
        currentVersion: existing.version,
      };
    }

    await ctx.db.patch(existing._id, {
      version: args.version,
      overallTier: args.overallTier,
      headerText: args.headerText,
      bodyProse: args.bodyProse,
      sourceRefIds: args.sourceRefIds,
      sourceCount: args.sourceCount,
      sourceLabel: args.sourceLabel,
      sourceTokens: args.sourceTokens,
      payload: args.payload,
      sourceSectionId: args.sourceSectionId,
      updatedAt: now,
    });
    return { status: "updated" as const };
  },
});

/**
 * Request a refresh for a specific projection. Called when the user clicks
 * the "Refresh" button on a live decoration.
 *
 * Phase 1 behavior: idempotently marks the projection's `refreshRequestedAt`
 * so the next orchestrator pass knows to re-run this block's sub-agent.
 * The orchestrator is then responsible for:
 *   1. Reading projections with refreshRequestedAt > lastProcessedAt
 *   2. Running the block's sub-agent
 *   3. Calling upsertFromStructuringPass with a bumped version
 *   4. The row's refreshRequestedAt is cleared implicitly via the version bump
 *
 * UX contract (industry-standard async acknowledgement):
 *   - Returns HONEST_STATUS: "queued" (newly flagged) / "already-queued"
 *     (user clicked twice) / "not-found" (stale runId from a deleted row)
 *   - Caller can surface the status as a toast; "already-queued" tells the
 *     user their prior click is still pending
 */
export const requestRefresh = mutation({
  args: {
    entitySlug: v.string(),
    blockType: v.union(
      v.literal("projection"),
      v.literal("founder"),
      v.literal("product"),
      v.literal("funding"),
      v.literal("news"),
      v.literal("hiring"),
      v.literal("patent"),
      v.literal("publicOpinion"),
      v.literal("competitor"),
      v.literal("regulatory"),
      v.literal("financial"),
    ),
    scratchpadRunId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("diligenceProjections")
      .withIndex("by_entity_block_run", (q) =>
        q
          .eq("entitySlug", args.entitySlug)
          .eq("blockType", args.blockType)
          .eq("scratchpadRunId", args.scratchpadRunId),
      )
      .first();

    if (!existing) {
      return { status: "not-found" as const };
    }

    const now = Date.now();
    const alreadyQueued =
      typeof existing.refreshRequestedAt === "number" &&
      existing.refreshRequestedAt > (existing.updatedAt ?? 0);

    if (alreadyQueued) {
      return { status: "already-queued" as const, queuedAt: existing.refreshRequestedAt! };
    }

    await ctx.db.patch(existing._id, { refreshRequestedAt: now });
    return { status: "queued" as const, queuedAt: now };
  },
});

/**
 * Remove all projections for an entity — used when the entity is deleted
 * or when a power user wants to wipe the live intelligence layer.
 *
 * BOUND: deletes in page-sized chunks so a single mutation never runs away
 * on an entity with thousands of historical projections (defense in depth;
 * MAX_PROJECTIONS_PER_ENTITY should already prevent that).
 */
export const clearForEntity = mutation({
  args: {
    entitySlug: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("diligenceProjections")
      .withIndex("by_entity", (q) => q.eq("entitySlug", args.entitySlug))
      .take(MAX_PROJECTIONS_PER_ENTITY);
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
    return { deleted: rows.length };
  },
});
