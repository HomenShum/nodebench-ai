# Interactive DCF Product Roadmap

**Goal:** Fast Agent Panel → Build Financial Models → Interactive Spreadsheet in Document Hub

---

## Current Status

### ✅ Backend Ready (100%)
- **DCF Calculation Engine** - Deterministic WACC, FCF, terminal value
- **Interactive Sessions** - Real-time parameter editing, undo/redo, history
- **Agent-Driven Editing** - LLM proposes changes, engine applies them
- **Evaluation System** - Source quality, corrections, repro packs
- **Data Fetching** - SEC EDGAR, Alpha Vantage, ground truth DB

### ❌ Frontend Missing (0%)
- **Fast Agent Tool** - Trigger DCF workflow from chat
- **Spreadsheet UI** - Interactive grid with instant recalc
- **Document Hub Integration** - Open DCF sessions like documents
- **Real-Time Sync** - Convex reactive queries → UI updates

---

## User Experience Flow

### Step 1: Request in Fast Agent Panel
```
User: "Build a DCF model for NVIDIA. Get the latest financial data."

Agent:
1. Detects financial modeling intent
2. Calls createDCFSession tool
3. Fetches SEC EDGAR data
4. Initializes DCF with default assumptions
5. Responds: "Created NVIDIA DCF model. [Click to open spreadsheet]"
```

### Step 2: Open Interactive Spreadsheet
```
User clicks "Open spreadsheet"
→ Opens new tab with interactive grid
→ Looks like Excel/Google Sheets
→ Live formula cells
→ Edit any cell → instant recalculation
```

### Step 3: Agent Edits via Chat
```
User: "Make Year 1 growth rate more aggressive"

Agent:
1. Calls agentEditParameters tool
2. Updates revenueGrowthRates[0] from 10% → 15%
3. Backend recalculates entire model
4. UI updates in real-time
5. Shows: "Updated Y1 growth to 15%. Fair value increased $18.35 → $20.42"
```

### Step 4: Document Hub Integration
```
Document Hub shows:
- Research briefs
- Due diligence memos
- Financial models (NEW!)
  - NVDA DCF (updated 2 mins ago)
  - TSLA DCF (updated yesterday)

Click → Opens interactive spreadsheet
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              FAST AGENT PANEL (Chat UI)                      │
│  "Build DCF for NVDA" → Agent uses createDCFSession tool    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          CONVEX ACTIONS (Backend Tool Handlers)              │
│  • createDCFSession - Create new session                    │
│  • agentEditParameters - Edit via natural language          │
│  • updateParameter - Direct cell edit                       │
│  • undoEdit - Rollback changes                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│        CONVEX DB (dcfSessions table - Reactive!)             │
│  Session updates → useQuery auto-refreshes UI                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│      SPREADSHEET UI COMPONENT (React + Convex Reactive)      │
│  • AG Grid or React Spreadsheet                             │
│  • Real-time cell updates                                   │
│  • Formula display                                           │
│  • Instant recalculation on edit                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### Phase 1: Fast Agent Tool (Backend) - **2 hours**

**File:** `convex/domains/agents/tools/createDCFSession.ts`

```typescript
/**
 * Agent tool: Create interactive DCF session
 */
export const createDCFSessionTool = agentTool({
  name: "createDCFSession",
  description: "Create an interactive DCF valuation model for a company",
  parameters: {
    ticker: { type: "string", description: "Stock ticker (e.g., NVDA)" },
    scenario: { type: "string", enum: ["bull", "base", "bear"], optional: true },
  },
  handler: async (ctx, args) => {
    // 1. Create session
    const { sessionId } = await ctx.runMutation(
      internal.domains.financial.interactiveDCFSession.createSession,
      {
        ticker: args.ticker,
        userId: ctx.userId,
      }
    );

    // 2. Return session URL
    const sessionUrl = `/dcf/${sessionId}`;

    return {
      success: true,
      sessionId,
      sessionUrl,
      message: `Created DCF model for ${args.ticker}. [Open spreadsheet](${sessionUrl})`,
    };
  },
});
```

**Registration:**
```typescript
// convex/domains/agents/mcp_tools/registry.ts
{
  name: "createDCFSession",
  description: "Create interactive DCF valuation model",
  schema: {...},
  handler: createDCFSessionTool,
}
```

---

### Phase 2: Spreadsheet UI Component - **8 hours**

**File:** `src/features/financial/components/DCFSpreadsheet.tsx`

```typescript
import { useQuery, useMutation } from 'convex/react';
import { api } from 'convex/_generated/api';
import { AgGridReact } from 'ag-grid-react';

export function DCFSpreadsheet({ sessionId }: { sessionId: string }) {
  // Real-time reactive query
  const session = useQuery(api.domains.financial.interactiveDCFSession.getSession, {
    sessionId,
  });

  const updateParam = useMutation(api.domains.financial.interactiveDCFSession.updateParameter);

  if (!session) return <div>Loading...</div>;

  const gridData = buildGridData(session.parameters, session.results);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between">
        <h1>{session.ticker} DCF Model</h1>
        <div>Fair Value: ${session.results.fairValuePerShare.toFixed(2)}</div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="flex-1">
        <AgGridReact
          rowData={gridData}
          columnDefs={columnDefs}
          onCellValueChanged={(event) => {
            // User edited a cell
            const { field, newValue } = event.data;
            updateParam({
              sessionId,
              field,
              newValue,
              triggeredBy: "user",
            });
          }}
          // Enable editing
          editable={true}
          // Theme
          className="ag-theme-alpine-dark"
        />
      </div>

      {/* Chat Panel */}
      <div className="h-64 border-t border-gray-700 p-4">
        <AgentChatPanel sessionId={sessionId} />
      </div>
    </div>
  );
}

function buildGridData(parameters, results) {
  return [
    // Header
    { section: "INPUTS", year0: "Base", year1: "2025", year2: "2026", ... },

    // Revenue
    {
      section: "Revenue",
      year0: parameters.baseRevenue,
      year1: parameters.baseRevenue * (1 + parameters.revenueGrowthRates[0]),
      year2: parameters.baseRevenue * (1 + parameters.revenueGrowthRates[1]),
      ...
    },

    // Growth Rates (editable)
    {
      section: "Revenue Growth %",
      year0: "-",
      year1: { value: parameters.revenueGrowthRates[0], editable: true, field: "revenueGrowthRates[0]" },
      year2: { value: parameters.revenueGrowthRates[1], editable: true, field: "revenueGrowthRates[1]" },
      ...
    },

    // ... more rows

    // OUTPUTS (read-only)
    { section: "Enterprise Value", result: results.enterpriseValue },
    { section: "Fair Value/Share", result: results.fairValuePerShare },
  ];
}
```

**Styling:** AG Grid Enterprise (or React Spreadsheet)

---

### Phase 3: Document Hub Integration - **4 hours**

**File:** `src/features/research/views/ResearchHub.tsx` (modify existing)

```typescript
// Add DCF sessions to document list
const dcfSessions = useQuery(api.domains.financial.interactiveDCFSession.listUserSessions, {
  userId: currentUser._id,
});

return (
  <div>
    {/* Existing sections */}
    <Section title="Research Briefs">...</Section>
    <Section title="Due Diligence Memos">...</Section>

    {/* NEW: Financial Models */}
    <Section title="Financial Models">
      {dcfSessions?.map(session => (
        <DocumentCard
          key={session.sessionId}
          title={`${session.ticker} DCF`}
          subtitle={`Updated ${formatRelativeTime(session.updatedAt)}`}
          icon={<Calculator />}
          onClick={() => navigate(`/dcf/${session.sessionId}`)}
        />
      ))}
    </Section>
  </div>
);
```

**Route:**
```typescript
// src/App.tsx
<Route path="/dcf/:sessionId" element={<DCFSpreadsheet />} />
```

---

### Phase 4: Agent Chat Integration - **2 hours**

**File:** `src/features/financial/components/AgentChatPanel.tsx`

```typescript
export function AgentChatPanel({ sessionId }: { sessionId: string }) {
  const [message, setMessage] = useState("");
  const agentEdit = useMutation(api.domains.financial.interactiveDCFSession.agentEditParameters);

  const handleSend = async () => {
    await agentEdit({
      sessionId,
      userInstruction: message,
    });
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {/* Chat messages */}
      </div>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask agent to edit (e.g., 'Make it more conservative')"
          className="flex-1 px-4 py-2 bg-gray-800 rounded"
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
```

---

### Phase 5: Real-Time Sync - **Built-in!**

Convex reactive queries automatically handle this:

```typescript
// Component subscribes to session updates
const session = useQuery(api.domains.financial.interactiveDCFSession.getSession, {
  sessionId,
});

// When backend updates session (via updateParameter or agentEdit):
await ctx.db.patch(session._id, {
  parameters: updatedParams,
  results: newResults,
  updatedAt: Date.now(),
});

// UI AUTOMATICALLY re-renders with new data!
// No manual polling, no WebSockets needed - Convex handles it
```

---

## File Checklist

### Backend (Already Exists!)
- ✅ `convex/domains/financial/interactiveDCFSession.ts` - Session management
- ✅ `convex/domains/financial/dcfOrchestrator.ts` - DCF calculations
- ✅ `convex/schema.ts` - `dcfSessions` table

### Backend (Need to Create)
- [ ] `convex/domains/agents/tools/createDCFSession.ts` - Agent tool
- [ ] `convex/domains/agents/tools/editDCFSession.ts` - Agent edit tool
- [ ] `convex/domains/financial/interactiveDCFSession.ts` - Add `listUserSessions` query

### Frontend (Need to Create)
- [ ] `src/features/financial/components/DCFSpreadsheet.tsx` - Main spreadsheet
- [ ] `src/features/financial/components/AgentChatPanel.tsx` - Embedded chat
- [ ] `src/features/financial/views/DCFSessionView.tsx` - Page wrapper
- [ ] `src/features/research/views/ResearchHub.tsx` - Add DCF section
- [ ] `src/App.tsx` - Add `/dcf/:sessionId` route

### Dependencies
- [ ] `ag-grid-react` or `react-spreadsheet` - Grid component
- [ ] `ag-grid-enterprise` (optional) - Advanced features

---

## Effort Estimate

| Phase | Time | Complexity |
|-------|------|------------|
| 1. Fast Agent Tool | 2 hours | Easy |
| 2. Spreadsheet UI | 8 hours | Medium |
| 3. Document Hub Integration | 4 hours | Easy |
| 4. Agent Chat Panel | 2 hours | Easy |
| 5. Testing & Polish | 4 hours | Medium |
| **TOTAL** | **20 hours** | **~3 days** |

---

## Alternative: Quick Prototype (4 hours)

If you want to test the concept faster:

### Minimal Viable Product
1. **Agent Tool** - Create DCF session (2 hours)
2. **Simple Table View** - No fancy grid, just HTML table (1 hour)
3. **Basic Edit** - Click cell → input box → save (1 hour)

**Skip:**
- Advanced spreadsheet grid
- Document hub integration
- Real-time polish

**Result:** You can say "Build NVDA DCF" and get a basic interactive model

---

## Decision Point

**Option A: Full Product (20 hours)**
- Professional spreadsheet UI (AG Grid)
- Document hub integration
- Agent chat panel
- Production-ready

**Option B: Quick Prototype (4 hours)**
- Basic table view
- Manual edit only
- Proof of concept
- Iterate later

**Option C: Just Documentation**
- I create detailed specs
- You review approach
- Implement when ready

Which do you prefer? Or should I start with the agent tool so you can at least trigger DCF creation from Fast Agent Panel?
