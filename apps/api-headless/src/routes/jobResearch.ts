/**
 * Job Research Route
 *
 * POST /v1/job-research
 *
 * Lightweight endpoint for job-email pipeline integration.
 * Accepts extracted entities from email and returns multi-angle intelligence.
 *
 * Request:
 *   {
 *     "companyName": "Stripe",
 *     "senderName": "Sarah Chen",
 *     "senderEmail": "sarah.chen@stripe.com",
 *     "jobTitle": "Senior Engineer",
 *     "emailSubject": "Interview Request",
 *     "emailSnippet": "We'd like to invite you...",
 *     "depth": "quick" | "standard"
 *   }
 *
 * Response:
 *   {
 *     "traceId": "job-research-...",
 *     "company": { name, founded, stage, valuation, ... },
 *     "sender": { name, role, background, ... },
 *     "diligenceAngles": { financialHealth, culture, interviewProcess, ... },
 *     "jobContext": { title, level, salaryRange, skillsRequired, ... },
 *     "sources": [ { url, title, snippet } ]
 *   }
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { runConvexAction } from "../lib/convex-client.js";

const router = Router();

const jobResearchRequestSchema = z.object({
  companyName: z.string().min(1).optional(),
  senderName: z.string().min(1).optional(),
  senderEmail: z.string().email().optional(),
  jobTitle: z.string().min(1).optional(),
  emailSubject: z.string().optional(),
  emailSnippet: z.string().optional(),
  depth: z.enum(["quick", "standard"]).optional().default("quick"),
});

const REQUEST_TIMEOUT_MS = 30_000;

router.post("/", async (req: Request, res: Response) => {
  const routeStartTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const parsed = jobResearchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        details: parsed.error.issues,
        requestId: req.requestId,
      });
      return;
    }

    // Call Convex action
    const result = await runConvexAction(
      "domains/research/jobResearchAction:researchJobContext",
      parsed.data
    );

    res.json({
      requestId: req.requestId,
      generatedAt: new Date().toISOString(),
      elapsedMs: Date.now() - routeStartTime,
      ...result,
    });
  } catch (error) {
    console.error("[JobResearch] Error:", error);

    if (!res.headersSent) {
      const isTimeout =
        error instanceof Error && error.message === "request_timeout";
      res.status(isTimeout ? 504 : 502).json({
        error: isTimeout ? "request_timeout" : "research_unavailable",
        message: isTimeout
          ? `Request exceeded ${REQUEST_TIMEOUT_MS}ms budget`
          : "Unable to complete research. The service may be temporarily unavailable.",
        requestId: req.requestId,
        fallback: {
          company: req.body.companyName
            ? {
                name: req.body.companyName,
                note: "Research data unavailable. Try again later or visit the company website directly.",
              }
            : undefined,
          sources: [],
        },
      });
    }
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
