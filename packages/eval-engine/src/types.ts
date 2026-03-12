// ── Shared types ──────────────────────────────────────────────────────

/** Base result returned by all judges. */
export interface JudgeResult {
  passed: boolean;
  /** 0-100 quality score */
  score: number;
  reasoning: string;
  evidence: string[];
  durationMs: number;
}

/** Visual-specific issue attached to screenshot/video judges. */
export interface VisualIssue {
  severity: "P0" | "P1" | "P2" | "P3";
  title: string;
  details: string;
  region?: { x: number; y: number; width: number; height: number };
}

/** Extended result for screenshot evaluation. */
export interface VisualJudgeResult extends JudgeResult {
  issues: VisualIssue[];
}

/** Interaction-level issue pinned to a timestamp in a video clip. */
export interface InteractionIssue {
  timestampMs: number;
  description: string;
  severity: "P0" | "P1" | "P2" | "P3";
}

/** Extended result for video clip evaluation. */
export interface VideoJudgeResult extends VisualJudgeResult {
  clipDurationMs: number;
  framesAnalyzed: number;
  interactionIssues: InteractionIssue[];
}

/** Configuration for the text judge. */
export interface TextJudgeConfig {
  criteria: string;
  rubric?: string;
  /** Minimum score to pass (default 70). */
  threshold?: number;
  /** LLM model identifier (default "gemini-2.5-flash"). */
  model?: string;
}

// ── SpecDoc types (mirrors convex/domains/temporal/schema.ts) ────────

export type CheckCategory =
  | "functional"
  | "security"
  | "performance"
  | "accessibility"
  | "compliance"
  | "data_integrity"
  | "ux_quality";

export type VerificationMethod =
  | "automated_test"
  | "visual_qa"
  | "video_qa"
  | "manual_review"
  | "metric_threshold"
  | "playwright_assertion";

export type ThresholdOperator = "gt" | "gte" | "lt" | "lte" | "eq";

export type CheckStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "skipped"
  | "blocked";

export type Priority = "P0" | "P1" | "P2" | "P3";

export type SpecDocStatus = "draft" | "executing" | "finalized" | "blocked";

export type OverallVerdict = "pending" | "passed" | "failed";

export type Environment = "staging" | "production" | "preview" | "canary";

export type ComplianceFramework =
  | "SOC2"
  | "HIPAA"
  | "GDPR"
  | "ISO27001"
  | "PCI_DSS"
  | "FedRAMP";

export interface SpecCheckThreshold {
  metric: string;
  operator: ThresholdOperator;
  value: number;
  units?: string;
}

export interface SpecCheckResult {
  passed: boolean;
  actualValue?: number;
  evidence?: string;
  screenshotUrl?: string;
  videoClipUrl?: string;
  errorMessage?: string;
  durationMs?: number;
  verifiedAt: number;
}

export interface SpecCheck {
  checkId: string;
  category: CheckCategory;
  title: string;
  description: string;
  verificationMethod: VerificationMethod;
  threshold?: SpecCheckThreshold;
  status: CheckStatus;
  result?: SpecCheckResult;
  priority: Priority;
}

export interface SpecDocTarget {
  environment: Environment;
  url?: string;
  branch?: string;
  commitSha?: string;
  deployedAt?: number;
}

export interface SpecDoc {
  specKey: string;
  title: string;
  description: string;
  projectId?: string;
  clientOrg?: string;
  contractValue?: number;
  deadline?: number;
  target: SpecDocTarget;
  checks: SpecCheck[];
  complianceFrameworks?: ComplianceFramework[];
  status: SpecDocStatus;
  overallVerdict: OverallVerdict;
  passRate: number;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
}

// ── Proof Pack ───────────────────────────────────────────────────────

export interface ProofPackChecklist {
  label: string;
  passed: boolean;
  note?: string;
  evidence?: string;
}

export interface ProofPackMetrics {
  totalTokens: number;
  totalDurationMs: number;
  estimatedCostUsd: number;
}

export interface AuditTrailEntry {
  action: string;
  timestamp: number;
  actor: string;
}

export interface ProofPackExport {
  packKey: string;
  subject: { type: string; id: string };
  checklist: ProofPackChecklist[];
  metrics: ProofPackMetrics;
  screenshots: string[];
  videoClips: string[];
  auditTrail: AuditTrailEntry[];
  exportedAt: number;
  format: "json" | "markdown" | "pdf-ready";
}

// ── Telemetry ────────────────────────────────────────────────────────

export interface CostEvent {
  requestId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  costUsd: number;
  latencyMs: number;
  toolName?: string;
  timestamp: number;
}

export interface CostSummary {
  totalCostUsd: number;
  totalTokens: number;
  totalLatencyMs: number;
  byModel: Record<string, { cost: number; tokens: number; calls: number }>;
  byTool: Record<string, { cost: number; tokens: number; calls: number }>;
}

// ── Trace ────────────────────────────────────────────────────────────

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface Span {
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, string | number | boolean>;
  events: SpanEvent[];
  status: "ok" | "error" | "unset";
}

export interface Trace {
  traceId: string;
  spans: Span[];
  totalCost?: number;
  totalTokens?: number;
}

export interface AgentToolSpanStatus {
  code: 0 | 1 | 2;
  message?: string;
}

export interface AgentToolSpanEvent {
  name: "tool.input" | "tool.output" | "agent.monologue";
  time_unix_nano: number;
  attributes: {
    "payload.json": string;
    "payload.cas_hash": string;
  };
}

export interface AgentToolSpanAttributes {
  "agent.id": string;
  "gen_ai.system"?: string;
  "mcp.server.name": string;
  "mcp.tool.name": string;
  "mcp.tool.authorized": boolean;
  "metric.latency_ms": number;
  "metric.cost_usd"?: number;
  "temporal.signal_key"?: string;
  "state.ui_snapshot_hash"?: string;
  "state.env_hash"?: string;
}

export interface AgentToolSpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  start_time_unix_nano: number;
  end_time_unix_nano: number;
  status: AgentToolSpanStatus;
  attributes: AgentToolSpanAttributes;
  events: AgentToolSpanEvent[];
}

// ── Evidence / RunResult inputs for proof-pack-builder ────────────────

export interface Evidence {
  type: "screenshot" | "video" | "log" | "metric";
  data: string;
  label?: string;
  timestamp?: number;
}

export interface RunResult {
  packKey: string;
  subject: { type: string; id: string };
  checks: Array<{ label: string; passed: boolean; note?: string }>;
  totalTokens: number;
  totalDurationMs: number;
  estimatedCostUsd: number;
  auditTrail: AuditTrailEntry[];
}

// ── Compliance mapping ───────────────────────────────────────────────

export interface ComplianceMapping {
  framework: string;
  controls: Array<{
    controlId: string;
    description: string;
    mappedChecks: string[];
    status: "covered" | "partial" | "uncovered";
  }>;
  coveragePercent: number;
}

// ── Spec validation result ───────────────────────────────────────────

export interface SpecValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkCount: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  estimatedRunTimeMs: number;
}
