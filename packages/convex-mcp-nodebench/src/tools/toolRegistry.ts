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
 * - Domain nodes get softer wRRF with α_D = 0.6 (lifts sibling tools in that category)
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
  const ALPHA_T = 1.0; // tool weight
  const ALPHA_D = 0.6; // domain weight (gentler — lifts siblings, doesn't dominate)
  const K = 20;        // RRF k parameter

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
