export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: any) => Promise<unknown>;
};

export interface ConvexQuickRef {
  nextAction: string;
  nextTools: string[];
  methodology: string;
  relatedGotchas: string[];
  confidence: "high" | "medium" | "low";
}

export interface ToolRegistryEntry {
  name: string;
  category: "schema" | "function" | "deployment" | "learning" | "methodology" | "integration";
  tags: string[];
  quickRef: ConvexQuickRef;
  phase: "audit" | "implement" | "test" | "deploy" | "learn" | "meta";
  complexity: "low" | "medium" | "high";
}

export interface SchemaIssue {
  severity: "critical" | "warning" | "info";
  location: string;
  message: string;
  fix: string;
  gotchaKey?: string;
}

export interface FunctionIssue {
  severity: "critical" | "warning" | "info";
  location: string;
  functionName: string;
  message: string;
  fix: string;
}

export interface DeployGateResult {
  passed: boolean;
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  blockers: string[];
}
