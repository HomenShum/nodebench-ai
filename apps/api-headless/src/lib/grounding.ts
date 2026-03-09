import type { FusionSearchPayload, FusionSearchResult } from "./convex-client.js";

export interface PublicSearchResult {
  id: string;
  title: string;
  snippet: string;
  url?: string;
  source: string;
  score: number;
  contentType: string;
  publishedAt?: string;
  author?: string;
  highlights?: string[];
  metadata?: Record<string, unknown>;
}

export interface SearchTelemetry {
  totalBeforeFusion: number;
  totalTimeMs: number;
  reranked: boolean;
  sourcesQueried: string[];
  timing: Record<string, number>;
  errors: Array<{ source: string; error: string }>;
}

export interface PublicCitation {
  id: string;
  title: string;
  url?: string;
  source: string;
  publishedAt?: string;
}

export interface HtmlExtract {
  title?: string;
  description?: string;
  text: string;
  truncated: boolean;
}

export interface ExtractedDocumentLike {
  finalUrl: string;
  title?: string;
  text: string;
  snapshotHash?: string;
  citations: Array<{ id: string; url: string; title?: string; fetchedAt: string; snapshotHash?: string }>;
  extraction?: {
    claims?: Array<Record<string, unknown>>;
    temporalMarkers?: Array<Record<string, unknown>>;
    numericFacts?: Array<Record<string, unknown>>;
    entities?: Array<Record<string, unknown>>;
  };
}

export interface TemporalTimelineEvent {
  when: string;
  precision: "resolved" | "published" | "source";
  label: string;
  evidence: string;
  sourceId: string;
  sourceTitle?: string;
  url?: string;
}

export interface TemporalBrief {
  object: "temporal_brief";
  query: string;
  overview: string;
  timeline: TemporalTimelineEvent[];
  causalSignals: Array<{
    relation: string;
    confidence: "low" | "medium";
    fromSourceId: string;
    toSourceId: string;
    rationale: string;
  }>;
  gameBoard: Array<{
    actor: string;
    role: string;
    evidenceCount: number;
  }>;
  progressiveDisclosure: string[];
  sources?: PublicCitation[];
  telemetry: SearchTelemetry;
}

export function mapFusionResults(payload: FusionSearchPayload): {
  mode: "fast" | "balanced" | "comprehensive";
  results: PublicSearchResult[];
  citations: PublicCitation[];
  telemetry: SearchTelemetry;
} {
  const results = payload.payload.results.map((result) => ({
    id: result.id,
    title: result.title,
    snippet: result.snippet,
    url: result.url,
    source: result.source,
    score: result.score,
    contentType: result.contentType,
    publishedAt: result.publishedAt,
    author: result.author,
    highlights: result.highlights,
    metadata: result.metadata,
  }));

  return {
    mode: payload.payload.mode,
    results,
    citations: results.map((result) => ({
      id: result.id,
      title: result.title,
      url: result.url,
      source: result.source,
      publishedAt: result.publishedAt,
    })),
    telemetry: {
      totalBeforeFusion: payload.payload.totalBeforeFusion,
      totalTimeMs: payload.payload.totalTimeMs,
      reranked: payload.payload.reranked,
      sourcesQueried: payload.payload.sourcesQueried,
      timing: payload.payload.timing,
      errors: payload.payload.errors ?? [],
    },
  };
}

export function normalizeSearchPayload(
  query: string,
  payload: FusionSearchPayload,
  opts?: { includeSources?: boolean }
) {
  const mapped = mapFusionResults(payload);
  return {
    object: "search_result" as const,
    query,
    mode: mapped.mode,
    results: mapped.results,
    citations: opts?.includeSources === false ? [] : mapped.citations,
    telemetry: mapped.telemetry,
  };
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");
}

function collapseWhitespace(input: string): string {
  return input
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
}

export function extractReadableTextFromHtml(html: string, maxChars: number): HtmlExtract {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descriptionMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  );

  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const text = collapseWhitespace(
    decodeHtmlEntities(
      withoutScripts
        .replace(/<\/(p|div|section|article|li|h[1-6]|br)>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
    )
  );

  return {
    title: titleMatch ? collapseWhitespace(decodeHtmlEntities(titleMatch[1])) : undefined,
    description: descriptionMatch
      ? collapseWhitespace(decodeHtmlEntities(descriptionMatch[1]))
      : undefined,
    text: text.slice(0, maxChars),
    truncated: text.length > maxChars,
  };
}

export function extractImageCandidates(html: string, limit = 12) {
  const images: Array<{ src: string; alt?: string }> = [];
  const tagRegex = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(html)) !== null && images.length < limit) {
    const tag = match[0];
    const srcMatch = tag.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    const altMatch = tag.match(/\balt=["']([^"']*)["']/i);
    images.push({
      src: srcMatch[1],
      alt: altMatch?.[1] || undefined,
    });
  }

  return images;
}

export function normalizeFetchedText(
  contentType: string | null,
  bodyText: string,
  maxChars: number
): HtmlExtract {
  if ((contentType ?? "").includes("text/html")) {
    return extractReadableTextFromHtml(bodyText, maxChars);
  }

  const text = collapseWhitespace(bodyText).slice(0, maxChars);
  return {
    text,
    truncated: bodyText.length > maxChars,
  };
}

function hostnameFor(url?: string) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
}

function dateValue(value?: string) {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function filterSearchResults(
  results: FusionSearchResult[],
  filters: {
    includeDomains?: string[];
    excludeDomains?: string[];
    fromDate?: string;
    toDate?: string;
  }
) {
  const includeDomains = new Set((filters.includeDomains ?? []).map((value) => value.toLowerCase()));
  const excludeDomains = new Set((filters.excludeDomains ?? []).map((value) => value.toLowerCase()));
  const fromDate = dateValue(filters.fromDate);
  const toDate = dateValue(filters.toDate);

  return results.filter((result) => {
    const hostname = hostnameFor(result.url);
    if (includeDomains.size > 0) {
      if (!hostname) return false;
      const matchesInclude = [...includeDomains].some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!matchesInclude) return false;
    }

    if (hostname) {
      const matchesExclude = [...excludeDomains].some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (matchesExclude) return false;
    }

    const publishedAt = dateValue(result.publishedAt);
    if (fromDate && publishedAt && publishedAt < fromDate) return false;
    if (toDate && publishedAt && publishedAt > toDate) return false;
    return true;
  });
}

function citationLabel(index: number, citation: PublicCitation) {
  return `[${index + 1}] ${citation.title}`;
}

export function buildSourcedAnswer(args: {
  query: string;
  results: PublicSearchResult[];
  citations: PublicCitation[];
  telemetry: SearchTelemetry;
  includeSources: boolean;
  includeInlineCitations: boolean;
}) {
  const topResults = args.results.slice(0, 3);
  const lines = topResults.map((result, index) => {
    const prefix = index === 0 ? "Most evidence points to" : index === 1 ? "A second corroborating source says" : "Another source adds";
    const citation = args.includeInlineCitations && args.citations[index]
      ? ` ${citationLabel(index, args.citations[index]!).replace(/^\[(\d+)\]/, "[$1]")}`
      : "";
    return `${prefix} ${result.snippet || result.title}.${citation}`;
  });

  const answer =
    lines.length > 0
      ? `${lines.join(" ")}`
      : `No grounded answer was found for "${args.query}".`;

  return {
    object: "sourced_answer" as const,
    query: args.query,
    answer,
    sources: args.includeSources ? args.citations : [],
    telemetry: args.telemetry,
  };
}

function extractActorNames(documents: ExtractedDocumentLike[]) {
  const counts = new Map<string, number>();
  for (const document of documents) {
    for (const entity of document.extraction?.entities ?? []) {
      const name = typeof entity.name === "string" ? entity.name : undefined;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([actor, evidenceCount]) => ({
      actor,
      role: "observed actor",
      evidenceCount,
    }));
}

function getClaimText(claim: Record<string, unknown>) {
  if (typeof claim.claim_text === "string") return claim.claim_text;
  if (typeof claim.claimText === "string") return claim.claimText;
  return undefined;
}

function getTemporalMarkerDate(marker: Record<string, unknown>) {
  if (typeof marker.resolved_date === "string") return marker.resolved_date;
  if (typeof marker.resolvedDate === "string") return marker.resolvedDate;
  if (typeof marker.resolvedDate === "number") return new Date(marker.resolvedDate).toISOString();
  return undefined;
}

function getTemporalMarkerText(marker: Record<string, unknown>) {
  if (typeof marker.text === "string") return marker.text;
  return undefined;
}

export function buildTemporalBrief(args: {
  query: string;
  results: PublicSearchResult[];
  citations: PublicCitation[];
  telemetry: SearchTelemetry;
  documents: ExtractedDocumentLike[];
  includeSources: boolean;
}) : TemporalBrief {
  const timeline: TemporalTimelineEvent[] = [];

  for (const document of args.documents) {
    const sourceId = document.citations[0]?.id ?? `src_${timeline.length + 1}`;
    const sourceTitle = document.title;
    const documentPublished =
      args.citations.find((citation) => citation.url === document.finalUrl)?.publishedAt;

    for (const claim of document.extraction?.claims ?? []) {
      const claimText = getClaimText(claim);
      if (!claimText) continue;
      const matchingMarker = (document.extraction?.temporalMarkers ?? []).find((marker) => {
        const markerText = getTemporalMarkerText(marker);
        return markerText ? claimText.includes(markerText) : false;
      });
      timeline.push({
        when:
          getTemporalMarkerDate(matchingMarker ?? {}) ??
          documentPublished ??
          document.citations[0]?.fetchedAt ??
          new Date().toISOString(),
        precision: matchingMarker ? "resolved" : documentPublished ? "published" : "source",
        label: claimText,
        evidence: claimText.slice(0, 240),
        sourceId,
        sourceTitle,
        url: document.finalUrl,
      });
    }

    if (timeline.length === 0 && document.text) {
      timeline.push({
        when: documentPublished ?? document.citations[0]?.fetchedAt ?? new Date().toISOString(),
        precision: documentPublished ? "published" : "source",
        label: (document.title ?? document.text.slice(0, 80)).trim(),
        evidence: document.text.slice(0, 240),
        sourceId,
        sourceTitle,
        url: document.finalUrl,
      });
    }
  }

  timeline.sort((a, b) => dateValue(a.when)! - dateValue(b.when)!);

  const causalSignals = timeline.slice(1).map((event, index) => ({
    relation: "possible temporal progression",
    confidence: "low" as const,
    fromSourceId: timeline[index]!.sourceId,
    toSourceId: event.sourceId,
    rationale: `${timeline[index]!.label.slice(0, 90)} -> ${event.label.slice(0, 90)}`,
  })).slice(0, 5);

  const overview = timeline.length > 0
    ? `The current evidence forms a ${timeline.length}-step timeline for "${args.query}". The strongest pattern is chronological progression rather than a proven causal chain, so treat the causal signals as hypotheses backed by cited evidence.`
    : `No temporal brief could be assembled for "${args.query}" from the grounded results.`;

  return {
    object: "temporal_brief",
    query: args.query,
    overview,
    timeline,
    causalSignals,
    gameBoard: extractActorNames(args.documents),
    progressiveDisclosure: [
      "Confirm the earliest event with a primary source before trusting the full chain.",
      "Compare the latest state against the most similar older state so you do not confuse current and stale context.",
      "Investigate the gaps between timeline events instead of assuming causation from sequence alone.",
    ],
    sources: args.includeSources ? args.citations : undefined,
    telemetry: args.telemetry,
  };
}

export function projectStructuredOutput(
  schema: Record<string, unknown>,
  candidate: Record<string, unknown>
) {
  const properties =
    schema && typeof schema === "object" && schema.properties && typeof schema.properties === "object"
      ? (schema.properties as Record<string, unknown>)
      : {};

  const output: Record<string, unknown> = {};
  for (const key of Object.keys(properties)) {
    if (key in candidate) {
      output[key] = candidate[key];
    }
  }
  return output;
}
