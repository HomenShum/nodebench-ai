// convex/tools/evaluation/evaluator.ts
"use node";

import { v } from "convex/values";
import { action, internalAction } from "../../_generated/server";
import { internal, api } from "../../_generated/api";
import OpenAI from "openai";
import { allTestCases, TestCase } from "./testCases";

const openai = new OpenAI();

export interface EvaluationResult {
  testId: string;
  category: string;
  scenario: string;
  userQuery: string;
  passed: boolean;
  score: number; // 0-100
  toolsCalled: string[];
  expectedTools: string[];
  response: string;
  judgeReasoning: string;
  criteriaResults: Record<string, boolean>;
  latencyMs: number;
  timestamp: number;
  errors?: string[];
}

export interface EvaluationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  averageScore: number;
  averageLatency: number;
  categoryResults: Record<string, {
    total: number;
    passed: number;
    averageScore: number;
  }>;
  failedTests: Array<{
    testId: string;
    scenario: string;
    score: number;
    reason: string;
  }>;
}

/**
 * Run a single test case and evaluate with LLM-as-a-judge
 */
export const runSingleTest = internalAction({
  args: {
    testId: v.string(),
    threadId: v.optional(v.id("threads")),
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
      // Send message to agent and get response
      const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
        threadId: args.threadId,
        message: testCase.userQuery,
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
      score: evaluation.score,
      toolsCalled,
      expectedTools: testCase.expectedTool.split(','),
      response,
      judgeReasoning: evaluation.reasoning,
      criteriaResults: evaluation.criteriaResults,
      latencyMs,
      timestamp: Date.now(),
      errors: errors.length > 0 ? errors : undefined,
    };

    // Log result
    if (result.passed) {
      console.log(`✅ PASSED (${result.score}/100) - ${testCase.id}`);
    } else {
      console.log(`❌ FAILED (${result.score}/100) - ${testCase.id}`);
      console.log(`   Reason: ${evaluation.reasoning}`);
    }

    return result;
  },
});

/**
 * Evaluate a test result using GPT-4 as a judge
 */
async function evaluateWithJudge(
  testCase: TestCase,
  response: string,
  toolsCalled: string[]
): Promise<{
  passed: boolean;
  score: number;
  reasoning: string;
  criteriaResults: Record<string, boolean>;
}> {
  const judgePrompt = `You are an expert evaluator for AI agent tool usage. Evaluate the following test case:

**Test Scenario:** ${testCase.scenario}
**User Query:** "${testCase.userQuery}"
**Expected Tool(s):** ${testCase.expectedTool}
**Expected Args:** ${JSON.stringify(testCase.expectedArgs, null, 2)}

**Actual Tools Called:** ${toolsCalled.join(', ') || 'None'}
**Agent Response:**
${response}

**Success Criteria:**
${testCase.successCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

**Evaluation Task:**
${testCase.evaluationPrompt}

Please evaluate this test case and provide:
1. A score from 0-100 (100 = perfect, 0 = complete failure)
2. Whether the test PASSED (score >= 70) or FAILED
3. Detailed reasoning for your evaluation
4. For each success criterion, indicate if it was met (true/false)

Respond in JSON format:
{
  "score": <number 0-100>,
  "passed": <boolean>,
  "reasoning": "<detailed explanation>",
  "criteriaResults": {
    "criterion_1": <boolean>,
    "criterion_2": <boolean>,
    ...
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-chat-latest",
      messages: [
        {
          role: "system",
          content: "You are an expert AI agent evaluator. Provide objective, detailed evaluations in JSON format."
        },
        {
          role: "user",
          content: judgePrompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    return {
      passed: result.passed || false,
      score: result.score || 0,
      reasoning: result.reasoning || "No reasoning provided",
      criteriaResults: result.criteriaResults || {},
    };
  } catch (error: any) {
    console.error("Error in LLM judge:", error.message);
    return {
      passed: false,
      score: 0,
      reasoning: `Judge evaluation failed: ${error.message}`,
      criteriaResults: {},
    };
  }
}

/**
 * Run all test cases and generate summary
 */
export const runAllTests = action({
  args: {
    categories: v.optional(v.array(v.string())),
    createNewThread: v.optional(v.boolean()),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<EvaluationSummary> => {
    console.log("\n🚀 Starting comprehensive tool evaluation...\n");

    // Filter test cases by category if specified
    let testCases = allTestCases;
    if (args.categories && args.categories.length > 0) {
      testCases = allTestCases.filter(t => args.categories!.includes(t.category));
    }

    console.log(`📊 Running ${testCases.length} test cases...\n`);

    // Create a test thread if needed
    let threadId: any = undefined;
    if (args.createNewThread) {
      // You would create a thread here if needed
      // threadId = await ctx.runMutation(api.threads.create, {});
    }

    const results: EvaluationResult[] = [];

    // Run tests sequentially to avoid rate limits
    for (const testCase of testCases) {
      try {
        const result = await ctx.runAction(internal.tools.evaluation.evaluator.runSingleTest, {
          testId: testCase.id,
          threadId,
        });
        results.push(result);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Failed to run test ${testCase.id}:`, error.message);
        results.push({
          testId: testCase.id,
          category: testCase.category,
          scenario: testCase.scenario,
          userQuery: testCase.userQuery,
          passed: false,
          score: 0,
          toolsCalled: [],
          expectedTools: testCase.expectedTool.split(','),
          response: "",
          judgeReasoning: `Test execution failed: ${error.message}`,
          criteriaResults: {},
          latencyMs: 0,
          timestamp: Date.now(),
          errors: [error.message],
        });
      }
    }

    // Generate summary
    const summary = generateSummary(results);
    
    // Print summary
    printSummary(summary);

    return summary;
  },
});

function generateSummary(results: EvaluationResult[]): EvaluationSummary {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const averageScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const averageLatency = results.reduce((sum, r) => sum + r.latencyMs, 0) / results.length;

  // Category breakdown
  const categoryResults: Record<string, { total: number; passed: number; averageScore: number }> = {};
  
  for (const result of results) {
    if (!categoryResults[result.category]) {
      categoryResults[result.category] = { total: 0, passed: 0, averageScore: 0 };
    }
    categoryResults[result.category].total++;
    if (result.passed) categoryResults[result.category].passed++;
    categoryResults[result.category].averageScore += result.score;
  }

  // Calculate averages
  for (const category in categoryResults) {
    categoryResults[category].averageScore /= categoryResults[category].total;
  }

  // Failed tests
  const failedTests = results
    .filter(r => !r.passed)
    .map(r => ({
      testId: r.testId,
      scenario: r.scenario,
      score: r.score,
      reason: r.judgeReasoning,
    }));

  return {
    totalTests: results.length,
    passed,
    failed,
    averageScore,
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
  console.log(`✅ Passed: ${summary.passed} (${((summary.passed / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed: ${summary.failed} (${((summary.failed / summary.totalTests) * 100).toFixed(1)}%)`);
  console.log(`📈 Average Score: ${summary.averageScore.toFixed(1)}/100`);
  console.log(`⚡ Average Latency: ${summary.averageLatency.toFixed(0)}ms`);

  console.log("\n" + "-".repeat(80));
  console.log("📂 CATEGORY BREAKDOWN");
  console.log("-".repeat(80));
  
  for (const [category, stats] of Object.entries(summary.categoryResults)) {
    const passRate = (stats.passed / stats.total) * 100;
    console.log(`\n${category}:`);
    console.log(`  Tests: ${stats.passed}/${stats.total} passed (${passRate.toFixed(1)}%)`);
    console.log(`  Avg Score: ${stats.averageScore.toFixed(1)}/100`);
  }

  if (summary.failedTests.length > 0) {
    console.log("\n" + "-".repeat(80));
    console.log("❌ FAILED TESTS");
    console.log("-".repeat(80));
    
    for (const failed of summary.failedTests) {
      console.log(`\n${failed.testId}: ${failed.scenario}`);
      console.log(`  Score: ${failed.score}/100`);
      console.log(`  Reason: ${failed.reason}`);
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

