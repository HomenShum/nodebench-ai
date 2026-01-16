/**
 * Due Diligence Types
 *
 * Comprehensive type definitions for the parallelized DD framework.
 * Follows Traditional VC/Banking Memo Structure per IC expectations.
 */

import { Id } from "../../../_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════
// CORE ENUMS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

export const CORE_BRANCHES = [
  "company_profile",
  "team_founders",
  "market_competitive",
] as const;

export const CONDITIONAL_BRANCHES = [
  "technical_dd",
  "ip_patents",
  "regulatory",
  "financial_deep",
  "network_mapping",
] as const;

// Investor Playbook branches (additional verification for funding requests)
export const INVESTOR_PLAYBOOK_BRANCHES = [
  "entity_verification",
  "sec_edgar",
  "finra_validation",
  "fda_verification",
  "uspto_deepdive",
  "money_flow_integrity",
] as const;

export type InvestorPlaybookBranchType = typeof INVESTOR_PLAYBOOK_BRANCHES[number];

export const ALL_BRANCH_TYPES = [...CORE_BRANCHES, ...CONDITIONAL_BRANCHES] as const;

export type BranchType = typeof ALL_BRANCH_TYPES[number];
export type CoreBranchType = typeof CORE_BRANCHES[number];
export type ConditionalBranchType = typeof CONDITIONAL_BRANCHES[number];

export type DDJobStatus =
  | "pending"
  | "analyzing"
  | "executing"
  | "cross_checking"
  | "synthesizing"
  | "completed"
  | "failed";

export type BranchStatus =
  | "pending"
  | "running"
  | "awaiting_verification"
  | "completed"
  | "failed"
  | "skipped";

export type Verdict =
  | "STRONG_BUY"
  | "BUY"
  | "HOLD"
  | "PASS"
  | "INSUFFICIENT_DATA";

export type RiskCategory =
  | "Market"
  | "Execution"
  | "Regulatory"
  | "Team"
  | "Technical"
  | "Financial"
  | "Competitive"
  | "Legal";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type SourceReliability = "authoritative" | "reliable" | "secondary" | "inferred";

export type SourceType =
  | "sec_filing"
  | "news_article"
  | "company_website"
  | "linkedin"
  | "patent_db"
  | "crunchbase"
  | "pitchbook"
  | "llm_inference";

// ═══════════════════════════════════════════════════════════════════════════
// COMPLEXITY SIGNALS (determines conditional branches)
// ═══════════════════════════════════════════════════════════════════════════

export interface ComplexitySignals {
  fundingSize?: number;           // USD amount
  teamSize?: number;              // Key people count
  hasPatentMentions?: boolean;
  hasRegulatoryMentions?: boolean;
  hasPublicSecurities?: boolean;
  hasSerialFounders?: boolean;
  hasVCBackedFounders?: boolean;
  hasRepoMentions?: boolean;
  industryRisk?: "low" | "medium" | "high";
  sectors?: string[];
  fundingStage?: string;
}

/**
 * Branch trigger configuration
 * Maps conditional branches to their activation criteria
 */
export const BRANCH_TRIGGERS: Record<
  ConditionalBranchType,
  (signals: ComplexitySignals) => boolean
> = {
  technical_dd: (signals) =>
    Boolean(signals.hasRepoMentions) ||
    signals.industryRisk === "high" ||
    signals.sectors?.some(s =>
      ["AI/ML", "Cybersecurity", "DevTools", "Infrastructure"].includes(s)
    ) || false,

  ip_patents: (signals) =>
    Boolean(signals.hasPatentMentions) ||
    signals.sectors?.some(s =>
      ["Biotech", "Pharma", "DeepTech", "Hardware", "Semiconductors"].includes(s)
    ) || false,

  regulatory: (signals) =>
    Boolean(signals.hasRegulatoryMentions) ||
    signals.sectors?.some(s =>
      ["HealthTech", "Fintech", "Crypto", "Insurance", "Banking"].includes(s)
    ) || false,

  financial_deep: (signals) =>
    (signals.fundingSize ?? 0) > 50_000_000 ||
    Boolean(signals.hasPublicSecurities) ||
    signals.fundingStage?.includes("Series C") ||
    signals.fundingStage?.includes("Series D") ||
    signals.fundingStage?.includes("Growth") || false,

  network_mapping: (signals) =>
    (signals.teamSize ?? 0) > 5 ||
    Boolean(signals.hasSerialFounders) ||
    Boolean(signals.hasVCBackedFounders),
};

// ═══════════════════════════════════════════════════════════════════════════
// TEAM MEMBER PROFILE (Deep founder/team DD)
// ═══════════════════════════════════════════════════════════════════════════

export interface CareerTimelineEntry {
  organization: string;
  role: string;
  startYear: number;
  endYear?: number;
  type: "education" | "employment" | "board" | "advisory" | "founding";
  highlights?: string[];
  verified?: boolean;
  source?: string;
}

export interface BoardSeat {
  company: string;
  role: string;           // "Board Member", "Observer", "Chairman"
  isActive: boolean;
  startYear?: number;
  endYear?: number;
}

export interface AdvisoryRole {
  organization: string;
  role: string;
  isActive: boolean;
  domain?: string;
}

export interface PatentAuthorship {
  patentId: string;
  title: string;
  filingDate: string;
  grantDate?: string;
  coInventors: string[];
  assignee?: string;
  usptoUrl?: string;
  verified?: boolean;
}

export interface ConflictFlag {
  type: "competitive" | "investor_overlap" | "litigation" | "regulatory" | "reputation";
  description: string;
  severity: "low" | "medium" | "high";
  source?: string;
  dateIdentified?: string;
}

export interface NetworkConnections {
  coFounders: Array<{
    name: string;
    company: string;
    relationship: string;
    outcome?: "success" | "failure" | "ongoing" | "unknown";
  }>;
  investorRelationships: Array<{
    investorName: string;
    companies: string[];
    relationshipType?: "founder" | "executive" | "board";
  }>;
  boardNetworkOverlap: Array<{
    person: string;
    sharedBoards: string[];
  }>;
  references: Array<{
    name: string;
    relationship: string;
    contactAvailable: boolean;
    company?: string;
  }>;
}

export interface TrackRecord {
  successfulExits: number;
  failedVentures: number;
  pivots: number;
  yearsExperience: number;
  domainExpertise: string[];
  largestExitValue?: string;
  exitTypes?: Array<{ type: string; count: number }>;
}

export interface TeamMemberProfile {
  id: string;
  name: string;
  currentRole: string;
  currentCompany?: string;
  linkedinUrl?: string;
  email?: string;
  photo?: string;

  // Career Timeline
  careerTimeline: CareerTimelineEntry[];

  // Board & Advisory
  boardSeats: BoardSeat[];
  advisoryRoles: AdvisoryRole[];

  // Patent Authorship
  patents: PatentAuthorship[];

  // Education
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    graduationYear?: number;
    honors?: string[];
  }>;

  // Conflict Checks
  conflictFlags: ConflictFlag[];

  // Network Mapping
  networkConnections: NetworkConnections;

  // Track Record
  trackRecord: TrackRecord;

  // Red flags & Highlights
  redFlags: string[];
  highlights: string[];

  // Sources
  sources: Array<{
    type: SourceType;
    url?: string;
    accessedAt: number;
    reliability: SourceReliability;
  }>;

  // Verification
  verificationStatus: "unverified" | "partial" | "verified";
  lastVerified?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// BRANCH FINDINGS (type-specific outputs)
// ═══════════════════════════════════════════════════════════════════════════

export interface CompanyProfileFindings {
  description: string;
  hqLocation?: string;
  foundedYear?: number;
  employeeCount?: number;
  employeeGrowth?: string;
  website?: string;
  sectors: string[];
  stage?: string;
  businessModel?: string;
  keyProducts: string[];
  recentMilestones: string[];
  socialPresence?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface TeamFoundersFindings {
  founders: TeamMemberProfile[];
  executives: TeamMemberProfile[];
  boardMembers: TeamMemberProfile[];
  advisors?: TeamMemberProfile[];
  teamSize: number;
  averageExperience: number;
  hasSerialFounders: boolean;
  hasVCBackedFounders: boolean;
  founderMarketFit?: string;
  trackRecordSummary?: string;
  teamStrengths: string[];
  teamGaps: string[];
  keyPersonRisk: string[];
}

export interface MarketCompetitiveFindings {
  marketSize?: {
    tam?: string;
    sam?: string;
    som?: string;
  };
  marketGrowth?: string;
  competitors: Array<{
    name: string;
    description?: string;
    fundingStage?: string;
    fundingTotal?: string;
    differentiator?: string;
    threat: "low" | "medium" | "high";
  }>;
  differentiators: string[];
  whyNow?: string;
  tailwinds: string[];
  headwinds: string[];
  marketRisks: string[];
}

export interface TechnicalDDFindings {
  techStack: string[];
  architecture?: string;
  scalability?: string;
  securityPosture?: {
    cveCount?: number;
    lastAudit?: string;
    certifications?: string[];
  };
  repoStats?: {
    stars: number;
    forks: number;
    contributors: number;
    commitFrequency?: string;
  };
  technicalDebt?: string;
  infrastructureCosts?: string;
}

export interface IPPatentsFindings {
  patents: PatentAuthorship[];
  patentPortfolioValue?: string;
  pendingApplications: number;
  trademarks: string[];
  defensibility?: string;
  ipRisks: string[];
  competitorIPOverlap?: string[];
}

export interface RegulatoryFindings {
  regulatoryBody?: string;           // FDA, SEC, etc.
  currentStatus?: string;
  filings: Array<{
    type: string;
    date: string;
    url?: string;
    status: string;
  }>;
  approvals: string[];
  pendingApprovals: string[];
  complianceRisks: string[];
  timeToApproval?: string;
}

export interface FinancialDeepFindings {
  fundingHistory: Array<{
    roundType: string;
    date?: string;
    amount?: string;
    leadInvestors?: string[];
    valuation?: string;
    verified?: boolean;
    source?: string;
  }>;
  totalRaised?: {
    amount: number;
    currency: string;
    unit: string;
  };
  burnRate?: string;
  runway?: string;
  revenue?: string;
  revenueGrowth?: string;
  unitEconomics?: string;
  valuationComps?: Array<{
    company: string;
    valuation: string;
    multiple?: number;
  }>;
}

export interface NetworkMappingFindings {
  networkGraph: {
    nodes: Array<{
      id: string;
      name: string;
      type: "person" | "company" | "investor";
      metadata?: Record<string, unknown>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      relationship: string;
      strength?: number;
    }>;
  };
  keyConnections: string[];
  investorNetwork: string[];
  advisorNetwork: string[];
  potentialConflicts: string[];
  referenceability: number; // 0-1 how easy to get references
}

export type BranchFindings =
  | CompanyProfileFindings
  | TeamFoundersFindings
  | MarketCompetitiveFindings
  | TechnicalDDFindings
  | IPPatentsFindings
  | RegulatoryFindings
  | FinancialDeepFindings
  | NetworkMappingFindings;

// ═══════════════════════════════════════════════════════════════════════════
// CONTRADICTION & CROSS-CHECK
// ═══════════════════════════════════════════════════════════════════════════

export interface Contradiction {
  field: string;
  sourceA: string;
  valueA: string;
  sourceB: string;
  valueB: string;
  resolution?: "resolved_to_a" | "resolved_to_b" | "unresolved" | "both_valid";
  resolutionReason?: string;
  confidenceA?: number;
  confidenceB?: number;
}

export interface CrossCheckResult {
  branchA: BranchType;
  branchB: BranchType;
  agreements: string[];
  disagreements: Contradiction[];
  overallAgreement: number; // 0-1
}

// ═══════════════════════════════════════════════════════════════════════════
// SOURCE TRACKING
// ═══════════════════════════════════════════════════════════════════════════

export interface DDSource {
  sourceType: SourceType;
  url?: string;
  title?: string;
  accessedAt: number;
  reliability: SourceReliability;
  branchType?: BranchType;
  section?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEMO STRUCTURE (Traditional IC Format)
// ═══════════════════════════════════════════════════════════════════════════

export interface MemoCompanyOverview {
  description: string;
  hqLocation?: string;
  foundedYear?: number;
  employeeCount?: number;
  employeeGrowth?: string;
  sectors: string[];
  stage?: string;
  businessModel?: string;
  keyProducts?: string[];
}

export interface MemoMarketAnalysis {
  marketSize?: string;
  marketGrowth?: string;
  competitors: Array<{
    name: string;
    description?: string;
    fundingStage?: string;
    differentiator?: string;
  }>;
  differentiators: string[];
  whyNow?: string;
  tailwinds?: string[];
  headwinds?: string[];
}

export interface MemoTeamAnalysis {
  founders: TeamMemberProfile[];
  executives: TeamMemberProfile[];
  boardMembers: TeamMemberProfile[];
  advisors?: TeamMemberProfile[];
  networkGraph?: NetworkMappingFindings["networkGraph"];
  trackRecordSummary?: string;
  teamStrengths?: string[];
  teamGaps?: string[];
  founderMarketFit?: string;
}

export interface MemoFundingHistory {
  totalRaised?: {
    amount: number;
    currency: string;
    unit: string;
  };
  rounds: Array<{
    roundType: string;
    date?: string;
    amount?: string;
    leadInvestors?: string[];
    valuation?: string;
    verified?: boolean;
    source?: string;
  }>;
  valuationComps?: {
    currentValuation?: string;
    revenueMultiple?: number;
    comparables?: Array<{
      company: string;
      valuation: string;
      multiple?: number;
    }>;
  };
  burnRate?: string;
  runway?: string;
}

export interface MemoRisk {
  category: RiskCategory;
  description: string;
  severity: RiskSeverity;
  likelihood?: "low" | "medium" | "high";
  mitigation?: string;
  timeframe?: string;
}

export interface MemoInvestmentThesis {
  thesisSummary: string;
  keyDrivers: string[];
  keyMilestones?: Array<{
    milestone: string;
    timeframe?: string;
    importance?: string;
  }>;
  exitScenarios?: Array<{
    scenario: string;
    probability?: string;
    potentialReturn?: string;
    acquirers?: string[];
  }>;
  comparableExits?: Array<{
    company: string;
    exitType: string;
    exitValue: string;
    year?: number;
  }>;
}

export interface MemoVerificationSummary {
  contradictionsFound: number;
  contradictionsResolved: number;
  overallConfidence: number;
  dataCompleteness: number;
  sourceQuality: "high" | "medium" | "low";
}

export interface DDMemo {
  jobId: string;
  entityName: string;
  entityType: "company" | "fund" | "person";

  // I. Executive Summary
  executiveSummary: string;
  verdict: Verdict;
  verdictRationale?: string;

  // II. Company Overview
  companyOverview: MemoCompanyOverview;

  // III. Market Analysis
  marketAnalysis: MemoMarketAnalysis;

  // IV. Team Assessment
  teamAnalysis: MemoTeamAnalysis;

  // V. Financials / Funding History
  fundingHistory: MemoFundingHistory;

  // VI. Risks
  risks: MemoRisk[];

  // VII. Investment Thesis
  investmentThesis: MemoInvestmentThesis;

  // Verification & Sources
  verificationSummary: MemoVerificationSummary;
  sources: DDSource[];

  // Persona Readiness
  personaReadiness?: Record<string, {
    ready: boolean;
    missingFields?: string[];
    relevanceScore?: number;
  }>;

  // Metadata
  createdAt: number;
  updatedAt: number;
  version: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DD JOB & ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════

export interface DDJobConfig {
  entityName: string;
  entityType: "company" | "fund" | "person";
  triggerSource: "funding_detection" | "deals_feed" | "manual" | "scheduled_refresh";
  triggerEventId?: string;
  entityId?: Id<"entityContexts">;
  userId: Id<"users">;
  priority?: "high" | "normal" | "low";
  forceRefresh?: boolean;
}

export interface DDJobProgress {
  status: DDJobStatus;
  phase: string;
  activeBranches: BranchType[];
  completedBranches: BranchType[];
  failedBranches: BranchType[];
  currentBranch?: BranchType;
  elapsedMs: number;
  estimatedRemainingMs?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// EVALUATION FRAMEWORK
// ═══════════════════════════════════════════════════════════════════════════

export interface DDBooleanFactors {
  // Core factors
  hasCompanyProfile: boolean;
  hasTeamData: boolean;
  hasMarketAnalysis: boolean;
  hasRiskAssessment: boolean;
  hasInvestmentThesis: boolean;

  // Verification factors
  fundingVerifiedViaSEC: boolean;
  teamVerifiedViaLinkedIn: boolean;
  patentsVerifiedViaUSPTO: boolean;

  // Cross-check factors
  noCriticalContradictions: boolean;
  allContradictionsResolved: boolean;

  // Completeness
  allCoreBranchesCompleted: boolean;
  conditionalBranchesAppropriate: boolean;

  // Traditional memo structure
  hasExecutiveSummary: boolean;
  hasVerdict: boolean;

  // Quality thresholds
  confidenceAboveThreshold: boolean;
  dataCompletenessAboveThreshold: boolean;
}

export interface DDEvaluationResult {
  entityName: string;
  passed: boolean;
  booleanFactors: DDBooleanFactors;
  failedFactors: string[];
  warnings: string[];
  executionTimeMs: number;
}
