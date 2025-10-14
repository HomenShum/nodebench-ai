# Fast Agent Tools Reference

## Overview

The modern fast agent has access to a comprehensive set of tools for document management, editing, task management, research, and media handling. These tools are defined in `convex/fast_agents/tools.ts`.

## 🔧 Available Tools

### 📄 Document Operations

#### 1. `doc.find` - Search Documents
Search for documents by title or content.

**Args:**
```typescript
{
  query: string,
  filters?: { kind?: string[] },
  limit?: number  // Default: 10, Max: 25
}
```

**Returns:**
```typescript
{
  hits: Array<{
    docId: Id<"documents">,
    title: string,
    snippet: string,
    score: number,
    path: string,
    kind: string,
    modifiedAt: number
  }>
}
```

**Example:**
```typescript
const result = await ctx.runAction(api.fast_agents.tools.docFind, {
  query: "Q4 planning",
  filters: { kind: ["text", "markdown"] },
  limit: 5
});
```

---

#### 2. `doc.open` - Open Document
Open and read full document content with metadata.

**Args:**
```typescript
{
  docId: Id<"documents">
}
```

**Returns:**
```typescript
{
  docId: Id<"documents">,
  title: string,
  proseMirrorJson: any,  // Full ProseMirror JSON
  meta: {
    lastModified: number,
    createdAt: number,
    authorId?: Id<"users">,
    kind: string
  }
}
```

---

### ✏️ Context & Editing

#### 3. `context.fetch` - Gather Context
Gather relevant context for editing operations.

**Args:**
```typescript
{
  userMessage?: string,
  docId?: Id<"documents">,
  quickInputs?: string[],
  selectedDocumentIds?: Id<"documents">[],
  selectedFileIds?: Id<"files">[],
  k?: number  // Number of context items to return
}
```

**Returns:**
```typescript
{
  context: string,  // Formatted context string
  items: Array<{
    source: string,
    content: string,
    relevance: number
  }>,
  summary: string
}
```

---

#### 4. `edit.propose` - Propose Edit
Generate an edit proposal for a document.

**Args:**
```typescript
{
  docId: Id<"documents">,
  instruction: string,
  quickInputs?: string[],
  context?: string,
  model?: string
}
```

**Returns:**
```typescript
{
  proposalId: string,
  operations: Array<{
    type: string,
    position: { from: number, to?: number },
    content?: string,
    description: string
  }>,
  summary: string,
  diff: string,
  newDocJson?: any,
  contextSummary: string,
  documentId: Id<"documents">,
  validation?: any
}
```

---

#### 5. `edit.apply` - Apply Edit
Apply an edit proposal to a document.

**Args:**
```typescript
{
  documentId: Id<"documents">,
  proposalId: string,
  operations: Array<{
    type: string,
    position: { from: number, to?: number },
    content?: string,
    description: string
  }>,
  note?: string
}
```

**Returns:**
```typescript
{
  ok: boolean,
  documentId: Id<"documents">,
  appliedOps: number,
  versionId?: Id<"documentSnapshots">
}
```

---

#### 6. `edit.reject` - Reject Edit
Reject an edit proposal.

**Args:**
```typescript
{
  proposalId: string,
  reason?: string
}
```

**Returns:**
```typescript
{
  ok: boolean
}
```

---

### 📋 Task Management

#### 7. `task.add` - Create Task
Create a new task.

**Args:**
```typescript
{
  title: string,
  desc?: string,
  docId?: Id<"documents">,
  due?: number,  // Unix timestamp
  assignee?: Id<"users">
}
```

**Returns:**
```typescript
{
  taskId: Id<"tasks">
}
```

---

#### 8. `task.list` - List Tasks
List recent tasks.

**Args:**
```typescript
{
  limit?: number  // Default: 20
}
```

**Returns:**
```typescript
{
  tasks: Array<{
    taskId: Id<"tasks">,
    title: string,
    status: string,
    docId?: Id<"documents">,
    updatedAt: number,
    dueDate?: number
  }>
}
```

---

#### 9. `task.update` - Update Task
Update an existing task.

**Args:**
```typescript
{
  taskId: Id<"tasks">,
  patch: {
    title?: string,
    description?: string,
    status?: string,
    dueDate?: number
  }
}
```

**Returns:**
```typescript
{
  ok: boolean
}
```

---

### 🔍 Research & Corpus Tools

#### 10. `corpus.plan` - Plan Research
Generate a research plan with query shards.

**Args:**
```typescript
{
  goal: string,
  maxShards?: number  // Default: 4, Max: 8
}
```

**Returns:**
```typescript
{
  shards: Array<{
    id: string,
    query: string,
    kind: string,
    budget: number
  }>
}
```

---

#### 11. `corpus.map` - Execute Research
Execute research queries and gather evidence.

**Args:**
```typescript
{
  shards: Array<{
    id: string,
    query: string,
    kind: string,
    budget: number
  }>
}
```

**Returns:**
```typescript
{
  maps: Array<{
    shardId: string,
    evidence: Array<{
      source: string,
      snippet: string,
      url?: string,
      title?: string
    }>,
    summary: string
  }>
}
```

---

#### 12. `corpus.reduce` - Synthesize Research
Synthesize research findings into a coherent narrative.

**Args:**
```typescript
{
  maps: Array<{
    shardId: string,
    evidence: Array<...>,
    summary: string
  }>
}
```

**Returns:**
```typescript
{
  findings: string[],
  narrative: string,
  gaps: string[],
  nextActions: string[],
  citations: Array<{ shardId: string, detail: string }>
}
```

---

### 🎬 Media Tools

#### 13. `media.search` - Search Media
Search for images or videos.

**Args:**
```typescript
{
  q: string,
  type: "image" | "video",
  limit?: number  // Default: 6, Max: 12
}
```

**Returns:**
```typescript
{
  items: Array<{
    id: string,
    title: string,
    url: string,
    source: string
  }>
}
```

---

#### 14. `media.download` - Download Media
Download media to Convex storage.

**Args:**
```typescript
{
  url: string,
  intoDocId?: Id<"documents">
}
```

**Returns:**
```typescript
{
  ok: boolean,
  pathOrEmbedId?: string  // Storage ID or embed URL
}
```

---

### 📚 Version Control

#### 15. `version.list` - List Versions
List document versions.

**Args:**
```typescript
{
  docId: Id<"documents">,
  limit?: number  // Default: 10
}
```

**Returns:**
```typescript
{
  versions: Array<{
    snapshotId: Id<"documentSnapshots">,
    version: number,
    createdAt: number,
    createdBy: Id<"users">,
    note?: string,
    size?: number
  }>
}
```

---

#### 16. `version.diff` - Compare Versions
Compare two document versions.

**Args:**
```typescript
{
  snapshotA: Id<"documentSnapshots">,
  snapshotB: Id<"documentSnapshots">
}
```

**Returns:**
```typescript
{
  diff: string
}
```

---

## 🚫 Tools NOT Available (Legacy Framework Only)

The following tools are **NOT available** in the modern fast agent implementation:

- ❌ `web.search` - Web search (use Linkup API directly if needed)
- ❌ `web.fetch` - Fetch URLs
- ❌ `code.exec` - Code execution
- ❌ `image.validate` - Image validation
- ❌ `image.filter` - Image filtering
- ❌ `vision.multi` - Multi-model vision analysis
- ❌ `xray.search` - Medical X-ray search
- ❌ `xray.classify` - X-ray classification

These tools are only available in the legacy multi-agent framework and are not used by FastAgentPanel.

---

## 📊 Tool Usage in Modern Fast Agent

The modern fast agent (`convex/fastAgentChat.ts`) does **NOT** directly call these tools. Instead:

1. **For document editing:**
   - Uses `convex/fast_agents/orchestrator.ts`
   - Orchestrator internally uses context gathering and editing agents
   - No explicit tool calls

2. **For chat/questions:**
   - Uses direct LLM calls (GPT-5-mini/nano)
   - No tool calls

3. **For future enhancements:**
   - Tools are available via `api.fast_agents.tools.*`
   - Can be integrated into the orchestrator or chat handler as needed

---

## 🔮 Future Tool Integration

To add tool calling to the modern fast agent:

1. **Update `convex/fastAgentChat.ts`:**
   ```typescript
   // Add tool registry
   const tools = {
     "doc.find": async (args: any) => 
       await ctx.runAction(api.fast_agents.tools.docFind, args),
     "task.add": async (args: any) => 
       await ctx.runAction(api.fast_agents.tools.taskAdd, args),
     // ... more tools
   };
   
   // Pass to LLM with function calling
   const response = await client.chat.completions.create({
     model: GPT5_MINI,
     messages: [...],
     tools: toolDefinitions,
     tool_choice: "auto"
   });
   ```

2. **Handle tool calls in response:**
   ```typescript
   if (response.choices[0].message.tool_calls) {
     for (const toolCall of response.choices[0].message.tool_calls) {
       const result = await tools[toolCall.function.name](
         JSON.parse(toolCall.function.arguments)
       );
       // Emit tool result event
       await emitEvent("tool.result", toolCall.function.name, result);
     }
   }
   ```

---

## 📚 References

- [Tools Implementation](../../../convex/fast_agents/tools.ts)
- [Fast Agents README](../../../convex/fast_agents/README.md)
- [Migration Guide](./MIGRATION_GUIDE.md)
- [Quick Reference](./QUICK_REFERENCE.md)

