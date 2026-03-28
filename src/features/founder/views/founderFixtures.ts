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
  name: "NodeBench AI",
  canonicalMission:
    "Local-first operating-memory and entity-context layer for agent-native businesses",
  wedge: "Right context, right order, better odds of right judgment — 350-tool MCP server with progressive discovery",
  companyState: "operating" as CompanyState,
  foundingMode: "continue_existing" as FoundingMode,
  identityConfidence: 0.78,
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
    timestamp: "2026-03-24T09:14:00Z",
    relativeTime: "2h ago",
    type: "signal",
    description:
      "Anthropic released tool-use pricing changes effective April 1 — model cost impact on NodeBench gateway usage at current volume",
    linkedInitiativeId: "init-1",
  },
  {
    id: "chg-2",
    timestamp: "2026-03-24T07:30:00Z",
    relativeTime: "4h ago",
    type: "agent",
    description:
      "Background agent completed overnight competitive scan — Cursor shipped MCP-native tool marketplace with 120+ verified servers",
    linkedInitiativeId: "init-3",
  },
  {
    id: "chg-3",
    timestamp: "2026-03-23T22:00:00Z",
    relativeTime: "yesterday",
    type: "initiative",
    description:
      "Progressive discovery adoption doubled after TOON encoding enabled by default — measure token savings across top 20 workflows",
    linkedInitiativeId: "init-2",
  },
  {
    id: "chg-4",
    timestamp: "2026-03-23T18:45:00Z",
    relativeTime: "yesterday",
    type: "decision",
    description:
      "Shipped ta-studio-mcp v2.0 at Meta — 100% task completion (64/64), token costs reduced 17x from $364 to $21 per 64 tasks",
    linkedInitiativeId: "init-4",
  },
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

export const DEMO_INTERVENTIONS: Intervention[] = [
  {
    id: "int-1",
    rank: 1,
    title: "Audit NodeBench distribution gap vs Cursor marketplace reach — submit to MCP Registry and mcpservers.org",
    linkedInitiative: "MCP Distribution",
    linkedInitiativeId: "init-3",
    priorityScore: 94,
    confidence: 0.91,
  },
  {
    id: "int-2",
    rank: 2,
    title: "Double down on TOON encoding — measure token savings across top 20 workflows after adoption doubled",
    linkedInitiative: "Progressive Discovery",
    linkedInitiativeId: "init-2",
    priorityScore: 87,
    confidence: 0.78,
  },
  {
    id: "int-3",
    rank: 3,
    title: "Model cost impact on NodeBench gateway usage at current volume with Anthropic April 1 pricing changes",
    linkedInitiative: "Product Intelligence",
    linkedInitiativeId: "init-1",
    priorityScore: 79,
    confidence: 0.65,
  },
  {
    id: "int-4",
    rank: 4,
    title: "Ship environment spec compiler — target Stripe-style benchmark environments as downstream product",
    linkedInitiative: "TA Studio Integration",
    linkedInitiativeId: "init-4",
    priorityScore: 72,
    confidence: 0.58,
  },
  {
    id: "int-5",
    rank: 5,
    title: "Run eval flywheel to 100% — expand judge-calibrated scenario corpus from 103 to 200 queries",
    linkedInitiative: "Eval Quality",
    linkedInitiativeId: "init-6",
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
    title: "Product Intelligence Layer",
    status: "active",
    risk: "medium",
    priorityScore: 88,
    agentCount: 2,
    objective:
      "Monitor MCP ecosystem changes, model pricing shifts, and agent infrastructure moves across Anthropic, OpenAI, Google, Stripe, GitHub, Salesforce, ServiceNow.",
  },
  {
    id: "init-2",
    title: "Progressive Discovery & Gateway",
    status: "active",
    risk: "low",
    priorityScore: 95,
    agentCount: 1,
    objective:
      "350-tool MCP server with TOON encoding, hybrid search, WebSocket gateway. Ship <200ms TTFB and token-gated access.",
  },
  {
    id: "init-3",
    title: "MCP Distribution",
    status: "active",
    risk: "high",
    priorityScore: 92,
    agentCount: 1,
    objective:
      "Publish to npm, MCP Registry, mcpservers.org, cursor.directory. Close distribution gap vs Cursor marketplace (120+ servers).",
  },
  {
    id: "init-4",
    title: "TA Studio Integration (Meta)",
    status: "active",
    risk: "medium",
    priorityScore: 85,
    agentCount: 2,
    objective:
      "ta-studio-mcp at Meta — 9 MCP tools, 100% task completion (64/64), 17x cost reduction. Scale from 200 to 2000+ req/day.",
  },
  {
    id: "init-5",
    title: "Environment Synthesis",
    status: "active",
    risk: "medium",
    priorityScore: 76,
    agentCount: 0,
    objective:
      "Build environment spec compiler for high-fidelity clones of real products (QuickBooks, GitHub, Salesforce, Booking.com, ServiceNow, Stripe). Target agent training and eval market.",
  },
  {
    id: "init-6",
    title: "Eval Quality Flywheel",
    status: "active",
    risk: "low",
    priorityScore: 81,
    agentCount: 1,
    objective:
      "Self-judging eval loop with Gemini 3.1 Flash Lite. 103 queries across 18 categories. Target 100% pass rate. Continuously grow corpus.",
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
  claimCount?: number;
  changeCount?: number;
  contradictionCount?: number;
  /** ISO date string for staleness tracking */
  lastUpdated?: string;
}

export const DEMO_AGENTS: AgentEntry[] = [
  {
    id: "agt-1",
    name: "eval-flywheel",
    type: "claude_code",
    status: "healthy",
    currentGoal: "Running search quality eval — 103 queries, Gemini 3.1 Flash Lite judge, targeting 100% pass rate",
    lastHeartbeat: "12s ago",
  },
  {
    id: "agt-2",
    name: "market-scanner",
    type: "background",
    status: "healthy",
    currentGoal: "Monitoring MCP ecosystem — Cursor marketplace, Anthropic pricing, GitHub Copilot extensions, Stripe benchmarks",
    lastHeartbeat: "3m ago",
  },
  {
    id: "agt-3",
    name: "competitive-watcher",
    type: "background",
    status: "healthy",
    currentGoal: "Tracking agent infrastructure moves: ServiceNow AI marketplace, Salesforce Einstein MCP, Booking.com agent APIs",
    lastHeartbeat: "18m ago",
  },
  {
    id: "agt-4",
    name: "ta-studio-monitor",
    type: "openclaw",
    status: "healthy",
    currentGoal: "Monitoring TA Studio production pipeline at Meta — 64/64 tasks passing, watching for regressions post-rollout",
    lastHeartbeat: "5m ago",
  },
];

export const DEMO_NEARBY_ENTITIES: NearbyEntity[] = [
  {
    id: "ent-meta-ta",
    name: "Meta (via Tests Assured)",
    relationship: "deployment",
    whyItMatters: "Primary production deployment. ta-studio-mcp serving 20-200 req/day in pilot, architected to scale to 2000+. 100% task completion, 17x cost reduction.",
    claimCount: 5,
    changeCount: 2,
    contradictionCount: 1,
    lastUpdated: "2026-03-23T10:00:00Z",
  },
  {
    id: "ent-stripe",
    name: "Stripe",
    relationship: "comparable",
    whyItMatters: "Published MCP integration benchmark with 48 tasks, deterministic graders, production-realistic environments. Sets the standard for agent eval infrastructure.",
    claimCount: 3,
    changeCount: 1,
    contradictionCount: 0,
    lastUpdated: "2026-03-20T14:30:00Z",
  },
  {
    id: "ent-github",
    name: "GitHub",
    relationship: "distribution",
    whyItMatters: "Copilot extensions now support MCP natively. Potential distribution channel for NodeBench progressive discovery tools.",
    claimCount: 2,
    changeCount: 3,
    contradictionCount: 0,
    lastUpdated: "2026-03-22T09:15:00Z",
  },
  {
    id: "ent-salesforce",
    name: "Salesforce",
    relationship: "market signal",
    whyItMatters: "Einstein GPT using MCP for tool orchestration validates enterprise MCP adoption thesis. Potential customer for environment synthesis.",
    claimCount: 1,
    changeCount: 0,
    contradictionCount: 0,
    lastUpdated: "2026-03-10T16:00:00Z",
  },
  {
    id: "ent-servicenow",
    name: "ServiceNow",
    relationship: "market signal",
    whyItMatters: "AI agent marketplace for enterprise IT workflows — validates the agent-native business infrastructure category NodeBench operates in.",
    claimCount: 0,
    changeCount: 1,
    contradictionCount: 0,
    lastUpdated: "2026-03-05T11:00:00Z",
  },
  {
    id: "ent-cursor",
    name: "Cursor",
    relationship: "competitor",
    whyItMatters: "Shipped MCP-native tool marketplace with 120+ verified servers. Distribution gap is the primary competitive risk for NodeBench.",
    claimCount: 4,
    changeCount: 2,
    contradictionCount: 2,
    lastUpdated: "2026-03-24T08:00:00Z",
  },
  {
    id: "ent-jpmorgan",
    name: "JPMorgan Chase",
    relationship: "prior employer",
    whyItMatters: "3.5 years building enterprise data automation and LLM infrastructure. Validated agentic RAG, ETL pipelines, and risk modeling at scale.",
    claimCount: 0,
    changeCount: 0,
    contradictionCount: 0,
    lastUpdated: "2026-02-28T12:00:00Z",
  },
  {
    id: "ent-booking",
    name: "Booking.com",
    relationship: "target environment",
    whyItMatters: "Complex multi-step booking workflows are ideal targets for environment synthesis — high-fidelity clones for agent training.",
    claimCount: 1,
    changeCount: 1,
    contradictionCount: 0,
    lastUpdated: "2026-03-18T15:45:00Z",
  },
  {
    id: "ent-quickbooks",
    name: "QuickBooks (Intuit)",
    relationship: "target environment",
    whyItMatters: "Financial software with complex state transitions — prime target for simulation environment generation and agent benchmarking.",
    claimCount: 2,
    changeCount: 0,
    contradictionCount: 1,
    lastUpdated: "2026-03-15T10:30:00Z",
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
  date: "March 24, 2026",
  whatMatters: [
    "Cursor shipped MCP marketplace with 120+ servers — NodeBench distribution gap is now the primary competitive risk.",
    "TA Studio at Meta hitting 100% task completion (64/64) with 17x cost reduction — proof point for production MCP architecture.",
    "Anthropic tool-use pricing changes effective April 1 — need to model cost impact on NodeBench gateway at current usage volume.",
  ],
  whatToDoNext: [
    "Submit NodeBench to MCP Registry, mcpservers.org, and cursor.directory — close the distribution gap this week.",
    "Run eval flywheel to expand corpus from 103 to 200 queries — target 100% pass rate with Gemini judge calibration.",
    "Ship environment spec compiler targeting Stripe-style benchmark environments — this unlocks the agent training market.",
  ],
  unresolved: [
    "Is the environment synthesis product line (cloning QuickBooks, Booking.com, ServiceNow) a distraction or the real wedge?",
    "Should NodeBench prioritize enterprise MCP gateway sales or open-source adoption-first distribution?",
  ],
  generatedAt: "6:30 AM PT",
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

export const DEMO_EXTERNAL_SIGNALS: ExternalSignal[] = [
  {
    id: "sig-ext-1",
    title: "Cursor ships MCP-native tool marketplace with 120+ verified servers",
    summary: "Cursor's marketplace now features 120+ MCP servers with one-click install, usage analytics, and community ratings.",
    category: "competitive",
    source: "Cursor Blog",
    publishedAt: "2026-03-24T07:00:00Z",
    relativeTime: "4h ago",
    relevanceScore: 97,
    affectsInitiativeId: "init-3",
    howItAffectsYou: "NodeBench must close distribution gap immediately — submit to MCP Registry, mcpservers.org, cursor.directory this week.",
    isNew: true,
  },
  {
    id: "sig-ext-2",
    title: "Stripe publishes MCP integration benchmark — 48 tasks with deterministic graders",
    summary: "Stripe released an open-source benchmark for agent tool use with production-realistic environments, terminal/browser tools, and an MCP server.",
    category: "market",
    source: "Stripe Engineering Blog",
    publishedAt: "2026-03-23T14:00:00Z",
    relativeTime: "yesterday",
    relevanceScore: 94,
    affectsInitiativeId: "init-5",
    howItAffectsYou: "Validates the environment synthesis direction. NodeBench's compile_environment_spec tool should target this benchmark format.",
    isNew: true,
  },
  {
    id: "sig-ext-3",
    title: "Anthropic announces tool-use pricing changes effective April 1, 2026",
    summary: "New pricing tiers for tool-use tokens. Impact varies by usage pattern — high-tool-call workflows may see 10-20% cost increase.",
    category: "regulatory",
    source: "Anthropic Changelog",
    publishedAt: "2026-03-22T09:00:00Z",
    relativeTime: "2d ago",
    relevanceScore: 91,
    affectsInitiativeId: "init-1",
    howItAffectsYou: "Model cost impact on NodeBench gateway. TOON encoding (40% token reduction) becomes even more critical as a differentiator.",
  },
  {
    id: "sig-ext-4",
    title: "GitHub Copilot extensions now support MCP protocol natively",
    summary: "GitHub announced native MCP support in Copilot extensions, allowing tool servers to integrate directly into the Copilot experience.",
    category: "market",
    source: "GitHub Blog",
    publishedAt: "2026-03-22T16:00:00Z",
    relativeTime: "2d ago",
    relevanceScore: 88,
    affectsInitiativeId: "init-3",
    howItAffectsYou: "New distribution channel for NodeBench tools. Progressive discovery could differentiate in the Copilot extension marketplace.",
  },
  {
    id: "sig-ext-5",
    title: "ServiceNow launches AI agent marketplace for enterprise IT workflows",
    summary: "ServiceNow Now Platform adds an agent marketplace where enterprises can deploy, monitor, and govern AI agents across IT service management.",
    category: "market",
    source: "ServiceNow Press Release",
    publishedAt: "2026-03-21T12:00:00Z",
    relativeTime: "3d ago",
    relevanceScore: 82,
    affectsInitiativeId: "init-1",
    howItAffectsYou: "Validates agent-native business infrastructure category. ServiceNow IT workflows are potential targets for environment synthesis.",
  },
  {
    id: "sig-ext-6",
    title: "Salesforce Einstein GPT adopts MCP for enterprise tool orchestration",
    summary: "Salesforce integrates MCP into Einstein GPT, enabling enterprise customers to connect AI agents to internal tools via standardized protocol.",
    category: "market",
    source: "Salesforce Developer Blog",
    publishedAt: "2026-03-20T10:00:00Z",
    relativeTime: "4d ago",
    relevanceScore: 79,
    affectsInitiativeId: "init-1",
    howItAffectsYou: "Enterprise MCP adoption accelerating. NodeBench's 350-tool progressive discovery could serve as an intelligence layer for these deployments.",
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

/* ── Shared Context Demo Fixtures ────────────────────────────────── */

import type {
  SharedContextSnapshot,
  SharedContextPeer,
  SharedContextPacket,
  SharedContextTask,
  SharedContextMessage,
} from "../types/sharedContext";

const DEMO_PEERS: SharedContextPeer[] = [
  {
    peerId: "peer:founder:homen",
    product: "nodebench",
    workspaceId: "ws-nodebench",
    surface: "web",
    role: "compiler",
    capabilities: ["publish", "delegate", "approve"],
    status: "active",
    lastHeartbeatAt: new Date(Date.now() - 30_000).toISOString(),
    summary: { currentTask: "Wiring coordination hub", focusEntity: "NodeBench AI", confidence: 0.85 },
  },
  {
    peerId: "peer:agent:claude_code",
    product: "nodebench",
    workspaceId: "ws-nodebench",
    surface: "local_runtime",
    role: "runner",
    capabilities: ["execute", "publish", "research"],
    status: "active",
    lastHeartbeatAt: new Date(Date.now() - 12_000).toISOString(),
    summary: { currentTask: "Context graph wiring", focusEntity: "TA Studio", confidence: 0.92 },
  },
  {
    peerId: "peer:agent:khush_retention",
    product: "ta_studio",
    workspaceId: "ws-nodebench",
    surface: "local_runtime",
    role: "environment_builder",
    capabilities: ["execute", "publish", "replay"],
    status: "active",
    lastHeartbeatAt: new Date(Date.now() - 45_000).toISOString(),
    summary: { currentTask: "Building retention proxy RET-1", focusEntity: "Retention Middleware" },
  },
  {
    peerId: "peer:agent:background_scan",
    product: "nodebench",
    workspaceId: "ws-nodebench",
    surface: "runner",
    role: "observer",
    capabilities: ["monitor", "publish"],
    status: "idle",
    lastHeartbeatAt: new Date(Date.now() - 180_000).toISOString(),
    summary: { currentTask: "Overnight competitive scan complete" },
  },
];

const DEMO_PACKETS: SharedContextPacket[] = [
  {
    contextId: "ctx:retention-audit-mar27",
    contextType: "state_snapshot_packet",
    producerPeerId: "peer:agent:khush_retention",
    workspaceId: "ws-nodebench",
    subject: "Retention layer audit — what works vs conceptual",
    summary: "Stage-level caching works (skip crawl/workflow/testcase on reruns). Context graph built but read-only. Trajectory logger scaffolded but not wired.",
    claims: [
      "Execution agent is deterministic (regex to API), not LLM",
      "98% savings from skipping stages 1-3, not from smarter nav",
      "TrajectoryLogger has full save/load API but nothing calls it",
    ],
    evidenceRefs: [{ label: "Slack audit", href: "#slack-mar27" }],
    confidence: 0.88,
    freshness: { status: "fresh", trustTier: "verified" },
    status: "active",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    contextId: "ctx:work-split-mar27",
    contextType: "workflow_packet",
    producerPeerId: "peer:founder:homen",
    workspaceId: "ws-nodebench",
    subject: "Homen/Khush work split — two-track build",
    summary: "Khush: agnostic retention middleware (proxy-of-proxies). Homen: TA Studio platform + context graph wiring + tool coverage.",
    claims: [
      "Khush owns telemetry format, proxy protocol, suggest_next() API",
      "Homen owns TA Studio tools, context graph, dashboard viz, Convex sync",
      "Integration: Khush's proxy wraps TA Studio as one upstream among many",
    ],
    evidenceRefs: [{ label: "Work split doc", href: "#retention-plan" }],
    confidence: 0.95,
    freshness: { status: "fresh", trustTier: "verified" },
    status: "active",
    createdAt: new Date(Date.now() - 1800_000).toISOString(),
  },
  {
    contextId: "ctx:coordination-hub-plan",
    contextType: "workflow_packet",
    producerPeerId: "peer:agent:claude_code",
    workspaceId: "ws-nodebench",
    subject: "Coordination Hub implementation plan",
    summary: "6-phase plan: types + hooks, reusable components, hub view, wire existing views, navigation, fixtures. 11 new files, 6 modified.",
    claims: ["Zero new API endpoints", "Zero new Convex tables", "Pure frontend wiring"],
    evidenceRefs: [],
    confidence: 0.90,
    freshness: { status: "fresh", trustTier: "internal" },
    status: "active",
    createdAt: new Date(Date.now() - 600_000).toISOString(),
  },
];

const DEMO_TASKS: SharedContextTask[] = [
  {
    taskId: "task:wire-context-graph",
    taskType: "agent_handoff",
    proposerPeerId: "peer:founder:homen",
    assigneePeerId: "peer:agent:claude_code",
    status: "accepted",
    description: "Wire context graph find_precedents() into execution agent for guided navigation",
    inputContextIds: ["ctx:retention-audit-mar27"],
    createdAt: new Date(Date.now() - 7200_000).toISOString(),
  },
  {
    taskId: "task:ret-1-proxy",
    taskType: "implementation",
    proposerPeerId: "peer:founder:homen",
    assigneePeerId: "peer:agent:khush_retention",
    status: "accepted",
    description: "Build proxy-of-proxies that wraps upstream MCP servers transparently (RET-1)",
    inputContextIds: ["ctx:work-split-mar27"],
    createdAt: new Date(Date.now() - 5400_000).toISOString(),
  },
  {
    taskId: "task:coordination-hub",
    taskType: "implementation",
    proposerPeerId: "peer:founder:homen",
    assigneePeerId: "peer:agent:claude_code",
    status: "proposed",
    description: "Build Coordination Hub UI surface — wire existing backend to live frontend",
    inputContextIds: ["ctx:coordination-hub-plan"],
    createdAt: new Date(Date.now() - 300_000).toISOString(),
  },
];

const DEMO_MESSAGES: SharedContextMessage[] = [
  {
    messageId: "msg-1",
    fromPeerId: "peer:agent:khush_retention",
    toPeerId: "peer:founder:homen",
    messageType: "status_update",
    content: "Retention audit complete. Stage-level caching confirmed working. Context graph and trajectory logger need wiring.",
    acknowledged: true,
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    messageId: "msg-2",
    fromPeerId: "peer:founder:homen",
    toPeerId: "peer:agent:claude_code",
    messageType: "task_handoff",
    content: "Starting coordination hub build. Phase 1: types and hooks. Wire to existing /api/shared-context endpoints.",
    acknowledged: true,
    createdAt: new Date(Date.now() - 1200_000).toISOString(),
  },
  {
    messageId: "msg-3",
    fromPeerId: "peer:agent:claude_code",
    toPeerId: "peer:founder:homen",
    messageType: "status_update",
    content: "Phase 1 complete — 5 files created: types, snapshot hook, stream hook, actions hook, composition hook.",
    acknowledged: false,
    createdAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    messageId: "msg-4",
    fromPeerId: "peer:agent:background_scan",
    toPeerId: "peer:founder:homen",
    messageType: "context_offer",
    content: "Overnight competitive scan: Cursor shipped MCP-native tool marketplace with 120+ verified servers. Relevant to distribution strategy.",
    acknowledged: false,
    createdAt: new Date(Date.now() - 28800_000).toISOString(),
  },
];

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
