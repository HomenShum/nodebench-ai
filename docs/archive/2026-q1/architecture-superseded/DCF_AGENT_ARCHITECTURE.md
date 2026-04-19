# DCF Evaluation Agent - Deep Agent Architecture

**Version:** 2.0
**Date:** January 22, 2026
**Pattern:** LangChain Deep Research + LangGraph Checkpointing + Cursor UX

---

## Executive Summary

This document specifies the architecture for a production-grade DCF evaluation agent following best practices from:
- **LangChain Deep Research**: Three-phase supervisor-researcher workflow
- **LangGraph**: Checkpointing for human-in-the-loop and error recovery
- **Cursor**: Multi-agent progress visualization with detailed logs
- **Vercel v0**: Streaming results with mid-stream validation
- **Google ADK**: State management via session whiteboard pattern
- **OpenAI**: Tool composition and error handling strategies

---

## 1. Architecture Overview

### 1.1 Three-Phase Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 1: SCOPING                         │
│  User clarification → Scenario selection → Assumptions     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ [Checkpoint: Approve assumptions]
┌─────────────────────────────────────────────────────────────┐
│                   Phase 2: RESEARCH                         │
│          Parallel Sub-Agents (Cursor pattern)               │
│  ┌──────────────┬──────────────┬──────────────────────┐    │
│  │ Financial    │ Market       │ Peer Analysis        │    │
│  │ Data Agent   │ Data Agent   │ Agent                │    │
│  └──────────────┴──────────────┴──────────────────────┘    │
│                         │                                   │
│                         ▼                                   │
│                  Calculation Agent                          │
│              (WACC → FCF → Terminal → PV)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ [Checkpoint: Review WACC & valuation]
┌─────────────────────────────────────────────────────────────┐
│                  Phase 3: EVALUATION                        │
│  Ground truth comparison → Scoring → Insights → Report     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼ [Checkpoint: Review report before save]
                   DONE
```

### 1.2 State Management (LangGraph Pattern)

**PostgreSQL Checkpointing:**
```typescript
type DCFCheckpoint = {
  checkpointId: string;
  threadId: string;      // Session persistence
  timestamp: number;
  phase: 'scoping' | 'research' | 'evaluation';
  state: DCFSessionState;
  userApprovals: string[];
  canRollback: boolean;
};

type DCFSessionState = {
  // Phase 1: Scoping
  ticker: string;
  companyName: string;
  scenario: 'base' | 'bull' | 'bear' | 'custom';
  userAssumptions?: {
    wacc?: number;
    terminalGrowth?: number;
    revenueGrowth?: number[];
  };

  // Phase 2: Research
  financialData?: {
    incomeStatement: any;
    balanceSheet: any;
    cashFlow: any;
    source: 'sec_edgar' | 'cached' | 'manual';
  };
  marketData?: {
    currentPrice: number;
    beta: number;
    riskFreeRate: number;
    marketRiskPremium: number;
  };
  peerData?: {
    comparables: Array<{ ticker: string; multiple: number }>;
    industryMedian: number;
  };

  // Calculations
  calculations?: {
    wacc: number;
    fcfProjections: number[];
    terminalValue: number;
    enterpriseValue: number;
    equityValue: number;
    fairValuePerShare: number;
  };

  // Phase 3: Evaluation
  groundTruth?: {
    fairValue: number;
    source: string;
    confidence: number;
  };
  evaluation?: {
    overallScore: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    discrepancies: Array<{
      component: string;
      calculated: number;
      expected: number;
      impact: 'high' | 'medium' | 'low';
    }>;
  };

  // Meta
  startedAt: number;
  updatedAt: number;
  currentStep: number;
  totalSteps: number;
  errors: Array<{ step: string; error: string; recoveredVia?: string }>;
};
```

**Checkpoint Operations:**
```typescript
// Save checkpoint after each phase
await saveCheckpoint(threadId, state);

// Human approval pause
const approved = await waitForApproval(checkpointId, 'wacc_calculation');

// Rollback on error or user request
await rollbackToCheckpoint(checkpointId);

// Branch to try alternative approach
const newThreadId = await branchFromCheckpoint(checkpointId);
```

---

## 2. Tool Architecture

### 2.1 Tool Hierarchy (Fine + Coarse Grained)

**Data Layer (Coarse-grained)**
```typescript
// Single tool, multiple API calls
export const fetchCompanyFinancials = createTool({
  description: "Fetch complete financial statements from SEC EDGAR with fallbacks",
  args: z.object({
    ticker: z.string(),
    years: z.number().array().default([2023, 2022, 2021]),
    forceRefresh: z.boolean().default(false),
  }),
  handler: async (ctx, args) => {
    // Try SEC EDGAR
    try {
      const data = await secEdgarClient.getCompanyFacts(args.ticker);
      const financials = extractFinancials(data, args.years);
      await cache.set(`financials:${args.ticker}`, financials, 24h);
      return { source: 'sec_edgar', ...financials };
    } catch (error) {
      // Fallback to cache
      const cached = await cache.get(`financials:${args.ticker}`);
      if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return { source: 'cached', ...cached.data, warning: 'Using cached data from SEC API failure' };
      }
      // Fallback to manual seed
      const manual = await getManuallySeededData(args.ticker);
      if (manual) {
        return { source: 'manual', ...manual, warning: 'Using manually seeded data' };
      }
      throw new Error(`Could not fetch financials for ${args.ticker} from any source`);
    }
  },
});
```

**Calculation Layer (Fine-grained)**
```typescript
// Separate tools for each calculation step
export const calculateWACC = createTool({
  description: "Calculate Weighted Average Cost of Capital using CAPM",
  args: z.object({
    riskFreeRate: z.number(),
    beta: z.number(),
    marketRiskPremium: z.number().default(7.5),
    debtRatio: z.number(),
    taxRate: z.number(),
  }),
  handler: async (ctx, args) => {
    const costOfEquity = args.riskFreeRate + (args.beta * args.marketRiskPremium);
    const costOfDebt = args.riskFreeRate + 2.0; // Simplified
    const wacc = (costOfEquity * (1 - args.debtRatio)) +
                 (costOfDebt * args.debtRatio * (1 - args.taxRate));

    return {
      wacc: wacc / 100,
      components: {
        costOfEquity,
        costOfDebt,
        equityWeight: 1 - args.debtRatio,
        debtWeight: args.debtRatio,
      },
      formula: "WACC = (Re × E/V) + (Rd × D/V × (1-T))",
    };
  },
});

export const projectFreeCashFlow = createTool({
  description: "Project 5-year free cash flow with specified growth rates",
  args: z.object({
    baseFCF: z.number(),
    growthRates: z.number().array().length(5),
    marginImprovements: z.number().array().optional(),
  }),
  handler: async (ctx, args) => {
    const projections = [];
    let currentFCF = args.baseFCF;

    for (let i = 0; i < 5; i++) {
      currentFCF = currentFCF * (1 + args.growthRates[i]);
      if (args.marginImprovements?.[i]) {
        currentFCF *= (1 + args.marginImprovements[i]);
      }
      projections.push({
        year: 2024 + i,
        fcf: currentFCF,
        growth: args.growthRates[i],
      });
    }

    return { projections, finalFCF: currentFCF };
  },
});

export const calculateTerminalValue = createTool({
  description: "Calculate terminal value using perpetuity growth model",
  args: z.object({
    finalFCF: z.number(),
    terminalGrowth: z.number(),
    wacc: z.number(),
  }),
  handler: async (ctx, args) => {
    if (args.terminalGrowth >= args.wacc) {
      throw new Error(`Terminal growth (${args.terminalGrowth}) must be < WACC (${args.wacc})`);
    }

    const terminalValue = (args.finalFCF * (1 + args.terminalGrowth)) /
                          (args.wacc - args.terminalGrowth);

    return {
      terminalValue,
      formula: "TV = FCF₅ × (1+g) / (WACC - g)",
      assumptions: {
        perpetuityGrowth: args.terminalGrowth,
        impliesForeverGrowth: true,
      },
    };
  },
});

export const discountToPresent = createTool({
  description: "Discount future cash flows to present value",
  args: z.object({
    cashFlows: z.number().array(),
    terminalValue: z.number(),
    wacc: z.number(),
  }),
  handler: async (ctx, args) => {
    let pvOfProjections = 0;
    const breakdown = [];

    args.cashFlows.forEach((cf, i) => {
      const pv = cf / Math.pow(1 + args.wacc, i + 1);
      pvOfProjections += pv;
      breakdown.push({ year: i + 1, cashFlow: cf, pv });
    });

    const pvOfTerminal = args.terminalValue / Math.pow(1 + args.wacc, args.cashFlows.length);
    const enterpriseValue = pvOfProjections + pvOfTerminal;

    return {
      enterpriseValue,
      pvOfProjections,
      pvOfTerminal,
      breakdown,
    };
  },
});
```

**Evaluation Layer (Fine-grained)**
```typescript
export const compareToGroundTruth = createTool({
  description: "Compare calculated valuation to ground truth benchmark",
  args: z.object({
    calculatedValue: z.number(),
    groundTruthValue: z.number(),
    tolerancePercent: z.number().default(5),
  }),
  handler: async (ctx, args) => {
    const diff = args.calculatedValue - args.groundTruthValue;
    const diffPercent = (diff / args.groundTruthValue) * 100;
    const withinTolerance = Math.abs(diffPercent) <= args.tolerancePercent;

    const grade = Math.abs(diffPercent) <= 2 ? 'A' :
                  Math.abs(diffPercent) <= 5 ? 'B' :
                  Math.abs(diffPercent) <= 10 ? 'C' :
                  Math.abs(diffPercent) <= 20 ? 'D' : 'F';

    return {
      grade,
      difference: diff,
      differencePercent: diffPercent,
      withinTolerance,
      verdict: withinTolerance ? 'PASS' : 'REVIEW',
    };
  },
});

export const identifyDiscrepancies = createTool({
  description: "Identify which assumptions caused valuation discrepancy",
  args: z.object({
    calculatedComponents: z.object({
      wacc: z.number(),
      terminalGrowth: z.number(),
      avgFcfGrowth: z.number(),
    }),
    expectedComponents: z.object({
      wacc: z.number(),
      terminalGrowth: z.number(),
      avgFcfGrowth: z.number(),
    }),
  }),
  handler: async (ctx, args) => {
    const discrepancies = [];

    Object.keys(args.calculatedComponents).forEach(key => {
      const calc = args.calculatedComponents[key];
      const exp = args.expectedComponents[key];
      const diff = Math.abs(calc - exp);
      const diffPercent = (diff / exp) * 100;

      if (diffPercent > 5) {
        discrepancies.push({
          component: key,
          calculated: calc,
          expected: exp,
          difference: diff,
          differencePercent: diffPercent,
          impact: diffPercent > 20 ? 'high' : diffPercent > 10 ? 'medium' : 'low',
        });
      }
    });

    discrepancies.sort((a, b) => b.impact === 'high' ? 1 : -1);

    return { discrepancies, count: discrepancies.length };
  },
});
```

**Reporting Layer (Coarse-grained)**
```typescript
export const generateDCFReport = createTool({
  description: "Generate comprehensive DCF evaluation report in multiple formats",
  args: z.object({
    state: z.any(), // Full session state
    format: z.enum(['markdown', 'pdf', 'json', 'all']).default('all'),
  }),
  handler: async (ctx, args) => {
    const { state } = args;

    // Executive summary
    const summary = {
      ticker: state.ticker,
      companyName: state.companyName,
      fairValue: state.calculations.fairValuePerShare,
      currentPrice: state.marketData.currentPrice,
      recommendation: getRecommendation(state.calculations.fairValuePerShare, state.marketData.currentPrice),
      confidence: state.evaluation.grade,
      scenario: state.scenario,
    };

    // Detailed sections
    const sections = {
      methodology: generateMethodologySection(state),
      assumptions: generateAssumptionsSection(state),
      calculations: generateCalculationsSection(state),
      sensitivity: generateSensitivityAnalysis(state),
      evaluation: generateEvaluationSection(state),
      discrepancies: generateDiscrepanciesSection(state),
    };

    // Multi-format output
    const outputs = {
      markdown: await formatAsMarkdown(summary, sections),
      json: { summary, sections, rawState: state },
    };

    if (args.format === 'pdf' || args.format === 'all') {
      outputs.pdf = await generatePDF(summary, sections);
    }

    return outputs;
  },
});
```

### 2.2 Tool State & Caching

**Circuit Breaker Pattern:**
```typescript
class APICircuitBreaker {
  private failures: Map<string, number> = new Map();
  private lastFailure: Map<string, number> = new Map();
  private isOpen: Map<string, boolean> = new Map();

  async call<T>(apiName: string, fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.isOpen.get(apiName)) {
      const timeSinceFailure = Date.now() - (this.lastFailure.get(apiName) || 0);
      if (timeSinceFailure < 60000) { // 1 minute
        throw new Error(`Circuit breaker open for ${apiName}, try again later`);
      }
      // Reset after timeout
      this.reset(apiName);
    }

    try {
      const result = await fn();
      this.reset(apiName);
      return result;
    } catch (error) {
      const failures = (this.failures.get(apiName) || 0) + 1;
      this.failures.set(apiName, failures);
      this.lastFailure.set(apiName, Date.now());

      if (failures >= 3) {
        this.isOpen.set(apiName, true);
        console.error(`[Circuit Breaker] Opened circuit for ${apiName} after ${failures} failures`);
      }

      throw error;
    }
  }

  reset(apiName: string) {
    this.failures.set(apiName, 0);
    this.isOpen.set(apiName, false);
  }
}

const circuitBreaker = new APICircuitBreaker();
```

**Tiered Cache Strategy:**
```typescript
type CacheConfig = {
  key: string;
  ttl: number;
  fallback?: () => Promise<any>;
};

async function fetchWithCache<T>(
  apiCall: () => Promise<T>,
  config: CacheConfig
): Promise<{ data: T; source: 'api' | 'cache' | 'fallback' }> {
  // Check cache first
  const cached = await cache.get(config.key);
  if (cached && Date.now() - cached.timestamp < config.ttl) {
    return { data: cached.data, source: 'cache' };
  }

  // Try API with circuit breaker
  try {
    const data = await circuitBreaker.call(config.key, apiCall);
    await cache.set(config.key, data, config.ttl);
    return { data, source: 'api' };
  } catch (error) {
    // Use stale cache if available
    if (cached) {
      console.warn(`API failed, using stale cache for ${config.key}`);
      return { data: cached.data, source: 'cache' };
    }

    // Try fallback
    if (config.fallback) {
      const data = await config.fallback();
      return { data, source: 'fallback' };
    }

    throw error;
  }
}
```

---

## 3. Streaming Progress (Cursor Pattern)

### 3.1 Progress Event Types

```typescript
type ProgressEvent =
  | { type: 'phase:start'; phase: string; description: string }
  | { type: 'phase:complete'; phase: string; durationMs: number }
  | { type: 'agent:spawn'; agentName: string; purpose: string }
  | { type: 'agent:status'; agentName: string; status: string }
  | { type: 'agent:complete'; agentName: string; result: any }
  | { type: 'tool:call'; toolName: string; args: any }
  | { type: 'tool:progress'; toolName: string; message: string; percent?: number }
  | { type: 'tool:result'; toolName: string; preview: any }
  | { type: 'checkpoint:reached'; checkpointId: string; requiresApproval: boolean }
  | { type: 'checkpoint:approved'; checkpointId: string; userId: string }
  | { type: 'error:occurred'; step: string; error: string; recoverable: boolean }
  | { type: 'error:recovered'; step: string; via: string };
```

### 3.2 UI Display (Cursor-inspired)

**Agent Panel (Right Sidebar):**
```
┌─ DCF Evaluation Agent ────────────────────────┐
│ Phase 2/3: Research               [●●○○○ 40%] │
├───────────────────────────────────────────────┤
│                                               │
│ Financial Data Agent [✓ 4.2s]                │
│ ├─ fetchIncomeStatement(AAPL, 2023) ✓ 1.5s  │
│ ├─ fetchBalanceSheet(AAPL, 2023) ✓ 1.8s     │
│ └─ fetchCashFlowStatement(AAPL, 2023) ✓ 0.9s│
│                                               │
│ Market Data Agent [⟳ 2.8s]                   │
│ ├─ getCurrentPrice(AAPL) ✓ 0.3s             │
│ ├─ calculateBeta(AAPL, 5y) ⟳ 2.1s           │
│ │  └─ Fetching 5 years of weekly returns... │
│ └─ getRiskFreeRate() ⏳ queued               │
│                                               │
│ Peer Analysis Agent [⏳ queued]               │
│                                               │
│ Calculation Agent [⏳ queued]                 │
│                                               │
├───────────────────────────────────────────────┤
│ [⏸ Pause] [⏹ Stop] [⚙ Settings]             │
└───────────────────────────────────────────────┘
```

**Intermediate Results (Main Panel):**
```markdown
## Research Phase Progress

### Financial Data ✓
| Metric          | 2023    | 2022    | 2021    |
|-----------------|---------|---------|---------|
| Revenue         | $383B   | $394B   | $366B   |
| Operating CF    | $111B   | $122B   | $104B   |
| Capex           | -$11B   | -$11B   | -$11B   |
| **Free Cash Flow** | **$100B** | **$111B** | **$93B** |

📊 **Trend**: Slight FCF decline YoY (-10%), but strong generation

---

### Market Data ⟳ In Progress
✓ Current Price: $178.20
⟳ Beta (5-year): Calculating...
⏳ Risk-free rate: Queued

---

### Next: WACC Calculation
Once market data completes, I'll calculate the discount rate.
Expected WACC: ~9-11% (based on sector)
```

### 3.3 Progress Streaming Implementation

```typescript
export async function streamDCFEvaluation(
  ctx: ActionCtx,
  args: { ticker: string; scenario: string }
) {
  const stream = new EventEmitter();

  // Phase 1: Scoping
  stream.emit('phase:start', { phase: 'scoping', description: 'Clarifying parameters' });
  const assumptions = await gatherAssumptions(ctx, args);
  stream.emit('checkpoint:reached', {
    checkpointId: 'assumptions',
    requiresApproval: true,
    data: assumptions,
  });

  const approved = await waitForApproval('assumptions');
  if (!approved) return { cancelled: true };

  stream.emit('phase:complete', { phase: 'scoping', durationMs: 2000 });

  // Phase 2: Research (Parallel)
  stream.emit('phase:start', { phase: 'research', description: 'Gathering data from multiple sources' });

  const agents = [
    { name: 'Financial Data Agent', fn: () => fetchFinancials(ctx, args.ticker) },
    { name: 'Market Data Agent', fn: () => fetchMarketData(ctx, args.ticker) },
    { name: 'Peer Analysis Agent', fn: () => fetchPeerData(ctx, args.ticker) },
  ];

  const results = await Promise.all(
    agents.map(async (agent) => {
      stream.emit('agent:spawn', { agentName: agent.name, purpose: 'Data gathering' });

      try {
        const result = await agent.fn();
        stream.emit('agent:complete', { agentName: agent.name, result });
        return result;
      } catch (error) {
        stream.emit('error:occurred', {
          step: agent.name,
          error: error.message,
          recoverable: true,
        });
        // Attempt recovery
        const fallback = await attemptFallback(agent.name, error);
        stream.emit('error:recovered', { step: agent.name, via: fallback.source });
        return fallback.data;
      }
    })
  );

  // Calculate
  stream.emit('agent:spawn', { agentName: 'Calculation Agent', purpose: 'DCF model execution' });
  const valuation = await calculateDCF(ctx, { ...assumptions, ...results });
  stream.emit('agent:complete', { agentName: 'Calculation Agent', result: valuation });

  stream.emit('checkpoint:reached', {
    checkpointId: 'valuation',
    requiresApproval: true,
    data: { wacc: valuation.wacc, fairValue: valuation.fairValuePerShare },
  });

  // Phase 3: Evaluation
  stream.emit('phase:start', { phase: 'evaluation', description: 'Comparing to ground truth' });
  const evaluation = await evaluateDCF(ctx, { valuation, groundTruth: await fetchGroundTruth(args.ticker) });
  stream.emit('phase:complete', { phase: 'evaluation', durationMs: 1500 });

  return { valuation, evaluation };
}
```

---

## 4. Human-in-the-Loop Checkpoints

### 4.1 Checkpoint Locations

1. **After Scoping**: Review and approve assumptions before expensive API calls
2. **After WACC Calculation**: Review discount rate (highest impact parameter)
3. **Before Final Report**: Review valuation and evaluation results

### 4.2 Approval UI

```typescript
type ApprovalRequest = {
  checkpointId: string;
  title: string;
  description: string;
  data: any;
  actions: Array<{
    id: string;
    label: string;
    variant: 'primary' | 'secondary' | 'danger';
  }>;
};

// Example: WACC Approval
const waccApproval: ApprovalRequest = {
  checkpointId: 'wacc_calculation',
  title: 'Review WACC Calculation',
  description: 'The discount rate has been calculated. Please review before proceeding with valuation.',
  data: {
    wacc: 10.1,
    components: {
      riskFreeRate: 4.2,
      beta: 1.28,
      marketRiskPremium: 7.5,
      costOfEquity: 13.8,
      debtRatio: 0.15,
      taxRate: 0.21,
    },
  },
  actions: [
    { id: 'approve', label: 'Approve WACC (10.1%)', variant: 'primary' },
    { id: 'edit', label: 'Edit Parameters', variant: 'secondary' },
    { id: 'reject', label: 'Cancel Analysis', variant: 'danger' },
  ],
};
```

**Inline Editing:**
```tsx
function WACCApprovalDialog({ request, onAction }) {
  const [editedData, setEditedData] = useState(request.data);

  return (
    <Dialog>
      <DialogTitle>{request.title}</DialogTitle>
      <DialogContent>
        <p>{request.description}</p>

        <Table>
          <tbody>
            <tr>
              <td>Risk-Free Rate</td>
              <td>
                <EditableNumber
                  value={editedData.components.riskFreeRate}
                  onChange={(v) => setEditedData({ ...editedData, components: { ...editedData.components, riskFreeRate: v }})}
                  suffix="%"
                />
              </td>
            </tr>
            <tr>
              <td>Beta (5-year)</td>
              <td>
                <EditableNumber
                  value={editedData.components.beta}
                  onChange={(v) => recalculateWACC({ ...editedData.components, beta: v })}
                />
              </td>
            </tr>
            <tr>
              <td><strong>Calculated WACC</strong></td>
              <td><strong>{editedData.wacc.toFixed(2)}%</strong></td>
            </tr>
          </tbody>
        </Table>
      </DialogContent>
      <DialogActions>
        {request.actions.map(action => (
          <Button
            key={action.id}
            variant={action.variant}
            onClick={() => onAction(action.id, editedData)}
          >
            {action.label}
          </Button>
        ))}
      </DialogActions>
    </Dialog>
  );
}
```

### 4.3 Learning from Corrections

```typescript
async function handleUserCorrection(
  correction: { field: string; oldValue: any; newValue: any; reason?: string }
) {
  // Log correction
  await ctx.runMutation(api.corrections.logCorrection, {
    userId: ctx.auth.getUserIdentity()?.subject,
    context: 'wacc_calculation',
    ...correction,
  });

  // Update prompt if pattern detected
  const corrections = await ctx.runQuery(api.corrections.getSimilarCorrections, {
    field: correction.field,
    limit: 10,
  });

  if (corrections.length >= 3) {
    // Suggest prompt update
    const suggestion = `Pattern detected: Users frequently adjust ${correction.field}.
    Consider ${corrections[0].reason || 'updating default assumptions'}.`;

    await ctx.runMutation(api.promptImprovements.suggest, { suggestion });
  }
}
```

---

## 5. Multi-Format Report Generation (v0 Pattern)

### 5.1 Report Structure

```typescript
type DCFReport = {
  metadata: {
    ticker: string;
    companyName: string;
    generatedAt: number;
    generatedBy: string;
    scenario: string;
  };

  executiveSummary: {
    fairValue: number;
    currentPrice: number;
    upside: number;
    recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
    confidence: 'High' | 'Medium' | 'Low';
    keyTakeaways: string[];
  };

  methodology: {
    approach: string;
    assumptions: Record<string, any>;
    dataSources: string[];
  };

  financialAnalysis: {
    historicalFCF: Array<{ year: number; fcf: number; growth: number }>;
    projectedFCF: Array<{ year: number; fcf: number; growth: number }>;
    terminalValue: number;
  };

  valuation: {
    wacc: number;
    enterpriseValue: number;
    equityValue: number;
    sharesOutstanding: number;
    fairValuePerShare: number;
    impliedMultiple: number;
  };

  evaluation: {
    grade: string;
    overallScore: number;
    comparison: {
      calculated: number;
      groundTruth: number;
      difference: number;
      differencePercent: number;
    };
    discrepancies: Array<{
      component: string;
      impact: string;
      explanation: string;
    }>;
  };

  sensitivityAnalysis: {
    waccSensitivity: number[][];
    growthSensitivity: number[][];
    scenarioAnalysis: {
      bull: number;
      base: number;
      bear: number;
    };
  };

  appendix: {
    rawData: any;
    calculations: any;
    sources: string[];
  };
};
```

### 5.2 Markdown Template

```markdown
# DCF Valuation Report: {{metadata.companyName}} ({{metadata.ticker}})

**Generated:** {{formatDate(metadata.generatedAt)}}
**Scenario:** {{metadata.scenario}}

---

## Executive Summary

**Fair Value:** ${{fairValue}} per share
**Current Price:** ${{currentPrice}} per share
**Upside:** {{upside}}%
**Recommendation:** {{recommendation}}
**Confidence:** {{confidence}}

### Key Takeaways
{{#each keyTakeaways}}
- {{this}}
{{/each}}

---

## Methodology

{{methodology.approach}}

### Key Assumptions
| Parameter | Value | Source |
|-----------|-------|--------|
| WACC | {{wacc}}% | CAPM calculation |
| Terminal Growth | {{terminalGrowth}}% | GDP forecast |
| FCF Growth (5y avg) | {{avgGrowth}}% | Historical analysis |

### Data Sources
{{#each dataSources}}
- {{this}}
{{/each}}

---

## Financial Analysis

### Historical Free Cash Flow
| Year | FCF | YoY Growth |
|------|-----|------------|
{{#each historicalFCF}}
| {{year}} | ${{formatNumber fcf}}M | {{formatPercent growth}} |
{{/each}}

📈 **Trend:** {{fcfTrend}}

### Projected Free Cash Flow
| Year | FCF | Assumed Growth |
|------|-----|----------------|
{{#each projectedFCF}}
| {{year}} | ${{formatNumber fcf}}M | {{formatPercent growth}} |
{{/each}}

**Terminal Value:** ${{formatNumber terminalValue}}B

---

## Valuation Summary

| Component | Value |
|-----------|-------|
| PV of Projected FCF (5y) | ${{formatNumber pvProjections}}B |
| PV of Terminal Value | ${{formatNumber pvTerminal}}B |
| **Enterprise Value** | **${{formatNumber enterpriseValue}}B** |
| Less: Net Debt | ${{formatNumber netDebt}}B |
| **Equity Value** | **${{formatNumber equityValue}}B** |
| Shares Outstanding | {{formatNumber sharesOutstanding}}M |
| **Fair Value Per Share** | **${{fairValuePerShare}}** |

**Implied EV/FCF Multiple:** {{impliedMultiple}}x

---

## Evaluation vs Ground Truth

**Grade:** {{evaluation.grade}} ({{evaluation.overallScore}}/100)

### Comparison
- **Calculated Fair Value:** ${{comparison.calculated}}
- **Ground Truth Benchmark:** ${{comparison.groundTruth}}
- **Difference:** ${{comparison.difference}} ({{comparison.differencePercent}}%)

{{#if discrepancies.length}}
### Key Discrepancies
{{#each discrepancies}}
**{{component}}** ({{impact}} impact)
{{explanation}}
{{/each}}
{{/if}}

---

## Sensitivity Analysis

### WACC vs Terminal Growth
|  | 2.5% | 3.0% | 3.5% | 4.0% |
|--|------|------|------|------|
| **9.0%** | ${{sens[0][0]}} | ${{sens[0][1]}} | ${{sens[0][2]}} | ${{sens[0][3]}} |
| **9.5%** | ${{sens[1][0]}} | ${{sens[1][1]}} | ${{sens[1][2]}} | ${{sens[1][3]}} |
| **10.0%** | ${{sens[2][0]}} | ${{sens[2][1]}} | ${{sens[2][2]}} | ${{sens[2][3]}} |
| **10.5%** | ${{sens[3][0]}} | ${{sens[3][1]}} | ${{sens[3][2]}} | ${{sens[3][3]}} |

### Scenario Analysis
- **Bull Case:** ${{scenarioAnalysis.bull}} ({{bullUpside}}% upside)
- **Base Case:** ${{scenarioAnalysis.base}}
- **Bear Case:** ${{scenarioAnalysis.bear}} ({{bearDownside}}% downside)

---

## Appendix

### Raw Data
[Link to full dataset]

### Calculation Details
[Link to spreadsheet model]

### Sources
{{#each sources}}
{{@index + 1}}. {{this}}
{{/each}}

---

*This report was generated by NodeBench DCF Evaluation Agent using data from SEC EDGAR, Alpha Vantage, and internal databases. For questions or corrections, please contact the research team.*
```

---

## 6. Deployment Architecture

### 6.1 File Structure

```
convex/
├── domains/
│   └── financial/
│       ├── groundTruthFetcher.ts      # SEC EDGAR + Alpha Vantage integration
│       ├── dcfBuilder.ts               # WACC, FCF, terminal value, PV calculations
│       ├── dcfProgress.ts              # 7-step workflow tracking
│       ├── dcfEvaluator.ts             # 100-point scoring vs ground truth
│       ├── dcfOrchestrator.ts          # Main agent coordinator (LangGraph)
│       ├── dcfTools.ts                 # Tool definitions (already exists)
│       ├── reportGenerator.ts          # Multi-format report generation
│       └── corrections.ts              # Learning from user corrections
├── workflows/
│   └── dcfEvaluationWorkflow.ts        # LangGraph workflow definition
└── schema.ts                           # Database tables (already defined)
```

### 6.2 Dependencies

```json
{
  "dependencies": {
    "@langchain/core": "^0.3.0",
    "@langchain/langgraph": "^0.2.0",
    "@langchain/postgres": "^0.1.0",
    "@convex-dev/agent": "^0.1.0",
    "zod": "^3.22.0"
  }
}
```

### 6.3 Environment Variables

```bash
# Alpha Vantage (already configured)
ALPHA_VANTAGE_API_KEY=KEXKHF6M1JGM9S2X

# PostgreSQL for LangGraph checkpoints
POSTGRES_URL=postgresql://user:pass@host:5432/nodebench

# Feature flags
ENABLE_HUMAN_CHECKPOINTS=true
ENABLE_LEARNING_LOOPS=true
ENABLE_CIRCUIT_BREAKERS=true
```

---

## 7. Testing Strategy

### 7.1 Unit Tests

```typescript
// Test individual tools
describe('calculateWACC', () => {
  it('should calculate WACC correctly', async () => {
    const result = await calculateWACC.handler(ctx, {
      riskFreeRate: 4.0,
      beta: 1.2,
      marketRiskPremium: 7.5,
      debtRatio: 0.2,
      taxRate: 0.21,
    });

    expect(result.wacc).toBeCloseTo(0.098, 3);
  });

  it('should throw if inputs invalid', async () => {
    await expect(calculateWACC.handler(ctx, {
      riskFreeRate: -1, // Invalid
      beta: 1.2,
      marketRiskPremium: 7.5,
      debtRatio: 0.2,
      taxRate: 0.21,
    })).rejects.toThrow();
  });
});
```

### 7.2 Integration Tests

```typescript
// Test end-to-end workflow
describe('DCF Evaluation Workflow', () => {
  it('should complete full analysis for NVDA', async () => {
    const result = await streamDCFEvaluation(ctx, {
      ticker: 'NVDA',
      scenario: 'base',
    });

    expect(result.valuation.fairValuePerShare).toBeGreaterThan(0);
    expect(result.evaluation.grade).toMatch(/[A-F]/);
    expect(result.evaluation.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.evaluation.overallScore).toBeLessThanOrEqual(100);
  });

  it('should handle SEC API failure gracefully', async () => {
    // Mock SEC API to fail
    jest.spyOn(secEdgarClient, 'getCompanyFacts').mockRejectedValue(new Error('API timeout'));

    const result = await streamDCFEvaluation(ctx, {
      ticker: 'AAPL',
      scenario: 'base',
    });

    // Should use cached or manual data
    expect(result.valuation).toBeDefined();
    expect(result.errors).toContainEqual(expect.objectContaining({
      step: 'Financial Data Agent',
      recoveredVia: expect.stringMatching(/cache|manual/),
    }));
  });
});
```

### 7.3 Checkpoint Tests

```typescript
describe('Checkpointing', () => {
  it('should save checkpoint after each phase', async () => {
    const threadId = 'test-thread-123';

    await streamDCFEvaluation(ctx, {
      ticker: 'MSFT',
      scenario: 'base',
      threadId,
    });

    const checkpoints = await getCheckpoints(threadId);
    expect(checkpoints).toHaveLength(3); // scoping, research, evaluation
  });

  it('should allow rollback to previous checkpoint', async () => {
    const threadId = 'test-thread-456';

    // Run to research phase
    const firstRun = await streamDCFEvaluation(ctx, {
      ticker: 'GOOGL',
      scenario: 'base',
      threadId,
      pauseAt: 'research',
    });

    // Rollback to scoping
    await rollbackToCheckpoint(threadId, 'scoping');

    // Resume with different assumptions
    const secondRun = await streamDCFEvaluation(ctx, {
      ticker: 'GOOGL',
      scenario: 'bull', // Changed
      threadId,
      resumeFrom: 'scoping',
    });

    expect(secondRun.valuation.fairValuePerShare).not.toEqual(firstRun.valuation.fairValuePerShare);
  });
});
```

---

## 8. Success Metrics

### 8.1 Accuracy Metrics
- **Valuation Accuracy**: 80%+ within ±5% of ground truth
- **Grade Distribution**: 60%+ A/B grades, <10% F grades
- **Assumption Validation**: 95%+ catch invalid inputs

### 8.2 Performance Metrics
- **End-to-End Latency**: <60s for full analysis
- **Tool Latency**: Data fetch <5s, calculations <1s
- **Cache Hit Rate**: >70% for repeated tickers
- **API Success Rate**: >95% with fallbacks

### 8.3 UX Metrics
- **Checkpoint Approval Time**: <10s per checkpoint
- **User Corrections**: Track frequency, apply learnings
- **Session Completion**: >85% of started analyses completed
- **Report Usefulness**: >4.0/5.0 average rating

### 8.4 Reliability Metrics
- **Error Rate**: <5% failed analyses
- **Fallback Success**: >95% recovery rate
- **Circuit Breaker Triggers**: <1% of requests
- **Data Freshness**: <10% stale data usage

---

## 9. Next Steps

1. ✅ Research complete
2. ⏭️ Implement groundTruthFetcher.ts
3. ⏭️ Implement dcfBuilder.ts
4. ⏭️ Implement dcfProgress.ts
5. ⏭️ Implement dcfEvaluator.ts
6. ⏭️ Implement dcfOrchestrator.ts (LangGraph)
7. ⏭️ Add streaming progress
8. ⏭️ Add human checkpoints
9. ⏭️ Deploy and test

---

*Architecture Document v2.0*
*Based on industry best practices from LangChain, LangGraph, Cursor, Vercel, Google, OpenAI*
*January 22, 2026*
