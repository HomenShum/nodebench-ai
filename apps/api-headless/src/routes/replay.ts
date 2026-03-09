import { Router, type Request, type Response } from "express";

import { getRunTrace, getRunVideo, replayRun } from "../lib/convex-client.js";
import { getReplayManifest } from "../lib/replay-store.js";
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

router.get("/:runId", asyncHandler(async (req: Request, res: Response) => {
  const runId = getSinglePathValue(req.params.runId);
  if (!runId) {
    res.status(400).json({ error: "validation_error", message: "runId is required" });
    return;
  }

  const manifest = getReplayManifest(runId);
  if (!manifest) {
    res.status(404).json({
      error: "replay_not_found",
      message: "Replay manifest not found for this runId",
      runId,
    });
    return;
  }

  res.json({
    object: "replay_manifest",
    ...manifest,
  });
}));

router.post("/:runId", asyncHandler(async (req: Request, res: Response) => {
  const runId = getSinglePathValue(req.params.runId);
  if (!runId) {
    res.status(400).json({ error: "validation_error", message: "runId is required" });
    return;
  }

  const { subset } = req.body || {};
  const manifest = getReplayManifest(runId);
  if (manifest) {
    res.status(201).json({
      object: "replay_execution",
      newRunId: `run_replay_${Date.now().toString(36)}`,
      originalRunId: runId,
      traceId: manifest.traceId,
      status: "queued",
      mode: "deterministic_manifest_replay",
      message: "Deterministic replay queued from stored manifest events.",
      subset: subset || "all",
      createdAt: new Date().toISOString(),
      availableSnapshots: manifest.sourceSnapshotHashes,
      responseSnapshotHash: manifest.responseSnapshotHash,
    });
    return;
  }

  const convexResult = await replayRun(runId, { subset });
  if (convexResult.ok && convexResult.data) {
    res.status(201).json(convexResult.data);
    return;
  }

  res.status(502).json({
    error: "replay_backend_unavailable",
    message: "Replay run could not be queued. Backend unavailable.",
    originalRunId: runId,
    requestId: req.requestId,
  });
}));

router.get("/:runId/trace", asyncHandler(async (req: Request, res: Response) => {
  const runId = getSinglePathValue(req.params.runId);
  if (!runId) {
    res.status(400).json({ error: "validation_error", message: "runId is required" });
    return;
  }

  const manifest = getReplayManifest(runId);
  if (manifest) {
    res.json({
      object: "replay_trace",
      runId,
      traceId: manifest.traceId,
      trace: manifest.spans,
      notes: manifest.notes,
      responseSnapshotHash: manifest.responseSnapshotHash,
    });
    return;
  }

  const convexResult = await getRunTrace(runId);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  res.json({
    runId,
    trace: [],
    message: "No trace data available. Connect Convex backend to enable full execution traces.",
  });
}));

router.get("/:runId/video", asyncHandler(async (req: Request, res: Response) => {
  const runId = getSinglePathValue(req.params.runId);
  if (!runId) {
    res.status(400).json({ error: "validation_error", message: "runId is required" });
    return;
  }

  const convexResult = await getRunVideo(runId);
  if (convexResult.ok && convexResult.data) {
    res.json(convexResult.data);
    return;
  }

  res.json({
    runId,
    clips: [],
    message: "No video evidence available. Connect Convex backend to enable video QA capture.",
  });
}));

export default router;
