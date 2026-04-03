/* ------------------------------------------------------------------ */
/*  Founder Packet Engine                                             */
/*  Core shared helper layer for the Artifact Packet pipeline.        */
/*  Everything else in the Founder Platform renders from this.        */
/* ------------------------------------------------------------------ */

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DEMO_COMPANY,
  DEMO_CHANGES,
  DEMO_INTERVENTIONS,
  DEMO_INITIATIVES,
  DEMO_AGENTS,
  DEMO_NEARBY_ENTITIES,
  DEMO_DAILY_MEMO,
  type ChangeEntry as FixtureChangeEntry,
  type Intervention,
  type AgentEntry,
} from "../views/founderFixtures";

/* ================================================================== */
/*  1. ArtifactPacket — the product's center of gravity               */
/* ================================================================== */

export interface ArtifactPacket {
  id: string;
  generatedAt: number;
  mode: "weekly_reset" | "pre_delegation" | "important_change";
  audience: "founder" | "peer" | "senior" | "investor" | "agent";

  /** Core truth */
  canonicalCompany: {
    name: string;
    mission: string;
    wedge: string;
    state: string;
    confidence: number;
  };

  /** What changed since last packet */
  changeFeed: ChangeEntry[];

  /** The biggest contradiction or risk */
  biggestContradiction: {
    summary: string;
    severity: "critical" | "important" | "minor";
    affectedInitiatives: string[];
  } | null;

  /** Ranked next moves */
  nextMoves: Array<{
    rank: number;
    action: string;
    initiative: string;
    urgency: "now" | "this_week" | "next_week";
  }>;

  /** Operating memo (1 paragraph) */
  operatingMemo: string;

  /** Evidence refs */
  evidenceRefs: string[];

  /** Agent instructions (if mode is pre_delegation) */
  agentInstructions: string | null;

  /** Nearby entities */
  nearbyEntities: Array<{
    name: string;
    type: "competitor" | "partner" | "customer" | "product" | "initiative";
    relationship: string;
  }>;
}

/* ================================================================== */
/*  2. ChangeEntry                                                    */
/* ================================================================== */

export interface ChangeEntry {
  id: string;
  timestamp: number;
  type: "agent_output" | "signal" | "user_action" | "drift" | "external";
  icon: string; // lucide icon name
  summary: string;
  initiative?: string;
  source: "system" | "user" | "agent";
  importance: "high" | "medium" | "low";
}

/* ================================================================== */
/*  Internal helpers                                                  */
/* ================================================================== */

const PACKET_HISTORY_KEY = "nodebench-packet-history";
const USER_ACTIONS_KEY = "nodebench-user-actions";
const INTERVENTIONS_KEY = "nodebench-interventions";
const MAX_PACKET_HISTORY = 24;

function createPacketId(): string {
  return `pkt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createChangeId(): string {
  return `chg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Map fixture ChangeType → engine ChangeEntry.type */
function mapFixtureChangeType(
  fixtureType: string,
): "agent_output" | "signal" | "user_action" | "drift" | "external" {
  switch (fixtureType) {
    case "agent":
      return "agent_output";
    case "signal":
      return "signal";
    case "decision":
      return "user_action";
    case "initiative":
      return "drift";
    default:
      return "external";
  }
}

/** Map fixture ChangeType → lucide icon name */
function mapFixtureChangeIcon(fixtureType: string): string {
  switch (fixtureType) {
    case "agent":
      return "bot";
    case "signal":
      return "radio";
    case "decision":
      return "check-circle";
    case "initiative":
      return "layers";
    default:
      return "activity";
  }
}

/** Map fixture ChangeType → source */
function mapFixtureChangeSource(
  fixtureType: string,
): "system" | "user" | "agent" {
  switch (fixtureType) {
    case "agent":
      return "agent";
    case "decision":
      return "user";
    default:
      return "system";
  }
}

/** Infer importance from fixture data: linked to high-risk initiative → high, etc. */
function inferImportance(
  fixtureChange: FixtureChangeEntry,
): "high" | "medium" | "low" {
  const highRiskInitiatives = DEMO_INITIATIVES.filter(
    (i) => i.risk === "high",
  ).map((i) => i.id);
  if (
    fixtureChange.linkedInitiativeId &&
    highRiskInitiatives.includes(fixtureChange.linkedInitiativeId)
  ) {
    return "high";
  }
  if (fixtureChange.type === "decision") return "high";
  if (fixtureChange.type === "signal") return "medium";
  return "medium";
}

/** Read a JSON array from localStorage, returning [] on any error */
function readLocalStorageArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

/** Write a JSON value to localStorage */
function writeLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/* ================================================================== */
/*  Stored user action shape (from localStorage)                      */
/* ================================================================== */

interface StoredUserAction {
  id?: string;
  timestamp?: number;
  action: string;
  initiative?: string;
  type?: string;
}

/** Convert a fixture ChangeEntry to engine ChangeEntry */
function fixtureChangeToEntry(fc: FixtureChangeEntry): ChangeEntry {
  return {
    id: fc.id,
    timestamp: new Date(fc.timestamp).getTime(),
    type: mapFixtureChangeType(fc.type),
    icon: mapFixtureChangeIcon(fc.type),
    summary: fc.description,
    initiative: fc.linkedInitiativeId
      ? DEMO_INITIATIVES.find((i) => i.id === fc.linkedInitiativeId)?.title
      : undefined,
    source: mapFixtureChangeSource(fc.type),
    importance: inferImportance(fc),
  };
}

/** Convert a stored user action to engine ChangeEntry */
function userActionToEntry(action: StoredUserAction): ChangeEntry {
  return {
    id: action.id ?? createChangeId(),
    timestamp: action.timestamp ?? Date.now(),
    type: "user_action",
    icon: "user-check",
    summary: action.action,
    initiative: action.initiative,
    source: "user",
    importance: "high",
  };
}

/* ================================================================== */
/*  3. buildFounderChangeFeed                                         */
/* ================================================================== */

/**
 * Build a sorted, deduplicated change feed from:
 *  - Demo fixture changes
 *  - User actions stored in localStorage
 *  - Intervention acceptances stored in localStorage
 *
 * @param options.fixtureChanges  Override demo fixtures (defaults to DEMO_CHANGES)
 * @param options.previousSnapshot  Previous packet for dedup (entries already seen)
 * @returns Sorted ChangeEntry[] with importance ranking
 */
export function buildFounderChangeFeed(options?: {
  fixtureChanges?: FixtureChangeEntry[];
  previousSnapshot?: ArtifactPacket | null;
}): ChangeEntry[] {
  const fixtures = options?.fixtureChanges ?? DEMO_CHANGES;
  const previous = options?.previousSnapshot;

  // 1. Convert fixture changes
  const fixtureEntries: ChangeEntry[] = fixtures.map(fixtureChangeToEntry);

  // 2. Read user actions from localStorage
  const storedActions =
    readLocalStorageArray<StoredUserAction>(USER_ACTIONS_KEY);
  const userEntries: ChangeEntry[] = storedActions.map(userActionToEntry);

  // 3. Read intervention acceptances/deferrals from localStorage
  const storedInterventions = readLocalStorageArray<{
    id?: string;
    interventionId?: string;
    action?: string;
    timestamp?: number;
    title?: string;
  }>(INTERVENTIONS_KEY);
  const interventionEntries: ChangeEntry[] = storedInterventions.map((si) => ({
    id: si.id ?? `int-act-${si.interventionId ?? createChangeId()}`,
    timestamp: si.timestamp ?? Date.now(),
    type: "user_action" as const,
    icon: si.action === "defer" ? "clock" : "check-circle-2",
    summary: si.action === "defer"
      ? `Deferred: ${si.title ?? si.interventionId ?? "intervention"}`
      : `Accepted: ${si.title ?? si.interventionId ?? "intervention"}`,
    source: "user" as const,
    importance: "medium" as const,
  }));

  // 4. Merge all
  const allEntries = [...fixtureEntries, ...userEntries, ...interventionEntries];

  // 5. Deduplicate by id
  const seenIds = new Set<string>();
  const deduped = allEntries.filter((entry) => {
    if (seenIds.has(entry.id)) return false;
    seenIds.add(entry.id);
    return true;
  });

  // 6. If previous snapshot exists, filter out entries already in that packet's changeFeed
  let filtered = deduped;
  if (previous) {
    const previousIds = new Set(previous.changeFeed.map((e) => e.id));
    // Keep entries that are new OR have higher importance than before
    filtered = deduped.filter((entry) => {
      if (!previousIds.has(entry.id)) return true;
      // Always include high-importance entries even if seen before
      return entry.importance === "high";
    });
    // If filtering removed everything, keep the originals (first packet scenario)
    if (filtered.length === 0) filtered = deduped;
  }

  // 7. Sort: high importance first, then by timestamp descending
  const importanceOrder: Record<string, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  filtered.sort((a, b) => {
    const impDiff =
      (importanceOrder[a.importance] ?? 1) -
      (importanceOrder[b.importance] ?? 1);
    if (impDiff !== 0) return impDiff;
    return b.timestamp - a.timestamp;
  });

  return filtered;
}

/* ================================================================== */
/*  4. buildFounderPacketSource                                       */
/* ================================================================== */

/** Map audience from mode */
function audienceFromMode(
  mode: ArtifactPacket["mode"],
): ArtifactPacket["audience"] {
  switch (mode) {
    case "pre_delegation":
      return "agent";
    case "important_change":
      return "founder";
    case "weekly_reset":
    default:
      return "founder";
  }
}

/** Detect the biggest contradiction by analyzing the change feed for conflicting signals */
function detectBiggestContradiction(
  changeFeed: ChangeEntry[],
  interventions: Intervention[],
): ArtifactPacket["biggestContradiction"] {
  // Strategy 1: Check if compliance is blocking go-to-market
  const hasComplianceBlock = DEMO_INITIATIVES.some(
    (i) => i.status === "blocked" && /soc 2|compliance/i.test(i.title),
  );
  const hasPartnershipActive = DEMO_INITIATIVES.some(
    (i) =>
      i.status === "active" &&
      i.risk === "high" &&
      /partner/i.test(i.title),
  );
  if (hasComplianceBlock && hasPartnershipActive) {
    return {
      summary:
        "Go-to-market momentum is ahead of compliance readiness. The TradeFlow partnership requires SOC 2, but that workstream is blocked. External commitments are outpacing internal capability.",
      severity: "critical",
      affectedInitiatives: ["TradeFlow Partnership", "SOC 2 Compliance"],
    };
  }

  // Strategy 2: Check for fundraising timing contradiction
  const hasFundraisingDelay = changeFeed.some(
    (c) => /delay|series a|investor/i.test(c.summary),
  );
  const hasInvestorIntervention = interventions.some(
    (i) => /investor|memo|series a/i.test(i.title),
  );
  if (hasFundraisingDelay && hasInvestorIntervention) {
    return {
      summary:
        "Fundraising narrative depends on metrics that are not yet ready. Investor outreach is on the action list but the proof data is still incomplete.",
      severity: "important",
      affectedInitiatives: ["Series A Readiness", "Pricing Engine MVP"],
    };
  }

  // Strategy 3: Check for competing high-importance changes pulling in different directions
  const highChanges = changeFeed.filter((c) => c.importance === "high");
  const uniqueInitiatives = [
    ...new Set(highChanges.map((c) => c.initiative).filter(Boolean)),
  ];
  if (uniqueInitiatives.length >= 2) {
    return {
      summary: `Multiple high-priority signals are pulling focus across ${uniqueInitiatives.length} initiatives simultaneously: ${uniqueInitiatives.slice(0, 3).join(", ")}. Execution spread is the main risk.`,
      severity: "important",
      affectedInitiatives: uniqueInitiatives.slice(0, 4) as string[],
    };
  }

  // Strategy 4: Identity confidence is low
  if (DEMO_COMPANY.identityConfidence < 0.7) {
    return {
      summary:
        "Company identity confidence is below 70%. Your team and AI tools may lose focus without a clearer company narrative anchored in every report.",
      severity: "minor",
      affectedInitiatives: [],
    };
  }

  return null;
}

/** Rank next moves from interventions */
function rankNextMoves(
  interventions: Intervention[],
): ArtifactPacket["nextMoves"] {
  return interventions
    .slice()
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 5)
    .map((intervention, index) => {
      let urgency: "now" | "this_week" | "next_week";
      if (intervention.priorityScore >= 90) urgency = "now";
      else if (intervention.priorityScore >= 75) urgency = "this_week";
      else urgency = "next_week";

      return {
        rank: index + 1,
        action: intervention.title,
        initiative: intervention.linkedInitiative,
        urgency,
      };
    });
}

/** Generate operating memo from company state + top changes + contradiction */
function generateOperatingMemo(
  company: typeof DEMO_COMPANY,
  changeFeed: ChangeEntry[],
  contradiction: ArtifactPacket["biggestContradiction"],
  nextMoves: ArtifactPacket["nextMoves"],
  mode: ArtifactPacket["mode"],
): string {
  const topChange = changeFeed[0]?.summary ?? "no new signals";
  const topMove =
    nextMoves[0]?.action.toLowerCase() ?? "the highest-leverage unresolved action";
  const contradictionClause = contradiction
    ? ` The main operating risk is that ${contradiction.summary.toLowerCase().replace(/\.$/, "")}.`
    : "";

  if (mode === "pre_delegation") {
    return `${company.name} should be framed for agents as ${company.wedge.toLowerCase()}, with the current operating truth anchored on: ${topChange}.${contradictionClause} The first delegated move should be to ${topMove.replace(/^fix /i, "fix ")}.`;
  }

  if (mode === "important_change") {
    return `The most material shift for ${company.name} is: ${topChange}. This sharpens the operating constraint because ${contradiction?.summary.toLowerCase().replace(/\.$/, "") ?? "the team must now re-prioritize before expanding scope"}.${contradictionClause ? "" : ""} The week should be organized around ${topMove} before anything else expands.`;
  }

  // weekly_reset
  return `${company.name} is still best understood as ${company.canonicalMission.toLowerCase()}, with the wedge anchored on ${company.wedge.toLowerCase()}. The most important recent development: ${topChange}.${contradictionClause} This week should be organized around ${topMove}, keeping the company at ${Math.round(company.identityConfidence * 100)}% identity confidence until proof strengthens.`;
}

/** Build evidence refs from changes + initiatives */
function buildEvidenceRefs(
  changeFeed: ChangeEntry[],
): string[] {
  const refs: string[] = [];

  // Top 3 changes as evidence
  for (const entry of changeFeed.slice(0, 3)) {
    refs.push(`[${entry.type}] ${entry.summary}`);
  }

  // High-risk initiatives
  for (const initiative of DEMO_INITIATIVES.filter((i) => i.risk === "high")) {
    refs.push(
      `[initiative] ${initiative.title} — ${initiative.status}, ${initiative.risk} risk`,
    );
  }

  // Daily memo unresolved items
  for (const item of DEMO_DAILY_MEMO.unresolved) {
    refs.push(`[unresolved] ${item}`);
  }

  return refs.slice(0, 8);
}

/** Generate agent instructions for pre_delegation mode */
function generateAgentInstructions(
  company: typeof DEMO_COMPANY,
  nextMoves: ArtifactPacket["nextMoves"],
  contradiction: ArtifactPacket["biggestContradiction"],
  agents: AgentEntry[],
): string {
  const actionList = nextMoves
    .map((m) => `${m.rank}. ${m.action} [${m.urgency}]`)
    .join("\n");

  const agentStatuses = agents
    .map((a) => `- ${a.name} (${a.status}): ${a.currentGoal}`)
    .join("\n");

  return [
    `Act as a focused operator for ${company.name}.`,
    `Wedge: ${company.wedge}.`,
    `Do not drift from this mission: ${company.canonicalMission}.`,
    "",
    contradiction
      ? `Keep this contradiction visible: ${contradiction.summary}`
      : "No critical risks detected. Stay focused on execution.",
    "",
    "Execute or support these actions in priority order:",
    actionList,
    "",
    "Current agent statuses:",
    agentStatuses,
    "",
    "If new evidence conflicts with this packet, surface the contradiction before taking a new branch.",
  ].join("\n");
}

/** Map fixture nearby entities to engine format */
function mapNearbyEntities(): ArtifactPacket["nearbyEntities"] {
  const typeMap: Record<string, ArtifactPacket["nearbyEntities"][number]["type"]> = {
    product: "product",
    initiative: "initiative",
    "design partner": "partner",
    comparable: "competitor",
    "market signal": "product",
  };

  return DEMO_NEARBY_ENTITIES.map((entity) => ({
    name: entity.name,
    type: typeMap[entity.relationship] ?? "product",
    relationship: entity.whyItMatters,
  }));
}

/**
 * Build a complete ArtifactPacket from source data.
 *
 * @param args.canonicalCompany   Company identity (defaults to DEMO_COMPANY)
 * @param args.changeFeed         Pre-built change feed (or auto-builds from fixtures)
 * @param args.interventions      Interventions to rank (defaults to DEMO_INTERVENTIONS)
 * @param args.agentStatuses      Agent statuses (defaults to DEMO_AGENTS)
 * @param args.agentStatusOverrides  Partial overrides for agent statuses
 * @param args.mode               Packet mode
 */
export function buildFounderPacketSource(args: {
  canonicalCompany?: {
    name: string;
    mission: string;
    wedge: string;
    state: string;
    confidence: number;
  };
  changeFeed?: ChangeEntry[];
  interventions?: Intervention[];
  agentStatuses?: AgentEntry[];
  agentStatusOverrides?: Record<string, Partial<AgentEntry>>;
  mode: ArtifactPacket["mode"];
}): ArtifactPacket {
  const company = args.canonicalCompany
    ? {
        name: args.canonicalCompany.name,
        canonicalMission: args.canonicalCompany.mission,
        wedge: args.canonicalCompany.wedge,
        companyState: args.canonicalCompany.state as typeof DEMO_COMPANY.companyState,
        foundingMode: DEMO_COMPANY.foundingMode,
        identityConfidence: args.canonicalCompany.confidence,
      }
    : DEMO_COMPANY;

  const changeFeed = args.changeFeed ?? buildFounderChangeFeed();
  const interventions = args.interventions ?? DEMO_INTERVENTIONS;
  let agents = args.agentStatuses ?? DEMO_AGENTS;

  // Apply agent status overrides
  if (args.agentStatusOverrides) {
    agents = agents.map((agent) => {
      const override = args.agentStatusOverrides?.[agent.id];
      return override ? { ...agent, ...override } : agent;
    });
  }

  const contradiction = detectBiggestContradiction(changeFeed, interventions);
  const nextMoves = rankNextMoves(interventions);
  const operatingMemo = generateOperatingMemo(
    company,
    changeFeed,
    contradiction,
    nextMoves,
    args.mode,
  );
  const evidenceRefs = buildEvidenceRefs(changeFeed);
  const agentInstructions =
    args.mode === "pre_delegation"
      ? generateAgentInstructions(company, nextMoves, contradiction, agents)
      : null;

  return {
    id: createPacketId(),
    generatedAt: Date.now(),
    mode: args.mode,
    audience: audienceFromMode(args.mode),
    canonicalCompany: {
      name: company.name,
      mission: company.canonicalMission,
      wedge: company.wedge,
      state: company.companyState,
      confidence: company.identityConfidence,
    },
    changeFeed,
    biggestContradiction: contradiction,
    nextMoves,
    operatingMemo,
    evidenceRefs,
    agentInstructions,
    nearbyEntities: mapNearbyEntities(),
  };
}

/* ================================================================== */
/*  5. usePacketState hook                                            */
/* ================================================================== */

export interface PacketState {
  currentPacket: ArtifactPacket | null;
  packetHistory: ArtifactPacket[];
  generatePacket: (mode: ArtifactPacket["mode"]) => ArtifactPacket;
  refreshPacket: () => ArtifactPacket | null;
}

/**
 * React hook for packet state management.
 * Reads/writes packet history from localStorage.
 * Auto-generates an initial weekly_reset on first load if no history exists.
 */
export function usePacketState(): PacketState {
  const [packetHistory, setPacketHistory] = useState<ArtifactPacket[]>(() =>
    readLocalStorageArray<ArtifactPacket>(PACKET_HISTORY_KEY),
  );

  const hasAutoGenerated = useRef(false);

  // Auto-generate initial packet on first load if history is empty
  useEffect(() => {
    if (packetHistory.length === 0 && !hasAutoGenerated.current) {
      hasAutoGenerated.current = true;
      const initial = buildFounderPacketSource({ mode: "weekly_reset" });
      const next = [initial];
      setPacketHistory(next);
      writeLocalStorage(PACKET_HISTORY_KEY, next);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentPacket = packetHistory[0] ?? null;

  const generatePacket = useCallback(
    (mode: ArtifactPacket["mode"]): ArtifactPacket => {
      const previousSnapshot = packetHistory[0] ?? null;
      const changeFeed = buildFounderChangeFeed({ previousSnapshot });
      const packet = buildFounderPacketSource({ mode, changeFeed });
      const next = [packet, ...packetHistory]
        .slice(0, MAX_PACKET_HISTORY);
      setPacketHistory(next);
      writeLocalStorage(PACKET_HISTORY_KEY, next);
      return packet;
    },
    [packetHistory],
  );

  const refreshPacket = useCallback((): ArtifactPacket | null => {
    if (!currentPacket) return null;
    const changeFeed = buildFounderChangeFeed({
      previousSnapshot: packetHistory[1] ?? null,
    });
    const refreshed = buildFounderPacketSource({
      mode: currentPacket.mode,
      changeFeed,
    });
    // Replace the current packet in history (keep same slot)
    const next = [refreshed, ...packetHistory.slice(1)].slice(
      0,
      MAX_PACKET_HISTORY,
    );
    setPacketHistory(next);
    writeLocalStorage(PACKET_HISTORY_KEY, next);
    return refreshed;
  }, [currentPacket, packetHistory]);

  return { currentPacket, packetHistory, generatePacket, refreshPacket };
}

/* ================================================================== */
/*  6. Export functions                                                */
/* ================================================================== */

/** Format a timestamp (ms) as a human-readable date string */
function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "recently";
  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Format urgency for display */
function formatUrgency(urgency: "now" | "this_week" | "next_week"): string {
  switch (urgency) {
    case "now":
      return "NOW";
    case "this_week":
      return "This week";
    case "next_week":
      return "Next week";
  }
}

/**
 * Export packet as clean professional Markdown brief.
 */
export function packetToMarkdown(packet: ArtifactPacket): string {
  const lines: string[] = [];

  lines.push("# NodeBench Operating Brief");
  lines.push(`## Company: ${packet.canonicalCompany.name}`);
  lines.push(
    `**State:** ${packet.canonicalCompany.state} | **Confidence:** ${Math.round(packet.canonicalCompany.confidence * 100)}%`,
  );
  lines.push(`**Mission:** ${packet.canonicalCompany.mission}`);
  lines.push(`**Wedge:** ${packet.canonicalCompany.wedge}`);
  lines.push("");
  lines.push(`*Generated: ${formatTimestamp(packet.generatedAt)} | Mode: ${packet.mode.replace(/_/g, " ")} | Audience: ${packet.audience}*`);
  lines.push("");

  // What Changed
  lines.push("## What Changed");
  if (packet.changeFeed.length === 0) {
    lines.push("- No new changes detected.");
  } else {
    for (const entry of packet.changeFeed.slice(0, 8)) {
      const tag = entry.importance === "high" ? " **[HIGH]**" : "";
      lines.push(`- ${entry.summary}${tag}`);
    }
  }
  lines.push("");

  // Biggest Contradiction
  lines.push("## Key Risk");
  if (packet.biggestContradiction) {
    lines.push(
      `**${packet.biggestContradiction.severity.toUpperCase()}:** ${packet.biggestContradiction.summary}`,
    );
    if (packet.biggestContradiction.affectedInitiatives.length > 0) {
      lines.push(
        `*Affected:* ${packet.biggestContradiction.affectedInitiatives.join(", ")}`,
      );
    }
  } else {
    lines.push("No critical risks detected.");
  }
  lines.push("");

  // Next Moves
  const moveCount = Math.min(packet.nextMoves.length, 5);
  lines.push(`## Next ${moveCount} Moves`);
  for (const move of packet.nextMoves.slice(0, 5)) {
    lines.push(
      `${move.rank}. ${move.action} — *${move.initiative}* — ${formatUrgency(move.urgency)}`,
    );
  }
  lines.push("");

  // Operating Memo
  lines.push("## Operating Memo");
  lines.push(packet.operatingMemo);
  lines.push("");

  // Nearby Entities
  if (packet.nearbyEntities.length > 0) {
    lines.push("## Nearby Entities");
    for (const entity of packet.nearbyEntities) {
      lines.push(`- **${entity.name}** (${entity.type}) — ${entity.relationship}`);
    }
    lines.push("");
  }

  // Evidence
  if (packet.evidenceRefs.length > 0) {
    lines.push("## Evidence");
    for (const ref of packet.evidenceRefs) {
      lines.push(`- ${ref}`);
    }
    lines.push("");
  }

  // Agent Instructions
  if (packet.agentInstructions) {
    lines.push("## Agent Instructions");
    lines.push("```");
    lines.push(packet.agentInstructions);
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

/** Escape HTML entities */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Export packet as a standalone dark-themed HTML page.
 */
export function packetToHTML(packet: ArtifactPacket): string {
  const changeFeedHtml = packet.changeFeed
    .slice(0, 8)
    .map((entry) => {
      const badge =
        entry.importance === "high"
          ? ' <span style="color:#f59e0b;font-weight:600">[HIGH]</span>'
          : "";
      return `<li>${escapeHtml(entry.summary)}${badge}</li>`;
    })
    .join("\n");

  const contradictionHtml = packet.biggestContradiction
    ? `<div class="card contradiction">
        <h2>Key Risk</h2>
        <span class="severity severity-${escapeHtml(packet.biggestContradiction.severity)}">${escapeHtml(packet.biggestContradiction.severity.toUpperCase())}</span>
        <p>${escapeHtml(packet.biggestContradiction.summary)}</p>
        ${packet.biggestContradiction.affectedInitiatives.length > 0 ? `<p class="affected">Affected: ${escapeHtml(packet.biggestContradiction.affectedInitiatives.join(", "))}</p>` : ""}
      </div>`
    : `<div class="card"><h2>Key Risk</h2><p class="muted">No critical risks detected.</p></div>`;

  const nextMovesHtml = packet.nextMoves
    .slice(0, 5)
    .map(
      (move) =>
        `<li><strong>${escapeHtml(move.action)}</strong> <span class="tag">${escapeHtml(move.initiative)}</span> <span class="urgency urgency-${escapeHtml(move.urgency)}">${escapeHtml(formatUrgency(move.urgency))}</span></li>`,
    )
    .join("\n");

  const entitiesHtml = packet.nearbyEntities
    .map(
      (entity) =>
        `<li><strong>${escapeHtml(entity.name)}</strong> <span class="tag">${escapeHtml(entity.type)}</span> — ${escapeHtml(entity.relationship)}</li>`,
    )
    .join("\n");

  const evidenceHtml = packet.evidenceRefs
    .map((ref) => `<li>${escapeHtml(ref)}</li>`)
    .join("\n");

  const agentHtml = packet.agentInstructions
    ? `<div class="card"><h2>Agent Instructions</h2><pre>${escapeHtml(packet.agentInstructions)}</pre></div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(packet.canonicalCompany.name)} Operating Brief</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Manrope',Inter,system-ui,sans-serif;background:#151413;color:#f5f5f4;line-height:1.6;padding:32px 16px}
main{max-width:800px;margin:0 auto}
h1{font-size:28px;font-weight:700;margin-bottom:4px}
h2{font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#d97757;margin-bottom:12px;margin-top:0}
.meta{display:flex;flex-wrap:wrap;gap:8px;color:#a8a29e;font-size:13px;margin:12px 0 24px}
.meta span{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:2px 10px}
.card{background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:16px}
.card p{color:#d6d3d1;margin-top:8px}
.card ul,.card ol{padding-left:20px;color:#d6d3d1}
.card li{margin-bottom:6px}
.card pre{background:#0c0a09;border-radius:12px;padding:16px;color:#a8a29e;white-space:pre-wrap;font-family:'JetBrains Mono',monospace;font-size:13px;margin-top:8px;overflow-x:auto}
.subtitle{font-size:14px;color:#a8a29e;margin-bottom:16px}
.stat{display:inline-block;background:rgba(217,119,87,0.12);color:#d97757;border-radius:6px;padding:2px 8px;font-size:13px;font-weight:600}
.tag{font-size:11px;color:#a8a29e;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:1px 6px;margin-left:4px}
.urgency{font-size:11px;font-weight:600;border-radius:6px;padding:1px 6px;margin-left:4px}
.urgency-now{color:#ef4444;background:rgba(239,68,68,0.12)}
.urgency-this_week{color:#f59e0b;background:rgba(245,158,11,0.12)}
.urgency-next_week{color:#22c55e;background:rgba(34,197,94,0.12)}
.severity{font-size:11px;font-weight:700;border-radius:6px;padding:2px 8px;margin-bottom:8px;display:inline-block}
.severity-critical{color:#ef4444;background:rgba(239,68,68,0.15)}
.severity-important{color:#f59e0b;background:rgba(245,158,11,0.15)}
.severity-minor{color:#22c55e;background:rgba(34,197,94,0.15)}
.muted{color:#78716c}
.affected{font-size:13px;color:#a8a29e;margin-top:4px}
.contradiction{border-color:rgba(217,119,87,0.2)}
.memo{font-size:15px;color:#e7e5e4;line-height:1.7}
@media print{body{background:#fff;color:#1c1917;padding:24px}.card{border-color:#e7e5e4;background:#fafaf9}h2{color:#92400e}.meta span{border-color:#e7e5e4;background:#f5f5f4}}
@media(max-width:640px){body{padding:16px 12px}h1{font-size:22px}.card{padding:14px}}
</style>
</head>
<body>
<main>
<h1>${escapeHtml(packet.canonicalCompany.name)} Operating Brief</h1>
<p class="subtitle">${escapeHtml(packet.canonicalCompany.mission)}</p>
<div class="meta">
  <span>State: ${escapeHtml(packet.canonicalCompany.state)}</span>
  <span>Confidence: <strong>${Math.round(packet.canonicalCompany.confidence * 100)}%</strong></span>
  <span>Wedge: ${escapeHtml(packet.canonicalCompany.wedge)}</span>
  <span>Mode: ${escapeHtml(packet.mode.replace(/_/g, " "))}</span>
  <span>${escapeHtml(formatTimestamp(packet.generatedAt))}</span>
</div>

<div class="card">
  <h2>What Changed</h2>
  <ul>${changeFeedHtml || "<li class=\"muted\">No new changes detected.</li>"}</ul>
</div>

${contradictionHtml}

<div class="card">
  <h2>Next Moves</h2>
  <ol>${nextMovesHtml}</ol>
</div>

<div class="card">
  <h2>Operating Memo</h2>
  <p class="memo">${escapeHtml(packet.operatingMemo)}</p>
</div>

${packet.nearbyEntities.length > 0 ? `<div class="card"><h2>Nearby Entities</h2><ul>${entitiesHtml}</ul></div>` : ""}

${packet.evidenceRefs.length > 0 ? `<div class="card"><h2>Evidence</h2><ul>${evidenceHtml}</ul></div>` : ""}

${agentHtml}

<p style="text-align:center;color:#57534e;font-size:12px;margin-top:32px">Generated by NodeBench Founder Platform</p>
</main>
</body>
</html>`;
}

/**
 * Copy packet as Markdown to clipboard.
 */
export async function packetToClipboard(
  packet: ArtifactPacket,
): Promise<void> {
  const md = packetToMarkdown(packet);
  await navigator.clipboard.writeText(md);
}

/**
 * Export packet as a compressed agent brief (for injection into agent context).
 * Strips verbose evidence and formatting, keeps only what an agent needs to operate.
 */
export function packetToAgentBrief(packet: ArtifactPacket): string {
  const lines: string[] = [];

  lines.push(`AGENT OPERATING BRIEF — ${packet.canonicalCompany.name}`);
  lines.push(`Generated: ${new Date(packet.generatedAt).toISOString()}`);
  lines.push(`Mode: ${packet.mode}`);
  lines.push("");

  lines.push(`COMPANY: ${packet.canonicalCompany.name}`);
  lines.push(`MISSION: ${packet.canonicalCompany.mission}`);
  lines.push(`WEDGE: ${packet.canonicalCompany.wedge}`);
  lines.push(`STATE: ${packet.canonicalCompany.state} (${Math.round(packet.canonicalCompany.confidence * 100)}% confidence)`);
  lines.push("");

  if (packet.biggestContradiction) {
    lines.push(`CONTRADICTION [${packet.biggestContradiction.severity.toUpperCase()}]: ${packet.biggestContradiction.summary}`);
    lines.push("");
  }

  lines.push("PRIORITY ACTIONS:");
  for (const move of packet.nextMoves.slice(0, 3)) {
    lines.push(`  ${move.rank}. [${move.urgency.toUpperCase()}] ${move.action} (${move.initiative})`);
  }
  lines.push("");

  lines.push("OPERATING CONTEXT:");
  lines.push(packet.operatingMemo);
  lines.push("");

  if (packet.agentInstructions) {
    lines.push("INSTRUCTIONS:");
    lines.push(packet.agentInstructions);
    lines.push("");
  }

  // Key changes (abbreviated)
  const topChanges = packet.changeFeed
    .filter((c) => c.importance === "high")
    .slice(0, 3);
  if (topChanges.length > 0) {
    lines.push("HIGH-PRIORITY CHANGES:");
    for (const change of topChanges) {
      lines.push(`  - ${change.summary}`);
    }
    lines.push("");
  }

  lines.push("END BRIEF");

  return lines.join("\n");
}
