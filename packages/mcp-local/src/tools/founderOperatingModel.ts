export type FounderOperatingRole =
  | "founder"
  | "banker"
  | "ceo"
  | "investor"
  | "student"
  | "legal";

export type FounderCompanyMode = "own_company" | "external_company" | "mixed_comparison";

export interface FounderExecutionStep {
  id:
    | "ingest"
    | "classify"
    | "canonicalize"
    | "score"
    | "packet"
    | "artifact"
    | "action"
    | "trace";
  label: string;
  description: string;
}

export interface FounderQueueDefinition {
  id:
    | "ingestion"
    | "sweeps"
    | "delta"
    | "packet_refresh"
    | "artifact_render"
    | "export_delivery"
    | "delegation_dispatch"
    | "benchmark_runs"
    | "ambient_reminders";
  label: string;
  purpose: string;
  upstream: string[];
  outputs: string[];
}

export interface FounderSourcePolicy {
  sourceType:
    | "slack"
    | "codebase"
    | "local_files"
    | "uploads"
    | "docs"
    | "web_research"
    | "agent_outputs"
    | "third_party";
  canRead: boolean;
  canStore: boolean;
  canSummarize: boolean;
  exportPolicy: "allow" | "redact" | "reference_only";
  notes: string;
}

export interface FounderRolePacketDefault {
  role: FounderOperatingRole;
  defaultPacketType:
    | "founder_progression_packet"
    | "banking_readiness_packet"
    | "operating_brief"
    | "study_brief"
    | "diligence_packet";
  defaultArtifactType:
    | "slack_onepage"
    | "banker_readiness"
    | "investor_memo"
    | "study_brief"
    | "diligence_packet";
  shouldMonitorByDefault: boolean;
  shouldDelegateByDefault: boolean;
}

export interface FounderPacketRouterDecision {
  role: FounderOperatingRole;
  companyMode: FounderCompanyMode;
  packetType: FounderRolePacketDefault["defaultPacketType"];
  artifactType: FounderRolePacketDefault["defaultArtifactType"];
  visibility: "internal" | "workspace" | "public";
  shouldMonitor: boolean;
  shouldExport: boolean;
  shouldDelegate: boolean;
  needsMoreEvidence: boolean;
  requiredEvidence: string[];
  rationale: string;
}

export interface FounderProgressionStageRubric {
  stageId: "clarity" | "foundation" | "readiness" | "leverage" | "scale";
  label: string;
  promotionCriteria: string[];
  mandatorySignals: string[];
  optionalSignals: string[];
}

export interface FounderProgressionRubricEvaluation {
  currentStage: FounderProgressionStageRubric["stageId"];
  onTrack: boolean;
  mandatorySatisfied: string[];
  mandatoryMissing: string[];
  optionalStrengths: string[];
  rationale: string;
}

export interface BenchmarkOracleDefinition {
  lane:
    | "weekly_founder_reset"
    | "competitor_signal_response"
    | "packet_to_implementation"
    | "cheapest_valid_workflow"
    | "browserstack_lane";
  baseline: string;
  deterministicChecks: string[];
  probabilisticJudges: string[];
  heldOutScenarios: string[];
}

export interface FounderOperatingModel {
  executionOrder: FounderExecutionStep[];
  queueTopology: FounderQueueDefinition[];
  sourcePolicies: FounderSourcePolicy[];
  roleDefault: FounderRolePacketDefault;
  packetRouter: FounderPacketRouterDecision;
  progressionRubric: FounderProgressionRubricEvaluation;
  benchmarkOracles: BenchmarkOracleDefinition[];
}

const EXECUTION_ORDER: FounderExecutionStep[] = [
  {
    id: "ingest",
    label: "Ingest",
    description: "Collect raw query, uploads, private context, and prior packet lineage.",
  },
  {
    id: "classify",
    label: "Classify role and vertical",
    description: "Resolve the user role, company mode, and the relevant diligence vertical early.",
  },
  {
    id: "canonicalize",
    label: "Canonicalize company",
    description: "Decide whether this is the user's own company, an external company, or a mixed comparison.",
  },
  {
    id: "score",
    label: "Score readiness and gaps",
    description: "Score readiness, contradictions, missing evidence, and progression state.",
  },
  {
    id: "packet",
    label: "Choose packet",
    description: "Route to the canonical packet type for the role and company mode.",
  },
  {
    id: "artifact",
    label: "Choose artifact",
    description: "Select the first artifact surface that matches the packet and stage of maturity.",
  },
  {
    id: "action",
    label: "Monitor, export, or delegate",
    description: "Decide whether the run should stop at insight, create a shareable artifact, set up monitoring, or create a handoff.",
  },
  {
    id: "trace",
    label: "Track before/after and replay",
    description: "Persist the path, evidence, and replay state for later benchmark and audit use.",
  },
];

const QUEUE_TOPOLOGY: FounderQueueDefinition[] = [
  {
    id: "ingestion",
    label: "Ingestion queue",
    purpose: "Normalize raw text, uploads, and source receipts into structured founder context.",
    upstream: ["query", "upload", "private context"],
    outputs: ["canonical source records", "structured claims"],
  },
  {
    id: "sweeps",
    label: "Sweep queue",
    purpose: "Run scheduled or manual source sweeps for watched entities and dependencies.",
    upstream: ["watchlist", "manual sweep"],
    outputs: ["fresh observations", "source deltas"],
  },
  {
    id: "delta",
    label: "Delta queue",
    purpose: "Compare the current state to prior packets and classify change severity.",
    upstream: ["ingestion", "sweeps"],
    outputs: ["delta digest", "flash/priority/routine tiers"],
  },
  {
    id: "packet_refresh",
    label: "Packet refresh queue",
    purpose: "Refresh stale packets when new evidence changes the company story or diligence state.",
    upstream: ["delta", "manual review"],
    outputs: ["updated packets", "staleness receipts"],
  },
  {
    id: "artifact_render",
    label: "Artifact render queue",
    purpose: "Render Slack reports, investor memos, diligence packets, and profile exports.",
    upstream: ["packet_refresh", "manual export"],
    outputs: ["rendered artifacts"],
  },
  {
    id: "export_delivery",
    label: "Export delivery queue",
    purpose: "Handle share-link creation and destination-specific export delivery.",
    upstream: ["artifact_render"],
    outputs: ["share links", "delivery receipts"],
  },
  {
    id: "delegation_dispatch",
    label: "Delegation dispatch queue",
    purpose: "Dispatch bounded tasks tied to the canonical packet and shared context.",
    upstream: ["packet_refresh", "manual delegation"],
    outputs: ["task handoffs", "assignee receipts"],
  },
  {
    id: "benchmark_runs",
    label: "Benchmark queue",
    purpose: "Run autonomy and workflow-optimization benchmarks against packet-backed workflows.",
    upstream: ["manual benchmark", "scheduled evaluation"],
    outputs: ["benchmark runs", "oracle verdicts"],
  },
  {
    id: "ambient_reminders",
    label: "Ambient reminder queue",
    purpose: "Proactively surface stale packets, diligence gaps, and moat/public exposure warnings.",
    upstream: ["delta", "packet_refresh", "benchmark_runs"],
    outputs: ["reminders", "attention queue items"],
  },
];

const SOURCE_POLICIES: FounderSourcePolicy[] = [
  {
    sourceType: "slack",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "redact",
    notes: "Slack can be summarized and stored, but exported artifacts should redact private internal details by default.",
  },
  {
    sourceType: "codebase",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "reference_only",
    notes: "Codebase details can shape packets, but external exports should reference capabilities rather than expose internals.",
  },
  {
    sourceType: "local_files",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "redact",
    notes: "Local files are usable for internal synthesis but need explicit redaction before outside sharing.",
  },
  {
    sourceType: "uploads",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "redact",
    notes: "Uploads are packet inputs, but external delivery should strip sensitive passages unless explicitly approved.",
  },
  {
    sourceType: "docs",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "allow",
    notes: "Owned docs and product docs are generally safe to summarize and cite in artifacts.",
  },
  {
    sourceType: "web_research",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "allow",
    notes: "Public web research can be stored, summarized, and exported with citations.",
  },
  {
    sourceType: "agent_outputs",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "reference_only",
    notes: "Agent outputs should be treated as derived claims that require evidence before external export.",
  },
  {
    sourceType: "third_party",
    canRead: true,
    canStore: true,
    canSummarize: true,
    exportPolicy: "reference_only",
    notes: "Third-party provider outputs are usable for synthesis but should usually be referenced, not blindly re-exported.",
  },
];

const ROLE_PACKET_DEFAULTS: FounderRolePacketDefault[] = [
  {
    role: "founder",
    defaultPacketType: "founder_progression_packet",
    defaultArtifactType: "slack_onepage",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: true,
  },
  {
    role: "banker",
    defaultPacketType: "banking_readiness_packet",
    defaultArtifactType: "banker_readiness",
    shouldMonitorByDefault: false,
    shouldDelegateByDefault: false,
  },
  {
    role: "ceo",
    defaultPacketType: "operating_brief",
    defaultArtifactType: "investor_memo",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: true,
  },
  {
    role: "investor",
    defaultPacketType: "operating_brief",
    defaultArtifactType: "investor_memo",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: false,
  },
  {
    role: "student",
    defaultPacketType: "study_brief",
    defaultArtifactType: "study_brief",
    shouldMonitorByDefault: false,
    shouldDelegateByDefault: false,
  },
  {
    role: "legal",
    defaultPacketType: "diligence_packet",
    defaultArtifactType: "diligence_packet",
    shouldMonitorByDefault: true,
    shouldDelegateByDefault: false,
  },
];

const PROGRESSION_RUBRIC: FounderProgressionStageRubric[] = [
  {
    stageId: "clarity",
    label: "Stage 0: Clarity",
    promotionCriteria: ["Clear wedge", "One useful packet", "Named customer"],
    mandatorySignals: ["wedge_defined", "useful_packet"],
    optionalSignals: ["shareable_artifact"],
  },
  {
    stageId: "foundation",
    label: "Stage 1: Foundation",
    promotionCriteria: ["Gap diagnosis", "Delegable task", "Install path"],
    mandatorySignals: ["useful_packet", "delegated_task", "install_path"],
    optionalSignals: ["workflow_fit", "shareable_artifact"],
  },
  {
    stageId: "readiness",
    label: "Stage 2: Readiness",
    promotionCriteria: ["Diligence pack", "Readiness score", "External artifact"],
    mandatorySignals: ["delegated_task", "shareable_artifact", "diligence_pack"],
    optionalSignals: ["submission_ready", "benchmark_proof"],
  },
  {
    stageId: "leverage",
    label: "Stage 3: Leverage",
    promotionCriteria: ["Benchmark proof", "Ambient monitoring", "Repeated packet reuse"],
    mandatorySignals: ["benchmark_proof", "repeated_reuse", "ambient_monitoring"],
    optionalSignals: ["team_install", "shared_history"],
  },
  {
    stageId: "scale",
    label: "Stage 4: Scale",
    promotionCriteria: ["Multi-user proof", "Durable retention", "Channel leverage"],
    mandatorySignals: ["shared_history", "retention_signal", "channel_leverage"],
    optionalSignals: ["partner_motion", "benchmark_program"],
  },
];

const BENCHMARK_ORACLES: BenchmarkOracleDefinition[] = [
  {
    lane: "weekly_founder_reset",
    baseline: "Manual weekly reset assembled from scattered notes and searches.",
    deterministicChecks: ["Packet exists", "Citations retained", "Top next action selected"],
    probabilisticJudges: ["Summary usefulness", "Decision clarity"],
    heldOutScenarios: ["Messy founder notes", "Conflicting market signals"],
  },
  {
    lane: "competitor_signal_response",
    baseline: "Research note without a routed product or GTM response.",
    deterministicChecks: ["Competitor signal cited", "Response packet created", "Follow-up task exists"],
    probabilisticJudges: ["Strategic usefulness", "Response relevance"],
    heldOutScenarios: ["High-noise news cycle", "Adjacent competitor launch"],
  },
  {
    lane: "packet_to_implementation",
    baseline: "Manual restatement from packet to implementation handoff.",
    deterministicChecks: ["Packet linked to task", "Implementation artifact exists", "Validation receipt exists"],
    probabilisticJudges: ["Handoff quality", "Implementation drift"],
    heldOutScenarios: ["Spec ambiguity", "Changing implementation scope"],
  },
  {
    lane: "cheapest_valid_workflow",
    baseline: "Original multi-step workflow without optimization.",
    deterministicChecks: ["Before/after memo exists", "Validation checks passed", "Artifact class preserved"],
    probabilisticJudges: ["Shortcut credibility", "Savings significance"],
    heldOutScenarios: ["Shortcut hides diligence gap", "Shortcut drops source lineage"],
  },
  {
    lane: "browserstack_lane",
    baseline: "Unverified browser workflow claims without replay evidence.",
    deterministicChecks: ["Route run recorded", "Replay artifact exists", "Verification result stored"],
    probabilisticJudges: ["Visual quality", "Workflow smoothness"],
    heldOutScenarios: ["Cross-browser regression", "Mobile-only failure"],
  },
];

export function detectFounderCompanyMode(args: {
  query: string;
  canonicalEntity?: string;
  hasPrivateContext?: boolean;
}): FounderCompanyMode {
  const query = args.query.toLowerCase();
  const ownSignals = ["my company", "our company", "our startup", "our product", "what should we do", "what should i do next", "given everything about my company"];
  const compareSignals = ["compare", "versus", "vs", "against"];
  const hasOwnSignals = ownSignals.some((signal) => query.includes(signal)) || Boolean(args.hasPrivateContext);
  const hasCompareSignals = compareSignals.some((signal) => query.includes(signal));
  if (hasOwnSignals && hasCompareSignals) return "mixed_comparison";
  if (hasOwnSignals) return "own_company";
  return "external_company";
}

export function getFounderRolePacketDefault(role: FounderOperatingRole): FounderRolePacketDefault {
  return ROLE_PACKET_DEFAULTS.find((entry) => entry.role === role) ?? ROLE_PACKET_DEFAULTS[0];
}

export function getFounderExecutionOrder(): FounderExecutionStep[] {
  return EXECUTION_ORDER;
}

export function getFounderQueueTopology(): FounderQueueDefinition[] {
  return QUEUE_TOPOLOGY;
}

export function getFounderSourcePolicies(): FounderSourcePolicy[] {
  return SOURCE_POLICIES;
}

export function getFounderProgressionRubric(): FounderProgressionStageRubric[] {
  return PROGRESSION_RUBRIC;
}

export function getFounderBenchmarkOracles(): BenchmarkOracleDefinition[] {
  return BENCHMARK_ORACLES;
}

export function evaluateFounderProgressionRubric(args: {
  readinessScore: number;
  hasUsefulPacket: boolean;
  hasDelegatedTask: boolean;
  hasShareableArtifact: boolean;
  hasDiligencePack: boolean;
  hasBenchmarkProof: boolean;
  hasAmbientMonitoring: boolean;
  hasRepeatedReuse: boolean;
}): FounderProgressionRubricEvaluation {
  const signals = new Set<string>();
  if (args.hasUsefulPacket) signals.add("useful_packet");
  if (args.hasDelegatedTask) signals.add("delegated_task");
  if (args.hasShareableArtifact) signals.add("shareable_artifact");
  if (args.hasDiligencePack) signals.add("diligence_pack");
  if (args.hasBenchmarkProof) signals.add("benchmark_proof");
  if (args.hasAmbientMonitoring) signals.add("ambient_monitoring");
  if (args.hasRepeatedReuse) signals.add("repeated_reuse");
  if (args.readinessScore >= 48) signals.add("wedge_defined");
  if (args.readinessScore >= 55) signals.add("install_path");
  if (args.readinessScore >= 58) signals.add("workflow_fit");
  if (args.readinessScore >= 62) signals.add("submission_ready");
  if (args.readinessScore >= 70) signals.add("team_install");
  if (args.readinessScore >= 75) signals.add("shared_history");
  if (args.readinessScore >= 80) signals.add("retention_signal");
  if (args.readinessScore >= 84) signals.add("channel_leverage");
  if (args.readinessScore >= 86) signals.add("partner_motion");
  if (args.readinessScore >= 88) signals.add("benchmark_program");

  const stage = args.readinessScore >= 82
    ? "scale"
    : args.readinessScore >= 70
      ? "leverage"
      : args.readinessScore >= 58
        ? "readiness"
        : args.readinessScore >= 45
          ? "foundation"
          : "clarity";
  const rubric = PROGRESSION_RUBRIC.find((entry) => entry.stageId === stage) ?? PROGRESSION_RUBRIC[0];
  const mandatorySatisfied = rubric.mandatorySignals.filter((signal) => signals.has(signal));
  const mandatoryMissing = rubric.mandatorySignals.filter((signal) => !signals.has(signal));
  const optionalStrengths = rubric.optionalSignals.filter((signal) => signals.has(signal));
  return {
    currentStage: stage,
    onTrack: mandatoryMissing.length === 0,
    mandatorySatisfied,
    mandatoryMissing,
    optionalStrengths,
    rationale:
      mandatoryMissing.length === 0
        ? `${rubric.label} is supported by the required operating signals.`
        : `${rubric.label} is still missing ${mandatoryMissing.join(", ")}.`,
  };
}

export function routeFounderPacket(args: {
  role: FounderOperatingRole;
  companyMode: FounderCompanyMode;
  readinessScore: number;
  hiddenRiskCount: number;
  visibility: "internal" | "workspace" | "public";
  hasShareableArtifact: boolean;
  hasBenchmarkProof: boolean;
  vertical: string;
}): FounderPacketRouterDecision {
  const roleDefault = getFounderRolePacketDefault(args.role);
  const needsMoreEvidence = args.hiddenRiskCount > 0 || args.readinessScore < 55;
  const requiredEvidence = [];
  if (needsMoreEvidence) requiredEvidence.push("readiness_gaps");
  if (args.vertical.includes("healthcare")) requiredEvidence.push("regulatory_or_research_evidence");
  if (!args.hasBenchmarkProof) requiredEvidence.push("benchmark_proof");

  const shouldMonitor = roleDefault.shouldMonitorByDefault || args.companyMode !== "external_company";
  const shouldDelegate = roleDefault.shouldDelegateByDefault && args.readinessScore >= 55;
  const shouldExport = args.hasShareableArtifact && !needsMoreEvidence;

  return {
    role: args.role,
    companyMode: args.companyMode,
    packetType: roleDefault.defaultPacketType,
    artifactType: roleDefault.defaultArtifactType,
    visibility: args.visibility === "public" && needsMoreEvidence ? "workspace" : args.visibility,
    shouldMonitor,
    shouldExport,
    shouldDelegate,
    needsMoreEvidence,
    requiredEvidence,
    rationale: args.companyMode === "own_company"
      ? "Own-company mode prioritizes progression, delegation, and monitoring over public export."
      : args.companyMode === "mixed_comparison"
        ? "Mixed mode needs a packet that blends internal context with external competitive evidence."
        : "External-company mode defaults to a research packet unless private context elevates it into an operating decision.",
  };
}

export function buildFounderOperatingModel(args: {
  role: FounderOperatingRole;
  query: string;
  canonicalEntity?: string;
  hasPrivateContext?: boolean;
  readinessScore: number;
  hiddenRiskCount: number;
  visibility: "internal" | "workspace" | "public";
  hasShareableArtifact: boolean;
  hasBenchmarkProof: boolean;
  hasDelegatedTask: boolean;
  hasDiligencePack: boolean;
  hasAmbientMonitoring: boolean;
  hasRepeatedReuse: boolean;
  vertical: string;
}): FounderOperatingModel {
  const companyMode = detectFounderCompanyMode({
    query: args.query,
    canonicalEntity: args.canonicalEntity,
    hasPrivateContext: args.hasPrivateContext,
  });
  return {
    executionOrder: getFounderExecutionOrder(),
    queueTopology: getFounderQueueTopology(),
    sourcePolicies: getFounderSourcePolicies(),
    roleDefault: getFounderRolePacketDefault(args.role),
    packetRouter: routeFounderPacket({
      role: args.role,
      companyMode,
      readinessScore: args.readinessScore,
      hiddenRiskCount: args.hiddenRiskCount,
      visibility: args.visibility,
      hasShareableArtifact: args.hasShareableArtifact,
      hasBenchmarkProof: args.hasBenchmarkProof,
      vertical: args.vertical,
    }),
    progressionRubric: evaluateFounderProgressionRubric({
      readinessScore: args.readinessScore,
      hasUsefulPacket: true,
      hasDelegatedTask: args.hasDelegatedTask,
      hasShareableArtifact: args.hasShareableArtifact,
      hasDiligencePack: args.hasDiligencePack,
      hasBenchmarkProof: args.hasBenchmarkProof,
      hasAmbientMonitoring: args.hasAmbientMonitoring,
      hasRepeatedReuse: args.hasRepeatedReuse,
    }),
    benchmarkOracles: getFounderBenchmarkOracles(),
  };
}
