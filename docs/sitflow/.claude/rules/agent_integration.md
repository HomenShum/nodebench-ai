# Agent & AI Integration Rules

## LLM Client (`server/_core/llm.ts`)

### Configuration
- **Model:** `gemini-2.5-flash` (via Manus Forge API, OpenAI-compatible endpoint)
- **Endpoint:** `BUILT_IN_FORGE_API_URL` env var (default: `forge.manus.im`)
- **Auth:** `BUILT_IN_FORGE_API_KEY` as Bearer token
- **Max tokens:** 32768

### `invokeLLM(params)` API
```typescript
invokeLLM({
  messages: Message[],           // system/user/assistant/tool roles
  tools?: Tool[],                // OpenAI-format function calling
  toolChoice?: ToolChoice,       // "none" | "auto" | "required" | { name: string }
  outputSchema?: OutputSchema,   // Structured JSON output
  responseFormat?: ResponseFormat // "json_object" | "json_schema" | "text"
})
```

### Content Types
Messages support multimodal content:
- `{ type: "text", text: string }`
- `{ type: "image_url", image_url: { url: string, detail?: "auto"|"low"|"high" } }`
- `{ type: "file_url", file_url: { url: string, mime_type?: string } }`

### Important Notes
- Tool calling follows OpenAI format (not Anthropic). Tools are `{ type: "function", function: { name, description, parameters } }`.
- When `toolChoice` is `"required"` with multiple tools, it throws — you must specify the tool name explicitly.
- The LLM client normalizes `tool_choice` to accept both camelCase and snake_case params.

## OpenClaw Skill (`openclaw-skill/`)

### System Prompt (SKILL.md)
The agent acts as a booking assistant for a professional dog sitter. Key behaviors:
- Parses client messages for booking intent (dates, service type, pet info)
- Checks availability via `check_sitter_availability` tool
- New clients: Proposes meet & greet before booking
- Returning clients: Proceeds to booking directly
- Unavailable: Drafts polite decline with alternative suggestion

### Tools (skill.json)
6 tools exposed to OpenClaw agents:

| Tool | Method | Auth | Purpose |
|------|--------|------|---------|
| `check_sitter_availability` | GET | None | Check date range availability |
| `create_booking_request` | POST | X-Webhook-Secret | Create booking from parsed message |
| `lookup_client` | GET | None | Search client by name/phone/email |
| `log_message` | POST | X-Webhook-Secret | Audit trail for agent messages |
| `generate_draft_response` | POST | X-Webhook-Secret | AI-generate reply given context |
| `list_active_requests` | GET | None | Get requests filtered by status |

### Webhook Security
- `X-Webhook-Secret` header required for write operations
- Matches `SITFLOW_WEBHOOK_SECRET` env var
- All webhook events logged to `webhook_events` table (audit trail)

## Agent Draft Pipeline

### Flow
1. Message arrives (OpenClaw webhook or manual entry)
2. `create_booking_request` mutation creates Request with `status: 'pending'`
3. LLM generates contextual draft response:
   - Returning client: References last rate, past experience
   - New client: Includes meet & greet offer
4. Draft stored as `AgentDraft` on the Request object
5. Inbox shows draft with purple accent bar and "Send reply" / "Edit" buttons
6. User reviews → sends, edits, or dismisses

### Draft Status Machine
```
pending → sent       (user approved, message dispatched)
        → edited     (user modified text, then can send)
        → dismissed  (user rejected draft)
```

### Template Types
`new_client_mg`, `returning_accept`, `post_mg_yes`, `post_mg_no`, `unavailable`, `custom`

## Voice Integration
- **Transcription:** `server/_core/voiceTranscription.ts` — Whisper API integration point
- **Audio:** `expo-audio` for recording, microphone permission required
- **Image generation:** `server/_core/imageGeneration.ts` — Manus Forge image API

## Future: WebSocket Layer
Currently all communication is REST/tRPC. The natural upgrade path:
- Real-time booking notifications (new request → instant mobile push)
- Live agent status updates (draft generated → UI updates without polling)
- OpenClaw message relay (bidirectional channel)
- Consider Socket.io or native WebSocket on the Express server
