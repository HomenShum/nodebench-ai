import { Id } from "../../_generated/dataModel";

export type AgentStateContext = {
  userId?: Id<"users"> | string;
  selectedDocumentId?: Id<"documents"> | string | undefined;
  mcpServerId?: Id<"mcpServers"> | string | undefined;
  model?: "openai" | "gemini";
  message?: string;
  openaiVariant?: "gpt-5-nano" | "gpt-5-mini";
  uiSummary?: string;
  threadId?: string;
  runId?: Id<"agentRuns"> | string;
};

export interface ThinkingStep {
  id: string;
  type: "analysis" | "planning" | "tool_selection" | "execution" | "evaluation" | "adaptation";
  content: string;
  timestamp: number;
  metadata?: any;
}

export interface ToolCall {
  id: string;
  toolName: string;
  reasoning: string;
  input: any;
  output: any;
  success: boolean;
  timestamp: number;
}

export interface Adaptation {
  id: string;
  trigger: string;
  decision: string;
  action: string;
  timestamp: number;
}

export interface AgentResponse {
  finalResponse: string;
  thinkingSteps: ThinkingStep[];
  toolCalls: ToolCall[];
  adaptations: Adaptation[];
  candidateDocs?: any[];
  pmOperations?: any[];
  planExplain?: string;
  plan?: any;
  runId?: string;
}

export interface AgentState {
  thinkingSteps: ThinkingStep[];
  toolCalls: ToolCall[];
  adaptations: Adaptation[];
  context: AgentStateContext & {
    userId: Id<"users">;
    model: "openai" | "gemini";
    message: string;
    selectedDocumentId?: Id<"documents">;
    mcpServerId?: Id<"mcpServers">;
    openaiVariant?: "gpt-5-nano" | "gpt-5-mini";
    uiSummary?: string;
    threadId?: string;
    runId?: Id<"agentRuns">;
  };
}

