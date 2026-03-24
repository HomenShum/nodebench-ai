/**
 * searchTypes.ts — Shared types for the search-first intelligence workspace.
 *
 * Lens system: same entity + different user context = different packet shape.
 * ResultPacket: canonical structure for entity intelligence results.
 */

/* ─── Lens System ────────────────────────────────────────────────────────── */

export type LensId = "founder" | "investor" | "banker" | "ceo" | "legal" | "student";

export interface LensConfig {
  id: LensId;
  label: string;
  description: string;
  /** Section ordering priority for this lens (higher = shown first) */
  sectionPriority: Record<string, number>;
}

export const LENSES: LensConfig[] = [
  {
    id: "founder",
    label: "Founder",
    description: "Competitive timing, market positioning, build-vs-buy",
    sectionPriority: { signals: 10, changes: 9, comparables: 8, risks: 7, truth: 6 },
  },
  {
    id: "investor",
    label: "Investor",
    description: "Growth signals, momentum, comparables, funding timing",
    sectionPriority: { truth: 10, signals: 9, comparables: 8, risks: 7, changes: 6 },
  },
  {
    id: "banker",
    label: "Banker",
    description: "Deal relevance, financial implications, relationship angles",
    sectionPriority: { truth: 10, risks: 9, comparables: 8, signals: 7, changes: 6 },
  },
  {
    id: "ceo",
    label: "CEO",
    description: "Strategic positioning, resource allocation, board narrative",
    sectionPriority: { changes: 10, signals: 9, truth: 8, risks: 7, comparables: 6 },
  },
  {
    id: "legal",
    label: "Legal",
    description: "Regulatory exposure, disputes, data handling, governance",
    sectionPriority: { risks: 10, truth: 9, changes: 8, signals: 7, comparables: 6 },
  },
  {
    id: "student",
    label: "Student",
    description: "Simplified timeline, concept explanations, source-backed summaries",
    sectionPriority: { truth: 10, changes: 9, signals: 8, comparables: 7, risks: 6 },
  },
];

/* ─── Result Packet ──────────────────────────────────────────────────────── */

export interface ResultVariable {
  rank: number;
  name: string;
  direction: "up" | "down" | "neutral";
  impact: "high" | "medium" | "low";
}

export interface ResultChange {
  description: string;
  date?: string;
}

export interface ResultRisk {
  title: string;
  description: string;
  falsification?: string;
}

export interface ResultComparable {
  name: string;
  relevance: "high" | "medium" | "low";
  note: string;
}

export interface ResultMetric {
  label: string;
  value: string;
}

export interface ResultScenario {
  label: string;
  probability: number;
  outcome: string;
}

export interface ResultIntervention {
  action: string;
  impact: "high" | "medium" | "low";
}

export interface ResultPacket {
  /** The user's original query */
  query: string;
  /** Resolved entity name */
  entityName: string;
  /** Executive summary / answer */
  answer: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Number of sources consulted */
  sourceCount: number;
  /** Top ranked variables */
  variables: ResultVariable[];
  /** Key metrics inline */
  keyMetrics?: ResultMetric[];
  /** Material changes */
  changes?: ResultChange[];
  /** Risks and contradictions */
  risks?: ResultRisk[];
  /** Comparable entities */
  comparables?: ResultComparable[];
  /** Scenario branches */
  scenarios?: ResultScenario[];
  /** Recommended next actions */
  interventions?: ResultIntervention[];
  /** Follow-up questions */
  nextQuestions?: string[];
}

/* ─── Example Prompts ────────────────────────────────────────────────────── */

export interface ExamplePrompt {
  text: string;
  lens: LensId;
  category: "search" | "analyze" | "monitor" | "delegate";
}

export const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    text: "Generate my founder weekly reset — what changed, main contradiction, next 3 moves",
    lens: "founder",
    category: "analyze",
  },
  {
    text: "Analyze Anthropic's competitive position in the foundation model market",
    lens: "investor",
    category: "search",
  },
  {
    text: "What changed in AI commerce strategy for Shopify, Amazon, and Google this quarter?",
    lens: "ceo",
    category: "monitor",
  },
  {
    text: "Build a diligence memo on this Series B startup from these meeting notes",
    lens: "banker",
    category: "analyze",
  },
];

/* ─── Demo Result Packets ────────────────────────────────────────────────── */

export const DEMO_PACKETS: Record<string, ResultPacket> = {
  anthropic: {
    query: "Analyze Anthropic's competitive position in the foundation model market",
    entityName: "Anthropic",
    answer:
      "Anthropic holds a strong #2 position in the foundation model market behind OpenAI, with differentiated safety research creating a defensible moat. Their enterprise-first approach via Amazon Bedrock gives them distribution advantages that Meta (open-source) and Google (integration-heavy) lack. The key risk is a potential price war as inference costs drop 10x/year.",
    confidence: 82,
    sourceCount: 23,
    variables: [
      { rank: 1, name: "Enterprise distribution via AWS Bedrock", direction: "up", impact: "high" },
      { rank: 2, name: "Safety research moat depth", direction: "up", impact: "high" },
      { rank: 3, name: "Developer mindshare vs OpenAI", direction: "up", impact: "medium" },
      { rank: 4, name: "Inference cost trajectory", direction: "down", impact: "medium" },
      { rank: 5, name: "Open-source competitive pressure", direction: "down", impact: "low" },
    ],
    keyMetrics: [
      { label: "Valuation", value: "$61.5B" },
      { label: "ARR est.", value: "$2B+" },
      { label: "Model family", value: "Claude 4.x" },
      { label: "Enterprise clients", value: "10K+" },
    ],
    changes: [
      { description: "Claude 4.5 Sonnet launched with state-of-the-art coding benchmarks", date: "Feb 2025" },
      { description: "Amazon investment expanded to $8B total, deepening Bedrock integration", date: "Jan 2025" },
      { description: "MCP protocol gaining ecosystem adoption — 50K+ GitHub stars", date: "Mar 2025" },
    ],
    risks: [
      {
        title: "OpenAI pricing pressure",
        description: "GPT-4o mini at $0.15/1M tokens is 10x cheaper than Claude equivalents. If Anthropic can't match on price, enterprise migration accelerates.",
        falsification: "Track enterprise contract renewals Q2-Q3. If churn > 5%, pricing thesis fails.",
      },
      {
        title: "Open-source catch-up",
        description: "Meta's Llama 4 and Mistral's latest models are narrowing the capability gap. If open-source reaches 90% parity, the premium model business faces compression.",
        falsification: "Monitor LMSYS leaderboard rankings monthly. If open-source enters top-3 consistently, the moat weakens.",
      },
    ],
    comparables: [
      { name: "OpenAI", relevance: "high", note: "Market leader, consumer + enterprise, $157B valuation" },
      { name: "Google DeepMind", relevance: "high", note: "Deepest research bench, integrated into Google Cloud" },
      { name: "Meta AI", relevance: "medium", note: "Open-source strategy, massive compute budget, no direct revenue" },
      { name: "Mistral", relevance: "medium", note: "European champion, efficient models, growing enterprise traction" },
    ],
    scenarios: [
      { label: "Base", probability: 50, outcome: "Maintains #2 position, $4B+ ARR by 2026, strong enterprise lock-in" },
      { label: "Bull", probability: 25, outcome: "Safety regulation advantages create moat, IPO at $100B+" },
      { label: "Bear", probability: 25, outcome: "Price war compresses margins, open-source closes gap, valuation corrects" },
    ],
    interventions: [
      { action: "Track Q2 enterprise renewal rates for pricing signal", impact: "high" },
      { action: "Monitor MCP ecosystem adoption as distribution moat indicator", impact: "medium" },
      { action: "Watch Llama 4 benchmark results for open-source parity signal", impact: "medium" },
    ],
    nextQuestions: [
      "How does Anthropic's MCP protocol compare to OpenAI's function calling ecosystem?",
      "What's the enterprise switching cost from OpenAI to Anthropic via Bedrock?",
      "Which verticals show strongest Anthropic adoption vs OpenAI?",
      "How does the safety regulatory landscape benefit Anthropic specifically?",
    ],
  },
  shopify: {
    query: "What changed in AI commerce strategy for Shopify, Amazon, and Google this quarter?",
    entityName: "Shopify",
    answer:
      "Shopify is accelerating its AI commerce strategy by embedding AI across the merchant stack — from product generation to customer support to fulfillment optimization. Their 2025 full-year revenue grew 30% with 17% free cash flow margin, proving the builder-first model scales. Amazon is integrating AI into search and advertising, while Google is pushing Shopping Graph + Gemini for product discovery.",
    confidence: 76,
    sourceCount: 18,
    variables: [
      { rank: 1, name: "Shopify AI product suite expansion", direction: "up", impact: "high" },
      { rank: 2, name: "Merchant developer ecosystem health", direction: "up", impact: "high" },
      { rank: 3, name: "Amazon AI advertising integration", direction: "up", impact: "medium" },
      { rank: 4, name: "Google Shopping Graph + Gemini", direction: "up", impact: "medium" },
      { rank: 5, name: "Regulatory pressure on AI-generated product content", direction: "neutral", impact: "low" },
    ],
    keyMetrics: [
      { label: "Revenue growth", value: "30% YoY" },
      { label: "FCF margin", value: "17%" },
      { label: "GMV", value: "$270B+" },
      { label: "Merchants", value: "4.6M+" },
    ],
    changes: [
      { description: "Shopify launched Sidekick AI assistant for merchants across all plan tiers", date: "Q1 2025" },
      { description: "Amazon embedded AI-generated product listings in Seller Central", date: "Q4 2024" },
      { description: "Google unified Shopping Graph with Gemini for conversational product discovery", date: "Q1 2025" },
    ],
    risks: [
      {
        title: "AI-generated content quality and trust",
        description: "Merchants using AI to generate product descriptions at scale may erode buyer trust if quality control is insufficient.",
        falsification: "Track buyer return rates on AI-generated listings vs human-written. If returns increase > 10%, the automation thesis weakens.",
      },
      {
        title: "Platform lock-in through AI dependency",
        description: "As merchants rely more on platform-native AI tools, switching costs increase — which benefits incumbents but may trigger regulatory scrutiny.",
        falsification: "Monitor EU Digital Markets Act enforcement actions against AI-driven lock-in patterns.",
      },
    ],
    comparables: [
      { name: "Amazon", relevance: "high", note: "Largest marketplace, AI in ads + fulfillment + listing generation" },
      { name: "Google", relevance: "high", note: "Shopping Graph + Gemini, discovery layer, no direct commerce" },
      { name: "BigCommerce", relevance: "medium", note: "Enterprise-focused alternative, slower AI adoption" },
    ],
    nextQuestions: [
      "How does Shopify's AI merchant toolkit compare to Amazon's Seller Central AI?",
      "What percentage of Shopify merchants actively use AI features?",
      "How is Google's Shopping Graph changing product discovery away from search?",
      "What AI governance frameworks apply to automated product content at scale?",
    ],
  },
  nodebench: {
    query: "Use everything from my recent NodeBench work this week to generate my founder weekly reset",
    entityName: "NodeBench",
    answer:
      "NodeBench is the local-first operating-memory and entity-context layer for agent-native businesses. This week: shipped search-first AI app redesign (8-section result workspace with 6 role lenses), completed Phase 14 tool decoupling (338 tools, lazy-loading, 10 focused modules), and defined the canonical dogfood runbook. The strongest contradiction: product implementation is racing ahead across many surfaces, but the first three habits (weekly reset, pre-delegation packet, important-change review) still need to be the crystal-clear prove-first loop.",
    confidence: 91,
    sourceCount: 42,
    variables: [
      { rank: 1, name: "Search-first app redesign shipped", direction: "up", impact: "high" },
      { rank: 2, name: "Public narrative lags internal thesis", direction: "down", impact: "high" },
      { rank: 3, name: "338 tools with lazy-loading and persona presets", direction: "up", impact: "medium" },
      { rank: 4, name: "Dogfood runbook codified (13 scenarios)", direction: "up", impact: "medium" },
      { rank: 5, name: "Supermemory competitor signal in memory/context space", direction: "down", impact: "low" },
    ],
    keyMetrics: [
      { label: "MCP tools", value: "338" },
      { label: "Role lenses", value: "6" },
      { label: "Dogfood scenarios", value: "13" },
      { label: "Tests passing", value: "1,510+" },
    ],
    changes: [
      { description: "AI App redesigned to search-first canvas with inline 8-section result workspace", date: "Mar 23" },
      { description: "Phase 14: tool decoupling with dynamic imports, localFileTools split into 10 modules", date: "Mar 23" },
      { description: "Canonical dogfood runbook v1 codified with 13 scenarios and telemetry schema", date: "Mar 23" },
      { description: "Public homepage OG tags updated to entity intelligence positioning", date: "Mar 23" },
    ],
    risks: [
      {
        title: "Surface proliferation before habit proof",
        description: "13 founder surfaces, 338 tools, 6 lenses — but the 3 core habits (weekly reset, pre-delegation, important-change review) are not yet proven in production use.",
        falsification: "Run 3 complete dogfood cycles. If packet reuse rate < 30% or repeat-question rate > 40%, the habit loop is not working.",
      },
      {
        title: "Public narrative drift",
        description: "Internal thesis is sharp (local-first operating memory + entity context + artifact restructuring) but public surfaces still lag. Homepage, package docs, and onboarding do not yet tell this story.",
        falsification: "Run MCP-06 public-doc drift detection. If > 3 mismatches found, narrative unification is P0.",
      },
    ],
    comparables: [
      { name: "Supermemory", relevance: "high", note: "Universal memory / context infrastructure, MCP distribution, MemoryBench" },
      { name: "Perplexity", relevance: "medium", note: "Artifact-first search, citation model — UX reference for result pages" },
      { name: "PitchBook", relevance: "medium", note: "Entity intelligence for finance — simplicity and search-first reference" },
      { name: "Linear", relevance: "low", note: "Speed-as-feature, opinionated defaults — interaction quality reference" },
    ],
    nextQuestions: [
      "What's the packet reuse rate after 3 founder weekly resets?",
      "Does the public-doc drift detection scenario catch all known mismatches?",
      "What's the repeat-question rate across the first 13 dogfood scenarios?",
      "Is the banker Anthropic search producing live data or falling back to demo?",
    ],
  },
};
