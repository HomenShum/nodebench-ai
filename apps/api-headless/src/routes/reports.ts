import { Router } from "express";
import { z } from "zod";

import { runConvexMutation, runConvexQuery } from "../lib/convex-client.js";

const router = Router();

const anonymousSessionSchema = z.object({
  anonymousSessionId: z.string().min(1).optional(),
});

const notebookAppendSchema = anonymousSessionSchema.extend({
  text: z.string().min(1),
});

const exportPreviewSchema = anonymousSessionSchema.extend({
  format: z
    .enum([
      "crm_csv",
      "csv",
      "hubspot_csv",
      "salesforce_csv",
      "attio_csv",
      "affinity_csv",
      "notion_csv",
      "json",
      "markdown",
    ])
    .default("crm_csv"),
});

const exportCompleteSchema = anonymousSessionSchema.extend({
  exportKey: z.string().min(1),
});

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

router.post("/:reportId/notebook/append", async (req, res, next) => {
  try {
    const input = notebookAppendSchema.parse(req.body);
    const report = await runConvexQuery<any>("domains/product/reports:getReport", {
      reportId: req.params.reportId,
      anonymousSessionId: input.anonymousSessionId,
    });
    const currentHtml = typeof report?.notebookHtml === "string" ? report.notebookHtml : "";
    const result = await runConvexMutation("domains/product/reports:saveReportNotebookHtml", {
      reportId: req.params.reportId,
      anonymousSessionId: input.anonymousSessionId,
      notebookHtml: `${currentHtml}\n<p>${escapeHtml(input.text)}</p>`,
    });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

router.post("/:reportId/exports/preview", async (req, res, next) => {
  try {
    const input = exportPreviewSchema.parse(req.body);
    const result = await runConvexMutation("domains/product/reports:previewReportExport", {
      reportId: req.params.reportId,
      anonymousSessionId: input.anonymousSessionId,
      format: input.format,
    });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

router.post("/:reportId/exports/complete", async (req, res, next) => {
  try {
    const input = exportCompleteSchema.parse(req.body);
    const result = await runConvexMutation("domains/product/reports:completeReportExport", {
      anonymousSessionId: input.anonymousSessionId,
      exportKey: input.exportKey,
    });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

router.get("/:reportId/timeline", async (req, res, next) => {
  try {
    const anonymousSessionId =
      typeof req.query.anonymousSessionId === "string" ? req.query.anonymousSessionId : undefined;
    const result = await runConvexQuery("domains/product/activity:getReportTimeline", {
      reportId: req.params.reportId,
      anonymousSessionId,
      limit: 80,
    });
    res.status(200).json({ ok: true, result });
  } catch (error) {
    next(error);
  }
});

export default router;
