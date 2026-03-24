# tRPC API Rules

## Architecture
- **tRPC v11** with superjson transformer.
- **CRITICAL:** Transformer must be inside `httpBatchLink`, NOT at root `createClient` level. This is a v11 breaking change from v10.
- Server: `server/_core/trpc.ts` defines `router`, `publicProcedure`, `protectedProcedure`, `adminProcedure`.
- Client: `lib/trpc.ts` creates the React client with `createTRPCReact<AppRouter>()`.

## Auth Middleware
- `publicProcedure` — No auth required (but user extracted if present).
- `protectedProcedure` — Requires authenticated user (`ctx.user` must exist).
- `adminProcedure` — Requires `ctx.user.role === 'admin'`.
- Auth is dual-path: cookie (web) + Bearer token (mobile). `sdk.authenticateRequest(req)` handles both.

## Router Structure
```
appRouter
├── system          # Health, version, status
├── auth
│   ├── me          # Get current user (query)
│   └── logout      # Clear session (mutation)
├── clients
│   ├── list        # All clients (query)
│   ├── getById     # Single client by ID (query)
│   ├── create      # New client (mutation)
│   └── update      # Update client fields (mutation)
├── requests
│   ├── list        # All booking requests, optional status filter (query)
│   ├── getById     # Single request by ID (query)
│   ├── create      # New booking request (mutation)
│   └── updateStatus # Change request status + side effects (mutation)
├── meetAndGreets
│   ├── getByRequest # M&G by request ID (query)
│   ├── create       # New M&G with proposed slots (mutation)
│   ├── confirmSlot  # Confirm a specific slot (mutation)
│   └── recordResult # Record M&G outcome: pass/decline/follow_up_needed (mutation)
├── calendar
│   ├── list        # Events in date range (query)
│   ├── create      # New calendar event (mutation)
│   ├── update      # Update event (mutation)
│   └── delete      # Delete event (mutation)
├── agent
│   ├── draft       # Generate AI draft for a request (mutation)
│   ├── config      # Get/update agent configuration (query/mutation)
│   └── templates   # CRUD for message templates
└── openclaw
    ├── ingest      # Webhook: receive parsed booking from OpenClaw (mutation)
    ├── availability # Check sitter availability (query)
    └── clients     # Client lookup for OpenClaw (query)
```

## Validation
- All inputs validated with Zod schemas.
- Enums: `serviceTypeSchema`, `requestStatusSchema`, `eventTypeSchema`, `mgResultSchema`.
- Date strings must be ISO 8601 datetime format.

## Side Effects in Mutations
- `requests.updateStatus` to `booked` → Updates client status to `returning`.
- `meetAndGreets.create` → Updates request status to `mg_scheduled`.
- `meetAndGreets.confirmSlot` → Creates calendar event + updates request status.
- `calendar.create` → Syncs to Google Calendar if credentials configured.

## Error Handling
- Use `TRPCError` with appropriate codes: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `BAD_REQUEST`.
- Never expose internal errors to clients. Wrap with descriptive messages.

## Database
- Drizzle ORM with MySQL (`mysql2` driver).
- Connection is lazy: `getDb()` creates connection on first call, returns `null` if `DATABASE_URL` not set.
- All db functions in `server/db.ts` — never import drizzle directly in routers.
