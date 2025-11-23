# Fast Agent Subagents

This directory contains specialized sub-agents for the NodeBench AI Deep Agents 2.0 architecture.

## 🏗️ Architecture

The coordinator agent delegates tasks to specialized subagents based on the task type:

```
CoordinatorAgent (Orchestrator)
├── DocumentAgent - Document creation, editing, search
├── MediaAgent - YouTube, web search, media discovery
├── SECAgent - SEC filings, company research
└── OpenBBAgent - Financial data (stocks, crypto, economy, news)
```

## 📁 Directory Structure

Each subagent is self-contained with its own tools:

```
subagents/
├── document_subagent/
│   ├── documentAgent.ts
│   └── tools/
│       ├── documentTools.ts
│       ├── hashtagSearchTools.ts
│       └── geminiFileSearch.ts
├── media_subagent/
│   ├── mediaAgent.ts
│   └── tools/
│       ├── mediaTools.ts
│       ├── youtubeSearch.ts
│       └── linkupSearch.ts
├── sec_subagent/
│   ├── secAgent.ts
│   └── tools/
│       ├── secFilingTools.ts
│       └── secCompanySearch.ts
└── openbb_subagent/
    ├── openbbAgent.ts
    └── tools/
        ├── adminTools.ts
        ├── equityTools.ts
        ├── cryptoTools.ts
        ├── economyTools.ts
        └── newsTools.ts
```

## 🎯 Subagent Responsibilities

### Document Agent
**Purpose**: Document management and content creation  
**Capabilities**:
- Create new documents
- Edit existing documents
- Search documents by hashtag
- Analyze files with Gemini

**When to delegate**:
- User asks to create/edit a document
- User asks to search for documents
- User asks to analyze document content

### Media Agent
**Purpose**: Media discovery and web search  
**Capabilities**:
- Search YouTube videos
- Search web content via LinkUp
- Discover media related to topics

**When to delegate**:
- User asks for videos on a topic
- User asks for web research
- User asks for media content

### SEC Agent
**Purpose**: SEC filings and company research  
**Capabilities**:
- Search SEC filings (10-K, 10-Q, 8-K, etc.)
- Search companies by name/ticker
- Extract financial data from filings

**When to delegate**:
- User asks for SEC filings
- User asks for public company financials
- User asks for regulatory information

### OpenBB Agent
**Purpose**: Financial data and market research  
**Capabilities**:
- Stock price data and fundamentals
- Cryptocurrency market data
- Economic indicators (GDP, employment, inflation)
- Financial news

**When to delegate**:
- User asks for stock/crypto prices
- User asks for company fundamentals
- User asks for economic data
- User asks for financial news

## 🔧 Creating a New Subagent

1. **Create directory structure**:
```bash
mkdir -p convex/fast_agents/subagents/my_subagent/tools
```

2. **Create agent file** (`myAgent.ts`):
```typescript
import { Agent } from "@convex-dev/agent";
import { myTools } from "./tools/myTools";

export function createMyAgent(model: "openai" | "gemini") {
  return new Agent({
    model: model === "openai" ? "gpt-4o" : "gemini-2.0-flash-exp",
    tools: myTools,
    instructions: `You are a specialized agent for...`,
  });
}
```

3. **Create tools** in `tools/` directory

4. **Register in delegation tools** (`../delegation/delegationTools.ts`)

## 📚 Best Practices

1. **Self-Containment**: Each subagent owns its tools
2. **Clear Responsibilities**: Each subagent has a specific domain
3. **Minimal Dependencies**: Avoid cross-subagent dependencies
4. **Comprehensive Instructions**: Provide detailed agent instructions
5. **Error Handling**: Handle errors gracefully and return useful messages

## 🧪 Testing

Each subagent should have tests:

```typescript
// __tests__/documentAgent.test.ts
import { describe, it, expect } from "vitest";
import { createDocumentAgent } from "../documentAgent";

describe("DocumentAgent", () => {
  it("should create agent with correct tools", () => {
    const agent = createDocumentAgent("openai");
    expect(agent).toBeDefined();
  });
});
```

## 📞 Support

- See parent directory README for overall architecture
- See delegation/ directory for delegation patterns
- Contact Core Team for architecture questions

