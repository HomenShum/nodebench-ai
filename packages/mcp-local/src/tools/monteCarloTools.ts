/**
 * monteCarloTools.ts — Monte Carlo Path Simulation for Founder Decisions
 *
 * Generates multiple random paths for insights, assets, decisions, actions,
 * and sequences to help founders foresee possible future outcomes.
 *
 * Each simulation:
 * 1. Takes present context (signals, risks, comparables, metrics)
 * 2. Generates N random paths with probabilistic branching
 * 3. Calculates path payoffs (revenue, market share, risk exposure)
 * 4. Returns average estimate + confidence intervals + best/worst paths
 *
 * Used in: Decision Workbench, Company Profile, Founder Dashboard
 */

import type { McpTool } from "../types.js";

// ── Types ─────────────────────────────────────────────────────────────

interface SimulationInput {
  entity: string;
  currentState: {
    revenue?: number;
    marketShare?: number;
    runway?: number;  // months
    teamSize?: number;
    confidence?: number;
  };
  decisions: Array<{
    name: string;
    options: string[];
    probabilities?: number[];  // probability of each option
  }>;
  timeHorizonMonths: number;
  numPaths: number;
}

interface PathStep {
  month: number;
  decision: string;
  choice: string;
  revenue: number;
  marketShare: number;
  runway: number;
  cumulativePayoff: number;
}

interface SimulationPath {
  pathId: number;
  steps: PathStep[];
  finalPayoff: number;
  finalRevenue: number;
  finalMarketShare: number;
  outcome: "success" | "survival" | "failure";
}

interface SimulationResult {
  entity: string;
  numPaths: number;
  timeHorizonMonths: number;
  averagePayoff: number;
  medianPayoff: number;
  bestPath: SimulationPath;
  worstPath: SimulationPath;
  p10Payoff: number;  // 10th percentile
  p90Payoff: number;  // 90th percentile
  successRate: number;  // % of paths ending in "success"
  survivalRate: number;
  failureRate: number;
  decisionSensitivity: Array<{
    decision: string;
    bestChoice: string;
    avgPayoffDelta: number;
  }>;
  paths: SimulationPath[];
}

// ── Simulation engine ────────────────────────────────────────────────

function runSimulation(input: SimulationInput): SimulationResult {
  const paths: SimulationPath[] = [];

  for (let p = 0; p < input.numPaths; p++) {
    let revenue = input.currentState.revenue ?? 0;
    let marketShare = input.currentState.marketShare ?? 0;
    let runway = input.currentState.runway ?? 18;
    let cumulativePayoff = 0;
    const steps: PathStep[] = [];

    for (let month = 1; month <= input.timeHorizonMonths; month++) {
      // Pick a random decision for this month
      const decisionIdx = month % input.decisions.length;
      const decision = input.decisions[decisionIdx];
      const probs = decision.probabilities ?? decision.options.map(() => 1 / decision.options.length);

      // Weighted random selection
      const rand = Math.random();
      let cumProb = 0;
      let choiceIdx = 0;
      for (let i = 0; i < probs.length; i++) {
        cumProb += probs[i];
        if (rand <= cumProb) { choiceIdx = i; break; }
      }
      const choice = decision.options[choiceIdx];

      // Apply stochastic effects based on choice
      const growthRate = 0.02 + Math.random() * 0.08; // 2-10% monthly growth
      const riskEvent = Math.random() < 0.05; // 5% chance of negative event

      if (choice.toLowerCase().includes("aggressive") || choice.toLowerCase().includes("raise") || choice.toLowerCase().includes("expand")) {
        revenue *= (1 + growthRate * 1.5);
        marketShare += (Math.random() * 0.02);
        runway -= 1.5; // Burns more cash
      } else if (choice.toLowerCase().includes("conservative") || choice.toLowerCase().includes("wait") || choice.toLowerCase().includes("optimize")) {
        revenue *= (1 + growthRate * 0.5);
        marketShare += (Math.random() * 0.005);
        runway -= 0.8;
      } else {
        revenue *= (1 + growthRate);
        marketShare += (Math.random() * 0.01);
        runway -= 1;
      }

      if (riskEvent) {
        revenue *= 0.85; // 15% revenue hit
        runway -= 2;
      }

      // Clamp values
      marketShare = Math.min(1, Math.max(0, marketShare));
      runway = Math.max(0, runway);
      cumulativePayoff = revenue * 12 * marketShare; // Annual revenue × market share

      steps.push({
        month,
        decision: decision.name,
        choice,
        revenue: Math.round(revenue),
        marketShare: Math.round(marketShare * 10000) / 100,
        runway: Math.round(runway * 10) / 10,
        cumulativePayoff: Math.round(cumulativePayoff),
      });
    }

    const finalPayoff = cumulativePayoff;
    const outcome: SimulationPath["outcome"] =
      runway <= 0 ? "failure" :
      revenue > (input.currentState.revenue ?? 0) * 2 ? "success" :
      "survival";

    paths.push({
      pathId: p,
      steps,
      finalPayoff: Math.round(finalPayoff),
      finalRevenue: Math.round(revenue),
      finalMarketShare: Math.round(marketShare * 10000) / 100,
      outcome,
    });
  }

  // Sort by payoff for percentile calculations
  const sorted = [...paths].sort((a, b) => a.finalPayoff - b.finalPayoff);
  const avgPayoff = Math.round(paths.reduce((s, p) => s + p.finalPayoff, 0) / paths.length);
  const medianPayoff = sorted[Math.floor(sorted.length / 2)]?.finalPayoff ?? 0;
  const p10 = sorted[Math.floor(sorted.length * 0.1)]?.finalPayoff ?? 0;
  const p90 = sorted[Math.floor(sorted.length * 0.9)]?.finalPayoff ?? 0;
  const successRate = Math.round((paths.filter(p => p.outcome === "success").length / paths.length) * 100);
  const survivalRate = Math.round((paths.filter(p => p.outcome !== "failure").length / paths.length) * 100);
  const failureRate = 100 - survivalRate;

  // Decision sensitivity: which decision matters most
  const sensitivity = input.decisions.map(d => {
    const byChoice = new Map<string, number[]>();
    for (const path of paths) {
      for (const step of path.steps) {
        if (step.decision === d.name) {
          if (!byChoice.has(step.choice)) byChoice.set(step.choice, []);
          byChoice.get(step.choice)!.push(path.finalPayoff);
        }
      }
    }
    let bestChoice = "";
    let bestAvg = -Infinity;
    for (const [choice, payoffs] of byChoice) {
      const avg = payoffs.reduce((s, v) => s + v, 0) / payoffs.length;
      if (avg > bestAvg) { bestAvg = avg; bestChoice = choice; }
    }
    return { decision: d.name, bestChoice, avgPayoffDelta: Math.round(bestAvg - avgPayoff) };
  });

  return {
    entity: input.entity,
    numPaths: input.numPaths,
    timeHorizonMonths: input.timeHorizonMonths,
    averagePayoff: avgPayoff,
    medianPayoff,
    bestPath: sorted[sorted.length - 1],
    worstPath: sorted[0],
    p10Payoff: p10,
    p90Payoff: p90,
    successRate,
    survivalRate,
    failureRate,
    decisionSensitivity: sensitivity,
    paths: paths.slice(0, 10), // Return top 10 paths for visualization
  };
}

// ── MCP Tools ────────────────────────────────────────────────────────

export const monteCarloTools: McpTool[] = [
  {
    name: "simulate_decision_paths",
    description: "Run Monte Carlo simulation for founder decisions. Generates multiple random paths to visualize possible future outcomes. Shows average payoff, success/failure rates, best/worst paths, and which decisions matter most. Use for: fundraising timing, market entry, build-vs-buy, hiring, pivot analysis.",
    inputSchema: {
      type: "object" as const,
      properties: {
        entity: { type: "string", description: "Company or project name" },
        revenue: { type: "number", description: "Current monthly revenue (USD)" },
        marketShare: { type: "number", description: "Current market share (0-1, e.g., 0.05 = 5%)" },
        runway: { type: "number", description: "Months of runway remaining" },
        decisions: {
          type: "array",
          description: "Key decisions to simulate. Each has a name and options.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              options: { type: "array", items: { type: "string" } },
              probabilities: { type: "array", items: { type: "number" } },
            },
          },
        },
        timeHorizonMonths: { type: "number", description: "How many months to simulate (default: 12)" },
        numPaths: { type: "number", description: "Number of simulation paths (default: 100)" },
      },
      required: ["entity"],
    },
    handler: async (args: Record<string, unknown>) => {
      const entity = String(args.entity ?? "Startup");
      const decisions = (args.decisions as SimulationInput["decisions"]) ?? [
        { name: "Fundraising Strategy", options: ["Raise now (aggressive)", "Wait 6 months (conservative)", "Revenue-fund (bootstrap)"], probabilities: [0.4, 0.35, 0.25] },
        { name: "Market Entry", options: ["Enterprise first", "SMB first", "Developer-led growth"], probabilities: [0.3, 0.3, 0.4] },
        { name: "Team Growth", options: ["Hire aggressively (10+)", "Hire selectively (3-5)", "Stay lean (1-2)"], probabilities: [0.2, 0.5, 0.3] },
      ];

      const result = runSimulation({
        entity,
        currentState: {
          revenue: Number(args.revenue ?? 0),
          marketShare: Number(args.marketShare ?? 0.01),
          runway: Number(args.runway ?? 18),
        },
        decisions,
        timeHorizonMonths: Number(args.timeHorizonMonths ?? 12),
        numPaths: Math.min(Number(args.numPaths ?? 100), 500),
      });

      return {
        summary: {
          entity: result.entity,
          paths: result.numPaths,
          horizon: `${result.timeHorizonMonths} months`,
          averagePayoff: `$${result.averagePayoff.toLocaleString()}`,
          medianPayoff: `$${result.medianPayoff.toLocaleString()}`,
          confidenceInterval: `$${result.p10Payoff.toLocaleString()} – $${result.p90Payoff.toLocaleString()} (80% CI)`,
          successRate: `${result.successRate}%`,
          survivalRate: `${result.survivalRate}%`,
          failureRate: `${result.failureRate}%`,
        },
        bestPath: {
          payoff: `$${result.bestPath.finalPayoff.toLocaleString()}`,
          finalRevenue: `$${result.bestPath.finalRevenue.toLocaleString()}/mo`,
          marketShare: `${result.bestPath.finalMarketShare}%`,
          keyDecisions: result.bestPath.steps.slice(0, 3).map(s => `${s.decision}: ${s.choice}`),
        },
        worstPath: {
          payoff: `$${result.worstPath.finalPayoff.toLocaleString()}`,
          finalRevenue: `$${result.worstPath.finalRevenue.toLocaleString()}/mo`,
          outcome: result.worstPath.outcome,
        },
        decisionSensitivity: result.decisionSensitivity.map(d => ({
          decision: d.decision,
          bestChoice: d.bestChoice,
          impact: d.avgPayoffDelta > 0 ? `+$${d.avgPayoffDelta.toLocaleString()}` : `$${d.avgPayoffDelta.toLocaleString()}`,
        })),
        topPaths: result.paths.slice(0, 5).map(p => ({
          id: p.pathId,
          outcome: p.outcome,
          payoff: p.finalPayoff,
          revenue: p.finalRevenue,
          marketShare: p.finalMarketShare,
        })),
      };
    },
  },
];
