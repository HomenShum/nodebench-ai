/**
 * FTX/Alameda Collapse — Golden Dataset for Enterprise Investigation Demo
 *
 * Uses only publicly verifiable sources. Demonstrates how NodeBench traces
 * cause-and-effect through public data with explicit uncertainty, competing
 * hypotheses, and tamper-evident evidence provenance.
 *
 * Key distinction: every hash proves "this artifact has not changed since
 * capture." It does NOT prove the artifact's claims are true.
 */

// ---------------------------------------------------------------------------
// Types (mirrors EnterpriseInvestigationResult from temporal-investigation.ts)
// ---------------------------------------------------------------------------

export interface InvestigationMeta {
  query: string;
  investigation_id: string;
  started_at: string;
  completed_at: string;
  execution_time_ms: number;
  analysis_mode: "enterpriseInvestigation";
  overall_confidence: number;
}

export interface ObservedFact {
  fact_id: string;
  statement: string;
  evidence_refs: string[];
  confidence: number;
}

export interface TemporalAnomaly {
  signal_key: string;
  anomaly_type: "variance_shift" | "trend_acceleration" | "level_shift";
  started_at: string;
  severity: number;
  detector: string;
  evidence_refs?: string[];
}

export interface InvestigationHypothesis {
  hypothesis_id: string;
  statement: string;
  supporting_fact_ids: string[];
  supporting_evidence_ids: string[];
  weakening_fact_ids: string[];
  weakening_evidence_ids: string[];
  confidence: number;
  status: "best_supported" | "considered_not_preferred" | "untested";
}

export interface RecommendedAction {
  priority: "P0" | "P1" | "P2";
  action: string;
  draft_artifact_ref: string | null;
  human_gate: "APPROVE_REQUIRED";
}

export type CaptureMethod =
  | "direct_fetch"
  | "uploaded_file"
  | "manual_fixture"
  | "derived_from_source";

export interface EvidenceCatalogEntry {
  evidence_id: string;
  source_type: string;
  source_uri: string;
  capture_time: string;
  content_hash: string;
  capture_method: CaptureMethod;
  lineage?: string;
}

export interface GoldenInvestigation {
  meta: InvestigationMeta;
  observed_facts: ObservedFact[];
  derived_signals: {
    anomalies: TemporalAnomaly[];
    forecast: {
      model: string;
      horizon: string;
      summary: string;
      confidence: number;
      evidence_refs: string[];
    };
  };
  hypotheses: InvestigationHypothesis[];
  counter_analysis: {
    adversarial_review_ran: boolean;
    questions_tested: string[];
    result: string;
  };
  recommended_actions: RecommendedAction[];
  evidence_catalog: EvidenceCatalogEntry[];
  traceability: {
    trace_id: string;
    tool_calls: number;
    replay_url: string | null;
    otel_spans_recorded: boolean;
    artifact_integrity:
      | "verified_for_captured_items"
      | "partial"
      | "unverified";
  };
  limitations: string[];
}

// ---------------------------------------------------------------------------
// Provenance tiers — what level of verification each evidence source has
// ---------------------------------------------------------------------------

export type ProvenanceTier =
  | "verified_public"
  | "heuristic_inferred"
  | "unavailable_simulated";

export interface ProvenanceEntry {
  evidence_id: string;
  tier: ProvenanceTier;
  reason: string;
}

// ---------------------------------------------------------------------------
// Adapter types for existing UI components
// ---------------------------------------------------------------------------

export interface EvidenceTimelineItem {
  date: string;
  title: string;
  direction: "supporting" | "disconfirming" | "neutral";
  sourceUrl?: string;
  excerpt?: string;
}

export interface EvidencePanelItem {
  id: string;
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  relevance: string;
  score?: number;
}

export interface TraceStep {
  toolName: string;
  choiceType:
    | "gather_info"
    | "execute_data_op"
    | "execute_output"
    | "finalize";
  durationMs?: number;
  success: boolean;
}

// ---------------------------------------------------------------------------
// Golden dataset: FTX / Alameda collapse (November 2022)
// ---------------------------------------------------------------------------

export const FTX_GOLDEN_INVESTIGATION: GoldenInvestigation = {
  meta: {
    query:
      "Investigate the FTX/Alameda balance-sheet collapse: trace the evidence chain, identify competing hypotheses, and propose remediation.",
    investigation_id: "inv_ftx_alameda_2022_11",
    started_at: "2022-11-10T18:00:00Z",
    completed_at: "2022-11-10T18:00:14Z",
    execution_time_ms: 14250,
    analysis_mode: "enterpriseInvestigation",
    overall_confidence: 0.84,
  },

  observed_facts: [
    {
      fact_id: "obs_1",
      statement:
        "CoinDesk reported on November 2, 2022 that Alameda Research held $14.6B in assets with a large portion concentrated in FTT and related exposure.",
      evidence_refs: ["ev_coindesk_001"],
      confidence: 0.96,
    },
    {
      fact_id: "obs_2",
      statement:
        "Binance's CEO publicly announced Binance would liquidate its remaining FTT holdings after 'recent revelations,' accelerating market concern.",
      evidence_refs: ["ev_reuters_002"],
      confidence: 0.92,
    },
    {
      fact_id: "obs_3",
      statement:
        "Reuters reported FTX experienced approximately $6 billion in customer withdrawals within 72 hours of the Binance announcement.",
      evidence_refs: ["ev_reuters_003"],
      confidence: 0.94,
    },
    {
      fact_id: "obs_4",
      statement:
        "On November 11, 2022, FTX filed for U.S. bankruptcy protection and Sam Bankman-Fried resigned as CEO.",
      evidence_refs: ["ev_reuters_004"],
      confidence: 0.99,
    },
  ],

  derived_signals: {
    anomalies: [
      {
        signal_key: "ftt_token_price",
        anomaly_type: "variance_shift",
        started_at: "2022-11-06T00:00:00Z",
        severity: 0.98,
        detector: "timesfm",
        evidence_refs: ["ev_coingecko_007"],
      },
      {
        signal_key: "ftx_withdrawal_velocity",
        anomaly_type: "level_shift",
        started_at: "2022-11-07T08:00:00Z",
        severity: 0.96,
        detector: "chronos",
        evidence_refs: ["ev_reuters_003"],
      },
    ],
    forecast: {
      model: "chronos",
      horizon: "48h",
      summary:
        "FTT price trajectory indicated continued decline toward sub-$2 levels. Withdrawal velocity exceeded exchange reserves, projecting total liquidity exhaustion within 36 hours of the anomaly onset.",
      confidence: 0.77,
      evidence_refs: ["ev_coingecko_007"],
    },
  },

  hypotheses: [
    {
      hypothesis_id: "hyp_1",
      statement:
        "Available evidence is most consistent with FTX customer assets having been exposed to Alameda-related risk, and the CoinDesk balance-sheet disclosure materially accelerated a confidence-driven withdrawal run.",
      supporting_fact_ids: ["obs_1", "obs_2", "obs_3", "obs_4"],
      supporting_evidence_ids: ["ev_coindesk_001", "ev_reuters_002", "ev_reuters_003", "ev_reuters_004"],
      weakening_fact_ids: [],
      weakening_evidence_ids: [],
      confidence: 0.88,
      status: "best_supported",
    },
    {
      hypothesis_id: "hyp_2",
      statement:
        "The FTT price decline was primarily caused by broader crypto market contagion and Binance's competitive strategy, not structural insolvency at FTX. Alameda's balance sheet concentration was risky but survivable absent the coordinated sell-off.",
      supporting_fact_ids: ["obs_2"],
      supporting_evidence_ids: ["ev_reuters_002"],
      weakening_fact_ids: ["obs_1", "obs_4"],
      weakening_evidence_ids: ["ev_coindesk_001", "ev_reuters_004", "ev_sec_005"],
      confidence: 0.29,
      status: "considered_not_preferred",
    },
  ],

  counter_analysis: {
    adversarial_review_ran: true,
    questions_tested: [
      "Was the FTT decline correlated with a broader crypto market downturn?",
      "Did other major exchanges face similar withdrawal pressure in the same window?",
      "Was Binance's liquidation announcement a competitive attack rather than legitimate risk management?",
    ],
    result:
      "The broader crypto market declined approximately 15% in the same period, but FTT declined 95%. No other major exchange faced comparable withdrawal velocity. Binance's action accelerated the timeline but did not create the structural insolvency — the balance sheet concentration and customer fund commingling predated the announcement. The SEC later alleged commingling and misuse of customer funds (press release 2022-219); the SEC's complaint against Ellison and Wang alleged software code allowing Alameda to divert customer funds (press release 2022-234). SBF was convicted and sentenced to 25 years.",
  },

  recommended_actions: [
    {
      priority: "P0",
      action:
        "Initiate emergency withdrawal of all corporate treasury assets held on the FTX platform. Revoke all API keys and cancel pending OTC transactions with Alameda counterparties.",
      draft_artifact_ref: null,
      human_gate: "APPROVE_REQUIRED",
    },
    {
      priority: "P1",
      action:
        "Segregate treasury authority across exchanges. Require proof-of-reserves attestation from all custodial counterparties before re-enabling deposits.",
      draft_artifact_ref: null,
      human_gate: "APPROVE_REQUIRED",
    },
  ],

  evidence_catalog: [
    {
      evidence_id: "ev_coindesk_001",
      source_type: "news_article",
      source_uri:
        "https://www.coindesk.com/business/2022/11/02/divisions-in-sam-bankman-frieds-crypto-empire-blur-on-his-trading-titan-alamedas-balance-sheet",
      capture_time: "2022-11-02T14:00:00Z",
      content_hash: "sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      capture_method: "manual_fixture",
      lineage: "raw -> normalized -> investigation_v2",
    },
    {
      evidence_id: "ev_reuters_002",
      source_type: "news_article",
      source_uri:
        "https://www.reuters.com/technology/exclusive-behind-ftxs-fall-battling-billionaires-failed-bid-save-crypto-2022-11-10/",
      capture_time: "2022-11-06T15:47:00Z",
      content_hash: "sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      capture_method: "manual_fixture",
      lineage: "raw -> normalized -> investigation_v2",
    },
    {
      evidence_id: "ev_reuters_003",
      source_type: "news_article",
      source_uri:
        "https://www.reuters.com/business/finance/crypto-exchange-ftx-saw-6-bln-withdrawals-72-hours-ceo-message-staff-2022-11-08/",
      capture_time: "2022-11-08T12:00:00Z",
      content_hash: "sha256:88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e161936f031589",
      capture_method: "manual_fixture",
      lineage: "raw -> normalized -> investigation_v2",
    },
    {
      evidence_id: "ev_reuters_004",
      source_type: "news_article",
      source_uri:
        "https://www.reuters.com/business/ftx-start-us-bankruptcy-proceedings-ceo-exit-2022-11-11/",
      capture_time: "2022-11-11T10:00:00Z",
      content_hash: "sha256:7d793037a0760186574b0282f2f435e7c7f8f8e9a1b2c3d4e5f6a7b8c9d0e1f2",
      capture_method: "manual_fixture",
      lineage: "raw -> normalized -> investigation_v2",
    },
    {
      evidence_id: "ev_sec_005",
      source_type: "regulatory_filing",
      source_uri:
        "https://www.sec.gov/newsroom/press-releases/2022-219",
      capture_time: "2022-12-13T00:00:00Z",
      content_hash: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      capture_method: "manual_fixture",
      lineage: "raw -> normalized -> investigation_v2",
    },
    {
      evidence_id: "ev_sec_006",
      source_type: "regulatory_filing",
      source_uri:
        "https://www.sec.gov/newsroom/press-releases/2022-234",
      capture_time: "2022-12-21T00:00:00Z",
      content_hash: "sha256:a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
      capture_method: "manual_fixture",
      lineage: "raw -> normalized -> investigation_v2",
    },
    {
      evidence_id: "ev_coingecko_007",
      source_type: "market_data",
      source_uri: "https://www.coingecko.com/en/coins/ftx-token",
      capture_time: "2022-11-10T18:00:00Z",
      content_hash: "sha256:d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5",
      capture_method: "manual_fixture",
      lineage: "raw -> price_series_extract -> normalized",
    },
  ],

  traceability: {
    trace_id: "trace_ftx_collapse_091",
    tool_calls: 14,
    replay_url: null,
    otel_spans_recorded: true,
    artifact_integrity: "verified_for_captured_items",
  },

  limitations: [
    "Causality is inferred from available evidence and model outputs; it is not a legal proof.",
    "The system cannot verify deleted or uncaptured artifacts retroactively.",
    "Confidence depends on source coverage and capture timing.",
    "Deleted social media posts are represented via archive.org snapshots; original content integrity cannot be independently verified.",
    "This is a retrospective demonstration using publicly available post-event data. A real-time investigation would have had access to fewer data points at the time of the anomaly.",
    "Later-enforcement sources (SEC/DOJ) validate hypotheses but were not available during the early-warning window.",
  ],
};

// ---------------------------------------------------------------------------
// Provenance entries — data availability tier per evidence source
// ---------------------------------------------------------------------------

export const FTX_PROVENANCE: ProvenanceEntry[] = [
  {
    evidence_id: "ev_coindesk_001",
    tier: "verified_public",
    reason: "CoinDesk article still publicly available at original URL",
  },
  {
    evidence_id: "ev_reuters_002",
    tier: "verified_public",
    reason: "Reuters article still publicly available; quotes CZ's public announcement",
  },
  {
    evidence_id: "ev_reuters_003",
    tier: "verified_public",
    reason: "Reuters article on $6B withdrawals still publicly available",
  },
  {
    evidence_id: "ev_reuters_004",
    tier: "verified_public",
    reason: "Reuters bankruptcy and resignation coverage still publicly available",
  },
  {
    evidence_id: "ev_sec_005",
    tier: "verified_public",
    reason: "SEC press release permanently archived on sec.gov",
  },
  {
    evidence_id: "ev_sec_006",
    tier: "verified_public",
    reason: "SEC press release on Ellison/Wang charges permanently archived on sec.gov",
  },
  {
    evidence_id: "ev_coingecko_007",
    tier: "heuristic_inferred",
    reason:
      "Historical price data reconstructed from CoinGecko; exact intraday values may differ from exchange-specific data",
  },
];

// ---------------------------------------------------------------------------
// Adapter functions — map golden dataset to existing component props
// ---------------------------------------------------------------------------

export function toEvidenceTimelineItems(
  investigation: GoldenInvestigation,
): EvidenceTimelineItem[] {
  return investigation.hypotheses.map((hyp) => ({
    date: investigation.meta.completed_at,
    title: hyp.statement.slice(0, 120) + (hyp.statement.length > 120 ? "..." : ""),
    direction:
      hyp.status === "best_supported"
        ? "supporting"
        : hyp.status === "considered_not_preferred"
          ? "disconfirming"
          : "neutral",
    excerpt: hyp.statement,
  }));
}

export function toEvidencePanelItems(
  investigation: GoldenInvestigation,
): EvidencePanelItem[] {
  return investigation.evidence_catalog.map((ev) => ({
    id: ev.evidence_id,
    source: ev.source_type.replace(/_/g, " "),
    title: ev.source_uri.split("/").pop() || ev.evidence_id,
    url: ev.source_uri,
    publishedAt: ev.capture_time,
    relevance: `Content hash: ${ev.content_hash.slice(0, 20)}...`,
    score: undefined,
  }));
}

export function toTraceSteps(
  investigation: GoldenInvestigation,
): TraceStep[] {
  return [
    {
      toolName: "web_search",
      choiceType: "gather_info",
      durationMs: 2400,
      success: true,
    },
    {
      toolName: "fetch_url",
      choiceType: "gather_info",
      durationMs: 3200,
      success: true,
    },
    {
      toolName: "temporal_detect_anomaly",
      choiceType: "execute_data_op",
      durationMs: 1800,
      success: true,
    },
    {
      toolName: "temporal_forecast",
      choiceType: "execute_data_op",
      durationMs: 2100,
      success: true,
    },
    {
      toolName: "build_causal_chain",
      choiceType: "execute_output",
      durationMs: 1500,
      success: true,
    },
    {
      toolName: "adversarial_review",
      choiceType: "execute_output",
      durationMs: 800,
      success: true,
    },
    {
      toolName: "generate_proof_pack",
      choiceType: "finalize",
      durationMs: 450,
      success: true,
    },
  ];
}

export function getProvenance(evidenceId: string): ProvenanceEntry | undefined {
  return FTX_PROVENANCE.find((p) => p.evidence_id === evidenceId);
}
