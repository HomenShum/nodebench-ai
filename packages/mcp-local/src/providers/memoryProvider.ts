/**
 * MemoryProvider — Abstract interface for NodeBench's Ambient Intelligence Layer.
 *
 * Defines the contract that all memory providers (local SQLite, Supermemory,
 * Zep, Graphiti, custom) must implement. Enables multi-provider memory
 * with unified recall, relation graphs, user profiles, and bidirectional sync.
 *
 * Design principles:
 *   - Every provider is independently usable (store/recall/relate)
 *   - Sync is optional — local-first providers may no-op
 *   - Relations form an entity graph across memories
 *   - Profiles aggregate user-level context from memories
 */

// ═══════════════════════════════════════════════════════════════════════════
// Provider types
// ═══════════════════════════════════════════════════════════════════════════

export type ProviderType =
  | "supermemory"
  | "local"
  | "zep"
  | "graphiti"
  | "custom";

// ═══════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════

export interface ProviderConfig {
  /** Provider-specific API key or token */
  apiKey?: string;
  /** Base URL for remote providers */
  baseUrl?: string;
  /** User ID scope (isolates memories per user) */
  userId?: string;
  /** Additional provider-specific settings */
  options?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Memory data types
// ═══════════════════════════════════════════════════════════════════════════

export interface MemoryInput {
  /** Raw content to store */
  content: string;
  /** Optional structured metadata */
  metadata?: Record<string, unknown>;
  /** Categorization scope (e.g. "project", "entity", "decision", "conversation") */
  scope?: string;
  /** Tags for filtering and grouping */
  tags?: string[];
  /** Source identifier (e.g. tool name, agent ID, session ID) */
  source?: string;
  /** ISO 8601 timestamp override (defaults to now) */
  timestamp?: string;
  /** Optional user ID (defaults to provider config userId) */
  userId?: string;
}

export interface Memory {
  /** Unique memory ID (provider-generated) */
  id: string;
  /** Raw content */
  content: string;
  /** Structured metadata */
  metadata: Record<string, unknown>;
  /** Categorization scope */
  scope: string;
  /** Tags */
  tags: string[];
  /** Source identifier */
  source: string;
  /** User ID that owns this memory */
  userId: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last-update timestamp */
  updatedAt: string;
  /** Relevance score (0-1, set during recall) */
  relevanceScore?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Relations
// ═══════════════════════════════════════════════════════════════════════════

export type RelationType =
  | "related_to"
  | "caused_by"
  | "supports"
  | "contradicts"
  | "follows"
  | "references"
  | "part_of"
  | "derived_from";

export interface MemoryRelation {
  /** Relation type */
  type: RelationType;
  /** Optional human-readable label */
  label?: string;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Additional relation metadata */
  metadata?: Record<string, unknown>;
}

export interface StoredRelation extends MemoryRelation {
  /** Unique relation ID */
  id: string;
  /** Source memory ID */
  fromId: string;
  /** Target memory ID */
  toId: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Query options
// ═══════════════════════════════════════════════════════════════════════════

export interface RecallOptions {
  /** Maximum results to return (default: 10) */
  limit?: number;
  /** Filter by scope */
  scope?: string;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by source */
  source?: string;
  /** Filter by user ID */
  userId?: string;
  /** Minimum relevance score (0-1) for semantic search */
  minScore?: number;
  /** ISO 8601 — only memories after this date */
  after?: string;
  /** ISO 8601 — only memories before this date */
  before?: string;
}

export interface ListOptions {
  /** Maximum results (default: 50) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by scope */
  scope?: string;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by source */
  source?: string;
  /** Filter by user ID */
  userId?: string;
  /** Sort order */
  orderBy?: "createdAt" | "updatedAt" | "relevanceScore";
  /** Sort direction */
  orderDirection?: "asc" | "desc";
}

// ═══════════════════════════════════════════════════════════════════════════
// User profile
// ═══════════════════════════════════════════════════════════════════════════

export interface UserProfile {
  /** User ID */
  userId: string;
  /** Total memory count for this user */
  memoryCount: number;
  /** Scopes used by this user */
  scopes: string[];
  /** Most used tags */
  topTags: Array<{ tag: string; count: number }>;
  /** Most active sources */
  topSources: Array<{ source: string; count: number }>;
  /** ISO 8601 timestamp of earliest memory */
  firstMemoryAt: string | null;
  /** ISO 8601 timestamp of most recent memory */
  lastMemoryAt: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sync result
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncResult {
  /** Sync direction that was executed */
  direction: "push" | "pull" | "both";
  /** Number of memories pushed to remote */
  pushed: number;
  /** Number of memories pulled from remote */
  pulled: number;
  /** Number of conflicts detected */
  conflicts: number;
  /** Number of errors during sync */
  errors: number;
  /** ISO 8601 timestamp of sync completion */
  completedAt: string;
  /** Error details if any */
  errorDetails?: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// MemoryProvider interface
// ═══════════════════════════════════════════════════════════════════════════

export interface MemoryProvider {
  /** Human-readable provider name (e.g. "local-sqlite", "supermemory") */
  readonly name: string;

  /** Provider type for registry classification */
  readonly type: ProviderType;

  // ── Lifecycle ──────────────────────────────────────────────────────────

  /** Initialize connection to the provider backend */
  connect(config: ProviderConfig): Promise<void>;

  /** Gracefully disconnect from the provider backend */
  disconnect(): Promise<void>;

  /** Check if the provider is currently connected and operational */
  isConnected(): boolean;

  // ── CRUD ───────────────────────────────────────────────────────────────

  /** Store a new memory. Returns the generated memory ID. */
  store(memory: MemoryInput): Promise<string>;

  /** Update an existing memory by ID. */
  update(id: string, memory: MemoryInput): Promise<void>;

  /** Delete a memory by ID. */
  delete(id: string): Promise<void>;

  // ── Retrieval ──────────────────────────────────────────────────────────

  /** Semantic/keyword recall — search memories by natural language query. */
  recall(query: string, options?: RecallOptions): Promise<Memory[]>;

  /** Get a single memory by ID. Returns null if not found. */
  get(id: string): Promise<Memory | null>;

  /** List memories with filtering and pagination. */
  list(options?: ListOptions): Promise<Memory[]>;

  // ── Relations ──────────────────────────────────────────────────────────

  /** Create a directed relation between two memories. */
  relate(
    fromId: string,
    toId: string,
    relation: MemoryRelation,
  ): Promise<void>;

  // ── Profile ────────────────────────────────────────────────────────────

  /** Get aggregated profile for a user. Uses provider config userId if omitted. */
  getProfile(userId?: string): Promise<UserProfile | null>;

  // ── Sync ───────────────────────────────────────────────────────────────

  /** Synchronize memories with a remote backend. */
  sync(direction: "push" | "pull" | "both"): Promise<SyncResult>;
}
