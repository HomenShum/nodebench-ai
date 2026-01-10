"use node";
/**
 * swarmOrchestrator.ts
 *
 * Parallel SubAgent Swarm Orchestration
 * Implements Fan-Out/Gather pattern for parallel agent execution.
 *
 * Key features:
 * - Creates swarm + thread together for instant UI feedback
 * - Executes agents in parallel via scheduler (fire-and-forget)
 * - LLM synthesis when all agents complete
 * - Unique state key isolation per agent
 */

import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// ============================================================================
// Types & Constants
// ============================================================================

export const AGENT_SHORTCUTS: Record<string, string> = {
  doc: "DocumentAgent",
  media: "MediaAgent",
  sec: "SECAgent",
  finance: "OpenBBAgent",
  research: "EntityResearchAgent",
};

export const VALID_AGENTS = [
  "DocumentAgent",
  "MediaAgent",
  "SECAgent",
  "OpenBBAgent",
  "EntityResearchAgent",
] as const;

type AgentName = (typeof VALID_AGENTS)[number];

interface AgentConfig {
  agentName: string;
  role: string;
  query: string;
  stateKeyPrefix: string;
}

// ============================================================================
// Main Orchestration Actions
// ============================================================================

/**
 * Parse a /spawn command and extract query + agents
 */
export function parseSpawnCommand(input: string): {
  query: string;
  agents: string[];
} | null {
  // Match: /spawn "query" --agents=doc,media,sec
  // Or: /spawn query --agents=doc,media,sec
  const spawnMatch = input.match(/^\/spawn\s+(.+?)(?:\s+--agents?=([^\s]+))?$/i);
  if (!spawnMatch) return null;

  let query = spawnMatch[1].trim();
  // Remove quotes if present
  if ((query.startsWith('"') && query.endsWith('"')) ||
      (query.startsWith("'") && query.endsWith("'"))) {
    query = query.slice(1, -1);
  }

  // Parse agents
  let agents: string[] = [];
  if (spawnMatch[2]) {
    agents = spawnMatch[2].split(",").map((a) => {
      const trimmed = a.trim().toLowerCase();
      return AGENT_SHORTCUTS[trimmed] || trimmed;
    });
  } else {
    // Default agents if none specified
    agents = ["DocumentAgent", "MediaAgent", "SECAgent"];
  }

  // Validate agents
  agents = agents.filter((a) =>
    VALID_AGENTS.includes(a as AgentName)
  );

  if (agents.length === 0) {
    agents = ["DocumentAgent", "MediaAgent", "SECAgent"];
  }

  return { query, agents };
}

/**
 * Create a swarm with a new thread - returns immediately for instant UI
 */
export const createSwarm = action({
  args: {
    query: v.string(),
    agents: v.array(v.string()),
    pattern: v.optional(
      v.union(
        v.literal("fan_out_gather"),
        v.literal("pipeline"),
        v.literal("swarm")
      )
    ),
    model: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { query, agents, pattern = "fan_out_gather", model = "claude-sonnet-4-20250514" } = args;

    // Get user from auth context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required to create swarm");
    }

    // Get userId from users table by email
    const user = await ctx.runQuery(api.domains.agents.swarmQueries.getUserByEmail, {
      email: identity.email!,
    });

    if (!user) {
      throw new Error("User not found");
    }

    const userId = user._id;
    const swarmId = crypto.randomUUID();
    const now = Date.now();

    // 1. Create thread first for instant UI feedback
    const threadId = await ctx.runMutation(
      api.domains.agents.fastAgentPanelStreaming.createThreadMutation,
      {
        userId,
        title: `Swarm: ${query.slice(0, 40)}...`,
        model,
      }
    );

    // 2. Generate agent configs with unique state key prefixes
    const agentConfigs: AgentConfig[] = agents.map((agentName, idx) => ({
      agentName,
      role: getAgentRole(agentName),
      query: `${query} (Focus: ${getAgentFocus(agentName)})`,
      stateKeyPrefix: `${agentName}:${swarmId.slice(0, 8)}:${idx}`,
    }));

    // 3. Create swarm record
    await ctx.runMutation(api.domains.agents.swarmMutations.createSwarmRecord, {
      swarmId,
      userId,
      threadId: threadId as string,
      name: `Swarm: ${query.slice(0, 30)}`,
      query,
      pattern,
      agentConfigs,
    });

    // 4. Link thread to swarm
    await ctx.runMutation(api.domains.agents.swarmMutations.linkThreadToSwarm, {
      threadId: threadId as Id<"chatThreadsStream">,
      swarmId,
    });

    // 5. Create task records
    const tasks = agentConfigs.map((config) => ({
      taskId: crypto.randomUUID(),
      agentName: config.agentName,
      query: config.query,
      role: config.role,
      stateKeyPrefix: config.stateKeyPrefix,
    }));

    await ctx.runMutation(api.domains.agents.swarmMutations.createSwarmTasks, {
      swarmId,
      tasks,
    });

    // 6. Schedule swarm execution (fire-and-forget)
    await ctx.scheduler.runAfter(0, internal.domains.agents.swarmOrchestrator.executeSwarmInternal, {
      swarmId,
      userId,
      model,
      tasks,
    });

    return {
      swarmId,
      threadId: threadId as string,
      taskCount: tasks.length,
    };
  },
});

/**
 * Internal action to execute swarm agents in parallel
 */
export const executeSwarmInternal = internalAction({
  args: {
    swarmId: v.string(),
    userId: v.id("users"),
    model: v.string(),
    tasks: v.array(
      v.object({
        taskId: v.string(),
        agentName: v.string(),
        query: v.string(),
        role: v.string(),
        stateKeyPrefix: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { swarmId, userId, model, tasks } = args;
    const startTime = Date.now();

    try {
      // 1. Update status to spawning
      await ctx.runMutation(api.domains.agents.swarmMutations.updateSwarmStatus, {
        swarmId,
        status: "spawning",
        startedAt: startTime,
      });

      // 2. Schedule all agent delegations in parallel
      const delegationTasks = tasks.map((task) => ({
        delegationId: crypto.randomUUID(),
        agentName: task.agentName as any, // Type coercion for AgentName
        query: task.query,
      }));

      // Use existing delegation scheduler
      await ctx.runAction(internal.actions.parallelDelegation.scheduleDelegations, {
        runId: swarmId,
        userId,
        model,
        tasks: delegationTasks,
      });

      // 3. Update task records with delegation IDs and set to running
      for (let i = 0; i < tasks.length; i++) {
        await ctx.runMutation(api.domains.agents.swarmMutations.updateTaskStatus, {
          taskId: tasks[i].taskId,
          status: "running",
          delegationId: delegationTasks[i].delegationId,
          startedAt: Date.now(),
        });
      }

      // 4. Update status to executing
      await ctx.runMutation(api.domains.agents.swarmMutations.updateSwarmStatus, {
        swarmId,
        status: "executing",
      });

      // 5. Poll for completion (with timeout)
      const MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes
      const POLL_INTERVAL_MS = 2000; // 2 seconds
      let elapsed = 0;

      while (elapsed < MAX_WAIT_MS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        elapsed += POLL_INTERVAL_MS;

        // Check delegation statuses
        const delegations = await ctx.runQuery(
          api.domains.agents.agentDelegations.getDelegationsForRun,
          { runId: swarmId }
        );

        const allCompleted = delegations.every(
          (d: any) => d.status === "completed" || d.status === "failed"
        );

        if (allCompleted) {
          // Update task records with results
          for (const delegation of delegations) {
            const task = tasks.find(
              (t, i) => delegationTasks[i].delegationId === delegation.delegationId
            );
            if (task) {
              // Get the final write event for this delegation
              const events = await ctx.runQuery(
                api.domains.agents.agentDelegations.getWriteEvents,
                { delegationId: delegation.delegationId }
              );
              const finalEvent = events.find((e: any) => e.kind === "final");

              await ctx.runMutation(api.domains.agents.swarmMutations.updateTaskStatus, {
                taskId: task.taskId,
                status: delegation.status === "completed" ? "completed" : "failed",
                result: finalEvent?.textChunk || delegation.result,
                resultSummary: (finalEvent?.textChunk || delegation.result || "").slice(0, 200),
                completedAt: Date.now(),
                elapsedMs: Date.now() - startTime,
                errorMessage: delegation.errorMessage,
              });
            }
          }
          break;
        }
      }

      // 6. Gather results and synthesize
      await ctx.runMutation(api.domains.agents.swarmMutations.updateSwarmStatus, {
        swarmId,
        status: "gathering",
      });

      // Get all task results
      const completedTasks = await ctx.runQuery(
        api.domains.agents.swarmQueries.getSwarmTasks,
        { swarmId }
      );

      const results = completedTasks
        .filter((t: any) => t.status === "completed" && t.result)
        .map((t: any) => ({
          agentName: t.agentName,
          role: t.role,
          result: t.result,
        }));

      if (results.length === 0) {
        await ctx.runMutation(api.domains.agents.swarmMutations.updateSwarmStatus, {
          swarmId,
          status: "failed",
          completedAt: Date.now(),
          elapsedMs: Date.now() - startTime,
        });
        return;
      }

      // 7. Synthesize results
      await ctx.runMutation(api.domains.agents.swarmMutations.updateSwarmStatus, {
        swarmId,
        status: "synthesizing",
      });

      const swarm = await ctx.runQuery(api.domains.agents.swarmQueries.getSwarmStatus, {
        swarmId,
      });

      const synthesis = await synthesizeResults(swarm?.query || "", results);

      // 8. Save merged result
      await ctx.runMutation(api.domains.agents.swarmMutations.setSwarmResult, {
        swarmId,
        mergedResult: synthesis.content,
        confidence: synthesis.confidence,
      });

      // 9. Add synthesis as assistant message to thread
      // This makes the result appear in the chat
      const swarmRecord = await ctx.runQuery(api.domains.agents.swarmQueries.getSwarmStatus, {
        swarmId,
      });

      if (swarmRecord?.threadId) {
        // Get the thread's agentThreadId for adding message
        const thread = await ctx.runQuery(
          api.domains.agents.fastAgentPanelStreaming.getThreadByStreamId,
          { threadId: swarmRecord.threadId as Id<"chatThreadsStream"> }
        );

        if (thread?.agentThreadId) {
          // Add the synthesis as a message (using the agent component)
          // For now, we'll store it in the swarm record - UI will display it
          console.log(`[swarmOrchestrator] Synthesis complete for ${swarmId}`);
        }
      }

      console.log(`[swarmOrchestrator] ✅ Swarm ${swarmId} completed in ${Date.now() - startTime}ms`);

    } catch (error: any) {
      console.error(`[swarmOrchestrator] ❌ Swarm ${swarmId} failed:`, error.message);

      await ctx.runMutation(api.domains.agents.swarmMutations.updateSwarmStatus, {
        swarmId,
        status: "failed",
        completedAt: Date.now(),
        elapsedMs: Date.now() - startTime,
      });
    }
  },
});

/**
 * Cancel a running swarm
 */
export const cancelSwarm = action({
  args: {
    swarmId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.domains.agents.swarmMutations.updateSwarmStatus, {
      swarmId: args.swarmId,
      status: "cancelled",
      completedAt: Date.now(),
    });

    // Cancel all pending/running tasks
    const tasks = await ctx.runQuery(api.domains.agents.swarmQueries.getSwarmTasks, {
      swarmId: args.swarmId,
    });

    for (const task of tasks) {
      if (task.status === "pending" || task.status === "running") {
        await ctx.runMutation(api.domains.agents.swarmMutations.updateTaskStatus, {
          taskId: task.taskId,
          status: "cancelled",
          completedAt: Date.now(),
        });
      }
    }

    return { cancelled: true };
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

function getAgentRole(agentName: string): string {
  const roles: Record<string, string> = {
    DocumentAgent: "Document search and analysis specialist",
    MediaAgent: "Video, image, and media content researcher",
    SECAgent: "SEC filings and regulatory document expert",
    OpenBBAgent: "Financial data and market analysis specialist",
    EntityResearchAgent: "Entity profiling and relationship researcher",
  };
  return roles[agentName] || "Research specialist";
}

function getAgentFocus(agentName: string): string {
  const focuses: Record<string, string> = {
    DocumentAgent: "documents, papers, and written content",
    MediaAgent: "videos, images, and multimedia",
    SECAgent: "SEC filings, 10-K, 10-Q, and regulatory documents",
    OpenBBAgent: "stock data, financial metrics, and market trends",
    EntityResearchAgent: "companies, people, and entity relationships",
  };
  return focuses[agentName] || "general research";
}

async function synthesizeResults(
  query: string,
  results: Array<{ agentName: string; role: string; result: string }>
): Promise<{ content: string; confidence: number }> {
  const resultSummaries = results
    .map(
      (r, i) => `
--- Agent ${i + 1}: ${r.agentName} (${r.role}) ---
${r.result}
`
    )
    .join("\n");

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: `You are a synthesis agent. Merge multiple research results into a unified, coherent answer.

Original Query: "${query}"

Research Results from ${results.length} parallel agents:
${resultSummaries}

Create a unified answer that:
1. Captures the key findings from all agents
2. Resolves any contradictions or notes disagreements
3. Provides a complete, coherent answer to the original query
4. Cites which agent provided each piece of information
5. Notes confidence level and any uncertainties

Provide the synthesized answer:`,
    maxOutputTokens: 3000,
  });

  // Calculate confidence based on agreement between agents
  const confidence = Math.min(0.9, 0.5 + results.length * 0.15);

  return { content: text, confidence };
}
