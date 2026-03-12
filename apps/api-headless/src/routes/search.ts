import { Router, type Request, type Response } from "express";

import { runFusionSearch, runQuickSearch } from "../lib/convex-client.js";
import {
  buildSourcedAnswer,
  buildTemporalBrief,
  filterSearchResults,
  normalizeSearchPayload,
  projectStructuredOutput,
  type ExtractedDocumentLike,
} from "../lib/grounding.js";
import { buildEnterpriseReplayManifest, registerReplayManifest } from "../lib/replay-store.js";
import { buildEnterpriseInvestigation } from "../lib/temporal-investigation.js";
import { fetchUrlDocument } from "../lib/web-fetch.js";
import { searchRequestSchema } from "../schemas/grounding.js";

const router = Router();

function defaultModeForDepth(depth: "standard" | "deep" | "temporal") {
  switch (depth) {
    case "deep":
    case "temporal":
      return "comprehensive" as const;
    case "standard":
    default:
      return "balanced" as const;
  }
}

async function fetchTemporalDocuments(
  requestId: string,
  urls: Array<{ url?: string }>
): Promise<ExtractedDocumentLike[]> {
  const fetchable = urls
    .filter((item): item is { url: string } => typeof item.url === "string" && item.url.length > 0)
    .slice(0, 3);

  const settled = await Promise.allSettled(
    fetchable.map((item, index) =>
      fetchUrlDocument({
        url: item.url,
        includeExtraction: true,
        includeHtml: false,
        includeImages: false,
        renderJs: false,
        maxChars: 12_000,
        requestId: `${requestId}_doc${index + 1}`,
      })
    )
  );

  return settled
    .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchUrlDocument>>> => result.status === "fulfilled")
    .map((result) => result.value);
}

const REQUEST_TIMEOUT_MS = 30_000;

router.post("/", async (req: Request, res: Response) => {
  const routeStartTime = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  function checkBudget() {
    if (controller.signal.aborted) {
      throw new Error("request_timeout");
    }
  }

  try {
  const parsed = searchRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "validation_error",
      details: parsed.error.issues,
      requestId: req.requestId,
    });
    return;
  }

  const mode = parsed.data.mode ?? defaultModeForDepth(parsed.data.depth);
  const searchResult =
    mode === "fast" && !parsed.data.sources && !parsed.data.contentTypes
      ? await runQuickSearch({
          query: parsed.data.query,
          maxResults: parsed.data.maxResults,
          threadId: req.requestId,
        })
      : await runFusionSearch({
          query: parsed.data.query,
          mode,
          sources: parsed.data.sources,
          maxPerSource: parsed.data.maxPerSource,
          maxTotal: parsed.data.maxResults,
          enableReranking:
            parsed.data.enableReranking ?? parsed.data.depth !== "standard",
          contentTypes: parsed.data.contentTypes,
          dateRange:
            parsed.data.fromDate || parsed.data.toDate
              ? {
                  start: parsed.data.fromDate,
                  end: parsed.data.toDate,
                }
              : undefined,
          threadId: req.requestId,
          skipCache: parsed.data.skipCache,
        });

  if (!searchResult.ok || !searchResult.data) {
    res.status(502).json({
      error: "search_unavailable",
      message: searchResult.error ?? "Grounded search failed",
      requestId: req.requestId,
    });
    return;
  }

  const filteredResults = filterSearchResults(searchResult.data.payload.results, {
    includeDomains: parsed.data.includeDomains,
    excludeDomains: parsed.data.excludeDomains,
    fromDate: parsed.data.fromDate,
    toDate: parsed.data.toDate,
  }).slice(0, parsed.data.maxResults);

  const filteredPayload = {
    ...searchResult.data,
    payload: {
      ...searchResult.data.payload,
      results: filteredResults,
    },
  };

  const normalized = normalizeSearchPayload(parsed.data.query, filteredPayload, {
    includeSources: parsed.data.includeSources,
  });

  if (parsed.data.outputType === "searchResults") {
    res.json({
      requestId: req.requestId,
      generatedAt: filteredPayload.generatedAt,
      depth: parsed.data.depth,
      outputType: parsed.data.outputType,
      ...normalized,
    });
    return;
  }

  if (parsed.data.outputType === "sourcedAnswer") {
    res.json({
      requestId: req.requestId,
      generatedAt: filteredPayload.generatedAt,
      depth: parsed.data.depth,
      outputType: parsed.data.outputType,
      ...buildSourcedAnswer({
        query: parsed.data.query,
        results: normalized.results,
        citations: normalized.citations,
        telemetry: normalized.telemetry,
        includeSources: parsed.data.includeSources,
        includeInlineCitations: parsed.data.includeInlineCitations,
      }),
    });
    return;
  }

  checkBudget();
  const documents = await fetchTemporalDocuments(req.requestId || "req_unknown", normalized.results);
  const temporalBrief = buildTemporalBrief({
    query: parsed.data.query,
    results: normalized.results,
    citations: normalized.citations,
    telemetry: normalized.telemetry,
    documents,
    includeSources: parsed.data.includeSources,
  });

  if (parsed.data.outputType === "temporalBrief") {
    res.json({
      requestId: req.requestId,
      generatedAt: filteredPayload.generatedAt,
      depth: parsed.data.depth,
      outputType: parsed.data.outputType,
      ...temporalBrief,
      fetchedSourceCount: documents.length,
    });
    return;
  }

  checkBudget();
  if (parsed.data.outputType === "enterpriseInvestigation") {
    const investigation = await buildEnterpriseInvestigation({
      query: parsed.data.query,
      telemetry: normalized.telemetry,
      timeline: temporalBrief.timeline,
      documents,
      citations: normalized.citations,
      traceId: req.requestId || "trace_unknown",
      executionTimeMs: Date.now() - routeStartTime,
    });
    const investigationWithObject = {
      object: "enterprise_investigation",
      ...investigation,
    };
    const sourceSnapshotHashes = investigation.evidence_catalog
      .map((e) => e.content_hash)
      .filter((h) => !h.includes("unverified"));
    const replayManifest = registerReplayManifest(
      buildEnterpriseReplayManifest({
        traceId: investigation.traceability.trace_id,
        query: parsed.data.query,
        generatedAt: filteredPayload.generatedAt,
        request: {
          depth: parsed.data.depth,
          outputType: parsed.data.outputType,
          query: parsed.data.query,
          maxResults: parsed.data.maxResults,
          includeDomains: parsed.data.includeDomains,
          excludeDomains: parsed.data.excludeDomains,
        },
        response: investigationWithObject,
        sourceSnapshotHashes,
        searchTelemetry: normalized.telemetry,
        fetchedDocuments: documents.map((document, index) => ({
          finalUrl: document.finalUrl,
          snapshotHash: document.snapshotHash,
          requestId: `${req.requestId || "trace_unknown"}_doc${index + 1}`,
          citations: document.citations,
        })),
      })
    );

    res.json({
      requestId: req.requestId,
      generatedAt: filteredPayload.generatedAt,
      depth: parsed.data.depth,
      outputType: parsed.data.outputType,
      ...investigationWithObject,
      traceability: {
        ...investigation.traceability,
        replay_url: `/v1/replay/${replayManifest.replayId}`,
      },
    });
    return;
  }

  const sourcedAnswer = buildSourcedAnswer({
    query: parsed.data.query,
    results: normalized.results,
    citations: normalized.citations,
    telemetry: normalized.telemetry,
    includeSources: parsed.data.includeSources,
    includeInlineCitations: parsed.data.includeInlineCitations,
  });

  const structuredData = projectStructuredOutput(parsed.data.structuredOutputSchema ?? {}, {
    query: parsed.data.query,
    answer: sourcedAnswer.answer,
    results: normalized.results,
    citations: normalized.citations,
    timeline: temporalBrief.timeline,
    causalSignals: temporalBrief.causalSignals,
    gameBoard: temporalBrief.gameBoard,
    progressiveDisclosure: temporalBrief.progressiveDisclosure,
    telemetry: normalized.telemetry,
    overview: temporalBrief.overview,
  });

  res.json({
    requestId: req.requestId,
    generatedAt: filteredPayload.generatedAt,
    depth: parsed.data.depth,
    outputType: parsed.data.outputType,
    object: "structured_result",
    query: parsed.data.query,
    data: structuredData,
    sources: parsed.data.includeSources ? normalized.citations : [],
    telemetry: normalized.telemetry,
    fetchedSourceCount: documents.length,
  });

  } catch (error) {
    if (!res.headersSent) {
      const isTimeout = error instanceof Error && error.message === "request_timeout";
      res.status(isTimeout ? 504 : 500).json({
        error: isTimeout ? "request_timeout" : "internal_error",
        message: isTimeout
          ? `Request exceeded ${REQUEST_TIMEOUT_MS}ms budget`
          : "An unexpected error occurred",
        requestId: req.requestId,
        elapsedMs: Date.now() - routeStartTime,
      });
    }
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
