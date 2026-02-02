import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(
  ROOT,
  "convex",
  "domains",
  "narrative",
  "tests",
  "goldenSets",
  "suites"
);
const OUT_FILE = path.join(OUT_DIR, "drane_audit_v1.json");

type CredTier = "tier1" | "tier2" | "tier3" | "tier4";

function isoWeekForDate(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function ms(iso: string): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new Error(`Invalid ISO date: ${iso}`);
  return t;
}

function makeUrl(base: string, caseId: string, pathPart: string, withUtm = false): string {
  const core = `${base}/${caseId}/${pathPart}`;
  return withUtm ? `${core}?utm_source=test&utm_medium=qa` : core;
}

function tierToRelevance(tier: CredTier): number {
  if (tier === "tier1") return 0.95;
  if (tier === "tier2") return 0.8;
  if (tier === "tier3") return 0.65;
  return 0.5;
}

function makeNewsItem(args: {
  caseId: string;
  headline: string;
  snippet: string;
  publishedAtIso: string;
  urlPath: string;
  baseDomain?: string;
  tier?: CredTier;
  withUtm?: boolean;
}) {
  const tier = args.tier ?? "tier1";
  const base = args.baseDomain ?? "https://news.qa.local";
  return {
    headline: args.headline,
    url: makeUrl(base, args.caseId, args.urlPath, args.withUtm ?? false),
    publishedAt: ms(args.publishedAtIso),
    snippet: args.snippet,
    sourceName: new URL(base).hostname,
    relevanceScore: tierToRelevance(tier),
  };
}

type Stratum =
  | "new_entity"
  | "dedup_canonical_url"
  | "dedup_content_hash"
  | "dedup_near_duplicate_update"
  | "linked_update_chain"
  | "contradiction_plot_twist"
  | "multilingual"
  | "satire_lowcred";

function buildCase(i: number, stratum: Stratum, weekNumber: string) {
  const caseId = `audit_${stratum}_${String(i).padStart(3, "0")}`;
  const entityKey = `entity:QA_${caseId}`;
  const baseTime = Date.parse("2026-01-19T12:00:00.000Z"); // in 2026-W04
  const t0 = baseTime + i * 60_000;

  const publishedAtIso1 = new Date(t0).toISOString();
  const publishedAtIso2 = new Date(t0 + 30 * 60_000).toISOString();
  const publishedAtIso3 = new Date(t0 + 2 * 60 * 60_000).toISOString();

  const items: any[] = [];
  const tags: string[] = [stratum];
  let seed: any = undefined;
  let expectedEventsEq = 1;
  let expectedDedupDecisions: any[] | undefined;

  const commonRun = {
    weekNumber,
    pipelineMode: "deterministic",
    scout: {
      targetEntityKeys: [entityKey],
      injectedNewsItems: [] as any[],
      recencyDays: 7,
      maxItemsPerEntity: 15,
      searchMode: "fast",
    },
    analyst: { useHeuristicOnly: true },
    publisher: { enableDedup: true, minCitationCoverage: 0.85 },
  };

  if (stratum === "new_entity") {
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo announces Series A funding round (${caseId})`,
        snippet: `Funding announcement for ${caseId} with deterministic fixtures.`,
        publishedAtIso: publishedAtIso1,
        urlPath: "funding",
        tier: "tier1",
      })
    );
    expectedEventsEq = 1;
  }

  if (stratum === "dedup_canonical_url") {
    seed = {
      existingThread: {
        threadId: `nt_${caseId}`,
        name: `QA Thread ${caseId}`,
        thesis: `Seeded thread for ${caseId}`,
        entityKeys: [entityKey],
        createdAt: t0 - 7 * 24 * 60 * 60_000,
      },
    };
    const urlPath = "story";
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo launches new product (${caseId})`,
        snippet: `Initial report for ${caseId}.`,
        publishedAtIso: publishedAtIso1,
        urlPath,
        withUtm: false,
      })
    );
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo launches new product (${caseId}) [repost]`,
        snippet: `Same canonical URL with tracking params for ${caseId}.`,
        publishedAtIso: publishedAtIso2,
        urlPath,
        withUtm: true,
      })
    );
    expectedEventsEq = 1;
    expectedDedupDecisions = [
      { action: "create", stage: "no_match" },
      { action: "skip", stage: "canonical_url" },
    ];
  }

  if (stratum === "dedup_content_hash") {
    seed = {
      existingThread: {
        threadId: `nt_${caseId}`,
        name: `QA Thread ${caseId}`,
        thesis: `Seeded thread for ${caseId}`,
        entityKeys: [entityKey],
        createdAt: t0 - 7 * 24 * 60 * 60_000,
      },
    };
    const headline = `QACo appoints new CFO (${caseId})`;
    items.push(
      makeNewsItem({
        caseId,
        headline,
        snippet: `Executive change report for ${caseId}.`,
        publishedAtIso: publishedAtIso1,
        urlPath: "exec",
        withUtm: false,
      })
    );
    // Different URL but same headline so content hash matches and should skip at stage 2.
    items.push(
      makeNewsItem({
        caseId,
        headline,
        snippet: `Syndicated repost for ${caseId}.`,
        publishedAtIso: publishedAtIso2,
        urlPath: "exec-syndicate",
        withUtm: false,
      })
    );
    expectedEventsEq = 1;
    expectedDedupDecisions = [
      { action: "create", stage: "no_match" },
      { action: "skip", stage: "content_hash" },
    ];
  }

  if (stratum === "dedup_near_duplicate_update") {
    seed = {
      existingThread: {
        threadId: `nt_${caseId}`,
        name: `QA Thread ${caseId}`,
        thesis: `Seeded thread for ${caseId}`,
        entityKeys: [entityKey],
        createdAt: t0 - 7 * 24 * 60 * 60_000,
      },
    };
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo earnings beat expectations (${caseId})`,
        snippet: `Earnings beat report for ${caseId}.`,
        publishedAtIso: publishedAtIso1,
        urlPath: "earnings",
      })
    );
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo earnings beat expectations in Q4 (${caseId})`,
        snippet: `Follow-up with slight headline variation for ${caseId}.`,
        publishedAtIso: publishedAtIso2,
        urlPath: "earnings-followup",
      })
    );
    expectedEventsEq = 2;
    expectedDedupDecisions = [
      { action: "create", stage: "no_match" },
      { action: "link_update", stage: "near_duplicate" },
    ];
  }

  if (stratum === "linked_update_chain") {
    seed = {
      existingThread: {
        threadId: `nt_${caseId}`,
        name: `QA Thread ${caseId}`,
        thesis: `Seeded thread for ${caseId}`,
        entityKeys: [entityKey],
        createdAt: t0 - 7 * 24 * 60 * 60_000,
      },
    };
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo partners with MegaCorp (${caseId})`,
        snippet: `Partnership announced for ${caseId}.`,
        publishedAtIso: publishedAtIso1,
        urlPath: "partner-1",
      })
    );
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo partners with MegaCorp (${caseId}) - terms disclosed`,
        snippet: `Update: terms disclosed for ${caseId}.`,
        publishedAtIso: publishedAtIso2,
        urlPath: "partner-2",
      })
    );
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo partners with MegaCorp (${caseId}) - deal expanded`,
        snippet: `Update: deal expanded for ${caseId}.`,
        publishedAtIso: publishedAtIso3,
        urlPath: "partner-3",
      })
    );
    expectedEventsEq = 3;
    expectedDedupDecisions = [
      { action: "create", stage: "no_match" },
      { action: "link_update", stage: "near_duplicate" },
      { action: "link_update", stage: "near_duplicate" },
    ];
  }

  if (stratum === "contradiction_plot_twist") {
    seed = {
      existingThread: {
        threadId: `nt_${caseId}`,
        name: `QA Thread ${caseId}`,
        thesis: `Seeded thread for ${caseId}`,
        entityKeys: [entityKey],
        createdAt: t0 - 14 * 24 * 60 * 60_000,
      },
      knowledgeGraph: {
        sourceType: "entity",
        sourceId: `QA_${caseId}`,
        name: `KG ${caseId}`,
        createdAt: t0 - 13 * 24 * 60 * 60_000,
        claims: [
          {
            subject: "QACo",
            predicate: "plans",
            object: "launch product",
            claimText: "QACo plans to launch product X in Q1.",
            isHighConfidence: true,
            sourceDocIds: ["doc_seed_1"],
          },
        ],
        edges: [],
      },
    };
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo confirms plan to launch product X (${caseId})`,
        snippet: `Confirmation for ${caseId}.`,
        publishedAtIso: publishedAtIso1,
        urlPath: "confirm",
      })
    );
    // Contradiction keyword "cancels" should trigger plot twist heuristics referencing subject "QACo"
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo cancels product X launch in surprising reversal (${caseId})`,
        snippet: `Unexpected cancellation for ${caseId}.`,
        publishedAtIso: publishedAtIso2,
        urlPath: "cancel",
      })
    );
    // Two thread updates + one heuristic plot_twist shift when KG claim subject matches.
    expectedEventsEq = 3;
  }

  if (stratum === "multilingual") {
    items.push(
      makeNewsItem({
        caseId,
        headline: `QACo anuncia una nueva alianza estratégica (${caseId})`,
        snippet: `Caso multilingüe (${caseId}).`,
        publishedAtIso: publishedAtIso1,
        urlPath: "es",
        tier: "tier2",
      })
    );
    expectedEventsEq = 1;
  }

  if (stratum === "satire_lowcred") {
    items.push(
      makeNewsItem({
        caseId,
        headline: `Satire: QACo secretly buys the moon (${caseId})`,
        snippet: `Obvious satire fixture for ${caseId}.`,
        publishedAtIso: publishedAtIso1,
        urlPath: "satire",
        baseDomain: "https://satire.qa.local",
        tier: "tier4",
      })
    );
    expectedEventsEq = 1;
  }

  commonRun.scout.injectedNewsItems = items;

  const expected: any = {
    threads: { count: { eq: 1 } },
    events: { count: { eq: expectedEventsEq } },
    posts: { count: { gte: 1 } },
    evidenceArtifacts: { count: { gte: 1 } },
    searchLogs: { count: { gte: 1 } },
    workflowTrace: {
      requireWorkflowId: true,
      requireConfigHash: true,
      requireReplayDigest: true,
      expectReplayMode: "deterministic",
    },
  };

  const assertions: any = {
    metrics: {
      citationCoverageMin: 0.85,
      claimCoverageMin: 0.85,
      unsupportedClaimRateMax: 0.05,
      hasSearchLogs: true,
    },
  };

  if (stratum === "contradiction_plot_twist") {
    expected.events.items = [
      {
        where: { type: "byField", field: "significance", op: "eq", value: "plot_twist" },
        expect: { significance: { eq: "plot_twist" } },
      },
    ];
  }
  if (stratum === "dedup_near_duplicate_update" || stratum === "linked_update_chain") {
    expected.events.items = [
      {
        where: { type: "byField", field: "changeSummary", op: "contains", value: "Deterministic update" },
        expect: { changeSummary: { contains: "Deterministic update" } },
      },
    ];
  }

  if (expectedDedupDecisions) {
    assertions.dedup = {
      requireStableEventIds: true,
      requireDeterministicDedupDecisions: true,
      expectedDecisions: expectedDedupDecisions.map((d: any, idx: number) => ({
        where: { type: "byIndex", index: idx },
        decision: d,
      })),
    };
  }

  return {
    caseId,
    name: `Audit QA: ${stratum} (${caseId})`,
    tags,
    run: commonRun,
    seed,
    expected,
    assertions,
  };
}

async function main() {
  const suiteDate = new Date("2026-01-27T00:00:00.000Z");
  const weekNumber = isoWeekForDate(new Date("2026-01-22T00:00:00.000Z"));
  if (weekNumber !== "2026-W04") {
    throw new Error(`Expected base week to be 2026-W04 but got ${weekNumber}`);
  }

  const strata: Stratum[] = [
    "new_entity",
    "dedup_canonical_url",
    "dedup_content_hash",
    "dedup_near_duplicate_update",
    "linked_update_chain",
    "contradiction_plot_twist",
    "multilingual",
    "satire_lowcred",
  ];

  const cases: any[] = [];
  const perStratum = 25; // 8 * 25 = 200
  for (const s of strata) {
    for (let i = 0; i < perStratum; i++) {
      cases.push(buildCase(i, s, weekNumber));
    }
  }

  const suite = {
    suiteId: "drane_audit_v1",
    version: "1.0.0",
    createdAt: suiteDate.toISOString(),
    description:
      "Stratified, deterministic audit corpus for DRANE/Newsroom. Uses injected news items; no web; no LLM.",
    governance: {
      owners: ["nodebench-ai"],
      adjudicationPolicyVersion: "v1",
      targetKappaOverall: 0.6,
      targetKappaHighRisk: 0.7,
      refreshCadenceDays: 30,
    },
    defaults: {
      run: cases[0].run,
      assertions: cases[0].assertions,
    },
    cases,
  };

  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(suite, null, 2) + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`[goldenSets] Wrote suite ${suite.suiteId} with ${cases.length} cases to ${path.relative(ROOT, OUT_FILE)}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
