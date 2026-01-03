/**
 * parallelTaskOrchestrator.ts
 *
 * Deep Agent 2.0 Parallel Task Orchestrator
 *
 * Orchestrates the full lifecycle of parallel task execution:
 * 1. Decompose query into parallel branches
 * 2. Execute branches in parallel
 * 3. Verify each branch independently
 * 4. Cross-check between branches
 * 5. Prune low-quality paths
 * 6. Merge surviving paths
 * 7. Refine final result
 *
 * Key principle: Ask for multiple solutions rather than one perfect answer.
 * Make the answers critique each other, then merge what survives.
 */

"use node";

import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_BRANCH_COUNT = 3;
const MIN_VERIFICATION_SCORE = 0.6;
const MIN_CONSENSUS_THRESHOLD = 0.5; // At least 50% must agree
const MAX_PARALLEL_BRANCHES = 5;

// ============================================================================
// Main Orchestration Action
// ============================================================================

/**
 * Execute a parallel task tree for a user query
 */
export const executeParallelTaskTree = action({
  args: {
    userId: v.id("users"),
    agentThreadId: v.string(),
    query: v.string(),
    context: v.optional(v.any()),
    branchCount: v.optional(v.number()),
  },
  handler: async (ctx, { userId, agentThreadId, query, context, branchCount = DEFAULT_BRANCH_COUNT }) => {
    const startTime = Date.now();

    // 1. Create the task tree
    const { treeId, rootTaskId } = await ctx.runMutation(
      api.domains.agents.parallelTaskTree.createTaskTree,
      { userId, agentThreadId, query }
    );

    try {
      // 2. Decompose query into parallel branches
      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalUpdateTreeStatus, {
        treeId,
        status: "decomposing",
        phase: "Analyzing query and generating exploration strategies",
        phaseProgress: 10,
      });

      const branches = await decomposeQuery(query, branchCount, context);

      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalLogEvent, {
        treeId,
        taskId: rootTaskId,
        eventType: "thinking",
        message: `Decomposed into ${branches.length} parallel exploration branches`,
        data: { branches: branches.map(b => b.title) },
      });

      // 3. Create branch tasks
      const branchTaskIds = await ctx.runMutation(
        api.domains.agents.parallelTaskTree.createBranchTasks,
        {
          treeId,
          parentTaskId: rootTaskId,
          branches,
        }
      );

      // 4. Execute branches in parallel
      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalUpdateTreeStatus, {
        treeId,
        status: "executing",
        phase: "Executing parallel exploration branches",
        phaseProgress: 20,
      });

      const branchResults = await executeBranchesInParallel(
        ctx,
        treeId,
        branches,
        branchTaskIds,
        query,
        context
      );

      // 5. Verify each branch
      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalUpdateTreeStatus, {
        treeId,
        status: "verifying",
        phase: "Verifying branch results independently",
        phaseProgress: 50,
      });

      const verifiedResults = await verifyBranches(
        ctx,
        treeId,
        branchTaskIds,
        branchResults,
        query
      );

      // Filter out pruned branches
      const survivingBranches = verifiedResults.filter(r => r.passed);

      if (survivingBranches.length === 0) {
        // All branches failed - attempt recovery with best effort merge
        await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalUpdateTreeStatus, {
          treeId,
          status: "failed",
          phase: "All branches failed verification - no reliable answer",
          phaseProgress: 100,
        });

        return {
          success: false,
          treeId,
          error: "No branches survived verification",
          elapsed: Date.now() - startTime,
        };
      }

      // 6. Cross-check surviving branches
      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalUpdateTreeStatus, {
        treeId,
        status: "cross_checking",
        phase: "Cross-checking results between branches",
        phaseProgress: 70,
      });

      const crossCheckMatrix = await crossCheckBranches(
        ctx,
        treeId,
        survivingBranches,
        query
      );

      // 7. Merge surviving paths
      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalUpdateTreeStatus, {
        treeId,
        status: "merging",
        phase: "Merging consensus from surviving branches",
        phaseProgress: 85,
      });

      const mergedResult = await mergeSurvivingPaths(
        ctx,
        treeId,
        survivingBranches,
        crossCheckMatrix,
        query
      );

      // 8. Complete the tree
      await ctx.runMutation(
        api.domains.agents.parallelTaskTree.setTreeResult,
        {
          treeId,
          mergedResult: mergedResult.content,
          confidence: mergedResult.confidence,
        }
      );

      return {
        success: true,
        treeId,
        result: mergedResult.content,
        confidence: mergedResult.confidence,
        stats: {
          totalBranches: branches.length,
          survivingBranches: survivingBranches.length,
          prunedBranches: branches.length - survivingBranches.length,
          elapsed: Date.now() - startTime,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalUpdateTreeStatus, {
        treeId,
        status: "failed",
        phase: `Error: ${errorMessage}`,
        phaseProgress: 100,
      });

      return {
        success: false,
        treeId,
        error: errorMessage,
        elapsed: Date.now() - startTime,
      };
    }
  },
});

// ============================================================================
// Decomposition
// ============================================================================

interface DecomposedBranch {
  title: string;
  description: string;
  agentName?: string;
}

async function decomposeQuery(
  query: string,
  branchCount: number,
  context?: unknown
): Promise<DecomposedBranch[]> {
  const prompt = `You are a research strategy planner. Given a user query, decompose it into ${branchCount} distinct parallel exploration strategies. Each strategy should take a different approach or perspective to answer the query.

User Query: "${query}"

${context ? `Context: ${JSON.stringify(context)}` : ""}

Generate ${branchCount} exploration branches. Each branch should:
1. Take a distinct approach (e.g., different sources, methods, or angles)
2. Be independently executable
3. Potentially find different or complementary information

Respond with a JSON array of objects:
[
  {
    "title": "Brief title for this approach",
    "description": "What this branch will explore and how"
  }
]

Only output the JSON array, no other text.`;

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt,
    maxOutputTokens: 1000,
  });

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("No JSON array found in response");
    }
    const branches = JSON.parse(jsonMatch[0]) as DecomposedBranch[];
    return branches.slice(0, MAX_PARALLEL_BRANCHES);
  } catch (e) {
    // Fallback: create generic branches
    return Array.from({ length: branchCount }, (_, i) => ({
      title: `Exploration Strategy ${i + 1}`,
      description: `Explore the query using approach ${i + 1}`,
    }));
  }
}

// ============================================================================
// Branch Execution
// ============================================================================

interface BranchResult {
  taskId: string;
  title: string;
  result: string;
  confidence: number;
  elapsed: number;
  success: boolean;
  error?: string;
}

async function executeBranchesInParallel(
  ctx: any,
  treeId: Id<"parallelTaskTrees">,
  branches: DecomposedBranch[],
  taskIds: string[],
  query: string,
  context?: unknown
): Promise<BranchResult[]> {
  // Execute all branches in parallel
  const branchPromises = branches.map(async (branch, index) => {
    const taskId = taskIds[index];
    const startTime = Date.now();

    try {
      // Mark as running
      await ctx.runMutation(api.domains.agents.parallelTaskTree.updateTaskStatus, {
        taskId,
        status: "running",
      });

      // Log thinking
      await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalLogEvent, {
        treeId,
        taskId,
        eventType: "thinking",
        message: `Exploring: ${branch.description}`,
      });

      // Execute the branch
      const { text } = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        prompt: `You are exploring one approach to answer a research question.

Main Query: "${query}"

Your Approach: ${branch.title}
Strategy: ${branch.description}

${context ? `Context: ${JSON.stringify(context)}` : ""}

Explore this specific angle thoroughly. Provide your findings with clear reasoning.
Be concise but comprehensive. Include any relevant facts, considerations, or caveats.`,
        maxOutputTokens: 2000,
      });

      const elapsed = Date.now() - startTime;

      // Update task with result
      await ctx.runMutation(api.domains.agents.parallelTaskTree.updateTaskStatus, {
        taskId,
        status: "completed",
        result: text,
        resultSummary: text.slice(0, 200),
        confidence: 0.8, // Will be adjusted by verification
      });

      return {
        taskId,
        title: branch.title,
        result: text,
        confidence: 0.8,
        elapsed,
        success: true,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await ctx.runMutation(api.domains.agents.parallelTaskTree.updateTaskStatus, {
        taskId,
        status: "failed",
        errorMessage,
      });

      return {
        taskId,
        title: branch.title,
        result: "",
        confidence: 0,
        elapsed: Date.now() - startTime,
        success: false,
        error: errorMessage,
      };
    }
  });

  return Promise.all(branchPromises);
}

// ============================================================================
// Verification
// ============================================================================

interface VerifiedResult extends BranchResult {
  verificationScore: number;
  verificationNotes: string;
  passed: boolean;
}

async function verifyBranches(
  ctx: any,
  treeId: Id<"parallelTaskTrees">,
  taskIds: string[],
  results: BranchResult[],
  query: string
): Promise<VerifiedResult[]> {
  // Verify each branch independently
  const verificationPromises = results.map(async (result, index) => {
    if (!result.success) {
      return {
        ...result,
        verificationScore: 0,
        verificationNotes: "Branch execution failed",
        passed: false,
      };
    }

    const taskId = taskIds[index];

    // Log verification start
    await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalLogEvent, {
      treeId,
      taskId,
      eventType: "verification_started",
      message: `Verifying ${result.title}`,
    });

    try {
      const { text } = await generateText({
        model: anthropic("claude-sonnet-4-20250514"),
        prompt: `You are a verification agent. Evaluate this research result for quality and accuracy.

Original Query: "${query}"

Approach: ${result.title}

Result to Verify:
${result.result}

Evaluate the result on:
1. Relevance: Does it address the query?
2. Accuracy: Does the reasoning seem sound?
3. Completeness: Does it provide sufficient information?
4. Clarity: Is it well-organized and understandable?

Respond with JSON:
{
  "score": 0.0-1.0,
  "notes": "Brief evaluation notes",
  "issues": ["any specific issues found"]
}

Only output JSON, no other text.`,
        maxOutputTokens: 500,
      });

      let verification = { score: 0.5, notes: "Verification completed", issues: [] as string[] };
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          verification = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Use defaults
      }

      const passed = verification.score >= MIN_VERIFICATION_SCORE;

      // Record verification result
      await ctx.runMutation(api.domains.agents.parallelTaskTree.addVerificationResult, {
        taskId,
        score: verification.score,
        notes: verification.notes,
        passed,
      });

      return {
        ...result,
        verificationScore: verification.score,
        verificationNotes: verification.notes,
        passed,
      };

    } catch (error) {
      // On verification error, give benefit of doubt
      return {
        ...result,
        verificationScore: 0.6,
        verificationNotes: "Verification failed, using default score",
        passed: true,
      };
    }
  });

  return Promise.all(verificationPromises);
}

// ============================================================================
// Cross-Checking
// ============================================================================

interface CrossCheckEntry {
  sourceTaskId: string;
  targetTaskId: string;
  verdict: "agree" | "disagree" | "partial" | "abstain";
  agreementPoints: string[];
  disagreementPoints: string[];
  confidence: number;
}

async function crossCheckBranches(
  ctx: any,
  treeId: Id<"parallelTaskTrees">,
  survivingBranches: VerifiedResult[],
  query: string
): Promise<CrossCheckEntry[]> {
  const crossChecks: CrossCheckEntry[] = [];

  // Each branch critiques each other branch
  for (const source of survivingBranches) {
    for (const target of survivingBranches) {
      if (source.taskId === target.taskId) continue;

      try {
        const { text } = await generateText({
          model: anthropic("claude-sonnet-4-20250514"),
          prompt: `You are a critique agent. Compare two research results for the same query.

Query: "${query}"

Result A (${source.title}):
${source.result}

Result B (${target.title}):
${target.result}

Compare Result B against Result A. Identify:
1. Points of agreement
2. Points of disagreement or contradiction
3. Complementary information (in one but not the other)

Respond with JSON:
{
  "verdict": "agree" | "disagree" | "partial",
  "agreementPoints": ["list of agreements"],
  "disagreementPoints": ["list of disagreements"],
  "confidence": 0.0-1.0
}

Only output JSON, no other text.`,
          maxOutputTokens: 800,
        });

        let critique = {
          verdict: "partial" as const,
          agreementPoints: [] as string[],
          disagreementPoints: [] as string[],
          confidence: 0.7,
        };

        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            critique = {
              verdict: parsed.verdict || "partial",
              agreementPoints: parsed.agreementPoints || [],
              disagreementPoints: parsed.disagreementPoints || [],
              confidence: parsed.confidence || 0.7,
            };
          }
        } catch {
          // Use defaults
        }

        // Record cross-check
        await ctx.runMutation(api.domains.agents.parallelTaskTree.addCrossCheck, {
          treeId,
          sourceTaskId: source.taskId,
          targetTaskId: target.taskId,
          verdict: critique.verdict,
          agreementPoints: critique.agreementPoints,
          disagreementPoints: critique.disagreementPoints,
          confidence: critique.confidence,
        });

        crossChecks.push({
          sourceTaskId: source.taskId,
          targetTaskId: target.taskId,
          ...critique,
        });

      } catch {
        // On error, assume partial agreement
        crossChecks.push({
          sourceTaskId: source.taskId,
          targetTaskId: target.taskId,
          verdict: "partial",
          agreementPoints: [],
          disagreementPoints: [],
          confidence: 0.5,
        });
      }
    }
  }

  return crossChecks;
}

// ============================================================================
// Merging
// ============================================================================

interface MergeResult {
  content: string;
  confidence: number;
  sourceTasks: string[];
  mergeStrategy: "consensus" | "weighted" | "best_single";
}

async function mergeSurvivingPaths(
  ctx: any,
  treeId: Id<"parallelTaskTrees">,
  survivingBranches: VerifiedResult[],
  crossChecks: CrossCheckEntry[],
  query: string
): Promise<MergeResult> {
  // Determine merge strategy based on cross-check results
  const agreementCount = crossChecks.filter(c => c.verdict === "agree").length;
  const totalChecks = crossChecks.length;
  const agreementRatio = totalChecks > 0 ? agreementCount / totalChecks : 0;

  // If only one branch, use it directly
  if (survivingBranches.length === 1) {
    return {
      content: survivingBranches[0].result,
      confidence: survivingBranches[0].verificationScore,
      sourceTasks: [survivingBranches[0].taskId],
      mergeStrategy: "best_single",
    };
  }

  // If high agreement, create consensus merge
  const strategy: "consensus" | "weighted" = agreementRatio >= MIN_CONSENSUS_THRESHOLD
    ? "consensus"
    : "weighted";

  // Prepare branch summaries for merge
  const branchSummaries = survivingBranches.map((b, i) => ({
    id: i + 1,
    title: b.title,
    result: b.result,
    verificationScore: b.verificationScore,
    taskId: b.taskId,
  }));

  // Generate merged result
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    prompt: `You are a synthesis agent. Merge multiple research results into a unified answer.

Original Query: "${query}"

Research Results:
${branchSummaries.map(b => `
--- Result ${b.id}: ${b.title} (Verification Score: ${(b.verificationScore * 100).toFixed(0)}%) ---
${b.result}
`).join("\n")}

Cross-Check Summary:
- Agreement ratio: ${(agreementRatio * 100).toFixed(0)}%
- Total cross-checks: ${totalChecks}

Merge Strategy: ${strategy === "consensus" ? "High agreement - synthesize consensus view" : "Mixed agreement - weight by verification scores and address disagreements"}

Create a unified answer that:
1. Captures the consensus/strongest points from all results
2. Resolves or acknowledges any contradictions
3. Provides a complete, coherent answer to the original query
4. Notes confidence level and any remaining uncertainties

Provide the merged answer:`,
    maxOutputTokens: 2500,
  });

  // Calculate overall confidence
  const avgVerificationScore =
    survivingBranches.reduce((sum, b) => sum + b.verificationScore, 0) / survivingBranches.length;
  const confidence = avgVerificationScore * (0.5 + 0.5 * agreementRatio);

  // Log merge completion
  await ctx.runMutation(internal.domains.agents.parallelTaskTree.internalLogEvent, {
    treeId,
    taskId: survivingBranches[0].taskId,
    eventType: "result_final",
    message: `Merged ${survivingBranches.length} branches with ${strategy} strategy`,
    data: {
      strategy,
      agreementRatio,
      confidence,
    },
  });

  return {
    content: text,
    confidence,
    sourceTasks: branchSummaries.map(b => b.taskId),
    mergeStrategy: strategy,
  };
}
