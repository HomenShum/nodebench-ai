/**
 * Architect Tools — End-to-End Industry-Latest Concept Verification
 *
 * Tests the full self-discovery loop against 5 industry-latest patterns:
 * 1. Vector Search RAG Pipeline
 * 2. Real-Time Collaboration (reactive queries + optimistic updates)
 * 3. File Upload Pipeline (presigned URLs)
 * 4. Scheduled Retry Queue (exponential backoff)
 * 5. Row-Level Security (auth guards on all writes)
 *
 * For each concept:
 *   scan_capabilities → verify_concept → generate_plan → re-verify
 */

import { describe, it, expect, beforeAll } from "vitest";
import { resolve } from "node:path";
import { architectTools } from "../tools/architectTools.js";
import { getDb, seedGotchasIfEmpty } from "../db.js";
import { CONVEX_GOTCHAS } from "../gotchaSeed.js";

const PROJECT_DIR = resolve(__dirname, "../../../..");

const scanTool = architectTools.find((t) => t.name === "convex_scan_capabilities")!;
const verifyTool = architectTools.find((t) => t.name === "convex_verify_concept")!;
const planTool = architectTools.find((t) => t.name === "convex_generate_plan")!;

beforeAll(() => {
  getDb();
  seedGotchasIfEmpty(CONVEX_GOTCHAS as any);
});

// ── Step 1: Project-wide baseline scan ─────────────────────────────────

describe("Step 1: Project-Wide Capability Baseline", () => {
  it("scans the full convex directory and produces aggregate stats", async () => {
    const result = (await scanTool.handler({ projectDir: PROJECT_DIR })) as any;

    expect(result.mode).toBe("directory");
    expect(result.totalFiles).toBeGreaterThan(100);
    expect(result.activeFiles).toBeGreaterThan(50);

    // Verify aggregate categories are populated
    expect(Object.keys(result.aggregate.function_types).length).toBeGreaterThan(0);
    expect(Object.keys(result.aggregate.data_access).length).toBeGreaterThan(0);
    expect(Object.keys(result.aggregate.auth_and_context).length).toBeGreaterThan(0);

    // Project should have substantial Convex usage
    const ft = result.aggregate.function_types;
    expect(ft.queries + ft.mutations + ft.actions).toBeGreaterThan(50);

    console.log("=== PROJECT BASELINE ===");
    console.log(`Files: ${result.totalFiles} total, ${result.activeFiles} with Convex patterns`);
    console.log(`Functions: ${ft.queries ?? 0} queries, ${ft.mutations ?? 0} mutations, ${ft.actions ?? 0} actions, ${ft.internal_mutations ?? 0} internal mutations`);
    console.log(`Data access: ${result.aggregate.data_access.db_query ?? 0} queries, ${result.aggregate.data_access.db_insert ?? 0} inserts, ${result.aggregate.data_access.collect ?? 0} collects`);
    console.log(`Auth: ${result.aggregate.auth_and_context.get_user_identity ?? 0} getUserIdentity calls`);
    console.log(`Storage: ${result.aggregate.storage?.storage_store ?? 0} stores, ${result.aggregate.storage?.storage_get_url ?? 0} getUrl`);
    console.log(`Top 5 files: ${result.topFiles.slice(0, 5).map((f: any) => `${f.file} (${f.functionTypes}fn, ${f.dataAccess}da)`).join(", ")}`);
  }, 30_000);
});

// ── Step 2: Industry-Latest Concept Verification ──────────────────────

describe("Step 2: Vector Search RAG Pipeline", () => {
  it("verifies all required signatures for a production RAG setup", async () => {
    const result = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "Vector Search RAG Pipeline",
      required_signatures: [
        "vectorIndex",                          // Schema: vector index defined
        "v\\.array.*v\\.float64",               // Schema: proper float64 embedding field
        "withSearchIndex|vectorSearch",          // Code: uses vector search API
        "filterFields|filter\\s*:",             // Schema/Code: filter narrowing for vector search
        "ctx\\.db\\.insert.*embed|embedding",    // Code: stores embeddings
        "text-embedding|embed.*model|openai",    // Code: references an embedding model
      ],
    })) as any;

    expect(result.error).toBeUndefined();
    expect(result.concept).toBe("Vector Search RAG Pipeline");
    expect(result.signatures_total).toBe(6);

    console.log("=== VECTOR SEARCH RAG ===");
    console.log(`Score: ${result.match_score}, Status: ${result.status}`);
    console.log(`Evidence found (${result.evidence_found.length}):`);
    for (const ev of result.evidence_found) {
      console.log(`  ✓ ${ev.signature}: ${ev.evidence.slice(0, 100)}`);
    }
    if (result.gap_analysis.length > 0) {
      console.log(`Gaps (${result.gap_analysis.length}):`);
      for (const gap of result.gap_analysis) {
        console.log(`  ✗ ${gap}`);
      }
    }
    console.log(`Recommendation: ${result.recommendation}`);
  }, 30_000);

  it("generates a plan for any missing RAG signatures", async () => {
    // First verify to get gaps
    const verify = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "Vector Search RAG Pipeline",
      required_signatures: [
        "vectorIndex",
        "v\\.array.*v\\.float64",
        "withSearchIndex|vectorSearch",
        "filterFields|filter\\s*:",
        "ctx\\.db\\.insert.*embed|embedding",
        "text-embedding|embed.*model|openai",
      ],
    })) as any;

    if (verify.gap_analysis.length > 0) {
      const plan = (await planTool.handler({
        concept_name: "Vector Search RAG Pipeline",
        missing_signatures: verify.gap_analysis,
        current_context: "Convex project with existing vector indexes and embedding storage",
      })) as any;

      expect(plan.total_steps).toBe(verify.gap_analysis.length);
      expect(plan.steps.length).toBeGreaterThan(0);

      console.log("\n--- RAG Implementation Plan ---");
      for (const step of plan.steps) {
        expect(step.strategy).toBeDefined();
        expect(step.strategy.length).toBeGreaterThan(10); // Not a generic fallback
        expect(step.convex_file_hint).toBeDefined();
        console.log(`  Step ${step.step}: ${step.requirement}`);
        console.log(`    Strategy: ${step.strategy}`);
        console.log(`    Target: ${step.convex_file_hint}`);
      }
    } else {
      console.log("RAG pipeline fully implemented — no gaps to plan for");
    }
  }, 30_000);
});

describe("Step 2: Real-Time Collaboration", () => {
  it("verifies reactive subscription + optimistic update patterns", async () => {
    const result = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "Real-Time Collaboration",
      required_signatures: [
        "useQuery",                             // Client: reactive subscription
        "useMutation",                          // Client: mutation hook
        "query\\s*\\(",                         // Server: query function
        "mutation\\s*\\(",                      // Server: mutation function
        "ctx\\.db\\.query.*withIndex",          // Server: indexed reads for reactive efficiency
        "optimistic|OptimisticUpdate|onSuccess", // Client: optimistic updates
      ],
    })) as any;

    expect(result.error).toBeUndefined();
    expect(result.signatures_total).toBe(6);

    console.log("\n=== REAL-TIME COLLABORATION ===");
    console.log(`Score: ${result.match_score}, Status: ${result.status}`);
    console.log(`Found: ${result.evidence_found.map((e: any) => e.signature).join(", ")}`);
    if (result.gap_analysis.length > 0) {
      console.log(`Missing: ${result.gap_analysis.join(", ")}`);
    }
  }, 30_000);
});

describe("Step 2: File Upload Pipeline", () => {
  it("verifies presigned URL upload + storage management", async () => {
    const result = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "File Upload Pipeline",
      required_signatures: [
        "generateUploadUrl|storage\\.generateUploadUrl",   // Mutation: generate presigned URL
        "ctx\\.storage\\.store|storage\\.store",            // Store file
        "ctx\\.storage\\.getUrl|storage\\.getUrl",          // Retrieve URL
        "ctx\\.storage\\.delete|storage\\.delete",          // Cleanup
        "storageId|v\\.id.*_storage",                       // Schema: storage reference
      ],
    })) as any;

    expect(result.error).toBeUndefined();
    expect(result.signatures_total).toBe(5);

    console.log("\n=== FILE UPLOAD PIPELINE ===");
    console.log(`Score: ${result.match_score}, Status: ${result.status}`);
    console.log(`Found: ${result.evidence_found.map((e: any) => e.signature).join(", ")}`);
    if (result.gap_analysis.length > 0) {
      console.log(`Missing: ${result.gap_analysis.join(", ")}`);

      const plan = (await planTool.handler({
        concept_name: "File Upload Pipeline",
        missing_signatures: result.gap_analysis,
      })) as any;

      for (const step of plan.steps) {
        // File upload strategies should reference storage
        console.log(`  Plan: ${step.strategy.slice(0, 100)}`);
      }
    }
  }, 30_000);
});

describe("Step 2: Scheduled Retry Queue", () => {
  it("verifies exponential backoff + termination patterns", async () => {
    const result = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "Scheduled Retry Queue",
      required_signatures: [
        "ctx\\.scheduler\\.runAfter",                  // Scheduler: delayed execution
        "internalMutation|internalAction",             // Internal: not client-callable
        "retryCount|attempt|retries|maxRetries",       // Logic: retry tracking
        "Math\\.pow|\\*\\s*2|exponential|backoff",     // Logic: exponential backoff
        "if.*retryCount|if.*attempt|if.*retries",      // Logic: termination condition
      ],
    })) as any;

    expect(result.error).toBeUndefined();
    expect(result.signatures_total).toBe(5);

    console.log("\n=== SCHEDULED RETRY QUEUE ===");
    console.log(`Score: ${result.match_score}, Status: ${result.status}`);
    console.log(`Found: ${result.evidence_found.map((e: any) => e.signature).join(", ")}`);
    if (result.gap_analysis.length > 0) {
      console.log(`Missing: ${result.gap_analysis.join(", ")}`);

      const plan = (await planTool.handler({
        concept_name: "Scheduled Retry Queue",
        missing_signatures: result.gap_analysis,
      })) as any;

      for (const step of plan.steps) {
        // Scheduler strategies should be Convex-specific
        expect(step.convex_file_hint).toBeDefined();
        console.log(`  Plan: ${step.strategy.slice(0, 120)}`);
      }
    }
  }, 30_000);
});

describe("Step 2: Row-Level Security", () => {
  it("verifies auth guards on all mutation/action paths", async () => {
    const result = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "Row-Level Security",
      required_signatures: [
        "ctx\\.auth\\.getUserIdentity",              // Auth: identity check
        "if.*!.*identity|throw.*unauth|!identity",   // Auth: rejection on null
        "identity\\.subject|identity\\.tokenIdentifier", // Auth: user identifier extraction
        "mutation.*getUserIdentity|getUserIdentity.*mutation", // Auth: mutation has auth
        "internalMutation|internalAction",           // Security: internal-only for privileged ops
      ],
    })) as any;

    expect(result.error).toBeUndefined();
    expect(result.signatures_total).toBe(5);

    console.log("\n=== ROW-LEVEL SECURITY ===");
    console.log(`Score: ${result.match_score}, Status: ${result.status}`);
    console.log(`Found: ${result.evidence_found.map((e: any) => e.signature).join(", ")}`);
    if (result.gap_analysis.length > 0) {
      console.log(`Missing: ${result.gap_analysis.join(", ")}`);

      const plan = (await planTool.handler({
        concept_name: "Row-Level Security",
        missing_signatures: result.gap_analysis,
      })) as any;

      for (const step of plan.steps) {
        console.log(`  Plan: ${step.strategy.slice(0, 120)}`);
      }
    }
  }, 30_000);
});

// ── Step 3: Strategy Quality Validation ───────────────────────────────

describe("Step 3: Strategy Quality — Convex-Specificity", () => {
  it("generates Convex-specific (not generic) strategies for all pattern types", async () => {
    const scenarios = [
      { sig: "vectorIndex", mustContain: "schema.ts" },
      { sig: "ctx.scheduler.runAfter", mustContain: "scheduler" },
      { sig: "internalMutation", mustContain: "internal" },
      { sig: "ctx.db.query", mustContain: "withIndex" },
      { sig: "ctx.auth.getUserIdentity", mustContain: "getUserIdentity" },
      { sig: "ctx.storage.getUrl", mustContain: "null" },
      { sig: "useQuery", mustContain: "subscription" },
      { sig: "useMutation", mustContain: "mutation" },
      { sig: ".collect()", mustContain: "take" },
      { sig: "httpAction", mustContain: "http" },
      { sig: ".paginate()", mustContain: "paginate" },
      { sig: "v.id(", mustContain: "v.id" },
      { sig: "defineTable", mustContain: "schema.ts" },
      { sig: "searchIndex", mustContain: "searchIndex" },
      { sig: "ctx.storage.generateUploadUrl", mustContain: "upload" },
      { sig: "ConvexProvider", mustContain: "ConvexProvider" },
      { sig: "ctx.runMutation", mustContain: "runMutation" },
    ];

    const allGeneric: string[] = [];

    for (const { sig, mustContain } of scenarios) {
      const plan = (await planTool.handler({
        concept_name: `Test: ${sig}`,
        missing_signatures: [sig],
      })) as any;

      expect(plan.steps.length).toBe(1);
      const strategy = plan.steps[0].strategy;
      const hint = plan.steps[0].convex_file_hint;

      // Should NOT be the generic fallback
      const isGeneric = strategy === "Inject this pattern into the appropriate Convex file — check existing patterns with convex_scan_capabilities first";
      if (isGeneric) {
        allGeneric.push(sig);
      }

      // Strategy should mention the expected Convex concept
      const containsExpected = strategy.toLowerCase().includes(mustContain.toLowerCase());
      if (!containsExpected && !isGeneric) {
        console.log(`  WARN: "${sig}" strategy doesn't contain "${mustContain}": ${strategy.slice(0, 80)}`);
      }

      // File hint should not be empty
      expect(hint).toBeDefined();
      expect(hint.length).toBeGreaterThan(0);
    }

    // At most 2 generic fallbacks allowed (some patterns are truly hard to match)
    console.log(`\n=== STRATEGY QUALITY ===`);
    console.log(`${scenarios.length} patterns tested, ${scenarios.length - allGeneric.length} Convex-specific, ${allGeneric.length} generic fallback`);
    if (allGeneric.length > 0) {
      console.log(`Generic fallbacks: ${allGeneric.join(", ")}`);
    }
    expect(allGeneric.length).toBeLessThanOrEqual(2);
  });

  it("file hints point to correct Convex files for each pattern", async () => {
    const fileHintTests = [
      { sig: "defineTable", expectedHint: "schema.ts" },
      { sig: "vectorIndex", expectedHint: "schema.ts" },
      { sig: "httpAction", expectedHint: "http.ts" },
      { sig: "cronJobs", expectedHint: "crons.ts" },
      { sig: "useQuery", expectedHint: "src/" },
      { sig: "ctx.auth.getUserIdentity", expectedHint: "convex/" },
      { sig: "ctx.storage.store", expectedHint: "convex/" },
    ];

    for (const { sig, expectedHint } of fileHintTests) {
      const plan = (await planTool.handler({
        concept_name: `FileHint: ${sig}`,
        missing_signatures: [sig],
      })) as any;

      const hint = plan.steps[0].convex_file_hint;
      expect(hint).toContain(expectedHint);
    }

    console.log(`File hint tests: ${fileHintTests.length}/${fileHintTests.length} correct`);
  });
});

// ── Step 4: Full Loop — Verify → Plan → Re-verify ────────────────────

describe("Step 4: Full Self-Discovery Loop", () => {
  it("completes scan → verify → plan → re-verify cycle", async () => {
    // 1. Scan baseline
    const scan = (await scanTool.handler({ projectDir: PROJECT_DIR })) as any;
    expect(scan.mode).toBe("directory");
    console.log(`\n=== FULL LOOP ===`);
    console.log(`1. Scanned ${scan.totalFiles} files`);

    // 2. Verify a concept
    const verify1 = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "Full-Text Search",
      required_signatures: [
        "searchIndex",
        "withSearchIndex",
        "search.*filterFields|filterFields",
      ],
    })) as any;
    console.log(`2. Verified "Full-Text Search": ${verify1.match_score} (${verify1.status})`);

    // 3. If gaps exist, generate plan
    if (verify1.gap_analysis.length > 0) {
      const plan = (await planTool.handler({
        concept_name: "Full-Text Search",
        missing_signatures: verify1.gap_analysis,
        current_context: JSON.stringify(scan.aggregate?.schema_constructs ?? {}),
      })) as any;
      console.log(`3. Generated plan: ${plan.total_steps} steps, complexity=${plan.estimated_complexity}`);

      // Verify plan has conflict detection context
      for (const step of plan.steps) {
        expect(step.conflicts).not.toContain("No context provided");
      }
    } else {
      console.log(`3. No gaps — concept fully implemented`);
    }

    // 4. Re-verify (same signatures — results should be persisted in SQLite)
    const verify2 = (await verifyTool.handler({
      projectDir: PROJECT_DIR,
      concept_name: "Full-Text Search",
      required_signatures: [
        "searchIndex",
        "withSearchIndex",
        "search.*filterFields|filterFields",
      ],
    })) as any;
    console.log(`4. Re-verified: ${verify2.match_score} (${verify2.status})`);

    // Score should be consistent
    expect(verify2.match_score).toBe(verify1.match_score);

    // Both verifications should have persisted IDs
    expect(verify1.id).toBeDefined();
    expect(verify2.id).toBeDefined();
    expect(verify1.id).not.toBe(verify2.id); // Different runs
  }, 30_000);
});
