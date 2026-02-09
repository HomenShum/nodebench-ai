import type { ConvexQuickRef, ToolRegistryEntry } from "../types.js";
import { isEmbeddingReady, embeddingSearch, embedQuery } from "./embeddingProvider.js";

export const REGISTRY: ToolRegistryEntry[] = [
  // ── Schema Tools ──────────────────────────
  {
    name: "convex_audit_schema",
    category: "schema",
    tags: ["schema", "audit", "anti-pattern", "index", "validator"],
    quickRef: {
      nextAction: "Run convex_check_validator_coverage to ensure all functions have arg + return validators",
      nextTools: ["convex_check_validator_coverage", "convex_suggest_indexes"],
      methodology: "convex_schema_audit",
      relatedGotchas: ["system_fields_auto", "index_field_order", "field_no_dollar_underscore"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  {
    name: "convex_suggest_indexes",
    category: "schema",
    tags: ["index", "performance", "query", "optimization"],
    quickRef: {
      nextAction: "Review suggested indexes and add them to schema.ts",
      nextTools: ["convex_audit_schema", "convex_pre_deploy_gate"],
      methodology: "convex_schema_audit",
      relatedGotchas: ["index_field_order", "index_name_include_fields"],
      confidence: "medium",
    },
    phase: "audit",
    complexity: "medium",
  },
  {
    name: "convex_check_validator_coverage",
    category: "schema",
    tags: ["validator", "coverage", "args", "returns", "compliance"],
    quickRef: {
      nextAction: "Fix any functions missing arg or return validators",
      nextTools: ["convex_audit_functions", "convex_pre_deploy_gate"],
      methodology: "convex_function_compliance",
      relatedGotchas: ["returns_validator_required", "new_function_syntax"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  // ── Function Tools ────────────────────────
  {
    name: "convex_audit_functions",
    category: "function",
    tags: ["function", "audit", "public", "internal", "registration"],
    quickRef: {
      nextAction: "Review flagged functions and fix registration issues",
      nextTools: ["convex_check_function_refs", "convex_check_validator_coverage"],
      methodology: "convex_function_compliance",
      relatedGotchas: ["internal_for_private", "function_ref_not_direct", "action_from_action"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  {
    name: "convex_check_function_refs",
    category: "function",
    tags: ["function", "reference", "api", "internal", "import"],
    quickRef: {
      nextAction: "Fix broken function references",
      nextTools: ["convex_audit_functions", "convex_pre_deploy_gate"],
      methodology: "convex_function_compliance",
      relatedGotchas: ["function_ref_not_direct", "no_register_via_api", "circular_type_annotation"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Deployment Tools ──────────────────────
  {
    name: "convex_pre_deploy_gate",
    category: "deployment",
    tags: ["deploy", "gate", "pre-deploy", "quality", "check"],
    quickRef: {
      nextAction: "Fix all blockers before running npx convex deploy",
      nextTools: ["convex_check_env_vars", "convex_audit_schema"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "high",
  },
  {
    name: "convex_check_env_vars",
    category: "deployment",
    tags: ["env", "environment", "variables", "config", "deploy"],
    quickRef: {
      nextAction: "Set missing environment variables before deploying",
      nextTools: ["convex_pre_deploy_gate"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "low",
  },
  // ── Learning Tools ────────────────────────
  {
    name: "convex_record_gotcha",
    category: "learning",
    tags: ["gotcha", "learning", "edge-case", "record", "persist"],
    quickRef: {
      nextAction: "Search gotchas before your next Convex implementation to avoid repeating mistakes",
      nextTools: ["convex_search_gotchas"],
      methodology: "convex_knowledge_management",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "learn",
    complexity: "low",
  },
  {
    name: "convex_search_gotchas",
    category: "learning",
    tags: ["gotcha", "search", "knowledge", "lookup", "fts"],
    quickRef: {
      nextAction: "Apply relevant gotchas to your current implementation",
      nextTools: ["convex_record_gotcha", "convex_get_methodology"],
      methodology: "convex_knowledge_management",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "learn",
    complexity: "low",
  },
  // ── Methodology Tools ─────────────────────
  {
    name: "convex_get_methodology",
    category: "methodology",
    tags: ["methodology", "guide", "how-to", "steps", "workflow"],
    quickRef: {
      nextAction: "Follow the methodology steps in order",
      nextTools: ["convex_discover_tools"],
      methodology: "overview",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "meta",
    complexity: "low",
  },
  {
    name: "convex_discover_tools",
    category: "methodology",
    tags: ["discover", "find", "search", "tools", "help"],
    quickRef: {
      nextAction: "Use the discovered tool to proceed with your task",
      nextTools: [],
      methodology: "overview",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "meta",
    complexity: "low",
  },
  // ── Integration Bridge Tools ──────────
  {
    name: "convex_generate_rules_md",
    category: "integration",
    tags: ["rules", "generate", "markdown", "sync", "knowledge"],
    quickRef: {
      nextAction: "Review generated rules and commit to .windsurf/rules/ or .cursor/rules/",
      nextTools: ["convex_search_gotchas", "convex_audit_schema"],
      methodology: "convex_knowledge_management",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "learn",
    complexity: "low",
  },
  {
    name: "convex_snapshot_schema",
    category: "schema",
    tags: ["snapshot", "diff", "history", "schema", "track"],
    quickRef: {
      nextAction: "Make your schema changes, then snapshot again to see the diff",
      nextTools: ["convex_audit_schema", "convex_suggest_indexes"],
      methodology: "convex_schema_audit",
      relatedGotchas: ["index_field_order", "system_fields_auto"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  {
    name: "convex_bootstrap_project",
    category: "integration",
    tags: ["bootstrap", "health", "scan", "project", "onboard"],
    quickRef: {
      nextAction: "Fix criticals first, then warnings, then run full audit suite",
      nextTools: ["convex_audit_schema", "convex_audit_functions", "convex_pre_deploy_gate"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Cron & Component Tools ────────────
  {
    name: "convex_check_crons",
    category: "deployment",
    tags: ["cron", "schedule", "interval", "daily", "weekly", "jobs"],
    quickRef: {
      nextAction: "Fix any critical cron issues (duplicate names, public handlers) before deploy",
      nextTools: ["convex_pre_deploy_gate", "convex_check_env_vars"],
      methodology: "convex_deploy_verification",
      relatedGotchas: ["internal_for_private"],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "low",
  },
  {
    name: "convex_analyze_components",
    category: "integration",
    tags: ["component", "config", "plugin", "agent", "workflow", "rag", "module"],
    quickRef: {
      nextAction: "Verify all components are properly imported and used, remove unused ones",
      nextTools: ["convex_pre_deploy_gate", "convex_audit_schema"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  // ── HTTP Tools ────────────
  {
    name: "convex_analyze_http",
    category: "function",
    tags: ["http", "endpoint", "route", "cors", "api", "rest", "options", "preflight"],
    quickRef: {
      nextAction: "Fix duplicate routes and add CORS headers before deploy",
      nextTools: ["convex_pre_deploy_gate", "convex_audit_functions"],
      methodology: "convex_deploy_verification",
      relatedGotchas: ["http_exact_path", "http_route_no_wildcard", "http_cors_manual"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  // ── Critter Tools ──────────────────────────
  {
    name: "convex_critter_check",
    category: "methodology",
    tags: ["intentionality", "why", "who", "purpose", "audience", "reflection", "pre-action", "critter"],
    quickRef: {
      nextAction: "Critter check done. If verdict is 'proceed', start your Convex work. If 'reconsider', sharpen answers.",
      nextTools: ["convex_audit_schema", "convex_audit_functions", "convex_search_gotchas"],
      methodology: "convex_intentionality",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "meta",
    complexity: "low",
  },
  // ── Authorization Tools ──────────────────
  {
    name: "convex_audit_authorization",
    category: "function",
    tags: ["auth", "authorization", "security", "getUserIdentity", "public", "mutation", "permission"],
    quickRef: {
      nextAction: "Fix critical auth issues: add getUserIdentity() checks to public mutations that write data",
      nextTools: ["convex_audit_functions", "convex_audit_actions"],
      methodology: "convex_function_compliance",
      relatedGotchas: ["internal_for_private"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "high",
  },
  // ── Query Efficiency Tools ────────────────
  {
    name: "convex_audit_query_efficiency",
    category: "schema",
    tags: ["query", "performance", "collect", "filter", "index", "pagination", "efficiency", "table-scan"],
    quickRef: {
      nextAction: "Add .take() limits to unbounded .collect() calls and indexes for .filter() patterns",
      nextTools: ["convex_suggest_indexes", "convex_audit_pagination"],
      methodology: "convex_index_optimization",
      relatedGotchas: ["index_field_order"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Action Audit Tools ────────────────────
  {
    name: "convex_audit_actions",
    category: "function",
    tags: ["action", "ctx.db", "use-node", "fetch", "error-handling", "external-api", "runtime"],
    quickRef: {
      nextAction: "Fix critical action issues: remove ctx.db access, add 'use node' directives, wrap external calls in try/catch",
      nextTools: ["convex_audit_functions", "convex_audit_transaction_safety"],
      methodology: "convex_function_compliance",
      relatedGotchas: ["action_from_action"],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Type Safety Tools ─────────────────────
  {
    name: "convex_check_type_safety",
    category: "function",
    tags: ["type", "safety", "as-any", "undefined", "null", "id", "generated", "typescript"],
    quickRef: {
      nextAction: "Replace `as any` casts with proper types and use v.id() instead of v.string() for ID fields",
      nextTools: ["convex_check_validator_coverage", "convex_audit_functions"],
      methodology: "convex_function_compliance",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Transaction Safety Tools ──────────────
  {
    name: "convex_audit_transaction_safety",
    category: "function",
    tags: ["transaction", "atomicity", "race-condition", "TOCTOU", "runMutation", "consistency"],
    quickRef: {
      nextAction: "Combine multiple runMutation calls into single atomic mutation to avoid partial failures",
      nextTools: ["convex_audit_actions", "convex_audit_functions"],
      methodology: "convex_function_compliance",
      relatedGotchas: [],
      confidence: "medium",
    },
    phase: "audit",
    complexity: "high",
  },
  // ── Storage Audit Tools ───────────────────
  {
    name: "convex_audit_storage_usage",
    category: "function",
    tags: ["storage", "file", "upload", "blob", "getUrl", "orphan", "null-check"],
    quickRef: {
      nextAction: "Add null checks for storage.get()/getUrl() and implement file cleanup on record deletion",
      nextTools: ["convex_audit_functions", "convex_check_type_safety"],
      methodology: "convex_function_compliance",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  // ── Pagination Tools ──────────────────────
  {
    name: "convex_audit_pagination",
    category: "schema",
    tags: ["pagination", "paginate", "cursor", "numItems", "paginationOptsValidator", "limit"],
    quickRef: {
      nextAction: "Add paginationOptsValidator to paginated queries and bound numItems",
      nextTools: ["convex_audit_query_efficiency", "convex_suggest_indexes"],
      methodology: "convex_index_optimization",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  // ── Data Modeling Tools ───────────────────
  {
    name: "convex_audit_data_modeling",
    category: "schema",
    tags: ["modeling", "schema", "nesting", "array", "v.id", "referential-integrity", "normalization"],
    quickRef: {
      nextAction: "Fix dangling v.id() references and consider normalizing deeply nested tables",
      nextTools: ["convex_audit_schema", "convex_suggest_indexes"],
      methodology: "convex_schema_audit",
      relatedGotchas: ["system_fields_auto"],
      confidence: "medium",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Dev Setup Tools ───────────────────────
  {
    name: "convex_audit_dev_setup",
    category: "deployment",
    tags: ["setup", "gitignore", "env", "tsconfig", "initialize", "onboarding", "convex-json"],
    quickRef: {
      nextAction: "Fix setup issues: update .gitignore, create .env.example, run npx convex dev",
      nextTools: ["convex_bootstrap_project", "convex_pre_deploy_gate"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "low",
  },
  // ── Migration Tools ───────────────────────
  {
    name: "convex_schema_migration_plan",
    category: "schema",
    tags: ["migration", "diff", "snapshot", "deploy", "risk", "breaking-change", "backup"],
    quickRef: {
      nextAction: "Review migration steps and back up data before deploying if risk is high",
      nextTools: ["convex_snapshot_schema", "convex_pre_deploy_gate"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "medium",
  },
  // ── Reporting Tools ─────────────────────
  {
    name: "convex_export_sarif",
    category: "integration",
    tags: ["sarif", "export", "report", "github", "code-scanning", "ci", "static-analysis"],
    quickRef: {
      nextAction: "Upload the SARIF file to GitHub Code Scanning or open in VS Code SARIF Viewer",
      nextTools: ["convex_audit_diff", "convex_quality_gate"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "low",
  },
  {
    name: "convex_audit_diff",
    category: "deployment",
    tags: ["diff", "baseline", "trend", "new-issues", "fixed", "improving", "degrading", "comparison"],
    quickRef: {
      nextAction: "Focus on fixing new issues first, then tackle existing ones",
      nextTools: ["convex_export_sarif", "convex_quality_gate"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "medium",
  },
  // ── Vector Search Tools ─────────────────
  {
    name: "convex_audit_vector_search",
    category: "schema",
    tags: ["vector", "search", "embedding", "dimension", "similarity", "vectorIndex", "float64", "AI", "RAG"],
    quickRef: {
      nextAction: "Fix dimension mismatches and add filterFields to vector indexes for better performance",
      nextTools: ["convex_audit_schema", "convex_suggest_indexes"],
      methodology: "convex_schema_audit",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Scheduler Tools ─────────────────────
  {
    name: "convex_audit_schedulers",
    category: "function",
    tags: ["scheduler", "runAfter", "runAt", "schedule", "cron", "infinite-loop", "backoff", "retry", "delayed"],
    quickRef: {
      nextAction: "Fix self-scheduling loops (add termination conditions) and implement exponential backoff",
      nextTools: ["convex_check_crons", "convex_audit_actions"],
      methodology: "convex_function_compliance",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "medium",
  },
  // ── Quality Gate Tools ──────────────────
  {
    name: "convex_quality_gate",
    category: "deployment",
    tags: ["quality", "gate", "score", "grade", "threshold", "sonarqube", "metrics", "pass-fail", "A-F"],
    quickRef: {
      nextAction: "Fix blockers to raise your grade, then run again to verify improvement",
      nextTools: ["convex_audit_diff", "convex_export_sarif", "convex_pre_deploy_gate"],
      methodology: "convex_deploy_verification",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "deploy",
    complexity: "high",
  },
  // ── Architect Tools ──────────────────────
  {
    name: "convex_scan_capabilities",
    category: "architect",
    tags: ["scan", "capabilities", "structure", "patterns", "analysis", "functions", "schema", "data-access", "regex"],
    quickRef: {
      nextAction: "Use the capability report to identify what patterns exist before implementing new features",
      nextTools: ["convex_verify_concept", "convex_generate_plan"],
      methodology: "convex_schema_audit",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  {
    name: "convex_verify_concept",
    category: "architect",
    tags: ["verify", "concept", "signatures", "gap-analysis", "implementation", "check", "progress", "regex"],
    quickRef: {
      nextAction: "Pass missing signatures to convex_generate_plan to get Convex-specific implementation steps",
      nextTools: ["convex_generate_plan", "convex_scan_capabilities"],
      methodology: "convex_schema_audit",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "audit",
    complexity: "low",
  },
  {
    name: "convex_generate_plan",
    category: "architect",
    tags: ["plan", "implementation", "strategy", "missing", "signatures", "steps", "inject", "convex-specific"],
    quickRef: {
      nextAction: "Implement each step in order, then re-verify with convex_verify_concept to track progress",
      nextTools: ["convex_verify_concept", "convex_quality_gate"],
      methodology: "convex_function_compliance",
      relatedGotchas: [],
      confidence: "high",
    },
    phase: "implement",
    complexity: "low",
  },
];

export function getQuickRef(toolName: string): ConvexQuickRef | null {
  const entry = REGISTRY.find((e) => e.name === toolName);
  return entry?.quickRef ?? null;
}

export function getToolsByCategory(category: string): ToolRegistryEntry[] {
  return REGISTRY.filter((e) => e.category === category);
}

// ── BM25-scored tool discovery with field weighting ──────────────────────

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z_]+/g) ?? [];
}

interface BM25Index {
  corpus: Map<string, string[]>;
  docLengths: Map<string, number>;
  avgDl: number;
  idf: Map<string, number>;
}

let _bm25Index: BM25Index | null = null;

function getBM25Index(): BM25Index {
  if (_bm25Index) return _bm25Index;

  const corpus = new Map<string, string[]>();
  for (const entry of REGISTRY) {
    // Weight fields: name tokens appear 3x, tags 2x, category/phase 1x
    const nameTokens = tokenize(entry.name);
    const tagTokens = tokenize(entry.tags.join(" "));
    const catTokens = tokenize(`${entry.category} ${entry.phase}`);
    const tokens = [
      ...nameTokens, ...nameTokens, ...nameTokens, // 3x name weight
      ...tagTokens, ...tagTokens,                   // 2x tag weight
      ...catTokens,                                  // 1x category/phase
    ];
    corpus.set(entry.name, tokens);
  }

  let totalLen = 0;
  for (const tokens of corpus.values()) totalLen += tokens.length;
  const avgDl = corpus.size > 0 ? totalLen / corpus.size : 1;

  const docFreq = new Map<string, number>();
  for (const tokens of corpus.values()) {
    const unique = new Set(tokens);
    for (const t of unique) docFreq.set(t, (docFreq.get(t) ?? 0) + 1);
  }

  const N = corpus.size;
  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
  }

  _bm25Index = { corpus, docLengths: new Map([...corpus].map(([k, v]) => [k, v.length])), avgDl, idf };
  return _bm25Index;
}

export interface ScoredToolEntry extends ToolRegistryEntry {
  _score: number;
}

export function findTools(query: string): ScoredToolEntry[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const index = getBM25Index();
  const k1 = 1.2;
  const b = 0.75;

  const scored = REGISTRY.map((entry) => {
    const docTokens = index.corpus.get(entry.name) ?? [];
    const dl = index.docLengths.get(entry.name) ?? 1;

    const tf = new Map<string, number>();
    for (const t of docTokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    let score = 0;
    for (const qt of queryTokens) {
      const termTf = tf.get(qt) ?? 0;
      if (termTf === 0) continue;
      const termIdf = index.idf.get(qt) ?? 0;
      score += termIdf * (termTf * (k1 + 1)) / (termTf + k1 * (1 - b + b * (dl / index.avgDl)));
    }

    return { ...entry, _score: score };
  });

  return scored
    .filter((s) => s._score > 0)
    .sort((a, b) => b._score - a._score);
}

/**
 * Async wrapper around findTools that fuses BM25 results with embedding RRF
 * when a neural embedding provider is available. Falls back to plain findTools otherwise.
 *
 * Uses Agent-as-a-Graph bipartite RRF (arxiv:2511.18194):
 * - Tool nodes get direct wRRF with α_T = 1.0
 * - Domain nodes get stronger wRRF with α_D = 1.5 (paper-optimal, lifts sibling tools in that category)
 */
export async function findToolsWithEmbedding(query: string): Promise<ScoredToolEntry[]> {
  const bm25Results = findTools(query);

  if (!isEmbeddingReady()) return bm25Results;

  const queryVec = await embedQuery(query);
  if (!queryVec) return bm25Results;

  const vecResults = embeddingSearch(queryVec, 30);

  // Split embedding results by node type
  const toolRanks = new Map<string, number>();
  const domainRanks = new Map<string, number>();
  let toolIdx = 0, domainIdx = 0;
  for (const r of vecResults) {
    if (r.nodeType === "domain") {
      domainIdx++;
      domainRanks.set(r.name.replace("domain:", ""), domainIdx);
    } else {
      toolIdx++;
      toolRanks.set(r.name, toolIdx);
    }
  }

  // Type-specific wRRF: α_T for direct tool matches, α_D for domain matches
  // Paper-optimal (arxiv:2511.18194): α_A=1.5, α_T=1.0, K=60
  // Validated via 6-config ablation grid in mcp-local tools.test.ts
  const ALPHA_T = 1.0; // tool weight
  const ALPHA_D = 1.5; // domain weight (paper-optimal — upward traversal boost)
  const K = 60;        // RRF k parameter (paper-optimal)

  // RRF fusion: combine BM25 rank with type-specific embedding ranks
  const fusedScores = new Map<string, number>();

  bm25Results.forEach((entry, i) => {
    const bm25Rrf = 1000 / (K + i + 1);

    // Direct tool embedding match
    const tRank = toolRanks.get(entry.name);
    const toolRrf = tRank ? ALPHA_T * 1000 / (K + tRank) : 0;

    // Domain-level embedding match (upward traversal: tool → category → domain node)
    const dRank = domainRanks.get(entry.category);
    const domainRrf = dRank ? ALPHA_D * 1000 / (K + dRank) : 0;

    fusedScores.set(entry.name, bm25Rrf + toolRrf + domainRrf);
  });

  // Also include embedding-only hits not in BM25 results
  for (const [name, rank] of toolRanks) {
    if (!fusedScores.has(name)) {
      const toolRrf = ALPHA_T * 1000 / (K + rank);
      // Look up domain boost for this tool
      const entry = REGISTRY.find((e) => e.name === name);
      const dRank = entry ? domainRanks.get(entry.category) : undefined;
      const domainRrf = dRank ? ALPHA_D * 1000 / (K + dRank) : 0;
      fusedScores.set(name, toolRrf + domainRrf);
    }
  }

  // Domain-only hits: boost all tools in a matched domain even without direct tool hit
  for (const [category, dRank] of domainRanks) {
    const domainRrf = ALPHA_D * 1000 / (K + dRank);
    for (const entry of REGISTRY) {
      if (entry.category === category && !fusedScores.has(entry.name)) {
        fusedScores.set(entry.name, domainRrf);
      }
    }
  }

  // Re-sort by fused score
  const allEntries = new Map<string, ToolRegistryEntry>();
  for (const entry of bm25Results) allEntries.set(entry.name, entry);
  for (const entry of REGISTRY) {
    if (fusedScores.has(entry.name)) allEntries.set(entry.name, entry);
  }

  return [...allEntries.values()]
    .filter((e) => fusedScores.has(e.name))
    .sort((a, b) => (fusedScores.get(b.name) ?? 0) - (fusedScores.get(a.name) ?? 0))
    .map((e) => ({ ...e, _score: fusedScores.get(e.name) ?? 0 }));
}
