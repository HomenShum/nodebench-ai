import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const ROOT = process.cwd();
const SUITES_DIR = path.join(
  ROOT,
  "convex",
  "domains",
  "narrative",
  "tests",
  "goldenSets",
  "suites"
);
const OUT_FILE = path.join(
  ROOT,
  "convex",
  "domains",
  "narrative",
  "tests",
  "goldenSets",
  "generatedCases.ts"
);

const CountExpectationSchema = z
  .object({ eq: z.number().int().nonnegative().optional(), gte: z.number().int().nonnegative().optional(), lte: z.number().int().nonnegative().optional() })
  .refine((v) => v.eq !== undefined || v.gte !== undefined || v.lte !== undefined, "count must set eq/gte/lte");

const InjectedNewsItemSchema = z.object({
  headline: z.string().min(1),
  url: z.string().url(),
  publishedAt: z.number().int().nonnegative(),
  snippet: z.string().optional().default(""),
  sourceName: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
  entityKeys: z.array(z.string()).optional(),
  topicTags: z.array(z.string()).optional(),
});

const RunConfigSchema = z.object({
  weekNumber: z.string().regex(/^[0-9]{4}-W[0-9]{2}$/),
  pipelineMode: z.enum(["deterministic", "record_replay", "live"]).default("deterministic"),
  toolReplayMode: z.enum(["off", "record", "replay"]).optional(),
  codeVersion: z.string().optional(),
  scout: z.object({
    injectedNewsItems: z.array(InjectedNewsItemSchema).min(1),
    targetEntityKeys: z.array(z.string()).optional(),
    recencyDays: z.number().int().nonnegative().optional(),
    maxItemsPerEntity: z.number().int().positive().optional(),
    searchMode: z.enum(["fast", "balanced", "comprehensive"]).optional(),
  }),
  analyst: z.object({
    useHeuristicOnly: z.boolean(),
    heuristicProfile: z.string().optional(),
  }),
  publisher: z.object({
    enableDedup: z.boolean().optional(),
    dedupPolicyId: z.string().optional(),
    minCitationCoverage: z.number().min(0).max(1).optional(),
  }),
});

const ExpectedCollectionSchema = z.object({
  count: CountExpectationSchema.optional(),
  items: z
    .array(
      z.object({
        where: z.record(z.any()),
        expect: z.record(z.any()),
      })
    )
    .optional(),
});

const ExpectedPersistedOutputsSchema = z.object({
  threads: ExpectedCollectionSchema.optional(),
  events: ExpectedCollectionSchema.optional(),
  posts: ExpectedCollectionSchema.optional(),
  evidenceArtifacts: ExpectedCollectionSchema.optional(),
  searchLogs: ExpectedCollectionSchema.optional(),
  workflowTrace: z
    .object({
      requireWorkflowId: z.boolean().optional(),
      requireConfigHash: z.boolean().optional(),
      requireCodeVersion: z.boolean().optional(),
      requireReplayDigest: z.boolean().optional(),
      expectReplayMode: z.enum(["deterministic", "record_replay", "live"]).optional(),
    })
    .optional(),
});

const CaseAssertionsSchema = z
  .object({
    metrics: z
      .object({
        citationCoverageMin: z.number().min(0).max(1).optional(),
        claimCoverageMin: z.number().min(0).max(1).optional(),
        unsupportedClaimRateMax: z.number().min(0).max(1).optional(),
        hasSearchLogs: z.boolean().optional(),
      })
      .optional(),
    dedup: z
      .object({
        requireStableEventIds: z.boolean().optional(),
        requireDeterministicDedupDecisions: z.boolean().optional(),
        expectedDecisions: z
          .array(
            z.object({
              where: z.record(z.any()),
              decision: z.object({
                action: z.enum([
                  "create",
                  "skip",
                  "link_update",
                  "revise_thesis",
                  "spawn_thread",
                  "needs_review",
                ]),
                stage: z.enum([
                  "no_match",
                  "canonical_url",
                  "content_hash",
                  "near_duplicate",
                  "materiality_check",
                  "manual_override",
                ]),
                linkedToEventId: z.string().optional(),
              }),
            })
          )
          .optional(),
      })
      .optional(),
    claims: z
      .object({
        requireEvidenceBinding: z.boolean().optional(),
        minEvidenceArtifactsPerClaim: z.number().int().nonnegative().optional(),
        maxUnsupportedClaims: z.number().int().nonnegative().optional(),
      })
      .optional(),
  })
  .strict();

const GovernanceSchema = z
  .object({
    owners: z.array(z.string()).min(1),
    adjudicationPolicyVersion: z.string(),
    targetKappaOverall: z.number().min(0).max(1).optional(),
    targetKappaHighRisk: z.number().min(0).max(1).optional(),
    refreshCadenceDays: z.number().int().positive().optional(),
  })
  .strict()
  .optional();

const SuiteDefaultsSchema = z.object({
  run: RunConfigSchema,
  assertions: CaseAssertionsSchema,
});

const GoldenCaseSchema = z
  .object({
    caseId: z.string().min(1),
    name: z.string().min(1),
    tags: z.array(z.string()).optional().default([]),
    notes: z.string().optional(),
    appliesTemplates: z.array(z.string()).optional(),
    run: RunConfigSchema,
    expected: ExpectedPersistedOutputsSchema,
    assertions: CaseAssertionsSchema.optional(),
    seed: z
      .object({
        existingThread: z
          .object({
            threadId: z.string().min(1),
            name: z.string().min(1),
            thesis: z.string().min(1),
            entityKeys: z.array(z.string()).min(1),
            createdAt: z.number().int().nonnegative(),
          })
          .optional(),
        knowledgeGraph: z
          .object({
            sourceType: z.enum(["entity", "theme", "artifact", "session"]),
            sourceId: z.string().min(1),
            name: z.string().min(1),
            createdAt: z.number().int().nonnegative(),
            claims: z
              .array(
                z.object({
                  subject: z.string().min(1),
                  predicate: z.string().min(1),
                  object: z.string().min(1),
                  claimText: z.string().min(1),
                  isHighConfidence: z.boolean(),
                  sourceDocIds: z.array(z.string()),
                })
              )
              .min(1),
            edges: z
              .array(
                z.object({
                  fromIndex: z.number().int().nonnegative(),
                  toIndex: z.number().int().nonnegative(),
                  edgeType: z.enum([
                    "supports",
                    "contradicts",
                    "mentions",
                    "causes",
                    "relatedTo",
                    "partOf",
                    "precedes",
                  ]),
                  isStrong: z.boolean(),
                })
              )
              .default([]),
          })
          .optional(),
      })
      .optional(),
  })
  .strict();

const GoldenSuiteSchema = z
  .object({
    suiteId: z.string().min(1),
    version: z.string().min(1),
    createdAt: z.string().datetime().optional(),
    description: z.string().optional(),
    governance: GovernanceSchema,
    defaults: SuiteDefaultsSchema,
    templates: z.record(z.any()).optional(),
    cases: z.array(GoldenCaseSchema).min(1),
  })
  .strict();

type GoldenSuite = z.infer<typeof GoldenSuiteSchema>;

function deepMerge<T>(base: T, overlay: Partial<T>): T {
  if (Array.isArray(base) || Array.isArray(overlay)) return (overlay as T) ?? base;
  if (!base || typeof base !== "object" || !overlay || typeof overlay !== "object") {
    return (overlay as T) ?? base;
  }
  const out: any = { ...(base as any) };
  for (const [k, v] of Object.entries(overlay as any)) {
    if (v === undefined) continue;
    out[k] = deepMerge((out as any)[k], v as any);
  }
  return out;
}

async function readSuites(): Promise<GoldenSuite[]> {
  const entries = await fs.readdir(SUITES_DIR, { withFileTypes: true }).catch(() => []);
  const jsonFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith(".json"))
    .map((e) => path.join(SUITES_DIR, e.name))
    .sort();

  if (jsonFiles.length === 0) {
    throw new Error(`No suite JSON files found in ${SUITES_DIR}`);
  }

  const suites: GoldenSuite[] = [];
  for (const fp of jsonFiles) {
    const raw = await fs.readFile(fp, "utf8");
    const parsed = JSON.parse(raw);
    const suite = GoldenSuiteSchema.parse(parsed);
    suites.push(suite);
  }
  return suites;
}

function compileSuiteCases(suite: GoldenSuite) {
  const compiled: any[] = [];
  for (const c of suite.cases) {
    const run = deepMerge(suite.defaults.run, c.run);
    const assertions = deepMerge(suite.defaults.assertions, c.assertions ?? {});
    compiled.push({
      suiteId: suite.suiteId,
      suiteVersion: suite.version,
      governance: suite.governance,
      caseId: c.caseId,
      name: c.name,
      tags: c.tags ?? [],
      notes: c.notes,
      run,
      expected: c.expected,
      assertions,
      seed: c.seed,
    });
  }
  return compiled;
}

function renderTsModule(payload: { suites: GoldenSuite[]; cases: any[] }): string {
  const header = `/* eslint-disable */\n/* This file is generated by scripts/goldenSets/build-drane-golden-sets.ts. */\n/* Do not edit by hand. */\n\n`;
  const suitesMeta = payload.suites.map((s) => ({
    suiteId: s.suiteId,
    version: s.version,
    createdAt: s.createdAt,
    description: s.description,
    governance: s.governance,
    caseCount: s.cases.length,
  }));
  return (
    header +
    `import type { GoldenCase, GoldenSuiteMeta } from "./types";\n\n` +
    `export const GOLDEN_SUITES_META: GoldenSuiteMeta[] = ${JSON.stringify(suitesMeta, null, 2)};\n\n` +
    `export const GOLDEN_CASES: GoldenCase[] = ${JSON.stringify(payload.cases, null, 2)};\n`
  );
}

function assertCorpusSafety(suites: GoldenSuite[]) {
  const allowedHosts = new Set([
    "example.com",
    "example.org",
    "news.qa.local",
    "satire.qa.local",
    "localhost",
  ]);

  for (const suite of suites) {
    for (const c of suite.cases) {
      const injected = c.run?.scout?.injectedNewsItems ?? [];
      for (const item of injected) {
        const host = new URL(item.url).hostname;
        const ok = allowedHosts.has(host) || host.endsWith(".qa.local");
        if (!ok) {
          throw new Error(
            `[goldenSets] Disallowed host in suite ${suite.suiteId} case ${c.caseId}: ${host}. ` +
              `Use synthetic qa.local fixtures for audit corpora.`
          );
        }
      }
    }
  }
}

async function main() {
  const suites = await readSuites();
  assertCorpusSafety(suites);
  const cases = suites.flatMap(compileSuiteCases);
  const out = renderTsModule({ suites, cases });
  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, out, "utf8");
  // eslint-disable-next-line no-console
  console.log(`[goldenSets] Wrote ${cases.length} cases to ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
