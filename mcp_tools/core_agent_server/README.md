# Core Agent Server

Planning and memory tools for NodeBench AI Deep Agents 2.0 architecture.

## 🎯 Purpose

This MCP server implements **Pillar 1 (Explicit Planning)** and **Pillar 3 (Persistent Memory)** of the Deep Agents 2.0 architecture:

- **Planning Tools**: Create and manage task plans as tool-accessible documents
- **Memory Tools**: Store intermediate results in external storage to avoid context window overflow

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## 🔧 Tools

### Planning Tools

#### createPlan
Create an explicit task plan with steps marked as pending/in_progress/completed.

**Input**:
```json
{
  "goal": "Research AAPL and create dossier",
  "steps": [
    { "step": "Get stock price data", "status": "pending", "assignedAgent": "OpenBBAgent" },
    { "step": "Get SEC filings", "status": "pending", "assignedAgent": "SECAgent" },
    { "step": "Create dossier document", "status": "pending", "assignedAgent": "DocumentAgent" }
  ]
}
```

**Output**:
```json
{
  "success": true,
  "planId": "plan_1234567890_abc123",
  "message": "Created task plan with 3 steps",
  "markdown": "# Task Plan: Research AAPL and create dossier\n\n..."
}
```

#### updatePlanStep
Update the status or notes of a specific step.

**Input**:
```json
{
  "planId": "plan_1234567890_abc123",
  "stepIndex": 0,
  "status": "completed",
  "notes": "Retrieved price data for last 30 days"
}
```

#### getPlan
Retrieve a task plan by ID.

### Memory Tools

#### writeAgentMemory
Store intermediate results for later retrieval.

**Input**:
```json
{
  "key": "aapl_research_data",
  "content": "{ \"price\": 150.25, \"marketCap\": \"2.5T\", ... }",
  "metadata": {
    "type": "research",
    "source": "OpenBB",
    "timestamp": "2025-11-22T10:30:00Z"
  }
}
```

**Output**:
```json
{
  "success": true,
  "memoryId": "mem_1234567890_xyz789",
  "key": "aapl_research_data",
  "message": "Stored 1024 characters under key 'aapl_research_data'"
}
```

#### readAgentMemory
Retrieve previously stored data.

**Input**:
```json
{
  "key": "aapl_research_data"
}
```

#### listAgentMemory
List all stored memory keys.

**Input**:
```json
{
  "filter": "aapl"
}
```

#### deleteAgentMemory
Delete stored memory.

## 📚 Usage in Agents

Agents access these tools via wrappers in `convex/tools/wrappers/coreAgentTools.ts`:

```typescript
import { createPlan, writeAgentMemory } from "../tools/wrappers/coreAgentTools";

const agent = new Agent({
  tools: { createPlan, writeAgentMemory },
});
```

## 🧪 Testing

```bash
npm test
```

## 📞 Support

Owner: Core Team  
Contact: core-team@nodebench.ai

