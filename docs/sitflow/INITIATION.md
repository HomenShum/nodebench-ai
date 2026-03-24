# SitFlow Mobile — Project Initiation Document

**Date:** 2026-03-23
**Repo:** [jayneebui/sitflow-mobile](https://github.com/jayneebui/sitflow-mobile)
**Status:** v1 complete (all todo.md items checked), v2 agent-first UI redesign complete
**Collaborator Focus:** Agent implementation + WebSocket infrastructure (Homen)

---

## 1. What Is SitFlow?

An AI booking copilot for pet sitters. Think "Rover inbox + AI assistant" — manages booking requests from multiple channels (Rover, iMessage, WhatsApp, SMS), schedules meet & greets for new clients, syncs to Google Calendar, maintains a client CRM, and uses AI to draft personalized responses.

**Target user:** Professional pet sitter managing 10-30 booking requests/week across multiple communication channels.

**Core loop:** Message arrives → AI parses intent → checks availability → generates draft response → sitter reviews and sends.

---

## 2. Current State Assessment

### What's Built (v1 + v2 complete)

| Surface | Status | Notes |
|---------|--------|-------|
| **Inbox** | Done | Booking cards with agent draft previews, filter tabs (All/Needs reply/New client/Confirmed), agent status bar |
| **Calendar** | Done | Month view with color-coded dots, day detail panel, legend. Missing: "Add Block" for unavailable time |
| **Clients** | Done | Search, client cards, detail screen (pets, history, notes), new client form |
| **Agent** | Done | Auto-reply toggle, pricing config, availability rules, template management, OpenClaw connection status |
| **Request Detail** | Done | Status timeline stepper, contextual actions (M&G offer, reply, calendar event), expiry countdown |
| **Meet & Greet** | Done | Slot selection (1-5 proposed times), confirmation, outcome recording |
| **Message Draft** | Done | AI-drafted message review/edit screen |
| **Backend** | Done | Express + tRPC + MySQL (Drizzle), all CRUD endpoints, OpenClaw webhook ingestion |
| **Google Calendar** | Done | OAuth2 flow, create/update/list/delete events, color coding |
| **OpenClaw Skill** | Done | 6 tools defined, system prompt, skill.json, webhook endpoints |
| **Auth** | Done | Manus OAuth, dual cookie/Bearer path, session management |
| **Tests** | Partial | agent.test.ts, api.test.ts, store.test.ts, auth.logout.test.ts — logic-level only |

### What's Not Built Yet

| Gap | Priority | Notes |
|-----|----------|-------|
| **Real-time notifications** | P0 | Currently polling only. No WebSocket or push notifications for new requests |
| **Agent autonomy controls** | P1 | `autoSendTypes` exists in config but the auto-send pipeline isn't wired end-to-end |
| **Multi-channel dispatch** | P1 | OpenClaw can receive from multiple channels, but outbound message routing isn't implemented |
| **Conversation memory** | P2 | Agent drafts are contextual per-request but don't learn from cross-booking client interactions |
| **Calendar conflict detection** | P2 | Availability checking exists but isn't automatically invoked during draft generation |
| **E2E tests** | P2 | No Detox/Maestro. Only logic-level Vitest tests |
| **CI/CD** | P3 | No GitHub Actions, no EAS Build pipeline |

---

## 3. Architecture Deep Dive

### Data Flow

```
                    ┌─────────────────┐
                    │   OpenClaw       │
                    │   (Multi-channel │
                    │    Agent)        │
                    └────────┬────────┘
                             │ webhook POST
                             │ X-Webhook-Secret
                             ▼
┌─────────────────────────────────────────────┐
│           Express Server (:3000)             │
│                                              │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ tRPC Router   │  │ OpenClaw Webhooks  │   │
│  │ /api/trpc     │  │ /api/openclaw/*    │   │
│  └──────┬───────┘  └────────┬───────────┘   │
│         │                    │                │
│  ┌──────▼────────────────────▼──────────┐   │
│  │         Drizzle ORM (MySQL)           │   │
│  │  clients | requests | meetAndGreets   │   │
│  │  calendarEvents | webhookEvents       │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │ LLM Client    │  │ Google Calendar    │   │
│  │ (Manus Forge) │  │ API v3             │   │
│  │ gemini-2.5-   │  │ OAuth2 + cached    │   │
│  │ flash         │  │ access tokens      │   │
│  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────┘
              ▲ tRPC (httpBatchLink)
              │ superjson serialization
              │ Bearer token auth
┌─────────────┴───────────────────────────────┐
│        Expo / React Native App               │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │ AppContext (React Context)            │   │
│  │ clients, requests, meetAndGreets,     │   │
│  │ calendarEvents, templates, agentConfig│   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │ AsyncStorage (offline persistence)    │   │
│  │ sitflow:clients, sitflow:requests...  │   │
│  └──────────────────────────────────────┘   │
│                                              │
│  4 Tabs: Inbox | Calendar | Clients | Agent  │
└──────────────────────────────────────────────┘
```

### Database Schema (MySQL via Drizzle)

```
users           — openId, name, email, role, loginMethod
clients         — roverName, displayName, phone, email, status, notes, avatarColor
pets            — clientId FK, name, breed, age, behaviorNotes, medications
booking_requests — clientId FK, source, serviceType, requestedStart/End, status, expiresAt, rawMessage, channelSource
meet_and_greets — requestId FK, proposedSlots (JSON), confirmedSlot, location, result, googleEventId
calendar_events — title, startTime, endTime, eventType, requestId, googleEventId
message_log     — requestId, direction, channel, content, sentAt
webhook_events  — eventType, payload (JSON), status, errorMessage (audit trail)
```

### tRPC Router Map

```
auth.me / auth.logout
clients.list / clients.getById / clients.create / clients.update
requests.list / requests.getById / requests.create / requests.updateStatus
meetAndGreets.getByRequest / meetAndGreets.create / meetAndGreets.confirmSlot / meetAndGreets.recordResult
calendar.list / calendar.create / calendar.update / calendar.delete
agent.draft / agent.config
openclaw.ingest / openclaw.availability / openclaw.clients
```

---

## 4. Setup Instructions (When Ready to Clone)

### Prerequisites
- Node.js >= 18
- pnpm (`npm i -g pnpm`)
- MySQL instance (local or cloud)
- Expo Go app on phone (for mobile testing)

### Steps
```bash
# 1. Clone
git clone https://github.com/jayneebui/sitflow-mobile.git
cd sitflow-mobile

# 2. Install
pnpm install

# 3. Environment
cp .env.example .env  # or create manually with required vars:
# DATABASE_URL=mysql://user:pass@host:3306/sitflow
# JWT_SECRET=your-secret-here
# VITE_APP_ID=your-manus-app-id
# OAUTH_SERVER_URL=https://oauth.manus.im
# OWNER_OPEN_ID=your-manus-openid

# 4. Database
pnpm db:push  # generates + runs migrations

# 5. Start
pnpm dev  # starts server (:3000) + Metro bundler (:8081) concurrently

# 6. Mobile
pnpm qr  # generates QR code for Expo Go
# Or: pnpm ios / pnpm android
```

### Optional: Google Calendar
```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...  # obtained via /api/google/auth flow
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=America/Los_Angeles
```

### Optional: OpenClaw
```bash
SITFLOW_API_URL=https://your-server.com
SITFLOW_WEBHOOK_SECRET=shared-secret
BUILT_IN_FORGE_API_KEY=your-forge-key  # for LLM draft generation
```

---

## 5. Claude Code Setup Files

The following files should be placed in the repo root when starting development:

| File | Purpose | Location in this repo |
|------|---------|----------------------|
| `CLAUDE.md` | Main project instructions | `docs/sitflow/CLAUDE.md` |
| `.claude/rules/booking_workflow.md` | Domain logic + state machine rules | `docs/sitflow/.claude/rules/booking_workflow.md` |
| `.claude/rules/expo_conventions.md` | Expo/RN patterns + styling guide | `docs/sitflow/.claude/rules/expo_conventions.md` |
| `.claude/rules/trpc_api.md` | tRPC architecture + router map | `docs/sitflow/.claude/rules/trpc_api.md` |
| `.claude/rules/agent_integration.md` | AI/LLM + OpenClaw + WebSocket | `docs/sitflow/.claude/rules/agent_integration.md` |

### To install:
```bash
# From the sitflow-mobile repo root:
cp /path/to/nodebench-ai/docs/sitflow/CLAUDE.md ./CLAUDE.md
cp -r /path/to/nodebench-ai/docs/sitflow/.claude ./.claude
```

---

## 6. Collaboration Scope

### Homen's Focus: Agent Implementation + WebSocket

#### Phase 1: Real-Time Foundation
- Add WebSocket layer to Express server (Socket.io or native WS)
- Event types: `booking:new`, `booking:updated`, `draft:ready`, `calendar:synced`
- Mobile client subscribes to user-scoped events
- Reconnection with exponential backoff

#### Phase 2: Agent Autonomy Pipeline
- Wire `autoSendTypes` from AgentConfig to actual auto-dispatch
- Build approval queue: agent proposes action → mobile push → user approves/rejects
- Audit trail: every agent action logged to `message_log` + `webhook_events`

#### Phase 3: Multi-Channel Message Routing
- OpenClaw outbound: route approved drafts to correct channel (iMessage/WhatsApp/SMS)
- Response tracking: confirm delivery, update draft status to `sent`
- Channel-specific formatting (SMS length limits, WhatsApp rich text)

#### Phase 4: Conversation Memory
- Cross-booking client preference learning
- Rate history, scheduling preferences, pet-specific notes
- Feed context into LLM draft generation for more personalized responses

### Jaynee's Focus: Product / Mobile UX
- UI polish and new feature screens
- Client CRM enhancements
- Calendar improvements (Add Block, drag to reschedule)
- Onboarding flow

---

## 7. Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Package manager | pnpm | Faster installs, strict dependency resolution |
| State management | Context + AsyncStorage + tRPC | Simple, works offline, type-safe server sync |
| Styling | NativeWind (Tailwind) | Familiar syntax, cross-platform consistency |
| Database | MySQL + Drizzle | Manus platform default, type-safe schema |
| Auth | Manus OAuth | Platform integration, dual web/mobile path |
| LLM | Gemini 2.5 Flash via Forge | Cost-effective, good for structured output |
| Navigation | Expo Router (file-based) | Convention over configuration, familiar to Next.js devs |
| Real-time | TBD (not built yet) | Socket.io vs native WS vs SSE to be decided |

---

## 8. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manus platform dependency | High | Core booking logic is platform-agnostic. Auth + LLM can be swapped |
| No CI/CD | Medium | Manual testing + local Vitest. Set up GitHub Actions early |
| AsyncStorage data loss | Medium | Hybrid model: local state + server sync via tRPC. Server is source of truth |
| Google Calendar rate limits | Low | Token caching, batch event creation when possible |
| OpenClaw webhook reliability | Medium | Webhook events table provides audit trail + retry capability |

---

## 9. Quick Reference

### Commands
```bash
pnpm dev          # Full dev (server + metro)
pnpm check        # TypeScript
pnpm test         # Vitest
pnpm db:push      # Migrate DB
pnpm qr           # Mobile QR
```

### Ports
- `:3000` — Express server (tRPC, webhooks, OAuth, Google Calendar)
- `:8081` — Metro bundler (Expo)

### Key URLs (local dev)
- `http://localhost:3000/api/trpc` — tRPC endpoint
- `http://localhost:3000/api/openclaw/*` — OpenClaw webhooks
- `http://localhost:3000/api/auth/me` — Current user
- `http://localhost:3000/api/google/auth` — Google Calendar OAuth start
- `http://localhost:8081` — Expo web preview

### File Naming
- Routes: `app/` directory, kebab-case segments, `[id]` for dynamic
- Components: `components/`, kebab-case files
- Hooks: `hooks/`, kebab-case with `use-` prefix
- Server: `server/`, camelCase files
- Types: `lib/data/types.ts` (client-side), `drizzle/schema.ts` (server-side, re-exported via `shared/types.ts`)
