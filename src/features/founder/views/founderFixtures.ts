/* ------------------------------------------------------------------ */
/*  Founder Dashboard — Live Fixtures                                  */
/*  Real data for NodeBench AI — our own product as the default entity */
/*  Companies: NodeBench, Meta/Tests Assured, JPMorgan, Stripe,       */
/*  GitHub, Salesforce, Booking.com, ServiceNow, QuickBooks            */
/* ------------------------------------------------------------------ */

export type CompanyState = "idea" | "forming" | "operating" | "pivoting";
export type FoundingMode = "start_new" | "continue_existing" | "merged";
export type InitiativeStatus = "active" | "blocked" | "paused" | "completed";
export type RiskLevel = "low" | "medium" | "high";
export type AgentType = "claude_code" | "openclaw" | "background";
export type AgentStatus = "healthy" | "blocked" | "waiting" | "drifting" | "ambiguous";
export type ChangeType = "signal" | "agent" | "initiative" | "decision";

/* ── Company Identity ─────────────────────────────────────────────── */

export const DEMO_COMPANY = {
  name: "Your Company",
  canonicalMission:
    "Search for a company or describe your own to get started",
  wedge: "Use the search bar above to analyze any company, competitor, or market",
  companyState: "idea" as CompanyState,
  foundingMode: "start_new" as FoundingMode,
  identityConfidence: 0.0,
};

/* ── What Changed ─────────────────────────────────────────────────── */

export interface ChangeEntry {
  id: string;
  timestamp: string;
  relativeTime: string;
  type: ChangeType;
  description: string;
  linkedInitiativeId?: string;
}

export const DEMO_CHANGES: ChangeEntry[] = [
  {
    id: "chg-5",
    timestamp: "2026-03-23T14:20:00Z",
    relativeTime: "yesterday",
    type: "signal",
    description:
      "Stripe published MCP integration benchmark for agent tool use — 48 tasks, deterministic graders, production-realistic environments",
    linkedInitiativeId: "init-5",
  },
  {
    id: "chg-6",
    timestamp: "2026-03-22T10:00:00Z",
    relativeTime: "2d ago",
    type: "signal",
    description:
      "GitHub Copilot extensions now support MCP protocol natively — potential distribution channel for NodeBench tools",
    linkedInitiativeId: "init-3",
  },
  {
    id: "chg-7",
    timestamp: "2026-03-22T08:00:00Z",
    relativeTime: "2d ago",
    type: "agent",
    description:
      "WebSocket MCP gateway health check passed — 0 false disconnects in 24h after idle timeout fix",
    linkedInitiativeId: "init-2",
  },
  {
    id: "chg-8",
    timestamp: "2026-03-21T16:30:00Z",
    relativeTime: "3d ago",
    type: "signal",
    description:
      "ServiceNow announced AI agent marketplace for enterprise IT workflows — validates agent-native business infrastructure category",
    linkedInitiativeId: "init-1",
  },
  {
    id: "chg-9",
    timestamp: "2026-03-21T12:00:00Z",
    relativeTime: "3d ago",
    type: "initiative",
    description:
      "Eval corpus expanded from 53 to 103 queries across 18 categories — Gemini 3.1 Flash Lite judge integration live",
    linkedInitiativeId: "init-6",
  },
  {
    id: "chg-10",
    timestamp: "2026-03-20T09:00:00Z",
    relativeTime: "4d ago",
    type: "signal",
    description:
      "Salesforce Einstein GPT now uses MCP for tool orchestration — enterprise MCP adoption accelerating faster than expected",
    linkedInitiativeId: "init-1",
  },
];

/* ── Interventions ────────────────────────────────────────────────── */

export interface Intervention {
  id: string;
  rank: number;
  title: string;
  linkedInitiative: string;
  linkedInitiativeId: string;
  priorityScore: number;
  confidence: number;
}

export const DEMO_INTERVENTIONS: Intervention[] = [];

/* ── Initiatives ──────────────────────────────────────────────────── */

export interface Initiative {
  id: string;
  title: string;
  status: InitiativeStatus;
  risk: RiskLevel;
  priorityScore: number;
  agentCount: number;
  objective: string;
}

export const DEMO_INITIATIVES: Initiative[] = [];

/* ── Agent Activity ───────────────────────────────────────────────── */

export interface AgentEntry {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  currentGoal: string;
  lastHeartbeat: string;
}

export interface NearbyEntity {
  id: string;
  name: string;
  relationship: string;
  whyItMatters: string;
  claimCount?: number;
  changeCount?: number;
  contradictionCount?: number;
  /** ISO date string for staleness tracking */
  lastUpdated?: string;
}

export const DEMO_AGENTS: AgentEntry[] = [];

export const DEMO_NEARBY_ENTITIES: NearbyEntity[] = [];

/* ── Daily Memo ───────────────────────────────────────────────────── */

export interface DailyMemo {
  date: string;
  whatMatters: string[];
  whatToDoNext: string[];
  unresolved: string[];
  generatedAt: string;
}

export const DEMO_DAILY_MEMO: DailyMemo = {
  whatMatters: ["Search for a company to populate your daily briefing"],
  whatToDoNext: ["Type a company name in the search bar above"],
  unresolved: [],
  generatedAt: "Not yet generated",
};

/* ================================================================== */
/*  External Signals — for NodeBench AI dashboard                      */
/* ================================================================== */

export type SignalCategory = "regulatory" | "market" | "competitive" | "macro" | "partner";

export interface ExternalSignal {
  id: string;
  title: string;
  summary: string;
  category: SignalCategory;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
  relativeTime: string;
  relevanceScore: number;
  affectsInitiativeId?: string;
  howItAffectsYou: string;
  isNew?: boolean;
}

export const DEMO_EXTERNAL_SIGNALS: ExternalSignal[] = [];

/* ================================================================== */
/*  Shopify — Banker / CEO Company Search Demo                         */
/* ================================================================== */

export interface CompanySnapshot {
  name: string;
  ticker?: string;
  sector: string;
  hq: string;
  founded: number;
  employees: string;
  revenueAnnual: string;
  revenueGrowthYoY: string;
  freeCashFlow: string;
  marketCap?: string;
  description: string;
  wedge: string;
  identityConfidence: number;
}

export interface BusinessQualitySignal {
  id: string;
  dimension: string;
  rating: "strong" | "improving" | "watch" | "weak";
  evidence: string;
  source: string;
  /** Optional URL for inline citation link */
  sourceUrl?: string;
}

export interface NewsSignal {
  id: string;
  headline: string;
  category: SignalCategory;
  date: string;
  source: string;
  relevance: number;
  implication: string;
  /** Optional URL for inline citation link */
  sourceUrl?: string;
}

export interface PlatformReadinessSignal {
  id: string;
  dimension: string;
  status: "leading" | "building" | "lagging";
  evidence: string;
}

export interface RegulatorySignal {
  id: string;
  title: string;
  jurisdiction: string;
  risk: RiskLevel;
  detail: string;
  timeline: string;
  /** Optional URL for inline citation link */
  sourceUrl?: string;
}

export interface ComparableCompany {
  id: string;
  name: string;
  relationship: "direct" | "adjacent" | "aspirational";
  metric: string;
  implication: string;
}

export type SearchLens = "banker" | "ceo" | "strategy" | "diligence";

export interface NextQuestion {
  id: string;
  question: string;
  lens: SearchLens;
  priority: "high" | "medium" | "low";
}

export const SHOPIFY_SNAPSHOT: CompanySnapshot = {
  name: "Example Company",
  ticker: "",
  sector: "Technology",
  hq: "",
  founded: 2020,
  employees: "",
  revenueAnnual: "",
  marketCap: "",
  description: "Search for any company to populate this view",
  wedge: "",
  identityConfidence: 0,
};

export const SHOPIFY_BUSINESS_QUALITY: BusinessQualitySignal[] = [];

export const SHOPIFY_NEWS_SIGNALS: NewsSignal[] = [];

export const SHOPIFY_PLATFORM_READINESS: PlatformReadinessSignal[] = [];

export const SHOPIFY_REGULATORY: RegulatorySignal[] = [];

export const SHOPIFY_COMPARABLES: ComparableCompany[] = [];

export const SHOPIFY_NEXT_QUESTIONS: NextQuestion[] = [];

/** Returns empty packet source — search for a company to populate */
export function buildShopifyPacketSource(): import("../types/artifactPacket").FounderPacketSourceInput {
  return {
    company: { name: "Example", canonicalMission: "", wedge: "", companyState: "idea", foundingMode: "start_new", identityConfidence: 0 },
    changes: [],
    interventions: [],
    initiatives: [],
    agents: [],
    nearbyEntities: [],
  };
}

/* ── Shared Context Demo Fixtures ────────────────────────────────── */

import type {
  SharedContextSnapshot,
  SharedContextPeer,
  SharedContextPacket,
  SharedContextTask,
  SharedContextMessage,
} from "../types/sharedContext";

const DEMO_PEERS: SharedContextPeer[] = [];

const DEMO_PACKETS: SharedContextPacket[] = [];

const DEMO_TASKS: SharedContextTask[] = [];

const DEMO_MESSAGES: SharedContextMessage[] = [];

export const DEMO_SHARED_CONTEXT_SNAPSHOT: SharedContextSnapshot = {
  peers: DEMO_PEERS,
  recentPackets: DEMO_PACKETS,
  recentTasks: DEMO_TASKS,
  recentMessages: DEMO_MESSAGES,
  counts: {
    activePeers: DEMO_PEERS.filter((p) => p.status === "active").length,
    activePackets: DEMO_PACKETS.filter((p) => p.status === "active").length,
    invalidatedPackets: 0,
    openTasks: DEMO_TASKS.filter((t) => t.status === "proposed" || t.status === "accepted").length,
    unreadMessages: DEMO_MESSAGES.filter((m) => !m.acknowledged).length,
  },
};
