#!/usr/bin/env npx tsx

/**
 * Direct API Test - Bypass Agent SDK
 *
 * Tests the AI SDK providers directly without going through @convex-dev/agent
 * to isolate whether the issue is in the SDK or the Agent component.
 */

import dotenv from "dotenv";
import { generateText, streamText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

dotenv.config({ path: ".env.local" });
dotenv.config();

type Provider = "openai" | "anthropic" | "google" | "openrouter";

interface TestResult {
  model: string;
  provider: Provider;
  success: boolean;
  text?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
}

const MODELS = [
  { alias: "gpt-5.4", provider: "openai" as Provider, sdkId: "gpt-5.4" },
  { alias: "gpt-5.4-mini", provider: "openai" as Provider, sdkId: "gpt-5.4-mini" },
  { alias: "claude-haiku-4.5", provider: "anthropic" as Provider, sdkId: "claude-haiku-4-5" },
  { alias: "claude-sonnet-4.6", provider: "anthropic" as Provider, sdkId: "claude-sonnet-4-6" },
  { alias: "gemini-3-flash-preview", provider: "google" as Provider, sdkId: "gemini-3-flash-preview" },
  { alias: "gemini-3.1-pro-preview", provider: "google" as Provider, sdkId: "gemini-3.1-pro-preview" },
  { alias: "kimi-k2.6", provider: "openrouter" as Provider, sdkId: "moonshotai/kimi-k2.6" },
];

function getModel(provider: Provider, sdkId: string) {
  switch (provider) {
    case "openai":
      return openai(sdkId);
    case "anthropic":
      return anthropic(sdkId);
    case "google":
      return google(sdkId);
    case "openrouter": {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for OpenRouter direct tests");
      return createOpenAI({
        apiKey,
        baseURL: "https://openrouter.ai/api/v1",
        headers: {
          "HTTP-Referer": "https://www.nodebenchai.com",
          "X-Title": "NodeBench",
        },
      }).chat(sdkId);
    }
  }
}

async function testGenerateText(model: string, provider: Provider, sdkId: string): Promise<TestResult> {
  const start = Date.now();

  try {
    console.log(`\n📤 Testing generateText: ${model} (${sdkId})`);

    const result = await generateText({
      model: getModel(provider, sdkId),
      prompt: "Say exactly: HELLO FROM DIRECT API TEST",
      maxTokens: 50,
    });

    const latencyMs = Date.now() - start;

    console.log(`✅ ${model}: "${result.text}" (${latencyMs}ms)`);
    console.log(`   Tokens: in=${result.usage?.promptTokens ?? 0}, out=${result.usage?.completionTokens ?? 0}`);

    return {
      model,
      provider,
      success: true,
      text: result.text,
      inputTokens: result.usage?.promptTokens,
      outputTokens: result.usage?.completionTokens,
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    console.error(`❌ ${model}: ${error.message} (${latencyMs}ms)`);

    return {
      model,
      provider,
      success: false,
      error: error.message,
      latencyMs,
    };
  }
}

async function testStreamText(model: string, provider: Provider, sdkId: string): Promise<TestResult> {
  const start = Date.now();

  try {
    console.log(`\n🌊 Testing streamText: ${model} (${sdkId})`);

    const result = await streamText({
      model: getModel(provider, sdkId),
      prompt: "Say exactly: STREAMING FROM DIRECT API",
      maxTokens: 50,
    });

    let fullText = "";
    for await (const delta of result.textStream) {
      fullText += delta;
      process.stdout.write(delta);
    }
    process.stdout.write("\n");

    const latencyMs = Date.now() - start;
    const usage = await result.usage;

    console.log(`✅ ${model}: streamed "${fullText}" (${latencyMs}ms)`);
    console.log(`   Tokens: in=${usage?.promptTokens ?? 0}, out=${usage?.completionTokens ?? 0}`);

    return {
      model,
      provider,
      success: true,
      text: fullText,
      inputTokens: usage?.promptTokens,
      outputTokens: usage?.completionTokens,
      latencyMs,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    console.error(`❌ ${model}: ${error.message} (${latencyMs}ms)`);

    return {
      model,
      provider,
      success: false,
      error: error.message,
      latencyMs,
    };
  }
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║         DIRECT API TEST - Bypassing @convex-dev/agent          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  // Check API keys
  const keys = {
    openai: !!process.env.OPENAI_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    google: !!(process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
    openrouter: !!process.env.OPENROUTER_API_KEY,
  };

  console.log("\n🔑 API Keys detected:");
  console.log(`   OPENAI_API_KEY: ${keys.openai ? "✅" : "❌"}`);
  console.log(`   ANTHROPIC_API_KEY: ${keys.anthropic ? "✅" : "❌"}`);
  console.log(`   GOOGLE_GENERATIVE_AI_API_KEY: ${keys.google ? "✅" : "❌"}`);

  console.log(`   OPENROUTER_API_KEY: ${keys.openrouter ? "âœ…" : "âŒ"}`);

  const modelToTest = process.argv[2];
  const testType = process.argv[3] || "both";

  const modelsToTest = modelToTest
    ? MODELS.filter(m => m.alias.includes(modelToTest))
    : MODELS;

  if (modelsToTest.length === 0) {
    console.error(`\n❌ No models found matching "${modelToTest}"`);
    console.log(`Available: ${MODELS.map(m => m.alias).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🧪 Testing ${modelsToTest.length} model(s): ${modelsToTest.map(m => m.alias).join(", ")}`);

  const generateResults: TestResult[] = [];
  const streamResults: TestResult[] = [];

  for (const { alias, provider, sdkId } of modelsToTest) {
    // Skip if API key not present
    if (!keys[provider]) {
      console.log(`\n⏭️ Skipping ${alias} - no ${provider.toUpperCase()}_API_KEY`);
      continue;
    }

    if (testType === "generate" || testType === "both") {
      generateResults.push(await testGenerateText(alias, provider, sdkId));
    }

    if (testType === "stream" || testType === "both") {
      streamResults.push(await testStreamText(alias, provider, sdkId));
    }
  }

  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                         SUMMARY                                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  if (generateResults.length > 0) {
    console.log("\n📤 generateText results:");
    for (const r of generateResults) {
      const status = r.success ? "✅ PASS" : "❌ FAIL";
      const tokens = r.success ? `(${r.inputTokens}→${r.outputTokens} tokens)` : "";
      console.log(`   ${status} ${r.model} ${tokens} ${r.latencyMs}ms`);
      if (!r.success) console.log(`      Error: ${r.error}`);
    }
  }

  if (streamResults.length > 0) {
    console.log("\n🌊 streamText results:");
    for (const r of streamResults) {
      const status = r.success ? "✅ PASS" : "❌ FAIL";
      const tokens = r.success ? `(${r.inputTokens}→${r.outputTokens} tokens)` : "";
      console.log(`   ${status} ${r.model} ${tokens} ${r.latencyMs}ms`);
      if (!r.success) console.log(`      Error: ${r.error}`);
    }
  }

  const allResults = [...generateResults, ...streamResults];
  const passed = allResults.filter(r => r.success).length;
  const total = allResults.length;

  console.log(`\n📊 Total: ${passed}/${total} passed`);

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
