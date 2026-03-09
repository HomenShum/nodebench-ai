import type { Request, Response, NextFunction } from "express";

// ── Types ──────────────────────────────────────────────────────────────────

interface RequestSpan {
  traceId: string;
  spanId: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  statusCode?: number;
  clientId?: string;
  method: string;
  path: string;
  attributes: Record<string, string | number | boolean>;
}

// ── Span Storage (ring buffer — in production: export to OTel collector) ────

const MAX_SPANS = 1000;
const spanBuffer: RequestSpan[] = new Array(MAX_SPANS);
let spanHead = 0;
let spanCount = 0;

function pushSpan(span: RequestSpan) {
  spanBuffer[spanHead] = span;
  spanHead = (spanHead + 1) % MAX_SPANS;
  if (spanCount < MAX_SPANS) spanCount++;
}

export function getRecentSpans(limit = 100): RequestSpan[] {
  const n = Math.min(limit, spanCount);
  const result: RequestSpan[] = [];
  // Read from newest to oldest
  for (let i = 0; i < n; i++) {
    const idx = (spanHead - 1 - i + MAX_SPANS) % MAX_SPANS;
    result.push(spanBuffer[idx]);
  }
  return result.reverse();
}

// ── Metrics ────────────────────────────────────────────────────────────────

const MAX_ROUTE_KEYS = 200;
const MAX_CLIENT_KEYS = 5000;

const metrics = {
  totalRequests: 0,
  totalErrors: 0,
  totalDurationMs: 0,
  byRoute: new Map<string, { count: number; totalMs: number; errors: number }>(),
  byClient: new Map<string, { count: number; totalMs: number }>(),
};

export function getMetrics() {
  return {
    totalRequests: metrics.totalRequests,
    totalErrors: metrics.totalErrors,
    avgDurationMs:
      metrics.totalRequests > 0
        ? Math.round(metrics.totalDurationMs / metrics.totalRequests)
        : 0,
    byRoute: Object.fromEntries(metrics.byRoute),
    byClient: Object.fromEntries(metrics.byClient),
  };
}

// ── Middleware ──────────────────────────────────────────────────────────────

export function telemetryMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  const requestId = req.requestId || "unknown";

  // Generate span IDs (simplified — production: use W3C trace context)
  const traceId = requestId;
  const spanId = `span-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  const span: RequestSpan = {
    traceId,
    spanId,
    operationName: `${req.method} ${req.path}`,
    startTime,
    method: req.method,
    path: req.path,
    clientId: req.clientId,
    attributes: {},
  };

  // Add request attributes
  if (req.clientOrg) {
    span.attributes["client.org"] = req.clientOrg;
  }
  const contentLength = req.headers["content-length"];
  if (contentLength) {
    span.attributes["http.request.content_length"] = parseInt(contentLength, 10);
  }

  // Capture response
  const originalEnd = res.end.bind(res);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (res as any).end = function (...args: unknown[]) {
    const endTime = Date.now();
    const durationMs = endTime - startTime;

    span.endTime = endTime;
    span.durationMs = durationMs;
    span.statusCode = res.statusCode;
    span.attributes["http.status_code"] = res.statusCode;

    // Store span
    pushSpan(span);

    // Update metrics
    metrics.totalRequests++;
    metrics.totalDurationMs += durationMs;
    if (res.statusCode >= 400) {
      metrics.totalErrors++;
    }

    const routeKey = `${req.method} ${req.route?.path || req.path}`;
    const routeMetric = metrics.byRoute.get(routeKey);
    if (routeMetric) {
      routeMetric.count++;
      routeMetric.totalMs += durationMs;
      if (res.statusCode >= 400) routeMetric.errors++;
    } else if (metrics.byRoute.size < MAX_ROUTE_KEYS) {
      metrics.byRoute.set(routeKey, {
        count: 1,
        totalMs: durationMs,
        errors: res.statusCode >= 400 ? 1 : 0,
      });
    }

    if (req.clientId) {
      const clientMetric = metrics.byClient.get(req.clientId);
      if (clientMetric) {
        clientMetric.count++;
        clientMetric.totalMs += durationMs;
      } else if (metrics.byClient.size < MAX_CLIENT_KEYS) {
        metrics.byClient.set(req.clientId, { count: 1, totalMs: durationMs });
      }
    }

    // Log
    const level = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    const logFn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    logFn(
      `[${level}] ${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`,
      `client=${req.clientId || "anon"}`,
      `trace=${traceId}`
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalEnd as any)(...args);
  };

  next();
}
