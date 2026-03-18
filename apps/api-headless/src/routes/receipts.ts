import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getSinglePathValue, getSingleQueryValue } from "../lib/request-values.js";
import { receiptStore } from "./control-plane-v2-store.js";

const router = Router();

const rollbackReceiptSchema = z.object({
  reason: z.string().min(1).optional(),
});

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

router.get("/", asyncHandler(async (req: Request, res: Response) => {
  const agentId = getSingleQueryValue(req.query.agent_id);

  let receipts = Array.from(receiptStore.values());
  if (agentId) {
    receipts = receipts.filter((receipt) => receipt.agent_id === agentId);
  }

  receipts.sort((a, b) => b.created_at.localeCompare(a.created_at));

  res.json({
    receipts,
    total: receipts.length,
  });
}));

router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const receiptId = getSinglePathValue(req.params.id);
  if (!receiptId) {
    res.status(400).json({ error: "validation_error", message: "receipt id is required" });
    return;
  }

  const receipt = receiptStore.get(receiptId);
  if (!receipt) {
    res.status(404).json({ error: "not_found", message: `Receipt ${receiptId} not found` });
    return;
  }

  res.json(receipt);
}));

router.post("/:id/rollback", asyncHandler(async (req: Request, res: Response) => {
  const receiptId = getSinglePathValue(req.params.id);
  if (!receiptId) {
    res.status(400).json({ error: "validation_error", message: "receipt id is required" });
    return;
  }

  const parsed = rollbackReceiptSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
      requestId: req.requestId,
    });
    return;
  }

  const receipt = receiptStore.get(receiptId);
  if (!receipt) {
    res.status(404).json({ error: "not_found", message: `Receipt ${receiptId} not found` });
    return;
  }

  if (!receipt.reversible) {
    res.status(409).json({
      error: "conflict",
      message: `Receipt ${receiptId} is not reversible`,
    });
    return;
  }

  if (receipt.rolled_back_at) {
    res.status(409).json({
      error: "conflict",
      message: `Receipt ${receiptId} has already been rolled back`,
    });
    return;
  }

  const rolledBackAt = new Date().toISOString();
  receipt.rolled_back_at = rolledBackAt;
  receipt.rollback_ref ??= `rollback_${nanoid(10)}`;

  res.json({
    receipt_id: receipt.receipt_id,
    rolled_back: true,
    rolled_back_at: rolledBackAt,
    rollback_ref: receipt.rollback_ref,
    reason: parsed.data.reason ?? "Rollback queued",
  });
}));

export default router;