/**
 * Research Optimizer Tools
 *
 * Deterministic multi-criteria decision analysis (MCDM) tools for
 * research-heavy optimization workflows. Designed for travel, purchasing,
 * investment, and any scenario where an agent needs to:
 *
 * 1. Merge parallel sub-agent research results into a unified dataset
 * 2. Score options against weighted criteria (deterministic, not LLM)
 * 3. Generate side-by-side comparison tables with normalized values
 *
 * These tools bridge the gap between raw web research (web_search, fetch_url,
 * extract_structured_data) and actionable recommendations. They are the
 * "optimization layer" that sits on top of parallel research agents.
 */

import { getDb, genId } from "../db.js";
import type { McpTool } from "../types.js";

// ── Types ──────────────────────────────────────────────────────────────

interface CriterionInput {
  name: string;
  weight: number;       // 0-1, all weights must sum to 1
  direction: "maximize" | "minimize";
}

interface OptionInput {
  name: string;
  values: Record<string, number>;  // criterion_name → raw value
  metadata?: Record<string, unknown>;
}

interface ScoredOption {
  rank: number;
  name: string;
  totalScore: number;
  criterionScores: Record<string, { raw: number; normalized: number; weighted: number }>;
  metadata?: Record<string, unknown>;
}

interface MergedDataset {
  mergeId: string;
  sources: string[];
  fields: string[];
  records: Record<string, unknown>[];
  conflicts: Array<{ field: string; values: unknown[]; resolution: string }>;
  timestamp: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────

function normalizeMinMax(
  values: number[],
  direction: "maximize" | "minimize"
): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 1); // all equal → perfect score
  return values.map((v) =>
    direction === "maximize"
      ? (v - min) / (max - min)
      : (max - v) / (max - min)
  );
}

function classifyCpp(cpp: number): string {
  if (cpp < 1.25) return "poor";
  if (cpp < 1.8) return "acceptable";
  if (cpp < 2.5) return "good";
  return "excellent";
}

// ── DB Schema ───────────────────────────────────────────────────────────

function ensureTables() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS research_merges (
      id TEXT PRIMARY KEY,
      sources TEXT NOT NULL,
      fields TEXT NOT NULL,
      record_count INTEGER NOT NULL,
      conflict_count INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS research_scores (
      id TEXT PRIMARY KEY,
      merge_id TEXT,
      criteria TEXT NOT NULL,
      options TEXT NOT NULL,
      ranked_results TEXT NOT NULL,
      strategy_label TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

// ── Tool 1: merge_research_results ──────────────────────────────────────

const mergeResearchResults: McpTool = {
  name: "merge_research_results",
  description:
    "Merge parallel sub-agent research results into a unified dataset. Takes arrays of records from multiple sources (e.g., Hotel Discovery Agent, Price Agent, Crowd Agent), aligns them by a join key, detects conflicts, and persists the merged dataset. Designed for coordinator agents aggregating parallel research.",
  inputSchema: {
    type: "object" as const,
    properties: {
      sources: {
        type: "array",
        items: {
          type: "object",
          properties: {
            agent_name: { type: "string", description: "Name of the source agent (e.g., 'HotelDiscoveryAgent')" },
            records: {
              type: "array",
              items: { type: "object" },
              description: "Array of record objects from this agent",
            },
          },
          required: ["agent_name", "records"],
        },
        description: "Array of { agent_name, records[] } from each parallel sub-agent",
      },
      join_key: {
        type: "string",
        description: "Field name to join records across sources (e.g., 'hotel_name')",
      },
      conflict_resolution: {
        type: "string",
        enum: ["first_wins", "last_wins", "prefer_numeric", "keep_all"],
        description: "How to resolve conflicting values for the same field. Default: prefer_numeric",
      },
    },
    required: ["sources", "join_key"],
  },
  handler: async (args: {
    sources: Array<{ agent_name: string; records: Record<string, unknown>[] }>;
    join_key: string;
    conflict_resolution?: string;
  }) => {
    ensureTables();
    const db = getDb();
    const resolution = args.conflict_resolution ?? "prefer_numeric";

    // Build a map of join_key → merged record
    const merged = new Map<string, Record<string, unknown>>();
    const conflicts: Array<{ field: string; values: unknown[]; resolution: string }> = [];
    const allFields = new Set<string>();

    for (const source of args.sources) {
      for (const record of source.records) {
        const key = String(record[args.join_key] ?? "").toLowerCase().trim();
        if (!key) continue;

        const existing = merged.get(key) ?? { [args.join_key]: record[args.join_key], _sources: [] };
        (existing._sources as string[]).push(source.agent_name);

        for (const [field, value] of Object.entries(record)) {
          if (field === args.join_key) continue;
          allFields.add(field);

          if (field in existing && existing[field] !== value) {
            // Conflict detected
            const oldVal = existing[field];
            let resolved: unknown;
            switch (resolution) {
              case "first_wins":
                resolved = oldVal;
                break;
              case "last_wins":
                resolved = value;
                break;
              case "prefer_numeric":
                resolved = typeof value === "number" ? value : (typeof oldVal === "number" ? oldVal : value);
                break;
              case "keep_all":
                resolved = Array.isArray(oldVal) ? [...oldVal, value] : [oldVal, value];
                break;
              default:
                resolved = value;
            }
            conflicts.push({ field: `${key}.${field}`, values: [oldVal, value], resolution: `${resolution} → ${JSON.stringify(resolved)}` });
            existing[field] = resolved;
          } else {
            existing[field] = value;
          }
        }
        merged.set(key, existing);
      }
    }

    const records = Array.from(merged.values());
    const mergeId = genId("merge");
    const result: MergedDataset = {
      mergeId,
      sources: args.sources.map((s) => s.agent_name),
      fields: [args.join_key, ...allFields],
      records,
      conflicts,
      timestamp: new Date().toISOString(),
    };

    // Persist
    db.prepare(
      `INSERT INTO research_merges (id, sources, fields, record_count, conflict_count, data) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      mergeId,
      JSON.stringify(result.sources),
      JSON.stringify(result.fields),
      records.length,
      conflicts.length,
      JSON.stringify(result)
    );

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            mergeId,
            recordCount: records.length,
            fields: result.fields,
            conflictCount: conflicts.length,
            conflicts: conflicts.slice(0, 10),
            sample: records.slice(0, 3),
            _hint: "Use multi_criteria_score with this mergeId to rank options, or compare_options for a side-by-side table.",
          }, null, 2),
        },
      ],
    };
  },
};

// ── Tool 2: multi_criteria_score ────────────────────────────────────────

const multiCriteriaScore: McpTool = {
  name: "multi_criteria_score",
  description:
    "Deterministic weighted multi-criteria decision analysis (MCDM). Takes options with numeric values per criterion, normalizes using min-max scaling, applies directional weights, and returns ranked results. No LLM involved — purely mathematical. Use for travel booking optimization, investment comparison, vendor selection, or any multi-attribute decision. Supports custom classification thresholds (e.g., points-per-cent valuation tiers).",
  inputSchema: {
    type: "object" as const,
    properties: {
      criteria: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Criterion name (e.g., 'cpp_value', 'distance_score')" },
            weight: { type: "number", description: "Weight 0-1. All weights should sum to 1." },
            direction: { type: "string", enum: ["maximize", "minimize"], description: "Whether higher is better (maximize) or lower is better (minimize)" },
          },
          required: ["name", "weight", "direction"],
        },
        description: "Array of criteria with weights and optimization direction",
      },
      options: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Option name (e.g., 'Hyatt House Anaheim')" },
            values: { type: "object", description: "Map of criterion_name → numeric value" },
            metadata: { type: "object", description: "Optional extra data to carry through (e.g., booking_method, chain)" },
          },
          required: ["name", "values"],
        },
        description: "Array of options to score",
      },
      merge_id: {
        type: "string",
        description: "Optional merge_id from merge_research_results to auto-load options",
      },
      strategy_label: {
        type: "string",
        description: "Optional label for this scoring run (e.g., 'Disneyland Hotel Optimization Q1 2026')",
      },
      classify_field: {
        type: "string",
        description: "Optional field to classify using built-in thresholds (e.g., 'cpp_value' for cents-per-point tiers)",
      },
    },
    required: ["criteria", "options"],
  },
  handler: async (args: {
    criteria: CriterionInput[];
    options: OptionInput[];
    merge_id?: string;
    strategy_label?: string;
    classify_field?: string;
  }) => {
    ensureTables();
    const db = getDb();

    // Validate weights sum to ~1
    const weightSum = args.criteria.reduce((s, c) => s + c.weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.05) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: `Weights sum to ${weightSum.toFixed(3)}, expected ~1.0. Adjust weights so they sum to 1.`,
            criteria: args.criteria.map((c) => `${c.name}: ${c.weight}`),
          }),
        }],
      };
    }

    // Load from merge if specified
    let options = args.options;
    if (args.merge_id && (!options || options.length === 0)) {
      const row = db.prepare(`SELECT data FROM research_merges WHERE id = ?`).get(args.merge_id) as { data: string } | undefined;
      if (row) {
        const merged = JSON.parse(row.data) as MergedDataset;
        options = merged.records.map((r) => ({
          name: String(r[merged.fields[0]] ?? "unknown"),
          values: Object.fromEntries(
            Object.entries(r).filter(([k, v]) => typeof v === "number").map(([k, v]) => [k, v as number])
          ),
          metadata: r as Record<string, unknown>,
        }));
      }
    }

    if (!options || options.length === 0) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No options provided and merge_id yielded no records." }) }] };
    }

    // Normalize per criterion
    const criterionNorms: Record<string, number[]> = {};
    for (const criterion of args.criteria) {
      const rawValues = options.map((o) => o.values[criterion.name] ?? 0);
      criterionNorms[criterion.name] = normalizeMinMax(rawValues, criterion.direction);
    }

    // Score each option
    const scored: ScoredOption[] = options.map((option, i) => {
      let totalScore = 0;
      const criterionScores: Record<string, { raw: number; normalized: number; weighted: number }> = {};

      for (const criterion of args.criteria) {
        const raw = option.values[criterion.name] ?? 0;
        const normalized = criterionNorms[criterion.name][i];
        const weighted = normalized * criterion.weight;
        totalScore += weighted;
        criterionScores[criterion.name] = { raw, normalized: Math.round(normalized * 1000) / 1000, weighted: Math.round(weighted * 1000) / 1000 };
      }

      return {
        rank: 0,
        name: option.name,
        totalScore: Math.round(totalScore * 1000) / 1000,
        criterionScores,
        metadata: option.metadata,
      };
    });

    // Rank
    scored.sort((a, b) => b.totalScore - a.totalScore);
    scored.forEach((s, i) => (s.rank = i + 1));

    // Optional classification
    let classifications: Record<string, string> | undefined;
    if (args.classify_field) {
      classifications = {};
      for (const s of scored) {
        const raw = s.criterionScores[args.classify_field]?.raw ?? 0;
        if (args.classify_field === "cpp_value" || args.classify_field.includes("cpp")) {
          classifications[s.name] = classifyCpp(raw);
        } else {
          // Generic tier
          const norm = s.criterionScores[args.classify_field]?.normalized ?? 0;
          classifications[s.name] = norm >= 0.75 ? "excellent" : norm >= 0.5 ? "good" : norm >= 0.25 ? "acceptable" : "poor";
        }
      }
    }

    // Persist
    const scoreId = genId("score");
    db.prepare(
      `INSERT INTO research_scores (id, merge_id, criteria, options, ranked_results, strategy_label) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      scoreId,
      args.merge_id ?? null,
      JSON.stringify(args.criteria),
      JSON.stringify(options.map((o) => o.name)),
      JSON.stringify(scored),
      args.strategy_label ?? null
    );

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          scoreId,
          strategyLabel: args.strategy_label,
          topRecommendation: scored[0],
          alternatives: scored.slice(1, 3),
          fullRanking: scored,
          classifications,
          criteriaUsed: args.criteria,
          _hint: "Use compare_options for a formatted side-by-side comparison table.",
        }, null, 2),
      }],
    };
  },
};

// ── Tool 3: compare_options ─────────────────────────────────────────────

const compareOptions: McpTool = {
  name: "compare_options",
  description:
    "Generate a formatted side-by-side comparison table from scored research results. Takes either raw options or a score_id from multi_criteria_score. Outputs markdown table with normalized bars, rank badges, and decision explanation. Perfect for presenting final recommendations to users.",
  inputSchema: {
    type: "object" as const,
    properties: {
      score_id: {
        type: "string",
        description: "Score ID from multi_criteria_score to load ranked results",
      },
      options: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            attributes: { type: "object", description: "Map of attribute_name → display value (string or number)" },
          },
          required: ["name", "attributes"],
        },
        description: "Manual options (alternative to score_id)",
      },
      title: {
        type: "string",
        description: "Report title (e.g., 'Disneyland Hotel Optimization Report')",
      },
      highlight_fields: {
        type: "array",
        items: { type: "string" },
        description: "Fields to highlight in the comparison (shown first)",
      },
      format: {
        type: "string",
        enum: ["markdown", "json"],
        description: "Output format. Default: markdown",
      },
    },
    required: [],
  },
  handler: async (args: {
    score_id?: string;
    options?: Array<{ name: string; attributes: Record<string, unknown> }>;
    title?: string;
    highlight_fields?: string[];
    format?: string;
  }) => {
    ensureTables();
    const db = getDb();
    const format = args.format ?? "markdown";

    let options: Array<{ name: string; rank?: number; score?: number; attributes: Record<string, unknown> }> = [];

    // Load from score_id
    if (args.score_id) {
      const row = db.prepare(`SELECT ranked_results, strategy_label FROM research_scores WHERE id = ?`).get(args.score_id) as { ranked_results: string; strategy_label: string } | undefined;
      if (row) {
        const scored = JSON.parse(row.ranked_results) as ScoredOption[];
        options = scored.map((s) => ({
          name: s.name,
          rank: s.rank,
          score: s.totalScore,
          attributes: {
            ...Object.fromEntries(
              Object.entries(s.criterionScores).map(([k, v]) => [k, `${v.raw} (${Math.round(v.normalized * 100)}%)`])
            ),
            ...(s.metadata ?? {}),
          },
        }));
      }
    }

    // Use manual options if provided
    if (args.options && args.options.length > 0) {
      options = args.options.map((o, i) => ({ ...o, rank: i + 1 }));
    }

    if (options.length === 0) {
      return { content: [{ type: "text" as const, text: JSON.stringify({ error: "No options provided and score_id yielded no results." }) }] };
    }

    if (format === "json") {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({ title: args.title ?? "Comparison", options }, null, 2),
        }],
      };
    }

    // Build markdown table
    const title = args.title ?? "Option Comparison";
    const allKeys = new Set<string>();
    for (const o of options) {
      for (const k of Object.keys(o.attributes)) {
        if (!k.startsWith("_")) allKeys.add(k);
      }
    }

    // Order: highlight fields first, then rest alphabetically
    const highlighted = new Set(args.highlight_fields ?? []);
    const orderedKeys = [
      ...(args.highlight_fields ?? []).filter((k) => allKeys.has(k)),
      ...[...allKeys].filter((k) => !highlighted.has(k)).sort(),
    ];

    let md = `# ${title}\n\n`;

    // Rank badges
    const badges = ["🥇", "🥈", "🥉"];
    for (const o of options.slice(0, 3)) {
      const badge = badges[(o.rank ?? 1) - 1] ?? "";
      md += `${badge} **#${o.rank ?? "?"} ${o.name}**${o.score ? ` — Score: ${o.score}` : ""}\n`;
    }
    md += "\n";

    // Table
    const header = ["Attribute", ...options.map((o) => o.name)];
    md += `| ${header.join(" | ")} |\n`;
    md += `| ${header.map(() => "---").join(" | ")} |\n`;

    for (const key of orderedKeys) {
      const cells = options.map((o) => {
        const val = o.attributes[key];
        return val != null ? String(val) : "—";
      });
      md += `| **${key}** | ${cells.join(" | ")} |\n`;
    }

    // Decision explanation
    if (options.length >= 2) {
      const top = options[0];
      const second = options[1];
      md += `\n## Decision\n\n`;
      md += `**${top.name}** ranks #1`;
      if (top.score && second.score) {
        const margin = ((top.score - second.score) / second.score * 100).toFixed(1);
        md += ` with a ${margin}% score advantage over ${second.name}`;
      }
      md += ".\n";
    }

    return {
      content: [{
        type: "text" as const,
        text: md,
      }],
    };
  },
};

// ── Export ───────────────────────────────────────────────────────────────

export const researchOptimizerTools: McpTool[] = [
  mergeResearchResults,
  multiCriteriaScore,
  compareOptions,
];
