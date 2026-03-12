// ── Types ────────────────────────────────────────────────────────────
export type {
  // Judge results
  JudgeResult,
  VisualJudgeResult,
  VideoJudgeResult,
  VisualIssue,
  InteractionIssue,
  TextJudgeConfig,
  // SpecDoc
  SpecDoc,
  SpecCheck,
  SpecCheckResult,
  SpecCheckThreshold,
  SpecDocTarget,
  CheckCategory,
  VerificationMethod,
  ThresholdOperator,
  CheckStatus,
  Priority,
  SpecDocStatus,
  OverallVerdict,
  Environment,
  ComplianceFramework,
  // Validation
  SpecValidationResult,
  ComplianceMapping,
  // Proof pack
  ProofPackExport,
  ProofPackChecklist,
  ProofPackMetrics,
  AuditTrailEntry,
  RunResult,
  Evidence,
  // Telemetry
  CostEvent,
  CostSummary,
  // Trace
  AgentToolSpan,
  AgentToolSpanAttributes,
  AgentToolSpanEvent,
  AgentToolSpanStatus,
  Span,
  Trace,
  SpanEvent,
} from "./types.js";

// ── Errors ───────────────────────────────────────────────────────────
export {
  EvalError,
  JudgeTimeout,
  MalformedJudgeResponse,
  LLMApiError,
  SpecValidationError,
} from "./errors.js";

// ── Judges ───────────────────────────────────────────────────────────
export { evaluateText, evaluatePair, batchEvaluate } from "./judges/text-judge.js";
export { evaluateScreenshot, compareScreenshots } from "./judges/visual-judge.js";
export { evaluateVideoClip } from "./judges/video-judge.js";
export { callLLM, repairJson } from "./judges/llm-client.js";
export type { LLMCallOptions } from "./judges/llm-client.js";

// ── Parsers ──────────────────────────────────────────────────────────
export {
  validateSpecDoc,
  computePassRate,
  generateChecklistReport,
  mapToComplianceFramework,
} from "./parsers/spec-validator.js";
export {
  buildProofPack,
  exportAsMarkdown,
  exportAsPdfReady,
} from "./parsers/proof-pack-builder.js";

// ── Telemetry ────────────────────────────────────────────────────────
export {
  MODEL_PRICING,
  computeCost,
  trackCost,
  getSummary,
  resetTracker,
  getEvents,
} from "./telemetry/cost-tracker.js";
export type { ModelPricing } from "./telemetry/cost-tracker.js";
export {
  createTrace,
  startSpan,
  endSpan,
  addEvent,
  setAttribute,
  setTraceCost,
  exportTrace,
} from "./telemetry/trace-builder.js";
export {
  createAgentToolSpan,
  completeAgentToolSpan,
  instrumentAgentToolExecution,
  exportAgentToolSpan,
} from "./telemetry/agent-span.js";
