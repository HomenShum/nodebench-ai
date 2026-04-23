import { ANGLE_REGISTRY, type AngleId } from "../convex/domains/research/angleRegistry";

export type UltraLongChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
};

export type UltraLongChatHotWindowEntry = {
  role: UltraLongChatMessage["role"];
  content: string;
};

export type UltraLongChatAngleCapsule = {
  angleId: AngleId;
  displayName: string;
  summary: string;
  sourceLabels: string[];
};

export type UltraLongChatJitSlice = {
  label: string;
  summary: string;
  source: "entity_cache" | "pulse" | "daily_brief" | "user_context" | "known_state";
  angleIds: AngleId[];
};

export type UltraLongChatWorkingSet = {
  compactionMode: "deterministic_compaction_first";
  summary: string;
  priorityLedger: string[];
  activeAngles: AngleId[];
  angleCapsules: UltraLongChatAngleCapsule[];
  jitSlices: UltraLongChatJitSlice[];
  hotWindow: UltraLongChatHotWindowEntry[];
  contextRotRisk: "low" | "medium" | "high";
  messagesCompacted: number;
  builtAt: number;
};

export type EntityFastLaneCache = {
  entity?: {
    slug?: string;
    name?: string;
    entityType?: string;
    summary?: string | null;
    updatedAt?: number;
  } | null;
  acceptedBlocks?: Array<{
    kind?: string;
    authorKind?: string;
    text?: string;
    updatedAt?: number;
  }>;
  latestProjections?: Array<{
    blockType?: string;
    title?: string;
    summary?: string;
    overallTier?: string | null;
    updatedAt?: number;
  }>;
  latestPulse?: {
    summary?: string | null;
    body?: string | null;
    updatedAt?: number;
    [key: string]: unknown;
  } | null;
  memory?: {
    indexJson?: string;
    topicCount?: number;
    totalFactCount?: number;
    lastRebuildAt?: number;
  } | null;
  latestRun?: {
    goal?: string;
    status?: string;
    startedAt?: number;
  } | null;
} | null;

export type BuildUltraLongChatWorkingSetArgs = {
  prompt: string;
  messages: UltraLongChatMessage[];
  previousWorkingSet?: UltraLongChatWorkingSet | null;
  entitySlug?: string | null;
  entityFastLaneCache?: EntityFastLaneCache;
  knownEntityStateMarkdown?: string | null;
  userContext?: string | null;
  dailyBrief?: string | null;
  maxHotWindowMessages?: number;
};

const DEFAULT_HOT_WINDOW = 8;
const MAX_ANGLE_CAPSULES = 3;
const MAX_PRIORITY_ITEMS = 4;
const MAX_JIT_SLICES = 3;
const MAX_CAPSULE_SOURCE_LABELS = 2;

const ANGLE_KEYWORDS: Record<AngleId, string[]> = {
  entity_profile: [
    "company",
    "profile",
    "overview",
    "what is",
    "basics",
    "background",
  ],
  public_signals: [
    "latest",
    "today",
    "news",
    "pulse",
    "signals",
    "what changed",
  ],
  funding_intelligence: [
    "funding",
    "raised",
    "round",
    "valuation",
    "investor",
    "series",
    "venture",
  ],
  financial_health: [
    "revenue",
    "finance",
    "financial",
    "profit",
    "burn",
    "runway",
    "equity",
    "salary",
    "negotiate",
    "offer",
  ],
  narrative_tracking: [
    "narrative",
    "story",
    "positioning",
    "pivot",
    "messaging",
    "why it matters",
  ],
  document_discovery: [
    "document",
    "pdf",
    "memo",
    "report",
    "filing",
    "10-k",
    "10-q",
    "deck",
  ],
  competitive_intelligence: [
    "compare",
    "versus",
    "vs",
    "competitor",
    "competitive",
    "alternatives",
    "adyen",
    "square",
  ],
  people_graph: [
    "founder",
    "ceo",
    "cfo",
    "people",
    "team",
    "interviewer",
    "hiring manager",
    "final round",
  ],
  market_dynamics: [
    "market",
    "industry",
    "category",
    "trend",
    "benchmark",
    "comp",
    "negotiate",
  ],
  regulatory_monitoring: [
    "regulation",
    "sec",
    "fda",
    "compliance",
    "legal",
    "policy",
  ],
  patent_intelligence: ["patent", "ip", "intellectual property"],
  academic_research: ["paper", "arxiv", "academic", "citation", "research"],
  github_ecosystem: ["github", "repository", "repo", "open source", "oss"],
  executive_brief: ["brief", "summary", "executive", "board"],
  world_monitor: ["world", "macro", "geopolitics", "global", "monitor"],
  daily_brief: ["daily brief", "brief", "today", "digest"],
  deep_research: ["deep research", "full research", "deep dive", "background"],
};

const ANGLE_PRIORITY: AngleId[] = [
  "entity_profile",
  "public_signals",
  "narrative_tracking",
  "competitive_intelligence",
  "financial_health",
  "funding_intelligence",
  "people_graph",
  "market_dynamics",
  "document_discovery",
  "regulatory_monitoring",
  "executive_brief",
  "daily_brief",
  "deep_research",
  "github_ecosystem",
  "academic_research",
  "patent_intelligence",
  "world_monitor",
];

function clip(value: string | null | undefined, max = 220): string {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function containsComparablePhrase(text: string, keyword: string): boolean {
  const haystack = ` ${normalizeComparable(text)} `;
  const needle = ` ${normalizeComparable(keyword)} `;
  return haystack.includes(needle);
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function priorityWeight(line: string): number {
  let score = 0;
  if (/\b(priority|priorities|what matters|care about|important)\b/i.test(line)) score += 5;
  if (/\b(equity|ramp|upside|long term|long-term|base|compensation|offer|negotiate)\b/i.test(line)) score += 4;
  if (/\b(today's tasks|today's calendar|tracked topics|deadline)\b/i.test(line)) score += 1;
  return score;
}

function inferPromptAngles(
  prompt: string,
  previousAngles: AngleId[],
  entitySlug?: string | null,
): AngleId[] {
  const normalized = normalizeComparable(prompt);
  const angles = new Set<AngleId>();
  const continuationHint = /\b(remind|recap|continue|follow up|pick up|what did we learn)\b/i.test(prompt);

  if (continuationHint) {
    previousAngles.forEach((angleId) => angles.add(angleId));
  }

  for (const angleId of ANGLE_PRIORITY) {
    const keywords = ANGLE_KEYWORDS[angleId];
    if (keywords.some((keyword) => containsComparablePhrase(normalized, keyword))) {
      angles.add(angleId);
    }
  }

  const needsFreshSignals = /\b(today|latest|this week|what changed|news|update)\b/i.test(prompt);
  const candidateSignal = /\b(interview|interviewing|candidate|next week)\b/i.test(prompt);
  const needsComparison = /\b(compare|vs|versus|competitor)\b/i.test(prompt);
  const interviewSignal = /\b(interview|interviewing|hiring manager)\b/i.test(prompt);
  const negotiationSignal = /\b(final round|offer|negotiate|compensation|equity|cfo)\b/i.test(prompt);
  const narrativeSignal = /\b(cfo|final round|strategy|narrative|positioning|messaging)\b/i.test(prompt);
  const briefSignal = /\bbrief|digest\b/i.test(prompt);

  if (needsFreshSignals || candidateSignal) {
    angles.add("public_signals");
  }
  if (needsComparison) {
    angles.add("competitive_intelligence");
    angles.add("market_dynamics");
  }
  if (interviewSignal || negotiationSignal) {
    angles.add("people_graph");
  }
  if (negotiationSignal) {
    angles.add("financial_health");
    angles.add("market_dynamics");
  }
  if (narrativeSignal) {
    angles.add("narrative_tracking");
  }
  if (briefSignal) {
    angles.add("daily_brief");
  }
  if (angles.size === 0 || entitySlug) {
    angles.add("entity_profile");
  }

  const prioritized = ANGLE_PRIORITY.filter((angleId) => angles.has(angleId));
  const mandatoryAngles = dedupe([
    ...(needsFreshSignals || candidateSignal ? (["public_signals"] as AngleId[]) : []),
    ...(interviewSignal || negotiationSignal ? (["people_graph"] as AngleId[]) : []),
    ...(negotiationSignal ? (["financial_health"] as AngleId[]) : []),
    ...(narrativeSignal ? (["narrative_tracking"] as AngleId[]) : []),
    ...(needsComparison || negotiationSignal ? (["market_dynamics"] as AngleId[]) : []),
    ...(briefSignal ? (["daily_brief"] as AngleId[]) : []),
  ]);
  const includeEntityProfile =
    prioritized.includes("entity_profile") &&
    (mandatoryAngles.length < MAX_ANGLE_CAPSULES || mandatoryAngles.length === 0);

  return dedupe([
    ...(includeEntityProfile ? (["entity_profile"] as AngleId[]) : []),
    ...mandatoryAngles,
    ...prioritized,
  ]).slice(0, MAX_ANGLE_CAPSULES);
}

function extractPriorityLedger(
  messages: UltraLongChatMessage[],
  previousLedger: string[],
  userContext?: string | null,
): string[] {
  const ledger: string[] = [...previousLedger];
  const candidates = messages
    .filter((message) => message.role === "user")
    .slice(-18)
    .reverse();

  for (const message of candidates) {
    const sentences = message.content
      .split(/(?<=[.!?])\s+/g)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    for (const sentence of sentences) {
      if (
        /\b(i need|i want|i care|i'm trying|i am trying|important|priority|interview|offer|negotiate|help me|remind me)\b/i.test(
          sentence,
        )
      ) {
        ledger.unshift(clip(sentence, 140));
      }
    }
  }

  const contextLines = String(userContext ?? "")
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => /\b(today's tasks|today's calendar|tracked topics|priorit|deadline)\b/i.test(line));

  for (const line of contextLines.slice(0, 2)) {
    ledger.push(clip(line, 140));
  }

  return dedupe(ledger)
    .sort((left, right) => priorityWeight(right) - priorityWeight(left))
    .slice(0, MAX_PRIORITY_ITEMS);
}

type SnippetCandidate = {
  label: string;
  text: string;
  angleTags: AngleId[];
};

function buildSnippetCandidates(args: {
  cache?: EntityFastLaneCache;
  knownEntityStateMarkdown?: string | null;
  userContext?: string | null;
  dailyBrief?: string | null;
}): SnippetCandidate[] {
  const candidates: SnippetCandidate[] = [];
  const cache = args.cache;

  if (cache?.entity) {
    candidates.push({
      label: "entity",
      text: clip(
        [cache.entity.name, cache.entity.summary, cache.entity.entityType]
          .filter(Boolean)
          .join(" | "),
        280,
      ),
      angleTags: ["entity_profile"],
    });
  }

  for (const block of cache?.acceptedBlocks ?? []) {
    const text = clip(block.text, 220);
    if (!text) continue;
    candidates.push({
      label: `block:${block.kind ?? "note"}`,
      text,
      angleTags: inferSnippetAngles(text),
    });
  }

  for (const projection of cache?.latestProjections ?? []) {
    const text = clip(
      [projection.blockType, projection.title, projection.summary, projection.overallTier]
        .filter(Boolean)
        .join(" | "),
      260,
    );
    if (!text) continue;
    candidates.push({
      label: `projection:${projection.blockType ?? "projection"}`,
      text,
      angleTags: inferSnippetAngles(text),
    });
  }

  if (cache?.latestPulse) {
    const text = clip(
      [cache.latestPulse.summary, cache.latestPulse.body].filter(Boolean).join(" | "),
      260,
    );
    if (text) {
      candidates.push({
        label: "pulse",
        text,
        angleTags: ["public_signals", "narrative_tracking", "daily_brief"],
      });
    }
  }

  if (cache?.memory?.indexJson) {
    candidates.push({
      label: "memory",
      text: clip(cache.memory.indexJson, 240),
      angleTags: ["entity_profile", "narrative_tracking"],
    });
  }

  if (args.knownEntityStateMarkdown) {
    candidates.push({
      label: "known_state",
      text: clip(args.knownEntityStateMarkdown, 260),
      angleTags: ["entity_profile", "narrative_tracking"],
    });
  }

  if (args.dailyBrief) {
    candidates.push({
      label: "daily_brief",
      text: clip(args.dailyBrief, 260),
      angleTags: ["daily_brief", "public_signals", "world_monitor"],
    });
  }

  if (args.userContext) {
    candidates.push({
      label: "user_context",
      text: clip(args.userContext, 260),
      angleTags: ["entity_profile", "daily_brief"],
    });
  }

  return candidates.filter((candidate) => candidate.text);
}

function inferSnippetAngles(text: string): AngleId[] {
  const normalized = normalizeComparable(text);
  const matches = ANGLE_PRIORITY.filter((angleId) =>
    ANGLE_KEYWORDS[angleId].some((keyword) => containsComparablePhrase(normalized, keyword)),
  );
  return matches.length > 0 ? matches.slice(0, 3) : ["entity_profile"];
}

function scoreSnippetForAngle(candidate: SnippetCandidate, angleId: AngleId): number {
  let score = candidate.angleTags.includes(angleId) ? 4 : 0;
  const text = normalizeComparable(candidate.text);
  for (const keyword of ANGLE_KEYWORDS[angleId]) {
    if (containsComparablePhrase(text, keyword)) score += 2;
  }
  return score;
}

function buildAngleCapsules(
  activeAngles: AngleId[],
  candidates: SnippetCandidate[],
  previousCapsules: UltraLongChatAngleCapsule[],
): UltraLongChatAngleCapsule[] {
  const capsules: UltraLongChatAngleCapsule[] = [];

  for (const angleId of activeAngles) {
    const ranked = candidates
      .map((candidate) => ({
        candidate,
        score: scoreSnippetForAngle(candidate, angleId),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_CAPSULE_SOURCE_LABELS);

    if (ranked.length === 0) {
      const previous = previousCapsules.find((capsule) => capsule.angleId === angleId);
      if (previous) capsules.push(previous);
      continue;
    }

    capsules.push({
      angleId,
      displayName: ANGLE_REGISTRY[angleId]?.displayName ?? angleId,
      summary: clip(ranked.map((entry) => entry.candidate.text).join(" | "), 260),
      sourceLabels: ranked.map((entry) => entry.candidate.label).slice(0, MAX_CAPSULE_SOURCE_LABELS),
    });
  }

  return capsules;
}

function buildJitSlices(args: {
  activeAngles: AngleId[];
  cache?: EntityFastLaneCache;
  userContext?: string | null;
  dailyBrief?: string | null;
  knownEntityStateMarkdown?: string | null;
}): UltraLongChatJitSlice[] {
  const slices: UltraLongChatJitSlice[] = [];

  const pushSlice = (slice: UltraLongChatJitSlice | null) => {
    if (!slice || !slice.summary) return;
    if (slices.some((existing) => existing.label === slice.label)) return;
    slices.push(slice);
  };

  if (args.knownEntityStateMarkdown && args.activeAngles.includes("entity_profile")) {
    pushSlice({
      label: "known_entity_state",
      summary: clip(args.knownEntityStateMarkdown, 220),
      source: "known_state",
      angleIds: ["entity_profile", "narrative_tracking"],
    });
  }

  if (
    args.cache?.latestPulse &&
    args.activeAngles.some((angleId) =>
      ["public_signals", "narrative_tracking", "funding_intelligence", "financial_health"].includes(angleId),
    )
  ) {
    pushSlice({
      label: "latest_pulse",
      summary: clip(
        [args.cache.latestPulse.summary, args.cache.latestPulse.body].filter(Boolean).join(" | "),
        220,
      ),
      source: "pulse",
      angleIds: ["public_signals", "narrative_tracking"],
    });
  }

  if (
    args.dailyBrief &&
    args.activeAngles.some((angleId) =>
      ["daily_brief", "public_signals", "world_monitor"].includes(angleId),
    )
  ) {
    pushSlice({
      label: "daily_brief",
      summary: clip(args.dailyBrief, 220),
      source: "daily_brief",
      angleIds: ["daily_brief", "public_signals", "world_monitor"],
    });
  }

  if (args.userContext) {
    pushSlice({
      label: "user_context",
      summary: clip(args.userContext, 220),
      source: "user_context",
      angleIds: ["entity_profile", "daily_brief"],
    });
  }

  if (args.cache?.memory?.indexJson && args.activeAngles.includes("entity_profile")) {
    pushSlice({
      label: "entity_memory_index",
      summary: clip(args.cache.memory.indexJson, 220),
      source: "entity_cache",
      angleIds: ["entity_profile", "narrative_tracking"],
    });
  }

  return slices.slice(0, MAX_JIT_SLICES);
}

function buildHotWindow(
  messages: UltraLongChatMessage[],
  maxHotWindowMessages: number,
): UltraLongChatHotWindowEntry[] {
  return messages
    .slice(-maxHotWindowMessages)
    .map((message) => ({
      role: message.role,
      content: clip(message.content, 180),
    }));
}

function computeContextRotRisk(args: {
  totalMessages: number;
  messagesCompacted: number;
  activeAngles: AngleId[];
  previousWorkingSet?: UltraLongChatWorkingSet | null;
}): UltraLongChatWorkingSet["contextRotRisk"] {
  if (
    args.totalMessages >= 80 &&
    (!args.previousWorkingSet?.summary || args.activeAngles.length >= 4)
  ) {
    return "high";
  }
  if (args.messagesCompacted >= 12 || args.totalMessages >= 40 || args.activeAngles.length >= 3) {
    return "medium";
  }
  return "low";
}

function buildSummary(args: {
  prompt: string;
  priorityLedger: string[];
  activeAngles: AngleId[];
  previousWorkingSet?: UltraLongChatWorkingSet | null;
  entityCache?: EntityFastLaneCache;
  jitSlices: UltraLongChatJitSlice[];
  messagesCompacted: number;
}): string {
  const summaryParts: string[] = [];
  const entityName = args.entityCache?.entity?.name;

  summaryParts.push(
    entityName
      ? `The session is anchored on ${entityName} and should answer the latest ask without reloading the whole artifact stack.`
      : "The session should answer the latest ask without replaying the whole thread.",
  );

  if (args.priorityLedger.length > 0) {
    summaryParts.push(`What matters to the user right now: ${args.priorityLedger.slice(0, 3).join(" | ")}.`);
  }

  if (args.activeAngles.length > 0) {
    summaryParts.push(
      `Active angles for this turn: ${args.activeAngles
        .map((angleId) => ANGLE_REGISTRY[angleId]?.displayName ?? angleId)
        .join(", ")}.`,
    );
  }

  if (args.jitSlices.length > 0) {
    summaryParts.push(
      `Only hydrate these supporting slices now: ${args.jitSlices.map((slice) => slice.label).join(", ")}.`,
    );
  }

  if (args.messagesCompacted > 0) {
    summaryParts.push(
      `Older turns have already been compacted into this working set (${args.messagesCompacted} messages compressed).`,
    );
  }

  if (args.previousWorkingSet?.summary) {
    summaryParts.push(`Prior continuity anchor: ${clip(args.previousWorkingSet.summary, 180)}.`);
  }

  return clip(summaryParts.join(" "), 420);
}

export function shouldLoadUserContextForWorkingSet(
  prompt: string,
  _previousWorkingSet?: UltraLongChatWorkingSet | null,
): boolean {
  if (!prompt.trim()) return false;
  if (/\b(my|priority|priorities|schedule|calendar|task|offer|negotiate|what matters)\b/i.test(prompt)) {
    return true;
  }
  return false;
}

export function shouldLoadDailyBriefForWorkingSet(
  prompt: string,
  _previousWorkingSet?: UltraLongChatWorkingSet | null,
): boolean {
  if (/\b(today|latest|recent|news|brief|digest|pulse|what changed)\b/i.test(prompt)) {
    return true;
  }
  return false;
}

export function buildUltraLongChatWorkingSet(
  args: BuildUltraLongChatWorkingSetArgs,
): UltraLongChatWorkingSet {
  const previousWorkingSet = args.previousWorkingSet ?? null;
  const hotWindow = buildHotWindow(
    args.messages,
    Math.max(4, args.maxHotWindowMessages ?? DEFAULT_HOT_WINDOW),
  );
  const messagesCompacted = Math.max(0, args.messages.length - hotWindow.length);
  const activeAngles = inferPromptAngles(
    args.prompt,
    previousWorkingSet?.activeAngles ?? [],
    args.entitySlug,
  );
  const priorityLedger = extractPriorityLedger(
    args.messages,
    previousWorkingSet?.priorityLedger ?? [],
    args.userContext,
  );
  const candidates = buildSnippetCandidates({
    cache: args.entityFastLaneCache,
    knownEntityStateMarkdown: args.knownEntityStateMarkdown,
    userContext: args.userContext,
    dailyBrief: args.dailyBrief,
  });
  const angleCapsules = buildAngleCapsules(
    activeAngles,
    candidates,
    previousWorkingSet?.angleCapsules ?? [],
  );
  const jitSlices = buildJitSlices({
    activeAngles,
    cache: args.entityFastLaneCache,
    userContext: args.userContext,
    dailyBrief: args.dailyBrief,
    knownEntityStateMarkdown: args.knownEntityStateMarkdown,
  });
  const summary = buildSummary({
    prompt: args.prompt,
    priorityLedger,
    activeAngles,
    previousWorkingSet,
    entityCache: args.entityFastLaneCache,
    jitSlices,
    messagesCompacted,
  });
  const contextRotRisk = computeContextRotRisk({
    totalMessages: args.messages.length,
    messagesCompacted,
    activeAngles,
    previousWorkingSet,
  });

  return {
    compactionMode: "deterministic_compaction_first",
    summary,
    priorityLedger,
    activeAngles,
    angleCapsules,
    jitSlices,
    hotWindow,
    contextRotRisk,
    messagesCompacted,
    builtAt: Date.now(),
  };
}

export function renderUltraLongChatWorkingSetMarkdown(
  workingSet: UltraLongChatWorkingSet,
): string {
  const lines: string[] = [];

  lines.push("[ULTRA-LONG CHAT WORKING SET]");
  lines.push(`- compactionMode: ${workingSet.compactionMode}`);
  lines.push(`- contextRotRisk: ${workingSet.contextRotRisk}`);
  lines.push(`- messagesCompacted: ${workingSet.messagesCompacted}`);
  lines.push(`- continuitySummary: ${workingSet.summary}`);

  if (workingSet.priorityLedger.length > 0) {
    lines.push("- priorityLedger:");
    for (const item of workingSet.priorityLedger) {
      lines.push(`  - ${item}`);
    }
  }

  if (workingSet.activeAngles.length > 0) {
    lines.push(`- activeAngles: ${workingSet.activeAngles.join(", ")}`);
  }

  if (workingSet.angleCapsules.length > 0) {
    lines.push("- angleCapsules:");
    for (const capsule of workingSet.angleCapsules) {
      lines.push(
        `  - [${capsule.angleId}] ${capsule.summary}${capsule.sourceLabels.length ? ` (sources: ${capsule.sourceLabels.join(", ")})` : ""}`,
      );
    }
  }

  if (workingSet.jitSlices.length > 0) {
    lines.push("- jitRetrieval:");
    for (const slice of workingSet.jitSlices) {
      lines.push(
        `  - ${slice.label} (${slice.source}) => ${slice.summary}`,
      );
    }
  }

  if (workingSet.hotWindow.length > 0) {
    lines.push("- hotWindow:");
    for (const item of workingSet.hotWindow.slice(-4)) {
      lines.push(`  - ${item.role}: ${item.content}`);
    }
  }

  lines.push("[END ULTRA-LONG CHAT WORKING SET]");
  return lines.join("\n");
}
