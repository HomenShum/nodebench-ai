/**
 * DecisionSnapshotView — Answer-first canvas.
 * Level 1: One paragraph answer + recommendation + confidence.
 * Perplexity-style: value above the fold.
 */

import { memo, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { ArrowRight, BarChart3, GitBranch, Layers, Search, Shield } from "lucide-react";
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

export const DecisionSnapshotView = memo(function DecisionSnapshotView() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fixtureKey = (params.get("fixture") ?? "investor") as DeepSimFixtureKey;
  const fixture = useMemo(() => DEEP_SIM_FIXTURES[fixtureKey] ?? DEEP_SIM_FIXTURES.investor, [fixtureKey]);
  const { ref, isVisible, instant } = useRevealOnMount();
  const memo_ = fixture.memo;

  const stagger = (delay: string): React.CSSProperties => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "none" : "translateY(12px)",
    transition: instant ? "none" : "opacity 0.25s ease-out, transform 0.25s ease-out",
    transitionDelay: instant ? "0s" : delay,
  });

  const pct = Math.round(memo_.confidence * 100);

  return (
    <div className="h-full overflow-y-auto">
      <div ref={ref} className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
        {/* Question */}
        <div style={stagger("0s")} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          Decision Snapshot
        </div>
        <h1 style={stagger("0.05s")} className="mt-3 text-2xl font-bold tracking-tight text-content sm:text-3xl">
          {memo_.question}
        </h1>

        {/* Recommendation — the answer */}
        <div style={stagger("0.1s")} className={`${CARD} mt-6 p-6`}>
          <div className={SECTION_TITLE}>Recommendation</div>
          <p className="text-base leading-relaxed text-content">{memo_.recommendation}</p>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-content-muted">
            <span className="flex items-center gap-1.5">
              <span className={`inline-flex h-2 w-2 rounded-full ${confidenceDotColor(memo_.confidence)}`} />
              {pct}% confidence
            </span>
            <span>{fixture.sourcePacket.sources.length} sources</span>
            <span>{memo_.evidence.length} evidence claims</span>
            <span>Check: {memo_.forecastCheckDate}</span>
          </div>
        </div>

        {/* Top 3 Variables — preview */}
        <div style={stagger("0.18s")} className="mt-8">
          <div className="flex items-center justify-between">
            <div className={SECTION_TITLE}>Top Variables</div>
            <button
              type="button"
              onClick={() => navigate(`/variables?fixture=${fixtureKey}`)}
              className="flex items-center gap-1 text-[11px] font-medium text-accent-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2">
            {memo_.topVariables.slice(0, 3).map((v, i) => (
              <div key={v.id} className={`${CARD} flex items-center gap-4 px-4 py-3`}>
                <span className="w-5 text-right text-xs font-bold tabular-nums text-content-muted">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-content">{v.name}</span>
                  <span className="ml-2 text-[10px] text-content-muted">{v.currentValue}</span>
                </div>
                <span className={`text-[10px] font-semibold uppercase ${
                  v.sensitivity === "high" ? "text-amber-400" : v.sensitivity === "medium" ? "text-blue-400" : "text-zinc-500"
                }`}>
                  {v.sensitivity}
                </span>
                <div className="w-16">
                  <div className="h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className="h-1.5 rounded-full bg-accent-primary/60"
                      style={{ width: `${v.weight * 100 * 5}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 3 Interventions — preview */}
        <div style={stagger("0.25s")} className="mt-8">
          <div className="flex items-center justify-between">
            <div className={SECTION_TITLE}>Best Next Actions</div>
            <button
              type="button"
              onClick={() => navigate(`/interventions?fixture=${fixtureKey}`)}
              className="flex items-center gap-1 text-[11px] font-medium text-accent-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-2.5">
            {memo_.interventions.slice(0, 3).map((item) => (
              <div key={item.rank} className={`${CARD} flex items-start gap-3 px-4 py-3`}>
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent-primary/10 text-[10px] font-bold text-accent-primary">
                  {item.rank}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-content">{item.title}</div>
                  <div className="mt-1 text-[11px] text-content-muted">{item.expectedDelta}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className={`inline-flex h-1.5 w-1.5 rounded-full ${confidenceDotColor(item.confidence)}`} />
                    <span className="text-content-muted">{Math.round(item.confidence * 100)}%</span>
                  </div>
                  <div className="text-[10px] text-content-muted">{item.timeframe}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scenario Summary — compact */}
        <div style={stagger("0.32s")} className="mt-8">
          <div className="flex items-center justify-between">
            <div className={SECTION_TITLE}>Scenarios</div>
            <button
              type="button"
              onClick={() => navigate(`/scenarios?fixture=${fixtureKey}`)}
              className="flex items-center gap-1 text-[11px] font-medium text-accent-primary hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {memo_.scenarios.map((s) => (
              <div key={s.id} className={`${CARD} p-4`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-content">{s.title}</span>
                  <span className="text-[10px] tabular-nums text-content-muted">
                    {Math.round(s.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-content-muted">{s.expectedOutcome}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Counter-model warning */}
        <div style={stagger("0.38s")} className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400">
            <Shield className="h-3.5 w-3.5" />
            Counter-Model
          </div>
          <p className="mt-2 text-sm text-content">{memo_.counterModel.thesis}</p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-content-muted">
            <span className={`inline-flex h-1.5 w-1.5 rounded-full ${confidenceDotColor(memo_.counterModel.confidence)}`} />
            {Math.round(memo_.counterModel.confidence * 100)}% confidence
          </div>
        </div>

        {/* What would change my mind */}
        <div style={stagger("0.42s")} className="mt-6 text-center">
          <p className="text-xs text-content-muted italic">{memo_.whatWouldChangeMyMind}</p>
        </div>

        {/* Quick nav to deeper views */}
        <div style={stagger("0.48s")} className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: BarChart3, label: "Variables", view: "variables" },
            { icon: GitBranch, label: "Scenarios", view: "scenarios" },
            { icon: Layers, label: "Interventions", view: "interventions" },
            { icon: Search, label: "Evidence", view: "evidence" },
          ].map((nav) => (
            <button
              key={nav.view}
              type="button"
              onClick={() => navigate(`/${nav.view}?fixture=${fixtureKey}`)}
              className={`${CARD} group flex flex-col items-center gap-2 p-4 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]`}
            >
              <nav.icon className="h-4 w-4 text-content-muted group-hover:text-accent-primary" />
              <span className="text-xs font-medium text-content">{nav.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default DecisionSnapshotView;
// HMR force
