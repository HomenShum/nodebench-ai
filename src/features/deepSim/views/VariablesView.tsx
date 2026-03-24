/**
 * VariablesView — Full variable map with weights, sensitivity, data completeness.
 * Level 2: Ranked variables that drive the decision.
 */

import { memo, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRevealOnMount } from "@/hooks/useRevealOnMount";
import { BarChart3, ChevronDown, ChevronRight } from "lucide-react";
import { DEEP_SIM_FIXTURES, type DeepSimFixtureKey } from "../fixtures";
import { confidenceCategory } from "../types";

const CARD = "rounded-xl border border-white/[0.06] bg-white/[0.02]";
const SECTION_TITLE = "mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-content-muted";

function sensitivityColor(s: "high" | "medium" | "low"): string {
  return s === "high" ? "text-amber-400 bg-amber-400/10" : s === "medium" ? "text-blue-400 bg-blue-400/10" : "text-zinc-400 bg-zinc-400/10";
}

function completenessBar(c: number): string {
  if (c >= 0.8) return "bg-emerald-500/60";
  if (c >= 0.5) return "bg-cyan-500/60";
  return "bg-amber-500/60";
}

export const VariablesView = memo(function VariablesView() {
  const [params] = useSearchParams();
  const fixtureKey = (params.get("fixture") ?? "investor") as DeepSimFixtureKey;
  const fixture = useMemo(() => DEEP_SIM_FIXTURES[fixtureKey] ?? DEEP_SIM_FIXTURES.investor, [fixtureKey]);
  const { ref, isVisible, instant } = useRevealOnMount();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const variables = fixture.memo.topVariables;
  const totalWeight = variables.reduce((sum, v) => sum + v.weight, 0);

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
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          Variables
        </div>
        <h1 style={stagger("0.05s")} className="mt-3 text-2xl font-bold tracking-tight text-content">
          {fixture.memo.question}
        </h1>
        <p style={stagger("0.08s")} className="mt-2 text-sm text-content-muted">
          {variables.length} variables ranked by weight. Click to expand details.
        </p>

        {/* Weight distribution bar */}
        <div style={stagger("0.12s")} className="mt-6">
          <div className={SECTION_TITLE}>Weight Distribution</div>
          <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]">
            {variables.map((v, i) => (
              <div
                key={v.id}
                className="h-full transition-all duration-300"
                style={{
                  width: `${(v.weight / totalWeight) * 100}%`,
                  backgroundColor: `hsl(${20 + i * 30}, 60%, ${55 - i * 5}%)`,
                }}
                title={`${v.name}: ${Math.round((v.weight / totalWeight) * 100)}%`}
              />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-content-muted">
            {variables.map((v, i) => (
              <span key={v.id} className="flex items-center gap-1">
                <span
                  className="inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: `hsl(${20 + i * 30}, 60%, ${55 - i * 5}%)` }}
                />
                {v.name} ({Math.round((v.weight / totalWeight) * 100)}%)
              </span>
            ))}
          </div>
        </div>

        {/* Variable cards */}
        <div style={stagger("0.18s")} className="mt-8 space-y-3">
          {variables.map((v, i) => {
            const isExpanded = expandedId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : v.id)}
                className={`${CARD} w-full p-4 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.04]`}
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#d97757]/10 text-xs font-bold text-[#d97757]">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-content">{v.name}</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase ${sensitivityColor(v.sensitivity)}`}>
                        {v.sensitivity}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-content-muted">{v.category}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs tabular-nums text-content">{v.currentValue}</div>
                      <div className="text-[10px] text-content-muted">weight: {v.weight.toFixed(2)}</div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-content-muted" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-content-muted" />
                    )}
                  </div>
                </div>

                {/* Data completeness bar */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] text-content-muted w-24">Data completeness</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.06]">
                    <div
                      className={`h-1.5 rounded-full transition-all ${completenessBar(v.dataCompleteness)}`}
                      style={{ width: `${v.dataCompleteness * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] tabular-nums text-content-muted w-8 text-right">
                    {Math.round(v.dataCompleteness * 100)}%
                  </span>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-content-muted mb-2">
                      What would change my mind
                    </div>
                    <p className="text-xs leading-relaxed text-content-secondary italic">
                      {v.whatWouldChangeMyMind}
                    </p>
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

export default VariablesView;
