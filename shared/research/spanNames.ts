/**
 * Canonical span names for the Nodebench research runtime.
 *
 * Emit these via whichever tracer the environment uses (LangSmith, Arize
 * Phoenix via OTEL, Convex log tags). Keeping the names in one file means
 * the LangSmith evaluators and Phoenix queries see the same identifiers
 * regardless of where the span originated.
 *
 * Rule (telemetry_trajectory.md): evaluators should group by run_id +
 * span name; evaluator datasets key off these strings.
 */

export const SPAN_ROOT_SELECTION = "nb.root_selection";
export const SPAN_LENS_SELECTION = "nb.lens_selection";
export const SPAN_ENTITY_HYDRATION = "nb.entity_hydration";
export const SPAN_ANGLE_EXECUTION = "nb.angle_execution";
export const SPAN_CARD_EMISSION = "nb.card_emission";
export const SPAN_EVIDENCE_EMISSION = "nb.evidence_emission";
export const SPAN_ANSWER_STREAM = "nb.answer_stream";
export const SPAN_RESOURCE_EXPAND = "nb.resource_expand";

export const SPAN_NAMES = {
  root: SPAN_ROOT_SELECTION,
  lens: SPAN_LENS_SELECTION,
  hydration: SPAN_ENTITY_HYDRATION,
  angle: SPAN_ANGLE_EXECUTION,
  cards: SPAN_CARD_EMISSION,
  evidence: SPAN_EVIDENCE_EMISSION,
  answer: SPAN_ANSWER_STREAM,
  expand: SPAN_RESOURCE_EXPAND,
} as const;

/**
 * Canonical evaluator names. LangSmith + Phoenix register evaluators
 * against these strings so cross-tool leaderboards stay aligned.
 */
export const EVAL_ROOT_SELECTION_ACCURACY = "eval.root_selection_accuracy";
export const EVAL_CITATION_PRECISION = "eval.citation_precision";
export const EVAL_TIME_TO_FIRST_CARD = "eval.time_to_first_card_ms";
export const EVAL_DRILL_DOWN_QUALITY = "eval.drill_down_quality";

/** Latency budget slots used by timing gates. */
export const LATENCY_BUDGET = {
  requestAcceptMs: 200,
  rootsResolvedMs: 1_500,
  firstCardMs: 2_000,
  firstCitedAnswerMs: 6_000,
  ringExpansionCachedMs: 500,
  ringExpansionFreshMs: 2_000,
} as const;
