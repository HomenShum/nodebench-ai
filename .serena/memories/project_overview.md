# NodeBench AI Project Overview

## Purpose
NodeBench AI is a comprehensive research and intelligence platform that combines:
- AI-powered agents for research, analysis, and workflow automation
- Real-time RSS/feed ingestion from multiple sources (HackerNews, ArXiv, ProductHunt, GitHub, Reddit, Dev.to)
- Daily morning briefs and digest generation with persona-specific insights
- Document management with collaborative editing (ProseMirror-based)
- Entity tracking and knowledge graph capabilities
- MCP (Model Context Protocol) server integrations
- Voice interaction support

## Tech Stack
- **Frontend**: React 19, Vite 6, TailwindCSS 3, Mantine UI, TipTap/BlockNote editors
- **Backend**: Convex (serverless backend with real-time subscriptions)
- **AI/LLM**: Anthropic Claude, OpenAI, Google Gemini via ai-sdk, @convex-dev/agent
- **Workflows**: @convex-dev/workflow for durable multi-step processes
- **Job Queues**: @convex-dev/workpool for throttled background jobs
- **Search**: Fusion search with multiple adapters (Linkup, SEC, YouTube, ArXiv, RAG)
- **External APIs**: Linkup API for web search, SEC EDGAR, YouTube, Twilio SMS
- **Testing**: Vitest, Playwright, Storybook
- **Language**: TypeScript 5.9

## Key Architecture
- `convex/` - Backend logic, schemas, actions, workflows
  - `domains/` - Feature-specific modules (agents, research, search, knowledge, etc.)
  - `workflows/` - Durable workflows (daily briefs, email orchestration)
  - `tools/` - AI agent tools (media search, financial research, etc.)
- `src/` - React frontend components
- `server/` - Voice session server (Express + OpenAI Realtime)

## Existing Linkup Integration
The project already has Linkup API integration:
- `convex/tools/media/linkupSearch.ts` - Basic web search
- `convex/tools/media/linkupStructuredSearch.ts` - Structured output search
- `convex/domains/search/fusion/adapters/linkupAdapter.ts` - Fusion search adapter
- Used in: coordinatorAgent, mediaAgent, entityInsights, dealFlow, readerContent
