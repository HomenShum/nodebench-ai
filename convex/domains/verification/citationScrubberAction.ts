"use node";
// convex/domains/verification/citationScrubberAction.ts
// Server-side citation scrubbing action
// Called after agent generates response to remove hallucinated URLs

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { 
  scrubUnverifiedCitations, 
  buildAllowedUrlsSet,
  type ScrubResult 
} from "../../../shared/verification/citationScrubber";

/**
 * Scrub hallucinated citations from agent output
 * 
 * Call this after agent generates text but before final display.
 * Returns scrubbed text with all unverified URLs removed.
 */
export const scrubAgentOutput = internalAction({
  args: {
    text: v.string(),
    runId: v.string(),
    userId: v.id("users"),
    options: v.optional(v.object({
      scrubConfidences: v.optional(v.boolean()),
      scrubTimestamps: v.optional(v.boolean()),
      urlReplacement: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<ScrubResult> => {
    // 1. Get allowed URLs from artifact store
    const allowedUrls = await ctx.runQuery(
      internal.lib.artifactQueries.getAllowedUrlsForRun,
      { runId: args.runId, userId: args.userId }
    );
    
    // 2. Build allowed set
    const allowedSet = buildAllowedUrlsSet(allowedUrls);
    
    // 3. Scrub the text
    const result = scrubUnverifiedCitations(args.text, allowedSet, {
      scrubConfidences: args.options?.scrubConfidences ?? true,
      scrubTimestamps: args.options?.scrubTimestamps ?? true,
      urlReplacement: args.options?.urlReplacement ?? "[SOURCE REMOVED]",
    });
    
    // 4. Log if any scrubbing occurred
    if (result.wasScrubbed) {
      console.log(`[citationScrubber] Scrubbed output for run ${args.runId}:`);
      console.log(`  - Removed URLs: ${result.removedUrls.length}`);
      if (result.removedUrls.length > 0) {
        console.log(`  - URLs removed: ${result.removedUrls.slice(0, 5).join(", ")}${result.removedUrls.length > 5 ? "..." : ""}`);
      }
      console.log(`  - Removed confidences: ${result.removedConfidences}`);
      console.log(`  - Removed timestamps: ${result.removedTimestamps}`);
    }
    
    return result;
  },
});

/**
 * Quick check if text has unverified URLs (without full scrub)
 * Useful for validation before allowing publish/share
 */
export const hasUnverifiedCitations = internalAction({
  args: {
    text: v.string(),
    runId: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ hasUnverified: boolean; count: number }> => {
    const allowedUrls = await ctx.runQuery(
      internal.lib.artifactQueries.getAllowedUrlsForRun,
      { runId: args.runId, userId: args.userId }
    );
    
    const allowedSet = buildAllowedUrlsSet(allowedUrls);
    
    // Do a scrub to count removals without modifying
    const result = scrubUnverifiedCitations(args.text, allowedSet);
    
    return {
      hasUnverified: result.removedUrls.length > 0,
      count: result.removedUrls.length,
    };
  },
});
