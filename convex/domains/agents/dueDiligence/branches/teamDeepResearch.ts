/**
 * teamDeepResearch.ts - DIAGNOSTIC VERSION
 *
 * This is a simplified diagnostic version to verify the function is being called.
 */

"use node";

import {
  TeamFoundersFindings,
  TeamMemberProfile,
  DDSource,
  SourceReliability,
  SourceType,
} from "../types";

// ============================================================================
// Types
// ============================================================================

interface BranchResult {
  findings: TeamFoundersFindings;
  sources: DDSource[];
  confidence: number;
}

// ============================================================================
// Main Execution - DIAGNOSTIC VERSION
// ============================================================================

/**
 * Execute team/founders deep research branch - DIAGNOSTIC VERSION
 * Returns hardcoded data to verify the function is being called
 */
export async function executeTeamFoundersBranch(
  ctx: any,
  entityName: string,
  entityType: string
): Promise<BranchResult> {
  // DIAGNOSTIC: Return hardcoded data to verify function is called
  console.log(`[DD-TeamResearch-DIAGNOSTIC] Called for ${entityName}`);

  const dummyFounder: TeamMemberProfile = {
    id: "diagnostic-founder-001",
    name: "DIAGNOSTIC_FOUNDER",
    currentRole: `CEO of ${entityName} (HARDCODED TEST DATA)`,
    currentCompany: entityName,
    linkedinUrl: undefined,
    careerTimeline: [],
    boardSeats: [],
    advisoryRoles: [],
    patents: [],
    education: [],
    conflictFlags: [],
    networkConnections: {
      coFounders: [],
      investorRelationships: [],
      boardNetworkOverlap: [],
    },
    trackRecord: {
      successfulExits: 99,
      failedVentures: 0,
      pivots: 0,
      yearsExperience: 99,
      domainExpertise: ["DIAGNOSTIC"],
    },
    redFlags: [],
    highlights: ["DIAGNOSTIC MODE ACTIVE - This data is hardcoded"],
    sources: [],
    verificationStatus: "unverified",
  };

  const findings: TeamFoundersFindings = {
    founders: [dummyFounder],
    executives: [],
    boardMembers: [],
    teamSize: 1,
    averageExperience: 99,
    hasSerialFounders: true,
    hasVCBackedFounders: true,
    teamStrengths: ["DIAGNOSTIC_MODE_ACTIVE"],
    teamGaps: [],
    keyPersonRisk: [],
    founderMarketFit: "HARDCODED_TEST - Function is being called correctly",
    trackRecordSummary: `DIAGNOSTIC: executeTeamFoundersBranch was called for ${entityName}`,
  };

  const sources: DDSource[] = [{
    sourceType: "other" as SourceType,
    title: "DIAGNOSTIC_SOURCE",
    accessedAt: Date.now(),
    reliability: "inferred" as SourceReliability,
    section: "team_discovery",
  }];

  console.log(`[DD-TeamResearch-DIAGNOSTIC] Returning hardcoded data for ${entityName}`);

  return {
    findings,
    sources,
    confidence: 0.99,
  };
}
