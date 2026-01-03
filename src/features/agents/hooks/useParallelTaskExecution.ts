/**
 * useParallelTaskExecution.ts
 *
 * Hook for triggering and monitoring parallel task execution
 * in the Deep Agent 2.0 architecture.
 */

import { useCallback, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export interface ParallelTaskExecutionOptions {
  userId: Id<"users">;
  agentThreadId: string;
  query: string;
  context?: Record<string, unknown>;
  branchCount?: number;
}

export interface ParallelTaskExecutionResult {
  success: boolean;
  treeId?: Id<"parallelTaskTrees">;
  result?: string;
  confidence?: number;
  error?: string;
  stats?: {
    totalBranches: number;
    survivingBranches: number;
    prunedBranches: number;
    elapsed: number;
  };
}

export function useParallelTaskExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTreeId, setCurrentTreeId] = useState<Id<"parallelTaskTrees"> | null>(null);
  const [lastResult, setLastResult] = useState<ParallelTaskExecutionResult | null>(null);

  const executeParallelTask = useAction(api.domains.agents.parallelTaskOrchestrator.executeParallelTaskTree);

  const execute = useCallback(async (options: ParallelTaskExecutionOptions): Promise<ParallelTaskExecutionResult> => {
    setIsExecuting(true);
    setLastResult(null);

    try {
      const result = await executeParallelTask({
        userId: options.userId,
        agentThreadId: options.agentThreadId,
        query: options.query,
        context: options.context,
        branchCount: options.branchCount,
      });

      const typedResult = result as ParallelTaskExecutionResult;

      if (typedResult.treeId) {
        setCurrentTreeId(typedResult.treeId);
      }

      setLastResult(typedResult);
      return typedResult;

    } catch (error) {
      const errorResult: ParallelTaskExecutionResult = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      setLastResult(errorResult);
      return errorResult;

    } finally {
      setIsExecuting(false);
    }
  }, [executeParallelTask]);

  const reset = useCallback(() => {
    setIsExecuting(false);
    setCurrentTreeId(null);
    setLastResult(null);
  }, []);

  return {
    execute,
    reset,
    isExecuting,
    currentTreeId,
    lastResult,
  };
}

/**
 * Hook to monitor a parallel task tree's progress
 */
export function useParallelTaskTree(agentThreadId: string | null) {
  const data = useQuery(
    api.domains.agents.parallelTaskTree.getTaskTree,
    agentThreadId ? { agentThreadId } : "skip"
  );

  const tree = data?.tree ?? null;
  const nodes = data?.nodes ?? [];
  const events = data?.events ?? [];
  const crossChecks = data?.crossChecks ?? [];

  // Compute summary stats
  const stats = {
    totalBranches: tree?.totalBranches ?? 0,
    activeBranches: tree?.activeBranches ?? 0,
    completedBranches: tree?.completedBranches ?? 0,
    prunedBranches: tree?.prunedBranches ?? 0,
    phase: tree?.phase ?? null,
    phaseProgress: tree?.phaseProgress ?? 0,
    status: tree?.status ?? null,
    hasTree: !!tree,
    isActive: tree?.status !== "completed" && tree?.status !== "failed",
  };

  return {
    tree,
    nodes,
    events,
    crossChecks,
    stats,
    isLoading: data === undefined && agentThreadId !== null,
  };
}

export default useParallelTaskExecution;
