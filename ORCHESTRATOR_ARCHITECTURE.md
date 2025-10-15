# Orchestrator Architecture

## 🏗️ **Multi-Agent Orchestration System**

This document describes the hybrid orchestration architecture built for the NodeBench AI application.

---

## 📁 **Directory Structure**

```
convex/orchestrator/
├── types.ts              # TypeScript type definitions
├── classifier.ts         # Query complexity classification
├── planner.ts           # Task decomposition and planning
├── subAgents.ts         # Specialized domain agents
├── orchestrator.ts      # Main orchestration engine
├── router.ts            # Hybrid routing logic
└── index.ts             # Public API entry points
```

---

## 🎯 **Architecture Overview**

### **Hybrid Routing Strategy**

The system intelligently routes queries between two execution paths:

1. **Simple Direct Execution** - Single specialized agent
2. **Complex Orchestration** - Multi-agent coordination

```
User Query
    │
    ▼
┌─────────────────┐
│   Classifier    │ ← Analyzes query complexity
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
Simple      Complex
    │         │
    ▼         ▼
┌────────┐ ┌──────────────┐
│ Direct │ │ Orchestrator │
│  Agent │ │   + Planner  │
└────────┘ └──────────────┘
```

---

## 🤖 **Specialized Sub-Agents**

### **1. Document Agent**
- **Domain**: Document operations
- **Tools**: findDocument, getDocumentContent, analyzeDocument, updateDocument, createDocument
- **Use Cases**: Finding, reading, creating, updating documents

### **2. Media Agent**
- **Domain**: Media file operations
- **Tools**: searchMedia, analyzeMediaFile, getMediaDetails, listMediaFiles
- **Use Cases**: Searching images/videos, analyzing media

### **3. Task Agent**
- **Domain**: Task management
- **Tools**: listTasks, createTask, updateTask
- **Use Cases**: Managing tasks, priorities, statuses

### **4. Event Agent**
- **Domain**: Calendar/event management
- **Tools**: listEvents, createEvent, getFolderContents
- **Use Cases**: Scheduling, listing events

### **5. Web Agent**
- **Domain**: Web search
- **Tools**: linkupSearch, youtubeSearch
- **Use Cases**: Web search, finding online content

---

## 🧠 **Query Classification**

The classifier analyzes queries based on:

1. **Domain Detection** - Keywords matching specific domains
2. **Workflow Indicators** - Multi-step action patterns
3. **Multi-Tool Requirements** - Cross-domain operations
4. **Complexity Scoring** - Simple vs. complex classification

### **Classification Examples**

| Query | Complexity | Domains | Strategy |
|-------|------------|---------|----------|
| "Find my revenue report" | Simple | document | Direct |
| "Find revenue report and related tasks" | Complex | document, task | Orchestrator |
| "Find, open, analyze, and edit document" | Complex | document | Orchestrator |
| "Show me all my tasks" | Simple | task | Direct |

---

## 📋 **Task Planning**

For complex queries, the planner:

1. **Decomposes** query into atomic steps
2. **Assigns** each step to appropriate domain agent
3. **Determines** dependencies between steps
4. **Orders** steps for execution

### **Example Plan**

**Query**: "Find my revenue report, open it, and tell me what it's about"

**Plan**:
```json
{
  "steps": [
    {
      "id": "step-1",
      "domain": "document",
      "action": "find",
      "description": "Find revenue report",
      "dependencies": []
    },
    {
      "id": "step-2",
      "domain": "document",
      "action": "read",
      "description": "Read document content",
      "dependencies": ["step-1"]
    },
    {
      "id": "step-3",
      "domain": "document",
      "action": "analyze",
      "description": "Analyze and summarize",
      "dependencies": ["step-2"]
    }
  ]
}
```

---

## 🔄 **Execution Flow**

### **Simple Execution**

```
1. Classify query → Simple
2. Select primary domain agent
3. Execute with single agent
4. Return response
```

### **Complex Orchestration**

```
1. Classify query → Complex
2. Create execution plan
3. Validate plan
4. Execute steps in dependency order
5. Aggregate results
6. Return final response
```

---

## 📊 **Current Status**

### **✅ Implemented**

- [x] Query classifier with domain detection
- [x] Task planner with GPT-4o-mini
- [x] 5 specialized sub-agents
- [x] Hybrid router
- [x] Execution orchestrator
- [x] Type definitions
- [x] Public API

### **⚠️ Known Issues**

1. **Sub-agents not calling tools** - Agents generate responses but don't invoke tools
2. **Empty responses** - Some queries return empty strings
3. **Tool registration** - Dynamic agent creation may not properly register tools

### **🔧 Needs Fixing**

1. Fix tool calling in sub-agents
2. Implement proper tool result extraction
3. Add retry logic for failed steps
4. Improve error handling
5. Add observability/logging

---

## 🎯 **Expected Benefits** (Once Fixed)

| Metric | Current (Monolithic) | Target (Orchestrator) |
|--------|---------------------|----------------------|
| **Pass Rate** | 42.4% (14/33) | 75-85% (25-28/33) |
| **Workflow Tests** | 0% (0/2) | 100% (2/2) |
| **Advanced Tests** | 20% (1/5) | 80% (4/5) |
| **Token Efficiency** | ~3000 tokens/call | ~500-1000 tokens/step |
| **Context Size** | All 17 tools | 3-5 tools per agent |

---

## 🚀 **Next Steps**

1. **Fix Sub-Agent Tool Calling**
   - Investigate why tools aren't being invoked
   - Ensure proper tool registration
   - Add tool call verification

2. **Implement Tool Result Extraction**
   - Parse agent responses for tool calls
   - Extract tool names and arguments
   - Track tool usage for evaluation

3. **Add Retry Logic**
   - Retry failed steps
   - Fallback strategies
   - Error recovery

4. **Testing & Refinement**
   - Run comprehensive test suite
   - Analyze failure patterns
   - Iterate until 100% pass rate

5. **Production Deployment**
   - Performance optimization
   - Monitoring and observability
   - Documentation

---

## 📚 **References**

- **Convex Agent Component**: `@convex-dev/agent`
- **OpenAI Structured Outputs**: GPT-4o-mini with Zod schemas
- **Test Suite**: `convex/tools/evaluation/`
- **Original Agent**: `convex/fastAgentPanelStreaming.ts`

---

## 🎓 **Lessons Learned**

1. **Dynamic agent creation is complex** - Tools must be properly registered
2. **Loop-based execution needed** - Single `generateText()` call insufficient
3. **Hybrid approach is best** - Simple queries don't need orchestration
4. **Classification is key** - Accurate routing improves performance
5. **Testing is critical** - Comprehensive test suite reveals issues early

---

**Status**: 🚧 **Work in Progress** - Architecture complete, tool calling needs fixing

**Last Updated**: October 15, 2025

