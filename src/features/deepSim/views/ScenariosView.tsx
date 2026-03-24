/**
 * ScenariosView — Scenario branches with assumptions, risks, probabilities.
 * Level 3: Base / Bull / Bear scenario cards.
 */

import { memo, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { AlertTriangle, CheckCircle, GitBranch } from "lucide-react";
import { DEEP_SIM_FIXTURES, type DeepSimFixtureKey } from "../fixtures";
import { confidenceCategory } from "../types";

const CARD = "rounded-xl border border-white/[0.06] bg-white/[0.02]";
const SECTION_TITLE = "mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted";

function confidenceBarColor(c: number): string {
  const cat = confidenceCategory(c);
  switch (cat) {
    case "high": return "bg-emerald-500";
    case "medium": return "bg-cyan-500";
    case "low": return "bg-amber-500";
    case "very_low": return "bg-rose-500";
  }
}

export const ScenariosView = memo(function ScenariosView() {
  const [params] = useSearchParams();
  const fixtureKey = (params.get("fixture") ?? "investor") as DeepSimFixtureKey;
  const fixture = useMemo(() => DEEP_SIM_FIXTURES[fixtureKey] ?? DEEP_SIM_FIXTURES.investor, [fixtureKey]);
  const { ref, isVisible, instant } = useRevealOnMount();
  const scenarios = fixture.memo.scenarios;

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
          <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
          Scenarios
        </div>
        <h1 style={stagger("0.05s")} className="mt-3 text-2xl font-bold tracking-tight text-content">
          {fixture.memo.question}
        </h1>
        <p style={stagger("0.08s")} className="mt-2 text-sm text-content-muted">
          {scenarios.length} scenario branches ranked by probability.
        </p>

        {/* Probability bar */}
        <div style={stagger("0.12s")} className="mt-6 flex h-4 overflow-hidden rounded-full bg-white/[0.06]">
          {scenarios.map((s, i) => {
            const pct = Math.round(s.confidence * 100);
            return (
              <div
                key={s.id}
                className={`h-full flex items-center justify-center text-[9px] font-bold text-white/80 ${confidenceBarColor(s.confidence)}`}
                style={{ width: `${pct}%` }}
                title={`${s.title}: ${pct}%`}
              >
                {pct > 15 ? `${s.title} ${pct}%` : ""}
              </div>
            );
          })}
        </div>

        {/* Scenario cards */}
        <div style={stagger("0.18s")} className="mt-8 space-y-4">
          {scenarios.map((s, i) => {
            const pct = Math.round(s.confidence * 100);
            return (
              <div key={s.id} className={`${CARD} overflow-hidden`}>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#d97757]/10 text-sm font-bold text-[#d97757]">
                      {i === 0 ? "B" : i === 1 ? "+" : "-"}
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold text-content">{s.title}</h2>
                      <span className="text-[11px] text-content-muted">Probability: {pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${confidenceBarColor(s.confidence)}`} />
                    <span className="text-sm font-semibold tabular-nums text-content">{pct}%</span>
                  </div>
                </div>

                <div className="grid gap-0 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.06]">
                  {/* Left: Outcome + Assumptions */}
                  <div className="px-6 py-5 space-y-4">
                    <div>
                      <div className={SECTION_TITLE}>Expected Outcome</div>
                      <p className="text-sm leading-relaxed text-content">{s.expectedOutcome}</p>
                    </div>
                    <div>
                      <div className={SECTION_TITLE}>Key Assumptions</div>
                      <ul className="space-y-1.5">
                        {s.keyAssumptions.map((a, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-content-secondary">
                            <CheckCircle className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500/60" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Right: Risks + Interventions needed */}
                  <div className="px-6 py-5 space-y-4">
                    <div>
                      <div className={SECTION_TITLE}>Risks</div>
                      <ul className="space-y-1.5">
                        {s.risks.map((r, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-content-secondary">
                            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500/60" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className={SECTION_TITLE}>Interventions Needed</div>
                      <ul className="space-y-1.5">
                        {s.interventionsNeeded.map((iv, j) => (
                          <li key={j} className="flex items-start gap-2 text-xs text-content-secondary">
                            <span className="mt-0.5 flex h-3 w-3 shrink-0 items-center justify-center rounded text-[8px] font-bold text-[#d97757] bg-[#d97757]/10">
                              {j + 1}
                            </span>
                            {iv}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default ScenariosView;
