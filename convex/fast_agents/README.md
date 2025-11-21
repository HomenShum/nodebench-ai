# Fast Agents - Convex Agent Implementation

This directory contains the Convex Agent implementation for NodeBench AI, following the latest [Convex Agent documentation](https://docs.convex.dev/agents).

## Architecture

The Fast Agents system uses the `@convex-dev/agent` component to provide AI-powered assistance with full access to the user's documents, tasks, events, and media files.

### Key Files

- **`coordinatorAgent.ts`** - Main agent with full tool access for complex multi-step workflows
- **`tools.ts`** - Tool capability reference (documentation only)
- **`prompts.ts`** - Shared prompt templates
- **Other agent files** - Specialized agents for specific domains (context, editing, validation, orchestration)

## Agent Configuration

All agents follow the latest Convex Agent patterns:

```typescript
import { Agent, stepCountIs } from "@convex-dev/agent";
import { openai } from "@ai-sdk/openai";
import { components } from "../_generated/api";

const agent = new Agent(components.agent, {
  name: "AgentName",
  languageModel: openai.chat("gpt-4o-mini"),
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  instructions: "System prompt...",
  tools: {
    // Explicitly pass all tools
    toolName: createTool({ ... }),
  },
  stopWhen: stepCountIs(15),
  usageHandler: async (ctx, args) => {
    // Track usage for billing/analytics
  },
});
```

## Available Tools

The coordinator agent has access to all tools defined in `convex/tools/`:

### Document Operations
- `findDocument` - Search for documents by title or content
- `getDocumentContent` - Read document content
- `analyzeDocument` - Analyze a single document
- `analyzeMultipleDocuments` - Compare/synthesize multiple documents
- `updateDocument` - Update document content
- `createDocument` - Create new documents
- `generateEditProposals` - Generate edit suggestions
- `createDocumentFromAgentContentTool` - Persist agent-generated content

### Media Operations
- `searchMedia` - Search for images and videos
- `analyzeMediaFile` - Analyze media files
- `getMediaDetails` - Get media metadata
- `listMediaFiles` - List all media files

### Data Access
- `listTasks` - List tasks with filtering
- `createTask` - Create new tasks
- `updateTask` - Update existing tasks
- `listEvents` - List calendar events
- `createEvent` - Create calendar events
- `getFolderContents` - Browse folder structure

### Web Search
- `linkupSearch` - Search the web using LinkUp API
- `youtubeSearch` - Search YouTube videos

### SEC Filings
- `searchSecFilings` - Search SEC EDGAR filings
- `downloadSecFiling` - Download SEC documents
- `getCompanyInfo` - Get company information

### Hashtag & Dossiers
- `searchHashtag` - Hybrid search for hashtag keywords
- `createHashtagDossier` - Create topic collections
- `getOrCreateHashtagDossier` - Get or create dossier

### Funding Research
- `searchTodaysFunding` - Search funding announcements
- `enrichFounderInfo` - Research founder backgrounds
- `enrichInvestmentThesis` - Research investment rationale
- `enrichPatentsAndResearch` - Search patents and papers
- `enrichCompanyDossier` - Full company enrichment workflow

## Usage in fastAgentPanelStreaming.ts

The main streaming implementation uses the coordinator agent:

```typescript
import { createCoordinatorAgent } from "./fast_agents/coordinatorAgent";

// Create agent
const agent = createCoordinatorAgent(args.model);

// Stream response
const result = await agent.streamText(
  ctx,
  { threadId: thread._id },
  {
    prompt: args.prompt,
    userId: args.userId,
  }
);
```

## Best Practices

1. **Explicit Tool Registration** - Always pass tools explicitly to the agent, don't rely on global registration
2. **Text Embedding Model** - Include `textEmbeddingModel` for vector search capabilities
3. **Step Limits** - Use `stopWhen: stepCountIs(n)` to limit reasoning steps (15 is good for complex workflows)
4. **Usage Tracking** - Implement `usageHandler` for billing and analytics
5. **Async Message Pattern** - For non-streaming, use `saveMessage()` then `generateText()` with `promptMessageId`

## References

- [Convex Agent Documentation](https://docs.convex.dev/agents)
- [Agent Usage Patterns](https://docs.convex.dev/agents/agent-usage)
- [Convex Agent Component](https://www.convex.dev/components/agent)

