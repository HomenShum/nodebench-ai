# Interactive DCF Editing - Complete Examples

## 🎯 The Full Workflow: Agent + User + Real-time Calc

```typescript
// ========================================
// WORKFLOW 1: User creates session
// ========================================

// User in Claude Code:
User: "Create an interactive DCF model for NVDA"

// Backend creates session
const session = await createSession({
  ticker: "NVDA",
  userId: "user-123",
});

// Returns:
{
  sessionId: "session-NVDA-1737582800000",
  spreadsheet: {
    // Initial parameters from SEC EDGAR
    parameters: {
      baseRevenue: 60922,
      revenueGrowthRates: [10%, 8%, 6%, 5%, 4%],
      terminalGrowth: 3%,
      beta: 1.68,
      // ... 15 more parameters
    },
    results: {
      fairValue: $18.35,
      wacc: 11.38%,
      score: 100/100
    }
  }
}

// UI renders interactive spreadsheet
╔═══════════════════════════════════════════════════════════╗
║  NVIDIA (NVDA) - Interactive DCF Model                    ║
║  Score: 100/100 | Fair Value: $18.35 | Agent: Claude     ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  📊 ASSUMPTIONS (editable - click to change)             ║
║                                                           ║
║  Revenue Growth Rates:                                   ║
║    Year 1: [10.0%] ← click to edit                      ║
║    Year 2: [8.0%]  ← click to edit                      ║
║    Year 3: [6.0%]                                        ║
║    Year 4: [5.0%]                                        ║
║    Year 5: [4.0%]                                        ║
║                                                           ║
║  Terminal Growth: [3.0%]                                 ║
║                                                           ║
║  WACC Components:                                        ║
║    Beta: [1.68]                                          ║
║    Risk-Free Rate: [4.2%]                                ║
║    Market Premium: [7.5%]                                ║
║                                                           ║
║  💬 Chat with Agent:                                     ║
║  "Make this more conservative"                           ║
║  "What if growth slows to 5%?"                           ║
║  "Undo last change"                                      ║
╚═══════════════════════════════════════════════════════════╝


// ========================================
// WORKFLOW 2: User edits cell directly
// ========================================

// User clicks Year 1 growth rate cell, types "15"
UI.onCellEdit({
  field: "revenueGrowthRates[0]",
  newValue: 0.15,
});

// Frontend sends update
await updateParameter({
  sessionId: "session-NVDA-...",
  field: "revenueGrowthRates[0]",
  newValue: 0.15,
  triggeredBy: "user",
});

// Backend recalculates (186ms)
{
  fcfProjections: [
    { year: 2025, fcf: $31,098M, growth: 15.0% },  // ← Changed!
    { year: 2026, fcf: $33,586M, growth: 8.0% },   // ← Cascades
    { year: 2027, fcf: $35,601M, growth: 6.0% },   // ← Cascades
    { year: 2028, fcf: $37,381M, growth: 5.0% },
    { year: 2029, fcf: $38,876M, growth: 4.0% },
  ],
  fairValue: $20.42,  // ← Increased from $18.35!
  evaluationScore: 95/100,  // ← Still excellent
}

// UI updates instantly (real-time)
╔═══════════════════════════════════════════════════════════╗
║  Year 1: [15.0%] ✨ CHANGED                              ║
║                                                           ║
║  💡 Impact: Fair value increased to $20.42 (+11%)        ║
║     Score: 95/100 (was 100/100)                          ║
║                                                           ║
║  [Undo] [Redo] [Save Scenario]                           ║
╚═══════════════════════════════════════════════════════════╝


// ========================================
// WORKFLOW 3: Agent edits via conversation
// ========================================

// User types in chat:
User: "Make this model more conservative"

// Agent understands and proposes edits
const result = await agentEditParameters({
  sessionId: "session-NVDA-...",
  userInstruction: "Make this model more conservative",
});

// LLM proposes:
{
  edits: [
    {
      field: "revenueGrowthRates[0]",
      oldValue: 0.15,
      newValue: 0.08,
      reasoning: "Reduce Y1 growth from 15% to 8% (more realistic)"
    },
    {
      field: "terminalGrowth",
      oldValue: 0.03,
      newValue: 0.025,
      reasoning: "Lower terminal growth from 3% to 2.5% (conservative)"
    },
    {
      field: "beta",
      oldValue: 1.68,
      newValue: 1.85,
      reasoning: "Increase beta to reflect higher risk perception"
    }
  ],
  newFairValue: $16.20
}

// UI shows agent's reasoning
╔═══════════════════════════════════════════════════════════╗
║  🤖 Agent made 3 changes:                                 ║
║                                                           ║
║  1. Revenue Y1 growth: 15% → 8%                          ║
║     "Reduce Y1 growth to be more realistic"              ║
║                                                           ║
║  2. Terminal growth: 3% → 2.5%                           ║
║     "Lower terminal growth (conservative)"               ║
║                                                           ║
║  3. Beta: 1.68 → 1.85                                    ║
║     "Increase beta for higher risk"                      ║
║                                                           ║
║  💰 New fair value: $16.20 (was $20.42, -21%)           ║
║                                                           ║
║  [Accept All] [Reject] [Accept Some]                     ║
╚═══════════════════════════════════════════════════════════╝


// ========================================
// WORKFLOW 4: Scenario comparison
// ========================================

// User: "Compare base case vs bull vs bear"

// Agent runs 3 parallel sessions with different parameters
const scenarios = await Promise.all([
  agentEditParameters({ sessionId, instruction: "base case" }),
  agentEditParameters({ sessionId, instruction: "bull case" }),
  agentEditParameters({ sessionId, instruction: "bear case" }),
]);

// UI shows side-by-side comparison
╔═══════════════════════════════════════════════════════════╗
║            Base         Bull         Bear                 ║
╠═══════════════════════════════════════════════════════════╣
║  Y1 Growth   8.0%        15.0%        5.0%                ║
║  Y5 Growth   4.0%        8.0%         2.0%                ║
║  Terminal    2.5%        3.5%         2.0%                ║
║  Beta        1.85        1.50         2.10                ║
║                                                           ║
║  Fair Value  $16.20      $28.50       $11.80             ║
║  vs Market   -88%        -80%         -92%                ║
║                                                           ║
║  💡 All scenarios show NVDA overvalued                    ║
╚═══════════════════════════════════════════════════════════╝


// ========================================
// WORKFLOW 5: Undo/Redo
// ========================================

// User: "Undo that last change"

await undoEdit({ sessionId });

// History tracking
{
  history: [
    { field: "revenueGrowthRates[0]", old: 0.10, new: 0.15, by: "user" },
    { field: "revenueGrowthRates[0]", old: 0.15, new: 0.08, by: "agent" },
    { field: "terminalGrowth", old: 0.03, new: 0.025, by: "agent" },
    { field: "beta", old: 1.68, new: 1.85, by: "agent" },
    // ↑ After undo, removes last 3 entries
  ]
}

// UI shows undo
╔═══════════════════════════════════════════════════════════╗
║  ↩️ Undone: Agent's conservative changes                  ║
║                                                           ║
║  Restored parameters:                                    ║
║  - Revenue Y1: 8% → 15%                                  ║
║  - Terminal growth: 2.5% → 3%                            ║
║  - Beta: 1.85 → 1.68                                     ║
║                                                           ║
║  Fair value restored: $20.42                             ║
║                                                           ║
║  [Redo] if you want them back                            ║
╚═══════════════════════════════════════════════════════════╝


// ========================================
// WORKFLOW 6: Export to spreadsheet
// ========================================

// User: "Export this to Excel"

const file = await exportToSpreadsheet({
  sessionId,
  format: "xlsx",
});

// Generates Excel file with:
╔═══════════════════════════════════════════════════════════╗
║  Sheet 1: Assumptions                                     ║
║    • All 15 parameters                                   ║
║    • Each cell is editable                               ║
║    • Formulas preserved                                  ║
║                                                           ║
║  Sheet 2: Calculations                                   ║
║    • FCF projections                                     ║
║    • Terminal value                                      ║
║    • PV calculations                                     ║
║    • Fair value                                          ║
║                                                           ║
║  Sheet 3: Sensitivity                                    ║
║    • 5×5 WACC × Terminal growth matrix                   ║
║    • Conditional formatting (heatmap)                    ║
║                                                           ║
║  Sheet 4: History                                        ║
║    • All edits with timestamps                           ║
║    • User vs Agent attribution                           ║
╚═══════════════════════════════════════════════════════════╝


// ========================================
// WORKFLOW 7: Live collaboration
// ========================================

// User 1: "Let me share this with my team"

// Creates shareable link
const shareUrl = await createShareableSession(sessionId);
// → "https://app.nodebench.ai/dcf/session-NVDA-xyz"

// User 2 opens link, sees live updates
// User 1 edits beta → User 2 sees change instantly (WebSocket)

╔═══════════════════════════════════════════════════════════╗
║  👥 Live Collaboration (2 active users)                   ║
║                                                           ║
║  User 1 (you): Editing revenue assumptions               ║
║  User 2 (Alice): Viewing sensitivity analysis            ║
║                                                           ║
║  Recent changes:                                         ║
║  • You changed Beta to 1.50 (2 min ago)                  ║
║  • Alice commented: "This looks optimistic" (1 min ago)  ║
║                                                           ║
║  Fair Value: $22.10 → updates live for everyone          ║
╚═══════════════════════════════════════════════════════════╝
```

---

## 🔧 Frontend Integration

### React Component Example

```typescript
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function InteractiveDCFSpreadsheet({ sessionId }) {
  // Real-time session data
  const session = useQuery(api.domains.financial.interactiveDCFSession.getSession, {
    sessionId,
  });

  // Update parameter
  const updateParam = useMutation(api.domains.financial.interactiveDCFSession.updateParameter);

  // Agent edit
  const agentEdit = useMutation(api.domains.financial.interactiveDCFSession.agentEditParameters);

  // Undo
  const undo = useMutation(api.domains.financial.interactiveDCFSession.undoEdit);

  const handleCellEdit = async (field: string, newValue: number) => {
    await updateParam({
      sessionId,
      field,
      newValue,
      triggeredBy: "user",
    });
    // UI updates automatically via Convex reactivity
  };

  const handleAgentCommand = async (instruction: string) => {
    const result = await agentEdit({
      sessionId,
      userInstruction: instruction,
    });

    // Show agent's proposed edits
    showToast(`Agent changed ${result.edits.length} parameters`);
  };

  return (
    <div className="dcf-spreadsheet">
      <header>
        <h1>{session.ticker} - Interactive DCF</h1>
        <div>
          Fair Value: ${session.results.fairValuePerShare.toFixed(2)}
          <Badge>Score: {session.results.evaluationScore}/100</Badge>
        </div>
      </header>

      {/* Editable parameters grid */}
      <div className="parameters-grid">
        <EditableCell
          label="Year 1 Growth"
          value={session.parameters.revenueGrowthRates[0]}
          onChange={(v) => handleCellEdit("revenueGrowthRates[0]", v)}
          format="percentage"
        />

        <EditableCell
          label="Terminal Growth"
          value={session.parameters.terminalGrowth}
          onChange={(v) => handleCellEdit("terminalGrowth", v)}
          format="percentage"
        />

        <EditableCell
          label="Beta"
          value={session.parameters.beta}
          onChange={(v) => handleCellEdit("beta", v)}
          format="decimal"
        />
      </div>

      {/* Results (auto-updates) */}
      <div className="results-panel">
        <ResultCard
          title="Fair Value"
          value={`$${session.results.fairValuePerShare.toFixed(2)}`}
          change={calculateChange(session)}
        />

        <ResultCard
          title="WACC"
          value={`${(session.results.wacc * 100).toFixed(2)}%`}
        />
      </div>

      {/* Agent chat */}
      <div className="agent-chat">
        <input
          placeholder="Ask agent to edit: 'Make it more conservative'"
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleAgentCommand(e.target.value);
            }
          }}
        />
      </div>

      {/* Undo/Redo */}
      <div className="history-controls">
        <button onClick={() => undo({ sessionId })}>
          ↩️ Undo
        </button>
        <span>{session.history.length} edits</span>
      </div>
    </div>
  );
}
```

---

## 📱 Cursor/Windsurf Integration

```typescript
// In Cursor Composer:
User: "Edit the NVDA DCF model - increase Year 1 growth to 12%"

// Cursor calls API:
POST /api/dcf/edit
{
  "sessionId": "session-NVDA-...",
  "instruction": "increase Year 1 growth to 12%"
}

// Backend:
1. LLM parses: field="revenueGrowthRates[0]", value=0.12
2. Updates parameter
3. Recalculates (186ms)
4. Returns new fair value

// Cursor shows:
✅ Updated NVDA DCF Model
   Year 1 Growth: 10% → 12%
   New Fair Value: $19.85 (was $18.35)

   Would you like to see the impact on other metrics?
```

---

## 🎓 Key Features Enabled

| Feature | Implementation | User Experience |
|---------|---------------|-----------------|
| **Real-time Editing** | Convex reactive queries | Type in cell → instant recalc |
| **Agent Editing** | LLM proposes + applies edits | "Make conservative" → done |
| **Undo/Redo** | History stack in DB | Click undo → restored |
| **Collaboration** | Shared session IDs | Multiple users edit live |
| **Export** | Generate Excel/CSV | Download → edit in Excel |
| **Versioning** | Session snapshots | Save "Bull Case" scenario |
| **Audit Trail** | Every edit logged | See who changed what |
| **API Access** | REST + GraphQL | Integrate with any tool |

---

## 🔥 The Magic: Hybrid Architecture

```typescript
// USER TYPES IN CELL
User clicks cell → types "15%" → presses Enter
                            ↓
// FRONTEND (instant visual feedback)
Cell updates immediately (optimistic)
                            ↓
// BACKEND (deterministic recalc)
updateParameter({ field: "revenueGrowthRates[0]", value: 0.15 })
  → Store in DB (5ms)
  → Trigger recalculateSession (action)
  → Run pure DCF formulas (186ms)
  → Update results in DB (5ms)
                            ↓
// FRONTEND (confirms with real result)
Convex reactive query triggers
UI updates with accurate fair value
                            ↓
// AGENT CAN EXPLAIN
User: "Why did it change?"
Agent: "Increasing Y1 growth from 10% to 15% added $31M more FCF
        in 2025, which increased PV by $2.07, raising fair value
        from $18.35 to $20.42."
```

---

## ✨ What This Enables

1. **Spreadsheet-like experience** - Click any cell, edit, instant recalc
2. **Conversational editing** - "Make Year 1 more aggressive" → Agent does it
3. **Undo/Redo** - Full edit history with rollback
4. **Collaboration** - Multiple users edit same model
5. **Export** - To Excel/Google Sheets with formulas
6. **API integration** - Cursor/Windsurf can programmatically edit
7. **Audit trail** - Every change logged (compliance)
8. **Scenarios** - Save bull/base/bear cases

**And the calculation engine remains 100% deterministic!**

No LLM ever touches the math. LLMs only handle:
- Understanding user instructions
- Proposing parameter changes
- Explaining results

The actual DCF calculation is pure TypeScript formulas that comply with CFA/GAAP standards.
