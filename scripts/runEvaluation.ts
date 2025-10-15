#!/usr/bin/env tsx
// scripts/runEvaluation.ts
// CLI script to run Agent tool evaluations

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;

if (!CONVEX_URL) {
  console.error("❌ Error: CONVEX_URL not found in environment variables");
  console.error("Please set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "all";

  console.log("🚀 Agent Tool Evaluation System");
  console.log("================================\n");

  try {
    switch (command) {
      case "all":
        await runAllTests();
        break;
      
      case "category":
        const category = args[1];
        if (!category) {
          console.error("❌ Please specify a category");
          console.error("Usage: npm run eval category <category-name>");
          process.exit(1);
        }
        await runCategoryTests(category);
        break;
      
      case "single":
        const testId = args[1];
        if (!testId) {
          console.error("❌ Please specify a test ID");
          console.error("Usage: npm run eval single <test-id>");
          process.exit(1);
        }
        await runSingleTest(testId);
        break;
      
      case "list":
        await listTests();
        break;
      
      case "help":
      default:
        printHelp();
        break;
    }
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }
}

async function runAllTests() {
  console.log("📊 Running all test cases...\n");
  
  const result = await client.action(api.tools.evaluation.evaluator.runAllTests, {
    createNewThread: true,
  });
  
  console.log("\n✅ Evaluation complete!");
  console.log(`Results saved. Check the console output above for details.`);
}

async function runCategoryTests(category: string) {
  console.log(`📂 Running tests for category: ${category}\n`);
  
  const result = await client.action(api.tools.evaluation.evaluator.runAllTests, {
    categories: [category],
    createNewThread: true,
  });
  
  console.log("\n✅ Evaluation complete!");
}

async function runSingleTest(testId: string) {
  console.log(`🧪 Running single test: ${testId}\n`);
  
  // Note: This would need to be implemented as a separate action
  console.log("❌ Single test execution not yet implemented");
  console.log("Use 'npm run eval category <category>' to run a category of tests");
}

async function listTests() {
  console.log("📋 Available Test Cases:\n");
  
  // Import test cases
  const { allTestCases, testCaseStats } = await import("../convex/tools/evaluation/testCases");
  
  console.log("Test Statistics:");
  console.log(`  Documents: ${testCaseStats.documents} tests`);
  console.log(`  Media: ${testCaseStats.media} tests`);
  console.log(`  Tasks: ${testCaseStats.tasks} tests`);
  console.log(`  Calendar: ${testCaseStats.calendar} tests`);
  console.log(`  Organization: ${testCaseStats.organization} tests`);
  console.log(`  Web Search: ${testCaseStats.webSearch} tests`);
  console.log(`  Workflows: ${testCaseStats.workflows} tests`);
  console.log(`  TOTAL: ${testCaseStats.total} tests\n`);
  
  console.log("Test Cases by Category:\n");
  
  const byCategory: Record<string, any[]> = {};
  for (const test of allTestCases) {
    if (!byCategory[test.category]) {
      byCategory[test.category] = [];
    }
    byCategory[test.category].push(test);
  }
  
  for (const [category, tests] of Object.entries(byCategory)) {
    console.log(`\n${category}:`);
    for (const test of tests) {
      console.log(`  ${test.id}: ${test.scenario}`);
    }
  }
}

function printHelp() {
  console.log(`
Agent Tool Evaluation CLI

Usage:
  npm run eval [command] [options]

Commands:
  all                    Run all test cases
  category <name>        Run tests for a specific category
  single <test-id>       Run a single test case
  list                   List all available test cases
  help                   Show this help message

Categories:
  - Document Discovery
  - Document Reading
  - Document Analysis
  - Document Creation
  - Document Editing
  - Media Search
  - Media Analysis
  - Media Details
  - Media Listing
  - Task Listing
  - Task Creation
  - Task Update
  - Event Listing
  - Event Creation
  - Folder Contents
  - Web Search
  - Image Search
  - Document Workflow
  - Task Workflow

Examples:
  npm run eval all
  npm run eval category "Document Discovery"
  npm run eval single doc-001
  npm run eval list

Environment Variables:
  NEXT_PUBLIC_CONVEX_URL    Convex deployment URL
  OPENAI_API_KEY            OpenAI API key (for LLM judge)
  LINKUP_API_KEY            Linkup API key (for web search tests)
`);
}

main().catch(console.error);

