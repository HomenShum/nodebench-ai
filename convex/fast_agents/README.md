# Fast Agents - Modern Agent Implementation

This directory contains the modern fast agent implementation used by FastAgentPanel.

## Architecture

The fast agents system is designed for speed and simplicity:

1. **Orchestrator** (`orchestrator.ts`) - Main coordinator that routes requests
2. **Context Agent** (`contextAgent.ts`) - Gathers relevant context
3. **Editing Agent** (`editingAgent.ts`) - Generates document edits
4. **Validation Agent** (`validationAgent.ts`) - Validates edit proposals
5. **Tools** (`tools.ts`) - Available tools for agents
6. **Prompts** (`prompts.ts`) - System prompts and templates

## Flow

### Document Editing
```
User Request
    ↓
Orchestrator
    ↓
Context Agent (gather context)
    ↓
Editing Agent (generate edit)
    ↓
Validation Agent (validate)
    ↓
Return edit proposal
```

### Chat/Questions
```
User Request
    ↓
Direct LLM call
    ↓
Return response
```

## Key Principles

- **No Legacy Framework**: This is a clean, modern implementation
- **Fast by Default**: Optimized for speed
- **Streaming**: Real-time progress via SSE events
- **Type-safe**: Full TypeScript support
- **Modular**: Easy to extend and maintain

## Usage

See `convex/fastAgentChat.ts` for the main entry point.

