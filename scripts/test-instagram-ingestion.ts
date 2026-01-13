/**
 * Test script for Instagram ingestion pipeline
 *
 * Tests:
 * 1. Health check for Gemini API key configuration
 * 2. Instagram post ingestion with status polling
 * 3. Error handling for missing API keys
 *
 * Usage:
 *   CONVEX_URL=https://formal-shepherd-851.convex.cloud npx tsx scripts/test-instagram-ingestion.ts
 */

import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../convex/_generated/api";

const CONVEX_URL = process.env.CONVEX_URL || "https://formal-shepherd-851.convex.cloud";
const TEST_INSTAGRAM_URL = process.env.TEST_INSTAGRAM_URL || "https://www.instagram.com/p/C1234example/";

interface InstagramPost {
  _id: string;
  postUrl: string;
  status: "pending" | "transcribing" | "analyzing" | "completed" | "error";
  errorMessage?: string;
  caption?: string;
  transcript?: string;
  extractedClaims?: Array<{
    claim: string;
    confidence: number;
    category?: string;
  }>;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testInstagramIngestion() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  Instagram Ingestion Test Script");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const client = new ConvexHttpClient(CONVEX_URL);
  console.log(`📡 Connected to: ${CONVEX_URL}\n`);

  // Test 1: Check existing posts (if any)
  console.log("Step 1: Checking for existing Instagram posts...");
  try {
    // Note: This requires authentication, so we'll skip if not authenticated
    console.log("  ⚠️  listPosts requires authentication - skipping in test mode\n");
  } catch (error) {
    console.log(`  ⚠️  Could not list posts: ${error}\n`);
  }

  // Test 2: Attempt ingestion (will fail without auth but tests the action)
  console.log("Step 2: Testing Instagram ingestion action...");
  console.log(`  URL: ${TEST_INSTAGRAM_URL}`);

  try {
    const result = await client.action(api.domains.social.instagramIngestion.ingestPost, {
      postUrl: TEST_INSTAGRAM_URL,
    });

    if (!result.success) {
      console.log(`  ❌ Ingestion failed: ${result.error}`);

      // Check for specific error types
      if (result.error?.includes("Not authenticated")) {
        console.log("  ℹ️  This is expected - the action requires user authentication");
        console.log("  ℹ️  To test fully, run this from an authenticated context\n");
      } else if (result.error?.includes("Invalid Instagram URL")) {
        console.log("  ℹ️  Provide a valid Instagram URL via TEST_INSTAGRAM_URL env var\n");
      } else if (result.error?.includes("Gemini API key")) {
        console.log("  🔑 Gemini API key is missing!");
        console.log("  ℹ️  Run: npx convex env set GEMINI_API_KEY <your-key>\n");
      }
    } else {
      console.log(`  ✅ Ingestion started! Post ID: ${result.postId}`);

      // Poll for completion
      console.log("\nStep 3: Polling for completion...");
      const postId = result.postId!;
      let attempts = 0;
      const maxAttempts = 30; // 30 * 2 sec = 60 seconds max

      while (attempts < maxAttempts) {
        await sleep(2000);
        attempts++;

        try {
          const post = await client.query(api.domains.social.instagramIngestion.getPost, {
            postId,
          }) as InstagramPost | null;

          if (!post) {
            console.log(`  ⚠️  Post not found`);
            break;
          }

          const statusEmoji = {
            pending: "⏳",
            transcribing: "🎬",
            analyzing: "🔍",
            completed: "✅",
            error: "❌",
          }[post.status];

          console.log(`  [${attempts}] ${statusEmoji} Status: ${post.status}`);

          if (post.status === "completed") {
            console.log("\n  ✅ Ingestion completed successfully!");
            console.log(`  📝 Caption: ${post.caption?.slice(0, 100) || "(none)"}...`);
            console.log(`  🎯 Claims extracted: ${post.extractedClaims?.length || 0}`);
            if (post.extractedClaims && post.extractedClaims.length > 0) {
              console.log("  📋 Sample claims:");
              for (const claim of post.extractedClaims.slice(0, 3)) {
                console.log(`     - [${claim.category || "general"}] ${claim.claim.slice(0, 80)}...`);
              }
            }
            break;
          }

          if (post.status === "error") {
            console.log(`\n  ❌ Ingestion failed with error: ${post.errorMessage}`);

            if (post.errorMessage?.includes("Gemini API key")) {
              console.log("\n  🔑 Resolution: Set the Gemini API key in Convex:");
              console.log("     npx convex env set GEMINI_API_KEY <your-key>");
            }
            break;
          }
        } catch (queryError) {
          console.log(`  ⚠️  Query error: ${queryError}`);
        }
      }

      if (attempts >= maxAttempts) {
        console.log("\n  ⏱️ Timeout waiting for completion (60s)");
      }
    }
  } catch (error) {
    console.log(`  ❌ Action error: ${error}`);
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Test Complete");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("📖 Next Steps:");
  console.log("  1. Ensure GEMINI_API_KEY is set: npx convex env set GEMINI_API_KEY <key>");
  console.log("  2. Test from the Agent UI: 'Ingest this instagram post: <url>'");
  console.log("  3. Check post status: 'Show my instagram posts'");
}

testInstagramIngestion().catch(console.error);
