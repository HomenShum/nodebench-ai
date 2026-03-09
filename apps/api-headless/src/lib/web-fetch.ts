import { nanoid } from "nanoid";
import { createHash } from "node:crypto";

import { extractImageCandidates, normalizeFetchedText } from "./grounding.js";

const INGESTION_EXTRACT_BASE_URL = process.env.INGESTION_BASE_URL || "http://localhost:8011";
const DEFAULT_USER_AGENT =
  process.env.API_FETCH_USER_AGENT ||
  "NodeBench Headless API/0.1 (+https://nodebench.ai; grounded-fetch)";

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB

const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^\[::1?\]$/,
  /^metadata\.google\.internal$/i,
];

function validateUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Blocked protocol: ${parsed.protocol}`);
  }
  const host = parsed.hostname;
  if (BLOCKED_HOST_PATTERNS.some((p) => p.test(host))) {
    throw new Error(`Blocked host: ${host}`);
  }
  return parsed;
}

async function readBoundedText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      reader.cancel();
      chunks.push(decoder.decode(value, { stream: false }));
      break;
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  return chunks.join("");
}

interface ExtractServiceResponse {
  processingMs: number;
  backends: Record<string, string>;
  entities: Array<Record<string, unknown>>;
  claims: Array<Record<string, unknown>>;
  numericFacts: Array<Record<string, unknown>>;
  temporalMarkers: Array<Record<string, unknown>>;
  errors: Array<Record<string, string>>;
  summary: {
    entityCount: number;
    claimCount: number;
    numericFactCount: number;
    temporalMarkerCount: number;
    errorCount: number;
  };
  lineCount: number;
  textLength: number;
}

export interface FetchUrlInput {
  url: string;
  includeExtraction: boolean;
  includeHtml: boolean;
  includeImages?: boolean;
  renderJs?: boolean;
  maxChars: number;
  requestId: string;
  referenceDateIso?: string;
}

export interface FetchUrlOutput {
  object: "fetched_document";
  requestId: string;
  url: string;
  finalUrl: string;
  fetchedAt: string;
  status: number;
  contentType: string | null;
  title?: string;
  description?: string;
  text: string;
  markdown: string;
  html?: string;
  truncated: boolean;
  images?: Array<{ src: string; alt?: string }>;
  warnings?: string[];
  extraction?: ExtractServiceResponse;
  citations: Array<{
    id: string;
    url: string;
    title?: string;
    fetchedAt: string;
    snapshotHash: string;
  }>;
  snapshotHash: string;
  rawSnapshotHash: string;
}

async function callExtractionService(
  text: string,
  requestId: string,
  sourceLabel: string,
  referenceDateIso?: string
): Promise<ExtractServiceResponse | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${INGESTION_EXTRACT_BASE_URL}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        lineOffset: 0,
        sourceLabel,
        referenceDateIso,
        requestId,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as ExtractServiceResponse;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchUrlDocument(input: FetchUrlInput): Promise<FetchUrlOutput> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  const fetchedAt = new Date().toISOString();

  try {
    const validatedUrl = validateUrl(input.url);
    const response = await fetch(validatedUrl.href, {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": DEFAULT_USER_AGENT,
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type");
    if (contentType && /application\/pdf/i.test(contentType)) {
      throw new Error("PDF fetch is not supported by /v1/fetch yet. Use HTML/text/JSON sources in v1.");
    }

    const rawText = await readBoundedText(response, MAX_RESPONSE_BYTES);
    const normalized = normalizeFetchedText(contentType, rawText, input.maxChars);
    const finalUrl = response.url || input.url;
    const snapshotHash = createHash("sha256").update(normalized.text, "utf8").digest("hex");
    const rawSnapshotHash = createHash("sha256").update(rawText, "utf8").digest("hex");
    const warnings: string[] = [];
    if (input.renderJs) {
      warnings.push("renderJs=true was requested, but /v1/fetch currently performs static HTTP fetch only.");
    }
    const extraction =
      input.includeExtraction && normalized.text
        ? await callExtractionService(
            normalized.text,
            input.requestId,
            finalUrl,
            input.referenceDateIso
          )
        : undefined;

    return {
      object: "fetched_document",
      requestId: input.requestId || `fetch_${nanoid(10)}`,
      url: input.url,
      finalUrl,
      fetchedAt,
      status: response.status,
      contentType,
      title: normalized.title,
      description: normalized.description,
      text: normalized.text,
      markdown: normalized.text,
      html: input.includeHtml ? rawText.slice(0, input.maxChars) : undefined,
      truncated: normalized.truncated || (input.includeHtml ? rawText.length > input.maxChars : false),
      images:
        input.includeImages && (contentType ?? "").includes("text/html")
          ? extractImageCandidates(rawText)
          : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      extraction,
      snapshotHash,
      rawSnapshotHash,
      citations: [
        {
          id: `src_${nanoid(8)}`,
          url: finalUrl,
          title: normalized.title,
          fetchedAt,
          snapshotHash,
        },
      ],
    };
  } finally {
    clearTimeout(timeout);
  }
}
