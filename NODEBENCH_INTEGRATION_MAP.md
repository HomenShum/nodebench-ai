# NodeBench AI - Agent Integration Map & Roadmap

**Document Version:** 1.1  
**Date:** December 10, 2025  
**Status:** Living Document - Updated with Implementation Progress

---

## 📋 Executive Summary

This document maps NodeBench's frontend features to the backend agent architecture, identifying current integration status and a prioritized roadmap for full utilization of the Deep Agent 2.0 and Arbitrage Agent systems.

---

## 🏗️ Architecture Overview

### Backend Agent Layers

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AGENT ROUTING LAYER                                │
│                    convex/domains/agents/agentRouter.ts                      │
│              (Selects: simple → modular | complex → deep | verify → arbitrage)│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────────────┐
│  MODULAR AGENTS   │   │   CORE DEEP 2.0   │   │    ARBITRAGE AGENT        │
│   (Fast/Simple)   │   │   (Full Features) │   │   (Receipts-First)        │
├───────────────────┤   ├───────────────────┤   ├───────────────────────────┤
│ • dataAccess/     │   │ • Planning        │   │ • Contradiction Detection │
│ • coordinator/    │   │ • Memory-First    │   │ • Source Quality Ranking  │
│ • hitl/           │   │ • Scratchpad      │   │ • Delta Detection         │
│                   │   │ • Delegation      │   │ • Source Health Checks    │
│ Direct AI SDK     │   │ • Knowledge Graph │   │ • Verification Status     │
└───────────────────┘   └───────────────────┘   └───────────────────────────┘
```

### Current Entry Points

| Entry Point | Backend Path | Status |
|-------------|--------------|--------|
| FastAgentPanel (streaming) | `fastAgentPanelStreaming.ts` → `coordinatorAgent.ts` | ✅ Active |
| FastAgentPanel (non-streaming) | `agentChatActions.ts` → `agentChat.ts` | ✅ Active |
| Direct API calls | Various `convex/domains/*` | ✅ Active |

---

## 🎯 Frontend Feature Integration Status

### 1. FastAgentPanel (Primary Agent Interface)

**Location:** `src/features/agents/components/FastAgentPanel/`

| Component | Current State | Integration Target | Priority |
|-----------|---------------|-------------------|----------|
| `FastAgentPanel.tsx` | ✅ **DONE** | Arbitrage mode toggle wired | P0 ✅ |
| `FastAgentPanel.Settings.tsx` | ✅ **DONE** | Arbitrage toggle + callbacks | P0 ✅ |
| `FastAgentPanel.UIMessageBubble.tsx` | ✅ **DONE** | ArbitrageReportCard integration | P1 ✅ |
| `FastAgentPanel.VisualCitation.tsx` | ✅ **DONE** | Arbitrage citation components | P1 ✅ |
| `ArbitrageReportCard.tsx` | ✅ **NEW** | Verification report UI | P1 ✅ |

**Integration Tasks:**
```typescript
// FastAgentPanel.Settings.tsx - Add toggle
<Toggle 
  label="Arbitrage Mode" 
  description="Enable receipts-first research with verification"
  value={arbitrageEnabled}
  onChange={setArbitrageEnabled}
/>

// FastAgentPanel.tsx - Pass to backend
await sendStreamingMessage({
  threadId,
  prompt,
  model: selectedModel,
  useCoordinator: true,
  arbitrageEnabled, // NEW
});
```

---

### 2. Research & Intelligence Features

**Location:** `src/features/research/`

#### 2.1 WelcomeLanding

**Location:** `src/features/research/views/WelcomeLanding.tsx`

| Current State | Integration Opportunity |
|---------------|------------------------|
| Static hero + feature cards | Add "AI Research" CTA → FastAgentPanel |
| Manual navigation | Add smart query suggestions |

**Priority:** P2 (Low - entry point only)

#### 2.2 Morning Digest / Day Starter

**Location:** `src/features/research/components/MorningDigest.tsx`, `DayStarterCard.tsx`

| Current State | Integration Opportunity |
|---------------|------------------------|
| Static data display | Add "Refresh with Agent" button |
| No verification | Add source quality indicators |
| No delta tracking | Add "What's New" section via deltaDetection |

**Integration Tasks:**
```typescript
// Add to MorningDigest.tsx
const refreshWithAgent = useAction(api.domains.agents.arbitrage.agent.research);

const handleRefresh = async () => {
  const result = await refreshWithAgent({
    prompt: `Generate morning briefing for ${watchlist.join(', ')}`,
    model: 'gpt-4o',
  });
  // Update UI with verified data
};
```

**Priority:** P1 (High value - daily user touchpoint)

#### 2.3 Newsletter View

**Location:** `src/features/research/components/newsletter/`

| Component | Current State | Integration |
|-----------|---------------|-------------|
| `NewsletterView.tsx` | Static markdown render | Add agent-powered generation |
| `EvidenceDrawer.tsx` | Citation display | Connect to arbitrage verification |
| `WhatChangedStrip.tsx` | Static changes | Use deltaDetection tool |

**Integration Tasks:**
```typescript
// NewsletterView.tsx - Add generate button
const generateNewsletter = useAction(api.domains.agents.arbitrage.agent.research);

const handleGenerate = async (topic: string) => {
  const result = await generateNewsletter({
    prompt: `Generate newsletter for ${topic} with verification`,
  });
  // Parse and display with verification badges
};
```

**Priority:** P1 (Core arbitrage use case)

#### 2.4 Dossier Components

**Location:** `src/features/research/components/dossier/`

| Current State | Integration |
|---------------|-------------|
| Manual dossier creation | Add "AI Build Dossier" action |
| No fact verification | Add contradiction detection |
| No source health | Add source freshness indicators |

**Priority:** P1 (Aligns with arbitrage plan)

---

### 3. Calendar & Events

**Location:** `src/features/calendar/`

| Component | Current State | Integration |
|-----------|---------------|-------------|
| `CalendarHomeHub.tsx` | Direct Convex queries | Already integrated via dataAccess tools |
| Event display | Standard UI | Add AI scheduling suggestions |

**Backend Status:** ✅ Already integrated via `dataAccess/tools/calendarTools.ts`

**Integration Tasks:**
```typescript
// Calendar already uses:
api.domains.calendar.calendar.listAgendaInRange

// Agent can access via:
tools.listEvents({ timeRange: "today" })
```

**Priority:** P3 (Already functional)

---

### 4. Documents & Editor

**Location:** `src/features/documents/`

| Component | Current State | Integration |
|-----------|---------------|-------------|
| `DocumentsHomeHub.tsx` | File browser | Add "Analyze with AI" context menu |
| `TabManager.tsx` | Multi-doc view | Add "Compare Documents" action |
| Editor components | Rich text editing | Add AI writing assistance |

**Integration Tasks:**
```typescript
// DocumentsHomeHub.tsx - Add context menu action
const analyzeDocument = useAction(api.domains.agents.coordinator.agent.orchestrate);

const handleAnalyze = async (docId: string) => {
  const result = await analyzeDocument({
    prompt: `Analyze document ${docId} and summarize key points`,
  });
};
```

**Priority:** P2 (Enhances existing chat integration)

---

### 5. Email Intelligence

**Location:** `src/features/emailIntelligence/`

| Component | Current State | Integration |
|-----------|---------------|-------------|
| `ScrollytellingLayout.tsx` | Static layout | Add email analysis agent |
| `DashboardPanel.tsx` | Display only | Add "Summarize Emails" action |

**Integration Tasks:**
```typescript
// New: EmailIntelligenceAgent
export const analyzeEmails = action({
  args: { emailIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    // Use arbitrage tools to verify claims in emails
    const result = await executeContradictionDetection(ctx, {
      facts: emailFacts,
    });
    return result;
  },
});
```

**Priority:** P2 (New capability)

---

### 6. Tasks & Roadmap

**Location:** `src/components/timelineRoadmap/`

| Component | Current State | Integration |
|-----------|---------------|-------------|
| `TimelineRoadmapView.tsx` | Task timeline | Already integrated via dataAccess |
| Task cards | Standard display | Add AI task suggestions |

**Backend Status:** ✅ Already integrated via `dataAccess/tools/taskTools.ts`

**Priority:** P3 (Already functional)

---

## 🗺️ Implementation Roadmap

### Phase 1: Core Agent Integration (Week 1)

| Task | Files | Effort |
|------|-------|--------|
| Add arbitrage toggle to FastAgentPanel.Settings | `FastAgentPanel.Settings.tsx` | 2h |
| Pass arbitrageEnabled to backend | `FastAgentPanel.tsx`, `fastAgentPanelStreaming.ts` | 4h |
| Route to arbitrage agent when enabled | `fastAgentPanelStreaming.ts` | 2h |
| Add verification badges to citations | `FastAgentPanel.VisualCitation.tsx` | 4h |

**Deliverable:** Arbitrage mode accessible via FastAgentPanel toggle

### Phase 2: Newsletter & Dossier (Week 2)

| Task | Files | Effort |
|------|-------|--------|
| Add "Generate with Agent" to NewsletterView | `NewsletterView.tsx` | 4h |
| Connect EvidenceDrawer to arbitrage verification | `EvidenceDrawer.tsx` | 4h |
| Add WhatChangedStrip to deltaDetection | `WhatChangedStrip.tsx` | 3h |
| Add dossier verification UI | `dossier/` components | 4h |

**Deliverable:** Agent-powered newsletter generation with verification

### Phase 3: Research Hub Enhancement (Week 3)

| Task | Files | Effort |
|------|-------|--------|
| Add AI refresh to MorningDigest | `MorningDigest.tsx` | 4h |
| Add source quality to FeedCard | `FeedCard.tsx` | 3h |
| Add delta tracking to SmartWatchlist | `SmartWatchlist.tsx` | 4h |

**Deliverable:** Research hub with live AI updates and verification

### Phase 4: Full Integration (Week 4+)

| Task | Files | Effort |
|------|-------|--------|
| Document analysis actions | `DocumentsHomeHub.tsx` | 4h |
| Email intelligence agent | `emailIntelligence/` | 8h |
| ArbitrageReportCard component | New component | 6h |
| E2E testing | Test files | 4h |

**Deliverable:** Full platform integration with arbitrage capabilities

---

## 📁 File Reference Map

### Backend Agent Files

```
convex/domains/agents/
├── agentRouter.ts              # Smart routing layer
├── arbitrage/                  # Arbitrage Agent module
│   ├── config.ts               # Prompts, schemas, constants
│   ├── agent.ts                # Main actions (research, analyze)
│   └── tools/
│       ├── contradictionDetection.ts
│       ├── sourceQualityRanking.ts
│       ├── deltaDetection.ts
│       └── sourceHealthCheck.ts
├── coordinator/                # Lightweight orchestrator
│   ├── config.ts
│   ├── agent.ts
│   └── tools/delegationTools.ts
├── dataAccess/                 # Calendar, tasks, files
│   ├── config.ts
│   ├── agent.ts
│   └── tools/
│       ├── calendarTools.ts
│       └── taskTools.ts
├── hitl/                       # Human-in-the-loop
│   ├── config.ts
│   ├── interruptManager.ts
│   └── tools/askHuman.ts
├── core/                       # Full Deep Agent 2.0
│   ├── coordinatorAgent.ts     # Main coordinator
│   └── delegation/             # Subagent delegation
└── fastAgentPanelStreaming.ts  # Streaming entry point
```

### Frontend Feature Files

```
src/features/
├── agents/
│   └── components/FastAgentPanel/
│       ├── FastAgentPanel.tsx          # Main container
│       ├── FastAgentPanel.Settings.tsx # Settings panel
│       └── FastAgentPanel.VisualCitation.tsx
├── research/
│   ├── components/
│   │   ├── MorningDigest.tsx
│   │   ├── newsletter/
│   │   │   ├── NewsletterView.tsx
│   │   │   ├── EvidenceDrawer.tsx
│   │   │   └── WhatChangedStrip.tsx
│   │   └── dossier/
│   └── views/WelcomeLanding.tsx
├── calendar/
│   └── components/CalendarHomeHub.tsx
├── documents/
│   └── components/DocumentsHomeHub.tsx
└── emailIntelligence/
    └── components/
```

---

## 🔧 API Reference

### Agent Router

```typescript
// Smart routing - auto-selects agent based on query
api.domains.agents.agentRouter.route({
  prompt: string,
  model?: string,
  forceMode?: 'simple' | 'arbitrage' | 'deep',
  arbitrageEnabled?: boolean,
})
```

### Arbitrage Agent

```typescript
// Full research with verification
api.domains.agents.arbitrage.agent.research({
  prompt: string,
  model?: string,
  canonicalKey?: string,
})

// Standalone tools
api.domains.agents.arbitrage.agent.analyzeContradictions({ facts })
api.domains.agents.arbitrage.agent.rankSources({ sources })
api.domains.agents.arbitrage.agent.detectDeltas({ canonicalKey, currentFacts })
api.domains.agents.arbitrage.agent.checkHealth({ urls })
```

### Data Access Agent

```typescript
api.domains.agents.dataAccess.agent.query({ prompt, model })
api.domains.agents.dataAccess.agent.execute({ prompt, model, allowWrites })
```

---

## ✅ Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Arbitrage mode adoption | 30% of research queries | Analytics |
| Verification badge display | 100% of arbitrage responses | Code coverage |
| Source quality visibility | All sources scored | UI audit |
| Delta tracking usage | Weekly digest feature | User engagement |
| Newsletter generation | 50% faster than manual | Time tracking |

---

## 📝 Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-09 | 1.0 | Initial integration map created |
| 2025-12-10 | 1.1 | **Phase 1 Complete:** FastAgentPanel arbitrage wiring, ArbitrageReportCard, VisualCitation badges, NewsletterView agent CTA, FeedCard quality badges |
| 2025-12-10 | 1.2 | **Phase 2+3 Complete:** DocumentsHomeHub "Analyze with AI" action, SmartWatchlist delta tracking UI (types + badges), Email Intelligence "Verify with AI" integration |

---

*This document is maintained by the NodeBench AI team. For questions, see the ARBITRAGE_AGENT_IMPLEMENTATION_PLAN.md for detailed technical specifications.*
