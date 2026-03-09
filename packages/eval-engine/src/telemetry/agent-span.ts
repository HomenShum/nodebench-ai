import { createHash, randomBytes } from "node:crypto";

import type { AgentToolSpan, AgentToolSpanEvent } from "../types.js";

function hexId(bytes: number) {
  return randomBytes(bytes).toString("hex");
}

function nowUnixNano() {
  return Date.now() * 1_000_000;
}

function casHash(value: unknown) {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(json, "utf8").digest("hex");
}

function makeEvent(
  name: AgentToolSpanEvent["name"],
  payload: unknown
): AgentToolSpanEvent {
  const serialized = typeof payload === "string" ? payload : JSON.stringify(payload);
  return {
    name,
    time_unix_nano: nowUnixNano(),
    attributes: {
      "payload.json": serialized,
      "payload.cas_hash": casHash(serialized),
    },
  };
}

export function createAgentToolSpan(args: {
  traceId?: string;
  parentSpanId?: string;
  agentId: string;
  model?: string;
  serverName: string;
  toolName: string;
  authorized: boolean;
  temporalSignalKey?: string;
  uiSnapshotHash?: string;
  envHash?: string;
  costUsd?: number;
  monologue?: unknown;
  input?: unknown;
}): AgentToolSpan {
  const start = nowUnixNano();
  const span: AgentToolSpan = {
    trace_id: args.traceId ?? hexId(16),
    span_id: hexId(8),
    parent_span_id: args.parentSpanId,
    name: `${args.serverName}.${args.toolName}`,
    start_time_unix_nano: start,
    end_time_unix_nano: start,
    status: {
      code: 0,
    },
    attributes: {
      "agent.id": args.agentId,
      "gen_ai.system": args.model,
      "mcp.server.name": args.serverName,
      "mcp.tool.name": args.toolName,
      "mcp.tool.authorized": args.authorized,
      "metric.latency_ms": 0,
      "metric.cost_usd": args.costUsd,
      "temporal.signal_key": args.temporalSignalKey,
      "state.ui_snapshot_hash": args.uiSnapshotHash,
      "state.env_hash": args.envHash,
    },
    events: [],
  };

  if (args.monologue !== undefined) {
    span.events.push(makeEvent("agent.monologue", args.monologue));
  }
  if (args.input !== undefined) {
    span.events.push(makeEvent("tool.input", args.input));
  }

  return span;
}

export function completeAgentToolSpan(
  span: AgentToolSpan,
  args: {
    output?: unknown;
    error?: string;
    latencyMs?: number;
    costUsd?: number;
  }
) {
  span.end_time_unix_nano = nowUnixNano();
  span.attributes["metric.latency_ms"] =
    args.latencyMs ??
    Math.max(0, Math.round((span.end_time_unix_nano - span.start_time_unix_nano) / 1_000_000));

  if (typeof args.costUsd === "number") {
    span.attributes["metric.cost_usd"] = args.costUsd;
  }

  if (args.output !== undefined) {
    span.events.push(makeEvent("tool.output", args.output));
  }

  span.status =
    typeof args.error === "string" && args.error.length > 0
      ? { code: 2, message: args.error }
      : { code: 1 };

  return span;
}

export async function instrumentAgentToolExecution<T>(args: {
  traceId?: string;
  parentSpanId?: string;
  agentId: string;
  model?: string;
  serverName: string;
  toolName: string;
  authorized: boolean;
  temporalSignalKey?: string;
  uiSnapshotHash?: string;
  envHash?: string;
  monologue?: unknown;
  input?: unknown;
  costUsd?: number;
  execute: () => Promise<T>;
}) {
  const span = createAgentToolSpan(args);
  const startedAt = Date.now();

  try {
    const output = await args.execute();
    completeAgentToolSpan(span, {
      output,
      latencyMs: Date.now() - startedAt,
      costUsd: args.costUsd,
    });
    return { span, output };
  } catch (error) {
    completeAgentToolSpan(span, {
      error: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
      costUsd: args.costUsd,
    });
    throw error;
  }
}

export function exportAgentToolSpan(span: AgentToolSpan) {
  return {
    trace_id: span.trace_id,
    span_id: span.span_id,
    parent_span_id: span.parent_span_id,
    name: span.name,
    start_time_unix_nano: span.start_time_unix_nano,
    end_time_unix_nano: span.end_time_unix_nano,
    status: span.status,
    attributes: span.attributes,
    events: span.events,
  };
}
