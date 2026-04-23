#!/usr/bin/env npx tsx

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { ConvexHttpClient } from "convex/browser";

type EvalScenario = {
  id: string;
  label: string;
  mode: "fast" | "slow";
  query: string;
  entitySlugHint?: string;
  packet: {
    entityName?: string;
    classification?: string;
    answer?: string;
    answerBlocks?: Array<{
      id: string;
      title: string;
      text: string;
      sourceRefIds?: string[];
    }>;
    whyItMatters?: string;
    uncertaintyBoundary?: string;
    recommendedNextAction?: string;
    sourceRefs: Array<{
      id: string;
      label: string;
      title: string;
      href: string;
      domain: string;
      excerpt: string;
      publishedAt: string;
    }>;
  };
  expected: {
    resolutionState: "exact" | "probable" | "ambiguous" | "unresolved";
    artifactState: "none" | "draft" | "saved" | "published";
    saveEligibility: "blocked" | "draft_only" | "save_ready" | "publish_ready";
    entitySlug: string | null;
    reportCreated: boolean;
    requiredInterruptKinds?: string[];
    minimumCandidates?: number;
    minimumPublishableClaims?: number;
    minimumCorroboratedClaims?: number;
    minimumContradictedClaims?: number;
    requiresCompiledTruth?: boolean;
    requiresActions?: boolean;
  };
};

type ScenarioCheckMap = Record<string, boolean>;

type ScenarioResult = {
  id: string;
  label: string;
  mode: "fast" | "slow";
  elapsedMs: number;
  expected: EvalScenario["expected"];
  actual: {
    resolutionState: string | null;
    artifactState: string | null;
    saveEligibility: string | null;
    resolvedEntitySlug: string | null;
    reportCreated: boolean;
    candidateCount: number;
    pendingInterruptKinds: string[];
    runEventKinds: string[];
    sourceEventCount: number;
    reportSourceCount: number;
    publishableClaims: number;
    corroboratedClaims: number;
    contradictedClaims: number;
    compiledTruthSentences: number;
    actionCount: number;
  };
  checks: ScenarioCheckMap;
  rationales: Record<string, string>;
  overallGatePass: boolean;
};

type AnswerControlEvalSummary = {
  total: number;
  passed: number;
  passRate: number;
  dimensions: Record<
    string,
    {
      passed: number;
      total: number;
      passRate: number;
    }
  >;
  thresholds: {
    entity_resolution: number;
    claim_support: number;
    trajectory_quality: number;
    actionability: number;
    artifact_decision_quality: number;
    ambiguity_recovery: number;
  };
  gateStatus: {
    entity_resolution: boolean;
    claim_support: boolean;
    trajectory_quality: boolean;
    actionability: boolean;
    artifact_decision_quality: boolean;
    ambiguity_recovery: boolean;
  };
};

const { values: args } = parseArgs({
  options: {
    url: { type: "string" },
    jsonOut: { type: "string" },
  },
});

function loadConvexUrl() {
  if (args.url) return args.url;
  if (process.env.CONVEX_URL) return process.env.CONVEX_URL;
  if (process.env.VITE_CONVEX_URL) return process.env.VITE_CONVEX_URL;
  try {
    const envPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../.env.local",
    );
    const text = readFileSync(envPath, "utf8");
    const match = text.match(/VITE_CONVEX_URL="?([^"\n]+)"?/);
    if (match) return match[1];
  } catch {
    // ignore
  }
  throw new Error(
    "CONVEX_URL not set. Pass --url or set VITE_CONVEX_URL in .env.local",
  );
}

function percent(passed: number, total: number) {
  if (total <= 0) return 0;
  return Number(((passed / total) * 100).toFixed(1));
}

function timestampFileSafe(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function makePacketSource(
  slug: string,
  source: string,
  ageDays: number,
  excerpt: string,
) {
  const publishedAt = new Date(
    Date.now() - ageDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  return {
    id: `${slug}:${source}`,
    label: `${slug} ${source}`,
    title: `${slug} ${source}`,
    href: `https://example.com/${slug}/${source}`,
    domain: "example.com",
    excerpt,
    publishedAt,
  };
}

const SCENARIOS: EvalScenario[] = [
  {
    id: "exact_save_ready_softbank",
    label: "Exact target promotes to save-ready",
    mode: "fast",
    query: "What is SoftBank and what matters most right now?",
    entitySlugHint: "softbank",
    packet: {
      entityName: "SoftBank",
      classification: "company",
      answer: "SoftBank is a telecom and investment holding company.",
      answerBlocks: [
        {
          id: "answer:block:summary",
          title: "What it is",
          text: "SoftBank is a telecom and investment holding company.",
          sourceRefIds: ["softbank:official", "softbank:market-update"],
        },
        {
          id: "answer:block:why",
          title: "Why it matters",
          text: "SoftBank's capital allocation affects AI infrastructure bets across the market.",
          sourceRefIds: ["softbank:official", "softbank:market-update"],
        },
        {
          id: "answer:block:gaps",
          title: "What is missing",
          text: "The current packet does not resolve every portfolio exposure.",
          sourceRefIds: ["softbank:market-update"],
        },
      ],
      whyItMatters:
        "SoftBank's capital allocation affects AI infrastructure bets across the market.",
      uncertaintyBoundary:
        "The current packet does not resolve every portfolio exposure.",
      recommendedNextAction:
        "Open the report and compare current capital allocation signals against prior notes.",
      sourceRefs: [
        makePacketSource(
          "softbank",
          "official",
          2,
          "SoftBank is a telecom and investment holding company.",
        ),
        makePacketSource(
          "softbank",
          "market-update",
          5,
          "SoftBank's capital allocation affects AI infrastructure bets.",
        ),
      ],
    },
    expected: {
      resolutionState: "exact",
      artifactState: "saved",
      saveEligibility: "save_ready",
      entitySlug: "softbank",
      reportCreated: true,
      minimumPublishableClaims: 2,
      minimumCorroboratedClaims: 1,
      requiresCompiledTruth: true,
      requiresActions: true,
    },
  },
  {
    id: "probable_draft_vitalize",
    label: "Probable target stays draft-only",
    mode: "fast",
    query: "What is Vitalize and what matters right now?",
    packet: {
      entityName: "Vitalize",
      classification: "company",
      answer: "Vitalize is a healthcare startup.",
      whyItMatters:
        "Vitalize is still early, so the current brief should stay in draft mode.",
      uncertaintyBoundary:
        "The packet only contains one external source and needs broader support.",
      recommendedNextAction:
        "Save the draft and continue research before treating it as canonical.",
      sourceRefs: [
        makePacketSource(
          "vitalize",
          "profile",
          3,
          "Vitalize is a healthcare startup.",
        ),
      ],
    },
    expected: {
      resolutionState: "probable",
      artifactState: "draft",
      saveEligibility: "draft_only",
      entitySlug: "vitalize",
      reportCreated: true,
      requiredInterruptKinds: ["quality_gate_blocked_save"],
      minimumPublishableClaims: 1,
      requiresCompiledTruth: true,
      requiresActions: true,
    },
  },
  {
    id: "ambiguous_blocked_tell",
    label: "Ambiguous target blocks artifact creation",
    mode: "fast",
    query: "What is Tell Health and what matters most right now?",
    packet: {
      entityName: "Tell.com",
      classification: "company",
      answer: "Tell.com is a communications company.",
      whyItMatters:
        "Tell Health is a separate company, so this thread needs clarification.",
      uncertaintyBoundary:
        "Multiple entities with overlapping names are present in the current packet.",
      recommendedNextAction:
        "Choose the right company before any artifact is saved.",
      sourceRefs: [
        makePacketSource(
          "tell-health",
          "health",
          7,
          "Tell Health operates in the healthcare workflow market.",
        ),
        makePacketSource(
          "tell-com",
          "communications",
          8,
          "Tell.com is a communications company.",
        ),
      ],
    },
    expected: {
      resolutionState: "ambiguous",
      artifactState: "none",
      saveEligibility: "blocked",
      entitySlug: null,
      reportCreated: false,
      requiredInterruptKinds: [
        "entity_disambiguation_required",
        "quality_gate_blocked_save",
      ],
      minimumCandidates: 2,
      requiresActions: true,
    },
  },
  {
    id: "unresolved_follow_up",
    label: "Conversational follow-up stays chat-only",
    mode: "fast",
    query: "Tell me more about the job and company",
    packet: {
      classification: "job",
      answer: "The packet is too generic to resolve a stable company target.",
      whyItMatters:
        "NodeBench should stay in chat mode until the user clarifies the company.",
      uncertaintyBoundary:
        "No stable entity is present in the request or packet.",
      recommendedNextAction:
        "Ask a follow-up question or paste the job/company URL.",
      sourceRefs: [
        makePacketSource(
          "generic-job",
          "summary",
          1,
          "The packet is too generic to resolve a stable company target.",
        ),
      ],
    },
    expected: {
      resolutionState: "unresolved",
      artifactState: "none",
      saveEligibility: "blocked",
      entitySlug: null,
      reportCreated: false,
      requiredInterruptKinds: [
        "missing_required_context",
        "quality_gate_blocked_save",
      ],
      requiresActions: true,
    },
  },
  {
    id: "exact_conflict_softbank",
    label: "Exact target with contradictory claims stays draft",
    mode: "slow",
    query: "What is SoftBank and what matters most right now?",
    entitySlugHint: "softbank",
    packet: {
      entityName: "SoftBank",
      classification: "company",
      answer: "SoftBank is headquartered in Tokyo.",
      answerBlocks: [
        {
          id: "answer:block:summary",
          title: "What it is",
          text: "SoftBank is headquartered in Tokyo.",
          sourceRefIds: ["softbank-conflict:tokyo", "softbank-conflict:london"],
        },
        {
          id: "answer:block:why",
          title: "Why it matters",
          text: "SoftBank is based in London for its operating headquarters.",
          sourceRefIds: ["softbank-conflict:tokyo", "softbank-conflict:london"],
        },
        {
          id: "answer:block:gaps",
          title: "What is missing",
          text: "The current packet includes conflicting headquarters signals that must remain in uncertainty.",
          sourceRefIds: ["softbank-conflict:tokyo", "softbank-conflict:london"],
        },
      ],
      whyItMatters:
        "SoftBank is based in London for its operating headquarters.",
      uncertaintyBoundary:
        "The current packet includes conflicting headquarters signals that must remain in uncertainty.",
      recommendedNextAction:
        "Keep the run in draft mode until the headquarters conflict is resolved.",
      sourceRefs: [
        makePacketSource(
          "softbank-conflict",
          "tokyo",
          2,
          "SoftBank is headquartered in Tokyo.",
        ),
        makePacketSource(
          "softbank-conflict",
          "london",
          3,
          "SoftBank is based in London for its operating headquarters.",
        ),
      ],
    },
    expected: {
      resolutionState: "exact",
      artifactState: "draft",
      saveEligibility: "draft_only",
      entitySlug: "softbank",
      reportCreated: true,
      requiredInterruptKinds: [
        "conflicting_evidence_detected",
        "quality_gate_blocked_save",
      ],
      minimumContradictedClaims: 2,
      requiresCompiledTruth: true,
      requiresActions: true,
    },
  },
];

function requiredRunEventKinds() {
  return [
    "run_started",
    "intent_classified",
    "entity_candidates_ranked",
    "entity_resolution_finalized",
    "evidence_collected",
    "claims_extracted",
    "artifact_state_changed",
    "run_completed",
  ];
}

function extractActionCount(sessionResult: any, report: any) {
  const persistedActions = Array.isArray(report?.compiledAnswerV2?.actions)
    ? report.compiledAnswerV2.actions
    : [];
  if (persistedActions.length > 0) return persistedActions.length;
  const latestActionEvent = Array.isArray(sessionResult?.runEvents)
    ? [...sessionResult.runEvents]
        .filter((event: any) => event?.kind === "actions_compiled")
        .sort((left: any, right: any) => Number(right?.createdAt ?? 0) - Number(left?.createdAt ?? 0))[0]
    : null;
  const actions = Array.isArray(latestActionEvent?.payload?.actions)
    ? latestActionEvent.payload.actions
    : [];
  return actions.length;
}

function extractCompiledTruthSentenceCount(report: any) {
  if (!Array.isArray(report?.compiledAnswerV2?.truthSections)) return 0;
  return report.compiledAnswerV2.truthSections.reduce(
    (total: number, section: any) =>
      total + (Array.isArray(section?.sentences) ? section.sentences.length : 0),
    0,
  );
}

async function runScenario(
  client: ConvexHttpClient,
  scenario: EvalScenario,
): Promise<ScenarioResult> {
  const anonymousSessionId = `answer-control-${scenario.id}-${Date.now()}`;
  const startedAt = performance.now();

  const started = await client.mutation("domains/product/chat:startSession", {
    anonymousSessionId,
    query: scenario.query,
    lens: "investor",
  });

  const completed = await client.mutation("domains/product/chat:completeSession", {
    anonymousSessionId,
    sessionId: started.sessionId,
    packet: scenario.packet,
    entitySlugHint: scenario.entitySlugHint,
    totalDurationMs: 1400,
  });

  const sessionResult = await client.query("domains/product/chat:getSession", {
    anonymousSessionId,
    sessionId: started.sessionId,
  });

  const report =
    completed?.reportId && scenario.expected.reportCreated
      ? await client.query("domains/product/reports:getReport", {
          anonymousSessionId,
          reportId: completed.reportId,
        })
      : null;

  const actualResolution =
    sessionResult?.session?.resolutionState ?? completed?.resolutionState ?? null;
  const actualArtifact =
    sessionResult?.session?.artifactState ?? completed?.artifactState ?? null;
  const actualSaveEligibility =
    sessionResult?.session?.saveEligibility ?? completed?.saveEligibility ?? null;
  const actualEntitySlug =
    sessionResult?.session?.resolvedEntitySlug ??
    report?.entitySlug ??
    completed?.entitySlug ??
    null;
  const pendingInterruptKinds = Array.isArray(sessionResult?.interrupts)
    ? sessionResult.interrupts
        .filter((interrupt: any) => interrupt?.status === "pending")
        .map((interrupt: any) =>
          typeof interrupt?.arguments?.kind === "string"
            ? interrupt.arguments.kind
            : String(interrupt?.toolName ?? "unknown"),
        )
    : [];
  const runEventKinds = Array.isArray(sessionResult?.runEvents)
    ? sessionResult.runEvents.map((event: any) => String(event?.kind ?? "unknown"))
    : [];
  const reportQuality = report?.qualityGateSummary ?? sessionResult?.claimSummary ?? null;
  const checks: ScenarioCheckMap = {
    entity_resolution:
      actualResolution === scenario.expected.resolutionState &&
      actualEntitySlug === scenario.expected.entitySlug,
    retrieval_relevance:
      Number(sessionResult?.sourceEvents?.length ?? 0) >= scenario.packet.sourceRefs.length &&
      (!scenario.expected.reportCreated ||
        Number(report?.sources?.length ?? 0) >= scenario.packet.sourceRefs.length),
    claim_support:
      Number(reportQuality?.totalClaims ?? 0) > 0 &&
      Number(reportQuality?.publishableClaims ?? 0) >=
        Number(scenario.expected.minimumPublishableClaims ?? 0) &&
      Number(reportQuality?.corroboratedClaims ?? 0) >=
        Number(scenario.expected.minimumCorroboratedClaims ?? 0) &&
      Number(reportQuality?.contradictedClaims ?? 0) >=
        Number(scenario.expected.minimumContradictedClaims ?? 0),
    final_response_quality:
      scenario.expected.requiresCompiledTruth
        ? extractCompiledTruthSentenceCount(report) > 0
        : pendingInterruptKinds.length > 0 || (sessionResult?.resolutionCandidates?.length ?? 0) > 0,
    trajectory_quality: requiredRunEventKinds().every((kind) =>
      runEventKinds.includes(kind),
    ),
    actionability:
      extractActionCount(sessionResult, report) > 0 ||
      pendingInterruptKinds.length > 0 ||
      (sessionResult?.resolutionCandidates?.length ?? 0) > 0,
    artifact_decision_quality:
      actualArtifact === scenario.expected.artifactState &&
      actualSaveEligibility === scenario.expected.saveEligibility &&
      Boolean(completed?.reportId) === scenario.expected.reportCreated,
    ambiguity_recovery:
      scenario.expected.resolutionState === "ambiguous" ||
      scenario.expected.resolutionState === "unresolved"
        ? pendingInterruptKinds.every((kind) =>
            scenario.expected.requiredInterruptKinds?.includes(kind) ?? false,
          ) &&
          (scenario.expected.minimumCandidates
            ? Number(sessionResult?.resolutionCandidates?.length ?? 0) >=
              scenario.expected.minimumCandidates
            : true) &&
          !completed?.reportId
        : true,
  };

  const rationales: Record<string, string> = {
    entity_resolution: `expected ${scenario.expected.resolutionState}/${scenario.expected.entitySlug ?? "none"}, got ${actualResolution}/${actualEntitySlug ?? "none"}`,
    retrieval_relevance: `sourceEvents=${Number(sessionResult?.sourceEvents?.length ?? 0)}, reportSources=${Number(report?.sources?.length ?? 0)}`,
    claim_support: `publishable=${Number(reportQuality?.publishableClaims ?? 0)}, corroborated=${Number(reportQuality?.corroboratedClaims ?? 0)}, contradicted=${Number(reportQuality?.contradictedClaims ?? 0)}`,
    final_response_quality: `compiledTruthSentences=${extractCompiledTruthSentenceCount(report)}, pendingInterrupts=${pendingInterruptKinds.length}`,
    trajectory_quality: `runEvents=${runEventKinds.join(", ")}`,
    actionability: `actions=${extractActionCount(sessionResult, report)}, candidates=${Number(sessionResult?.resolutionCandidates?.length ?? 0)}, interrupts=${pendingInterruptKinds.length}`,
    artifact_decision_quality: `artifact=${actualArtifact}, save=${actualSaveEligibility}, reportCreated=${Boolean(completed?.reportId)}`,
    ambiguity_recovery: `candidates=${Number(sessionResult?.resolutionCandidates?.length ?? 0)}, interrupts=${pendingInterruptKinds.join(", ") || "none"}`,
  };

  const overallGatePass = Object.values(checks).every(Boolean);

  return {
    id: scenario.id,
    label: scenario.label,
    mode: scenario.mode,
    elapsedMs: Math.round(performance.now() - startedAt),
    expected: scenario.expected,
    actual: {
      resolutionState: actualResolution,
      artifactState: actualArtifact,
      saveEligibility: actualSaveEligibility,
      resolvedEntitySlug: actualEntitySlug,
      reportCreated: Boolean(completed?.reportId),
      candidateCount: Number(sessionResult?.resolutionCandidates?.length ?? 0),
      pendingInterruptKinds,
      runEventKinds,
      sourceEventCount: Number(sessionResult?.sourceEvents?.length ?? 0),
      reportSourceCount: Number(report?.sources?.length ?? 0),
      publishableClaims: Number(reportQuality?.publishableClaims ?? 0),
      corroboratedClaims: Number(reportQuality?.corroboratedClaims ?? 0),
      contradictedClaims: Number(reportQuality?.contradictedClaims ?? 0),
      compiledTruthSentences: extractCompiledTruthSentenceCount(report),
      actionCount: extractActionCount(sessionResult, report),
    },
    checks,
    rationales,
    overallGatePass,
  };
}

function summarize(results: ScenarioResult[]): AnswerControlEvalSummary {
  const thresholds = {
    entity_resolution: 80,
    claim_support: 60,
    trajectory_quality: 80,
    actionability: 80,
    artifact_decision_quality: 80,
    ambiguity_recovery: 75,
  };

  const dimensionNames = [
    "entity_resolution",
    "retrieval_relevance",
    "claim_support",
    "final_response_quality",
    "trajectory_quality",
    "actionability",
    "artifact_decision_quality",
    "ambiguity_recovery",
  ] as const;

  const dimensions = Object.fromEntries(
    dimensionNames.map((name) => {
      const applicable = results.filter((result) =>
        name === "ambiguity_recovery"
          ? result.expected.resolutionState === "ambiguous" ||
            result.expected.resolutionState === "unresolved"
          : true,
      );
      const passed = applicable.filter((result) => result.checks[name]).length;
      return [
        name,
        {
          passed,
          total: applicable.length,
          passRate: percent(passed, applicable.length),
        },
      ];
    }),
  ) as AnswerControlEvalSummary["dimensions"];

  const gateStatus = {
    entity_resolution:
      dimensions.entity_resolution.passRate >= thresholds.entity_resolution,
    claim_support: dimensions.claim_support.passRate >= thresholds.claim_support,
    trajectory_quality:
      dimensions.trajectory_quality.passRate >= thresholds.trajectory_quality,
    actionability: dimensions.actionability.passRate >= thresholds.actionability,
    artifact_decision_quality:
      dimensions.artifact_decision_quality.passRate >=
      thresholds.artifact_decision_quality,
    ambiguity_recovery:
      dimensions.ambiguity_recovery.passRate >= thresholds.ambiguity_recovery,
  };

  const passed = results.filter((result) => result.overallGatePass).length;

  return {
    total: results.length,
    passed,
    passRate: percent(passed, results.length),
    dimensions,
    thresholds,
    gateStatus,
  };
}

async function main() {
  const convexUrl = loadConvexUrl();
  const client = new ConvexHttpClient(convexUrl);
  const benchmarkDir = join(process.cwd(), "docs", "architecture", "benchmarks");
  const tmpDir = join(process.cwd(), ".tmp", "evals");
  mkdirSync(benchmarkDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });

  console.log(`\n=== PRODUCT ANSWER-CONTROL EVAL ===`);
  console.log(`target=${convexUrl}`);
  console.log(`scenarios=${SCENARIOS.length}`);

  const results: ScenarioResult[] = [];
  for (const scenario of SCENARIOS) {
    console.log(`\n--- ${scenario.id}: ${scenario.label} ---`);
    const result = await runScenario(client, scenario);
    results.push(result);
    console.log(
      `${result.overallGatePass ? "PASS" : "FAIL"} | resolution=${result.actual.resolutionState} artifact=${result.actual.artifactState} save=${result.actual.saveEligibility} report=${result.actual.reportCreated}`,
    );
  }

  const summary = summarize(results);
  const generatedAt = new Date().toISOString();
  const stamp = timestampFileSafe();
  const payload = {
    generatedAt,
    convexUrl,
    summary,
    results,
  };

  const jsonOut =
    args.jsonOut ?? join(tmpDir, "product-answer-control-latest.json");
  mkdirSync(dirname(resolve(jsonOut)), { recursive: true });
  writeFileSync(resolve(jsonOut), JSON.stringify(payload, null, 2), "utf8");

  const latestJson = join(benchmarkDir, "product-answer-control-eval-latest.json");
  const stampedJson = join(
    benchmarkDir,
    `product-answer-control-eval-${stamp}.json`,
  );
  writeFileSync(latestJson, JSON.stringify(payload, null, 2), "utf8");
  writeFileSync(stampedJson, JSON.stringify(payload, null, 2), "utf8");

  const mdLines = [
    "# Product Answer-Control Eval",
    "",
    `Generated: ${generatedAt}`,
    `Overall pass rate: ${summary.passRate}%`,
    "",
    "## Dimensions",
    "",
    "| Dimension | Passed | Total | Pass Rate | Threshold | Gate |",
    "|---|---|---|---|---|---|",
    ...Object.entries(summary.dimensions).map(([name, row]) => {
      const threshold =
        name in summary.thresholds
          ? `${summary.thresholds[name as keyof typeof summary.thresholds]}%`
          : "n/a";
      const gate =
        name in summary.gateStatus
          ? String(summary.gateStatus[name as keyof typeof summary.gateStatus])
          : "n/a";
      return `| ${name} | ${row.passed} | ${row.total} | ${row.passRate}% | ${threshold} | ${gate} |`;
    }),
    "",
    "## Scenario Results",
    "",
    "| Scenario | Resolution | Artifact | Save | Report | Overall |",
    "|---|---|---|---|---|---|",
    ...results.map(
      (result) =>
        `| ${result.id} | ${result.actual.resolutionState ?? "n/a"} | ${result.actual.artifactState ?? "n/a"} | ${result.actual.saveEligibility ?? "n/a"} | ${result.actual.reportCreated} | ${result.overallGatePass} |`,
    ),
    "",
    "## Notes",
    "",
    ...results.flatMap((result) => [
      `### ${result.id}`,
      "",
      ...Object.entries(result.checks).map(
        ([name, passed]) =>
          `- ${name}: ${passed ? "PASS" : "FAIL"} (${result.rationales[name] ?? "n/a"})`,
      ),
      "",
    ]),
  ];

  const latestMd = join(benchmarkDir, "product-answer-control-eval-latest.md");
  const stampedMd = join(
    benchmarkDir,
    `product-answer-control-eval-${stamp}.md`,
  );
  writeFileSync(latestMd, mdLines.join("\n"), "utf8");
  writeFileSync(stampedMd, mdLines.join("\n"), "utf8");

  console.log(`\nWrote:`);
  console.log(`- ${resolve(jsonOut)}`);
  console.log(`- ${latestJson}`);
  console.log(`- ${stampedJson}`);
  console.log(`- ${latestMd}`);
  console.log(`- ${stampedMd}`);

  const gatesPassed = Object.values(summary.gateStatus).every(Boolean);
  if (!gatesPassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
