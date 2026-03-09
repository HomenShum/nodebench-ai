import { describe, expect, it } from "vitest";

import {
  buildSourcedAnswer,
  buildTemporalBrief,
  extractImageCandidates,
  extractReadableTextFromHtml,
  filterSearchResults,
  normalizeSearchPayload,
} from "./grounding.js";

describe("extractReadableTextFromHtml", () => {
  it("extracts title, description, and readable text", () => {
    const html = `
      <html>
        <head>
          <title>Test Article</title>
          <meta name="description" content="A grounded fetch result." />
        </head>
        <body>
          <script>window.ignore = true;</script>
          <article><h1>Headline</h1><p>Hello <strong>world</strong>.</p></article>
        </body>
      </html>
    `;

    const result = extractReadableTextFromHtml(html, 500);
    expect(result.title).toBe("Test Article");
    expect(result.description).toBe("A grounded fetch result.");
    expect(result.text).toContain("Headline");
    expect(result.text).toContain("Hello world.");
    expect(result.text).not.toContain("window.ignore");
    expect(result.truncated).toBe(false);
  });
});

describe("normalizeSearchPayload", () => {
  it("maps fusion payload into public search response", () => {
    const response = normalizeSearchPayload("oracle platform", {
      kind: "fusion_search_results",
      version: 1,
      generatedAt: "2026-03-08T00:00:00.000Z",
      payload: {
        results: [
          {
            id: "src_1",
            source: "linkup",
            title: "Oracle OS",
            snippet: "A grounded result",
            url: "https://example.com/oracle",
            score: 0.9,
            originalRank: 1,
            contentType: "text",
          },
        ],
        totalBeforeFusion: 3,
        mode: "balanced",
        sourcesQueried: ["linkup", "news"],
        timing: { linkup: 120, news: 80 },
        totalTimeMs: 220,
        reranked: true,
      },
    });

    expect(response.object).toBe("search_result");
    expect(response.query).toBe("oracle platform");
    expect(response.results).toHaveLength(1);
    expect(response.citations[0]?.id).toBe("src_1");
    expect(response.telemetry.sourcesQueried).toEqual(["linkup", "news"]);
  });
});

describe("filterSearchResults", () => {
  it("filters by domain and date", () => {
    const results = filterSearchResults(
      [
        {
          id: "a",
          source: "linkup",
          title: "Keep",
          snippet: "Keep me",
          url: "https://example.com/a",
          score: 0.8,
          originalRank: 1,
          contentType: "text",
          publishedAt: "2026-03-01T00:00:00.000Z",
        },
        {
          id: "b",
          source: "news",
          title: "Drop",
          snippet: "Drop me",
          url: "https://other.com/b",
          score: 0.7,
          originalRank: 2,
          contentType: "news",
          publishedAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      {
        includeDomains: ["example.com"],
        fromDate: "2026-01-01T00:00:00.000Z",
      }
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("a");
  });
});

describe("buildSourcedAnswer", () => {
  it("generates a cited answer from top snippets", () => {
    const answer = buildSourcedAnswer({
      query: "What changed?",
      results: [
        {
          id: "src_1",
          title: "Result 1",
          snippet: "the company cut token cost by 18%",
          source: "linkup",
          score: 0.9,
          contentType: "text",
          url: "https://example.com",
        },
      ],
      citations: [
        {
          id: "src_1",
          title: "Result 1",
          source: "linkup",
          url: "https://example.com",
        },
      ],
      telemetry: {
        totalBeforeFusion: 1,
        totalTimeMs: 100,
        reranked: false,
        sourcesQueried: ["linkup"],
        timing: { linkup: 100 },
        errors: [],
      },
      includeSources: true,
      includeInlineCitations: true,
    });

    expect(answer.object).toBe("sourced_answer");
    expect(answer.answer).toContain("[1]");
    expect(answer.sources).toHaveLength(1);
  });
});

describe("buildTemporalBrief", () => {
  it("builds a timeline and progressive disclosure guidance", () => {
    const brief = buildTemporalBrief({
      query: "payment retry degradation",
      results: [],
      citations: [
        {
          id: "src_1",
          title: "Incident note",
          source: "linkup",
          url: "https://example.com/incident",
          publishedAt: "2026-03-01T00:00:00.000Z",
        },
      ],
      telemetry: {
        totalBeforeFusion: 1,
        totalTimeMs: 120,
        reranked: false,
        sourcesQueried: ["linkup"],
        timing: { linkup: 120 },
        errors: [],
      },
      documents: [
        {
          finalUrl: "https://example.com/incident",
          title: "Incident note",
          text: "In Q1 2026, retries caused a three day delay.",
          citations: [
            {
              id: "src_1",
              url: "https://example.com/incident",
              title: "Incident note",
              fetchedAt: "2026-03-02T00:00:00.000Z",
            },
          ],
          extraction: {
            entities: [{ name: "Project Atlas" }],
            claims: [{ claim_text: "In Q1 2026, retries caused a three day delay." }],
            temporalMarkers: [{ text: "Q1 2026", resolvedDate: "2026-01-01T00:00:00.000Z" }],
          },
        },
      ],
      includeSources: true,
    });

    expect(brief.object).toBe("temporal_brief");
    expect(brief.timeline).toHaveLength(1);
    expect(brief.timeline[0]?.label).toContain("three day delay");
    expect(brief.progressiveDisclosure).toHaveLength(3);
    expect(brief.gameBoard[0]?.actor).toBe("Project Atlas");
  });
});

describe("extractImageCandidates", () => {
  it("extracts image sources from html", () => {
    const images = extractImageCandidates(
      '<img src="https://cdn.example.com/a.png" alt="Chart" /><img src="/b.jpg" />'
    );

    expect(images).toHaveLength(2);
    expect(images[0]?.alt).toBe("Chart");
  });
});
