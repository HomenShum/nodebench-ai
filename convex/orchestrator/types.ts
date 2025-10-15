/**
 * Orchestrator Types
 * 
 * Type definitions for the multi-agent orchestration system
 */

import type { Id } from "../_generated/dataModel";

/**
 * Query complexity classification
 */
export type QueryComplexity = "simple" | "complex";

/**
 * Agent domain specialization
 */
export type AgentDomain = 
  | "document"
  | "media" 
  | "task"
  | "event"
  | "web"
  | "general";

/**
 * Task decomposition step
 */
export interface TaskStep {
  id: string;
  domain: AgentDomain;
  action: string;
  description: string;
  dependencies: string[]; // IDs of steps that must complete first
  args?: Record<string, any>;
}

/**
 * Execution plan from orchestrator
 */
export interface ExecutionPlan {
  complexity: QueryComplexity;
  steps: TaskStep[];
  requiresOrchestration: boolean;
  estimatedSteps: number;
}

/**
 * Step execution result
 */
export interface StepResult {
  stepId: string;
  success: boolean;
  output: any;
  error?: string;
  toolsCalled: string[];
  latencyMs: number;
}

/**
 * Orchestration result
 */
export interface OrchestrationResult {
  success: boolean;
  finalResponse: string;
  steps: StepResult[];
  totalLatencyMs: number;
  toolsCalled: string[];
}

/**
 * Query classification result
 */
export interface QueryClassification {
  complexity: QueryComplexity;
  domains: AgentDomain[];
  requiresMultipleTools: boolean;
  requiresWorkflow: boolean;
  estimatedSteps: number;
  reasoning: string;
}

/**
 * Agent context for sub-agents
 */
export interface AgentContext {
  userId?: Id<"users">;
  threadId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  previousResults?: Record<string, any>;
}

/**
 * Sub-agent configuration
 */
export interface SubAgentConfig {
  domain: AgentDomain;
  name: string;
  description: string;
  tools: string[];
  instructions: string;
}

