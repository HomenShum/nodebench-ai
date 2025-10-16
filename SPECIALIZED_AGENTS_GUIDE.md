# Specialized Agents Guide

## Overview

The Fast Agent Panel now supports **specialized agents** that delegate complex tasks to domain-specific AI agents. This architecture provides:

- **Better accuracy** - Each agent is optimized for its specific domain
- **Reduced token usage** - Agents only have the tools and context they need
- **Parallel processing** - Multiple agents can work simultaneously
- **Clearer responses** - Domain-specific prompting produces better results

## Architecture

```
User Request
     ↓
Coordinator Agent (GPT-4o)
     ↓
  Analyzes request and delegates to:
     ↓
┌────────────┬────────────┬────────────┬────────────┐
│  Document  │   Media    │    SEC     │    Web     │
│   Agent    │   Agent    │   Agent    │   Agent    │
│ (4o-mini)  │ (4o-mini)  │ (4o-mini)  │ (4o-mini)  │
└────────────┴────────────┴────────────┴────────────┘
     ↓            ↓            ↓            ↓
  Results combined and returned to user
```

## Specialized Agents

### 1. Document Agent
**Purpose**: Find, read, create, and manage documents

**Tools**:
- `findDocument` - Search for documents by title or content
- `getDocumentContent` - Read full document content
- `createDocument` - Create new documents
- `updateDocument` - Update existing documents

**Example Queries**:
- "Find me the revenue report"
- "Show me all documents about Q4 planning"
- "Create a new document called 'Meeting Notes'"
- "Update the project roadmap document"

### 2. Media Agent
**Purpose**: Search for YouTube videos, images, and media files

**Tools**:
- `youtubeSearch` - Search YouTube for videos
- `linkupSearch` - Search the web for images
- `searchMedia` - Search internal media files
- `analyzeMediaFile` - Analyze media content

**Example Queries**:
- "Find videos about Python programming"
- "Search for cat images"
- "Find YouTube tutorials on React"
- "Show me videos about Google"

### 3. SEC Agent
**Purpose**: Search and download SEC EDGAR filings

**Tools**:
- `searchSecFilings` - Search for SEC filings by ticker/CIK
- `downloadSecFiling` - Download filings to documents
- `getCompanyInfo` - Look up company information

**Example Queries**:
- "Find Apple's 10-K filing"
- "Get Tesla's latest quarterly report"
- "Search for Google's SEC filings"
- "Download Microsoft's annual report"

### 4. Web Agent
**Purpose**: Search the web for current information

**Tools**:
- `linkupSearch` - Search the web with images

**Example Queries**:
- "What's the latest news on AI?"
- "Search for information about climate change"
- "Find current stock market trends"

## Usage

### Option 1: Automatic Delegation (Recommended)

Use the coordinator agent which automatically routes requests:

```typescript
import { api } from "./convex/_generated/api";

const result = await convex.action(api.fastAgentPanelCoordinator.sendMessageWithCoordinator, {
  threadId: "thread_123",
  prompt: "Find me documents and videos about Google",
  userId: "user_456",
});

console.log(result.response); // Combined response
console.log(result.agentsUsed); // ["Document", "Media"]
```

**How it works**:
1. Coordinator analyzes: "documents AND videos about Google"
2. Delegates to Document Agent: "Find documents about Google"
3. Delegates to Media Agent: "Find videos about Google"
4. Combines results into a single response

### Option 2: Direct Delegation

Bypass the coordinator and call a specific agent directly:

```typescript
const result = await convex.action(api.fastAgentPanelCoordinator.sendMessageToSpecializedAgent, {
  threadId: "thread_123",
  prompt: "Find Python tutorials",
  userId: "user_456",
  agentType: "media", // "document" | "media" | "sec" | "web"
});
```

### Option 3: Streaming Responses

For real-time streaming:

```typescript
await convex.action(api.fastAgentPanelCoordinator.streamMessageWithCoordinator, {
  threadId: "thread_123",
  promptMessageId: "msg_789",
  userId: "user_456",
});
```

## Integration with Fast Agent Panel

To enable specialized agents in the Fast Agent Panel UI:

1. **Update the send message handler** in `FastAgentPanel.tsx`:

```typescript
const handleSendMessage = async (message: string) => {
  // Option A: Use coordinator (automatic delegation)
  const result = await sendMessageWithCoordinator({
    threadId: currentThreadId,
    prompt: message,
    userId: currentUserId,
  });
  
  // Option B: Use existing single agent
  const result = await sendMessage({
    threadId: currentThreadId,
    prompt: message,
  });
};
```

2. **Display which agents were used**:

```typescript
{result.agentsUsed && result.agentsUsed.length > 0 && (
  <div className="agents-used">
    <span>Agents: {result.agentsUsed.join(", ")}</span>
  </div>
)}
```

## Benefits

### 1. Token Efficiency
Each specialized agent only loads the tools it needs:
- **Document Agent**: 4 tools (vs 20+ in main agent)
- **Media Agent**: 4 tools (vs 20+ in main agent)
- **SEC Agent**: 3 tools (vs 20+ in main agent)

This reduces token usage by ~60-70% per request.

### 2. Better Accuracy
Domain-specific instructions improve response quality:
- Document Agent knows to call `getDocumentContent` after `findDocument`
- Media Agent knows to use `youtubeSearch` for videos (not `searchMedia`)
- SEC Agent knows ticker symbols and filing types

### 3. Parallel Processing
The coordinator can call multiple agents simultaneously:
```
"Find documents and videos about AI"
  ↓
Document Agent + Media Agent (parallel)
  ↓
Combined response in ~same time as single agent
```

### 4. Easier Debugging
Each agent has focused logs and clear responsibilities:
```
[CoordinatorAgent] Analyzing request...
[CoordinatorAgent] Delegating to DocumentAgent and MediaAgent
[DocumentAgent] Searching for documents...
[MediaAgent] Searching YouTube...
[CoordinatorAgent] Combining results...
```

## Example Workflows

### Multi-Domain Query
**User**: "Find me documents and videos about Google"

**Flow**:
1. Coordinator receives request
2. Identifies: documents (Document Agent) + videos (Media Agent)
3. Calls both agents in parallel
4. Document Agent: Searches internal documents
5. Media Agent: Searches YouTube
6. Coordinator: Combines results with galleries

**Response**:
```
Found 3 documents about Google:
- Google Strategy 2024.pdf
- Google Cloud Migration Plan.docx
- Google Analytics Setup.md

[YouTube Gallery with 5 videos]
```

### SEC Filing Query
**User**: "Get Apple's latest 10-K and summarize it"

**Flow**:
1. Coordinator receives request
2. Identifies: SEC filing (SEC Agent)
3. SEC Agent: Searches for AAPL 10-K
4. SEC Agent: Downloads filing
5. Coordinator: Asks Document Agent to summarize

**Response**:
```
[SEC Document Gallery]
Apple Inc. 10-K - Filed: 2024-10-30

Summary:
- Revenue: $394.3B (+8% YoY)
- Net Income: $97.0B (+5% YoY)
- Key risks: Supply chain, competition, regulation
...
```

## Configuration

### Customizing Agent Behavior

Edit `convex/agents/specializedAgents.ts`:

```typescript
export function createMediaAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "MediaAgent",
    languageModel: openai.chat("gpt-4o-mini"),
    instructions: `Your custom instructions here...`,
    tools: { /* your tools */ },
    maxSteps: 5, // Increase for more complex workflows
  });
}
```

### Adding New Specialized Agents

1. Create agent function in `specializedAgents.ts`
2. Add delegation tool to coordinator
3. Update documentation

Example:
```typescript
export function createTaskAgent(ctx: ActionCtx, userId: string) {
  return new Agent(components.agent, {
    name: "TaskAgent",
    languageModel: openai.chat("gpt-4o-mini"),
    instructions: `You manage tasks and to-do lists...`,
    tools: {
      createTask,
      listTasks,
      updateTask,
      deleteTask,
    },
    maxSteps: 5,
  });
}
```

## Testing

Test each agent independently:

```typescript
// Test Document Agent
const docAgent = createDocumentAgent(ctx, userId);
const result = await docAgent.generateText(ctx, { threadId }, {
  prompt: "Find the revenue report"
});

// Test Media Agent
const mediaAgent = createMediaAgent(ctx, userId);
const result = await mediaAgent.generateText(ctx, { threadId }, {
  prompt: "Find Python tutorials on YouTube"
});
```

## Troubleshooting

### Agent not being called
- Check coordinator instructions include the agent type
- Verify delegation tool is registered
- Check agent name matches delegation pattern

### Wrong agent being called
- Update coordinator instructions with clearer examples
- Add more specific keywords to agent descriptions
- Test with explicit agent type

### Tools not working
- Verify tools are imported correctly
- Check tool signatures match expected format
- Ensure tools are registered in agent's `tools` object

## Future Enhancements

- **Agent memory**: Agents remember previous interactions
- **Agent collaboration**: Agents can call each other directly
- **Custom routing**: User-defined routing rules
- **Agent analytics**: Track which agents are most used
- **Agent marketplace**: Share and discover specialized agents

