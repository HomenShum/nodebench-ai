# Production Mock Scenarios Guide

## Overview

Your multi-agent scaffold architecture now includes **4 production-ready mock scenarios** that demonstrate different coordination patterns, agent types, and execution states. These mocks are perfect for:

- **Demo & Testing**: Showcase the full power of your agent timeline visualization
- **Development**: Test UI components with realistic data
- **Documentation**: Provide concrete examples of multi-agent workflows

---

## 📦 Files Added

### 1. `agents/data/productionMocks.ts`
- **Purpose**: Framework-agnostic mock data definitions
- **Exports**:
  - `productionMocks`: Array of 4 RunMock scenarios
  - `getMockById(timelineId)`: Get specific mock
  - `getMocksByMode(mode)`: Filter by research/analysis/inference
  - `getMocksByCoordination(coordination)`: Filter by subagent/multiAgent

### 2. `convex/agents/seedProductionMocks.ts`
- **Purpose**: Convex actions to seed mocks into database
- **Actions**:
  - `seedMock({ documentId, mockId })`: Seed single scenario
  - `seedAllMocks({ documentId })`: Seed all 4 scenarios
  - `listMocks()`: List available scenarios

### 3. `src/components/agentDashboard/ProductionMockSeeder.tsx`
- **Purpose**: UI component for seeding mocks
- **Features**:
  - Dropdown selector for scenarios
  - "Seed Selected" and "Seed All" buttons
  - Success/error feedback
  - Expandable scenario details

---

## 🎬 Available Scenarios

### 1. **Research: George Morgan • Symbolica AI • Fundraising**
```typescript
timelineId: "run.research.symbolica"
mode: "research"
coordination: "subagent"
tasks: 9 (orchestrator + 3 mains + 3 web researchers + synthesis + validator)
```

**Demonstrates**:
- Parallel main agents (Person, Company, Fundraising)
- Parallel leaf web searches
- Synthesis from multiple sources
- Validation with confidence scores
- Rich artifacts (markdown reports, JSON verdicts)
- Token metrics and cost tracking

**Key Features**:
- 3 parallel research streams converge into synthesis
- Validator checks for hallucinations
- Total duration: ~14.2 seconds
- Total cost: ~$0.070

---

### 2. **Multi-Agent Consensus: Outreach Email**
```typescript
timelineId: "run.multi.consensus.email"
mode: "analysis"
coordination: "multiAgent"
tasks: 5 (orchestrator + 2 peers + reviewer + synthesizer)
```

**Demonstrates**:
- Multi-agent consensus pattern
- Peer proposals (A & B draft in parallel)
- Reviewer scores both proposals
- Synthesizer merges best elements
- Artifacts show evolution from drafts → final

**Key Features**:
- True multi-agent collaboration (not hierarchical)
- Reviewer provides structured feedback
- Synthesizer creates consensus output
- Total duration: ~6.3 seconds
- Total cost: ~$0.024

---

### 3. **Cybersecurity: Phishing Risk Analysis**
```typescript
timelineId: "run.analysis.phishing"
mode: "analysis"
coordination: "subagent"
tasks: 5 (orchestrator + web research + code exec + content + validator)
```

**Demonstrates**:
- Code executor agent (risk formula)
- Structured risk scoring (domain_risk, urgency, link, score)
- Threat report generation
- Validation with confidence
- WARN/ALLOW/BLOCK decision output

**Key Features**:
- Code execution for risk calculation
- JSON artifacts with structured scores
- Markdown threat report
- Total duration: ~9 seconds
- Total cost: ~$0.024

---

### 4. **Robotics (Sim): Laundry Folding Policy Loop**
```typescript
timelineId: "run.research.laundry-folding"
mode: "research"
coordination: "subagent"
tasks: 6 (orchestrator + vision + motor + validator + policy + summary)
```

**Demonstrates**:
- **Retry markers**: Motor control failed after 2 retries
- **Failure markers**: Failure at 7.6s offset
- **Policy updates**: Validator provides constraints
- **Feedback loop**: Failure → validation → policy update → summary
- **Robotics simulation**: Vision hints → motor control

**Key Features**:
- `retryOffsetsMs: [5200, 6500]` (2 retries visualized)
- `failureOffsetMs: 7600` (error marker on timeline)
- `state: "failed"` (error styling on execution bar)
- Policy constraints in JSON artifacts
- Total duration: ~11.9 seconds

---

## 🚀 Usage

### Option 1: Via UI Component (Recommended)

1. **Add to AgentTimeline** (already integrated):
```tsx
import { ProductionMockSeeder } from "./ProductionMockSeeder";

// In component:
const [showMockSeeder, setShowMockSeeder] = useState(false);

// In controls:
<button onClick={() => setShowMockSeeder(!showMockSeeder)}>
  🎬 Production Mocks
</button>

{showMockSeeder && (
  <ProductionMockSeeder
    documentId={documentId}
    onSeeded={(timelineId) => {
      console.log("Seeded:", timelineId);
      setShowMockSeeder(false);
    }}
  />
)}
```

2. **Click "🎬 Production Mocks" button** in AgentTimeline controls
3. **Select scenario** from dropdown
4. **Click "Seed Selected"** or **"Seed All"**

### Option 2: Via Convex Action (Programmatic)

```typescript
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

const seedMock = useAction(api.agents.seedProductionMocks.seedMock);

// Seed single scenario
const result = await seedMock({
  documentId: "...",
  mockId: "run.research.symbolica"
});
console.log(`Seeded ${result.taskCount} tasks`);

// Seed all scenarios
const seedAll = useAction(api.agents.seedProductionMocks.seedAllMocks);
const results = await seedAll({ documentId: "..." });
console.log(`Seeded ${results.length} timelines`);
```

### Option 3: Direct Import (Testing)

```typescript
import { productionMocks, getMockById } from "../agents/data/productionMocks";

// Get specific mock
const mock = getMockById("run.research.symbolica");

// Filter by mode
const researchMocks = productionMocks.filter(m => m.mode === "research");

// Use in tests
expect(mock.tasks.length).toBe(9);
expect(mock.links.length).toBe(4);
```

---

## 🎨 What Gets Visualized

### Timeline View
- **Hierarchy Pane**: Orchestrator → Mains → Leaves
- **Execution Bars**: Positioned by `startOffsetMs` + `durationMs`
- **Status Colors**: pending (gray), running (blue stripes), ok (green), failed (red)
- **Retry Markers**: Small triangles at `retryOffsetsMs` positions
- **Error Markers**: Red X at `failureOffsetMs` position
- **Parallel Groups**: L{n} badges show topological levels

### Task Cards
- **Metrics Row**: Duration, tokens, cost, latency
- **Mini Timeline**: 3-lane compressed view (orchestrator | mains | leaves)
- **Artifacts**: Expandable markdown/JSON outputs
- **Status Dots**: Color-coded by state

### Popovers
- **Agent Type Badge**: orchestrator/main/leaf with colors
- **Metrics**: Tokens in/out, cost, latency
- **Progress**: Computed from elapsedMs/durationMs
- **Artifacts**: Preview of outputs

---

## 🔧 Customization

### Add New Scenarios

Edit `agents/data/productionMocks.ts`:

```typescript
export const productionMocks: RunMock[] = [
  // ... existing mocks
  {
    timelineId: "run.custom.my-scenario",
    label: "My Custom Scenario",
    goal: "...",
    mode: "inference",
    coordination: "multiAgent",
    baseStartMs: 0,
    tasks: [
      {
        id: "root",
        title: "Orchestrator",
        agentKind: "orchestrator",
        startOffsetMs: 0,
        durationMs: 1000,
        state: "ok",
      },
      // ... more tasks
    ],
    links: [
      { from: "root", to: "task1" },
    ],
  },
];
```

### Agent Kind → Type Mapping

```typescript
orchestrator → "orchestrator" (blue #6366F1)
main → "main" (green #10B981)
web_researcher → "leaf" (orange #F59E0B)
content_generator → "leaf" (purple #8B5CF6)
validator → "leaf" (cyan #06B6D4)
code_executor → "leaf" (red #EF4444)
reviewer → "leaf" (pink #EC4899)
synthesizer → "leaf" (teal #14B8A6)
```

### State → Status Mapping

```typescript
ok → "complete" (green)
failed → "error" (red)
running → "running" (blue stripes)
pending → "pending" (gray)
skipped → "paused" (yellow)
```

---

## 📊 Test Coverage

All scenarios are designed to test:

- ✅ Hierarchical agent structures
- ✅ Parallel execution (multiple agents at same offset)
- ✅ Sequential dependencies (links)
- ✅ Retry markers (`retryOffsetsMs`)
- ✅ Error markers (`failureOffsetMs`)
- ✅ Token metrics & cost tracking
- ✅ Artifacts (markdown, JSON)
- ✅ Different agent kinds (8 types)
- ✅ Different coordination patterns (subagent, multiAgent)
- ✅ Different modes (research, analysis, inference)

---

## 🎯 Next Steps

1. **Test the UI**: Click "🎬 Production Mocks" in AgentTimeline
2. **Seed a scenario**: Try "Research: Symbolica" first
3. **Explore visualizations**: Check timeline bars, task cards, popovers
4. **Verify markers**: Look for retry triangles and error X in "Laundry Folding"
5. **Check artifacts**: Expand task cards to see markdown/JSON outputs
6. **Add custom scenarios**: Create your own mocks for specific use cases

---

## 🐛 Troubleshooting

**Q: "Seed Selected" button is disabled**
- Ensure a document is selected/created first
- Check that a scenario is selected in dropdown

**Q: Seeding fails with error**
- Check browser console for details
- Verify Convex connection is active
- Ensure `convex/agents/seedProductionMocks.ts` is deployed

**Q: Timeline shows scaffold instead of seeded data**
- Switch Data Source to "Convex" in controls
- Refresh the page
- Check that timelineId matches seeded timeline

**Q: Retry/error markers not showing**
- Verify scenario has `retryOffsetsMs` or `failureOffsetMs`
- Check that CSS for `.retry-marker` and `.error-marker` is loaded
- Try "Laundry Folding" scenario (has both markers)

---

**Your multi-agent dashboard is now production-ready with realistic demo data!** 🚀

