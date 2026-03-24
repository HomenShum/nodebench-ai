# SitFlow Mobile — Claude Code Project Instructions

## Project Overview
SitFlow is an AI booking copilot for pet sitters — manage Rover-style booking requests, meet & greet scheduling, Google Calendar sync, client CRM, and AI-drafted messages. Native mobile app built with Expo 54 and React Native 0.81, with an Express + tRPC backend and MySQL (Drizzle ORM) database. Built with Manus platform integration. Dark-mode-first UI with purple accents (#A78BFA).

## Architecture

### Stack
- **Frontend:** Expo 54, React Native 0.81, Expo Router 6 (file-based), NativeWind 4 (Tailwind CSS)
- **State:** React Context (`AppProvider`) + AsyncStorage (local persistence) + tRPC/React Query (server sync)
- **Backend:** Express.js + tRPC v11 (superjson transformer) + Drizzle ORM 0.44 + MySQL
- **AI:** Manus Forge API (`gemini-2.5-flash` via OpenAI-compatible endpoint), OpenClaw skill integration
- **Auth:** Manus OAuth (web cookie + mobile Bearer token dual path)
- **Calendar:** Google Calendar API v3 (OAuth2 refresh token flow)
- **Package Manager:** pnpm

### Directory Structure
```
app/                    # Expo Router file-based routes
  (tabs)/               # Tab navigator (4 tabs)
    _layout.tsx         # Tab bar config (Inbox, Calendar, Clients, Agent)
    index.tsx           # Inbox — booking request cards with agent draft previews
    calendar.tsx        # Month view + day detail panel
    clients.tsx         # Client list with search
    agent.tsx           # Agent config: auto-reply, pricing, templates, OpenClaw
  clients/[id].tsx      # Client detail (pets, booking history, notes)
  clients/new.tsx       # New client form
  meetgreet/[id].tsx    # Meet & greet detail (slot selection, outcome)
  request/[id].tsx      # Request detail (status timeline, actions)
  message-draft.tsx     # AI-drafted message review/edit
  oauth/callback.tsx    # OAuth redirect handler
  dev/theme-lab.tsx     # Dev-only theme testing
  _layout.tsx           # Root layout (providers, Stack navigator)

components/             # Shared UI components
  ui/                   # Design system primitives (avatar, collapsible, timer, etc.)
  screen-container.tsx  # Standard screen wrapper
  haptic-tab.tsx        # Tab bar with haptic feedback

hooks/                  # React hooks
  use-auth.ts           # Auth state + token management
  use-colors.ts         # Theme color tokens
  use-color-scheme.ts   # System color scheme detection

lib/                    # Client-side logic
  _core/                # Platform internals
    api.ts              # API base URL resolution
    auth.ts             # Token storage (SecureStore/AsyncStorage)
    manus-runtime.ts    # Manus platform bridge (safe area, postMessage)
    theme.ts            # Color token definitions
  data/
    types.ts            # Domain types (Client, Request, MeetAndGreet, CalendarEvent, etc.)
    store.ts            # AsyncStorage CRUD helpers + mock data seeding
    mock-data.ts        # Development seed data
  app-context.tsx       # Global AppProvider (state + mutations)
  trpc.ts               # tRPC React client setup (httpBatchLink + superjson)
  theme-provider.tsx    # NativeWind theme wrapper

server/                 # Express backend
  _core/
    index.ts            # Server bootstrap (Express + tRPC middleware + OAuth routes)
    trpc.ts             # tRPC init (router, publicProcedure, protectedProcedure, adminProcedure)
    context.ts          # Request context (user auth extraction)
    env.ts              # Environment variable accessor
    llm.ts              # Manus Forge LLM client (invokeLLM, tool calling, structured output)
    oauth.ts            # Manus OAuth routes (/api/oauth/callback, /api/auth/me, logout)
    sdk.ts              # Manus SDK initialization
    cookies.ts          # Session cookie config (SameSite, Secure, httpOnly)
    notification.ts     # Push notification helpers
    imageGeneration.ts  # Image generation via Manus Forge
    voiceTranscription.ts # Whisper transcription
    systemRouter.ts     # Health + system status endpoints
    dataApi.ts          # External data API client
  routers.ts            # Main tRPC router (auth, clients, requests, meetAndGreets, calendar, agent, openclaw)
  db.ts                 # Drizzle database connection + query functions
  google-calendar.ts    # Google Calendar API (create/update/list events, OAuth flow)
  storage.ts            # File storage helpers

drizzle/                # Database schema + migrations
  schema.ts             # Table definitions (users, clients, pets, bookingRequests, meetAndGreets, calendarEvents, messageLog, webhookEvents)
  relations.ts          # Drizzle relation definitions
  0000_*.sql, 0001_*.sql # SQL migrations

openclaw-skill/         # OpenClaw agent integration
  SKILL.md              # Agent system prompt (booking assistant persona)
  skill.json            # Skill definition (tools, triggers, channels)
  openclaw.example.json # Example configuration

shared/                 # Shared between client + server
  types.ts              # Re-exports from drizzle/schema + errors
  const.ts              # Constants (COOKIE_NAME, etc.)
  _core/errors.ts       # Error types
```

## Key Files
- `app/_layout.tsx` — Root layout: providers (tRPC, QueryClient, Theme, SafeArea, App), Stack nav
- `app/(tabs)/_layout.tsx` — Tab bar: Inbox, Calendar, Clients, Agent (with green dot indicator)
- `lib/app-context.tsx` — Central state: clients, requests, meetAndGreets, calendarEvents, templates, agentConfig, draft management
- `lib/data/types.ts` — All domain types: Client, Pet, Request, MeetAndGreet, CalendarEvent, MessageTemplate, AgentDraft, AgentConfig
- `lib/data/store.ts` — AsyncStorage CRUD with mock data initialization
- `lib/trpc.ts` — tRPC client with httpBatchLink, superjson, Bearer auth headers
- `server/routers.ts` — Full tRPC router: auth, clients, requests, meetAndGreets, calendar, agent, openclaw webhooks
- `server/db.ts` — Drizzle MySQL queries (getAllClients, getBookingRequestById, createMeetAndGreet, etc.)
- `server/google-calendar.ts` — GCal create/update/list/delete events + OAuth token management
- `server/_core/llm.ts` — LLM invocation (messages, tools, structured output via Forge API)
- `openclaw-skill/skill.json` — 6 tools: check_availability, create_booking, lookup_client, log_message, generate_draft, list_requests

## Domain Model

### Entities
- **Client** — roverName, displayName, phone, email, status (new/returning), pets[], lastBookingDate, lastRate
- **Pet** — name, breed, age, behaviorNotes, medications, meetAndGreetRequired
- **Request** — clientId, source (rover/manual/openclaw), channel (imessage/whatsapp/sms/rover/email), serviceType (boarding/drop-in/house-sitting/dog-walking/day-care), status (pending → mg_scheduled → waiting_on_owner → booked/declined/expired), expiresAt, agentDraft
- **MeetAndGreet** — requestId, proposedSlots (1-5 datetime), confirmedSlot, location, result (pass/decline/follow_up_needed), googleEventId
- **CalendarEvent** — title, startTime, endTime, eventType (tentative/confirmed/meet_and_greet/block), requestId, googleEventId
- **AgentDraft** — text, templateType, status (pending/sent/edited/dismissed), sentAt, editedText
- **AgentConfig** — enabled (auto-reply toggle), pricing, availability rules, template management, openclawConnected, gatewayUrl, autoSendTypes

### Status Flow
```
pending → mg_scheduled → waiting_on_owner → booked
    ↓                                         ↓
  declined                                 expired
```

### OpenClaw Tools (External Agent Integration)
1. `check_sitter_availability` — GET, startDate/endDate params
2. `create_booking_request` — POST, webhook-secret auth, full booking payload
3. `lookup_client` — GET, search by name/phone/email
4. `log_message` — POST, audit trail for agent communications
5. `generate_draft_response` — POST, AI-drafted reply given request context
6. `list_active_requests` — GET, filtered by status

## Environment Variables

### Required
```bash
DATABASE_URL=mysql://...              # MySQL connection string
JWT_SECRET=...                        # Session cookie signing
VITE_APP_ID=...                       # Manus app ID
OAUTH_SERVER_URL=...                  # Manus OAuth server
OWNER_OPEN_ID=...                     # App owner's Manus OpenID
```

### Optional
```bash
# AI
BUILT_IN_FORGE_API_URL=               # Manus Forge endpoint (default: forge.manus.im)
BUILT_IN_FORGE_API_KEY=               # Forge API key

# Google Calendar
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_CALENDAR_ID=primary
GOOGLE_CALENDAR_TIMEZONE=America/Los_Angeles

# OpenClaw
SITFLOW_API_URL=                      # Base URL for OpenClaw webhook calls
SITFLOW_WEBHOOK_SECRET=               # Webhook auth secret
```

## Scripts
```bash
pnpm dev                # Start server + Metro concurrently
pnpm dev:server         # Express server only (tsx watch)
pnpm dev:metro          # Expo Metro bundler only
pnpm build              # esbuild server bundle
pnpm start              # Production server
pnpm check              # TypeScript type check
pnpm test               # Vitest
pnpm db:push            # Generate + run Drizzle migrations
pnpm android            # Start Android
pnpm ios                # Start iOS
pnpm qr                 # Generate QR code for mobile testing
```

## Conventions
- **Package manager:** pnpm (NOT npm or yarn)
- **Imports:** Use `@/` alias (maps to project root)
- **tRPC v11:** Transformer goes INSIDE `httpBatchLink`, not at root `createClient` level
- **Styling:** NativeWind (Tailwind) classes via `className` prop + StyleSheet for complex styles
- **Colors:** Dark theme base (`#0F0F1A` bg, `#1A1A2E` cards, `#A78BFA` purple accent, `#2A2A40` borders)
- **Navigation:** Expo Router file-based routing. Stack for modals, Tabs for main nav
- **Auth:** Dual-path — cookie (web) + Bearer token (mobile). `sdk.authenticateRequest(req)` handles both
- **State:** AppContext for local state, tRPC queries for server state. AsyncStorage for offline persistence
- **Haptics:** `expo-haptics` on interactive elements (tab switches, button presses)
- **Platform checks:** `Platform.OS !== 'web'` guards for native-only features

## Testing
- **Runner:** Vitest (`pnpm test`)
- **Test files:** `__tests__/agent.test.ts`, `__tests__/api.test.ts`, `__tests__/store.test.ts`, `tests/auth.logout.test.ts`
- **Scenario-based:** Tests should simulate real user personas (pet sitter managing bookings), not isolated unit checks

## Design System
- **Theme:** Dark-mode-first with purple accents
- **Background:** `#0F0F1A` (deepest), `#1A1A2E` (cards/sections)
- **Accent:** `#A78BFA` (purple), `#34D399` (success/active), `#F59E0B` (warning/tentative), `#EF4444` (error/expiry)
- **Borders:** `#2A2A40`
- **Text:** White primary, `#8E8EA0` muted
- **Calendar colors:** Purple (M&G), Blue (confirmed), Yellow (tentative), Gray (blocked)
- **Agent indicator:** Green dot on Agent tab when auto-reply enabled
- **Cards:** Rounded corners, subtle borders, purple accent bar for agent drafts

## Integration Points for NodeBench

### Where Agent/WebSocket Work Connects
1. **OpenClaw Webhook → tRPC** — `server/routers.ts` has `openclaw.ingest` mutation for incoming booking requests via webhook
2. **LLM Tool Calling** — `server/_core/llm.ts` supports OpenAI-compatible tool calling format (Manus Forge wraps Gemini 2.5 Flash)
3. **Agent Draft Pipeline** — Request comes in → LLM generates draft → stored as `AgentDraft` on Request → user reviews in Inbox
4. **Google Calendar Sync** — OAuth2 token refresh, event CRUD, color-coded by event type
5. **Voice Transcription** — `server/_core/voiceTranscription.ts` (Whisper integration point)
6. **Real-time potential** — Currently REST/tRPC polling; WebSocket upgrade path for live booking notifications

### What Needs Building
- [ ] WebSocket layer for real-time booking notifications (new request → push to mobile)
- [ ] Agent autonomy controls (which actions can auto-execute vs require approval)
- [ ] Multi-channel message routing (OpenClaw dispatches to iMessage/WhatsApp/SMS)
- [ ] Conversation memory (agent remembers client preferences across bookings)
- [ ] Calendar conflict detection (automated availability checking before draft generation)
