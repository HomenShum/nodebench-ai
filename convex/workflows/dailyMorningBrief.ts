"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

/**
 * Daily Morning Brief Workflow
 * 
 * Orchestrates the automated daily morning brief generation:
 * 1. Ingest fresh data from all free sources (HN, GitHub, Dev.to, ArXiv, etc.)
 * 2. Calculate dashboard metrics for StickyDashboard
 * 3. Generate AI summary for Morning Digest
 * 4. Store results in database
 * 
 * Runs daily at 6:00 AM UTC via cron job
 */
export const runDailyMorningBrief = internalAction({
  args: {},
  handler: async (ctx) => {
    const startTime = Date.now();
    console.log("[dailyMorningBrief] 🌅 Starting daily morning brief workflow...");
    
    const errors: string[] = [];
    
    try {
      // ========================================================================
      // STEP 1: Ingest fresh data from all free sources
      // ========================================================================
      console.log("[dailyMorningBrief] 📥 Step 1: Ingesting data from all sources...");
      
      const ingestResult = await ctx.runAction(internal.feed.ingestAll, {});
      
      console.log("[dailyMorningBrief] ✅ Ingestion complete:", {
        hackerNews: ingestResult.hackerNews,
        github: ingestResult.github,
        devTo: ingestResult.devTo,
        arxiv: ingestResult.arxiv,
        reddit: ingestResult.reddit,
      });
      
      // Track any ingestion errors
      if (ingestResult.hackerNews?.status === "error") {
        errors.push(`HackerNews: ${ingestResult.hackerNews.message}`);
      }
      if (ingestResult.github?.status === "error") {
        errors.push(`GitHub: ${ingestResult.github.message}`);
      }
      if (ingestResult.devTo?.status === "error") {
        errors.push(`Dev.to: ${ingestResult.devTo.message}`);
      }
      
      // ========================================================================
      // STEP 2: Calculate dashboard metrics
      // ========================================================================
      console.log("[dailyMorningBrief] 📊 Step 2: Calculating dashboard metrics...");
      
      const dashboardMetrics = await ctx.runAction(
        internal.domains.research.dashboardMetrics.calculateDashboardMetrics,
        {}
      );
      
      console.log("[dailyMorningBrief] ✅ Dashboard metrics calculated");
      
      // ========================================================================
      // STEP 3: Generate source summary
      // ========================================================================
      console.log("[dailyMorningBrief] 📝 Step 3: Generating source summary...");
      
      const sourceSummary = {
        totalItems: (ingestResult.hackerNews?.ingested || 0) +
                    (ingestResult.github?.ingested || 0) +
                    (ingestResult.devTo?.ingested || 0) +
                    (ingestResult.arxiv?.ingested || 0) +
                    (ingestResult.reddit?.ingested || 0),
        bySource: {
          "HackerNews": ingestResult.hackerNews?.ingested || 0,
          "GitHub": ingestResult.github?.ingested || 0,
          "Dev.to": ingestResult.devTo?.ingested || 0,
          "ArXiv": ingestResult.arxiv?.ingested || 0,
          "Reddit": ingestResult.reddit?.ingested || 0,
        },
        byCategory: {
          "ai_ml": 0, // Will be calculated from feed items
          "tech": 0,
          "opensource": 0,
        },
        topTrending: [], // Will be populated from feed analysis
      };
      
      // ========================================================================
      // STEP 4: Store dashboard metrics
      // ========================================================================
      console.log("[dailyMorningBrief] 💾 Step 4: Storing dashboard metrics...");
      
      const processingTime = Date.now() - startTime;
      
      const storeResult = await ctx.runMutation(
        internal.domains.research.dashboardMetrics.storeDashboardMetrics,
        {
          dashboardMetrics,
          sourceSummary,
          processingTimeMs: processingTime,
        }
      );
      
      console.log("[dailyMorningBrief] ✅ Metrics stored:", storeResult);
      
      // ========================================================================
      // STEP 5: Summary and completion
      // ========================================================================
      const totalTime = Date.now() - startTime;
      
      console.log("[dailyMorningBrief] 🎉 Daily morning brief complete!", {
        totalTimeMs: totalTime,
        totalItems: sourceSummary.totalItems,
        errors: errors.length > 0 ? errors : "none",
        dateString: storeResult.dateString,
        version: storeResult.version,
      });
      
      return {
        success: true,
        totalTimeMs: totalTime,
        sourceSummary,
        dashboardMetrics,
        errors: errors.length > 0 ? errors : undefined,
        dateString: storeResult.dateString,
        version: storeResult.version,
      };
      
    } catch (error: any) {
      console.error("[dailyMorningBrief] ❌ Workflow failed:", error);
      
      return {
        success: false,
        error: error.message,
        errors,
        totalTimeMs: Date.now() - startTime,
      };
    }
  },
});

