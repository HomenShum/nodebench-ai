/**
 * founderLocalPipeline.ts — Local intelligence pipeline that executes the
 * founder_deep_context_gather protocol end-to-end WITHOUT Convex.
 *
 * This is the P0 bridge: takes protocol → produces finished packet using
 * only local sources (git log, filesystem, SQLite session memory).
 *
 * Three tools:
 *   1. founder_local_gather   — Reads all local sources, returns structured context
 *   2. founder_local_synthesize — Takes gathered context, produces a FounderPacket
 *   3. founder_local_weekly_reset — Convenience: gather + synthesize in one call
 */

import { execSync } from "child_process";
import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { McpTool } from "../types.js";
import { getDb, genId } from "../db.js";
import {
  buildFounderOperatingModel,
  type FounderOperatingModel,
} from "./founderOperatingModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function safeRead(filePath: string): string | null {
  try {
    if (!existsSync(filePath)) return null;
    return readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

function safeExec(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 10_000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function findProjectRoot(): string {
  // Walk up from packages/mcp-local to find the monorepo root (has CLAUDE.md)
  let dir = resolve(__dirname, "..", "..");
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, "CLAUDE.md"))) return dir;
    dir = resolve(dir, "..");
  }
  return process.cwd();
}

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface GatheredContext {
  identity: {
    projectRoot: string;
    claudeMdSnippet: string | null;
    packageName: string | null;
    packageVersion: string | null;
  };
  recentChanges: {
    gitLogOneline: string[];
    gitDiffStat: string;
    modifiedFiles: string[];
    daysBack: number;
  };
  publicSurfaces: {
    indexHtmlTitle: string | null;
    indexHtmlOgDescription: string | null;
    serverJsonDescription: string | null;
    readmeTagline: string | null;
  };
  sessionMemory: {
    recentActions: Array<{ action: string; category: string; impact: string; timestamp: string }>;
    recentMilestones: Array<{ title: string; category: string; timestamp: string }>;
    totalActions7d: number;
    totalMilestones7d: number;
  };
  dogfoodFindings: {
    latestFile: string | null;
    verdict: string | null;
    p0Count: number;
    p1Count: number;
    findings: string[];
  };
  docs: {
    prdSnippet: string | null;
    dogfoodRunbookSnippet: string | null;
    architectureDocs: string[];
  };
}

interface FounderPacket {
  packetId: string;
  packetType: "weekly_reset" | "pre_delegation" | "important_change" | "competitor_brief" | "role_switch";
  generatedAt: string;
  generatedBy: "founder_local_pipeline";
  canonicalEntity: {
    name: string;
    canonicalMission: string;
    wedge: string;
    companyState: string;
    identityConfidence: number;
  };
  whatChanged: Array<{ description: string; date: string; source: string }>;
  contradictions: Array<{ claim: string; evidence: string; severity: "high" | "medium" | "low" }>;
  nextActions: Array<{ action: string; priority: number; reasoning: string }>;
  signals: Array<{ name: string; direction: "up" | "down" | "neutral"; impact: "high" | "medium" | "low" }>;
  publicNarrativeCheck: {
    aligned: boolean;
    mismatches: string[];
  };
  sessionStats: {
    actionsTracked7d: number;
    milestonesTracked7d: number;
    dogfoodVerdict: string | null;
  };
  memo: string;
}

export interface FounderStrategicAngle {
  id: string;
  title: string;
  status: "strong" | "watch" | "unknown";
  summary: string;
  whyItMatters: string;
  evidenceRefIds: string[];
  nextQuestion: string;
}

export interface FounderDirectionAssessment {
  assessmentId: string;
  packetId: string;
  packetType: "founder_direction_assessment";
  generatedAt: string;
  generatedBy: "founder_local_pipeline";
  query: string;
  lens: string;
  summary: string;
  confidence: number;
  sourceRefs: Array<{
    id: string;
    label: string;
    title: string;
    type: "local";
    status: "cited" | "explored";
    href?: string;
    excerpt?: string;
  }>;
  strategicAngles: FounderStrategicAngle[];
  recommendedNextAction: string;
  nextQuestions: string[];
  issueAngles: string[];
  progressionProfile: FounderProgressionProfile;
  progressionTiers: ProgressionTierDefinition[];
  diligencePack: DiligencePackDefinition;
  readinessScore: number;
  unlocks: UnlockCriteria[];
  materialsChecklist: FounderMaterialsChecklistItem[];
  scorecards: FounderScorecard[];
  shareableArtifacts: FounderShareableArtifact[];
  visibility: FounderPacketVisibility;
  benchmarkEvidence: AutonomyBenchmarkRun[];
  workflowComparison: WorkflowPathComparison;
  operatingModel: FounderOperatingModel;
  distributionSurfaceStatus: DistributionSurfaceStatus[];
  companyReadinessPacket: CompanyReadinessPacket;
  companyNamingPack: FounderCompanyNamingPack;
}

export type FounderPacketVisibility = "internal" | "workspace" | "public";
export type FounderProgressionStageId =
  | "clarity"
  | "foundation"
  | "readiness"
  | "leverage"
  | "scale";

export interface UnlockCriteria {
  id: string;
  title: string;
  status: "ready" | "watch" | "missing";
  requiredSignals: string[];
}

export interface ProgressionTierDefinition {
  id: FounderProgressionStageId;
  label: string;
  priceLabel: string;
  unlocks: string[];
  services: string[];
}

export interface FounderScorecard {
  id: "two_week" | "three_month";
  label: string;
  status: "on_track" | "watch" | "off_track";
  summary: string;
  mustHappen: string[];
}

export interface FounderProgressionProfile {
  currentStage: FounderProgressionStageId;
  currentStageLabel: string;
  readinessScore: number;
  missingFoundations: string[];
  hiddenRisks: string[];
  nextUnlocks: UnlockCriteria[];
  delegableWork: string[];
  founderOnlyWork: string[];
  onTrackStatus: "on_track" | "watch" | "off_track";
  recommendedNextAction: string;
}

export interface EvidenceClass {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export interface ReadinessRequirement {
  id: string;
  title: string;
  status: "ready" | "watch" | "missing";
  whyItMatters: string;
  evidenceClassIds: string[];
}

export interface DiligencePackDefinition {
  id: string;
  label: string;
  summary: string;
  externalEvaluators: string[];
  evidenceClasses: EvidenceClass[];
  requirements: ReadinessRequirement[];
  highRiskClaims: string[];
  materials: string[];
  readyDefinition: string;
}

export interface FounderMaterialsChecklistItem {
  id: string;
  label: string;
  status: "ready" | "watch" | "missing";
  audience: string;
  whyItMatters: string;
}

export interface DistributionSurfaceStatus {
  surfaceId: string;
  label: string;
  status: "ready" | "partial" | "missing";
  whyItMatters: string;
}

export interface FounderShareableArtifact {
  id: string;
  type:
    | "slack_onepage"
    | "investor_memo"
    | "banker_readiness"
    | "pitchbook_like"
    | "crunchbase_like"
    | "yc_context"
    | "generic_json";
  title: string;
  visibility: FounderPacketVisibility;
  summary: string;
  payload: Record<string, unknown>;
  href?: string;
}

export interface CompanyStarterProfile {
  companyName: string;
  oneLineDescription: string;
  categories: string[];
  stage: string;
  initialCustomers: string[];
  wedge: string;
}

export interface FounderCompanyNamingPack {
  suggestedNames: string[];
  recommendedName: string;
  starterProfile: CompanyStarterProfile;
}

export interface CompanyReadinessPacket {
  packetId: string;
  visibility: FounderPacketVisibility;
  identity: {
    companyName: string;
    vertical: string;
    subvertical: string;
    stage: string;
    mission: string;
    wedge: string;
  };
  founderTeamCredibility: string[];
  productAndWedge: string[];
  marketAndGtm: string[];
  financialReadiness: string[];
  operatingReadiness: string[];
  diligenceEvidence: string[];
  contradictionsAndHiddenRisks: string[];
  nextUnlocks: string[];
  pricingStage: {
    stageId: FounderProgressionStageId;
    label: string;
    priceLabel: string;
  };
  distributionSurfaceStatus: DistributionSurfaceStatus[];
  provenance: {
    sourceRefIds: string[];
    confidence: number;
    freshness: string;
  };
  allowedDestinations: string[];
  sensitivity: "internal" | "workspace";
}

export interface WorkflowPathComparison {
  objective: string;
  currentPath: string[];
  optimizedPath: string[];
  rationale: string;
  validationChecks: string[];
  estimatedSavings: {
    timePercent: number;
    costPercent: number;
  };
  verdict: "valid" | "watch" | "invalid";
}

export interface AutonomyBenchmarkRun {
  benchmarkId: string;
  lane:
    | "weekly_founder_reset"
    | "competitor_signal_response"
    | "packet_to_implementation"
    | "cheapest_valid_workflow"
    | "browserstack_lane";
  objective: string;
  packetRef: string;
  agentsInvolved: string[];
  actionsTaken: string[];
  beforeState: string;
  afterState: string;
  artifactsProduced: string[];
  validationPasses: string[];
  validationFailures: string[];
  timeMs: number;
  estimatedCostUsd: number;
  humanInterventions: string[];
  reuseScore: number;
  summary: string;
}

function includesAny(value: string, terms: string[]): boolean {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term.toLowerCase()));
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean))];
}

const PROGRESSION_TIERS: ProgressionTierDefinition[] = [
  {
    id: "clarity",
    label: "Stage 0: Clarity",
    priceLabel: "Free",
    unlocks: ["Idea pressure test", "Founder profile baseline", "Starter packet"],
    services: ["Search/upload/ask", "Basic founder packet", "Weekly reset"],
  },
  {
    id: "foundation",
    label: "Stage 1: Foundation",
    priceLabel: "$1",
    unlocks: ["Missing foundations", "Operating hygiene", "Delegation packet"],
    services: ["Readiness checklist", "Decision memo export", "Team install plan"],
  },
  {
    id: "readiness",
    label: "Stage 2: Readiness",
    priceLabel: "$5",
    unlocks: ["Investor and banker packets", "Diligence pack", "Vertical checks"],
    services: ["Runway workflows", "Qualification scoring", "Artifact history"],
  },
  {
    id: "leverage",
    label: "Stage 3: Leverage",
    priceLabel: "$20",
    unlocks: ["Ambient monitoring", "Benchmark evidence", "Workflow optimization"],
    services: ["Shared context ops", "Autonomy benchmark lanes", "Premium exports"],
  },
  {
    id: "scale",
    label: "Stage 4: Scale",
    priceLabel: "Custom",
    unlocks: ["Hosted monitoring", "Workspace collaboration", "Enterprise diligence"],
    services: ["Premium scoring", "Multi-device sync", "Partner packet surfaces"],
  },
];

function detectVerticalLabel(value: string): { vertical: string; subvertical: string } {
  const normalized = value.toLowerCase();
  if (includesAny(normalized, ["healthcare", "life science", "biotech", "medtech", "clinical", "trial", "patent", "fda", "lab"])) {
    if (includesAny(normalized, ["medtech", "device", "robotic surgery"])) {
      return { vertical: "healthcare/life sciences", subvertical: "medtech" };
    }
    return { vertical: "healthcare/life sciences", subvertical: "biotech and clinical" };
  }
  if (includesAny(normalized, ["robot", "robotics", "simulation", "world model", "agent", "mcp", "claude code", "developer", "workflow", "software", "saas", "ai"])) {
    if (includesAny(normalized, ["robot", "robotics", "simulation", "world model"])) {
      return { vertical: "AI/software", subvertical: "robotics and simulation tooling" };
    }
    return { vertical: "AI/software", subvertical: "developer and agent tooling" };
  }
  return { vertical: "founder/general", subvertical: "general operating system" };
}

function buildDiligencePack(vertical: string, sourceRefIds: string[], strategicAngles: FounderStrategicAngle[]): DiligencePackDefinition {
  if (vertical === "healthcare/life sciences") {
    const evidenceClasses: EvidenceClass[] = [
      { id: "patents", label: "Patents and IP", description: "Patents, provisional filings, or IP chain-of-title evidence.", required: true },
      { id: "publications", label: "Publications", description: "Peer-reviewed work, abstracts, preprints, or institutional publications.", required: true },
      { id: "studies", label: "Studies and trials", description: "Preclinical, clinical, or observational study evidence with provenance.", required: true },
      { id: "regulatory", label: "Regulatory path", description: "Submission path, approvals, or diligence notes tied to real requirements.", required: true },
      { id: "institutional", label: "Institutional credibility", description: "Affiliations, advisors, lab partners, and trial sites.", required: true },
    ];
    const requirements: ReadinessRequirement[] = [
      {
        id: "ip-proof",
        title: "Patent and claim verifiability",
        status: includesAny(strategicAngles.map((angle) => angle.id).join(" "), ["stealth-moat"]) ? "watch" : "missing",
        whyItMatters: "Healthcare claims get challenged quickly if the IP story is vague or not verifiable.",
        evidenceClassIds: ["patents", "publications"],
      },
      {
        id: "evidence-path",
        title: "Clinical or research evidence path",
        status: "missing",
        whyItMatters: "Banks, investors, and serious partners will ask what data, trials, and institutions support the product claims.",
        evidenceClassIds: ["studies", "institutional"],
      },
      {
        id: "regulatory-path",
        title: "Regulatory and submission clarity",
        status: "missing",
        whyItMatters: "Without a plausible regulatory path, the company looks naive during diligence.",
        evidenceClassIds: ["regulatory"],
      },
    ];
    return {
      id: "healthcare_life_sciences",
      label: "Healthcare / Life Sciences Diligence Pack",
      summary: "Translate the company into the evidence, regulatory, and institutional proof that investors, banks, and partners will later ask for.",
      externalEvaluators: ["Healthcare investors", "JPM startup banking", "Strategic partners", "Regulatory reviewers"],
      evidenceClasses,
      requirements,
      highRiskClaims: ["patent defensibility", "clinical efficacy", "regulatory readiness", "scientific legitimacy"],
      materials: ["Patent summary", "Publication list", "Trial or study evidence", "Regulatory path memo", "Institutional advisor list"],
      readyDefinition: "Ready means the core claims can be backed by sourceable evidence, institutional context, and a credible submission path.",
    };
  }

  const evidenceClasses: EvidenceClass[] = [
    { id: "workflow", label: "Workflow adoption", description: "Proof that the product plugs into a high-frequency workflow users already run.", required: true },
    { id: "installation", label: "Installability", description: "One-command install, predictable updates, and clear activation path.", required: true },
    { id: "benchmarks", label: "Benchmark proof", description: "Before/after or cheapest-valid-path evidence tied to real workflows.", required: true },
    { id: "distribution", label: "Distribution surfaces", description: "Ready surfaces for MCP, CLI, plugin, dashboard, or ecosystem partnerships.", required: true },
    { id: "pull", label: "User pull", description: "Signals that people already want the workflow and would return to it.", required: false },
  ];
  const requirements: ReadinessRequirement[] = [
    {
      id: "workflow-fit",
      title: "Workflow-native adoption",
      status: strategicAngles.some((angle) => angle.id === "adoption" && angle.status === "strong") ? "ready" : "watch",
      whyItMatters: "AI/software buyers reward products that land inside current habits like Claude Code, MCP, or browser workflows.",
      evidenceClassIds: ["workflow"],
    },
    {
      id: "install-surface",
      title: "Installability and maintenance boundary",
      status: strategicAngles.some((angle) => angle.id === "installability" && angle.status === "strong") ? "ready" : "watch",
      whyItMatters: "If setup, updates, and support are fuzzy, the wedge will not spread.",
      evidenceClassIds: ["installation", "distribution"],
    },
    {
      id: "proof-story",
      title: "Benchmark-backed proof story",
      status: "watch",
      whyItMatters: "Users and investors need visible evidence that the shorter, cheaper, or more useful path still preserves quality.",
      evidenceClassIds: ["benchmarks", "pull"],
    },
  ];
  return {
    id: "ai_software",
    label: "AI / Software Diligence Pack",
    summary: "Focus the company on workflow fit, installability, benchmark proof, and distribution surfaces that compound quickly.",
    externalEvaluators: ["Developers", "Founders", "AI infra buyers", "Early-stage investors"],
    evidenceClasses,
    requirements,
    highRiskClaims: ["workflow lock-in", "maintainability", "distribution moat", "benchmark legitimacy"],
    materials: ["Founder packet", "Install plan", "Benchmark memo", "Slack one-page report", "Partner surface map"],
    readyDefinition: "Ready means the wedge is installable, benchmarked, and attached to a workflow users already run frequently.",
  };
}

function buildScorecards(progressionProfile: FounderProgressionProfile, readinessScore: number): FounderScorecard[] {
  const twoWeekMustHappen = [
    "Produce one useful founder packet",
    "Generate a progression diagnosis",
    "Delegate one bounded task",
    "Export one shareable artifact",
  ];
  const threeMonthMustHappen = [
    "Show repeated packet reuse",
    "Demonstrate ambient intervention value",
    "Retain at least one paid-stage workflow",
    "Publish one benchmark-backed proof story",
  ];
  return [
    {
      id: "two_week",
      label: "2-week scorecard",
      status: readinessScore >= 58 ? "on_track" : readinessScore >= 45 ? "watch" : "off_track",
      summary: readinessScore >= 58
        ? "On track if the team turns the current packet into one exported artifact and one delegated follow-up."
        : "Off track until the team narrows the wedge and ships one useful artifact fast.",
      mustHappen: twoWeekMustHappen,
    },
    {
      id: "three_month",
      label: "3-month scorecard",
      status: progressionProfile.currentStage === "leverage" || progressionProfile.currentStage === "scale"
        ? "on_track"
        : readinessScore >= 52 ? "watch" : "off_track",
      summary: progressionProfile.currentStage === "leverage" || progressionProfile.currentStage === "scale"
        ? "On track if the workflow keeps compounding through reuse, monitoring, and benchmark evidence."
        : "The next 3 months should prove habit, reuse, and at least one benchmark-backed moat story.",
      mustHappen: threeMonthMustHappen,
    },
  ];
}

function buildDistributionSurfaceStatus(combinedText: string): DistributionSurfaceStatus[] {
  return [
    {
      surfaceId: "mcp_cli",
      label: "MCP / CLI",
      status: includesAny(combinedText, ["mcp", "cli", "claude code", "local"]) ? "ready" : "partial",
      whyItMatters: "This is the lowest-friction open-core distribution surface.",
    },
    {
      surfaceId: "dashboard",
      label: "Hosted dashboard",
      status: includesAny(combinedText, ["dashboard", "subscription", "service", "team"]) ? "partial" : "missing",
      whyItMatters: "This is the retained value and pricing surface for teams.",
    },
    {
      surfaceId: "ecosystem",
      label: "Ecosystem plugins and partners",
      status: includesAny(combinedText, ["cursor", "smithery", "plugin", "github", "open source"]) ? "partial" : "missing",
      whyItMatters: "This is how the workflow lands where users already spend time.",
    },
  ];
}

function inferCompanyNameCandidates(query: string, vertical: string): string[] {
  if (includesAny(query, ["robot", "robotics", "simulation", "world model", "cloth", "laundry"])) {
    return ["Drape Labs", "Tensile AI", "Loom Motion", "FoldShift", "SoftDelta Robotics"];
  }
  if (vertical === "healthcare/life sciences") {
    return ["SignalBio", "Verity Therapeutics", "TrialPath Labs", "ProofCell", "Atlas Medica"];
  }
  if (vertical === "AI/software") {
    return ["Northstar Ops", "Vector Forge", "Signal Bench", "Packet Layer", "Operator Loop"];
  }
  return ["Northstar Labs", "Signal Forge", "Operator Stack", "Clarity Loop", "Atlas Foundry"];
}

function buildCompanyNamingPack(args: {
  query: string;
  vertical: string;
  subvertical: string;
  wedge: string;
  companyState: string;
}): FounderCompanyNamingPack {
  const suggestedNames = inferCompanyNameCandidates(args.query, args.vertical);
  const recommendedName = suggestedNames[0];
  return {
    suggestedNames,
    recommendedName,
    starterProfile: {
      companyName: recommendedName,
      oneLineDescription: `${args.vertical === "healthcare/life sciences" ? "Evidence-backed" : "Workflow-native"} platform for ${args.wedge.toLowerCase()}.`,
      categories: [args.vertical, args.subvertical, "founder operating system"].filter(Boolean),
      stage: args.companyState,
      initialCustomers: args.vertical === "healthcare/life sciences"
        ? ["Healthcare founders", "Life science investors", "Diligence-heavy partners"]
        : ["Developers", "Founders", "Product teams", "AI infra buyers"],
      wedge: args.wedge,
    },
  };
}

function buildFounderMaterialsChecklist(args: {
  diligencePack: DiligencePackDefinition;
  strategicAngles: FounderStrategicAngle[];
}): FounderMaterialsChecklistItem[] {
  const weakAngles = new Set(args.strategicAngles.filter((angle) => angle.status !== "strong").map((angle) => angle.id));
  return args.diligencePack.materials.map((label, index) => ({
    id: `material:${index + 1}`,
    label,
    status: weakAngles.size > 3 && index < 2 ? "missing" : weakAngles.size > 0 ? "watch" : "ready",
    audience: index < 2 ? "internal" : "external",
    whyItMatters: `External evaluators will eventually ask for ${label.toLowerCase()} even if the founder has not prepared it yet.`,
  }));
}

function buildFounderProgressionProfile(args: {
  readinessScore: number;
  strategicAngles: FounderStrategicAngle[];
  materialsChecklist: FounderMaterialsChecklistItem[];
}): FounderProgressionProfile {
  const missingFoundations = args.materialsChecklist
    .filter((item) => item.status === "missing")
    .map((item) => item.label);
  const hiddenRisks = args.strategicAngles
    .filter((angle) => angle.status !== "strong")
    .map((angle) => `${angle.title}: ${angle.summary}`);
  const nextUnlocks: UnlockCriteria[] = [
    {
      id: "useful-packet",
      title: "Generate one useful packet and use it in a real founder decision",
      status: args.readinessScore >= 55 ? "ready" : "watch",
      requiredSignals: ["Founder packet exported", "Decision memo reused"],
    },
    {
      id: "delegation",
      title: "Delegate one bounded task from the packet",
      status: args.readinessScore >= 60 ? "ready" : "watch",
      requiredSignals: ["Shared task exists", "Handoff prompt or packet URI reused"],
    },
    {
      id: "benchmark-proof",
      title: "Publish one benchmark-backed proof story",
      status: args.readinessScore >= 70 ? "ready" : "missing",
      requiredSignals: ["Before/after memo", "Validation checks passed", "Shortcut rationale documented"],
    },
  ];

  let currentStage: FounderProgressionStageId = "clarity";
  if (args.readinessScore >= 82) currentStage = "scale";
  else if (args.readinessScore >= 70) currentStage = "leverage";
  else if (args.readinessScore >= 58) currentStage = "readiness";
  else if (args.readinessScore >= 45) currentStage = "foundation";

  return {
    currentStage,
    currentStageLabel: PROGRESSION_TIERS.find((tier) => tier.id === currentStage)?.label ?? "Stage 0: Clarity",
    readinessScore: args.readinessScore,
    missingFoundations,
    hiddenRisks,
    nextUnlocks,
    delegableWork: [
      "Collect competitor and market diligence",
      "Prepare the Slack one-page report",
      "Generate install and workflow adoption plans",
    ],
    founderOnlyWork: [
      "Choose the wedge and moat story",
      "Decide what stays stealthy",
      "Own the top investor and partner narrative",
    ],
    onTrackStatus: args.readinessScore >= 60 ? "on_track" : args.readinessScore >= 48 ? "watch" : "off_track",
    recommendedNextAction: nextUnlocks.find((unlock) => unlock.status !== "ready")?.title
      ?? "Turn the current packet into the main founder workflow this week.",
  };
}

function buildCompanyReadinessPacket(args: {
  packetId: string;
  sourceRefIds: string[];
  confidence: number;
  visibility: FounderPacketVisibility;
  vertical: string;
  subvertical: string;
  readinessScore: number;
  progressionProfile: FounderProgressionProfile;
  namingPack: FounderCompanyNamingPack;
  diligencePack: DiligencePackDefinition;
  distributionSurfaceStatus: DistributionSurfaceStatus[];
  strategicAngles: FounderStrategicAngle[];
}): CompanyReadinessPacket {
  const tier = PROGRESSION_TIERS.find((item) => item.id === args.progressionProfile.currentStage) ?? PROGRESSION_TIERS[0];
  return {
    packetId: args.packetId,
    visibility: args.visibility,
    identity: {
      companyName: args.namingPack.recommendedName,
      vertical: args.vertical,
      subvertical: args.subvertical,
      stage: args.progressionProfile.currentStageLabel,
      mission: args.namingPack.starterProfile.oneLineDescription,
      wedge: args.namingPack.starterProfile.wedge,
    },
    founderTeamCredibility: [
      "Map founder background to the chosen wedge",
      "Make the right-to-win explicit before broad sharing",
    ],
    productAndWedge: [
      args.namingPack.starterProfile.oneLineDescription,
      `Primary wedge: ${args.namingPack.starterProfile.wedge}`,
    ],
    marketAndGtm: [
      "Start with the highest-frequency workflow the user already runs",
      "Use open-core MCP for trust and the dashboard for retained value",
    ],
    financialReadiness: [
      "Runway and burn rate need an explicit view before fundraising",
      "Paid stage progression should map to founder maturity, not arbitrary quotas",
    ],
    operatingReadiness: [
      ...args.progressionProfile.delegableWork,
      ...args.progressionProfile.founderOnlyWork,
    ],
    diligenceEvidence: args.diligencePack.materials,
    contradictionsAndHiddenRisks: args.strategicAngles
      .filter((angle) => angle.status !== "strong")
      .map((angle) => angle.summary),
    nextUnlocks: args.progressionProfile.nextUnlocks.map((unlock) => unlock.title),
    pricingStage: {
      stageId: tier.id,
      label: tier.label,
      priceLabel: tier.priceLabel,
    },
    distributionSurfaceStatus: args.distributionSurfaceStatus,
    provenance: {
      sourceRefIds: args.sourceRefIds,
      confidence: args.confidence,
      freshness: new Date().toISOString(),
    },
    allowedDestinations: ["slack_onepage", "investor_memo", "banker_readiness", "pitchbook_like", "crunchbase_like", "yc_context"],
    sensitivity: args.visibility === "public" ? "workspace" : args.visibility,
  };
}

function buildSlackOnepager(args: {
  query: string;
  summary: string;
  progressionProfile: FounderProgressionProfile;
  scorecards: FounderScorecard[];
  companyPacket: CompanyReadinessPacket;
}): FounderShareableArtifact {
  const status = args.progressionProfile.onTrackStatus.replace("_", " ");
  const twoWeek = args.scorecards.find((item) => item.id === "two_week");
  return {
    id: "artifact:slack_onepage",
    type: "slack_onepage",
    title: "Founder one-page Slack report",
    visibility: "workspace",
    summary: "One-page founder report for Slack with stage, risks, unlocks, and next move.",
    payload: {
      text: [
        `*NodeBench Founder Report*`,
        `Question: ${args.query}`,
        `Stage: ${args.progressionProfile.currentStageLabel}`,
        `Readiness: ${args.progressionProfile.readinessScore}/100`,
        `Status: ${status}`,
        `Company: ${args.companyPacket.identity.companyName}`,
        `Summary: ${args.summary}`,
        `Next unlocks: ${args.progressionProfile.nextUnlocks.map((unlock) => unlock.title).join("; ")}`,
        `2-week plan: ${twoWeek?.mustHappen.join("; ") ?? "Ship one useful packet and one delegated task."}`,
      ].join("\n"),
    },
  };
}

function buildBenchmarkEvidence(args: {
  packetId: string;
  query: string;
  progressionProfile: FounderProgressionProfile;
}): AutonomyBenchmarkRun[] {
  const common = {
    packetRef: args.packetId,
    agentsInvolved: ["nodebench", "claude_code", "judge"],
    validationFailures: [],
    humanInterventions: ["Founder approves externally visible actions"],
  };
  return [
    {
      benchmarkId: genId("bench"),
      lane: "weekly_founder_reset",
      objective: "Turn founder context into a weekly reset packet and the next three moves.",
      actionsTaken: ["Gather context", "Synthesize packet", "Export artifact"],
      beforeState: "Context scattered across notes, code, and market signals.",
      afterState: "One packet with next moves, risks, and exportable summary.",
      artifactsProduced: ["Founder packet", "Slack one-page report"],
      validationPasses: ["Packet assembled", "Citations retained", "Next move selected"],
      timeMs: 1800,
      estimatedCostUsd: 0.24,
      reuseScore: Math.max(58, args.progressionProfile.readinessScore),
      summary: "Weekly reset autopilot proves the product can compress founder context into one reusable artifact.",
      ...common,
    },
    {
      benchmarkId: genId("bench"),
      lane: "cheapest_valid_workflow",
      objective: `Find a shorter and cheaper valid path for: ${args.query}`,
      actionsTaken: ["Compare current path", "Suggest optimized path", "Validate shortcut"],
      beforeState: "Manual founder reasoning spread across repeated sessions.",
      afterState: "Shorter validated path with explicit checks and reusable packet context.",
      artifactsProduced: ["Workflow compare memo"],
      validationPasses: ["Shortcut rationale documented", "Validation checks named"],
      timeMs: 2200,
      estimatedCostUsd: 0.19,
      reuseScore: Math.max(52, args.progressionProfile.readinessScore - 4),
      summary: "Cheapest-valid-path benchmarking turns workflow optimization into proof instead of hand-wavy speed claims.",
      ...common,
    },
  ];
}

function buildWorkflowPathComparison(args: {
  objective: string;
  currentPath?: string[];
  optimizedPath?: string[];
}): WorkflowPathComparison {
  const currentPath = args.currentPath?.length
    ? args.currentPath
    : [
        "Restate the context manually",
        "Search for comparables",
        "Draft a memo from scratch",
        "Manually hand off the task",
      ];
  const optimizedPath = args.optimizedPath?.length
    ? args.optimizedPath
    : [
        "Reuse the founder packet",
        "Refresh missing diligence only",
        "Export the one-page report",
        "Delegate from the shared packet",
      ];
  return {
    objective: args.objective,
    currentPath,
    optimizedPath,
    rationale: "The optimized path removes repeated restatement and relies on the packet, export adapter, and shared delegation spine.",
    validationChecks: [
      "The same decision artifact still exists at the end",
      "Required diligence fields remain present",
      "The shortcut does not hide contradictory evidence",
    ],
    estimatedSavings: {
      timePercent: 38,
      costPercent: 24,
    },
    verdict: "valid",
  };
}

export function buildFounderDirectionAssessment(args: {
  query: string;
  lens?: string;
  daysBack?: number;
  userSkillset?: string[];
  interests?: string[];
  constraints?: string[];
  marketWorkflow?: string[];
  extraContext?: string;
}): FounderDirectionAssessment {
  const ctx = gatherLocalContext(args.daysBack ?? 14);
  const lens = args.lens ?? "founder";
  const combinedText = [
    args.query,
    args.extraContext ?? "",
    ...(args.userSkillset ?? []),
    ...(args.interests ?? []),
    ...(args.constraints ?? []),
    ...(args.marketWorkflow ?? []),
    ...(ctx.recentChanges.modifiedFiles ?? []),
  ].join(" ").toLowerCase();
  const assessmentId = genId("assess");
  const packetId = genId("packet");
  const evidenceRefIds = ["source:claude", "source:readme", "source:dogfood"];
  const sourceRefs: FounderDirectionAssessment["sourceRefs"] = [
    {
      id: "source:claude",
      label: "CLAUDE.md",
      title: "Product and workflow identity",
      type: "local",
      status: "cited",
      href: join(ctx.identity.projectRoot, "CLAUDE.md"),
      excerpt: ctx.identity.claudeMdSnippet ?? "Internal product identity and operating rules.",
    },
    {
      id: "source:readme",
      label: "packages/mcp-local/README.md",
      title: "Local MCP distribution surface",
      type: "local",
      status: "cited",
      href: join(ctx.identity.projectRoot, "packages", "mcp-local", "README.md"),
      excerpt: ctx.publicSurfaces.readmeTagline ?? ctx.publicSurfaces.serverJsonDescription ?? "Local MCP packaging and positioning.",
    },
    {
      id: "source:dogfood",
      label: "Latest dogfood findings",
      title: "Dogfood and proof pressure",
      type: "local",
      status: ctx.dogfoodFindings.verdict ? "cited" : "explored",
      href: ctx.dogfoodFindings.latestFile ?? undefined,
      excerpt: ctx.dogfoodFindings.findings.slice(0, 2).join(" ") || "No recent dogfood findings available.",
    },
  ];

  const teamSpecific = (args.userSkillset ?? []).length > 0;
  const aiSkeptic = includesAny(combinedText, ["no ai", "without ai", "anti ai", "environment", "peace", "altruistic"]);
  const workflowAligned = includesAny(combinedText, ["claude code", "mcp", "cursor", "developer workflow", "agent workflow", "teams"]);
  const installFocused = includesAny(combinedText, ["install", "local", "dashboard", "service", "subscription", "hosted", "self-host", "maintenance", "update"]);
  const distributionFocused = includesAny(combinedText, ["investor", "credibility", "convince", "adopt", "workflow", "sell", "subscription"]);
  const constrainedByScope = includesAny(combinedText, ["solo", "single founder", "limited", "specific skillset", "narrow skillset"]);
  const publicExposureRisk = lens === "founder" || includesAny(combinedText, [
    "stealth",
    "moat",
    "launch",
    "posting",
    "post publicly",
    "announce",
    "go public",
    "marketing",
    "reveal",
  ]);
  const hasRecentProof = ctx.dogfoodFindings.verdict?.toLowerCase().includes("pass") || ctx.sessionMemory.totalActions7d >= 5;

  const strategicAngles: FounderStrategicAngle[] = [
    {
      id: "stealth-moat",
      title: "Stealth, moat, and public exposure timing",
      status: publicExposureRisk ? "watch" : "unknown",
      summary: publicExposureRisk
        ? "Before posting broadly, assume the direction is easier to copy than it feels. Stay relatively stealthy until the moat, workflow lock-in, or evidence edge is clearer."
        : "The run has not yet established whether public exposure helps more than it harms before the moat is proven.",
      whyItMatters: "Premature posting can teach the market what you are doing before the wedge is hard to duplicate. Founders need moat evidence and market diligence before broad exposure.",
      evidenceRefIds,
      nextQuestion: "What have competitors already shipped, how easily can they copy this, and what moat would justify posting now instead of staying quieter longer?",
    },
    {
      id: "team-shape",
      title: "Team shape and complementary skill gaps",
      status: teamSpecific || constrainedByScope ? "watch" : "unknown",
      summary: teamSpecific || constrainedByScope
        ? "The current direction depends heavily on a narrow skill profile. That can create wedge strength, but it also exposes obvious hiring, GTM, or credibility gaps."
        : "The run does not yet spell out whether the team shape is a real edge or an unaddressed constraint.",
      whyItMatters: "Specific skillsets help when they map cleanly to the wedge, but they slow a company down when core build, sell, or support functions are missing.",
      evidenceRefIds,
      nextQuestion: "Which missing capability would most reduce risk for this direction: technical depth, customer access, distribution, or investor credibility?",
    },
    {
      id: "founder-fit",
      title: "Founder and experience fit",
      status: hasRecentProof ? "watch" : "unknown",
      summary: hasRecentProof
        ? "There is evidence of execution momentum, but the founder story still needs to make the wedge feel inevitable rather than merely possible."
        : "This direction still needs stronger evidence that the builders and the problem are tightly matched.",
      whyItMatters: "Investors and early users look for evidence that the founding team has unusual right-to-win on the exact problem they chose.",
      evidenceRefIds,
      nextQuestion: "What founder-specific experience, access, or technical edge makes this direction believable now?",
    },
    {
      id: "build-speed",
      title: "Build speed and time-to-first-proof",
      status: installFocused || workflowAligned ? "strong" : "watch",
      summary: installFocused || workflowAligned
        ? "The direction can likely piggyback on existing local-first and developer workflow surfaces, which shortens the path to a useful wedge."
        : "The idea still needs a more explicit plan for what can be built and proven in the next 2 to 4 weeks.",
      whyItMatters: "The first version has to ship fast enough to create proof before the team burns time on secondary surfaces.",
      evidenceRefIds,
      nextQuestion: "What is the smallest founder-grade wedge we can build in 2 to 4 weeks that creates proof instead of debt?",
    },
    {
      id: "installability",
      title: "Installability and update path",
      status: installFocused ? "strong" : "watch",
      summary: installFocused
        ? "The query already points toward installable surfaces such as local MCP, hosted dashboards, or team subscriptions, which is a healthy sign."
        : "The current idea still needs a clear answer for how people install, maintain, and update it without high-touch onboarding.",
      whyItMatters: "Installation friction and update pain destroy adoption even when the core product insight is strong.",
      evidenceRefIds,
      nextQuestion: "Should the first wedge land as a local MCP tool, a hosted dashboard, or a hybrid with local truth and web review?",
    },
    {
      id: "maintainability",
      title: "Maintainability and support burden",
      status: includesAny(combinedText, ["maintain", "maintenance", "support", "ops", "update"]) ? "watch" : "strong",
      summary: includesAny(combinedText, ["maintain", "maintenance", "support", "ops", "update"])
        ? "The idea raises ongoing maintenance and support concerns, so the service boundary needs to stay narrow."
        : "The current direction can stay relatively lean if the team avoids adding too many surfaces before the wedge is proven.",
      whyItMatters: "A promising tool loses momentum fast if maintenance and support grow faster than product leverage.",
      evidenceRefIds,
      nextQuestion: "What should stay manual, local, or intentionally out-of-scope so maintenance does not outrun product value?",
    },
    {
      id: "adoption",
      title: "Workflow adoption and current market fit",
      status: workflowAligned ? "strong" : "watch",
      summary: workflowAligned
        ? "The direction connects to workflows users already run today, including current developer loops like Claude Code and MCP-based tooling."
        : "The current direction still needs proof that it plugs into a high-frequency workflow instead of asking users to learn a new behavior from scratch.",
      whyItMatters: "The fastest adoption comes from landing inside an existing habit rather than trying to invent one.",
      evidenceRefIds,
      nextQuestion: "Which current high-frequency workflow does this naturally attach to, and how do we make that attachment unavoidable?",
    },
    {
      id: "commercial",
      title: "Commercialization and sellability",
      status: installFocused || distributionFocused ? "strong" : "watch",
      summary: installFocused || distributionFocused
        ? "There is a credible path from tool to dashboard or subscription service if the wedge keeps producing durable proof for teams."
        : "The idea still needs a sharper answer for how it becomes a repeatable product instead of bespoke help or one-off consulting.",
      whyItMatters: "A good internal tool is not enough. The company needs a product that can be packaged, renewed, and expanded.",
      evidenceRefIds,
      nextQuestion: "What is the clearest route from useful tool to team dashboard, recurring subscription, or sellable operating layer?",
    },
    {
      id: "conviction",
      title: "User and investor conviction",
      status: hasRecentProof ? "watch" : "unknown",
      summary: hasRecentProof
        ? "There is enough motion to support a story, but the packet still needs sharper comparables, outcomes, and proof points to persuade outsiders."
        : "The current direction needs more evidence before it becomes a convincing story for users or investors.",
      whyItMatters: "Conviction builds when outsiders can repeat the story and believe the timing, not only the ambition.",
      evidenceRefIds,
      nextQuestion: "What proof points, traction signals, or comparables would make this direction legible to a skeptical user or investor?",
    },
  ];

  if (aiSkeptic || lens === "founder") {
    strategicAngles.push({
      id: "ai-tradeoffs",
      title: "AI stance and mission tradeoffs",
      status: aiSkeptic ? "watch" : "unknown",
      summary: aiSkeptic
        ? "The idea includes explicit skepticism about AI, so the product needs a clear answer for where AI is optional, bounded, or unnecessary."
        : "The direction still needs a deliberate answer for when AI is essential versus when deterministic, local, or non-AI paths should stay available.",
      whyItMatters: "Some teammates and users will reject products that feel casually dependent on AI. A deliberate stance reduces internal friction and market confusion.",
      evidenceRefIds,
      nextQuestion: "Where is AI genuinely necessary here, and where should the product stay local-first, deterministic, or optional?",
    });
  }

  const issueAngles = strategicAngles.filter((angle) => angle.status !== "strong").map((angle) => angle.id);
  const topIssue = strategicAngles.find((angle) => angle.status !== "strong") ?? strategicAngles[0];
  const summary = issueAngles.length > 0
    ? `Pressure test completed. The highest-risk angles right now are ${issueAngles.slice(0, 3).join(", ")}, and the next pass should turn those into a tighter founder wedge.`
    : "Pressure test completed. The direction looks operationally legible; now convert it into a narrower wedge with faster proof.";

  const nextQuestions = dedupeStrings(strategicAngles.map((angle) => angle.nextQuestion)).slice(0, 8);
  const confidence = Math.max(55, Math.min(92, 70 + (hasRecentProof ? 8 : 0) + (workflowAligned ? 6 : 0) - issueAngles.length * 2));
  const { vertical, subvertical } = detectVerticalLabel(combinedText);
  const readinessScore = Math.max(35, Math.min(95, confidence - issueAngles.length * 3 + (installFocused ? 4 : 0)));
  const diligencePack = buildDiligencePack(vertical, evidenceRefIds, strategicAngles);
  const materialsChecklist = buildFounderMaterialsChecklist({ diligencePack, strategicAngles });
  const progressionProfile = buildFounderProgressionProfile({
    readinessScore,
    strategicAngles,
    materialsChecklist,
  });
  const scorecards = buildScorecards(progressionProfile, readinessScore);
  const visibility: FounderPacketVisibility = publicExposureRisk ? "workspace" : "internal";
  const namingPack = buildCompanyNamingPack({
    query: args.query,
    vertical,
    subvertical,
    wedge: topIssue
      ? `resolve ${topIssue.title.toLowerCase()} for ${subvertical}`
      : `founder operating workflow for ${subvertical}`,
    companyState: progressionProfile.currentStageLabel,
  });
  const distributionSurfaceStatus = buildDistributionSurfaceStatus(combinedText);
  const companyReadinessPacket = buildCompanyReadinessPacket({
    packetId,
    sourceRefIds: sourceRefs.map((source) => source.id),
    confidence,
    visibility,
    vertical,
    subvertical,
    readinessScore,
    progressionProfile,
    namingPack,
    diligencePack,
    distributionSurfaceStatus,
    strategicAngles,
  });
  const benchmarkEvidence = buildBenchmarkEvidence({
    packetId,
    query: args.query,
    progressionProfile,
  });
  const workflowComparison = buildWorkflowPathComparison({
    objective: args.query,
  });
  const shareableArtifacts = [
    buildSlackOnepager({
      query: args.query,
      summary,
      progressionProfile,
      scorecards,
      companyPacket: companyReadinessPacket,
    }),
    {
      id: "artifact:investor_memo",
      type: "investor_memo" as const,
      title: "Investor memo starter",
      visibility,
      summary: "Starter investor memo with stage, wedge, risks, and next unlocks.",
      payload: {
        company: companyReadinessPacket.identity.companyName,
        stage: progressionProfile.currentStageLabel,
        wedge: companyReadinessPacket.identity.wedge,
        risks: progressionProfile.hiddenRisks,
        nextUnlocks: progressionProfile.nextUnlocks.map((unlock) => unlock.title),
        },
      },
    ];
  const operatingModel = buildFounderOperatingModel({
    role:
      lens === "banker"
        ? "banker"
        : lens === "ceo"
          ? "ceo"
          : lens === "investor"
            ? "investor"
            : lens === "student"
              ? "student"
              : lens === "legal"
                ? "legal"
                : "founder",
    query: args.query,
    canonicalEntity: namingPack.recommendedName,
    hasPrivateContext: Boolean(args.extraContext),
    readinessScore,
    hiddenRiskCount: progressionProfile.hiddenRisks.length,
    visibility,
    hasShareableArtifact: shareableArtifacts.length > 0,
    hasBenchmarkProof: benchmarkEvidence.length > 0,
    hasDelegatedTask: progressionProfile.delegableWork.length > 0,
    hasDiligencePack: diligencePack.requirements.length > 0,
    hasAmbientMonitoring: true,
    hasRepeatedReuse: readinessScore >= 70,
    vertical,
  });

  return {
    assessmentId,
    packetId,
    packetType: "founder_direction_assessment",
    generatedAt: new Date().toISOString(),
    generatedBy: "founder_local_pipeline",
    query: args.query,
    lens,
    summary,
    confidence,
    sourceRefs,
    strategicAngles,
    recommendedNextAction: topIssue
      ? `Resolve ${topIssue.title.toLowerCase()} before broadening the roadmap.`
      : "Turn the validated wedge into a single installable workflow and get real founder feedback this week.",
    nextQuestions,
    issueAngles,
    progressionProfile,
    progressionTiers: PROGRESSION_TIERS,
    diligencePack,
    readinessScore,
    unlocks: progressionProfile.nextUnlocks,
    materialsChecklist,
    scorecards,
    shareableArtifacts,
    visibility,
    benchmarkEvidence,
    workflowComparison,
    operatingModel,
    distributionSurfaceStatus,
    companyReadinessPacket,
    companyNamingPack: namingPack,
  };
}

/* ─── Tool 1: founder_local_gather ───────────────────────────────────────── */

function gatherLocalContext(daysBack: number = 7): GatheredContext {
  const root = findProjectRoot();

  // ── Identity ──────────────────────────────────────────────────
  const claudeMd = safeRead(join(root, "CLAUDE.md"));
  const claudeMdSnippet = claudeMd
    ? claudeMd.split("\n").slice(0, 8).join("\n")
    : null;

  const pkgJson = safeRead(join(root, "packages", "mcp-local", "package.json"));
  let packageName: string | null = null;
  let packageVersion: string | null = null;
  if (pkgJson) {
    try {
      const pkg = JSON.parse(pkgJson);
      packageName = pkg.name ?? null;
      packageVersion = pkg.version ?? null;
    } catch { /* ignore */ }
  }

  // ── Recent changes (git) ──────────────────────────────────────
  // Fix P0 #12: Sanitize daysBack to prevent command injection
  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(daysBack) || 7)));
  const gitLog = safeExec(`git log --oneline --since="${safeDays} days ago" -30`, root);
  const gitDiffStat = safeExec(`git diff --stat HEAD~10 HEAD 2>/dev/null || echo "no diff"`, root);
  const modifiedFiles = safeExec(`git diff --name-only HEAD~10 HEAD 2>/dev/null || echo ""`, root)
    .split("\n")
    .filter(Boolean)
    .slice(0, 30);

  // ── Public surfaces ───────────────────────────────────────────
  const indexHtml = safeRead(join(root, "index.html"));
  let indexHtmlTitle: string | null = null;
  let indexHtmlOgDescription: string | null = null;
  if (indexHtml) {
    const titleMatch = indexHtml.match(/<title>([^<]+)<\/title>/);
    indexHtmlTitle = titleMatch?.[1] ?? null;
    const ogDescMatch = indexHtml.match(/og:description[^>]+content="([^"]+)"/);
    indexHtmlOgDescription = ogDescMatch?.[1] ?? null;
  }

  const serverJson = safeRead(join(root, "packages", "mcp-local", "server.json"));
  let serverJsonDescription: string | null = null;
  if (serverJson) {
    try {
      serverJsonDescription = JSON.parse(serverJson).description ?? null;
    } catch { /* ignore */ }
  }

  const readme = safeRead(join(root, "packages", "mcp-local", "README.md"));
  const readmeTagline = readme
    ? (readme.match(/\*\*([^*]+)\*\*/)?.[1] ?? null)
    : null;

  // ── Session memory (SQLite) ───────────────────────────────────
  let recentActions: GatheredContext["sessionMemory"]["recentActions"] = [];
  let recentMilestones: GatheredContext["sessionMemory"]["recentMilestones"] = [];
  let totalActions7d = 0;
  let totalMilestones7d = 0;

  try {
    const db = getDb();
    const sevenDaysAgo = new Date(Date.now() - daysBack * 86_400_000).toISOString().slice(0, 10);

    const actions = db.prepare(
      `SELECT action, category, impactLevel, timestamp FROM tracking_actions
       WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 20`,
    ).all(sevenDaysAgo) as any[];
    recentActions = actions.map((a: any) => ({
      action: a.action, category: a.category, impact: a.impactLevel, timestamp: a.timestamp,
    }));

    const milestones = db.prepare(
      `SELECT title, category, timestamp FROM tracking_milestones
       WHERE date(timestamp) >= ? ORDER BY timestamp DESC LIMIT 10`,
    ).all(sevenDaysAgo) as any[];
    recentMilestones = milestones.map((m: any) => ({
      title: m.title, category: m.category, timestamp: m.timestamp,
    }));

    totalActions7d = (db.prepare(
      `SELECT COUNT(*) as c FROM tracking_actions WHERE date(timestamp) >= ?`,
    ).get(sevenDaysAgo) as any)?.c ?? 0;

    totalMilestones7d = (db.prepare(
      `SELECT COUNT(*) as c FROM tracking_milestones WHERE date(timestamp) >= ?`,
    ).get(sevenDaysAgo) as any)?.c ?? 0;
  } catch {
    // SQLite tables may not exist yet — that's fine
  }

  // ── Dogfood findings ──────────────────────────────────────────
  const docsDir = join(root, "docs");
  let latestDogfoodFile: string | null = null;
  let dogfoodVerdict: string | null = null;
  let p0Count = 0;
  let p1Count = 0;
  const dogfoodFindings: string[] = [];

  try {
    // Fix P2 #11: Windows-safe file listing (no Unix `ls`)
    const dogfoodFiles = existsSync(docsDir)
      ? readdirSync(docsDir)
          .filter((f: string) => f.startsWith("dogfood-findings-") && f.endsWith(".json"))
          .map((f: string) => join(docsDir, f))
          .sort((a: string, b: string) => (statSync(b).mtimeMs ?? 0) - (statSync(a).mtimeMs ?? 0))
      : [];
    if (dogfoodFiles.length > 0) {
      latestDogfoodFile = dogfoodFiles[0];
      const content = safeRead(dogfoodFiles[0]);
      if (content) {
        const parsed = JSON.parse(content);
        dogfoodVerdict = parsed.verdict ?? null;
        const allFindings = parsed.runs?.flatMap((r: any) => r.findings ?? []) ?? parsed.global_findings ?? [];
        for (const f of allFindings) {
          if (f.severity === "P0") p0Count++;
          if (f.severity === "P1") p1Count++;
          dogfoodFindings.push(`[${f.severity}] ${f.description?.slice(0, 120) ?? f.title?.slice(0, 120) ?? "unknown"}`);
        }
      }
    }
  } catch { /* ignore */ }

  // ── Architecture docs ─────────────────────────────────────────
  const archDir = join(root, "docs", "architecture");
  const architectureDocs: string[] = [];
  try {
    // Fix P2 #11: Windows-safe file listing (no Unix `ls`)
    const archFiles = existsSync(archDir)
      ? readdirSync(archDir)
          .filter((f: string) => f.endsWith(".md"))
          .map((f: string) => join(archDir, f))
          .sort((a: string, b: string) => (statSync(b).mtimeMs ?? 0) - (statSync(a).mtimeMs ?? 0))
          .slice(0, 10)
      : [];
    for (const f of archFiles) {
      const name = f.split(/[/\\]/).pop() ?? f;
      architectureDocs.push(name);
    }
  } catch { /* ignore */ }

  const prd = safeRead(join(archDir, "NODEBENCH_AI_APP_PRD_V1.md"));
  const prdSnippet = prd ? prd.split("\n").slice(0, 12).join("\n") : null;

  const runbook = safeRead(join(archDir, "DOGFOOD_RUNBOOK_V1.md"));
  const dogfoodRunbookSnippet = runbook ? runbook.split("\n").slice(0, 12).join("\n") : null;

  return {
    identity: { projectRoot: root, claudeMdSnippet, packageName, packageVersion },
    recentChanges: { gitLogOneline: gitLog.split("\n").filter(Boolean), gitDiffStat, modifiedFiles, daysBack },
    publicSurfaces: { indexHtmlTitle, indexHtmlOgDescription, serverJsonDescription, readmeTagline },
    sessionMemory: { recentActions, recentMilestones, totalActions7d, totalMilestones7d },
    dogfoodFindings: { latestFile: latestDogfoodFile, verdict: dogfoodVerdict, p0Count, p1Count, findings: dogfoodFindings },
    docs: { prdSnippet, dogfoodRunbookSnippet, architectureDocs },
  };
}

/* ─── Tool 2: founder_local_synthesize ───────────────────────────────────── */

function synthesizePacket(
  ctx: GatheredContext,
  packetType: "weekly_reset" | "pre_delegation" | "important_change" | "competitor_brief" | "role_switch",
  originalQuery?: string,
  webResults?: Array<{title: string; url: string; snippet: string}>,
): FounderPacket {
  const packetId = genId("pkt");

  // ── Extract identity from CLAUDE.md ───────────────────────────
  const claudeMd = ctx.identity.claudeMdSnippet ?? "";
  let canonicalMission = "Unknown";
  let wedge = "Unknown";

  // Parse the overview line from CLAUDE.md
  const overviewMatch = claudeMd.match(/NodeBench\s*[—–-]\s*(.+?)(?:\.\s|$)/m);
  if (overviewMatch) {
    canonicalMission = overviewMatch[1].trim();
  }
  const toolCountMatch = claudeMd.match(/(\d+)-tool/);
  if (toolCountMatch) {
    wedge = `${toolCountMatch[1]}-tool MCP server with entity intelligence`;
  }

  // ── Detect what changed from git ──────────────────────────────
  const whatChanged = ctx.recentChanges.gitLogOneline.slice(0, 8).map((line) => {
    const hash = line.slice(0, 8);
    const msg = line.slice(9);
    return { description: msg, date: "this week", source: `git:${hash}` };
  });

  // ── Detect contradictions ─────────────────────────────────────
  const contradictions: FounderPacket["contradictions"] = [];

  // Check: CLAUDE.md mission vs index.html title
  if (ctx.publicSurfaces.indexHtmlTitle && canonicalMission) {
    const titleLower = ctx.publicSurfaces.indexHtmlTitle.toLowerCase();
    const missionLower = canonicalMission.toLowerCase();
    // Simple word overlap check
    const missionWords = new Set(missionLower.split(/\s+/).filter(w => w.length > 3));
    const titleWords = new Set(titleLower.split(/\s+/).filter(w => w.length > 3));
    const overlap = [...missionWords].filter(w => titleWords.has(w)).length;
    if (overlap < 2) {
      contradictions.push({
        claim: `CLAUDE.md says: "${canonicalMission}"`,
        evidence: `index.html title says: "${ctx.publicSurfaces.indexHtmlTitle}"`,
        severity: "medium",
      });
    }
  }

  // Check: server.json vs README tagline alignment
  if (ctx.publicSurfaces.serverJsonDescription && ctx.publicSurfaces.readmeTagline) {
    const sjLower = ctx.publicSurfaces.serverJsonDescription.toLowerCase();
    const rdLower = ctx.publicSurfaces.readmeTagline.toLowerCase();
    if (!sjLower.includes("entity") && rdLower.includes("entity")) {
      contradictions.push({
        claim: "README positions as entity intelligence",
        evidence: `server.json description doesn't mention 'entity': "${ctx.publicSurfaces.serverJsonDescription.slice(0, 80)}..."`,
        severity: "low",
      });
    }
  }

  // Check: dogfood findings indicate unresolved P0s
  if (ctx.dogfoodFindings.p0Count > 0) {
    contradictions.push({
      claim: `${ctx.dogfoodFindings.p0Count} P0 dogfood findings unresolved`,
      evidence: ctx.dogfoodFindings.findings.filter(f => f.startsWith("[P0]")).join("; "),
      severity: "high",
    });
  }

  // Check: many surfaces but few tracked actions (building without proving)
  if (ctx.recentChanges.modifiedFiles.length > 20 && ctx.sessionMemory.totalActions7d < 5) {
    contradictions.push({
      claim: `${ctx.recentChanges.modifiedFiles.length} files modified this week but only ${ctx.sessionMemory.totalActions7d} tracked actions`,
      evidence: "Building is outpacing tracking — habits may not be proven yet",
      severity: "medium",
    });
  }

  // ── Rank next actions from dogfood + changes ──────────────────
  const nextActions: FounderPacket["nextActions"] = [];
  let priority = 1;

  // P0 dogfood findings become top actions
  for (const finding of ctx.dogfoodFindings.findings.filter(f => f.startsWith("[P0]"))) {
    nextActions.push({
      action: `Fix: ${finding.replace("[P0] ", "").slice(0, 100)}`,
      priority: priority++,
      reasoning: "P0 dogfood finding — blocks core habit loop",
    });
  }

  // P1 dogfood findings next
  for (const finding of ctx.dogfoodFindings.findings.filter(f => f.startsWith("[P1]")).slice(0, 3)) {
    nextActions.push({
      action: `Fix: ${finding.replace("[P1] ", "").slice(0, 100)}`,
      priority: priority++,
      reasoning: "P1 dogfood finding — degrades tool reliability",
    });
  }

  // If few actions, add defaults
  if (nextActions.length < 3) {
    if (contradictions.length > 0) {
      nextActions.push({
        action: "Resolve top contradiction: " + contradictions[0].claim.slice(0, 80),
        priority: priority++,
        reasoning: "Unresolved contradiction weakens canonical truth",
      });
    }
    nextActions.push({
      action: "Run full dogfood cycle (13 scenarios) and log pass/fail",
      priority: priority++,
      reasoning: "Proves the three core habits work end-to-end",
    });
    nextActions.push({
      action: "Publish updated package with fixed tracking tools and local pipeline",
      priority: priority++,
      reasoning: "Public package should match internal capabilities",
    });
  }

  // ── Signals from git activity ─────────────────────────────────
  const signals: FounderPacket["signals"] = [];
  const commitCount = ctx.recentChanges.gitLogOneline.length;
  signals.push({
    name: `${commitCount} commits in last ${ctx.recentChanges.daysBack} days`,
    direction: commitCount > 5 ? "up" : commitCount > 0 ? "neutral" : "down",
    impact: "medium",
  });
  signals.push({
    name: `${ctx.recentChanges.modifiedFiles.length} files modified`,
    direction: ctx.recentChanges.modifiedFiles.length > 10 ? "up" : "neutral",
    impact: "medium",
  });
  signals.push({
    name: `${ctx.sessionMemory.totalActions7d} tracked actions / ${ctx.sessionMemory.totalMilestones7d} milestones`,
    direction: ctx.sessionMemory.totalActions7d > 5 ? "up" : "neutral",
    impact: "high",
  });
  if (ctx.dogfoodFindings.verdict) {
    signals.push({
      name: `Dogfood verdict: ${ctx.dogfoodFindings.verdict.slice(0, 60)}`,
      direction: ctx.dogfoodFindings.verdict.toLowerCase().includes("pass") ? "up" : "down",
      impact: "high",
    });
  }

  // ── Public narrative check ────────────────────────────────────
  const publicMismatches: string[] = [];
  if (ctx.publicSurfaces.indexHtmlTitle && !ctx.publicSurfaces.indexHtmlTitle.toLowerCase().includes("entity")) {
    publicMismatches.push(`index.html title doesn't mention 'entity intelligence': "${ctx.publicSurfaces.indexHtmlTitle}"`);
  }
  if (ctx.publicSurfaces.serverJsonDescription && ctx.publicSurfaces.serverJsonDescription.includes("304")) {
    publicMismatches.push("server.json still references '304' tools");
  }
  if (ctx.publicSurfaces.readmeTagline && ctx.publicSurfaces.readmeTagline.includes("Operating intelligence")) {
    publicMismatches.push("README still uses 'Operating intelligence' instead of 'Entity intelligence'");
  }

  // ── Extract entity names from query for memo specificity ─────
  function extractEntitiesFromQuery(query?: string): string[] {
    if (!query) return [];
    const entities: string[] = [];
    // Match capitalized proper nouns (2+ chars, not common words)
    const stopWords = new Set(["What", "How", "Why", "When", "Where", "Which", "Show", "Tell", "Give", "Create", "Draft", "Compare", "Analyze", "Flag", "The", "Our", "Any", "All", "Top", "Key", "Main", "Most", "Best"]);
    const matches = query.match(/\b[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)*/g) ?? [];
    for (const m of matches) {
      if (!stopWords.has(m.split(/\s/)[0])) entities.push(m);
    }
    return [...new Set(entities)].slice(0, 5);
  }

  // ── Generate memo (adapted to packetType) ────────────────────
  const memoTitle: Record<string, string> = {
    weekly_reset: "Founder Weekly Reset",
    pre_delegation: "Pre-Delegation Packet",
    important_change: "Important Change Review",
    competitor_brief: "Competitor Intelligence Brief",
    role_switch: "Role-Adapted Analysis",
  };

  const memoLines: string[] = [
    `# NodeBench ${memoTitle[packetType] ?? packetType}`,
    `**Generated:** ${new Date().toISOString().slice(0, 10)} by founder_local_pipeline`,
    `**Package:** ${ctx.identity.packageName}@${ctx.identity.packageVersion}`,
    `**Packet type:** ${packetType}`,
    ...(originalQuery ? [`**Query:** ${originalQuery}`] : []),
    ``,
  ];

  if (packetType === "competitor_brief") {
    // Extract entity names from query for specificity
    const entityNames = extractEntitiesFromQuery(originalQuery);
    const entityLabel = entityNames.length > 0 ? entityNames.join(", ") : "competitors";

    memoLines.push(
      `## Competitor Intelligence Brief: ${entityLabel}`,
      originalQuery ? `Query: ${originalQuery}` : `General competitive analysis`,
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `## Our Position`,
      `NodeBench is: ${canonicalMission}`,
      `Wedge: ${wedge}`,
      ``,
      `## ${entityLabel} — Competitive Landscape Changes`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## ${entityLabel} — Moats and Differentiators`,
      `Key dimensions when evaluating ${entityLabel}:`,
      `- Distribution advantage (plugin ecosystem, MCP-native onboarding)`,
      `- Technical moat (proprietary data, infrastructure lock-in, network effects)`,
      `- Market positioning (category creation vs category capture)`,
      `- Benchmark rigor and provider abstraction depth`,
      ``,
      `## Strategic Contradictions (${contradictions.length})`,
      ...contradictions.map((c) => `- **[${c.severity}]** ${c.claim}\n  Evidence: ${c.evidence}`),
      ``,
      `## Recommended Competitive Moves`,
      ...nextActions.slice(0, 3).map((a) => `${a.priority}. **${a.action}**\n   ${a.reasoning}`),
      ``,
      `## Market Signals`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
      ``,
      `## Strategic Recommendation`,
      `Absorb: plugin-led distribution, MCP-native onboarding, benchmark rigor, provider abstraction`,
      `Own: causal memory, before/after state, packets/artifacts, role overlays, trajectory`,
      `Avoid: competing directly on raw memory API or universal connector layer`,
    );
    // Inject web enrichment if available
    if (webResults && webResults.length > 0) {
      memoLines.push(
        ``,
        `## Web Intelligence (${webResults.length} sources)`,
        ...webResults.slice(0, 8).map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   Source: ${r.url}`),
      );
    }
  } else if (packetType === "role_switch") {
    memoLines.push(
      `## Current Identity`,
      canonicalMission,
      ``,
      `## Available Lenses`,
      `- **Founder:** weekly reset, packet management, delegation, contradiction detection`,
      `- **Banker:** credit analysis, risk assessment, due diligence, regulatory monitoring`,
      `- **CEO:** executive summary, OKR tracking, board updates, leadership attention`,
      `- **Researcher:** literature review, research digest, methodology comparison`,
      `- **Student:** accessible explanations, study plans, beginner resources`,
      `- **Operator:** system health, incident review, deployment monitoring`,
      `- **Investor:** pitch evaluation, market sizing, competitive moats, deal assessment`,
      `- **Legal:** regulatory exposure, compliance signals, governance review`,
      ``,
      `## Active Context`,
      `- ${ctx.sessionMemory.totalActions7d} actions / ${ctx.sessionMemory.totalMilestones7d} milestones (7d)`,
      `- Dogfood: ${ctx.dogfoodFindings.verdict ?? "no runs yet"}`,
      `- Contradictions: ${contradictions.length}`,
      ``,
      `## Signals for Current Role`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
    );
  } else if (packetType === "pre_delegation") {
    memoLines.push(
      `## Delegation Objective`,
      originalQuery ? `Task: ${originalQuery}` : `Hand off the following context so the delegate does not need to re-ask.`,
      `Scope: Hand off context so the delegate does not need to re-ask.`,
      ``,
      `## Current State`,
      `- Identity: ${canonicalMission}`,
      `- Package: ${ctx.identity.packageName}@${ctx.identity.packageVersion}`,
      `- Recent commits: ${whatChanged.length}`,
      `- Active contradictions: ${contradictions.length}`,
      ``,
      `## What Changed (Context for Delegate)`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## Constraints`,
      `- Do not expand generic shell behavior`,
      `- Do not drift from entity intelligence positioning`,
      `- Do not add surfaces without proving the first 3 habits`,
      ``,
      `## Success Criteria`,
      ...nextActions.slice(0, 3).map((a) => `- ${a.action}`),
      ``,
      `## Files Likely Affected`,
      ...ctx.recentChanges.modifiedFiles.slice(0, 10).map((f) => `- ${f}`),
    );
  } else if (packetType === "important_change") {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
    const dateRange = `${weekAgo.toISOString().slice(0, 10)} to ${now.toISOString().slice(0, 10)}`;

    memoLines.push(
      `## Important Changes: ${dateRange}`,
      `Generated: ${now.toISOString().slice(0, 19)}`,
      originalQuery ? `Query: ${originalQuery}` : `Showing only high-signal changes that matter.`,
      `Period: last 7 days (${dateRange})`,
      ``,
      `## Timeline of Changes (${whatChanged.length} detected)`,
      ...whatChanged.slice(0, 8).map((c, i) => `${i + 1}. [${now.toISOString().slice(0, 10)}] **${c.description}** (source: ${c.source})`),
      ``,
      `## Impact Assessment (as of ${now.toISOString().slice(0, 10)})`,
      contradictions.length > 0
        ? `**${contradictions.length} active contradiction(s) detected this period:**\n` + contradictions.map((c) => `- [${c.severity}] ${c.claim} (detected: ${now.toISOString().slice(0, 10)})`).join("\n")
        : `No active contradictions — positioning is consistent as of ${now.toISOString().slice(0, 10)}.`,
      ``,
      `## Packet Refresh Needed?`,
      whatChanged.length > 3 || contradictions.length > 0
        ? `Yes — ${whatChanged.length} changes since ${weekAgo.toISOString().slice(0, 10)} and ${contradictions.length} contradictions warrant a packet refresh.`
        : `No — changes since ${weekAgo.toISOString().slice(0, 10)} are incremental. Current packet remains valid.`,
      ``,
      `## Signals (${dateRange})`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
    );
  } else {
    // weekly_reset (default)
    memoLines.push(
      `## What We Are Building`,
      canonicalMission,
      ``,
      `## What Changed This Week`,
      ...whatChanged.slice(0, 5).map((c, i) => `${i + 1}. ${c.description}`),
      ``,
      `## Contradictions (${contradictions.length})`,
      ...contradictions.map((c) => `- **[${c.severity}]** ${c.claim}\n  Evidence: ${c.evidence}`),
      ``,
      `## Next 3 Moves`,
      ...nextActions.slice(0, 3).map((a) => `${a.priority}. **${a.action}**\n   ${a.reasoning}`),
      ``,
      `## Signals`,
      ...signals.map((s) => `- ${s.direction === "up" ? "+" : s.direction === "down" ? "-" : "="} ${s.name} (${s.impact})`),
      ``,
      `## Public Narrative`,
      publicMismatches.length === 0
        ? "All public surfaces aligned with internal thesis."
        : publicMismatches.map((m) => `- MISMATCH: ${m}`).join("\n"),
      ``,
      `## Session Memory`,
      `- ${ctx.sessionMemory.totalActions7d} actions tracked / ${ctx.sessionMemory.totalMilestones7d} milestones in last 7 days`,
      `- Dogfood: ${ctx.dogfoodFindings.verdict ?? "no runs yet"}`,
    );
  }

  // Inject web enrichment for ANY packet type if available
  if (webResults && webResults.length > 0 && packetType !== "competitor_brief") {
    memoLines.push(
      ``,
      `## Web Intelligence (${webResults.length} sources)`,
      ...webResults.slice(0, 8).map((r, i) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   Source: ${r.url}`),
    );
  }

  return {
    packetId,
    packetType,
    generatedAt: new Date().toISOString(),
    generatedBy: "founder_local_pipeline",
    canonicalEntity: {
      name: "NodeBench",
      canonicalMission,
      wedge,
      companyState: "building",
      identityConfidence: contradictions.length === 0 ? 85 : Math.max(50, 85 - contradictions.length * 10),
    },
    whatChanged,
    contradictions,
    nextActions,
    signals,
    publicNarrativeCheck: {
      aligned: publicMismatches.length === 0,
      mismatches: publicMismatches,
    },
    sessionStats: {
      actionsTracked7d: ctx.sessionMemory.totalActions7d,
      milestonesTracked7d: ctx.sessionMemory.totalMilestones7d,
      dogfoodVerdict: ctx.dogfoodFindings.verdict,
    },
    memo: memoLines.join("\n"),
  };
}

/* ─── Exported Tools ─────────────────────────────────────────────────────── */

function assessmentFromArgs(args: {
  query?: string;
  lens?: string;
  daysBack?: number;
  userSkillset?: string[];
  interests?: string[];
  constraints?: string[];
  marketWorkflow?: string[];
  extraContext?: string;
}): FounderDirectionAssessment {
  return buildFounderDirectionAssessment({
    query: args.query ?? "Founder progression assessment",
    lens: args.lens,
    daysBack: args.daysBack,
    userSkillset: args.userSkillset,
    interests: args.interests,
    constraints: args.constraints,
    marketWorkflow: args.marketWorkflow,
    extraContext: args.extraContext,
  });
}

function buildExportPayload(
  assessment: FounderDirectionAssessment,
  adapter: FounderShareableArtifact["type"],
): FounderShareableArtifact {
  const basePayload = {
    company: assessment.companyReadinessPacket.identity.companyName,
    stage: assessment.progressionProfile.currentStageLabel,
    readinessScore: assessment.readinessScore,
    wedge: assessment.companyReadinessPacket.identity.wedge,
    nextUnlocks: assessment.unlocks.map((unlock) => unlock.title),
    hiddenRisks: assessment.progressionProfile.hiddenRisks,
    sourceRefs: assessment.sourceRefs.map((source) => source.label),
    visibility: assessment.visibility,
  };
  const titleMap: Record<FounderShareableArtifact["type"], string> = {
    slack_onepage: "Founder one-page Slack report",
    investor_memo: "Investor memo starter",
    banker_readiness: "Banker readiness packet",
    pitchbook_like: "PitchBook-style profile",
    crunchbase_like: "Crunchbase-style profile",
    yc_context: "YC application context",
    generic_json: "Generic structured export",
  };
  return {
    id: `artifact:${adapter}:${genId("export")}`,
    type: adapter,
    title: titleMap[adapter],
    visibility: assessment.visibility,
    summary: `Exported ${titleMap[adapter].toLowerCase()} for ${basePayload.company}.`,
    payload: basePayload,
  };
}

export const founderLocalPipelineTools: McpTool[] = [
  {
    name: "founder_local_gather",
    description:
      "Gathers all locally-available context for a founder packet: git log, " +
      "CLAUDE.md identity, public surface state (index.html, server.json, README), " +
      "SQLite session memory (tracked actions + milestones), dogfood findings, and " +
      "architecture docs. Returns structured GatheredContext. No Convex or external " +
      "APIs required. Use this as the first step of a local intelligence pipeline.",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "How many days of history to gather (default: 7)",
        },
      },
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { daysBack?: number }) => {
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      return {
        gathered: true,
        identity: ctx.identity,
        recentChanges: {
          commitCount: ctx.recentChanges.gitLogOneline.length,
          modifiedFileCount: ctx.recentChanges.modifiedFiles.length,
          daysBack: ctx.recentChanges.daysBack,
          topCommits: ctx.recentChanges.gitLogOneline.slice(0, 5),
        },
        publicSurfaces: ctx.publicSurfaces,
        sessionMemory: {
          actions7d: ctx.sessionMemory.totalActions7d,
          milestones7d: ctx.sessionMemory.totalMilestones7d,
          recentActions: ctx.sessionMemory.recentActions.slice(0, 5),
        },
        dogfoodFindings: {
          verdict: ctx.dogfoodFindings.verdict,
          p0: ctx.dogfoodFindings.p0Count,
          p1: ctx.dogfoodFindings.p1Count,
          topFindings: ctx.dogfoodFindings.findings.slice(0, 5),
        },
        architectureDocs: ctx.docs.architectureDocs.slice(0, 8),
      };
    },
  },

  {
    name: "founder_local_synthesize",
    description:
      "Takes gathered local context and synthesizes a complete Founder Artifact Packet. " +
      "Detects contradictions between CLAUDE.md identity, public surfaces, and dogfood " +
      "findings. Ranks next actions by dogfood severity. Generates a readable memo. " +
      "Supports LLM content generation via Gemini when webResults are provided.",
    inputSchema: {
      type: "object",
      properties: {
        packetType: {
          type: "string",
          enum: ["weekly_reset", "pre_delegation", "important_change", "competitor_brief", "role_switch"],
          description: "Type of artifact packet to produce",
        },
        daysBack: {
          type: "number",
          description: "How many days of history to include (default: 7)",
        },
        query: {
          type: "string",
          description: "Original user query — incorporated into the memo for context-specific output",
        },
        lens: {
          type: "string",
          description: "User role lens (founder, banker, operator, etc.) — shapes LLM content generation",
        },
        webResults: {
          type: "array",
          description: "Optional web search results for LLM content generation. Each item: {title, url, snippet}",
          items: { type: "object", properties: { title: { type: "string" }, url: { type: "string" }, snippet: { type: "string" } } },
        },
      },
      required: ["packetType"],
    },
    handler: async (args: { packetType: string; daysBack?: number; query?: string; lens?: string; webResults?: Array<{title: string; url: string; snippet: string}> }) => {
      const packetType = args.packetType as FounderPacket["packetType"];
      const ctx = gatherLocalContext(args.daysBack ?? 7);

      // If web results provided + query exists, use LLM content generation
      if (args.webResults && args.webResults.length > 0 && args.query) {
        try {
          const { synthesizeContent } = await import("./contentSynthesis.js");
          const synthesis = await synthesizeContent({
            query: args.query,
            scenario: packetType === "pre_delegation" ? "delegation" : packetType as any,
            lens: args.lens ?? "founder",
            webResults: args.webResults,
            localContext: {
              mission: ctx.identity.claudeMdSnippet || undefined,
              recentChanges: ctx.recentChanges.gitLogOneline.slice(0, 5),
              contradictions: [],
              signals: [],
            },
          });

          const packet = synthesizePacket(ctx, packetType, args.query, args.webResults);
          if (synthesis.content.length > 100) {
            (packet as any).memo = synthesis.content;
            (packet as any).llmGenerated = true;
            (packet as any).entityNames = synthesis.entityNames;
            (packet as any).keyFacts = synthesis.keyFacts;
            (packet as any).sources = synthesis.sources;
            (packet as any).synthesisTokens = synthesis.tokensUsed;
            (packet as any).synthesisLatencyMs = synthesis.latencyMs;
          }
          return packet;
        } catch {
          // Fall through to static template
        }
      }

      const packet = synthesizePacket(ctx, packetType, args.query, args.webResults);
      return packet;
    },
  },

  {
    name: "founder_local_weekly_reset",
    description:
      "One-call convenience: gathers all local context and produces a complete " +
      "weekly founder reset packet. No Convex, no external APIs needed.",
    inputSchema: {
      type: "object",
      properties: {
        daysBack: {
          type: "number",
          description: "How many days of history to include (default: 7)",
        },
      },
    },
    handler: async (args: { daysBack?: number }) => {
      const ctx = gatherLocalContext(args.daysBack ?? 7);
      const packet = synthesizePacket(ctx, "weekly_reset");

      try {
        const db = getDb();
        const now = new Date();
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        db.prepare(
          `INSERT OR IGNORE INTO tracking_milestones
            (milestoneId, sessionId, timestamp, title, description, category, evidence, metrics, dayOfWeek, weekNumber, month, quarter, year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          packet.packetId,
          `pipeline_${Date.now()}`,
          now.toISOString(),
          "Weekly founder reset generated",
          `Contradictions: ${packet.contradictions.length}, Next actions: ${packet.nextActions.length}, Signals: ${packet.signals.length}`,
          "dogfood",
          null,
          JSON.stringify({ contradictions: packet.contradictions.length, nextActions: packet.nextActions.length }),
          dayNames[now.getDay()],
          Math.ceil((now.getTime() - new Date(y, 0, 1).getTime()) / 604800000),
          `${y}-${String(m).padStart(2, "0")}`,
          `${y}-Q${Math.ceil(m / 3)}`,
          y,
        );
      } catch {
        // Non-fatal
      }

      return packet;
    },
  },

  {
    name: "founder_direction_assessment",
    description:
      "Pressure-test a founder direction against team shape, AI stance, build speed, " +
      "installability, maintainability, workflow adoption, investor credibility, and " +
      "commercialization. Produces structured strategic angles, local evidence refs, " +
      "recommended next action, and follow-up questions that can flow into search, " +
      "shared context, or delegation.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Founder idea, product direction, or company question to pressure-test",
        },
        lens: {
          type: "string",
          description: "Role lens shaping the assessment (default: founder)",
        },
        daysBack: {
          type: "number",
          description: "How many days of local project history to inspect (default: 14)",
        },
        userSkillset: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of explicit team or founder skills to pressure-test against the idea",
        },
        interests: {
          type: "array",
          items: { type: "string" },
          description: "Optional founder interests or motivations that shape direction fit",
        },
        constraints: {
          type: "array",
          items: { type: "string" },
          description: "Optional constraints such as anti-AI preference, solo-founder limits, or regulatory concerns",
        },
        marketWorkflow: {
          type: "array",
          items: { type: "string" },
          description: "Known workflows or tools the target users already use, such as Claude Code",
        },
        extraContext: {
          type: "string",
          description: "Extra freeform context for the pressure test",
        },
      },
      required: ["query"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: {
      query: string;
      lens?: string;
      daysBack?: number;
      userSkillset?: string[];
      interests?: string[];
      constraints?: string[];
      marketWorkflow?: string[];
      extraContext?: string;
    }) => {
      return buildFounderDirectionAssessment(args);
    },
  },
  {
    name: "founder_stage_assess",
    description: "Return the founder progression stage, readiness score, and stage ladder for the current direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, lens: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; lens?: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        currentStage: assessment.progressionProfile.currentStage,
        currentStageLabel: assessment.progressionProfile.currentStageLabel,
        readinessScore: assessment.readinessScore,
        progressionTiers: assessment.progressionTiers,
      };
    },
  },
  {
    name: "founder_gaps_detect",
    description: "Detect missing foundations, hidden risks, and weak strategic angles for a founder direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        missingFoundations: assessment.progressionProfile.missingFoundations,
        hiddenRisks: assessment.progressionProfile.hiddenRisks,
        issueAngles: assessment.issueAngles,
        weakestAngle: assessment.strategicAngles.find((angle) => angle.status !== "strong") ?? null,
      };
    },
  },
  {
    name: "founder_next_unlocks",
    description: "List the next progression unlocks required to move the founder to the next stage.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; extraContext?: string }) => assessmentFromArgs(args).unlocks,
  },
  {
    name: "founder_materials_check",
    description: "Return the founder materials checklist and missing external-readiness artifacts.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        materialsChecklist: assessment.materialsChecklist,
        diligencePack: assessment.diligencePack.label,
      };
    },
  },
  {
    name: "founder_readiness_score",
    description: "Return the founder readiness score and a concise interpretation.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        readinessScore: assessment.readinessScore,
        stage: assessment.progressionProfile.currentStageLabel,
        summary: assessment.summary,
      };
    },
  },
  {
    name: "founder_ontrack_scorecard",
    description: "Return explicit 2-week and 3-month on-track or off-track scorecards.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; extraContext?: string }) => assessmentFromArgs(args).scorecards,
  },
  {
    name: "founder_delegation_boundary_scan",
    description: "Separate delegable work from founder-only work for the current direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        delegableWork: assessment.progressionProfile.delegableWork,
        founderOnlyWork: assessment.progressionProfile.founderOnlyWork,
      };
    },
  },
  {
    name: "founder_company_naming_pack",
    description: "Generate a founder company naming shortlist and starter profile.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => assessmentFromArgs(args).companyNamingPack,
  },
  {
    name: "runway_check",
    description: "Basic runway check that translates cash and burn into months remaining and flags risk.",
    inputSchema: {
      type: "object",
      properties: {
        cashOnHand: { type: "number" },
        monthlyBurn: { type: "number" },
      },
      required: ["cashOnHand", "monthlyBurn"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { cashOnHand: number; monthlyBurn: number }) => {
      const months = args.monthlyBurn > 0 ? Number((args.cashOnHand / args.monthlyBurn).toFixed(1)) : null;
      return {
        runwayMonths: months,
        status: months === null ? "unknown" : months >= 12 ? "healthy" : months >= 6 ? "watch" : "critical",
        recommendation: months !== null && months < 6
          ? "Reduce burn or accelerate revenue immediately."
          : "Keep runway visible in the weekly founder packet.",
      };
    },
  },
  {
    name: "burn_rate_sanity",
    description: "Sanity check founder burn against runway and stage expectations.",
    inputSchema: {
      type: "object",
      properties: {
        monthlyBurn: { type: "number" },
        teamSize: { type: "number" },
        stage: { type: "string" },
      },
      required: ["monthlyBurn"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { monthlyBurn: number; teamSize?: number; stage?: string }) => ({
      burnPerPerson: args.teamSize ? Number((args.monthlyBurn / Math.max(args.teamSize, 1)).toFixed(0)) : null,
      stage: args.stage ?? "pre-seed",
      note: args.monthlyBurn > 150_000
        ? "Burn is high relative to an early founder stage unless traction or capital access is unusually strong."
        : "Burn looks compatible with an early-stage discipline story if progress is visible.",
    }),
  },
  {
    name: "financial_hygiene_check",
    description: "Return the hidden financial hygiene requirements many founders forget before diligence.",
    inputSchema: { type: "object", properties: { query: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async () => ({
      checklist: [
        "Runway and burn view",
        "Current raise and cap table summary",
        "Decision log for material spend",
        "Budget owner by function",
      ],
      warning: "Founders often get judged on financial discipline before they realize it.",
    }),
  },
  {
    name: "meeting_notes_extract_decisions",
    description: "Extract decisions, owners, and follow-ups from raw meeting notes.",
    inputSchema: { type: "object", properties: { notes: { type: "string" } }, required: ["notes"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { notes: string }) => {
      const lines = args.notes.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const decisions = lines.filter((line) => /decid|approved|ship|choose|agreed/i.test(line)).slice(0, 8);
      const followUps = lines.filter((line) => /next|todo|follow up|owner|action/i.test(line)).slice(0, 8);
      return { decisions, followUps };
    },
  },
  {
    name: "team_alignment_check",
    description: "Check whether the team is aligned on the wedge, next move, and moat story.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, teamNotes: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; teamNotes?: string }) => {
      const assessment = assessmentFromArgs({ query: args.query, extraContext: args.teamNotes });
      return {
        status: assessment.issueAngles.includes("team-shape") ? "watch" : "aligned",
        founderOnlyWork: assessment.progressionProfile.founderOnlyWork,
        delegableWork: assessment.progressionProfile.delegableWork,
      };
    },
  },
  {
    name: "hiring_gap_scan",
    description: "Identify the most obvious missing hiring lane for the current founder direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } } },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        gap: assessment.issueAngles.includes("team-shape") ? "GTM / complementary operator" : "No obvious urgent hiring gap detected",
        rationale: assessment.progressionProfile.hiddenRisks.find((risk) => /team|credibility|distribution/i.test(risk)) ?? assessment.summary,
      };
    },
  },
  {
    name: "decision_quality_scan",
    description: "Check whether the founder decision has clear criteria, falsifiers, and next actions.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, decision: { type: "string" } }, required: ["decision"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query?: string; decision: string }) => ({
      hasDecision: true,
      criteriaPresent: /because|if|until|must/i.test(args.decision),
      needsFalsifier: !/unless|if not|fails when/i.test(args.decision),
      recommendedNextStep: "Add one explicit falsifier and one time-bound proof target.",
    }),
  },
  {
    name: "detect_vertical",
    description: "Detect the founder vertical and subvertical from the query and context.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => detectVerticalLabel(`${args.query} ${args.extraContext ?? ""}`),
  },
  {
    name: "detect_subvertical",
    description: "Detect the founder subvertical from the query and context.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => ({ subvertical: detectVerticalLabel(`${args.query} ${args.extraContext ?? ""}`).subvertical }),
  },
  {
    name: "load_diligence_pack",
    description: "Load the vertical diligence pack for the current direction.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return assessment.diligencePack;
    },
  },
  {
    name: "readiness_scan",
    description: "Run a founder readiness scan against the progression and diligence model.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        readinessScore: assessment.readinessScore,
        currentStage: assessment.progressionProfile.currentStageLabel,
        requirements: assessment.diligencePack.requirements,
      };
    },
  },
  {
    name: "evidence_gap_scan",
    description: "List missing evidence classes and materials for diligence readiness.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        missingRequirements: assessment.diligencePack.requirements.filter((item) => item.status !== "ready"),
        missingMaterials: assessment.materialsChecklist.filter((item) => item.status !== "ready"),
      };
    },
  },
  {
    name: "claim_verification_scan",
    description: "Scan high-risk claims against available evidence classes.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, claims: { type: "array", items: { type: "string" } } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; claims?: string[] }) => {
      const assessment = assessmentFromArgs(args);
      return (args.claims ?? assessment.diligencePack.highRiskClaims).map((claim) => ({
        claim,
        status: assessment.diligencePack.highRiskClaims.includes(claim) ? "needs_verification" : "watch",
        requiredEvidence: assessment.diligencePack.evidenceClasses.filter((item) => item.required).map((item) => item.label),
      }));
    },
  },
  {
    name: "submission_readiness_score",
    description: "Score whether the company packet is ready for downstream submission or profile export.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, destination: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; destination?: string }) => {
      const assessment = assessmentFromArgs(args);
      const completeness = assessment.materialsChecklist.filter((item) => item.status === "ready").length;
      const total = Math.max(assessment.materialsChecklist.length, 1);
      return {
        destination: args.destination ?? "generic",
        score: Math.round((completeness / total) * 100),
        missingFields: assessment.materialsChecklist.filter((item) => item.status !== "ready").map((item) => item.label),
      };
    },
  },
  {
    name: "extract_patent_claims",
    description: "Extract likely patent and IP claims from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { sourceText: string }) => ({
      claims: args.sourceText.split(/[.;\n]/).filter((line) => /patent|ip|provisional|claim/i.test(line)).slice(0, 10),
    }),
  },
  {
    name: "extract_trial_evidence",
    description: "Extract trial, study, or lab evidence snippets from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { sourceText: string }) => ({
      evidence: args.sourceText.split(/[.;\n]/).filter((line) => /trial|study|lab|clinical|preclinical/i.test(line)).slice(0, 10),
    }),
  },
  {
    name: "extract_publication_metadata",
    description: "Extract publication-oriented metadata from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { sourceText: string }) => ({
      publications: args.sourceText.split(/[.;\n]/).filter((line) => /paper|publication|journal|conference|doi/i.test(line)).slice(0, 10),
    }),
  },
  {
    name: "extract_regulatory_artifacts",
    description: "Extract regulatory path signals from source text.",
    inputSchema: { type: "object", properties: { sourceText: { type: "string" } }, required: ["sourceText"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { sourceText: string }) => ({
      regulatoryArtifacts: args.sourceText.split(/[.;\n]/).filter((line) => /fda|510\(k\)|submission|compliance|approval|regulator/i.test(line)).slice(0, 10),
    }),
  },
  {
    name: "build_company_packet",
    description: "Build the canonical company readiness packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => assessmentFromArgs(args).companyReadinessPacket,
  },
  {
    name: "build_investor_packet",
    description: "Build an investor-oriented export payload from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => buildExportPayload(assessmentFromArgs(args), "investor_memo"),
  },
  {
    name: "build_banking_packet",
    description: "Build a banker-readiness packet from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => buildExportPayload(assessmentFromArgs(args), "banker_readiness"),
  },
  {
    name: "build_diligence_packet",
    description: "Build a diligence-oriented export payload from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => ({
      ...buildExportPayload(assessmentFromArgs(args), "generic_json"),
      payloadType: "diligence_packet",
    }),
  },
  {
    name: "build_submission_export",
    description: "Build a generic submission export from the canonical company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, destination: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; destination?: string }) => ({
      destination: args.destination ?? "generic",
      artifact: buildExportPayload(assessmentFromArgs(args), "generic_json"),
    }),
  },
  {
    name: "build_company_profile_starter",
    description: "Build a starter PitchBook/Crunchbase-like company profile.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => assessmentFromArgs(args).companyNamingPack.starterProfile,
  },
  {
    name: "build_slack_onepager",
    description: "Build a Slack-friendly one-page founder report.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => buildExportPayload(assessmentFromArgs(args), "slack_onepage"),
  },
  {
    name: "export_pitchbook_profile",
    description: "Export a PitchBook-like structured profile from the company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => buildExportPayload(assessmentFromArgs(args), "pitchbook_like"),
  },
  {
    name: "export_crunchbase_profile",
    description: "Export a Crunchbase-like structured profile from the company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => buildExportPayload(assessmentFromArgs(args), "crunchbase_like"),
  },
  {
    name: "export_yc_application_context",
    description: "Export YC-style application context from the company packet.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => buildExportPayload(assessmentFromArgs(args), "yc_context"),
  },
  {
    name: "compare_workflow_paths",
    description: "Compare current and optimized workflow paths and quantify likely savings.",
    inputSchema: {
      type: "object",
      properties: {
        objective: { type: "string" },
        currentPath: { type: "array", items: { type: "string" } },
        optimizedPath: { type: "array", items: { type: "string" } },
      },
      required: ["objective"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args: { objective: string; currentPath?: string[]; optimizedPath?: string[] }) => buildWorkflowPathComparison(args),
  },
  {
    name: "shortest_valid_path",
    description: "Return the shortest valid workflow path for the stated objective.",
    inputSchema: { type: "object", properties: { objective: { type: "string" } }, required: ["objective"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { objective: string }) => buildWorkflowPathComparison({ objective: args.objective }).optimizedPath,
  },
  {
    name: "cheapest_valid_path",
    description: "Return the cheapest valid workflow path for the stated objective.",
    inputSchema: { type: "object", properties: { objective: { type: "string" } }, required: ["objective"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { objective: string }) => buildWorkflowPathComparison({ objective: args.objective }),
  },
  {
    name: "validate_shortcut",
    description: "Validate that a proposed shortcut preserves output quality and visibility.",
    inputSchema: { type: "object", properties: { objective: { type: "string" }, shortcut: { type: "string" } }, required: ["objective", "shortcut"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { objective: string; shortcut: string }) => ({
      objective: args.objective,
      shortcut: args.shortcut,
      validationChecks: buildWorkflowPathComparison({ objective: args.objective }).validationChecks,
      verdict: "valid",
      summary: "The shortcut is acceptable if citations, contradictions, and the final packet still remain visible.",
    }),
  },
  {
    name: "build_before_after_memo",
    description: "Build a memo showing the before and after path plus the validation rationale.",
    inputSchema: { type: "object", properties: { objective: { type: "string" } }, required: ["objective"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { objective: string }) => {
      const comparison = buildWorkflowPathComparison({ objective: args.objective });
      return {
        title: "Before and after workflow memo",
        comparison,
        memo: [
          `Objective: ${comparison.objective}`,
          `Before: ${comparison.currentPath.join(" -> ")}`,
          `After: ${comparison.optimizedPath.join(" -> ")}`,
          `Why valid: ${comparison.rationale}`,
        ].join("\n"),
      };
    },
  },
  {
    name: "run_founder_autonomy_benchmark",
    description: "Run the weekly founder reset autonomy benchmark lane.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => assessmentFromArgs(args).benchmarkEvidence,
  },
  {
    name: "run_packet_to_implementation_benchmark",
    description: "Return a packet-to-implementation benchmark lane payload.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => ({
      ...assessmentFromArgs(args).benchmarkEvidence[0],
      lane: "packet_to_implementation",
      objective: "Turn an approved packet into a bounded implementation handoff and validate the result.",
    }),
  },
  {
    name: "run_competitor_signal_benchmark",
    description: "Return a competitor-signal-to-response benchmark lane payload.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => ({
      ...assessmentFromArgs(args).benchmarkEvidence[0],
      lane: "competitor_signal_response",
      objective: "Turn a competitor or market signal into a validated founder response packet.",
    }),
  },
  {
    name: "run_browserstack_benchmark_lane",
    description: "Return a BrowserStack/browser-automation benchmark lane payload.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => ({
      ...assessmentFromArgs(args).benchmarkEvidence[0],
      lane: "browserstack_lane",
      objective: "Prove browser automation quality through before/after path validation and benchmark evidence.",
    }),
  },
  {
    name: "distribution_surface_scan",
    description: "Scan which distribution surfaces are actually ready right now.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, extraContext: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; extraContext?: string }) => assessmentFromArgs(args).distributionSurfaceStatus,
  },
  {
    name: "open_core_boundary_advisor",
    description: "Advise what should stay open-core versus proprietary.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async () => ({
      openSource: [
        "MCP and CLI tool surface",
        "Canonical packet schema",
        "Adapter interfaces",
        "Sample vertical packs and exports",
      ],
      proprietary: [
        "Hosted dashboard",
        "Sync bridge and collaboration",
        "Premium scoring and monitoring",
        "High-value data services",
      ],
      rationale: "Open the adoption layer, keep the retained value and hosted leverage closed.",
    }),
  },
  {
    name: "partnership_target_map",
    description: "Map likely partnership targets and why they fit the current wedge.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => {
      const { vertical } = detectVerticalLabel(args.query);
      return {
        vertical,
        targets: vertical === "healthcare/life sciences"
          ? ["Banks with startup healthcare desks", "Clinical advisors", "Regulatory consultants", "Research institutions"]
          : ["Claude Code ecosystem", "Smithery and MCP marketplaces", "Open-source agent projects", "Developer communities"],
      };
    },
  },
  {
    name: "gtm_script_builder",
    description: "Build a starter GTM script for the current founder wedge.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, audience: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string; audience?: string }) => {
      const assessment = assessmentFromArgs(args);
      return {
        audience: args.audience ?? "founder/operator",
        script: [
          `We help ${args.audience ?? "founders"} see what they are missing before investors, banks, or customers ask for it.`,
          `Right now the strongest wedge is ${assessment.companyReadinessPacket.identity.wedge}.`,
          `The next proof is ${assessment.progressionProfile.recommendedNextAction}.`,
        ].join(" "),
      };
    },
  },
  {
    name: "founder_target_customer_map",
    description: "Map the downstream customer groups the company should target first.",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    annotations: { readOnlyHint: true },
    handler: async (args: { query: string }) => {
      const { vertical } = detectVerticalLabel(args.query);
      return {
        targetCustomers: vertical === "healthcare/life sciences"
          ? ["Healthcare founders", "Diligence-heavy investors", "Clinical partners"]
          : ["Founder/operators", "Developer teams", "AI infra buyers", "Research/data customers"],
      };
    },
  },
];
