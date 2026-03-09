import { createHash } from "node:crypto";

interface ReplaySpanEvent {
  name: "tool.input" | "tool.output" | "agent.monologue";
  time_unix_nano: number;
  attributes: {
    "payload.json": string;
    "payload.cas_hash": string;
  };
}

export interface ReplaySpan {
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  name: string;
  start_time_unix_nano: number;
  end_time_unix_nano: number;
  status: {
    code: 0 | 1 | 2;
    message?: string;
  };
  attributes: Record<string, string | number | boolean | undefined>;
  events: ReplaySpanEvent[];
}

export interface ReplayManifest {
  replayId: string;
  traceId: string;
  query: string;
  createdAt: string;
  responseSnapshotHash: string;
  sourceSnapshotHashes: string[];
  rootObject: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  spans: ReplaySpan[];
  notes: string[];
}

const MAX_REPLAY_ENTRIES = 1000;
const replayStore = new Map<string, ReplayManifest>();

function evictOldest() {
  if (replayStore.size <= MAX_REPLAY_ENTRIES) return;
  // Map iterates in insertion order — first key is oldest
  const oldest = replayStore.keys().next().value;
  if (oldest !== undefined) replayStore.delete(oldest);
}

function unixNanoFromIso(iso: string) {
  return Date.parse(iso) * 1_000_000;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableStringify).join(",") + "]";
  const sorted = Object.keys(value as Record<string, unknown>).sort();
  return "{" + sorted.map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k])).join(",") + "}";
}

function casHash(value: unknown) {
  const serialized = stableStringify(value);
  return createHash("sha256").update(serialized, "utf8").digest("hex");
}

function makeEvent(
  name: ReplaySpanEvent["name"],
  payload: unknown,
  timestamp: number
): ReplaySpanEvent {
  const payloadJson = JSON.stringify(payload);
  return {
    name,
    time_unix_nano: timestamp,
    attributes: {
      "payload.json": payloadJson,
      "payload.cas_hash": createHash("sha256").update(payloadJson, "utf8").digest("hex"),
    },
  };
}

function spanIdFrom(seed: string) {
  return createHash("sha256").update(seed, "utf8").digest("hex").slice(0, 16);
}

export function buildEnterpriseReplayManifest(args: {
  traceId: string;
  query: string;
  generatedAt: string;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  sourceSnapshotHashes: string[];
  searchTelemetry: {
    totalTimeMs: number;
    sourcesQueried: string[];
    timing: Record<string, number>;
  };
  fetchedDocuments: Array<{
    finalUrl: string;
    snapshotHash?: string;
    requestId: string;
    citations: Array<{ id: string; snapshotHash?: string }>;
  }>;
}): ReplayManifest {
  const createdAt = args.generatedAt;
  const baseTime = unixNanoFromIso(createdAt);
  const rootSpanId = spanIdFrom(`${args.traceId}:root`);
  let cursor = baseTime;

  const spans: ReplaySpan[] = [];

  spans.push({
    trace_id: args.traceId,
    span_id: rootSpanId,
    name: "api-headless.enterprise_investigation",
    start_time_unix_nano: cursor,
    end_time_unix_nano: cursor + args.searchTelemetry.totalTimeMs * 1_000_000,
    status: { code: 1 },
    attributes: {
      "agent.id": "api_headless_orchestrator",
      "mcp.server.name": "api-headless",
      "mcp.tool.name": "enterpriseInvestigation",
      "mcp.tool.authorized": true,
      "metric.latency_ms": args.searchTelemetry.totalTimeMs,
      "state.ui_snapshot_hash": undefined,
      "state.env_hash": undefined,
    },
    events: [
      makeEvent("tool.input", args.request, cursor),
      makeEvent("tool.output", { responseSnapshotHash: casHash(args.response) }, cursor + 1),
    ],
  });

  cursor += 1_000_000;

  const searchSpanId = spanIdFrom(`${args.traceId}:search`);
  spans.push({
    trace_id: args.traceId,
    span_id: searchSpanId,
    parent_span_id: rootSpanId,
    name: "convex.search.fusionSearch",
    start_time_unix_nano: cursor,
    end_time_unix_nano: cursor + args.searchTelemetry.totalTimeMs * 1_000_000,
    status: { code: 1 },
    attributes: {
      "agent.id": "api_headless_orchestrator",
      "mcp.server.name": "convex",
      "mcp.tool.name": "domains.search.fusion.actions.fusionSearch",
      "mcp.tool.authorized": true,
      "metric.latency_ms": args.searchTelemetry.totalTimeMs,
    },
    events: [
      makeEvent("agent.monologue", { note: "Resolve grounded sources before temporal synthesis." }, cursor),
      makeEvent("tool.input", { query: args.query }, cursor + 1),
      makeEvent(
        "tool.output",
        {
          sourcesQueried: args.searchTelemetry.sourcesQueried,
          perSourceLatencyMs: args.searchTelemetry.timing,
        },
        cursor + 2
      ),
    ],
  });

  let fetchIndex = 0;
  for (const document of args.fetchedDocuments) {
    const fetchSpanStart = cursor + (fetchIndex + 1) * 1_000_000;
    spans.push({
      trace_id: args.traceId,
      span_id: spanIdFrom(`${args.traceId}:fetch:${fetchIndex}`),
      parent_span_id: rootSpanId,
      name: "api-headless.fetchUrlDocument",
      start_time_unix_nano: fetchSpanStart,
      end_time_unix_nano: fetchSpanStart + 5_000_000,
      status: { code: 1 },
      attributes: {
        "agent.id": "api_headless_orchestrator",
        "mcp.server.name": "api-headless",
        "mcp.tool.name": "fetchUrlDocument",
        "mcp.tool.authorized": true,
        "metric.latency_ms": 5,
        "state.ui_snapshot_hash": document.snapshotHash,
      },
      events: [
        makeEvent("tool.input", { url: document.finalUrl, requestId: document.requestId }, fetchSpanStart),
        makeEvent(
          "tool.output",
          {
            finalUrl: document.finalUrl,
            snapshotHash: document.snapshotHash,
            citationIds: document.citations.map((citation) => citation.id),
          },
          fetchSpanStart + 1
        ),
      ],
    });
    fetchIndex += 1;
  }

  const replayId = args.traceId;
  const responseSnapshotHash = casHash(args.response);

  return {
    replayId,
    traceId: args.traceId,
    query: args.query,
    createdAt,
    responseSnapshotHash,
    sourceSnapshotHashes: args.sourceSnapshotHashes,
    rootObject: String((args.response as { object?: string }).object ?? "enterprise_investigation"),
    request: args.request,
    response: args.response,
    spans,
    notes: [
      "This replay manifest is deterministic only for captured tool outputs and source snapshot hashes.",
      "Live external systems are not re-executed during replay; use stored output events instead.",
    ],
  };
}

export function registerReplayManifest(manifest: ReplayManifest) {
  replayStore.set(manifest.replayId, manifest);
  evictOldest();
  return manifest;
}

export function getReplayManifest(replayId: string) {
  return replayStore.get(replayId);
}

export function listReplayManifests(limit = 20) {
  // Map iterates in insertion order (oldest first); reverse for newest-first
  const all = [...replayStore.values()];
  const result: ReplayManifest[] = [];
  for (let i = all.length - 1; i >= 0 && result.length < limit; i--) {
    result.push(all[i]);
  }
  return result;
}

export function clearReplayManifests() {
  replayStore.clear();
}
