/**
 * Investor Due Diligence Playbook - Types
 *
 * Comprehensive type definitions for the investor protection verification framework.
 * Based on a standard investor-protection diligence workflow:
 *
 * 1. Entity Verification (State Registries)
 * 2. Securities Path Verification (SEC EDGAR)
 * 3. Funding Portal Validation (FINRA)
 * 4. FDA Status Verification (510k vs Registration)
 * 5. Patent Verification (USPTO)
 * 6. Money Flow Integrity Checks
 */

import { DDSource, SourceReliability, SourceType } from "../types";

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBOOK BRANCH TYPES
// ═══════════════════════════════════════════════════════════════════════════

export const INVESTOR_PLAYBOOK_BRANCHES = [
  "entity_verification",
  "sec_edgar",
  "finra_validation",
  "fda_verification",
  "uspto_deepdive",
  "money_flow_integrity",
  "claim_verification",     // New: Verifies specific claims from complex queries
  "person_verification",    // New: Verifies person identity and professional background
  "news_verification",      // New: Verifies news/acquisition events
] as const;

export type InvestorPlaybookBranchType = typeof INVESTOR_PLAYBOOK_BRANCHES[number];

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBOOK SOURCE TYPES (extends base SourceType)
// ═══════════════════════════════════════════════════════════════════════════

export type PlaybookSourceType =
  | SourceType
  | "state_registry"
  | "sec_edgar"
  | "finra_iapd"
  | "fda_510k"
  | "fda_registration"
  | "fda_maude"
  | "uspto_patents"
  | "uspto_assignments"
  | "funding_portal"
  | "escrow_agent";

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 1: ENTITY VERIFICATION (State Registries)
// ═══════════════════════════════════════════════════════════════════════════

export interface StateRegistryRecord {
  entityName: string;
  fileNumber: string;
  state: string;
  formationDate: string;
  entityType: "Corporation" | "LLC" | "LP" | "LLP" | "Other";
  status: "Active" | "Inactive" | "Dissolved" | "Merged" | "Suspended" | "Unknown";
  registeredAgent: {
    name: string;
    address: string;
  };
  jurisdiction: string;
  lastFilingDate?: string;
  goodStanding?: boolean;
  verifiedAt: number;
  sourceUrl?: string;
}

export interface EntityVerificationFindings {
  // Primary entity
  primaryEntity?: StateRegistryRecord;

  // Alternative names/DBAs
  alternativeNames: string[];
  dbaRegistrations: Array<{
    name: string;
    state: string;
    status: string;
  }>;

  // Multi-state presence
  stateRegistrations: StateRegistryRecord[];

  // Verification results
  verification: {
    nameMatchesOffering: boolean;
    entityExists: boolean;
    isGoodStanding: boolean;
    registeredAgentValid: boolean;
    formationDateConsistent: boolean;
  };

  // Red flags
  redFlags: Array<{
    type: "name_mismatch" | "entity_not_found" | "bad_standing" | "recent_formation" | "agent_issue";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;

  // Confidence
  overallConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2: SEC EDGAR VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export type SecuritiesRegime =
  | "Reg CF"       // Regulation Crowdfunding
  | "Reg D 506(b)" // Private placement (accredited + 35 non-accredited)
  | "Reg D 506(c)" // Private placement (accredited only, general solicitation OK)
  | "Reg A"        // Mini-IPO ($75M max)
  | "Reg A+"       // Tier 2 Mini-IPO
  | "S-1"          // Full IPO
  | "Friends & Family"
  | "Unknown";

export interface FormCFiling {
  accessionNumber: string;
  filingDate: string;
  formType: "C" | "C/A" | "C-U" | "C-AR" | "C-TR";
  companyName: string;
  cik: string;
  offeringAmount?: number;
  maxOfferingAmount?: number;
  minInvestmentAmount?: number;
  securityType?: string;
  oversubscriptionAccepted?: boolean;
  deadline?: string;
  intermediaryName?: string;
  intermediaryCik?: string;
  filingUrl: string;
  // Financial data from Form C (for ground truth comparison)
  financials?: {
    totalRevenue?: number;        // From issuer's most recent fiscal year
    totalAssets?: number;         // Total assets
    totalLiabilities?: number;    // Total liabilities
    netIncome?: number;           // Net income/loss
    fiscalYearEnd?: string;       // Fiscal year end date
    taxableIncome?: number;       // Taxable income
    employeeCount?: number;       // Number of employees
  };
}

export interface FormDFiling {
  accessionNumber: string;
  filingDate: string;
  formType: "D" | "D/A";
  companyName: string;
  cik?: string;
  exemption: "Rule 504" | "Rule 505" | "Rule 506(b)" | "Rule 506(c)";
  totalOfferingAmount?: number;
  totalAmountSold?: number;
  totalRemaining?: number;
  investors?: {
    accreditedCount?: number;
    nonAccreditedCount?: number;
    totalCount?: number;
  };
  salesCommissions?: number;
  findersFeesExpenses?: number;
  issuers: Array<{
    name: string;
    cik?: string;
    entityType: string;
    stateOfIncorporation: string;
    yearOfIncorporation?: number;
  }>;
  filingUrl: string;
}

export interface SecEdgarFindings {
  // Company identification
  company: {
    ciks: string[];
    legalName?: string;
    formerNames?: string[];
    sic?: string;
    sicDescription?: string;
    stateOfIncorporation?: string;
    fiscalYearEnd?: string;
  };

  // Securities regime determination
  securitiesRegime: SecuritiesRegime;
  regimeConfidence: number;

  // Form C filings (Reg CF)
  formCFilings: FormCFiling[];
  activeOffering?: {
    amount: number;
    deadline: string;
    intermediary: string;
    status: "active" | "completed" | "withdrawn";
  };

  // Form D filings (Reg D)
  formDFilings: FormDFiling[];

  // Other SEC filings
  otherFilings: Array<{
    form: string;
    date: string;
    description: string;
    url: string;
  }>;

  // Verification results
  verification: {
    filingFound: boolean;
    termsMatchPitch: boolean;
    intermediaryListed: boolean;
    offeringActive: boolean;
    financialsIncluded: boolean;
  };

  // Red flags
  redFlags: Array<{
    type: "no_filing" | "terms_mismatch" | "no_intermediary" | "offering_expired" | "missing_financials";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;

  overallConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3: FINRA PORTAL VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

export interface FundingPortal {
  name: string;
  crd: string;  // Central Registration Depository number
  secFileNumber?: string;
  registrationDate?: string;
  status: "Active" | "Inactive" | "Suspended" | "Withdrawn";
  website?: string;
  address?: string;
  verifiedAt: number;
}

export interface BrokerDealerRecord {
  firmName: string;
  crd: string;
  secNumber?: string;
  status: "Active" | "Inactive" | "Suspended";
  disclosureEvents: number;
  registrationDate?: string;
}

export interface FinraValidationFindings {
  // Portal verification
  claimedPortal?: {
    name: string;
    url?: string;
  };
  verifiedPortal?: FundingPortal;
  portalIsRegistered: boolean;

  // Broker-dealer verification (if applicable)
  brokerDealer?: BrokerDealerRecord;

  // Offering verification
  offeringOnPortal: boolean;
  offeringDetails?: {
    campaignUrl: string;
    targetAmount: number;
    amountRaised: number;
    investorCount: number;
    deadline: string;
    status: "live" | "successful" | "failed" | "withdrawn";
  };

  // Disclosure events
  disclosureEvents: Array<{
    type: string;
    date: string;
    description: string;
    severity: "minor" | "moderate" | "serious";
  }>;

  // Verification results
  verification: {
    portalRegistered: boolean;
    offeringLive: boolean;
    noSeriousDisclosures: boolean;
    fundsFlowThroughPortal: boolean;
  };

  // Red flags
  redFlags: Array<{
    type: "unregistered_portal" | "no_campaign" | "direct_wire_request" | "disclosure_events" | "portal_suspended";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;

  overallConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4: FDA VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export type FDAStatus =
  | "510(k) Cleared"
  | "PMA Approved"
  | "De Novo Granted"
  | "Registered/Listed Only"
  | "Pending Review"
  | "Not Found"
  | "Exempt";

export interface FDA510kClearance {
  kNumber: string;  // e.g., "K123456"
  deviceName: string;
  applicant: string;
  dateReceived: string;
  decisionDate: string;
  decision: "Substantially Equivalent" | "Not Substantially Equivalent" | "Withdrawn";
  productCode: string;
  reviewPanel?: string;
  statementUrl?: string;
  predicateDevices?: string[];
}

export interface FDAPMAApproval {
  pmaNumber: string;
  deviceName: string;
  applicant: string;
  approvalDate: string;
  productCode: string;
  supplementHistory?: Array<{
    supplementNumber: string;
    approvalDate: string;
    type: string;
  }>;
}

export interface FDARegistration {
  registrationNumber: string;
  firmName: string;
  facilityType: string;
  address: string;
  status: "Active" | "Inactive";
  expirationDate?: string;
}

export interface FDADeviceListing {
  listingNumber: string;
  deviceName: string;
  productCode: string;
  regulationNumber: string;
  deviceClass: "I" | "II" | "III";
  submissionType?: string;
}

export interface FDAAdverseEvent {
  reportNumber: string;
  eventDate: string;
  eventType: string;
  productProblem?: string;
  patientOutcome?: string;
  deviceName: string;
  manufacturer: string;
}

export interface FDARecall {
  recallNumber: string;
  recallClass: "I" | "II" | "III";
  recallStatus: "Ongoing" | "Completed" | "Terminated";
  productDescription: string;
  reasonForRecall: string;
  initiationDate: string;
  firmName: string;
}

export interface FdaVerificationFindings {
  // Claimed vs actual status
  claimedStatus?: string;
  actualStatus: FDAStatus;
  statusMatchesClaims: boolean;

  // 510(k) clearances
  clearances: FDA510kClearance[];
  hasClearance: boolean;

  // PMA approvals
  pmaApprovals: FDAPMAApproval[];
  hasPMA: boolean;

  // Registration & Listing (different from clearance!)
  registrations: FDARegistration[];
  deviceListings: FDADeviceListing[];
  isRegistered: boolean;
  isListed: boolean;

  // Safety signals
  adverseEvents: FDAAdverseEvent[];
  recalls: FDARecall[];
  hasAdverseEvents: boolean;
  hasRecalls: boolean;

  // Verification results
  verification: {
    statusVerified: boolean;
    clearanceMatchesClaims: boolean;
    noActiveRecalls: boolean;
    noSeriousAdverseEvents: boolean;
    facilityInGoodStanding: boolean;
  };

  // Red flags
  redFlags: Array<{
    type: "clearance_not_found" | "status_misrepresentation" | "active_recall" | "adverse_events" | "facility_issue";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;

  overallConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5: USPTO PATENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export interface USPTOPatent {
  patentNumber: string;
  applicationNumber?: string;
  title: string;
  abstract?: string;
  inventors: string[];
  assignee: string;
  currentAssignee?: string;
  filingDate: string;
  issueDate: string;
  expirationDate?: string;
  patentType: "Utility" | "Design" | "Plant" | "Reissue";
  status: "Active" | "Expired" | "Lapsed";
  claimsCount?: number;
  independentClaimsCount?: number;
  citations?: number;
  citedBy?: number;
  patentFamily?: string[];
  usptoUrl: string;
}

export interface USPTOApplication {
  applicationNumber: string;
  title: string;
  filingDate: string;
  status: "Pending" | "Allowed" | "Abandoned" | "Patented";
  applicant: string;
  publishedAs?: string;
  expectedIssueDate?: string;
}

export interface PatentAssignment {
  reelFrame: string;
  assignor: string;
  assignee: string;
  executionDate: string;
  recordedDate: string;
  patentNumbers: string[];
  conveyanceType: string;
}

export interface USPTOLicenseInfo {
  patentNumber: string;
  licenseType: "Exclusive" | "Non-Exclusive" | "Unknown";
  licensee?: string;
  licensor?: string;
  documentedInAssignments: boolean;
}

export interface UsptoDeepdiveFindings {
  // Patent portfolio
  patents: USPTOPatent[];
  totalPatents: number;
  activePatents: number;

  // Pending applications
  applications: USPTOApplication[];
  pendingApplications: number;

  // Assignment chain (ownership verification)
  assignments: PatentAssignment[];
  currentOwner?: string;
  ownershipVerified: boolean;

  // License information
  licenses: USPTOLicenseInfo[];

  // Patent analysis
  analysis: {
    portfolioStrength: "weak" | "moderate" | "strong";
    averageClaimsPerPatent?: number;
    citationImpact?: number;
    geographicCoverage?: string[];
    expirationTimeline?: Array<{
      patentNumber: string;
      expirationDate: string;
    }>;
  };

  // Competitor overlap
  competitorOverlap: Array<{
    competitor: string;
    overlappingPatents: number;
    riskLevel: "low" | "medium" | "high";
  }>;

  // Verification results
  verification: {
    patentsExist: boolean;
    assignmentToCompany: boolean;
    licensesDocumented: boolean;
    noLitigation: boolean;
  };

  // Red flags
  redFlags: Array<{
    type: "patent_not_found" | "not_assigned_to_company" | "license_undocumented" | "litigation_risk" | "expiring_soon";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;

  overallConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 6: MONEY FLOW INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════

export type FundsDestination =
  | "escrow_via_portal"
  | "escrow_agent"
  | "company_bank_account"
  | "personal_account"
  | "crypto_wallet"
  | "wire_transfer"
  | "unknown";

export interface InvestorVerification {
  investorName: string;
  investorType: "VC Fund" | "Angel" | "Family Office" | "Corporate" | "Individual" | "Unknown";
  verified: boolean;
  verificationSource?: string;
  knownInvestments?: string[];
  redFlags?: string[];
}

export interface FundFlowStep {
  step: number;
  from: string;
  to: string;
  method: FundsDestination;
  amount?: number;
  date?: string;
  verified: boolean;
  redFlags?: string[];
}

export interface CapTableAnalysis {
  foundersEquity?: number;
  investorEquity?: number;
  optionPool?: number;
  totalShares?: number;
  recentChanges?: Array<{
    type: string;
    date: string;
    impact: string;
  }>;
  concerningPatterns?: string[];
}

export interface MoneyFlowIntegrityFindings {
  // How they want funds sent
  requestedMethod: FundsDestination;
  appropriateForRegime: boolean;

  // Escrow verification
  escrowAgent?: {
    name: string;
    verified: boolean;
    regulatedEntity: boolean;
  };

  // Fund flow analysis
  fundFlow: FundFlowStep[];
  flowMatchesRegime: boolean;

  // Investor verification
  claimedInvestors: string[];
  verifiedInvestors: InvestorVerification[];
  investorVerificationRate: number;

  // Cap table analysis (if available)
  capTable?: CapTableAnalysis;

  // Revenue authenticity signals
  revenueSignals?: {
    claimed?: string;
    verificationLevel: "unverified" | "partially_verified" | "verified";
    sources?: string[];
    concerns?: string[];
  };

  // Wire fraud indicators
  wireFraudIndicators: Array<{
    indicator: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;

  // Verification results
  verification: {
    fundsMethodAppropriate: boolean;
    escrowVerified: boolean;
    investorsVerified: boolean;
    noWireFraudIndicators: boolean;
    flowMatchesDocuments: boolean;
  };

  // Red flags
  redFlags: Array<{
    type: "personal_account" | "crypto_request" | "no_escrow" | "unverified_investors" | "flow_mismatch" | "wire_fraud_risk";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;

  overallConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYBOOK SYNTHESIS
// ═══════════════════════════════════════════════════════════════════════════

export interface PlaybookDiscrepancy {
  field: string;
  claimedValue: string;
  verifiedValue: string;
  source: string;
  severity: "minor" | "moderate" | "major" | "critical";
  category: "entity" | "securities" | "regulatory" | "ip" | "financial";
}

export interface PlaybookVerificationScore {
  entity: number;        // 0-1
  securities: number;    // 0-1
  finra: number;         // 0-1
  fda: number;           // 0-1
  patents: number;       // 0-1
  moneyFlow: number;     // 0-1
  overall: number;       // 0-1 weighted average
}

export interface PlaybookStopRule {
  triggered: boolean;
  rule: string;
  description: string;
  recommendation: "proceed_with_caution" | "require_resolution" | "disengage";
}

export interface InvestorPlaybookSynthesis {
  // Entity being evaluated
  entityName: string;
  evaluationDate: number;

  // Branch findings
  entityVerification?: EntityVerificationFindings;
  secEdgar?: SecEdgarFindings;
  finraValidation?: FinraValidationFindings;
  fdaVerification?: FdaVerificationFindings;
  usptoDeepdive?: UsptoDeepdiveFindings;
  moneyFlowIntegrity?: MoneyFlowIntegrityFindings;

  // Aggregated analysis
  discrepancies: PlaybookDiscrepancy[];
  verificationScores: PlaybookVerificationScore;

  // Stop rules evaluation
  stopRules: PlaybookStopRule[];
  shouldDisengage: boolean;

  // Final assessment
  overallRisk: "low" | "moderate" | "elevated" | "high" | "critical";
  recommendation: "proceed" | "proceed_with_conditions" | "require_resolution" | "pass";
  conditions?: string[];
  requiredResolutions?: string[];

  // Sources
  sources: DDSource[];

  // Metadata
  branchesExecuted: InvestorPlaybookBranchType[];
  executionTimeMs: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPES (for external API calls)
// ═══════════════════════════════════════════════════════════════════════════

export interface StateRegistryAPIResponse {
  success: boolean;
  state: string;
  entities: StateRegistryRecord[];
  error?: string;
}

export interface SecEdgarAPIResponse {
  success: boolean;
  cik?: string;
  company?: {
    name: string;
    sic?: string;
    stateOfIncorporation?: string;
  };
  filings: Array<{
    accessionNumber: string;
    form: string;
    filingDate: string;
    primaryDocument?: string;
    documentUrl?: string;
  }>;
  error?: string;
}

export interface FinraPortalAPIResponse {
  success: boolean;
  portals: FundingPortal[];
  error?: string;
}

export interface FDA510kAPIResponse {
  success: boolean;
  results: FDA510kClearance[];
  totalCount: number;
  error?: string;
}

export interface FDARegistrationAPIResponse {
  success: boolean;
  registrations: FDARegistration[];
  listings: FDADeviceListing[];
  error?: string;
}

export interface USPTOPatentAPIResponse {
  success: boolean;
  patents: USPTOPatent[];
  totalCount: number;
  error?: string;
}

export interface USPTOAssignmentAPIResponse {
  success: boolean;
  assignments: PatentAssignment[];
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 7: CLAIM VERIFICATION (Strategic Hypothesis Validation)
// ═══════════════════════════════════════════════════════════════════════════

export type ClaimConfidence = "high" | "medium" | "low" | "unverified" | "contradicted";

export interface VerifiedClaim {
  claim: string;                      // The original claim text
  confidence: ClaimConfidence;        // Confidence level
  status: "verified" | "unverified" | "contradicted" | "partially_verified";
  evidence: string[];                 // Supporting evidence
  sources: Array<{
    title: string;
    url?: string;
    reliability: "authoritative" | "reputable" | "unknown";
  }>;
  notes?: string;                     // Additional context
}

export interface ClaimVerificationFindings {
  verifiedClaims: VerifiedClaim[];
  unverifiedClaims: VerifiedClaim[];
  contradictedClaims: VerifiedClaim[];
  overallAssessment: string;
  confidenceScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 8: PERSON VERIFICATION (Professional Background)
// ═══════════════════════════════════════════════════════════════════════════

export interface PersonVerificationFindings {
  name: string;
  linkedInUrl?: string;
  currentRole?: string;
  currentCompany?: string;
  verified: boolean;
  professionalBackground: Array<{
    role: string;
    company: string;
    period?: string;
    verified: boolean;
    source?: string;
  }>;
  publicStatements?: Array<{
    topic: string;
    source: string;
    url?: string;
  }>;
  redFlags: Array<{
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }>;
  confidenceScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 9: NEWS/ACQUISITION VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export interface AcquisitionDetails {
  acquirer: string;
  target: string;
  announcementDate?: string;
  closingDate?: string;
  dealValue?: string;
  dealType: "acquisition" | "merger" | "investment" | "partnership" | "rumored";
  status: "announced" | "completed" | "pending" | "rumored" | "denied";
  sources: Array<{
    outlet: string;
    title: string;
    url: string;
    date?: string;
    reliability: "authoritative" | "reputable" | "tabloid" | "unknown";
  }>;
}

export interface NewsVerificationFindings {
  eventVerified: boolean;
  eventType: "acquisition" | "funding" | "partnership" | "product_launch" | "other";
  acquisitionDetails?: AcquisitionDetails;
  keyFacts: Array<{
    fact: string;
    verified: boolean;
    source?: string;
    confidence: ClaimConfidence;
  }>;
  relatedNews: Array<{
    title: string;
    outlet: string;
    url: string;
    date?: string;
    relevance: "direct" | "related" | "background";
  }>;
  overallConfidence: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BRANCH TRIGGER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

import { ComplexitySignals } from "../types";

export interface PlaybookComplexitySignals extends ComplexitySignals {
  // Additional signals for playbook branches
  isRequestingFunding?: boolean;
  claimedFDAStatus?: string;
  claimedPatents?: string[];
  claimedSecuritiesRegime?: SecuritiesRegime;
  fundingPortalMentioned?: string;
  wireInstructionsProvided?: boolean;
  cryptoPaymentRequested?: boolean;

  // Claim verification signals
  isClaimVerification?: boolean;      // Query asks to verify specific claims
  hasSpecificClaims?: boolean;        // Query contains falsifiable claims

  // Person verification signals
  personMentioned?: string;           // Name of person to verify
  linkedInUrl?: string;               // LinkedIn URL for person

  // News/acquisition verification signals
  acquisitionMentioned?: boolean;     // Query mentions acquisition
  newsEventMentioned?: boolean;       // Query mentions news event to verify
  companiesInvolved?: string[];       // Companies involved in acquisition/news
}

export const PLAYBOOK_BRANCH_TRIGGERS: Record<
  InvestorPlaybookBranchType,
  (signals: PlaybookComplexitySignals) => boolean
> = {
  // Entity verification: ALWAYS run for funding requests
  entity_verification: (signals) =>
    Boolean(signals.isRequestingFunding) || true,

  // SEC EDGAR: Run for any significant funding or securities claims
  sec_edgar: (signals) =>
    Boolean(signals.isRequestingFunding) ||
    (signals.fundingSize ?? 0) > 100_000 ||
    signals.claimedSecuritiesRegime !== undefined ||
    Boolean(signals.hasPublicSecurities),

  // FINRA validation: Run if funding portal mentioned or Reg CF
  finra_validation: (signals) =>
    signals.fundingPortalMentioned !== undefined ||
    signals.claimedSecuritiesRegime === "Reg CF" ||
    signals.sectors?.some(s =>
      ["Fintech", "Crypto", "Banking", "Insurance"].includes(s)
    ) || false,

  // FDA verification: Run if FDA status claimed or HealthTech/Biotech
  fda_verification: (signals) =>
    signals.claimedFDAStatus !== undefined ||
    signals.sectors?.some(s =>
      ["HealthTech", "Biotech", "MedTech", "Pharma", "Medical Devices"].includes(s)
    ) || false,

  // USPTO deep dive: Run if patents claimed or DeepTech
  uspto_deepdive: (signals) =>
    (signals.claimedPatents?.length ?? 0) > 0 ||
    Boolean(signals.hasPatentMentions) ||
    signals.sectors?.some(s =>
      ["DeepTech", "Biotech", "Hardware", "Semiconductors", "Pharma"].includes(s)
    ) || false,

  // Money flow integrity: ALWAYS run for funding requests
  money_flow_integrity: (signals) =>
    Boolean(signals.isRequestingFunding) ||
    Boolean(signals.wireInstructionsProvided) ||
    Boolean(signals.cryptoPaymentRequested) ||
    (signals.fundingSize ?? 0) > 50_000,

  // Claim verification: Run when query contains specific claims to verify
  claim_verification: (signals) =>
    Boolean(signals.isClaimVerification) ||
    Boolean(signals.hasSpecificClaims),

  // Person verification: Run when query mentions specific people
  person_verification: (signals) =>
    Boolean(signals.personMentioned) ||
    Boolean(signals.linkedInUrl),

  // News verification: Run when query mentions acquisitions, news events
  news_verification: (signals) =>
    Boolean(signals.acquisitionMentioned) ||
    Boolean(signals.newsEventMentioned),
};
