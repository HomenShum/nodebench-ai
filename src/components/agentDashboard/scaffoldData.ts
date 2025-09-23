/*
  Static research scaffold and transformer to timeline data for AgentTimeline fallback rendering.
*/

export type ResearchScaffold = typeof researchScaffold;

export type TimelineTask = {
  _id: string;
  name: string;
  status?: string;
  progress?: number; // either 0..1 or 0..100, UI is resilient
  durationMs?: number;
  startOffsetMs?: number;
  agentType?: "orchestrator" | "main" | "leaf";
  parentId?: string;
  icon?: string;
  color?: string;
};

export type TimelineLink = { sourceTaskId: string; targetTaskId: string; type?: string };

export type TimelineData = {
  baseStartMs: number;
  tasks: TimelineTask[];
  links: TimelineLink[];
};

export const researchScaffold = {
  system: {
    name: "Multi-Agent Research Pipeline",
    version: "1.0.0",
    description:
      "Comprehensive fundraising research pipeline with hierarchical agent orchestration",
    totalDuration: 600,
    timeUnit: "seconds",
    executionMode: "hybrid",
    parallelExecutionLimit: 5,
    errorHandling: "retry-with-backoff",
  },
  orchestrator: {
    id: "orchestrator",
    name: "Research Orchestrator",
    type: "orchestrator",
    icon: "🧠",
    color: "#6366F1",
    status: "running",
    startTime: 0,
    duration: 600,
    prompt: {
      objective:
        "Orchestrating a comprehensive fundraising research pipeline for [Company Name]",
      goals: [
        "Target Person: CEO/Founder background, network, and reputation",
        "Company Analysis: Financial health, market position, growth trajectory",
        "Fundraising Strategy: Optimal timing, valuation benchmarks, investor targets",
      ],
      protocol: [
        "Execute person and company research in parallel",
        "Synthesize findings before fundraising analysis",
        "Maintain strict data accuracy standards",
        "Cross-reference all claims with multiple sources",
      ],
      outputFormat: "Structured JSON report with confidence scores",
    },
    capabilities: [
      "Task decomposition",
      "Agent coordination",
      "Resource allocation",
      "Progress monitoring",
      "Error recovery",
      "Result synthesis",
    ],
    config: { maxRetries: 3, timeout: 600, priority: "high", memoryEnabled: true },
  },
  mainAgents: [
    {
      id: "person-research",
      name: "Person Research Agent",
      type: "main",
      icon: "👤",
      color: "#22C55E",
      status: "running",
      startTime: 5,
      duration: 180,
      parallel: true,
      dependencies: [],
      prompt: {},
      expectedOutput: {},
      subAgents: [
        {
          id: "linkedin-scraper",
          name: "LinkedIn Profile Scraper",
          type: "leaf",
          icon: "🔗",
          color: "#0A66C2",
          status: "complete",
          startTime: 10,
          duration: 45,
          progress: 100,
          parentId: "person-research",
        },
        {
          id: "news-scanner",
          name: "News & Media Scanner",
          type: "leaf",
          icon: "📰",
          color: "#FF6B6B",
          status: "running",
          startTime: 10,
          duration: 60,
          progress: 75,
          parentId: "person-research",
        },
        {
          id: "background-analyzer",
          name: "Professional Background Analyzer",
          type: "leaf",
          icon: "📊",
          color: "#4ECDC4",
          status: "running",
          startTime: 60,
          duration: 90,
          progress: 40,
          parentId: "person-research",
        },
      ],
    },
    {
      id: "company-research",
      name: "Company Research Agent",
      type: "main",
      icon: "🏢",
      color: "#FFB800",
      status: "running",
      startTime: 5,
      duration: 200,
      parallel: true,
      dependencies: [],
      prompt: {},
      expectedOutput: {},
      subAgents: [
        {
          id: "financial-collector",
          name: "Financial Data Collector",
          type: "leaf",
          icon: "💰",
          color: "#10B981",
          status: "complete",
          startTime: 10,
          duration: 50,
          progress: 100,
          parentId: "company-research",
        },
        {
          id: "competitor-analysis",
          name: "Competitor Analysis Agent",
          type: "leaf",
          icon: "⚔️",
          color: "#EF4444",
          status: "running",
          startTime: 10,
          duration: 80,
          progress: 60,
          parentId: "company-research",
        },
        {
          id: "product-analyzer",
          name: "Product/Service Analyzer",
          type: "leaf",
          icon: "📦",
          color: "#8B5CF6",
          status: "pending",
          startTime: 70,
          duration: 70,
          progress: 0,
          parentId: "company-research",
        },
        {
          id: "market-position",
          name: "Market Position Evaluator",
          type: "leaf",
          icon: "📈",
          color: "#F59E0B",
          status: "pending",
          startTime: 145,
          duration: 50,
          progress: 0,
          parentId: "company-research",
        },
      ],
    },
    {
      id: "fundraising-analysis",
      name: "Fundraising Analysis Agent",
      type: "main",
      icon: "💎",
      color: "#EC4899",
      status: "pending",
      startTime: 210,
      duration: 150,
      parallel: false,
      dependencies: ["person-research", "company-research"],
      prompt: {},
      expectedOutput: {},
      subAgents: [
        {
          id: "previous-rounds",
          name: "Previous Rounds Analyzer",
          type: "leaf",
          icon: "📑",
          color: "#06B6D4",
          status: "pending",
          startTime: 215,
          duration: 40,
          progress: 0,
          parentId: "fundraising-analysis",
        },
        {
          id: "investor-mapper",
          name: "Investor Network Mapper",
          type: "leaf",
          icon: "🗺️",
          color: "#84CC16",
          status: "pending",
          startTime: 215,
          duration: 60,
          progress: 0,
          parentId: "fundraising-analysis",
        },
        {
          id: "valuation-calc",
          name: "Valuation Calculator",
          type: "leaf",
          icon: "🧮",
          color: "#A855F7",
          status: "pending",
          startTime: 280,
          duration: 70,
          progress: 0,
          parentId: "fundraising-analysis",
        },
      ],
    },
    {
      id: "synthesis",
      name: "Report Synthesis Agent",
      type: "main",
      icon: "📄",
      color: "#64748B",
      status: "pending",
      startTime: 365,
      duration: 100,
      parallel: false,
      dependencies: ["fundraising-analysis"],
      prompt: {},
      expectedOutput: {},
      subAgents: [
        {
          id: "data-consolidation",
          name: "Data Consolidation",
          type: "leaf",
          icon: "🔄",
          color: "#0EA5E9",
          status: "pending",
          startTime: 370,
          duration: 30,
          progress: 0,
          parentId: "synthesis",
        },
        {
          id: "report-generator",
          name: "Report Generator",
          type: "leaf",
          icon: "✍️",
          color: "#F97316",
          status: "pending",
          startTime: 405,
          duration: 50,
          progress: 0,
          parentId: "synthesis",
        },
      ],
    },
  ],
  globalConfig: {},
  executionStats: {
    totalAgents: 15,
    mainAgents: 4,
    leafAgents: 11,
    currentlyRunning: 4,
    completed: 2,
    pending: 9,
    averageCompletionTime: 180,
    successRate: 0.92,
  },
} as const;

export function toTimelineData(scaffold: ResearchScaffold): TimelineData {
  const baseStartMs = Date.now();
  const secToMs = (s: number) => Math.max(0, Math.round(s * 1000));

  const tasks: TimelineTask[] = [];
  const links: TimelineLink[] = [];

  // Orchestrator
  const o = scaffold.orchestrator;
  tasks.push({
    _id: o.id,
    name: o.name,
    status: o.status,
    icon: o.icon,
    color: o.color,
    agentType: "orchestrator",
    startOffsetMs: secToMs(o.startTime ?? 0),
    durationMs: secToMs(o.duration ?? scaffold.system.totalDuration ?? 600),
    progress: undefined,
  });

  // Main agents and their sub-agents
  for (const m of scaffold.mainAgents) {
    tasks.push({
      _id: m.id,
      name: m.name,
      status: (m as any).status ?? "pending",
      icon: (m as any).icon,
      color: (m as any).color,
      agentType: "main",
      startOffsetMs: secToMs((m as any).startTime ?? 0),
      durationMs: secToMs((m as any).duration ?? 60),
      progress: undefined,
    });
    // Dependencies between main agents
    const deps: string[] = (m as any).dependencies ?? [];
    for (const dep of deps) {
      links.push({ sourceTaskId: dep, targetTaskId: m.id });
    }
    // Sub-agents
    const subs: any[] = (m as any).subAgents ?? [];
    for (const s of subs) {
      tasks.push({
        _id: s.id,
        name: s.name,
        status: s.status ?? "pending",
        icon: s.icon,
        color: s.color,
        agentType: "leaf",
        parentId: m.id,
        startOffsetMs: secToMs(s.startTime ?? m.startTime ?? 0),
        durationMs: secToMs(s.duration ?? 30),
        progress:
          typeof s.progress === "number"
            ? s.progress // can be 0..100; UI handles both
            : s.status === "complete"
            ? 100
            : undefined,
      });
    }
  }

  return { baseStartMs, tasks, links };
}

