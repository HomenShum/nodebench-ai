import type {
  ExtractedDocumentLike,
  PublicCitation,
  SearchTelemetry,
  TemporalTimelineEvent,
} from "./grounding.js";
import { buildEnterpriseInvestigation } from "./temporal-investigation.js";

type EnterpriseInvestigation = Awaited<ReturnType<typeof buildEnterpriseInvestigation>>;

export interface EnterpriseEvalMomentExpectation {
  timeframeContains?: string[];
  eventContains: string[];
  sourceType?: string;
}

export interface EnterpriseEvalExpectations {
  requiredMoments: EnterpriseEvalMomentExpectation[];
  requiredFrictionTerms: string[];
  requiredActionTerms: string[];
  minimumAnomalies: number;
  minimumSourceHashes: number;
  minimumConfidenceScore: number;
}

export interface EnterpriseInvestigationEvalCase {
  id: string;
  title: string;
  dataset: string;
  query: string;
  costProfile: "free_public";
  sourceRefs: string[];
  timeline: TemporalTimelineEvent[];
  documents: ExtractedDocumentLike[];
  citations: PublicCitation[];
  telemetry: SearchTelemetry;
  groundTruthSummary: string;
  expectations: EnterpriseEvalExpectations;
}

export interface DeterministicDimensionScore {
  score: number;
  passed: boolean;
  note: string;
}

export interface EnterpriseInvestigationDeterministicScore {
  overall: number;
  passed: boolean;
  dimensions: {
    causalChain: DeterministicDimensionScore;
    temporalEvidence: DeterministicDimensionScore;
    traceability: DeterministicDimensionScore;
    gameTheory: DeterministicDimensionScore;
    zeroDraft: DeterministicDimensionScore;
  };
  failures: string[];
}

export interface EnterpriseInvestigationCaseEvaluation {
  caseId: string;
  title: string;
  dataset: string;
  investigation: EnterpriseInvestigation;
  deterministic: EnterpriseInvestigationDeterministicScore;
}

function makeCitation(id: string, title: string, url: string, publishedAt: string): PublicCitation {
  return { id, title, url, source: "fixture", publishedAt };
}

function makeDocument(args: {
  id: string;
  title: string;
  url: string;
  fetchedAt: string;
  snapshotHash: string;
  text: string;
  temporalMarkers: Array<{ text: string; resolvedDate: string }>;
  numericFacts?: Array<{ metric: string; value: number; units?: string; lineNumber?: number }>;
  claims?: string[];
  entities?: string[];
}): ExtractedDocumentLike {
  return {
    finalUrl: args.url,
    title: args.title,
    text: args.text,
    snapshotHash: args.snapshotHash,
    citations: [
      {
        id: args.id,
        url: args.url,
        title: args.title,
        fetchedAt: args.fetchedAt,
        snapshotHash: args.snapshotHash,
      },
    ],
    extraction: {
      claims: (args.claims ?? []).map((claimText) => ({ claim_text: claimText })),
      temporalMarkers: args.temporalMarkers.map((marker) => ({
        text: marker.text,
        resolvedDate: marker.resolvedDate,
      })),
      numericFacts: (args.numericFacts ?? []).map((fact) => ({
        metric: fact.metric,
        value: fact.value,
        units: fact.units,
        lineNumber: fact.lineNumber,
      })),
      entities: (args.entities ?? []).map((name) => ({ name })),
    },
  };
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsAny(haystack: string, needles: string[]) {
  const normalized = normalizeText(haystack);
  return needles.some((needle) => normalized.includes(normalizeText(needle)));
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function makeDimension(score: number, threshold: number, note: string): DeterministicDimensionScore {
  const rounded = roundScore(score);
  return {
    score: rounded,
    passed: rounded >= threshold,
    note,
  };
}

function scoreCausalChain(
  investigation: EnterpriseInvestigation,
  expectations: EnterpriseEvalExpectations,
) {
  // V2: observed_facts + evidence_catalog replace causal_chain
  const factsText = investigation.observed_facts.map((f) => f.statement).join(" ");
  const evidenceText = investigation.evidence_catalog.map((e) => `${e.source_type} ${e.source_uri}`).join(" ");
  const combinedText = `${factsText} ${evidenceText}`;

  const matches = expectations.requiredMoments.map((moment) => {
    const eventKeywordsHit = containsAny(combinedText, moment.eventContains);
    const sourceHit =
      !moment.sourceType || investigation.evidence_catalog.some((e) => e.source_type === moment.sourceType);
    return { matched: eventKeywordsHit && sourceHit };
  });

  const matchedCount = matches.filter((item) => item.matched).length;
  const ratio = matches.length === 0 ? 1 : matchedCount / matches.length;
  const note =
    matchedCount === matches.length
      ? `Matched all ${matches.length} required temporal moments.`
      : `Matched ${matchedCount}/${matches.length} required temporal moments.`;

  return makeDimension(ratio * 100, 75, note);
}

function scoreTemporalEvidence(
  investigation: EnterpriseInvestigation,
  expectations: EnterpriseEvalExpectations,
) {
  const anomalies = investigation.derived_signals.anomalies.length;
  const hasForecast =
    !normalizeText(investigation.derived_signals.forecast.summary).includes(
      "insufficient numeric evidence",
    );
  const confidence = investigation.meta.overall_confidence;

  let score = 0;
  if (anomalies >= expectations.minimumAnomalies) score += 40;
  if (hasForecast) score += 35;
  if (confidence >= expectations.minimumConfidenceScore) score += 25;

  return makeDimension(
    score,
    70,
    `anomalies=${anomalies}, forecast=${hasForecast ? "present" : "missing"}, confidence=${confidence.toFixed(2)}`,
  );
}

function scoreTraceability(
  investigation: EnterpriseInvestigation,
  expectations: EnterpriseEvalExpectations,
  _documents: ExtractedDocumentLike[],
) {
  const verifiedHashes = investigation.evidence_catalog
    .filter((e) => !e.content_hash.includes("unverified"))
    .length;
  const allEvidenceAnchored = investigation.observed_facts.every(
    (fact) => fact.evidence_refs.length > 0,
  );
  const hasOtelSpans = investigation.traceability.otel_spans_recorded;

  let score = 0;
  if (verifiedHashes >= expectations.minimumSourceHashes) score += 40;
  if (allEvidenceAnchored) score += 30;
  if (hasOtelSpans) score += 30;

  return makeDimension(
    score,
    80,
    `verifiedHashes=${verifiedHashes}, anchored=${allEvidenceAnchored}, otelSpans=${hasOtelSpans}`,
  );
}

function scoreGameTheory(
  investigation: EnterpriseInvestigation,
  expectations: EnterpriseEvalExpectations,
) {
  // V2: counter_analysis replaces game_theory_analysis
  const haystack = [
    investigation.counter_analysis.result,
    ...investigation.counter_analysis.questions_tested,
    ...investigation.hypotheses.map((h) => h.statement),
  ].join(" ");
  const hits = expectations.requiredFrictionTerms.filter((term) => containsAny(haystack, [term])).length;
  const ratio =
    expectations.requiredFrictionTerms.length === 0
      ? 1
      : hits / expectations.requiredFrictionTerms.length;

  return makeDimension(
    ratio * 100,
    60,
    `Matched ${hits}/${expectations.requiredFrictionTerms.length} friction themes.`,
  );
}

function scoreZeroDraft(
  investigation: EnterpriseInvestigation,
  expectations: EnterpriseEvalExpectations,
) {
  // V2: recommended_actions replaces zero_friction_execution
  const actionsText = investigation.recommended_actions.map((a) => a.action).join(" ");
  const hits = expectations.requiredActionTerms.filter((term) => containsAny(actionsText, [term])).length;
  const ratio =
    expectations.requiredActionTerms.length === 0
      ? 1
      : hits / expectations.requiredActionTerms.length;
  const approveGate = investigation.recommended_actions.every(
    (a) => a.human_gate === "APPROVE_REQUIRED",
  );

  return makeDimension(
    Math.min(100, (ratio * 80) + (approveGate ? 20 : 0)),
    65,
    `Matched ${hits}/${expectations.requiredActionTerms.length} action themes; approvalGate=${approveGate}.`,
  );
}

export function serializeInvestigationForJudge(investigation: EnterpriseInvestigation) {
  return [
    `Query: ${investigation.meta.query}`,
    `Confidence: ${investigation.meta.overall_confidence}`,
    `Forecast: ${investigation.derived_signals.forecast.summary}`,
    "Observed facts:",
    ...investigation.observed_facts.map(
      (fact, index) =>
        `${index + 1}. [${fact.fact_id}] ${fact.statement} (confidence: ${fact.confidence.toFixed(2)}, refs: ${fact.evidence_refs.join(", ")})`,
    ),
    "Hypotheses:",
    ...investigation.hypotheses.map(
      (h) => `- [${h.status}] ${h.statement} (confidence: ${h.confidence.toFixed(2)})`,
    ),
    `Counter-analysis: ${investigation.counter_analysis.result}`,
    `Questions tested: ${investigation.counter_analysis.questions_tested.join(" | ")}`,
    "Recommended actions:",
    ...investigation.recommended_actions.map(
      (a) => `- [${a.priority}] ${a.action} (gate: ${a.human_gate})`,
    ),
    `Replay URL: ${investigation.traceability.replay_url ?? "missing"}`,
    `Evidence catalog: ${investigation.evidence_catalog.map((e) => e.content_hash).join(", ") || "empty"}`,
    `Limitations: ${investigation.limitations.join(" | ")}`,
  ].join("\n");
}

export function scoreEnterpriseInvestigation(
  investigation: EnterpriseInvestigation,
  input: EnterpriseInvestigationEvalCase,
): EnterpriseInvestigationDeterministicScore {
  const causalChain = scoreCausalChain(investigation, input.expectations);
  const temporalEvidence = scoreTemporalEvidence(investigation, input.expectations);
  const traceability = scoreTraceability(investigation, input.expectations, input.documents);
  const gameTheory = scoreGameTheory(investigation, input.expectations);
  const zeroDraft = scoreZeroDraft(investigation, input.expectations);

  const weighted =
    (causalChain.score * 0.35) +
    (traceability.score * 0.25) +
    (temporalEvidence.score * 0.15) +
    (gameTheory.score * 0.15) +
    (zeroDraft.score * 0.10);

  const failures: string[] = [];
  if (!causalChain.passed) failures.push("causal_chain_recall");
  if (!temporalEvidence.passed) failures.push("temporal_evidence");
  if (!traceability.passed) failures.push("traceability");
  if (!gameTheory.passed) failures.push("game_theory");
  if (!zeroDraft.passed) failures.push("zero_friction_execution");

  return {
    overall: roundScore(weighted),
    passed: failures.length === 0,
    dimensions: {
      causalChain,
      temporalEvidence,
      traceability,
      gameTheory,
      zeroDraft,
    },
    failures,
  };
}

export async function runEnterpriseInvestigationCase(
  input: EnterpriseInvestigationEvalCase,
): Promise<EnterpriseInvestigationCaseEvaluation> {
  const startedAt = Date.now();
  const investigation = await buildEnterpriseInvestigation({
    query: input.query,
    telemetry: input.telemetry,
    timeline: input.timeline,
    documents: input.documents,
    citations: input.citations,
    traceId: `eval_${input.id}`,
    executionTimeMs: Date.now() - startedAt,
  });

  return {
    caseId: input.id,
    title: input.title,
    dataset: input.dataset,
    deterministic: scoreEnterpriseInvestigation(investigation, input),
    investigation,
  };
}

const xzDocuments = [
  makeDocument({
    id: "xz_mail_1",
    title: "xz-devel pressure thread",
    url: "https://www.openwall.com/lists/oss-security/2024/03/29/4",
    fetchedAt: "2024-03-29T00:00:00.000Z",
    snapshotHash: "hash_xz_mail_1",
    text:
      "Sockpuppet accounts increased pressure on the original maintainer through the mailing list. They argued that release latency and community responsiveness were unacceptable and that maintainership needed to change before the next release.",
    temporalMarkers: [{ text: "March 29, 2024", resolvedDate: "2024-03-29T00:00:00.000Z" }],
    numericFacts: [{ metric: "maintainer_pressure_emails", value: 14, units: "emails" }],
    claims: [
      "Pressure emails accelerated on the mailing list before the compromised release.",
      "Maintainer trust was strategically influenced over time.",
    ],
    entities: ["Jia Tan", "Maintainer", "xz-devel"],
  }),
  makeDocument({
    id: "xz_git_2",
    title: "xz release integration notes",
    url: "https://github.com/tukaani-project/xz/pull/5",
    fetchedAt: "2024-02-23T00:00:00.000Z",
    snapshotHash: "hash_xz_git_2",
    text:
      "A new contributor landed release-critical changes and generated trust through repeated helpful patches. The release path now depended on code the original maintainer did not fully re-audit before packaging.",
    temporalMarkers: [{ text: "February 23, 2024", resolvedDate: "2024-02-23T00:00:00.000Z" }],
    numericFacts: [{ metric: "release_lane_pressure", value: 8, units: "signals" }],
    claims: [
      "Helpful patches became a trust-building mechanism.",
      "Release-critical review depth dropped before distribution.",
    ],
    entities: ["Jia Tan", "xz", "release pipeline"],
  }),
  makeDocument({
    id: "xz_web_3",
    title: "XZ backdoor analysis",
    url: "https://boehs.org/node/everything-i-know-about-the-xz-backdoor",
    fetchedAt: "2024-04-01T00:00:00.000Z",
    snapshotHash: "hash_xz_web_3",
    text:
      "The compromise was not a sudden exploit. It was a multi-year trust capture campaign that culminated in a release artifact containing a backdoor path. The key shift happened when social pressure and release urgency changed who controlled the packaging lane.",
    temporalMarkers: [{ text: "April 1, 2024", resolvedDate: "2024-04-01T00:00:00.000Z" }],
    numericFacts: [{ metric: "release_lane_pressure", value: 21, units: "signals" }],
    claims: [
      "The backdoor emerged from a long trust capture campaign.",
      "Control over packaging changed before the malicious release.",
    ],
    entities: ["backdoor", "packaging lane", "release"],
  }),
];

const gitlabDocuments = [
  makeDocument({
    id: "gitlab_pm_1",
    title: "GitLab database incident postmortem",
    url: "https://about.gitlab.com/blog/2017/02/01/gitlab-dot-com-database-incident/",
    fetchedAt: "2017-02-01T00:00:00.000Z",
    snapshotHash: "hash_gitlab_pm_1",
    text:
      "Operators fought a spam-related database load event for hours before an engineer executed an rm -rf on the production data directory. Backup and replication controls did not provide the recovery path the team expected.",
    temporalMarkers: [{ text: "January 31, 2017", resolvedDate: "2017-01-31T00:00:00.000Z" }],
    numericFacts: [{ metric: "database_recovery_hours", value: 18, units: "hours" }],
    claims: [
      "Fatigue from a prior incident shaped the destructive command path.",
      "Recovery assumptions about backup and replication were wrong.",
    ],
    entities: ["GitLab", "production database", "replication", "backup"],
  }),
  makeDocument({
    id: "gitlab_jira_2",
    title: "GitLab incident action tracker",
    url: "https://jira.example.com/browse/GL-2017-DB",
    fetchedAt: "2017-02-01T03:00:00.000Z",
    snapshotHash: "hash_gitlab_jira_2",
    text:
      "The incident tracker recorded that replica promotion and backup restore paths both failed under pressure. Recovery work escalated after the destructive command and highlighted missing guardrails around direct production access.",
    temporalMarkers: [{ text: "February 1, 2017", resolvedDate: "2017-02-01T03:00:00.000Z" }],
    numericFacts: [{ metric: "recovery_paths_failed", value: 2, units: "paths" }],
    claims: [
      "Two assumed recovery paths failed during incident response.",
      "Direct production access lacked enough protective friction.",
    ],
    entities: ["GitLab", "incident response", "replica", "backup"],
  }),
  makeDocument({
    id: "gitlab_slack_3",
    title: "GitLab Slack war room excerpt",
    url: "https://slack.example.com/archives/gitlab-incident",
    fetchedAt: "2017-01-31T23:00:00.000Z",
    snapshotHash: "hash_gitlab_slack_3",
    text:
      "The war room chat shows operators under time pressure debating recovery while the service stayed degraded. Manual production intervention escalated because the team believed the replica could still save the day.",
    temporalMarkers: [{ text: "January 31, 2017", resolvedDate: "2017-01-31T23:00:00.000Z" }],
    numericFacts: [{ metric: "minutes_of_degraded_service", value: 300, units: "minutes" }],
    claims: [
      "Time pressure pushed the team toward manual intervention.",
      "The replica was trusted longer than it should have been.",
    ],
    entities: ["war room", "replica", "manual intervention"],
  }),
];

const enronDocuments = [
  makeDocument({
    id: "enron_email_1",
    title: "Enron executive email cluster",
    url: "https://www.cs.cmu.edu/~enron/email/skilling-fastow-entity-thread",
    fetchedAt: "2001-06-20T00:00:00.000Z",
    snapshotHash: "hash_enron_email_1",
    text:
      "Emails between executives intensified around the same window as new off-balance-sheet entities were structured. The discussion focused on optics, liquidity pressure, and keeping reported leverage contained.",
    temporalMarkers: [{ text: "June 20, 2001", resolvedDate: "2001-06-20T00:00:00.000Z" }],
    numericFacts: [{ metric: "entity_structuring_emails", value: 27, units: "emails" }],
    claims: [
      "Executive email traffic spiked around the creation of new entities.",
      "The coordination theme was optics and leverage containment.",
    ],
    entities: ["Skilling", "Fastow", "LJM", "Enron"],
  }),
  makeDocument({
    id: "enron_sec_2",
    title: "Enron SEC filing excerpt",
    url: "https://www.sec.gov/Archives/enron/off-balance-sheet-filing",
    fetchedAt: "2001-08-14T00:00:00.000Z",
    snapshotHash: "hash_enron_sec_2",
    text:
      "The filing disclosed structured entities only partially and lagged the internal discussion about risk transfer. External reporting stayed cleaner than the internal risk picture.",
    temporalMarkers: [{ text: "August 14, 2001", resolvedDate: "2001-08-14T00:00:00.000Z" }],
    numericFacts: [{ metric: "disclosure_lag_days", value: 55, units: "days" }],
    claims: [
      "Disclosure lag separated internal reality from external reporting.",
      "Risk transfer narratives were cleaner in filings than in private communications.",
    ],
    entities: ["SEC filing", "disclosure", "special purpose entities"],
  }),
  makeDocument({
    id: "enron_web_3",
    title: "Enron post-collapse analysis",
    url: "https://example.com/enron-postmortem",
    fetchedAt: "2002-01-10T00:00:00.000Z",
    snapshotHash: "hash_enron_web_3",
    text:
      "The collapse was driven by incentive misalignment, coordinated concealment, and a reporting system that allowed local balance-sheet games to outrun governance. Internal coordination showed the cover-up before public reporting admitted it.",
    temporalMarkers: [{ text: "January 10, 2002", resolvedDate: "2002-01-10T00:00:00.000Z" }],
    numericFacts: [{ metric: "reported_entities", value: 12, units: "entities" }],
    claims: [
      "Incentive misalignment was systemic, not accidental.",
      "Private coordination outran public governance.",
    ],
    entities: ["cover-up", "governance", "entities"],
  }),
];

const ftxDocuments = [
  makeDocument({
    id: "ftx_docket_1",
    title: "FTX bankruptcy docket summary",
    url: "https://www.courtlistener.com/docket/ftx-bankruptcy-alameda-timeline",
    fetchedAt: "2022-11-17T00:00:00.000Z",
    snapshotHash: "hash_ftx_docket_1",
    text:
      "Court filings describe treasury commingling and related-party exposure between FTX and Alameda. Internal controls over capital movement and disclosure were weaker than the public balance-sheet story implied.",
    temporalMarkers: [{ text: "November 17, 2022", resolvedDate: "2022-11-17T00:00:00.000Z" }],
    numericFacts: [{ metric: "related_party_exposure", value: 8, units: "bn_usd" }],
    claims: [
      "Related-party exposure exceeded what the public story suggested.",
      "Control failures were treasury and disclosure failures, not just market losses.",
    ],
    entities: ["FTX", "Alameda", "treasury", "related-party exposure"],
  }),
  makeDocument({
    id: "ftx_sec_2",
    title: "Regulatory complaint timeline",
    url: "https://www.sec.gov/ftx-alameda-complaint",
    fetchedAt: "2022-12-13T00:00:00.000Z",
    snapshotHash: "hash_ftx_sec_2",
    text:
      "The complaint tied the balance-sheet shift to undisclosed transfers and governance failures. Public disclosures lagged the internal movement of customer assets and affiliated liabilities.",
    temporalMarkers: [{ text: "December 13, 2022", resolvedDate: "2022-12-13T00:00:00.000Z" }],
    numericFacts: [{ metric: "customer_asset_gap", value: 7, units: "bn_usd" }],
    claims: [
      "Customer asset movements were not matched by truthful external reporting.",
      "The balance-sheet regime shift mapped to undisclosed affiliated transfers.",
    ],
    entities: ["SEC", "customer assets", "balance sheet"],
  }),
  makeDocument({
    id: "ftx_web_3",
    title: "FTX balance-sheet analysis",
    url: "https://example.com/ftx-balance-sheet-analysis",
    fetchedAt: "2022-11-02T00:00:00.000Z",
    snapshotHash: "hash_ftx_web_3",
    text:
      "Analysts flagged that Alameda's reported balance sheet depended on illiquid collateral and circular confidence. The real break was governance: capital movement and disclosure controls did not constrain related-party risk.",
    temporalMarkers: [{ text: "November 2, 2022", resolvedDate: "2022-11-02T00:00:00.000Z" }],
    numericFacts: [{ metric: "illiquid_collateral_share", value: 65, units: "percent" }],
    claims: [
      "Illiquid collateral masked a governance problem.",
      "The balance-sheet break was tied to related-party control failure.",
    ],
    entities: ["Alameda", "collateral", "governance"],
  }),
];

export const ENTERPRISE_INVESTIGATION_EVAL_CASES: EnterpriseInvestigationEvalCase[] = [
  {
    id: "xz-backdoor",
    title: "XZ Utils trust-capture backdoor",
    dataset: "public security incident synthesis",
    query: "Trace the temporal causal chain that led to the XZ Utils backdoor release and explain the human incentive failure.",
    costProfile: "free_public",
    sourceRefs: xzDocuments.map((document) => document.finalUrl),
    documents: xzDocuments,
    citations: [
      makeCitation("xz_mail_1", "xz-devel pressure thread", xzDocuments[0]!.finalUrl, "2024-03-29T00:00:00.000Z"),
      makeCitation("xz_git_2", "xz release integration notes", xzDocuments[1]!.finalUrl, "2024-02-23T00:00:00.000Z"),
      makeCitation("xz_web_3", "XZ backdoor analysis", xzDocuments[2]!.finalUrl, "2024-04-01T00:00:00.000Z"),
    ],
    timeline: [
      {
        when: "2024-02-23T00:00:00.000Z",
        precision: "resolved",
        label: "A new contributor became release-critical through repeated helpful patches.",
        evidence: "A new contributor landed release-critical changes and generated trust through repeated helpful patches.",
        sourceId: "xz_git_2",
        sourceTitle: "xz release integration notes",
        url: xzDocuments[1]!.finalUrl,
      },
      {
        when: "2024-03-29T00:00:00.000Z",
        precision: "resolved",
        label: "Mailing-list pressure accelerated before the compromised release.",
        evidence: "Sockpuppet accounts increased pressure on the original maintainer through the mailing list.",
        sourceId: "xz_mail_1",
        sourceTitle: "xz-devel pressure thread",
        url: xzDocuments[0]!.finalUrl,
      },
      {
        when: "2024-04-01T00:00:00.000Z",
        precision: "resolved",
        label: "The final release path reflected a long trust-capture campaign rather than a one-off coding error.",
        evidence: "It was a multi-year trust capture campaign that culminated in a release artifact containing a backdoor path.",
        sourceId: "xz_web_3",
        sourceTitle: "XZ backdoor analysis",
        url: xzDocuments[2]!.finalUrl,
      },
    ],
    telemetry: {
      totalBeforeFusion: 3,
      totalTimeMs: 180,
      reranked: true,
      sourcesQueried: ["fixture"],
      timing: { fixture: 180 },
      errors: [],
    },
    groundTruthSummary:
      "The XZ incident was a trust-capture operation. Helpful patches established credibility, mailing-list pressure weakened maintainer resistance, and release urgency let a malicious release path through. The real failure was governance over privileged maintainership and release review, not just a late code diff.",
    expectations: {
      requiredMoments: [
        { timeframeContains: ["2024"], eventContains: ["helpful patches", "release-critical"], sourceType: "github_pr" },
        { timeframeContains: ["2024"], eventContains: ["pressure", "mailing list"], sourceType: "mailing_list" },
        { timeframeContains: ["2024"], eventContains: ["trust capture", "backdoor"] },
      ],
      requiredFrictionTerms: ["trust", "pressure", "maintainer", "review"],
      requiredActionTerms: ["maintainership", "review", "release"],
      minimumAnomalies: 1,
      minimumSourceHashes: 3,
      minimumConfidenceScore: 0.75,
    },
  },
  {
    id: "gitlab-db-loss",
    title: "GitLab 2017 production database loss",
    dataset: "public engineering postmortem",
    query: "Trace the decision chain behind the GitLab production database loss and recommend the missing guardrail.",
    costProfile: "free_public",
    sourceRefs: gitlabDocuments.map((document) => document.finalUrl),
    documents: gitlabDocuments,
    citations: [
      makeCitation("gitlab_pm_1", "GitLab database incident postmortem", gitlabDocuments[0]!.finalUrl, "2017-02-01T00:00:00.000Z"),
      makeCitation("gitlab_jira_2", "GitLab incident action tracker", gitlabDocuments[1]!.finalUrl, "2017-02-01T03:00:00.000Z"),
      makeCitation("gitlab_slack_3", "GitLab Slack war room excerpt", gitlabDocuments[2]!.finalUrl, "2017-01-31T23:00:00.000Z"),
    ],
    timeline: [
      {
        when: "2017-01-31T23:00:00.000Z",
        precision: "resolved",
        label: "War-room pressure escalated after hours of degraded service and manual recovery debate.",
        evidence: "The war room chat shows operators under time pressure debating recovery while the service stayed degraded.",
        sourceId: "gitlab_slack_3",
        sourceTitle: "GitLab Slack war room excerpt",
        url: gitlabDocuments[2]!.finalUrl,
      },
      {
        when: "2017-02-01T00:00:00.000Z",
        precision: "resolved",
        label: "A destructive production command landed after fatigue from the earlier incident response.",
        evidence: "Operators fought a spam-related database load event for hours before an engineer executed an rm -rf on the production data directory.",
        sourceId: "gitlab_pm_1",
        sourceTitle: "GitLab database incident postmortem",
        url: gitlabDocuments[0]!.finalUrl,
      },
      {
        when: "2017-02-01T03:00:00.000Z",
        precision: "resolved",
        label: "Replica promotion and backup restore both failed, exposing missing recovery guardrails.",
        evidence: "The incident tracker recorded that replica promotion and backup restore paths both failed under pressure.",
        sourceId: "gitlab_jira_2",
        sourceTitle: "GitLab incident action tracker",
        url: gitlabDocuments[1]!.finalUrl,
      },
    ],
    telemetry: {
      totalBeforeFusion: 3,
      totalTimeMs: 140,
      reranked: false,
      sourcesQueried: ["fixture"],
      timing: { fixture: 140 },
      errors: [],
    },
    groundTruthSummary:
      "The GitLab failure chain ran from operational fatigue and time pressure to a destructive production command, then to the discovery that replica and backup assumptions were weaker than expected. The right fix is production access friction plus practiced recovery controls, not just asking engineers to be more careful.",
    expectations: {
      requiredMoments: [
        { timeframeContains: ["2017"], eventContains: ["war room", "pressure"], sourceType: "slack_transcript" },
        { timeframeContains: ["2017"], eventContains: ["rm -rf", "production"], sourceType: "incident_postmortem" },
        { timeframeContains: ["2017"], eventContains: ["backup", "replica"], sourceType: "jira_ticket" },
      ],
      requiredFrictionTerms: ["pressure", "backup", "production", "control"],
      requiredActionTerms: ["backup", "approval", "production"],
      minimumAnomalies: 1,
      minimumSourceHashes: 3,
      minimumConfidenceScore: 0.7,
    },
  },
  {
    id: "enron-entities",
    title: "Enron off-balance-sheet coordination",
    dataset: "public email corpus plus filings",
    query: "Trace the temporal chain behind Enron's off-balance-sheet entity concealment and identify the incentive failure.",
    costProfile: "free_public",
    sourceRefs: enronDocuments.map((document) => document.finalUrl),
    documents: enronDocuments,
    citations: [
      makeCitation("enron_email_1", "Enron executive email cluster", enronDocuments[0]!.finalUrl, "2001-06-20T00:00:00.000Z"),
      makeCitation("enron_sec_2", "Enron SEC filing excerpt", enronDocuments[1]!.finalUrl, "2001-08-14T00:00:00.000Z"),
      makeCitation("enron_web_3", "Enron post-collapse analysis", enronDocuments[2]!.finalUrl, "2002-01-10T00:00:00.000Z"),
    ],
    timeline: [
      {
        when: "2001-06-20T00:00:00.000Z",
        precision: "resolved",
        label: "Executive email velocity spiked while new off-balance-sheet entities were being structured.",
        evidence: "Emails between executives intensified around the same window as new off-balance-sheet entities were structured.",
        sourceId: "enron_email_1",
        sourceTitle: "Enron executive email cluster",
        url: enronDocuments[0]!.finalUrl,
      },
      {
        when: "2001-08-14T00:00:00.000Z",
        precision: "resolved",
        label: "External filings lagged the internal risk picture and kept the public story cleaner than reality.",
        evidence: "The filing disclosed structured entities only partially and lagged the internal discussion about risk transfer.",
        sourceId: "enron_sec_2",
        sourceTitle: "Enron SEC filing excerpt",
        url: enronDocuments[1]!.finalUrl,
      },
      {
        when: "2002-01-10T00:00:00.000Z",
        precision: "resolved",
        label: "Post-collapse analysis identified incentive misalignment and coordinated concealment as the deeper cause.",
        evidence: "The collapse was driven by incentive misalignment, coordinated concealment, and a reporting system that allowed local balance-sheet games to outrun governance.",
        sourceId: "enron_web_3",
        sourceTitle: "Enron post-collapse analysis",
        url: enronDocuments[2]!.finalUrl,
      },
    ],
    telemetry: {
      totalBeforeFusion: 3,
      totalTimeMs: 155,
      reranked: true,
      sourcesQueried: ["fixture"],
      timing: { fixture: 155 },
      errors: [],
    },
    groundTruthSummary:
      "Enron's collapse was not a single bad filing. Private executive coordination rose first, formal disclosures lagged behind internal reality, and the system rewarded cleaner external leverage optics over truthful governance. The real failure was incentive design and disclosure control, not just accounting complexity.",
    expectations: {
      requiredMoments: [
        { timeframeContains: ["2001"], eventContains: ["email", "entities"], sourceType: "email_corpus" },
        { timeframeContains: ["2001"], eventContains: ["filing", "lagged"], sourceType: "regulatory_filing" },
        { timeframeContains: ["2002"], eventContains: ["incentive", "concealment"] },
      ],
      requiredFrictionTerms: ["incentive", "disclosure", "coordination", "reporting"],
      requiredActionTerms: ["disclosure", "segregate", "treasury"],
      minimumAnomalies: 1,
      minimumSourceHashes: 3,
      minimumConfidenceScore: 0.7,
    },
  },
  {
    id: "ftx-alameda",
    title: "FTX and Alameda balance-sheet regime shift",
    dataset: "public dockets plus regulatory filings",
    query: "Trace the temporal causal chain behind the FTX and Alameda balance-sheet breakdown and identify the missing control.",
    costProfile: "free_public",
    sourceRefs: ftxDocuments.map((document) => document.finalUrl),
    documents: ftxDocuments,
    citations: [
      makeCitation("ftx_docket_1", "FTX bankruptcy docket summary", ftxDocuments[0]!.finalUrl, "2022-11-17T00:00:00.000Z"),
      makeCitation("ftx_sec_2", "Regulatory complaint timeline", ftxDocuments[1]!.finalUrl, "2022-12-13T00:00:00.000Z"),
      makeCitation("ftx_web_3", "FTX balance-sheet analysis", ftxDocuments[2]!.finalUrl, "2022-11-02T00:00:00.000Z"),
    ],
    timeline: [
      {
        when: "2022-11-02T00:00:00.000Z",
        precision: "resolved",
        label: "Analysts flagged a fragile Alameda balance sheet built on illiquid collateral and circular confidence.",
        evidence: "Analysts flagged that Alameda's reported balance sheet depended on illiquid collateral and circular confidence.",
        sourceId: "ftx_web_3",
        sourceTitle: "FTX balance-sheet analysis",
        url: ftxDocuments[2]!.finalUrl,
      },
      {
        when: "2022-11-17T00:00:00.000Z",
        precision: "resolved",
        label: "Bankruptcy filings tied the break to treasury commingling and related-party exposure.",
        evidence: "Court filings describe treasury commingling and related-party exposure between FTX and Alameda.",
        sourceId: "ftx_docket_1",
        sourceTitle: "FTX bankruptcy docket summary",
        url: ftxDocuments[0]!.finalUrl,
      },
      {
        when: "2022-12-13T00:00:00.000Z",
        precision: "resolved",
        label: "Regulators tied the balance-sheet regime shift to undisclosed transfers and disclosure failures.",
        evidence: "The complaint tied the balance-sheet shift to undisclosed transfers and governance failures.",
        sourceId: "ftx_sec_2",
        sourceTitle: "Regulatory complaint timeline",
        url: ftxDocuments[1]!.finalUrl,
      },
    ],
    telemetry: {
      totalBeforeFusion: 3,
      totalTimeMs: 150,
      reranked: true,
      sourcesQueried: ["fixture"],
      timing: { fixture: 150 },
      errors: [],
    },
    groundTruthSummary:
      "The FTX-Alameda failure was a governance and disclosure collapse. Analysts first saw a fragile balance sheet, bankruptcy records exposed related-party commingling, and regulators later tied the regime shift to undisclosed transfers. The real fix is treasury segregation and disclosure controls, not just better market monitoring.",
    expectations: {
      requiredMoments: [
        { timeframeContains: ["2022"], eventContains: ["balance sheet", "collateral"] },
        { timeframeContains: ["2022"], eventContains: ["commingling", "related-party"], sourceType: "bankruptcy_docket" },
        { timeframeContains: ["2022"], eventContains: ["undisclosed transfers", "disclosure"], sourceType: "regulatory_filing" },
      ],
      requiredFrictionTerms: ["disclosure", "related-party", "governance", "reporting"],
      requiredActionTerms: ["segregate", "treasury", "disclosure"],
      minimumAnomalies: 1,
      minimumSourceHashes: 3,
      minimumConfidenceScore: 0.7,
    },
  },
];
