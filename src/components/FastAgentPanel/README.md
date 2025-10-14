# FastAgentPanel

A next-generation AI chat sidebar with ChatGPT-like UX, built for fast agent execution and real-time streaming.

## Features

### Core Features
- ✨ **ChatGPT-like Interface**: Clean, minimal design focused on conversation
- ⚡ **Fast Mode by Default**: Optimized for speed with fast-mode agent execution
- 🔄 **Real-time Streaming**: SSE-based streaming for thinking steps, tool calls, and sources
- 💬 **Thread-based Conversations**: Organize chats into persistent threads
- 🎯 **Type-safe**: Full TypeScript support with comprehensive type definitions
- 🔌 **Modular Architecture**: Clean separation of concerns for easy maintenance

### Phase 3 Enhancements ✅
- ⌨️ **Keyboard Shortcuts**: Ctrl+F to toggle panel, Escape to close
- 📝 **Auto-Generated Titles**: Smart title extraction from first message
- 💾 **Export Conversations**: Export to Markdown, JSON, or Plain Text
- ⚙️ **Settings Panel**: Configure Fast Mode, Model, Temperature, Max Tokens, System Prompt
- 🎨 **CSS Animations**: 10+ polished animations with accessibility support
- ♿ **Accessibility**: Reduced motion, focus states, keyboard navigation

## Architecture

### Modern Fast Agent Implementation (NO Legacy Framework)

**Key Change:** FastAgentPanel now uses the modern fast agent orchestrator instead of the legacy multi-agent framework.

- ✅ Uses `convex/fastAgentChat.ts` - modern fast agent implementation
- ✅ Direct calls to `convex/fast_agents/orchestrator.ts`
- ✅ Streamlined execution with SSE event streaming
- ❌ NO legacy framework (MetaAgent, AgentFactory, SupervisorAgent removed)
- ❌ NO `agents/app/chatOrchestrator.ts`
- ❌ NO `agents/core/orchestrator.ts`

### Core Components

```
FastAgentPanel/
├── FastAgentPanel.tsx           # Main container component
├── types/
│   ├── message.ts              # Message, ThinkingStep, ToolCall, Source types
│   ├── thread.ts               # Thread/conversation types
│   ├── stream.ts               # Streaming event types
│   └── index.ts                # Central type exports
└── index.ts                    # Component exports
```

### Supporting Infrastructure

```
src/lib/
└── chatStream.ts               # ChatStreamManager for SSE handling

convex/
├── fastAgentPanel.ts           # Convex queries, mutations, and actions
└── fastAgentChat.ts            # Modern fast agent chat (NO legacy framework)
```

## Usage

```tsx
import { FastAgentPanel } from '@/components/FastAgentPanel';

function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setIsPanelOpen(true)}>
        Open Chat
      </button>
      
      <FastAgentPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        selectedDocumentId={currentDocId}
      />
    </>
  );
}
```

## Data Flow

```
User Input
    ↓
[FastAgentPanel Component]
    ↓
[Convex Action: sendMessage]
    ↓
┌─────────────────────────────────────┐
│  Dual Streaming Architecture        │
├─────────────────────────────────────┤
│ 1. SSE Stream (Real-time events)    │
│    - thinking steps                 │
│    - tool.call / tool.result        │
│    - search.results / rag.results   │
│    ↓                                │
│ 2. Convex Reactive Query            │
│    - useQuery(getMessages)          │
│    - Auto-updates on DB changes     │
└─────────────────────────────────────┘
    ↓
[ChatStreamManager]
    ↓
[Event Callbacks]
    ↓
[State Updates]
    ↓
[UI Re-render]
```

## Convex Schema

### chatThreads
- `userId`: User who owns the thread
- `title`: Thread title (auto-generated from first message)
- `pinned`: Whether thread is pinned to top
- `createdAt`, `updatedAt`: Timestamps

### chatMessages
- `threadId`: Parent thread
- `role`: 'user' | 'assistant' | 'system'
- `content`: Message text
- `status`: 'sending' | 'streaming' | 'complete' | 'error'
- `runId`: Optional link to agent run
- `model`: Model used (e.g., 'openai', 'gemini')
- `fastMode`: Whether fast mode was enabled
- `tokensUsed`: Token usage stats
- `elapsedMs`: Execution time

## Streaming Events

The ChatStreamManager handles these SSE event types:

- `sse.hello`: Connection established
- `sse.closed`: Stream closed
- `run.start`: Agent run started
- `run.complete`: Agent run completed
- `thinking`: Reasoning step
- `tool.call`: Tool invocation started
- `tool.result`: Tool completed
- `tool.error`: Tool failed
- `search.results`: Search sources found
- `rag.results`: RAG sources found
- `token.delta`: Incremental token (for streaming text)

## Phase 1 Status: ✅ COMPLETE

### Implemented
- [x] TypeScript type definitions
- [x] Convex schema (chatThreads, chatMessages)
- [x] Convex functions (queries, mutations, actions)
- [x] ChatStreamManager for SSE handling
- [x] Main FastAgentPanel component with state management

### Next Steps (Phase 2)
- [ ] Message rendering components
- [ ] Thread list UI
- [ ] Live thinking/tool visualization
- [ ] Input enhancements (file upload, slash commands)
- [ ] Conversation management (delete, pin, search)

## Testing

```bash
# Run type checks
npm run type-check

# Test Convex functions
npx convex dev
# Then test in Convex dashboard

# Integration test
# 1. Open app
# 2. Click to open FastAgentPanel
# 3. Send a message
# 4. Verify streaming works
```

## Performance Considerations

- **Virtual Scrolling**: Will be added in Phase 2 for long threads (1000+ messages)
- **Debounced Token Streaming**: Batches token updates to ~60fps
- **Event Deduplication**: ChatStreamManager buffers and deduplicates events
- **Automatic Reconnection**: Up to 3 reconnect attempts on connection loss

## Comparison with AIChatPanel

| Feature | AIChatPanel | FastAgentPanel |
|---------|-------------|----------------|
| Lines of Code | 2500+ | <300 per component |
| Architecture | Monolithic | Modular |
| Thread Management | Basic | Full conversation history |
| Streaming | Mixed approach | Unified ChatStreamManager |
| Type Safety | Partial | Full TypeScript |
| Performance | Re-renders entire list | Optimized (virtual scroll planned) |

## Contributing

When adding new features:
1. Keep components under 300 lines
2. Add types to `types/` directory
3. Update this README
4. Add tests for new functionality

