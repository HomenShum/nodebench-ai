export type AgentQuestionCategoryKey =
  | "trajectory_compounding"
  | "drift_detection"
  | "intervention_effectiveness"
  | "judgment_layer"
  | "trust_primitives"
  | "research_cell"
  | "operator_throughput"
  | "time_compounding_meta";

export interface AgentQuestionCategory {
  key: AgentQuestionCategoryKey;
  label: string;
  outputVariables: string[];
  matchers: string[];
}

export interface AgentResponseReviewDimensions {
  outputQuality: number;
  evidenceGrounding: number;
  actionability: number;
  temporalAwareness: number;
  trustPosture: number;
  compoundingFit: number;
  routingFit: number;
}

export interface AgentResponseReviewMetrics {
  charCount: number;
  lineCount: number;
  bulletCount: number;
  urlCount: number;
  markdownLinkCount: number;
  absoluteDateCount: number;
  codeRefCount: number;
  actionVerbCount: number;
  questionCount: number;
  citationSignalCount: number;
}

export interface AgentResponseReviewInput {
  prompt: string;
  response: string;
}

export interface AgentResponseReviewResult {
  matchedCategoryKeys: AgentQuestionCategoryKey[];
  status: "pass" | "watch" | "fail";
  overallScore: number;
  dimensions: AgentResponseReviewDimensions;
  metrics: AgentResponseReviewMetrics;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  issueFlags: string[];
  summary: string;
}

export interface AgentResponseFlywheelRecentFinding {
  reviewKey: string;
  messageId: string;
  promptSummary: string;
  status: "pass" | "watch" | "fail";
  overallScore: number;
  matchedCategoryKeys: AgentQuestionCategoryKey[];
  weaknesses: string[];
  recommendations: string[];
  reviewedAt: number;
}

export interface AgentResponseFlywheelSnapshot {
  summary: {
    totalReviews: number;
    passCount: number;
    watchCount: number;
    failCount: number;
    passRate: number;
    averageOverallScore: number;
    weakestDimension:
      | {
          key: keyof AgentResponseReviewDimensions;
          label: string;
          averageScore: number;
        }
      | null;
    strongestDimension:
      | {
          key: keyof AgentResponseReviewDimensions;
          label: string;
          averageScore: number;
        }
      | null;
    hottestQuestionCategory:
      | {
          key: AgentQuestionCategoryKey;
          label: string;
          count: number;
        }
      | null;
    latestReviewedAt: number | null;
  };
  dimensions: Array<{
    key: keyof AgentResponseReviewDimensions;
    label: string;
    averageScore: number;
    status: "strong" | "watch" | "weak";
  }>;
  categories: Array<{
    key: AgentQuestionCategoryKey;
    label: string;
    count: number;
    outputVariables: string[];
  }>;
  recentFindings: AgentResponseFlywheelRecentFinding[];
}

export interface AgentResponseReviewAggregateRow {
  reviewKey: string;
  messageId: string;
  promptSummary: string;
  status: "pass" | "watch" | "fail";
  overallScore: number;
  matchedCategoryKeys: AgentQuestionCategoryKey[];
  outputQualityScore: number;
  evidenceGroundingScore: number;
  actionabilityScore: number;
  temporalAwarenessScore: number;
  trustPostureScore: number;
  compoundingFitScore: number;
  routingFitScore: number;
  weaknesses: string[];
  recommendations: string[];
  reviewedAt: number;
}

export const AGENT_QUESTION_CATALOG: AgentQuestionCategory[] = [
  {
    key: "trajectory_compounding",
    label: "Trajectory Compounding",
    outputVariables: [
      "spanQuality",
      "evidenceCompleteness",
      "adaptationVelocity",
      "trustLeverage",
      "interventionEffect",
      "drift",
      "rawCompounding",
      "trustAdjustedCompounding",
    ],
    matchers: ["trajectory", "compounding", "compound", "score", "trend", "improving"],
  },
  {
    key: "drift_detection",
    label: "Drift Detection",
    outputVariables: ["driftPressure", "errorSpanRatio", "feedbackPositiveRatio"],
    matchers: ["drift", "degrade", "regress", "slip", "plateau", "stale"],
  },
  {
    key: "intervention_effectiveness",
    label: "Intervention Effectiveness",
    outputVariables: [
      "interventionSuccessRatio",
      "averageInterventionUplift",
      "benchmarkImprovementRatio",
    ],
    matchers: ["intervention", "uplift", "benchmark", "delta", "improve after", "what changed"],
  },
  {
    key: "judgment_layer",
    label: "Judgment Layer",
    outputVariables: ["preExecutionGate", "consistencyIndex", "evolutionVerification"],
    matchers: ["should we act", "gate", "judge", "disqualifier", "rubric", "consistency"],
  },
  {
    key: "trust_primitives",
    label: "Trust Primitives",
    outputVariables: ["passport", "intentLedger", "actionReceipts", "delegationGraph", "trustLeverage"],
    matchers: ["trust", "authority", "approval", "passport", "receipt", "delegation"],
  },
  {
    key: "research_cell",
    label: "Research Cell",
    outputVariables: ["confidence", "evidenceLinkage", "branchResults", "factCheckStatus"],
    matchers: ["research", "investigate", "confidence", "evidence", "verify", "sources"],
  },
  {
    key: "operator_throughput",
    label: "Operator Throughput",
    outputVariables: [
      "taskCompletionRate",
      "timeToFirstDraftMs",
      "humanEditDistance",
      "wallClockMs",
      "toolCallCount",
    ],
    matchers: ["throughput", "latency", "draft", "edit distance", "tool calls", "speed"],
  },
  {
    key: "time_compounding_meta",
    label: "Time-Compounding Meta",
    outputVariables: [
      "outputQuality",
      "temporalAdaptation",
      "networkPosition",
      "trustConversion",
      "compoundingSignal",
    ],
    matchers: ["over time", "learn", "adapt", "network", "trust conversion", "success"],
  },
];

const DIMENSION_LABELS: Record<keyof AgentResponseReviewDimensions, string> = {
  outputQuality: "Output Quality",
  evidenceGrounding: "Evidence Grounding",
  actionability: "Actionability",
  temporalAwareness: "Temporal Awareness",
  trustPosture: "Trust Posture",
  compoundingFit: "Compounding Fit",
  routingFit: "Routing Fit",
};

const ACTION_VERBS = [
  "add",
  "build",
  "compare",
  "create",
  "document",
  "enforce",
  "fix",
  "implement",
  "improve",
  "measure",
  "record",
  "review",
  "run",
  "ship",
  "test",
  "update",
  "verify",
  "wire",
];

const MONTH_PATTERN =
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},\s+\d{4}\b/gi;
const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;
const URL_PATTERN = /https?:\/\/[^\s)]+/gi;
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\([^)]+\)/g;
const CODE_REF_PATTERN =
  /\b[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|md|json|mjs|cjs|yml|yaml|css|html)(?::\d+(?::\d+)?)?\b/g;
const BULLET_PATTERN = /^\s*(?:[-*]|\d+\.)\s+/gm;
const CITATION_SIGNAL_PATTERN = /\b(?:source|sources|citation|citations|proof|evidence|verified|link)\b/gi;
const QUESTION_PATTERN = /\?/g;

function clamp(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function roundScore(value: number): number {
  return Math.round(clamp(value) * 1000) / 1000;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return roundScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches?.length ?? 0;
}

function hasAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value));
}

function summarizePrompt(prompt: string): string {
  const normalized = prompt.trim().replace(/\s+/g, " ");
  if (normalized.length <= 140) {
    return normalized;
  }
  return `${normalized.slice(0, 137).trimEnd()}...`;
}

export function classifyQuestionCategories(
  prompt: string,
  response: string,
): AgentQuestionCategoryKey[] {
  const haystack = `${prompt}\n${response}`.toLowerCase();
  const matched = AGENT_QUESTION_CATALOG.filter((category) =>
    category.matchers.some((matcher) => haystack.includes(matcher)),
  ).map((category) => category.key);

  if (matched.length > 0) {
    return matched;
  }
  return ["time_compounding_meta"];
}

export function reviewAgentResponse(
  input: AgentResponseReviewInput,
): AgentResponseReviewResult {
  const prompt = input.prompt.trim();
  const response = input.response.trim();
  const promptLower = prompt.toLowerCase();
  const responseLower = response.toLowerCase();
  const matchedCategoryKeys = classifyQuestionCategories(prompt, response);

  const metrics: AgentResponseReviewMetrics = {
    charCount: response.length,
    lineCount: response.length === 0 ? 0 : response.split(/\r?\n/).length,
    bulletCount: countMatches(response, BULLET_PATTERN),
    urlCount: countMatches(response, URL_PATTERN),
    markdownLinkCount: countMatches(response, MARKDOWN_LINK_PATTERN),
    absoluteDateCount: countMatches(response, MONTH_PATTERN) + countMatches(response, ISO_DATE_PATTERN),
    codeRefCount: countMatches(response, CODE_REF_PATTERN),
    actionVerbCount: ACTION_VERBS.filter((verb) =>
      new RegExp(`\\b${verb}\\b`, "i").test(responseLower),
    ).length,
    questionCount: countMatches(response, QUESTION_PATTERN),
    citationSignalCount: countMatches(response, CITATION_SIGNAL_PATTERN),
  };

  const asksForFreshness =
    hasAny(promptLower, ["latest", "today", "current", "recent", "released", "release", "this week"]) ||
    hasAny(promptLower, ["look up", "search", "web", "browse", "verify"]);
  const asksForEvidence =
    asksForFreshness ||
    hasAny(promptLower, ["source", "sources", "proof", "citation", "citations", "verify"]);
  const asksForImplementation = hasAny(promptLower, [
    "implement",
    "fix",
    "build",
    "wire",
    "design",
    "add",
    "spot fix",
    "deep fix",
  ]);
  const asksForCodeContext = hasAny(promptLower, [
    "repo",
    "codebase",
    "code",
    "screen",
    "frontend",
    "convex",
    "oracle",
    "file",
  ]);
  const asksForGrowthLoop = hasAny(promptLower, [
    "compounding",
    "loop",
    "grow",
    "success",
    "trajectory",
    "drift",
    "intervention",
  ]);

  const conciseDirectOpening =
    !/^(got it|great question|understood|sure|okay|absolutely)\b/i.test(responseLower) &&
    response.length > 0;
  const hasStructure = metrics.bulletCount > 0 || /\n\*\*[^*]+\*\*/.test(response) || metrics.lineCount >= 3;
  const hasEvidenceLinks = metrics.urlCount + metrics.markdownLinkCount > 0;
  const hasAbsoluteDates = metrics.absoluteDateCount > 0;
  const hasCodeRefs = metrics.codeRefCount > 0;
  const hasConcreteNextAction =
    /(?:next step|next recommended action|i can|we should|run |add |build |wire |fix |implement )/i.test(
      response,
    ) || metrics.actionVerbCount >= 3;
  const hasTrustSignals =
    /(?:passed|failed|verified|could not|i did not|i wasn't able|watch|risk|caveat)/i.test(response);
  const hasTrendLanguage = /(?:trend|over time|week over week|month over month|trajectory|compounding|drift)/i.test(
    response,
  );

  const dimensions: AgentResponseReviewDimensions = {
    outputQuality: average([
      conciseDirectOpening ? 1 : 0.35,
      response.length >= 220 ? 1 : response.length >= 120 ? 0.7 : response.length >= 60 ? 0.45 : 0.15,
      hasStructure ? 1 : 0.45,
      asksForCodeContext ? (hasCodeRefs ? 1 : 0.35) : 0.8,
    ]),
    evidenceGrounding: average([
      asksForEvidence ? (hasEvidenceLinks ? 1 : 0.2) : 0.75,
      asksForFreshness ? (hasAbsoluteDates ? 1 : 0.15) : 0.75,
      asksForEvidence ? (metrics.citationSignalCount > 0 ? 1 : 0.35) : 0.75,
    ]),
    actionability: average([
      asksForImplementation ? (hasConcreteNextAction ? 1 : 0.25) : 0.75,
      hasStructure ? 0.9 : 0.45,
      metrics.actionVerbCount >= 2 ? 1 : metrics.actionVerbCount === 1 ? 0.7 : 0.3,
    ]),
    temporalAwareness: average([
      asksForFreshness ? (hasAbsoluteDates ? 1 : 0.1) : 0.8,
      asksForGrowthLoop ? (hasTrendLanguage ? 1 : 0.35) : 0.8,
      /(?:as of|today|currently|window|last \d+ days|last \d+ weeks)/i.test(response) ? 1 : asksForFreshness ? 0.3 : 0.75,
    ]),
    trustPosture: average([
      hasTrustSignals ? 1 : 0.45,
      asksForEvidence ? (hasEvidenceLinks ? 1 : 0.25) : 0.75,
      /(?:uncertain|assumption|inference|blocked|risk|caution|verified)/i.test(response) ? 1 : 0.55,
    ]),
    compoundingFit: average([
      asksForGrowthLoop ? (hasTrendLanguage ? 1 : 0.25) : 0.75,
      matchedCategoryKeys.length >= 2 ? 1 : 0.7,
      /(?:feedback|adapt|rejudge|re-examin|loop|intervention|measure)/i.test(response) ? 1 : 0.4,
    ]),
    routingFit: average([
      matchedCategoryKeys.length >= 2 ? 1 : matchedCategoryKeys.length === 1 ? 0.7 : 0.2,
      asksForCodeContext ? (hasCodeRefs ? 1 : 0.35) : 0.8,
      asksForEvidence ? (hasEvidenceLinks || hasAbsoluteDates ? 1 : 0.2) : 0.8,
    ]),
  };

  const overallScore = average([
    dimensions.outputQuality,
    dimensions.evidenceGrounding,
    dimensions.actionability,
    dimensions.temporalAwareness,
    dimensions.trustPosture,
    dimensions.compoundingFit,
    dimensions.routingFit,
  ]);

  const issueFlags: string[] = [];
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const recommendations: string[] = [];

  if (dimensions.outputQuality >= 0.8) {
    strengths.push("Response structure is readable and starts directly.");
  } else {
    issueFlags.push("output_quality_gap");
    weaknesses.push("The response is not consistently direct, structured, or concrete enough.");
    recommendations.push("Lead with the answer, then organize the rest into concrete sections or bullets.");
  }

  if (dimensions.evidenceGrounding >= 0.8) {
    strengths.push("Evidence handling is strong for the question type.");
  } else if (asksForEvidence || asksForFreshness) {
    issueFlags.push("evidence_gap");
    weaknesses.push("The response does not ground enough claims with links, citations, or dated freshness markers.");
    recommendations.push("Add source links and absolute dates whenever the prompt is freshness-sensitive or asks for verification.");
  }

  if (dimensions.actionability >= 0.8) {
    strengths.push("The answer gives the operator clear next actions.");
  } else if (asksForImplementation) {
    issueFlags.push("actionability_gap");
    weaknesses.push("The implementation guidance is not specific enough to act on immediately.");
    recommendations.push("State the concrete next step, expected verification, and where the change belongs.");
  }

  if (dimensions.temporalAwareness < 0.65) {
    issueFlags.push("temporal_awareness_gap");
    weaknesses.push("Time-sensitive prompts are not being answered with enough absolute-date discipline or trend framing.");
    recommendations.push("Use absolute dates and explicit review windows whenever the prompt is time-sensitive or trend-oriented.");
  } else {
    strengths.push("Time and trend framing is present where it matters.");
  }

  if (dimensions.trustPosture < 0.65) {
    issueFlags.push("trust_posture_gap");
    weaknesses.push("The response is too certain or does not expose verification boundaries clearly enough.");
    recommendations.push("State what was verified, what remains inferred, and what could not be completed.");
  }

  if (dimensions.compoundingFit < 0.7 && asksForGrowthLoop) {
    issueFlags.push("compounding_fit_gap");
    weaknesses.push("The answer does not connect the immediate recommendation back to feedback loops, interventions, and long-term growth.");
    recommendations.push("Tie loop advice to repeated measurement, intervention tracking, and re-judging over time.");
  }

  if (dimensions.routingFit < 0.7) {
    issueFlags.push("routing_gap");
    weaknesses.push("The response is not tightly routed to the system's existing variable outputs and question families.");
    recommendations.push("Answer through the relevant scorecards, gates, trust primitives, or throughput metrics instead of generic prose.");
  } else {
    strengths.push("The answer routes through the right system primitives for the prompt.");
  }

  const status: "pass" | "watch" | "fail" =
    overallScore >= 0.78 ? "pass" : overallScore >= 0.58 ? "watch" : "fail";

  const strongestDimension = Object.entries(dimensions).sort((a, b) => b[1] - a[1])[0];
  const weakestDimension = Object.entries(dimensions).sort((a, b) => a[1] - b[1])[0];
  const summary = `Reviewed ${metrics.charCount} chars across ${matchedCategoryKeys.length} routed question lanes. Strongest: ${DIMENSION_LABELS[strongestDimension[0] as keyof AgentResponseReviewDimensions]} (${Math.round(strongestDimension[1] * 100)}%). Weakest: ${DIMENSION_LABELS[weakestDimension[0] as keyof AgentResponseReviewDimensions]} (${Math.round(weakestDimension[1] * 100)}%).`;

  return {
    matchedCategoryKeys,
    status,
    overallScore,
    dimensions,
    metrics,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    recommendations: recommendations.slice(0, 4),
    issueFlags,
    summary,
  };
}

export function summarizeResponseReviews(
  rows: AgentResponseReviewAggregateRow[],
): AgentResponseFlywheelSnapshot {
  if (rows.length === 0) {
    return {
      summary: {
        totalReviews: 0,
        passCount: 0,
        watchCount: 0,
        failCount: 0,
        passRate: 0,
        averageOverallScore: 0,
        weakestDimension: null,
        strongestDimension: null,
        hottestQuestionCategory: null,
        latestReviewedAt: null,
      },
      dimensions: Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
        key: key as keyof AgentResponseReviewDimensions,
        label,
        averageScore: 0,
        status: "weak" as const,
      })),
      categories: AGENT_QUESTION_CATALOG.map((category) => ({
        key: category.key,
        label: category.label,
        count: 0,
        outputVariables: category.outputVariables,
      })),
      recentFindings: [],
    };
  }

  const passCount = rows.filter((row) => row.status === "pass").length;
  const watchCount = rows.filter((row) => row.status === "watch").length;
  const failCount = rows.filter((row) => row.status === "fail").length;

  const dimensionEntries: Array<[keyof AgentResponseReviewDimensions, string, number]> = [
    ["outputQuality", DIMENSION_LABELS.outputQuality, average(rows.map((row) => row.outputQualityScore))],
    ["evidenceGrounding", DIMENSION_LABELS.evidenceGrounding, average(rows.map((row) => row.evidenceGroundingScore))],
    ["actionability", DIMENSION_LABELS.actionability, average(rows.map((row) => row.actionabilityScore))],
    ["temporalAwareness", DIMENSION_LABELS.temporalAwareness, average(rows.map((row) => row.temporalAwarenessScore))],
    ["trustPosture", DIMENSION_LABELS.trustPosture, average(rows.map((row) => row.trustPostureScore))],
    ["compoundingFit", DIMENSION_LABELS.compoundingFit, average(rows.map((row) => row.compoundingFitScore))],
    ["routingFit", DIMENSION_LABELS.routingFit, average(rows.map((row) => row.routingFitScore))],
  ];

  const sortedDimensions = [...dimensionEntries].sort((a, b) => a[2] - b[2]);
  const categoryCounts = new Map<AgentQuestionCategoryKey, number>();
  for (const row of rows) {
    for (const key of row.matchedCategoryKeys) {
      categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1);
    }
  }

  const hottestCategoryEntry = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
  const hottestQuestionCategory = hottestCategoryEntry
    ? {
        key: hottestCategoryEntry[0],
        label: AGENT_QUESTION_CATALOG.find((category) => category.key === hottestCategoryEntry[0])?.label ?? hottestCategoryEntry[0],
        count: hottestCategoryEntry[1],
      }
    : null;

  return {
    summary: {
      totalReviews: rows.length,
      passCount,
      watchCount,
      failCount,
      passRate: roundScore(passCount / rows.length),
      averageOverallScore: average(rows.map((row) => row.overallScore)),
      weakestDimension: {
        key: sortedDimensions[0][0],
        label: sortedDimensions[0][1],
        averageScore: sortedDimensions[0][2],
      },
      strongestDimension: {
        key: sortedDimensions[sortedDimensions.length - 1][0],
        label: sortedDimensions[sortedDimensions.length - 1][1],
        averageScore: sortedDimensions[sortedDimensions.length - 1][2],
      },
      hottestQuestionCategory,
      latestReviewedAt: rows[0]?.reviewedAt ?? null,
    },
    dimensions: dimensionEntries.map(([key, label, averageScore]) => ({
      key,
      label,
      averageScore,
      status: averageScore >= 0.78 ? "strong" : averageScore >= 0.58 ? "watch" : "weak",
    })),
    categories: AGENT_QUESTION_CATALOG.map((category) => ({
      key: category.key,
      label: category.label,
      count: categoryCounts.get(category.key) ?? 0,
      outputVariables: category.outputVariables,
    })),
    recentFindings: rows.slice(0, 6).map((row) => ({
      reviewKey: row.reviewKey,
      messageId: row.messageId,
      promptSummary: summarizePrompt(row.promptSummary),
      status: row.status,
      overallScore: row.overallScore,
      matchedCategoryKeys: row.matchedCategoryKeys,
      weaknesses: row.weaknesses,
      recommendations: row.recommendations,
      reviewedAt: row.reviewedAt,
    })),
  };
}
