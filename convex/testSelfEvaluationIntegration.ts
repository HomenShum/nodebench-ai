/**
 * Integration Test: Self-Evaluation in Fast Agent Panel
 * Tests the complete flow: User → Coordinator → EntityResearchAgent → Self-Evaluation → Auto-Retry
 */

import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  response: string;
  qualityBadge: string | null;
  retryDetected: boolean;
  completenessPercentage: number | null;
  details: string;
}

/**
 * Extract quality badge from response
 */
function extractQualityBadge(response: string): string | null {
  const verifiedMatch = response.match(/\[✅ VERIFIED - (\d+)% complete\]/);
  const partialMatch = response.match(/\[⚠️ PARTIAL - (\d+)% complete\]/);
  
  if (verifiedMatch) return `✅ VERIFIED (${verifiedMatch[1]}%)`;
  if (partialMatch) return `⚠️ PARTIAL (${partialMatch[1]}%)`;
  return null;
}

/**
 * Extract completeness percentage from response
 */
function extractCompletenessPercentage(response: string): number | null {
  const match = response.match(/(\d+)% complete/);
  return match ? parseInt(match[1]) : null;
}

/**
 * Test 1: Direct EntityResearchAgent call with self-evaluation
 */
export const testDirectAgentSelfEvaluation = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    console.log("🧪 TEST 1: Direct EntityResearchAgent with Self-Evaluation");
    console.log("================================================================================");
    
    const startTime = Date.now();
    const { createEntityResearchAgent } = await import("./agents/specializedAgents");
    
    const userId = "test-user-id" as Id<"users">;
    const agent = createEntityResearchAgent(ctx, userId);
    const { thread } = await agent.createThread(ctx);
    
    // Research a company
    const result = await thread.streamText({
      system: "Research the company: Stripe",
    });
    
    await result.consumeStream();
    const response = await result.text;
    const duration = Date.now() - startTime;
    
    // Extract quality indicators
    const qualityBadge = extractQualityBadge(response);
    const completenessPercentage = extractCompletenessPercentage(response);
    const retryDetected = response.includes("Attempt 2") || response.includes("RETRY");
    
    // Determine pass/fail
    const passed = qualityBadge !== null && response.includes("Stripe");
    
    const details = `
Response length: ${response.length} characters
Quality badge: ${qualityBadge || 'Not found'}
Completeness: ${completenessPercentage || 'Unknown'}%
Retry detected: ${retryDetected ? 'Yes' : 'No'}
Contains company data: ${response.includes("Stripe") ? 'Yes' : 'No'}
    `.trim();
    
    console.log(`\n📊 RESULT:`);
    console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   ${details.split('\n').join('\n   ')}`);
    
    return {
      testName: "Direct EntityResearchAgent with Self-Evaluation",
      passed,
      duration,
      response: response.substring(0, 500),
      qualityBadge,
      retryDetected,
      completenessPercentage,
      details,
    };
  },
});

/**
 * Test 2: Coordinator delegation with self-evaluation
 */
export const testCoordinatorDelegationSelfEvaluation = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    console.log("\n🧪 TEST 2: Coordinator Delegation with Self-Evaluation");
    console.log("================================================================================");
    
    const startTime = Date.now();
    
    // Use the coordinator to delegate to EntityResearchAgent
    const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
      message: "Research Anthropic",
      useCoordinator: true,
    });
    
    const duration = Date.now() - startTime;
    const response = result.response;
    
    // Extract quality indicators
    const qualityBadge = extractQualityBadge(response);
    const completenessPercentage = extractCompletenessPercentage(response);
    const retryDetected = response.includes("Attempt 2") || response.includes("RETRY");
    const delegationDetected = result.toolsCalled.includes("delegateToEntityResearchAgent");
    
    // Determine pass/fail
    const passed = qualityBadge !== null && 
                   response.includes("Anthropic") && 
                   delegationDetected;
    
    const details = `
Response length: ${response.length} characters
Quality badge: ${qualityBadge || 'Not found'}
Completeness: ${completenessPercentage || 'Unknown'}%
Retry detected: ${retryDetected ? 'Yes' : 'No'}
Delegation detected: ${delegationDetected ? 'Yes' : 'No'}
Tools called: ${result.toolsCalled.join(", ")}
Contains company data: ${response.includes("Anthropic") ? 'Yes' : 'No'}
    `.trim();
    
    console.log(`\n📊 RESULT:`);
    console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   ${details.split('\n').join('\n   ')}`);
    
    return {
      testName: "Coordinator Delegation with Self-Evaluation",
      passed,
      duration,
      response: response.substring(0, 500),
      qualityBadge,
      retryDetected,
      completenessPercentage,
      details,
    };
  },
});

/**
 * Test 3: Multiple entities with self-evaluation
 */
export const testMultipleEntitiesSelfEvaluation = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    console.log("\n🧪 TEST 3: Multiple Entities with Self-Evaluation");
    console.log("================================================================================");
    
    const startTime = Date.now();
    
    // Research multiple companies
    const result = await ctx.runAction(internal.fastAgentPanelStreaming.sendMessageInternal, {
      message: "Compare Stripe and Shopify",
      useCoordinator: true,
    });
    
    const duration = Date.now() - startTime;
    const response = result.response;
    
    // Extract quality indicators for both companies
    const qualityBadges = response.match(/\[(✅ VERIFIED|⚠️ PARTIAL) - \d+% complete\]/g) || [];
    const completenessMatches = response.match(/(\d+)% complete/g) || [];
    const retryDetected = response.includes("Attempt 2") || response.includes("RETRY");
    
    // Determine pass/fail
    const passed = qualityBadges.length >= 2 && 
                   response.includes("Stripe") && 
                   response.includes("Shopify");
    
    const details = `
Response length: ${response.length} characters
Quality badges found: ${qualityBadges.length}
Quality badges: ${qualityBadges.join(", ")}
Completeness values: ${completenessMatches.join(", ")}
Retry detected: ${retryDetected ? 'Yes' : 'No'}
Contains Stripe: ${response.includes("Stripe") ? 'Yes' : 'No'}
Contains Shopify: ${response.includes("Shopify") ? 'Yes' : 'No'}
    `.trim();
    
    console.log(`\n📊 RESULT:`);
    console.log(`   Status: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   ${details.split('\n').join('\n   ')}`);
    
    return {
      testName: "Multiple Entities with Self-Evaluation",
      passed,
      duration,
      response: response.substring(0, 500),
      qualityBadge: qualityBadges.join(", "),
      retryDetected,
      completenessPercentage: null,
      details,
    };
  },
});

/**
 * Run all self-evaluation integration tests
 */
export const runAllSelfEvaluationTests = action({
  args: {},
  handler: async (ctx) => {
    console.log("🚀 RUNNING ALL SELF-EVALUATION INTEGRATION TESTS");
    console.log("================================================================================\n");
    
    const results: TestResult[] = [];
    
    // Test 1: Direct agent
    try {
      const result1 = await ctx.runAction(api.testSelfEvaluationIntegration.testDirectAgentSelfEvaluation, {});
      results.push(result1);
    } catch (error: any) {
      console.log(`❌ TEST 1 FAILED: ${error.message}`);
      results.push({
        testName: "Direct EntityResearchAgent with Self-Evaluation",
        passed: false,
        duration: 0,
        response: "",
        qualityBadge: null,
        retryDetected: false,
        completenessPercentage: null,
        details: `Error: ${error.message}`,
      });
    }

    // Test 2: Coordinator delegation
    try {
      const result2 = await ctx.runAction(api.testSelfEvaluationIntegration.testCoordinatorDelegationSelfEvaluation, {});
      results.push(result2);
    } catch (error: any) {
      console.log(`❌ TEST 2 FAILED: ${error.message}`);
      results.push({
        testName: "Coordinator Delegation with Self-Evaluation",
        passed: false,
        duration: 0,
        response: "",
        qualityBadge: null,
        retryDetected: false,
        completenessPercentage: null,
        details: `Error: ${error.message}`,
      });
    }

    // Test 3: Multiple entities
    try {
      const result3 = await ctx.runAction(api.testSelfEvaluationIntegration.testMultipleEntitiesSelfEvaluation, {});
      results.push(result3);
    } catch (error: any) {
      console.log(`❌ TEST 3 FAILED: ${error.message}`);
      results.push({
        testName: "Multiple Entities with Self-Evaluation",
        passed: false,
        duration: 0,
        response: "",
        qualityBadge: null,
        retryDetected: false,
        completenessPercentage: null,
        details: `Error: ${error.message}`,
      });
    }
    
    // Summary
    console.log("\n\n================================================================================");
    console.log("📊 SUMMARY");
    console.log("================================================================================");
    
    const passCount = results.filter(r => r.passed).length;
    const failCount = results.filter(r => !r.passed).length;
    const retryCount = results.filter(r => r.retryDetected).length;
    const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
    
    console.log(`Total tests: ${results.length}`);
    console.log(`✅ Passed: ${passCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`🔄 Retries detected: ${retryCount}`);
    console.log(`⏱️  Avg duration: ${avgDuration}ms`);
    
    console.log("\n📋 Individual Results:");
    for (const result of results) {
      const status = result.passed ? '✅' : '❌';
      const badge = result.qualityBadge || 'No badge';
      const retry = result.retryDetected ? ' [RETRY]' : '';
      console.log(`   ${status} ${result.testName}: ${badge}${retry} (${result.duration}ms)`);
    }
    
    return {
      summary: {
        totalTests: results.length,
        passed: passCount,
        failed: failCount,
        retriesDetected: retryCount,
        avgDuration,
      },
      results,
    };
  },
});

