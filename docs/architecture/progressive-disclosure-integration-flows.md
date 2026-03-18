# Progressive Disclosure: Product Integration Flows

**Generated:** 2026-01-07
**Updated:** 2026-01-08
**Status:** ✅ ALL PHASES COMPLETE — See implementation details in `progressive-disclosure-implementation-todos.md`

---

## Overview

This document shows how progressive disclosure connects to your four main product surfaces:
1. **ntfy Daily Brief** - Morning digest via push notifications
2. **FastAgentPanel** - Interactive chat with tool orchestration
3. **Calendar/Email Integration** - Data access tools
4. **Document Editing Agent** - Deep edit workflows

---

## 1. ntfy Daily Brief (`digestAgent.ts`)

### Current Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CURRENT FLOW                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Feed Items ──► PERSONA_CONFIGS lookup ──► Fixed prompt ──► LLM      │
│                 (16 personas hardcoded)                               │
│                                                                       │
│  Persona = JPM_STARTUP_BANKER                                         │
│    ├── focus: "funding rounds, M&A activity..."                       │
│    ├── priorityCategories: ["funding", "acquisition", "ipo"]          │
│    └── actionPrompt: "Generate outreach targets..."                   │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**What works:**
- Persona configs are well-defined (16 personas with focus/priority/actionPrompt)
- Output parsing handles diverse LLM formats (47 normalization patterns)
- Cache layer with TTL

**What's missing:** ✅ ALL ADDRESSED
- ~~No skill retrieval~~ → `loadPersonaSkill()` in `digestAgent.ts` loads from skill registry with fallback
- ~~No tool search~~ → Tool search via gateway for digest-specific operations
- ~~No progressive disclosure instrumentation~~ → `DisclosureLogger` integration in `fastAgentPanelStreaming.ts`

### Proposed Enhancement

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ENHANCED FLOW                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Feed Items ──► searchAvailableSkills("digest " + persona)           │
│                         │                                             │
│                         ▼                                             │
│               describeSkill("digest-jpm-banker")                     │
│                         │                                             │
│                         ▼                                             │
│               Load persona-specific instructions (L2)                 │
│                         │                                             │
│                         ▼                                             │
│               Generate with loaded skill context ──► LLM             │
│                                                                       │
│  Disclosure metrics recorded:                                         │
│    - skillSearchCalls: 1                                              │
│    - skillsActivated: ["digest-jpm-banker"]                          │
│    - skillTokensAdded: 350                                            │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Implementation in `digestAgent.ts`:**

```typescript
// Before (current):
const personaConfig = PERSONA_CONFIGS[persona as DigestPersona];

// After (with progressive disclosure):
const skillName = `digest-${persona.toLowerCase().replace(/_/g, '-')}`;
const skillSearch = await ctx.runAction(internal.tools.meta.skillDiscovery.hybridSearchSkills, {
  query: `digest ${persona} morning brief`,
  limit: 1
});

let personaInstructions: string;
if (skillSearch.length > 0) {
  // L2: Load full skill instructions
  const skill = await ctx.runQuery(api.tools.meta.skillDiscoveryQueries.getSkillByName, {
    name: skillSearch[0].skillName
  });
  personaInstructions = skill.fullInstructions;
  disclosureMetrics.skillsActivated.push(skill.name);
} else {
  // Fallback to static config
  personaInstructions = personaConfig.actionPrompt;
}
```

---

## 2. FastAgentPanel (`coordinatorAgent.ts` + UI)

### Current Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CURRENT FLOW                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User message ──► Coordinator Agent with ALL tools loaded            │
│                   (70+ tools in system prompt)                        │
│                         │                                             │
│                         ▼                                             │
│                   Skills meta-tools available:                        │
│                   - searchAvailableSkills ✓                           │
│                   - describeSkill ✓                                   │
│                   - listSkillCategories ✓                             │
│                         │                                             │
│                         ▼                                             │
│                   Model decides whether to search                     │
│                   (often skips, relies on in-context instructions)    │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**What works:**
- Skill discovery tools ARE registered (lines 387-389 in coordinatorAgent.ts)
- UI has SkillsPanel for manual skill browsing
- System prompt includes "Skill Discovery Flow" instructions

**What's missing:** ✅ ALL ADDRESSED
- ~~Model doesn't consistently use skill search~~ → Gateway enforces skill-first; blocked without active skill
- ~~All 70+ tools loaded upfront~~ → Tool schema deferral via allowlist enforcement
- ~~No disclosure metrics~~ → `disclosureMetrics` in `fastAgentPanelStreaming.ts` telemetry

### Proposed Enhancement

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ENHANCED FLOW                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  User message ──► classifyIntent (retrieval-backed)                  │
│                         │                                             │
│                         ▼                                             │
│               searchAvailableSkills(message) ── REQUIRED              │
│                         │                                             │
│                         ▼                                             │
│               Top skill determines tool allowlist                     │
│                         │                                             │
│                         ▼                                             │
│               searchAvailableTools(skill.allowedTools context)       │
│                         │                                             │
│                         ▼                                             │
│               Load only selected tool schemas                         │
│                         │                                             │
│                         ▼                                             │
│               Execute with constrained toolset                        │
│                                                                       │
│  UI shows:                                                            │
│    - "Loaded skill: company-research"                                 │
│    - "Tools active: 5 of 70"                                          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**Implementation approach:**

```typescript
// In coordinatorAgent system prompt, change from:
// "When you encounter a complex task, consider using searchAvailableSkills..."

// To (enforced):
const SKILL_FIRST_INSTRUCTION = `
## MANDATORY: Skill-First Approach

For EVERY user request (except simple greetings):

1. FIRST call searchAvailableSkills with the user's query
2. If a relevant skill is found (score > 0.7), call describeSkill to load it
3. The loaded skill's allowedTools restricts your available tools for this turn
4. Follow the skill's workflow steps

This is NOT optional. Skipping skill search will result in lower quality responses.
`;

// Tool visibility restriction:
if (activeSkill?.allowedTools?.length) {
  agent.filterTools(activeSkill.allowedTools);
}
```

---

## 3. Calendar & Email Integration (`dataAccess/tools/calendarTools.ts`)

### Current Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CURRENT FLOW                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  "Schedule a meeting" ──► Coordinator routes to dataAccess agent     │
│                                   │                                   │
│                                   ▼                                   │
│                           calendarTools loaded:                       │
│                           - listEvents                                │
│                           - createEvent                               │
│                                   │                                   │
│                                   ▼                                   │
│                           Execute calendar operation                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**What works:**
- Calendar tools are in dedicated dataAccess subagent
- Tools are already scoped (only calendar + task tools)
- Google Calendar integration exists

**What's missing:** ✅ ALL ADDRESSED
- ~~No skill for "meeting scheduling workflow"~~ → `meeting-scheduler` skill seeded
- ~~No skill for "calendar availability check"~~ → `calendar-availability-check` skill seeded
- ~~Email tools not yet integrated~~ → `email-outreach` skill seeded with workflow

### Proposed Enhancement

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ENHANCED FLOW                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  "Schedule a meeting" ──► searchAvailableSkills("schedule meeting")  │
│                                   │                                   │
│                                   ▼                                   │
│                           describeSkill("meeting-scheduler")         │
│                                   │                                   │
│                           Skill loads with:                           │
│                           - Step 1: Check calendar availability       │
│                           - Step 2: Propose 3 time slots              │
│                           - Step 3: Create event after confirmation   │
│                           - allowedTools: [listEvents, createEvent]   │
│                                   │                                   │
│                                   ▼                                   │
│                           Execute with workflow                       │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**New skills to create:**

```typescript
// In seedSkillRegistry.ts, add:
{
  name: "meeting-scheduler",
  description: "Schedule meetings with calendar availability checking and conflict detection",
  category: "workflow",
  categoryName: "Workflow & Automation",
  keywords: ["schedule", "meeting", "calendar", "availability", "book"],
  allowedTools: ["listEvents", "createEvent"],
  fullInstructions: `## Meeting Scheduler Skill

### Step 1: Check Availability
Call listEvents for the requested date range to identify free slots.

### Step 2: Propose Options
Present 3 available time slots to the user, noting any nearby conflicts.

### Step 3: Confirm and Create
After user selects a slot, call createEvent with the details.
Confirm the event was created and provide calendar link.

### Output Format
- "I found 3 available slots: [list]"
- "Created: [event title] on [date/time]"
`
},
{
  name: "email-outreach",
  description: "Draft and send professional outreach emails with context awareness",
  category: "workflow",
  categoryName: "Workflow & Automation",
  keywords: ["email", "outreach", "send", "draft", "message"],
  allowedTools: ["sendEmail", "searchTeachings"],
  fullInstructions: `## Email Outreach Skill

### Step 1: Gather Context
Search for relevant teachings about the recipient or topic.

### Step 2: Draft Email
Write professional email following user's tone preferences.

### Step 3: Review and Send
Show draft, get confirmation, then send.
`
}
```

---

## 4. Document Editing Agent (`documentAgent.ts`)

### Current Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CURRENT FLOW                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  "Edit section 3" ──► Coordinator delegates to documentAgent         │
│                               │                                       │
│                               ▼                                       │
│                       deepAgentEditTools loaded:                      │
│                       - updateNarrativeSection                        │
│                       - enrichDataPoint                               │
│                       - generateAnnotation                            │
│                       - getChartContext                               │
│                               │                                       │
│                               ▼                                       │
│                       Execute edit operation                          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**What works:**
- Document tools are specialized and well-defined
- MetaTools variant has tool discovery capabilities
- Edit operations are atomic and traceable

**What's missing:** ✅ ALL ADDRESSED
- ~~No skill for "document section editing workflow"~~ → `document-section-enrichment` skill seeded
- ~~No skill for "citation management"~~ → `document-citation-audit` skill seeded
- ~~Tools loaded regardless of edit type~~ → Gateway enforces skill allowlist

### Proposed Enhancement

```
┌──────────────────────────────────────────────────────────────────────┐
│                       ENHANCED FLOW                                   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  "Expand the funding section with more detail"                       │
│                               │                                       │
│                               ▼                                       │
│       searchAvailableSkills("document expand section funding")       │
│                               │                                       │
│                               ▼                                       │
│               describeSkill("document-section-enrichment")           │
│                               │                                       │
│               Skill specifies:                                        │
│               - allowedTools: [enrichDataPoint, updateNarrativeSection]│
│               - workflow: research → enrich → update → verify         │
│                               │                                       │
│                               ▼                                       │
│               Execute with constrained tools                          │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

**New skills to create:**

```typescript
{
  name: "document-section-enrichment",
  description: "Enrich a document section with additional research, data, and citations",
  category: "document",
  categoryName: "Document Operations",
  keywords: ["expand", "enrich", "section", "detail", "document", "elaborate"],
  allowedTools: ["enrichDataPoint", "updateNarrativeSection", "lookupGroundTruthEntity"],
  fullInstructions: `## Document Section Enrichment Skill

### Step 1: Analyze Current Content
Read the section to understand what's there and what's missing.

### Step 2: Research Gaps
Use enrichDataPoint to gather additional facts, numbers, or context.

### Step 3: Update Section
Use updateNarrativeSection to integrate the new content seamlessly.

### Step 4: Verify
Ensure citations are properly anchored and facts are grounded.
`
},
{
  name: "document-citation-audit",
  description: "Audit and fix citations in a document for accuracy and completeness",
  category: "document",
  categoryName: "Document Operations",
  keywords: ["citation", "audit", "reference", "source", "verify"],
  allowedTools: ["generateAnnotation", "getChartContext"],
  fullInstructions: `...`
}
```

---

## 5. Integration Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED PROGRESSIVE DISCLOSURE                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                          ┌──────────────────┐                                │
│                          │   Skills Table   │                                │
│                          │  (10+ skills)    │                                │
│                          └────────┬─────────┘                                │
│                                   │                                          │
│        ┌──────────────────────────┼──────────────────────────┐               │
│        │                          │                          │               │
│        ▼                          ▼                          ▼               │
│  ┌──────────────┐         ┌──────────────┐          ┌──────────────┐        │
│  │ Digest Agent │         │ Coordinator  │          │ Document     │        │
│  │ (ntfy/email) │         │ (FastAgent)  │          │ Agent        │        │
│  └──────┬───────┘         └──────┬───────┘          └──────┬───────┘        │
│         │                        │                         │                 │
│         ▼                        ▼                         ▼                 │
│  searchAvailableSkills   searchAvailableSkills    searchAvailableSkills     │
│         │                        │                         │                 │
│         ▼                        ▼                         ▼                 │
│  describeSkill           describeSkill             describeSkill             │
│  "digest-jpm-banker"     "company-research"        "doc-enrichment"          │
│         │                        │                         │                 │
│         ▼                        ▼                         ▼                 │
│  ┌──────────────┐         ┌──────────────┐          ┌──────────────┐        │
│  │ Tool Filter  │         │ Tool Filter  │          │ Tool Filter  │        │
│  │ (allowedTools)│        │ (allowedTools)│         │ (allowedTools)│        │
│  └──────┬───────┘         └──────┬───────┘          └──────┬───────┘        │
│         │                        │                         │                 │
│         ▼                        ▼                         ▼                 │
│  ┌──────────────┐         ┌──────────────┐          ┌──────────────┐        │
│  │ Tool Registry│         │ Tool Registry│          │ Tool Registry│        │
│  │ (filtered)   │         │ (filtered)   │          │ (filtered)   │        │
│  └──────────────┘         └──────────────┘          └──────────────┘        │
│                                                                              │
│                          ┌──────────────────┐                                │
│                          │ Disclosure Logs  │                                │
│                          │ (instrumentation)│                                │
│                          └──────────────────┘                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Checklist

### Phase 1: Instrumentation ✅ COMPLETE

- [x] Add `disclosureMetrics` to `digestAgent.ts` output — Integrated via `loadPersonaSkill` with `fromSkill` flag
- [x] Add `disclosureMetrics` to `coordinatorAgent.ts` agent response — `DisclosureSummary` in streamAsync telemetry
- [x] Log skill searches in `skillDiscovery.ts` — `DisclosureLogger.logSkillSearch()`
- [x] Log tool expansions in `toolDiscoveryV2.ts` — `DisclosureLogger.logToolDescribe()`

### Phase 2: Skill-First Enforcement ✅ COMPLETE

- [x] Add "MANDATORY: Skill-First" instruction to coordinator prompt — Gateway enforces skill activation
- [x] Create `classifyIntent` tool that requires skill lookup — `classifyPersona` tool in `skillDiscovery.ts`
- [x] Add skill allowlist enforcement in agent context — `toolGateway.ts:162-171`

### Phase 3: New Skills ✅ COMPLETE (31 Skills Seeded)

- [x] `meeting-scheduler` - Calendar workflow — In `seedSkillRegistry.ts`
- [x] `email-outreach` - Email workflow — In `seedSkillRegistry.ts`
- [x] `document-section-enrichment` - Doc editing — In `seedSkillRegistry.ts`
- [x] `document-citation-audit` - Citation management — In `seedSkillRegistry.ts`
- [x] `calendar-availability-check` - Calendar availability — In `seedSkillRegistry.ts`
- [x] 16 `digest-*` persona skills (JPM_STARTUP_BANKER through GENERAL) — In `seedSkillRegistry.ts`
- [x] 10 research skills (company-research, market-analysis, etc.) — In `seedSkillRegistry.ts`

### Phase 4: Tool Deferral ✅ COMPLETE

- [x] Implement `deferLoadingDefault` in tool registry — Schema at `convex/schema.ts:3864`
- [x] Only load tool schemas when selected via `searchAvailableTools` — Gateway enforces via allowlist
- [x] Measure token savings in eval harness — `estimatedToolSchemaTokens` metric in `personaEpisodeEval.ts`

---

## 7. Metrics to Track

| Metric | Target | Current |
|--------|--------|---------|
| Skill search rate (digest) | 100% | 0% |
| Skill search rate (FastAgent) | >80% | ~5% (optional) |
| Tool deferral rate | >50% | 0% |
| Avg tokens per digest | <3,000 | ~5,000 |
| Avg tokens per FastAgent turn | <10,000 | ~25,000 |

---

## 8. Enforcement Rules (Per Surface)

Progressive disclosure fails if it's "suggested" but not enforced. Each surface needs explicit enforcement mechanisms.

### 8.1 Digest Agent Enforcement

| Rule | Enforcement Mechanism | Exception |
|------|----------------------|-----------|
| Must call `searchAvailableSkills` before generation | Runner rejects generation if `disclosureMetrics.skillSearchCalls === 0` | None - digest always requires persona skill |
| Max 1 skill expanded per digest | Runner caps at `maxSkillsExpanded=1` | None |
| Max 2 tools expanded per digest | Runner caps at `maxToolsExpanded=2` | Emergency override via admin flag |
| Skill cache must be checked first | Query `digestSkillCache` by persona+skillHash before search | Cache miss forces fresh search |

**Enforcement code location:** `convex/domains/agents/digestAgent.ts`

```typescript
// ENFORCEMENT: Reject digest generation without skill search
if (!disclosureMetrics.skillSearchCalls || disclosureMetrics.skillSearchCalls === 0) {
  throw new Error("ENFORCEMENT: Digest generation requires skill search. Call searchAvailableSkills first.");
}
```

### 8.2 FastAgentPanel Enforcement

| Rule | Enforcement Mechanism | Exception |
|------|----------------------|-----------|
| Non-trivial queries must search skills | Intent classifier returns `requiresSkillSearch: boolean` | Simple greetings, single-word queries |
| Tool invocation gated through `invokeTool` | Direct tool calls blocked; all execution via gateway | Meta-tools (searchAvailableSkills, etc.) |
| Tool filter enforced from skill allowlist | `agent.filterTools(activeSkill.allowedTools)` | No skill found = full catalog available |
| Max 5 tool schemas per turn | Schema loading capped regardless of request | Override via `allowUnlimitedTools` flag |

**Enforcement code location:** `convex/domains/agents/core/coordinatorAgent.ts`

```typescript
// ENFORCEMENT: Block direct tool calls for non-meta tools
const META_TOOLS = ["searchAvailableSkills", "describeSkill", "searchAvailableTools", "describeTools", "invokeTool"];

function validateToolCall(toolName: string, hasActiveSkill: boolean) {
  if (META_TOOLS.includes(toolName)) return true; // Always allowed
  if (!hasActiveSkill) {
    throw new Error(`ENFORCEMENT: Cannot call ${toolName} without first activating a skill via describeSkill.`);
  }
  return true;
}
```

### 8.3 Calendar/Email Enforcement

| Rule | Enforcement Mechanism | Exception |
|------|----------------------|-----------|
| Write operations require confirmation | `createEvent`/`sendEmail` return `{ status: "pending_confirmation", draftId }` | Test mode with `skipConfirmation=true` |
| Read operations unrestricted | `listEvents`/`searchEmails` execute immediately | None |
| Confirmation timeout 5 minutes | Draft expires if not confirmed | None |
| Must log all write intents | Insert into `actionDrafts` table before execution | None |

**Risk tier enforcement:**

```typescript
const TOOL_RISK_TIERS = {
  "listEvents": "read-only",
  "createEvent": "write",
  "deleteEvent": "destructive",
  "sendEmail": "write",
};

async function executeWithRiskCheck(toolName: string, args: any, ctx: ActionCtx) {
  const tier = TOOL_RISK_TIERS[toolName];

  if (tier === "write" || tier === "destructive") {
    // Create draft, require confirmation
    const draftId = await ctx.runMutation(internal.actions.createActionDraft, {
      toolName,
      args,
      riskTier: tier,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min
    });
    return { status: "pending_confirmation", draftId, message: "Please confirm this action." };
  }

  // Read-only: execute immediately
  return executeDirectly(toolName, args);
}
```

### 8.4 Document Agent Enforcement

| Rule | Enforcement Mechanism | Exception |
|------|----------------------|-----------|
| Edits must specify section ID | Reject `updateNarrativeSection` without `sectionId` | Full document rewrites (admin only) |
| Diff-first for all edits | Return `{ before, after, diff }` not just new content | None |
| Citation anchors required for new facts | Validate `groundingAnchors` array non-empty | Styling-only edits |
| Max section size 2000 tokens | Reject edits that would exceed limit | Split into multiple sections |

**Enforcement code location:** `convex/domains/agents/core/subagents/document_subagent/deepAgentEditTools.ts`

```typescript
// ENFORCEMENT: Require section targeting
function validateEditRequest(request: EditRequest) {
  if (!request.sectionId && !request.adminFullRewrite) {
    throw new Error("ENFORCEMENT: Document edits must target a specific sectionId.");
  }
  if (request.addsFacts && (!request.groundingAnchors || request.groundingAnchors.length === 0)) {
    throw new Error("ENFORCEMENT: New facts require grounding anchors.");
  }
}
```

---

## 9. Token Budgets (Per Surface)

Progressive disclosure is meaningless without budget constraints. These prevent "load everything" regressions.

### 9.1 Digest Agent Budget

| Component | Max Tokens | Notes |
|-----------|------------|-------|
| L0 rules (always-on) | 500 | Output schema, safety constraints |
| L1 catalog metadata | 300 | Skill names only (not full instructions) |
| L2 skill expansion | 800 | One persona skill fully loaded |
| L3 nested resources | 0 | Not used in digest (batch job) |
| Feed items context | 1,500 | Summarized, not raw |
| **Total prompt budget** | **3,100** | Down from ~5,000 current |

**Cache strategy:** L2 content cached by `{persona, skillVersion}` tuple. Cache TTL = 24 hours.

### 9.2 FastAgentPanel Budget

| Component | Max Tokens | Notes |
|-----------|------------|-------|
| L0 rules (always-on) | 800 | Core instructions, safety, output format |
| L1 catalog metadata | 1,500 | Skill names + tool names (no schemas) |
| L2 skill expansion | 1,200 | Max 2 skills per turn |
| L2 tool schemas | 1,000 | Max 5 tool schemas per turn |
| L3 nested resources | 500 | On-demand only |
| User message + history | 5,000 | Rolling window |
| **Total prompt budget** | **10,000** | Down from ~25,000 current |

**Dynamic adjustment:** If user message > 2,000 tokens, reduce L1 catalog to names-only (no descriptions).

### 9.3 Calendar/Email Budget

| Component | Max Tokens | Notes |
|-----------|------------|-------|
| L0 rules | 300 | Risk tier rules, confirmation requirements |
| L1 catalog | 200 | Only calendar/email tools visible |
| L2 skill | 600 | meeting-scheduler or email-outreach |
| L3 org constraints | 400 | Working hours, meeting buffers |
| Calendar data | 800 | Event summaries, not full details |
| **Total prompt budget** | **2,300** | Relatively small surface |

### 9.4 Document Agent Budget

| Component | Max Tokens | Notes |
|-----------|------------|-------|
| L0 rules | 400 | Edit constraints, diff requirements |
| L1 catalog | 300 | Document tools only |
| L2 skill | 800 | document-section-enrichment |
| L3 citation examples | 500 | On-demand for citation audit |
| Section content | 2,000 | Only the target section, not full doc |
| **Total prompt budget** | **4,000** | |

**Critical constraint:** Never load full document into context. Always section-scoped.

---

## 10. Trace UI Requirements

The UI must show actual trace events, not model-generated labels. This prevents hallucinated status.

### 10.1 Required Trace Events (All Surfaces)

```typescript
interface DisclosureTraceEvent {
  timestamp: number;
  eventType:
    | "skill.search"      // searchAvailableSkills called
    | "skill.describe"    // describeSkill called (L2 expansion)
    | "tool.search"       // searchAvailableTools called
    | "tool.describe"     // describeTools called (schema expansion)
    | "tool.invoke"       // invokeTool gateway called
    | "resource.load"     // L3 nested resource loaded
    | "policy.confirm_requested"  // Write operation awaiting confirmation
    | "policy.confirm_granted"    // User confirmed action
    | "policy.confirm_denied"     // User rejected action
    | "budget.exceeded"   // Token budget hit
    | "enforcement.blocked"; // Rule violation blocked execution

  details: {
    query?: string;           // For searches
    skillName?: string;       // For skill events
    toolName?: string;        // For tool events
    tokensAdded?: number;     // For expansions
    reason?: string;          // For blocks/denials
  };
}
```

### 10.2 FastAgentPanel UI Display

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Disclosure Trace                                         │
├─────────────────────────────────────────────────────────────┤
│ 10:23:45  skill.search    "company research stripe"         │
│           → 3 matches, top: company-research (0.92)         │
│                                                             │
│ 10:23:46  skill.describe  company-research                  │
│           → +450 tokens, allowedTools: [4 tools]            │
│                                                             │
│ 10:23:47  tool.search     "entity lookup"                   │
│           → 2 matches                                       │
│                                                             │
│ 10:23:47  tool.describe   lookupGroundTruthEntity           │
│           → +120 tokens (schema loaded)                     │
│                                                             │
│ 10:23:50  tool.invoke     lookupGroundTruthEntity           │
│           → entityId: "stripe", success                     │
├─────────────────────────────────────────────────────────────┤
│ 📊 Budget: 2,850 / 10,000 tokens                            │
│ 🎯 Skills: 1 active | Tools: 2 expanded                     │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Digest Agent UI Display (Admin Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│ 📬 Digest Generation: JPM_STARTUP_BANKER                    │
├─────────────────────────────────────────────────────────────┤
│ Skill: digest-jpm-banker (cached, hash: a3f2...)            │
│ Tokens: 2,450 / 3,100 budget                                │
│ Feed items: 12 processed                                    │
│ Breaking alerts: 2                                          │
├─────────────────────────────────────────────────────────────┤
│ Trace:                                                      │
│   skill.search → cache hit                                  │
│   skill.describe → skipped (cached)                         │
│   tool.invoke → evaluateEntityForPersona × 3                │
└─────────────────────────────────────────────────────────────┘
```

### 10.4 Calendar/Email UI Display

```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Meeting Scheduler                                        │
├─────────────────────────────────────────────────────────────┤
│ Step 1: ✅ Checked availability (listEvents)                │
│ Step 2: ✅ Proposed 3 slots                                 │
│ Step 3: ⏳ Awaiting confirmation                            │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ PENDING: Create event "Sync with Alex"                   │
│    📆 Tuesday 2pm-2:30pm                                    │
│    🔒 Risk tier: write                                      │
│                                                             │
│    [Confirm] [Cancel]                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. Failure Modes & Fallbacks

### 11.1 Skill Search Returns Empty

**Scenario:** `searchAvailableSkills` returns no matches (score < threshold).

**Fallback behavior by surface:**

| Surface | Fallback | User message |
|---------|----------|--------------|
| Digest | Use hardcoded `PERSONA_CONFIGS` | None (silent fallback) |
| FastAgent | Proceed with full tool catalog | "I couldn't find a specialized skill for this. Using general capabilities." |
| Calendar | Use default scheduling workflow | None (generic workflow) |
| Document | Load all document tools | "No specialized editing skill found. Proceeding with standard tools." |

**Telemetry:** Log `skill.search.fallback` event with query and scores.

### 11.2 Tool Search Returns Empty

**Scenario:** `searchAvailableTools` returns no matches.

**Fallback behavior:**

```typescript
if (toolSearchResults.length === 0) {
  // Option 1: Suggest related skills that might have the right tools
  const relatedSkills = await searchAvailableSkills({
    query: originalQuery,
    limit: 3
  });

  if (relatedSkills.length > 0) {
    return {
      status: "suggest_skill",
      message: `No direct tools found. Consider using the "${relatedSkills[0].name}" skill.`,
      suggestions: relatedSkills,
    };
  }

  // Option 2: Fall back to web search / external lookup
  return {
    status: "no_tools",
    message: "I don't have specialized tools for this. Would you like me to search externally?",
    offerExternalSearch: true,
  };
}
```

### 11.3 Schema Mismatch / Tool Execution Failure

**Scenario:** `invokeTool` fails due to schema validation or runtime error.

**Fallback behavior:**

```typescript
async function invokeToolWithFallback(toolName: string, args: any) {
  try {
    return await invokeTool({ toolName, args });
  } catch (error) {
    if (error.code === "SCHEMA_VALIDATION_FAILED") {
      // Log the mismatch for debugging
      await logToolError({
        toolName,
        errorType: "schema_mismatch",
        providedArgs: args,
        expectedSchema: error.schema,
      });

      // Return structured error to model
      return {
        status: "error",
        errorType: "schema_mismatch",
        message: `The arguments for ${toolName} don't match the expected format.`,
        hint: error.validationMessage,
      };
    }

    if (error.code === "TOOL_EXECUTION_FAILED") {
      return {
        status: "error",
        errorType: "execution_failed",
        message: `${toolName} failed to execute.`,
        canRetry: error.retryable,
      };
    }

    throw error; // Unknown error, propagate
  }
}
```

### 11.4 Budget Exceeded Mid-Turn

**Scenario:** Token budget hit before task completion.

**Fallback behavior:**

```typescript
function checkBudgetBeforeExpansion(currentTokens: number, expansionCost: number, budget: number) {
  if (currentTokens + expansionCost > budget) {
    return {
      allowed: false,
      action: "summarize_and_continue",
      message: "Approaching token limit. Summarizing context before continuing.",
    };
  }
  return { allowed: true };
}

// During expansion:
const budgetCheck = checkBudgetBeforeExpansion(
  disclosureMetrics.totalTokens,
  skill.tokenEstimate,
  SURFACE_BUDGETS[surface]
);

if (!budgetCheck.allowed) {
  // Summarize current context
  await summarizeAndTruncateHistory();
  // Then proceed with expansion
}
```

### 11.5 Confirmation Timeout (Write Operations)

**Scenario:** User doesn't confirm/deny within 5 minutes.

**Fallback behavior:**

```typescript
// Scheduled job checks for expired drafts
export const expireStaleActionDrafts = internalMutation({
  handler: async (ctx) => {
    const expired = await ctx.db
      .query("actionDrafts")
      .withIndex("by_expiry")
      .filter((q) => q.lt(q.field("expiresAt"), Date.now()))
      .collect();

    for (const draft of expired) {
      await ctx.db.patch(draft._id, {
        status: "expired",
        expiredAt: Date.now(),
      });

      // Notify user
      await ctx.scheduler.runAfter(0, internal.notifications.sendExpiredDraftNotice, {
        userId: draft.userId,
        draftId: draft._id,
        actionSummary: draft.actionSummary,
      });
    }
  },
});
```

### 11.6 Partial Execution with Safe Abort

**Scenario:** Multi-step workflow fails mid-execution.

**Fallback behavior:**

```typescript
interface WorkflowCheckpoint {
  workflowId: string;
  currentStep: number;
  completedSteps: { stepId: string; result: any }[];
  pendingSteps: string[];
  canResume: boolean;
}

async function executeWorkflowWithCheckpoints(workflow: Workflow) {
  const checkpoint: WorkflowCheckpoint = {
    workflowId: workflow.id,
    currentStep: 0,
    completedSteps: [],
    pendingSteps: workflow.steps.map((s) => s.id),
    canResume: true,
  };

  for (const step of workflow.steps) {
    try {
      const result = await executeStep(step);
      checkpoint.completedSteps.push({ stepId: step.id, result });
      checkpoint.pendingSteps = checkpoint.pendingSteps.filter((id) => id !== step.id);
      checkpoint.currentStep++;

      // Persist checkpoint
      await saveCheckpoint(checkpoint);
    } catch (error) {
      // Determine if we can safely abort
      if (step.isReversible) {
        await rollbackStep(step, checkpoint);
        checkpoint.canResume = true;
      } else {
        checkpoint.canResume = false;
      }

      return {
        status: "partial_failure",
        checkpoint,
        error: error.message,
        completedSteps: checkpoint.completedSteps.length,
        totalSteps: workflow.steps.length,
      };
    }
  }

  return { status: "success", checkpoint };
}
```

---

## Appendix: File Locations (Updated 2026-01-08)

| Component | File | Key Functions |
|-----------|------|---------------|
| Digest Agent | `convex/domains/agents/digestAgent.ts` | `generateAgentDigest`, `loadPersonaSkill` |
| Coordinator | `convex/domains/agents/core/coordinatorAgent.ts` | `createCoordinatorAgent`, meta-tools registered |
| FastAgent UI | `src/features/agents/components/FastAgentPanel/` | `SkillsPanel.tsx`, `FastAgentPanel.DisclosureTrace.tsx` |
| Calendar Tools | `convex/domains/agents/dataAccess/tools/calendarTools.ts` | `listEvents`, `createEvent` |
| Document Agent | `convex/domains/agents/core/subagents/document_subagent/` | `deepAgentEditTools.ts` |
| Skill Registry | `convex/tools/meta/seedSkillRegistry.ts` | **31 skills defined** |
| Skill Discovery | `convex/tools/meta/skillDiscovery.ts` | `searchAvailableSkills`, `describeSkill`, `classifyPersona` |
| **Tool Gateway** | `convex/tools/meta/toolGateway.ts` | `executeViaGateway`, risk tier enforcement |
| **Action Drafts** | `convex/tools/meta/actionDraftMutations.ts` | Draft→confirm flow for write operations |
| **Disclosure Events** | `convex/domains/telemetry/disclosureEvents.ts` | `DisclosureLogger`, `DisclosureSummary` |
| **Disclosure Trace UI** | `src/features/agents/components/FastAgentPanel/FastAgentPanel.DisclosureTrace.tsx` | Real-time trace display |
| **Stream Async** | `convex/domains/agents/fastAgentPanelStreaming.ts` | `disclosureMetrics` integration |
