# API Integration Guide - Cursor, Windsurf, Claude Code

## 🎯 Complete API for Agent-Driven DCF Editing

This guide shows how to integrate the Interactive DCF system with Cursor, Windsurf, Claude Code, or any other agentic tool.

---

## 📡 HTTP API Endpoints

```typescript
BASE_URL = "https://api.nodebench.ai/v1"

// ========================================
// 1. CONVERSATIONAL ANALYSIS
// ========================================

POST /financial/analyze
{
  "message": "What's NVDA worth?",
  "sessionId": "optional-existing-session",
  "userId": "user-123"
}

Response:
{
  "response": "Based on DCF analysis, NVIDIA's fair value is $18.35...",
  "dcfResults": {
    "ticker": "NVDA",
    "fairValue": 18.35,
    "currentPrice": 140.00,
    "score": 100,
    "grade": "A",
    "recommendation": "STRONG SELL"
  },
  "toolCalls": ["runDCFAnalysis(NVDA, base)"],
  "sessionId": "session-NVDA-1737582800000"
}


// ========================================
// 2. CREATE INTERACTIVE SESSION
// ========================================

POST /financial/dcf/create
{
  "ticker": "NVDA",
  "userId": "user-123"
}

Response:
{
  "sessionId": "session-NVDA-1737582800000",
  "sessionUrl": "https://app.nodebench.ai/dcf/session-NVDA-1737582800000",
  "initialState": {
    "parameters": {
      "revenueGrowthRates": [0.10, 0.08, 0.06, 0.05, 0.04],
      "terminalGrowth": 0.03,
      "beta": 1.68,
      // ... 15 total parameters
    },
    "results": {
      "fairValue": 18.35,
      "wacc": 0.1138,
      "score": 100
    }
  }
}


// ========================================
// 3. EDIT SINGLE PARAMETER
// ========================================

PATCH /financial/dcf/:sessionId/parameter
{
  "field": "revenueGrowthRates[0]",
  "newValue": 0.15,
  "triggeredBy": "user"
}

Response:
{
  "success": true,
  "oldValue": 0.10,
  "newValue": 0.15,
  "recalculated": true,
  "newResults": {
    "fairValue": 20.42,
    "wacc": 0.1138,
    "score": 95,
    "impact": {
      "fairValueChange": 2.07,
      "fairValueChangePercent": 11.3
    }
  },
  "calculationTime": 186
}


// ========================================
// 4. AGENT EDITS (CONVERSATIONAL)
// ========================================

POST /financial/dcf/:sessionId/agent-edit
{
  "instruction": "Make this model more conservative"
}

Response:
{
  "edits": [
    {
      "field": "revenueGrowthRates[0]",
      "oldValue": 0.15,
      "newValue": 0.08,
      "reasoning": "Reduce Y1 growth to 8% (more realistic)"
    },
    {
      "field": "terminalGrowth",
      "oldValue": 0.03,
      "newValue": 0.025,
      "reasoning": "Lower terminal growth to 2.5%"
    },
    {
      "field": "beta",
      "oldValue": 1.68,
      "newValue": 1.85,
      "reasoning": "Increase beta for higher risk"
    }
  ],
  "oldFairValue": 20.42,
  "newFairValue": 16.20,
  "impact": {
    "changePercent": -20.7,
    "explanation": "Conservative adjustments reduced fair value by 21%"
  }
}


// ========================================
// 5. MULTI-COMPANY COMPARISON
// ========================================

POST /financial/compare
{
  "tickers": ["NVDA", "AMD", "INTC"],
  "question": "Which is the best value?"
}

Response:
{
  "analysis": "AMD offers the best value with 9.2% upside...",
  "rankings": [
    {
      "ticker": "AMD",
      "fairValue": 180.25,
      "currentPrice": 165.00,
      "upside": 9.2,
      "score": 95,
      "recommendation": "BUY"
    },
    {
      "ticker": "INTC",
      "fairValue": 48.50,
      "currentPrice": 45.20,
      "upside": 7.3,
      "score": 82,
      "recommendation": "HOLD"
    },
    {
      "ticker": "NVDA",
      "fairValue": 18.35,
      "currentPrice": 140.00,
      "upside": -86.9,
      "score": 100,
      "recommendation": "STRONG SELL"
    }
  ],
  "executionTime": 3200
}


// ========================================
// 6. UNDO LAST EDIT
// ========================================

POST /financial/dcf/:sessionId/undo

Response:
{
  "undone": {
    "field": "beta",
    "restoredValue": 1.68,
    "previousValue": 1.85
  },
  "newResults": {
    "fairValue": 20.42,
    "score": 95
  },
  "historyRemaining": 3
}


// ========================================
// 7. GET SESSION STATE
// ========================================

GET /financial/dcf/:sessionId

Response:
{
  "sessionId": "session-NVDA-1737582800000",
  "ticker": "NVDA",
  "createdAt": 1737582800000,
  "updatedAt": 1737583100000,
  "parameters": { /* all 15 parameters */ },
  "results": { /* current results */ },
  "history": [
    {
      "timestamp": 1737582900000,
      "field": "revenueGrowthRates[0]",
      "oldValue": 0.10,
      "newValue": 0.15,
      "triggeredBy": "user"
    },
    // ... more edits
  ]
}


// ========================================
// 8. EXPORT TO SPREADSHEET
// ========================================

POST /financial/dcf/:sessionId/export
{
  "format": "xlsx"  // or "csv"
}

Response:
{
  "downloadUrl": "https://api.nodebench.ai/download/session-NVDA-xyz.xlsx",
  "expiresAt": 1737669200000,
  "format": "xlsx",
  "sizeBytes": 45231
}


// ========================================
// 9. SCENARIO ANALYSIS
// ========================================

POST /financial/dcf/:sessionId/scenarios
{
  "scenarios": ["bull", "base", "bear"]
}

Response:
{
  "base": {
    "fairValue": 18.35,
    "parameters": { /* base params */ }
  },
  "bull": {
    "fairValue": 28.50,
    "parameters": {
      "revenueGrowthRates": [0.20, 0.15, 0.12, 0.10, 0.08],
      "terminalGrowth": 0.04,
      "beta": 1.50
    },
    "impliedUpside": 55.4
  },
  "bear": {
    "fairValue": 11.80,
    "parameters": {
      "revenueGrowthRates": [0.05, 0.04, 0.03, 0.02, 0.01],
      "terminalGrowth": 0.02,
      "beta": 2.10
    },
    "impliedDownside": -35.7
  },
  "analysis": "All scenarios suggest NVDA is overvalued..."
}
```

---

## 🔌 Integration Examples

### Cursor Composer

```typescript
// .cursorrules or .claud file
{
  "name": "DCF Financial Analyst",
  "description": "Run DCF valuations and edit models conversationally",
  "tools": [
    {
      "name": "analyze_company",
      "endpoint": "POST https://api.nodebench.ai/v1/financial/analyze",
      "description": "Run DCF valuation on any public company"
    },
    {
      "name": "edit_dcf_parameter",
      "endpoint": "PATCH https://api.nodebench.ai/v1/financial/dcf/{sessionId}/parameter",
      "description": "Edit a specific DCF parameter"
    },
    {
      "name": "agent_edit_dcf",
      "endpoint": "POST https://api.nodebench.ai/v1/financial/dcf/{sessionId}/agent-edit",
      "description": "Ask agent to edit DCF model conversationally"
    }
  ]
}

// Usage in Cursor:
User: "Analyze NVDA and then make the model more conservative"

Cursor:
  1. Calls analyze_company({"message": "Analyze NVDA"})
     → Gets sessionId
  2. Calls agent_edit_dcf({
       "sessionId": "...",
       "instruction": "make the model more conservative"
     })
     → Gets updated fair value
  3. Shows results in composer
```

---

### Windsurf Cascade

```typescript
// Windsurf agent configuration
{
  "agents": {
    "financial_analyst": {
      "capabilities": ["dcf_valuation", "model_editing", "comparison"],
      "api_base": "https://api.nodebench.ai/v1",
      "tools": [
        "financial/analyze",
        "financial/dcf/create",
        "financial/dcf/:sessionId/agent-edit",
        "financial/compare"
      ]
    }
  }
}

// Usage in Windsurf:
User: "Compare NVDA, AMD, INTC and edit the best one to be more aggressive"

Windsurf Cascade:
  Phase 1: Comparison
    → POST /financial/compare
    → Result: AMD is best value

  Phase 2: Create session for AMD
    → POST /financial/dcf/create {"ticker": "AMD"}
    → Gets sessionId

  Phase 3: Edit aggressively
    → POST /financial/dcf/:sessionId/agent-edit
       {"instruction": "make more aggressive"}
    → New fair value: $195.50 (was $180.25)

  Phase 4: Explain
    → "AMD is the best value. After making the model more aggressive
       (higher growth rates), fair value increased to $195.50, suggesting
       18% upside potential."
```

---

### Claude Code (MCP)

```typescript
// MCP Server definition
{
  "name": "nodebench-financial",
  "version": "1.0.0",
  "tools": [
    {
      "name": "dcf_analyze",
      "description": "Run DCF valuation on a company",
      "inputSchema": {
        "type": "object",
        "properties": {
          "ticker": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    },
    {
      "name": "dcf_edit",
      "description": "Edit DCF model parameters",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sessionId": { "type": "string" },
          "instruction": { "type": "string" }
        }
      }
    },
    {
      "name": "dcf_compare",
      "description": "Compare multiple companies",
      "inputSchema": {
        "type": "object",
        "properties": {
          "tickers": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  ]
}

// Usage in Claude Code:
User: $ analyze nvda

Claude: [calls dcf_analyze]
> NVIDIA (NVDA) DCF Analysis
> Fair Value: $18.35
> Current Price: $140.00
> Recommendation: STRONG SELL (-86.9%)

User: $ make it more conservative

Claude: [calls dcf_edit with instruction]
> Updated DCF model with conservative assumptions:
> - Y1 Growth: 15% → 8%
> - Terminal Growth: 3% → 2.5%
> - Beta: 1.68 → 1.85
>
> New Fair Value: $16.20 (-12% from original)
```

---

### ChatGPT Custom GPT

```yaml
# GPT Configuration
name: "Financial DCF Analyst"
description: "Run DCF valuations and edit models interactively"

instructions: |
  You are a financial analyst with access to deterministic DCF calculations.
  When users ask about valuations:
  1. Use analyze_company to run DCF
  2. Use edit_dcf to adjust parameters
  3. Use compare_companies for relative analysis

  Always explain your reasoning and cite the numbers.

functions:
  - type: function
    function:
      name: analyze_company
      description: Run DCF valuation
      parameters:
        type: object
        properties:
          message:
            type: string
            description: User's question about the company
      api:
        endpoint: POST https://api.nodebench.ai/v1/financial/analyze

  - type: function
    function:
      name: edit_dcf
      description: Edit DCF parameters conversationally
      parameters:
        type: object
        properties:
          sessionId:
            type: string
          instruction:
            type: string
            description: How to edit the model
      api:
        endpoint: POST https://api.nodebench.ai/v1/financial/dcf/{sessionId}/agent-edit

  - type: function
    function:
      name: compare_companies
      description: Compare multiple companies
      parameters:
        type: object
        properties:
          tickers:
            type: array
            items:
              type: string
      api:
        endpoint: POST https://api.nodebench.ai/v1/financial/compare
```

---

## 🎯 Key Integration Patterns

### Pattern 1: Analyze → Edit → Compare

```typescript
// User workflow:
1. "Analyze NVDA"
   → GET sessionId, initial fair value

2. "Make it more conservative"
   → PATCH edit parameters
   → GET new fair value

3. "Compare with AMD and INTC"
   → POST compare endpoint
   → GET ranking

// All calculations remain deterministic!
// LLM only understands intent and explains results
```

---

### Pattern 2: Real-time Collaboration

```typescript
// Multiple users edit same session
User A: Opens session-NVDA-xyz
User B: Opens session-NVDA-xyz (same session)

User A edits Beta → Backend recalcs → WebSocket → User B sees update
User B edits Y1 growth → Backend recalcs → WebSocket → User A sees update

// Uses Convex reactive queries for real-time sync
```

---

### Pattern 3: Spreadsheet Export → Edit → Reimport

```typescript
// User workflow:
1. POST /dcf/create → sessionId
2. POST /dcf/:sessionId/export → Excel file
3. User edits in Excel (offline)
4. POST /dcf/import → creates new session from Excel
5. Continue editing in UI or via API
```

---

## 📊 Performance Benchmarks

| Operation | Latency | Notes |
|-----------|---------|-------|
| **Create Session** | 600ms | Fetches SEC EDGAR data |
| **Edit Single Param** | 190ms | Instant recalc |
| **Agent Edit (3 params)** | 1.2s | LLM parsing + 3 recalcs |
| **Compare 3 Companies** | 1.8s | Parallel DCF execution |
| **Export to Excel** | 250ms | Generate XLSX |
| **Undo Edit** | 190ms | Restore + recalc |

---

## 🔒 Authentication

```typescript
// All requests require Bearer token
headers: {
  "Authorization": "Bearer sk-nodebench-..."
}

// Get API key from:
https://app.nodebench.ai/settings/api-keys
```

---

## 🎓 Summary: What You Can Build

1. **Cursor Plugin** - "Analyze NVDA" → adds DCF to your code
2. **Windsurf Cascade** - Multi-step financial analysis workflows
3. **Claude Code Terminal** - `$ dcf nvda --scenario=bull`
4. **ChatGPT Custom GPT** - Conversational financial analyst
5. **Spreadsheet Integration** - Edit in Excel, sync to UI
6. **Slack Bot** - `/dcf NVDA` → instant valuation
7. **VS Code Extension** - DCF sidebar panel
8. **Mobile App** - Touch to edit cells, instant recalc

**All powered by deterministic DCF engine + conversational LLM interface!**

The magic is that calculations never touch LLMs, but the user experience is fully conversational and agentic.
