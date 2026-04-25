import { Router } from "express";
import { z } from "zod";

import { buildEventCaptureMutationArgs } from "../lib/event-capture-projection.js";
import { runConvexMutation } from "../lib/convex-client.js";

const router = Router();

const eventCaptureSchema = z.object({
  text: z.string().min(1),
  workspaceId: z.string().min(1).default("ship-demo-day"),
  eventId: z.string().min(1).optional(),
  eventSessionId: z.string().min(1).optional(),
  anonymousSessionId: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  kind: z.enum(["text", "voice", "image", "screenshot", "file"]).default("text"),
});

router.post("/", async (req, res, next) => {
  try {
    const input = eventCaptureSchema.parse(req.body);
    const result = await runConvexMutation(
      "domains/product/eventWorkspace:recordCapture",
      buildEventCaptureMutationArgs(input),
    );

    res.status(201).json({
      ok: true,
      result,
      status: {
        label: "Using event corpus",
        detail: "No paid search used",
        paidCallsUsed: 0,
        persisted: true,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
