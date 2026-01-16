/**
 * Claim Verification Branch
 * 
 * Verifies specific claims from complex queries by searching authoritative sources
 * and categorizing claims as verified, unverified, or contradicted.
 */

import { api } from "../../../../../_generated/api";
import { DDSource, SourceReliability } from "../../types";
import { ClaimVerificationFindings, VerifiedClaim, ClaimConfidence } from "../types";

type InternalReliability = "authoritative" | "reputable" | "unknown";

function mapToSourceReliability(internal: InternalReliability): SourceReliability {
  switch (internal) {
    case "authoritative": return "authoritative";
    case "reputable": return "reliable";
    case "unknown": return "secondary";
  }
}

interface ClaimVerificationResult {
  findings: ClaimVerificationFindings;
  sources: DDSource[];
  confidence: number;
}

interface ExtractedClaim {
  claim: string;
  searchQuery: string;
  category: "person" | "company" | "event" | "technical" | "financial" | "strategic";
}

/**
 * Execute claim verification branch
 */
export async function executeClaimVerificationBranch(
  ctx: any,
  claims: ExtractedClaim[]
): Promise<ClaimVerificationResult> {
  const sources: DDSource[] = [];
  const verifiedClaims: VerifiedClaim[] = [];
  const unverifiedClaims: VerifiedClaim[] = [];
  const contradictedClaims: VerifiedClaim[] = [];

  // Verify each claim in parallel
  const verificationPromises = claims.map(async (claimObj) => {
    return verifyIndividualClaim(ctx, claimObj);
  });

  const results = await Promise.all(verificationPromises);

  for (const result of results) {
    sources.push(...result.sources);
    
    if (result.claim.status === "verified" || result.claim.status === "partially_verified") {
      verifiedClaims.push(result.claim);
    } else if (result.claim.status === "contradicted") {
      contradictedClaims.push(result.claim);
    } else {
      unverifiedClaims.push(result.claim);
    }
  }

  const totalClaims = claims.length;
  const verifiedCount = verifiedClaims.length;
  const contradictedCount = contradictedClaims.length;
  
  let confidenceScore = 0.5;
  if (totalClaims > 0) {
    confidenceScore = (verifiedCount * 1.0 + (totalClaims - verifiedCount - contradictedCount) * 0.3) / totalClaims;
    if (contradictedCount > 0) {
      confidenceScore *= 0.7; // Penalize for contradicted claims
    }
  }

  const findings: ClaimVerificationFindings = {
    verifiedClaims,
    unverifiedClaims,
    contradictedClaims,
    overallAssessment: generateAssessment(verifiedClaims, unverifiedClaims, contradictedClaims),
    confidenceScore,
  };

  return {
    findings,
    sources,
    confidence: confidenceScore,
  };
}

async function verifyIndividualClaim(
  ctx: any,
  claimObj: ExtractedClaim
): Promise<{ claim: VerifiedClaim; sources: DDSource[] }> {
  const sources: DDSource[] = [];
  
  try {
    // Search for evidence
    const result = await ctx.runAction(
      api.domains.search.fusion.actions.fusionSearch,
      {
        query: claimObj.searchQuery,
        mode: "balanced",
        maxTotal: 5,
        skipRateLimit: true,
      }
    );

    const searchResults = result?.payload?.results ?? [];
    const evidence: string[] = [];
    const claimSources: VerifiedClaim["sources"] = [];

    // Analyze search results
    for (const r of searchResults) {
      const snippet = r.snippet || r.content || "";
      const title = r.title || "Unknown";
      const url = r.url || "";

      evidence.push(snippet.slice(0, 200));
      claimSources.push({
        title,
        url,
        reliability: mapToSourceReliability(determineReliability(url)),
      });

      sources.push({
        sourceType: "web_search",
        title,
        url,
        accessedAt: Date.now(),
        reliability: mapToSourceReliability(determineReliability(url)),
      });
    }

    // Determine verification status based on evidence
    const { status, confidence } = analyzeEvidence(claimObj.claim, evidence);

    return {
      claim: {
        claim: claimObj.claim,
        confidence,
        status,
        evidence,
        sources: claimSources,
      },
      sources,
    };
  } catch (error) {
    return {
      claim: {
        claim: claimObj.claim,
        confidence: "unverified",
        status: "unverified",
        evidence: [],
        sources: [],
        notes: `Error during verification: ${error}`,
      },
      sources,
    };
  }
}

function determineReliability(url: string): InternalReliability {
  const authoritative = [
    "reuters.com", "sec.gov", "finra.org", "fda.gov", "uspto.gov",
    "businessinsider.com", "wsj.com", "nytimes.com", "bloomberg.com",
    "theverge.com", "techcrunch.com", "venturebeat.com", "wired.com",
  ];
  const reputable = [
    "linkedin.com", "crunchbase.com", "wikipedia.org", "forbes.com",
    "medium.com", "substack.com", "github.com",
  ];

  const urlLower = url.toLowerCase();
  if (authoritative.some(d => urlLower.includes(d))) return "authoritative";
  if (reputable.some(d => urlLower.includes(d))) return "reputable";
  return "unknown";
}

function analyzeEvidence(
  claim: string,
  evidence: string[]
): { status: VerifiedClaim["status"]; confidence: ClaimConfidence } {
  const combinedEvidence = evidence.join(" ").toLowerCase();
  const claimLower = claim.toLowerCase();

  // Check for contradictory signals
  const contradictoryPatterns = [
    /not true|false|incorrect|wrong|contradicted|debunked|myth|misleading/i,
    /does not|doesn't|did not|didn't/i,
  ];

  for (const pattern of contradictoryPatterns) {
    if (pattern.test(combinedEvidence)) {
      // Check if contradiction is about the claim
      const claimKeywords = claimLower.split(/\s+/).filter(w => w.length > 4);
      const matchesContext = claimKeywords.some(kw => combinedEvidence.includes(kw));
      if (matchesContext) {
        return { status: "contradicted", confidence: "contradicted" };
      }
    }
  }

  // Check for confirming signals
  if (evidence.length >= 2) {
    return { status: "verified", confidence: "high" };
  } else if (evidence.length === 1) {
    return { status: "partially_verified", confidence: "medium" };
  }

  return { status: "unverified", confidence: "unverified" };
}

function generateAssessment(
  verified: VerifiedClaim[],
  unverified: VerifiedClaim[],
  contradicted: VerifiedClaim[]
): string {
  const total = verified.length + unverified.length + contradicted.length;

  if (contradicted.length > 0) {
    return `Warning: ${contradicted.length} of ${total} claims are contradicted by evidence. ` +
      `${verified.length} verified, ${unverified.length} unverified.`;
  }

  if (verified.length === total && total > 0) {
    return `All ${total} claims verified with supporting evidence.`;
  }

  if (unverified.length === total) {
    return `None of the ${total} claims could be verified with available evidence.`;
  }

  return `Mixed verification: ${verified.length} verified, ${unverified.length} unverified, ${contradicted.length} contradicted.`;
}

/**
 * Extract claims from a complex query
 */
export function extractClaimsFromQuery(query: string): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];

  // Pattern: "X is/was/has Y" statements
  const isPatterns = query.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(is|was|has|are|were|have)\s+([^,.]+)/gi) || [];
  for (const match of isPatterns) {
    claims.push({
      claim: match.trim(),
      searchQuery: match.trim(),
      category: "technical",
    });
  }

  // Pattern: Company/Person mentioned with role
  const rolePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:VP|CEO|CTO|Director|Head|President|Founder)\s+(?:of\s+)?([A-Z][a-z]+)/gi;
  let roleMatch;
  while ((roleMatch = rolePattern.exec(query)) !== null) {
    claims.push({
      claim: roleMatch[0],
      searchQuery: `${roleMatch[1]} ${roleMatch[2]} role position`,
      category: "person",
    });
  }

  // Pattern: Acquisition mentions
  if (/acqui|merger|bought|purchase/i.test(query)) {
    const companies = query.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g) || [];
    if (companies.length >= 2) {
      claims.push({
        claim: `Acquisition involving ${companies.slice(0, 3).join(", ")}`,
        searchQuery: `${companies.slice(0, 3).join(" ")} acquisition merger`,
        category: "event",
      });
    }
  }

  return claims.slice(0, 10); // Limit to 10 claims
}

