// convex/tools/evaluation/quickTest.ts
"use node";

import { action } from "../../_generated/server";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { allTestCases } from "./testCases";

/**
 * Quick test runner - runs a few key tests to verify everything works
 */
export const runQuickTest = action({
  args: {},
  returns: v.object({
    totalTests: v.number(),
    passed: v.number(),
    failed: v.number(),
    results: v.array(v.any()),
  }),
  handler: async (ctx): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    results: any[];
  }> => {
    console.log("\n🚀 Running Quick Test Suite\n");
    console.log("Testing key functionality across all tool categories...\n");

    // Get test user ID
    const testUserId = await ctx.runQuery(internal.tools.evaluation.helpers.getTestUser, {});
    if (!testUserId) {
      throw new Error("No test user found. Please create a user account first.");
    }
    console.log(`Using test user: ${testUserId}\n`);

    // Select one test from each category
    const quickTests = [
      "doc-001",    // findDocument
      "doc-002",    // getDocumentContent
      "media-001",  // searchMedia
      "task-001",   // listTasks
      "cal-001",    // listEvents
      "web-001",    // linkupSearch
    ];

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const testId of quickTests) {
      const testCase = allTestCases.find(t => t.id === testId);
      if (!testCase) {
        console.log(`⚠️  Test ${testId} not found, skipping...`);
        continue;
      }

      console.log(`\n${"=".repeat(80)}`);
      console.log(`🧪 Test: ${testCase.id} - ${testCase.scenario}`);
      console.log(`Query: "${testCase.userQuery}"`);
      console.log(`Expected Tool: ${testCase.expectedTool}`);
      console.log("-".repeat(80));

      try {
        const result = await ctx.runAction(internal.tools.evaluation.evaluator.runSingleTest, {
          testId,
          userId: testUserId, // Pass test user ID
        });

        results.push(result);

        if (result.passed) {
          passed++;
          console.log(`\n✅ PASSED`);
          console.log(`Tools Called: ${result.toolsCalled.join(", ")}`);
          console.log(`Latency: ${result.latencyMs}ms`);
          console.log(`✓ Tool: ${result.correctToolCalled}, Args: ${result.correctArguments}, Helpful: ${result.responseHelpful}, Accurate: ${result.responseAccurate}`);
        } else {
          failed++;
          console.log(`\n❌ FAILED`);
          console.log(`Tools Called: ${result.toolsCalled.join(", ")}`);
          console.log(`✗ Tool: ${result.correctToolCalled}, Args: ${result.correctArguments}, Helpful: ${result.responseHelpful}, Accurate: ${result.responseAccurate}`);
          console.log(`Reason: ${result.reasoning}`);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error: any) {
        failed++;
        console.log(`\n❌ ERROR: ${error.message}`);
      }
    }

    // Print summary
    console.log(`\n${"=".repeat(80)}`);
    console.log("📊 QUICK TEST SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${quickTests.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / quickTests.length) * 100).toFixed(1)}%`);
    console.log("=".repeat(80) + "\n");

    return {
      totalTests: quickTests.length,
      passed,
      failed,
      results,
    };
  },
});

/**
 * Test a specific tool directly
 */
export const testTool = action({
  args: {
    toolName: v.string(),
    userQuery: v.string(),
  },
  returns: v.object({
    response: v.string(),
    toolsCalled: v.array(v.string()),
  }),
  handler: async (ctx, args): Promise<{
    response: string;
    toolsCalled: string[];
  }> => {
    console.log(`\n🧪 Testing tool: ${args.toolName}`);
    console.log(`Query: "${args.userQuery}"\n`);

    try {
      const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
        message: args.userQuery,
      });

      console.log("Response:", result.response);
      console.log("\nTools Called:", result.toolsCalled.join(", "));

      return result;
    } catch (error: any) {
      console.error("Error:", error.message);
      throw error;
    }
  },
});

/**
 * Test document tools specifically
 */
export const testDocumentTools = action({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx): Promise<any[]> => {
    console.log("\n📄 Testing Document Tools\n");

    const tests = [
      { query: "Find documents about revenue", expectedTool: "findDocument" },
      { query: "Create a new document called 'Test Document'", expectedTool: "createDocument" },
      { query: "What is this document about?", expectedTool: "analyzeDocument" },
    ];

    const results = [];

    for (const test of tests) {
      console.log(`\nQuery: "${test.query}"`);
      console.log(`Expected: ${test.expectedTool}`);

      try {
        const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
          message: test.query,
        });

        const toolUsed = result.toolsCalled[0] || "none";
        const correct = toolUsed === test.expectedTool;

        console.log(`Tool Used: ${toolUsed} ${correct ? "✅" : "❌"}`);
        console.log(`Response: ${result.response.substring(0, 200)}...`);

        results.push({
          query: test.query,
          expectedTool: test.expectedTool,
          actualTool: toolUsed,
          correct,
          response: result.response,
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        results.push({
          query: test.query,
          expectedTool: test.expectedTool,
          actualTool: "error",
          correct: false,
          error: error.message,
        });
      }
    }

    const passed = results.filter(r => r.correct).length;
    console.log(`\n📊 Results: ${passed}/${tests.length} passed`);

    return results;
  },
});

/**
 * Test web search with images
 */
export const testWebSearch = action({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx): Promise<any[]> => {
    console.log("\n🌐 Testing Web Search with Images\n");

    const queries = [
      "Search for latest AI developments",
      "Find images of the Eiffel Tower",
      "What's the weather like today?",
    ];

    const results = [];

    for (const query of queries) {
      console.log(`\nQuery: "${query}"`);

      try {
        const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
          message: query,
        });

        const usedLinkup = result.toolsCalled.includes("linkupSearch");
        console.log(`Used linkupSearch: ${usedLinkup ? "✅" : "❌"}`);
        console.log(`Response length: ${result.response.length} chars`);
        console.log(`Has images: ${result.response.includes("![") ? "✅" : "❌"}`);

        results.push({
          query,
          usedLinkup,
          responseLength: result.response.length,
          hasImages: result.response.includes("!["),
          toolsCalled: result.toolsCalled,
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
        results.push({
          query,
          error: error.message,
        });
      }
    }

    return results;
  },
});

/**
 * Test multi-step workflow
 */
export const testWorkflow = action({
  args: {},
  returns: v.object({
    workflow: v.string(),
    toolsCalled: v.optional(v.array(v.string())),
    success: v.boolean(),
    response: v.optional(v.string()),
    error: v.optional(v.string()),
  }),
  handler: async (ctx): Promise<{
    workflow: string;
    toolsCalled?: string[];
    success: boolean;
    response?: string;
    error?: string;
  }> => {
    console.log("\n🔄 Testing Multi-Step Workflow\n");

    const workflow = "Find my revenue report, open it, and tell me what it's about";
    console.log(`Workflow: "${workflow}"\n`);

    try {
      const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
        message: workflow,
      });

      console.log("Tools Called:", result.toolsCalled.join(" → "));
      console.log("\nExpected sequence: findDocument → getDocumentContent → analyzeDocument");
      
      const hasFind = result.toolsCalled.includes("findDocument");
      const hasGet = result.toolsCalled.includes("getDocumentContent");
      const hasAnalyze = result.toolsCalled.includes("analyzeDocument");

      console.log(`\nfindDocument: ${hasFind ? "✅" : "❌"}`);
      console.log(`getDocumentContent: ${hasGet ? "✅" : "❌"}`);
      console.log(`analyzeDocument: ${hasAnalyze ? "✅" : "❌"}`);

      const success = hasFind && hasGet && hasAnalyze;
      console.log(`\nWorkflow ${success ? "✅ PASSED" : "❌ FAILED"}`);

      return {
        workflow,
        toolsCalled: result.toolsCalled,
        success,
        response: result.response,
      };
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      return {
        workflow,
        error: error.message,
        success: false,
      };
    }
  },
});

