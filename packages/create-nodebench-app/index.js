#!/usr/bin/env node
/**
 * create-nodebench-app — Scaffold a NodeBench-powered app
 *
 * Usage: npx create-nodebench-app my-app
 */

import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const projectName = process.argv[2] || "nodebench-app";
const targetDir = resolve(process.cwd(), projectName);

if (existsSync(targetDir)) {
  console.error(`\x1b[31mError:\x1b[0m Directory "${projectName}" already exists.`);
  process.exit(1);
}

console.log(`\n\x1b[1mNodeBench App\x1b[0m — Creating ${projectName}...\n`);

// Copy template
const templateDir = join(__dirname, "template");
cpSync(templateDir, targetDir, { recursive: true });

// Update package.json with project name
const pkgPath = join(targetDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
pkg.name = projectName;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Install dependencies
console.log("Installing dependencies...");
try {
  execSync("npm install", { cwd: targetDir, stdio: "inherit" });
} catch {
  console.log("\x1b[33mWARN:\x1b[0m npm install failed. Run it manually in the project directory.");
}

// Write .mcp.json
const mcpConfig = {
  mcpServers: {
    nodebench: {
      command: "npx",
      args: ["-y", "nodebench-mcp", "--preset", "founder"],
      env: {},
    },
  },
};
writeFileSync(join(targetDir, ".mcp.json"), JSON.stringify(mcpConfig, null, 2) + "\n");

console.log(`
\x1b[32mDone!\x1b[0m Created ${projectName}

  \x1b[36mcd ${projectName}\x1b[0m
  \x1b[36mnpm run dev\x1b[0m          Start the dev server
  \x1b[36mnpm run build\x1b[0m        Build for production

\x1b[1m3 screens ready:\x1b[0m
  / ............... Entity Search — type a company, get intelligence
  /qa ............. QA Dashboard — crawl a URL, see findings
  /memo ........... Decision Memo — structured decision output

\x1b[1mNodeBench MCP:\x1b[0m
  The .mcp.json is pre-configured with the founder preset (40 tools).
  Open in Claude Code or Cursor to use MCP tools directly.

\x1b[1mHackathon tip:\x1b[0m
  Run \x1b[36mdiscover_tools('your idea')\x1b[0m in Claude Code to find tools for your use case.
`);
