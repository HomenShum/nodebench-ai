/**
 * Person Verification Branch
 * 
 * Verifies professional identity and background of individuals
 * using LinkedIn and other professional sources.
 */

import { api } from "../../../../../_generated/api";
import { DDSource, SourceReliability } from "../../types";
import { PersonVerificationFindings } from "../types";

type InternalReliability = "authoritative" | "reputable" | "unknown";

function mapToSourceReliability(internal: InternalReliability): SourceReliability {
  switch (internal) {
    case "authoritative": return "authoritative";
    case "reputable": return "reliable";
    case "unknown": return "secondary";
  }
}

interface PersonVerificationResult {
  findings: PersonVerificationFindings;
  sources: DDSource[];
  confidence: number;
}

/**
 * Execute person verification branch
 */
export async function executePersonVerificationBranch(
  ctx: any,
  personName: string,
  linkedInUrl?: string,
  claimedRole?: string,
  claimedCompany?: string
): Promise<PersonVerificationResult> {
  const sources: DDSource[] = [];
  const professionalBackground: PersonVerificationFindings["professionalBackground"] = [];
  const publicStatements: PersonVerificationFindings["publicStatements"] = [];
  const redFlags: PersonVerificationFindings["redFlags"] = [];
  
  let verified = false;
  let currentRole: string | undefined;
  let currentCompany: string | undefined;
  let confidenceScore = 0.3;

  try {
    // Search for person's professional information
    const searchQueries = [
      `"${personName}" ${claimedCompany || ""} ${claimedRole || ""} LinkedIn`,
      `"${personName}" ${claimedCompany || ""} executive profile`,
    ];

    for (const query of searchQueries) {
      const result = await ctx.runAction(
        api.domains.search.fusion.actions.fusionSearch,
        {
          query,
          mode: "balanced",
          maxTotal: 5,
          skipRateLimit: true,
        }
      );

      const searchResults = result?.payload?.results ?? [];
      
      for (const r of searchResults) {
        const url = r.url || "";
        const title = r.title || "";
        const snippet = r.snippet || r.content || "";

        sources.push({
          sourceType: "web_search",
          title,
          url,
          accessedAt: Date.now(),
          reliability: mapToSourceReliability(getSourceReliability(url)),
        });

        // Check LinkedIn
        if (url.includes("linkedin.com")) {
          verified = true;
          confidenceScore = Math.max(confidenceScore, 0.8);
          
          // Extract role from title/snippet
          const roleMatch = title.match(/([^-|]+)\s*[-|]\s*([^-|]+)/);
          if (roleMatch) {
            currentRole = roleMatch[1].trim();
            currentCompany = roleMatch[2].trim();
          }
        }

        // Extract professional background mentions
        const combinedText = `${title} ${snippet}`.toLowerCase();
        if (claimedCompany && combinedText.includes(claimedCompany.toLowerCase())) {
          professionalBackground.push({
            role: claimedRole || "Unknown role",
            company: claimedCompany,
            verified: true,
            source: url,
          });
        }

        // Look for public statements/interviews
        if (/interview|podcast|talk|keynote|statement/i.test(combinedText)) {
          publicStatements.push({
            topic: title.slice(0, 100),
            source: extractDomain(url),
            url,
          });
        }
      }
    }

    // Verify claimed role matches
    if (claimedRole && currentRole) {
      const rolesMatch = currentRole.toLowerCase().includes(claimedRole.toLowerCase()) ||
                        claimedRole.toLowerCase().includes(currentRole.toLowerCase());
      if (!rolesMatch) {
        redFlags.push({
          type: "role_mismatch",
          severity: "medium",
          description: `Claimed role "${claimedRole}" doesn't match found role "${currentRole}"`,
        });
        confidenceScore *= 0.8;
      }
    }

    // Verify claimed company matches
    if (claimedCompany && currentCompany) {
      const companiesMatch = currentCompany.toLowerCase().includes(claimedCompany.toLowerCase()) ||
                            claimedCompany.toLowerCase().includes(currentCompany.toLowerCase());
      if (!companiesMatch) {
        redFlags.push({
          type: "company_mismatch",
          severity: "medium",
          description: `Claimed company "${claimedCompany}" doesn't match found company "${currentCompany}"`,
        });
        confidenceScore *= 0.8;
      }
    }

    return {
      findings: {
        name: personName,
        linkedInUrl,
        currentRole,
        currentCompany,
        verified,
        professionalBackground,
        publicStatements,
        redFlags,
        confidenceScore,
      },
      sources,
      confidence: confidenceScore,
    };
  } catch (error) {
    console.error("[PersonVerification] Error:", error);
    return {
      findings: {
        name: personName,
        verified: false,
        professionalBackground: [],
        redFlags: [],
        confidenceScore: 0,
      },
      sources,
      confidence: 0,
    };
  }
}

function getSourceReliability(url: string): InternalReliability {
  if (url.includes("linkedin.com")) return "authoritative";
  if (url.includes("crunchbase.com")) return "reputable";
  if (url.includes("bloomberg.com") || url.includes("reuters.com")) return "authoritative";
  return "unknown";
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "Unknown";
  }
}

