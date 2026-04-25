#!/usr/bin/env npx tsx

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import dotenv from "dotenv";
import Papa from "papaparse";
import { nodebenchResearchTools } from "../../packages/mcp-local/src/tools/nodebenchResearchTools";

type Row = Record<string, string>;

type EvalTarget = "convex" | "convex-cli" | "api" | "mcp-local";
type PromptVariantMode = "first" | "all" | "workspace" | "chat" | "mcp";

type CaseScore = {
  caseId: string;
  promptId?: string;
  surface?: string;
  rootName: string;
  target: EvalTarget;
  runId?: string;
  latencyMs: number;
  ok: boolean;
  error?: string;
  metrics: {
    requiredEntityRecall: number;
    requiredArtifactRecall: number;
    requiredClaimRecall: number;
    evidenceCoverage: number;
    safetyPassed: boolean;
    branchCoverage: number;
  };
  missing: {
    entities: string[];
    artifacts: string[];
    claims: string[];
    branches: string[];
    safetyViolations: string[];
  };
  cost?: {
    externalSearchBudget: number;
    externalSearchUsed: number;
    externalSearchSkipped: number;
    paidSearchAllowed: boolean;
    persistedArtifactCount: number;
    persistedChunkCount: number;
    evidencePackPersisted: boolean;
  };
};

const DEFAULT_ROOT = path.resolve("benchmarks/public-footprint-eval");
const DEFAULT_CSV_DIR = path.join(DEFAULT_ROOT, "csv");
const DEFAULT_OUT_DIR = path.resolve(".tmp/public-footprint-eval");

const PUBLIC_FOOTPRINT_ANGLES = [
  "entity_profile",
  "github_ecosystem",
  "academic_research",
  "patent_intelligence",
  "document_discovery",
  "public_signals",
];

const PROMPT_VARIANT_MODES: PromptVariantMode[] = ["first", "all", "workspace", "chat", "mcp"];

dotenv.config({ path: ".env.local", override: false });
dotenv.config({ override: false });

function parseArgs(argv: string[]) {
  const args = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(arg, next);
      i += 1;
    } else {
      args.set(arg, true);
    }
  }
  return {
    csvDir: String(args.get("--csv-dir") ?? DEFAULT_CSV_DIR),
    outDir: String(args.get("--out-dir") ?? DEFAULT_OUT_DIR),
    target: String(args.get("--target") ?? "convex") as EvalTarget,
    apiUrl: String(args.get("--api-url") ?? process.env.NODEBENCH_API_URL ?? "http://127.0.0.1:8020"),
    caseId: typeof args.get("--case-id") === "string" ? String(args.get("--case-id")) : null,
    limit: Number(args.get("--limit") ?? 100),
    maxRuns: typeof args.get("--max-runs") === "string" ? Number(args.get("--max-runs")) : null,
    concurrency: Number(args.get("--concurrency") ?? 1),
    promptVariants: String(args.get("--prompt-variants") ?? "first") as PromptVariantMode,
    json: Boolean(args.get("--json")),
    help: Boolean(args.get("--help")),
  };
}

function normalizeUrl(value: string) {
  return value.trim().replace(/^['"]|['"]$/g, "").replace(/\/$/, "");
}

function readCsv(filePath: string): Row[] {
  const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const parsed = Papa.parse<Row>(raw, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => (typeof value === "string" ? value.trim() : value),
  });
  if (parsed.errors.length > 0) {
    throw new Error(`Failed to parse ${filePath}: ${parsed.errors[0].message}`);
  }
  return parsed.data.filter((row) => Object.values(row).some((value) => value.trim().length > 0));
}

function groupByCase(rows: Row[]) {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const caseId = row.case_id;
    if (!caseId) continue;
    const list = grouped.get(caseId) ?? [];
    list.push(row);
    grouped.set(caseId, list);
  }
  return grouped;
}

function normalize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/https?:\/\/(www\.)?/g, "")
    .replace(/[^a-z0-9:/._-]+/g, " ")
    .trim();
}

function includesNeedle(outputText: string, value: string) {
  const needle = normalize(value);
  return needle.length > 0 && outputText.includes(needle);
}

function required(rows: Row[], requiredColumn = "must_find") {
  return rows.filter((row) => String(row[requiredColumn]).toLowerCase() === "true");
}

function scoreFraction(total: number, found: number) {
  if (total === 0) return 1;
  return found / total;
}

function buildResearchArgs(row: Row) {
  const hints = [
    row.root_github_login ? `github:${row.root_github_login}` : "",
    row.root_openalex_author_id ? `openalex:${row.root_openalex_author_id}` : "",
    row.root_orcid ? `orcid:${row.root_orcid}` : "",
    row.root_wikidata_qid ? `wikidata:${row.root_wikidata_qid}` : "",
    row.case_type ? `case_type:${row.case_type}` : "",
    row.public_focus ? `public_focus:${row.public_focus}` : "",
    row.topic_hint ? `topic:${row.topic_hint}` : "",
  ].filter(Boolean);
  const subjectUrl =
    row.root_github_login
      ? `https://github.com/${row.root_github_login}`
      : row.seed_source_url || `https://www.wikidata.org/w/index.php?search=${encodeURIComponent(row.root_name)}`;

  return {
    goal: {
      objective: row.query_variant_1 || `Research ${row.root_name}'s public technical footprint.`,
      mode: "analyze",
      decision_type: "technical",
    },
    subjects: [
      {
        type: "person",
        name: row.root_name,
        url: subjectUrl,
        hints,
        raw: {
          case_id: row.case_id,
          root_uri: row.root_uri,
          root_github_login: row.root_github_login || undefined,
          root_orcid: row.root_orcid || undefined,
          root_openalex_author_id: row.root_openalex_author_id || undefined,
          root_wikidata_qid: row.root_wikidata_qid || undefined,
          case_type: row.case_type || undefined,
          allowed_source_classes: row.allowed_source_classes || undefined,
          public_focus: row.public_focus || undefined,
          topic_hint: row.topic_hint || undefined,
          gold_status: row.gold_status,
        },
      },
    ],
    angle_strategy: "explicit",
    angles: PUBLIC_FOOTPRINT_ANGLES,
    depth: row.required_depth || "standard",
    constraints: {
      freshness_days: 365,
      latency_budget_ms: 8_000,
      prefer_cache: true,
      max_external_calls: 0,
      evidence_min_sources_per_major_claim: 1,
    },
    deliverables: ["json_full", "ui_card_bundle"],
    context: {
      benchmark: "NodeBench Public Footprint Eval",
      case_id: row.case_id,
      gold_status: row.gold_status,
    },
  };
}

function buildResearchArgsForPrompt(row: Row, prompt?: Row) {
  const args = buildResearchArgs(row);
  if (prompt?.prompt) {
    args.goal.objective = prompt.prompt;
  }
  args.context = {
    ...args.context,
    prompt_id: prompt?.prompt_id,
    prompt_surface: prompt?.surface,
    expected_intent: prompt?.expected_intent,
  };
  return args;
}

async function callConvexRuntime(args: any) {
  const convexUrl = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL or VITE_CONVEX_URL is required for --target convex");
  }
  const response = await fetch(`${normalizeUrl(convexUrl)}/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: "domains/research/researchRunAction:runResearch",
      args,
      format: "json",
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Convex action ${response.status}: ${text.slice(0, 700)}`);
  }
  const payload = await response.json();
  return payload.value ?? payload;
}

async function callConvexCliRuntime(args: any) {
  const isProdDeployment = /^prod:/i.test(process.env.CONVEX_DEPLOYMENT ?? "");
  const commandArgs = [
    path.join("node_modules", "convex", "bin", "main.js"),
    "run",
    "--typecheck",
    "try",
    "domains/research/researchRunAction:runResearch",
    JSON.stringify(args),
  ];
  if (!isProdDeployment) {
    commandArgs.splice(2, 0, "--push");
  }

  return await new Promise<any>((resolve, reject) => {
    const child = spawn(process.execPath, commandArgs, {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const timeout = setTimeout(() => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
      reject(new Error("convex run timed out after 120000ms"));
    }, 120_000);

    child.stdout.on("data", (chunk) => stdout.push(String(chunk)));
    child.stderr.on("data", (chunk) => stderr.push(String(chunk)));
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      const out = stdout.join("");
      const err = stderr.join("");
      if (code !== 0) {
        reject(new Error(`convex run exited ${code}: ${err || out}`));
        return;
      }
      try {
        resolve(parseJsonFromMixedOutput(out));
      } catch (error) {
        reject(
          new Error(
            `Unable to parse convex run output: ${error instanceof Error ? error.message : String(error)}\n${out.slice(0, 1000)}`,
          ),
        );
      }
    });
  });
}

function parseJsonFromMixedOutput(output: string): any {
  const trimmed = output.trim();
  if (!trimmed) throw new Error("empty output");
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue below.
  }
  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) {
    return JSON.parse(trimmed.slice(firstObject, lastObject + 1));
  }
  throw new Error("no JSON object found");
}

async function callApiRuntime(apiUrl: string, args: any) {
  const apiKey = process.env.NODEBENCH_API_KEY || process.env.NODEBENCH_API_TOKEN || "";
  const response = await fetch(`${normalizeUrl(apiUrl)}/v1/research/runs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(70_000),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API runtime ${response.status}: ${text.slice(0, 700)}`);
  }
  return await response.json();
}

async function callMcpLocalRuntime(apiUrl: string, args: any) {
  process.env.NODEBENCH_API_URL = apiUrl;
  const tool = nodebenchResearchTools.find((candidate) => candidate.name === "nodebench.research_run");
  if (!tool) throw new Error("nodebench.research_run MCP tool is not registered");
  const subject = args.subjects?.[0] ?? {};
  const result = await tool.handler({
    objective: args.goal?.objective ?? "Research public footprint",
    mode: args.goal?.mode ?? "analyze",
    subjects: [
      {
        type: subject.type,
        name: subject.name,
        url: subject.url,
        hints: subject.hints,
        raw: subject.raw,
      },
    ],
    depth: args.depth,
    angles: args.angles,
    constraints: args.constraints,
    deliverables: args.deliverables,
  });
  if ((result as any)?.error) throw new Error(String((result as any).error));
  if ((result as any)?.structuredContent) return (result as any).structuredContent;
  const text = (result as any)?.content?.[0]?.text;
  if (typeof text === "string") return JSON.parse(text);
  return result;
}

function outputEvidenceRows(output: any): any[] {
  return Array.isArray(output?.evidence) ? output.evidence : [];
}

function expectedBranches(row: Row) {
  const branches = ["entity_profile", "document_discovery", "public_signals"];
  if (row.root_github_login) branches.push("github_ecosystem");
  if (/openalex|orcid|dblp|semantic_scholar|academic/i.test(`${row.allowed_source_classes} ${row.case_type}`)) {
    branches.push("academic_research");
  }
  if (/patent|inventor/i.test(`${row.allowed_source_classes} ${row.case_type}`)) {
    branches.push("patent_intelligence");
  }
  return [...new Set(branches)];
}

function scoreCase(input: {
  row: Row;
  prompt?: Row;
  output: any;
  entities: Row[];
  artifacts: Row[];
  claims: Row[];
  disallowed: Row[];
  target: EvalTarget;
  latencyMs: number;
}): CaseScore {
  const outputJson = JSON.stringify(input.output);
  const outputText = normalize(outputJson);
  const evidence = outputEvidenceRows(input.output);
  const evidenceText = normalize(JSON.stringify(evidence));
  const trace = input.output?.trace ?? {};

  const requiredEntities = required(input.entities);
  const missingEntities = requiredEntities.filter((entity) => {
    const identifier = entity.identifier || entity.entity_uri || entity.canonical_name;
    if (entity.platform === "github" && entity.identifier) {
      return !includesNeedle(outputText, `github.com/${entity.identifier}`) && !includesNeedle(outputText, entity.identifier);
    }
    return !includesNeedle(outputText, identifier) && !includesNeedle(outputText, entity.canonical_name);
  });

  const requiredArtifacts = required(input.artifacts);
  const missingArtifacts = requiredArtifacts.filter((artifact) => {
    return !includesNeedle(outputText, artifact.url) && !includesNeedle(outputText, artifact.title);
  });

  const requiredClaims = required(input.claims);
  const missingClaims = requiredClaims.filter((claim) => {
    const sourceOk = claim.source_url ? includesNeedle(outputText, claim.source_url) : true;
    const objectOk = claim.object_uri ? includesNeedle(outputText, claim.object_uri) : true;
    const literalOk = claim.object_literal ? includesNeedle(outputText, claim.object_literal) : true;
    return !(sourceOk && (objectOk || literalOk || includesNeedle(outputText, claim.claim_text)));
  });

  const evidenceRequired = requiredClaims.filter((claim) => Number(claim.required_evidence_count || 0) > 0);
  const evidenceCovered = evidenceRequired.filter((claim) => {
    if (claim.source_url && includesNeedle(evidenceText, claim.source_url)) return true;
    if (claim.object_literal && includesNeedle(evidenceText, claim.object_literal)) return true;
    return claim.object_uri ? includesNeedle(evidenceText, claim.object_uri) : evidence.length > 0;
  });

  const safetyViolations = input.disallowed
    .map((row) => row.disallowed_output)
    .filter((term) => includesNeedle(outputText, term));
  if (
    !input.row.root_github_login &&
    /no_github_required/i.test(input.row.case_type ?? "") &&
    /github\.com\/[a-z0-9-]+/i.test(outputJson)
  ) {
    safetyViolations.push("unverified GitHub profile attachment");
  }

  const selectedAngles = new Set<string>();
  const renderedArtifacts = input.output?.outputs?.rendered ?? {};
  for (const key of Object.keys(renderedArtifacts ?? {})) selectedAngles.add(key);
  const jsonFullArtifacts = renderedArtifacts?.json_full?.artifacts;
  if (Array.isArray(jsonFullArtifacts)) {
    for (const artifact of jsonFullArtifacts) selectedAngles.add(String(artifact));
  }
  const branches = expectedBranches(input.row);
  const missingBranches = branches.filter((branch) => !selectedAngles.has(branch) && !includesNeedle(outputText, branch));

  const metrics = {
    requiredEntityRecall: scoreFraction(requiredEntities.length, requiredEntities.length - missingEntities.length),
    requiredArtifactRecall: scoreFraction(requiredArtifacts.length, requiredArtifacts.length - missingArtifacts.length),
    requiredClaimRecall: scoreFraction(requiredClaims.length, requiredClaims.length - missingClaims.length),
    evidenceCoverage: scoreFraction(evidenceRequired.length, evidenceCovered.length),
    safetyPassed: safetyViolations.length === 0,
    branchCoverage: scoreFraction(branches.length, branches.length - missingBranches.length),
  };

  const ok =
    metrics.safetyPassed &&
    metrics.requiredEntityRecall >= 0.8 &&
    metrics.requiredArtifactRecall >= 0.8 &&
    metrics.requiredClaimRecall >= 0.8 &&
    metrics.evidenceCoverage >= 0.8 &&
    metrics.branchCoverage >= 0.8;

  return {
    caseId: input.row.case_id,
    promptId: input.prompt?.prompt_id,
    surface: input.prompt?.surface,
    rootName: input.row.root_name,
    target: input.target,
    runId: input.output?.run_id ?? input.output?.runId,
    latencyMs: input.latencyMs,
    ok,
    metrics,
    missing: {
      entities: missingEntities.map((row) => row.entity_uri || row.canonical_name),
      artifacts: missingArtifacts.map((row) => row.url || row.title),
      claims: missingClaims.map((row) => row.claim_id || row.claim_text),
      branches: missingBranches,
      safetyViolations,
    },
    cost: {
      externalSearchBudget: Number(trace.external_search_budget ?? 0),
      externalSearchUsed: Number(trace.external_search_used ?? 0),
      externalSearchSkipped: Number(trace.external_search_skipped ?? 0),
      paidSearchAllowed: Boolean(trace.paid_search_allowed),
      persistedArtifactCount: Number(trace.persisted_artifact_count ?? 0),
      persistedChunkCount: Number(trace.persisted_chunk_count ?? 0),
      evidencePackPersisted: Boolean(trace.evidence_pack_id),
    },
  };
}

function summarize(scores: CaseScore[]) {
  const average = (selector: (score: CaseScore) => number) =>
    scores.length === 0 ? 0 : scores.reduce((sum, score) => sum + selector(score), 0) / scores.length;
  const distinctCases = new Set(scores.map((score) => score.caseId)).size;
  return {
    runs: scores.length,
    cases: distinctCases,
    passed: scores.filter((score) => score.ok).length,
    failed: scores.filter((score) => !score.ok).length,
    passRate: scoreFraction(scores.length, scores.filter((score) => score.ok).length),
    avgLatencyMs: scores.length === 0 ? 0 : Math.round(scores.reduce((sum, score) => sum + score.latencyMs, 0) / scores.length),
    metrics: {
      requiredEntityRecall: average((score) => score.metrics.requiredEntityRecall),
      requiredArtifactRecall: average((score) => score.metrics.requiredArtifactRecall),
      requiredClaimRecall: average((score) => score.metrics.requiredClaimRecall),
      evidenceCoverage: average((score) => score.metrics.evidenceCoverage),
      safetyPassRate: average((score) => (score.metrics.safetyPassed ? 1 : 0)),
      branchCoverage: average((score) => score.metrics.branchCoverage),
    },
    cost: {
      externalSearchBudget: scores.reduce((sum, score) => sum + (score.cost?.externalSearchBudget ?? 0), 0),
      externalSearchUsed: scores.reduce((sum, score) => sum + (score.cost?.externalSearchUsed ?? 0), 0),
      externalSearchSkipped: scores.reduce((sum, score) => sum + (score.cost?.externalSearchSkipped ?? 0), 0),
      paidSearchAllowedRuns: scores.filter((score) => score.cost?.paidSearchAllowed).length,
      persistedArtifactCount: scores.reduce((sum, score) => sum + (score.cost?.persistedArtifactCount ?? 0), 0),
      persistedChunkCount: scores.reduce((sum, score) => sum + (score.cost?.persistedChunkCount ?? 0), 0),
      evidencePacksPersisted: scores.filter((score) => score.cost?.evidencePackPersisted).length,
    },
  };
}

function selectPromptsForCase(caseId: string, promptsByCase: Map<string, Row[]>, mode: PromptVariantMode) {
  const prompts = promptsByCase.get(caseId) ?? [];
  if (prompts.length === 0) return [undefined];
  if (mode === "all") return prompts;
  if (mode === "first") return [prompts[0]];

  const surfacePrompts = prompts.filter((prompt) => prompt.surface === mode);
  return surfacePrompts.length > 0 ? surfacePrompts : [prompts[0]];
}

function buildEvalItems(input: {
  cases: Row[];
  promptsByCase: Map<string, Row[]>;
  promptVariants: PromptVariantMode;
  maxRuns: number | null;
}) {
  const items: Array<{ row: Row; prompt?: Row }> = [];
  for (const row of input.cases) {
    for (const prompt of selectPromptsForCase(row.case_id, input.promptsByCase, input.promptVariants)) {
      items.push({ row, prompt });
      if (input.maxRuns !== null && items.length >= input.maxRuns) return items;
    }
  }
  return items;
}

function printHelp() {
  console.log(`NodeBench Public Footprint Runtime Eval

Usage:
  npx tsx scripts/publicFootprintEval/run-public-footprint-runtime-eval.ts --target convex-cli --limit 100
  npx tsx scripts/publicFootprintEval/run-public-footprint-runtime-eval.ts --target convex-cli --limit 100 --prompt-variants all
  npx tsx scripts/publicFootprintEval/run-public-footprint-runtime-eval.ts --target mcp-local --api-url http://127.0.0.1:8020 --limit 100 --prompt-variants all

Options:
  --target convex|convex-cli|api|mcp-local  Runtime target. Default: convex
  --limit <n>          Number of cases to run. Default: 100
  --max-runs <n>       Optional cap after prompt expansion
  --concurrency <n>    Number of runtime calls in flight. Default: 1
  --prompt-variants first|all|workspace|chat|mcp
                       Prompt expansion mode. Default: first
  --case-id <id>       Run one case
  --csv-dir <path>     Defaults to benchmarks/public-footprint-eval/csv
  --out-dir <path>     Defaults to .tmp/public-footprint-eval
  --json               Print JSON summary
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (
    args.target !== "convex" &&
    args.target !== "convex-cli" &&
    args.target !== "api" &&
    args.target !== "mcp-local"
  ) {
    throw new Error(`Unsupported --target ${args.target}`);
  }
  if (!PROMPT_VARIANT_MODES.includes(args.promptVariants)) {
    throw new Error(`Unsupported --prompt-variants ${args.promptVariants}`);
  }

  const cases = readCsv(path.join(args.csvDir, "people_cases_master.csv"));
  const prompts = groupByCase(readCsv(path.join(args.csvDir, "eval_prompts.csv")));
  const entities = groupByCase(readCsv(path.join(args.csvDir, "expected_entities.csv")));
  const artifacts = groupByCase(readCsv(path.join(args.csvDir, "expected_artifacts.csv")));
  const claims = groupByCase(readCsv(path.join(args.csvDir, "expected_claims.csv")));
  const disallowed = groupByCase(readCsv(path.join(args.csvDir, "disallowed_outputs.csv")));

  const selected = (args.caseId ? cases.filter((row) => row.case_id === args.caseId) : cases).slice(
    0,
    Math.max(1, args.limit || 100),
  );
  if (selected.length === 0) throw new Error("No benchmark cases selected");
  const evalItems = buildEvalItems({
    cases: selected,
    promptsByCase: prompts,
    promptVariants: args.promptVariants,
    maxRuns: args.maxRuns,
  });
  if (evalItems.length === 0) throw new Error("No benchmark runs selected");

  const scores: CaseScore[] = [];
  const rawRuns: Array<{ caseId: string; promptId?: string; surface?: string; output?: any; error?: string }> = [];

  const runOne = async ({ row, prompt }: { row: Row; prompt?: Row }) => {
    const startedAt = Date.now();
    try {
      const runArgs = buildResearchArgsForPrompt(row, prompt);
      const output =
        args.target === "mcp-local"
          ? await callMcpLocalRuntime(args.apiUrl, runArgs)
          : args.target === "convex-cli"
          ? await callConvexCliRuntime(runArgs)
          : args.target === "api"
          ? await callApiRuntime(args.apiUrl, runArgs)
          : await callConvexRuntime(runArgs);
      const score = scoreCase({
        row,
        prompt,
        output,
        entities: entities.get(row.case_id) ?? [],
        artifacts: artifacts.get(row.case_id) ?? [],
        claims: claims.get(row.case_id) ?? [],
        disallowed: disallowed.get(row.case_id) ?? [],
        target: args.target,
        latencyMs: Date.now() - startedAt,
      });
      scores.push(score);
      rawRuns.push({ caseId: row.case_id, promptId: prompt?.prompt_id, surface: prompt?.surface, output });
      console.log(
        `${score.ok ? "PASS" : "FAIL"} ${row.case_id}${prompt?.prompt_id ? ` ${prompt.prompt_id}` : ""} ${row.root_name} ${score.latencyMs}ms`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const score: CaseScore = {
        caseId: row.case_id,
        promptId: prompt?.prompt_id,
        surface: prompt?.surface,
        rootName: row.root_name,
        target: args.target,
        latencyMs: Date.now() - startedAt,
        ok: false,
        error: message,
        metrics: {
          requiredEntityRecall: 0,
          requiredArtifactRecall: 0,
          requiredClaimRecall: 0,
          evidenceCoverage: 0,
          safetyPassed: false,
          branchCoverage: 0,
        },
        missing: {
          entities: [],
          artifacts: [],
          claims: [],
          branches: [],
          safetyViolations: [],
        },
      };
      scores.push(score);
      rawRuns.push({ caseId: row.case_id, promptId: prompt?.prompt_id, surface: prompt?.surface, error: message });
      console.log(
        `FAIL ${row.case_id}${prompt?.prompt_id ? ` ${prompt.prompt_id}` : ""} ${row.root_name} ${score.latencyMs}ms ${message}`,
      );
    }
  };

  const concurrency = Math.max(1, Math.min(16, Math.trunc(args.concurrency || 1)));
  if (concurrency === 1) {
    for (const item of evalItems) {
      await runOne(item);
    }
  } else {
    let nextIndex = 0;
    const workers = Array.from({ length: Math.min(concurrency, evalItems.length) }, async () => {
      while (nextIndex < evalItems.length) {
        const index = nextIndex;
        nextIndex += 1;
        await runOne(evalItems[index]);
      }
    });
    await Promise.all(workers);
  }

  scores.sort((a, b) => `${a.caseId}:${a.promptId ?? ""}`.localeCompare(`${b.caseId}:${b.promptId ?? ""}`));
  rawRuns.sort((a, b) => `${a.caseId}:${a.promptId ?? ""}`.localeCompare(`${b.caseId}:${b.promptId ?? ""}`));

  const summary = {
    benchmark: "NodeBench Public Footprint Eval",
    target: args.target,
    generatedAt: new Date().toISOString(),
    source: path.resolve(args.csvDir),
    promptVariants: args.promptVariants,
    summary: summarize(scores),
    scores,
  };

  mkdirSync(args.outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = path.join(args.outDir, `runtime-${args.target}-${stamp}.json`);
  const latestPath = path.join(args.outDir, `runtime-${args.target}-latest.json`);
  const rawPath = path.join(args.outDir, `runtime-${args.target}-${stamp}.raw.json`);
  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(latestPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  writeFileSync(rawPath, `${JSON.stringify(rawRuns, null, 2)}\n`, "utf8");

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(
      [
        "NodeBench Public Footprint Runtime Eval",
        `target=${args.target}`,
        `runs=${summary.summary.runs}`,
        `cases=${summary.summary.cases}`,
        `passed=${summary.summary.passed}`,
        `passRate=${(summary.summary.passRate * 100).toFixed(1)}%`,
        `entityRecall=${(summary.summary.metrics.requiredEntityRecall * 100).toFixed(1)}%`,
        `claimRecall=${(summary.summary.metrics.requiredClaimRecall * 100).toFixed(1)}%`,
        `evidence=${(summary.summary.metrics.evidenceCoverage * 100).toFixed(1)}%`,
        `safety=${(summary.summary.metrics.safetyPassRate * 100).toFixed(1)}%`,
        `externalSearchUsed=${summary.summary.cost.externalSearchUsed}`,
        `persistedArtifacts=${summary.summary.cost.persistedArtifactCount}`,
      ].join(" "),
    );
    console.log(`Wrote ${jsonPath}`);
  }

  if (summary.summary.failed > 0) {
    process.exitCode = 1;
  }
}

if (!existsSync(DEFAULT_CSV_DIR)) {
  console.error(`Missing benchmark CSV directory: ${DEFAULT_CSV_DIR}`);
  process.exit(1);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
