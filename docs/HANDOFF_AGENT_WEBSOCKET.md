# NodeBench AI — Agent & WebSocket Architecture Handoff

**Date:** 2026-03-23
**Audience:** Collaborator working on agent implementation + WebSocket infrastructure
**Codebase:** `nodebench-ai` monorepo

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [MCP Gateway (Inbound Tool Access)](#2-mcp-gateway)
3. [Command Bridge (Outbound Agent Dispatch)](#3-command-bridge)
4. [Voice & Audio Pipeline](#4-voice--audio-pipeline)
5. [NemoClaw (Desktop Automation)](#5-nemoclaw)
6. [FastAgentPanel (Frontend Agent UI)](#6-fastagentpanel)
7. [MCP Server Core](#7-mcp-server-core)
8. [Convex Schema (Key Tables)](#8-convex-schema)
9. [Environment Variables](#9-environment-variables)
10. [Startup & Health Checks](#10-startup--health-checks)
11. [Security Model](#11-security-model)
12. [Deployment Notes](#12-deployment-notes)
13. [Key Files Reference](#13-key-files-reference)
14. [Known Limitations & Future Work](#14-known-limitations--future-work)

---

## 1. System Overview

NodeBench is a **338-tool MCP server** with integrated voice I/O, agent dispatch, and local desktop automation. The architecture:

```
┌─────────────────────────────────────────────────────┐
│                   Express Server (:3100)             │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ MCP Gateway   │  │ Command      │  │ Provider   │ │
│  │ ws://*/mcp    │  │ Bridge       │  │ Bus        │ │
│  │ (inbound)     │  │ ws://*/bridge│  │ ws://*/bus │ │
│  │ JSON-RPC 2.0  │  │ (outbound)   │  │ (events)   │ │
│  └──────┬───────┘  └──────┬───────┘  └────────────┘ │
│         │                  │                          │
│  ┌──────▼──────────────────▼──────────────────────┐  │
│  │            Tool Dispatch Layer                  │  │
│  │  304 tools across 55 domains, lazy-loaded       │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│  │ /tts     │  │ /voice   │  │ /nemoclaw/ws    │   │
│  │ ElevenLabs│  │ Realtime │  │ Desktop control │   │
│  └──────────┘  └──────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│              Vite Frontend (Vercel)                   │
│                                                      │
│  5-Surface Cockpit: Ask | Memo | Research | Editor | │
│  Telemetry                                           │
│                                                      │
│  FastAgentPanel (streaming chat, voice I/O)          │
│  Voice Intent Router (100+ aliases)                  │
│  Demo Conversations (guest fallback)                 │
└─────────────────────────────────────────────────────┘
```

---

## 2. MCP Gateway

**File:** `server/mcpGateway.ts`
**Purpose:** Expose 338 tools over JSON-RPC 2.0 WebSocket to Claude Code, Cursor, OpenClaw

### Entry Point

```typescript
createMcpGateway(config: McpGatewayConfig)
// Returns: { wss, handleUpgrade, healthHandler, getToolCount, getSessionCount }
```

### Endpoint

```
ws://localhost:3100/mcp
wss://api.nodebenchai.com/mcp  (production)
```

### Authentication (3 fallbacks)

1. **Authorization header** (preferred): `Authorization: Bearer nb_key_[32-hex]`
2. **Sec-WebSocket-Protocol** (header-restricted clients): `mcp.nb_key_xxxx`
3. **Query parameter** (last resort): `?token=nb_key_xxxx`

**Key format:** `nb_key_[32 lowercase hex chars]`
**Dev mode:** Set `NODEBENCH_DEV_KEY=<raw_key>` — server auto-hashes and seeds in-memory store

### Connection Flow

1. Client opens WebSocket to `/mcp` with Bearer token
2. `validateApiKey()` checks credentials
3. `McpSession` created, registered
4. JSON-RPC methods available: `initialize`, `tools/list`, `tools/call`, `ping`
5. Tool execution via `callToolWithTimeout()` (30s AbortController)
6. Rate limit notification sent after every call

### JSON-RPC Protocol

**tools/list request:**
```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {} }
```

**tools/list response:**
```json
{
  "jsonrpc": "2.0", "id": 1,
  "result": {
    "tools": [{
      "name": "discover_tools",
      "description": "...",
      "inputSchema": { "type": "object", "properties": {...} },
      "annotations": { "title": "...", "category": "research", "phase": "exploration", "complexity": "low" }
    }]
  }
}
```

**tools/call request:**
```json
{
  "jsonrpc": "2.0", "id": 2, "method": "tools/call",
  "params": { "name": "discover_tools", "arguments": { "query": "search", "limit": 10 } }
}
```

**tools/call response:**
```json
{
  "jsonrpc": "2.0", "id": 2,
  "result": {
    "content": [{ "type": "text", "text": "Found 42 tools..." }],
    "isError": false,
    "_meta": { "durationMs": 125, "sessionToolCallCount": 1, "isTimeout": false }
  }
}
```

### Rate Limits

| Scope | Limit | Reset |
|-------|-------|-------|
| Per key per minute | 100 calls | Sliding 60s window |
| Per key per day | 10,000 calls | 24h UTC |
| Concurrent connections | 100 max | Per gateway |

### Timeouts

| Setting | Value |
|---------|-------|
| Tool call timeout | 30,000 ms |
| Idle connection timeout | 30 min |

### WebSocket Close Codes

| Code | Name | Meaning |
|------|------|---------|
| 4001 | AUTH_FAILED | Invalid/revoked API key |
| 4002 | RATE_LIMITED | Rate limit exceeded |
| 4003 | IDLE_TIMEOUT | No activity 30 min |
| 4004 | SERVER_ERROR | Internal error |
| 4005 | CAPACITY_FULL | Max 100 concurrent |

### Tool Result Formatting

- `rawContent` tools return `ContentBlock[]` directly
- Standard tools serialize to JSON/string, wrap in `[{ type: "text", text: ... }]`

---

## 3. Command Bridge

**File:** `server/commandBridge.ts`
**Purpose:** Dispatch long-running tasks to remote Claude Code / OpenClaw agents

### Endpoint

```
ws://localhost:3100/bridge
```

### Connection Flow

1. Agent opens WebSocket with Bearer token
2. Server validates key, creates `AgentConnection`
3. Agent sends `register` with capabilities
4. Server acks with `registered` + workspace context
5. Bridge dispatches `task_dispatch` packets
6. Agent returns `task_result` or `task_progress`
7. Heartbeat ping every 30s (2 missed = disconnect)

### Message Envelope

```typescript
interface BridgeMessage {
  type: "register" | "registered" | "heartbeat" | "task_dispatch" |
        "task_result" | "task_progress" | "approval_request" |
        "approval_response" | "error";
  id: string;
  timestamp: string;  // ISO 8601
  payload: unknown;
}
```

### Key Message Types

**register (agent -> server):**
```typescript
{
  agentName: string,
  agentType: "claude_code" | "openclaw" | "other",
  runtimeSurface: "local" | "remote" | "hybrid",
  capabilities: string[],
  platform: "linux" | "darwin" | "win32",
  version: string
}
```

**task_dispatch (server -> agent):**
```typescript
interface OutboundTaskPacket {
  packetId: string;
  taskType: "retrieve_items" | "setup_resource" | "run_analysis" |
            "execute_action" | "check_status" | "generate_artifact" | "custom";
  title: string;
  instructions: string;           // markdown
  requestedCapabilities: string[];
  priority: "low" | "medium" | "high" | "critical";
  returnFormat: "summary_only" | "summary_plus_evidence" |
                "full_artifacts" | "structured_data";
  context: { workspaceId: string, companyId?: string, ... };
  timeout: number;                 // ms, default 300_000
  createdAt: string;
}
```

**task_result (agent -> server):**
```typescript
interface InboundTaskResult {
  packetId: string;
  status: "completed" | "failed" | "partial";
  summary: string;
  artifacts?: Array<{ type: "file"|"text"|"json"|"screenshot"|"log", name: string, content: string }>;
  evidence?: Array<{ type: string, content: string, sourceRef?: string }>;
  errorMessage?: string;
  durationMs: number;
}
```

**approval_request (agent -> server):**
```typescript
{ packetId: string, action: string, description: string, risk: "low"|"medium"|"high" }
```

### Bounds

| Metric | Limit |
|--------|-------|
| Max concurrent agents | 50 |
| Max pending tasks | 500 |
| Messages per agent/min | 50 |
| Default task timeout | 300,000 ms |
| Heartbeat interval | 30,000 ms |
| Heartbeat miss threshold | 2 |
| Max message size | 1 MB |

### Close Codes

| Code | Meaning |
|------|---------|
| 4001 | Auth failure |
| 4010 | Registration failed |
| 4011 | Capability mismatch |
| 4012 | Task timeout |
| 4013 | Rate limited |

---

## 4. Voice & Audio Pipeline

### 4.1 TTS Proxy

**File:** `server/routes/tts.ts`
**Endpoint:** `POST /tts`

```typescript
// Request
{ text: string, voiceId?: string, model?: string, stability?: number, similarityBoost?: number }

// Response: audio/mpeg stream
// Errors: 400 (empty text), 413 (>8KB), 503 (no API key), 502 (upstream fail)
```

**Default voice:** Rachel (`21m00Tcm4TlvDq8ikWAM`)
**Default model:** `eleven_turbo_v2_5`

### 4.2 Client-Side TTS

**File:** `src/hooks/useVoiceOutput.ts`

```typescript
const { speak, stop, isSpeaking, isEnabled, toggleEnabled, backend } = useVoiceOutput();
// backend: "elevenlabs" | "browser" | "none"
// Fallback chain: ElevenLabs -> Browser SpeechSynthesis -> Silent
```

### 4.3 Voice Intent Router

**File:** `src/hooks/useVoiceIntentRouter.ts`

Parses voice transcripts into UI actions. 100+ aliases (e.g., "go to research", "open settings", "dark mode").

```typescript
const { handleIntent, lastResult } = useVoiceIntentRouter(actions);
const matched = handleIntent("go to research");  // true if matched
```

### 4.4 OpenAI Realtime Voice Agent

**File:** `server/agents/voiceAgent.ts`

```typescript
import { RealtimeAgent, tool } from '@openai/agents/realtime';
// Model: gpt-4o-realtime-preview
// Tools: search_documents, get_document, create_document, search_web, list_tasks, create_task
// Backend: Convex via ConvexHttpClient
```

---

## 5. NemoClaw

**File:** `server/nemoclaw/`
**Purpose:** Local desktop automation (screenshots, clicks, typing, video)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/nemoclaw` | Mobile chat UI |
| GET | `/nemoclaw/ws` | WebSocket chat |
| GET | `/nemoclaw/screen` | Live screenshot (PNG) |
| POST | `/nemoclaw/chat` | REST messages |

### Tools Available

- **Desktop:** click, type, scroll, key_press, mouse position
- **Video:** screenshot, record_video, get_fps, stop_video
- **Process:** launch_app, close_app, list_apps, active_window
- **Codebase:** read_file, list_files, search_files, git_status, git_command

---

## 6. FastAgentPanel

**Files:** `src/features/agents/components/FastAgentPanel/`

### Architecture

- Thread-based conversations with automatic memory (@convex-dev/agent)
- Streaming buffer (30fps RAF-aligned, `useStreamingBuffer` hook)
- Anonymous sessions (5 free messages/day)
- Demo mode fallback for unauthenticated users

### Props

```typescript
{
  isOpen: boolean,
  onClose: () => void,
  variant: 'overlay' | 'sidebar',
  selectedDocumentId?: string,
  initialThreadId?: string,
  openOptions?: AgentOpenOptions,
  onVoiceIntent?: (text: string) => boolean
}
```

### Key Features

- Slash commands: `/spawn "query" --agents=doc,media,sec`
- Drag-drop file upload (max 10 MB)
- Lazy-loaded KaTeX (265KB, math only), Mermaid diagrams
- Citation parsing + entity enrichment
- YouTube gallery, SEC document cards
- Tool call transparency UI

### Streaming Buffer

```typescript
useStreamingBuffer(onFlush, {
  maxBufferSize: 50,      // Force-flush at 50 updates
  flushIntervalMs: 33,    // ~30fps
})
```

### Demo Conversations

```typescript
interface DemoConversation {
  question: string;
  response: string;
  sources: Array<{ label: string, type: 'code'|'docs'|'data' }>;
  thinkingDuration: number;
  keyInsight: string;
}
```

---

## 7. MCP Server Core

### Entry: `packages/mcp-local/src/index.ts`

**Presets:**
```
starter:    15 tools (onboarding)
founder:    ~40 tools (deep_sim, founder, learning, local_dashboard)
cursor:     28 tools (Cursor 40-tool limit)
default:    ~81 tools
research:   115 tools
full:       338 tools
```

**CLI args:** `--preset`, `--toolsets`, `--exclude`, `--no-toon`, `--no-embedding`, `--smart-preset`, `--stats`, `--health`

### Lazy Loading: `packages/mcp-local/src/toolsetRegistry.ts`

```typescript
export const TOOLSET_LOADERS: Record<string, () => Promise<McpTool[]>> = {
  verification: async () => { const { verificationTools } = await import("./tools/verificationTools.js"); return verificationTools; },
  // ... 54 more domains
};
```

Only requested toolsets are imported at startup.

### Tool Registry: `packages/mcp-local/src/tools/toolRegistry.ts`

**Entry structure:**
```typescript
{
  name: string,
  category: string,
  tags: string[],
  quickRef: { nextAction: string, nextTools: string[], methodology?: string, tip?: string },
  phase: "research" | "implement" | "test" | "verify" | "ship" | "meta" | "utility",
  complexity?: "low" | "medium" | "high"
}
```

**Hybrid search (8 modes):** keyword, tag, category, embedding (HuggingFace), co-occurrence, transitive, expansion, cursor pagination

---

## 8. Convex Schema

**File:** `convex/schema.ts`

Key table groups relevant to agents:

| Group | Tables |
|-------|--------|
| **Auth** | authTables (@convex-dev/auth) |
| **MCP Gateway** | mcpApiKeys, mcpGatewaySessions |
| **Missions (v2)** | missions, taskPlans, runSteps, judgeReviews, retryAttempts, preExecutionGates |
| **Intelligence (v2)** | entities, aliases, peopleProfiles, investorProfiles, stakeholderGraphs |
| **Trajectory** | entities, spans, evidenceBundles, judgeVerdicts, benchmarkRuns |
| **Proactive** | events, opportunities, actions, detectorRuns, userSettings |
| **OpenClaw** | workflows, sessions, executions, delegations |

---

## 9. Environment Variables

### Server (Required)

```bash
CONVEX_URL=https://your-deployment.convex.cloud
OPENAI_API_KEY=sk-...                    # Voice agent + LLM
ELEVENLABS_API_KEY=sk-...                # TTS proxy
NODEBENCH_DEV_KEY=...                    # Dev API key seed
```

### Server (Optional)

```bash
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
BRAVE_API_KEY=...
SERPER_API_KEY=...
TAVILY_API_KEY=...
EXA_API_KEY=...
LINKUP_API_KEY=...
DISCORD_BOT_TOKEN=...
TELEGRAM_BOT_TOKEN=...
NTFY_BASE_URL=https://ntfy.sh
NTFY_DEFAULT_TOPIC=nodebench
```

### Client (Vite, must be VITE_ prefixed)

```bash
VITE_CONVEX_URL=https://your-deployment.convex.cloud
VITE_TTS_PROXY_URL=/tts
```

---

## 10. Startup & Health Checks

### Start Everything

```bash
# Terminal 1: Express server (MCP gateway + bridge + TTS + voice + NemoClaw)
npx tsx server/index.ts --port 3100

# Terminal 2: Vite dev server
npm run dev

# Terminal 3: Connect Claude Code
claude mcp add nodebench --transport websocket ws://localhost:3100/mcp --header "Authorization: Bearer nb_key_..."
```

### Health Endpoints

```bash
curl http://localhost:3100/health        # Root server
curl http://localhost:3100/mcp/health    # MCP gateway (sessions, tools, uptime)
curl http://localhost:3100/mcp/info      # Gateway metadata
curl http://localhost:3100/bridge/health # Command bridge
curl http://localhost:3100/tts/health    # TTS proxy config
```

---

## 11. Security Model

### Implemented

- API keys stored as SHA256 hashes (in-memory dev, Convex production)
- ElevenLabs/OpenAI keys server-side only, never in client bundle
- 1MB message size cap (checked before JSON.parse)
- Tool name validation (alphanumeric + `_-` only)
- Error sanitization (no stack traces to clients)
- Per-key rate limits (100/min, 10k/day)
- Max concurrent connections capped (100 MCP, 50 bridge)

### Agentic Reliability Checklist (run on every change)

1. **BOUND** — Every in-memory collection has MAX + eviction
2. **HONEST_STATUS** — No 2xx on failure paths
3. **HONEST_SCORES** — No hardcoded score floors
4. **TIMEOUT** — AbortController + budget gates
5. **SSRF** — URL validation before fetch
6. **BOUND_READ** — Response size caps on external bodies
7. **ERROR_BOUNDARY** — Async error handling on all routes
8. **DETERMINISTIC** — Sorted-key hashing for CAS

---

## 12. Deployment Notes

### Frontend: Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "X-Frame-Options", "value": "DENY" }
  ]
}
```

**Important:** Vercel (serverless) does NOT support persistent WebSocket. MCP gateway + Command Bridge must run on a separate Node.js server (Railway, Render, self-hosted).

### Vite Build

- 30+ manual chunks for route-based code splitting
- Heavy chunks excluded from preload (agent-fast-panel, editor-vendor, recharts-vendor)
- TOON encoding saves ~40% tokens on structured tool output

### Routes

```
/?surface=ask        → Landing / Ask (DeepTrace)
/?surface=memo       → Decision Workbench
/?surface=research   → Research Hub
/?surface=editor     → Workspace
/?surface=telemetry  → System Health
/developers          → Developer docs
/api-keys            → API key management
/api-docs            → API reference
/pricing, /changelog, /legal
```

---

## 13. Key Files Reference

### Server

| File | Purpose |
|------|---------|
| `server/index.ts` | Express + WebSocket bootstrap, all routes |
| `server/mcpGateway.ts` | MCP protocol handler, tool dispatch |
| `server/mcpAuth.ts` | API key gen/validation/rate limiting |
| `server/mcpSession.ts` | Session lifecycle, telemetry |
| `server/commandBridge.ts` | Outbound agent task dispatch |
| `server/providerBus.ts` | Ambient intelligence event bus |
| `server/routes/tts.ts` | ElevenLabs TTS proxy |
| `server/agents/voiceAgent.ts` | OpenAI Realtime voice agent |
| `server/nemoclaw/` | Desktop automation server |
| `server/stressTest.ts` | Production load testing |

### MCP Server

| File | Purpose |
|------|---------|
| `packages/mcp-local/src/index.ts` | Server entry, preset gating, CLI |
| `packages/mcp-local/src/toolsetRegistry.ts` | Lazy-loading 55 tool domains |
| `packages/mcp-local/src/tools/toolRegistry.ts` | 338-entry catalog, hybrid search |
| `packages/mcp-local/src/tools/progressiveDiscoveryTools.ts` | discover_tools, quick_ref, workflow chains |
| `packages/mcp-local/src/tools/deepSimTools.ts` | 7 Deep Sim tools |
| `packages/mcp-local/src/tools/founderTools.ts` | Founder context gather + auto-hydration |

### Frontend (Agent-Related)

| File | Purpose |
|------|---------|
| `src/features/agents/components/FastAgentPanel/FastAgentPanel.tsx` | Main agent chat panel |
| `src/features/agents/components/FastAgentPanel/hooks/useStreamingBuffer.ts` | 30fps streaming buffer |
| `src/features/agents/components/FastAgentPanel/FastAgentPanel.InputBar.tsx` | Input, file upload, slash commands |
| `src/features/agents/components/FastAgentPanel/FastAgentPanel.UIMessageBubble.tsx` | Rich message rendering |
| `src/features/agents/components/FastAgentPanel/demoConversation.ts` | Guest-mode fallback |
| `src/hooks/useVoiceIntentRouter.ts` | Voice command parsing |
| `src/hooks/useVoiceOutput.ts` | TTS with ElevenLabs/browser fallback |
| `src/lib/elevenlabs.ts` | ElevenLabs client + audio player |
| `src/layouts/CockpitLayout.tsx` | 5-surface shell, agent panel integration |
| `src/layouts/AgentPresenceRail.tsx` | Right rail with agent toggle |

### Config

| File | Purpose |
|------|---------|
| `convex/schema.ts` | All Convex tables |
| `vite.config.ts` | Build config, chunking, aliases |
| `vercel.json` | Deployment config |
| `.claude/launch.json` | Dev server configs |
| `packages/mcp-local/package.json` | MCP server deps & scripts |

---

## 14. Known Limitations & Future Work

### Current Limitations

1. **Vercel + WebSocket:** Serverless can't do persistent WS. Gateway needs separate Node.js host.
2. **Voice state:** Uses custom DOM events, not centralized state management.
3. **NemoClaw:** Requires Python + ffmpeg + pyautogui. Desktop-only.
4. **TTS fallback latency:** Browser SpeechSynthesis ~500ms slower than ElevenLabs.
5. **Reconnect:** Exponential backoff doesn't handle cascading failures.

### Future Enhancements

- [ ] Convex-backed API key storage + telemetry
- [ ] WebSocket-over-HTTP fallback for restricted networks
- [ ] Unified voice state (Zustand)
- [ ] Per-user rate limits (not per-key)
- [ ] Tool call caching for deterministic results
- [ ] Agent capability negotiation (request subset of tools)
- [ ] Batch tool calls (multiple per request)
- [ ] Streaming tool results (chunked responses)

---

## Design System Quick Reference

| Token | Value |
|-------|-------|
| Accent | `#d97757` (warm terracotta) |
| Glass card | `border-white/[0.06] bg-white/[0.02]` |
| Section headers | `text-[11px] uppercase tracking-[0.2em]` |
| Fonts | Manrope (body), JetBrains Mono (code) |
| Sidebar bg | `bg-white/[0.04]` with `backdrop-blur` |
