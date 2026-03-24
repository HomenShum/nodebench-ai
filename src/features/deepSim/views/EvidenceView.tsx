/**
 * EvidenceView — Source drawer, provenance, dissent, timeline.
 * Level 5: Evidence claims, sources, counter-models, contradictions.
 */

import { memo, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { AlertTriangle, BookOpen, ChevronDown, ChevronRight, ExternalLink, FileText, Search, Shield } from "lucide-react";
import { DEEP_SIM_FIXTURES, type DeepSimFixtureKey } from "../fixtures";
import { confidenceCategory } from "../types";

const CARD = "rounded-xl border border-white/[0.06] bg-white/[0.02]";
const SECTION_TITLE = "mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted";

function confidenceDotColor(c: number): string {
  const cat = confidenceCategory(c);
  switch (cat) {
    case "high": return "bg-emerald-500";
    case "medium": return "bg-cyan-500";
    case "low": return "bg-amber-500";
    case "very_low": return "bg-rose-500";
  }
}

function confidenceLabel(c: number): string {
  const cat = confidenceCategory(c);
  switch (cat) {
    case "high": return "High";
    case "medium": return "Medium";
    case "low": return "Low";
    case "very_low": return "Very Low";
  }
}

const SOURCE_TYPE_ICON: Record<string, typeof FileText> = {
  filing: FileText,
  interview: BookOpen,
  signal: Search,
  market: ExternalLink,
  product: ExternalLink,
  social: ExternalLink,
  trust_node: Shield,
  benchmark: ExternalLink,
};

export const EvidenceView = memo(function EvidenceView() {
  const [params] = useSearchParams();
  const fixtureKey = (params.get("fixture") ?? "investor") as DeepSimFixtureKey;
  const fixture = useMemo(() => DEEP_SIM_FIXTURES[fixtureKey] ?? DEEP_SIM_FIXTURES.investor, [fixtureKey]);
  const { ref, isVisible, instant } = useRevealOnMount();
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"claims" | "sources" | "counter">("claims");

  const { evidence, counterModel } = fixture.memo;
  const { sources } = fixture.sourcePacket;
  const summary = fixture.evidenceSummary;

  const stagger = (delay: string): React.CSSProperties => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "none" : "translateY(12px)",
    transition: instant ? "none" : "opacity 0.25s ease-out, transform 0.25s ease-out",
    transitionDelay: instant ? "0s" : delay,
  });

  return (
    <div className="h-full overflow-y-auto">
      <div ref={ref} className="mx-auto max-w-4xl px-6 py-10 lg:py-14">
        <div style={stagger("0s")} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Evidence
        </div>
        <h1 style={stagger("0.05s")} className="mt-3 text-2xl font-bold tracking-tight text-content">
          {fixture.memo.question}
        </h1>

        {/* Summary stats */}
        <div style={stagger("0.1s")} className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Sources", value: summary.sourceCount, color: "text-content" },
            { label: "Verified", value: summary.verifiedCount, color: "text-emerald-400" },
            { label: "Partial", value: summary.partialCount, color: "text-amber-400" },
            { label: "Unverified", value: summary.unverifiedCount, color: "text-rose-400" },
          ].map((stat) => (
            <div key={stat.label} className={`${CARD} p-4 text-center`}>
              <div className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-content-muted">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={stagger("0.15s")} className="mt-8 flex gap-1 rounded-lg bg-white/[0.04] p-1">
          {(["claims", "sources", "counter"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-md px-4 py-2 text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-white/[0.08] text-content shadow-sm"
                  : "text-content-muted hover:text-content"
              }`}
            >
              {tab === "claims" ? `Claims (${evidence.length})` : tab === "sources" ? `Sources (${sources.length})` : "Counter-Model"}
            </button>
          ))}
        </div>

        {/* Claims tab */}
        {activeTab === "claims" && (
          <div style={stagger("0.2s")} className="mt-6 space-y-3">
            {evidence.map((claim) => {
              const isExpanded = expandedClaimId === claim.id;
              const pct = Math.round(claim.confidence * 100);
              return (
                <button
                  key={claim.id}
                  type="button"
                  onClick={() => setExpandedClaimId(isExpanded ? null : claim.id)}
                  className={`${CARD} w-full p-0 text-left overflow-hidden transition-all duration-200 hover:border-white/[0.12]`}
                >
                  <div className="flex items-start gap-4 px-5 py-4">
                    <span className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${confidenceDotColor(claim.confidence)}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-content">{claim.text}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-content-muted">
                        <span>{pct}% — {confidenceLabel(claim.confidence)}</span>
                        <span>{claim.sources.length} sources</span>
                        {claim.contradictions.length > 0 && (
                          <span className="text-amber-400">{claim.contradictions.length} contradictions</span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-content-muted shrink-0" /> : <ChevronRight className="h-4 w-4 text-content-muted shrink-0" />}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/[0.06] px-5 py-4 space-y-3">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-content-muted mb-1">Sources</div>
                        <ul className="space-y-1">
                          {claim.sources.map((s, i) => (
                            <li key={i} className="text-xs text-content-secondary">{s}</li>
                          ))}
                        </ul>
                      </div>
                      {claim.contradictions.length > 0 && (
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-400 mb-1">Contradictions</div>
                          <ul className="space-y-1">
                            {claim.contradictions.map((c, i) => (
                              <li key={i} className="text-xs text-content-secondary">{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-content-muted mb-1">What would change my mind</div>
                        <p className="text-xs text-content-secondary italic">{claim.whatWouldChangeMyMind}</p>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Sources tab */}
        {activeTab === "sources" && (
          <div style={stagger("0.2s")} className="mt-6 space-y-3">
            {sources.map((source, i) => {
              const Icon = SOURCE_TYPE_ICON[source.type] ?? FileText;
              return (
                <div key={i} className={`${CARD} flex items-start gap-4 px-5 py-4`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                    <Icon className="h-4 w-4 text-content-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/[0.05] px-2 py-0.5 text-[9px] font-semibold uppercase text-content-muted">
                        {source.type}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-medium text-content">{source.ref}</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-content-muted">{source.summary}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Counter-model tab */}
        {activeTab === "counter" && (
          <div style={stagger("0.2s")} className="mt-6 space-y-4">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-6">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Counter-Model Thesis
              </div>
              <p className="mt-3 text-base leading-relaxed text-content">{counterModel.thesis}</p>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] text-content-muted">
                <span className={`inline-flex h-2 w-2 rounded-full ${confidenceDotColor(counterModel.confidence)}`} />
                {Math.round(counterModel.confidence * 100)}% confidence
              </div>
            </div>

            <div className={`${CARD} p-5`}>
              <div className={SECTION_TITLE}>Key Evidence</div>
              <ul className="space-y-2">
                {counterModel.keyEvidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-content-secondary">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500/60" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>

            <div className={`${CARD} p-5`}>
              <div className={SECTION_TITLE}>Key Assumption</div>
              <p className="text-sm text-content">{counterModel.keyAssumption}</p>
            </div>

            <div className={`${CARD} p-5`}>
              <div className={SECTION_TITLE}>What Would Validate This</div>
              <p className="text-sm text-content italic">{counterModel.whatWouldValidate}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default EvidenceView;
