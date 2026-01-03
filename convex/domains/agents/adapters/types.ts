/**
 * Multi-SDK Sub-Agent Adapter Types
 *
 * Universal interface for adapting different AI SDK agents into our
 * Convex-based orchestration layer. Supports handoffs, state transfer,
 * and unified result aggregation.
 *
 * @see docs/architecture/2025-12-30-multi-sdk-subagent-architecture.md
 */

import type { Id } from "../../../_generated/dataModel";

/**
 * Supported SDK types for adapter routing
 */
export type SDKType = "convex" | "langgraph" | "openai" | "anthropic" | "vercel";

/**
 * Strict Model Catalog (Dec 2025)
 * NOTE: These are string constants for routing + configuration.
 */
export const MODEL_CATALOG = {
  OPENAI: {
    FLAGSHIP: "gpt-5.2",
    FAST: "gpt-5-mini",
    NANO: "gpt-5-nano",
  },
  ANTHROPIC: {
    OPUS: "claude-opus-4.5",
    SONNET: "claude-sonnet-4.5",
    HAIKU: "claude-haiku-4.5",
  },
  GOOGLE: {
    PRO: "gemini-3-pro",
    FLASH: "gemini-3-flash",
  },
} as const;


/**
 * Message format for cross-SDK communication
 */
export interface AdapterMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCallId?: string;
  toolName?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Handoff context for transferring control between agents/SDKs
 */
export interface PersonaProfile {
  role: "banker" | "cto" | "vc" | "founder" | "executive" | "academic" | "quant" | "product" | "sales" | "partner";
  riskTolerance: "low" | "high";
  preferredFormat: "bullet" | "report" | "code";
}

export interface HandoffContext {
  // === Universal context bridge (persona-adaptive) ===
  traceId?: string;
  sourceSdk?: SDKType;
  targetSdk?: SDKType;
  intent?: string;
  artifacts?: Record<string, unknown>;
  personaProfile?: PersonaProfile;

  /** Parent thread ID for conversation continuity */
  parentThreadId?: string;
  /** User ID for access control */
  userId?: Id<"users">;
  /** Conversation history to transfer */
  messages: AdapterMessage[];
  /** SDK-specific metadata */
  metadata?: Record<string, unknown>;
  /** Task description for the target agent */
  taskDescription?: string;
  /** Source agent name */
  sourceAgent?: string;
  /** Timestamp of handoff initiation */
  initiatedAt?: number;
}

/**
 * Result from adapter execution
 */
export interface AdapterResult<T = unknown> {
  /** Agent name that produced the result */
  agentName: string;
  /** Optional boolean success flag (derived) */
  success?: boolean;
  /** Optional data alias for result (derived) */
  data?: T;
  /** Optional model used (when known) */
  model?: string;
  /** Optional trace events for cross-SDK orchestration */
  trace?: Array<{
    agent: string;
    sdk: SDKType;
    model?: string;
    latencyMs: number;
    costUsd?: number;
  }>;
  /** SDK type used */
  sdk: SDKType;
  /** Execution status */
  status: "success" | "error" | "timeout" | "handoff";
  /** The actual result data */
  result: T;
  /** Execution time in milliseconds */
  executionTimeMs: number;
  /** Token usage if available */
  tokenUsage?: {
    input: number;
    output: number;
    thinking?: number; // For Anthropic extended thinking
  };
  /** If handoff occurred, target agent name */
  handoffTarget?: string;
  /** Messages produced during execution */
  messages?: AdapterMessage[];
  /** Extended thinking trace (Anthropic only) */
  thinkingTrace?: string;
}

/**
 * Input configuration for adapter execution
 */
export interface AdapterInput {
  /** Optional persona identifier (e.g., JPM_STARTUP_BANKER, CTO_TECH_LEAD, banker) */
  persona?: string;
  /** Optional persona profile for routing */
  personaProfile?: PersonaProfile;
  /** The query or task to execute */
  query: string;
  /** Optional conversation context */
  messages?: AdapterMessage[];
  /** User ID for personalization */
  userId?: Id<"users">;
  /** Thread ID for conversation tracking */
  threadId?: string;
  /** Maximum execution time in ms */
  timeoutMs?: number;
  /** Force refresh (bypass caches) */
  forceRefresh?: boolean;
  /** SDK-specific options */
  options?: Record<string, unknown>;
}

/**
 * Universal Sub-Agent Adapter Interface
 *
 * All SDK adapters must implement this interface to be compatible
 * with the coordinator's multi-SDK delegation system.
 */
export interface SubAgentAdapter<TInput = AdapterInput, TOutput = unknown> {
  /** Unique adapter name for registry lookup */
  name: string;

  /** SDK type this adapter wraps */
  sdk: SDKType;

  /** Human-readable description */
  description: string;

  /**
   * Execute the adapter with the given input
   */
  execute(input: TInput): Promise<AdapterResult<TOutput>>;

  /**
   * Whether this adapter supports handoffs to other agents
   */
  supportsHandoff: boolean;

  /**
   * Perform a handoff to another agent
   * Only required if supportsHandoff is true
   */
  handoff?(
    targetAgent: string,
    context: HandoffContext
  ): Promise<AdapterResult<TOutput>>;

  /**
   * Optional lifecycle hook called before execution starts
   */
  onStart?(input: TInput): Promise<void>;

  /**
   * Optional lifecycle hook called after execution completes
   */
  onComplete?(result: AdapterResult<TOutput>): Promise<void>;

  /**
   * Optional lifecycle hook called on error
   */
  onError?(error: Error): Promise<void>;
}

/**
 * Configuration for SDK-specific settings
 */
export interface SDKConfig {
  /** LangGraph-specific settings */
  langgraph?: {
    maxIterations: number;
    checkpointStore: "memory" | "convex";
  };
  /** OpenAI Agents SDK settings */
  openai?: {
    assistantCacheMinutes: number;
    maxConcurrentThreads: number;
    defaultModel: string;
  };
  /** Anthropic SDK settings */
  anthropic?: {
    defaultThinkingBudget: number;
    maxThinkingBudget: number;
    defaultModel: string;
  };
  /** Vercel AI SDK settings */
  vercel?: {
    defaultMaxSteps: number;
    defaultModel: string;
  };
  /** Routing keywords to trigger specific SDKs */
  routing?: {
    langgraphTriggers: string[];
    openaiTriggers: string[];
    anthropicTriggers: string[];
    vercelTriggers: string[];
  };
}

/**
 * Default SDK configuration
 * Updated for 2025 model naming conventions
 */
export const DEFAULT_SDK_CONFIG: SDKConfig = {
  langgraph: {
    maxIterations: 5,
    checkpointStore: "convex",
  },
  openai: {
    assistantCacheMinutes: 60,
    maxConcurrentThreads: 10,
    defaultModel: "gpt-5.2", // GPT-5.2 flagship model
  },
  anthropic: {
    defaultThinkingBudget: 8000,
    maxThinkingBudget: 32000,
    defaultModel: "claude-sonnet-4.5", // Claude Sonnet 4.5 - best for agents
  },
  vercel: {
    defaultMaxSteps: 5,
    defaultModel: "gpt-5.2",
  },
  routing: {
    langgraphTriggers: ["research", "investigate", "deep dive", "multi-step", "workflow"],
    openaiTriggers: ["code", "analyze code", "execute", "handoff", "triage"],
    anthropicTriggers: ["reason", "think through", "complex", "explain why", "extended thinking"],
    vercelTriggers: ["stream", "multi-provider", "quick"],
  },
};

/**
 * Error class for adapter-specific errors
 */
export class SubAgentError extends Error {
  constructor(
    public agentName: string,
    public sdk: SDKType,
    public originalError: Error,
    public retryable: boolean = true
  ) {
    super(`[${sdk}/${agentName}] ${originalError.message}`);
    this.name = "SubAgentError";
  }
}

/**
 * Helper to determine SDK type from keywords in query
 */
export function detectSDKFromQuery(
  query: string,
  config: SDKConfig = DEFAULT_SDK_CONFIG
): SDKType | null {
  const lowerQuery = query.toLowerCase();

  // Check each SDK's trigger keywords
  if (config.routing?.anthropicTriggers?.some((t) => lowerQuery.includes(t))) {
    return "anthropic";
  }
  if (config.routing?.langgraphTriggers?.some((t) => lowerQuery.includes(t))) {
    return "langgraph";
  }
  if (config.routing?.openaiTriggers?.some((t) => lowerQuery.includes(t))) {
    return "openai";
  }
  if (config.routing?.vercelTriggers?.some((t) => lowerQuery.includes(t))) {
    return "vercel";
  }

  return null; // Default to Convex if no match
}
