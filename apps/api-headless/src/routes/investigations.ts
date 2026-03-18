import { Router, type Request, type Response } from "express";

import {
  ENTERPRISE_INVESTIGATION_EVAL_CASES,
  runEnterpriseInvestigationCase,
} from "../lib/enterprise-investigation-eval.js";
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

function matchesInvestigationRequestId(requestedId: string, caseId: string): boolean {
  return requestedId === caseId || requestedId === `inv_eval_${caseId}`;
}

router.get("/:id", asyncHandler(async (req: Request, res: Response) => {
  const investigationId = getSinglePathValue(req.params.id);
  if (!investigationId) {
    res.status(400).json({ error: "validation_error", message: "investigation id is required" });
    return;
  }

  const evaluationCase = ENTERPRISE_INVESTIGATION_EVAL_CASES.find((item) =>
    matchesInvestigationRequestId(investigationId, item.id)
  );

  if (!evaluationCase) {
    res.status(404).json({
      error: "not_found",
      message: `Investigation ${investigationId} not found`,
    });
    return;
  }

  const evaluation = await runEnterpriseInvestigationCase(evaluationCase);
  res.json(evaluation.investigation);
}));

export default router;