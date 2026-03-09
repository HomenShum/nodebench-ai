import { Router, type Request, type Response } from "express";

import { fetchUrlDocument } from "../lib/web-fetch.js";
import { fetchRequestSchema } from "../schemas/grounding.js";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  const parsed = fetchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
      requestId: req.requestId,
    });
    return;
  }

  try {
    const result = await fetchUrlDocument({
      url: parsed.data.url,
      includeExtraction: parsed.data.includeExtraction,
      includeHtml: parsed.data.includeRawHtml ?? parsed.data.includeHtml,
      includeImages: parsed.data.includeImages,
      renderJs: parsed.data.renderJs,
      maxChars: parsed.data.maxChars,
      requestId: req.requestId || "unknown",
      referenceDateIso: parsed.data.referenceDateIso,
    });

    res.json(result);
  } catch (error) {
    res.status(502).json({
      error: "fetch_unavailable",
      message: error instanceof Error ? error.message : "Fetch failed",
      requestId: req.requestId,
    });
  }
});

export default router;
