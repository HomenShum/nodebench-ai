/**
 * telemetry feature — Agent trajectory visualization, context inspection, and eval scorecard.
 */

export { TrajectoryPanel } from "./TrajectoryPanel";
export type { TrajectoryPanelProps } from "./TrajectoryPanel";
export { createDemoContextBundle, ContextInspector } from "./ContextInspector";
export type { ContextInspectorProps } from "./ContextInspector";
export { createDemoEvalData, EvalScorecard } from "./EvalScorecard";
export type { EvalScorecardProps } from "./EvalScorecard";
export { ToolCoverageProof } from "./ToolCoverageProof";
export type { ToolCoverageProofProps } from "./ToolCoverageProof";
export { ContextualGraph } from "./ContextualGraph";
export type { ContextualGraphProps } from "./ContextualGraph";
export type {
  TrajectoryData,
  TrajectoryStep,
  TrajectoryStepStatus,
  ContextBundle,
  PinnedContextView,
  InjectedContextView,
  ArchivalPointerView,
  EvalRunResult,
  EvalScenarioResult,
  EvalScorecardData,
} from "./types";
