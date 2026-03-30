/**
 * Team Roles — role tags for team coordination.
 *
 * Each team member can have 1+ roles. Roles shape:
 * - What delegated messages look like (format/context)
 * - What permissions the receiver's Claude Code agent has
 * - What onboarding steps are suggested for new members
 */

export type TeamRole =
  | "founder"
  | "leader"
  | "builder"
  | "marketer"
  | "researcher"
  | "designer"
  | "operator"
  | "analyst"
  | "sales"
  | "support";

export interface TeamMember {
  peerId: string;
  name: string;
  roles: TeamRole[];
  permissions: TeamPermission[];
  joinedAt: string;
  status: "active" | "idle" | "offline";
}

export type TeamPermission =
  | "read_packets"          // Can see company packets
  | "write_packets"         // Can create/edit packets
  | "delegate_tasks"        // Can assign work to this member's agent
  | "run_commands"          // Can execute commands on their environment
  | "manage_git"            // Can create branches, commit, push
  | "manage_env"            // Can set up environment variables, install deps
  | "view_financials"       // Can see runway, burn, revenue data
  | "admin";                // Full access

/** Default permissions by role */
export const ROLE_PERMISSIONS: Record<TeamRole, TeamPermission[]> = {
  founder: ["read_packets", "write_packets", "delegate_tasks", "run_commands", "manage_git", "manage_env", "view_financials", "admin"],
  leader: ["read_packets", "write_packets", "delegate_tasks", "run_commands", "manage_git", "view_financials"],
  builder: ["read_packets", "write_packets", "run_commands", "manage_git", "manage_env"],
  marketer: ["read_packets", "write_packets", "delegate_tasks"],
  researcher: ["read_packets", "write_packets"],
  designer: ["read_packets", "write_packets"],
  operator: ["read_packets", "write_packets", "delegate_tasks", "run_commands"],
  analyst: ["read_packets", "view_financials"],
  sales: ["read_packets", "delegate_tasks"],
  support: ["read_packets"],
};

/** Role display config */
export const ROLE_CONFIG: Record<TeamRole, { label: string; color: string; icon: string; description: string }> = {
  founder: { label: "Founder", color: "text-[#d97757] bg-[#d97757]/10 border-[#d97757]/20", icon: "crown", description: "Full access. Sets direction, delegates, approves." },
  leader: { label: "Leader", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: "star", description: "Team lead. Can delegate and manage." },
  builder: { label: "Builder", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: "code", description: "Writes code, manages git, sets up environments." },
  marketer: { label: "Marketer", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", icon: "megaphone", description: "Creates content, manages distribution." },
  researcher: { label: "Researcher", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", icon: "search", description: "Researches markets, competitors, trends." },
  designer: { label: "Designer", color: "text-pink-400 bg-pink-500/10 border-pink-500/20", icon: "palette", description: "Designs UI/UX, brand, visual assets." },
  operator: { label: "Operator", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", icon: "settings", description: "Manages ops, infra, deployments." },
  analyst: { label: "Analyst", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20", icon: "chart", description: "Analyzes data, financials, metrics." },
  sales: { label: "Sales", color: "text-green-400 bg-green-500/10 border-green-500/20", icon: "handshake", description: "Manages deals, partnerships, outreach." },
  support: { label: "Support", color: "text-white/40 bg-white/5 border-white/10", icon: "headset", description: "Handles support, feedback, docs." },
};

/** Shape a delegation message based on receiver's roles */
export function shapeDelegationForRole(
  roles: TeamRole[],
  task: string,
  context: string,
): { formattedTask: string; suggestedTools: string[]; onboardingSteps?: string[] } {
  const isNewBuilder = roles.includes("builder") && !roles.includes("founder");
  const isNonTechnical = roles.every((r) => ["marketer", "sales", "support", "analyst"].includes(r));

  let formattedTask = task;
  const suggestedTools: string[] = [];
  let onboardingSteps: string[] | undefined;

  if (isNewBuilder) {
    formattedTask = `[BUILDER TASK] ${task}\n\nContext: ${context}\n\nThis person is a builder — they can run commands and manage git. Frame the task as clear implementation steps.`;
    suggestedTools.push("manage_git", "run_commands", "manage_env");
    onboardingSteps = [
      "Ensure git is installed and configured",
      "Clone the repository",
      "Create a new branch for this task",
      "Install dependencies (npm install)",
      "Run the dev server to verify setup",
    ];
  } else if (isNonTechnical) {
    formattedTask = `[NON-TECHNICAL TASK] ${task}\n\nContext: ${context}\n\nThis person is non-technical — avoid code jargon. Frame the task as clear business actions with expected outcomes.`;
    suggestedTools.push("read_packets", "write_packets");
  } else {
    formattedTask = `[TASK] ${task}\n\nContext: ${context}`;
  }

  return { formattedTask, suggestedTools, onboardingSteps };
}

/** Check if a sender has permission to delegate to a receiver */
export function canDelegate(
  senderRoles: TeamRole[],
  receiverPermissions: TeamPermission[],
  action: TeamPermission,
): boolean {
  // Founders and leaders can always delegate
  if (senderRoles.includes("founder") || senderRoles.includes("leader")) {
    return receiverPermissions.includes(action);
  }
  // Others can only delegate read_packets and write_packets
  return action === "read_packets" || action === "write_packets";
}
