// convex/tools/evaluation/evaluator.ts
"use node";

import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { allTestCases, TestCase } from "./testCases";

const openai = new OpenAI();

export interface EvaluationResult {
  testId: string;
  category: string;
  scenario: string;
  userQuery: string;
  passed: boolean;
  toolsCalled: string[];
  expectedTools: string[];
  response: string;
  reasoning: string;
  correctToolCalled: boolean;
  correctArguments: boolean;
  responseHelpful: boolean;
  responseAccurate: boolean;
  allCriteriaMet: boolean;
  latencyMs: number;
  timestamp: number;
  errors?: string[];
}

export interface EvaluationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  passRate: number;
  averageLatency: number;
  categoryResults: Record<string, {
    total: number;
    passed: number;
    passRate: number;
  }>;
  failedTests: Array<{
    testId: string;
    scenario: string;
    reason: string;
    correctToolCalled: boolean;
    correctArguments: boolean;
    responseHelpful: boolean;
    responseAccurate: boolean;
  }>;
}

/**
 * Run a single test case and evaluate with LLM-as-a-judge
 */
export const runSingleTest = internalAction({
  args: {
    testId: v.string(),
    threadId: v.optional(v.id("threads")),
    userId: v.optional(v.id("users")), // Optional userId for evaluation tests
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<EvaluationResult> => {
    const testCase = allTestCases.find(t => t.id === args.testId);
    if (!testCase) {
      throw new Error(`Test case ${args.testId} not found`);
    }

    console.log(`\n🧪 Running test: ${testCase.id} - ${testCase.scenario}`);

    const startTime = Date.now();
    let response = "";
    let toolsCalled: string[] = [];
    let errors: string[] = [];

    try {
      // Use original agent for evaluation tests (orchestrator not working yet)
      const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
        threadId: args.threadId,
        message: testCase.userQuery,
        userId: args.userId, // Pass userId to agent
      });

      response = result.response || "";
      toolsCalled = result.toolsCalled || [];

    } catch (error: any) {
      errors.push(error.message);
      console.error(`❌ Error running test: ${error.message}`);
    }

    const latencyMs = Date.now() - startTime;

    // Evaluate with LLM-as-a-judge
    const evaluation = await evaluateWithJudge(testCase, response, toolsCalled);

    const result: EvaluationResult = {
      testId: testCase.id,
      category: testCase.category,
      scenario: testCase.scenario,
      userQuery: testCase.userQuery,
      passed: evaluation.passed,
      toolsCalled,
      expectedTools: testCase.expectedTool.split(',').map(t => t.trim()),
      response,
      reasoning: evaluation.reasoning,
      correctToolCalled: evaluation.correctToolCalled,
      correctArguments: evaluation.correctArguments,
      responseHelpful: evaluation.responseHelpful,
      responseAccurate: evaluation.responseAccurate,
      allCriteriaMet: evaluation.allCriteriaMet,
      latencyMs,
      timestamp: Date.now(),
      errors: errors.length > 0 ? errors : undefined,
    };

    // Log result
    if (result.passed) {
      console.log(`✅ PASSED - ${testCase.id}`);
      console.log(`   ✓ Tool: ${result.correctToolCalled}, Args: ${result.correctArguments}, Helpful: ${result.responseHelpful}, Accurate: ${result.responseAccurate}`);
    } else {
      console.log(`❌ FAILED - ${testCase.id}`);
      console.log(`   ✗ Tool: ${result.correctToolCalled}, Args: ${result.correctArguments}, Helpful: ${result.responseHelpful}, Accurate: ${result.responseAccurate}`);
      console.log(`   Reason: ${evaluation.reasoning}`);
    }

    return result;
  },
});

// Define the structured output schema using Zod - Simple pass/fail evaluation
const JudgeEvaluationSchema = z.object({
  passed: z.boolean().describe("Whether the test passed - all criteria must be met"),
  reasoning: z.string().describe("Detailed explanation of why the test passed or failed"),
  correctToolCalled: z.boolean().describe("Whether the correct tool was called"),
  correctArguments: z.boolean().describe("Whether the tool arguments were correct and appropriate"),
  responseHelpful: z.boolean().describe("Whether the response is helpful and answers the user's query"),
  responseAccurate: z.boolean().describe("Whether the response is factually accurate based on the tool output"),
  allCriteriaMet: z.boolean().describe("Whether ALL success criteria were met"),
});

type JudgeEvaluation = z.infer<typeof JudgeEvaluationSchema>;

/**
 * Evaluate a test result using GPT-5 as a judge with structured outputs
 */
async function evaluateWithJudge(
  testCase: TestCase,
  response: string,
  toolsCalled: string[]
): Promise<{
  passed: boolean;
  reasoning: string;
  correctToolCalled: boolean;
  correctArguments: boolean;
  responseHelpful: boolean;
  responseAccurate: boolean;
  allCriteriaMet: boolean;
}> {
  const judgePrompt = `You are an expert evaluator for AI agent tool usage. Evaluate the following test case with STRICT pass/fail criteria.

**Test Scenario:** ${testCase.scenario}
**User Query:** "${testCase.userQuery}"
**Expected Tool(s):** ${testCase.expectedTool}
**Expected Args:** ${JSON.stringify(testCase.expectedArgs, null, 2)}

**Actual Tools Called:** ${toolsCalled.join(', ') || 'None'}
**Agent Response:**
${response}

**Success Criteria (ALL must be met to pass):**
${testCase.successCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Evaluation Instructions:**
${testCase.evaluationPrompt}

Evaluate each aspect:
1. Was the CORRECT tool called? (exact match to expectedTool)
2. Were the tool ARGUMENTS correct and appropriate?
3. Is the response HELPFUL and answers the user's query?
4. Is the response ACCURATE based on what the tool would return?
5. Are ALL success criteria met?

The test PASSES only if ALL criteria are met. Be strict and objective.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-chat-latest",
      messages: [
        {
          role: "system",
          content: "You are an expert AI agent evaluator. Provide objective, strict pass/fail evaluations. A test only passes if ALL criteria are perfectly met."
        },
        {
          role: "user",
          content: judgePrompt
        }
      ],
      response_format: zodResponseFormat(JudgeEvaluationSchema, "evaluation"),
      temperature: 0.1, // Very low temperature for consistent strict evaluations
    });

    const messageContent = completion.choices[0].message.content;
    if (!messageContent) {
      throw new Error("No content in response");
    }

    const result: JudgeEvaluation = JSON.parse(messageContent);

    return {
      passed: result.passed,
      reasoning: result.reasoning,
      correctToolCalled: result.correctToolCalled,
      correctArguments: result.correctArguments,
      responseHelpful: result.responseHelpful,
      responseAccurate: result.responseAccurate,
      allCriteriaMet: result.allCriteriaMet,
    };
  } catch (error: any) {
    console.error("Error in LLM judge:", error.message);
    return {
      passed: false,
      reasoning: `Judge evaluation failed: ${error.message}`,
      correctToolCalled: false,
      correctArguments: false,
      responseHelpful: false,
      responseAccurate: false,
      allCriteriaMet: false,
    };
  }
}

/**
 * Run all test cases in parallel and generate summary
 */
export const runAllTestsParallel = action({
  args: {
    categories: v.optional(v.array(v.string())),
    userId: v.optional(v.id("users")), // Optional userId for evaluation tests
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<EvaluationSummary> => {
    console.log("\n🚀 Starting comprehensive tool evaluation (PARALLEL MODE)...\n");

    // Get test user if not provided
    let userId = args.userId;
    if (!userId) {
      // Get the test user from golden dataset
      const testUser = await ctx.runQuery(api.seedGoldenDataset.getTestUser, {});
      if (testUser) {
        userId = testUser._id;
        console.log(`Using test user: ${userId}\n`);
      }
    }

    // Filter test cases by category if specified
    let testCases = allTestCases;
    if (args.categories && args.categories.length > 0) {
      testCases = allTestCases.filter(t => args.categories!.includes(t.category));
    }

    console.log(`📊 Running ${testCases.length} test cases in parallel...\n`);

    // Run ALL tests in parallel
    const testPromises = testCases.map(async (testCase) => {
      try {
        const result = await ctx.runAction(internal.tools.evaluation.evaluator.runSingleTest, {
          testId: testCase.id,
          userId, // Pass userId to each test
        });
        return result;
      } catch (error: any) {
        console.error(`Failed to run test ${testCase.id}:`, error.message);
        return {
          testId: testCase.id,
          category: testCase.category,
          scenario: testCase.scenario,
          userQuery: testCase.userQuery,
          passed: false,
          toolsCalled: [],
          expectedTools: testCase.expectedTool.split(',').map(t => t.trim()),
          response: "",
          reasoning: `Test execution failed: ${error.message}`,
          correctToolCalled: false,
          correctArguments: false,
          responseHelpful: false,
          responseAccurate: false,
          allCriteriaMet: false,
          latencyMs: 0,
          timestamp: Date.now(),
          errors: [error.message],
        } as EvaluationResult;
      }
    });

    // Wait for all tests to complete
    const results = await Promise.all(testPromises);

    // Generate summary
    const summary = generateSummary(results);

    // Print summary
    printSummary(summary);

    return summary;
  },
});

/**
 * Run all test cases sequentially (legacy - use runAllTestsParallel instead)
 */
export const runAllTests = action({
  args: {
    categories: v.optional(v.array(v.string())),
    createNewThread: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<EvaluationSummary> => {
    // Just call the parallel version - it's faster and better
    return await ctx.runAction(api.tools.evaluation.evaluator.runAllTestsParallel, {
      categories: args.categories,
      userId: args.userId,
    });
  },
});

function generateSummary(results: EvaluationResult[]): EvaluationSummary {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const passRate = results.length > 0 ? (passed / results.length) * 100 : 0;
  const averageLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;

  // Category breakdown
  const categoryResults: Record<string, { total: number; passed: number; passRate: number }> = {};

  for (const result of results) {
    if (!categoryResults[result.category]) {
      categoryResults[result.category] = { total: 0, passed: 0, passRate: 0 };
    }
    categoryResults[result.category].total++;
    if (result.passed) categoryResults[result.category].passed++;
  }

  // Calculate pass rates
  for (const category in categoryResults) {
    const cat = categoryResults[category];
    cat.passRate = cat.total > 0 ? (cat.passed / cat.total) * 100 : 0;
  }

  // Failed tests
  const failedTests = results
    .filter(r => !r.passed)
    .map(r => ({
      testId: r.testId,
      scenario: r.scenario,
      reason: r.reasoning,
      correctToolCalled: r.correctToolCalled,
      correctArguments: r.correctArguments,
      responseHelpful: r.responseHelpful,
      responseAccurate: r.responseAccurate,
    }));

  return {
    totalTests: results.length,
    passed,
    failed,
    passRate,
    averageLatency,
    categoryResults,
    failedTests,
  };
}

function printSummary(summary: EvaluationSummary) {
  console.log("\n" + "=".repeat(80));
  console.log("📊 EVALUATION SUMMARY");
  console.log("=".repeat(80));
  console.log(`\nTotal Tests: ${summary.totalTests}`);
  console.log(`✅ Passed: ${summary.passed} (${summary.passRate.toFixed(1)}%)`);
  console.log(`❌ Failed: ${summary.failed} (${(100 - summary.passRate).toFixed(1)}%)`);
  console.log(`⚡ Average Latency: ${summary.averageLatency.toFixed(0)}ms`);

  console.log("\n" + "-".repeat(80));
  console.log("📂 CATEGORY BREAKDOWN");
  console.log("-".repeat(80));

  for (const [category, stats] of Object.entries(summary.categoryResults)) {
    console.log(`\n${category}:`);
    console.log(`  Tests: ${stats.passed}/${stats.total} passed (${stats.passRate.toFixed(1)}%)`);
  }

  if (summary.failedTests.length > 0) {
    console.log("\n" + "-".repeat(80));
    console.log("❌ FAILED TESTS");
    console.log("-".repeat(80));

    for (const failed of summary.failedTests) {
      console.log(`\n${failed.testId}: ${failed.scenario}`);
      console.log(`  Tool: ${failed.correctToolCalled ? '✓' : '✗'}, Args: ${failed.correctArguments ? '✓' : '✗'}, Helpful: ${failed.responseHelpful ? '✓' : '✗'}, Accurate: ${failed.responseAccurate ? '✓' : '✗'}`);
      console.log(`  Reason: ${failed.reason}`);
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

