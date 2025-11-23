/**
 * Delegation Helpers
 * 
 * Utility functions for managing delegation between coordinator and subagents
 */

import type { Agent } from "@convex-dev/agent";
import type { ToolCtx } from "@convex-dev/agent";

/**
 * Extended context type for delegation with optional evaluation user ID
 */
export type DelegationCtx = ToolCtx & { evaluationUserId?: string; depth?: number };

/**
 * Pick the appropriate user ID from context
 * Prefers evaluationUserId for testing, falls back to userId
 * 
 * @throws Error if no user ID is available (unauthenticated)
 */
export function pickUserId(ctx: DelegationCtx): string {
  const userId = (ctx.evaluationUserId as string | undefined) ?? ctx.userId;

  if (!userId) {
    throw new Error("Authentication required: No user ID found in context. User must be authenticated to delegate tasks.");
  }

  return userId;
}

/**
 * Ensure a thread exists for the agent
 * Reuses existing thread if provided, otherwise creates a new one
 * 
 * @param agent - The agent to create/reuse thread for
 * @param ctx - Delegation context
 * @param threadId - Optional existing thread ID
 * @returns Thread ID (existing or newly created)
 */
export async function ensureThread(
  agent: Agent,
  ctx: DelegationCtx,
  threadId?: string
): Promise<string> {
  // If threadId is explicitly provided, use it
  if (threadId) return threadId;

  // If context has a threadId, use it
  if (ctx.threadId) return ctx.threadId;

  // Otherwise, create a new thread
  const { threadId: created } = await agent.createThread(ctx as any, {
    userId: pickUserId(ctx),
  });

  return created;
}

/**
 * Format delegation result for consistent response structure
 * 
 * @param delegate - Name of the subagent that handled the request
 * @param threadId - Thread ID used for the delegation
 * @param messageId - Message ID of the agent's response
 * @param text - The agent's text response
 * @param toolsUsed - Array of tool names used by the agent
 * @returns Formatted delegation result object
 */
export function formatDelegationResult(
  delegate: string,
  threadId: string,
  messageId: string,
  text: string,
  toolsUsed: string[]
): {
  delegate: string;
  threadId: string;
  messageId: string;
  text: string;
  toolsUsed: string[];
} {
  return {
    delegate,
    threadId,
    messageId,
    text,
    toolsUsed,
  };
}

/**
 * Extract tool names from agent result
 * 
 * @param result - Agent generation result
 * @returns Array of tool names used
 */
export function extractToolNames(result: any): string[] {
  if (!result.steps) return [];

  const toolCalls: any[] = [];
  for (const step of result.steps) {
    if (step.toolCalls) {
      toolCalls.push(...step.toolCalls);
    }
  }

  return toolCalls.map((call: any) => call.toolName);
}

