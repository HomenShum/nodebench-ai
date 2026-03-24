/* ------------------------------------------------------------------ */
/*  Founder Dashboard — Demo Fixtures                                  */
/*  Realistic data for a one-person AI climate-tech startup.           */
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
  name: "Meridian AI",
  canonicalMission:
    "Build the intelligence layer for climate-tech decision making",
  wedge: "Real-time carbon credit pricing for institutional traders",
  companyState: "forming" as CompanyState,
  foundingMode: "continue_existing" as FoundingMode,
  identityConfidence: 0.62,
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
    id: "chg-1",
    timestamp: "2026-03-21T09:14:00Z",
    relativeTime: "2h ago",
    type: "signal",
    description:
      "EU carbon border adjustment mechanism draft leaked — pricing model assumptions may shift",
    linkedInitiativeId: "init-1",
  },
  {
    id: "chg-2",
    timestamp: "2026-03-21T07:30:00Z",
    relativeTime: "4h ago",
    type: "agent",
    description:
      "Background agent completed overnight competitive scan — 2 new entrants flagged in voluntary carbon market",
    linkedInitiativeId: "init-3",
  },
  {
    id: "chg-3",
    timestamp: "2026-03-20T22:00:00Z",
    relativeTime: "yesterday",
    type: "initiative",
    description:
      'Pricing engine MVP status moved from "in progress" to "testing" — 3 integration tests still failing',
    linkedInitiativeId: "init-2",
  },
  {
    id: "chg-4",
    timestamp: "2026-03-20T18:45:00Z",
    relativeTime: "yesterday",
    type: "decision",
    description:
      "Decided to delay Series A outreach by 4 weeks — need stronger pilot data from TradeFlow partnership",
    linkedInitiativeId: "init-4",
  },
  {
    id: "chg-5",
    timestamp: "2026-03-20T14:20:00Z",
    relativeTime: "yesterday",
    type: "signal",
    description:
      "TradeFlow CTO responded to API proposal — positive signal but wants SOC 2 compliance timeline",
    linkedInitiativeId: "init-5",
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

export const DEMO_INTERVENTIONS: Intervention[] = [
  {
    id: "int-1",
    rank: 1,
    title: "Fix 3 failing integration tests in pricing engine before pilot launch",
    linkedInitiative: "Pricing Engine MVP",
    linkedInitiativeId: "init-2",
    priorityScore: 94,
    confidence: 0.91,
  },
  {
    id: "int-2",
    rank: 2,
    title: "Draft SOC 2 compliance timeline for TradeFlow partnership",
    linkedInitiative: "TradeFlow Partnership",
    linkedInitiativeId: "init-5",
    priorityScore: 87,
    confidence: 0.78,
  },
  {
    id: "int-3",
    rank: 3,
    title: "Update carbon credit pricing model with EU CBAM draft parameters",
    linkedInitiative: "Market Intelligence Feed",
    linkedInitiativeId: "init-1",
    priorityScore: 79,
    confidence: 0.65,
  },
  {
    id: "int-4",
    rank: 4,
    title: "Prepare 2-page investor memo with updated pilot metrics",
    linkedInitiative: "Series A Readiness",
    linkedInitiativeId: "init-4",
    priorityScore: 72,
    confidence: 0.58,
  },
  {
    id: "int-5",
    rank: 5,
    title: "Run competitive positioning analysis against new VCM entrants",
    linkedInitiative: "Competitive Intelligence",
    linkedInitiativeId: "init-3",
    priorityScore: 65,
    confidence: 0.52,
  },
];

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

export const DEMO_INITIATIVES: Initiative[] = [
  {
    id: "init-1",
    title: "Market Intelligence Feed",
    status: "active",
    risk: "medium",
    priorityScore: 88,
    agentCount: 2,
    objective:
      "Continuously monitor regulatory changes, carbon pricing signals, and competitor moves in the voluntary and compliance carbon markets.",
  },
  {
    id: "init-2",
    title: "Pricing Engine MVP",
    status: "active",
    risk: "high",
    priorityScore: 95,
    agentCount: 1,
    objective:
      "Ship a real-time carbon credit pricing API that institutional traders can integrate into their existing OMS within 2 weeks.",
  },
  {
    id: "init-3",
    title: "Competitive Intelligence",
    status: "active",
    risk: "low",
    priorityScore: 70,
    agentCount: 1,
    objective:
      "Track new entrants, funding rounds, and product launches in the carbon credit data/analytics space.",
  },
  {
    id: "init-4",
    title: "Series A Readiness",
    status: "paused",
    risk: "medium",
    priorityScore: 76,
    agentCount: 0,
    objective:
      "Assemble investor deck, data room, and pilot metrics. Targeting $6-8M round at $30-40M pre. Paused until TradeFlow pilot data is in.",
  },
  {
    id: "init-5",
    title: "TradeFlow Partnership",
    status: "active",
    risk: "high",
    priorityScore: 92,
    agentCount: 1,
    objective:
      "Close first design partner deal with TradeFlow Capital. API integration underway, blocked on SOC 2 compliance question.",
  },
  {
    id: "init-6",
    title: "SOC 2 Compliance",
    status: "blocked",
    risk: "high",
    priorityScore: 81,
    agentCount: 0,
    objective:
      "Achieve SOC 2 Type I certification. Blocked on choosing an audit partner and scoping the control set for a solo-founder setup.",
  },
];

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
}

export const DEMO_AGENTS: AgentEntry[] = [
  {
    id: "agt-1",
    name: "pricing-engine",
    type: "claude_code",
    status: "healthy",
    currentGoal: "Debugging flaky integration test — intermittent timeout in credit_spread_calculator",
    lastHeartbeat: "12s ago",
  },
  {
    id: "agt-2",
    name: "market-scanner",
    type: "background",
    status: "healthy",
    currentGoal: "Monitoring EU regulatory feeds and CarbonPulse for CBAM updates",
    lastHeartbeat: "3m ago",
  },
  {
    id: "agt-3",
    name: "competitive-watcher",
    type: "background",
    status: "waiting",
    currentGoal: "Queued: re-scan Crunchbase for new VCM startups after rate limit reset",
    lastHeartbeat: "18m ago",
  },
  {
    id: "agt-4",
    name: "tradeflow-integrator",
    type: "openclaw",
    status: "blocked",
    currentGoal: "Waiting for SOC 2 scope decision before proceeding with API auth layer",
    lastHeartbeat: "1h ago",
  },
];

export const DEMO_NEARBY_ENTITIES: NearbyEntity[] = [
  {
    id: "ent-pricing-engine",
    name: "Pricing Engine MVP",
    relationship: "product",
    whyItMatters: "This is the company's first proof point and the main dependency for the TradeFlow pilot.",
  },
  {
    id: "ent-market-feed",
    name: "Market Intelligence Feed",
    relationship: "initiative",
    whyItMatters: "Regulatory and pricing deltas feed directly into the wedge and keep the core model current.",
  },
  {
    id: "ent-tradeflow",
    name: "TradeFlow Capital",
    relationship: "design partner",
    whyItMatters: "TradeFlow is the nearest external proof source for the product narrative and compliance readiness.",
  },
  {
    id: "ent-carbonpulse",
    name: "CarbonPulse",
    relationship: "comparable",
    whyItMatters: "A well-known carbon market intelligence benchmark that sharpens what Meridian AI must do differently.",
  },
  {
    id: "ent-cbpm-watch",
    name: "EU CBAM Draft",
    relationship: "market signal",
    whyItMatters: "This regulatory change can alter pricing assumptions quickly enough to force a same-week reprioritization.",
  },
];

/* ── Daily Memo ───────────────────────────────────────────────────── */

export interface DailyMemo {
  date: string;
  whatMatters: string[];
  whatToDoNext: string[];
  unresolved: string[];
  generatedAt: string;
}

export const DEMO_DAILY_MEMO: DailyMemo = {
  date: "March 21, 2026",
  whatMatters: [
    "Pricing engine is 90% done but the 3 failing tests block the TradeFlow pilot launch scheduled for next week.",
    "EU CBAM draft leak could significantly change carbon credit pricing assumptions — need to assess impact before pilot goes live.",
    "TradeFlow CTO is engaged but SOC 2 compliance is now a hard requirement, not a nice-to-have.",
  ],
  whatToDoNext: [
    "Fix the 3 integration test failures in the pricing engine (est. 2-4 hours focused work).",
    "Draft a 1-page SOC 2 compliance timeline to send to TradeFlow CTO by end of day.",
    "Run the CBAM impact analysis through the market intelligence agent and update pricing model if delta > 5%.",
  ],
  unresolved: [
    "Series A timing: 4-week delay means Q2 raise instead of Q1. Need to decide if this changes target investors.",
    "Solo-founder SOC 2 is expensive and slow. Should we explore SOC 2-as-a-service (Vanta, Drata) or hire a fractional CISO?",
  ],
  generatedAt: "6:30 AM ET",
};

/* ================================================================== */
/*  External Signals — for Meridian AI dashboard                       */
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

export const DEMO_EXTERNAL_SIGNALS: ExternalSignal[] = [
  {
    id: "sig-ext-1",
    title: "EU CBAM draft parameters leaked — carbon border price floor raised 18%",
    summary: "A draft version of the revised Carbon Border Adjustment Mechanism circulating in Brussels suggests a higher floor price than previously modelled.",
    category: "regulatory",
    source: "CarbonPulse",
    publishedAt: "2026-03-21T07:00:00Z",
    relativeTime: "5h ago",
    relevanceScore: 97,
    affectsInitiativeId: "init-1",
    howItAffectsYou: "Your pricing model's EU compliance layer needs parameter update before the TradeFlow pilot goes live.",
    isNew: true,
  },
  {
    id: "sig-ext-2",
    title: "NativeCarbon raises $22M Series A — new entrant in compliance-grade credits",
    summary: "NativeCarbon closes $22M led by Breakthrough Energy Ventures. Focuses on institutional-grade compliance credits with real-time issuance.",
    category: "competitive",
    source: "Crunchbase",
    publishedAt: "2026-03-20T14:30:00Z",
    relativeTime: "yesterday",
    relevanceScore: 84,
    affectsInitiativeId: "init-3",
    howItAffectsYou: "Adds a well-funded competitor in the institutional segment. Differentiator: your real-time pricing API vs their issuance focus.",
  },
  {
    id: "sig-ext-3",
    title: "ICE Carbon futures volume up 34% QoQ — institutional interest accelerating",
    summary: "Intercontinental Exchange reports Q1 2026 carbon futures volume at record highs. Institutional participants up 28%.",
    category: "market",
    source: "ICE Market Data",
    publishedAt: "2026-03-19T09:00:00Z",
    relativeTime: "2d ago",
    relevanceScore: 76,
    howItAffectsYou: "Confirms your TAM thesis. Use this data point in the investor memo and the TradeFlow pitch.",
  },
  {
    id: "sig-ext-4",
    title: "SOC 2 Type I average timeline now 4-6 months for seed-stage (Vanta 2026 report)",
    summary: "Solo-founder and seed-stage companies average 4-6 months for SOC 2 Type I with automation tooling. Manual approaches take 8-14 months.",
    category: "macro",
    source: "Vanta 2026 Compliance Report",
    publishedAt: "2026-03-18T12:00:00Z",
    relativeTime: "3d ago",
    relevanceScore: 71,
    affectsInitiativeId: "init-6",
    howItAffectsYou: "TradeFlow needs SOC 2 before full API integration. 4-6 months with Vanta means you should start now.",
  },
];

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
}

export interface NewsSignal {
  id: string;
  headline: string;
  category: SignalCategory;
  date: string;
  source: string;
  relevance: number;
  implication: string;
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
  name: "Shopify",
  ticker: "SHOP",
  sector: "Commerce Infrastructure",
  hq: "Ottawa, Canada",
  founded: 2006,
  employees: "~8,000",
  revenueAnnual: "$11.6B (FY2025)",
  revenueGrowthYoY: "+26%",
  freeCashFlow: "$2.0B",
  marketCap: "~$110B",
  description: "Operating system for commerce — platform powering millions of merchants in 175+ countries, expanding into B2B, offline, and agentic storefronts.",
  wedge: "Unified commerce OS + merchant data moat enabling agentic storefront layer",
  identityConfidence: 0.95,
};

export const SHOPIFY_BUSINESS_QUALITY: BusinessQualitySignal[] = [
  { id: "sbq-1", dimension: "Merchant retention", rating: "strong", evidence: ">80% YoY active merchant retention across cohorts", source: "Shopify FY2025 10-K" },
  { id: "sbq-2", dimension: "GMV growth", rating: "improving", evidence: "$235B+ annual GMV, growing faster than e-commerce market", source: "Shopify Q4 2025 earnings" },
  { id: "sbq-3", dimension: "Solutions attach rate", rating: "strong", evidence: "Merchant Solutions revenue is 67% of total — payments, shipping, capital", source: "Shopify FY2025 results" },
  { id: "sbq-4", dimension: "International expansion", rating: "watch", evidence: "<30% of GMV from non-North America markets — slower than Stripe/Adyen", source: "Shopify investor presentation" },
  { id: "sbq-5", dimension: "Operating leverage", rating: "improving", evidence: "First sustained GAAP profitability year. FCF margin improving quarter over quarter.", source: "Shopify FY2025 results" },
];

export const SHOPIFY_NEWS_SIGNALS: NewsSignal[] = [
  { id: "sns-1", headline: "Shopify launches Agentic Storefronts with Universal Commerce Protocol", category: "market", date: "2026-03-15", source: "Shopify official", relevance: 98, implication: "Central admin control over AI-driven purchasing across ChatGPT, Google, and Microsoft Copilot surfaces." },
  { id: "sns-2", headline: "AI-search-driven orders up 15x since January 2025", category: "market", date: "2026-03-10", source: "Reuters", relevance: 95, implication: "AI-generated traffic is becoming a material channel — validates agentic commerce thesis." },
  { id: "sns-3", headline: "Updated partner and API terms tighten AI/ML data protections", category: "regulatory", date: "2026-02-27", source: "Shopify partner terms", relevance: 88, implication: "Explicit consent requirements for merchant and customer data in AI/ML contexts. May slow third-party agent integrations." },
  { id: "sns-4", headline: "Perplexity shopping agents temporarily allowed to operate on Amazon", category: "competitive", date: "2026-03-18", source: "Reuters", relevance: 82, implication: "Legal precedent being set for agentic shopping on third-party platforms. Affects Shopify's UCP competitive moat." },
  { id: "sns-5", headline: "Shopify reports $11.6B revenue and $2.0B FCF for FY2025", category: "market", date: "2026-02-12", source: "Shopify FY2025 results", relevance: 90, implication: "Strong financial position to fund agentic commerce buildout. Revenue grew 30% YoY." },
];

export const SHOPIFY_PLATFORM_READINESS: PlatformReadinessSignal[] = [
  { id: "spr-1", dimension: "Agentic storefront API", status: "leading", evidence: "UCP live with ChatGPT, Google, Microsoft Copilot. Merchants manage via Shopify Admin." },
  { id: "spr-2", dimension: "Data governance controls", status: "building", evidence: "New partner terms address AI/ML data use, but enforcement tooling still rolling out." },
  { id: "spr-3", dimension: "Cross-border payments", status: "building", evidence: "Shopify Payments expanding internationally but still behind Stripe/Adyen in non-NA markets." },
  { id: "spr-4", dimension: "Offline / POS integration", status: "lagging", evidence: "POS market share trails Square. Unified online+offline still requires separate hardware." },
];

export const SHOPIFY_REGULATORY: RegulatorySignal[] = [
  { id: "srg-1", title: "EU AI Act implications for agentic recommendations", jurisdiction: "EU", risk: "medium", detail: "Agentic storefronts making purchase decisions may fall under high-risk AI classification requiring transparency and human oversight.", timeline: "Enforcement begins Q3 2026" },
  { id: "srg-2", title: "Partner data terms tightened for AI/ML use", jurisdiction: "Global", risk: "low", detail: "Effective Feb 27, 2026 — partners must obtain explicit consent for merchant/customer data use in AI/ML applications.", timeline: "Already in effect" },
  { id: "srg-3", title: "Agentic shopping legal friction (Perplexity v. Amazon)", jurisdiction: "US", risk: "medium", detail: "U.S. appeals court allowing Perplexity shopping agents on Amazon sets precedent for third-party agent access to commerce platforms.", timeline: "Active litigation" },
];

export const SHOPIFY_COMPARABLES: ComparableCompany[] = [
  { id: "scomp-1", name: "Adobe Commerce", relationship: "direct", metric: "Enterprise e-commerce market share", implication: "Shopify gaining enterprise share at Adobe's expense. Adobe lacks agentic commerce layer." },
  { id: "scomp-2", name: "BigCommerce", relationship: "direct", metric: "Mid-market SaaS commerce", implication: "BigCommerce is smaller but increasingly price-competitive. No agentic commerce offering." },
  { id: "scomp-3", name: "Amazon (checkout surfaces)", relationship: "adjacent", metric: "Agentic checkout as platform threat", implication: "Amazon could build its own UCP layer. Perplexity legal friction tests this boundary." },
  { id: "scomp-4", name: "Stripe", relationship: "adjacent", metric: "Payments + merchant analytics", implication: "Stripe's analytics could compete with Shopify's merchant data moat if expanded to commerce intelligence." },
];

export const SHOPIFY_NEXT_QUESTIONS: NextQuestion[] = [
  { id: "snq-1", question: "What is the 3-year path to 30% FCF margin?", lens: "banker", priority: "high" },
  { id: "snq-2", question: "How does GMV deceleration at scale affect take rate compression?", lens: "banker", priority: "medium" },
  { id: "snq-3", question: "Is UCP the identity or a product line?", lens: "ceo", priority: "high" },
  { id: "snq-4", question: "What unlocks the next 100K B2B merchants?", lens: "ceo", priority: "medium" },
  { id: "snq-5", question: "Where does agentic commerce create new moat or destroy existing moat?", lens: "strategy", priority: "high" },
  { id: "snq-6", question: "How sticky is merchant data if Stripe launches comparable analytics?", lens: "diligence", priority: "high" },
];

/** Maps Shopify fixtures into FounderPacketSourceInput for buildFounderArtifactPacket() */
export function buildShopifyPacketSource(): import("../types/artifactPacket").FounderPacketSourceInput {
  return {
    company: {
      name: SHOPIFY_SNAPSHOT.name,
      canonicalMission: SHOPIFY_SNAPSHOT.description,
      wedge: SHOPIFY_SNAPSHOT.wedge,
      companyState: "operating" as const,
      foundingMode: "continue_existing" as const,
      identityConfidence: SHOPIFY_SNAPSHOT.identityConfidence,
    },
    changes: SHOPIFY_NEWS_SIGNALS.map((s, i) => ({
      id: s.id,
      timestamp: `${s.date}T12:00:00Z`,
      relativeTime: i === 0 ? "6d ago" : `${7 + i}d ago`,
      type: "signal" as const,
      description: s.headline,
    })),
    interventions: [
      { id: "shop-int-1", title: "Evaluate UCP integration for agent-readable product catalogs", linkedInitiative: "Agentic Commerce", linkedInitiativeId: "shop-init-1", priorityScore: 94, confidence: 0.88 },
      { id: "shop-int-2", title: "Assess data governance compliance exposure under new partner terms", linkedInitiative: "Data Governance", linkedInitiativeId: "shop-init-2", priorityScore: 87, confidence: 0.75 },
      { id: "shop-int-3", title: "Model FCF trajectory under accelerating AI-search order volume", linkedInitiative: "Financial Planning", linkedInitiativeId: "shop-init-3", priorityScore: 81, confidence: 0.72 },
    ],
    initiatives: [
      { id: "shop-init-1", title: "Agentic Commerce Expansion", status: "active", risk: "medium", priorityScore: 95, objective: "Scale UCP integrations across AI surfaces while maintaining merchant control." },
      { id: "shop-init-2", title: "Data Governance Compliance", status: "active", risk: "high", priorityScore: 88, objective: "Ensure partner terms and AI/ML data usage comply with global regulations." },
      { id: "shop-init-3", title: "Financial Performance", status: "active", risk: "low", priorityScore: 82, objective: "Sustain 25%+ revenue growth with improving FCF margins." },
    ],
    agents: [
      { id: "shop-agt-1", name: "market-monitor", status: "healthy", currentGoal: "Tracking agentic commerce announcements across ChatGPT, Google, Copilot" },
      { id: "shop-agt-2", name: "regulatory-scanner", status: "healthy", currentGoal: "Monitoring EU AI Act enforcement timeline and partner term compliance" },
    ],
    dailyMemo: {
      whatMatters: [
        "AI-search orders grew 15x in 12 months — this channel is now material to GMV growth.",
        "UCP positions Shopify as the central admin layer for agentic commerce across all AI surfaces.",
        "Partner data terms update (Feb 2026) creates short-term friction but long-term trust moat.",
      ],
      whatToDoNext: [
        "Model the revenue impact of AI-search channel at current growth rate over 8 quarters.",
        "Map the competitive response surface: can Amazon, Stripe, or Adobe build a comparable UCP?",
        "Assess whether Perplexity v. Amazon ruling creates opportunity or risk for Shopify's walled-garden approach.",
      ],
      unresolved: [
        "Does AI-generated traffic convert at the same unit economics as organic search traffic?",
        "Will EU AI Act classify agentic storefronts as high-risk AI, requiring transparency layers?",
      ],
      generatedAt: "7:00 AM ET",
    },
    nearbyEntities: [
      { id: "shop-ent-1", name: "Universal Commerce Protocol", relationship: "product", whyItMatters: "UCP is the company's primary competitive moat for agentic commerce." },
      { id: "shop-ent-2", name: "ChatGPT Shopping", relationship: "partner", whyItMatters: "First major AI surface integration — sets the template for all others." },
      { id: "shop-ent-3", name: "Stripe", relationship: "comparable", whyItMatters: "Closest competitor in merchant payments with potential to expand into commerce intelligence." },
      { id: "shop-ent-4", name: "Perplexity Shopping", relationship: "market signal", whyItMatters: "Legal precedent for agentic shopping on third-party platforms affects UCP positioning." },
    ],
  };
}
