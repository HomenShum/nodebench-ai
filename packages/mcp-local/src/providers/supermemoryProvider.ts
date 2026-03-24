/**
 * SupermemoryProvider — Cloud-backed MemoryProvider using the Supermemory REST API.
 *
 * Authenticates via Bearer token, supports project scoping via x-sm-project header.
 * All data lives in Supermemory's cloud — sync() is a no-op since it's cloud-native.
 *
 * API base: https://api.supermemory.com/v3
 */

import type {
  MemoryProvider,
  ProviderConfig,
  MemoryInput,
  Memory,
  MemoryRelation,
  RecallOptions,
  ListOptions,
  UserProfile,
  SyncResult,
} from "./memoryProvider.js";

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_BASE_URL = "https://api.supermemory.com/v3";
const REQUEST_TIMEOUT_MS = 30_000;

// ═══════════════════════════════════════════════════════════════════════════
// Error types
// ═══════════════════════════════════════════════════════════════════════════

export class SupermemoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string,
  ) {
    super(message);
    this.name = "SupermemoryError";
  }
}

export class SupermemoryAuthError extends SupermemoryError {
  constructor(message = "Supermemory authentication failed — check your API key") {
    super(message, 401);
    this.name = "SupermemoryAuthError";
  }
}

export class SupermemoryRateLimitError extends SupermemoryError {
  constructor(
    public readonly retryAfterMs?: number,
  ) {
    super("Supermemory rate limit exceeded — retry later", 429);
    this.name = "SupermemoryRateLimitError";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Response shapes (from Supermemory API)
// ═══════════════════════════════════════════════════════════════════════════

/** TODO: Verify exact response shapes against live Supermemory API docs */
interface SmMemoryResponse {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface SmSearchResult {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
  score?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface SmSearchResponse {
  results: SmSearchResult[];
  /** TODO: Verify if Supermemory returns total count */
  total?: number;
}

interface SmListResponse {
  memories: SmMemoryResponse[];
  /** TODO: Verify pagination shape — may use cursor instead of offset */
  total?: number;
  hasMore?: boolean;
}

interface SmProfileResponse {
  userId: string;
  memoryCount: number;
  /** TODO: Verify exact profile fields returned by Supermemory */
  scopes?: string[];
  topTags?: Array<{ tag: string; count: number }>;
  topSources?: Array<{ source: string; count: number }>;
  firstMemoryAt?: string | null;
  lastMemoryAt?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SupermemoryProvider
// ═══════════════════════════════════════════════════════════════════════════

export class SupermemoryProvider implements MemoryProvider {
  readonly name = "supermemory";
  readonly type = "supermemory" as const;

  private config: ProviderConfig = {};
  private connected = false;
  private baseUrl = DEFAULT_BASE_URL;
  private apiKey = "";
  private projectId?: string;

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async connect(config: ProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new SupermemoryError(
        "SupermemoryProvider requires an apiKey in ProviderConfig",
      );
    }
    this.config = config;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
    this.projectId = (config.options?.projectId as string) ?? undefined;

    // Validate connectivity with a lightweight request
    try {
      // TODO: Verify health/ping endpoint — may be GET /health or GET /me
      await this.request("GET", "/memories", { params: { limit: "1" } });
      this.connected = true;
    } catch (err) {
      if (err instanceof SupermemoryAuthError) {
        throw err;
      }
      // Network errors during connect — mark as connected anyway since
      // the config is valid; individual calls will surface errors.
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.apiKey = "";
    this.projectId = undefined;
  }

  isConnected(): boolean {
    return this.connected && this.apiKey.length > 0;
  }

  private ensureConnected(): void {
    if (!this.connected || !this.apiKey) {
      throw new SupermemoryError(
        "SupermemoryProvider is not connected — call connect() first",
      );
    }
  }

  // ── HTTP Layer ─────────────────────────────────────────────────────────

  private async request<T = unknown>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string>;
    },
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;

    // Append query params
    if (options?.params) {
      const qs = new URLSearchParams(options.params).toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (this.projectId) {
      headers["x-sm-project"] = this.projectId;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new SupermemoryAuthError();
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After");
        const retryMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
        throw new SupermemoryRateLimitError(retryMs);
      }

      if (response.status === 404) {
        return null as T;
      }

      if (!response.ok) {
        const bodyText = await response.text().catch(() => "");
        throw new SupermemoryError(
          `Supermemory API error: ${response.status} ${response.statusText}`,
          response.status,
          bodyText,
        );
      }

      // 204 No Content — common for DELETE/PUT
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof SupermemoryError) throw err;

      if (err instanceof DOMException && err.name === "AbortError") {
        throw new SupermemoryError(
          `Supermemory request timed out after ${REQUEST_TIMEOUT_MS}ms: ${method} ${path}`,
        );
      }

      throw new SupermemoryError(
        `Supermemory network error: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────────

  async store(memory: MemoryInput): Promise<string> {
    this.ensureConnected();
    const userId = memory.userId ?? this.config.userId ?? "default";

    /** TODO: Verify exact POST /memories request body shape */
    const body = {
      content: memory.content,
      metadata: {
        ...(memory.metadata ?? {}),
        scope: memory.scope ?? "general",
        tags: memory.tags ?? [],
        source: memory.source ?? "",
        userId,
        ...(memory.timestamp ? { timestamp: memory.timestamp } : {}),
      },
    };

    const result = await this.request<SmMemoryResponse>("POST", "/memories", { body });
    return result.id;
  }

  async update(id: string, memory: MemoryInput): Promise<void> {
    this.ensureConnected();

    /** TODO: Verify PUT /memories/:id request body shape */
    const body = {
      content: memory.content,
      metadata: {
        ...(memory.metadata ?? {}),
        scope: memory.scope ?? "general",
        tags: memory.tags ?? [],
        source: memory.source ?? "",
      },
    };

    const result = await this.request<SmMemoryResponse | null>(
      "PUT",
      `/memories/${encodeURIComponent(id)}`,
      { body },
    );

    if (result === null) {
      throw new SupermemoryError(`Memory not found: ${id}`, 404);
    }
  }

  async delete(id: string): Promise<void> {
    this.ensureConnected();

    await this.request("DELETE", `/memories/${encodeURIComponent(id)}`);
  }

  // ── Retrieval ──────────────────────────────────────────────────────────

  async recall(query: string, options?: RecallOptions): Promise<Memory[]> {
    this.ensureConnected();

    if (!query.trim()) return [];

    const userId = options?.userId ?? this.config.userId;

    /** TODO: Verify POST /search request body — may use "q" or "query" field */
    const body: Record<string, unknown> = {
      query,
      limit: options?.limit ?? 10,
    };

    // Build filters object
    const filters: Record<string, unknown> = {};
    if (options?.scope) filters.scope = options.scope;
    if (options?.source) filters.source = options.source;
    if (userId) filters.userId = userId;
    if (options?.tags?.length) filters.tags = options.tags;
    if (options?.after) filters.after = options.after;
    if (options?.before) filters.before = options.before;
    if (options?.minScore !== undefined) filters.minScore = options.minScore;

    if (Object.keys(filters).length > 0) {
      body.filters = filters;
    }

    const response = await this.request<SmSearchResponse>("POST", "/search", { body });

    if (!response?.results) return [];

    return response.results.map((r) => this.searchResultToMemory(r));
  }

  async get(id: string): Promise<Memory | null> {
    this.ensureConnected();

    const result = await this.request<SmMemoryResponse | null>(
      "GET",
      `/memories/${encodeURIComponent(id)}`,
    );

    if (!result) return null;

    return this.apiMemoryToMemory(result);
  }

  async list(options?: ListOptions): Promise<Memory[]> {
    this.ensureConnected();

    const params: Record<string, string> = {};
    params.limit = String(options?.limit ?? 50);
    if (options?.offset) params.offset = String(options.offset);
    if (options?.orderBy) params.orderBy = options.orderBy;
    if (options?.orderDirection) params.orderDirection = options.orderDirection;

    // Filters as query params
    const userId = options?.userId ?? this.config.userId;
    if (options?.scope) params.scope = options.scope;
    if (options?.source) params.source = options.source;
    if (userId) params.userId = userId;
    if (options?.tags?.length) params.tags = options.tags.join(",");

    /** TODO: Verify GET /memories query param names — may differ from this mapping */
    const response = await this.request<SmListResponse>("GET", "/memories", { params });

    if (!response?.memories) return [];

    let results = response.memories.map((m) => this.apiMemoryToMemory(m));

    // Post-filter by tags if the API doesn't support tag filtering natively
    if (options?.tags?.length) {
      const tagSet = new Set(options.tags);
      results = results.filter((m) => m.tags.some((t) => tagSet.has(t)));
    }

    return results;
  }

  // ── Relations ──────────────────────────────────────────────────────────

  async relate(
    fromId: string,
    toId: string,
    relation: MemoryRelation,
  ): Promise<void> {
    this.ensureConnected();

    /**
     * TODO: Verify if Supermemory has a native relations API.
     * If POST /memories/:id/relations exists, use it directly.
     * Fallback: store the relation as metadata on the source memory.
     */
    try {
      await this.request(
        "POST",
        `/memories/${encodeURIComponent(fromId)}/relations`,
        {
          body: {
            targetId: toId,
            type: relation.type,
            label: relation.label,
            confidence: relation.confidence ?? 1.0,
            metadata: relation.metadata ?? {},
          },
        },
      );
    } catch (err) {
      // If the relations endpoint doesn't exist (404 or 405), fall back to
      // storing the relation as metadata on the source memory.
      if (
        err instanceof SupermemoryError &&
        (err.statusCode === 404 || err.statusCode === 405)
      ) {
        const sourceMemory = await this.get(fromId);
        if (!sourceMemory) {
          throw new SupermemoryError(`Source memory not found: ${fromId}`, 404);
        }

        const existingRelations = (
          sourceMemory.metadata._relations as Array<Record<string, unknown>>
        ) ?? [];

        existingRelations.push({
          targetId: toId,
          type: relation.type,
          label: relation.label,
          confidence: relation.confidence ?? 1.0,
          metadata: relation.metadata ?? {},
          createdAt: new Date().toISOString(),
        });

        await this.update(fromId, {
          content: sourceMemory.content,
          metadata: {
            ...sourceMemory.metadata,
            _relations: existingRelations,
          },
          scope: sourceMemory.scope,
          tags: sourceMemory.tags,
          source: sourceMemory.source,
        });
        return;
      }
      throw err;
    }
  }

  // ── Profile ────────────────────────────────────────────────────────────

  async getProfile(userId?: string): Promise<UserProfile | null> {
    this.ensureConnected();
    const uid = userId ?? this.config.userId ?? "default";

    /** TODO: Verify profile endpoint — may be GET /profile, GET /users/me, or GET /users/:id/profile */
    try {
      const response = await this.request<SmProfileResponse | null>(
        "GET",
        "/profile",
        { params: { userId: uid } },
      );

      if (!response) return null;

      return {
        userId: response.userId ?? uid,
        memoryCount: response.memoryCount ?? 0,
        scopes: response.scopes ?? [],
        topTags: response.topTags ?? [],
        topSources: response.topSources ?? [],
        firstMemoryAt: response.firstMemoryAt ?? null,
        lastMemoryAt: response.lastMemoryAt ?? null,
      };
    } catch (err) {
      // If profile endpoint doesn't exist, build a basic profile from list
      if (
        err instanceof SupermemoryError &&
        (err.statusCode === 404 || err.statusCode === 405)
      ) {
        return this.buildProfileFromList(uid);
      }
      throw err;
    }
  }

  /**
   * Fallback: build a basic UserProfile by listing memories for the user.
   * Used when the API doesn't have a dedicated profile endpoint.
   */
  private async buildProfileFromList(userId: string): Promise<UserProfile | null> {
    const memories = await this.list({ userId, limit: 50, orderBy: "createdAt", orderDirection: "asc" });

    if (memories.length === 0) return null;

    const scopeSet = new Set<string>();
    const tagCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();

    for (const m of memories) {
      scopeSet.add(m.scope);
      for (const tag of m.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
      if (m.source) {
        sourceCounts.set(m.source, (sourceCounts.get(m.source) ?? 0) + 1);
      }
    }

    return {
      userId,
      memoryCount: memories.length,
      scopes: [...scopeSet],
      topTags: [...tagCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
      topSources: [...sourceCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([source, count]) => ({ source, count })),
      firstMemoryAt: memories[0]?.createdAt ?? null,
      lastMemoryAt: memories[memories.length - 1]?.createdAt ?? null,
    };
  }

  // ── Sync ───────────────────────────────────────────────────────────────

  async sync(direction: "push" | "pull" | "both"): Promise<SyncResult> {
    // Supermemory is cloud-native — all operations hit the API directly.
    // No local cache to sync. Return a no-op result.
    return {
      direction,
      pushed: 0,
      pulled: 0,
      conflicts: 0,
      errors: 0,
      completedAt: new Date().toISOString(),
    };
  }

  // ── Mapping helpers ────────────────────────────────────────────────────

  /**
   * Convert a Supermemory API memory response to the MemoryProvider Memory type.
   * Supermemory stores scope/tags/source inside metadata — we extract them.
   */
  private apiMemoryToMemory(m: SmMemoryResponse): Memory {
    const metadata = m.metadata ?? {};
    const scope = (metadata.scope as string) ?? "general";
    const tags = (metadata.tags as string[]) ?? [];
    const source = (metadata.source as string) ?? "";
    const userId = (metadata.userId as string) ?? this.config.userId ?? "default";

    // Remove our injected fields from metadata to keep it clean
    const cleanMeta = { ...metadata };
    delete cleanMeta.scope;
    delete cleanMeta.tags;
    delete cleanMeta.source;
    delete cleanMeta.userId;
    delete cleanMeta.timestamp;

    return {
      id: m.id,
      content: m.content,
      metadata: cleanMeta,
      scope,
      tags: Array.isArray(tags) ? tags : [],
      source,
      userId,
      createdAt: m.createdAt ?? new Date().toISOString(),
      updatedAt: m.updatedAt ?? m.createdAt ?? new Date().toISOString(),
    };
  }

  /**
   * Convert a Supermemory search result to a Memory with relevance score.
   */
  private searchResultToMemory(r: SmSearchResult): Memory {
    const base = this.apiMemoryToMemory(r);
    return {
      ...base,
      relevanceScore: r.score ?? undefined,
    };
  }
}
