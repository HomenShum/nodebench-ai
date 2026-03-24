/**
 * InterventionsView — Ranked intervention ladder.
 * Level 4: Actions with expected impact, cost, timeframe, confirmation/denial criteria.
 */

import { memo, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
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

export const InterventionsView = memo(function InterventionsView() {
  const [params] = useSearchParams();
  const fixtureKey = (params.get("fixture") ?? "investor") as DeepSimFixtureKey;
  const fixture = useMemo(() => DEEP_SIM_FIXTURES[fixtureKey] ?? DEEP_SIM_FIXTURES.investor, [fixtureKey]);
  const { ref, isVisible, instant } = useRevealOnMount();
  const [expandedRank, setExpandedRank] = useState<number | null>(null);

  const interventions = fixture.memo.interventions;

  const stagger = (delay: string): React.CSSProperties => ({
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? "none" : "translateY(12px)",
    transition: instant ? "none" : "opacity 0.25s ease-out, transform 0.25s ease-out",
    transitionDelay: instant ? "0s" : delay,
  });

  return (
    <div className="h-full overflow-y-auto">
      <div ref={ref} className="mx-auto max-w-3xl px-6 py-10 lg:py-14">
        <div style={stagger("0s")} className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted">
          <Layers className="h-3.5 w-3.5" aria-hidden="true" />
          Intervention Ladder
        </div>
        <h1 style={stagger("0.05s")} className="mt-3 text-2xl font-bold tracking-tight text-content">
          {fixture.memo.question}
        </h1>
        <p style={stagger("0.08s")} className="mt-2 text-sm text-content-muted">
          {interventions.length} ranked actions by expected impact. Click to expand confirmation criteria.
        </p>

        {/* Intervention cards */}
        <div style={stagger("0.15s")} className="mt-8 space-y-4">
          {interventions.map((item) => {
            const isExpanded = expandedRank === item.rank;
            const pct = Math.round(item.confidence * 100);

            return (
              <button
                key={item.rank}
                type="button"
                onClick={() => setExpandedRank(isExpanded ? null : item.rank)}
                className={`${CARD} w-full p-0 text-left overflow-hidden transition-all duration-200 hover:border-white/[0.12]`}
              >
                {/* Main row */}
                <div className="flex items-start gap-4 px-6 py-5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#d97757]/10 text-sm font-bold text-[#d97757]">
                    {item.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-content">{item.title}</h3>
                    <p className="mt-1 text-xs text-content-muted">{item.expectedDelta}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-[10px]">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-content-muted">
                        {item.category}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-content-muted">
                        Cost: {item.cost}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-2.5 py-1 text-content-muted">
                        {item.timeframe}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex h-2 w-2 rounded-full ${confidenceDotColor(item.confidence)}`} />
                        <span className="text-sm font-semibold tabular-nums text-content">{pct}%</span>
                      </div>
                      <div className="text-[10px] text-content-muted mt-0.5">confidence</div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-content-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-content-muted" />
                    )}
                  </div>
                </div>

                {/* Expanded: Confirmation + Denial criteria */}
                {isExpanded && (
                  <div className="border-t border-white/[0.06] px-6 py-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-400 mb-2">
                        What would confirm this works
                      </div>
                      <p className="text-xs leading-relaxed text-content-secondary">
                        {item.whatWouldConfirm}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-400 mb-2">
                        What would deny this works
                      </div>
                      <p className="text-xs leading-relaxed text-content-secondary">
                        {item.whatWouldDeny}
                      </p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default InterventionsView;
