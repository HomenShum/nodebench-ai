/**
 * useOracleData — Connects Oracle UI to Convex gamification backend.
 *
 * Fetches player profile, quests, EXP history, and temporal opportunities
 * from the oracle Convex domain. Falls back to demo data when no profile exists
 * (first-time users get seeded automatically).
 */

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type {
  PlayerStatus,
  Quest,
  Inventory,
  SignalTracker,
  TrajectoryStats,
} from "../types";

const ORACLE_LIVE_DATA_ENABLED = import.meta.env.VITE_ENABLE_ORACLE_LIVE_DATA === "1";

// Map from Convex oracle data → frontend Oracle types
function mapPlayerProfile(profile: NonNullable<ReturnType<typeof useConvexProfile>>): PlayerStatus {
  return {
    playerId: profile.userId,
    displayName: profile.userId, // In production, fetch from users table
    currentClass: profile.playerClass,
    targetClass: profile.targetClass ?? "system_architect",
    level: profile.level,
    currentExp: profile.totalExp % (profile.level * 1000), // EXP within current level
    expToNextLevel: profile.level * 1000,
    activeDebuffs: (profile.debuffs ?? []).map((d, i) => ({
      id: `debuff-${i}`,
      name: d.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Active debuff: ${d.type}`,
      effects: [],
      isPsychological: ["imposter_syndrome", "analysis_paralysis", "scope_creep"].includes(d.type),
      canBeDispelled: true,
      dispelCondition: "Complete the recommended actions to remove this debuff.",
      appliedAt: new Date(d.acquiredAt).toISOString(),
    })),
    historicalClearTime: "4-8 weeks",
    createdAt: new Date(profile.joinedAt).toISOString(),
    updatedAt: new Date(profile.lastActivityAt).toISOString(),
  };
}

function mapQuests(quests: NonNullable<ReturnType<typeof useConvexQuests>>): Quest[] {
  return quests.map((q) => ({
    id: q._id,
    type: q.questType,
    title: q.title,
    description: q.description,
    objective: (q.objectives ?? []).map((o) => o.label).join("; ") || q.description,
    status: q.status,
    reward: { exp: q.expReward },
    timeWindow: q.deadline ? `Due ${new Date(q.deadline).toLocaleDateString()}` : undefined,
    createdAt: new Date(q._creationTime).toISOString(),
  }));
}

function mapInventory(profile: NonNullable<ReturnType<typeof useConvexProfile>>): Inventory {
  const items = profile.inventory ?? [];
  const completed = items.filter((i) => i.status === "acquired").length;
  return {
    playerId: profile.userId,
    dropRequirements: items.map((item, i) => ({
      id: `item-${i}`,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      status: item.status === "acquired" ? "acquired" : "not_acquired",
    })),
    completedItems: completed,
    totalItems: items.length,
    readyForClassEvolution: completed >= Math.ceil(items.length * 0.8),
  };
}

function mapTrajectoryStats(
  expSummary: NonNullable<ReturnType<typeof useConvexExpSummary>>,
  streak: NonNullable<ReturnType<typeof useConvexStreak>>,
): TrajectoryStats {
  return {
    playerId: "current",
    totalExp: expSummary.totalExp,
    eventsToday: expSummary.todayCount,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastEventAt: streak.lastActivityAt ? new Date(streak.lastActivityAt).toISOString() : new Date().toISOString(),
    expByEventType: expSummary.byEventType ?? {},
    expBySignal: {},
    weeklyTrend: expSummary.weeklyTrend ?? [0, 0, 0, 0, 0, 0, 0],
  };
}

// Type helpers for Convex query returns
function useConvexProfile() {
  return useQuery(
    api.domains.oracle.queries.getPlayerProfile,
    ORACLE_LIVE_DATA_ENABLED ? { userId: "current" } : "skip",
  );
}
function useConvexQuests() {
  return useQuery(
    api.domains.oracle.queries.getActiveQuests,
    ORACLE_LIVE_DATA_ENABLED ? { userId: "current" } : "skip",
  );
}
function useConvexExpSummary() {
  return useQuery(
    api.domains.oracle.queries.getExpSummary,
    ORACLE_LIVE_DATA_ENABLED ? { userId: "current" } : "skip",
  );
}
function useConvexStreak() {
  return useQuery(
    api.domains.oracle.queries.getStreakStatus,
    ORACLE_LIVE_DATA_ENABLED ? { userId: "current" } : "skip",
  );
}
function useConvexOpportunities() {
  return useQuery(
    api.domains.oracle.queries.getOpenOpportunities,
    ORACLE_LIVE_DATA_ENABLED ? { userId: "current" } : "skip",
  );
}

export interface OracleData {
  playerStatus: PlayerStatus;
  quests: Quest[];
  inventory: Inventory;
  signalTracker: SignalTracker;
  trajectoryStats: TrajectoryStats;
  isLoading: boolean;
  isDemo: boolean;
}

// Demo fallback data (same as was hardcoded in OracleView)
const DEMO_PLAYER: PlayerStatus = {
  playerId: "builder-001",
  displayName: "Builder",
  currentClass: "contract_executioner",
  targetClass: "ai_implementation_lead",
  level: 7,
  currentExp: 4250,
  expToNextLevel: 5000,
  activeDebuffs: [
    {
      id: "debuff-context-rot",
      name: "Context Rot",
      description: "Long-running sessions lose track of the original intent.",
      effects: ["Original goal degrades across context window compactions"],
      isPsychological: false,
      canBeDispelled: true,
      dispelCondition: "Cross-check status returns to 'aligned' for 3 consecutive loops",
      appliedAt: new Date().toISOString(),
    },
  ],
  historicalClearTime: "8-12 weeks",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: new Date().toISOString(),
};

const DEMO_QUESTS: Quest[] = [
  {
    id: "quest-close-loop",
    type: "main_scenario",
    title: "Close the Current Loop",
    description: "Every non-trivial slice must end with evidence: typecheck/build/test, dogfood status, and updated state.",
    objective: "Complete the current implementation slice with passing build, dogfood screenshot, and updated ORACLE_STATE.md.",
    status: "in_progress",
    reward: { exp: 500 },
    timeWindow: "This session",
    createdAt: new Date().toISOString(),
  },
  {
    id: "quest-daily-cross-check",
    type: "daily",
    title: "Cross-Check Against Vision",
    description: "Read ORACLE_VISION.md and ORACLE_STATE.md. Confirm current work aligns with the original intent.",
    objective: "Output a brief execution plan for the current step.",
    status: "available",
    reward: { exp: 50 },
    streakDay: 1,
    createdAt: new Date().toISOString(),
  },
];

const DEMO_INVENTORY: Inventory = {
  playerId: "builder-001",
  dropRequirements: [
    { id: "item-vision-snapshot", name: "Vision Snapshot", description: "Every task stores a visionSnapshot.", category: "paper_trail", status: "in_progress" },
    { id: "item-trace-timeline", name: "Trace Timeline", description: "Tool sequence, latency, token burn recorded.", category: "working_prototype", status: "not_acquired" },
    { id: "item-dogfood-run", name: "Dogfood Run Linked", description: "A passing dogfood QA run is attached.", category: "institutional_memory", status: "not_acquired" },
  ],
  completedItems: 0,
  totalItems: 3,
  readyForClassEvolution: false,
};

const DEMO_SIGNALS: SignalTracker = {
  playerId: "builder-001",
  activeSignals: [],
  signalThreshold: 2,
  windowOpen: false,
};

const DEMO_STATS: TrajectoryStats = {
  playerId: "builder-001",
  totalExp: 4250,
  eventsToday: 2,
  currentStreak: 3,
  longestStreak: 5,
  lastEventAt: new Date().toISOString(),
  expByEventType: {
    daily_standup: 150, commit: 875, pull_request: 1200, code_review: 525,
    document_created: 300, architecture_decision: 600,
  },
  expBySignal: { demonstratedInitiative: 1100, mentionedBusinessImpact: 920 },
  weeklyTrend: [180, 250, 320, 0, 450, 380, 420],
};

/**
 * Main hook: returns Oracle data from Convex backend,
 * falling back to demo data when no profile exists.
 */
export function useOracleData(): OracleData {
  const profile = useConvexProfile();
  const quests = useConvexQuests();
  const expSummary = useConvexExpSummary();
  const streak = useConvexStreak();
  const opportunities = useConvexOpportunities();

  if (!ORACLE_LIVE_DATA_ENABLED) {
    return {
      playerStatus: DEMO_PLAYER,
      quests: DEMO_QUESTS,
      inventory: DEMO_INVENTORY,
      signalTracker: DEMO_SIGNALS,
      trajectoryStats: DEMO_STATS,
      isLoading: false,
      isDemo: true,
    };
  }

  // Loading state
  const isLoading = profile === undefined || quests === undefined;

  // No profile yet → demo mode
  if (!profile || profile === null) {
    return {
      playerStatus: DEMO_PLAYER,
      quests: DEMO_QUESTS,
      inventory: DEMO_INVENTORY,
      signalTracker: DEMO_SIGNALS,
      trajectoryStats: DEMO_STATS,
      isLoading: false,
      isDemo: true,
    };
  }

  // Map Convex data to Oracle types
  const playerStatus = mapPlayerProfile(profile);
  const mappedQuests = quests ? mapQuests(quests) : DEMO_QUESTS;
  const inventory = mapInventory(profile);
  const trajectoryStats = expSummary && streak
    ? mapTrajectoryStats(expSummary, streak)
    : DEMO_STATS;

  const signalTracker: SignalTracker = {
    playerId: profile.userId,
    activeSignals: (opportunities ?? []).map((opp) => ({
      type: opp.signalType,
      title: opp.title,
      description: opp.description,
      windowStartAt: new Date(opp.windowStartAt).toISOString(),
      windowEndAt: new Date(opp.windowEndAt).toISOString(),
      confidence: opp.confidence,
      status: opp.status,
    })),
    signalThreshold: 2,
    windowOpen: (opportunities ?? []).some((o) => o.status === "open"),
  };

  return {
    playerStatus,
    quests: mappedQuests,
    inventory,
    signalTracker,
    trajectoryStats,
    isLoading,
    isDemo: false,
  };
}
