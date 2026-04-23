/**
 * LangSmith-compatible span emission for api-headless routes.
 *
 * Canonical implementation lives at shared/research/tracing.ts; this is a
 * local mirror scoped under src/ so the package tsconfig (rootDir: "src")
 * can build without touching the rest of the repo layout. Keep in sync
 * with the canonical file — both emit the same wire format and the same
 * HONEST_STATUS no-op behavior when LANGSMITH_API_KEY is unset.
 */

export interface SpanMetadata {
  name: string;
  traceId?: string;
  parentRunId?: string;
  inputs?: Record<string, unknown>;
  tags?: string[];
  metadata?: Record<string, unknown>;
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
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    // Swallow — telemetry MUST NOT break the request path.
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

export async function traceSpan<T>(
  meta: SpanMetadata,
  fn: () => Promise<T>,
): Promise<T> {
  if (!tracingEnabled()) return fn();
  const id = uuid();
  const traceId = meta.traceId ?? id;
  const startedAt = Date.now();
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
  try {
    const result = await fn();
    void patchRun(id, {
      end_time: new Date().toISOString(),
      outputs: { durationMs: Date.now() - startedAt },
    });
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    void patchRun(id, {
      end_time: new Date().toISOString(),
      error: message,
    });
    throw err;
  }
}

/** Canonical span names duplicated here (see shared/research/spanNames.ts). */
export const SPAN_RESOURCE_EXPAND = "nb.resource_expand";
export const SPAN_ROOT_SELECTION = "nb.root_selection";
export const SPAN_LENS_SELECTION = "nb.lens_selection";
export const SPAN_ENTITY_HYDRATION = "nb.entity_hydration";
export const SPAN_ANGLE_EXECUTION = "nb.angle_execution";
export const SPAN_CARD_EMISSION = "nb.card_emission";
export const SPAN_EVIDENCE_EMISSION = "nb.evidence_emission";
export const SPAN_ANSWER_STREAM = "nb.answer_stream";
