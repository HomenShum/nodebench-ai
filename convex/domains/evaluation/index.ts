/**
 * Evaluation Module Index
 *
 * Exports all evaluation functionality for agent testing
 */

// Ground truth data
export {
  PERSONAS,
  PERSONA_REQUIREMENTS,
  GROUND_TRUTH_ENTITIES,
  TEST_QUERIES,
  getEntityById,
  getQueriesForPersona,
  getQueriesForEntity,
  type Persona,
  type GroundTruthEntity,
  type TestQuery,
} from "./groundTruth";

// Boolean evaluator
export {
  evaluateResponse,
  summarizeResults,
  type BooleanFactors,
  type EvaluationResult,
  type EvaluationSummary,
} from "./booleanEvaluator";

// Evaluation harness configuration
export {
  PASSING_THRESHOLD,
  PERSONA_THRESHOLDS,
} from "./evalHarness";

// Evaluation harness actions
export {
  evaluateSingleQueryMock,
  evaluateAllQueriesMock,
  evaluateSingleQueryLive,
  evaluateBatchLive,
  getTestQueries,
  getGroundTruthEntities,
} from "./evalHarness";

// Live evaluation actions (anonymous + authenticated)
export {
  runSingleEvalAnonymous,
  runBatchEvalAuthenticated,
  quickEval,
} from "./liveEval";

// Evaluation run tracking (mutations + queries)
export {
  createEvalRun,
  updateEvalRun,
  completeEvalRun,
  getEvalRunStatus,
  getRecentEvalRuns,
} from "./evalRunTracking";
