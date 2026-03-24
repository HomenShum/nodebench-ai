/**
 * founderTools — MCP tools for the Founder Operating Memory system.
 *
 * Core tool: `founder_deep_context_gather` — a structured nudge that forces
 * calling agents to perform OCD-level deep-wide searches across all relevant
 * information sources before generating or updating an artifact packet.
 *
 * This is the "DNA packet" tool: it always gets triggered when an agent is
 * about to produce a founder artifact, ensuring the agent has gathered
 * every piece of context it needs.
 */

import type { McpTool } from "../types.js";
import { getDb } from "../db.js";

/* ------------------------------------------------------------------ */
/*  founder_packets schema bootstrap (idempotent)                      */
/* ------------------------------------------------------------------ */

let _packetSchemaReady = false;

function ensurePacketSchema(): void {
  if (_packetSchemaReady) return;
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS founder_packets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      packetId    TEXT UNIQUE NOT NULL,
      entityId    TEXT NOT NULL,
      packetType  TEXT NOT NULL,
      packetJson  TEXT NOT NULL,
      createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_founder_packets_entity ON founder_packets(entityId);
    CREATE INDEX IF NOT EXISTS idx_founder_packets_type ON founder_packets(packetType);
    CREATE INDEX IF NOT EXISTS idx_founder_packets_created ON founder_packets(createdAt);
  `);
  _packetSchemaReady = true;
}

/* ------------------------------------------------------------------ */
/*  JSON flatten / diff helpers                                        */
/* ------------------------------------------------------------------ */

/** Flatten a nested object into dot-notation paths. Arrays become path.0, path.1, etc. */
function flattenObject(
  obj: unknown,
  prefix = "",
  out: Record<string, unknown> = {},
): Record<string, unknown> {
  if (obj === null || obj === undefined) {
    if (prefix) out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0 && prefix) {
      out[prefix] = obj;
    }
    for (let i = 0; i < obj.length; i++) {
      flattenObject(obj[i], prefix ? `${prefix}.${i}` : String(i), out);
    }
    return out;
  }
  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const keys = Object.keys(record);
    if (keys.length === 0 && prefix) {
      out[prefix] = obj;
    }
    for (const key of keys) {
      flattenObject(record[key], prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
  }
  // Primitive
  if (prefix) out[prefix] = obj;
  return out;
}

interface PacketDiffResult {
  newSinceLastTime: string[];
  resolvedSinceLastTime: string[];
  changedFields: Array<{ path: string; previous: unknown; current: unknown }>;
  stableFields: string[];
  driftScore: number;
}

function computePacketDiff(
  current: Record<string, unknown>,
  prior: Record<string, unknown>,
): PacketDiffResult {
  const flatCurrent = flattenObject(current);
  const flatPrior = flattenObject(prior);

  const currentKeys = new Set(Object.keys(flatCurrent));
  const priorKeys = new Set(Object.keys(flatPrior));

  const newSinceLastTime: string[] = [];
  const resolvedSinceLastTime: string[] = [];
  const changedFields: Array<{ path: string; previous: unknown; current: unknown }> = [];
  const stableFields: string[] = [];

  // Fields in current but not in prior
  for (const key of currentKeys) {
    if (!priorKeys.has(key)) {
      newSinceLastTime.push(key);
    }
  }

  // Fields in prior but not in current
  for (const key of priorKeys) {
    if (!currentKeys.has(key)) {
      resolvedSinceLastTime.push(key);
    }
  }

  // Fields in both — compare values
  for (const key of currentKeys) {
    if (!priorKeys.has(key)) continue;
    const cv = JSON.stringify(flatCurrent[key]);
    const pv = JSON.stringify(flatPrior[key]);
    if (cv === pv) {
      stableFields.push(key);
    } else {
      changedFields.push({
        path: key,
        previous: flatPrior[key],
        current: flatCurrent[key],
      });
    }
  }

  // Drift score: fraction of all unique keys that differ
  const allKeys = new Set([...currentKeys, ...priorKeys]);
  const totalKeys = allKeys.size;
  const diffCount = newSinceLastTime.length + resolvedSinceLastTime.length + changedFields.length;
  const driftScore = totalKeys > 0 ? Math.round((diffCount / totalKeys) * 1000) / 1000 : 0;

  return {
    newSinceLastTime,
    resolvedSinceLastTime,
    changedFields,
    stableFields,
    driftScore: Math.min(driftScore, 1.0),
  };
}

/* ------------------------------------------------------------------ */
/*  Context gathering protocol                                         */
/* ------------------------------------------------------------------ */

interface GatherStep {
  id: string;
  label: string;
  description: string;
  sources: string[];
  required: boolean;
  searchPatterns: string[];
}

const GATHER_PROTOCOL: GatherStep[] = [
  {
    id: "company_identity",
    label: "Company Identity & Canonical Truth",
    description:
      "Establish the single-sentence mission, current wedge, company state, founding mode, and identity confidence. This is the anchor — everything else is measured against it.",
    sources: [
      "company profile (localStorage or Convex)",
      "founder setup wizard outputs",
      "recent identity clarification actions",
      "pitch deck or one-pager if available",
    ],
    required: true,
    searchPatterns: [
      "company name",
      "canonical mission",
      "wedge",
      "identity confidence",
      "company state",
      "founding mode",
    ],
  },
  {
    id: "what_changed",
    label: "What Changed Since Last Review",
    description:
      "Gather ALL changes: signals from external sources, agent outputs, initiative status transitions, user decisions, and any context drift. Do not stop at the first 3 — scan exhaustively.",
    sources: [
      "change feed / timeline events",
      "agent activity logs and heartbeats",
      "initiative status transitions",
      "user action history",
      "external signal queue",
      "daily brief if available",
    ],
    required: true,
    searchPatterns: [
      "changes since",
      "recent signals",
      "agent completed",
      "status changed",
      "decision made",
      "new information",
    ],
  },
  {
    id: "contradictions",
    label: "Contradictions & Tensions",
    description:
      "Identify where current actions contradict stated mission, where initiative timelines conflict, where agent work drifts from the wedge, and where external signals challenge assumptions. Look for: identity confidence below 70%, keyword misalignment between wedge and active initiatives, timing conflicts between partnerships and compliance, and any unresolved items from prior packets.",
    sources: [
      "identity confidence score vs threshold",
      "initiative alignment with wedge keywords",
      "agent drift indicators",
      "unresolved items from prior artifact packets",
      "compliance/partnership timing conflicts",
    ],
    required: true,
    searchPatterns: [
      "contradiction",
      "conflict",
      "misalignment",
      "drift",
      "blocked",
      "unresolved",
      "risk",
      "tension",
    ],
  },
  {
    id: "interventions",
    label: "Ranked Interventions & Next Actions",
    description:
      "Pull the full intervention queue with priority scores, confidence levels, and linked initiatives. Include both accepted and deferred interventions. Rank by priority score descending.",
    sources: [
      "intervention records with states",
      "initiative dependencies",
      "agent task queue",
      "pending actions by due date",
    ],
    required: true,
    searchPatterns: [
      "intervention",
      "priority score",
      "next action",
      "pending",
      "due date",
      "accepted",
      "deferred",
    ],
  },
  {
    id: "initiatives",
    label: "Active Initiatives & Their Health",
    description:
      "Map every active initiative: status, risk level, priority score, agent count, and objective. Flag any with risk=high or status=blocked. Cross-reference with interventions.",
    sources: [
      "initiative records",
      "initiative-to-agent mapping",
      "initiative risk assessments",
      "milestone progress",
    ],
    required: true,
    searchPatterns: [
      "initiative",
      "active",
      "blocked",
      "high risk",
      "milestone",
      "objective",
      "progress",
    ],
  },
  {
    id: "agents",
    label: "Agent Status & Drift Detection",
    description:
      "Check every connected agent: heartbeat recency, current goal alignment with wedge, any blocked or drifting status. If an agent's goal doesn't contain keywords from the current wedge, flag it.",
    sources: [
      "agent presence records",
      "heartbeat timestamps",
      "current goal descriptions",
      "agent status overrides",
    ],
    required: true,
    searchPatterns: [
      "agent",
      "heartbeat",
      "status",
      "goal",
      "blocked",
      "drifting",
      "waiting",
    ],
  },
  {
    id: "nearby_entities",
    label: "Nearby Entities & Comparables",
    description:
      "Identify the core company, its products, top 3-5 competitors/comparables, and any design partners or customers. Keep narrow — this is supportive context, not a graph explorer.",
    sources: [
      "nearby entity records",
      "competitor tracking",
      "partnership records",
      "product catalog",
    ],
    required: false,
    searchPatterns: [
      "competitor",
      "comparable",
      "partner",
      "customer",
      "product",
      "entity",
    ],
  },
  {
    id: "prior_packets",
    label: "Prior Artifact Packets & Drift",
    description:
      "Load the last 2-3 artifact packets. Compare: what contradictions were flagged then vs now? What actions were recommended then — were they completed? What identity confidence was recorded — has it changed? This temporal comparison is what makes the packet valuable.",
    sources: [
      "artifact packet history (localStorage)",
      "packet diff comparison",
      "action completion tracking",
    ],
    required: false,
    searchPatterns: [
      "prior packet",
      "previous",
      "history",
      "resolved",
      "completed action",
      "drift since",
    ],
  },
  {
    id: "daily_memo",
    label: "Daily Briefing & Operating Memo",
    description:
      "Pull the latest daily memo: what matters today, what to do next, unresolved items. This feeds the operating memo section of the artifact packet.",
    sources: [
      "daily brief / morning digest",
      "research hub signals",
      "narrative status",
    ],
    required: false,
    searchPatterns: [
      "daily brief",
      "what matters",
      "unresolved",
      "morning digest",
      "operating memo",
    ],
  },
  {
    id: "evidence",
    label: "Evidence & Provenance Chain",
    description:
      "For every claim in the packet, trace it back to a source: which signal, which agent output, which user action, which external document. The packet must be auditable — no ungrounded assertions.",
    sources: [
      "evidence records",
      "signal source URLs",
      "agent output logs",
      "document references",
      "user action timestamps",
    ],
    required: false,
    searchPatterns: [
      "evidence",
      "source",
      "provenance",
      "citation",
      "reference",
      "grounded",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Importance scoring for event ranking                               */
/* ------------------------------------------------------------------ */

const EVENT_TYPE_WEIGHTS: Record<string, number> = {
  "product.phase.completed": 0.9,
  "contradiction.detected": 0.85,
  "important_change.flagged": 0.8,
  "packet.generated": 0.7,
  "state.changed": 0.6,
  "engine.trace.completed": 0.5,
  "action.completed": 0.4,
};
const DEFAULT_EVENT_WEIGHT = 0.3;
const RECENCY_DECAY_PER_DAY = 0.1;
const THESIS_RELEVANCE_BOOST = 1.3;
const IMPORTANCE_THRESHOLD = 0.3;

interface ScoredEvent {
  type: unknown;
  entity: unknown;
  summary: unknown;
  actor: unknown;
  timestamp: unknown;
  importanceScore: number;
}

function scoreEvents(
  rawEvents: Array<Record<string, unknown>>,
  missionKeywords: string[],
): { ranked: ScoredEvent[]; suppressedCount: number; topSignal: ScoredEvent | null } {
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  const scored: ScoredEvent[] = rawEvents.map((e) => {
    const eventType = (e.eventType as string) ?? "";
    const baseWeight = EVENT_TYPE_WEIGHTS[eventType] ?? DEFAULT_EVENT_WEIGHT;

    // Recency decay: today=1.0, yesterday=0.9, ...
    const ts = (e.timestamp as number) ?? 0;
    const daysAgo = Math.max(0, Math.floor((now - ts) / msPerDay));
    const recencyMultiplier = Math.max(0.1, 1.0 - daysAgo * RECENCY_DECAY_PER_DAY);

    // Thesis relevance boost
    const summary = ((e.summary as string) ?? "").toLowerCase();
    const matchesMission =
      missionKeywords.length > 0 &&
      missionKeywords.some((kw) => summary.includes(kw));
    const relevanceMultiplier = matchesMission ? THESIS_RELEVANCE_BOOST : 1.0;

    const score =
      Math.round(baseWeight * recencyMultiplier * relevanceMultiplier * 1000) / 1000;

    return {
      type: e.eventType,
      entity: e.entityId,
      summary: e.summary,
      actor: e.actor,
      timestamp: e.timestamp,
      importanceScore: score,
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.importanceScore - a.importanceScore);

  const ranked = scored.filter((e) => e.importanceScore >= IMPORTANCE_THRESHOLD);
  const suppressedCount = scored.length - ranked.length;
  const topSignal = ranked[0] ?? null;

  return { ranked, suppressedCount, topSignal };
}

/** Extract lowercase keywords from a mission string for fuzzy matching. */
function extractMissionKeywords(diffs: Array<Record<string, unknown>>): string[] {
  // Pull keywords from the most recent state diff's reason/fields
  if (diffs.length === 0) return [];
  const latest = diffs[0];
  const reason = ((latest.reason as string) ?? "").toLowerCase();
  const fields = ((latest.changedFields as string) ?? "").toLowerCase();
  const combined = `${reason} ${fields}`;
  // Split on non-alpha, filter short/stop words
  const stopWords = new Set(["the", "and", "for", "was", "that", "with", "from", "are", "this", "has", "its", "not", "but"]);
  return combined
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3 && !stopWords.has(w))
    .slice(0, 20);
}

/* ------------------------------------------------------------------ */
/*  Tools                                                              */
/* ------------------------------------------------------------------ */

export const founderTools: McpTool[] = [
  {
    name: "founder_deep_context_gather",
    description:
      "MUST be called before generating or updating a Founder Artifact Packet. " +
      "Returns a structured context-gathering protocol that forces the agent to " +
      "systematically search across ALL relevant information sources with OCD-level " +
      "thoroughness. The protocol covers: company identity, what changed, contradictions, " +
      "interventions, initiatives, agents, nearby entities, prior packets, daily memo, " +
      "and evidence provenance. Each step includes specific search patterns and sources. " +
      "The agent MUST complete all required steps and report findings before packet generation. " +
      "This prevents shallow or incomplete artifact packets.",
    inputSchema: {
      type: "object",
      properties: {
        packetType: {
          type: "string",
          enum: ["weekly_reset", "pre_delegation", "important_change"],
          description:
            "The type of artifact packet being prepared. Affects which gather steps are emphasized.",
        },
        priorPacketSummary: {
          type: "string",
          description:
            "Optional summary of the most recent prior packet, for temporal comparison.",
        },
        entityId: {
          type: "string",
          description:
            "Optional entity ID to scope the gather (and prior-brief lookup) to a specific company/entity.",
        },
        focusAreas: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional list of specific areas to emphasize in the gather (e.g., 'compliance', 'fundraising').",
        },
      },
      required: ["packetType"],
    },
    handler: async (args) => {
      const packetType = args.packetType as string;
      const priorPacketSummary = (args.priorPacketSummary as string) ?? null;
      const focusAreas = (args.focusAreas as string[]) ?? [];

      if (!["weekly_reset", "pre_delegation", "important_change"].includes(packetType)) {
        return {
          error: true,
          message: `Invalid packetType: ${packetType}. Must be one of: weekly_reset, pre_delegation, important_change.`,
        };
      }

      // Build the gather protocol with type-specific emphasis
      const typeEmphasis: Record<string, string[]> = {
        weekly_reset: [
          "company_identity",
          "what_changed",
          "contradictions",
          "interventions",
          "prior_packets",
        ],
        pre_delegation: [
          "company_identity",
          "interventions",
          "agents",
          "initiatives",
          "evidence",
        ],
        important_change: [
          "what_changed",
          "contradictions",
          "interventions",
          "evidence",
          "nearby_entities",
        ],
      };

      const emphasized = typeEmphasis[packetType] ?? [];

      const steps = GATHER_PROTOCOL.map((step) => ({
        ...step,
        emphasized: emphasized.includes(step.id),
        focusRelevant: focusAreas.some((area) =>
          step.searchPatterns.some((pattern) =>
            pattern.toLowerCase().includes(area.toLowerCase()) ||
            area.toLowerCase().includes(pattern.toLowerCase()),
          ),
        ),
      }));

      const requiredSteps = steps.filter((s) => s.required);
      const optionalSteps = steps.filter((s) => !s.required);

      // ── Auto-hydrate from causal memory if available ──────────────────
      let sessionMemory: Record<string, unknown> | null = null;
      try {
        const db = getDb();
        const now = Date.now();
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

        // Recent events (last 7 days)
        const recentEvents = db
          .prepare(
            "SELECT * FROM causal_events WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 20",
          )
          .all(weekAgo) as Array<Record<string, unknown>>;

        // Important changes (unresolved)
        const importantChanges = db
          .prepare(
            "SELECT * FROM causal_important_changes WHERE status IN ('detected','acknowledged','investigating') ORDER BY impactScore DESC LIMIT 10",
          )
          .all() as Array<Record<string, unknown>>;

        // State diffs (last 7 days)
        const stateDiffs = db
          .prepare(
            "SELECT * FROM causal_state_diffs WHERE createdAt > ? ORDER BY createdAt DESC LIMIT 10",
          )
          .all(weekAgo) as Array<Record<string, unknown>>;

        // Weekly action summary
        const weeklyActions = db
          .prepare(
            "SELECT category, COUNT(*) as count, AVG(impactLevel) as avgImpact FROM tracking_actions WHERE timestamp > ? GROUP BY category ORDER BY count DESC",
          )
          .all(weekAgo) as Array<Record<string, unknown>>;

        // Milestones this week
        const milestones = db
          .prepare(
            "SELECT * FROM tracking_milestones WHERE timestamp > ? ORDER BY timestamp DESC LIMIT 5",
          )
          .all(weekAgo) as Array<Record<string, unknown>>;

        // Trajectory scores
        const trajectory = db
          .prepare(
            "SELECT * FROM causal_trajectory_scores ORDER BY createdAt DESC LIMIT 1",
          )
          .all() as Array<Record<string, unknown>>;

        if (recentEvents.length > 0 || importantChanges.length > 0 || stateDiffs.length > 0) {
          // Extract mission keywords from most recent state diff for thesis relevance
          const missionKeywords = extractMissionKeywords(
            stateDiffs as Array<Record<string, unknown>>,
          );

          // Score and rank events by importance
          const { ranked, suppressedCount, topSignal } = scoreEvents(
            recentEvents as Array<Record<string, unknown>>,
            missionKeywords,
          );

          sessionMemory = {
            source: "causal_memory_auto_hydrate",
            period: "last_7_days",
            recentEvents: recentEvents.length,
            importantChanges: importantChanges.length,
            stateDiffs: stateDiffs.length,
            weeklyActions,
            milestones,
            trajectory: trajectory[0] ?? null,
            topSignal,
            suppressedCount,
            events: ranked,
            changes: importantChanges.map((c) => ({
              category: c.changeCategory,
              impact: c.impactScore,
              reason: c.impactReason,
              status: c.status,
            })),
            diffs: stateDiffs.map((d) => ({
              entity: d.entityId,
              fields: d.changedFields,
              reason: d.reason,
            })),
          };
        }
      } catch {
        // causal memory tables may not exist yet — graceful fallback
        sessionMemory = null;
      }

      // ── Prior-brief cross-referencing for weekly_reset ──────────────
      let priorBriefComparison: Record<string, unknown> | null = null;
      if (packetType === "weekly_reset") {
        try {
          ensurePacketSchema();
          const db = getDb();
          const entityId = (args.entityId as string) ?? null;

          const priorRow = entityId
            ? (db
                .prepare(
                  "SELECT * FROM founder_packets WHERE entityId = ? ORDER BY createdAt DESC LIMIT 1",
                )
                .get(entityId) as Record<string, unknown> | undefined)
            : (db
                .prepare(
                  "SELECT * FROM founder_packets ORDER BY createdAt DESC LIMIT 1",
                )
                .get() as Record<string, unknown> | undefined);

          if (priorRow) {
            const lastPacketDate = priorRow.createdAt as string;
            const lastPacketMs = new Date(lastPacketDate).getTime();
            const daysSinceLastPacket = Math.max(
              0,
              Math.round((Date.now() - lastPacketMs) / (24 * 60 * 60 * 1000)),
            );

            let priorPacketData: Record<string, unknown> = {};
            try {
              priorPacketData = JSON.parse(priorRow.packetJson as string) as Record<string, unknown>;
            } catch {
              // malformed JSON — treat as empty
            }

            // Gather changes/events from sessionMemory that are AFTER the prior packet
            const newSinceLastPacket: Array<Record<string, unknown>> = [];
            const stillUnresolved: Array<Record<string, unknown>> = [];
            const resolvedSinceLastPacket: Array<Record<string, unknown>> = [];

            // Classify current important changes against prior packet
            if (sessionMemory) {
              const currentChanges = (sessionMemory.changes ?? []) as Array<Record<string, unknown>>;
              const currentEvents = (sessionMemory.events ?? []) as Array<Record<string, unknown>>;

              // Events that occurred after the prior packet
              for (const evt of currentEvents) {
                const evtTs = (evt.timestamp as number) ?? 0;
                if (evtTs > lastPacketMs) {
                  newSinceLastPacket.push(evt);
                }
              }

              // Classify important changes: still unresolved vs resolved
              const priorChanges = (priorPacketData.whatChanged ?? priorPacketData.changes ?? []) as Array<Record<string, unknown>>;
              const priorChangeIds = new Set(
                priorChanges.map((c) => (c.id as string) ?? (c.description as string) ?? ""),
              );

              for (const change of currentChanges) {
                const changeKey = (change.category as string) ?? (change.reason as string) ?? "";
                if (change.status === "detected" || change.status === "acknowledged" || change.status === "investigating") {
                  stillUnresolved.push(change);
                }
              }

              // Prior changes no longer in current unresolved set
              const unresolvedKeys = new Set(
                stillUnresolved.map((c) => (c.category as string) ?? (c.reason as string) ?? ""),
              );
              for (const pc of priorChanges) {
                const pcKey = (pc.id as string) ?? (pc.description as string) ?? (pc.category as string) ?? "";
                if (pcKey && !unresolvedKeys.has(pcKey)) {
                  resolvedSinceLastPacket.push(pc);
                }
              }
            }

            // Recommended focus: top 3 from (new + unresolved) ranked by impact
            const focusCandidates = [
              ...newSinceLastPacket.map((e) => ({
                item: (e.summary as string) ?? (e.type as string) ?? "unknown event",
                source: "new" as const,
                impact: (e.importanceScore as number) ?? 0.5,
              })),
              ...stillUnresolved.map((c) => ({
                item: (c.reason as string) ?? (c.category as string) ?? "unresolved change",
                source: "unresolved" as const,
                impact: (c.impact as number) ?? 0.5,
              })),
            ];
            focusCandidates.sort((a, b) => b.impact - a.impact);
            const recommendedFocus = focusCandidates.slice(0, 3);

            priorBriefComparison = {
              lastPacketDate,
              daysSinceLastPacket,
              priorPacketId: priorRow.packetId ?? null,
              priorPacketType: priorRow.packetType ?? null,
              newSinceLastPacket,
              stillUnresolved,
              resolvedSinceLastPacket,
              recommendedFocus,
            };

            // Attach to sessionMemory if it exists
            if (sessionMemory) {
              sessionMemory.priorBriefComparison = priorBriefComparison;
            }
          }
        } catch {
          // founder_packets table may not exist yet — graceful fallback
          priorBriefComparison = null;
        }
      }

      const protocol = {
        protocolVersion: "1.1",
        packetType,
        totalSteps: steps.length,
        requiredSteps: requiredSteps.length,

        // Pre-hydrated session memory (if available)
        ...(sessionMemory ? { sessionMemory } : {}),

        // Prior-brief cross-reference (weekly_reset only, null if no prior packet)
        ...(packetType === "weekly_reset" ? { priorBriefComparison } : {}),

        instructions: [
          ...(sessionMemory
            ? [
                "Session memory has been auto-hydrated from causal memory. Use the sessionMemory block as your starting context — do NOT ask the user to restate what happened.",
                "Cross-reference sessionMemory events, changes, and diffs against the gather steps below.",
              ]
            : []),
          ...(priorBriefComparison
            ? [
                "Cross-reference findings against priorBriefComparison. Highlight what's NEW vs what was already known. Do not repeat resolved items.",
              ]
            : []),
          "You MUST complete ALL required gather steps before generating the artifact packet.",
          "For each step, search the listed sources using the provided search patterns.",
          "Do NOT skip a step because it seems redundant — redundancy catches blind spots.",
          "If a source is unavailable, note it explicitly in your findings.",
          "Steps marked 'emphasized' are critical for this packet type — spend extra effort.",
          "Steps marked 'focusRelevant' match the user's focus areas — prioritize these.",
          "After completing all steps, synthesize findings into a single coherent packet.",
          "The packet must be auditable: every claim traces to a source from your gather.",
        ],

        gatherSteps: steps.map((step) => ({
          id: step.id,
          label: step.label,
          description: step.description,
          sources: step.sources,
          searchPatterns: step.searchPatterns,
          required: step.required,
          emphasized: step.emphasized,
          focusRelevant: step.focusRelevant,
          status: "pending",
        })),

        temporalComparison: priorPacketSummary
          ? {
              enabled: true,
              priorSummary: priorPacketSummary,
              compareInstructions: [
                "Compare each finding against the prior packet summary.",
                "Flag: new contradictions, resolved contradictions, completed actions, new risks.",
                "Track identity confidence delta.",
                "Note any recommended actions from the prior packet that were NOT completed.",
              ],
            }
          : {
              enabled: false,
              note: "No prior packet provided. Generate the packet as a baseline.",
            },

        outputContract: {
          description:
            "After completing all gather steps, produce a FounderPacketSourceInput object with these fields:",
          fields: [
            "company: { name, canonicalMission, wedge, companyState, foundingMode, identityConfidence }",
            "changes: Array<{ id, timestamp, relativeTime, type, description, linkedInitiativeId? }>",
            "interventions: Array<{ id, title, linkedInitiative, linkedInitiativeId, priorityScore, confidence }>",
            "initiatives: Array<{ id, title, status, risk, priorityScore, objective }>",
            "agents: Array<{ id, name, status, currentGoal }>",
            "dailyMemo: { whatMatters: string[], whatToDoNext: string[], unresolved: string[] }",
            "nearbyEntities: Array<{ id, name, relationship, whyItMatters }>",
          ],
        },

        qualityGates: [
          "Every required step must have at least one finding.",
          "Contradictions step must produce at least 1 contradiction or explicitly state none found.",
          "Evidence step must trace at least 3 claims to sources.",
          "If identity confidence < 0.7, the packet MUST recommend a 'Clarify Identity' action.",
          "If any agent is drifting or blocked, the packet MUST flag it in contradictions.",
          "No field in the output contract may be an empty array without explanation.",
        ],
      };

      return protocol;
    },
  },

  {
    name: "founder_packet_validate",
    description:
      "Validates a draft Founder Artifact Packet against quality gates before saving. " +
      "Checks: all required sections populated, contradictions are non-empty, evidence " +
      "traces to sources, actions are ranked by priority, and identity confidence is " +
      "consistent with the company state. Returns pass/fail with specific failure reasons.",
    inputSchema: {
      type: "object",
      properties: {
        packet: {
          type: "object",
          description: "The draft FounderArtifactPacket object to validate.",
        },
      },
      required: ["packet"],
    },
    handler: async (args) => {
      const packet = args.packet as Record<string, unknown>;
      const failures: string[] = [];
      const warnings: string[] = [];

      // Required fields check
      const requiredFields = [
        "packetId",
        "packetType",
        "canonicalEntity",
        "whatChanged",
        "contradictions",
        "nextActions",
        "operatingMemo",
        "agentInstructions",
        "keyEvidence",
        "nearbyEntities",
        "provenance",
      ];

      for (const field of requiredFields) {
        if (!(field in packet) || packet[field] === null || packet[field] === undefined) {
          failures.push(`Missing required field: ${field}`);
        }
      }

      // Canonical entity checks
      const entity = packet.canonicalEntity as Record<string, unknown> | undefined;
      if (entity) {
        if (!entity.name) failures.push("canonicalEntity.name is empty");
        if (!entity.mission) failures.push("canonicalEntity.mission is empty");
        if (!entity.wedge) failures.push("canonicalEntity.wedge is empty");
        const confidence = entity.identityConfidence as number;
        if (typeof confidence === "number" && confidence < 0.7) {
          const actions = packet.nextActions as Array<Record<string, unknown>> | undefined;
          const hasClarifyAction = actions?.some(
            (a) =>
              typeof a.label === "string" &&
              a.label.toLowerCase().includes("clarify"),
          );
          if (!hasClarifyAction) {
            warnings.push(
              `Identity confidence is ${Math.round(confidence * 100)}% (below 70%) but no "Clarify Identity" action was included.`,
            );
          }
        }
      }

      // Contradictions check
      const contradictions = packet.contradictions as unknown[];
      if (Array.isArray(contradictions) && contradictions.length === 0) {
        warnings.push("contradictions array is empty — are there truly no tensions?");
      }

      // Next actions check
      const actions = packet.nextActions as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(actions)) {
        if (actions.length === 0) {
          failures.push("nextActions is empty — every packet must recommend at least one action.");
        }
        // Check priority ordering
        for (let i = 1; i < actions.length; i++) {
          const prevPriority = actions[i - 1].priority as string;
          const currPriority = actions[i].priority as string;
          const order = ["high", "medium", "low"];
          if (order.indexOf(prevPriority) > order.indexOf(currPriority)) {
            warnings.push(
              `nextActions are not sorted by priority: action ${i} (${currPriority}) comes after action ${i - 1} (${prevPriority}).`,
            );
            break;
          }
        }
      }

      // Evidence check
      const evidence = packet.keyEvidence as unknown[];
      if (Array.isArray(evidence) && evidence.length < 3) {
        warnings.push(`Only ${evidence.length} evidence items — aim for at least 3 for auditability.`);
      }

      // Operating memo check
      if (typeof packet.operatingMemo === "string" && packet.operatingMemo.length < 50) {
        warnings.push("operatingMemo is very short — ensure it captures the key narrative.");
      }

      const passed = failures.length === 0;

      return {
        valid: passed,
        failures,
        warnings,
        summary: passed
          ? `Packet validates with ${warnings.length} warning(s).`
          : `Packet FAILED validation: ${failures.length} error(s), ${warnings.length} warning(s).`,
      };
    },
  },

  {
    name: "founder_packet_diff",
    description:
      "Compares two Founder Artifact Packets and returns a structured diff showing " +
      "what changed between them: new contradictions, resolved contradictions, completed " +
      "actions, identity confidence delta, new/removed nearby entities, and narrative drift. " +
      "Use this to power the history review and important-change detection.",
    inputSchema: {
      type: "object",
      properties: {
        currentPacket: {
          type: "object",
          description: "The current (newer) artifact packet.",
        },
        previousPacket: {
          type: "object",
          description: "The previous (older) artifact packet to compare against.",
        },
      },
      required: ["currentPacket", "previousPacket"],
    },
    handler: async (args) => {
      const current = args.currentPacket as Record<string, unknown>;
      const previous = args.previousPacket as Record<string, unknown>;

      // Identity confidence delta
      const currentEntity = current.canonicalEntity as Record<string, unknown> | undefined;
      const prevEntity = previous.canonicalEntity as Record<string, unknown> | undefined;
      const currentConfidence = (currentEntity?.identityConfidence as number) ?? 0;
      const prevConfidence = (prevEntity?.identityConfidence as number) ?? 0;
      const confidenceDelta = currentConfidence - prevConfidence;

      // Contradiction diff
      const currentContradictions = (current.contradictions as Array<Record<string, unknown>>) ?? [];
      const prevContradictions = (previous.contradictions as Array<Record<string, unknown>>) ?? [];
      const prevTitles = new Set(prevContradictions.map((c) => c.title as string));
      const currTitles = new Set(currentContradictions.map((c) => c.title as string));

      const newContradictions = currentContradictions.filter(
        (c) => !prevTitles.has(c.title as string),
      );
      const resolvedContradictions = prevContradictions.filter(
        (c) => !currTitles.has(c.title as string),
      );
      const persistingContradictions = currentContradictions.filter(
        (c) => prevTitles.has(c.title as string),
      );

      // Action diff
      const currentActions = (current.nextActions as Array<Record<string, unknown>>) ?? [];
      const prevActions = (previous.nextActions as Array<Record<string, unknown>>) ?? [];
      const prevActionLabels = new Set(prevActions.map((a) => a.label as string));
      const currActionLabels = new Set(currentActions.map((a) => a.label as string));

      const newActions = currentActions.filter(
        (a) => !prevActionLabels.has(a.label as string),
      );
      const completedOrDropped = prevActions.filter(
        (a) => !currActionLabels.has(a.label as string),
      );

      // Nearby entities diff
      const currentEntities = (current.nearbyEntities as Array<Record<string, unknown>>) ?? [];
      const prevEntities = (previous.nearbyEntities as Array<Record<string, unknown>>) ?? [];
      const prevEntityNames = new Set(prevEntities.map((e) => e.name as string));
      const currEntityNames = new Set(currentEntities.map((e) => e.name as string));

      const newEntities = currentEntities.filter(
        (e) => !prevEntityNames.has(e.name as string),
      );
      const removedEntities = prevEntities.filter(
        (e) => !currEntityNames.has(e.name as string),
      );

      // Narrative drift detection
      const currentMemo = (current.operatingMemo as string) ?? "";
      const prevMemo = (previous.operatingMemo as string) ?? "";
      const memoChanged = currentMemo !== prevMemo;

      const currentWedge = (currentEntity?.wedge as string) ?? "";
      const prevWedge = (prevEntity?.wedge as string) ?? "";
      const wedgeChanged = currentWedge !== prevWedge;

      return {
        identity: {
          confidenceDelta: Math.round(confidenceDelta * 100) / 100,
          confidenceCurrent: currentConfidence,
          confidencePrevious: prevConfidence,
          direction:
            confidenceDelta > 0.05
              ? "improving"
              : confidenceDelta < -0.05
                ? "declining"
                : "stable",
          wedgeChanged,
          currentWedge: wedgeChanged ? currentWedge : undefined,
          previousWedge: wedgeChanged ? prevWedge : undefined,
        },
        contradictions: {
          new: newContradictions.map((c) => ({
            title: c.title,
            severity: c.severity,
          })),
          resolved: resolvedContradictions.map((c) => ({
            title: c.title,
            severity: c.severity,
          })),
          persisting: persistingContradictions.map((c) => ({
            title: c.title,
            severity: c.severity,
          })),
        },
        actions: {
          new: newActions.map((a) => ({
            label: a.label,
            priority: a.priority,
          })),
          completedOrDropped: completedOrDropped.map((a) => ({
            label: a.label,
            priority: a.priority,
          })),
        },
        entities: {
          added: newEntities.map((e) => ({ name: e.name, relationship: e.relationship })),
          removed: removedEntities.map((e) => ({ name: e.name, relationship: e.relationship })),
        },
        narrative: {
          memoChanged,
          wedgeChanged,
          overallDrift: wedgeChanged
            ? "significant"
            : memoChanged && newContradictions.length > 0
              ? "moderate"
              : memoChanged || newContradictions.length > 0
                ? "minor"
                : "stable",
        },
        summary: [
          confidenceDelta !== 0
            ? `Identity confidence ${confidenceDelta > 0 ? "+" : ""}${Math.round(confidenceDelta * 100)}%`
            : null,
          newContradictions.length > 0
            ? `${newContradictions.length} new contradiction(s)`
            : null,
          resolvedContradictions.length > 0
            ? `${resolvedContradictions.length} resolved contradiction(s)`
            : null,
          newActions.length > 0
            ? `${newActions.length} new action(s)`
            : null,
          completedOrDropped.length > 0
            ? `${completedOrDropped.length} completed/dropped action(s)`
            : null,
          wedgeChanged ? "Wedge changed" : null,
        ].filter(Boolean),
      };
    },
  },

  // ─── 4. founder_packet_history_diff ──────────────────────────────
  {
    name: "founder_packet_history_diff",
    description:
      "Compares the most recent Founder Artifact Packet for an entity against " +
      "prior packets stored in the founder_packets SQLite table. Returns a " +
      "structured diff: newSinceLastTime, resolvedSinceLastTime, changedFields, " +
      "stableFields, and a driftScore (0.0–1.0). If only one packet exists, " +
      "returns it as a baseline. If none exist, suggests running " +
      "founder_deep_context_gather first.",
    inputSchema: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "The entity ID to look up packets for.",
        },
        packetType: {
          type: "string",
          description:
            "Optional packet type filter (e.g. weekly_reset, pre_delegation, important_change).",
        },
        limit: {
          type: "number",
          description:
            "Max number of recent packets to retrieve for comparison (default 2, max 10).",
        },
      },
      required: ["entityId"],
    },
    annotations: { readOnlyHint: true },
    handler: async (args) => {
      ensurePacketSchema();
      const db = getDb();

      const entityId = args.entityId as string;
      const packetType = (args.packetType as string) ?? null;
      const limit = Math.min(Math.max((args.limit as number) ?? 2, 1), 10);

      // Query recent packets for this entity
      let rows: Array<Record<string, unknown>>;
      if (packetType) {
        rows = db
          .prepare(
            `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             WHERE entityId = ? AND packetType = ?
             ORDER BY createdAt DESC
             LIMIT ?`,
          )
          .all(entityId, packetType, limit) as Array<Record<string, unknown>>;
      } else {
        rows = db
          .prepare(
            `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             WHERE entityId = ?
             ORDER BY createdAt DESC
             LIMIT ?`,
          )
          .all(entityId, limit) as Array<Record<string, unknown>>;
      }

      // No packets found
      if (rows.length === 0) {
        return {
          noPackets: true,
          entityId,
          suggestion: "Run founder_deep_context_gather first to generate and store a packet.",
        };
      }

      // Parse packet JSON safely
      const packets = rows.map((row) => {
        let parsed: Record<string, unknown> = {};
        try {
          parsed = JSON.parse(row.packetJson as string) as Record<string, unknown>;
        } catch {
          parsed = { _parseError: true, raw: row.packetJson };
        }
        return {
          packetId: row.packetId as string,
          entityId: row.entityId as string,
          packetType: row.packetType as string,
          createdAt: row.createdAt as string,
          data: parsed,
        };
      });

      // Only one packet — return as baseline
      if (packets.length === 1) {
        return {
          isFirstPacket: true,
          entityId,
          packet: {
            packetId: packets[0].packetId,
            packetType: packets[0].packetType,
            createdAt: packets[0].createdAt,
          },
          note: "First packet for this entity. Future calls will produce diffs.",
        };
      }

      // 2+ packets — diff the most recent against the one before it
      const latest = packets[0];
      const prior = packets[1];

      const diff = computePacketDiff(latest.data, prior.data);

      return {
        entityId,
        latest: {
          packetId: latest.packetId,
          packetType: latest.packetType,
          createdAt: latest.createdAt,
        },
        prior: {
          packetId: prior.packetId,
          packetType: prior.packetType,
          createdAt: prior.createdAt,
        },
        diff: {
          newSinceLastTime: diff.newSinceLastTime,
          resolvedSinceLastTime: diff.resolvedSinceLastTime,
          changedFields: diff.changedFields,
          stableFields: diff.stableFields,
          driftScore: diff.driftScore,
        },
        summary: {
          totalFieldsCompared:
            diff.newSinceLastTime.length +
            diff.resolvedSinceLastTime.length +
            diff.changedFields.length +
            diff.stableFields.length,
          newCount: diff.newSinceLastTime.length,
          resolvedCount: diff.resolvedSinceLastTime.length,
          changedCount: diff.changedFields.length,
          stableCount: diff.stableFields.length,
          driftScore: diff.driftScore,
          driftLevel:
            diff.driftScore < 0.1
              ? "minimal"
              : diff.driftScore < 0.3
                ? "low"
                : diff.driftScore < 0.6
                  ? "moderate"
                  : diff.driftScore < 0.85
                    ? "high"
                    : "extreme",
        },
        packetsAvailable: packets.length,
      };
    },
  },

  // ─── 5. export_artifact_packet ──────────────────────────────────
  {
    name: "export_artifact_packet",
    description:
      "Formats a Founder Artifact Packet or memo for export to a specific audience and format. " +
      "Applies audience-specific framing (founder, investor, banker, developer, teammate) and " +
      "renders into the requested format (markdown, html, json, plaintext). Always includes " +
      "provenance metadata (timestamp, version, exportId) for traceability.",
    inputSchema: {
      type: "object",
      properties: {
        content: {
          type: "object",
          description: "The raw packet/memo content to format for export.",
        },
        format: {
          type: "string",
          enum: ["markdown", "html", "json", "plaintext"],
          description: "Output format for the exported artifact.",
        },
        audience: {
          type: "string",
          enum: ["founder", "investor", "banker", "developer", "teammate"],
          description:
            "Target audience — controls tone, ordering, and which sections are emphasized.",
        },
        title: {
          type: "string",
          description:
            "Override title for the exported artifact. Defaults to packet title or 'Artifact Packet'.",
        },
        includeMetadata: {
          type: "boolean",
          description:
            "Include generation timestamp, tool version, and provenance block. Defaults to true.",
        },
      },
      required: ["content", "format", "audience"],
    },
    handler: async (args) => {
      const content = args.content as Record<string, unknown>;
      const format = args.format as string;
      const audience = args.audience as string;
      const titleOverride = (args.title as string | undefined) ?? null;
      const includeMetadata = (args.includeMetadata as boolean | undefined) ?? true;

      const validFormats = ["markdown", "html", "json", "plaintext"] as const;
      const validAudiences = ["founder", "investor", "banker", "developer", "teammate"] as const;

      if (!validFormats.includes(format as (typeof validFormats)[number])) {
        return {
          error: true,
          message: `Invalid format: ${format}. Must be one of: ${validFormats.join(", ")}.`,
        };
      }
      if (!validAudiences.includes(audience as (typeof validAudiences)[number])) {
        return {
          error: true,
          message: `Invalid audience: ${audience}. Must be one of: ${validAudiences.join(", ")}.`,
        };
      }

      const NODEBENCH_VERSION = "1.0.0";
      const exportId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const generatedAt = new Date().toISOString();

      // ── Extract common fields from content ──────────────────────────
      const entity = (content.canonicalEntity as Record<string, unknown>) ?? {};
      const companyName =
        (entity.name as string) ?? (content.companyName as string) ?? "Unknown Company";
      const mission = (entity.mission as string) ?? (content.mission as string) ?? "";
      const wedge = (entity.wedge as string) ?? (content.wedge as string) ?? "";
      const identityConfidence = (entity.identityConfidence as number) ?? null;
      const contradictions =
        (content.contradictions as Array<Record<string, unknown>>) ?? [];
      const nextActions =
        (content.nextActions as Array<Record<string, unknown>>) ?? [];
      const operatingMemo = (content.operatingMemo as string) ?? "";
      const whatChanged =
        (content.whatChanged as Array<Record<string, unknown>>) ?? [];
      const nearbyEntities =
        (content.nearbyEntities as Array<Record<string, unknown>>) ?? [];
      const keyEvidence =
        (content.keyEvidence as Array<Record<string, unknown>>) ?? [];
      const agentInstructions =
        (content.agentInstructions as Record<string, unknown>) ?? null;

      const title = titleOverride ?? (content.title as string) ?? "Artifact Packet";

      // ── Audience-specific section ordering and framing ──────────────
      interface AudienceConfig {
        tone: string;
        sectionOrder: string[];
        emphasisSections: string[];
        excludeSections: string[];
        headerPrefix: string;
      }

      const audienceConfigs: Record<string, AudienceConfig> = {
        founder: {
          tone: "informal",
          sectionOrder: [
            "summary",
            "whatChanged",
            "contradictions",
            "nextMoves",
            "initiatives",
            "agents",
            "operatingMemo",
            "evidence",
          ],
          emphasisSections: ["contradictions", "nextMoves"],
          excludeSections: [],
          headerPrefix: "",
        },
        investor: {
          tone: "formal",
          sectionOrder: [
            "metrics",
            "summary",
            "marketContext",
            "risks",
            "initiatives",
            "evidence",
          ],
          emphasisSections: ["metrics", "risks"],
          excludeSections: ["agents", "agentInstructions"],
          headerPrefix: "Investment Memo: ",
        },
        banker: {
          tone: "formal",
          sectionOrder: [
            "companySnapshot",
            "financialSignals",
            "riskFactors",
            "comparables",
            "summary",
            "evidence",
          ],
          emphasisSections: ["companySnapshot", "financialSignals", "riskFactors"],
          excludeSections: ["agents", "agentInstructions", "operatingMemo"],
          headerPrefix: "Memo: ",
        },
        developer: {
          tone: "technical",
          sectionOrder: [
            "architectureChanges",
            "technicalDecisions",
            "apiChanges",
            "whatChanged",
            "nextMoves",
            "agents",
          ],
          emphasisSections: ["architectureChanges", "apiChanges"],
          excludeSections: ["nearbyEntities", "operatingMemo"],
          headerPrefix: "",
        },
        teammate: {
          tone: "conversational",
          sectionOrder: ["delegationBrief", "actionItems", "whatChanged", "context"],
          emphasisSections: ["delegationBrief", "actionItems"],
          excludeSections: ["evidence", "nearbyEntities"],
          headerPrefix: "",
        },
      };

      const config = audienceConfigs[audience];

      // ── Build audience-specific sections ──────────────────────────
      interface ExportSection {
        key: string;
        heading: string;
        body: string;
        items?: Array<{ text: string; meta?: string }>;
      }

      const sections: ExportSection[] = [];

      // Summary / company snapshot
      if (audience === "banker") {
        sections.push({
          key: "companySnapshot",
          heading: "Company Snapshot",
          body: [
            companyName ? `Company: ${companyName}` : "",
            mission ? `Mission: ${mission}` : "",
            wedge ? `Wedge: ${wedge}` : "",
            identityConfidence !== null
              ? `Identity Confidence: ${Math.round(identityConfidence * 100)}%`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } else if (audience === "investor") {
        sections.push({
          key: "metrics",
          heading: "Key Metrics & Traction",
          body: [
            companyName ? `Company: ${companyName}` : "",
            identityConfidence !== null
              ? `Identity Confidence: ${Math.round(identityConfidence * 100)}%`
              : "",
            `Active Initiatives: ${((content.initiatives as unknown[]) ?? []).length}`,
            `Open Contradictions: ${contradictions.length}`,
            `Pending Actions: ${nextActions.length}`,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      }

      sections.push({
        key: "summary",
        heading: audience === "teammate" ? "Context" : "Summary",
        body: operatingMemo || `${companyName} — ${mission}`,
      });

      // What changed
      if (
        !config.excludeSections.includes("whatChanged") &&
        whatChanged.length > 0
      ) {
        sections.push({
          key: "whatChanged",
          heading: audience === "developer" ? "Recent Changes" : "What Changed",
          items: whatChanged.map((c) => ({
            text:
              (c.description as string) ??
              (c.summary as string) ??
              JSON.stringify(c),
            meta: (c.type as string) ?? undefined,
          })),
          body: "",
        });
      }

      // Contradictions / risks
      if (
        !config.excludeSections.includes("contradictions") &&
        contradictions.length > 0
      ) {
        const heading =
          audience === "investor" || audience === "banker"
            ? "Risk Factors"
            : "Contradictions & Tensions";
        sections.push({
          key:
            audience === "investor" || audience === "banker"
              ? "riskFactors"
              : "contradictions",
          heading,
          items: contradictions.map((c) => ({
            text:
              (c.title as string) ??
              (c.description as string) ??
              JSON.stringify(c),
            meta: (c.severity as string) ?? undefined,
          })),
          body: "",
        });
      }

      // Next actions / moves
      if (nextActions.length > 0) {
        const heading =
          audience === "teammate"
            ? "Action Items"
            : audience === "founder"
              ? "Next 3 Moves"
              : audience === "developer"
                ? "Technical Decisions & Next Steps"
                : "Recommended Actions";
        const items = (
          audience === "founder" ? nextActions.slice(0, 3) : nextActions
        ).map((a) => ({
          text:
            (a.label as string) ?? (a.title as string) ?? JSON.stringify(a),
          meta:
            [
              (a.priority as string) ? `priority: ${a.priority}` : "",
              (a.owner as string) ? `owner: ${a.owner}` : "",
            ]
              .filter(Boolean)
              .join(", ") || undefined,
        }));
        sections.push({
          key: audience === "teammate" ? "actionItems" : "nextMoves",
          heading,
          items,
          body: "",
        });
      }

      // Delegation brief (teammate only)
      if (audience === "teammate") {
        sections.push({
          key: "delegationBrief",
          heading: "Delegation Brief",
          body: agentInstructions
            ? `Focus: ${(agentInstructions.focus as string) ?? "See action items"}\nScope: ${(agentInstructions.scope as string) ?? "As assigned"}`
            : "No specific delegation instructions provided. See action items above.",
        });
      }

      // Market context / comparables
      if (
        nearbyEntities.length > 0 &&
        !config.excludeSections.includes("nearbyEntities")
      ) {
        const heading =
          audience === "banker"
            ? "Comparables"
            : audience === "investor"
              ? "Market Context"
              : "Nearby Entities";
        sections.push({
          key: audience === "banker" ? "comparables" : "marketContext",
          heading,
          items: nearbyEntities.map((e) => ({
            text: (e.name as string) ?? JSON.stringify(e),
            meta: (e.relationship as string) ?? undefined,
          })),
          body: "",
        });
      }

      // Financial signals (banker)
      if (audience === "banker") {
        const signals =
          (content.financialSignals as Array<Record<string, unknown>>) ?? [];
        sections.push({
          key: "financialSignals",
          heading: "Financial Signals",
          body:
            signals.length > 0
              ? signals
                  .map(
                    (s) =>
                      `${(s.label as string) ?? "Signal"}: ${(s.value as string) ?? "N/A"}`,
                  )
                  .join("\n")
              : "No financial signals available in this packet.",
        });
      }

      // Architecture / API changes (developer)
      if (audience === "developer") {
        const archChanges =
          (content.architectureChanges as Array<Record<string, unknown>>) ?? [];
        const apiChanges =
          (content.apiChanges as Array<Record<string, unknown>>) ?? [];
        if (
          archChanges.length > 0 ||
          whatChanged.some((c) =>
            ((c.type as string) ?? "").includes("arch"),
          )
        ) {
          sections.push({
            key: "architectureChanges",
            heading: "Architecture Changes",
            items:
              archChanges.length > 0
                ? archChanges.map((a) => ({
                    text: (a.description as string) ?? JSON.stringify(a),
                  }))
                : [
                    {
                      text: "See recent changes for architecture-related updates.",
                    },
                  ],
            body: "",
          });
        }
        if (apiChanges.length > 0) {
          sections.push({
            key: "apiChanges",
            heading: "API Changes",
            items: apiChanges.map((a) => ({
              text: (a.description as string) ?? JSON.stringify(a),
            })),
            body: "",
          });
        }
      }

      // Evidence
      if (
        !config.excludeSections.includes("evidence") &&
        keyEvidence.length > 0
      ) {
        sections.push({
          key: "evidence",
          heading: "Key Evidence",
          items: keyEvidence.map((e) => ({
            text:
              (e.claim as string) ??
              (e.description as string) ??
              JSON.stringify(e),
            meta: (e.source as string) ?? undefined,
          })),
          body: "",
        });
      }

      // ── Sort sections by audience config order ──────────────────────
      const orderMap = new Map(
        config.sectionOrder.map((key, i) => [key, i]),
      );
      sections.sort((a, b) => {
        const aOrder = orderMap.get(a.key) ?? 999;
        const bOrder = orderMap.get(b.key) ?? 999;
        return aOrder - bOrder;
      });

      // Filter out excluded sections
      const filteredSections = sections.filter(
        (s) => !config.excludeSections.includes(s.key),
      );

      // ── Metadata block ──────────────────────────────────────────────
      const metadataBlock = includeMetadata
        ? {
            generatedAt,
            nodebenchVersion: NODEBENCH_VERSION,
            exportId,
            audience,
            format,
          }
        : null;

      // ── Render helpers ──────────────────────────────────────────────
      function renderSectionMarkdown(
        s: ExportSection,
        emphasized: boolean,
      ): string {
        const marker = emphasized ? " **[KEY]**" : "";
        let out = `## ${s.heading}${marker}\n\n`;
        if (s.body) out += `${s.body}\n\n`;
        if (s.items) {
          for (const item of s.items) {
            out += item.meta
              ? `- **${item.text}** _(${item.meta})_\n`
              : `- ${item.text}\n`;
          }
          out += "\n";
        }
        return out;
      }

      function renderSectionPlaintext(s: ExportSection): string {
        let out = `${s.heading.toUpperCase()}\n${"=".repeat(s.heading.length)}\n\n`;
        if (s.body) out += `${s.body}\n\n`;
        if (s.items) {
          for (const item of s.items) {
            out += item.meta
              ? `  - ${item.text} (${item.meta})\n`
              : `  - ${item.text}\n`;
          }
          out += "\n";
        }
        return out;
      }

      const escapeHtml = (str: string): string =>
        str
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");

      // ── Render by format ────────────────────────────────────────────
      if (format === "json") {
        const jsonOutput: Record<string, unknown> = {
          title: `${config.headerPrefix}${title}`,
          audience,
          tone: config.tone,
          sections: Object.fromEntries(
            filteredSections.map((s) => [
              s.key,
              {
                heading: s.heading,
                ...(s.body ? { body: s.body } : {}),
                ...(s.items ? { items: s.items } : {}),
                emphasized: config.emphasisSections.includes(s.key),
              },
            ]),
          ),
        };
        if (metadataBlock) jsonOutput._metadata = metadataBlock;
        return { format: "json", exported: jsonOutput };
      }

      if (format === "markdown") {
        let md = `# ${config.headerPrefix}${title}\n\n`;
        if (config.tone === "formal")
          md += `> Prepared for ${audience} audience\n\n`;
        md += "---\n\n";
        for (const s of filteredSections) {
          md += renderSectionMarkdown(
            s,
            config.emphasisSections.includes(s.key),
          );
        }
        if (metadataBlock) {
          md += "---\n\n";
          md += `_Generated: ${generatedAt} | NodeBench v${NODEBENCH_VERSION} | Export ID: ${exportId}_\n`;
        }
        return { format: "markdown", exported: md };
      }

      if (format === "plaintext") {
        let txt = `${config.headerPrefix}${title}\n${"=".repeat((config.headerPrefix + title).length)}\n\n`;
        for (const s of filteredSections) {
          txt += renderSectionPlaintext(s);
        }
        if (metadataBlock) {
          txt += `${"—".repeat(40)}\n`;
          txt += `Generated: ${generatedAt}\nNodeBench v${NODEBENCH_VERSION}\nExport ID: ${exportId}\n`;
        }
        return { format: "plaintext", exported: txt };
      }

      // HTML format — self-contained with inline CSS matching glass card DNA
      if (format === "html") {
        let body = "";
        for (const s of filteredSections) {
          const isKey = config.emphasisSections.includes(s.key);
          body += `<section class="card${isKey ? " emphasized" : ""}">\n`;
          body += `  <h2>${escapeHtml(s.heading)}${isKey ? ' <span class="badge">KEY</span>' : ""}</h2>\n`;
          if (s.body)
            body += `  <p>${escapeHtml(s.body).replace(/\n/g, "<br>")}</p>\n`;
          if (s.items) {
            body += "  <ul>\n";
            for (const item of s.items) {
              body += item.meta
                ? `    <li><strong>${escapeHtml(item.text)}</strong> <span class="meta">(${escapeHtml(item.meta)})</span></li>\n`
                : `    <li>${escapeHtml(item.text)}</li>\n`;
            }
            body += "  </ul>\n";
          }
          body += "</section>\n";
        }

        let metaHtml = "";
        if (metadataBlock) {
          metaHtml = `<footer class="meta-footer">Generated: ${escapeHtml(generatedAt)} &middot; NodeBench v${escapeHtml(NODEBENCH_VERSION)} &middot; Export ID: ${escapeHtml(exportId)}</footer>`;
        }

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(config.headerPrefix + title)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Manrope', system-ui, sans-serif;
    background: #09090b; color: #fafafa;
    padding: 2rem; max-width: 800px; margin: 0 auto;
    line-height: 1.6;
  }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.25rem; }
  .subtitle { color: #a1a1aa; font-size: 0.85rem; margin-bottom: 1.5rem; }
  .card {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px; padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .card.emphasized { border-color: #d97757; }
  .card h2 { font-size: 0.95rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 0.75rem; color: #e4e4e7; }
  .badge { background: #d97757; color: #09090b; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; vertical-align: middle; letter-spacing: 0.05em; }
  .card p { color: #d4d4d8; font-size: 0.9rem; margin-bottom: 0.5rem; }
  .card ul { list-style: none; padding: 0; }
  .card li { padding: 0.3rem 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 0.9rem; color: #d4d4d8; }
  .card li:last-child { border-bottom: none; }
  .card li strong { color: #fafafa; }
  .meta { color: #71717a; font-size: 0.8rem; }
  .meta-footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.06); color: #71717a; font-size: 0.75rem; text-align: center; }
</style>
</head>
<body>
  <h1>${escapeHtml(config.headerPrefix + title)}</h1>
  <div class="subtitle">Prepared for ${escapeHtml(audience)} audience</div>
${body}
${metaHtml}
</body>
</html>`;

        return { format: "html", exported: html };
      }

      return { error: true, message: `Unhandled format: ${format}` };
    },
  },

  // ─── 6. founder_local_synthesize ──────────────────────────────────────────
  {
    name: "founder_local_synthesize",
    description:
      "The MOST IMPORTANT founder tool — takes a user query + local SQLite context " +
      "and uses Gemini 3.1 Flash Lite to synthesize a real, structured analysis. " +
      "Gathers: causal_events (last 20), founder_packets (latest for entity), " +
      "causal_important_changes (unresolved), tracking_actions (last 10), " +
      "session_summaries (latest). Optionally enriches with web_search. " +
      "Falls back to heuristic synthesis if no GEMINI_API_KEY.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The user's question or analysis request",
        },
        entityId: {
          type: "string",
          description: "Optional entity ID to scope context gathering",
        },
        includeWeb: {
          type: "boolean",
          description: "If true, call web_search to enrich with fresh data (default: false)",
        },
        packetType: {
          type: "string",
          enum: ["weekly_reset", "pre_delegation", "important_change", "competitor_brief", "role_switch"],
          description: "Type of synthesis to produce (default: important_change)",
        },
      },
      required: ["query"],
    },
    handler: async (args) => {
      const query = args.query as string;
      const entityId = (args.entityId as string) ?? null;
      const includeWeb = (args.includeWeb as boolean) ?? false;
      const packetType = (args.packetType as string) ?? "important_change";
      const start = Date.now();

      const db = getDb();

      // ── 1. Gather local context from SQLite ──────────────────────

      // causal_events (last 20)
      let causalEvents: Array<Record<string, unknown>> = [];
      try {
        causalEvents = db.prepare(
          `SELECT id, userId, eventType, payload, createdAt
           FROM causal_events
           ORDER BY createdAt DESC LIMIT 20`,
        ).all() as Array<Record<string, unknown>>;
      } catch { /* table may not exist */ }

      // founder_packets (latest for entity or global)
      let latestPackets: Array<Record<string, unknown>> = [];
      try {
        ensurePacketSchema();
        if (entityId) {
          latestPackets = db.prepare(
            `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             WHERE entityId = ?
             ORDER BY createdAt DESC LIMIT 3`,
          ).all(entityId) as Array<Record<string, unknown>>;
        } else {
          latestPackets = db.prepare(
            `SELECT packetId, entityId, packetType, packetJson, createdAt
             FROM founder_packets
             ORDER BY createdAt DESC LIMIT 3`,
          ).all() as Array<Record<string, unknown>>;
        }
      } catch { /* table may not exist */ }

      // causal_important_changes (unresolved)
      let importantChanges: Array<Record<string, unknown>> = [];
      try {
        importantChanges = db.prepare(
          `SELECT changeId, changeCategory, impactScore, impactReason, affectedEntities, suggestedAction, status, createdAt
           FROM causal_important_changes
           WHERE status IN ('detected','acknowledged','investigating')
           ORDER BY impactScore DESC LIMIT 10`,
        ).all() as Array<Record<string, unknown>>;
      } catch { /* table may not exist */ }

      // tracking_actions (last 10)
      let trackingActions: Array<Record<string, unknown>> = [];
      try {
        trackingActions = db.prepare(
          `SELECT actionId, action, category, reasoning, impactLevel, timestamp
           FROM tracking_actions
           ORDER BY timestamp DESC LIMIT 10`,
        ).all() as Array<Record<string, unknown>>;
      } catch { /* table may not exist */ }

      // session_summaries (latest)
      let sessionSummaries: Array<Record<string, unknown>> = [];
      try {
        sessionSummaries = db.prepare(
          `SELECT summaryId, sessionSummary, activeEntities, openIntents, unresolvedItems, keyDecisions, createdAt
           FROM session_summaries
           ORDER BY createdAt DESC LIMIT 3`,
        ).all() as Array<Record<string, unknown>>;
      } catch { /* table may not exist */ }

      // ── 2. Optional web enrichment ──────────────────────────────
      let webResults: Array<{ title: string; url: string; snippet: string }> = [];
      if (includeWeb) {
        try {
          const { webTools } = await import("./webTools.js");
          const webSearchTool = webTools.find((t) => t.name === "web_search");
          if (webSearchTool) {
            const webResponse = await webSearchTool.handler({ query, maxResults: 5 });
            const wr = webResponse as { results?: Array<{ title?: string; url?: string; snippet?: string }> };
            if (wr.results && Array.isArray(wr.results)) {
              webResults = wr.results
                .filter((r) => r.title && r.url)
                .map((r) => ({ title: r.title ?? "", url: r.url ?? "", snippet: r.snippet ?? "" }));
            }
          }
        } catch { /* web search unavailable — continue without */ }
      }

      // ── 3. Build context bundle for LLM ─────────────────────────
      const contextBundle = {
        query,
        entityId,
        packetType,
        causalEvents: causalEvents.map((e) => ({
          type: e.eventType,
          payload: typeof e.payload === "string" ? e.payload?.slice(0, 200) : e.payload,
          at: e.createdAt,
        })),
        latestPackets: latestPackets.map((p) => ({
          id: p.packetId,
          entity: p.entityId,
          type: p.packetType,
          at: p.createdAt,
        })),
        importantChanges: importantChanges.map((c) => ({
          category: c.changeCategory,
          impact: c.impactScore,
          reason: c.impactReason,
          affected: c.affectedEntities,
          action: c.suggestedAction,
          status: c.status,
        })),
        trackingActions: trackingActions.map((a) => ({
          action: a.action,
          category: a.category,
          reasoning: a.reasoning,
          impact: a.impactLevel,
          at: a.timestamp,
        })),
        sessionSummaries: sessionSummaries.map((s) => ({
          summary: typeof s.sessionSummary === "string" ? s.sessionSummary?.slice(0, 300) : s.sessionSummary,
          entities: s.activeEntities,
          unresolved: s.unresolvedItems,
          decisions: s.keyDecisions,
        })),
        webResults: webResults.length > 0
          ? webResults.map((r) => `[${r.title}](${r.url}): ${r.snippet}`)
          : undefined,
      };

      // ── 4. Call Gemini 3.1 Flash Lite ───────────────────────────
      const apiKey = process.env.GEMINI_API_KEY ?? "";

      if (apiKey) {
        const geminiPrompt = `You are an expert analyst for a founder operating system called NodeBench.

USER QUERY: ${query}

PACKET TYPE: ${packetType}

LOCAL CONTEXT (from SQLite operating memory):

RECENT EVENTS (${causalEvents.length}):
${JSON.stringify(contextBundle.causalEvents.slice(0, 10), null, 1)}

IMPORTANT CHANGES (${importantChanges.length} unresolved):
${JSON.stringify(contextBundle.importantChanges, null, 1)}

RECENT ACTIONS (${trackingActions.length}):
${JSON.stringify(contextBundle.trackingActions.slice(0, 5), null, 1)}

SESSION CONTEXT:
${JSON.stringify(contextBundle.sessionSummaries.slice(0, 2), null, 1)}

${contextBundle.webResults ? `WEB RESULTS:\n${contextBundle.webResults.join("\n")}` : ""}

Produce a JSON response with this exact structure:
{
  "summary": "2-3 sentence executive summary answering the user's query",
  "keyFindings": ["finding 1", "finding 2", ...],
  "entities": ["entity name 1", "entity name 2", ...],
  "metrics": [{"label": "metric name", "value": "metric value"}, ...],
  "risks": ["risk 1", "risk 2", ...],
  "nextSteps": ["step 1", "step 2", ...],
  "confidence": 0.0 to 1.0
}

Be specific. Use real data from the context. Do not hallucinate. If data is sparse, say so and lower confidence.`;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30_000);

          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;
          const resp = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (resp.ok) {
            const data = await resp.json() as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            const rawText = data?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text)
              .filter(Boolean)
              .join("") ?? "";

            // Try to parse JSON from the response
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]) as {
                  summary?: string;
                  keyFindings?: string[];
                  entities?: string[];
                  metrics?: Array<{ label: string; value: string }>;
                  risks?: string[];
                  nextSteps?: string[];
                  confidence?: number;
                };

                return {
                  synthesized: true,
                  llmGenerated: true,
                  model: "gemini-3.1-flash-lite-preview",
                  query,
                  entityId,
                  packetType,
                  summary: parsed.summary ?? rawText.slice(0, 500),
                  keyFindings: parsed.keyFindings ?? [],
                  entities: parsed.entities ?? [],
                  metrics: parsed.metrics ?? [],
                  risks: parsed.risks ?? [],
                  nextSteps: parsed.nextSteps ?? [],
                  confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
                  contextStats: {
                    causalEvents: causalEvents.length,
                    importantChanges: importantChanges.length,
                    trackingActions: trackingActions.length,
                    sessionSummaries: sessionSummaries.length,
                    founderPackets: latestPackets.length,
                    webResults: webResults.length,
                  },
                  webResults: webResults.length > 0 ? webResults : undefined,
                  latencyMs: Date.now() - start,
                };
              } catch { /* JSON parse failed — use raw text */ }
            }

            // Gemini returned text but not parseable JSON
            return {
              synthesized: true,
              llmGenerated: true,
              model: "gemini-3.1-flash-lite-preview",
              query,
              entityId,
              packetType,
              summary: rawText.slice(0, 1000),
              keyFindings: [],
              entities: [],
              metrics: [],
              risks: [],
              nextSteps: [],
              confidence: 0.4,
              contextStats: {
                causalEvents: causalEvents.length,
                importantChanges: importantChanges.length,
                trackingActions: trackingActions.length,
                sessionSummaries: sessionSummaries.length,
                founderPackets: latestPackets.length,
                webResults: webResults.length,
              },
              latencyMs: Date.now() - start,
              _note: "Gemini returned text but not structured JSON — summary is raw text",
            };
          }
        } catch { /* Gemini call failed — fall through to heuristic */ }
      }

      // ── 5. Heuristic fallback (no API key or Gemini failed) ─────
      const heuristicFindings: string[] = [];
      const heuristicEntities: string[] = [];
      const heuristicRisks: string[] = [];
      const heuristicNextSteps: string[] = [];
      const heuristicMetrics: Array<{ label: string; value: string }> = [];

      // Extract findings from important changes
      for (const c of importantChanges.slice(0, 5)) {
        heuristicFindings.push(`[${c.changeCategory}] ${c.impactReason} (impact: ${c.impactScore})`);
        if (c.suggestedAction) heuristicNextSteps.push(String(c.suggestedAction));
        try {
          const affected = JSON.parse(String(c.affectedEntities ?? "[]")) as string[];
          heuristicEntities.push(...affected);
        } catch {
          if (c.affectedEntities) heuristicEntities.push(String(c.affectedEntities));
        }
      }

      // Extract from causal events
      for (const e of causalEvents.slice(0, 5)) {
        heuristicFindings.push(`Event: ${e.eventType} at ${e.createdAt}`);
      }

      // Extract from tracking actions
      for (const a of trackingActions.slice(0, 3)) {
        heuristicFindings.push(`Action: ${a.action} [${a.category}/${a.impactLevel}]`);
      }

      // Extract from session summaries
      for (const s of sessionSummaries.slice(0, 1)) {
        if (s.unresolvedItems) {
          try {
            const items = JSON.parse(String(s.unresolvedItems)) as string[];
            heuristicRisks.push(...items.slice(0, 3));
          } catch {
            heuristicRisks.push(String(s.unresolvedItems).slice(0, 200));
          }
        }
      }

      // Metrics
      heuristicMetrics.push(
        { label: "Causal events (total)", value: String(causalEvents.length) },
        { label: "Unresolved changes", value: String(importantChanges.length) },
        { label: "Recent actions", value: String(trackingActions.length) },
        { label: "Founder packets", value: String(latestPackets.length) },
      );

      // Web results as findings
      for (const r of webResults.slice(0, 3)) {
        heuristicFindings.push(`[Web] ${r.title}: ${r.snippet.slice(0, 100)}`);
      }

      const uniqueEntities = [...new Set(heuristicEntities)].slice(0, 10);
      const dataRichness = (causalEvents.length + importantChanges.length + trackingActions.length + sessionSummaries.length) / 44; // max 44

      return {
        synthesized: true,
        llmGenerated: false,
        model: "heuristic-fallback",
        query,
        entityId,
        packetType,
        summary: importantChanges.length > 0
          ? `${importantChanges.length} unresolved important change(s) detected. Top: ${importantChanges[0]?.impactReason ?? "unknown"}. ${causalEvents.length} recent events and ${trackingActions.length} tracked actions provide context.`
          : `${causalEvents.length} recent events and ${trackingActions.length} tracked actions found. No unresolved important changes detected.`,
        keyFindings: heuristicFindings.slice(0, 10),
        entities: uniqueEntities,
        metrics: heuristicMetrics,
        risks: heuristicRisks.slice(0, 5),
        nextSteps: heuristicNextSteps.length > 0 ? heuristicNextSteps.slice(0, 5) : ["Review unresolved changes", "Run founder_packet_validate"],
        confidence: Math.min(0.9, Math.max(0.2, dataRichness)),
        contextStats: {
          causalEvents: causalEvents.length,
          importantChanges: importantChanges.length,
          trackingActions: trackingActions.length,
          sessionSummaries: sessionSummaries.length,
          founderPackets: latestPackets.length,
          webResults: webResults.length,
        },
        webResults: webResults.length > 0 ? webResults : undefined,
        latencyMs: Date.now() - start,
        _note: apiKey ? "Gemini call failed — using heuristic fallback" : "No GEMINI_API_KEY — using heuristic fallback",
      };
    },
  },

  // ─── 7. founder_local_weekly_reset ─────────────────────────────────────────
  {
    name: "founder_local_weekly_reset",
    description:
      "One-call weekly reset: calls founder_local_synthesize internally with " +
      "packetType='weekly_reset', adds weekly-specific context (events from last 7 days, " +
      "trajectory scores), and returns the synthesis plus a weeklyResetPacket wrapper " +
      "with weekStarting, weekEnding, topChanges, contradictions, nextMoves.",
    inputSchema: {
      type: "object",
      properties: {
        entityId: {
          type: "string",
          description: "Optional entity ID to scope the weekly reset",
        },
        includeWeb: {
          type: "boolean",
          description: "If true, enrich with web search results (default: false)",
        },
      },
    },
    handler: async (args) => {
      const entityId = (args.entityId as string) ?? null;
      const includeWeb = (args.includeWeb as boolean) ?? false;
      const start = Date.now();

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
      const weekStarting = weekAgo.toISOString().slice(0, 10);
      const weekEnding = now.toISOString().slice(0, 10);

      // Call founder_local_synthesize internally via its handler
      const synthesizeTool = founderTools.find((t) => t.name === "founder_local_synthesize");
      if (!synthesizeTool) {
        return { error: true, message: "founder_local_synthesize tool not found in founderTools array" };
      }

      const synthesisResult = await synthesizeTool.handler({
        query: `Weekly founder reset for ${weekStarting} to ${weekEnding}. Summarize what changed, what matters, and what to do next.`,
        entityId: entityId ?? undefined,
        includeWeb,
        packetType: "weekly_reset",
      }) as Record<string, unknown>;

      // ── Gather weekly-specific extras ──────────────────────────
      const db = getDb();

      // Events from last 7 days
      let weekEvents: Array<Record<string, unknown>> = [];
      try {
        weekEvents = db.prepare(
          `SELECT eventType, COUNT(*) as count
           FROM causal_events
           WHERE createdAt >= ?
           GROUP BY eventType
           ORDER BY count DESC`,
        ).all(weekAgo.toISOString()) as Array<Record<string, unknown>>;
      } catch { /* table may not exist */ }

      // Trajectory scores if available
      let trajectoryScores: Array<Record<string, unknown>> = [];
      try {
        trajectoryScores = db.prepare(
          `SELECT * FROM tracking_milestones
           WHERE timestamp >= ?
           ORDER BY timestamp DESC LIMIT 10`,
        ).all(weekAgo.toISOString()) as Array<Record<string, unknown>>;
      } catch { /* table may not exist */ }

      // Extract top changes and contradictions from synthesis
      const keyFindings = (synthesisResult.keyFindings as string[]) ?? [];
      const risks = (synthesisResult.risks as string[]) ?? [];
      const nextSteps = (synthesisResult.nextSteps as string[]) ?? [];

      // Build the weekly reset wrapper
      const weeklyResetPacket = {
        weekStarting,
        weekEnding,
        topChanges: keyFindings.slice(0, 5),
        contradictions: risks.slice(0, 5),
        nextMoves: nextSteps.slice(0, 3),
        eventBreakdown: weekEvents.map((e) => ({ type: e.eventType, count: e.count })),
        milestonesThisWeek: trajectoryScores.length,
      };

      // Track this as a milestone
      try {
        const milestoneId = `weekly_reset_${weekEnding}`;
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const m = now.getMonth() + 1;
        const y = now.getFullYear();
        db.prepare(
          `INSERT OR IGNORE INTO tracking_milestones
            (milestoneId, sessionId, timestamp, title, description, category, evidence, metrics, dayOfWeek, weekNumber, month, quarter, year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          milestoneId,
          `weekly_reset_${Date.now()}`,
          now.toISOString(),
          "Weekly founder reset generated",
          `${weekStarting} to ${weekEnding}: ${keyFindings.length} findings, ${risks.length} risks, ${nextSteps.length} next steps`,
          "dogfood",
          null,
          JSON.stringify({ findings: keyFindings.length, risks: risks.length, nextSteps: nextSteps.length }),
          dayNames[now.getDay()],
          Math.ceil((now.getTime() - new Date(y, 0, 1).getTime()) / 604800000),
          `${y}-${String(m).padStart(2, "0")}`,
          `${y}-Q${Math.ceil(m / 3)}`,
          y,
        );
      } catch { /* Non-fatal */ }

      return {
        ...synthesisResult,
        weeklyResetPacket,
        latencyMs: Date.now() - start,
      };
    },
  },
];
