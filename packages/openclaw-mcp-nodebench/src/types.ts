export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: any) => Promise<unknown>;
};

export interface OpenClawQuickRef {
  nextAction: string;
  nextTools: string[];
  methodology: string;
  relatedGotchas?: string[];
  confidence?: "high" | "medium" | "low";
  tip?: string;
}

export interface ToolRegistryEntry {
  name: string;
  category:
    | "sandbox"
    | "session"
    | "proxy"
    | "audit"
    | "workflow_audit"
    | "scaffold"
    | "gotcha";
  tags: string[];
  quickRef: OpenClawQuickRef;
  phase: "configure" | "connect" | "invoke" | "audit" | "scaffold" | "learn";
  complexity: "low" | "medium" | "high";
}

export interface SandboxPolicy {
  id: string;
  policyName: string;
  allowedTools: string[];
  blockedTools: string[];
  maxCalls: number;
  maxDurationMin: number;
  maxConcurrent: number;
  monitoringLevel: "strict" | "standard" | "relaxed";
  forbiddenPatterns: string[];
  requireApproval: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OpenClawSession {
  id: string;
  policyName: string;
  deployment: string;
  sessionLabel: string | null;
  status: "active" | "suspended" | "completed" | "error";
  totalCalls: number;
  violations: number;
  startedAt: string;
  endedAt: string | null;
  endReason: string | null;
}

export interface AuditLogEntry {
  id: string;
  sessionId: string;
  skillName: string;
  args: string | null;
  resultStatus: "success" | "blocked" | "error" | "approval_required";
  violationType: string | null;
  violationDetail: string | null;
  durationMs: number | null;
  justification: string | null;
  createdAt: string;
}

export interface ComplianceGrade {
  grade: "A" | "B" | "C" | "D" | "F";
  score: number;
  dimensions: {
    allowlistAdherence: number;
    budgetUsage: number;
    violationCount: number;
    anomalyDetections: number;
  };
  violations: string[];
  recommendations: string[];
}

export interface SkillRiskProfile {
  skillName: string;
  permissionScope: "narrow" | "moderate" | "broad" | "unrestricted";
  trustScore: number;
  knownVulns: string[];
  lastAudited: string | null;
}

export interface WorkflowAuditResult {
  workflowName: string;
  riskScore: number;
  findings: WorkflowFinding[];
}

export interface WorkflowFinding {
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  fix: string;
}
