"use node";

/**
 * Fast Verification Module
 *
 * Lightweight verification for funding events before LinkedIn posting.
 * Designed to complete in <5 seconds with minimal API calls.
 *
 * Checks:
 * 1. Entity exists (quick web search for business registration)
 * 2. Website is live (HEAD request)
 * 3. Source credibility score
 *
 * Returns a verification status badge for LinkedIn posts.
 */

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { api, internal } from "../../_generated/api";

// ============================================================================
// TYPES
// ============================================================================

export interface FastVerifyResult {
  companyName: string;
  entityFound: boolean;
  websiteLive: boolean | null; // null if no website provided
  sourceCredibility: "high" | "medium" | "low" | "unknown";
  overallStatus: "verified" | "partial" | "unverified" | "suspicious";
  badge: string; // Emoji badge for LinkedIn
  badgeText: string; // Text description
  confidence: number;
  details: {
    entitySearchResult?: string;
    websiteUrl?: string;
    websiteStatus?: number;
    sourceUrl?: string;
    sourceDomain?: string;
  };
  executionTimeMs: number;
}

// Trusted press release / news sources
const TRUSTED_SOURCES = new Set([
  "techcrunch.com",
  "bloomberg.com",
  "reuters.com",
  "prnewswire.com",
  "businesswire.com",
  "globenewswire.com",
  "crunchbase.com",
  "news.crunchbase.com",
  "pitchbook.com",
  "fortune.com",
  "forbes.com",
  "wsj.com",
  "ft.com",
  "venturebeat.com",
  "axios.com",
  "theinformation.com",
  "sifted.eu",
  "eu-startups.com",
  "dealroom.co",
  "siliconangle.com",
  "wired.com",
  "techradar.com",
]);

const MEDIUM_SOURCES = new Set([
  "linkedin.com",
  "twitter.com",
  "x.com",
  "medium.com",
  "substack.com",
  "yahoo.com",
  "benzinga.com",
  "seekingalpha.com",
]);

// ============================================================================
// MAIN FAST VERIFY ACTION
// ============================================================================

/**
 * Run fast verification on a company/funding claim.
 * Target execution time: <5 seconds.
 */
export const runFastVerify = internalAction({
  args: {
    companyName: v.string(),
    websiteUrl: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    skipEntityCheck: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<FastVerifyResult> => {
    const startTime = Date.now();
    const { companyName, websiteUrl, sourceUrl, skipEntityCheck } = args;

    console.log(`[fastVerify] Starting for ${companyName}`);

    // Initialize result
    let entityFound = false;
    let websiteLive: boolean | null = null;
    let sourceCredibility: FastVerifyResult["sourceCredibility"] = "unknown";
    const details: FastVerifyResult["details"] = {};

    // Run checks in parallel for speed
    const checks: Promise<void>[] = [];

    // 1. Entity check (quick web search)
    if (!skipEntityCheck) {
      checks.push(
        (async () => {
          try {
            const entityResult = await checkEntityExists(ctx, companyName);
            entityFound = entityResult.found;
            details.entitySearchResult = entityResult.summary;
          } catch (e) {
            console.warn(`[fastVerify] Entity check failed:`, e);
          }
        })()
      );
    }

    // 2. Website liveness check
    if (websiteUrl && websiteUrl !== "N/A") {
      details.websiteUrl = websiteUrl;
      checks.push(
        (async () => {
          try {
            const websiteResult = await checkWebsiteLive(websiteUrl);
            websiteLive = websiteResult.live;
            details.websiteStatus = websiteResult.status;
          } catch (e) {
            console.warn(`[fastVerify] Website check failed:`, e);
            websiteLive = null;
          }
        })()
      );
    }

    // 3. Source credibility (synchronous, no API call)
    if (sourceUrl) {
      details.sourceUrl = sourceUrl;
      const credResult = checkSourceCredibility(sourceUrl);
      sourceCredibility = credResult.credibility;
      details.sourceDomain = credResult.domain;
    }

    // Wait for all parallel checks (with timeout)
    await Promise.race([
      Promise.all(checks),
      new Promise((resolve) => setTimeout(resolve, 4000)), // 4 second timeout
    ]);

    // Calculate overall status
    const { status, badge, badgeText, confidence } = calculateOverallStatus(
      entityFound,
      websiteLive,
      sourceCredibility,
      skipEntityCheck ?? false
    );

    const executionTimeMs = Date.now() - startTime;
    console.log(
      `[fastVerify] Completed ${companyName} in ${executionTimeMs}ms: ${status}`
    );

    return {
      companyName,
      entityFound,
      websiteLive,
      sourceCredibility,
      overallStatus: status,
      badge,
      badgeText,
      confidence,
      details,
      executionTimeMs,
    };
  },
});

/**
 * Batch fast verify for multiple companies.
 * Runs verifications in parallel for speed.
 */
export const batchFastVerify = internalAction({
  args: {
    companies: v.array(
      v.object({
        companyName: v.string(),
        websiteUrl: v.optional(v.string()),
        sourceUrl: v.optional(v.string()),
      })
    ),
    maxConcurrent: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<FastVerifyResult[]> => {
    const startTime = Date.now();
    const maxConcurrent = args.maxConcurrent ?? 3;
    const results: FastVerifyResult[] = [];

    console.log(
      `[batchFastVerify] Starting for ${args.companies.length} companies (max concurrent: ${maxConcurrent})`
    );

    // Process in batches for rate limiting
    for (let i = 0; i < args.companies.length; i += maxConcurrent) {
      const batch = args.companies.slice(i, i + maxConcurrent);

      const batchResults = await Promise.all(
        batch.map((company: { companyName: string; websiteUrl?: string; sourceUrl?: string }) =>
          ctx.runAction(internal.domains.verification.fastVerification.runFastVerify, {
            companyName: company.companyName,
            websiteUrl: company.websiteUrl,
            sourceUrl: company.sourceUrl,
          })
        )
      );

      results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `[batchFastVerify] Completed ${results.length} companies in ${totalTime}ms`
    );

    return results;
  },
});

// ============================================================================
// VERIFICATION CHECKS
// ============================================================================

/**
 * Quick check if an entity exists via web search.
 * Looks for business registration or official company presence.
 */
async function checkEntityExists(
  ctx: any,
  companyName: string
): Promise<{ found: boolean; summary: string }> {
  try {
    // Search for official company presence
    const searchQuery = `"${companyName}" company official OR incorporated OR founded OR startup`;

    const result = await ctx.runAction(
      api.domains.search.fusion.actions.fusionSearch,
      {
        query: searchQuery,
        mode: "fast",
        maxTotal: 3,
        skipRateLimit: true,
      }
    );

    const results = result?.payload?.results ?? [];

    if (results.length === 0) {
      return { found: false, summary: "No official company presence found" };
    }

    // Check if any result mentions the company with credible context
    for (const r of results) {
      const content = ((r.snippet || "") + " " + (r.title || "")).toLowerCase();
      const companyLower = companyName.toLowerCase();

      if (content.includes(companyLower)) {
        // Check for credibility signals
        const hasOfficialSignals =
          content.includes("founded") ||
          content.includes("incorporated") ||
          content.includes("company") ||
          content.includes("startup") ||
          content.includes("funding") ||
          content.includes("ceo") ||
          content.includes("linkedin");

        if (hasOfficialSignals) {
          return {
            found: true,
            summary: `Found on ${extractDomain(r.url || "web")}`,
          };
        }
      }
    }

    return { found: false, summary: "Company name found but weak signals" };
  } catch (error) {
    console.warn(`[checkEntityExists] Search failed:`, error);
    return { found: false, summary: "Entity check failed" };
  }
}

/**
 * Check if a website is live via HEAD request.
 */
async function checkWebsiteLive(
  url: string
): Promise<{ live: boolean; status?: number }> {
  try {
    // Normalize URL
    let normalizedUrl = url;
    if (!url.startsWith("http")) {
      normalizedUrl = `https://${url}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(normalizedUrl, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    return {
      live: response.ok || response.status < 400,
      status: response.status,
    };
  } catch (error) {
    // Try GET if HEAD fails (some servers don't support HEAD)
    try {
      let normalizedUrl = url;
      if (!url.startsWith("http")) {
        normalizedUrl = `https://${url}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(normalizedUrl, {
        method: "GET",
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeoutId);

      return {
        live: response.ok || response.status < 400,
        status: response.status,
      };
    } catch {
      return { live: false };
    }
  }
}

/**
 * Check source URL credibility based on domain.
 */
function checkSourceCredibility(url: string): {
  credibility: FastVerifyResult["sourceCredibility"];
  domain: string;
} {
  const domain = extractDomain(url);

  if (TRUSTED_SOURCES.has(domain)) {
    return { credibility: "high", domain };
  }

  if (MEDIUM_SOURCES.has(domain)) {
    return { credibility: "medium", domain };
  }

  // Check for company's own domain (self-reported)
  if (domain.includes("blog") || domain.includes("press")) {
    return { credibility: "medium", domain };
  }

  return { credibility: "low", domain };
}

// ============================================================================
// STATUS CALCULATION
// ============================================================================

function calculateOverallStatus(
  entityFound: boolean,
  websiteLive: boolean | null,
  sourceCredibility: FastVerifyResult["sourceCredibility"],
  skipEntityCheck: boolean
): {
  status: FastVerifyResult["overallStatus"];
  badge: string;
  badgeText: string;
  confidence: number;
} {
  let score = 0;
  const maxScore = skipEntityCheck ? 2 : 3;

  // Entity found: +1
  if (entityFound || skipEntityCheck) score += 1;

  // Website live: +1 (or neutral if not checked)
  if (websiteLive === true) score += 1;
  else if (websiteLive === null) score += 0.5; // Neutral

  // Source credibility
  if (sourceCredibility === "high") score += 1;
  else if (sourceCredibility === "medium") score += 0.5;

  // Calculate confidence
  const confidence = score / maxScore;

  // Determine status
  if (confidence >= 0.8) {
    return {
      status: "verified",
      badge: "[Verified]",
      badgeText: "Verified - Multiple signals confirmed",
      confidence,
    };
  } else if (confidence >= 0.5) {
    return {
      status: "partial",
      badge: "[Partial]",
      badgeText: "Partial verification - Some signals found",
      confidence,
    };
  } else if (entityFound === false && sourceCredibility === "low") {
    return {
      status: "suspicious",
      badge: "[Unverified]",
      badgeText: "Unverified - Low confidence, verify independently",
      confidence,
    };
  } else {
    return {
      status: "unverified",
      badge: "[Unverified]",
      badgeText: "Unverified - Limited verification data",
      confidence,
    };
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
    return urlObj.hostname.replace("www.", "");
  } catch {
    return url;
  }
}
