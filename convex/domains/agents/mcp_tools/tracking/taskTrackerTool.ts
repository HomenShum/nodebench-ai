/**
 * Task Tracker Tool - 2025 Deep Agents Pattern
 *
 * Based on:
 * - LangChain "Deep Agents" (July 2025) - Planning Tool pattern
 * - Anthropic "Effective harnesses for long-running agents" (Nov 2025) - Feature List pattern
 *
 * Purpose:
 * The Feature List pattern prevents the "premature victory" failure mode where
 * agents see progress and declare the job done too early.
 *
 * Key features:
 * 1. Structured task list with status tracking
 * 2. Test criteria for each task (prevents false completion claims)
 * 3. Progress log for session continuity
 * 4. Blocking dependencies between tasks
 */

import { createTool } from "@convex-dev/agent";
import { z } from "zod";
import type { ToolCtx } from "@convex-dev/agent";

/**
 * Task status enum
 */
export const TaskStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  BLOCKED: "blocked",
  FAILED: "failed",
} as const;

export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];

/**
 * Task structure following the Feature List pattern
 */
export interface TrackedTask {
  id: string;
  name: string;
  description: string;
  status: TaskStatusType;
  testCriteria: string;
  blockedBy: string[];
  completedAt: number | null;
  notes: string[];
}

/**
 * Task tracker state
 */
export interface TaskTrackerState {
  sessionId: string;
  tasks: TrackedTask[];
  progressLog: Array<{
    timestamp: number;
    taskId: string;
    action: string;
    details: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

// In-memory state (would be persisted in production)
let currentState: TaskTrackerState | null = null;

/**
 * Initialize Task Tracker
 */
export const initTaskTracker = createTool({
  description: `Initialize the task tracker with a list of tasks to complete.

Each task should have:
- name: Short task name
- description: What needs to be done
- testCriteria: How to verify the task is complete (prevents premature completion)
- blockedBy: IDs of tasks that must complete first

Based on the Feature List pattern from Anthropic (Nov 2025).`,

  args: z.object({
    sessionId: z.string().describe("Session ID from context initializer"),
    tasks: z.array(z.object({
      name: z.string(),
      description: z.string(),
      testCriteria: z.string(),
      blockedBy: z.array(z.string()).optional(),
    })),
  }),

  handler: async (_ctx: ToolCtx, args): Promise<TaskTrackerState> => {
    const now = Date.now();

    const tasks: TrackedTask[] = args.tasks.map((t, idx) => ({
      id: `task_${idx + 1}`,
      name: t.name,
      description: t.description,
      status: TaskStatus.NOT_STARTED,
      testCriteria: t.testCriteria,
      blockedBy: t.blockedBy ?? [],
      completedAt: null,
      notes: [],
    }));

    currentState = {
      sessionId: args.sessionId,
      tasks,
      progressLog: [{
        timestamp: now,
        taskId: "system",
        action: "initialized",
        details: `Created ${tasks.length} tasks`,
      }],
      createdAt: now,
      updatedAt: now,
    };

    console.log('[initTaskTracker] Initialized with', tasks.length, 'tasks');
    return currentState;
  },
});

/**
 * Update Task Status
 */
export const updateTaskStatus = createTool({
  description: `Update the status of a task.

IMPORTANT: Before marking a task as "completed", verify it meets the testCriteria.
This prevents the "premature victory" failure mode.

Valid status transitions:
- not_started → in_progress
- in_progress → completed (only if testCriteria met)
- in_progress → blocked (if dependency not met)
- in_progress → failed (if cannot complete)
- blocked → in_progress (when blocker resolved)`,

  args: z.object({
    taskId: z.string().describe("The task ID to update"),
    status: z.enum(["not_started", "in_progress", "completed", "blocked", "failed"]),
    notes: z.string().optional().describe("Optional notes about the status change"),
    testCriteriaVerified: z.boolean().optional().describe("Set to true when marking completed to confirm criteria met"),
  }),

  handler: async (_ctx: ToolCtx, args): Promise<{ success: boolean; message: string; state: TaskTrackerState | null }> => {
    if (!currentState) {
      return { success: false, message: "Task tracker not initialized. Call initTaskTracker first.", state: null };
    }

    const task = currentState.tasks.find(t => t.id === args.taskId);
    if (!task) {
      return { success: false, message: `Task ${args.taskId} not found`, state: currentState };
    }

    // Prevent premature completion
    if (args.status === "completed" && !args.testCriteriaVerified) {
      return {
        success: false,
        message: `Cannot mark task as completed without verifying testCriteria: "${task.testCriteria}"`,
        state: currentState,
      };
    }

    const now = Date.now();
    task.status = args.status;
    if (args.status === "completed") {
      task.completedAt = now;
    }
    if (args.notes) {
      task.notes.push(args.notes);
    }

    currentState.progressLog.push({
      timestamp: now,
      taskId: args.taskId,
      action: `status_changed_to_${args.status}`,
      details: args.notes ?? "",
    });
    currentState.updatedAt = now;

    console.log('[updateTaskStatus]', args.taskId, '→', args.status);
    return { success: true, message: `Task ${args.taskId} updated to ${args.status}`, state: currentState };
  },
});

/**
 * Get Task Summary
 */
export const getTaskSummary = createTool({
  description: `Get a summary of all tasks and their current status.

Use this to:
- Check overall progress
- Identify blocked tasks
- Find the next task to work on`,

  args: z.object({}),

  handler: async (_ctx: ToolCtx, _args): Promise<{
    initialized: boolean;
    summary: {
      total: number;
      notStarted: number;
      inProgress: number;
      completed: number;
      blocked: number;
      failed: number;
      completionPercentage: number;
    } | null;
    nextTask: TrackedTask | null;
    blockedTasks: TrackedTask[];
  }> => {
    if (!currentState) {
      return { initialized: false, summary: null, nextTask: null, blockedTasks: [] };
    }

    const tasks = currentState.tasks;
    const summary = {
      total: tasks.length,
      notStarted: tasks.filter(t => t.status === "not_started").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      completed: tasks.filter(t => t.status === "completed").length,
      blocked: tasks.filter(t => t.status === "blocked").length,
      failed: tasks.filter(t => t.status === "failed").length,
      completionPercentage: Math.round((tasks.filter(t => t.status === "completed").length / tasks.length) * 100),
    };

    // Find next task (first not_started with no blockers)
    const nextTask = tasks.find(t =>
      t.status === "not_started" &&
      t.blockedBy.every(blockerId =>
        tasks.find(bt => bt.id === blockerId)?.status === "completed"
      )
    ) ?? null;

    const blockedTasks = tasks.filter(t => t.status === "blocked");

    return { initialized: true, summary, nextTask, blockedTasks };
  },
});

