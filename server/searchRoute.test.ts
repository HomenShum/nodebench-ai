/**
 * @vitest-environment node
 */

import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createSearchRouter } from "./routes/search.js";
import type { McpTool } from "../packages/mcp-local/src/types.js";

const weeklyResetTool: McpTool = {
  name: "founder_local_weekly_reset",
  description: "Returns a deterministic weekly reset packet for tests.",
  inputSchema: {},
  handler: async () => ({
    summary: "Weekly founder reset summary",
    confidence: 82,
    keyFindings: ["Ship streaming support"],
    risks: ["Streaming can silently regress without contract coverage"],
    nextSteps: ["Deploy the unified GET/POST route"],
  }),
};

describe("createSearchRouter", () => {
  let server: ReturnType<express.Express["listen"]>;
  let baseUrl = "";
  const savedEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    LINKUP_API_KEY: process.env.LINKUP_API_KEY,
  };

  beforeAll(async () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.LINKUP_API_KEY;

    const app = express();
    app.use(express.json());
    app.use(createSearchRouter([weeklyResetTool]));

    server = await new Promise<ReturnType<express.Express["listen"]>>((resolve) => {
      const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind ephemeral test server");
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    process.env.GEMINI_API_KEY = savedEnv.GEMINI_API_KEY;
    process.env.GOOGLE_AI_API_KEY = savedEnv.GOOGLE_AI_API_KEY;
    process.env.OPENAI_API_KEY = savedEnv.OPENAI_API_KEY;
    process.env.OPENROUTER_API_KEY = savedEnv.OPENROUTER_API_KEY;
    process.env.ANTHROPIC_API_KEY = savedEnv.ANTHROPIC_API_KEY;
    process.env.LINKUP_API_KEY = savedEnv.LINKUP_API_KEY;

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  });

  it("streams weekly-reset responses over both GET and POST", async () => {
    const encodedQuery = encodeURIComponent("founder weekly reset");

    const getResponse = await fetch(`${baseUrl}/?query=${encodedQuery}&stream=true`, {
      headers: { Accept: "text/event-stream" },
    });
    const getText = await getResponse.text();

    const postResponse = await fetch(`${baseUrl}/?stream=true`, {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "founder weekly reset" }),
    });
    const postText = await postResponse.text();

    expect(getResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(getResponse.headers.get("content-type")).toContain("text/event-stream");
    expect(postResponse.headers.get("content-type")).toContain("text/event-stream");
    expect(getText).toContain('"type":"trace"');
    expect(getText).toContain('"type":"result"');
    expect(getText).toContain('"classification":"weekly_reset"');
    expect(postText).toContain('"type":"trace"');
    expect(postText).toContain('"type":"result"');
    expect(postText).toContain('"classification":"weekly_reset"');
  });
});
