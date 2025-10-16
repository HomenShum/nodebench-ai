// convex/agents/__tests__/specializedAgents.test.ts
// Tests for specialized agent system

import { describe, it, expect } from "vitest";
import type { ActionCtx } from "../../_generated/server";

/**
 * MANUAL TESTING GUIDE FOR SPECIALIZED AGENTS
 * 
 * Since these agents require live API calls and database access,
 * manual testing is recommended. Use the Fast Agent Panel UI or
 * run these test cases via the Convex dashboard.
 */

export const specializedAgentTestCases = [
  // ============================================================================
  // Document Agent Tests
  // ============================================================================
  {
    category: "Document Agent",
    name: "Find and read document",
    input: "Show me the revenue report",
    expectedAgent: "DocumentAgent",
    expectedTools: ["findDocument", "getDocumentContent"],
    expectedBehavior: [
      "Calls findDocument to search for 'revenue report'",
      "Calls getDocumentContent with the found document ID",
      "Returns the full document content",
    ],
    successCriteria: "Document content is displayed to user",
  },
  {
    category: "Document Agent",
    name: "Create new document",
    input: "Create a document called 'Meeting Notes for Q4 Planning'",
    expectedAgent: "DocumentAgent",
    expectedTools: ["createDocument"],
    expectedBehavior: [
      "Calls createDocument with title 'Meeting Notes for Q4 Planning'",
      "Returns confirmation with document ID",
    ],
    successCriteria: "New document is created and ID is returned",
  },
  {
    category: "Document Agent",
    name: "Search multiple documents",
    input: "Find all documents about marketing strategy",
    expectedAgent: "DocumentAgent",
    expectedTools: ["findDocument"],
    expectedBehavior: [
      "Calls findDocument with query 'marketing strategy'",
      "Returns list of matching documents",
    ],
    successCriteria: "List of relevant documents is returned",
  },

  // ============================================================================
  // Media Agent Tests
  // ============================================================================
  {
    category: "Media Agent",
    name: "YouTube video search",
    input: "Find videos about Python programming",
    expectedAgent: "MediaAgent",
    expectedTools: ["youtubeSearch"],
    expectedBehavior: [
      "Calls youtubeSearch with query 'Python programming'",
      "Returns structured data with video metadata",
      "UI renders YouTubeGallery component",
    ],
    successCriteria: "YouTube gallery is displayed with video thumbnails",
  },
  {
    category: "Media Agent",
    name: "Image search with fallback",
    input: "Find images of cats",
    expectedAgent: "MediaAgent",
    expectedTools: ["searchMedia", "linkupSearch"],
    expectedBehavior: [
      "First calls searchMedia to search internal files",
      "If no results, calls linkupSearch with includeImages: true",
      "Returns image gallery",
    ],
    successCriteria: "Image gallery is displayed",
  },
  {
    category: "Media Agent",
    name: "YouTube tutorial search",
    input: "Show me React tutorials on YouTube",
    expectedAgent: "MediaAgent",
    expectedTools: ["youtubeSearch"],
    expectedBehavior: [
      "Calls youtubeSearch with query 'React tutorials'",
      "Returns video gallery with educational content",
    ],
    successCriteria: "YouTube gallery with React tutorials",
  },

  // ============================================================================
  // SEC Agent Tests
  // ============================================================================
  {
    category: "SEC Agent",
    name: "Search SEC filings by ticker",
    input: "Find Apple's SEC filings",
    expectedAgent: "SECAgent",
    expectedTools: ["searchSecFilings"],
    expectedBehavior: [
      "Calls searchSecFilings with ticker 'AAPL'",
      "Returns structured data with filing metadata",
      "UI renders SECDocumentGallery component",
    ],
    successCriteria: "SEC document gallery is displayed",
  },
  {
    category: "SEC Agent",
    name: "Get specific filing type",
    input: "Get Tesla's latest 10-K",
    expectedAgent: "SECAgent",
    expectedTools: ["searchSecFilings"],
    expectedBehavior: [
      "Calls searchSecFilings with ticker 'TSLA' and formType '10-K'",
      "Returns most recent 10-K filing",
    ],
    successCriteria: "Tesla's 10-K filing is returned",
  },
  {
    category: "SEC Agent",
    name: "Download SEC filing",
    input: "Download Microsoft's annual report",
    expectedAgent: "SECAgent",
    expectedTools: ["searchSecFilings", "downloadSecFiling"],
    expectedBehavior: [
      "Calls searchSecFilings with ticker 'MSFT' and formType '10-K'",
      "Calls downloadSecFiling to save to documents",
      "Returns confirmation",
    ],
    successCriteria: "Filing is downloaded and saved to documents",
  },
  {
    category: "SEC Agent",
    name: "Company information lookup",
    input: "What is Google's CIK number?",
    expectedAgent: "SECAgent",
    expectedTools: ["getCompanyInfo"],
    expectedBehavior: [
      "Calls getCompanyInfo with ticker 'GOOGL' or company name",
      "Returns company information including CIK",
    ],
    successCriteria: "Company CIK and info is returned",
  },

  // ============================================================================
  // Web Agent Tests
  // ============================================================================
  {
    category: "Web Agent",
    name: "General web search",
    input: "What's the latest news on AI?",
    expectedAgent: "WebAgent",
    expectedTools: ["linkupSearch"],
    expectedBehavior: [
      "Calls linkupSearch with query 'latest news on AI'",
      "Returns current web results with sources",
    ],
    successCriteria: "Web search results with sources are returned",
  },
  {
    category: "Web Agent",
    name: "Web search with images",
    input: "Search for information about climate change",
    expectedAgent: "WebAgent",
    expectedTools: ["linkupSearch"],
    expectedBehavior: [
      "Calls linkupSearch with query and includeImages: true",
      "Returns web results with relevant images",
    ],
    successCriteria: "Web results with images are displayed",
  },

  // ============================================================================
  // Coordinator Agent Tests (Multi-Domain)
  // ============================================================================
  {
    category: "Coordinator Agent",
    name: "Multi-domain query (documents + videos)",
    input: "Find me documents and videos about Google",
    expectedAgent: "CoordinatorAgent",
    expectedDelegations: ["DocumentAgent", "MediaAgent"],
    expectedBehavior: [
      "Coordinator analyzes request",
      "Delegates to DocumentAgent for documents",
      "Delegates to MediaAgent for videos",
      "Combines results",
    ],
    successCriteria: "Both document list and YouTube gallery are displayed",
  },
  {
    category: "Coordinator Agent",
    name: "Multi-domain query (SEC + web)",
    input: "Get Apple's 10-K and latest news about Apple",
    expectedAgent: "CoordinatorAgent",
    expectedDelegations: ["SECAgent", "WebAgent"],
    expectedBehavior: [
      "Delegates to SECAgent for 10-K filing",
      "Delegates to WebAgent for news",
      "Combines results",
    ],
    successCriteria: "SEC filing and news results are both displayed",
  },
  {
    category: "Coordinator Agent",
    name: "Single domain routing",
    input: "Find Python tutorials on YouTube",
    expectedAgent: "CoordinatorAgent",
    expectedDelegations: ["MediaAgent"],
    expectedBehavior: [
      "Coordinator identifies media query",
      "Delegates to MediaAgent only",
      "Returns video gallery",
    ],
    successCriteria: "YouTube gallery is displayed",
  },
  {
    category: "Coordinator Agent",
    name: "Complex multi-step workflow",
    input: "Find Tesla's 10-K, download it, and create a summary document",
    expectedAgent: "CoordinatorAgent",
    expectedDelegations: ["SECAgent", "DocumentAgent"],
    expectedBehavior: [
      "Delegates to SECAgent to find and download 10-K",
      "Delegates to DocumentAgent to create summary",
      "Returns confirmation of both actions",
    ],
    successCriteria: "Filing is downloaded and summary document is created",
  },

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================
  {
    category: "Edge Cases",
    name: "No results found",
    input: "Find videos about xyzabc123nonexistent",
    expectedAgent: "MediaAgent",
    expectedTools: ["youtubeSearch"],
    expectedBehavior: [
      "Calls youtubeSearch",
      "Returns 'No videos found' message",
    ],
    successCriteria: "Graceful error message is displayed",
  },
  {
    category: "Edge Cases",
    name: "Ambiguous query",
    input: "Find Apple",
    expectedAgent: "CoordinatorAgent",
    expectedBehavior: [
      "Coordinator makes reasonable assumption",
      "Likely delegates to DocumentAgent or WebAgent",
      "Returns relevant results",
    ],
    successCriteria: "Reasonable results are returned without asking for clarification",
  },
  {
    category: "Edge Cases",
    name: "Invalid ticker symbol",
    input: "Find SEC filings for INVALIDTICKER",
    expectedAgent: "SECAgent",
    expectedTools: ["searchSecFilings"],
    expectedBehavior: [
      "Calls searchSecFilings with invalid ticker",
      "Returns 'No filings found' or error message",
    ],
    successCriteria: "Graceful error message is displayed",
  },
];

/**
 * Test statistics
 */
export const testStats = {
  totalTests: specializedAgentTestCases.length,
  byCategory: {
    "Document Agent": specializedAgentTestCases.filter(t => t.category === "Document Agent").length,
    "Media Agent": specializedAgentTestCases.filter(t => t.category === "Media Agent").length,
    "SEC Agent": specializedAgentTestCases.filter(t => t.category === "SEC Agent").length,
    "Web Agent": specializedAgentTestCases.filter(t => t.category === "Web Agent").length,
    "Coordinator Agent": specializedAgentTestCases.filter(t => t.category === "Coordinator Agent").length,
    "Edge Cases": specializedAgentTestCases.filter(t => t.category === "Edge Cases").length,
  },
};

/**
 * HOW TO RUN THESE TESTS
 * 
 * Option 1: Manual Testing via Fast Agent Panel UI
 * ------------------------------------------------
 * 1. Open the Fast Agent Panel in your app
 * 2. Copy each test case's `input` and paste into the chat
 * 3. Verify the `expectedBehavior` and `successCriteria`
 * 4. Check the console for agent delegation logs
 * 
 * Option 2: Automated Testing via Convex Dashboard
 * ------------------------------------------------
 * 1. Go to Convex Dashboard → Functions
 * 2. Run `fastAgentPanelCoordinator:sendMessageWithCoordinator`
 * 3. Pass test case input as arguments
 * 4. Verify response matches expected behavior
 * 
 * Option 3: Integration Tests
 * ---------------------------
 * Create a test runner that calls the coordinator action:
 * 
 * ```typescript
 * import { api } from "../_generated/api";
 * 
 * for (const testCase of specializedAgentTestCases) {
 *   const result = await ctx.runAction(api.fastAgentPanelCoordinator.sendMessageWithCoordinator, {
 *     threadId: "test-thread",
 *     prompt: testCase.input,
 *     userId: "test-user",
 *   });
 *   
 *   console.log(`Test: ${testCase.name}`);
 *   console.log(`Agents Used: ${result.agentsUsed.join(", ")}`);
 *   console.log(`Response: ${result.response}`);
 * }
 * ```
 */

/**
 * EXAMPLE TEST EXECUTION LOG
 * 
 * Test: Find and read document
 * Input: "Show me the revenue report"
 * [CoordinatorAgent] Analyzing request...
 * [CoordinatorAgent] Delegating to DocumentAgent
 * [DocumentAgent] Calling findDocument with query "revenue report"
 * [DocumentAgent] Found document: Revenue Report Q4 2024 (doc_123)
 * [DocumentAgent] Calling getDocumentContent with documentId "doc_123"
 * [DocumentAgent] Retrieved 2,500 characters of content
 * [CoordinatorAgent] Combining results...
 * Agents Used: Document
 * Response: Here's the Revenue Report Q4 2024:
 * 
 * # Revenue Report Q4 2024
 * Total Revenue: $10.5M (+15% YoY)
 * ...
 * 
 * ✅ SUCCESS: Document content displayed
 */

export default specializedAgentTestCases;

