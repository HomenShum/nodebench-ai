/**
 * otelReceiver.ts — OpenTelemetry trace receiver for NodeBench.
 *
 * Accepts POST /v1/traces with OTLP JSON format.
 * Extracts tool execution spans and forwards to the unified event collector.
 *
 * Usage: Set OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:6276/v1/traces
 * in any OTel-instrumented agent framework.
 */

import { logOtelSpan } from "./eventCollector.js";

interface OtelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes?: Array<{ key: string; value: { stringValue?: string; intValue?: string } }>;
  status?: { code?: number };
}

function parseAttributes(attrs?: OtelSpan["attributes"]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!attrs) return result;
  for (const a of attrs) {
    result[a.key] = a.value?.stringValue ?? (a.value?.intValue ? Number(a.value.intValue) : undefined);
  }
  return result;
}

/**
 * Process an OTLP JSON traces payload.
 * Extracts tool execution spans and logs them.
 */
export function processOtelPayload(body: any): { spansProcessed: number; eventsLogged: number } {
  let spansProcessed = 0;
  let eventsLogged = 0;

  const resourceSpans = body?.resourceSpans ?? [];
  for (const rs of resourceSpans) {
    const scopeSpans = rs?.scopeSpans ?? [];
    for (const ss of scopeSpans) {
      const spans = ss?.spans ?? [];
      for (const span of spans as OtelSpan[]) {
        spansProcessed++;
        const attrs = parseAttributes(span.attributes);
        const name = span.name ?? "";

        // Only log tool execution spans (not HTTP, not internal framework spans)
        const isToolSpan = name.includes("execute_tool") ||
          name.includes("tool_call") ||
          attrs["gen_ai.operation.name"] === "execute_tool" ||
          attrs["openai.tool_name"] ||
          attrs["langchain.tool.name"];

        if (!isToolSpan) continue;

        const toolName = (attrs["openai.tool_name"] ?? attrs["langchain.tool.name"] ?? attrs["tool.name"] ?? name) as string;
        const startMs = Number(BigInt(span.startTimeUnixNano) / BigInt(1_000_000));
        const endMs = Number(BigInt(span.endTimeUnixNano) / BigInt(1_000_000));

        logOtelSpan({
          traceId: span.traceId,
          spanId: span.spanId,
          parentSpanId: span.parentSpanId,
          toolName,
          startTimeMs: startMs,
          endTimeMs: endMs,
          attributes: attrs,
        });
        eventsLogged++;
      }
    }
  }

  return { spansProcessed, eventsLogged };
}
