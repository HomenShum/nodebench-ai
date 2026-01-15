/**
 * teamDeepResearch.ts - DIAGNOSTIC VERSION WITH INTENTIONAL ERROR
 *
 * This version throws an intentional error to verify the function is being called.
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
// Main Execution - DIAGNOSTIC VERSION WITH INTENTIONAL ERROR
// ============================================================================

/**
 * Execute team/founders deep research branch - DIAGNOSTIC VERSION
 * THROWS INTENTIONAL ERROR TO VERIFY FUNCTION IS CALLED
 */
export async function executeTeamFoundersBranch(
  ctx: any,
  entityName: string,
  entityType: string
): Promise<BranchResult> {
  // DIAGNOSTIC: Throw error to verify this function is actually called
  throw new Error(`DIAGNOSTIC_ERROR_2026_01_14_1752: executeTeamFoundersBranch was called for ${entityName}. If you see this error, the function IS being called.`);
}
