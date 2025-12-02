# Deep Agents 2.0 - Quick Start Guide

**For**: Developers using the new NodeBench AI architecture  
**Date**: November 22, 2025

---

## 🚀 Quick Start

### Using the Coordinator Agent

```typescript
import { createCoordinatorAgent } from "./convex/fast_agents/coordinatorAgent";

// Create the orchestrator
const coordinator = createCoordinatorAgent("gpt-4o");

// The coordinator automatically:
// 1. Delegates to specialized subagents
// 2. Creates plans for complex tasks
// 3. Uses memory for intermediate results
// 4. Synthesizes multi-agent results
```

---

## 📋 Common Patterns

### Pattern 1: Simple Delegation

```typescript
// User asks: "Find documents about revenue"

// Coordinator automatically:
// 1. Recognizes this is a document operation
// 2. Calls delegateToDocumentAgent("find documents about revenue")
// 3. DocumentAgent uses findDocument + getDocumentContent
// 4. Returns results to coordinator
// 5. Coordinator presents to user
```

### Pattern 2: Multi-Agent Workflow

```typescript
// User asks: "Research Tesla - stock data, filings, and news"

// Coordinator automatically:
// 1. Creates a plan with 3 steps
// 2. Delegates to OpenBBAgent for stock data
// 3. Delegates to SECAgent for filings
// 4. Delegates to OpenBBAgent for news
// 5. Synthesizes all results
// 6. Presents comprehensive report
```

### Pattern 3: Using Memory

```typescript
// User asks: "Find all Q4 reports and create a summary document"

// Coordinator automatically:
// 1. Delegates to DocumentAgent to find Q4 reports
// 2. Stores results in memory: writeAgentMemory({ key: "q4_reports", ... })
// 3. Reads from memory: readAgentMemory({ key: "q4_reports" })
// 4. Delegates to DocumentAgent to create summary
// 5. Cleans up: deleteAgentMemory({ key: "q4_reports" })
```

---

## 🎯 When to Use Each Subagent

### DocumentAgent
**Use for**: Document search, reading, creation, editing, analysis
**Examples**:
- "Find documents about revenue"
- "Read the Q4 report"
- "Compare these 3 documents"
- "Create a new document about AI"

### MediaAgent
**Use for**: Videos, images, web content
**Examples**:
- "Find YouTube videos about machine learning"
- "Search for images of the Golden Gate Bridge"
- "Find web articles about climate change"

### SECAgent
**Use for**: SEC filings, company research
**Examples**:
- "Find Tesla's latest 10-K filing"
- "Get Apple's quarterly reports"
- "Look up company CIK for Microsoft"

### OpenBBAgent
**Use for**: Financial data, stocks, crypto, economy, news
**Examples**:
- "Get Tesla stock price"
- "Compare AAPL, MSFT, and GOOGL"
- "Get Bitcoin price data"
- "Show me GDP growth data"
- "Find news about Tesla"

---

## 🛠️ Available Tools

### Delegation Tools (Use These First!)
- `delegateToDocumentAgent` - For document operations
- `delegateToMediaAgent` - For media discovery
- `delegateToSECAgent` - For SEC filings
- `delegateToOpenBBAgent` - For financial data

### Planning Tools
- `createPlan` - Create explicit task plan
- `updatePlanStep` - Update step status
- `getPlan` - Retrieve plan

### Memory Tools
- `writeAgentMemory` - Store data
- `readAgentMemory` - Retrieve data
- `listAgentMemory` - List all entries
- `deleteAgentMemory` - Delete entry

### Direct Tools (Use When Delegation Not Needed)
- Task management: `listTasks`, `createTask`, `updateTask`
- Event management: `listEvents`, `createEvent`
- Hashtags: `searchHashtag`, `createHashtagDossier`
- Funding research: `searchTodaysFunding`, `enrichFounderInfo`
- Web search: `linkupSearch`, `youtubeSearch`

---

## 📖 Example Workflows

### Example 1: Document Research

```
User: "Find all documents about AI and summarize them"

Coordinator:
1. delegateToDocumentAgent("find all documents about AI")
2. DocumentAgent returns list of documents
3. delegateToDocumentAgent("summarize these documents", analysisType: "synthesis")
4. DocumentAgent analyzes and summarizes
5. Coordinator presents summary to user
```

### Example 2: Comprehensive Company Research

```
User: "Research Apple comprehensively"

Coordinator:
1. createPlan({
     goal: "Research Apple",
     steps: [
       "Get stock data",
       "Find SEC filings",
       "Get recent news",
       "Create report"
     ]
   })
2. delegateToOpenBBAgent("get Apple stock price and fundamentals")
3. updatePlanStep(stepIndex: 0, status: "completed")
4. delegateToSECAgent("find Apple SEC filings")
5. updatePlanStep(stepIndex: 1, status: "completed")
6. delegateToOpenBBAgent("get Apple news")
7. updatePlanStep(stepIndex: 2, status: "completed")
8. delegateToDocumentAgent("create Apple research report with [data]")
9. updatePlanStep(stepIndex: 3, status: "completed")
10. Present final report
```

### Example 3: Multi-Source Analysis

```
User: "Find documents and videos about machine learning"

Coordinator:
1. createPlan({ goal: "Find ML resources", steps: ["docs", "videos"] })
2. delegateToDocumentAgent("find documents about machine learning")
3. writeAgentMemory({ key: "ml_docs", content: results })
4. delegateToMediaAgent("find videos about machine learning")
5. writeAgentMemory({ key: "ml_videos", content: results })
6. readAgentMemory({ key: "ml_docs" })
7. readAgentMemory({ key: "ml_videos" })
8. Synthesize both into final answer
9. deleteAgentMemory({ key: "ml_docs" })
10. deleteAgentMemory({ key: "ml_videos" })
```

---

## 🎓 Best Practices

### 1. Delegate First
Always check if a subagent can handle the task before using direct tools.

### 2. Use Planning for Complex Tasks
If a task has 3+ steps or requires multiple agents, create a plan.

### 3. Use Memory for Large Data
Store intermediate results in memory to avoid context overflow.

### 4. Update Plans
Always update plan steps as you complete them for progress tracking.

### 5. Clean Up Memory
Delete memory entries when done to avoid clutter.

### 6. Synthesize Results
When using multiple agents, combine their outputs into a coherent answer.

---

## 📞 Support

- **Architecture Docs**: `DEEP_AGENTS_2.0_COMPLETE.md`
- **Implementation Details**: `IMPLEMENTATION_PROGRESS.md`
- **Changelog**: `CHANGELOG_2025-11-22_DEEP_AGENTS_MCP_ARCHITECTURE.md`
- **Subagent READMEs**: `convex/fast_agents/subagents/*/README.md`

---

**Happy orchestrating!** 🚀

