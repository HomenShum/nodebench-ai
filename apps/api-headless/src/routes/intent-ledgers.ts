import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getSinglePathValue } from "../lib/request-values.js";
import { intentLedgerStore, type V2IntentLedger } from "./control-plane-v2-store.js";

const router = Router();

const goalSchema = z.object({
  goal_id: z.string().min(1),
  text: z.string().min(1),
});

const constraintSchema = z.object({
  constraint_id: z.string().min(1),
  text: z.string().min(1),
  severity: z.enum(["hard", "soft"]),
});

const thresholdSchema = z.object({
  key: z.string().min(1),
  value: z.number(),
  unit: z.string().min(1),
});

const escalationRuleSchema = z.object({
  rule_id: z.string().min(1),
  condition: z.string().min(1),
  action: z.enum(["ask_human", "deny"]),
});

const intentLedgerBodySchema = z.object({
  subject_id: z.string().min(1),
  goals: z.array(goalSchema).default([]),
  constraints: z.array(constraintSchema).default([]),
  thresholds: z.array(thresholdSchema).default([]),
  escalation_rules: z.array(escalationRuleSchema).default([]),
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

router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const parsed = intentLedgerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
      requestId: req.requestId,
    });
    return;
  }

  const ledger: V2IntentLedger = {
    ledger_id: `ledger_${nanoid(12)}`,
    version: 1,
    updated_at: new Date().toISOString(),
    ...parsed.data,
  };

  intentLedgerStore.set(ledger.ledger_id, ledger);
  res.status(201).json(ledger);
}));

router.put("/:id", asyncHandler(async (req: Request, res: Response) => {
  const ledgerId = getSinglePathValue(req.params.id);
  if (!ledgerId) {
    res.status(400).json({ error: "validation_error", message: "ledger id is required" });
    return;
  }

  const parsed = intentLedgerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
      requestId: req.requestId,
    });
    return;
  }

  const existing = intentLedgerStore.get(ledgerId);
  if (!existing) {
    res.status(404).json({ error: "not_found", message: `Intent ledger ${ledgerId} not found` });
    return;
  }

  const updatedLedger: V2IntentLedger = {
    ledger_id: existing.ledger_id,
    version: existing.version + 1,
    updated_at: new Date().toISOString(),
    ...parsed.data,
  };

  intentLedgerStore.set(updatedLedger.ledger_id, updatedLedger);
  res.json(updatedLedger);
}));

export default router;