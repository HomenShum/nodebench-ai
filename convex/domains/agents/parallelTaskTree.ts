/**
 * parallelTaskTree.ts
 *
 * Deep Agent 2.0 Parallel Task Tree Execution Engine
 *
 * Implements the A -> B1, B2, B3 -> verify -> cross-check -> prune -> refine pattern.
 * Instead of walking one path, we explore a decision tree in parallel and catch errors
 * before committing to the research response path.
 *
 * Key features:
 * - Task decomposition into parallel branches
 * - Independent verification of each branch
 * - Cross-checking between branches (answers critique each other)
 * - Pruning of low-quality/contradicted paths
 * - Merging surviving paths into final result
 * - Natural backtracking when paths fail
 */

import { v } from "convex/values";
import { mutation, query, action, internalMutation, internalAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import { Doc, Id } from "../../_generated/dataModel";

// ============================================================================
// Types
// ============================================================================

export type TreeStatus =
  | "decomposing"
  | "executing"
  | "verifying"
  | "cross_checking"
  | "merging"
  | "completed"
  | "failed";

export type TaskStatus =
  | "pending"
  | "running"
  | "awaiting_children"
  | "verifying"
  | "completed"
  | "pruned"
  | "failed"
  | "backtracked";

export type TaskType =
  | "root"
  | "branch"
  | "verification"
  | "critique"
  | "merge"
  | "refinement";

export interface DecomposedTask {
  title: string;
  description: string;
  agentName?: string;
  context?: Record<string, unknown>;
}

export interface VerificationResult {
  score: number;       // 0-1
  notes: string;
  passed: boolean;
}

export interface CrossCheckResult {
  verdict: "agree" | "disagree" | "partial" | "abstain";
  agreementPoints?: string[];
  disagreementPoints?: string[];
  confidence: number;
  reasoning?: string;
}

export interface MergedResult {
  content: string;
  confidence: number;
  sourceTasks: string[];
  mergeStrategy: "consensus" | "weighted" | "best_single";
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get the current task tree for an agent thread
 */
export const getTaskTree = query({
  args: { agentThreadId: v.string() },
  handler: async (ctx, { agentThreadId }) => {
    const tree = await ctx.db
      .query("parallelTaskTrees")
      .withIndex("by_agent_thread", (q) => q.eq("agentThreadId", agentThreadId))
      .order("desc")
      .first();

    if (!tree) return null;

    // Get all nodes for this tree
    const nodes = await ctx.db
      .query("parallelTaskNodes")
      .withIndex("by_tree", (q) => q.eq("treeId", tree._id))
      .collect();

    // Get recent events (last 50)
    const events = await ctx.db
      .query("parallelTaskEvents")
      .withIndex("by_tree", (q) => q.eq("treeId", tree._id))
      .order("desc")
      .take(50);

    // Get cross-checks
    const crossChecks = await ctx.db
      .query("parallelTaskCrossChecks")
      .withIndex("by_tree", (q) => q.eq("treeId", tree._id))
      .collect();

    return {
      tree,
      nodes,
      events: events.reverse(),
      crossChecks,
    };
  },
});

/**
 * Get task tree by ID
 */
export const getTaskTreeById = query({
  args: { treeId: v.id("parallelTaskTrees") },
  handler: async (ctx, { treeId }) => {
    const tree = await ctx.db.get(treeId);
    if (!tree) return null;

    const nodes = await ctx.db
      .query("parallelTaskNodes")
      .withIndex("by_tree", (q) => q.eq("treeId", treeId))
      .collect();

    return { tree, nodes };
  },
});

/**
 * Get real-time events for a task tree (for streaming UI)
 */
export const getTaskEvents = query({
  args: {
    treeId: v.id("parallelTaskTrees"),
    afterSeq: v.optional(v.number()),
    taskId: v.optional(v.string()),
  },
  handler: async (ctx, { treeId, afterSeq, taskId }) => {
    const query = ctx.db
      .query("parallelTaskEvents")
      .withIndex("by_tree", (q) => q.eq("treeId", treeId));

    const events = await query.collect();

    // Filter by afterSeq if provided
    let filtered = events;
    if (afterSeq !== undefined) {
      filtered = events.filter(e => e.seq > afterSeq);
    }
    if (taskId) {
      filtered = filtered.filter(e => e.taskId === taskId);
    }

    return filtered;
  },
});

/**
 * Get children of a task node
 */
export const getTaskChildren = query({
  args: {
    treeId: v.id("parallelTaskTrees"),
    parentTaskId: v.string(),
  },
  handler: async (ctx, { treeId, parentTaskId }) => {
    return await ctx.db
      .query("parallelTaskNodes")
      .withIndex("by_tree_parent", (q) =>
        q.eq("treeId", treeId).eq("parentTaskId", parentTaskId)
      )
      .collect();
  },
});

// ============================================================================
// Mutations - Tree Management
// ============================================================================

/**
 * Create a new parallel task tree
 */
export const createTaskTree = mutation({
  args: {
    userId: v.id("users"),
    agentThreadId: v.string(),
    query: v.string(),
  },
  handler: async (ctx, { userId, agentThreadId, query }) => {
    const now = Date.now();

    const treeId = await ctx.db.insert("parallelTaskTrees", {
      userId,
      agentThreadId,
      query,
      status: "decomposing",
      phase: "Analyzing query and planning parallel exploration",
      phaseProgress: 0,
      totalBranches: 0,
      activeBranches: 0,
      completedBranches: 0,
      prunedBranches: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create root task node
    const rootTaskId = crypto.randomUUID();
    await ctx.db.insert("parallelTaskNodes", {
      treeId,
      taskId: rootTaskId,
      title: "Analyze and Decompose Query",
      description: `Decompose "${query}" into parallel exploration branches`,
      taskType: "root",
      status: "running",
      depth: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Update tree with root task ID
    await ctx.db.patch(treeId, { rootTaskId });

    // Log event
    await ctx.db.insert("parallelTaskEvents", {
      treeId,
      taskId: rootTaskId,
      seq: 0,
      eventType: "started",
      message: "Starting parallel task tree execution",
      createdAt: now,
    });

    return { treeId, rootTaskId };
  },
});

/**
 * Update tree status
 */
export const updateTreeStatus = mutation({
  args: {
    treeId: v.id("parallelTaskTrees"),
    status: v.union(
      v.literal("decomposing"),
      v.literal("executing"),
      v.literal("verifying"),
      v.literal("cross_checking"),
      v.literal("merging"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    phase: v.optional(v.string()),
    phaseProgress: v.optional(v.number()),
  },
  handler: async (ctx, { treeId, status, phase, phaseProgress }) => {
    const now = Date.now();
    const updates: Partial<Doc<"parallelTaskTrees">> = {
      status,
      updatedAt: now,
    };
    if (phase !== undefined) updates.phase = phase;
    if (phaseProgress !== undefined) updates.phaseProgress = phaseProgress;
    if (status === "completed" || status === "failed") {
      updates.completedAt = now;
      const tree = await ctx.db.get(treeId);
      if (tree) {
        updates.elapsedMs = now - tree.createdAt;
      }
    }
    await ctx.db.patch(treeId, updates);
  },
});

/**
 * Set merged result on tree
 */
export const setTreeResult = mutation({
  args: {
    treeId: v.id("parallelTaskTrees"),
    mergedResult: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, { treeId, mergedResult, confidence }) => {
    await ctx.db.patch(treeId, {
      mergedResult,
      confidence,
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// ============================================================================
// Mutations - Task Node Management
// ============================================================================

/**
 * Create parallel branch tasks
 */
export const createBranchTasks = mutation({
  args: {
    treeId: v.id("parallelTaskTrees"),
    parentTaskId: v.string(),
    branches: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      agentName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { treeId, parentTaskId, branches }) => {
    const now = Date.now();
    const taskIds: string[] = [];

    // Get parent to determine depth
    const parent = await ctx.db
      .query("parallelTaskNodes")
      .withIndex("by_taskId", (q) => q.eq("taskId", parentTaskId))
      .first();
    const depth = (parent?.depth ?? 0) + 1;

    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      const taskId = crypto.randomUUID();

      await ctx.db.insert("parallelTaskNodes", {
        treeId,
        taskId,
        parentTaskId,
        title: branch.title,
        description: branch.description,
        taskType: "branch",
        status: "pending",
        branchIndex: i,
        siblingCount: branches.length,
        depth,
        agentName: branch.agentName,
        canBacktrack: true,
        createdAt: now,
        updatedAt: now,
      });

      taskIds.push(taskId);

      // Log event
      await ctx.db.insert("parallelTaskEvents", {
        treeId,
        taskId,
        seq: 0,
        eventType: "started",
        message: `Branch ${i + 1}/${branches.length}: ${branch.title}`,
        createdAt: now,
      });
    }

    // Update tree stats
    const tree = await ctx.db.get(treeId);
    if (tree) {
      await ctx.db.patch(treeId, {
        totalBranches: (tree.totalBranches ?? 0) + branches.length,
        updatedAt: now,
      });
    }

    // Mark parent as awaiting children
    if (parent) {
      await ctx.db.patch(parent._id, {
        status: "awaiting_children",
        updatedAt: now,
      });
    }

    return taskIds;
  },
});

/**
 * Update task status
 */
export const updateTaskStatus = mutation({
  args: {
    taskId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("awaiting_children"),
      v.literal("verifying"),
      v.literal("completed"),
      v.literal("pruned"),
      v.literal("failed"),
      v.literal("backtracked"),
    ),
    result: v.optional(v.string()),
    resultSummary: v.optional(v.string()),
    confidence: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, status, result, resultSummary, confidence, errorMessage }) => {
    const now = Date.now();

    const task = await ctx.db
      .query("parallelTaskNodes")
      .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
      .first();

    if (!task) return;

    const updates: Partial<Doc<"parallelTaskNodes">> = {
      status,
      updatedAt: now,
    };

    if (result !== undefined) updates.result = result;
    if (resultSummary !== undefined) updates.resultSummary = resultSummary;
    if (confidence !== undefined) updates.confidence = confidence;
    if (errorMessage !== undefined) updates.errorMessage = errorMessage;

    if (status === "running" && !task.startedAt) {
      updates.startedAt = now;
    }

    if (status === "completed" || status === "pruned" || status === "failed" || status === "backtracked") {
      updates.completedAt = now;
      if (task.startedAt) {
        updates.elapsedMs = now - task.startedAt;
      }
    }

    await ctx.db.patch(task._id, updates);

    // Update tree branch counts
    const tree = await ctx.db.get(task.treeId);
    if (tree) {
      const branchUpdates: Partial<Doc<"parallelTaskTrees">> = { updatedAt: now };

      if (status === "running") {
        branchUpdates.activeBranches = (tree.activeBranches ?? 0) + 1;
      } else if (status === "completed") {
        branchUpdates.completedBranches = (tree.completedBranches ?? 0) + 1;
        branchUpdates.activeBranches = Math.max(0, (tree.activeBranches ?? 1) - 1);
      } else if (status === "pruned") {
        branchUpdates.prunedBranches = (tree.prunedBranches ?? 0) + 1;
        branchUpdates.activeBranches = Math.max(0, (tree.activeBranches ?? 1) - 1);
      } else if (status === "failed" || status === "backtracked") {
        branchUpdates.activeBranches = Math.max(0, (tree.activeBranches ?? 1) - 1);
      }

      await ctx.db.patch(task.treeId, branchUpdates);
    }

    // Log event
    await ctx.db.insert("parallelTaskEvents", {
      treeId: task.treeId,
      taskId,
      seq: now, // Use timestamp for seq in this simple case
      eventType: status === "completed" ? "completed"
                : status === "pruned" ? "pruned"
                : status === "failed" ? "failed"
                : status === "backtracked" ? "backtracked"
                : "progress",
      message: `Task ${status}: ${task.title}`,
      data: result ? { resultPreview: result.slice(0, 200) } : undefined,
      createdAt: now,
    });
  },
});

/**
 * Add verification result to a task
 */
export const addVerificationResult = mutation({
  args: {
    taskId: v.string(),
    score: v.number(),
    notes: v.string(),
    passed: v.boolean(),
  },
  handler: async (ctx, { taskId, score, notes, passed }) => {
    const now = Date.now();

    const task = await ctx.db
      .query("parallelTaskNodes")
      .withIndex("by_taskId", (q) => q.eq("taskId", taskId))
      .first();

    if (!task) return;

    await ctx.db.patch(task._id, {
      verificationScore: score,
      verificationNotes: notes,
      survivedVerification: passed,
      status: passed ? "completed" : "pruned",
      updatedAt: now,
    });

    // Log event
    await ctx.db.insert("parallelTaskEvents", {
      treeId: task.treeId,
      taskId,
      seq: now,
      eventType: "verification_result",
      message: passed ? `✓ Verification passed (${(score * 100).toFixed(0)}%)`
                      : `✗ Verification failed (${(score * 100).toFixed(0)}%)`,
      data: { score, notes, passed },
      createdAt: now,
    });
  },
});

/**
 * Add cross-check result
 */
export const addCrossCheck = mutation({
  args: {
    treeId: v.id("parallelTaskTrees"),
    sourceTaskId: v.string(),
    targetTaskId: v.string(),
    verdict: v.union(
      v.literal("agree"),
      v.literal("disagree"),
      v.literal("partial"),
      v.literal("abstain"),
    ),
    agreementPoints: v.optional(v.array(v.string())),
    disagreementPoints: v.optional(v.array(v.string())),
    confidence: v.number(),
    reasoning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.insert("parallelTaskCrossChecks", {
      ...args,
      createdAt: now,
    });

    // Update target task with critique
    const targetTask = await ctx.db
      .query("parallelTaskNodes")
      .withIndex("by_taskId", (q) => q.eq("taskId", args.targetTaskId))
      .first();

    if (targetTask) {
      const existingCritiques = targetTask.critiques ?? [];
      await ctx.db.patch(targetTask._id, {
        critiques: [
          ...existingCritiques,
          {
            source: args.sourceTaskId,
            verdict: args.verdict,
            reason: args.reasoning ?? "",
          },
        ],
        updatedAt: now,
      });
    }

    // Log event
    await ctx.db.insert("parallelTaskEvents", {
      treeId: args.treeId,
      taskId: args.targetTaskId,
      seq: now,
      eventType: "critique_received",
      message: `Critique from sibling: ${args.verdict}`,
      data: {
        sourceTaskId: args.sourceTaskId,
        verdict: args.verdict,
        confidence: args.confidence,
      },
      createdAt: now,
    });
  },
});

/**
 * Log a task event
 */
export const logTaskEvent = mutation({
  args: {
    treeId: v.id("parallelTaskTrees"),
    taskId: v.string(),
    eventType: v.union(
      v.literal("started"),
      v.literal("progress"),
      v.literal("thinking"),
      v.literal("tool_call"),
      v.literal("result_partial"),
      v.literal("result_final"),
      v.literal("verification_started"),
      v.literal("verification_result"),
      v.literal("critique_received"),
      v.literal("pruned"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("backtracked"),
    ),
    message: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { treeId, taskId, eventType, message, data }) => {
    const now = Date.now();

    // Get latest seq for this task
    const latestEvent = await ctx.db
      .query("parallelTaskEvents")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .order("desc")
      .first();

    const seq = (latestEvent?.seq ?? 0) + 1;

    await ctx.db.insert("parallelTaskEvents", {
      treeId,
      taskId,
      seq,
      eventType,
      message,
      data,
      createdAt: now,
    });
  },
});

// ============================================================================
// Internal Mutations (for actions)
// ============================================================================

export const internalUpdateTreeStatus = internalMutation({
  args: {
    treeId: v.id("parallelTaskTrees"),
    status: v.union(
      v.literal("decomposing"),
      v.literal("executing"),
      v.literal("verifying"),
      v.literal("cross_checking"),
      v.literal("merging"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    phase: v.optional(v.string()),
    phaseProgress: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tree = await ctx.db.get(args.treeId);
    if (!tree) return;

    const updates: Partial<Doc<"parallelTaskTrees">> = {
      status: args.status,
      updatedAt: now,
    };
    if (args.phase !== undefined) updates.phase = args.phase;
    if (args.phaseProgress !== undefined) updates.phaseProgress = args.phaseProgress;
    if (args.status === "completed" || args.status === "failed") {
      updates.completedAt = now;
      updates.elapsedMs = now - tree.createdAt;
    }
    await ctx.db.patch(args.treeId, updates);
  },
});

export const internalLogEvent = internalMutation({
  args: {
    treeId: v.id("parallelTaskTrees"),
    taskId: v.string(),
    eventType: v.string(),
    message: v.optional(v.string()),
    data: v.optional(v.any()),
  },
  handler: async (ctx, { treeId, taskId, eventType, message, data }) => {
    const now = Date.now();

    const latestEvent = await ctx.db
      .query("parallelTaskEvents")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .order("desc")
      .first();

    const seq = (latestEvent?.seq ?? 0) + 1;

    await ctx.db.insert("parallelTaskEvents", {
      treeId,
      taskId,
      seq,
      eventType: eventType,
      message,
      data,
      createdAt: now,
    });
  },
});
