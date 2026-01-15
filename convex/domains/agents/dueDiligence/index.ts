/**
 * Due Diligence Framework Index
 *
 * Parallelized multi-front research with traditional IC memo output.
 * Re-exports all public APIs from the DD framework.
 */

// Types
export * from "./types";

// Mutations (queries and mutations - non-Node.js runtime)
export {
  // Queries
  getDDJob,
  getUserDDJobs,
  getDDJobProgress,
  getDDMemoByEntity,
  // Mutations
  createDDJob,
} from "./ddMutations";

// Orchestrator (actions only - Node.js runtime)
export {
  startDueDiligenceJob,
} from "./ddOrchestrator";

// Cross-checker
export {
  crossCheckAllBranches,
  crossCheckBranchPair,
  attemptResolution,
  getSourceReliabilityScore,
} from "./crossChecker";

// Memo synthesizer
export {
  synthesizeDDMemo,
  calculateVerdict,
  generateExecutiveSummary,
} from "./memoSynthesizer";

// Trigger Queries (non-Node.js runtime)
export {
  shouldTriggerDDForFunding,
  getPendingDDTriggers,
} from "./ddTriggerQueries";

// Trigger Actions (Node.js runtime)
export {
  triggerDDFromFunding,
  processPendingTriggers,
  triggerManualDD,
  triggerStaleRefresh,
} from "./ddTriggers";

// Branch handlers (for direct imports if needed)
export { executeCompanyProfileBranch } from "./branches/companyProfile";
export { executeTeamFoundersBranch } from "./branches/teamDeepResearch";
export { executeMarketCompetitiveBranch } from "./branches/marketCompetitive";
export {
  executeTechnicalDDBranch,
  executeIPPatentsBranch,
  executeRegulatoryBranch,
  executeFinancialDeepBranch,
  executeNetworkMappingBranch,
} from "./branches/conditionalBranches";
