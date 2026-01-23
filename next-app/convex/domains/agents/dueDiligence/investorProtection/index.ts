/**
 * Investor Protection Due Diligence Module
 *
 * Provides verification workflows for protecting retail investors
 * from fraudulent or misleading startup offerings.
 *
 * @module dueDiligence/investorProtection
 */

// Types
export * from "./types";

// Orchestrator
export { startVerificationJob } from "./investorProtectionOrchestrator";

// Mutations & Queries
export {
  getJob,
  getUserJobs,
  getJobProgress,
  createJob,
} from "./investorProtectionMutations";

// Phase handlers
export { extractClaims, extractClaimsWithRegex } from "./phases/claimsExtraction";
