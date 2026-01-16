/**
 * Investor Playbook Orchestrator
 *
 * Main orchestration layer for running the investor due diligence playbook.
 * Executes verification branches in parallel and synthesizes findings.
 *
 * Stop Rules:
 * - Direct wire/crypto + missing filings = STOP
 * - FDA status misrepresentation = STOP
 * - Unregistered funding portal = STOP
 * - Entity not found + large funding request = STOP
 */

"use node";

import { api } from "../../../../_generated/api";
import { DDSource } from "../types";
import {
  InvestorPlaybookBranchType,
  InvestorPlaybookSynthesis,
  PlaybookDiscrepancy,
  PlaybookVerificationScore,
  PlaybookStopRule,
  PlaybookComplexitySignals,
  PLAYBOOK_BRANCH_TRIGGERS,
  EntityVerificationFindings,
  SecEdgarFindings,
  FinraValidationFindings,
  FdaVerificationFindings,
  UsptoDeepdiveFindings,
  MoneyFlowIntegrityFindings,
  SecuritiesRegime,
  ClaimVerificationFindings,
  PersonVerificationFindings,
  NewsVerificationFindings,
} from "./types";

import {
  executeEntityVerificationBranch,
  executeSecEdgarBranch,
  executeFinraValidationBranch,
  executeFdaVerificationBranch,
  executeUsptoDeepdiveBranch,
  executeMoneyFlowBranch,
  executeClaimVerificationBranch,
  executePersonVerificationBranch,
  executeNewsVerificationBranch,
  extractClaimsFromQuery,
} from "./branches";

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export interface PlaybookConfig {
  entityName: string;
  entityType: "company" | "fund" | "person";

  // Claims to verify
  claimedState?: string;
  claimedFormationYear?: number;
  claimedSecuritiesRegime?: SecuritiesRegime;
  claimedFundingPortal?: string;
  claimedFDAStatus?: string;
  claimedPatents?: string[];
  claimedInvestors?: string[];

  // Wire/payment context
  wireInstructions?: string;

  // Signals
  signals?: PlaybookComplexitySignals;

  // Web enrichment data (from agentic context gathering)
  webEnrichment?: {
    redFlagsFromWeb?: string[];
    fundingPortal?: string;
    fdaClaim?: string;
  };

  // Claim verification mode
  claimVerificationMode?: {
    enabled: boolean;
    rawQuery?: string;                    // Original complex query
    personToVerify?: string;              // Person name to verify
    personLinkedIn?: string;              // LinkedIn URL
    personClaimedRole?: string;           // Claimed role
    personClaimedCompany?: string;        // Claimed company
    acquisitionAcquirer?: string;         // Acquirer in acquisition
    acquisitionTarget?: string;           // Target in acquisition
    newsEvent?: string;                   // News event to verify
  };
}

export interface PlaybookResult {
  synthesis: InvestorPlaybookSynthesis;
  branchResults: {
    entityVerification?: EntityVerificationFindings;
    secEdgar?: SecEdgarFindings;
    finraValidation?: FinraValidationFindings;
    fdaVerification?: FdaVerificationFindings;
    usptoDeepdive?: UsptoDeepdiveFindings;
    moneyFlowIntegrity?: MoneyFlowIntegrityFindings;
    // New verification branches
    claimVerification?: ClaimVerificationFindings;
    personVerification?: PersonVerificationFindings;
    newsVerification?: NewsVerificationFindings;
  };
  sources: DDSource[];
  executionTimeMs: number;
}

export async function runInvestorPlaybook(
  ctx: any,
  config: PlaybookConfig
): Promise<PlaybookResult> {
  const startTime = Date.now();
  const allSources: DDSource[] = [];
  const branchResults: PlaybookResult["branchResults"] = {};
  const executedBranches: InvestorPlaybookBranchType[] = [];

  // Determine which branches to run based on signals
  const signals: PlaybookComplexitySignals = {
    isRequestingFunding: true,
    ...config.signals,
    claimedFDAStatus: config.claimedFDAStatus,
    claimedPatents: config.claimedPatents,
    claimedSecuritiesRegime: config.claimedSecuritiesRegime,
    fundingPortalMentioned: config.claimedFundingPortal,
    wireInstructionsProvided: Boolean(config.wireInstructions),
    cryptoPaymentRequested: config.wireInstructions?.toLowerCase().includes("crypto") ||
      config.wireInstructions?.toLowerCase().includes("bitcoin"),
    // Claim verification signals
    isClaimVerification: config.claimVerificationMode?.enabled,
    hasSpecificClaims: Boolean(config.claimVerificationMode?.rawQuery),
    personMentioned: config.claimVerificationMode?.personToVerify,
    linkedInUrl: config.claimVerificationMode?.personLinkedIn,
    acquisitionMentioned: Boolean(config.claimVerificationMode?.acquisitionAcquirer),
    newsEventMentioned: Boolean(config.claimVerificationMode?.newsEvent),
    companiesInvolved: [
      config.claimVerificationMode?.acquisitionAcquirer,
      config.claimVerificationMode?.acquisitionTarget,
    ].filter(Boolean) as string[],
  };

  // Build branch execution promises
  const branchPromises: Promise<void>[] = [];

  // Entity Verification (always run)
  if (PLAYBOOK_BRANCH_TRIGGERS.entity_verification(signals)) {
    executedBranches.push("entity_verification");
    branchPromises.push(
      executeEntityVerificationBranch(
        ctx,
        config.entityName,
        config.entityType,
        config.claimedState,
        config.claimedFormationYear
      ).then(result => {
        branchResults.entityVerification = result.findings;
        allSources.push(...result.sources);
      }).catch(err => {
        console.error("[Playbook] Entity verification failed:", err);
      })
    );
  }

  // SEC EDGAR
  if (PLAYBOOK_BRANCH_TRIGGERS.sec_edgar(signals)) {
    executedBranches.push("sec_edgar");
    branchPromises.push(
      executeSecEdgarBranch(
        ctx,
        config.entityName,
        config.entityType,
        config.claimedSecuritiesRegime
      ).then(result => {
        branchResults.secEdgar = result.findings;
        allSources.push(...result.sources);
      }).catch(err => {
        console.error("[Playbook] SEC EDGAR failed:", err);
      })
    );
  }

  // FINRA Validation
  if (PLAYBOOK_BRANCH_TRIGGERS.finra_validation(signals)) {
    executedBranches.push("finra_validation");
    branchPromises.push(
      executeFinraValidationBranch(
        ctx,
        config.entityName,
        config.entityType,
        config.claimedFundingPortal
      ).then(result => {
        branchResults.finraValidation = result.findings;
        allSources.push(...result.sources);
      }).catch(err => {
        console.error("[Playbook] FINRA validation failed:", err);
      })
    );
  }

  // FDA Verification
  if (PLAYBOOK_BRANCH_TRIGGERS.fda_verification(signals)) {
    executedBranches.push("fda_verification");
    branchPromises.push(
      executeFdaVerificationBranch(
        ctx,
        config.entityName,
        config.entityType,
        config.claimedFDAStatus
      ).then(result => {
        branchResults.fdaVerification = result.findings;
        allSources.push(...result.sources);
      }).catch(err => {
        console.error("[Playbook] FDA verification failed:", err);
      })
    );
  }

  // USPTO Deep Dive
  if (PLAYBOOK_BRANCH_TRIGGERS.uspto_deepdive(signals)) {
    executedBranches.push("uspto_deepdive");
    branchPromises.push(
      executeUsptoDeepdiveBranch(
        ctx,
        config.entityName,
        config.entityType,
        config.claimedPatents
      ).then(result => {
        branchResults.usptoDeepdive = result.findings;
        allSources.push(...result.sources);
      }).catch(err => {
        console.error("[Playbook] USPTO failed:", err);
      })
    );
  }

  // Money Flow Integrity (always run for funding)
  if (PLAYBOOK_BRANCH_TRIGGERS.money_flow_integrity(signals)) {
    executedBranches.push("money_flow_integrity");
    branchPromises.push(
      executeMoneyFlowBranch(
        ctx,
        config.entityName,
        config.entityType,
        config.claimedSecuritiesRegime,
        config.wireInstructions,
        config.claimedInvestors
      ).then(result => {
        branchResults.moneyFlowIntegrity = result.findings;
        allSources.push(...result.sources);
      }).catch(err => {
        console.error("[Playbook] Money flow failed:", err);
      })
    );
  }

  // ============================================================================
  // NEW VERIFICATION BRANCHES (Claim, Person, News)
  // ============================================================================

  // Claim Verification - extract and verify claims from complex queries
  if (config.claimVerificationMode?.enabled && config.claimVerificationMode.rawQuery) {
    if (PLAYBOOK_BRANCH_TRIGGERS.claim_verification(signals)) {
      executedBranches.push("claim_verification");
      const claims = extractClaimsFromQuery(config.claimVerificationMode.rawQuery);
      if (claims.length > 0) {
        branchPromises.push(
          executeClaimVerificationBranch(ctx, claims).then(result => {
            branchResults.claimVerification = result.findings;
            allSources.push(...result.sources);
          }).catch(err => {
            console.error("[Playbook] Claim verification failed:", err);
          })
        );
      }
    }
  }

  // Person Verification - verify professional identity
  if (config.claimVerificationMode?.personToVerify) {
    if (PLAYBOOK_BRANCH_TRIGGERS.person_verification(signals)) {
      executedBranches.push("person_verification");
      branchPromises.push(
        executePersonVerificationBranch(
          ctx,
          config.claimVerificationMode.personToVerify,
          config.claimVerificationMode.personLinkedIn,
          config.claimVerificationMode.personClaimedRole,
          config.claimVerificationMode.personClaimedCompany
        ).then(result => {
          branchResults.personVerification = result.findings;
          allSources.push(...result.sources);
        }).catch(err => {
          console.error("[Playbook] Person verification failed:", err);
        })
      );
    }
  }

  // News/Acquisition Verification
  if (config.claimVerificationMode?.acquisitionAcquirer || config.claimVerificationMode?.newsEvent) {
    if (PLAYBOOK_BRANCH_TRIGGERS.news_verification(signals)) {
      executedBranches.push("news_verification");
      branchPromises.push(
        executeNewsVerificationBranch(
          ctx,
          config.claimVerificationMode.acquisitionAcquirer,
          config.claimVerificationMode.acquisitionTarget,
          config.claimVerificationMode.newsEvent
        ).then(result => {
          branchResults.newsVerification = result.findings;
          allSources.push(...result.sources);
        }).catch(err => {
          console.error("[Playbook] News verification failed:", err);
        })
      );
    }
  }

  // Execute all branches in parallel
  await Promise.all(branchPromises);

  // Synthesize findings (include web enrichment for risk assessment)
  const synthesis = synthesizeFindings(
    config.entityName,
    branchResults,
    executedBranches,
    Date.now() - startTime,
    allSources,
    config.webEnrichment
  );

  return {
    synthesis,
    branchResults,
    sources: allSources,
    executionTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// SYNTHESIS
// ============================================================================

function synthesizeFindings(
  entityName: string,
  branchResults: PlaybookResult["branchResults"],
  executedBranches: InvestorPlaybookBranchType[],
  executionTimeMs: number,
  sources: DDSource[],
  webEnrichment?: PlaybookConfig["webEnrichment"]
): InvestorPlaybookSynthesis {
  // Calculate verification scores
  const verificationScores = calculateVerificationScores(branchResults);

  // Identify discrepancies (include web enrichment red flags)
  const discrepancies = identifyDiscrepancies(branchResults, webEnrichment);

  // Evaluate stop rules (include web enrichment)
  const stopRules = evaluateStopRules(branchResults, webEnrichment);

  // Determine overall risk and recommendation
  const { overallRisk, recommendation, conditions, requiredResolutions } =
    determineRiskAndRecommendation(branchResults, stopRules, discrepancies, webEnrichment);

  return {
    entityName,
    evaluationDate: Date.now(),
    entityVerification: branchResults.entityVerification,
    secEdgar: branchResults.secEdgar,
    finraValidation: branchResults.finraValidation,
    fdaVerification: branchResults.fdaVerification,
    usptoDeepdive: branchResults.usptoDeepdive,
    moneyFlowIntegrity: branchResults.moneyFlowIntegrity,
    discrepancies,
    verificationScores,
    stopRules,
    shouldDisengage: stopRules.some(r => r.triggered && r.recommendation === "disengage"),
    overallRisk,
    recommendation,
    conditions,
    requiredResolutions,
    sources,
    branchesExecuted: executedBranches,
    executionTimeMs,
  };
}

function calculateVerificationScores(
  branchResults: PlaybookResult["branchResults"]
): PlaybookVerificationScore {
  const entity = branchResults.entityVerification?.overallConfidence ?? 0;
  const securities = branchResults.secEdgar?.overallConfidence ?? 0;
  const finra = branchResults.finraValidation?.overallConfidence ?? 0;
  const fda = branchResults.fdaVerification?.overallConfidence ?? 0;
  const patents = branchResults.usptoDeepdive?.overallConfidence ?? 0;
  const moneyFlow = branchResults.moneyFlowIntegrity?.overallConfidence ?? 0;

  // Weight the scores
  const weights = {
    entity: 0.2,
    securities: 0.2,
    finra: 0.15,
    fda: 0.15,
    patents: 0.1,
    moneyFlow: 0.2,
  };

  const overall =
    entity * weights.entity +
    securities * weights.securities +
    finra * weights.finra +
    fda * weights.fda +
    patents * weights.patents +
    moneyFlow * weights.moneyFlow;

  return {
    entity,
    securities,
    finra,
    fda,
    patents,
    moneyFlow,
    overall: Math.min(1, overall),
  };
}

function identifyDiscrepancies(
  branchResults: PlaybookResult["branchResults"],
  webEnrichment?: PlaybookConfig["webEnrichment"]
): PlaybookDiscrepancy[] {
  const discrepancies: PlaybookDiscrepancy[] = [];

  // Web enrichment red flags (from agentic context gathering)
  if (webEnrichment?.redFlagsFromWeb && webEnrichment.redFlagsFromWeb.length > 0) {
    for (const flag of webEnrichment.redFlagsFromWeb) {
      if (flag.includes("Scam/fraud")) {
        discrepancies.push({
          field: "Web Reputation",
          claimedValue: "Legitimate business",
          verifiedValue: "Scam/fraud mentions found in web search",
          source: "Web Search",
          severity: "major",
          category: "reputation",
        });
      }
      if (flag.includes("Outsized promotional claims")) {
        discrepancies.push({
          field: "Promotional Claims",
          claimedValue: "Reasonable business claims",
          verifiedValue: "Billion-dollar claims detected (potential exaggeration)",
          source: "Web Search",
          severity: "major",
          category: "financial",
        });
      }
      if (flag.includes("Valuation vs revenue mismatch")) {
        discrepancies.push({
          field: "Valuation vs Revenue",
          claimedValue: "Valuation supported by revenue",
          verifiedValue: flag,
          source: "Web Search",
          severity: "critical",
          category: "financial",
        });
      }
    }
  }

  // Entity discrepancies
  if (branchResults.entityVerification) {
    for (const flag of branchResults.entityVerification.redFlags) {
      if (flag.type === "name_mismatch" || flag.type === "recent_formation") {
        discrepancies.push({
          field: flag.type === "name_mismatch" ? "Entity Name" : "Formation Date",
          claimedValue: "As stated",
          verifiedValue: "See registry",
          source: "State Registry",
          severity: flag.severity === "critical" ? "critical" : flag.severity === "high" ? "major" : "moderate",
          category: "entity",
        });
      }
    }
  }

  // SEC discrepancies
  if (branchResults.secEdgar) {
    for (const flag of branchResults.secEdgar.redFlags) {
      if (flag.type === "terms_mismatch" || flag.type === "no_filing") {
        discrepancies.push({
          field: "Securities Regime",
          claimedValue: branchResults.secEdgar.securitiesRegime,
          verifiedValue: flag.type === "no_filing" ? "No filing found" : "Mismatch detected",
          source: "SEC EDGAR",
          severity: flag.severity === "critical" ? "critical" : flag.severity === "high" ? "major" : "moderate",
          category: "securities",
        });
      }
    }
  }

  // FDA discrepancies
  if (branchResults.fdaVerification) {
    for (const flag of branchResults.fdaVerification.redFlags) {
      if (flag.type === "status_misrepresentation" || flag.type === "clearance_not_found") {
        discrepancies.push({
          field: "FDA Status",
          claimedValue: branchResults.fdaVerification.claimedStatus || "FDA Cleared",
          verifiedValue: branchResults.fdaVerification.actualStatus,
          source: "FDA Database",
          severity: "critical",
          category: "regulatory",
        });
      }
    }
  }

  // Patent discrepancies
  if (branchResults.usptoDeepdive) {
    for (const flag of branchResults.usptoDeepdive.redFlags) {
      if (flag.type === "patent_not_found" || flag.type === "not_assigned_to_company") {
        discrepancies.push({
          field: flag.type === "patent_not_found" ? "Patent Existence" : "Patent Ownership",
          claimedValue: "As stated",
          verifiedValue: "Not verified",
          source: "USPTO",
          severity: flag.severity === "high" ? "major" : "moderate",
          category: "ip",
        });
      }
    }
  }

  // Financial discrepancies from SEC Form C data
  // Ground truth pattern: Check for zero/minimal revenue with large project claims
  if (branchResults.secEdgar?.formCFilings) {
    for (const filing of branchResults.secEdgar.formCFilings) {
      if (filing.financials) {
        const { totalRevenue, totalAssets, netIncome } = filing.financials;

        // Check for zero revenue - major red flag for companies claiming billion-dollar projects
        if (totalRevenue !== undefined && totalRevenue === 0) {
          discrepancies.push({
            field: "Total Revenue",
            claimedValue: "Active business with projects",
            verifiedValue: "$0 (per SEC Form C)",
            source: "SEC EDGAR Form C",
            severity: "critical",
            category: "financial",
          });
        }

        // Check for zero/minimal assets
        if (totalAssets !== undefined && totalAssets === 0) {
          discrepancies.push({
            field: "Total Assets",
            claimedValue: "Operating company",
            verifiedValue: "$0 (per SEC Form C)",
            source: "SEC EDGAR Form C",
            severity: "major",
            category: "financial",
          });
        }

        // Check for negative net income (losses)
        if (netIncome !== undefined && netIncome < 0) {
          discrepancies.push({
            field: "Net Income",
            claimedValue: "Profitable operation",
            verifiedValue: `$${netIncome.toLocaleString()} loss (per SEC Form C)`,
            source: "SEC EDGAR Form C",
            severity: "moderate",
            category: "financial",
          });
        }
      }
    }
  }

  return discrepancies;
}

function evaluateStopRules(
  branchResults: PlaybookResult["branchResults"],
  webEnrichment?: PlaybookConfig["webEnrichment"]
): PlaybookStopRule[] {
  const stopRules: PlaybookStopRule[] = [];

  // Rule 0: Web search found scam/fraud mentions
  const hasScamMentions = webEnrichment?.redFlagsFromWeb?.some(f => f.includes("Scam/fraud"));
  const hasOutsizedClaims = webEnrichment?.redFlagsFromWeb?.some(f => f.includes("Outsized promotional claims"));

  stopRules.push({
    triggered: hasScamMentions === true,
    rule: "Scam/Fraud Mentions in Web Search",
    description: "Web search found mentions of scam or fraud associated with this entity. Requires careful investigation.",
    recommendation: "investigate",
  });

  stopRules.push({
    triggered: hasOutsizedClaims === true,
    rule: "Outsized Promotional Claims",
    description: "Entity makes billion-dollar claims that may not be supported by actual financials. High risk of promotional exaggeration.",
    recommendation: "investigate",
  });

  // Rule 1: Direct wire + missing SEC filings
  const hasDirectWire = branchResults.moneyFlowIntegrity?.requestedMethod === "personal_account" ||
    branchResults.moneyFlowIntegrity?.requestedMethod === "crypto_wallet";
  const noSecFilings = branchResults.secEdgar && !branchResults.secEdgar.verification.filingFound;

  stopRules.push({
    triggered: hasDirectWire && noSecFilings === true,
    rule: "Direct Wire + No SEC Filings",
    description: "Funds requested via personal/crypto channel with no SEC filings found. High fraud risk.",
    recommendation: "disengage",
  });

  // Rule 2: FDA status misrepresentation
  // Check for explicit misrepresentation red flag (critical severity)
  const fdaMisrep = branchResults.fdaVerification?.redFlags.some(
    f => f.type === "status_misrepresentation" && f.severity === "critical"
  );

  // Also check if FDA claim was made but statusMatchesClaims is false
  const fdaClaimMismatch = branchResults.fdaVerification?.claimedStatus &&
    branchResults.fdaVerification?.statusMatchesClaims === false;

  stopRules.push({
    triggered: fdaMisrep === true || fdaClaimMismatch === true,
    rule: "FDA Status Misrepresentation",
    description: "FDA clearance/approval claim could not be verified in FDA databases. Request 510(k) K-number.",
    recommendation: "require_resolution",  // Changed from disengage to require_resolution
  });

  // Rule 3: Unregistered funding portal for Reg CF
  // Check both claimed portal AND intermediary from SEC filings
  const claimsRegCF = branchResults.secEdgar?.securitiesRegime === "Reg CF";
  const portalFromClaim = branchResults.finraValidation?.claimedPortal?.name;
  // Also check if SEC filings mention an intermediary
  const portalFromSEC = branchResults.secEdgar?.formCFilings?.find(f => f.intermediaryName)?.intermediaryName;
  const portalWasClaimed = Boolean(portalFromClaim || portalFromSEC);
  const portalNotRegistered = portalWasClaimed && !branchResults.finraValidation?.portalIsRegistered;

  // If we found a portal from SEC filings, note it
  if (portalFromSEC && !portalFromClaim) {
    console.log(`[StopRules] Found intermediary from SEC filings: ${portalFromSEC}`);
  }

  stopRules.push({
    triggered: claimsRegCF === true && portalNotRegistered === true,
    rule: "Unregistered Portal for Reg CF",
    description: `Company claims Reg CF but the funding portal (${portalFromClaim || portalFromSEC || "unknown"}) is not FINRA-registered. Illegal offering structure.`,
    recommendation: "disengage",
  });

  // Rule 3b: Reg CF without portal (warning, not stop)
  const regCFWithoutPortal = claimsRegCF === true && !portalWasClaimed;
  stopRules.push({
    triggered: regCFWithoutPortal,
    rule: "Reg CF Without Identified Portal",
    description: "SEC filings indicate Reg CF but no funding portal was identified. Verify the offering is conducted through a registered portal.",
    recommendation: "require_resolution",
  });

  // Rule 4: Entity not found + large funding request
  const entityNotFound = branchResults.entityVerification &&
    !branchResults.entityVerification.verification.entityExists;
  // Assume large if we're running playbook

  stopRules.push({
    triggered: entityNotFound === true,
    rule: "Entity Not Found",
    description: "Cannot verify entity exists in any state registry. Cannot confirm you're dealing with a real company.",
    recommendation: "require_resolution",
  });

  // Rule 5: Critical wire fraud indicators
  const criticalFraudIndicators = branchResults.moneyFlowIntegrity?.wireFraudIndicators.some(
    i => i.severity === "critical"
  );

  stopRules.push({
    triggered: criticalFraudIndicators === true,
    rule: "Wire Fraud Indicators",
    description: "Critical wire fraud indicators detected in payment instructions.",
    recommendation: "disengage",
  });

  return stopRules;
}

function determineRiskAndRecommendation(
  branchResults: PlaybookResult["branchResults"],
  stopRules: PlaybookStopRule[],
  discrepancies: PlaybookDiscrepancy[],
  webEnrichment?: PlaybookConfig["webEnrichment"]
): {
  overallRisk: InvestorPlaybookSynthesis["overallRisk"];
  recommendation: InvestorPlaybookSynthesis["recommendation"];
  conditions?: string[];
  requiredResolutions?: string[];
} {
  // Check for triggered stop rules
  const disengageRules = stopRules.filter(r => r.triggered && r.recommendation === "disengage");
  const requireResolutionRules = stopRules.filter(r => r.triggered && r.recommendation === "require_resolution");
  const investigateRules = stopRules.filter(r => r.triggered && r.recommendation === "investigate");

  if (disengageRules.length > 0) {
    return {
      overallRisk: "critical",
      recommendation: "pass",
      requiredResolutions: disengageRules.map(r => r.description),
    };
  }

  // Count critical/major discrepancies
  const criticalDiscrepancies = discrepancies.filter(d => d.severity === "critical");
  const majorDiscrepancies = discrepancies.filter(d => d.severity === "major");

  // Web enrichment red flags count as major issues
  const webRedFlagCount = webEnrichment?.redFlagsFromWeb?.length || 0;

  if (criticalDiscrepancies.length >= 2 || requireResolutionRules.length > 0) {
    return {
      overallRisk: "high",
      recommendation: "require_resolution",
      requiredResolutions: [
        ...criticalDiscrepancies.map(d => `Resolve ${d.field} discrepancy`),
        ...requireResolutionRules.map(r => r.description),
      ],
    };
  }

  // If we have investigate rules (scam mentions, outsized claims), elevate risk
  if (investigateRules.length >= 2 || (investigateRules.length >= 1 && majorDiscrepancies.length >= 1)) {
    return {
      overallRisk: "high",
      recommendation: "require_resolution",
      requiredResolutions: [
        ...investigateRules.map(r => r.description),
        "Verify all promotional claims against SEC filings",
        "Request audited financial statements",
      ],
    };
  }

  if (criticalDiscrepancies.length === 1 || majorDiscrepancies.length >= 2 || investigateRules.length >= 1) {
    return {
      overallRisk: "elevated",
      recommendation: "proceed_with_conditions",
      conditions: [
        "Obtain written clarification on all flagged discrepancies",
        "Request supporting documentation for claims",
        "Consider reduced investment amount",
        ...(investigateRules.length > 0 ? ["Investigate web search red flags before proceeding"] : []),
      ],
    };
  }

  if (majorDiscrepancies.length === 1 || discrepancies.length >= 3) {
    return {
      overallRisk: "moderate",
      recommendation: "proceed_with_conditions",
      conditions: [
        "Request clarification on flagged items before proceeding",
      ],
    };
  }

  return {
    overallRisk: "low",
    recommendation: "proceed",
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function generatePlaybookReport(synthesis: InvestorPlaybookSynthesis): string {
  const lines: string[] = [];

  lines.push(`# Investor Due Diligence Report: ${synthesis.entityName}`);
  lines.push(`Generated: ${new Date(synthesis.evaluationDate).toISOString()}`);
  lines.push("");

  // Overall Assessment
  lines.push("## Overall Assessment");
  lines.push(`- **Risk Level:** ${synthesis.overallRisk.toUpperCase()}`);
  lines.push(`- **Recommendation:** ${synthesis.recommendation.replace(/_/g, " ").toUpperCase()}`);

  if (synthesis.shouldDisengage) {
    lines.push("");
    lines.push("**STOP - DO NOT PROCEED**");
    lines.push("Critical issues detected that warrant immediate disengagement.");
  }

  // Verification Scores
  lines.push("");
  lines.push("## Verification Scores");
  lines.push(`- Entity: ${(synthesis.verificationScores.entity * 100).toFixed(0)}%`);
  lines.push(`- Securities: ${(synthesis.verificationScores.securities * 100).toFixed(0)}%`);
  lines.push(`- FINRA: ${(synthesis.verificationScores.finra * 100).toFixed(0)}%`);
  lines.push(`- FDA: ${(synthesis.verificationScores.fda * 100).toFixed(0)}%`);
  lines.push(`- Patents: ${(synthesis.verificationScores.patents * 100).toFixed(0)}%`);
  lines.push(`- Money Flow: ${(synthesis.verificationScores.moneyFlow * 100).toFixed(0)}%`);
  lines.push(`- **Overall:** ${(synthesis.verificationScores.overall * 100).toFixed(0)}%`);

  // Financial Data from SEC Filings (Ground Truth style)
  if (synthesis.secEdgar?.formCFilings) {
    const filingWithFinancials = synthesis.secEdgar.formCFilings.find(f => f.financials);
    if (filingWithFinancials?.financials) {
      const fin = filingWithFinancials.financials;
      lines.push("");
      lines.push("## Financial Data (from SEC Form C)");
      if (fin.totalRevenue !== undefined) {
        lines.push(`- **Total Revenue:** $${fin.totalRevenue.toLocaleString()}`);
      }
      if (fin.totalAssets !== undefined) {
        lines.push(`- **Total Assets:** $${fin.totalAssets.toLocaleString()}`);
      }
      if (fin.totalLiabilities !== undefined) {
        lines.push(`- **Total Liabilities:** $${fin.totalLiabilities.toLocaleString()}`);
      }
      if (fin.netIncome !== undefined) {
        lines.push(`- **Net Income:** $${fin.netIncome.toLocaleString()}`);
      }
      if (fin.employeeCount !== undefined) {
        lines.push(`- **Employees:** ${fin.employeeCount}`);
      }
    }

    // Show intermediary if found
    const filingWithIntermediary = synthesis.secEdgar.formCFilings.find(f => f.intermediaryName);
    if (filingWithIntermediary?.intermediaryName) {
      lines.push(`- **Funding Portal (Intermediary):** ${filingWithIntermediary.intermediaryName}`);
    }
  }

  // Discrepancies
  if (synthesis.discrepancies.length > 0) {
    lines.push("");
    lines.push("## Discrepancies Found");
    for (const d of synthesis.discrepancies) {
      lines.push(`- **${d.field}** (${d.severity}): Claimed "${d.claimedValue}" vs Verified "${d.verifiedValue}" [Source: ${d.source}]`);
    }
  }

  // Stop Rules
  const triggeredStopRules = synthesis.stopRules.filter(r => r.triggered);
  if (triggeredStopRules.length > 0) {
    lines.push("");
    lines.push("## Stop Rules Triggered");
    for (const r of triggeredStopRules) {
      lines.push(`- **${r.rule}**: ${r.description}`);
    }
  }

  // Required Resolutions
  if (synthesis.requiredResolutions && synthesis.requiredResolutions.length > 0) {
    lines.push("");
    lines.push("## Required Resolutions");
    for (const r of synthesis.requiredResolutions) {
      lines.push(`- ${r}`);
    }
  }

  // Conditions
  if (synthesis.conditions && synthesis.conditions.length > 0) {
    lines.push("");
    lines.push("## Conditions for Proceeding");
    for (const c of synthesis.conditions) {
      lines.push(`- ${c}`);
    }
  }

  // Sources
  lines.push("");
  lines.push("## Sources Consulted");
  const authSources = synthesis.sources.filter(s => s.reliability === "authoritative");
  for (const s of authSources.slice(0, 10)) {
    lines.push(`- ${s.title}${s.url ? ` (${s.url})` : ""}`);
  }

  lines.push("");
  lines.push(`---`);
  lines.push(`Execution time: ${synthesis.executionTimeMs}ms | Branches executed: ${synthesis.branchesExecuted.join(", ")}`);

  return lines.join("\n");
}
