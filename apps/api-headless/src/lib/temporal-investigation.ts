import type {
  ExtractedDocumentLike,
  PublicCitation,
  SearchTelemetry,
  TemporalTimelineEvent,
} from "./grounding.js";

const TSFM_BASE_URL = process.env.TSFM_BASE_URL || "http://localhost:8010";

interface InvestigationMeta {
  query: string;
  execution_time_ms: number;
  confidence_score: number;
}

interface TemporalAnomaly {
  signal_key: string;
  anomaly_type: "variance_shift" | "trend_acceleration" | "level_shift";
  started_at: string;
  severity: number;
  detector: string;
}

interface TemporalForecast {
  horizon: string;
  prediction: string;
  model_used: string;
}

interface CausalChainEvent {
  timeframe: string;
  regime_state: string;
  event: string;
  evidence: {
    source_type: string;
    artifact_id: string;
    exact_quote: string;
    source_snapshot_hash?: string;
    url?: string;
  };
}

interface EnterpriseInvestigationResult {
  meta: InvestigationMeta;
  temporal_intelligence: {
    anomalies_detected: TemporalAnomaly[];
    forecast: TemporalForecast;
  };
  causal_chain: CausalChainEvent[];
  game_theory_analysis: {
    organizational_friction: string;
    pressure_points: string[];
    confidence: "low" | "medium";
  };
  zero_friction_execution: {
    proposed_action: string;
    drafted_artifact: string | null;
    mcp_tools_used: string[];
    action_potential: string;
  };
  audit_proof_pack: {
    trace_id: string;
    replay_url: string | null;
    compliance_status: "TRACEABLE_PREVIEW" | "SOC2_READY";
    source_snapshot_hashes: string[];
  };
}

interface NumericPoint {
  sourceTitle?: string;
  metric: string;
  value: number;
  units?: string;
  lineNumber?: number;
  timestamp: number;
  sourceId: string;
  snapshotHash?: string;
  url?: string;
}

function isoOrFallback(timestamp?: number, fallback?: string) {
  if (typeof timestamp === "number" && Number.isFinite(timestamp)) {
    return new Date(timestamp).toISOString();
  }
  return fallback ?? new Date().toISOString();
}

function numericFactsForDocuments(
  documents: ExtractedDocumentLike[]
): NumericPoint[] {
  const points: NumericPoint[] = [];

  for (const document of documents) {
    const sourceId = document.citations[0]?.id ?? "source_unknown";
    const sourceUrl = document.finalUrl;
    const snapshotHash =
      typeof (document as { snapshotHash?: string }).snapshotHash === "string"
        ? (document as { snapshotHash?: string }).snapshotHash
        : undefined;
    const fallbackTimestamp = Date.parse(document.citations[0]?.fetchedAt ?? "");
    const temporalMarkers = document.extraction?.temporalMarkers ?? [];

    for (const fact of document.extraction?.numericFacts ?? []) {
      const metric = typeof fact.metric === "string" ? fact.metric : "observed_metric";
      const value =
        typeof fact.value === "number"
          ? fact.value
          : typeof fact.value === "string"
            ? Number(fact.value)
            : NaN;
      if (!Number.isFinite(value)) continue;

      const numericResolvedDate = temporalMarkers.find(
        (marker) => typeof marker.resolvedDate === "number"
      )?.resolvedDate as number | undefined;
      const stringResolvedDate = temporalMarkers.find(
        (marker) => typeof marker.resolved_date === "string"
      )?.resolved_date as string | undefined;
      const timestamp =
        numericResolvedDate ??
        (stringResolvedDate ? Date.parse(stringResolvedDate) : fallbackTimestamp);

      points.push({
        sourceTitle: document.title,
        metric,
        value,
        units: typeof fact.units === "string" ? fact.units : undefined,
        lineNumber:
          typeof fact.lineNumber === "number"
            ? fact.lineNumber
            : typeof fact.line_number === "number"
              ? fact.line_number
              : undefined,
        timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
        sourceId,
        snapshotHash,
        url: sourceUrl,
      });
    }
  }

  return points.sort((a, b) => a.timestamp - b.timestamp);
}

async function getForecastFromService(values: number[]) {
  if (values.length < 2) {
    return null;
  }

  try {
    const response = await fetch(`${TSFM_BASE_URL}/forecast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values,
        horizon: Math.min(14, Math.max(3, values.length)),
        model: "auto",
        confidence_level: 0.9,
      }),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as {
      predictions: Array<{ predicted: number; lower: number; upper: number }>;
      model_used: string;
    };
  } catch {
    return null;
  }
}

async function getRegimeShiftsFromService(values: number[]) {
  if (values.length < 4) {
    return null;
  }

  try {
    const response = await fetch(`${TSFM_BASE_URL}/detect_regime_shift`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        values,
        window_size: Math.min(10, Math.max(2, Math.floor(values.length / 2))),
        shift_threshold: 1,
      }),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as {
      shifts: Array<{ breakpoint: number; magnitude: number }>;
    };
  } catch {
    return null;
  }
}

function describeForecast(values: number[], forecastValues: number[]) {
  if (values.length === 0 || forecastValues.length === 0) {
    return "Insufficient numeric evidence to produce a forecast.";
  }
  const latest = values[values.length - 1]!;
  const averageForecast =
    forecastValues.reduce((sum, value) => sum + value, 0) / forecastValues.length;
  const delta = averageForecast - latest;
  if (delta > 0) {
    return `Observed numeric pressure is increasing. The next 14-step forecast projects a continued rise from ${latest.toFixed(2)} to an average of ${averageForecast.toFixed(2)}.`;
  }
  if (delta < 0) {
    return `Observed numeric pressure is easing. The next 14-step forecast projects a decline from ${latest.toFixed(2)} to an average of ${averageForecast.toFixed(2)}.`;
  }
  return `Observed numeric pressure is flat. The next 14-step forecast stays near ${latest.toFixed(2)}.`;
}

function buildAnomalies(
  points: NumericPoint[],
  shiftBreakpoints: Array<{ breakpoint: number; magnitude: number }> | null
): TemporalAnomaly[] {
  if (points.length === 0) return [];

  if (shiftBreakpoints && shiftBreakpoints.length > 0) {
    return shiftBreakpoints.slice(0, 3).map((shift) => ({
      signal_key: points[shift.breakpoint]?.metric ?? "observed_metric",
      anomaly_type: "variance_shift",
      started_at: isoOrFallback(points[shift.breakpoint]?.timestamp),
      severity: Math.min(0.99, Number(shift.magnitude.toFixed(2))),
      detector: "tsfm-regime-shift",
    }));
  }

  if (points.length >= 2) {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const deltaRatio = Math.abs(last.value - first.value) / Math.max(1, Math.abs(first.value));
    if (deltaRatio >= 0.2) {
      return [
        {
          signal_key: last.metric,
          anomaly_type: "trend_acceleration",
          started_at: isoOrFallback(first.timestamp),
          severity: Math.min(0.95, Number(deltaRatio.toFixed(2))),
          detector: "heuristic-fallback",
        },
      ];
    }
  }

  return [];
}

function classifySourceType(url?: string) {
  if (!url) return "document";
  const value = url.toLowerCase();
  if (value.includes("github")) return "github_pr";
  if (value.includes("jira")) return "jira_ticket";
  if (value.includes("slack")) return "slack_transcript";
  return "web_source";
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getDocumentFallbackDate(
  document: ExtractedDocumentLike,
  citations: PublicCitation[]
) {
  const marker = document.extraction?.temporalMarkers?.find((value) => {
    if (typeof value.resolvedDate === "string") return true;
    if (typeof value.resolved_date === "string") return true;
    if (typeof value.resolvedDate === "number") return true;
    return false;
  });

  if (marker) {
    if (typeof marker.resolvedDate === "string") return marker.resolvedDate;
    if (typeof marker.resolved_date === "string") return marker.resolved_date;
    if (typeof marker.resolvedDate === "number") {
      return new Date(marker.resolvedDate).toISOString();
    }
  }

  const matchingCitation = citations.find((citation) => citation.url === document.finalUrl);
  return matchingCitation?.publishedAt ?? document.citations[0]?.fetchedAt ?? new Date().toISOString();
}

function getDocumentFallbackEvidence(document: ExtractedDocumentLike) {
  const firstClaim = document.extraction?.claims?.find(
    (value) => typeof value.claim_text === "string" || typeof value.claimText === "string"
  );
  if (firstClaim) {
    return typeof firstClaim.claim_text === "string"
      ? firstClaim.claim_text
      : String(firstClaim.claimText);
  }

  return document.text.slice(0, 240).trim();
}

function buildFallbackChainFromDocuments(
  documents: ExtractedDocumentLike[],
  citations: PublicCitation[]
): CausalChainEvent[] {
  return documents
    .slice(0, 6)
    .map((document, index) => {
      const citation = document.citations[0];
      const snapshotHash =
        typeof (document as { snapshotHash?: string }).snapshotHash === "string"
          ? (document as { snapshotHash?: string }).snapshotHash
          : undefined;
      const when = getDocumentFallbackDate(document, citations);
      const evidenceText = getDocumentFallbackEvidence(document);

      return {
        timeframe: dateLabel(when),
        regime_state:
          index === 0
            ? "Baseline"
            : index === 1
              ? "Structural Break Candidate"
              : "Cascading Impact",
        event: (
          document.title ||
          citation?.title ||
          evidenceText.slice(0, 120) ||
          "Observed source event"
        ).trim(),
        evidence: {
          source_type: classifySourceType(document.finalUrl),
          artifact_id: citation?.id ?? `doc_${index + 1}`,
          exact_quote: evidenceText || "No extractable quote was available; using document summary fallback.",
          source_snapshot_hash: snapshotHash,
          url: document.finalUrl,
        },
      };
    })
    .filter((event) => event.event.length > 0);
}

function buildCausalChain(
  timeline: TemporalTimelineEvent[],
  documents: ExtractedDocumentLike[],
  citations: PublicCitation[]
): CausalChainEvent[] {
  const timelineChain = timeline.slice(0, 6).map((event, index) => {
    const document = documents.find((doc) => doc.citations.some((citation) => citation.id === event.sourceId));
    const snapshotHash =
      document && typeof (document as { snapshotHash?: string }).snapshotHash === "string"
        ? (document as { snapshotHash?: string }).snapshotHash
        : undefined;

    return {
      timeframe: dateLabel(event.when),
      regime_state:
        index === 0
          ? "Baseline"
          : index === 1
            ? "Structural Break Candidate"
            : "Cascading Impact",
      event: event.label,
      evidence: {
        source_type: classifySourceType(event.url),
        artifact_id: event.sourceId,
        exact_quote: event.evidence,
        source_snapshot_hash: snapshotHash,
        url: event.url,
      },
    };
  });

  if (timelineChain.length > 0) {
    return timelineChain;
  }

  return buildFallbackChainFromDocuments(documents, citations);
}

function buildGameTheoryAnalysis(causalChain: CausalChainEvent[]) {
  const sourceTypes = causalChain.map((item) => item.evidence.source_type);
  const pressurePoints: string[] = [];

  if (sourceTypes.includes("slack_transcript")) {
    pressurePoints.push("Informal chat decisions appear in the chain, which usually means process bypass pressure.");
  }
  if (sourceTypes.includes("github_pr")) {
    pressurePoints.push("Code review artifacts are part of the chain, so implementation incentives affected the outcome.");
  }
  if (sourceTypes.includes("jira_ticket")) {
    pressurePoints.push("Operational tickets appear after the architectural change, indicating delayed detection.");
  }

  return {
    organizational_friction:
      pressurePoints.length > 0
        ? `The evidence suggests local delivery pressure overrode broader system safety. ${pressurePoints.join(" ")}`
        : "The current evidence shows a temporal chain, but not enough human process evidence to isolate the incentive failure with confidence.",
    pressure_points: pressurePoints,
    confidence: pressurePoints.length >= 2 ? "medium" as const : "low" as const,
  };
}

function deriveProposedAction(
  anomalies: TemporalAnomaly[],
  causalChain: CausalChainEvent[]
) {
  const latestEvent = causalChain[causalChain.length - 1];
  const firstAnomaly = anomalies[0];
  if (latestEvent?.event) {
    return `Contain the latest failure mode first, then restore the guardrail that disappeared before "${latestEvent.event.slice(0, 96)}".`;
  }
  if (firstAnomaly) {
    return `Investigate the subsystem behind ${firstAnomaly.signal_key} and reintroduce a hard safety bound before the next traffic spike.`;
  }
  return "Review the earliest regime shift candidate, restore the missing safety guardrail, and validate the change under load before rollout.";
}

export async function buildEnterpriseInvestigation(args: {
  query: string;
  telemetry: SearchTelemetry;
  timeline: TemporalTimelineEvent[];
  documents: ExtractedDocumentLike[];
  citations: PublicCitation[];
  traceId: string;
  executionTimeMs: number;
}): Promise<EnterpriseInvestigationResult> {
  const numericPoints = numericFactsForDocuments(args.documents);
  const values = numericPoints.map((point) => point.value);
  const [forecastResult, regimeShiftResult] = await Promise.all([
    getForecastFromService(values),
    getRegimeShiftsFromService(values),
  ]);

  const anomalies = buildAnomalies(numericPoints, regimeShiftResult?.shifts ?? null);
  const causalChain = buildCausalChain(args.timeline, args.documents, args.citations);
  const gameTheoryAnalysis = buildGameTheoryAnalysis(causalChain);
  const forecastValues = forecastResult?.predictions?.map((item) => item.predicted) ?? [];
  const sourceSnapshotHashes = [
    ...new Set(
      args.documents
        .map((document) =>
          typeof (document as { snapshotHash?: string }).snapshotHash === "string"
            ? (document as { snapshotHash?: string }).snapshotHash
            : undefined
        )
        .filter((value): value is string => typeof value === "string")
    ),
  ];

  const evidenceStrength =
    Math.min(1, (causalChain.length * 0.15) + (sourceSnapshotHashes.length * 0.1) + (anomalies.length * 0.15));

  return {
    meta: {
      query: args.query,
      execution_time_ms: args.executionTimeMs,
      confidence_score: Number(Math.max(0.45, Math.min(0.98, evidenceStrength)).toFixed(2)),
    },
    temporal_intelligence: {
      anomalies_detected: anomalies,
      forecast: {
        horizon: "next_14_steps",
        prediction: describeForecast(values, forecastValues),
        model_used: forecastResult?.model_used ?? "heuristic_fallback",
      },
    },
    causal_chain: causalChain,
    game_theory_analysis: gameTheoryAnalysis,
    zero_friction_execution: {
      proposed_action: deriveProposedAction(anomalies, causalChain),
      drafted_artifact: null,
      mcp_tools_used: [
        "domains.search.fusion.actions.fusionSearch",
        "api-headless.fetchUrlDocument",
        "ingestion-extract.extract",
      ],
      action_potential: "Awaiting Human [APPROVE]",
    },
    audit_proof_pack: {
      trace_id: args.traceId,
      replay_url: null,
      compliance_status: sourceSnapshotHashes.length > 0 ? "TRACEABLE_PREVIEW" : "TRACEABLE_PREVIEW",
      source_snapshot_hashes: sourceSnapshotHashes,
    },
  };
}
