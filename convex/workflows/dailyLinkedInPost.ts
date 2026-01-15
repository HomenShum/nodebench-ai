"use node";

/**
 * Daily LinkedIn Post Workflow
 *
 * Automated workflow that runs at 6:00 AM UTC daily to:
 * 1. Generate the morning digest with fact-checked findings
 * 2. Format for LinkedIn (professional tone, 2000 char limit)
 * 3. Post to LinkedIn via the linkedinPosting action
 *
 * Cost: $0.00 (uses mimo-v2-flash-free for all LLM calls)
 */

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import type { AgentDigestOutput } from "../domains/agents/digestAgent";

// ═══════════════════════════════════════════════════════════════════════════
// LINKEDIN POST FORMATTING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format the digest for LinkedIn posting.
 * LinkedIn posts have a 3000 character limit.
 * Uses clean plain-text formatting without emojis for better rendering.
 *
 * Format matches user preference:
 * - Clean header with date
 * - Lead story with source and why it matters
 * - Key signals with nested details
 * - Action items as numbered list
 * - Entities to watch with links
 * - Footer with # format
 */
function formatDigestForLinkedIn(
  digest: AgentDigestOutput,
  options: {
    maxLength?: number;
  } = {}
): string {
  const maxLength = options.maxLength || 2900; // LinkedIn allows 3000, use 2900 for safety
  const dateString = digest.dateString;

  const parts: string[] = [];

  // Clean header without emojis
  parts.push(`NodeBench AI Daily Intelligence Brief`);
  parts.push(`Date: ${dateString}`);
  parts.push("");

  // Lead story (Act I) - Clean structure
  if (digest.leadStory) {
    parts.push(`TODAY'S KEY SIGNAL:`);
    parts.push(digest.leadStory.title);
    if (digest.leadStory.url) {
      parts.push(`Source: ${digest.leadStory.url}`);
    }
    if (digest.leadStory.whyItMatters) {
      parts.push(`Why it matters: ${digest.leadStory.whyItMatters}`);
    }
    parts.push("");
  } else if (digest.narrativeThesis) {
    parts.push(`TODAY'S THESIS:`);
    parts.push(digest.narrativeThesis);
    parts.push("");
  }

  // Key Signals (Act II) - Clean nested structure
  if (digest.signals && digest.signals.length > 0) {
    parts.push(`KEY SIGNALS:`);
    for (let i = 0; i < Math.min(digest.signals.length, 5); i++) {
      const signal = digest.signals[i];
      parts.push(`${i + 1}. ${signal.title}`);
      if (signal.summary) {
        parts.push(` ${signal.summary}`);
      }
      if (signal.url) {
        parts.push(` Read more: ${signal.url}`);
      }
      if (signal.hardNumbers) {
        parts.push(` Data: ${signal.hardNumbers}`);
      }
    }
    parts.push("");
  }

  // Fact-Check Findings - Clean format
  if (digest.factCheckFindings && digest.factCheckFindings.length > 0) {
    parts.push(`FACT-CHECKED CLAIMS:`);
    for (const finding of digest.factCheckFindings) {
      const status = finding.status === "verified" ? "VERIFIED" :
                     finding.status === "false" ? "FALSE" :
                     finding.status === "partially_verified" ? "PARTIAL" : "UNVERIFIED";
      parts.push(`[${status}] ${finding.claim}`);
      if (finding.explanation) {
        parts.push(` ${finding.explanation}`);
      }
      if (finding.sourceUrl) {
        parts.push(` Source: ${finding.sourceUrl}`);
      }
    }
    parts.push("");
  }

  // Action Items (Act III) - Clean numbered list
  if (digest.actionItems && digest.actionItems.length > 0) {
    parts.push(`ACTION ITEMS:`);
    for (let i = 0; i < Math.min(digest.actionItems.length, 5); i++) {
      const action = digest.actionItems[i];
      parts.push(`${i + 1}. ${action.action}`);
    }
    parts.push("");
  }

  // Entity Spotlight - Clean format with links
  if (digest.entitySpotlight && digest.entitySpotlight.length > 0) {
    parts.push(`ENTITIES TO WATCH:`);
    for (const entity of digest.entitySpotlight) {
      const typeLabel = entity.type ? `[${entity.type}]` : "";
      const stage = entity.fundingStage ? ` | ${entity.fundingStage}` : "";
      parts.push(`${entity.name} ${typeLabel}${stage}`);
      parts.push(` ${entity.keyInsight}`);
      // Add search links
      if (entity.type === "company" || entity.type === "person") {
        const searchQuery = encodeURIComponent(`${entity.name} latest news`);
        parts.push(` News: https://news.google.com/search?q=${searchQuery}`);
      }
    }
    parts.push("");
  }

  // Footer with # format (LinkedIn-friendly)
  parts.push("---");
  parts.push("Powered by NodeBench AI - Autonomous Intelligence Platform");
  parts.push("#AI #TechIntelligence #DailyBrief #FactCheck #NodeBenchAI");

  let content = parts.join("\n");

  // If too long, intelligently truncate sections while keeping structure
  if (content.length > maxLength) {
    const shortParts: string[] = [];
    shortParts.push(`NodeBench AI Daily Brief | ${dateString}`);
    shortParts.push("");

    if (digest.leadStory) {
      shortParts.push(`KEY SIGNAL: ${digest.leadStory.title}`);
      if (digest.leadStory.url) {
        shortParts.push(`Source: ${digest.leadStory.url}`);
      }
      shortParts.push("");
    }

    if (digest.signals && digest.signals.length > 0) {
      shortParts.push(`SIGNALS:`);
      for (let i = 0; i < Math.min(digest.signals.length, 3); i++) {
        const signal = digest.signals[i];
        shortParts.push(`${i + 1}. ${signal.title}`);
        if (signal.url) shortParts.push(` ${signal.url}`);
      }
      shortParts.push("");
    }

    if (digest.actionItems && digest.actionItems.length > 0) {
      shortParts.push(`ACTIONS:`);
      for (let i = 0; i < Math.min(digest.actionItems.length, 3); i++) {
        shortParts.push(`${i + 1}. ${digest.actionItems[i].action}`);
      }
      shortParts.push("");
    }

    shortParts.push("---");
    shortParts.push("NodeBench AI | #AI #TechIntelligence");

    content = shortParts.join("\n");
  }

  return content;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN WORKFLOW ACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Post daily digest to LinkedIn.
 * This action is designed to be called from a cron job at 6:00 AM UTC.
 *
 * Steps:
 * 1. Generate digest with fact-checks using free model
 * 2. Format for LinkedIn
 * 3. Post to LinkedIn
 * 4. Log the result
 */
export const postDailyDigestToLinkedIn = internalAction({
  args: {
    persona: v.optional(v.string()),
    model: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const persona = args.persona || "GENERAL";
    const model = args.model || "mimo-v2-flash-free"; // Free model
    const dryRun = args.dryRun ?? false;

    console.log(`[dailyLinkedInPost] Starting daily LinkedIn post workflow, persona=${persona}, model=${model}, dryRun=${dryRun}`);

    // Step 1: Generate digest with fact-checks
    let digestResult;
    try {
      digestResult = await ctx.runAction(
        internal.domains.agents.digestAgent.generateDigestWithFactChecks,
        { persona, model }
      );
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[dailyLinkedInPost] Failed to generate digest: ${errorMsg}`);
      return {
        success: false,
        error: `Digest generation failed: ${errorMsg}`,
        posted: false,
      };
    }

    if (!digestResult.success || !digestResult.digest) {
      console.error(`[dailyLinkedInPost] Digest generation returned error: ${digestResult.error}`);
      return {
        success: false,
        error: digestResult.error || "Unknown digest error",
        posted: false,
      };
    }

    console.log(`[dailyLinkedInPost] Digest generated with ${digestResult.factCheckCount} fact-checks`);

    // Step 2: Format for LinkedIn
    const linkedInContent = formatDigestForLinkedIn(digestResult.digest);
    console.log(`[dailyLinkedInPost] LinkedIn content formatted (${linkedInContent.length} chars)`);

    // Step 3: Post to LinkedIn (unless dry run)
    if (dryRun) {
      console.log(`[dailyLinkedInPost] DRY RUN - would post:\n${linkedInContent}`);
      return {
        success: true,
        posted: false,
        dryRun: true,
        content: linkedInContent,
        factCheckCount: digestResult.factCheckCount,
      };
    }

    let postResult;
    try {
      postResult = await ctx.runAction(
        internal.domains.social.linkedinPosting.createTextPost,
        { text: linkedInContent }
      );
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[dailyLinkedInPost] Failed to post to LinkedIn: ${errorMsg}`);
      return {
        success: false,
        error: `LinkedIn post failed: ${errorMsg}`,
        posted: false,
        content: linkedInContent,
      };
    }

    if (!postResult.success) {
      console.error(`[dailyLinkedInPost] LinkedIn post failed: ${postResult.error}`);
      return {
        success: false,
        error: postResult.error,
        posted: false,
        content: linkedInContent,
      };
    }

    // Step 4: Log success (mutation in separate file - no "use node")
    await ctx.runMutation(internal.workflows.dailyLinkedInPostMutations.logLinkedInPost, {
      dateString: digestResult.digest.dateString,
      persona,
      postId: postResult.postUrn,
      content: linkedInContent,
      factCheckCount: digestResult.factCheckCount,
    });

    console.log(`[dailyLinkedInPost] Successfully posted to LinkedIn, postUrl=${postResult.postUrl}`);

    return {
      success: true,
      posted: true,
      postId: postResult.postUrn,
      postUrl: postResult.postUrl,
      content: linkedInContent,
      factCheckCount: digestResult.factCheckCount,
      usage: digestResult.usage,
    };
  },
});

// NOTE: logLinkedInPost mutation moved to dailyLinkedInPostMutations.ts
// (mutations cannot be in "use node" files)

/**
 * Test the LinkedIn posting workflow without actually posting
 */
export const testLinkedInWorkflow = internalAction({
  args: {
    persona: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.workflows.dailyLinkedInPost.postDailyDigestToLinkedIn, {
      persona: args.persona,
      model: args.model,
      dryRun: true,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// SEPARATE FUNDING POST - Posted at different time than main digest
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format funding rounds for a dedicated LinkedIn post.
 * This is a SEPARATE post from the main digest, focused only on funding news.
 * Uses clean plain-text formatting without emojis.
 */
function formatFundingForLinkedIn(
  fundingRounds: NonNullable<AgentDigestOutput["fundingRounds"]>,
  dateString: string
): string {
  const parts: string[] = [];

  // Clean header
  parts.push(`NodeBench AI Startup Funding Tracker`);
  parts.push(`Date: ${dateString}`);
  parts.push(`Top ${Math.min(fundingRounds.length, 5)} Raises Today (Ranked by Amount)`);
  parts.push("");

  for (const funding of fundingRounds.slice(0, 5)) {
    // Format round type nicely
    const roundLabel = funding.roundType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Main entry with rank
    parts.push(`${funding.rank}. ${funding.companyName}`);
    parts.push(` Amount: ${funding.amountRaw}`);
    parts.push(` Round: ${roundLabel}`);

    if (funding.leadInvestors && funding.leadInvestors.length > 0) {
      const investors = funding.leadInvestors.slice(0, 3).join(", ");
      parts.push(` Investors: ${investors}`);
    }

    if (funding.sector) {
      parts.push(` Sector: ${funding.sector}`);
    }

    if (funding.productDescription) {
      parts.push(` Product: ${funding.productDescription}`);
    }

    // Add links
    const companyQuery = encodeURIComponent(funding.companyName);
    parts.push(` Crunchbase: https://www.crunchbase.com/textsearch?q=${companyQuery}`);

    if (funding.sourceUrl) {
      parts.push(` Source: ${funding.sourceUrl}`);
    }

    parts.push("");
  }

  // Summary stats if available
  const totalRaised = fundingRounds
    .slice(0, 5)
    .reduce((sum, f) => sum + (f.amountUsd || 0), 0);
  if (totalRaised > 0) {
    const formattedTotal = totalRaised >= 1_000_000_000
      ? `$${(totalRaised / 1_000_000_000).toFixed(1)}B`
      : totalRaised >= 1_000_000
        ? `$${(totalRaised / 1_000_000).toFixed(1)}M`
        : `$${totalRaised.toLocaleString()}`;
    parts.push(`TOTAL RAISED TODAY: ${formattedTotal} across top 5 rounds`);
    parts.push("");
  }

  // Footer with # format
  parts.push("---");
  parts.push("Powered by NodeBench AI - Startup Intelligence Platform");
  parts.push("#Startups #Funding #VentureCapital #AI #SeedRound #SeriesA");

  return parts.join("\n");
}

/**
 * Post daily funding rounds to LinkedIn.
 * This is a SEPARATE post from the main digest, posted at a different time.
 * Designed to be called from cron at 12:00 PM UTC (after main 6:15 AM digest).
 */
export const postDailyFundingToLinkedIn = internalAction({
  args: {
    hoursBack: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const hoursBack = args.hoursBack || 24;
    const dryRun = args.dryRun ?? false;
    const dateString = new Date().toISOString().split("T")[0];

    console.log(`[dailyFundingPost] Starting funding post, hoursBack=${hoursBack}, dryRun=${dryRun}`);

    // 1. Fetch funding rounds
    let fundingRounds: NonNullable<AgentDigestOutput["fundingRounds"]> = [];
    try {
      const fundingData = await ctx.runQuery(
        internal.domains.enrichment.fundingQueries.getFundingDigestSections,
        { lookbackHours: hoursBack }
      );

      const allFunding = [
        ...fundingData.seed,
        ...fundingData.seriesA,
        ...fundingData.other,
      ];

      // Sort by amount (largest first) and assign ranks
      const sortedFunding = allFunding
        .filter((f: any) => f.amountUsd && f.amountUsd > 0)
        .sort((a: any, b: any) => (b.amountUsd || 0) - (a.amountUsd || 0));

      fundingRounds = sortedFunding.slice(0, 10).map((f: any, index: number) => ({
        rank: index + 1,
        companyName: f.companyName,
        roundType: f.roundType,
        amountRaw: f.amountRaw,
        amountUsd: f.amountUsd,
        leadInvestors: f.leadInvestors || [],
        sector: f.sector,
        productDescription: undefined,
        founderBackground: undefined,
        sourceUrl: undefined,
        announcedAt: Date.now(),
        confidence: f.confidence || 0.5,
      }));

      console.log(`[dailyFundingPost] Found ${fundingRounds.length} funding rounds`);
    } catch (e) {
      console.warn("[dailyFundingPost] Failed to fetch funding rounds:", e instanceof Error ? e.message : String(e));
    }

    // 2. Check if we have funding to post
    if (fundingRounds.length === 0) {
      console.log("[dailyFundingPost] No funding rounds to post today");
      return {
        success: true,
        posted: false,
        reason: "No funding rounds found",
        fundingCount: 0,
      };
    }

    // 3. Format for LinkedIn
    const linkedInContent = formatFundingForLinkedIn(fundingRounds, dateString);
    console.log(`[dailyFundingPost] LinkedIn content formatted (${linkedInContent.length} chars)`);

    // 4. Post to LinkedIn (unless dry run)
    if (dryRun) {
      console.log(`[dailyFundingPost] DRY RUN - would post:\n${linkedInContent}`);
      return {
        success: true,
        posted: false,
        dryRun: true,
        content: linkedInContent,
        fundingCount: fundingRounds.length,
      };
    }

    let postResult;
    try {
      postResult = await ctx.runAction(
        internal.domains.social.linkedinPosting.createTextPost,
        { text: linkedInContent }
      );
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[dailyFundingPost] Failed to post to LinkedIn: ${errorMsg}`);
      return {
        success: false,
        error: `LinkedIn post failed: ${errorMsg}`,
        posted: false,
        content: linkedInContent,
      };
    }

    if (!postResult.success) {
      console.error(`[dailyFundingPost] LinkedIn post failed: ${postResult.error}`);
      return {
        success: false,
        error: postResult.error,
        posted: false,
        content: linkedInContent,
      };
    }

    console.log(`[dailyFundingPost] Successfully posted funding to LinkedIn, postUrl=${postResult.postUrl}`);

    return {
      success: true,
      posted: true,
      postId: postResult.postUrn,
      postUrl: postResult.postUrl,
      content: linkedInContent,
      fundingCount: fundingRounds.length,
    };
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PERSONA POSTING - Different posts for different audiences
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Persona configurations for different LinkedIn audiences.
 * Each persona gets tailored content focus and hashtags.
 */
const LINKEDIN_PERSONAS = {
  // For investors, VCs, and startup ecosystem
  VC_INVESTOR: {
    id: "VC_INVESTOR",
    name: "VC/Investor Focus",
    description: "Funding-focused content for venture capital and investor audience",
    hashtags: "#VentureCapital #Startups #FundingNews #AngelInvesting #SeriesA #SeedFunding",
    focusSections: ["fundingRounds", "entitySpotlight", "actionItems"],
    formatPrefix: "VC Intelligence Brief",
  },
  // For technical audience (CTOs, engineers, developers)
  TECH_BUILDER: {
    id: "TECH_BUILDER",
    name: "Tech Builder Focus",
    description: "Technical deep-dives for CTOs, engineers, and developers",
    hashtags: "#TechNews #AI #MachineLearning #DevOps #Engineering #OpenSource",
    focusSections: ["signals", "leadStory", "actionItems"],
    formatPrefix: "Tech Intelligence Brief",
  },
  // General audience (founders, executives, general business)
  GENERAL: {
    id: "GENERAL",
    name: "General Business",
    description: "Balanced content for founders, executives, and business professionals",
    hashtags: "#AI #TechIntelligence #DailyBrief #FactCheck #NodeBenchAI",
    focusSections: ["leadStory", "signals", "actionItems", "entitySpotlight"],
    formatPrefix: "Daily Intelligence Brief",
  },
} as const;

type PersonaId = keyof typeof LINKEDIN_PERSONAS;

/**
 * Format digest content tailored to a specific persona.
 * Each persona has a RADICALLY DIFFERENT format optimized for their audience.
 */
function formatDigestForPersona(
  digest: AgentDigestOutput,
  personaId: PersonaId,
  options: { maxLength?: number } = {}
): string {
  const maxLength = options.maxLength || 2900;
  const dateString = digest.dateString;
  const parts: string[] = [];

  // ═══════════════════════════════════════════════════════════════════════════
  // VC_INVESTOR: Deal Memo Style - Investment thesis, market dynamics, exit paths
  // Format: Like a mini investment memo with clear thesis and company deep-dives
  // ═══════════════════════════════════════════════════════════════════════════
  if (personaId === "VC_INVESTOR") {
    parts.push(`VC DEAL FLOW MEMO`);
    parts.push(`${dateString} - NodeBench AI`);
    parts.push("");

    // Investment Thesis of the Day
    if (digest.leadStory) {
      parts.push(`INVESTMENT THESIS:`);
      parts.push(`"${digest.leadStory.title}"`);
      parts.push("");
      if (digest.leadStory.whyItMatters) {
        parts.push(`Market Impact: ${digest.leadStory.whyItMatters}`);
      }
      if (digest.leadStory.url) {
        parts.push(`Primary Source: ${digest.leadStory.url}`);
      }
      parts.push("");
    }

    // Company Deep Dives - Most important for VCs
    if (digest.entitySpotlight && digest.entitySpotlight.length > 0) {
      parts.push(`COMPANY DEEP DIVES:`);
      parts.push("");
      for (const entity of digest.entitySpotlight.slice(0, 4)) {
        const stage = entity.fundingStage || "Unknown Stage";
        parts.push(`>> ${entity.name.toUpperCase()}`);
        parts.push(`   Stage: ${stage}`);
        parts.push(`   Type: ${entity.type || "Company"}`);
        parts.push(`   Thesis: ${entity.keyInsight}`);
        // Add search links for due diligence
        const cbQuery = encodeURIComponent(entity.name);
        parts.push(`   Crunchbase: https://www.crunchbase.com/textsearch?q=${cbQuery}`);
        const newsQuery = encodeURIComponent(`${entity.name} funding news`);
        parts.push(`   News: https://news.google.com/search?q=${newsQuery}`);
        parts.push("");
      }
    }

    // Deal Flow Signals
    if (digest.signals && digest.signals.length > 0) {
      parts.push(`DEAL FLOW SIGNALS:`);
      for (let i = 0; i < Math.min(digest.signals.length, 3); i++) {
        const signal = digest.signals[i];
        parts.push(`${i + 1}. ${signal.title}`);
        if (signal.summary) {
          parts.push(`   >> ${signal.summary}`);
        }
        if (signal.url) {
          parts.push(`   Link: ${signal.url}`);
        }
      }
      parts.push("");
    }

    // Portfolio Action Items
    if (digest.actionItems && digest.actionItems.length > 0) {
      parts.push(`PORTFOLIO ACTIONS:`);
      for (let i = 0; i < Math.min(digest.actionItems.length, 3); i++) {
        parts.push(`${i + 1}. ${digest.actionItems[i].action}`);
      }
      parts.push("");
    }

    parts.push(`---`);
    parts.push(`NodeBench AI - VC Intelligence Platform`);
    parts.push(`#VentureCapital #Startups #DealFlow #SeriesA #SeedFunding #AngelInvesting`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TECH_BUILDER: Engineering Newsletter Style - Code, architecture, tools
  // Format: Like a technical newsletter with code implications and stack decisions
  // ═══════════════════════════════════════════════════════════════════════════
  else if (personaId === "TECH_BUILDER") {
    parts.push(`TECH RADAR`);
    parts.push(`Engineering Intelligence - ${dateString}`);
    parts.push("");

    // Architecture Alert - Lead with technical implications
    if (digest.leadStory) {
      parts.push(`ARCHITECTURE ALERT:`);
      parts.push(digest.leadStory.title);
      parts.push("");
      if (digest.leadStory.whyItMatters) {
        parts.push(`Engineering Impact:`);
        parts.push(digest.leadStory.whyItMatters);
      }
      if (digest.leadStory.url) {
        parts.push(`Source: ${digest.leadStory.url}`);
      }
      parts.push("");
    }

    // Tech Stack Signals - Detailed with metrics
    if (digest.signals && digest.signals.length > 0) {
      parts.push(`STACK SIGNALS:`);
      parts.push("");
      for (let i = 0; i < Math.min(digest.signals.length, 5); i++) {
        const signal = digest.signals[i];
        parts.push(`[${i + 1}] ${signal.title}`);
        if (signal.summary) {
          parts.push(`    ${signal.summary}`);
        }
        if (signal.hardNumbers) {
          parts.push(`    Metrics: ${signal.hardNumbers}`);
        }
        if (signal.url) {
          parts.push(`    Read: ${signal.url}`);
        }
        parts.push("");
      }
    }

    // Tech Companies/Tools to Evaluate
    if (digest.entitySpotlight && digest.entitySpotlight.length > 0) {
      parts.push(`TOOLS & TECH TO EVALUATE:`);
      for (const entity of digest.entitySpotlight.slice(0, 3)) {
        parts.push(`- ${entity.name}: ${entity.keyInsight}`);
        const ghQuery = encodeURIComponent(entity.name);
        parts.push(`  GitHub: https://github.com/search?q=${ghQuery}`);
      }
      parts.push("");
    }

    // Engineering Action Items
    if (digest.actionItems && digest.actionItems.length > 0) {
      parts.push(`ENGINEERING BACKLOG:`);
      for (let i = 0; i < Math.min(digest.actionItems.length, 4); i++) {
        parts.push(`[ ] ${digest.actionItems[i].action}`);
      }
      parts.push("");
    }

    parts.push(`---`);
    parts.push(`NodeBench AI - Engineering Intelligence`);
    parts.push(`#Engineering #DevOps #Architecture #OpenSource #AI #TechStack`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERAL: Executive Summary Style - Balanced overview for business leaders
  // ═══════════════════════════════════════════════════════════════════════════
  else {
    parts.push(`NodeBench AI Daily Intelligence Brief`);
    parts.push(`Date: ${dateString}`);
    parts.push("");

    if (digest.leadStory) {
      parts.push(`TODAY'S KEY SIGNAL:`);
      parts.push(digest.leadStory.title);
      if (digest.leadStory.url) {
        parts.push(`Source: ${digest.leadStory.url}`);
      }
      if (digest.leadStory.whyItMatters) {
        parts.push(`Why it matters: ${digest.leadStory.whyItMatters}`);
      }
      parts.push("");
    }

    if (digest.signals && digest.signals.length > 0) {
      parts.push(`KEY SIGNALS:`);
      for (let i = 0; i < Math.min(digest.signals.length, 5); i++) {
        const signal = digest.signals[i];
        parts.push(`${i + 1}. ${signal.title}`);
        if (signal.summary) {
          parts.push(` ${signal.summary}`);
        }
        if (signal.url) {
          parts.push(` Read more: ${signal.url}`);
        }
        if (signal.hardNumbers) {
          parts.push(` Data: ${signal.hardNumbers}`);
        }
      }
      parts.push("");
    }

    if (digest.entitySpotlight && digest.entitySpotlight.length > 0) {
      parts.push(`ENTITIES TO WATCH:`);
      for (const entity of digest.entitySpotlight.slice(0, 4)) {
        const typeLabel = entity.type ? `[${entity.type}]` : "";
        const stage = entity.fundingStage ? ` - ${entity.fundingStage}` : "";
        parts.push(`${entity.name} ${typeLabel}${stage}`);
        parts.push(` ${entity.keyInsight}`);
        if (entity.type === "company") {
          const newsQuery = encodeURIComponent(`${entity.name} latest news`);
          parts.push(` News: https://news.google.com/search?q=${newsQuery}`);
        }
      }
      parts.push("");
    }

    if (digest.actionItems && digest.actionItems.length > 0) {
      parts.push(`ACTION ITEMS:`);
      for (let i = 0; i < Math.min(digest.actionItems.length, 4); i++) {
        parts.push(`${i + 1}. ${digest.actionItems[i].action}`);
      }
      parts.push("");
    }

    parts.push(`---`);
    parts.push(`Powered by NodeBench AI - Autonomous Intelligence Platform`);
    parts.push(`#AI #TechIntelligence #DailyBrief #FactCheck #NodeBenchAI`);
  }

  let content = parts.join("\n");

  // Truncate if too long
  if (content.length > maxLength) {
    content = content.slice(0, maxLength - 50) + "\n\n---\nPowered by NodeBench AI";
  }

  return content;
}

/**
 * Post daily digest to LinkedIn for multiple personas.
 * Creates separate posts tailored to different audiences.
 *
 * Default personas: GENERAL, VC_INVESTOR, TECH_BUILDER
 * Can be scheduled at different times to avoid spam.
 */
export const postMultiPersonaDigest = internalAction({
  args: {
    personas: v.optional(v.array(v.string())),
    model: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    delayBetweenPostsMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const requestedPersonas = (args.personas || ["GENERAL"]) as PersonaId[];
    const model = args.model || "mimo-v2-flash-free";
    const dryRun = args.dryRun ?? false;
    const delayMs = args.delayBetweenPostsMs || 5000; // 5 second delay between posts

    console.log(`[multiPersonaDigest] Starting multi-persona posting for: ${requestedPersonas.join(", ")}`);

    const results: Array<{
      persona: string;
      success: boolean;
      postUrl?: string;
      error?: string;
      content?: string;
    }> = [];

    // Generate digest once (reuse for all personas)
    let digestResult;
    try {
      digestResult = await ctx.runAction(
        internal.domains.agents.digestAgent.generateDigestWithFactChecks,
        { persona: "GENERAL", model }
      );
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      console.error(`[multiPersonaDigest] Failed to generate digest: ${errorMsg}`);
      return {
        success: false,
        error: `Digest generation failed: ${errorMsg}`,
        results: [],
      };
    }

    if (!digestResult.success || !digestResult.digest) {
      return {
        success: false,
        error: digestResult.error || "Unknown digest error",
        results: [],
      };
    }

    // Post for each persona
    for (let i = 0; i < requestedPersonas.length; i++) {
      const personaId = requestedPersonas[i];

      // Validate persona exists
      if (!LINKEDIN_PERSONAS[personaId]) {
        results.push({
          persona: personaId,
          success: false,
          error: `Unknown persona: ${personaId}`,
        });
        continue;
      }

      // Format content for this persona
      const linkedInContent = formatDigestForPersona(digestResult.digest, personaId);

      console.log(`[multiPersonaDigest] Formatted content for ${personaId} (${linkedInContent.length} chars)`);

      if (dryRun) {
        console.log(`[multiPersonaDigest] DRY RUN - would post for ${personaId}:\n${linkedInContent}`);
        results.push({
          persona: personaId,
          success: true,
          content: linkedInContent,
        });
        continue;
      }

      // Post to LinkedIn
      try {
        const postResult = await ctx.runAction(
          internal.domains.social.linkedinPosting.createTextPost,
          { text: linkedInContent }
        );

        if (postResult.success) {
          console.log(`[multiPersonaDigest] Posted ${personaId} to LinkedIn: ${postResult.postUrl}`);
          results.push({
            persona: personaId,
            success: true,
            postUrl: postResult.postUrl,
            content: linkedInContent,
          });
        } else {
          results.push({
            persona: personaId,
            success: false,
            error: postResult.error,
            content: linkedInContent,
          });
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        results.push({
          persona: personaId,
          success: false,
          error: errorMsg,
          content: linkedInContent,
        });
      }

      // Delay between posts (except for last one)
      if (!dryRun && i < requestedPersonas.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[multiPersonaDigest] Completed: ${successCount}/${results.length} posts successful`);

    return {
      success: successCount > 0,
      totalPosts: results.length,
      successCount,
      results,
    };
  },
});

/**
 * Test multi-persona posting without actually posting
 */
export const testMultiPersonaDigest = internalAction({
  args: {
    personas: v.optional(v.array(v.string())),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.workflows.dailyLinkedInPost.postMultiPersonaDigest, {
      personas: args.personas || ["GENERAL", "VC_INVESTOR", "TECH_BUILDER"],
      model: args.model,
      dryRun: true,
    });
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP FUNDING BRIEF - Detailed company profiles with backgrounds
// Uses LIVE data from fundingEvents + entityContexts tables
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Funding company profile for detailed posts
 */
interface FundingProfile {
  companyName: string;
  roundType: string;
  amount: string;
  announcedDate: string;
  sector: string;
  product: string;
  founders: string;
  foundersBackground: string;
  investors: string[];
  investorBackground: string;
  website: string;
  sourceUrl: string;
  crunchbaseUrl: string;
  newsUrl: string;
  confidence: number;
  verificationStatus: string;
}

/**
 * Sanitize text for LinkedIn posting.
 * Removes invisible characters, normalizes Unicode, and keeps only safe chars.
 * CRITICAL: AI-generated content often contains invisible Unicode that breaks LinkedIn!
 * CRITICAL: Parentheses cause LinkedIn to truncate posts - replace with brackets!
 */
function sanitizeForLinkedIn(text: string): string {
  if (!text) return text;
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Control characters
    .replace(/[\u200B-\u200F\u2028-\u202E\uFEFF]/g, '') // Zero-width and direction
    .replace(/[\u00A0\u2007\u202F\u2060]/g, ' ') // Special spaces
    .replace(/[\u2018\u2019\u0060\u00B4\u2032\u2035]/g, "'") // Quote variants
    .replace(/[\u201C\u201D\u00AB\u00BB\u2033\u2036]/g, '"') // Double quote variants
    .replace(/[\u2013\u2014\u2015\u2212]/g, '-') // Dash variants
    .replace(/[\uFF08\u0028\(]/g, '[') // ALL parentheses to brackets - LinkedIn truncates at ()!
    .replace(/[\uFF09\u0029\)]/g, ']')
    .replace(/[\u2026]/g, '...') // Ellipsis
    .replace(/[^\x20-\x7E\n\u00C0-\u024F\u1E00-\u1EFF\[\]]/g, '') // Keep only safe chars + brackets
    .replace(/ +/g, ' ') // Collapse spaces
    .trim();
}

/**
 * Format a detailed Startup Funding Brief for LinkedIn.
 * Each company gets a full profile with background info.
 */
/**
 * Format a DETAILED company profile (full info - ~600-800 chars each)
 * Includes founders, backgrounds, investor notes for banker-grade intel
 */
function formatCompanyDetailed(
  p: FundingProfile,
  index: number
): string {
  const roundLabel = p.roundType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const lines: string[] = [];

  lines.push(`${index}. ${p.companyName.toUpperCase()}`);
  lines.push(`${roundLabel} - ${p.amount}`);
  lines.push(`Announced: ${p.announcedDate}`);

  // Sector
  const sector = sanitizeForLinkedIn(p.sector);
  if (sector && sector !== "N/A") {
    lines.push(`Sector: ${sector}`);
  }

  // Product - full description
  const product = sanitizeForLinkedIn(p.product);
  if (product && product !== "N/A") {
    lines.push(`Product: ${product}`);
  }

  // Founders with backgrounds
  const founders = sanitizeForLinkedIn(p.founders);
  if (founders && founders !== "N/A") {
    lines.push(`Founders: ${founders}`);
    const foundersBackground = sanitizeForLinkedIn(p.foundersBackground || "");
    if (foundersBackground && foundersBackground !== "N/A") {
      lines.push(`Background: ${foundersBackground}`);
    }
  }

  // Investors with notes
  if (p.investors.length > 0) {
    const investorList = p.investors.slice(0, 5).map(inv => sanitizeForLinkedIn(inv)).join(", ");
    lines.push(`Investors: ${investorList}`);
    const investorBackground = sanitizeForLinkedIn(p.investorBackground || "");
    if (investorBackground && investorBackground !== "N/A") {
      lines.push(`Investor Notes: ${investorBackground}`);
    }
  }

  // Website
  if (p.website && p.website !== "N/A") {
    lines.push(`Website: ${p.website}`);
  }

  // Source URL
  if (p.sourceUrl) {
    lines.push(`Source: ${p.sourceUrl}`);
  }

  return lines.join("\n");
}

/**
 * Format multi-part LinkedIn posts with DETAILED company profiles
 * Returns array of posts, each under 2800 chars (safe margin)
 * With ~700 chars per detailed profile, expect ~3-4 companies per post
 *
 * INCLUDES: Link to full funding brief on the app for additional companies
 */
function formatStartupFundingBriefMultiPart(
  profiles: FundingProfile[],
  dateString: string,
  totalEventsAvailable?: number
): string[] {
  const MAX_POST_LENGTH = 2800; // Safe margin under 3000
  const posts: string[] = [];

  // App URL for full funding brief (uses hash-based navigation)
  const APP_URL = "https://nodebench-ai.vercel.app/#funding";

  const header = `STARTUP FUNDING BRIEF\n${dateString} - NodeBench AI`;

  // Show if there are more events than we're displaying
  const moreEventsNote = totalEventsAvailable && totalEventsAvailable > profiles.length
    ? `\n\nSee all ${totalEventsAvailable} funding rounds: ${APP_URL}`
    : `\n\nFull funding brief: ${APP_URL}`;

  const footer = `${moreEventsNote}\n\nNodeBench AI - Startup Intelligence\n#Startups #Funding #VentureCapital #AI #TechNews`;

  let currentPost = header + `\n[1/?] Latest Funding Rounds\n`;
  let partNumber = 1;
  let profileIndex = 1;

  for (const profile of profiles) {
    // Use DETAILED format - full founders, backgrounds, investor notes
    const companySection = formatCompanyDetailed(profile, profileIndex);
    const sectionWithSpacing = "\n\n" + companySection;

    // Check if adding this section would exceed limit
    if (currentPost.length + sectionWithSpacing.length + footer.length > MAX_POST_LENGTH) {
      // Finish current post
      currentPost += footer;
      posts.push(currentPost);

      // Start new post
      partNumber++;
      currentPost = `${header}\n[${partNumber}/?] Continued\n` + "\n" + companySection;
    } else {
      currentPost += sectionWithSpacing;
    }
    profileIndex++;
  }

  // Add final post
  currentPost += footer;
  posts.push(currentPost);

  // Update part numbers now that we know total count
  const totalParts = posts.length;
  for (let i = 0; i < posts.length; i++) {
    posts[i] = posts[i].replace(`[${i + 1}/?]`, `[${i + 1}/${totalParts}]`);
  }

  return posts;
}

/**
 * Original single-post formatter (for reference/fallback)
 */
function formatStartupFundingBrief(
  profiles: FundingProfile[],
  dateString: string
): string {
  // Build content with explicit double newlines for LinkedIn paragraph breaks
  const sections: string[] = [];

  // Header
  sections.push(`STARTUP FUNDING BRIEF\n${dateString} - NodeBench AI\nLatest Funding Rounds`);

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    const roundLabel = p.roundType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Sanitize all AI-enriched content
    const sector = sanitizeForLinkedIn(p.sector);
    const product = sanitizeForLinkedIn(p.product);
    const founders = sanitizeForLinkedIn(p.founders);
    const foundersBackground = sanitizeForLinkedIn(p.foundersBackground || "");
    const investorBackground = sanitizeForLinkedIn(p.investorBackground || "");

    // Build company section
    const companyLines: string[] = [];
    companyLines.push(`${i + 1}. ${p.companyName.toUpperCase()}`);
    companyLines.push(`${roundLabel} - ${p.amount}`);
    companyLines.push(`Announced: ${p.announcedDate}`);

    if (sector && sector !== "N/A") {
      companyLines.push(`Sector: ${sector}`);
    }
    if (product && product !== "N/A") {
      companyLines.push(`Product: ${product}`);
    }
    if (founders && founders !== "N/A") {
      companyLines.push(`Founders: ${founders}`);
      if (foundersBackground && foundersBackground !== "N/A") {
        companyLines.push(`Background: ${foundersBackground}`);
      }
    }
    if (p.investors.length > 0) {
      const investorList = p.investors.slice(0, 5).map(inv => sanitizeForLinkedIn(inv)).join(", ");
      companyLines.push(`Investors: ${investorList}`);
      if (investorBackground && investorBackground !== "N/A") {
        companyLines.push(`Investor Notes: ${investorBackground}`);
      }
    }
    if (p.website && p.website !== "N/A") {
      companyLines.push(`Website: ${p.website}`);
    }
    if (p.sourceUrl) {
      companyLines.push(`Source: ${p.sourceUrl}`);
    }

    sections.push(companyLines.join("\n"));
  }

  // Footer with hashtags on separate line
  sections.push(`NodeBench AI - Startup Intelligence`);
  sections.push(`#Startups #Funding #VentureCapital #AI #TechNews #Founders`);

  // Join sections with double newlines for LinkedIn paragraph breaks
  return sections.join("\n\n");
}

/**
 * Enrich a company profile by fetching source article and extracting details via LLM.
 * CRITICAL: Also extracts the ACTUAL company name from source content to fix "Unknown Company" issues.
 */
async function enrichCompanyProfile(
  ctx: any,
  companyName: string,
  sourceUrl: string,
  existingData: Partial<FundingProfile>
): Promise<Partial<FundingProfile>> {
  // Skip if we already have good data (but still run if company name looks generic)
  const hasGoodData = existingData.founders !== "N/A" && existingData.product !== "N/A";
  const hasGenericName = companyName.toLowerCase().includes("unknown") ||
    companyName.toLowerCase() === "company" ||
    companyName.length < 3;

  if (hasGoodData && !hasGenericName) {
    return existingData;
  }

  console.log(`[enrichCompanyProfile] Enriching ${companyName} from ${sourceUrl} (genericName=${hasGenericName})`);

  try {
    // Fetch the source article content with JS rendering
    let articleContent = "";
    if (sourceUrl) {
      try {
        const fetchResult = await ctx.runAction(
          internal.tools.media.linkupFetch.linkupFetchInternal,
          { url: sourceUrl, renderJs: true }
        );
        // Handle both string and object returns
        if (typeof fetchResult === "string") {
          articleContent = fetchResult;
        } else if (fetchResult && typeof fetchResult === "object") {
          articleContent = (fetchResult as any).content || (fetchResult as any).text || JSON.stringify(fetchResult);
        }
        console.log(`[enrichCompanyProfile] Fetched ${articleContent.length} chars from source`);
      } catch (e) {
        console.warn(`[enrichCompanyProfile] Failed to fetch source: ${e}`);
      }
    }

    // If still no content, construct from what we know + basic description
    if (!articleContent || articleContent.length < 100) {
      // Build a fallback context from the company name and any known info
      articleContent = `Company: ${companyName}. This is a company that recently received funding. Research their products and founders.`;
      console.log(`[enrichCompanyProfile] Using fallback context for ${companyName}`);
    }

    // Use direct OpenRouter API call (free model)
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.warn(`[enrichCompanyProfile] No OPENROUTER_API_KEY, skipping enrichment`);
      return existingData;
    }

    // Build the extraction prompt - VC/Banking standard taxonomy
    // CRITICAL: Include companyName extraction to fix "Unknown Company" issues
    const extractionPrompt = `You are a senior associate at a top-tier investment bank preparing a deal memo.
The original company name detected was: "${companyName}" - this may be INCORRECT or generic.

${articleContent.length > 200 ? `SOURCE MATERIAL:\n${articleContent.substring(0, 8000)}\n\n` : ""}

CRITICAL: Extract the ACTUAL company name from the source material. Look for:
- Company name in headlines (e.g., "XYZ Raises $50M")
- Company name mentioned with funding amount
- Website domain name (e.g., if website is xyz.com, company is likely "XYZ")
- Press release "about" sections

Return ONLY valid JSON:

{
  "companyName": "The CORRECT company name - extract from source, not the generic name provided. Must be a real company name, not 'Unknown Company'",
  "product": "Core value proposition and technology stack - be specific (1-2 sentences, use precise technical terms)",
  "sector": "Use STANDARD VC TAXONOMY:
    - AI/ML: Foundation Models, MLOps, AI Infrastructure, Vertical AI, AI Agents, Computer Vision, NLP
    - Enterprise SaaS: DevTools, Security, Data Infrastructure, Collaboration, Analytics, HRTech, LegalTech
    - FinTech: Payments, Lending, InsurTech, WealthTech, Banking Infrastructure, Crypto/Web3
    - HealthTech: Biotech, MedTech, Digital Health, Drug Discovery, Diagnostics, Clinical Trials
    - Consumer: Marketplace, Social, Gaming, E-commerce, EdTech, Creator Economy
    - DeepTech: Robotics, Semiconductors, Quantum, Climate Tech, Space Tech, Defense Tech
    - Infra: Cloud, Storage, Networking, Compute
    Format: 'Category - Subcategory' (e.g., 'AI/ML - Foundation Models', 'FinTech - Payments')",
  "founders": "Name (Title) - Format exactly as: 'John Smith (CEO), Jane Doe (CTO)'",
  "foundersBackground": "Prior exits, notable employers (FAANG, unicorns), education (Stanford/MIT/Harvard). Format: 'Ex-Google DeepMind, Stanford PhD; Ex-Stripe, MIT'",
  "investors": ["Lead investor first, then notable participants - max 5"],
  "investorBackground": "Investor track record: prior portfolio companies, fund thesis, AUM if known",
  "website": "https://company.com format",
  "roundType": "Exact round: pre-seed, seed, series-a, series-b, series-c, series-d, growth, bridge, extension, PIPE"
}

RULES:
- ALWAYS extract the real company name from the source - NEVER return "Unknown Company"
- Use "Unknown" only for genuinely unknown data fields, NOT for company name
- Use your knowledge for publicly available information
- Be precise - bankers verify everything`;

    // Direct OpenRouter API call using free model (MiMo V2 Flash - excellent for research)
    console.log(`[enrichCompanyProfile] Calling OpenRouter API for ${companyName}...`);
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://nodebench.ai",
        "X-Title": "NodeBench AI Funding Brief",
      },
      body: JSON.stringify({
        model: "xiaomi/mimo-v2-flash:free", // Fast free model - excellent for research
        messages: [{ role: "user", content: extractionPrompt }],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[enrichCompanyProfile] OpenRouter error: ${response.status} ${errorText}`);
      return existingData;
    }

    const data = await response.json();
    const resultText = data.choices?.[0]?.message?.content || "";
    console.log(`[enrichCompanyProfile] Got response (${resultText.length} chars): ${resultText.substring(0, 200)}...`);

    // Parse the JSON response - handle various formats
    let cleanText = resultText;
    // Remove thinking tokens if present
    cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/g, "");
    // Remove markdown code blocks
    cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

    console.log(`[enrichCompanyProfile] Cleaned text for parsing: ${cleanText.substring(0, 300)}...`);

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      console.log(`[enrichCompanyProfile] Extracted data for ${companyName}:`, Object.keys(extracted));

      // CRITICAL: Update company name if we found a better one
      let newCompanyName = existingData.companyName;
      if (extracted.companyName &&
          extracted.companyName !== "Unknown" &&
          extracted.companyName !== "Unknown Company" &&
          extracted.companyName.length > 2) {
        newCompanyName = extracted.companyName;
        console.log(`[enrichCompanyProfile] Corrected company name: "${companyName}" -> "${newCompanyName}"`);
      }

      return {
        ...existingData,
        companyName: newCompanyName,
        product: extracted.product !== "Unknown" ? extracted.product : existingData.product,
        sector: extracted.sector !== "Unknown" ? extracted.sector : existingData.sector,
        founders: extracted.founders !== "Unknown" ? extracted.founders : existingData.founders,
        foundersBackground: extracted.foundersBackground !== "Unknown" ? extracted.foundersBackground : existingData.foundersBackground,
        investors: extracted.investors?.length > 0 ? extracted.investors : existingData.investors,
        investorBackground: extracted.investorBackground !== "Unknown" ? extracted.investorBackground : existingData.investorBackground,
        website: extracted.website !== "Unknown" ? extracted.website : existingData.website,
        roundType: extracted.roundType !== "Unknown" ? extracted.roundType : existingData.roundType,
      };
    }
  } catch (e) {
    console.error(`[enrichCompanyProfile] Enrichment failed for ${companyName}:`, e);
  }

  return existingData;
}

/**
 * Post a detailed Startup Funding Brief to LinkedIn.
 * Pulls LIVE data from fundingEvents + entityContexts tables.
 * Uses AI enrichment to research missing company details.
 *
 * EXPANDED FEATURES:
 * - Deduplication: Skips companies already posted within lookbackDays
 * - Sector filtering: Can focus on specific sectors (healthcare, fintech, etc.)
 * - Progression tracking: Notes when a company raises a new round
 */
export const postStartupFundingBrief = internalAction({
  args: {
    dryRun: v.optional(v.boolean()),
    hoursBack: v.optional(v.number()),
    maxProfiles: v.optional(v.number()),
    roundTypes: v.optional(v.array(v.string())),
    sectorCategories: v.optional(v.array(v.string())), // NEW: Filter by sector
    enableEnrichment: v.optional(v.boolean()),
    skipDeduplication: v.optional(v.boolean()), // NEW: Bypass dedup check
    deduplicationDays: v.optional(v.number()), // NEW: Lookback window for dedup
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? false;
    const hoursBack = args.hoursBack ?? 48;
    const maxProfiles = args.maxProfiles ?? 10; // Increased default from 5 to 10
    const enableEnrichment = args.enableEnrichment ?? true;
    const skipDeduplication = args.skipDeduplication ?? false;
    const deduplicationDays = args.deduplicationDays ?? 14; // Default: skip if posted within 14 days

    // EXPANDED: Include all major round types by default
    const roundTypes = args.roundTypes ?? [
      "pre-seed", "seed", "series-a", "series-b", "series-c", "series-d-plus",
      "growth", "debt", "unknown"
    ];

    // NEW: Sector category filter (optional)
    const sectorCategories = args.sectorCategories; // undefined = all sectors
    const dateString = new Date().toISOString().split("T")[0];

    console.log(`[startupFundingBrief] Starting funding brief generation`);
    console.log(`  - hoursBack=${hoursBack}, max=${maxProfiles}, enrich=${enableEnrichment}`);
    console.log(`  - roundTypes=${roundTypes.join(",")}`);
    console.log(`  - sectorCategories=${sectorCategories?.join(",") ?? "all"}`);
    console.log(`  - dedup=${!skipDeduplication}, dedup window=${deduplicationDays} days`);

    // Step 1: Fetch funding events from the database
    let fundingEvents: any[] = [];
    try {
      fundingEvents = await ctx.runQuery(
        internal.domains.enrichment.fundingMutations.getRecentFundingEvents,
        {
          lookbackHours: hoursBack,
          roundTypes: roundTypes as any,
          minConfidence: 0.5,
          limit: maxProfiles * 2,
        }
      );
      console.log(`[startupFundingBrief] Fetched ${fundingEvents.length} funding events from DB`);
    } catch (e) {
      console.error(`[startupFundingBrief] Failed to fetch funding events:`, e);
      fundingEvents = [];
    }

    // Step 1.5: Batch check for previously posted companies (deduplication)
    let previouslyPosted: Record<string, {
      previousPostUrl: string;
      previousRoundType: string;
      previousAmountRaw: string;
      postedAt: number;
    } | null> = {};

    if (!skipDeduplication && fundingEvents.length > 0) {
      try {
        previouslyPosted = await ctx.runQuery(
          internal.domains.social.linkedinFundingPosts.batchCheckCompaniesPosted,
          {
            companyNames: fundingEvents.map(e => e.companyName),
            lookbackDays: deduplicationDays,
          }
        );
        const postedCount = Object.values(previouslyPosted).filter(v => v !== null).length;
        console.log(`[startupFundingBrief] Dedup check: ${postedCount}/${fundingEvents.length} companies already posted`);
      } catch (e) {
        console.warn(`[startupFundingBrief] Dedup check failed, proceeding without:`, e);
      }
    }

    // Step 2: Enrich with entity context data + AI enrichment
    const fundingProfiles: FundingProfile[] = [];
    const skippedDuplicates: string[] = [];
    const progressions: { company: string; previousUrl: string; previousRound: string }[] = [];

    for (const event of fundingEvents) {
      if (fundingProfiles.length >= maxProfiles) break;

      // DEDUPLICATION CHECK: Skip if already posted (same round)
      const prevPost = previouslyPosted[event.companyName];
      if (prevPost && !skipDeduplication) {
        // Check if this is the same round (duplicate) or a new round (progression)
        if (prevPost.previousRoundType === event.roundType) {
          console.log(`[startupFundingBrief] Skipping ${event.companyName} - already posted ${event.roundType} on ${new Date(prevPost.postedAt).toLocaleDateString()}`);
          skippedDuplicates.push(`${event.companyName} [${event.roundType}] -> ${prevPost.previousPostUrl}`);
          continue;
        } else {
          // This is a progression (new round since last post)
          console.log(`[startupFundingBrief] Progression: ${event.companyName} from ${prevPost.previousRoundType} to ${event.roundType}`);
          progressions.push({
            company: event.companyName,
            previousUrl: prevPost.previousPostUrl,
            previousRound: prevPost.previousRoundType,
          });
        }
      }

      // Try to get entity context for richer data
      let entityData: any = null;
      if (event.companyId) {
        try {
          entityData = await ctx.runQuery(
            internal.domains.knowledge.entityContexts.getEntityContextById,
            { entityId: event.companyId }
          );
        } catch (e) {
          console.warn(`[startupFundingBrief] Could not fetch entity for ${event.companyName}`);
        }
      }

      const crm = entityData?.crmFields;

      // Check sector filter (if specified)
      const eventSector = crm?.industry || event.sector || "";
      if (sectorCategories && sectorCategories.length > 0) {
        const sectorLower = eventSector.toLowerCase();
        const matchesSector = sectorCategories.some((cat: string) => {
          if (cat === "healthcare" && (sectorLower.includes("health") || sectorLower.includes("bio") || sectorLower.includes("med"))) return true;
          if (cat === "fintech" && (sectorLower.includes("fin") || sectorLower.includes("payment") || sectorLower.includes("bank"))) return true;
          if (cat === "ai_ml" && (sectorLower.includes("ai") || sectorLower.includes("ml") || sectorLower.includes("machine"))) return true;
          if (cat === "enterprise" && (sectorLower.includes("saas") || sectorLower.includes("enterprise") || sectorLower.includes("b2b"))) return true;
          if (cat === "consumer" && (sectorLower.includes("consumer") || sectorLower.includes("commerce") || sectorLower.includes("retail"))) return true;
          if (cat === "deeptech" && (sectorLower.includes("deep") || sectorLower.includes("robot") || sectorLower.includes("quantum"))) return true;
          if (cat === "climate" && (sectorLower.includes("climate") || sectorLower.includes("energy") || sectorLower.includes("clean"))) return true;
          if (cat === "technology") return true; // Match all tech
          return false;
        });
        if (!matchesSector) {
          console.log(`[startupFundingBrief] Skipping ${event.companyName} - sector "${eventSector}" doesn't match ${sectorCategories.join(",")}`);
          continue;
        }
      }

      // Build initial profile
      let profile: FundingProfile = {
        companyName: event.companyName,
        roundType: event.roundType,
        amount: event.amountRaw || (event.amountUsd ? `$${(event.amountUsd / 1_000_000).toFixed(1)}M` : "Undisclosed"),
        announcedDate: new Date(event.announcedAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        sector: crm?.industry || event.sector || "N/A",
        product: crm?.product || event.description || "N/A",
        founders: crm?.founders?.join(", ") || "N/A",
        foundersBackground: crm?.foundersBackground || "N/A",
        investors: [
          ...event.leadInvestors,
          ...(event.coInvestors || []),
        ].slice(0, 6),
        investorBackground: crm?.investorBackground || "N/A",
        website: crm?.website || "N/A",
        sourceUrl: event.sourceUrls?.[0] || "",
        crunchbaseUrl: `https://www.crunchbase.com/textsearch?q=${encodeURIComponent(event.companyName)}`,
        newsUrl: `https://news.google.com/search?q=${encodeURIComponent(event.companyName + " funding")}`,
        confidence: event.confidence,
        verificationStatus: event.verificationStatus,
      };

      // Step 3: AI enrichment if needed and enabled
      console.log(`[startupFundingBrief] Profile for ${event.companyName}:`, {
        founders: profile.founders,
        product: profile.product,
        sector: profile.sector,
        enableEnrichment,
        needsEnrichment: profile.founders === "N/A" || profile.product === "N/A" || profile.sector === "N/A",
      });
      if (enableEnrichment && (profile.founders === "N/A" || profile.product === "N/A" || profile.sector === "N/A")) {
        console.log(`[startupFundingBrief] Enriching ${event.companyName} via AI...`);
        const enriched = await enrichCompanyProfile(
          ctx,
          event.companyName,
          event.sourceUrls?.[0] || "",
          profile
        );
        profile = { ...profile, ...enriched } as FundingProfile;
      }

      fundingProfiles.push(profile);
    }

    console.log(`[startupFundingBrief] Built ${fundingProfiles.length} profiles with enrichment`);

    if (fundingProfiles.length === 0) {
      console.log(`[startupFundingBrief] No funding events found in the last ${hoursBack} hours`);
      return {
        success: true,
        posted: false,
        reason: `No ${roundTypes.join("/")} funding events found in the last ${hoursBack} hours`,
        profileCount: 0,
      };
    }

    // Format the LinkedIn posts (multi-part if needed)
    // Pass total events count to show link to app for full list
    const totalEventsAvailable = fundingEvents.length;
    const linkedInPosts = formatStartupFundingBriefMultiPart(fundingProfiles, dateString, totalEventsAvailable);
    const totalContent = linkedInPosts.join("\n\n---\n\n");
    console.log(`[startupFundingBrief] Formatted ${linkedInPosts.length} posts (${linkedInPosts.map(p => p.length).join(", ")} chars each)`);

    if (dryRun) {
      console.log(`[startupFundingBrief] DRY RUN - ${linkedInPosts.length} posts:`);
      linkedInPosts.forEach((p, i) => console.log(`\n--- Post ${i + 1} ---\n${p}`));
      return {
        success: true,
        posted: false,
        dryRun: true,
        content: totalContent,
        postCount: linkedInPosts.length,
        profileCount: fundingProfiles.length,
        profiles: fundingProfiles.map(p => ({
          name: p.companyName,
          round: p.roundType,
          amount: p.amount,
          product: p.product,
          founders: p.founders,
        })),
      };
    }

    // Post each part to LinkedIn with delay between posts
    const postUrls: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < linkedInPosts.length; i++) {
      // Add 30 second delay between posts (LinkedIn rate limit)
      if (i > 0) {
        console.log(`[startupFundingBrief] Waiting 30s before posting part ${i + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }

      try {
        const postResult = await ctx.runAction(
          internal.domains.social.linkedinPosting.createTextPost,
          { text: linkedInPosts[i] }
        );

        if (postResult.success && postResult.postUrl) {
          postUrls.push(postResult.postUrl);
          console.log(`[startupFundingBrief] Posted part ${i + 1}/${linkedInPosts.length}: ${postResult.postUrl}`);
        } else {
          errors.push(`Part ${i + 1}: ${postResult.error || "Unknown error"}`);
          console.error(`[startupFundingBrief] Failed to post part ${i + 1}:`, postResult.error);
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        errors.push(`Part ${i + 1}: ${errorMsg}`);
        console.error(`[startupFundingBrief] Exception posting part ${i + 1}:`, errorMsg);
      }
    }

    const allPosted = postUrls.length === linkedInPosts.length;
    console.log(`[startupFundingBrief] Posted ${postUrls.length}/${linkedInPosts.length} parts`);

    // Step 5: Record posted companies for deduplication tracking
    if (postUrls.length > 0) {
      try {
        // Prepare the batch record request
        const companiesForRecording = fundingProfiles.map(profile => ({
          companyName: profile.companyName,
          roundType: profile.roundType,
          amountRaw: profile.amount,
          sector: profile.sector,
          postUrn: postUrls[0].split("/").pop() || postUrls[0], // Extract URN from URL
          postUrl: postUrls[0], // Link to first post (they're related)
          postPart: 1,
          totalParts: postUrls.length,
        }));

        await ctx.runMutation(
          internal.domains.social.linkedinFundingPosts.batchRecordPostedCompanies,
          { companies: companiesForRecording }
        );
        console.log(`[startupFundingBrief] Recorded ${companiesForRecording.length} companies for deduplication`);
      } catch (e) {
        console.warn(`[startupFundingBrief] Failed to record companies for dedup:`, e);
        // Don't fail the whole operation if recording fails
      }
    }

    return {
      success: allPosted,
      posted: postUrls.length > 0,
      postUrl: postUrls[0], // First post URL
      postUrls: postUrls,
      postCount: linkedInPosts.length,
      postedCount: postUrls.length,
      content: totalContent,
      profileCount: fundingProfiles.length,
      skippedDuplicates: skippedDuplicates.length > 0 ? skippedDuplicates : undefined,
      progressions: progressions.length > 0 ? progressions : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

/**
 * Test the startup funding brief without posting
 */
export const testStartupFundingBrief = internalAction({
  args: {
    hoursBack: v.optional(v.number()),
    maxProfiles: v.optional(v.number()),
    enableEnrichment: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await ctx.runAction(internal.workflows.dailyLinkedInPost.postStartupFundingBrief, {
      dryRun: true,
      hoursBack: args.hoursBack ?? 720, // Default to 30 days for testing
      maxProfiles: args.maxProfiles ?? 5,
      enableEnrichment: args.enableEnrichment ?? true,
    });
  },
});
