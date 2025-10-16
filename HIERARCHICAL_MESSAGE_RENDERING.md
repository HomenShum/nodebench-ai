# Hierarchical Message Rendering for Coordinator Agent

## Overview

The Fast Agent Panel now supports hierarchical message rendering to visualize the coordinator agent's task decomposition. When the coordinator delegates to specialized agents (Document, Media, SEC, Web), the UI displays a clear parent-child relationship between messages.

## Implementation

### Frontend Components

#### 1. UIMessageStream Component (`src/components/FastAgentPanel/FastAgentPanel.UIMessageStream.tsx`)

**Features:**
- Groups messages by parent-child relationships
- Renders child messages with indentation and visual hierarchy
- Deduplicates identical content from the same tool
- Maintains existing streaming and auto-scroll functionality

**Message Grouping Logic:**
```typescript
// Group messages by parentMessageId
const groupedMessages = useMemo(() => {
  const groups: MessageGroup[] = [];
  
  messages.forEach(msg => {
    const parentId = msg.metadata?.parentMessageId;
    
    if (!parentId) {
      // Top-level message (user or coordinator)
      groups.push({ parent: msg, children: [] });
    } else {
      // Child message - find parent group
      const parentGroup = groups.find(g => g.parent._id === parentId);
      if (parentGroup) {
        parentGroup.children.push(msg);
      }
    }
  });
  
  return groups;
}, [messages]);
```

**Hierarchical Rendering:**
```tsx
{groupedMessages.map((group) => (
  <div key={group.parent.id} className="message-group">
    {/* Parent message */}
    <UIMessageBubble message={group.parent} isParent={true} />
    
    {/* Child messages with indentation */}
    {group.children.length > 0 && (
      <div className="ml-8 border-l-2 border-purple-200 pl-4 space-y-3">
        {group.children.map((child) => (
          <UIMessageBubble 
            message={child} 
            isChild={true}
            agentRole={child.metadata?.agentRole}
          />
        ))}
      </div>
    )}
  </div>
))}
```

#### 2. UIMessageBubble Component (`src/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx`)

**Features:**
- Agent role badges with icons and colors
- Visual indicators for specialized agents
- Hierarchical styling (indentation, borders)

**Agent Role Configuration:**
```typescript
const agentRoleConfig = {
  coordinator: { icon: '🎯', label: 'Coordinator', color: 'purple' },
  documentAgent: { icon: '📄', label: 'Document Agent', color: 'blue' },
  mediaAgent: { icon: '🎥', label: 'Media Agent', color: 'pink' },
  secAgent: { icon: '📊', label: 'SEC Agent', color: 'green' },
  webAgent: { icon: '🌐', label: 'Web Agent', color: 'cyan' },
};
```

**Agent Role Badge:**
```tsx
{roleConfig && !isUser && (
  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r shadow-sm">
    <span className="text-sm">{roleConfig.icon}</span>
    <span>{roleConfig.label}</span>
  </div>
)}
```

### Backend (Convex)

#### Specialized Agents (`convex/agents/specializedAgents.ts`)

**Delegation Tools:**
Each delegation tool calls the specialized agent and returns the result:

```typescript
delegateToDocumentAgent: createTool({
  description: "Delegate document-related queries to the Document Agent",
  args: z.object({
    query: z.string().describe("The user's query about documents"),
  }),
  handler: async (toolCtx, args): Promise<string> => {
    const documentAgent = createDocumentAgent(ctx, userId);
    const threadId = (toolCtx as any).threadId;
    
    const result = await documentAgent.generateText(
      ctx,
      { threadId, userId },
      { prompt: args.query }
    );
    
    return result.text;
  },
}),
```

## Current Limitations

### 1. Metadata Not Persisted

**Issue:** The Convex Agent component's `generateText()` method does not support passing custom metadata fields like `agentRole` or `parentMessageId`.

**Impact:** Messages created by specialized agents don't have metadata indicating:
- Which specialized agent created them
- Which coordinator message they're responding to

**Workaround:** The UI currently renders all messages in a flat list. To enable hierarchical rendering, we would need:
1. The Convex Agent component to support custom metadata in `generateText()`
2. OR a way to update message metadata after creation
3. OR a separate tracking table to map messages to their parent/agent role

### 2. Message Deduplication

**Issue:** When the coordinator delegates to a specialized agent, the specialized agent's response appears as a separate message. If the coordinator also includes the specialized agent's response in its own response, the content appears twice.

**Current Solution:** The `isDuplicate()` function in UIMessageStream checks for duplicate content based on tool names and text preview:

```typescript
const isDuplicate = (message: ExtendedUIMessage): boolean => {
  const toolNames = message.parts
    .filter(p => p.type.startsWith('tool-'))
    .map((p: any) => p.toolName)
    .join(',');
  const textPreview = message.text.slice(0, 100);
  const contentHash = `${toolNames}-${textPreview}`;
  
  if (seenContent.has(contentHash) && contentHash.length > 5) {
    return true;
  }
  seenContent.add(contentHash);
  return false;
};
```

**Limitation:** This is a heuristic approach and may not catch all duplicates or may incorrectly mark unique messages as duplicates.

### 3. Message Ordering

**Issue:** Messages are rendered in chronological order based on `_creationTime`. When the coordinator delegates to multiple specialized agents in parallel, the message order may not reflect the logical task decomposition.

**Example:**
```
1. User: "Find documents and videos about Google"
2. Coordinator: "I'll search for documents and videos..."
3. Document Agent: "Found 3 documents..."
4. Media Agent: "Found 5 videos..."
5. Coordinator: "Here are the results..."
```

**Desired Order:**
```
1. User: "Find documents and videos about Google"
2. Coordinator: "I'll search for documents and videos..."
   ├─ 3. Document Agent: "Found 3 documents..."
   └─ 4. Media Agent: "Found 5 videos..."
```

**Current Behavior:** All messages appear at the same level without visual hierarchy.

## Future Enhancements

### Option 1: Extend Convex Agent Component

**Proposal:** Add support for custom metadata in `generateText()` and `streamText()`:

```typescript
const result = await agent.generateText(
  ctx,
  { threadId, userId },
  { 
    prompt: args.query,
    metadata: {
      agentRole: "documentAgent",
      parentMessageId: coordinatorMessageId,
    }
  }
);
```

**Benefits:**
- Clean, declarative API
- Metadata persisted with messages
- No additional queries or tables needed

### Option 2: Message Tracking Table

**Proposal:** Create a separate table to track message relationships:

```typescript
// convex/schema.ts
const messageHierarchy = defineTable({
  messageId: v.string(), // Agent component message ID
  parentMessageId: v.optional(v.string()),
  agentRole: v.optional(v.string()),
  threadId: v.string(),
})
  .index("by_message", ["messageId"])
  .index("by_parent", ["parentMessageId"])
  .index("by_thread", ["threadId"]);
```

**Benefits:**
- Works with current Convex Agent component
- Flexible schema for additional metadata
- Can be queried efficiently

**Drawbacks:**
- Additional database table
- Requires manual tracking in delegation tools
- Potential for inconsistency if messages are deleted

### Option 3: Infer Hierarchy from Tool Calls

**Proposal:** Use the coordinator's tool calls to infer which messages are children:

```typescript
// In UIMessageStream
const inferHierarchy = (messages: UIMessage[]) => {
  const groups: MessageGroup[] = [];
  
  messages.forEach((msg, idx) => {
    // Check if this message has delegation tool calls
    const delegationTools = msg.parts.filter(p => 
      p.type === 'tool-call' && 
      p.toolName?.startsWith('delegateTo')
    );
    
    if (delegationTools.length > 0) {
      // This is a coordinator message
      // Next N messages are likely children
      const children = messages.slice(idx + 1, idx + 1 + delegationTools.length);
      groups.push({ parent: msg, children });
    }
  });
  
  return groups;
};
```

**Benefits:**
- No backend changes required
- Works with current implementation
- Leverages existing tool call data

**Drawbacks:**
- Heuristic approach (may be incorrect)
- Assumes sequential message order
- Breaks if messages arrive out of order

## Recommended Approach

**Short-term:** Implement Option 3 (infer hierarchy from tool calls) as it requires no backend changes and provides immediate value.

**Long-term:** Advocate for Option 1 (extend Convex Agent component) as it provides the cleanest, most maintainable solution.

## Testing

To test hierarchical rendering:

1. **Multi-domain query:**
   ```
   User: "Find documents and videos about Google"
   ```
   Expected: Coordinator delegates to Document Agent and Media Agent, both responses appear nested under coordinator.

2. **Single-domain query:**
   ```
   User: "Find the revenue report"
   ```
   Expected: Coordinator delegates to Document Agent, response appears nested under coordinator.

3. **Sequential delegation:**
   ```
   User: "Get Tesla's 10-K and find videos about it"
   ```
   Expected: Coordinator delegates to SEC Agent, then Media Agent, both responses appear nested.

## Visual Design

### Hierarchical Structure
```
┌─────────────────────────────────────┐
│ 👤 User                             │
│ Find documents and videos about     │
│ Google                              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🎯 Coordinator                      │
│ I'll search for documents and       │
│ videos...                           │
└─────────────────────────────────────┘
  │
  ├─┌───────────────────────────────┐
  │ │ 📄 Document Agent             │
  │ │ Found 3 documents...          │
  │ └───────────────────────────────┘
  │
  └─┌───────────────────────────────┐
    │ 🎥 Media Agent                │
    │ Found 5 videos...             │
    └───────────────────────────────┘
```

### Visual Indicators
- **Indentation:** 32px (ml-8) for child messages
- **Border:** 2px purple border on left side of child container
- **Spacing:** 12px (space-y-3) between child messages
- **Agent Badges:** Gradient background with icon and label
- **Colors:** Purple (coordinator), Blue (document), Pink (media), Green (SEC), Cyan (web)

## Conclusion

The hierarchical message rendering implementation provides a foundation for visualizing coordinator agent task decomposition. While the current implementation has limitations due to Convex Agent component constraints, the UI components are ready to support full hierarchical rendering once backend metadata support is available.

The recommended short-term approach is to infer hierarchy from tool calls, which provides immediate value without requiring backend changes. Long-term, extending the Convex Agent component to support custom metadata would provide the cleanest solution.

