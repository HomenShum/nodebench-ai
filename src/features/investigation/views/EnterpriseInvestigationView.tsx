import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileSearch,
  Hash,
  Layers,
  Scale,
  Shield,
  ShieldAlert,
  TrendingDown,
  XCircle,
} from "lucide-react";

import { EvidencePanel } from "@/features/research/components/EvidencePanel";
import { EvidenceTimeline } from "@/features/research/components/EvidenceTimeline";
import { TraceBreadcrumb } from "@/features/research/components/TraceBreadcrumb";
import { EvidenceProvider, useEvidence } from "@/features/research/contexts/EvidenceContext";
import { cn } from "@/lib/utils";

import { ProvenanceBadge } from "../components/ProvenanceBadge";
import {
  FTX_GOLDEN_INVESTIGATION,
  FTX_PROVENANCE,
  getProvenance,
  toEvidencePanelItems,
  toEvidenceTimelineItems,
  toTraceSteps,
} from "../data/ftxGoldenDataset";
import type { ProvenanceTier } from "../data/ftxGoldenDataset";
import { applyAdversarialReview } from "../logic/adversarialReview";
import type { AdversarialChallenge } from "../logic/adversarialReview";

// ---------------------------------------------------------------------------
// Review type styling
// ---------------------------------------------------------------------------

const REVIEW_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  temporal_proximity: { label: "Temporal Proximity", color: "text-amber-400 bg-amber-500/10" },
  missing_mechanism: { label: "Missing Mechanism", color: "text-red-400 bg-red-500/10" },
  heuristic_detector: { label: "Heuristic Detector", color: "text-orange-400 bg-orange-500/10" },
  retroactive_framing: { label: "Retroactive Framing", color: "text-purple-400 bg-purple-500/10" },
  source_concentration: { label: "Source Concentration", color: "text-blue-400 bg-blue-500/10" },
  source_recency_mismatch: { label: "Source Recency Mismatch", color: "text-cyan-400 bg-cyan-500/10" },
};

const PRIORITY_STYLES: Record<string, string> = {
  P0: "border-red-500/30 bg-red-500/5",
  P1: "border-amber-500/30 bg-amber-500/5",
  P2: "border-blue-500/30 bg-blue-500/5",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EnterpriseInvestigationViewContent() {
  const investigation = FTX_GOLDEN_INVESTIGATION;
  const { registerEvidence } = useEvidence();

  const review = useMemo(() => applyAdversarialReview(investigation), [investigation]);
  const timelineItems = useMemo(() => toEvidenceTimelineItems(investigation), [investigation]);
  const evidenceItems = useMemo(() => toEvidencePanelItems(investigation), [investigation]);
  const traceSteps = useMemo(() => toTraceSteps(investigation), [investigation]);

  useEffect(() => {
    if (evidenceItems.length > 0) {
      registerEvidence(evidenceItems);
    }
  }, [evidenceItems, registerEvidence]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* ── Section 1: Investigation Header ─────────────────────────── */}
      <header className="space-y-3">
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-widest text-content-secondary">
          <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
          Investigation Mode: Evidence-Grounded
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 normal-case tracking-normal">
            Integrity ≠ Truth
          </span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary leading-tight">
          {investigation.meta.query}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-content-tertiary">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {(investigation.meta.execution_time_ms / 1000).toFixed(1)}s
          </span>
          <span className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" aria-hidden="true" />
            {investigation.meta.investigation_id}
          </span>
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            {investigation.evidence_catalog.length} evidence sources
          </span>
          <ConfidenceGauge
            original={review.originalConfidence}
            adjusted={review.adjustedConfidence}
          />
        </div>
        <p className="text-xs text-content-quaternary italic">
          DeepTrace provides tamper-evident provenance for captured artifacts and evidence-grounded hypotheses about what happened; it does not provide cryptographic proof of causation.
        </p>
      </header>

      {/* ── Section 2: Observed Facts ───────────────────────────────── */}
      <Section title="Observed Facts" icon={<CheckCircle2 className="h-4 w-4" />}>
        <div className="space-y-3">
          {investigation.observed_facts.map((fact, i) => {
            const provenance = fact.evidence_refs[0]
              ? getProvenance(fact.evidence_refs[0])
              : undefined;
            return (
              <div
                key={fact.fact_id}
                className="rounded-lg border border-border-secondary bg-bg-secondary p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-content-primary leading-relaxed">
                      {fact.statement}
                    </p>
                    <div className="flex items-center gap-3">
                      <ConfidenceBar value={fact.confidence} />
                      {fact.evidence_refs.map((ref) => (
                        <span
                          key={ref}
                          className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-mono text-content-tertiary"
                        >
                          {ref}
                        </span>
                      ))}
                      {provenance && (
                        <ProvenanceBadge
                          tier={provenance.tier}
                          reason={provenance.reason}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Section 3: Derived Signals ──────────────────────────────── */}
      <Section title="Derived Signals" icon={<TrendingDown className="h-4 w-4" />}>
        <p className="mb-3 text-xs text-content-quaternary italic">
          Signals detected by statistical models, not causal claims.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {investigation.derived_signals.anomalies.map((anomaly) => (
            <div
              key={anomaly.signal_key}
              className="rounded-lg border border-border-secondary bg-bg-secondary p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-content-primary">
                  {anomaly.signal_key.replace(/_/g, " ")}
                </span>
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                  {(anomaly.severity * 100).toFixed(0)}% severity
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-content-tertiary">
                <span className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono">
                  {anomaly.detector}
                </span>
                <span>{anomaly.anomaly_type.replace(/_/g, " ")}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-border-secondary bg-bg-secondary p-4">
          <div className="flex items-center gap-2 text-xs font-medium text-content-secondary mb-1">
            Forecast
            <span className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono text-content-tertiary">
              {investigation.derived_signals.forecast.model}
            </span>
            <span className="text-content-quaternary">
              confidence: {(investigation.derived_signals.forecast.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-sm text-content-primary leading-relaxed">
            {investigation.derived_signals.forecast.summary}
          </p>
        </div>
      </Section>

      {/* ── Section 4: Hypotheses + Counter-Analysis ───────────────── */}
      <Section title="Hypotheses" icon={<Scale className="h-4 w-4" />}>
        <EvidenceTimeline items={timelineItems} maxVisible={5} />
        <div className="mt-4 rounded-lg border border-border-secondary bg-bg-secondary p-4 space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-content-secondary">
            Counter-Analysis
          </h4>
          <ul className="space-y-1 text-xs text-content-tertiary">
            {investigation.counter_analysis.questions_tested.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-content-quaternary">Q{i + 1}.</span>
                {q}
              </li>
            ))}
          </ul>
          <p className="text-sm text-content-primary leading-relaxed border-t border-border-secondary pt-3">
            {investigation.counter_analysis.result}
          </p>
        </div>
      </Section>

      {/* ── Section 5: Adversarial Review ──────────────────────────── */}
      {review.challenges.length > 0 && (
        <Section title="Adversarial Review" icon={<ShieldAlert className="h-4 w-4" />}>
          <div className="mb-3 flex items-center gap-3 text-sm">
            <span className="text-content-tertiary">Original confidence:</span>
            <span className="font-mono font-bold text-content-primary">
              {(review.originalConfidence * 100).toFixed(0)}%
            </span>
            <span className="text-content-quaternary">&rarr;</span>
            <span className="text-content-tertiary">Adjusted:</span>
            <span className={cn(
              "font-mono font-bold",
              review.adjustedConfidence < review.originalConfidence
                ? "text-amber-400"
                : "text-content-primary",
            )}>
              {(review.adjustedConfidence * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-red-400">
              (-{((review.originalConfidence - review.adjustedConfidence) * 100).toFixed(0)}%)
            </span>
          </div>
          <div className="space-y-3">
            {review.challenges.map((challenge, i) => (
              <ChallengeCard key={i} challenge={challenge} />
            ))}
          </div>
        </Section>
      )}

      {/* ── Section 6: Recommended Actions ─────────────────────────── */}
      <Section title="Recommended Actions" icon={<Shield className="h-4 w-4" />}>
        <p className="mb-3 text-xs text-content-quaternary italic">
          All actions require human approval before execution.
        </p>
        <div className="space-y-3">
          {investigation.recommended_actions.map((action, i) => (
            <div
              key={i}
              className={cn(
                "rounded-lg border p-4",
                PRIORITY_STYLES[action.priority] ?? "border-border-secondary bg-bg-secondary",
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-bold text-content-secondary">
                  {action.priority}
                </span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                  APPROVE REQUIRED
                </span>
              </div>
              <p className="text-sm text-content-primary leading-relaxed">
                {action.action}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Section 7: Evidence Catalog + Traceability ─────────────── */}
      <Section title="Evidence Catalog" icon={<Hash className="h-4 w-4" />}>
        <EvidenceCatalogGrouped catalog={investigation.evidence_catalog} />

        <EvidencePanel
          evidence={evidenceItems}
          title="Cited Sources"
          maxVisible={4}
        />

        <div className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-content-secondary mb-2">
            Execution Trace
          </h4>
          <TraceBreadcrumb steps={traceSteps} compact />
        </div>

        <div className="mt-4 rounded-lg border border-border-secondary bg-bg-secondary p-4 text-xs text-content-tertiary space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-content-secondary">Trace ID:</span>
            <span className="font-mono">{investigation.traceability.trace_id}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-content-secondary">Tool calls:</span>
            <span>{investigation.traceability.tool_calls}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-content-secondary">OTel spans:</span>
            <span>{investigation.traceability.otel_spans_recorded ? "Recorded" : "Not recorded"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-content-secondary">Artifact integrity:</span>
            <span>{investigation.traceability.artifact_integrity.replace(/_/g, " ")}</span>
          </div>
        </div>
      </Section>

      {/* ── Limitations ────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border-secondary bg-bg-secondary p-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-content-quaternary mb-2">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          Limitations
        </h3>
        <ul className="space-y-1">
          {investigation.limitations.map((limitation, i) => (
            <li key={i} className="text-xs text-content-quaternary leading-relaxed">
              &bull; {limitation}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function EnterpriseInvestigationView() {
  return (
    <EvidenceProvider>
      <EnterpriseInvestigationViewContent />
    </EvidenceProvider>
  );
}

// ---------------------------------------------------------------------------
// Sub-components (inline, not exported)
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-content-secondary">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function ConfidenceGauge({
  original,
  adjusted,
}: {
  original: number;
  adjusted: number;
}) {
  const delta = original - adjusted;
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className="font-mono font-bold text-content-primary">
        {(adjusted * 100).toFixed(0)}%
      </span>
      {delta > 0 && (
        <span className="text-amber-400 text-[10px]">
          ({(original * 100).toFixed(0)}% - {(delta * 100).toFixed(0)}% adversarial)
        </span>
      )}
    </span>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-1.5 w-16 rounded-full bg-bg-tertiary overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Confidence: ${pct}%`}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 0.9
              ? "bg-emerald-400"
              : value >= 0.7
                ? "bg-amber-400"
                : "bg-red-400",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-content-quaternary" aria-hidden="true">
        {pct}%
      </span>
    </div>
  );
}

const TIER_ORDER: ProvenanceTier[] = ["verified_public", "heuristic_inferred", "unavailable_simulated"];
const TIER_LABELS: Record<ProvenanceTier, string> = {
  verified_public: "Verified Public",
  heuristic_inferred: "Heuristic / Inferred",
  unavailable_simulated: "Unavailable / Simulated",
};

function EvidenceCatalogGrouped({
  catalog,
}: {
  catalog: typeof FTX_GOLDEN_INVESTIGATION.evidence_catalog;
}) {
  // Group by provenance tier, then by source_type within each tier
  const grouped = TIER_ORDER.map((tier) => {
    const entries = catalog.filter((ev) => {
      const prov = getProvenance(ev.evidence_id);
      return prov?.tier === tier;
    });
    return { tier, label: TIER_LABELS[tier], entries };
  }).filter((g) => g.entries.length > 0);

  // Any evidence without provenance mapping goes into a fallback group
  const mappedIds = new Set(FTX_PROVENANCE.map((p) => p.evidence_id));
  const unmapped = catalog.filter((ev) => !mappedIds.has(ev.evidence_id));

  return (
    <div className="space-y-4 mb-4">
      {grouped.map(({ tier, label, entries }) => (
        <div key={tier}>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-content-quaternary mb-2">
            {label}
          </h4>
          <div className="space-y-2">
            {entries.map((ev) => {
              const provenance = getProvenance(ev.evidence_id);
              return (
                <EvidenceCatalogRow key={ev.evidence_id} ev={ev} provenance={provenance} />
              );
            })}
          </div>
        </div>
      ))}
      {unmapped.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-content-quaternary mb-2">
            Uncategorized
          </h4>
          <div className="space-y-2">
            {unmapped.map((ev) => (
              <EvidenceCatalogRow key={ev.evidence_id} ev={ev} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceCatalogRow({
  ev,
  provenance,
}: {
  ev: typeof FTX_GOLDEN_INVESTIGATION.evidence_catalog[number];
  provenance?: ReturnType<typeof getProvenance>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-secondary bg-bg-secondary px-4 py-2.5 text-xs">
      <span className="font-mono text-content-tertiary w-32 flex-shrink-0 truncate">
        {ev.evidence_id}
      </span>
      <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-content-quaternary">
        {ev.source_type.replace(/_/g, " ")}
      </span>
      <a
        href={ev.source_uri}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Evidence source: ${ev.source_type.replace(/_/g, " ")} (opens in new tab)`}
        className="min-w-0 flex-1 truncate text-accent-primary hover:underline"
      >
        {ev.source_uri}
      </a>
      <span className="font-mono text-content-quaternary truncate max-w-[120px]" title={ev.content_hash}>
        {ev.content_hash.slice(0, 16)}...
      </span>
      {provenance && (
        <ProvenanceBadge tier={provenance.tier} reason={provenance.reason} />
      )}
    </div>
  );
}

function ChallengeCard({ challenge }: { challenge: AdversarialChallenge }) {
  const config = REVIEW_TYPE_LABELS[challenge.reviewType] ?? {
    label: challenge.reviewType,
    color: "text-content-tertiary bg-bg-tertiary",
  };

  return (
    <div className="rounded-lg border border-border-secondary bg-bg-secondary p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", config.color)}>
          {config.label}
        </span>
        <span className="text-[10px] font-mono text-red-400">
          -{(challenge.confidencePenalty * 100).toFixed(0)}%
        </span>
        {challenge.targetFactId && (
          <span className="rounded bg-bg-tertiary px-1.5 py-0.5 text-[10px] font-mono text-content-quaternary">
            {challenge.targetFactId}
          </span>
        )}
      </div>
      <p className="text-sm text-content-primary leading-relaxed">
        {challenge.finding}
      </p>
      <p className="text-xs text-content-tertiary">
        <span className="font-medium text-content-secondary">Resolution: </span>
        {challenge.resolution}
      </p>
    </div>
  );
}
