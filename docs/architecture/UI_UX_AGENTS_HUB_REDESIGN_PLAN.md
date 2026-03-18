# Agents Hub UI/UX Redesign Plan

## Executive Summary

This document outlines a comprehensive UI/UX overhaul for the Agents Hub to achieve visual consistency with Documents and Calendar tabs, while transforming it from a static placeholder into a powerful agent orchestration dashboard that leverages the full capabilities of the backend agent system.

---

## Part 1: UI Inconsistencies Audit

### Current State Analysis

#### AgentsHub.tsx vs Other Hubs

| Aspect | AgentsHub | DocumentsHomeHub | CalendarHomeHub |
|--------|-----------|------------------|-----------------|
| **Layout Structure** | Custom header + content div | TopDividerBar + PageHeroHeader + Content | TopDividerBar + CalendarView + Sidebar |
| **Navigation Pills** | Embedded in custom header | UnifiedHubPills in TopDividerBar | UnifiedHubPills in TopDividerBar |
| **Background Color** | `bg-[#FAFAFA]` (hardcoded) | `bg-[var(--bg-primary)]` (CSS var) | `bg-[var(--bg-primary)]` (CSS var) |
| **Header Style** | Gradient icon with text | PageHeroHeader with serif title | Sidebar + Mini Calendar |
| **Sidebar** | None | Collapsible with mini-calendar | Collapsible with mini-calendar & upcoming |
| **Content Max Width** | `max-w-4xl` | `max-w-7xl` | `max-w-7xl` |
| **Card Style** | Custom white rounded-xl | SectionCard from documentsHub | CalendarView grid |
| **Status Badges** | Inline hardcoded colors | Uses CSS vars | N/A |

### Specific Inconsistencies Found

1. **Color System Mismatch**
   - AgentsHub uses: `bg-white`, `bg-gray-100`, `text-gray-900`, `bg-green-100`, `bg-amber-100`
   - Other hubs use: `var(--bg-primary)`, `var(--text-primary)`, `var(--border-color)`
   - **Fix**: Migrate to CSS custom properties defined in `index.css`

2. **Header Structure**
   - AgentsHub: Custom inline header with gradient icon
   - Others: Use `TopDividerBar` + `PageHeroHeader` components
   - **Fix**: Adopt shared header components

3. **Navigation Pills Placement**
   - AgentsHub: Inside custom header div with `mb-4` margin
   - Others: Inside `TopDividerBar.left` slot
   - **Fix**: Move UnifiedHubPills to TopDividerBar

4. **Card Border Radius**
   - AgentsHub: `rounded-xl` (12px)
   - Design system: `rounded-container` (12px), `rounded` (8px), `rounded-secondary` (4px)
   - **Fix**: Use design tokens from tailwind.config.js

5. **Status Indicator Colors**
   - AgentsHub: `bg-green-100 text-green-700`, `bg-amber-100 text-amber-700`
   - CSS design system defines: status-dot classes in agentDashboard.css
   - **Fix**: Use `.status-dot.running`, `.status-dot.complete`, etc.

6. **Shadow System**
   - AgentsHub: `hover:shadow-md` (browser default)
   - Design system: `shadow` (0 1px 4px), `shadow-hover` (0 2px 8px)
   - **Fix**: Use tailwind shadow tokens

7. **Missing Sidebar**
   - Documents and Calendar have collapsible right sidebar
   - AgentsHub has none
   - **Fix**: Add agent-specific sidebar (agent queue, recent runs, quick actions)

---

## Part 2: Backend Capabilities to Expose in UI

Based on deep exploration of `convex/domains/agents/`, the system has sophisticated capabilities that are NOT exposed in the current placeholder UI:

### Available Agent Types (Currently Hidden)

| Agent | Purpose | Backend File |
|-------|---------|--------------|
| **Coordinator** | Supervisor pattern, orchestrates subagents | `coordinator/agent.ts` |
| **DocumentAgent** | Document search, retrieval, creation | `core/subagents/document_subagent/` |
| **MediaAgent** | YouTube, web content, media analysis | `core/subagents/media_subagent/` |
| **SECAgent** | SEC filings, company info | `core/subagents/sec_subagent/` |
| **OpenBBAgent** | Stock prices, crypto, market data | `core/subagents/openbb_subagent/` |
| **DataAccessAgent** | Calendar, tasks, file operations | `dataAccess/` |
| **ArbitrageAgent** | Multi-source research with contradiction detection | `arbitrage/` |

### Orchestration Patterns (Not Surfaced)

1. **Swarm Mode** (`swarmOrchestrator.ts`)
   - `/spawn "query" --agents=doc,media,sec`
   - Fan-out parallel execution
   - Result gathering and synthesis

2. **Planning System** (`agentPlanning.ts`)
   - Plans with steps and milestones
   - Progress tracking (pending → in_progress → completed)
   - Feature validation

3. **Human-in-the-Loop** (`humanInTheLoop.ts`)
   - Pending approval queue
   - Context-aware suggestions
   - Response tracking

4. **Memory System** (`agentMemory.ts`)
   - Episodic memory with tags
   - Key-value storage
   - Deduplication

### Real-Time Status (Available but Unused)

Tables with subscriptions ready:
- `agentRuns`: Run status (pending → queued → running → completed/error)
- `agentDelegations`: Delegation chain status
- `agentSwarms`: Swarm orchestration status
- `swarmAgentTasks`: Individual task status within swarms
- `humanRequests`: Pending human approvals

---

## Part 3: Redesign Specification

### 3.1 Layout Architecture (Match Documents/Calendar)

```
┌─────────────────────────────────────────────────────────────────┐
│ TopDividerBar                                                    │
│ ┌────────────────────────────────────────────┐  ┌──────────────┐│
│ │ UnifiedHubPills [Documents|Calendar|Agents]│  │ Quick Actions││
│ └────────────────────────────────────────────┘  └──────────────┘│
├─────────────────────────────────────────────────────────────────┤
│ Main Content (flex-1)                            │ Sidebar      │
│ ┌──────────────────────────────────────────────┐ │ (collapsible)│
│ │ AgentCommandBar (spawn input)                 │ │             │
│ ├──────────────────────────────────────────────┤ │ ┌─────────┐ │
│ │ AgentStatusGrid (3-col on lg, 1-col mobile)  │ │ │ Queue   │ │
│ │ ┌────────┐ ┌────────┐ ┌────────┐             │ │ │ Panel   │ │
│ │ │ Agent1 │ │ Agent2 │ │ Agent3 │             │ │ └─────────┘ │
│ │ │ Card   │ │ Card   │ │ Card   │             │ │ ┌─────────┐ │
│ │ └────────┘ └────────┘ └────────┘             │ │ │ Recent  │ │
│ ├──────────────────────────────────────────────┤ │ │ Runs    │ │
│ │ ActiveSwarmPanel (expandable)                │ │ └─────────┘ │
│ │ ┌──────────────────────────────────────────┐ │ │ ┌─────────┐ │
│ │ │ SwarmLanesView (parallel agent viz)      │ │ │ │ Memory  │ │
│ │ └──────────────────────────────────────────┘ │ │ │ Stats   │ │
│ ├──────────────────────────────────────────────┤ │ └─────────┘ │
│ │ HumanRequestsQueue (pending approvals)      │ │             │
│ └──────────────────────────────────────────────┘ │             │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 New Components to Create

#### A. AgentCommandBar.tsx
**Purpose**: Central input for agent commands
```tsx
// Features:
// - Text input with auto-complete for /spawn syntax
// - Agent type dropdown (Quick | Research | Deep)
// - Model selector (7 approved models)
// - Quick action chips: "Research", "Compare Sources", "Create Dossier"
```

#### B. AgentStatusCard.tsx (Replaces current AgentCard)
**Purpose**: Real-time agent status with live subscriptions
```tsx
// Features:
// - Live status dot (uses .status-dot.running CSS)
// - Current task preview
// - Progress ring (circular progress indicator)
// - Quick actions: Pause, Resume, View Thread
// - Expandable details (recent tool calls, memory usage)
// Uses: useQuery(api.domains.agents.swarmQueries.getAgentStatus)
```

#### C. SwarmVisualization.tsx
**Purpose**: Gantt-style parallel execution view
```tsx
// Features:
// - Horizontal lanes per agent
// - Execution bars with status colors
// - Current time indicator
// - Hover tooltips with output preview
// Leverages: agentDashboard.css timeline styles
```

#### D. HumanApprovalQueue.tsx
**Purpose**: Pending HITL requests
```tsx
// Features:
// - Card per pending request
// - Context preview
// - Suggested options as buttons
// - Approve/Reject actions
// Uses: useQuery(api.domains.agents.humanInTheLoop.getPendingRequests)
```

#### E. AgentSidebar.tsx
**Purpose**: Right sidebar matching other hubs
```tsx
// Features:
// - Collapsible (uses unified sidebar state)
// - Queue panel: pending/running tasks count
// - Recent runs: last 5 completed with status
// - Memory stats: key count, deduplication rate
```

### 3.3 Color Token Migration

Replace all hardcoded colors with CSS variables:

```tsx
// BEFORE (AgentsHub.tsx)
<div className="bg-white rounded-xl border border-gray-200">
<span className="bg-green-100 text-green-700">Active</span>

// AFTER
<div className="bg-[var(--bg-primary)] rounded-container border border-[var(--border-color)]">
<span className="agent-dashboard status-badge">Active</span>
```

Status color mapping:
| Status | Current | New (CSS class) |
|--------|---------|-----------------|
| Active/Running | `bg-green-100 text-green-700` | `.status-dot.running` + badge |
| Idle | `bg-gray-100 text-gray-600` | `.status-dot.pending` |
| Paused | `bg-amber-100 text-amber-700` | `.status-dot.paused` |
| Error | N/A | `.status-dot.error` |
| Complete | N/A | `.status-dot.complete` |

### 3.4 Typography Alignment

Apply PageHeroHeader pattern:
```tsx
// Current AgentsHub header
<h1 className="text-xl font-bold text-gray-900">Agents Hub</h1>

// New (matches Documents/Calendar)
<PageHeroHeader
  icon={<Bot className="w-6 h-6" />}
  title="Agents Hub"
  subtitle="Orchestrate AI agents for research, analysis, and automation"
  accent
/>
```

### 3.5 Data Binding Requirements

Wire up real data from backend:

```tsx
// AgentsHub.tsx
const agentRuns = useQuery(api.domains.agents.queries.getActiveRuns);
const swarms = useQuery(api.domains.agents.swarmQueries.getActiveSwarms);
const pendingApprovals = useQuery(api.domains.agents.humanInTheLoop.getPendingRequests);
const memoryStats = useQuery(api.domains.agents.agentMemory.getStats);

// Replace hardcoded agents array with:
const agents = [
  { id: 'coordinator', name: 'Coordinator', icon: '🎯', ...getAgentStats('coordinator') },
  { id: 'document', name: 'Document Agent', icon: '📄', ...getAgentStats('document') },
  { id: 'media', name: 'Media Agent', icon: '🎬', ...getAgentStats('media') },
  { id: 'sec', name: 'SEC Agent', icon: '📊', ...getAgentStats('sec') },
  { id: 'openbb', name: 'Finance Agent', icon: '💹', ...getAgentStats('openbb') },
  { id: 'arbitrage', name: 'Research Agent', icon: '🔍', ...getAgentStats('arbitrage') },
];
```

---

## Part 4: Implementation Phases

### Phase 1: Visual Consistency (2-3 files)
**Goal**: Make AgentsHub visually identical to other hubs

1. [ ] Refactor layout to use TopDividerBar + PageHeroHeader
2. [ ] Migrate colors to CSS custom properties
3. [ ] Add collapsible sidebar structure
4. [ ] Apply design system border-radius and shadows

**Files to modify**:
- `src/features/agents/views/AgentsHub.tsx`

**Files to reference**:
- `src/features/documents/components/DocumentsHomeHub.tsx`
- `src/features/calendar/components/CalendarHomeHub.tsx`
- `src/shared/ui/TopDividerBar.tsx`
- `src/shared/ui/PageHeroHeader.tsx`

### Phase 2: Agent Status Cards
**Goal**: Replace placeholder cards with live data

1. [ ] Create AgentStatusCard component with subscriptions
2. [ ] Add progress indicators and status dots
3. [ ] Implement expand/collapse for details
4. [ ] Wire up real agent run data

**New files**:
- `src/features/agents/components/AgentStatusCard.tsx`

**Backend queries needed**:
- `api.domains.agents.queries.getAgentStatus`
- `api.domains.agents.queries.getAgentStats`

### Phase 3: Command Bar & Quick Actions
**Goal**: Enable agent launching from hub

1. [ ] Create AgentCommandBar with /spawn support
2. [ ] Add agent type selector
3. [ ] Add model selector (use ApprovedModel type)
4. [ ] Implement quick action presets

**New files**:
- `src/features/agents/components/AgentCommandBar.tsx`

**Integration points**:
- `src/hooks/useSwarm.ts` (parseSpawnCommand)
- `convex/domains/agents/swarmOrchestrator.ts`

### Phase 4: Swarm Visualization
**Goal**: Show parallel agent execution

1. [ ] Integrate SwarmLanesView into hub
2. [ ] Add execution timeline with status bars
3. [ ] Implement hover details
4. [ ] Add progress gathering visualization

**Existing components to leverage**:
- `src/features/agents/components/FastAgentPanel/SwarmLanesView.tsx`
- `src/styles/agentDashboard.css` (timeline styles)

### Phase 5: Human-in-the-Loop Queue
**Goal**: Surface pending approvals

1. [ ] Create HumanApprovalQueue component
2. [ ] Wire up to humanRequests table
3. [ ] Implement approve/reject actions
4. [ ] Add notification badges

**Backend integration**:
- `convex/domains/agents/humanInTheLoop.ts`

### Phase 6: Sidebar & Memory Dashboard
**Goal**: Complete hub parity

1. [ ] Create AgentSidebar with queue panel
2. [ ] Add recent runs list
3. [ ] Add memory stats visualization
4. [ ] Persist sidebar state to localStorage

---

## Part 5: Latest Agent UI Best Practices (2025-2026)

Based on current industry trends:

### 1. Agent Status Visualization
- **Real-time indicators**: Pulsing dots for active, static for idle
- **Progress rings**: Circular indicators for task completion
- **Status history**: Mini timeline showing recent state changes

### 2. Multi-Agent Orchestration
- **Lane-based visualization**: Horizontal swim lanes per agent
- **Dependency arrows**: Show inter-agent relationships
- **Aggregated metrics**: Token usage, latency, success rate

### 3. Human-in-the-Loop UX
- **Prominent notification badges**: Don't hide pending approvals
- **Context preview**: Show why approval is needed
- **Quick action buttons**: One-click approve/reject

### 4. Memory & Context
- **Memory browser**: Searchable key-value viewer
- **Context window indicator**: Show token usage
- **Deduplication stats**: Show memory efficiency

### 5. Tool Execution Transparency
- **Tool call timeline**: Show sequence of tool invocations
- **Input/output preview**: Collapsible JSON/text preview
- **Error highlighting**: Prominent display of failures

---

## Part 6: File Change Summary

### Files to Modify
1. `src/features/agents/views/AgentsHub.tsx` - Major refactor
2. `src/shared/ui/UnifiedHubPills.tsx` - Add roadmap enabled

### Files to Create
1. `src/features/agents/components/AgentStatusCard.tsx`
2. `src/features/agents/components/AgentCommandBar.tsx`
3. `src/features/agents/components/HumanApprovalQueue.tsx`
4. `src/features/agents/components/AgentSidebar.tsx`
5. `convex/domains/agents/queries.ts` - New query functions

### Files to Reference (Read-Only)
- `src/features/documents/components/DocumentsHomeHub.tsx`
- `src/features/calendar/components/CalendarHomeHub.tsx`
- `src/shared/ui/TopDividerBar.tsx`
- `src/shared/ui/PageHeroHeader.tsx`
- `src/styles/agentDashboard.css`
- `src/index.css` (CSS variables)
- `convex/domains/agents/swarmOrchestrator.ts`
- `convex/domains/agents/humanInTheLoop.ts`
- `convex/domains/agents/agentMemory.ts`

---

## Appendix: Agent Shortcut Reference

For AgentCommandBar auto-complete:

| Shortcut | Agent | Description |
|----------|-------|-------------|
| `doc` | DocumentAgent | Document search and editing |
| `media` | MediaAgent | YouTube, web, media analysis |
| `sec` | SECAgent | SEC filings and company info |
| `finance` | OpenBBAgent | Stock, crypto, market data |
| `research` | ArbitrageAgent | Multi-source research |
| `all` | All agents | Full swarm execution |

Example commands:
```
/spawn "Research Tesla's latest financials" --agents=sec,finance
/spawn "Find recent news about AI" --agents=media,doc
/spawn "Compare sources on climate change" --agents=research
```
