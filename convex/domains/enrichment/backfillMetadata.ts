/**
 * Backfill Missing Metadata Fields
 *
 * Populates empty fields in fundingEvents:
 * 1. sourceNames (map domains to publisher names)
 * 2. sector (classify companies by industry)
 * 3. location (extract from articles/company data)
 * 4. valuation (parse from article titles/content)
 * 5. Run multi-source validation
 */

import { internalAction, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { v } from "convex/values";

// Domain to publisher name mapping
const DOMAIN_TO_PUBLISHER: Record<string, string> = {
  "siliconangle.com": "SiliconANGLE",
  "news.crunchbase.com": "Crunchbase News",
  "techcrunch.com": "TechCrunch",
  "endpoints.news": "Endpoints News",
  "bloomberg.com": "Bloomberg",
  "reuters.com": "Reuters",
  "wsj.com": "Wall Street Journal",
  "ft.com": "Financial Times",
  "venturebeat.com": "VentureBeat",
  "theinformation.com": "The Information",
  "axios.com": "Axios",
  "fortune.com": "Fortune",
  "forbes.com": "Forbes",
  "businessinsider.com": "Business Insider",
  "cnbc.com": "CNBC",
};

// Sector classification keywords
const SECTOR_KEYWORDS: Record<string, string[]> = {
  "AI/ML - Foundation Models": ["foundation model", "llm", "large language model", "gpt", "generative ai platform"],
  "AI/ML - Generative AI": ["generative ai", "image generation", "video generation", "text generation", "stable diffusion"],
  "AI/ML - Robotics": ["robot", "robotics", "autonomous", "drone", "automation hardware"],
  "AI/ML - AI Agents": ["ai agent", "agentic", "autonomous agent", "workflow automation", "rpa"],
  "AI/ML - AI Infrastructure": ["ai infrastructure", "gpu", "inference", "training", "ml ops", "model serving"],
  "AI/ML - Vertical AI": ["vertical ai", "industry-specific ai", "domain-specific ai"],
  "AI/ML - Computer Vision": ["computer vision", "image recognition", "object detection", "visual ai"],
  "HealthTech - Digital Health": ["digital health", "health platform", "patient", "telehealth", "healthcare software"],
  "HealthTech - MedTech": ["medical device", "diagnostic", "medical equipment", "clinical"],
  "HealthTech - Biotech": ["biotech", "drug", "therapeutic", "clinical trial", "pharmaceutical", "biopharmaceutical"],
  "FinTech - Banking Infrastructure": ["banking", "payments", "financial infrastructure", "payment processing"],
  "FinTech - Lending": ["lending", "credit", "loan", "underwriting"],
  "FinTech - InsurTech": ["insurance", "insurtech", "underwriting", "claims"],
  "FinTech - Wealth Management": ["wealth", "investment", "asset management", "trading"],
  "FinTech - Compliance": ["compliance", "kyc", "aml", "regulatory", "risk management"],
  "Enterprise SaaS - Security": ["security", "cybersecurity", "threat", "vulnerability", "zero trust"],
  "Enterprise SaaS - DevTools": ["developer", "devops", "ci/cd", "deployment", "infrastructure"],
  "Enterprise SaaS - Data Infrastructure": ["data warehouse", "data platform", "analytics", "business intelligence"],
  "Enterprise SaaS - Collaboration": ["collaboration", "communication", "workspace", "productivity"],
  "DeepTech - Semiconductors": ["semiconductor", "chip", "silicon", "asic", "processor"],
  "DeepTech - Quantum Computing": ["quantum", "qubit", "quantum computing"],
  "DeepTech - Defense Tech": ["defense", "military", "national security", "dual-use"],
  "DeepTech - Space Tech": ["space", "satellite", "launch", "orbital"],
  "LegalTech": ["legal", "law", "contract", "compliance legal", "litigation"],
  "Construction Tech": ["construction", "building", "infrastructure", "real estate development"],
  "Climate Tech": ["climate", "carbon", "sustainability", "renewable", "clean energy"],
  "EdTech": ["education", "learning", "training", "edtech", "student"],
  "Consumer - Hardware": ["consumer hardware", "wearable", "iot device", "smart home"],
  "Consumer - Gaming": ["gaming", "game", "esports", "metaverse"],
  "Crypto/Web3": ["crypto", "blockchain", "web3", "defi", "nft"],
  "Retail Tech": ["retail", "ecommerce", "shopping", "inventory"],
};

/**
 * Step 1: Backfill source publisher names
 */
export const backfillSourceNames = internalMutation({
  args: {
    fundingEventId: v.id("fundingEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.fundingEventId);
    if (!event) return { success: false, error: "Event not found" };

    // Skip if already has sourceNames
    if (event.sourceNames && event.sourceNames.length > 0) {
      return { success: true, skipped: true, reason: "Already has sourceNames" };
    }

    const publishers: string[] = [];

    if (event.sourceUrls && Array.isArray(event.sourceUrls)) {
      for (const url of event.sourceUrls) {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname.replace(/^www\./, '');
          const publisher = DOMAIN_TO_PUBLISHER[domain] || domain;
          if (!publishers.includes(publisher)) {
            publishers.push(publisher);
          }
        } catch (e) {
          // Invalid URL
        }
      }
    }

    if (publishers.length > 0) {
      await ctx.db.patch(args.fundingEventId, {
        sourceNames: publishers,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        publishers,
        count: publishers.length,
      };
    }

    return { success: false, error: "No publishers extracted" };
  },
});

/**
 * Step 2: Extract and populate sector
 */
export const backfillSector = internalAction({
  args: {
    fundingEventId: v.id("fundingEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(internal.domains.enrichment.fundingQueries.getFundingEventById, {
      id: args.fundingEventId,
    });

    if (!event) return { success: false, error: "Event not found" };

    // Skip if already has sector
    if (event.sector) {
      return { success: true, skipped: true, sector: event.sector };
    }

    // Classify based on description or fetch article
    let textToAnalyze = event.companyName + " ";
    if (event.description) textToAnalyze += event.description + " ";

    // Try to match keywords
    let bestMatch = { sector: "Technology", confidence: 0 };

    for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
      const text = textToAnalyze.toLowerCase();
      let matches = 0;
      for (const keyword of keywords) {
        if (text.includes(keyword.toLowerCase())) {
          matches++;
        }
      }
      if (matches > bestMatch.confidence) {
        bestMatch = { sector, confidence: matches };
      }
    }

    if (bestMatch.confidence > 0) {
      await ctx.runMutation(internal.domains.enrichment.backfillMetadata.updateSector, {
        fundingEventId: args.fundingEventId,
        sector: bestMatch.sector,
      });

      return {
        success: true,
        sector: bestMatch.sector,
        confidence: bestMatch.confidence,
      };
    }

    // If no match, use generic "Technology"
    await ctx.runMutation(internal.domains.enrichment.backfillMetadata.updateSector, {
      fundingEventId: args.fundingEventId,
      sector: "Technology",
    });

    return {
      success: true,
      sector: "Technology",
      confidence: 0,
      note: "Default sector assigned",
    };
  },
});

export const updateSector = internalMutation({
  args: {
    fundingEventId: v.id("fundingEvents"),
    sector: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fundingEventId, {
      sector: args.sector,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Step 3: Extract valuation from article URL/title
 */
export const backfillValuation = internalMutation({
  args: {
    fundingEventId: v.id("fundingEvents"),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.fundingEventId);
    if (!event) return { success: false, error: "Event not found" };

    // Skip if already has valuation
    if (event.valuation) {
      return { success: true, skipped: true, valuation: event.valuation };
    }

    // Parse from sourceUrls
    if (event.sourceUrls && event.sourceUrls.length > 0) {
      for (const url of event.sourceUrls) {
        // Patterns like: "at-1b-valuation", "4-25b-valuation", "hits-5b-valuation"
        const patterns = [
          /(\d+(?:\.\d+)?)[bm]-valuation/i,
          /at-(\d+(?:\.\d+)?)[bm]/i,
          /hits-(\d+(?:\.\d+)?)[bm]/i,
          /valuation-(\d+(?:\.\d+)?)[bm]/i,
        ];

        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) {
            const value = match[1];
            const unit = url.includes(`${value}b`) ? 'B' : 'M';
            const valuation = `$${value}${unit}`;

            await ctx.db.patch(args.fundingEventId, {
              valuation,
              updatedAt: Date.now(),
            });

            return {
              success: true,
              valuation,
              source: "URL pattern",
            };
          }
        }
      }
    }

    return { success: false, error: "No valuation found in URLs" };
  },
});

/**
 * Step 4: Batch backfill all fields for recent events
 */
export const batchBackfillAll = internalAction({
  args: {
    lookbackHours: v.optional(v.number()),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const lookbackHours = args.lookbackHours ?? 720; // 30 days
    const limit = args.limit ?? 100;
    const dryRun = args.dryRun ?? false;

    console.log(`[batchBackfill] Starting... (dryRun: ${dryRun})`);

    // Get all recent events
    const events = await ctx.runQuery(internal.domains.enrichment.fundingQueries.getRecentFundingEvents, {
      lookbackHours,
      limit,
    });

    console.log(`[batchBackfill] Found ${events.length} events`);

    const results = {
      total: events.length,
      sourceNames: { updated: 0, skipped: 0, failed: 0 },
      sectors: { updated: 0, skipped: 0, failed: 0 },
      valuations: { updated: 0, skipped: 0, failed: 0 },
    };

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`[batchBackfill] Processing ${i + 1}/${events.length}: ${event.companyName}`);

      if (dryRun) {
        console.log(`  - Would update: sourceNames, sector, valuation`);
        continue;
      }

      // 1. Source names
      try {
        const sourceResult = await ctx.runMutation(internal.domains.enrichment.backfillMetadata.backfillSourceNames, {
          fundingEventId: event.id as any,
        });
        if (sourceResult.success) {
          if (sourceResult.skipped) results.sourceNames.skipped++;
          else results.sourceNames.updated++;
        } else {
          results.sourceNames.failed++;
        }
      } catch (e: any) {
        console.log(`  - sourceNames failed: ${e.message}`);
        results.sourceNames.failed++;
      }

      // 2. Sector
      try {
        const sectorResult = await ctx.runAction(internal.domains.enrichment.backfillMetadata.backfillSector, {
          fundingEventId: event.id as any,
        });
        if (sectorResult.success) {
          if (sectorResult.skipped) results.sectors.skipped++;
          else results.sectors.updated++;
        } else {
          results.sectors.failed++;
        }
      } catch (e: any) {
        console.log(`  - sector failed: ${e.message}`);
        results.sectors.failed++;
      }

      // 3. Valuation
      try {
        const valuationResult = await ctx.runMutation(internal.domains.enrichment.backfillMetadata.backfillValuation, {
          fundingEventId: event.id as any,
        });
        if (valuationResult.success) {
          if (valuationResult.skipped) results.valuations.skipped++;
          else results.valuations.updated++;
        } else {
          results.valuations.failed++;
        }
      } catch (e: any) {
        console.log(`  - valuation failed: ${e.message}`);
        results.valuations.failed++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`[batchBackfill] Complete!`);
    console.log(`  - Source names: ${results.sourceNames.updated} updated, ${results.sourceNames.skipped} skipped`);
    console.log(`  - Sectors: ${results.sectors.updated} updated, ${results.sectors.skipped} skipped`);
    console.log(`  - Valuations: ${results.valuations.updated} updated, ${results.valuations.skipped} skipped`);

    return {
      success: true,
      results,
    };
  },
});
