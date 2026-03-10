/**
 * Oracle Types — Solo Leveling-style career progression system
 *
 * Gamified psychological reframing for career advancement:
 * - Player Status (class, level, debuffs)
 * - Quest Log (main/daily/side quests)
 * - Inventory (drop requirements for class evolution)
 * - Trajectory Telemetry (EXP from actions)
 */

// ─── Player Status ────────────────────────────────────────────────────────────

export type PlayerClass =
  | "contract_executioner"
  | "junior_developer"
  | "mid_level_engineer"
  | "senior_engineer"
  | "tech_lead"
  | "staff_engineer"
  | "principal_engineer"
  | "platform_architect"
  | "ai_implementation_lead"
  | "engineering_manager"
  | "director_of_engineering";

export interface Debuff {
  id: string;
  name: string;
  description: string;
  effects: string[];
  isPsychological: boolean;
  canBeDispelled: boolean;
  dispelCondition?: string;
  appliedAt: string; // ISO timestamp
}

export interface PlayerStatus {
  playerId: string;
  displayName: string;
  currentClass: PlayerClass;
  targetClass: PlayerClass;
  level: number;
  currentExp: number;
  expToNextLevel: number;
  activeDebuffs: Debuff[];
  historicalClearTime?: string; // e.g., "8-12 weeks"
  createdAt: string;
  updatedAt: string;
}

// ─── Quest System ─────────────────────────────────────────────────────────────

export type QuestType = "main_scenario" | "daily" | "side" | "weekly" | "achievement";
export type QuestStatus = "locked" | "available" | "in_progress" | "completed" | "failed" | "expired";

export interface QuestReward {
  exp: number;
  visibility?: number;
  skillUnlock?: string;
  itemUnlock?: string;
  debuffDispel?: string;
  badgeId?: string;
}

export interface Quest {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  objective: string;
  activeForm?: string; // Present tense for UI (e.g., "Drafting POC...")
  status: QuestStatus;
  reward: QuestReward;
  triggerCondition?: string;
  timeWindow?: string;
  deadline?: string; // ISO timestamp
  streakDay?: number;
  streakBonus?: QuestReward;
  unlocksQuests?: string[]; // Quest IDs
  requiredQuests?: string[]; // Quest IDs (dependencies)
  evidence?: QuestEvidence[]; // Proof of completion
  createdAt: string;
  completedAt?: string;
}

export interface QuestEvidence {
  type: "commit" | "document" | "conversation" | "standup" | "artifact" | "external_link";
  title: string;
  url?: string;
  timestamp: string;
  description?: string;
}

// ─── Inventory & Drop Requirements ────────────────────────────────────────────

export type ItemStatus = "not_acquired" | "in_progress" | "acquired";

export interface DropRequirement {
  id: string;
  name: string;
  description: string;
  category: "paper_trail" | "working_prototype" | "institutional_memory" | "network" | "skill";
  status: ItemStatus;
  evidence?: QuestEvidence[];
  options?: string[]; // Alternative ways to fulfill this requirement
  acquiredAt?: string;
}

export interface Inventory {
  playerId: string;
  dropRequirements: DropRequirement[];
  completedItems: number;
  totalItems: number;
  readyForClassEvolution: boolean;
}

// ─── Temporal Signals (Game Theory) ───────────────────────────────────────────

export type SignalType = "budget_drop" | "vendor_panic" | "integration_bottleneck" | "hiring_surge" | "funding_round" | "leadership_change" | "competitor_move";

export interface TemporalSignal {
  id: string;
  type: SignalType;
  title: string;
  description: string;
  detectedAt: string;
  source: string;
  confidence: number; // 0-100
  actionWindow: string; // e.g., "4-8 weeks"
  relevantToClass: PlayerClass[];
  suggestedAction?: string;
  expiresAt?: string;
}

export interface SignalTracker {
  playerId: string;
  activeSignals: TemporalSignal[];
  signalThreshold: number; // How many signals needed to trigger "window open"
  windowOpen: boolean;
  windowMessage?: string;
}

// ─── Trajectory Telemetry ─────────────────────────────────────────────────────

export type TelemetryEventType =
  | "daily_standup"
  | "commit"
  | "pull_request"
  | "code_review"
  | "document_created"
  | "conversation"
  | "presentation"
  | "architecture_decision"
  | "poc_deployed"
  | "budget_discussion"
  | "custom";

export interface TelemetrySignals {
  mentionedMetrics: boolean;
  mentionedBusinessImpact: boolean;
  mentionedOwnership: boolean;
  demonstratedInitiative: boolean;
  crossFunctionalCollaboration: boolean;
}

export interface TrajectoryEvent {
  id: string;
  playerId: string;
  eventType: TelemetryEventType;
  timestamp: string;
  content: string;
  signals: TelemetrySignals;
  expEarned: number;
  streakDay?: number;
  cumulativeExp: number;
  metadata?: Record<string, unknown>;
}

export interface TrajectoryStats {
  playerId: string;
  totalExp: number;
  eventsToday: number;
  currentStreak: number;
  longestStreak: number;
  lastEventAt?: string;
  expByEventType: Record<TelemetryEventType, number>;
  expBySignal: Record<keyof TelemetrySignals, number>;
  weeklyTrend: number[]; // Last 7 days EXP
}

// ─── Oracle One-Pager Output ──────────────────────────────────────────────────

export interface OracleOnePager {
  playerId: string;
  generatedAt: string;
  playerStatus: PlayerStatus;
  activeQuests: Quest[];
  inventory: Inventory;
  signalTracker: SignalTracker;
  trajectoryStats: TrajectoryStats;
  thompsonAnalysis: {
    plainEnglishSummary: string;
    difficultyAcknowledgment: string;
    nextStepAnalogy: string;
    confidenceMessage: string;
  };
}

// ─── EXP Calculation Rules ────────────────────────────────────────────────────

export const EXP_RULES = {
  // Base EXP per event type
  base: {
    daily_standup: 50,
    commit: 25,
    pull_request: 100,
    code_review: 75,
    document_created: 150,
    conversation: 30,
    presentation: 200,
    architecture_decision: 300,
    poc_deployed: 500,
    budget_discussion: 250,
    custom: 50,
  },
  // Signal multipliers
  signalMultipliers: {
    mentionedMetrics: 1.2,
    mentionedBusinessImpact: 1.3,
    mentionedOwnership: 1.25,
    demonstratedInitiative: 1.4,
    crossFunctionalCollaboration: 1.35,
  },
  // Streak bonuses
  streakBonuses: {
    3: 1.1,   // 3-day streak: +10%
    5: 1.2,   // 5-day streak: +20%
    7: 1.3,   // 7-day streak: +30%
    14: 1.5,  // 14-day streak: +50%
    30: 2.0,  // 30-day streak: +100%
  },
  // Class evolution thresholds
  classEvolutionExp: {
    contract_executioner: 0,
    junior_developer: 5000,
    mid_level_engineer: 15000,
    senior_engineer: 40000,
    tech_lead: 80000,
    staff_engineer: 150000,
    principal_engineer: 300000,
    platform_architect: 500000,
    ai_implementation_lead: 450000,
    engineering_manager: 200000,
    director_of_engineering: 600000,
  },
} as const;

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function calculateExp(
  eventType: TelemetryEventType,
  signals: TelemetrySignals,
  streakDay: number
): number {
  let exp = EXP_RULES.base[eventType];

  // Apply signal multipliers
  for (const [signal, active] of Object.entries(signals)) {
    if (active && signal in EXP_RULES.signalMultipliers) {
      exp *= EXP_RULES.signalMultipliers[signal as keyof typeof EXP_RULES.signalMultipliers];
    }
  }

  // Apply streak bonus
  const streakTiers = Object.entries(EXP_RULES.streakBonuses)
    .map(([days, mult]) => ({ days: parseInt(days), mult }))
    .sort((a, b) => b.days - a.days);

  for (const tier of streakTiers) {
    if (streakDay >= tier.days) {
      exp *= tier.mult;
      break;
    }
  }

  return Math.round(exp);
}

export function getClassDisplayName(playerClass: PlayerClass): string {
  const displayNames: Record<PlayerClass, string> = {
    contract_executioner: "Contract Executioner",
    junior_developer: "Junior Developer",
    mid_level_engineer: "Mid-Level Engineer",
    senior_engineer: "Senior Engineer",
    tech_lead: "Tech Lead",
    staff_engineer: "Staff Engineer",
    principal_engineer: "Principal Engineer",
    platform_architect: "Platform Architect",
    ai_implementation_lead: "AI Implementation Lead",
    engineering_manager: "Engineering Manager",
    director_of_engineering: "Director of Engineering",
  };
  return displayNames[playerClass];
}

export function getQuestTypeEmoji(questType: QuestType): string {
  const emojis: Record<QuestType, string> = {
    main_scenario: "🎯",
    daily: "📋",
    side: "🗺️",
    weekly: "📅",
    achievement: "🏆",
  };
  return emojis[questType];
}

export function getSignalTypeEmoji(signalType: SignalType): string {
  const emojis: Record<SignalType, string> = {
    budget_drop: "💰",
    vendor_panic: "⚠️",
    integration_bottleneck: "🔗",
    hiring_surge: "👥",
    funding_round: "📈",
    leadership_change: "🔄",
    competitor_move: "⚔️",
  };
  return emojis[signalType];
}
