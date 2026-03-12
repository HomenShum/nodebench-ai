/**
 * OpenTelemetry-compatible trace builder.
 * Lightweight — no OTel SDK dependency, produces compatible JSON for export.
 */
import type { Span, Trace, SpanEvent } from "../types.js";
import { randomBytes } from "node:crypto";

// ── ID generation ────────────────────────────────────────────────────

function generateId(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

function traceId(): string {
  return generateId(16); // 32 hex chars
}

function spanId(): string {
  return generateId(8); // 16 hex chars
}

// ── Trace operations ─────────────────────────────────────────────────

/**
 * Create a new trace with a root span.
 */
export function createTrace(name: string): Trace {
  const trace: Trace = {
    traceId: traceId(),
    spans: [],
  };
  // Auto-create root span
  startSpan(trace, name);
  return trace;
}

/**
 * Start a new span within a trace.
 * If parentSpanId is omitted and the trace has spans, the last span is used as parent.
 */
export function startSpan(
  trace: Trace,
  name: string,
  parentSpanId?: string,
): Span {
  const span: Span = {
    spanId: spanId(),
    parentSpanId,
    name,
    startTime: Date.now(),
    attributes: {},
    events: [],
    status: "unset",
  };
  trace.spans.push(span);
  return span;
}

/**
 * End a span, setting its end time and status.
 */
export function endSpan(
  span: Span,
  status: Span["status"] = "ok",
): void {
  span.endTime = Date.now();
  span.status = status;
}

/**
 * Add an event to a span (equivalent to OTel span events / logs).
 */
export function addEvent(
  span: Span,
  name: string,
  attributes?: Record<string, unknown>,
): void {
  const event: SpanEvent = {
    name,
    timestamp: Date.now(),
    attributes,
  };
  span.events.push(event);
}

/**
 * Set an attribute on a span.
 */
export function setAttribute(
  span: Span,
  key: string,
  value: string | number | boolean,
): void {
  span.attributes[key] = value;
}

/**
 * Set cost/token totals on the trace.
 */
export function setTraceCost(
  trace: Trace,
  totalCost: number,
  totalTokens: number,
): void {
  trace.totalCost = totalCost;
  trace.totalTokens = totalTokens;
}

// ── Export ────────────────────────────────────────────────────────────

/**
 * Export trace as OTel-compatible JSON (OTLP format).
 * Can be sent to any OTel collector or stored as-is.
 */
export function exportTrace(trace: Trace): object {
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "eval-engine" } },
            { key: "service.version", value: { stringValue: "0.1.0" } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "@nodebench-os/eval-engine" },
            spans: trace.spans.map((span) => ({
              traceId: trace.traceId,
              spanId: span.spanId,
              parentSpanId: span.parentSpanId ?? "",
              name: span.name,
              kind: 1, // SPAN_KIND_INTERNAL
              startTimeUnixNano: (span.startTime * 1_000_000).toString(),
              endTimeUnixNano: span.endTime
                ? (span.endTime * 1_000_000).toString()
                : undefined,
              attributes: Object.entries(span.attributes).map(
                ([key, value]) => ({
                  key,
                  value:
                    typeof value === "string"
                      ? { stringValue: value }
                      : typeof value === "number"
                        ? Number.isInteger(value)
                          ? { intValue: value.toString() }
                          : { doubleValue: value }
                        : { boolValue: value },
                }),
              ),
              events: span.events.map((e) => ({
                name: e.name,
                timeUnixNano: (e.timestamp * 1_000_000).toString(),
                attributes: e.attributes
                  ? Object.entries(e.attributes).map(([k, v]) => ({
                      key: k,
                      value: { stringValue: String(v) },
                    }))
                  : [],
              })),
              status: {
                code:
                  span.status === "ok"
                    ? 1
                    : span.status === "error"
                      ? 2
                      : 0,
              },
            })),
          },
        ],
      },
    ],
    // Non-standard extension: cost metadata
    ...(trace.totalCost !== undefined && {
      costMetadata: {
        totalCostUsd: trace.totalCost,
        totalTokens: trace.totalTokens,
      },
    }),
  };
}
