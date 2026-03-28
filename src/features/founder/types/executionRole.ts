/**
 * ExecutionRolePacket — The contract between NodeBench (intelligence) and
 * Paperclip/runtime (execution). NodeBench decides WHAT kind of agent is needed,
 * what tools it gets, and what output it should produce.
 *
 * See: docs/architecture/FOUNDER_CYCLE_ARCHITECTURE.md
 */

export type WorkType = "research" | "implementation" | "review" | "monitoring" | "delegation";
export type OutputType = "memo" | "brief" | "diff" | "evidence_table" | "action_list" | "change_review" | "delegation_packet";

export interface ExecutionRolePacket {
  roleId: string;
  roleName: string;
  workType: WorkType;
  /** nodebench-mcp preset to load (researcher, founder, web_dev, etc.) */
  recommendedPreset: string;
  /** Specific MCP domains to load beyond the preset */
  toolDomains: string[];
  /** The artifact packet providing context for this role */
  packetContext: {
    packetId: string;
    objective: string;
    entityName?: string;
    constraints: string[];
    successCriteria: string[];
    evidenceRefs: string[];
  };
  outputType: OutputType;
  budgetPolicy: {
    monthlyUsd: number;
    approvalRequired: boolean;
  };
  escalationRules: string[];
}

/** 3 initial execution roles */
export const EXECUTION_ROLES: Record<string, Omit<ExecutionRolePacket, "packetContext">> = {
  research_analyst: {
    roleId: "research_analyst",
    roleName: "Research Analyst",
    workType: "research",
    recommendedPreset: "researcher",
    toolDomains: ["recon", "web", "learning", "entity_enrichment", "web_scraping"],
    outputType: "brief",
    budgetPolicy: { monthlyUsd: 30, approvalRequired: false },
    escalationRules: ["escalate if confidence < 0.4", "escalate if contradictions > 3"],
  },
  builder: {
    roleId: "builder",
    roleName: "Builder / Implementer",
    workType: "implementation",
    recommendedPreset: "founder",
    toolDomains: ["founder", "local_dashboard", "git_workflow", "boilerplate", "quality_gate"],
    outputType: "diff",
    budgetPolicy: { monthlyUsd: 50, approvalRequired: true },
    escalationRules: ["escalate if tests fail after 3 attempts", "escalate if scope exceeds 10 files"],
  },
  operator: {
    roleId: "operator",
    roleName: "Operator / Reviewer",
    workType: "review",
    recommendedPreset: "default",
    toolDomains: ["verification", "eval", "dogfood_judge", "observability"],
    outputType: "change_review",
    budgetPolicy: { monthlyUsd: 20, approvalRequired: false },
    escalationRules: ["escalate if score drops > 10%", "escalate if P0 found"],
  },
};

/**
 * Classify a work request into the right execution role.
 * Used by NodeBench to decide which agent type + tool bundle to assign.
 */
export function classifyWorkType(query: string): WorkType {
  const q = query.toLowerCase();
  if (q.includes("implement") || q.includes("build") || q.includes("fix") || q.includes("refactor")) return "implementation";
  if (q.includes("review") || q.includes("audit") || q.includes("check") || q.includes("verify")) return "review";
  if (q.includes("monitor") || q.includes("watch") || q.includes("track") || q.includes("alert")) return "monitoring";
  if (q.includes("delegate") || q.includes("assign") || q.includes("hand off")) return "delegation";
  return "research";
}

export function selectRole(workType: WorkType): ExecutionRolePacket["roleId"] {
  switch (workType) {
    case "implementation": return "builder";
    case "review": case "monitoring": return "operator";
    case "delegation": return "builder";
    default: return "research_analyst";
  }
}

export function buildExecutionRolePacket(
  roleId: string,
  packet: ExecutionRolePacket["packetContext"],
): ExecutionRolePacket {
  const role = EXECUTION_ROLES[roleId];
  if (!role) throw new Error(`Unknown role: ${roleId}`);
  return { ...role, packetContext: packet };
}
