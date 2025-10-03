// agents/data/productionMocks.ts
// Production-ready mock multi-agent runs for Agent Dashboard
// Each scenario demonstrates different coordination patterns, agent types, and execution states

export type AgentKind =
  | "orchestrator"
  | "main"
  | "web_researcher"
  | "content_generator"
  | "validator"
  | "code_executor"
  | "reviewer"
  | "synthesizer";

export type TaskState = "pending" | "running" | "ok" | "failed" | "skipped";

export interface TaskMock {
  id: string;
  title: string;
  agentKind: AgentKind;
  parentId?: string;            // for hierarchy pane
  startOffsetMs: number;        // baseStartMs + offset = absolute start
  durationMs: number;
  state: TaskState;
  metrics?: { tokensIn?: number; tokensOut?: number; costUSD?: number; latencyMs?: number };
  retryOffsetsMs?: number[];
  failureOffsetMs?: number;
  phase?: string;
  artifacts?: Record<string, string>; // e.g., { md: "…", json: "…" }
}

export interface LinkMock {
  from: string;
  to: string;
}

export interface RunMock {
  timelineId: string;
  label: string;
  goal: string;
  mode: "research" | "analysis" | "inference";
  coordination: "subagent" | "multiAgent";
  baseStartMs: number;
  tasks: TaskMock[];
  links: LinkMock[];
}

export const productionMocks: RunMock[] = [
  {
    timelineId: "run.research.symbolica",
    label: "Research: George Morgan • Symbolica AI • Fundraising",
    goal: "Research George Morgan, Symbolica AI, and fundraising; synthesize + validate.",
    mode: "research",
    coordination: "subagent",
    baseStartMs: 0,
    tasks: [
      { id: "root", title: "UnifiedOrchestrator", agentKind: "orchestrator", startOffsetMs: 0, durationMs: 800, state: "ok", phase: "Plan" },

      { id: "main.person",  title: "Main: Person Research",  agentKind: "main", parentId: "root", startOffsetMs: 800,  durationMs: 400, state: "ok" },
      { id: "main.company", title: "Main: Company Research", agentKind: "main", parentId: "root", startOffsetMs: 800,  durationMs: 400, state: "ok" },
      { id: "main.rounds",  title: "Main: Fundraising",      agentKind: "main", parentId: "root", startOffsetMs: 800,  durationMs: 400, state: "ok" },

      { id: "leaf.person",  title: "Web Search: George Morgan",   agentKind: "web_researcher",  parentId: "main.person",  startOffsetMs: 1200, durationMs: 6500, state: "ok",
        metrics: { tokensIn: 1200, tokensOut: 420, costUSD: 0.018, latencyMs: 6200 } },
      { id: "leaf.company", title: "Web Search: Symbolica AI",    agentKind: "web_researcher",  parentId: "main.company", startOffsetMs: 1200, durationMs: 6100, state: "ok",
        metrics: { tokensIn: 1100, tokensOut: 380, costUSD: 0.017, latencyMs: 5900 } },
      { id: "leaf.rounds",  title: "Web Search: Fundraising",     agentKind: "web_researcher",  parentId: "main.rounds",  startOffsetMs: 1200, durationMs: 6400, state: "ok",
        metrics: { tokensIn: 1150, tokensOut: 410, costUSD: 0.018, latencyMs: 6100 } },

      { id: "synth", title: "Synthesis Report", agentKind: "content_generator", parentId: "root",
        startOffsetMs: 7700, durationMs: 3800, state: "ok",
        metrics: { tokensIn: 2100, tokensOut: 900, costUSD: 0.026, latencyMs: 3500 },
        artifacts: { md: "## Summary\n- Person: George Morgan, CEO of Symbolica AI\n- Company: Symbolica AI - symbolic AI research\n- Funding: Series A targeting $15M\n\n### Sources\n- TechCrunch, LinkedIn, Crunchbase" } },

      { id: "validate", title: "Validator: Fact Check & Hallucination Scan", agentKind: "validator", parentId: "root",
        startOffsetMs: 11600, durationMs: 2600, state: "ok",
        metrics: { tokensIn: 900, tokensOut: 180, costUSD: 0.009, latencyMs: 2400 },
        artifacts: { json: "{\"verdict\":\"VERIFIED\",\"confidence\":0.82,\"redFlags\":[]}" } }
    ],
    links: [
      { from: "leaf.person",  to: "synth" },
      { from: "leaf.company", to: "synth" },
      { from: "leaf.rounds",  to: "synth" },
      { from: "synth",        to: "validate" }
    ]
  },

  {
    timelineId: "run.multi.consensus.email",
    label: "Multi-Agent Consensus: Outreach Email",
    goal: "Draft a concise outreach email; two peers propose, reviewer scores, synthesizer merges.",
    mode: "analysis",
    coordination: "multiAgent",
    baseStartMs: 0,
    tasks: [
      { id: "root", title: "UnifiedOrchestrator", agentKind: "orchestrator", startOffsetMs: 0, durationMs: 600, state: "ok", phase: "Plan" },

      { id: "peerA", title: "Peer A: Draft Proposal", agentKind: "content_generator", parentId: "root",
        startOffsetMs: 600, durationMs: 2200, state: "ok",
        metrics: { tokensIn: 300, tokensOut: 250, costUSD: 0.006, latencyMs: 2000 },
        artifacts: { md: "Subject: Introduction to Symbolica AI\n\nHi [Name],\n\nI came across your work in AI research and thought you'd be interested in Symbolica AI's approach to symbolic reasoning...\n\nBest,\nGeorge" } },

      { id: "peerB", title: "Peer B: Draft Proposal", agentKind: "content_generator", parentId: "root",
        startOffsetMs: 600, durationMs: 2300, state: "ok",
        metrics: { tokensIn: 320, tokensOut: 240, costUSD: 0.006, latencyMs: 2100 },
        artifacts: { md: "Subject: Quick note about Symbolica\n\nHi [Name],\n\nQuick intro - I'm building Symbolica AI, combining symbolic and neural approaches. Would love to chat about potential collaboration...\n\nCheers,\nGeorge" } },

      { id: "review", title: "Reviewer: Score & Comments", agentKind: "reviewer", parentId: "root",
        startOffsetMs: 2900, durationMs: 1600, state: "ok",
        metrics: { tokensIn: 500, tokensOut: 120, costUSD: 0.005, latencyMs: 1500 },
        artifacts: { json: "{\"peerA\":0.78,\"peerB\":0.84,\"notes\":\"Prefer B's casual tone; keep A's structure and detail.\"}" } },

      { id: "merge", title: "Synthesizer: Consensus Email", agentKind: "synthesizer", parentId: "root",
        startOffsetMs: 4500, durationMs: 1800, state: "ok",
        metrics: { tokensIn: 650, tokensOut: 200, costUSD: 0.007, latencyMs: 1700 },
        artifacts: { md: "Subject: Quick intro — Symbolica AI\n\nHi [Name],\n\nI came across your work in AI research and thought you'd be interested in Symbolica AI's approach combining symbolic and neural reasoning.\n\nWould love to chat about potential collaboration.\n\nBest,\nGeorge" } }
    ],
    links: [
      { from: "peerA", to: "review" },
      { from: "peerB", to: "review" },
      { from: "review", to: "merge" }
    ]
  },

  {
    timelineId: "run.analysis.phishing",
    label: "Cybersecurity: Phishing Risk Analysis",
    goal: "Analyze suspicious email and compute risk score; output ALLOW/WARN/BLOCK.",
    mode: "analysis",
    coordination: "subagent",
    baseStartMs: 0,
    tasks: [
      { id: "root", title: "UnifiedOrchestrator", agentKind: "orchestrator", startOffsetMs: 0, durationMs: 700, state: "ok", phase: "Plan" },

      { id: "gather", title: "Web Research: Domain Intel", agentKind: "web_researcher", parentId: "root",
        startOffsetMs: 700, durationMs: 4800, state: "ok",
        metrics: { tokensIn: 900, tokensOut: 260, costUSD: 0.014, latencyMs: 4500 } },

      { id: "calc", title: "Code Exec: Risk Formula", agentKind: "code_executor", parentId: "root",
        startOffsetMs: 5500, durationMs: 1800, state: "ok",
        metrics: { tokensIn: 120, tokensOut: 40, costUSD: 0.001, latencyMs: 1600 },
        artifacts: { json: "{\"domain_risk\":0.7,\"urgency\":0.2,\"link\":0.3,\"score\":0.64}" } },

      { id: "report", title: "Content: Threat Report", agentKind: "content_generator", parentId: "root",
        startOffsetMs: 7300, durationMs: 1700, state: "ok",
        artifacts: { md: "## Phishing Assessment\nScore: 0.64 → **WARN**\n\nRationale:\n- Domain registered 3 days ago\n- Urgency language detected\n- Suspicious link pattern\n\nRecommendation: Flag for manual review" } },

      { id: "check", title: "Validator: Sanity & Sources", agentKind: "validator", parentId: "root",
        startOffsetMs: 9000, durationMs: 1500, state: "ok",
        artifacts: { json: "{\"verdict\":\"VERIFIED\",\"confidence\":0.76}" } }
    ],
    links: [
      { from: "gather", to: "calc" },
      { from: "calc", to: "report" },
      { from: "report", to: "check" }
    ]
  },

  {
    timelineId: "run.research.laundry-folding",
    label: "Robotics (Sim): Laundry Folding Policy Loop",
    goal: "Simulate fold sequence with retries; on failure, update policy constraints.",
    mode: "research",
    coordination: "subagent",
    baseStartMs: 0,
    tasks: [
      { id: "root", title: "UnifiedOrchestrator", agentKind: "orchestrator", startOffsetMs: 0, durationMs: 700, state: "ok", phase: "Plan" },

      { id: "vision", title: "Web Research: Vision Hints", agentKind: "web_researcher", parentId: "root",
        startOffsetMs: 700, durationMs: 3000, state: "ok" },

      { id: "motor", title: "Code Exec: Motor Control (fold step)", agentKind: "code_executor", parentId: "root",
        startOffsetMs: 3700, durationMs: 4200, state: "failed", failureOffsetMs: 7600,
        retryOffsetsMs: [5200, 6500],
        metrics: { latencyMs: 4000 } },

      { id: "validator", title: "Validator: Perception Feedback", agentKind: "validator", parentId: "root",
        startOffsetMs: 7900, durationMs: 1500, state: "ok",
        artifacts: { json: "{\"verdict\":\"FAILED\",\"confidence\":0.61,\"constraints\":{\"mustFollow\":[\"grasp at edge\"],\"disallow\":[\"center grasp\"]}}" } },

      { id: "policy", title: "Policy Update: Folding Constraints", agentKind: "validator", parentId: "root",
        startOffsetMs: 9400, durationMs: 900, state: "ok",
        artifacts: { json: "{\"policyUpdated\":true}" } },

      { id: "summary", title: "Content: Failure Analysis & Next Steps", agentKind: "content_generator", parentId: "root",
        startOffsetMs: 10300, durationMs: 1600, state: "ok",
        artifacts: { md: "### Outcome\n- Step failed after 2 retries.\n- Updated policy: grasp at edge; avoid center.\n- Next run scheduled with updated constraints." } }
    ],
    links: [
      { from: "vision", to: "motor" },
      { from: "motor", to: "validator" },
      { from: "validator", to: "policy" },
      { from: "policy", to: "summary" }
    ]
  }
];

/**
 * Get a specific mock by timelineId
 */
export function getMockById(timelineId: string): RunMock | undefined {
  return productionMocks.find(m => m.timelineId === timelineId);
}

/**
 * Get all mocks of a specific mode
 */
export function getMocksByMode(mode: "research" | "analysis" | "inference"): RunMock[] {
  return productionMocks.filter(m => m.mode === mode);
}

/**
 * Get all mocks with a specific coordination pattern
 */
export function getMocksByCoordination(coordination: "subagent" | "multiAgent"): RunMock[] {
  return productionMocks.filter(m => m.coordination === coordination);
}

