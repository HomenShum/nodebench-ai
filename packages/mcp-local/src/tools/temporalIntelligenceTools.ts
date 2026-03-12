/**
 * Temporal Intelligence Tools — MCP bridge for the Unified Temporal Agentic OS.
 *
 * 7 tools that bridge the temporal substrate (Convex tables) with the MCP tool
 * ecosystem. Uses HTTP fetch to Convex for persistence with SQLite fallback
 * for offline/standalone operation.
 *
 * Tables: timeSeriesObservations, timeSeriesSignals, causalChains,
 *         zeroDraftArtifacts, proofPacks (see convex/domains/temporal/schema.ts)
 */

import { getDb } from "../db.js";
import type { McpTool } from "../types.js";

// ─── SQLite Schema (offline mirror of Convex temporal tables) ────────────────

function ensureTemporalTables(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS temporal_observations (
      id TEXT PRIMARY KEY,
      stream_key TEXT NOT NULL,
      source_type TEXT NOT NULL,
      entity_key TEXT,
      observation_type TEXT NOT NULL,
      observed_at INTEGER NOT NULL,
      value_number REAL,
      value_text TEXT,
      headline TEXT,
      summary TEXT,
      source_excerpt TEXT,
      source_refs TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_obs_stream_time ON temporal_observations(stream_key, observed_at);
    CREATE INDEX IF NOT EXISTS idx_obs_entity_time ON temporal_observations(entity_key, observed_at);

    CREATE TABLE IF NOT EXISTS temporal_signals (
      id TEXT PRIMARY KEY,
      signal_key TEXT NOT NULL,
      stream_key TEXT NOT NULL,
      entity_key TEXT,
      signal_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      detected_at INTEGER NOT NULL,
      window_start_at INTEGER,
      window_end_at INTEGER,
      confidence REAL NOT NULL,
      severity TEXT,
      summary TEXT NOT NULL,
      plain_english TEXT NOT NULL,
      evidence_observation_ids TEXT DEFAULT '[]',
      recommended_action TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sig_stream ON temporal_signals(stream_key, detected_at);
    CREATE INDEX IF NOT EXISTS idx_sig_entity ON temporal_signals(entity_key, detected_at);
    CREATE INDEX IF NOT EXISTS idx_sig_status ON temporal_signals(status, detected_at);

    CREATE TABLE IF NOT EXISTS temporal_causal_chains (
      id TEXT PRIMARY KEY,
      chain_key TEXT NOT NULL,
      title TEXT NOT NULL,
      entity_key TEXT,
      root_question TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      summary TEXT NOT NULL,
      plain_english TEXT NOT NULL,
      outcome TEXT,
      nodes TEXT NOT NULL DEFAULT '[]',
      source_refs TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chain_entity ON temporal_causal_chains(entity_key, created_at);

    CREATE TABLE IF NOT EXISTS temporal_zero_drafts (
      id TEXT PRIMARY KEY,
      artifact_key TEXT NOT NULL,
      artifact_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      target_audience TEXT,
      body_markdown TEXT NOT NULL,
      linked_signal_ids TEXT DEFAULT '[]',
      linked_chain_id TEXT,
      source_refs TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS temporal_proof_packs (
      id TEXT PRIMARY KEY,
      pack_key TEXT NOT NULL,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      summary TEXT NOT NULL,
      checklist TEXT NOT NULL DEFAULT '[]',
      pass_rate REAL,
      metrics TEXT,
      dogfood_run_id TEXT,
      zero_draft_artifact_ids TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
  `);
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Convex HTTP helpers ─────────────────────────────────────────────────────

function getConvexUrl(): string | null {
  return process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || null;
}

async function convexMutation(fnPath: string, args: Record<string, unknown>): Promise<unknown | null> {
  const url = getConvexUrl();
  if (!url) return null;
  try {
    const resp = await fetch(`${url}/api/mutation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fnPath, args }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function convexQuery(fnPath: string, args: Record<string, unknown>): Promise<unknown | null> {
  const url = getConvexUrl();
  if (!url) return null;
  try {
    const resp = await fetch(`${url}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: fnPath, args }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// ─── Statistical helpers ─────────────────────────────────────────────────────

function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 };
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  // R^2
  const meanY = sumY / n;
  const ssTot = ys.reduce((a, y) => a + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((a, y, i) => a + (y - (slope * xs[i] + intercept)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, r2 };
}

function zScore(value: number, mean: number, std: number): number {
  return std === 0 ? 0 : (value - mean) / std;
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, v) => a + (v - m) ** 2, 0) / (arr.length - 1));
}

// ─── Source type / observation type validators ───────────────────────────────

const VALID_SOURCE_TYPES = new Set(["slack", "github", "jira", "web", "document", "manual", "system"]);
const VALID_OBS_TYPES = new Set(["numeric", "categorical", "event", "text"]);
const VALID_SIGNAL_TYPES = new Set(["momentum", "regime_shift", "anomaly", "causal_hint", "opportunity_window", "risk_window"]);
const VALID_ARTIFACT_TYPES = new Set(["slack_message", "email", "spec_doc", "pr_draft", "architecture_note", "career_plan", "content_brief"]);
const VALID_SUBJECT_TYPES = new Set(["deployment", "career_move", "content_release", "research_run", "agent_loop"]);

// ─── Tools ───────────────────────────────────────────────────────────────────

export const temporalIntelligenceTools: McpTool[] = [
  // 1. ingest_temporal_observation
  {
    name: "ingest_temporal_observation",
    description:
      "Ingest a raw observation into the temporal substrate (timeSeriesObservations). Supports numeric, categorical, event, and text observations from any source type. Returns observation ID for linking to signals and causal chains.",
    inputSchema: {
      type: "object" as const,
      properties: {
        streamKey: {
          type: "string",
          description: "Stream identifier grouping related observations (e.g. 'github/commits/nodebench', 'jira/velocity/team-alpha')",
        },
        sourceType: {
          type: "string",
          enum: ["slack", "github", "jira", "web", "document", "manual", "system"],
          description: "Where this observation originates",
        },
        observationType: {
          type: "string",
          enum: ["numeric", "categorical", "event", "text"],
          description: "Type of observation value",
        },
        observedAt: {
          type: "string",
          description: "ISO timestamp of when the observation was made",
        },
        valueNumber: {
          type: "number",
          description: "Numeric value (for observationType='numeric')",
        },
        valueText: {
          type: "string",
          description: "Text value (for observationType='text' or 'categorical')",
        },
        headline: {
          type: "string",
          description: "Short headline summarizing the observation",
        },
        summary: {
          type: "string",
          description: "Longer description of what was observed",
        },
        sourceExcerpt: {
          type: "string",
          description: "Verbatim excerpt from the source (for provenance)",
        },
        sourceRefs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              url: { type: "string" },
              title: { type: "string" },
              lineStart: { type: "number" },
              lineEnd: { type: "number" },
            },
            required: ["url", "title"],
          },
          description: "Source references with URLs and optional line ranges",
        },
        entityKey: {
          type: "string",
          description: "Entity this observation relates to (e.g. 'company/openai', 'repo/nodebench')",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Freeform tags for categorization",
        },
      },
      required: ["streamKey", "sourceType", "observationType", "observedAt", "headline"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    handler: async (args: Record<string, unknown>) => {
      const streamKey = args.streamKey as string;
      const sourceType = args.sourceType as string;
      const observationType = args.observationType as string;
      const observedAtStr = args.observedAt as string;
      const headline = args.headline as string;

      // Validate
      if (!VALID_SOURCE_TYPES.has(sourceType)) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Invalid sourceType: ${sourceType}. Must be one of: ${[...VALID_SOURCE_TYPES].join(", ")}` }) }];
      }
      if (!VALID_OBS_TYPES.has(observationType)) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Invalid observationType: ${observationType}. Must be one of: ${[...VALID_OBS_TYPES].join(", ")}` }) }];
      }

      const observedAt = new Date(observedAtStr).getTime();
      if (isNaN(observedAt)) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Invalid observedAt: ${observedAtStr}. Must be valid ISO date.` }) }];
      }

      if (observationType === "numeric" && args.valueNumber == null) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "observationType='numeric' requires valueNumber" }) }];
      }

      const id = genId("tobs");
      const now = Date.now();
      const sourceRefs = (args.sourceRefs as Array<{ url: string; title: string; lineStart?: number; lineEnd?: number }>) || [];
      const tags = (args.tags as string[]) || [];

      // Try Convex first
      const convexResult = await convexMutation("domains/temporal/mutations:ingestObservation", {
        streamKey,
        sourceType,
        observationType,
        observedAt,
        valueNumber: (args.valueNumber as number) ?? undefined,
        valueText: (args.valueText as string) ?? undefined,
        headline,
        summary: (args.summary as string) ?? undefined,
        sourceExcerpt: (args.sourceExcerpt as string) ?? undefined,
        sourceRefs: sourceRefs.map((r) => ({ label: r.title, href: r.url, lineStart: r.lineStart, lineEnd: r.lineEnd })),
        entityKey: (args.entityKey as string) ?? undefined,
        tags,
      });

      // Always persist locally (offline mirror)
      ensureTemporalTables();
      const db = getDb();
      db.prepare(`
        INSERT INTO temporal_observations (id, stream_key, source_type, entity_key, observation_type,
          observed_at, value_number, value_text, headline, summary, source_excerpt, source_refs, tags, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, streamKey, sourceType, (args.entityKey as string) ?? null, observationType,
        observedAt, (args.valueNumber as number) ?? null, (args.valueText as string) ?? null,
        headline, (args.summary as string) ?? null, (args.sourceExcerpt as string) ?? null,
        JSON.stringify(sourceRefs), JSON.stringify(tags), now,
      );

      return [{
        type: "text" as const,
        text: JSON.stringify({
          observationId: id,
          streamKey,
          sourceType,
          observationType,
          observedAt: new Date(observedAt).toISOString(),
          headline,
          convexSynced: convexResult != null,
        }),
      }];
    },
  },

  // 2. detect_temporal_signal
  {
    name: "detect_temporal_signal",
    description:
      "Analyze observations in a stream and detect temporal signals: momentum (sustained directional trend), regime_shift (rolling mean shift), anomaly (z-score outlier), causal_hint, opportunity_window, or risk_window. Returns detected signals with confidence scores.",
    inputSchema: {
      type: "object" as const,
      properties: {
        streamKey: {
          type: "string",
          description: "Stream to analyze",
        },
        entityKey: {
          type: "string",
          description: "Optional entity filter",
        },
        lookbackDays: {
          type: "number",
          description: "How many days of observations to analyze (default: 30)",
        },
        signalTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["momentum", "regime_shift", "anomaly", "causal_hint", "opportunity_window", "risk_window"],
          },
          description: "Filter to specific signal types (default: all)",
        },
      },
      required: ["streamKey"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args: Record<string, unknown>) => {
      ensureTemporalTables();
      const db = getDb();
      const streamKey = args.streamKey as string;
      const lookbackDays = (args.lookbackDays as number) || 30;
      const cutoff = Date.now() - lookbackDays * 86_400_000;
      const filterTypes = args.signalTypes ? new Set(args.signalTypes as string[]) : null;

      // Query recent numeric observations
      let sql = "SELECT * FROM temporal_observations WHERE stream_key = ? AND observed_at >= ?";
      const params: unknown[] = [streamKey, cutoff];
      if (args.entityKey) {
        sql += " AND entity_key = ?";
        params.push(args.entityKey as string);
      }
      sql += " ORDER BY observed_at ASC";

      const observations = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;

      if (observations.length === 0) {
        return [{ type: "text" as const, text: JSON.stringify({
          signals: [],
          message: `No observations found for stream '${streamKey}' in last ${lookbackDays} days`,
          hint: "Ingest observations with ingest_temporal_observation first",
        }) }];
      }

      const detectedSignals: Array<Record<string, unknown>> = [];
      const now = Date.now();

      // Extract numeric series
      const numericObs = observations.filter((o) => o.observation_type === "numeric" && o.value_number != null);
      const values = numericObs.map((o) => o.value_number as number);
      const timestamps = numericObs.map((o) => o.observed_at as number);

      if (values.length >= 3) {
        // ── Momentum detection (linear regression) ──
        if (!filterTypes || filterTypes.has("momentum")) {
          const { slope, r2 } = linearRegression(timestamps, values);
          if (Math.abs(r2) > 0.5 && values.length >= 5) {
            const direction = slope > 0 ? "upward" : "downward";
            const confidence = Math.min(0.95, Math.abs(r2));
            const signalId = genId("tsig");
            detectedSignals.push({
              signalId,
              signalType: "momentum",
              confidence,
              severity: confidence > 0.8 ? "high" : confidence > 0.6 ? "medium" : "low",
              summary: `${direction} momentum detected (slope=${slope.toFixed(4)}, R2=${r2.toFixed(3)})`,
              plainEnglish: `The '${streamKey}' stream shows a consistent ${direction} trend over ${lookbackDays} days with ${(confidence * 100).toFixed(0)}% confidence.`,
              recommendedAction: `Monitor for continuation. ${direction === "upward" ? "Consider capitalizing on positive momentum." : "Investigate root cause of decline."}`,
              evidenceCount: numericObs.length,
            });

            db.prepare(`
              INSERT INTO temporal_signals (id, signal_key, stream_key, entity_key, signal_type, status,
                detected_at, confidence, severity, summary, plain_english, recommended_action, created_at)
              VALUES (?, ?, ?, ?, 'momentum', 'open', ?, ?, ?, ?, ?, ?, ?)
            `).run(
              signalId, `momentum_${streamKey}_${now}`, streamKey, (args.entityKey as string) ?? null,
              now, confidence, confidence > 0.8 ? "high" : confidence > 0.6 ? "medium" : "low",
              `${direction} momentum (slope=${slope.toFixed(4)}, R2=${r2.toFixed(3)})`,
              `Consistent ${direction} trend over ${lookbackDays} days`,
              `Monitor for continuation`, now,
            );
          }
        }

        // ── Anomaly detection (z-score on last value) ──
        if (!filterTypes || filterTypes.has("anomaly")) {
          const m = mean(values);
          const s = stddev(values);
          if (s > 0) {
            const lastVal = values[values.length - 1];
            const z = zScore(lastVal, m, s);
            if (Math.abs(z) > 2) {
              const direction = z > 0 ? "above" : "below";
              const confidence = Math.min(0.95, Math.abs(z) / 4);
              const signalId = genId("tsig");
              detectedSignals.push({
                signalId,
                signalType: "anomaly",
                confidence,
                severity: Math.abs(z) > 3 ? "high" : "medium",
                summary: `Anomaly: latest value ${lastVal.toFixed(2)} is ${Math.abs(z).toFixed(1)} std devs ${direction} mean (${m.toFixed(2)})`,
                plainEnglish: `The most recent observation in '${streamKey}' is unusually ${z > 0 ? "high" : "low"} compared to the ${lookbackDays}-day baseline.`,
                recommendedAction: "Investigate whether this is a data quality issue or a genuine outlier requiring action.",
                zScore: z,
              });

              db.prepare(`
                INSERT INTO temporal_signals (id, signal_key, stream_key, entity_key, signal_type, status,
                  detected_at, confidence, severity, summary, plain_english, recommended_action, created_at)
                VALUES (?, ?, ?, ?, 'anomaly', 'open', ?, ?, ?, ?, ?, ?, ?)
              `).run(
                signalId, `anomaly_${streamKey}_${now}`, streamKey, (args.entityKey as string) ?? null,
                now, confidence, Math.abs(z) > 3 ? "high" : "medium",
                `z-score=${z.toFixed(2)}, value=${lastVal.toFixed(2)}, mean=${m.toFixed(2)}`,
                `Unusually ${z > 0 ? "high" : "low"} value detected`,
                "Investigate data quality or genuine outlier", now,
              );
            }
          }
        }

        // ── Regime shift detection (rolling mean comparison) ──
        if ((!filterTypes || filterTypes.has("regime_shift")) && values.length >= 10) {
          const midpoint = Math.floor(values.length / 2);
          const firstHalf = values.slice(0, midpoint);
          const secondHalf = values.slice(midpoint);
          const meanFirst = mean(firstHalf);
          const meanSecond = mean(secondHalf);
          const pooledStd = stddev(values);

          if (pooledStd > 0) {
            const effectSize = Math.abs(meanSecond - meanFirst) / pooledStd;
            if (effectSize > 0.8) {
              const direction = meanSecond > meanFirst ? "upward" : "downward";
              const confidence = Math.min(0.9, effectSize / 2);
              const signalId = genId("tsig");
              detectedSignals.push({
                signalId,
                signalType: "regime_shift",
                confidence,
                severity: effectSize > 1.5 ? "high" : "medium",
                summary: `Regime shift: mean moved ${direction} (${meanFirst.toFixed(2)} -> ${meanSecond.toFixed(2)}, effect size=${effectSize.toFixed(2)})`,
                plainEnglish: `The '${streamKey}' stream appears to have shifted to a new operating regime. The average changed ${direction} significantly.`,
                recommendedAction: "Assess whether this shift is intentional or indicates a systemic change requiring response.",
                windowStartAt: timestamps[midpoint],
              });

              db.prepare(`
                INSERT INTO temporal_signals (id, signal_key, stream_key, entity_key, signal_type, status,
                  detected_at, window_start_at, confidence, severity, summary, plain_english, recommended_action, created_at)
                VALUES (?, ?, ?, ?, 'regime_shift', 'open', ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                signalId, `regime_${streamKey}_${now}`, streamKey, (args.entityKey as string) ?? null,
                now, timestamps[midpoint], confidence, effectSize > 1.5 ? "high" : "medium",
                `Mean shift ${meanFirst.toFixed(2)}->${meanSecond.toFixed(2)} (d=${effectSize.toFixed(2)})`,
                `Significant ${direction} regime shift detected`,
                "Assess whether shift is intentional", now,
              );
            }
          }
        }
      }

      // ── Event-based signals (opportunity/risk from text observations) ──
      const eventObs = observations.filter((o) => o.observation_type === "event" || o.observation_type === "text");
      if (eventObs.length > 0 && (!filterTypes || filterTypes.has("opportunity_window") || filterTypes.has("risk_window"))) {
        // Simple keyword heuristic for opportunity/risk (placeholder for LLM classification)
        const riskKeywords = ["risk", "decline", "drop", "fail", "critical", "breach", "vulnerability", "loss", "warning"];
        const oppKeywords = ["opportunity", "growth", "launch", "milestone", "breakthrough", "partnership", "funding", "expand"];

        for (const obs of eventObs.slice(-5)) { // Last 5 events
          const text = `${(obs.headline as string) || ""} ${(obs.summary as string) || ""} ${(obs.value_text as string) || ""}`.toLowerCase();
          const riskScore = riskKeywords.filter((k) => text.includes(k)).length;
          const oppScore = oppKeywords.filter((k) => text.includes(k)).length;

          if (riskScore >= 2 && (!filterTypes || filterTypes.has("risk_window"))) {
            const signalId = genId("tsig");
            detectedSignals.push({
              signalId,
              signalType: "risk_window",
              confidence: Math.min(0.8, riskScore * 0.2),
              severity: riskScore >= 3 ? "high" : "medium",
              summary: `Risk indicators detected: ${(obs.headline as string) || "unnamed event"}`,
              plainEnglish: `Recent event in '${streamKey}' contains multiple risk indicators.`,
              sourceObservationId: obs.id,
            });
          }

          if (oppScore >= 2 && (!filterTypes || filterTypes.has("opportunity_window"))) {
            const signalId = genId("tsig");
            detectedSignals.push({
              signalId,
              signalType: "opportunity_window",
              confidence: Math.min(0.8, oppScore * 0.2),
              severity: oppScore >= 3 ? "high" : "medium",
              summary: `Opportunity indicators detected: ${(obs.headline as string) || "unnamed event"}`,
              plainEnglish: `Recent event in '${streamKey}' suggests an actionable opportunity.`,
              sourceObservationId: obs.id,
            });
          }
        }
      }

      return [{
        type: "text" as const,
        text: JSON.stringify({
          streamKey,
          lookbackDays,
          observationsAnalyzed: observations.length,
          numericPoints: numericObs.length,
          eventPoints: eventObs.length,
          signalsDetected: detectedSignals.length,
          signals: detectedSignals,
        }),
      }];
    },
  },

  // 3. build_causal_chain
  {
    name: "build_causal_chain",
    description:
      "Construct a causal chain from temporal observations. Nodes must be in chronological order. Each node represents a cause-effect step with timestamp, label, description, and optional evidence links.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Title of the causal chain",
        },
        entityKey: {
          type: "string",
          description: "Entity this chain relates to",
        },
        rootQuestion: {
          type: "string",
          description: "The question this causal chain answers (e.g. 'Why did deployment latency spike?')",
        },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              timestamp: { type: "string", description: "ISO timestamp of this node" },
              label: { type: "string", description: "Short label (e.g. 'Config change pushed')" },
              description: { type: "string", description: "Detailed description of this causal step" },
              evidenceObservationIds: {
                type: "array",
                items: { type: "string" },
                description: "IDs of temporal observations supporting this node",
              },
            },
            required: ["timestamp", "label", "description"],
          },
          description: "Ordered list of causal nodes (must be chronological)",
        },
        outcome: {
          type: "string",
          description: "The outcome or conclusion of the causal chain",
        },
      },
      required: ["title", "entityKey", "rootQuestion", "nodes"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    handler: async (args: Record<string, unknown>) => {
      const title = args.title as string;
      const entityKey = args.entityKey as string;
      const rootQuestion = args.rootQuestion as string;
      const rawNodes = args.nodes as Array<{ timestamp: string; label: string; description: string; evidenceObservationIds?: string[] }>;
      const outcome = (args.outcome as string) ?? null;

      if (!rawNodes || rawNodes.length === 0) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "At least one node is required" }) }];
      }

      // Parse and validate chronological order
      const parsedNodes = rawNodes.map((n) => ({
        timestamp: new Date(n.timestamp).getTime(),
        label: n.label,
        description: n.description,
        evidenceObservationIds: n.evidenceObservationIds || [],
      }));

      for (let i = 1; i < parsedNodes.length; i++) {
        if (parsedNodes[i].timestamp < parsedNodes[i - 1].timestamp) {
          return [{ type: "text" as const, text: JSON.stringify({
            error: `Nodes must be in chronological order. Node ${i} ('${parsedNodes[i].label}') is before node ${i - 1} ('${parsedNodes[i - 1].label}')`,
          }) }];
        }
      }

      if (parsedNodes.some((n) => isNaN(n.timestamp))) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "All node timestamps must be valid ISO dates" }) }];
      }

      const id = genId("tcc");
      const chainKey = `chain_${entityKey}_${Date.now()}`;
      const now = Date.now();

      const summary = `${title}: ${parsedNodes.length} causal steps from '${parsedNodes[0].label}' to '${parsedNodes[parsedNodes.length - 1].label}'`;
      const plainEnglish = `Causal chain answering: ${rootQuestion}. ${parsedNodes.length} steps identified${outcome ? `. Outcome: ${outcome}` : ""}.`;

      // Try Convex
      await convexMutation("domains/temporal/mutations:createCausalChain", {
        chainKey,
        title,
        entityKey,
        rootQuestion,
        status: "draft",
        summary,
        plainEnglish,
        outcome,
        nodes: parsedNodes,
        timeframeStartAt: parsedNodes[0].timestamp,
        timeframeEndAt: parsedNodes[parsedNodes.length - 1].timestamp,
      });

      // Local SQLite
      ensureTemporalTables();
      const db = getDb();
      db.prepare(`
        INSERT INTO temporal_causal_chains (id, chain_key, title, entity_key, root_question, status,
          summary, plain_english, outcome, nodes, created_at)
        VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)
      `).run(id, chainKey, title, entityKey, rootQuestion, summary, plainEnglish, outcome, JSON.stringify(parsedNodes), now);

      return [{
        type: "text" as const,
        text: JSON.stringify({
          chainId: id,
          chainKey,
          title,
          nodeCount: parsedNodes.length,
          timeframeStart: new Date(parsedNodes[0].timestamp).toISOString(),
          timeframeEnd: new Date(parsedNodes[parsedNodes.length - 1].timestamp).toISOString(),
          status: "draft",
        }),
      }];
    },
  },

  // 4. generate_zero_draft
  {
    name: "generate_zero_draft",
    description:
      "Auto-draft an artifact (slack message, email, spec doc, PR draft, architecture note, career plan, or content brief) based on detected signals and causal chains. Returns draft for human approval before sending.",
    inputSchema: {
      type: "object" as const,
      properties: {
        artifactType: {
          type: "string",
          enum: ["slack_message", "email", "spec_doc", "pr_draft", "architecture_note", "career_plan", "content_brief"],
          description: "Type of artifact to generate",
        },
        title: {
          type: "string",
          description: "Title of the artifact",
        },
        targetAudience: {
          type: "string",
          description: "Who this artifact is for (e.g. 'engineering team', 'VP of Product')",
        },
        linkedSignalIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of temporal signals to incorporate",
        },
        linkedChainId: {
          type: "string",
          description: "ID of a causal chain to reference",
        },
        context: {
          type: "string",
          description: "Additional context or instructions for draft generation",
        },
      },
      required: ["artifactType", "title"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    handler: async (args: Record<string, unknown>) => {
      const artifactType = args.artifactType as string;
      const title = args.title as string;

      if (!VALID_ARTIFACT_TYPES.has(artifactType)) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Invalid artifactType: ${artifactType}` }) }];
      }

      ensureTemporalTables();
      const db = getDb();

      // Gather context from linked signals
      let signalContext = "";
      const linkedSignalIds = (args.linkedSignalIds as string[]) || [];
      if (linkedSignalIds.length > 0) {
        const placeholders = linkedSignalIds.map(() => "?").join(",");
        const signals = db.prepare(`SELECT * FROM temporal_signals WHERE id IN (${placeholders})`).all(...linkedSignalIds) as Array<Record<string, unknown>>;
        signalContext = signals.map((s) => `- [${s.signal_type}] ${s.summary} (confidence: ${s.confidence})`).join("\n");
      }

      // Gather context from linked chain
      let chainContext = "";
      const linkedChainId = args.linkedChainId as string | undefined;
      if (linkedChainId) {
        const chain = db.prepare("SELECT * FROM temporal_causal_chains WHERE id = ?").get(linkedChainId) as Record<string, unknown> | undefined;
        if (chain) {
          chainContext = `Causal Chain: ${chain.title}\nQuestion: ${chain.root_question}\n${chain.plain_english}`;
        }
      }

      // Generate draft body based on artifact type (template-based, LLM would enhance this)
      const additionalContext = (args.context as string) || "";
      const targetAudience = (args.targetAudience as string) || "general";

      const sections: string[] = [];
      sections.push(`# ${title}\n`);
      sections.push(`**Type:** ${artifactType.replace(/_/g, " ")}`);
      sections.push(`**Audience:** ${targetAudience}`);
      sections.push(`**Generated:** ${new Date().toISOString()}\n`);

      if (signalContext) {
        sections.push(`## Signals\n${signalContext}\n`);
      }
      if (chainContext) {
        sections.push(`## Causal Analysis\n${chainContext}\n`);
      }
      if (additionalContext) {
        sections.push(`## Context\n${additionalContext}\n`);
      }

      // Type-specific scaffolding
      switch (artifactType) {
        case "slack_message":
          sections.push(`## Draft Message\n[Compose concise message based on signals above]\n`);
          break;
        case "email":
          sections.push(`## Subject Line\n[Draft subject]\n\n## Body\n[Draft body with greeting, context, ask, sign-off]\n`);
          break;
        case "spec_doc":
          sections.push(`## Problem Statement\n[What problem does this solve?]\n\n## Proposed Solution\n[How?]\n\n## Success Criteria\n[How do we know it worked?]\n`);
          break;
        case "pr_draft":
          sections.push(`## Summary\n[What changed and why]\n\n## Test Plan\n[How to verify]\n\n## Risk Assessment\n[What could break]\n`);
          break;
        case "architecture_note":
          sections.push(`## Decision\n[The architectural decision]\n\n## Rationale\n[Why this approach]\n\n## Alternatives Considered\n[What else was evaluated]\n\n## Consequences\n[Tradeoffs accepted]\n`);
          break;
        case "career_plan":
          sections.push(`## Current State\n[Where you are]\n\n## Target State\n[Where you want to be]\n\n## Gap Analysis\n[What's missing]\n\n## 90-Day Actions\n[Concrete next steps]\n`);
          break;
        case "content_brief":
          sections.push(`## Hook\n[Opening angle]\n\n## Key Points\n[3-5 main points]\n\n## Evidence\n[Supporting data]\n\n## CTA\n[Call to action]\n`);
          break;
      }

      const bodyMarkdown = sections.join("\n");
      const id = genId("tzd");
      const artifactKey = `draft_${artifactType}_${Date.now()}`;
      const now = Date.now();

      const summary = `Zero-draft ${artifactType.replace(/_/g, " ")} — '${title}' for ${targetAudience}`;
      const plainEnglish = `Draft ${artifactType.replace(/_/g, " ")} created with ${linkedSignalIds.length} linked signals${linkedChainId ? " and causal chain analysis" : ""}.`;

      db.prepare(`
        INSERT INTO temporal_zero_drafts (id, artifact_key, artifact_type, status, title, summary,
          target_audience, body_markdown, linked_signal_ids, linked_chain_id, created_at)
        VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
      `).run(id, artifactKey, artifactType, title, summary, targetAudience, bodyMarkdown,
        JSON.stringify(linkedSignalIds), linkedChainId ?? null, now);

      return [{
        type: "text" as const,
        text: JSON.stringify({
          artifactId: id,
          artifactKey,
          artifactType,
          title,
          status: "draft",
          bodyMarkdown,
          linkedSignals: linkedSignalIds.length,
          linkedChain: linkedChainId ?? null,
          hint: "Review and edit the draft, then approve it via the Convex UI or a follow-up tool call.",
        }),
      }];
    },
  },

  // 5. create_proof_pack
  {
    name: "create_proof_pack",
    description:
      "Assemble an immutable proof pack for verification. Bundles a checklist (pass/fail items), optional metrics (tokens, duration, cost), and links to dogfood runs and zero-draft artifacts. Computes pass rate automatically.",
    inputSchema: {
      type: "object" as const,
      properties: {
        subjectType: {
          type: "string",
          enum: ["deployment", "career_move", "content_release", "research_run", "agent_loop"],
          description: "What this proof pack covers",
        },
        subjectId: {
          type: "string",
          description: "Identifier for the subject (e.g. deployment version, research run ID)",
        },
        checklist: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Checklist item label" },
              passed: { type: "boolean", description: "Whether this item passed" },
              note: { type: "string", description: "Optional note about this item" },
            },
            required: ["label", "passed"],
          },
          description: "Checklist items with pass/fail status",
        },
        metrics: {
          type: "object",
          properties: {
            totalTokens: { type: "number" },
            totalDurationMs: { type: "number" },
            estimatedCostUsd: { type: "number" },
          },
          description: "Optional performance metrics",
        },
        dogfoodRunId: {
          type: "string",
          description: "ID of associated dogfood QA run",
        },
        zeroDraftArtifactIds: {
          type: "array",
          items: { type: "string" },
          description: "IDs of zero-draft artifacts included in this proof pack",
        },
      },
      required: ["subjectType", "subjectId", "checklist"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
    handler: async (args: Record<string, unknown>) => {
      const subjectType = args.subjectType as string;
      const subjectId = args.subjectId as string;
      const checklist = args.checklist as Array<{ label: string; passed: boolean; note?: string }>;

      if (!VALID_SUBJECT_TYPES.has(subjectType)) {
        return [{ type: "text" as const, text: JSON.stringify({ error: `Invalid subjectType: ${subjectType}` }) }];
      }
      if (!checklist || checklist.length === 0) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "Checklist must have at least one item" }) }];
      }

      const passed = checklist.filter((c) => c.passed).length;
      const total = checklist.length;
      const passRate = passed / total;

      const id = genId("tpp");
      const packKey = `proof_${subjectType}_${subjectId}_${Date.now()}`;
      const now = Date.now();
      const metrics = (args.metrics as Record<string, number>) ?? null;
      const zeroDraftArtifactIds = (args.zeroDraftArtifactIds as string[]) || [];

      const status = passRate === 1 ? "ready" : "draft";
      const summary = `Proof pack for ${subjectType}/${subjectId}: ${passed}/${total} passed (${(passRate * 100).toFixed(0)}%)`;

      ensureTemporalTables();
      const db = getDb();
      db.prepare(`
        INSERT INTO temporal_proof_packs (id, pack_key, subject_type, subject_id, status, summary,
          checklist, pass_rate, metrics, dogfood_run_id, zero_draft_artifact_ids, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, packKey, subjectType, subjectId, status, summary,
        JSON.stringify(checklist), passRate, metrics ? JSON.stringify(metrics) : null,
        (args.dogfoodRunId as string) ?? null, JSON.stringify(zeroDraftArtifactIds), now,
      );

      return [{
        type: "text" as const,
        text: JSON.stringify({
          proofPackId: id,
          packKey,
          subjectType,
          subjectId,
          status,
          passRate,
          passed,
          total,
          summary,
          metrics: metrics ?? null,
        }),
      }];
    },
  },

  // 6. query_temporal_signals
  {
    name: "query_temporal_signals",
    description:
      "Search and retrieve temporal signals with filtering by entity, signal type, status, and date range. Returns formatted signal records from the local temporal store.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entityKey: {
          type: "string",
          description: "Filter by entity key",
        },
        signalType: {
          type: "string",
          enum: ["momentum", "regime_shift", "anomaly", "causal_hint", "opportunity_window", "risk_window"],
          description: "Filter by signal type",
        },
        status: {
          type: "string",
          enum: ["open", "watch", "resolved", "dismissed"],
          description: "Filter by status (default: all)",
        },
        startDate: {
          type: "string",
          description: "Filter signals detected after this ISO date",
        },
        endDate: {
          type: "string",
          description: "Filter signals detected before this ISO date",
        },
        limit: {
          type: "number",
          description: "Max results (default: 20)",
        },
      },
      required: [],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args: Record<string, unknown>) => {
      ensureTemporalTables();
      const db = getDb();
      const limit = (args.limit as number) || 20;

      let sql = "SELECT * FROM temporal_signals WHERE 1=1";
      const params: unknown[] = [];

      if (args.entityKey) {
        sql += " AND entity_key = ?";
        params.push(args.entityKey as string);
      }
      if (args.signalType) {
        sql += " AND signal_type = ?";
        params.push(args.signalType as string);
      }
      if (args.status) {
        sql += " AND status = ?";
        params.push(args.status as string);
      }
      if (args.startDate) {
        sql += " AND detected_at >= ?";
        params.push(new Date(args.startDate as string).getTime());
      }
      if (args.endDate) {
        sql += " AND detected_at <= ?";
        params.push(new Date(args.endDate as string).getTime());
      }

      sql += " ORDER BY detected_at DESC LIMIT ?";
      params.push(limit);

      const signals = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;

      return [{
        type: "text" as const,
        text: JSON.stringify({
          signals: signals.map((s) => ({
            ...s,
            detectedAtISO: new Date(s.detected_at as number).toISOString(),
          })),
          count: signals.length,
          filters: {
            entityKey: args.entityKey ?? null,
            signalType: args.signalType ?? null,
            status: args.status ?? null,
            startDate: args.startDate ?? null,
            endDate: args.endDate ?? null,
          },
        }),
      }];
    },
  },

  // 7. forecast_temporal_trend
  {
    name: "forecast_temporal_trend",
    description:
      "Zero-shot forecasting on numeric time series. Supports naive (last value), linear (regression), and exponential_smoothing methods. Returns predictions with confidence intervals. Placeholder for future TSFM (Chronos/TimesFM) microservice integration.",
    inputSchema: {
      type: "object" as const,
      properties: {
        streamKey: {
          type: "string",
          description: "Stream to forecast",
        },
        horizonDays: {
          type: "number",
          description: "How many days ahead to forecast",
        },
        method: {
          type: "string",
          enum: ["naive", "linear", "exponential_smoothing"],
          description: "Forecasting method (default: linear)",
        },
      },
      required: ["streamKey", "horizonDays"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    handler: async (args: Record<string, unknown>) => {
      ensureTemporalTables();
      const db = getDb();
      const streamKey = args.streamKey as string;
      const horizonDays = args.horizonDays as number;
      const method = (args.method as string) || "linear";

      if (horizonDays < 1 || horizonDays > 365) {
        return [{ type: "text" as const, text: JSON.stringify({ error: "horizonDays must be between 1 and 365" }) }];
      }

      // Get numeric observations
      const observations = db.prepare(`
        SELECT observed_at, value_number FROM temporal_observations
        WHERE stream_key = ? AND observation_type = 'numeric' AND value_number IS NOT NULL
        ORDER BY observed_at ASC
      `).all(streamKey) as Array<{ observed_at: number; value_number: number }>;

      if (observations.length < 2) {
        return [{ type: "text" as const, text: JSON.stringify({
          error: `Need at least 2 numeric observations for forecasting. Found ${observations.length} for stream '${streamKey}'.`,
          hint: "Ingest numeric observations with ingest_temporal_observation first.",
        }) }];
      }

      const values = observations.map((o) => o.value_number);
      const timestamps = observations.map((o) => o.observed_at);
      const lastTs = timestamps[timestamps.length - 1];
      const DAY_MS = 86_400_000;
      const s = stddev(values);

      const predictions: Array<{ day: number; date: string; predicted: number; lower: number; upper: number }> = [];

      switch (method) {
        case "naive": {
          const lastVal = values[values.length - 1];
          for (let d = 1; d <= horizonDays; d++) {
            const uncertainty = s * Math.sqrt(d) * 0.5;
            predictions.push({
              day: d,
              date: new Date(lastTs + d * DAY_MS).toISOString().split("T")[0],
              predicted: lastVal,
              lower: lastVal - 1.96 * uncertainty,
              upper: lastVal + 1.96 * uncertainty,
            });
          }
          break;
        }

        case "linear": {
          const { slope, intercept, r2 } = linearRegression(timestamps, values);
          for (let d = 1; d <= horizonDays; d++) {
            const futureTs = lastTs + d * DAY_MS;
            const predicted = slope * futureTs + intercept;
            // Prediction interval widens with distance and inversely with R2
            const uncertainty = s * Math.sqrt(1 + 1 / observations.length + d * 0.1) * (1 + (1 - Math.abs(r2)));
            predictions.push({
              day: d,
              date: new Date(futureTs).toISOString().split("T")[0],
              predicted,
              lower: predicted - 1.96 * uncertainty,
              upper: predicted + 1.96 * uncertainty,
            });
          }
          break;
        }

        case "exponential_smoothing": {
          // Simple exponential smoothing (alpha=0.3)
          const alpha = 0.3;
          let level = values[0];
          for (const v of values) {
            level = alpha * v + (1 - alpha) * level;
          }
          for (let d = 1; d <= horizonDays; d++) {
            const uncertainty = s * Math.sqrt(d) * 0.6;
            predictions.push({
              day: d,
              date: new Date(lastTs + d * DAY_MS).toISOString().split("T")[0],
              predicted: level,
              lower: level - 1.96 * uncertainty,
              upper: level + 1.96 * uncertainty,
            });
          }
          break;
        }

        default:
          return [{ type: "text" as const, text: JSON.stringify({ error: `Unknown method: ${method}. Use naive, linear, or exponential_smoothing.` }) }];
      }

      return [{
        type: "text" as const,
        text: JSON.stringify({
          streamKey,
          method,
          horizonDays,
          historicalPoints: observations.length,
          historicalRange: {
            start: new Date(timestamps[0]).toISOString(),
            end: new Date(lastTs).toISOString(),
          },
          historicalStats: {
            mean: mean(values),
            stddev: s,
            min: Math.min(...values),
            max: Math.max(...values),
          },
          predictions,
          disclaimer: "Statistical forecast only. For production use, integrate Chronos or TimesFM TSFM microservice.",
        }),
      }];
    },
  },
];
