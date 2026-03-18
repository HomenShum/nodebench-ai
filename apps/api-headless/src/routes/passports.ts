import { Router, type Request, type Response } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";

import { getSinglePathValue } from "../lib/request-values.js";
import { passportStore, type V2Passport } from "./control-plane-v2-store.js";

const router = Router();

const passportScopeSchema = z.object({
  resource: z.string().min(1),
  action: z.string().min(1),
});

const approvalPolicySchema = z.object({
  mode: z.string().min(1),
  requires_human_approval: z.boolean(),
  max_spend_usd: z.number().nonnegative().optional(),
});

const createPassportSchema = z.object({
  subject_type: z.enum(["agent", "user", "service"]),
  subject_id: z.string().min(1),
  agent_id: z.string().min(1),
  scopes: z.array(passportScopeSchema),
  approval_policy: approvalPolicySchema,
});

const revokePassportSchema = z.object({
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

router.post("/", asyncHandler(async (req: Request, res: Response) => {
  const parsed = createPassportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
      requestId: req.requestId,
    });
    return;
  }

  const passport: V2Passport = {
    passport_id: `pass_${nanoid(12)}`,
    created_at: new Date().toISOString(),
    ...parsed.data,
  };

  passportStore.set(passport.passport_id, passport);
  res.status(201).json(passport);
}));

router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const passportId = getSinglePathValue(req.params.id);
  if (!passportId) {
    res.status(400).json({ error: "validation_error", message: "passport id is required" });
    return;
  }

  const passport = passportStore.get(passportId);
  if (!passport) {
    res.status(404).json({ error: "not_found", message: `Passport ${passportId} not found` });
    return;
  }

  res.json(passport);
}));

router.post("/:id/revoke", asyncHandler(async (req: Request, res: Response) => {
  const passportId = getSinglePathValue(req.params.id);
  if (!passportId) {
    res.status(400).json({ error: "validation_error", message: "passport id is required" });
    return;
  }

  const parsed = revokePassportSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
      requestId: req.requestId,
    });
    return;
  }

  const passport = passportStore.get(passportId);
  if (!passport) {
    res.status(404).json({ error: "not_found", message: `Passport ${passportId} not found` });
    return;
  }

  if (passport.revoked_at) {
    res.status(409).json({
      error: "conflict",
      message: `Passport ${passportId} is already revoked`,
    });
    return;
  }

  const revokedAt = new Date().toISOString();
  passport.revoked_at = revokedAt;

  res.json({
    passport_id: passport.passport_id,
    revoked: true,
    revoked_at: revokedAt,
    reason: parsed.data.reason ?? "Passport revoked",
  });
}));

export default router;