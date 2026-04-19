# Bidirectional Focus & Editorial Choreography Implementation Plan

> **Goal**: Transform the Morning Dossier from a "functional dashboard" into a "cinematic, living document" with true text↔chart interplay, using our live Fast Agent infrastructure.

---

## Quick Reference

| Section | Description |
|---------|-------------|
| [Phase 0: Agent Infrastructure](#phase-0-agent-infrastructure-highest-priority) | **START HERE** - DossierInteractionAgent, tools, Convex tables |
| [Phase 1: React Subscription Layer](#phase-1-react-subscription-layer) | FocusSyncContext subscribes to agent state |
| [Phase 2: UI Trigger Components](#phase-2-ui-trigger-components) | InteractiveSpan triggers agent on hover/click |
| [Phase 3: Structured Output](#phase-3-structured-output-lower-priority) | Deictic prompts for brief generation (lower priority) |
| [**Phase 4: Fast Agent Panel Integration**](#phase-4-fast-agent-panel-integration) | **KEY** - Bidirectional sync with panel, DossierModeIndicator |
| [Task Breakdown](#detailed-task-breakdown-revised---agent-first) | Sprint 0-3 with checkboxes |
| [Summary: Agent-First vs UI-First](#summary-agent-first-vs-ui-first-approach) | Why this architecture |

---

## Executive Summary

Currently, our scrolly dashboard uses **pre-generated static data** from `executiveBriefRecord`. This plan adds:
1. **Agent-Orchestrated Updates (HIGHEST PRIORITY)** - Agent uses tools and subagents to update dossier/chart state in real-time
2. **Bidirectional Focus** - Text↔Chart magic linking via agent-managed state (Convex subscriptions)
3. **Editorial Choreography** - Agent-generated annotations, deictic prompts, smooth transitions

### Key Design Decision

**Agent orchestrates state changes via tools → React subscribes to Convex → UI reflects state**

This follows the existing patterns in:
- `convex/domains/agents/core/subagents/document_subagent/` (subagent pattern)
- `convex/domains/agents/core/delegation/delegationTools.ts` (delegation pattern)
- `@convex-dev/agent` createTool pattern for tool definitions

---

## Priority Hierarchy

| Priority | Approach | Description |
|----------|----------|-------------|
| **P0 (Highest)** | Agent + Subagent Orchestration | Agent delegates to DossierInteractionAgent which uses tools to UPDATE state |
| **P1 (High)** | Tool Calls | Direct tool calls from agent to mutate dossier/chart state |
| **P2 (Medium)** | React Subscriptions | React subscribes to Convex for real-time updates |
| **P3 (Lower)** | Structured Output | LLM generates structured annotations/text at brief creation time |

---

## Architecture Overview (Agent-First)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          AGENT LAYER (CONVEX)                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    CoordinatorAgent                                      │    │
│  │    delegateToDossierAgent(query) ──────┐                                │    │
│  └────────────────────────────────────────│────────────────────────────────┘    │
│                                           ↓                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                  DossierInteractionAgent (NEW SUBAGENT)                  │    │
│  │    Tools:                                                                │    │
│  │    ├─ getChartContext()        → Read current chart state               │    │
│  │    ├─ generateAnnotation()     → Create annotation for data point       │    │
│  │    ├─ enrichDataPoint()        → Fetch more context via LinkUp/SEC      │    │
│  │    ├─ updateFocusState()       → Mutate focus state in Convex           │    │
│  │    └─ updateNarrativeSection() → Update brief section with deictic text │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                           │                                      │
│                                           ↓ mutations                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                    Convex Tables (Persistent State)                      │    │
│  │    dossierFocusState: { briefId, focusedDataIndex, hoveredSpanId, ... } │    │
│  │    dossierAnnotations: { briefId, dataIndex, text, position, ... }      │    │
│  │    dailyBriefMemories.context.annotations: [...]                        │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            │ subscriptions (useQuery)
                                            ↓
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REACT LAYER (FRONTEND)                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │              FocusSyncContext (SUBSCRIBES to Convex)                     │    │
│  │   const focusState = useQuery(api.dossier.getFocusState, { briefId })   │    │
│  │   const annotations = useQuery(api.dossier.getAnnotations, { briefId }) │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                              ↓                                                   │
│  ┌──────────────────┐              ┌─────────────────────────────┐              │
│  │ ScrollytellingLayout           │ StickyDashboard/Chart       │              │
│  │  └─ InteractiveSpan            │  └─ EnhancedLineChart       │              │
│  │     └─ onClick: callAgent()    │     └─ highlights from sub  │              │
│  └──────────────────┘              └─────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Event Flow (Agent-Orchestrated)

```
User hovers "Q3 spike" text
        │
        ↓
InteractiveSpan.onHover()
        │
        ↓
useMutation(api.agents.dossierInteraction.handleFocusEvent)
        │
        ↓
DossierInteractionAgent receives task
        │
        ├─► Tool: getChartContext() → gets current chart data
        │
        ├─► Tool: updateFocusState({ dataIndex: 3, source: 'text' })
        │         └─► mutation: updates dossierFocusState table
        │
        └─► Tool: generateAnnotation({ dataIndex: 3 }) (if none exists)
                  └─► mutation: inserts into dossierAnnotations table
        │
        ↓
Convex subscription triggers
        │
        ↓
FocusSyncContext receives new state
        │
        ↓
EnhancedLineChart highlights point 3 + shows annotation
```

---

## Phase 0: Agent Infrastructure (HIGHEST PRIORITY)

> **Philosophy**: The agent orchestrates state changes via tools and subagent delegation.
> React is a subscriber, not the source of truth.

### 0.1 DossierInteractionAgent (New Subagent)

**Location**: `convex/domains/agents/core/subagents/dossier_subagent/`

Following the existing subagent pattern from `document_subagent/`, `media_subagent/`, etc:

```
convex/domains/agents/core/subagents/dossier_subagent/
├── README.md
├── dossierAgent.ts              # Agent definition
├── tools/
│   ├── index.ts                 # Barrel export
│   ├── getChartContext.ts       # Read current chart state
│   ├── generateAnnotation.ts    # Create annotation for data point
│   ├── enrichDataPoint.ts       # Fetch more context via LinkUp/SEC
│   ├── updateFocusState.ts      # Mutate focus state in Convex
│   └── updateNarrativeSection.ts # Update brief section with deictic text
```

### 0.2 Tool Definitions

**File**: `convex/domains/agents/core/subagents/dossier_subagent/tools/getChartContext.ts`

```typescript
import { createTool } from "@convex-dev/agent";
import { z } from "zod";

export const getChartContext = createTool({
  description: `Get the current chart context for a dossier, including data points,
    current act, and existing annotations. Use this FIRST to understand what the
    user is looking at before making updates.`,
  args: z.object({
    briefId: z.string().describe("ID of the dailyBriefMemory"),
    seriesId: z.string().optional().describe("Specific series to focus on"),
  }),
  async handler(ctx, args) {
    const brief = await ctx.runQuery(internal.domains.research.executiveBrief.getBriefContext, {
      briefId: args.briefId,
    });
    return JSON.stringify({
      currentAct: brief.currentAct,
      dataPoints: brief.vizArtifact?.data ?? [],
      existingAnnotations: brief.annotations ?? [],
      focusState: brief.focusState,
    });
  },
});
```

**File**: `convex/domains/agents/core/subagents/dossier_subagent/tools/updateFocusState.ts`

```typescript
import { createTool } from "@convex-dev/agent";
import { z } from "zod";

export const updateFocusState = createTool({
  description: `Update the focus state for a dossier. This causes React subscribers
    to highlight the corresponding chart point or text span. Use this when the user
    hovers or clicks on an element, or when you want to direct their attention.`,
  args: z.object({
    briefId: z.string().describe("ID of the dailyBriefMemory"),
    focusedDataIndex: z.number().nullable().describe("Data point index to highlight"),
    hoveredSpanId: z.string().nullable().describe("Text span ID to highlight"),
    source: z.enum(["text", "chart", "agent"]).describe("What triggered the focus change"),
  }),
  async handler(ctx, args) {
    await ctx.runMutation(internal.domains.dossier.focusState.updateFocus, {
      briefId: args.briefId,
      focusedDataIndex: args.focusedDataIndex,
      hoveredSpanId: args.hoveredSpanId,
      source: args.source,
      updatedAt: Date.now(),
    });
    return JSON.stringify({ success: true, message: `Focus updated to dataIndex: ${args.focusedDataIndex}` });
  },
});
```

**File**: `convex/domains/agents/core/subagents/dossier_subagent/tools/generateAnnotation.ts`

```typescript
import { createTool } from "@convex-dev/agent";
import { z } from "zod";

export const generateAnnotation = createTool({
  description: `Generate and save an annotation for a specific data point on the chart.
    The annotation will be displayed as a "director's commentary" callout on the chart.
    Use this when a data point needs explanation or when the user asks about it.`,
  args: z.object({
    briefId: z.string().describe("ID of the dailyBriefMemory"),
    dataIndex: z.number().describe("Data point index to annotate"),
    text: z.string().describe("Short annotation text (max 50 chars)"),
    position: z.enum(["above", "below", "left", "right"]).default("above"),
    icon: z.enum(["arrow-up", "arrow-down", "star", "alert"]).optional(),
    visibleInActs: z.array(z.enum(["actI", "actII", "actIII"])).default(["actI", "actII", "actIII"]),
  }),
  async handler(ctx, args) {
    const annotationId = await ctx.runMutation(internal.domains.dossier.annotations.addAnnotation, {
      briefId: args.briefId,
      dataIndex: args.dataIndex,
      text: args.text,
      position: args.position,
      icon: args.icon,
      visibleInActs: args.visibleInActs,
    });
    return JSON.stringify({
      success: true,
      annotationId,
      message: `Annotation added: "${args.text}" at dataIndex ${args.dataIndex}`
    });
  },
});
```

**File**: `convex/domains/agents/core/subagents/dossier_subagent/tools/enrichDataPoint.ts`

```typescript
import { createTool } from "@convex-dev/agent";
import { z } from "zod";

export const enrichDataPoint = createTool({
  description: `Fetch additional context for a specific data point using LinkUp, SEC,
    or other research tools. Stores the enrichment in the brief and optionally
    generates an annotation. Use this when the user clicks on a point or asks for details.`,
  args: z.object({
    briefId: z.string().describe("ID of the dailyBriefMemory"),
    dataIndex: z.number().describe("Data point index to enrich"),
    query: z.string().describe("What to research about this data point"),
    sources: z.array(z.enum(["linkup", "sec", "youtube"])).default(["linkup"]),
    generateAnnotation: z.boolean().default(true).describe("Auto-generate annotation from findings"),
  }),
  async handler(ctx, args) {
    // Use existing research tools
    const results = await ctx.runAction(internal.tools.media.linkupSearch.execute, {
      query: args.query,
      limit: 3,
    });

    // Store enrichment
    await ctx.runMutation(internal.domains.dossier.enrichment.addEnrichment, {
      briefId: args.briefId,
      dataIndex: args.dataIndex,
      query: args.query,
      results: results,
      enrichedAt: Date.now(),
    });

    return JSON.stringify({
      success: true,
      resultCount: results.length,
      summary: results.slice(0, 2).map((r: any) => r.title).join(", "),
    });
  },
});
```

### 0.3 DossierInteractionAgent Definition

**File**: `convex/domains/agents/core/subagents/dossier_subagent/dossierAgent.ts`

```typescript
import { Agent, createTool, stepCountIs } from "@convex-dev/agent";
import { components } from "../../../../../_generated/api";
import { getLanguageModelSafe } from "../../../mcp_tools/models";

// Import tools
import { getChartContext } from "./tools/getChartContext";
import { updateFocusState } from "./tools/updateFocusState";
import { generateAnnotation } from "./tools/generateAnnotation";
import { enrichDataPoint } from "./tools/enrichDataPoint";
import { updateNarrativeSection } from "./tools/updateNarrativeSection";

/**
 * DossierInteractionAgent - Handles real-time dossier/chart interactions
 *
 * Responsibilities:
 * - Update focus state (which chart point / text span is highlighted)
 * - Generate annotations for data points
 * - Enrich data points with additional context
 * - Update narrative sections with deictic (chart-referential) text
 */
export function createDossierInteractionAgent(model: string): Agent {
  const tools = {
    getChartContext,
    updateFocusState,
    generateAnnotation,
    enrichDataPoint,
    updateNarrativeSection,
  };

  return new Agent(components.agent, {
    name: "DossierInteractionAgent",
    languageModel: getLanguageModelSafe(model),
    tools,
    stopWhen: stepCountIs(10),
    instructions: `You are the DossierInteractionAgent, responsible for managing
real-time interactions with the Morning Dossier and its charts.

## Your Responsibilities

1. **Focus Management**: When users hover or click on text/chart elements, update
   the focus state so the UI highlights the corresponding elements bidirectionally.

2. **Annotation Generation**: Create concise, insightful annotations for chart data
   points. Annotations should be:
   - Short (max 50 characters)
   - Insightful (not just restating the data)
   - Chart-referential ("notice the spike...", "this dip marks...")

3. **Data Point Enrichment**: When users want more details about a specific point,
   fetch context from LinkUp, SEC, or other sources and summarize it.

4. **Deictic Writing**: When updating narrative sections, use chart-referential
   language that explicitly connects text to visual elements.

## Tool Usage Order

For hover events:
1. getChartContext() - understand current state
2. updateFocusState() - highlight the element

For click/detail requests:
1. getChartContext() - understand current state
2. enrichDataPoint() - fetch more context
3. generateAnnotation() - add insight to chart (if useful)
4. updateFocusState() - highlight the element

## Deictic Writing Guidelines

WRONG: "Funding increased in Q3."
RIGHT: "Notice the sharp spike in Q3 (dataIndex: 3) marking the Series B."

WRONG: "The trend reversed."
RIGHT: "The line bends downward after the Dec announcement (dataIndex: 7)."
`,
  });
}
```

### 0.4 Coordinator Delegation Tool

**File**: `convex/domains/agents/core/delegation/delegationTools.ts` (EXTEND)

Add to the `buildDelegationTools` function:

```typescript
import { createDossierInteractionAgent } from "../subagents/dossier_subagent/dossierAgent";

// Inside buildDelegationTools():
const dossierAgent = createDossierInteractionAgent(model);

const delegateToDossierAgent: DelegationTool = createTool({
  description: `Delegate dossier/chart interaction tasks to the DossierInteractionAgent.

Use this tool when:
- User hovers or clicks on chart elements
- User asks "what happened here?" about a data point
- User asks for more detail about a specific moment in the chart
- User wants to understand a spike, dip, or trend
- You need to highlight or annotate chart elements

The agent can:
- Update focus state (highlight chart points / text spans)
- Generate annotations ("director's commentary")
- Enrich data points with additional research
- Update narrative text with chart-referential language`,
  args: z.object({
    briefId: z.string().describe("ID of the dailyBriefMemory"),
    query: z.string().describe("What the user wants to know or do"),
    dataIndex: z.number().optional().describe("Specific data point if known"),
    interactionType: z.enum(["hover", "click", "question", "enrich"]).describe("Type of interaction"),
  }),
  async handler(ctx, args) {
    const nextDepth = enforceSafety(ctx);
    const { prompt, temporalContext } = buildDelegationPrompt(args.query, ctx.temporalContext);

    const threadId = await ensureThreadHelper(ctx, dossierAgent);

    const fullPrompt = `
Brief ID: ${args.briefId}
Interaction: ${args.interactionType}
${args.dataIndex !== undefined ? `Data Index: ${args.dataIndex}` : ''}
User Query: ${prompt}
`;

    const result = await runWithTimeout(
      dossierAgent.run(ctx, {
        threadId,
        prompt: fullPrompt,
        context: { depth: nextDepth, temporalContext },
      }),
      60000
    );

    return formatResult("DossierInteractionAgent", result, extractTools(result));
  },
});

// Add to return object:
return {
  // ... existing delegation tools
  delegateToDossierAgent,
};
```

### 0.5 Convex Tables for Focus State

**File**: `convex/domains/dossier/schema.ts` (NEW)

```typescript
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const dossierTables = {
  // Focus state for bidirectional highlighting
  dossierFocusState: defineTable({
    briefId: v.id("dailyBriefMemories"),
    focusedDataIndex: v.optional(v.number()),
    hoveredSpanId: v.optional(v.string()),
    source: v.union(v.literal("text"), v.literal("chart"), v.literal("agent")),
    updatedAt: v.number(),
  }).index("by_brief", ["briefId"]),

  // Agent-generated annotations
  dossierAnnotations: defineTable({
    briefId: v.id("dailyBriefMemories"),
    dataIndex: v.number(),
    text: v.string(),
    position: v.union(
      v.literal("above"),
      v.literal("below"),
      v.literal("left"),
      v.literal("right")
    ),
    icon: v.optional(v.string()),
    visibleInActs: v.array(v.string()),
    createdAt: v.number(),
    generatedBy: v.union(v.literal("agent"), v.literal("structured_output")),
  }).index("by_brief", ["briefId"]),

  // Enrichment cache for data points
  dossierEnrichment: defineTable({
    briefId: v.id("dailyBriefMemories"),
    dataIndex: v.number(),
    query: v.string(),
    results: v.any(),
    enrichedAt: v.number(),
  }).index("by_brief_point", ["briefId", "dataIndex"]),
};
```

### 0.6 Convex Mutations for State Updates

**File**: `convex/domains/dossier/focusState.ts` (NEW)

```typescript
import { mutation, query } from "../../_generated/server";
import { v } from "convex/values";

export const updateFocus = mutation({
  args: {
    briefId: v.id("dailyBriefMemories"),
    focusedDataIndex: v.optional(v.number()),
    hoveredSpanId: v.optional(v.string()),
    source: v.union(v.literal("text"), v.literal("chart"), v.literal("agent")),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dossierFocusState")
      .withIndex("by_brief", (q) => q.eq("briefId", args.briefId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        focusedDataIndex: args.focusedDataIndex,
        hoveredSpanId: args.hoveredSpanId,
        source: args.source,
        updatedAt: args.updatedAt,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("dossierFocusState", args);
    }
  },
});

export const getFocusState = query({
  args: { briefId: v.id("dailyBriefMemories") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("dossierFocusState")
      .withIndex("by_brief", (q) => q.eq("briefId", args.briefId))
      .first();
  },
});

export const clearFocus = mutation({
  args: { briefId: v.id("dailyBriefMemories") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dossierFocusState")
      .withIndex("by_brief", (q) => q.eq("briefId", args.briefId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        focusedDataIndex: undefined,
        hoveredSpanId: undefined,
        source: "agent",
        updatedAt: Date.now(),
      });
    }
  },
});
```

---

## Phase 1: React Subscription Layer

> **Key Insight**: FocusSyncContext now SUBSCRIBES to Convex, it doesn't manage local state.

### 1.1 FocusSyncContext (Subscription-Based)

**File**: `src/features/research/contexts/FocusSyncContext.tsx`

```typescript
import { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface FocusSyncState {
  // From Convex subscription
  focusedDataIndex: number | null;
  hoveredSpanId: string | null;
  source: "text" | "chart" | "agent" | null;

  // Annotations from subscription
  annotations: DossierAnnotation[];

  // Local UI state (not persisted)
  currentAct: "actI" | "actII" | "actIII";
  isAgentProcessing: boolean;
}

interface FocusSyncActions {
  // These call agent/mutations, not local state
  onSpanHover: (spanId: string, dataIndex?: number) => Promise<void>;
  onSpanClick: (spanId: string, dataIndex?: number) => Promise<void>;
  onSpanLeave: () => Promise<void>;

  onChartPointHover: (index: number, seriesId: string) => Promise<void>;
  onChartPointClick: (index: number, seriesId: string) => Promise<void>;
  onChartLeave: () => Promise<void>;

  // Agent-powered actions
  askAboutPoint: (dataIndex: number, question?: string) => Promise<void>;

  // Local-only
  setCurrentAct: (act: "actI" | "actII" | "actIII") => void;
}

export function FocusSyncProvider({ briefId, children }: {
  briefId: Id<"dailyBriefMemories">;
  children: React.ReactNode;
}) {
  // SUBSCRIBE to Convex state
  const focusState = useQuery(api.domains.dossier.focusState.getFocusState, { briefId });
  const annotations = useQuery(api.domains.dossier.annotations.getAnnotations, { briefId });

  // Mutations that trigger agent
  const triggerFocusEvent = useMutation(api.agents.dossierInteraction.handleFocusEvent);
  const triggerEnrichment = useMutation(api.agents.dossierInteraction.handleEnrichRequest);

  const onSpanHover = useCallback(async (spanId: string, dataIndex?: number) => {
    await triggerFocusEvent({
      briefId,
      interactionType: "hover",
      hoveredSpanId: spanId,
      dataIndex,
      source: "text",
    });
  }, [briefId, triggerFocusEvent]);

  const askAboutPoint = useCallback(async (dataIndex: number, question?: string) => {
    await triggerEnrichment({
      briefId,
      dataIndex,
      query: question ?? `Tell me more about what happened at this point`,
    });
  }, [briefId, triggerEnrichment]);

  // ... other handlers

  const state: FocusSyncState = useMemo(() => ({
    focusedDataIndex: focusState?.focusedDataIndex ?? null,
    hoveredSpanId: focusState?.hoveredSpanId ?? null,
    source: focusState?.source ?? null,
    annotations: annotations ?? [],
    currentAct: "actI", // TODO: derive from scroll position
    isAgentProcessing: false, // TODO: track agent status
  }), [focusState, annotations]);

  // ... return provider
}
```

### 1.2 EnhancedLineChart Integration

**File**: `src/features/research/components/EnhancedLineChart.tsx` (MODIFY)

```typescript
// Add FocusSyncContext consumption
import { useFocusSync } from "../contexts/FocusSyncContext";

function EnhancedLineChart({ ... }) {
  const {
    focusedDataIndex,
    annotations,
    onChartPointHover,
    onChartPointClick,
    askAboutPoint,
  } = useFocusSync();

  // Highlight point from subscription
  const highlightedIndex = focusedDataIndex;

  // Render annotations from subscription
  return (
    <svg>
      {/* ... existing chart elements ... */}

      {/* Agent-generated annotations */}
      <ChartAnnotationLayer
        annotations={annotations}
        currentAct={currentAct}
        getPointPosition={getPointPosition}
      />

      {/* Points with agent-powered click handler */}
      {dataPoints.map((point, index) => (
        <circle
          key={index}
          cx={xScale(index)}
          cy={yScale(point.value)}
          r={highlightedIndex === index ? 8 : 4}
          className={highlightedIndex === index ? "ring-2 ring-blue-500" : ""}
          onMouseEnter={() => onChartPointHover(index, seriesId)}
          onClick={() => askAboutPoint(index)}
        />
      ))}
    </svg>
  );
}
```

---

## Phase 2: UI Trigger Components

### 2.1 InteractiveSpan (Agent-Triggering)

**File**: `src/features/research/components/scrolly/InteractiveSpan.tsx`

```typescript
import { useFocusSync } from "../../contexts/FocusSyncContext";

interface InteractiveSpanProps {
  children: React.ReactNode;
  spanId: string;
  dataIndex?: number;
  evidenceId?: string;
}

export function InteractiveSpan({ children, spanId, dataIndex, evidenceId }: InteractiveSpanProps) {
  const { onSpanHover, onSpanClick, onSpanLeave, focusedDataIndex } = useFocusSync();

  const isHighlighted = dataIndex !== undefined && focusedDataIndex === dataIndex;

  return (
    <span
      className={cn(
        "cursor-pointer transition-all duration-200",
        "underline decoration-dotted underline-offset-2",
        isHighlighted && "bg-blue-100 dark:bg-blue-900/30 decoration-solid"
      )}
      onMouseEnter={() => onSpanHover(spanId, dataIndex)}
      onMouseLeave={() => onSpanLeave()}
      onClick={() => onSpanClick(spanId, dataIndex)}
    >
      {children}
    </span>
  );
}
```

---

## Phase 3: Structured Output (Lower Priority)

> **Note**: Structured output is still useful for pre-generation at brief creation time,
> but it's supplementary to the agent-orchestrated approach.

### 3.1 Deictic Writing Prompts (for Brief Generation)

**File**: `src/features/research/prompts/deicticWritingConstraints.ts` (NEW)

```typescript
export const DEICTIC_WRITING_PROMPT = `
## DEICTIC WRITING STYLE (Chart-Referential)

When writing synthesis, EXPLICITLY REFERENCE the visual shape of the chart:

- WRONG: "Funding increased in Q3."
- RIGHT: "Notice the **sharp vertical spike** in Q3 (shown right) marking when..."

- WRONG: "The trend reversed after the announcement."
- RIGHT: "The line **bends downward** following the Dec 3 announcement..."

Key visual vocabulary:
- "spike", "drop", "plateau", "inflection point", "crossover"
- "the steep rise on the left", "the flat period in the middle"
- "as you can see in the chart", "notice how the line..."

When mentioning specific data points, wrap the key phrase with metadata tokens:
[[entity phrase|dataIndex:N]]

Example:
"The [[Cloudflare Outage|dataIndex:3]] caused a temporary dip,
visible as the sharp drop before recovery."
`;
```

### 3.2 Token Parser for Rendering

**File**: `src/features/research/components/scrolly/InteractiveSpanParser.tsx`

```typescript
// Parse [[entity|dataIndex:N]] tokens into InteractiveSpan components
export function parseInteractiveTokens(
  text: string,
  options?: { signalId?: string }
): React.ReactNode[] {
  const regex = /\[\[([^|]+)\|dataIndex:(\d+)\]\]/g;
  // Returns array of string | InteractiveSpan elements
}
```

---

## Phase 3: Chart Annotations Layer

### 3.1 ChartAnnotation Component

**File**: `src/features/research/components/scrolly/ChartAnnotation.tsx`

```typescript
interface ChartAnnotation {
  id: string;
  dataIndex: number;                    // Which point to annotate
  text: string;                         // Annotation label
  position: 'above' | 'below' | 'left' | 'right';
  icon?: 'arrow-down' | 'arrow-up' | 'star' | 'alert';
  visibleInActs: ('actI' | 'actII' | 'actIII')[];
}

interface ChartAnnotationLayerProps {
  annotations: ChartAnnotation[];
  currentAct: 'actI' | 'actII' | 'actIII';
  chartDimensions: { width: number; height: number };
  getPointPosition: (index: number) => { x: number; y: number };
}
```

**Visual Style**:
- Different font (handwriting/italic) from axis labels
- Fade in/out based on `visibleInActs` and `currentAct`
- Arrow or line connecting to data point

### 3.2 Schema Extension for Annotations

**File**: `src/features/research/types/dailyBriefSchema.ts` (EXTEND)

```typescript
// Add to DailyBriefDashboard interface:
export interface DashboardAnnotation {
  id: string;
  dataIndex: number;
  text: string;
  position: 'above' | 'below' | 'left' | 'right';
  icon?: string;
  visibleInActs: ('actI' | 'actII' | 'actIII')[];
}

export interface DailyBriefDashboard {
  vizArtifact?: VizArtifact;
  sourceBreakdown?: Record<string, number>;
  trendingTags?: string[];
  annotations?: DashboardAnnotation[];  // NEW
}
```

---

## Phase 4: Fast Agent Panel Integration

> **Goal**: Bidirectional sync between dossier view and Fast Agent Panel, allowing the agent to update dossier state from within the panel.

### 4.1 Extend AgentOpenOptions for Dossier Context

**File**: `src/features/agents/context/FastAgentContext.tsx` (EXTEND)

```typescript
/** NEW: Dossier/chart context for agent interactions */
export interface DossierContext {
  /** The brief/memory ID being viewed */
  briefId?: string;
  /** Current act (actI, actII, actIII) */
  currentAct?: 'actI' | 'actII' | 'actIII';
  /** Focused data point index (if hovering chart) */
  focusedDataIndex?: number;
  /** Chart series context (for annotations) */
  chartContext?: {
    seriesId: string;
    seriesTitle: string;
    dataPoints: { index: number; value: number; label?: string }[];
  };
  /** Currently visible section ID (for scrolly) */
  activeSectionId?: string;
}

/** Options for opening the agent with context */
export interface AgentOpenOptions {
  requestId?: string;
  initialMessage?: string;
  contextDocumentIds?: string[];
  contextWebUrls?: string[];
  contextTitle?: string;
  /** NEW: Dossier interaction context */
  dossierContext?: DossierContext;
}
```

### 4.2 Dossier-Aware Fast Agent Panel

**File**: `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx` (EXTEND)

When opened with dossierContext, the panel:
1. Displays a "Dossier Mode" indicator
2. Passes dossier context to the agent via message prefix
3. Subscribes to focus state changes to update UI

```typescript
// Inside FastAgentPanel component
const { options } = useFastAgent();
const dossierContext = options?.dossierContext;

// If in dossier mode, subscribe to focus state
const focusState = useQuery(
  dossierContext?.briefId
    ? api.domains.dossier.focusState.getFocusState
    : skipToken,
  dossierContext?.briefId
    ? { briefId: dossierContext.briefId }
    : undefined
);

// Build context prefix for agent
const buildDossierContextPrefix = useCallback(() => {
  if (!dossierContext) return '';

  return `[DOSSIER CONTEXT]
Brief ID: ${dossierContext.briefId}
Current Act: ${dossierContext.currentAct || 'actI'}
Focused Data Index: ${dossierContext.focusedDataIndex ?? 'none'}
Active Section: ${dossierContext.activeSectionId || 'none'}
Chart: ${dossierContext.chartContext?.seriesTitle || 'none'}

You have access to dossier tools:
- updateFocusState: Highlight a data point on the chart
- generateAnnotation: Create an annotation for a data point
- enrichDataPoint: Get more context for a data point
- updateNarrativeSection: Update the narrative text

[END DOSSIER CONTEXT]

`;
}, [dossierContext]);
```

### 4.3 Open Fast Agent from Dossier View

**Usage in WelcomeLanding.tsx or ScrollytellingLayout.tsx**:

```typescript
const { openWithContext } = useFastAgent();

// Open panel when clicking a chart point
const handleChartPointClick = (dataIndex: number, seriesId: string) => {
  openWithContext({
    initialMessage: `Tell me more about this data point`,
    contextTitle: `${chartTitle} - Point ${dataIndex}`,
    dossierContext: {
      briefId: memory._id,
      currentAct,
      focusedDataIndex: dataIndex,
      chartContext: {
        seriesId,
        seriesTitle: chartTitle,
        dataPoints: chartData.slice(Math.max(0, dataIndex - 2), dataIndex + 3),
      },
      activeSectionId: currentSectionId,
    },
  });
};

// Open panel when clicking "Ask AI" on a section
const handleAskAI = (sectionId: string, sectionContent: string) => {
  openWithContext({
    initialMessage: `Explain this section in more detail`,
    contextTitle: `Section: ${sectionId}`,
    dossierContext: {
      briefId: memory._id,
      currentAct,
      activeSectionId: sectionId,
    },
  });
};
```

### 4.4 Agent Updates Dossier in Real-Time

When the agent calls dossier tools, the dossier view updates via Convex subscription:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│   Dossier View (WelcomeLanding)              Fast Agent Panel                      │
│   ┌─────────────────────────────┐           ┌─────────────────────────────┐        │
│   │                             │           │                             │        │
│   │  ScrollytellingLayout       │           │  User: "Highlight point 5"  │        │
│   │  ┌───────────────────────┐  │           │                             │        │
│   │  │ EnhancedLineChart     │  │           │  Agent: Calling tool...     │        │
│   │  │  ┌─ Point 5 (🔵)     │  │ ◄─────────│  updateFocusState({         │        │
│   │  │  │   highlighted!    │  │  Subscribe │    briefId, dataIndex: 5   │        │
│   │  │  └───────────────────│  │           │  })                         │        │
│   │  └───────────────────────┘  │           │                             │        │
│   │                             │           │  ✓ Point 5 now highlighted  │        │
│   └─────────────────────────────┘           └─────────────────────────────┘        │
│             │                                           │                          │
│             │ useQuery(focusState)                      │ agent tool call          │
│             ▼                                           ▼                          │
│   ┌─────────────────────────────────────────────────────────────────────┐          │
│   │                         Convex (dossierFocusState)                  │          │
│   │         { briefId: "...", focusedDataIndex: 5, hoveredSpanId: null }│          │
│   └─────────────────────────────────────────────────────────────────────┘          │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.5 Bidirectional Focus Sync

Both components subscribe to the same Convex state:

**Dossier View → Fast Agent Panel**:
- User hovers on text span → triggers agent (optional) → updates focusState
- Fast Agent Panel shows: "Currently viewing: [entity name] at point 5"

**Fast Agent Panel → Dossier View**:
- User asks: "Highlight the spike in Q3" → agent calls updateFocusState
- Dossier view chart immediately highlights the corresponding point

**Shared Context via FocusSyncContext**:

```typescript
// Both components use the same context
const { focusedDataIndex, activeAnnotations } = useFocusSync();

// Dossier view uses it for highlighting
<EnhancedLineChart
  highlightedIndex={focusedDataIndex}
  annotations={activeAnnotations}
/>

// Fast Agent Panel uses it for context display
{focusedDataIndex !== null && (
  <Badge>Focused: Point {focusedDataIndex}</Badge>
)}
```

### 4.6 Dossier Mode UI Enhancements

**File**: `src/features/agents/components/FastAgentPanel/DossierModeIndicator.tsx` (NEW)

```typescript
/**
 * Visual indicator when Fast Agent Panel is in dossier mode
 * Shows current context and provides quick actions
 */
export function DossierModeIndicator({ dossierContext }: { dossierContext: DossierContext }) {
  return (
    <div className="px-3 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2">
      <Badge variant="outline" className="bg-blue-100 text-blue-700">
        <LayoutDashboard className="w-3 h-3 mr-1" />
        Dossier Mode
      </Badge>

      <span className="text-xs text-blue-600">
        Act {dossierContext.currentAct?.replace('act', '')}
        {dossierContext.focusedDataIndex !== undefined && (
          <> • Point {dossierContext.focusedDataIndex}</>
        )}
      </span>

      <div className="ml-auto flex gap-1">
        <Button size="xs" variant="ghost" title="Add annotation">
          <MessageSquarePlus className="w-3 h-3" />
        </Button>
        <Button size="xs" variant="ghost" title="Enrich data">
          <Sparkles className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}
```

---

## Phase 5: Smooth Scale Transitions

### 5.1 Animated Domain Transitions in EnhancedLineChart

**File**: `src/features/research/components/EnhancedLineChart.tsx` (MODIFY)

Add `framer-motion` animate for Y-axis domain changes:

```typescript
// Track previous domain for animation
const [animatedDomain, setAnimatedDomain] = useState({ min: minY, max: maxY });

useEffect(() => {
  // Animate domain changes over 600ms
  const controls = animate(animatedDomain.min, minY, {
    duration: 0.6,
    onUpdate: (v) => setAnimatedDomain(d => ({ ...d, min: v }))
  });
  // ... similar for max
}, [minY, maxY]);
```

### 4.2 Line Morph Animation

When switching acts, the line should "morph" rather than jump:

```typescript
<motion.path
  d={historyPath}
  initial={{ pathLength: 0 }}
  animate={{
    pathLength: 1,
    d: historyPath  // Animate path changes
  }}
  transition={{
    duration: 0.8,
    ease: "easeInOut",
    d: { duration: 0.6, ease: "easeOut" }  // Separate timing for path morph
  }}
/>
```

---

## Phase 5: Timeline Scrubber & Act Progress

### 5.1 TimelineScrubber Component

**File**: `src/features/research/components/scrolly/TimelineScrubber.tsx`

A sticky strip showing temporal context:

```typescript
interface TimelineScrubberProps {
  currentAct: 'actI' | 'actII' | 'actIII';
  timeLabels: { act: string; label: string; isActive: boolean }[];
  presentIndex?: number;  // Where "now" is in the timeline
}
```

**Visual Design**:
```
┌─────────────────────────────────────────────────┐
│  ← PAST    ●───●───●━━━●━━━●───○───○   FUTURE → │
│            [Historical] [NOW]  [Projected]       │
└─────────────────────────────────────────────────┘
```

### 5.2 ActProgressIndicator

Shows which act user is viewing with subtle highlighting:

```typescript
interface ActProgressIndicatorProps {
  currentAct: 'actI' | 'actII' | 'actIII';
  onActClick?: (act: 'actI' | 'actII' | 'actIII') => void;
}
```

---

## Implementation Priority & Effort Matrix (REVISED)

> **Key Change**: Agent infrastructure is now P0 (highest priority), Fast Agent Panel integration is P1, UI polish is P2-P3.

| Phase | Feature | Effort | Impact | Priority | Type |
|-------|---------|--------|--------|----------|------|
| **0** | **DossierInteractionAgent (subagent)** | High | Critical | **P0** | Agent |
| **0** | **Dossier tools (focus, annotate, enrich)** | High | Critical | **P0** | Agent |
| **0** | **delegateToDossierAgent (delegation tool)** | Medium | Critical | **P0** | Agent |
| **0** | **Convex tables (focusState, annotations)** | Medium | Critical | **P0** | Backend |
| 1 | FocusSyncContext (subscription-based) | Medium | High | P1 | React |
| 1 | InteractiveSpan (agent-triggering) | Low | High | P1 | React |
| **1.5** | **DossierContext in AgentOpenOptions** | Low | High | **P1** | React |
| **1.5** | **DossierModeIndicator component** | Low | Medium | **P1** | React |
| **1.5** | **FastAgentPanel dossier mode** | Medium | High | **P1** | React |
| **1.5** | **Bidirectional focus sync hook** | Medium | High | **P1** | React |
| 2 | ChartAnnotationLayer | Medium | High | P1 | React |
| 2 | Token Parser | Low | Medium | P2 | React |
| 3 | Deictic Prompt Tuning (structured output) | Low | Medium | P2 | Prompt |
| 4 | Scale Transitions | Medium | Medium | P3 | React |
| 4 | Timeline Scrubber | Medium | Low | P3 | React |

---

## File Decomposition Plan

### Current Monolithic Files to Decompose

**`ScrollytellingLayout.tsx` (582 lines)** → Split into:
```
src/features/research/components/scrolly/
├── index.ts                           # Barrel export
├── ScrollytellingLayout.tsx           # Main orchestrator (reduced to ~150 lines)
├── SectionRenderer.tsx                # Individual section (extracted, ~80 lines)
├── InteractiveSpan.tsx                # NEW (agent-triggering)
├── InteractiveSpanParser.tsx          # NEW
├── useInView.ts                       # Extract hook (~30 lines)
├── useDashboardFallback.ts            # Extract fallback logic (~100 lines)
└── parseSmartLinks.ts                 # Extract parser (~30 lines)
```

**`EnhancedLineChart.tsx` (800 lines)** → Split into:
```
src/features/research/components/charts/
├── index.ts
├── EnhancedLineChart.tsx              # Main component (reduced to ~200 lines)
├── ChartHeader.tsx                    # Extracted (~50 lines)
├── ChartTooltip.tsx                   # Already exists, enhance
├── ChartAnnotationLayer.tsx           # NEW (subscribes to agent annotations)
├── ChartAnnotation.tsx                # NEW
├── useChartScales.ts                  # Extract scale computation (~60 lines)
├── useNearestPoint.ts                 # Extract Voronoi logic (~50 lines)
└── buildSmoothPath.ts                 # Extract path builder (~30 lines)
```

---

## Directory Structure After Implementation

```
convex/domains/
├── agents/
│   ├── core/
│   │   ├── subagents/
│   │   │   ├── dossier_subagent/              # NEW: Agent infrastructure
│   │   │   │   ├── README.md
│   │   │   │   ├── dossierAgent.ts            # DossierInteractionAgent
│   │   │   │   └── tools/
│   │   │   │       ├── index.ts
│   │   │   │       ├── getChartContext.ts
│   │   │   │       ├── generateAnnotation.ts
│   │   │   │       ├── enrichDataPoint.ts
│   │   │   │       ├── updateFocusState.ts
│   │   │   │       └── updateNarrativeSection.ts
│   │   │   └── (existing subagents)
│   │   └── delegation/
│   │       └── delegationTools.ts             # EXTEND: add delegateToDossierAgent
│   └── (existing files)
├── dossier/                                    # NEW: Dossier domain
│   ├── schema.ts                              # Tables: focusState, annotations, enrichment
│   ├── focusState.ts                          # Mutations/queries for focus
│   ├── annotations.ts                         # Mutations/queries for annotations
│   └── enrichment.ts                          # Mutations/queries for enrichment cache
└── research/
    └── (existing files unchanged)

src/features/research/
├── components/
│   ├── scrolly/                               # Decomposed scrolly components
│   │   ├── index.ts
│   │   ├── ScrollytellingLayout.tsx
│   │   ├── SectionRenderer.tsx
│   │   ├── InteractiveSpan.tsx                # Calls agent on hover/click
│   │   ├── InteractiveSpanParser.tsx
│   │   ├── TimelineScrubber.tsx
│   │   ├── ActProgressIndicator.tsx
│   │   ├── useInView.ts
│   │   ├── useDashboardFallback.ts
│   │   └── parseSmartLinks.ts
│   ├── charts/                                # Decomposed chart components
│   │   ├── index.ts
│   │   ├── EnhancedLineChart.tsx              # Subscribes to FocusSyncContext
│   │   ├── ChartHeader.tsx
│   │   ├── ChartAnnotation.tsx
│   │   ├── ChartAnnotationLayer.tsx           # Renders agent-generated annotations
│   │   ├── useChartScales.ts
│   │   ├── useNearestPoint.ts
│   │   └── buildSmoothPath.ts
│   └── (existing files unchanged)
├── contexts/
│   ├── EvidenceContext.tsx                    # Existing
│   └── FocusSyncContext.tsx                   # NEW (subscription-based)
├── prompts/
│   ├── briefConstraints.ts                    # Existing
│   └── deicticWritingConstraints.ts           # NEW (for structured output, lower priority)
├── types/
│   └── dailyBriefSchema.ts                    # Extended with annotations
└── utils/
    └── (existing files unchanged)

src/features/agents/
├── components/
│   └── FastAgentPanel/
│       ├── (existing files)
│       ├── DossierModeIndicator.tsx           # NEW: Dossier mode UI
│       └── hooks/
│           └── useDossierAgentSync.ts         # NEW: Bidirectional sync hook
├── context/
│   └── FastAgentContext.tsx                   # EXTEND: Add DossierContext interface
└── (existing files unchanged)
```

---

## Detailed Task Breakdown (REVISED - Agent First)

> **Last Updated**: 2025-12-16
> **Status**: Sprint 0-3 COMPLETE ✅ (Full UI/UX Integration Verified)

### Sprint 0: Agent Infrastructure (P0 - HIGHEST PRIORITY) ✅ COMPLETE

> **Goal**: Establish the agent's ability to orchestrate dossier state changes.

#### Task 0.1: Create Convex Tables ✅
- [x] Create `convex/domains/dossier/schema.ts`
  - [x] `dossierFocusState` table
  - [x] `dossierAnnotations` table
  - [x] `dossierEnrichment` table
- [x] Add to main schema.ts
- [x] Run `npx convex dev` to generate types

#### Task 0.2: Create Convex Mutations/Queries ✅
- [x] Create `convex/domains/dossier/focusState.ts`
  - [x] `updateFocus` mutation
  - [x] `getFocusState` query
  - [x] `clearFocus` mutation
- [x] Create `convex/domains/dossier/annotations.ts`
  - [x] `addAnnotation` mutation
  - [x] `getAnnotations` query
  - [x] `deleteAnnotation` mutation
- [x] Create `convex/domains/dossier/enrichment.ts`
  - [x] `addEnrichment` mutation
  - [x] `getEnrichment` query

#### Task 0.3: Create DossierInteractionAgent Tools ✅
- [x] Create `convex/domains/agents/core/subagents/dossier_subagent/`
- [x] Create `tools/getChartContext.ts`
- [x] Create `tools/updateFocusState.ts`
- [x] Create `tools/generateAnnotation.ts`
- [x] Create `tools/enrichDataPoint.ts`
- [x] Create `tools/updateNarrativeSection.ts`
- [x] Create `tools/index.ts` barrel export

#### Task 0.4: Create DossierInteractionAgent ✅
- [x] Create `dossierAgent.ts` following existing subagent patterns
- [x] Wire all tools
- [x] Add system instructions for deictic writing
- [x] Test agent can update Convex state

#### Task 0.5: Add Coordinator Delegation ✅
- [x] Add `delegateToDossierAgent` to `delegationTools.ts`
- [x] Follow existing delegation patterns
- [x] Test coordinator can delegate to DossierInteractionAgent

---

### Sprint 1: React Subscription Layer (P1) ✅ COMPLETE

> **Goal**: React subscribes to agent-managed state.

#### Task 1.1: Create FocusSyncContext (Subscription-Based) ✅
- [x] Create `src/features/research/contexts/FocusSyncContext.tsx`
- [x] Subscribe to `dossierFocusState` via `useQuery`
- [x] Subscribe to `dossierAnnotations` via `useQuery`
- [x] Expose actions that trigger agent (not local state)
- [x] Add to WelcomeLanding wrapper

#### Task 1.2: Create InteractiveSpan Component ✅
- [x] Create `src/features/research/components/InteractiveSpan.tsx`
- [x] Implement hover/click handlers that dispatch to FocusSyncContext
- [x] Add visual states (default, hovered, active)
- [x] Add CSS transitions for underline animation

#### Task 1.3: Create ChartAnnotationLayer ✅
- [x] Create `src/features/research/components/ChartAnnotationLayer.tsx`
- [x] Render annotations from Convex subscription
- [x] Position annotations relative to chart points
- [x] Fade based on currentAct

#### Task 1.4: Wire EnhancedLineChart to FocusSyncContext ✅
- [x] Add `onDataPointClick` prop to EnhancedLineChart
- [x] Export `ChartDataPointContext` interface
- [x] Highlight corresponding point when text is hovered
- [x] Dispatch `onChartPointHover` when chart point is hovered

### Sprint 1.5: Fast Agent Panel Integration (P1) ✅ COMPLETE

> **Goal**: Enable bidirectional communication between dossier view and Fast Agent Panel.

#### Task 1.5.1: Extend AgentOpenOptions ✅
- [x] Extend `AgentOpenOptions` in `FastAgentContext.tsx` with `DossierContext` interface
- [x] Add `briefId`, `currentAct`, `focusedDataIndex`, `chartContext`, `activeSectionId` fields
- [x] Update type exports

#### Task 1.5.2: Create DossierModeIndicator Component ✅
- [x] Create `src/features/agents/components/FastAgentPanel/DossierModeIndicator.tsx`
- [x] Show current act, focused point, active section
- [x] Add quick action buttons (Add Annotation, Enrich Data)
- [x] Style with blue/dossier theme

#### Task 1.5.3: Wire Dossier View to Open Panel ✅
- [x] Create `useDossierAgentHandlers` hook
- [x] Add `handleChartPointClick` in `WelcomeLanding.tsx`/`ScrollytellingLayout.tsx`
- [x] Open panel with chart context on point click
- [x] Add "Ask AI" button to scrolly sections
- [x] Pass current act and section context

#### Task 1.5.4: Add DossierModeIndicator to FastAgentPanel ✅
- [x] Add dossier context detection in `FastAgentPanel.tsx`
- [x] Render `DossierModeIndicator` when `dossierContext` present

---

### Sprint 2: Component Integration (P1) ✅ COMPLETE

> **Goal**: Wire bidirectional focus components into actual views.

#### Task 2.1: Wire Chart Point Click Handler ✅
- [x] Add `onDataPointClick` prop passthrough in `StickyDashboard.tsx`
- [x] Add `onDataPointClick` prop passthrough in `ActAwareDashboard.tsx`
- [x] Add `onDataPointClick` prop passthrough in `LiveDashboard.tsx`
- [x] Add `onChartPointClick` prop in `ScrollytellingLayout.tsx`
- [x] Wire handler in `WelcomeLanding.tsx` to call `runWithFastAgent`

#### Task 2.2: Wire Ask AI Button ✅
- [x] Add `onAskAI` prop to `ScrollytellingLayout.tsx`
- [x] Add "Ask AI" button to each section with Sparkles icon
- [x] Wire handler in `WelcomeLanding.tsx` to call `runWithFastAgent`

#### Task 2.3: Wire DossierViewer ✅
- [x] Add `FocusSyncProvider` wrapper to `DossierViewer.tsx`
- [x] Add `useDossierAgentHandlers` hook
- [x] Add "Ask AI" button in header with Sparkles icon
- [x] Wire `handleDossierAnalysis` handler

---

### Sprint 3: Token Parser & Polish (P2) - IN PROGRESS

#### Task 3.1: Token Parser
- [x] Create `InteractiveSpanParser.tsx`
- [x] Parse `[[entity|dataIndex:N]]` tokens
- [x] Integrate into SectionRenderer

#### Task 3.2: Smooth Scale Transitions
	- [x] Add animated domain to EnhancedLineChart
	- [x] Implement path morphing with framer-motion

#### Task 3.3: Timeline Scrubber
- [x] Create `TimelineScrubber.tsx`
- [x] Position sticky in right rail
- [x] Wire to currentAct and active section index

#### Task 3.4: Act Progress Indicator
- [x] Create `ActProgressIndicator.tsx`
- [x] Integrate with TimelineScrubber for act-level navigation

---

### Sprint 3: Polish & Transitions (P2) ✅ COMPLETE

#### Task 3.1: Smooth Scale Transitions
	- [x] Add animated domain to EnhancedLineChart
	- [x] Implement path morphing with framer-motion

#### Task 3.2: Timeline Scrubber
- [x] Create `TimelineScrubber.tsx`
- [x] Position sticky in right rail
- [x] Wire to currentAct

#### Task 3.3: Act Progress Indicator
- [x] Create `ActProgressIndicator.tsx`
- [x] Add to TimelineScrubber or separate

---

## Testing Strategy (Agent-First)

### Agent Integration Tests (HIGHEST PRIORITY)
- [ ] DossierInteractionAgent can call `updateFocusState` tool
- [ ] DossierInteractionAgent can call `generateAnnotation` tool
- [ ] DossierInteractionAgent can call `enrichDataPoint` tool
- [ ] Coordinator can delegate to DossierInteractionAgent
- [ ] Tool calls result in Convex state mutations
- [ ] Convex subscriptions receive updates after tool calls

### Convex Tests
- [ ] `dossierFocusState` table updates correctly
- [ ] `dossierAnnotations` table inserts/queries work
- [ ] `dossierEnrichment` caching works

### React Integration Tests (Playwright)
- [ ] Hover text → agent called → Convex updated → chart highlights
- [ ] Click chart → agent enriches → annotation appears
- [ ] Agent-generated annotations render correctly
- [ ] Act change → agent-filtered annotations fade

### End-to-End Flow Tests
```
Test: "Bidirectional Focus via Agent"
1. Load dossier page
2. Hover on text span with dataIndex:3
3. Assert: Agent's updateFocusState tool was called
4. Assert: dossierFocusState.focusedDataIndex === 3
5. Assert: Chart point 3 is visually highlighted
```

### Visual Regression
- [ ] Screenshot annotations in each act
- [ ] Screenshot hover states
- [ ] Screenshot agent-generated annotations

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| **Agent response time** | N/A | **<500ms for focus updates** |
| **Agent annotation generation** | N/A | **<2s (cached: <50ms)** |
| Text→Chart latency (via agent) | N/A | <500ms |
| Chart→Text scroll (via agent) | N/A | <600ms |
| User engagement (time on page) | Baseline | +20% |

---

## Dependencies & Risks

### Dependencies
- **@convex-dev/agent** (already installed) - Core agent infrastructure
- **Existing subagent patterns** (document_subagent, media_subagent) - Reference implementation
- **Existing delegation patterns** (delegationTools.ts) - Reference implementation
- framer-motion (already installed)
- EvidenceContext (already exists)

### Risks
| Risk | Mitigation |
|------|------------|
| **Agent latency on hover** | Use optimistic UI updates + debounce hover events |
| **Agent tool errors** | Graceful fallback to local-only state (no highlight) |
| LLM token overhead for annotations | Cache in Convex, only generate once per point |
| Performance with many annotations | Limit visible annotations per act, virtualize |
| Parser regex edge cases | Comprehensive test suite, graceful fallback |

---

## Open Questions (UPDATED)

1. **Agent vs Optimistic Updates**: Should hover trigger agent immediately, or use local state with agent confirmation?
   - Recommendation: **Optimistic local state** + agent call. If agent confirms, persist. If agent fails, revert.
   - Implementation: FocusSyncContext maintains local optimistic state while waiting for Convex subscription.

2. **Annotation persistence**: Should generated annotations be saved to the brief record, or regenerated each time?
   - Recommendation: Save to `dossierAnnotations` table (separate from brief for faster queries)

3. **Mobile experience**: How do touch interactions differ from hover?
   - Recommendation: Use tap-to-focus instead of hover on mobile; agent still processes.

4. **Annotation limit**: How many annotations per chart before it gets cluttered?
   - Recommendation: Max 3 visible at once, prioritize by currentAct relevance (agent manages visibility)

5. **Agent context window**: How much chart/brief context to pass to agent for annotation generation?
   - Recommendation: Pass 5-point sliding window around data point + act context + brief summary

---

## Summary: Agent-First vs UI-First Approach

### Before (UI-First - OLD PLAN)
```
User hovers → React local state → Chart highlights (client-side only)
                                 ↳ No persistence, no agent intelligence
```

### After (Agent-First - NEW PLAN)
```
User hovers → React calls Agent → Agent uses tools → Convex mutation
                                                    ↓
                            React subscribes ←── Convex update
                                    ↓
                            Chart highlights (server-authoritative)
                                    +
                            Agent can enrich, annotate, learn
```

### Key Differences

| Aspect | UI-First (Old) | Agent-First (New) |
|--------|----------------|-------------------|
| State authority | React local | Convex (server) |
| Persistence | None | Full |
| Intelligence | None | Agent can enrich/annotate |
| Latency | <10ms | <500ms (acceptable for UX) |
| Complexity | Low | Higher (but follows existing patterns) |
| Learning | None | Agent can learn from interactions |

---

## Related Documentation

- [Morning Dossier Gap Analysis](../convex/domains/agents/MORNING_DOSSIER_GAP_ANALYSIS.md)
- [Daily Brief Schema](../src/features/research/types/dailyBriefSchema.ts)
- [Brief Constraints](../src/features/research/prompts/briefConstraints.ts)
- [Evidence Context](../src/features/research/contexts/EvidenceContext.tsx)
- [Existing Subagent Pattern](../convex/domains/agents/core/subagents/document_subagent/documentAgent.ts)
- [Existing Delegation Pattern](../convex/domains/agents/core/delegation/delegationTools.ts)

