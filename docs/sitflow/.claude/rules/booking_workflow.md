# Booking Workflow Rules

## Domain Logic
SitFlow manages a pet-sitting booking pipeline. Every code change must respect the booking state machine:

```
pending → mg_scheduled → waiting_on_owner → booked
    ↓                                         ↓
  declined                                 expired
```

## Rules

1. **New clients always need a meet & greet** — Never transition directly from `pending` to `booked` for a client with `status: 'new'`. The flow must go through `mg_scheduled` first.

2. **Returning clients can skip M&G** — Clients with `status: 'returning'` can go `pending → booked` directly.

3. **Expiry is enforced** — Every booking request has an `expiresAt` timestamp. UI must show countdown banners (red when < 24h). Expired requests should not be actionable.

4. **Status transitions update related entities:**
   - `pending → mg_scheduled`: Creates MeetAndGreet record with proposed slots
   - `mg_scheduled → booked`: Updates client to `returning`, creates CalendarEvent
   - `pending → booked`: Creates CalendarEvent, updates client to `returning`
   - Any → `declined`: No side effects

5. **Agent drafts require human approval** — Draft status flow: `pending → sent | edited | dismissed`. Never auto-send without explicit user action (unless `autoSendTypes` includes that template type in AgentConfig).

6. **Calendar events must sync** — When a CalendarEvent is created/updated locally, it must also create/update the corresponding Google Calendar event if credentials are configured. Store the `googleEventId` for future updates.

## Service Types
`boarding`, `drop-in`, `house-sitting`, `dog-walking`, `day-care` — always use these exact enum values.

## Source Channels
`rover`, `openclaw`, `manual` (source) × `imessage`, `whatsapp`, `sms`, `rover`, `email`, `manual` (channel)
