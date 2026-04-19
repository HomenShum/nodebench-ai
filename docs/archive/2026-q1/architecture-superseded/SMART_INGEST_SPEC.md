# Smart Ingest — Auto-Context from Claude Code, Local Dirs, and Connected Sources

## What this is

Permission-based auto-ingestion that pulls context from the founder's existing tools and feeds it through NodeBench's 8-step fan-out pipeline. The founder gives access once, NodeBench watches continuously.

## Why

Every founder already has context scattered across:
- Claude Code sessions (JSONL transcripts in `~/.claude/projects/`)
- Local codebase directories
- Meeting notes, docs, screenshots
- Agent outputs from OpenClaw, Cursor, Windsurf

Today they manually upload or copy-paste. Smart ingest watches these sources automatically.

## Architecture

```
Source Detection        Permission Gate        Fan-Out Pipeline
┌──────────────┐      ┌──────────────┐       ┌──────────────────┐
│ Claude Code  │──┐   │              │       │ 1. INGEST        │
│ ~/.claude/   │  │   │  User grants │       │ 2. CLASSIFY      │
├──────────────┤  ├──▶│  per-source  │──────▶│ 3. CANONICALIZE  │
│ Local dirs   │  │   │  permission  │       │ 4. SCORE         │
│ ~/projects/  │  │   │              │       │ 5. PACKET        │
├──────────────┤  │   │  Stored in   │       │ 6. ARTIFACT      │
│ File uploads │──┘   │  Connect UI  │       │ 7. ACTION        │
│ (Library)    │      │              │       │ 8. TRACE         │
└──────────────┘      └──────────────┘       └──────────────────┘
                                                    │
                                              ┌─────┴──────┐
                                              │            │
                                         Library       Changes
                                         (files)      (timeline)
```

## Source 1: Claude Code JSONL Transcripts

### Where they live
- `~/.claude/projects/[PROJECT_HASH]/[SESSION_UUID].jsonl`
- `~/.claude/history.jsonl` (global command history)
- Project hash format: `C--Users-[username]--[project-path-segments]`

### JSONL schema (3 record types)

**User message:**
```json
{
  "type": "user",
  "message": { "role": "user", "content": "..." },
  "sessionId": "uuid",
  "cwd": "/path/to/project",
  "gitBranch": "main",
  "version": "2.0.64",
  "timestamp": "2026-04-07T...",
  "uuid": "turn-uuid",
  "parentUuid": "previous-turn-uuid"
}
```

**Assistant message:**
```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "model": "claude-sonnet-4-5-20250929",
    "content": [{ "type": "text", "text": "..." }]
  },
  "usage": {
    "input_tokens": 3,
    "output_tokens": 424,
    "cache_creation_input_tokens": 738,
    "cache_read_input_tokens": 16662
  },
  "timestamp": "2026-04-07T...",
  "stop_reason": null
}
```

**Queue operation:** `{ "type": "queue-operation", "operation": "dequeue", "timestamp": "..." }`

### What to extract per session
- Session ID, project path, git branch, duration
- Turn count, total tokens (input + output + cache)
- Tools used (from tool_use content blocks)
- Files touched (from Edit/Write/Read tool calls)
- Key decisions made (from assistant text — classify with LLM)
- Errors encountered (from tool_result with is_error: true)

### Ingestion flow
1. **Discover** — Scan `~/.claude/projects/` for .jsonl files modified since last sync
2. **Parse** — Stream each JSONL, pair user+assistant turns, skip queue-ops
3. **Classify** — Use the 8-step pipeline: is this about the founder's company? Which entity?
4. **Route** — Push to `ambientIngestionQueue` with `sourceProvider: "claude_code"`
5. **Canonicalize** — Extract business objects (decisions, changes, evidence) via existing pipeline
6. **Surface** — New files appear in Library, changes appear in Changes tab

## Source 2: Local Codebase Directories

### What to watch
- `package.json` / `pyproject.toml` changes (dependency decisions)
- README, CHANGELOG, docs/ changes (strategy signals)
- `.env.example` changes (infrastructure decisions)
- Git log (commit messages = decision trail)

### Ingestion flow
1. **Discover** — User points to a directory in Connect UI
2. **Fingerprint** — Hash key files, store in local SQLite
3. **Diff** — On each poll, compare fingerprints, detect changes
4. **Classify** — What kind of change? (code, docs, config, dependency)
5. **Route** — Push to `ambientIngestionQueue` with `sourceType: "file_change"`
6. **Surface** — Changes show in Library Changes tab with "Codebase" source badge

## Source 3: File Uploads (Library)

Already wired. The Upload button on Library Files tab accepts:
`.txt, .md, .csv, .json, .pdf, .docx, .xlsx, .png, .jpg, .jpeg`

### Enhancement needed
- After upload, run through INGEST → CLASSIFY → CANONICALIZE
- Extract entities, decisions, signals from document content
- Link to company context if entity matches
- Show in Library with type badge based on classification

## Dogfooding: NodeBench's Own Codebase

### First test case
Point smart ingest at `D:\VSCode Projects\cafecorner_nodebench\nodebench_ai4\nodebench-ai\`:
- Watch `CLAUDE.md`, `docs/architecture/*.md`, `convex/schema.ts`
- Ingest this session's Claude Code transcripts from `~/.claude/projects/`
- Build a NodeBench company packet FROM NodeBench's own data
- Verify the full pipeline: ingest → classify → packet → Library

### Expected output
- Library Files tab shows: session transcripts as document cards
- Library Changes tab shows: code changes, schema changes, doc updates
- Connect shows: "Codebase" source as CONNECTED with file count

## Permission Model

### Connect UI (already designed)
Each source gets a card in the Connect surface:

| Source | Permission | What it accesses |
|--------|-----------|-----------------|
| Claude Code | Read `~/.claude/projects/` | Session transcripts, history |
| Codebase | Read specified directory | Key files, git log, changes |
| Uploads | Already granted | Files dropped in Library |

### Permission storage
```typescript
// New: founderSourcePermissions (Convex table or localStorage)
{
  sourceType: "claude_code" | "codebase" | "uploads",
  path: string,           // ~/.claude/ or /path/to/project
  granted: boolean,
  grantedAt: number,
  lastSyncAt: number,
  fileCount: number,
  sessionCount: number,   // for claude_code
}
```

### Privacy controls
- User explicitly grants per-source (not auto-enabled)
- Can revoke anytime from Connect
- Ingested content stays local (SQLite) unless user pushes to Convex
- No content leaves the machine without explicit export action

## MCP Tools (new)

### `ingest_claude_code_sessions`
```
Input: { path?: string, since?: string, limit?: number }
Default path: ~/.claude/projects/
Since: last sync timestamp
Limit: 50 sessions per batch

Output: {
  sessionsFound: number,
  sessionsIngested: number,
  turnsProcessed: number,
  tokensTotal: { input, output, cache },
  entitiesDetected: string[],
  nextSyncCursor: string
}
```

### `ingest_codebase_changes`
```
Input: { path: string, since?: string }

Output: {
  filesChanged: number,
  changesDetected: { type, file, summary }[],
  entitiesAffected: string[]
}
```

### `get_ingest_status`
```
Input: {}

Output: {
  sources: {
    claude_code: { connected, lastSync, sessions, turns },
    codebase: { connected, lastSync, files, changes },
    uploads: { count, lastUpload }
  }
}
```

## Fan-Out Pipeline Integration

Smart ingest feeds directly into the existing 8-step pipeline from `founderOperatingModel.ts`:

| Step | What smart ingest adds |
|------|----------------------|
| 1. INGEST | New sources: claude_code JSONL, codebase diffs, uploaded files |
| 2. CLASSIFY | Infer role from context: code session = founder/developer mode |
| 3. CANONICALIZE | Map cwd/project to company entity automatically |
| 4. SCORE | Score context freshness: session from today > session from last week |
| 5. PACKET | Auto-refresh packets when new evidence arrives from ingestion |
| 6. ARTIFACT | Generate updated artifacts when packet changes |
| 7. ACTION | Notify founder of important new context ("3 sessions since last reset") |
| 8. TRACE | Record ingestion provenance for every piece of context |

## Queue Topology Addition

```
NEW: claude_code_sync (every 5 min when connected)
  → ingestion (normalize JSONL → turns → context)
  → delta (compare to prior company state)
  → packet_refresh (if delta is significant)
  → ambient_reminders ("You had 5 sessions since your last weekly reset")

NEW: codebase_watch (every 15 min when connected)
  → ingestion (normalize diffs → changes)
  → delta (classify change impact)
  → packet_refresh (if infrastructure decision changed)
```

## Implementation Phases

### Phase 1: Claude Code JSONL ingestion (1 session)
- Create `claudeCodeIngestTools.ts` in MCP tools
- Parse JSONL, extract turns, route to `ambientIngestionQueue`
- Show ingested sessions as document cards in Library
- Dogfood on NodeBench's own Claude Code sessions

### Phase 2: Codebase watching (1 session)
- Create `codebaseWatchTools.ts` in MCP tools
- Fingerprint key files, detect changes on poll
- Route changes to Library Changes tab
- Dogfood on NodeBench's own repo

### Phase 3: Connect UI wiring (1 session)
- Add permission cards to Connect surface
- Add `get_ingest_status` to power the Connect status badges
- Auto-detect available sources on load (does ~/.claude/ exist? what dirs are open?)

### Phase 4: Auto-refresh pipeline (1 session)
- Wire ingestion → delta → packet_refresh automatically
- "3 new sessions since last reset" notification
- Auto-suggest weekly reset when enough new context accumulated

## Key Principle

The founder doesn't organize context. They give permission, and NodeBench organizes it for them. Every piece of ingested context flows through the same 8-step pipeline that search results do — same scoring, same packet routing, same artifact generation. No separate "import" flow.
