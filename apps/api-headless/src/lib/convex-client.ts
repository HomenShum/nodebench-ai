import type {
  SpecDocCreate,
  SpecDoc,
  CheckResultUpdate,
  FinalizeInput,
  ProofPackCreate,
  ProofPack,
} from "../schemas/specDoc.js";

// ── Types ──────────────────────────────────────────────────────────────────

interface ConvexResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  byCompliance: Record<string, number>;
  passRate: number;
  avgChecksPerSpec: number;
  recentSpecs: Array<{ specKey: string; title: string; status: string; updatedAt: string }>;
}

export interface FusionSearchResult {
  id: string;
  source: string;
  title: string;
  snippet: string;
  url?: string;
  score: number;
  originalRank: number;
  fusedRank?: number;
  contentType: string;
  publishedAt?: string;
  author?: string;
  metadata?: Record<string, unknown>;
  highlights?: string[];
}

export interface FusionSearchPayload {
  kind: "fusion_search_results";
  version: number;
  generatedAt: string;
  payload: {
    results: FusionSearchResult[];
    totalBeforeFusion: number;
    mode: "fast" | "balanced" | "comprehensive";
    sourcesQueried: string[];
    timing: Record<string, number>;
    totalTimeMs: number;
    reranked: boolean;
    errors?: Array<{ source: string; error: string }>;
  };
}

// ── Client ─────────────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || "";

async function convexCall<T>(
  fnPath: string,
  args: Record<string, unknown>,
  endpoint: "query" | "mutation" | "action" | null = null
): Promise<ConvexResponse<T>> {
  if (!CONVEX_URL) {
    return { ok: false, error: "CONVEX_URL not configured" };
  }

  try {
    const resolvedEndpoint =
      endpoint ??
      (fnPath.includes(":query") || fnPath.startsWith("get") || fnPath.startsWith("list")
        ? "query"
        : "mutation");
    const url = `${CONVEX_URL}/api/${resolvedEndpoint}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: fnPath,
        args,
        format: "json",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `Convex ${res.status}: ${text}` };
    }

    const result = await res.json();
    return { ok: true, data: result.value as T };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown Convex error",
    };
  }
}

// ── SpecDoc Operations ─────────────────────────────────────────────────────

export async function createSpecDoc(
  input: SpecDocCreate,
  clientId?: string,
  clientOrg?: string
): Promise<ConvexResponse<SpecDoc>> {
  return convexCall<SpecDoc>("specDocs:create", {
    ...input,
    clientId,
    clientOrg: input.clientOrg || clientOrg,
  });
}

export async function getSpecDoc(specKey: string): Promise<ConvexResponse<SpecDoc>> {
  return convexCall<SpecDoc>("specDocs:getByKey", { specKey });
}

export async function listSpecDocs(filters?: {
  status?: string;
  clientOrg?: string;
  limit?: number;
  cursor?: string;
}): Promise<ConvexResponse<{ specs: SpecDoc[]; cursor?: string; total: number }>> {
  return convexCall("specDocs:list", filters || {});
}

export async function updateCheck(
  specKey: string,
  checkId: string,
  update: CheckResultUpdate
): Promise<ConvexResponse<SpecDoc>> {
  return convexCall<SpecDoc>("specDocs:updateCheck", {
    specKey,
    checkId,
    ...update,
    executedAt: new Date().toISOString(),
  });
}

export async function finalizeSpec(
  specKey: string,
  input: FinalizeInput
): Promise<ConvexResponse<SpecDoc>> {
  return convexCall<SpecDoc>("specDocs:finalize", {
    specKey,
    ...input,
    finalizedAt: new Date().toISOString(),
  });
}

export async function getDashboardStats(
  clientOrg?: string
): Promise<ConvexResponse<DashboardStats>> {
  return convexCall<DashboardStats>("specDocs:dashboardStats", {
    clientOrg,
  });
}

// ── Proof Pack Operations ──────────────────────────────────────────────────

export async function createProofPack(
  input: ProofPackCreate
): Promise<ConvexResponse<ProofPack>> {
  return convexCall<ProofPack>("proofPacks:create", input);
}

export async function getProofPack(
  packKey: string
): Promise<ConvexResponse<ProofPack>> {
  return convexCall<ProofPack>("proofPacks:getByKey", { packKey });
}

export async function listProofPacks(filters?: {
  specKey?: string;
  compliance?: string;
  limit?: number;
}): Promise<ConvexResponse<{ packs: ProofPack[]; total: number }>> {
  return convexCall("proofPacks:list", filters || {});
}

export async function exportProofPack(
  packKey: string
): Promise<ConvexResponse<{
  pack: ProofPack;
  exportFormat: "pdf_ready";
  sections: Array<{
    title: string;
    content: string;
    artifacts: Array<{ type: string; label: string; url?: string }>;
  }>;
}>> {
  return convexCall("proofPacks:export", { packKey });
}

// ── Run Operations ─────────────────────────────────────────────────────────

export async function createRun(args: {
  specKey: string;
  environment: string;
  config?: Record<string, unknown>;
  clientId?: string;
}): Promise<ConvexResponse<{ runId: string; status: string }>> {
  return convexCall("runs:create", args);
}

export async function getRun(
  runId: string
): Promise<ConvexResponse<{
  runId: string;
  specKey: string;
  status: string;
  progress: { completed: number; total: number; failed: number };
  events: Array<Record<string, unknown>>;
  startedAt: string;
  completedAt?: string;
}>> {
  return convexCall("runs:get", { runId });
}

export async function getRunEvents(
  runId: string,
  after?: string
): Promise<ConvexResponse<Array<Record<string, unknown>>>> {
  return convexCall("runs:getEvents", { runId, after });
}

export async function cancelRun(
  runId: string
): Promise<ConvexResponse<{ runId: string; status: string }>> {
  return convexCall("runs:cancel", { runId });
}

// ── Replay Operations ──────────────────────────────────────────────────────

export async function replayRun(
  runId: string,
  options?: { subset?: string[] }
): Promise<ConvexResponse<{ newRunId: string; originalRunId: string; status: string }>> {
  return convexCall("runs:replay", { runId, ...options });
}

export async function getRunTrace(
  runId: string
): Promise<ConvexResponse<{
  runId: string;
  trace: Array<{
    step: number;
    toolName: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    durationMs: number;
    timestamp: string;
  }>;
}>> {
  return convexCall("runs:getTrace", { runId });
}

export async function getRunVideo(
  runId: string
): Promise<ConvexResponse<{
  runId: string;
  clips: Array<{
    checkId: string;
    url: string;
    durationMs: number;
    thumbnail?: string;
  }>;
}>> {
  return convexCall("runs:getVideoEvidence", { runId });
}

// Search + Grounding Operations

export async function runQuickSearch(args: {
  query: string;
  maxResults?: number;
  threadId?: string;
  skipRateLimit?: boolean;
}): Promise<ConvexResponse<FusionSearchPayload>> {
  return convexCall<FusionSearchPayload>(
    "domains/search/fusion/actions:quickSearch",
    args,
    "action"
  );
}

export async function runFusionSearch(args: {
  query: string;
  mode?: "fast" | "balanced" | "comprehensive";
  sources?: string[];
  maxPerSource?: number;
  maxTotal?: number;
  enableReranking?: boolean;
  contentTypes?: string[];
  dateRange?: { start?: string; end?: string };
  threadId?: string;
  skipRateLimit?: boolean;
  skipCache?: boolean;
}): Promise<ConvexResponse<FusionSearchPayload>> {
  return convexCall<FusionSearchPayload>(
    "domains/search/fusion/actions:fusionSearch",
    args,
    "action"
  );
}
