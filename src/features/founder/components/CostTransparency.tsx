/**
 * CostTransparency — Real-time cost breakdown visible to users.
 *
 * Shows exactly what each query costs, where the money goes,
 * and what providers charge. No hidden fees, no opaque pricing.
 *
 * Sections:
 * 1. Session Cost Summary — running total, avg per query
 * 2. Per-Query Breakdown — classify, plan, execute, synthesize
 * 3. Provider Pricing — what each model/API costs per call
 * 4. Monthly Projection — estimated monthly cost at current usage rate
 */

import { memo, useEffect, useState } from "react";
import {
  CircleDollarSign,
  Cpu,
  Globe,
  Layers,
  TrendingUp,
  Zap,
  Search,
  Brain,
  BarChart3,
} from "lucide-react";

// ── Design tokens (matching ProfilerInsights) ─────────────────────────

const CARD = "rounded-xl border border-edge/40 bg-surface/50 p-5";
const SECTION_HEADER = "mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-content-muted";
const STAT_VALUE = "text-2xl font-semibold text-content tabular-nums";
const STAT_LABEL = "text-[10px] text-content-muted mt-0.5";
const ROW = "flex items-center justify-between rounded-lg border border-edge/30 bg-white/[0.02] px-3 py-2";

// ── Types ─────────────────────────────────────────────────────────────

interface ProviderRate {
  model: string;
  provider: string;
  inputPer1M: number;
  outputPer1M: number;
  use: string;
}

interface CostBreakdownStep {
  step: string;
  pctOfTotal: number;
  costPerQuery: number;
  detail: string;
}

// ── Static data (from production measurements) ────────────────────────

const PROVIDER_RATES: ProviderRate[] = [
  { model: "Gemini 3.1 Flash Lite", provider: "Google", inputPer1M: 0.075, outputPer1M: 0.30, use: "Classification, planning, synthesis (default)" },
  { model: "Gemini 3.1 Flash", provider: "Google", inputPer1M: 0.15, outputPer1M: 0.60, use: "Complex extraction" },
  { model: "Gemini 3.1 Pro", provider: "Google", inputPer1M: 1.25, outputPer1M: 5.00, use: "Deep analysis (QA runs)" },
  { model: "Claude Haiku 4.5", provider: "Anthropic", inputPer1M: 1.00, outputPer1M: 5.00, use: "Fallback routing" },
  { model: "Claude Sonnet 4.6", provider: "Anthropic", inputPer1M: 3.00, outputPer1M: 15.00, use: "Mid-tier synthesis" },
  { model: "Linkup Search", provider: "Linkup", inputPer1M: -1, outputPer1M: -1, use: "Web search (€0.01-0.05/call, standard depth)" },
];

const COST_BREAKDOWN: CostBreakdownStep[] = [
  { step: "Classify Intent", pctOfTotal: 3, costPerQuery: 0.0005, detail: "LLM identifies query type + extracts entities" },
  { step: "Plan Tool Chain", pctOfTotal: 7, costPerQuery: 0.0012, detail: "LLM decides which tools to call and in what order" },
  { step: "Execute Tools", pctOfTotal: 60, costPerQuery: 0.0098, detail: "web_search, recon, entity enrichment API calls" },
  { step: "Synthesize Results", pctOfTotal: 18, costPerQuery: 0.0030, detail: "LLM combines tool outputs into structured packet" },
  { step: "Overhead", pctOfTotal: 12, costPerQuery: 0.0020, detail: "Cost tracking, session management, profiling" },
];

// ── Component ─────────────────────────────────────────────────────────

function CostTransparency() {
  const [sessionData, setSessionData] = useState<{
    totalCost: number;
    queryCount: number;
    avgPerQuery: number;
  } | null>(null);

  // Fetch latest session costs from harness API
  useEffect(() => {
    let cancelled = false;
    async function fetchCosts() {
      try {
        const sessResp = await fetch("/api/harness/sessions");
        if (!sessResp.ok) return;
        const sessData = await sessResp.json();
        const sessions = sessData.sessions ?? [];
        if (sessions.length === 0) return;

        // Aggregate across all sessions
        const totalCost = sessions.reduce((s: number, sess: any) => s + (sess.totalCostUsd ?? 0), 0);
        const queryCount = sessions.reduce((s: number, sess: any) => s + (sess.turnCount ?? 0), 0);
        if (!cancelled) {
          setSessionData({
            totalCost,
            queryCount,
            avgPerQuery: queryCount > 0 ? totalCost / queryCount : 0.016,
          });
        }
      } catch { /* harness not available — show defaults */ }
    }
    fetchCosts();
    return () => { cancelled = true; };
  }, []);

  const avgCost = sessionData?.avgPerQuery ?? 0.016;
  const totalCost = sessionData?.totalCost ?? 0;
  const queryCount = sessionData?.queryCount ?? 0;

  // Monthly projection at current rate
  const dailyRate = queryCount > 0 ? queryCount : 10; // assume 10/day if no data
  const monthlyProjection = dailyRate * 30 * avgCost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-content">Cost Transparency</h2>
        <p className="mt-1 text-xs text-content-muted">
          Exactly what each query costs, where the money goes, and what providers charge. No hidden fees.
        </p>
      </div>

      {/* ── Card 1: Session Summary ─────────────────────────────── */}
      <div className={CARD}>
        <div className={SECTION_HEADER}>
          <CircleDollarSign className="h-3.5 w-3.5" />
          Session Cost Summary
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <div className={STAT_VALUE}>${totalCost.toFixed(4)}</div>
            <div className={STAT_LABEL}>Total this session</div>
          </div>
          <div>
            <div className={STAT_VALUE}>{queryCount}</div>
            <div className={STAT_LABEL}>Queries run</div>
          </div>
          <div>
            <div className={STAT_VALUE}>${avgCost.toFixed(4)}</div>
            <div className={STAT_LABEL}>Avg per query</div>
          </div>
          <div>
            <div className={STAT_VALUE}>${monthlyProjection.toFixed(2)}</div>
            <div className={STAT_LABEL}>Projected monthly</div>
          </div>
        </div>
        {queryCount === 0 && (
          <div className="mt-3 rounded-lg border border-edge/30 bg-white/[0.02] px-3 py-2 text-xs text-content-muted">
            No queries yet this session. Run a search to see real cost data.
          </div>
        )}
      </div>

      {/* ── Card 2: Per-Query Breakdown ─────────────────────────── */}
      <div className={CARD}>
        <div className={SECTION_HEADER}>
          <Layers className="h-3.5 w-3.5" />
          Per-Query Cost Breakdown
        </div>
        <p className="mb-3 text-[10px] text-content-muted">
          Average cost: ${avgCost.toFixed(4)} per query. Based on production measurements.
        </p>
        <div className="space-y-2">
          {COST_BREAKDOWN.map((step) => (
            <div key={step.step} className={ROW}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-content">{step.step}</span>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-content-muted tabular-nums">
                    {step.pctOfTotal}%
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-content-muted">{step.detail}</div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-content tabular-nums">
                ${step.costPerQuery.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
        {/* Visual bar */}
        <div className="mt-3 flex h-2 overflow-hidden rounded-full">
          {COST_BREAKDOWN.map((step, i) => {
            const colors = [
              "bg-blue-500/60",
              "bg-purple-500/60",
              "bg-amber-500/60",
              "bg-emerald-500/60",
              "bg-gray-500/40",
            ];
            return (
              <div
                key={step.step}
                className={`${colors[i]} transition-all`}
                style={{ width: `${step.pctOfTotal}%` }}
                title={`${step.step}: ${step.pctOfTotal}%`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-content-muted">
          <span>Classify 3%</span>
          <span>Plan 7%</span>
          <span>Tools 60%</span>
          <span>Synth 18%</span>
          <span>OH 12%</span>
        </div>
      </div>

      {/* ── Card 3: Provider Pricing ────────────────────────────── */}
      <div className={CARD}>
        <div className={SECTION_HEADER}>
          <Cpu className="h-3.5 w-3.5" />
          Provider Pricing (per 1M tokens)
        </div>
        <p className="mb-3 text-[10px] text-content-muted">
          NodeBench defaults to Gemini Flash Lite — 13x cheaper than Claude Haiku, 200x cheaper than Opus.
        </p>
        <div className="space-y-1.5">
          {PROVIDER_RATES.map((rate) => (
            <div key={rate.model} className={ROW}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-content">{rate.model}</span>
                  <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-content-muted">
                    {rate.provider}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-content-muted">{rate.use}</div>
              </div>
              <div className="shrink-0 text-right">
                {rate.inputPer1M >= 0 ? (
                  <>
                    <div className="text-xs font-semibold text-content tabular-nums">
                      ${rate.inputPer1M.toFixed(3)} / ${rate.outputPer1M.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-content-muted">in / out</div>
                  </>
                ) : (
                  <div className="text-xs font-semibold text-content">per call</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card 4: Monthly Projections ─────────────────────────── */}
      <div className={CARD}>
        <div className={SECTION_HEADER}>
          <TrendingUp className="h-3.5 w-3.5" />
          Monthly Cost Projections
        </div>
        <div className="space-y-2">
          {[
            { label: "Solo Founder", queries: 300, desc: "~10 queries/day" },
            { label: "Active Team", queries: 3000, desc: "~100 queries/day" },
            { label: "Power User", queries: 15000, desc: "~500 queries/day" },
          ].map((tier) => {
            const cost = tier.queries * avgCost;
            return (
              <div key={tier.label} className={ROW}>
                <div className="flex-1">
                  <div className="text-xs font-medium text-content">{tier.label}</div>
                  <div className="text-[10px] text-content-muted">{tier.desc} ({tier.queries.toLocaleString()} queries/mo)</div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-content tabular-nums">
                  ${cost.toFixed(2)}/mo
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Card 5: Honest Limitations ──────────────────────────── */}
      <div className={CARD}>
        <div className={SECTION_HEADER}>
          <Brain className="h-3.5 w-3.5" />
          Honest Limitations
        </div>
        <div className="space-y-2 text-xs text-content-muted">
          <div className="flex gap-2">
            <span className="shrink-0 text-amber-400">1.</span>
            <span>Cost tracking is estimated from payload sizes (length/4), not metered from API headers. Real costs may be 10-30% higher.</span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-amber-400">2.</span>
            <span>Web search (Gemini Search Grounding) doesn't report per-call costs. Estimated at $0.001-0.005/call.</span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-amber-400">3.</span>
            <span>Linkup search costs ~€0.01-0.05 per call at standard depth. Used in legacy search path, not yet in harness.</span>
          </div>
          <div className="flex gap-2">
            <span className="shrink-0 text-amber-400">4.</span>
            <span>Gemini Flash Lite trades prose quality for speed/cost. Upgrading synthesis to Pro would 3x the per-query cost.</span>
          </div>
        </div>
      </div>

      {/* ── Card 6: API Cost Comparison ─────────────────────────── */}
      <div className={CARD}>
        <div className={SECTION_HEADER}>
          <BarChart3 className="h-3.5 w-3.5" />
          Cost vs. Alternatives
        </div>
        <div className="space-y-1.5">
          {[
            { product: "NodeBench (Flash Lite)", cost: "$0.016", detail: "3-5 tools, structured packet, multi-turn", highlight: true },
            { product: "Custom GPT-4o pipeline", cost: "$0.08-0.20", detail: "Similar tool chain, 5-12x more expensive" },
            { product: "Custom Claude Opus", cost: "$0.50-2.00", detail: "Highest quality, 30-125x more expensive" },
            { product: "ChatGPT Pro", cost: "$20/mo flat", detail: "Single LLM, no tool orchestration" },
            { product: "Perplexity Pro", cost: "$20/mo flat", detail: "Web search + synthesis, no tool chain" },
          ].map((alt) => (
            <div key={alt.product} className={`${ROW} ${alt.highlight ? "border-accent-primary/30 bg-accent-primary/5" : ""}`}>
              <div className="flex-1">
                <div className={`text-xs font-medium ${alt.highlight ? "text-accent-primary" : "text-content"}`}>
                  {alt.product}
                </div>
                <div className="text-[10px] text-content-muted">{alt.detail}</div>
              </div>
              <span className={`shrink-0 text-xs font-semibold tabular-nums ${alt.highlight ? "text-accent-primary" : "text-content"}`}>
                {alt.cost}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(CostTransparency);
