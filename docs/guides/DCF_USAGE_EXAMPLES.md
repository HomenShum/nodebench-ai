# DCF Valuation System - Usage Examples

**Status:** ✅ Production Ready
**Deployment:** https://agile-caribou-964.convex.cloud

---

## Quick Start

The DCF system is fully integrated into the Fast Agent Panel. Simply chat with the agent using natural language!

### 🎬 **Real-Time Streaming Updates**

The DCF system provides **live progress updates** during execution, similar to Claude Code, Cursor, and Lovable:

- **Step-by-step guidance** - See each calculation as it happens
- **Detailed formula breakdowns** - WACC, terminal value, and all intermediate steps explained
- **Year-by-year projections** - Watch the financial model build in real-time
- **Visual progress indicators** - Track workflow completion with live status updates
- **Spreadsheet diffs** - See exactly what's being calculated and when

All 7 workflow steps stream detailed progress to keep you informed!

### Example 1: Simple DCF Request (with Real-Time Streaming)

**User:**
```
Build a DCF for NVIDIA
```

**Agent Response (streamed live as it executes):**

**Step 1: Create Model**
```
🚀 **DCF Model Initialized**

**Company:** NVIDIA Corporation
**Ticker:** NVDA
**Industry:** Semiconductor
**Template:** semiconductor
**Model ID:** `xyz123...`

📋 **Model Structure Created:**
  1️⃣ Inputs Sheet - Industry assumptions
  2️⃣ Financials Sheet - Revenue & cash flow projections
  3️⃣ WACC Sheet - Discount rate calculation
  4️⃣ Valuation Sheet - DCF waterfall
  5️⃣ Sensitivity Sheet - Scenario analysis

🎯 **7-Step Workflow:**
  ✅ Step 1: Model created
  ⏳ Step 2: Fetch historical data
  ⏳ Step 3: Project financials
  ⏳ Step 4: Calculate WACC
  ⏳ Step 5: Compute FCF
  ⏳ Step 6: Calculate terminal value
  ⏳ Step 7: Generate AI insights
```

**Step 2: Fetch Historical Data**
```
📊 **Fetching Historical Data for NVDA**

**Years requested:** 2024, 2023, 2022, 2021, 2020
**Sources:**
  1️⃣ NodeBench cache (instant if available)
  2️⃣ SEC EDGAR API (if not cached)
  3️⃣ Yahoo Finance API (market data)

🔄 Checking cache...
✅ **Cache hit!** Retrieved from NodeBench storage

**Extracting financial metrics:**
  📈 Revenue: 5 years
  💰 Gross Profit: 5 years
  📊 EBITDA: 5 years
  💵 Free Cash Flow: 5 years
  🏦 Balance Sheet Items: 5 years

✅ **Data extraction complete!**
```

**Step 3: Build Projections**
```
📈 **5-Year Financial Projections**

**Base Year Revenue:** $60,900M

**Year-by-Year Breakdown:**

| Year | Revenue ($M) | Growth | Gross Profit | EBITDA | FCF ($M) |
|------|-------------|--------|--------------|--------|----------|
| 2025 | $79,170 | 30.0% | 70% | 55% | $42,543 |
| 2026 | $94,604 | 19.5% | 70% | 56% | $51,697 |
| 2027 | $106,680 | 12.8% | 70% | 57% | $59,042 |
| 2028 | $115,214 | 8.0% | 70% | 58% | $64,824 |
| 2029 | $121,475 | 5.4% | 70% | 58% | $68,429 |

**Key Assumptions:**
  • Growth rates decline over time (industry standard)
  • Gross margins remain stable
  • Operating leverage improves with scale
  • CapEx as % of revenue trends toward industry average
```

**Step 4: Calculate WACC**
```
💰 **Weighted Average Cost of Capital (WACC) Calculation**

**Step 1: Cost of Equity (using CAPM)**
Formula: Re = Rf + β × (Rm - Rf)
  • Risk-free rate (Rf): 4.50%
  • Beta (β): 1.68
  • Market risk premium (Rm - Rf): 6.00%
  • **Cost of Equity: 14.58%**

**Step 2: After-Tax Cost of Debt**
Formula: Rd × (1 - T)
  • Pre-tax cost of debt: 3.50%
  • Tax rate: 21.0%
  • **After-tax cost of debt: 2.77%**

**Step 3: Capital Structure Weights**
  • Equity weight: 95.0%
  • Debt weight: 5.0%

**Step 4: WACC Formula**
WACC = (E/V × Re) + (D/V × Rd × (1-T))
WACC = (95.0% × 14.58%) + (5.0% × 2.77%)

🎯 **Final WACC: 14.00%**
```

**Steps 5-6: Terminal Value**
```
🔮 **Terminal Value Calculation**

**Method:** Perpetuity Growth Model

**Formula:** TV = FCF(n+1) / (WACC - g)

**Inputs:**
  • Final year FCF: $68.43B
  • Terminal growth rate (g): 3.0%
  • WACC: 14.0%

🎯 **Terminal Value: $622.09B**
📉 **Present Value of TV: $342.79B**
```

**Step 7: Final Valuation**
```
🎯 **DCF Valuation Complete!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Valuation Waterfall ($B):**

1️⃣ **Present Value of Forecast FCF**
   • Year 1: $37.32B
   • Year 2: $39.76B
   • Year 3: $39.84B
   • Year 4: $38.38B
   • Year 5: $35.55B
   **Subtotal: $190.85B**

2️⃣ **Present Value of Terminal Value**
   • Terminal Value: $622.09B
   • Discounted to present: $342.79B
   **Contribution: 64% of EV**

3️⃣ **Enterprise Value**
   • PV(FCF) + PV(TV) = **$533.64B**

5️⃣ **Equity Value**
   • **$533.64B**

6️⃣ **Per Share Valuation**
   • Shares Outstanding: 2,460M
   • **Implied Share Price: $216.93**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Value Attribution:**
  📊 Forecast Period: 36% of EV
  🔮 Terminal Value: 64% of EV

**Sanity Checks:**
  ✅ Terminal value contribution is within healthy range (60-80%)

✅ **DCF valuation complete!** Your model is ready.
```

**Automatic Evaluation (runs in background):**
```
📈 **Evaluation Score: 82.5/100 (GOOD)**
- Historical Accuracy: 88/100
- Assumption Quality: 79/100
- Methodology: 85/100
- Valuation Match: 78/100

🎯 **Recommendations:**
1. Consider revising Year 3 growth rate - 45% seems high vs analyst consensus of 35%
2. Beta of 1.68 is slightly elevated - validate using multiple sources
3. Terminal growth rate of 3% is reasonable for semiconductor industry

💰 **Cost Savings:** $0.75 (75% cache hit rate)
```

---

## Example 2: Industry-Specific Valuation

**User:**
```
What's OpenAI worth? Use the SaaS template.
```

**Agent:** Automatically uses SaaS template (40% → 20% growth, 75% gross margin) and builds complete DCF with evaluation.

---

## Example 3: Compare Multiple Companies

**User:**
```
Build DCFs for Tesla and GM, then compare their valuations
```

**Agent:** Builds two complete DCF models, compares assumptions, growth rates, and valuations side-by-side.

---

## Backend API Usage (For Developers)

### Direct Function Calls

```typescript
// Step 1: Create DCF model
const { modelId } = await ctx.runMutation(
  api.domains.financial.dcfBuilder.createDcfModel,
  {
    entityName: "NVIDIA Corporation",
    ticker: "NVDA",
    industry: "semiconductor",
  }
);

// Step 2: Project financials
await ctx.runMutation(
  api.domains.financial.dcfBuilder.projectFinancials,
  {
    modelId,
    baseRevenue: 60900, // Millions
  }
);

// Step 3: Calculate WACC
await ctx.runMutation(
  api.domains.financial.dcfBuilder.calculateWacc,
  {
    modelId,
    beta: 1.68,
  }
);

// Step 4: Calculate terminal value
await ctx.runMutation(
  api.domains.financial.dcfBuilder.calculateTerminalValue,
  {
    modelId,
    method: "perpetuity",
    terminalGrowthRate: 0.03,
  }
);

// Step 5: Calculate valuation
const { valuation } = await ctx.runMutation(
  api.domains.financial.dcfBuilder.calculateValuation,
  {
    modelId,
    netDebt: 0,
    sharesOutstanding: 2460,
  }
);

// Step 6: Generate AI summary
const summary = await ctx.runAction(
  internal.domains.financial.dcfSummary.generateSummary,
  { modelId }
);

// Step 7: Evaluate against ground truth
const evaluation = await ctx.runAction(
  internal.domains.financial.dcfEvaluator.evaluateDcfModel,
  { modelId }
);

console.log(`Implied Price: $${valuation.valuePerShare}`);
console.log(`Evaluation Score: ${evaluation.overallScore}/100`);
console.log(`Verdict: ${evaluation.verdict}`);
```

---

## Industry Templates

| Industry | Growth Profile | Gross Margin | Forecast Period | Use Case |
|----------|----------------|--------------|-----------------|----------|
| **SaaS** | 40% → 20% | 75% | 5 years | Software, cloud services |
| **Semiconductor** | 30% → 10% | 65% | 5 years | Chip makers, hardware |
| **Biotech** | Special | 85% | 10 years | Drug development, clinical trials |
| **E-commerce** | 25% → 12% | 40% | 5 years | Online retail, marketplaces |
| **Fintech** | 35% → 15% | 60% | 5 years | Digital banking, payments |
| **Generic** | 15% → 8% | 50% | 5 years | Default for other industries |

---

## Evaluation Scoring

### 100-Point Framework

| Category | Weight | What It Measures | Good Score |
|----------|--------|------------------|------------|
| **Historical Accuracy** | 25% | Revenue, margins, cash flow vs SEC data | 80+ |
| **Assumption Quality** | 35% | Growth rates, WACC, terminal growth | 75+ |
| **Methodology** | 20% | Formula correctness, structure | 85+ |
| **Valuation Match** | 20% | Implied vs market price | 70+ |

### Verdict Scale

- **EXCELLENT (90-100):** High confidence, model is solid
- **GOOD (75-89):** Acceptable with minor adjustments
- **ACCEPTABLE (60-74):** Usable but needs review
- **POOR (40-59):** Significant issues, use with caution
- **FAILED (<40):** Model unreliable, rebuild recommended

---

## Data Sources

### Ground Truth (Official)
- **SEC EDGAR API** - 10-K, 10-Q filings (XBRL data)
- **Yahoo Finance API** - Market data, beta, analyst estimates
- **Cached in NodeBench** - Instant reuse, ~95% cost savings

### APIs Used (All Free)
- `https://data.sec.gov/api/xbrl/companyfacts/` - Financial statements
- `https://www.sec.gov/files/company_tickers.json` - Ticker-to-CIK mapping
- `https://query2.finance.yahoo.com/v10/finance/quoteSummary/` - Market data

---

## Cost Optimization

### First Run
- SEC EDGAR fetch: $0.00 (free API)
- Yahoo Finance fetch: $0.00 (free API)
- LLM synthesis (free models): $0.00
- **Total: ~$0.00-0.10**

### Subsequent Runs (Same Company)
- Cache hit (NodeBench stores): $0.00
- LLM synthesis (free models): $0.00
- **Total: ~$0.00**

### Model Strategy
```typescript
DEFAULT_MODEL = "devstral-2-free"  // Mistral Devstral 2 - 123B
FALLBACK_MODEL = "gemini-3-flash"

MODEL_PRIORITY_ORDER = [
  "devstral-2-free",      // 100% pass, 70s avg latency
  "mimo-v2-flash-free",   // 100% pass, 83s avg latency
  "gemini-3-flash",       // $0.50/M (first paid fallback)
  "gpt-5-nano",           // $0.10/M
  "claude-haiku-4.5",     // $1.00/M
]
```

**Result:** ~95% cost savings after first run due to ground truth caching

---

## Query Examples

### Query Cached Ground Truth

```typescript
// Get cached financials
const financials = await ctx.runQuery(
  api.domains.financial.groundTruthFetcher.getGroundTruthFinancials,
  {
    ticker: "NVDA",
    fiscalYear: 2024,
  }
);

// Get cached market data
const marketData = await ctx.runQuery(
  api.domains.financial.groundTruthFetcher.getMarketData,
  { ticker: "NVDA" }
);

// Get evaluation results
const evaluation = await ctx.runQuery(
  api.domains.financial.dcfEvaluator.getEvaluation,
  { modelId }
);

// Get evaluation leaderboard
const leaderboard = await ctx.runQuery(
  api.domains.financial.dcfEvaluator.getEvaluationLeaderboard,
  { limit: 10 }
);
```

---

## Advanced: Custom Assumptions

If you want to override default assumptions:

```typescript
// After creating model, update template assumptions
const model = await ctx.runQuery(
  api.domains.financial.dcfBuilder.getDcfModel,
  { modelId }
);

// Parse template
const template = JSON.parse(model.template);

// Modify assumptions
template.revenueGrowth.years[0].rate = 0.50;  // 50% Y1 growth
template.wacc.beta = 1.8;  // Higher beta

// Save back
await ctx.runMutation(
  api.domains.financial.dcfBuilder.updateDcfModel,
  {
    modelId,
    template: JSON.stringify(template),
  }
);
```

---

## Troubleshooting

### Issue: "No data found for FY2024"
**Solution:** SEC EDGAR data may not be available yet. Try previous fiscal year (2023).

### Issue: "Could not find CIK for ticker"
**Solution:** Check ticker symbol is correct. Some companies may not be in SEC database.

### Issue: "Evaluation score is low"
**Solution:** Review recommendations. Often due to:
- Growth rates too aggressive
- Beta doesn't match market data
- Terminal growth rate unrealistic
- Historical data doesn't match SEC filings

### Issue: "Model taking too long"
**Solution:** Check internet connection. SEC EDGAR and Yahoo Finance APIs may be slow. First run takes longer, subsequent runs are instant (cached).

---

## Next Steps

1. **Try it out:** Ask the agent "Build a DCF for [your favorite company]"
2. **Review results:** Check evaluation score and recommendations
3. **Iterate:** Adjust assumptions based on recommendations
4. **Compare:** Build DCFs for competitors to compare valuations

**Questions?** The evaluation system provides detailed feedback on every aspect of your model!

---

*System Version: 1.0*
*Last Updated: January 20, 2026*
*Deployment: https://agile-caribou-964.convex.cloud*
