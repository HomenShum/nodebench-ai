/**
 * dcfModel.ts — DCF + Reverse DCF valuation for Pipeline v2.
 *
 * Standard DCF: project FCF → discount to present → intrinsic value
 * Reverse DCF: given market valuation → solve for implied growth rate
 *
 * Designed for the banker and investor lenses. Uses real metrics
 * extracted by Gemini from Linkup search results.
 *
 * References:
 * - Wall Street Prep DCF: https://www.wallstreetprep.com/knowledge/dcf-model-training-6-steps-building-dcf-model-excel/
 * - Reverse DCF: https://www.wallstreetprep.com/knowledge/reverse-dcf-model/
 * - Startup DCF: https://www.phoenixstrategy.group/blog/dcf-for-startups-vs-mature-companies
 */

// ─── Types ───────────────────────────────────────────────────────

export interface DCFInput {
  /** Current annual revenue (or ARR) in USD */
  revenue: number;
  /** Revenue growth rate assumption (0.0-1.0, e.g., 0.40 = 40%) */
  growthRate: number;
  /** FCF margin assumption (0.0-1.0, e.g., 0.15 = 15%) */
  fcfMargin: number;
  /** Discount rate / WACC (0.0-1.0, e.g., 0.12 = 12%) */
  discountRate: number;
  /** Terminal growth rate (0.0-0.05, e.g., 0.03 = 3%) */
  terminalGrowthRate: number;
  /** Projection years (typically 5-10) */
  projectionYears: number;
}

export interface DCFResult {
  /** Intrinsic enterprise value */
  enterpriseValue: number;
  /** Per-year projected FCF */
  projectedFCF: number[];
  /** Per-year discounted FCF */
  discountedFCF: number[];
  /** Terminal value (undiscounted) */
  terminalValue: number;
  /** Discounted terminal value */
  discountedTerminalValue: number;
  /** Sum of discounted FCFs */
  pvOfFCFs: number;
  /** Formatted summary */
  summary: string;
}

export interface ReverseDCFInput {
  /** Current market valuation / enterprise value */
  marketValue: number;
  /** Current annual revenue */
  revenue: number;
  /** FCF margin assumption */
  fcfMargin: number;
  /** Discount rate / WACC */
  discountRate: number;
  /** Terminal growth rate */
  terminalGrowthRate: number;
  /** Projection years */
  projectionYears: number;
}

export interface ReverseDCFResult {
  /** Implied annual growth rate that justifies the market value */
  impliedGrowthRate: number;
  /** Whether the implied growth seems reasonable */
  assessment: "undervalued" | "fairly_valued" | "overvalued" | "aggressive";
  /** Human-readable explanation */
  explanation: string;
  /** The DCF result at the implied growth rate */
  dcfAtImpliedRate: DCFResult;
}

// ─── Standard DCF ────────────────────────────────────────────────

export function runDCF(input: DCFInput): DCFResult {
  const { revenue, growthRate, fcfMargin, discountRate, terminalGrowthRate, projectionYears } = input;

  const projectedFCF: number[] = [];
  const discountedFCF: number[] = [];
  let currentRevenue = revenue;

  for (let year = 1; year <= projectionYears; year++) {
    currentRevenue *= (1 + growthRate);
    const fcf = currentRevenue * fcfMargin;
    const discountFactor = Math.pow(1 + discountRate, year);
    projectedFCF.push(Math.round(fcf));
    discountedFCF.push(Math.round(fcf / discountFactor));
  }

  // Terminal value (Gordon Growth Model)
  const terminalFCF = projectedFCF[projectedFCF.length - 1] * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (discountRate - terminalGrowthRate);
  const discountedTerminalValue = terminalValue / Math.pow(1 + discountRate, projectionYears);

  const pvOfFCFs = discountedFCF.reduce((a, b) => a + b, 0);
  const enterpriseValue = pvOfFCFs + discountedTerminalValue;

  const evInB = (enterpriseValue / 1e9).toFixed(1);
  const revInB = (revenue / 1e9).toFixed(1);

  return {
    enterpriseValue: Math.round(enterpriseValue),
    projectedFCF,
    discountedFCF,
    terminalValue: Math.round(terminalValue),
    discountedTerminalValue: Math.round(discountedTerminalValue),
    pvOfFCFs: Math.round(pvOfFCFs),
    summary: `DCF valuation: $${evInB}B (${projectionYears}yr, ${(growthRate * 100).toFixed(0)}% growth, ${(fcfMargin * 100).toFixed(0)}% FCF margin, ${(discountRate * 100).toFixed(0)}% WACC on $${revInB}B revenue)`,
  };
}

// ─── Reverse DCF ─────────────────────────────────────────────────

export function runReverseDCF(input: ReverseDCFInput): ReverseDCFResult {
  const { marketValue, revenue, fcfMargin, discountRate, terminalGrowthRate, projectionYears } = input;

  // Binary search for the growth rate that produces the market value
  let lo = -0.20; // -20% (declining)
  let hi = 2.00;  // 200% (hypergrowth)
  let impliedGrowthRate = 0;
  let bestDCF: DCFResult | null = null;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (lo + hi) / 2;
    const dcf = runDCF({
      revenue,
      growthRate: mid,
      fcfMargin,
      discountRate,
      terminalGrowthRate,
      projectionYears,
    });

    bestDCF = dcf;
    impliedGrowthRate = mid;

    if (Math.abs(dcf.enterpriseValue - marketValue) < marketValue * 0.01) {
      break; // Within 1% — close enough
    }

    if (dcf.enterpriseValue < marketValue) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  // Assess the implied growth rate
  const pct = impliedGrowthRate * 100;
  let assessment: ReverseDCFResult["assessment"];
  let explanation: string;

  if (pct < 10) {
    assessment = "undervalued";
    explanation = `Market implies only ${pct.toFixed(0)}% annual growth — below typical inflation-adjusted expectations. The company may be undervalued if it can grow faster.`;
  } else if (pct < 30) {
    assessment = "fairly_valued";
    explanation = `Market implies ${pct.toFixed(0)}% annual growth — reasonable for a growth-stage company. Valuation appears fair if growth materializes.`;
  } else if (pct < 60) {
    assessment = "overvalued";
    explanation = `Market implies ${pct.toFixed(0)}% annual growth — aggressive but achievable for high-growth tech. Significant execution risk baked in.`;
  } else {
    assessment = "aggressive";
    explanation = `Market implies ${pct.toFixed(0)}% annual growth — extremely aggressive. Requires exceptional execution and market expansion to justify.`;
  }

  return {
    impliedGrowthRate: Math.round(impliedGrowthRate * 1000) / 1000,
    assessment,
    explanation,
    dcfAtImpliedRate: bestDCF!,
  };
}

// ─── Extract metrics from search result for DCF ──────────────────

export function extractDCFInputs(result: {
  entityName: string;
  answer: string;
  keyMetrics: Array<{ label: string; value: string }>;
  signals: any[];
}): { canRunDCF: boolean; dcfInput?: DCFInput; reverseDCFInput?: ReverseDCFInput; reason?: string } {
  // Try to extract revenue and valuation from key metrics and answer text
  const text = [
    result.answer,
    ...result.keyMetrics.map(m => `${m.label}: ${m.value}`),
    ...result.signals.map((s: any) => s.name ?? ""),
  ].join(" ");

  const revenue = extractDollarAmount(text, ["revenue", "arr", "annual revenue", "annualized revenue"]);
  const valuation = extractDollarAmount(text, ["valuation", "valued at", "market cap", "worth"]);

  if (!revenue) {
    return { canRunDCF: false, reason: "No revenue data found in search results" };
  }

  // Default assumptions for tech/AI companies
  const dcfInput: DCFInput = {
    revenue,
    growthRate: 0.30,      // 30% default for growth tech
    fcfMargin: 0.15,       // 15% FCF margin
    discountRate: 0.12,    // 12% WACC
    terminalGrowthRate: 0.03, // 3% terminal
    projectionYears: 5,
  };

  const result_obj: { canRunDCF: boolean; dcfInput: DCFInput; reverseDCFInput?: ReverseDCFInput } = {
    canRunDCF: true,
    dcfInput,
  };

  if (valuation) {
    result_obj.reverseDCFInput = {
      marketValue: valuation,
      revenue,
      fcfMargin: 0.15,
      discountRate: 0.12,
      terminalGrowthRate: 0.03,
      projectionYears: 5,
    };
  }

  return result_obj;
}

// ─── Helpers ─────────────────────────────────────────────────────

function extractDollarAmount(text: string, keywords: string[]): number | null {
  for (const kw of keywords) {
    // Match patterns like "$2B", "$26 billion", "$2.5B", "$500M", "$500 million"
    const patterns = [
      new RegExp(`${kw}[^$]*\\$([\\d,.]+)\\s*(billion|B)`, "i"),
      new RegExp(`${kw}[^$]*\\$([\\d,.]+)\\s*(million|M)`, "i"),
      new RegExp(`\\$([\\d,.]+)\\s*(billion|B)[^]*?${kw}`, "i"),
      new RegExp(`\\$([\\d,.]+)\\s*(million|M)[^]*?${kw}`, "i"),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const num = parseFloat(match[1].replace(/,/g, ""));
        const unit = match[2].toLowerCase();
        if (unit === "billion" || unit === "b") return num * 1e9;
        if (unit === "million" || unit === "m") return num * 1e6;
      }
    }
  }
  return null;
}
