#!/usr/bin/env node
/**
 * Quick verification script - run this to test your MCP setup works.
 * Usage: node test-setup.mjs
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "dist", "index.js");

console.log("🔍 NodeBench MCP Setup Verification\n");

// Check Node version
const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1).split(".")[0]);
if (major < 18) {
  console.error(`❌ Node.js ${nodeVersion} is too old. Need >= 18.0.0`);
  process.exit(1);
}
console.log(`✓ Node.js ${nodeVersion}`);

// Check API keys
const keys = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
};

const hasSearch = keys.GEMINI_API_KEY || keys.GOOGLE_AI_API_KEY || keys.OPENAI_API_KEY || keys.PERPLEXITY_API_KEY;
const hasVision = keys.GEMINI_API_KEY || keys.GOOGLE_AI_API_KEY || keys.OPENAI_API_KEY || keys.ANTHROPIC_API_KEY;

console.log(`${hasSearch ? "✓" : "○"} Web search API key (GEMINI/OPENAI/PERPLEXITY)`);
console.log(`${hasVision ? "✓" : "○"} Vision API key (GEMINI/OPENAI/ANTHROPIC)`);
console.log(`${keys.GITHUB_TOKEN ? "✓" : "○"} GitHub token (GITHUB_TOKEN)`);

// Test MCP server starts
console.log("\n📡 Testing MCP server...\n");

const server = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
});

let output = "";
let stderrOutput = "";
let toolCount = 0;

server.stdout.on("data", (data) => {
  output += data.toString();
});

server.stderr.on("data", (data) => {
  stderrOutput += data.toString();
  // Check for the ready message
  const match = stderrOutput.match(/(\d+) tools/);
  if (match) {
    toolCount = parseInt(match[1]);
  }
});

// Give it time to start
setTimeout(() => {
  server.kill();

  if (toolCount > 0) {
    console.log(`✓ MCP server starts correctly`);
    console.log(`✓ ${toolCount} tools available\n`);
    console.log("🎉 Setup verified! Add this to ~/.claude/settings.json:\n");
    console.log(JSON.stringify({
      mcpServers: {
        nodebench: {
          command: "node",
          args: [serverPath]
        }
      }
    }, null, 2));
    console.log("\nThen restart Claude Code.\n");
  } else {
    console.error("❌ MCP server did not start correctly");
    if (stderrOutput) console.error("Output:", stderrOutput);
    process.exit(1);
  }
}, 1500);
