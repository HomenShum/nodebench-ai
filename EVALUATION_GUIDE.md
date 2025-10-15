# Agent Tools Evaluation Guide

## Overview

This guide explains how to use the LLM-as-a-Judge evaluation system to test all 17 Convex Agent tools. The system automatically tests tool functionality, measures performance, and provides detailed feedback.

## Quick Start

### Prerequisites

1. **Environment Variables** - Make sure these are set:
   ```bash
   NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
   OPENAI_API_KEY=<your-openai-key>
   LINKUP_API_KEY=<your-linkup-key>  # For web search tests
   ```

2. **Convex Deployment** - Ensure your Convex backend is running:
   ```bash
   npm run dev:backend
   ```

### Running Tests

#### Quick Test (Recommended for First Run)
Tests one example from each category (~6 tests, ~2 minutes):
```bash
npm run eval:quick
```

#### Category-Specific Tests
```bash
npm run eval:docs      # Test document tools only
npm run eval:web       # Test web search with images
npm run eval:workflow  # Test multi-step workflows
```

#### Full Evaluation Suite
Run all 25+ test cases (~10-15 minutes):
```bash
npm run eval all
```

#### Custom Category
```bash
npm run eval category "Document Discovery"
npm run eval category "Media Search"
npm run eval category "Task Management"
```

#### List All Tests
```bash
npm run eval list
```

---

## Test Categories

### 📄 Document Tools (5 tests)
- **doc-001**: Find documents by title/content
- **doc-002**: Read document content
- **doc-003**: Analyze and summarize documents
- **doc-004**: Create new documents
- **doc-005**: Update document properties

### 🖼️ Media Tools (4 tests)
- **media-001**: Search for images/videos
- **media-002**: AI analysis of media files
- **media-003**: Get media file details
- **media-004**: List all media files

### ✅ Task Tools (4 tests)
- **task-001**: List tasks with filters
- **task-002**: Create new tasks
- **task-003**: Update task status
- **task-004**: Filter by priority

### 📅 Calendar Tools (2 tests)
- **cal-001**: List events by time range
- **cal-002**: Create new events

### 📁 Organization Tools (1 test)
- **org-001**: Get folder contents

### 🌐 Web Search Tools (2 tests)
- **web-001**: Search for current information
- **web-002**: Search with images

### 🔄 Multi-Step Workflows (2 tests)
- **workflow-001**: Document discovery → analysis → editing
- **workflow-002**: Task listing → creation → updating

---

## Understanding Results

### Test Output

Each test provides:

```
🧪 Test: doc-001 - User wants to find a document by title
Query: "Find my revenue report"
Expected Tool: findDocument
--------------------------------------------------------------------------------

✅ PASSED (Score: 95/100)
Tools Called: findDocument
Latency: 1234ms

Judge Reasoning:
The AI correctly used the findDocument tool with appropriate search parameters.
The response included document IDs, titles, and metadata in a well-formatted list.
All success criteria were met.
```

### Scoring System

- **100**: Perfect execution, all criteria met
- **90-99**: Excellent, minor formatting issues
- **70-89**: Good, correct tool but suboptimal response
- **50-69**: Partial success, some criteria missed
- **0-49**: Failed, wrong tool or error

### Pass/Fail Threshold

- **PASSED**: Score >= 70
- **FAILED**: Score < 70

---

## Evaluation Summary

After running tests, you'll see a summary like:

```
================================================================================
📊 EVALUATION SUMMARY
================================================================================

Total Tests: 25
✅ Passed: 23 (92.0%)
❌ Failed: 2 (8.0%)
📈 Average Score: 87.5/100
⚡ Average Latency: 1456ms

--------------------------------------------------------------------------------
📂 CATEGORY BREAKDOWN
--------------------------------------------------------------------------------

Document Discovery:
  Tests: 5/5 passed (100.0%)
  Avg Score: 92.3/100

Media Search:
  Tests: 3/4 passed (75.0%)
  Avg Score: 81.2/100

Task Management:
  Tests: 4/4 passed (100.0%)
  Avg Score: 88.7/100

--------------------------------------------------------------------------------
❌ FAILED TESTS
--------------------------------------------------------------------------------

media-002: User wants to analyze an image
  Score: 65/100
  Reason: AI analysis was incomplete, missing object detection details

web-002: User wants to find images on the web
  Score: 55/100
  Reason: Images were not properly formatted in markdown syntax
================================================================================
```

---

## Test Case Structure

Each test case includes:

```typescript
{
  id: "doc-001",
  category: "Document Discovery",
  tool: "findDocument",
  scenario: "User wants to find a document by title",
  userQuery: "Find my revenue report",
  expectedTool: "findDocument",
  expectedArgs: { query: "revenue report", limit: 10 },
  successCriteria: [
    "Tool called is findDocument",
    "Query parameter contains 'revenue' or 'report'",
    "Response includes document IDs and titles",
    "Response is formatted as a numbered list"
  ],
  evaluationPrompt: "Evaluate if the AI correctly used findDocument..."
}
```

---

## LLM-as-a-Judge

The evaluation system uses **GPT-4o** as an impartial judge to:

1. **Verify Tool Selection** - Did the AI choose the right tool?
2. **Check Parameters** - Were the tool arguments correct?
3. **Evaluate Response Quality** - Is the response helpful and accurate?
4. **Assess Criteria** - Were all success criteria met?

### Judge Prompt Example

```
You are an expert evaluator for AI agent tool usage.

Test Scenario: User wants to find a document by title
User Query: "Find my revenue report"
Expected Tool: findDocument

Actual Tools Called: findDocument
Agent Response: [response text]

Success Criteria:
1. Tool called is findDocument
2. Query parameter contains 'revenue' or 'report'
3. Response includes document IDs and titles
4. Response is formatted as a numbered list

Evaluate and provide:
- Score (0-100)
- Pass/Fail (>= 70 = pass)
- Detailed reasoning
- Criteria results (true/false for each)
```

---

## Troubleshooting

### Common Issues

#### 1. "CONVEX_URL not found"
```bash
# Add to .env.local
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

#### 2. "OpenAI API key not found"
```bash
# Add to .env.local
OPENAI_API_KEY=sk-...
```

#### 3. "Linkup API key not found"
```bash
# Add to Convex environment
npx convex env set LINKUP_API_KEY your_key_here
```

#### 4. "Test execution failed"
- Check that Convex backend is running (`npm run dev:backend`)
- Verify all environment variables are set
- Check console for specific error messages

#### 5. Low scores on document/media tests
- Make sure you have test data in your database
- Create sample documents and media files
- Check that user authentication is working

---

## Adding New Tests

### 1. Add Test Case

Edit `convex/tools/evaluation/testCases.ts`:

```typescript
export const myNewTests: TestCase[] = [
  {
    id: "custom-001",
    category: "Custom Category",
    tool: "myTool",
    scenario: "Description of what this tests",
    userQuery: "Natural language query",
    expectedTool: "myTool",
    expectedArgs: { param: "value" },
    successCriteria: [
      "Criterion 1",
      "Criterion 2",
    ],
    evaluationPrompt: "Evaluate if..."
  }
];

// Add to allTestCases
export const allTestCases: TestCase[] = [
  ...documentToolTests,
  ...myNewTests,  // Add here
];
```

### 2. Run Your Test

```bash
npm run eval category "Custom Category"
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Excellent | Acceptable |
|--------|--------|-----------|------------|
| Pass Rate | 100% | >90% | >70% |
| Avg Score | 90+ | 85+ | 75+ |
| Latency | <2s | <3s | <5s |
| Tool Accuracy | 100% | >95% | >85% |

### Current Performance

Run `npm run eval:quick` to see current metrics.

---

## Best Practices

### 1. Run Tests Regularly
- After adding new tools
- After modifying existing tools
- Before deploying to production
- When changing AI model or prompts

### 2. Fix Failures Immediately
- Investigate failed tests
- Update tool implementation or test criteria
- Re-run to verify fixes

### 3. Monitor Latency
- Keep average latency under 2 seconds
- Optimize slow tools
- Consider caching for repeated queries

### 4. Update Test Cases
- Add tests for new features
- Update criteria when tools change
- Remove obsolete tests

---

## Next Steps

1. **Run Quick Test**: `npm run eval:quick`
2. **Review Results**: Check pass rate and scores
3. **Fix Failures**: Address any failed tests
4. **Run Full Suite**: `npm run eval all`
5. **Monitor Performance**: Track metrics over time

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test output for specific errors
3. Check Convex logs for backend errors
4. Verify all environment variables are set

---

**Happy Testing! 🚀**

