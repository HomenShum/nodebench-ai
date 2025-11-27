// convex/migrations/gamMigration.ts
// One-off migration to backfill GAM fields on existing entityContexts

import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { buildCanonicalKey } from "../lib/entityResolution";

/**
 * Backfill canonicalKey and default quality for all existing entityContexts.
 * 
 * Run this once after deploying GAM schema changes:
 * npx convex run migrations/gamMigration:backfillEntityContexts
 */
export const backfillEntityContexts = internalAction({
  args: {},
  returns: v.object({
    patched: v.number(),
    skipped: v.number(),
    total: v.number(),
  }),
  handler: async (ctx): Promise<{ patched: number; skipped: number; total: number }> => {
    console.log("[gamMigration] Starting backfill of entityContexts...");
    
    const entities: any[] = await ctx.runQuery(internal.entityContexts.listAllForGC);
    
    let patched = 0;
    let skipped = 0;
    
    for (const e of entities) {
      const updates: Record<string, any> = {};
      
      // 1. Backfill canonicalKey if missing
      if (!e.canonicalKey) {
        updates.canonicalKey = buildCanonicalKey(e.entityType, e.entityName);
      }
      
      // 2. Set default quality flags if missing
      if (!e.quality) {
        const hasFacts = (e.keyFacts?.length ?? 0) >= 5;
        const hasSources = (e.sources?.length ?? 0) >= 2;
        const isFresh = (Date.now() - e.researchedAt) < 7 * 24 * 60 * 60 * 1000;
        
        updates.quality = {
          hasSufficientFacts: hasFacts,
          hasRecentResearch: isFresh,
          hasNoConflicts: true, // Assume no conflicts for existing data
          hasVerifiedSources: hasSources,
          hasHighConfidenceFacts: true, // Assume existing facts are valid
          hasNarratives: false,
          hasHeuristics: false,
        };
      }
      
      // 3. Set default qualityTier if missing
      if (!e.qualityTier) {
        // Calculate tier based on flags
        const q = updates.quality || e.quality;
        if (q) {
          const coreFlags = [
            q.hasSufficientFacts,
            q.hasRecentResearch,
            q.hasNoConflicts,
            q.hasVerifiedSources,
          ];
          const passCount = coreFlags.filter(Boolean).length;
          
          if (passCount >= 4) {
            updates.qualityTier = "good";
          } else if (passCount >= 3) {
            updates.qualityTier = "fair";
          } else {
            updates.qualityTier = "poor";
          }
        } else {
          updates.qualityTier = "fair"; // Default
        }
      }
      
      // 4. Set factCount if missing
      if (e.factCount === undefined) {
        updates.factCount = e.structuredFacts?.length ?? 0;
      }
      
      // 5. Mark stale for gradual recompute (only if not already fresh)
      const ageInDays = (Date.now() - e.researchedAt) / (1000 * 60 * 60 * 24);
      if (ageInDays > 7 && !e.isStale) {
        updates.isStale = true;
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await ctx.runMutation(internal.entityContexts.patchForMigration, {
          id: e._id,
          updates,
        });
        patched++;
        
        if (patched % 50 === 0) {
          console.log(`[gamMigration] Patched ${patched} entities...`);
        }
      } else {
        skipped++;
      }
    }
    
    console.log(`[gamMigration] Backfill complete: ${patched} patched, ${skipped} skipped`);
    
    return { patched, skipped, total: entities.length };
  },
});

/**
 * Verify migration status - check how many entities have GAM fields.
 */
export const verifyMigration = internalQuery({
  args: {},
  handler: async (ctx) => {
    const entities = await ctx.db.query("entityContexts").collect();
    
    const stats = {
      total: entities.length,
      hasCanonicalKey: 0,
      hasQuality: 0,
      hasQualityTier: 0,
      hasStructuredFacts: 0,
      hasNarratives: 0,
      qualityTierBreakdown: {
        excellent: 0,
        good: 0,
        fair: 0,
        poor: 0,
        unknown: 0,
      },
    };
    
    for (const e of entities) {
      if (e.canonicalKey) stats.hasCanonicalKey++;
      if (e.quality) stats.hasQuality++;
      if (e.qualityTier) stats.hasQualityTier++;
      if (e.structuredFacts && e.structuredFacts.length > 0) stats.hasStructuredFacts++;
      if (e.narratives && e.narratives.length > 0) stats.hasNarratives++;
      
      const tier = e.qualityTier || "unknown";
      stats.qualityTierBreakdown[tier as keyof typeof stats.qualityTierBreakdown]++;
    }
    
    return stats;
  },
});

/**
 * Reset GAM fields (for testing - removes all GAM-specific data).
 * WARNING: Destructive operation!
 */
export const resetGAMFields = internalMutation({
  args: {
    confirm: v.literal("I understand this will delete GAM data"),
  },
  handler: async (ctx, args) => {
    console.log("[gamMigration] WARNING: Resetting all GAM fields...");
    
    const entities = await ctx.db.query("entityContexts").collect();
    
    for (const e of entities) {
      await ctx.db.patch(e._id, {
        canonicalKey: undefined,
        structuredFacts: undefined,
        narratives: undefined,
        heuristics: undefined,
        conflicts: undefined,
        quality: undefined,
        qualityTier: undefined,
        factCount: undefined,
        relatedEntityNames: undefined,
        linkedDocIds: undefined,
        lastResearchJobId: undefined,
        researchDepth: undefined,
      });
    }
    
    console.log(`[gamMigration] Reset ${entities.length} entities`);
    
    return { reset: entities.length };
  },
});
