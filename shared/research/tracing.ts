/**
 * LangSmith-compatible span emission via the public runs ingestion API.
 *
 * Why fetch instead of the langsmith SDK:
 *   - Works identically from Convex "use node" actions, api-headless (Express),
 *     and the MCP local process — no dep divergence across packages.
 *   - Stays no-op when LANGSMITH_API_KEY is absent (HONEST_STATUS: we never
 *     pretend to trace; the caller sees runId === null so telemetry is
 *     detectably off).
 *
 * Project is taken from LANGSMITH_PROJECT (falls back to "nodebench").
 * Endpoint from LANGSMITH_ENDPOINT (falls back to https://api.smith.langchain.com).
 */

export interface SpanMetadata {
  /** Canonical span name — use constants from shared/research/spanNames.ts. */
  name: string;
  /** Stable run-id threaded through the whole research run. */
  traceId?: string;
  /** Optional parent span id for nested hierarchies. */
  parentRunId?: string;
  /** Input payload logged with the span (kept small — don't dump whole docs). */
  inputs?: Record<string, unknown>;
  /** Free-form tags for filtering in LangSmith UI. */
  tags?: string[];
  /** Metadata — latency budgets, lens id, depth, etc. */
  metadata?: Record<string, unknown>;
  /** Run type — LangSmith uses these for filtering in the UI. */
  runType?: "chain" | "tool" | "llm" | "retriever" | "embedding";
}

interface RunPayload {
  id: string;
  trace_id: string;
  parent_run_id?: string;
  name: string;
  run_type: "chain" | "tool" | "llm" | "retriever" | "embedding";
  start_time: string;
  end_time?: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  session_name?: string;
  tags?: string[];
  extra?: Record<string, unknown>;
}

function env(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  const v = process.env?.[name];
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function tracingEnabled(): boolean {
  return Boolean(env("LANGSMITH_API_KEY"));
}

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122-style fallback — sufficient for trace IDs when crypto.randomUUID is absent.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function postRun(payload: RunPayload): Promise<void> {
  const apiKey = env("LANGSMITH_API_KEY");
  if (!apiKey) return;
  const endpoint =
    env("LANGSMITH_ENDPOINT") ?? "https://api.smith.langchain.com";
  try {
    await fetch(`${endpoint}/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      // 5s cap so tracing never blocks the research path.
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Swallow — telemetry failures MUST NOT break the research run.
    // Caller got its result already; this is pure side-channel.
  }
}

async function patchRun(
  id: string,
  patch: Partial<RunPayload>,
): Promise<void> {
  const apiKey = env("LANGSMITH_API_KEY");
  if (!apiKey) return;
  const endpoint =
    env("LANGSMITH_ENDPOINT") ?? "https://api.smith.langchain.com";
  try {
    await fetch(`${endpoint}/runs/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Same reasoning as postRun.
  }
}

export interface SpanHandle {
  id: string;
  traceId: string;
  startedAt: number;
}

/**
 * Open a span. Returns a handle the caller closes with `closeSpan`.
 * Use this when the span wraps multiple awaited steps — e.g. the top-level
 * runResearch action that needs to keep the span open across phases.
 */
export function startSpan(meta: SpanMetadata): SpanHandle | null {
  if (!tracingEnabled()) return null;
  const id = uuid();
  const traceId = meta.traceId ?? id;
  void postRun({
    id,
    trace_id: traceId,
    parent_run_id: meta.parentRunId,
    name: meta.name,
    run_type: meta.runType ?? "chain",
    start_time: new Date().toISOString(),
    inputs: meta.inputs ?? {},
    session_name: env("LANGSMITH_PROJECT") ?? "nodebench",
    tags: meta.tags,
    extra: meta.metadata,
  });
  return { id, traceId, startedAt: Date.now() };
}

/** Close a span opened by `startSpan`. Safe to call with `null`. */
export async function closeSpan(
  handle: SpanHandle | null,
  outcome: { outputs?: Record<string, unknown>; error?: string } = {},
): Promise<void> {
  if (!handle) return;
  await patchRun(handle.id, {
    end_time: new Date().toISOString(),
    outputs: outcome.outputs ?? {},
    error: outcome.error,
  });
}

/**
 * Convenience wrapper — opens + closes a span around an async function.
 * Use this for any self-contained step (expand query, compactFindings call).
 */
export async function traceSpan<T>(
  meta: SpanMetadata,
  fn: () => Promise<T>,
): Promise<T> {
  const handle = startSpan(meta);
  try {
    const result = await fn();
    await closeSpan(handle, {
      outputs: {
        durationMs: handle ? Date.now() - handle.startedAt : undefined,
      },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await closeSpan(handle, { error: message });
    throw err;
  }
}
