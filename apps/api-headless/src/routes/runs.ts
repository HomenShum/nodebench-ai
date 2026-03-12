import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { runCreateSchema, type RunEvent } from "../schemas/specDoc.js";
import { createRun, getRun, getRunEvents, cancelRun } from "../lib/convex-client.js";
import { getSinglePathValue } from "../lib/request-values.js";

const router = Router();

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err) => {
      if (!res.headersSent) {
        res.status(500).json({
          error: "internal_error",
          message: err instanceof Error ? err.message : "Unexpected error",
          requestId: req.requestId,
        });
      }
    });
  };
}

// ── In-memory run store (fallback) ─────────────────────────────────────────

interface InMemoryRun {
  runId: string;
  specKey: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  environment: string;
  config: Record<string, unknown>;
  clientId?: string;
  progress: { completed: number; total: number; failed: number };
  events: RunEvent[];
  startedAt: string;
  completedAt?: string;
}

const MAX_IN_MEMORY_RUNS = 500;
const inMemoryRuns = new Map<string, InMemoryRun>();

// ── SSE connections for live streaming ─────────────────────────────────────

const MAX_SSE_CONNECTIONS = 100;
const sseConnections = new Map<string, Set<Response>>();

function broadcastEvent(runId: string, event: RunEvent): void {
  const connections = sseConnections.get(runId);
  if (!connections) return;

  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of connections) {
    res.write(data);
  }
}

// ── POST /v1/runs — Start a verification run ──────────────────────────────

router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const parsed = runCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
    });
    return;
  }

  const convexResult = await createRun({
    specKey: parsed.data.specKey,
    environment: parsed.data.environment,
    config: parsed.data.config as Record<string, unknown> | undefined,
    clientId: req.clientId,
  });

  if (convexResult.ok && convexResult.data) {
    res.status(201).json(convexResult.data);
    return;
  }

  // Fallback: in-memory
  const runId = `run_${nanoid(16)}`;
  const now = new Date().toISOString();

  const run: InMemoryRun = {
    runId,
    specKey: parsed.data.specKey,
    status: "queued",
    environment: parsed.data.environment,
    config: (parsed.data.config as Record<string, unknown>) || {},
    clientId: req.clientId,
    progress: { completed: 0, total: 0, failed: 0 },
    events: [
      {
        eventId: `evt_${nanoid(10)}`,
        runId,
        type: "run_started",
        timestamp: now,
      },
    ],
    startedAt: now,
  };

  if (inMemoryRuns.size >= MAX_IN_MEMORY_RUNS) {
    const oldest = inMemoryRuns.keys().next().value;
    if (oldest !== undefined) inMemoryRuns.delete(oldest);
  }
  inMemoryRuns.set(runId, run);

  // Simulate async start
  setTimeout(() => {
    run.status = "running";
  }, 100);

  res.status(201).json({
    runId,
    status: run.status,
    specKey: run.specKey,
    environment: run.environment,
    startedAt: run.startedAt,
  });
}));

// ── GET /v1/runs/:runId — Get run status ──────────────────────────────────

router.get("/:runId", asyncHandler(async (req: Request, res: Response) => {
  const runId = getSinglePathValue(req.params.runId);
  if (!runId) {
    res.status(400).json({ error: "validation_error", message: "runId is required" });
    return;
  }

  const convexResult = await getRun(runId);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  const run = inMemoryRuns.get(runId);
  if (!run) {
    res.status(404).json({ error: "not_found", message: `Run ${runId} not found` });
    return;
  }

  res.json({
    runId: run.runId,
    specKey: run.specKey,
    status: run.status,
    environment: run.environment,
    progress: run.progress,
    events: run.events,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
  });
}));

// ── GET /v1/runs/:runId/events — SSE stream ───────────────────────────────

router.get("/:runId/events", asyncHandler(async (req: Request, res: Response) => {
  const runId = getSinglePathValue(req.params.runId);
  if (!runId) {
    res.status(400).json({ error: "validation_error", message: "runId is required" });
    return;
  }

  // Verify run exists
  const run = inMemoryRuns.get(runId);
  const convexResult = await getRun(runId);

  if (!run && !convexResult.ok) {
    res.status(404).json({ error: "not_found", message: `Run ${runId} not found` });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Send existing events
  const events = run?.events || [];
  for (const event of events) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Register for future events (with cap)
  if (!sseConnections.has(runId)) {
    if (sseConnections.size >= MAX_SSE_CONNECTIONS) {
      const oldestKey = sseConnections.keys().next().value;
      if (oldestKey !== undefined) sseConnections.delete(oldestKey);
    }
    sseConnections.set(runId, new Set());
  }
  sseConnections.get(runId)!.add(res);

  // Heartbeat
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    sseConnections.get(runId)?.delete(res);
    if (sseConnections.get(runId)?.size === 0) {
      sseConnections.delete(runId);
    }
  });
}));

// ── POST /v1/runs/:runId/cancel — Cancel a run ───────────────────────────

router.post("/:runId/cancel", asyncHandler(async (req: Request, res: Response) => {
  const runId = getSinglePathValue(req.params.runId);
  if (!runId) {
    res.status(400).json({ error: "validation_error", message: "runId is required" });
    return;
  }

  const convexResult = await cancelRun(runId);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  // Fallback
  const run = inMemoryRuns.get(runId);
  if (!run) {
    res.status(404).json({ error: "not_found", message: `Run ${runId} not found` });
    return;
  }

  if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
    res.status(409).json({
      error: "conflict",
      message: `Run is already ${run.status}`,
    });
    return;
  }

  run.status = "cancelled";
  run.completedAt = new Date().toISOString();

  const cancelEvent: RunEvent = {
    eventId: `evt_${nanoid(10)}`,
    runId,
    type: "run_cancelled",
    timestamp: new Date().toISOString(),
  };
  run.events.push(cancelEvent);
  broadcastEvent(runId, cancelEvent);

  res.json({ runId, status: run.status });
}));

export default router;
