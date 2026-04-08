# TimesFM Integration — Distilled into NodeBench Agent Orchestration

## The Real Question: How Do We Know It Works?

### What TimesFM actually is
TimesFM is a **decoder-only transformer** trained on 400 billion real-world time-points. It works like an LLM but for numbers instead of words — you feed it a sequence of past values and it predicts the next values. Zero-shot means it works on any time series without training.

**Proven results:**
- #1 on GIFT-Eval benchmark (zero-shot, both point and probabilistic accuracy)
- 15-25% better than ARIMA on retail datasets
- Matches fine-tuned DeepAR/PatchTST that take weeks to train per domain
- 200M parameters, 16k context, quantile forecasts with calibrated prediction intervals

### Why it matters for NodeBench
NodeBench already collects time-series data it doesn't use:
- Signal confidence scores per entity per search run (trajectory over time)
- SEO audit scores per run
- Finding counts per branch per run
- Remediation gaps open/closed per run
- Search cost per run (Linkup + Gemini calls)
- Agent session metrics (nudges, tool calls, token usage)

Right now these are snapshots. TimesFM turns them into **forecasts**.

## Distilling the Mechanism into Agent Orchestration

### The Core Insight

TimesFM's value is not "it predicts numbers." The value is:
**it turns any sequence of observations into a probabilistic forecast with confidence intervals.**

That is the same thing NodeBench's agent orchestration needs to do — but for company intelligence, not just numeric series.

### The 3-Layer Integration

#### Layer 1: Observation Collection (already built)

NodeBench already produces structured observations over time:

```
Entity: "NodeBench AI"
  Run 1 (Apr 4): confidence=50, seo=50, findings=6,  signals=0,  grade="insufficient-data"
  Run 2 (Apr 4): confidence=85, seo=70, findings=55, signals=8,  grade="early-stage"
  Run 3 (Apr 5): confidence=85, seo=70, findings=55, signals=8,  grade="early-stage" (cached)
```

Each of those numeric fields IS a time series. The search sessions table already stores them with timestamps.

#### Layer 2: Forecast Engine (TimesFM)

TimesFM takes those sequences and produces:
- **Point forecast**: what the next value will likely be
- **Quantile forecast**: range (p10-p90) showing confidence interval
- **Horizon**: how many steps ahead (next 4 runs? next 12 weeks?)

```python
# Example: forecast entity confidence trajectory
model = timesfm.TimesFM_2p5_200M_torch.from_pretrained("google/timesfm-2.5-200m-pytorch")
model.compile(timesfm.ForecastConfig(
    max_context=1024, max_horizon=12,
    normalize_inputs=True,
    use_continuous_quantile_head=True,
))

# From NodeBench searchSessions: confidence scores over time
confidence_history = [50, 85, 85, 85]  # 4 data points from 4 search runs
point_forecast, quantile_forecast = model.forecast(
    horizon=4,  # predict next 4 runs
    inputs=[np.array(confidence_history)],
)
# point_forecast: [85, 85, 86, 86] — stable, slight improvement
# quantile_forecast: p10=[78,76,74,72], p90=[92,93,94,95] — widening uncertainty
```

#### Layer 3: Agent Decision Layer (the distillation)

This is where TimesFM becomes part of the orchestration, not just a prediction tool.

**The agent doesn't just forecast numbers. It uses forecasts to make decisions:**

```
IF confidence_forecast is stable or improving:
  → "Entity intelligence is sufficient. Focus on remediation."

IF confidence_forecast is declining:
  → "Entity intelligence is degrading. Re-run deep diligence with different sources."

IF seo_score_forecast is plateauing below target:
  → "Current SEO strategy isn't working. Suggest structural change."

IF remediation_velocity_forecast shows gaps closing slower:
  → "Remediation is stalling. Escalate or change approach."

IF cost_per_search_forecast is increasing:
  → "Cache hit rate declining. Popular queries may have changed."
```

**This is what "distilling into the agent meta-orchestration layer" means:**
TimesFM becomes the **forecasting primitive** that the agent uses to decide its own next action — not just report numbers, but decide whether to re-search, escalate, change strategy, or declare sufficient.

## How to Verify It Works

### Test 1: Retrospective validation (can it predict what already happened?)

Take the first 3 data points from a real entity's search history. Forecast the 4th. Compare to actual.

```
Input:  [50, 85, 85]  (NodeBench AI, runs 1-3)
Predicted: [84-86]
Actual: 85
→ If close: model works for this data shape
→ If not: data shape doesn't have enough signal for forecasting
```

### Test 2: Cross-entity generalization (does it work for different companies?)

Run the same test on Stripe, Tests Assured, Anthropic — entities with different data shapes. If it works for all of them, it generalizes.

### Test 3: Decision quality (do forecasts improve agent decisions?)

The real test: does an agent that uses TimesFM forecasts make better decisions than one that doesn't?

Measure:
- Does re-running diligence when forecast says "declining" actually catch new information?
- Does NOT re-running when forecast says "stable" save cost without missing important changes?
- Does the remediation velocity forecast accurately predict when gaps will be closed?

### Test 4: Minimum viable data (how many points before forecasts are useful?)

TimesFM handles sequences as short as 1 point — but quality depends on context length. Test:
- 2 data points: forecast is basically extrapolation (low value)
- 5+ data points: forecast captures trend (moderate value)
- 20+ data points: forecast captures seasonality and trend (high value)

**Honest assessment:** For most NodeBench entities, we'll have 2-10 data points. TimesFM will produce forecasts, but they'll be wide (large prediction intervals). The value comes from the **direction** (improving/declining/stable), not the exact number.

## Implementation: Python MCP Server

TimesFM is Python-only. NodeBench's MCP server is Node.js. The bridge:

```
packages/python-mcp-servers/timesfm-forecast/
├── server.py           # MCP server exposing forecast tools
├── requirements.txt    # timesfm, torch, numpy
└── README.md
```

### MCP Tools

```python
@mcp.tool("forecast_entity_trajectory")
def forecast_entity_trajectory(entity_name: str, metric: str, horizon: int = 4):
    """
    Forecast an entity's metric trajectory using TimesFM.
    
    Args:
        entity_name: Entity to forecast (e.g., "NodeBench AI")
        metric: Which metric to forecast (confidence, seo_score, findings, signals)
        horizon: How many future steps to predict
    
    Returns:
        point_forecast, quantile_forecast (p10-p90), trend_direction, decision_suggestion
    """
    # 1. Query searchSessions for this entity's history
    # 2. Extract the metric as a time series
    # 3. Run TimesFM forecast
    # 4. Classify trend: improving / stable / declining / insufficient_data
    # 5. Generate decision suggestion based on trend

@mcp.tool("forecast_remediation_velocity")
def forecast_remediation_velocity(entity_name: str):
    """
    Forecast when all remediation gaps will be closed at current velocity.
    """

@mcp.tool("forecast_cost_trajectory")  
def forecast_cost_trajectory(days_ahead: int = 30):
    """
    Forecast total search cost for the next N days based on usage patterns.
    """

@mcp.tool("detect_anomaly")
def detect_anomaly(entity_name: str, metric: str):
    """
    Use TimesFM quantile forecasts to detect if a metric is outside
    the expected range (anomaly = outside p10-p90 interval).
    """
```

### Agent Orchestration Integration

The key integration point: the **Stop hook** and **PostToolUse hook** can call the forecast tools to make autonomous decisions:

```
PostToolUse hook (after a search completes):
  1. Get entity's metric history from searchSessions
  2. Call forecast_entity_trajectory
  3. If trend is "declining" → nudge: "Re-run diligence — intelligence quality is degrading"
  4. If trend is "stable" at high level → no nudge (sufficient)
  5. If trend is "insufficient_data" → nudge: "Run more searches to enable forecasting"

Stop hook (when session ends):
  1. Call forecast_cost_trajectory
  2. If projected monthly cost > budget → warn in value manifest
  3. Call forecast_remediation_velocity for active entities
  4. If projected completion date is > 30 days → escalate in next session
```

## What NOT to Do

1. **Don't forecast with < 3 data points.** TimesFM technically handles it, but the forecast will be meaningless. Show "insufficient data for forecasting" instead.

2. **Don't forecast categorical data.** Diligence grades (early-stage, needs-more-data) are not time series. Forecast the underlying confidence score, then derive the grade from the forecasted score.

3. **Don't hide uncertainty.** Always show the prediction interval, not just the point forecast. A forecast of "85% confidence ±15%" is honest. A forecast of "85% confidence" without intervals is misleading.

4. **Don't run TimesFM on every search.** It's a 200M parameter model that needs ~1.5GB RAM. Run it on-demand (when user asks for forecast) or batch nightly, not per-request.

5. **Don't forecast what you can compute.** If you know the cache hit rate formula, compute it. TimesFM is for data where the generative process is unknown.

## Priority

1. **Now**: Write the spec (this document) ✓
2. **Next**: Build the Python MCP server with 4 forecast tools
3. **Then**: Wire forecast results into the Trajectory tab visualization
4. **Later**: Integrate forecast-based decisions into the nudge hooks
5. **Future**: BigQuery integration for managed TimesFM at scale
