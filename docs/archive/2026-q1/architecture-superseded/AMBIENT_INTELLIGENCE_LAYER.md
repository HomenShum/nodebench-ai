# Ambient Intelligence Layer — NodeBench Phase 11

## Product Principle

NodeBench should absorb the monitoring, transcription, restructuring, and continuity burden that power users currently perform manually across chat threads, docs, search, and agent sessions.

**User promise:** You should not have to repeatedly ask for the state of your own product, industry, competitors, and opportunities. NodeBench should already know, show what changed, and prepare the next artifact or delegation packet.

## Mental Model

```
Raw conversations and activity
  -> NodeBench turns them into operating truth
  -> NodeBench keeps that truth current
  -> NodeBench prepares what humans and agents need next
```

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      NODEBENCH APP                         │
│ founder view | banker view | profiling | comps | exports   │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          v
┌────────────────────────────────────────────────────────────┐
│           CAUSAL MEMORY + PACKET + TRACE LAYER             │
│ action ledger | path graph | state diffs | packet history  │
└───────────────┬─────────────────────┬─────────────────────┘
                │                     │
                v                     v
┌─────────────────────────┐   ┌──────────────────────────────┐
│ MULTI-PROVIDER BUS      │   │ MEMORY PROVIDER INTERFACE    │
│ websocket | MCP | jobs  │   │ supermemory | local | zep    │
└───────────────┬─────────┘   └───────────────┬──────────────┘
                │                             │
                v                             v
 Claude Code / OpenClaw / Gemini / Codex   synced docs/chats/files
```

## Five Always-On Layers

### Layer 1: Ingestion
Continuously absorbs raw input from all sources.

**Sources:**
- Chat conversations (this session, prior sessions)
- Agent-to-agent discussions
- Planning threads and tradeoff analysis
- MCP tool calls and results
- File changes (repos, docs)
- Web signals (competitors, market, ecosystem)
- User actions (clicks, navigation, exports, shares)

**Convex table: `ambientIngestionQueue`**
```
ingestionId: string
sourceType: "chat" | "agent_output" | "mcp_tool" | "file_change" | "web_signal" | "user_action" | "import"
sourceProvider: string  // "claude_code" | "openclaw" | "supermemory" | "local" | "web_crawler"
sourceRef: string       // session ID, file path, URL, etc.
rawContent: string      // the actual content
metadata: any           // provider-specific metadata
processedAt: optional number
processingStatus: "queued" | "processing" | "canonicalized" | "failed"
createdAt: number
```

### Layer 2: Canonicalization
Transforms raw input into structured business objects.

**Output types:**
- Company thesis updates
- Initiative status changes
- Competitor intelligence
- Strategic decisions
- Build backlog items
- Open questions
- Contradictions
- Artifact references

**Convex table: `ambientCanonicalObjects`**
```
objectId: string
objectType: "thesis" | "decision" | "competitor_signal" | "build_item" | "open_question" | "contradiction" | "artifact_ref" | "initiative_update" | "market_signal"
companyId: optional Id<"founderCompanies">
title: string
content: string
confidence: number (0-1)
sourceIngestionIds: string[]     // provenance chain
supersedes: optional string      // ID of object this replaces
isLatest: boolean
tags: string[]
extractedAt: number
updatedAt: number
```

### Layer 3: Change Engine
Detects what changed, what matters, what contradicts.

**Runs continuously against canonical objects.**

**Convex table: `ambientChangeDetections`**
```
detectionId: string
detectionType: "new_object" | "updated_object" | "contradiction" | "priority_shift" | "confidence_change" | "superseded" | "pattern_detected"
objectId: string
priorState: optional any
currentState: any
impactScore: number (0-1)
impactReason: string
requiresAttention: boolean
resolvedAt: optional number
detectedAt: number
```

### Layer 4: Packet Preparation
Automatically prepares artifacts for review, export, or delegation.

**Packet types:**
- Founder weekly reset
- Pre-delegation brief
- Investor update
- Competitor readout
- Agent handoff brief

**Uses existing `founderPacketVersions` + `founderMemoVersions` from Phase 10.**

**New: `ambientPacketReadiness`**
```
companyId: Id<"founderCompanies">
packetType: "weekly_reset" | "pre_delegation" | "investor_update" | "competitor_readout" | "agent_brief"
lastGeneratedAt: optional number
staleSince: optional number      // when the packet became outdated
changesSinceLastGeneration: number
readinessScore: number (0-1)     // how ready is this for review
suggestedRegenerationReason: optional string
```

### Layer 5: Review Surface
What the user sees when they open NodeBench.

**"Since Your Last Session" card:**
```
lastSessionEnd: timestamp
importantChanges: [
  { type, title, impact, detail }
]
newContradictions: [
  { title, entities, severity }
]
competitorSignals: [
  { competitor, signal, importance }
]
buildItemsDecided: [
  { title, status, decidedAt }
]
packetsReady: [
  { type, readinessScore, changeCount }
]
openQuestions: [
  { question, context, urgency }
]
```

## Memory Provider Interface

```typescript
interface MemoryProvider {
  readonly name: string;
  readonly type: "supermemory" | "local" | "zep" | "graphiti" | "custom";

  // Lifecycle
  connect(config: ProviderConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Write
  store(memory: MemoryInput): Promise<string>;       // returns memory ID
  update(id: string, memory: MemoryInput): Promise<void>;
  delete(id: string): Promise<void>;

  // Read
  recall(query: string, options?: RecallOptions): Promise<Memory[]>;
  get(id: string): Promise<Memory | null>;
  list(options?: ListOptions): Promise<Memory[]>;

  // Relationships
  relate(fromId: string, toId: string, relation: MemoryRelation): Promise<void>;

  // Profile
  getProfile(userId?: string): Promise<UserProfile | null>;

  // Sync
  sync(direction: "push" | "pull" | "both"): Promise<SyncResult>;
}

interface MemoryInput {
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
  scope?: string;            // project/company scope
  documentDate?: string;     // when the content is about
  eventDate?: string;        // when the event happened
}

interface Memory {
  id: string;
  content: string;
  metadata: Record<string, any>;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isLatest: boolean;
  relations: MemoryRelation[];
}

type MemoryRelation = "updates" | "extends" | "derives" | "contradicts" | "supersedes";

interface RecallOptions {
  limit?: number;
  scope?: string;
  dateRange?: { start: string; end: string };
  tags?: string[];
  includeRelated?: boolean;
}

interface UserProfile {
  facts: Record<string, string>;
  recentActivity: string[];
  preferences: Record<string, any>;
}

interface SyncResult {
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}
```

## Provider Implementations

### LocalMemoryProvider (default, always available)
- SQLite via `~/.nodebench/nodebench.db`
- FTS5 for search
- No external dependencies
- Works offline

### SupermemoryProvider (optional)
- API key or OAuth
- Project-scoped via `x-sm-project` header
- Knowledge graph relationships (updates/extends/derives)
- Dynamic user profiles
- Connectors for Google Drive, Notion, GitHub

### ZepProvider (optional)
- Graphiti-based knowledge graph
- Session-scoped memory
- Temporal awareness

## Multi-Provider Event Bus

```typescript
interface ProviderEvent {
  eventId: string;
  provider: string;           // "claude_code" | "openclaw" | "nodebench" | etc.
  eventType: ProviderEventType;
  payload: any;
  timestamp: number;
  sessionId?: string;
  correlationId?: string;
}

type ProviderEventType =
  | "chat.message"
  | "chat.summary"
  | "agent.task_started"
  | "agent.task_completed"
  | "agent.artifact_produced"
  | "agent.status_changed"
  | "tool.called"
  | "tool.result"
  | "file.changed"
  | "file.created"
  | "decision.made"
  | "signal.detected"
  | "memory.stored"
  | "memory.recalled"
  | "packet.generated"
  | "packet.exported"
  | "session.started"
  | "session.ended";
```

**WebSocket protocol:**
```
Client -> Server: { type: "register", provider: "claude_code", capabilities: [...] }
Server -> Client: { type: "registered", providerId: "..." }

Client -> Server: { type: "event", event: ProviderEvent }
Server -> Client: { type: "event_ack", eventId: "..." }

Server -> Client: { type: "context_request", query: "..." }
Client -> Server: { type: "context_response", memories: [...] }

Server -> Client: { type: "packet_handoff", packet: ArtifactPacket }
```

## Background Jobs

### 1. `processIngestionQueue` (every 30 seconds)
- Dequeue raw ingestion items
- Classify content type
- Extract structured objects
- Store as canonical objects
- Mark as processed

### 2. `detectAmbientChanges` (every 5 minutes)
- Compare canonical objects against prior state
- Detect contradictions between objects
- Detect priority shifts
- Calculate impact scores
- Flag items requiring attention

### 3. `assessPacketReadiness` (every 15 minutes)
- For each packet type, count changes since last generation
- Calculate readiness score
- Flag stale packets
- Suggest regeneration when score > threshold

### 4. `computeSessionDelta` (on session start)
- Find last session end time
- Gather all changes since then
- Rank by importance
- Prepare "Since Your Last Session" card

### 5. `pruneAndCompact` (daily)
- Compact old canonical objects (merge superseded chains)
- Archive resolved change detections
- Evict stale ingestion queue items
- Maintain bounded storage

## Dashboard Cards

### Card 1: "Since Your Last Session"
Shows what changed since the user was last active. Groups by:
- Product strategy shifts
- Competitor signals
- New contradictions
- Build items decided
- Packets ready for review

### Card 2: "Operating Truth"
Current state of the company thesis, key metrics, and confidence scores. Updated continuously from canonical objects.

### Card 3: "Attention Required"
Items flagged by the change engine that need founder decision:
- Contradictions to resolve
- Priority conflicts
- Stale packets to regenerate
- Agent anomalies

### Card 4: "Packet Status"
Shows readiness of each packet type:
- Weekly Reset: ready / 12 changes since last
- Investor Update: stale / 8 changes since last
- Agent Brief: current / 2 changes since last
- Competitor Readout: stale / 5 signals since last

## Benchmark Suite (Phase 4)

NodeBench should own benchmarks that Supermemory cannot:

1. **Packet Reuse Benchmark**: Given N sessions of raw input, how well does the system produce a reusable artifact packet?
2. **Contradiction Detection Benchmark**: Given conflicting statements across sessions, how accurately does the system flag them?
3. **Company Profiling Benchmark**: Given a corpus of mixed business content, how accurately does the system extract company thesis, wedge, initiatives, and competitors?
4. **Action Provenance Benchmark**: Given a chain of actions and decisions, can the system explain why any given state exists?
5. **Multi-Provider Continuity Benchmark**: Given context split across 3+ providers, how well does the system maintain coherent truth?

## Implementation Order

### Phase 11A: Foundation (this sprint)
1. Convex schema for ambient tables (3 new tables)
2. MemoryProvider interface + LocalMemoryProvider
3. Ingestion queue processing job
4. "Since Your Last Session" dashboard card

### Phase 11B: Change Engine (next sprint)
1. Canonicalization pipeline
2. Change detection jobs
3. Packet readiness assessment
4. "Attention Required" dashboard card

### Phase 11C: Provider Integration
1. SupermemoryProvider adapter
2. Multi-provider event bus (WebSocket)
3. Provider registration + health monitoring
4. "Operating Truth" card with multi-source data

### Phase 11D: Benchmark
1. Packet reuse benchmark
2. Contradiction detection benchmark
3. Company profiling benchmark
4. Public leaderboard
