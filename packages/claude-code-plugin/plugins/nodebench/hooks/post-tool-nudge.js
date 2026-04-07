#!/usr/bin/env node
/**
 * NodeBench PostToolUse Nudge Hook
 *
 * After EVERY tool use, this hook checks if NodeBench has relevant intelligence
 * to inject. Writes to stderr which Claude sees as feedback.
 *
 * Nudge triggers:
 * - Company/entity name detected in tool output → suggest diligence
 * - Code touching pricing/SEO/about pages → remind of remediation gaps
 * - File changes in key areas → inject relevant company truth
 * - Competitor mentions → suggest competitive analysis
 *
 * The nudge is lightweight (<200ms) and suppressed if:
 * - Same entity was nudged in last 5 tool calls
 * - Tool is trivial (ls, pwd, git status)
 * - No NodeBench context is relevant
 */

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const NUDGE_STATE_FILE = join(homedir(), ".nodebench", "nudge-state.json");
const NUDGE_COOLDOWN = 5; // suppress same nudge for 5 tool calls
const TRIVIAL_TOOLS = new Set(["Read", "Glob", "Grep"]);

// Entity patterns that trigger diligence suggestions
const ENTITY_PATTERN = /\b((?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+(?:Inc|AI|Labs|Corp|LLC)\.?)?)\b/g;

// Code areas that map to known remediation gaps
const REMEDIATION_TRIGGERS = {
  "pricing": "Your last diligence flagged 'No pricing page' as a critical gap. NodeBench has remediation steps: /nodebench:remediate",
  "about": "Your last diligence flagged 'No public /about page' as a gap. Consider including founder bio and company mission.",
  "seo": "NodeBench SEO audit scored your site 50/100. Key gaps: missing structured data, low organic visibility.",
  "readme": "README updates improve discoverability. NodeBench found your brand has search confusion — use 'NodeBench AI' (with qualifier) consistently.",
  "deploy": "Before deploying, consider running /nodebench:diligence on your own company to verify public-facing changes address known gaps.",
};

function loadNudgeState() {
  try {
    if (existsSync(NUDGE_STATE_FILE)) {
      return JSON.parse(readFileSync(NUDGE_STATE_FILE, "utf-8"));
    }
  } catch { /* fresh state */ }
  return { recentNudges: [], toolCount: 0, entitiesNudged: {} };
}

function saveNudgeState(state) {
  try {
    const dir = join(homedir(), ".nodebench");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(NUDGE_STATE_FILE, JSON.stringify(state));
  } catch { /* best effort */ }
}

async function main() {
  const input = JSON.parse(readFileSync(0, "utf-8"));
  const state = loadNudgeState();
  state.toolCount++;

  const toolName = input.tool_name || "";
  const toolInput = JSON.stringify(input.tool_input || {});
  const toolOutput = (input.tool_output || "").slice(0, 2000); // cap for speed

  // Skip trivial tools
  if (TRIVIAL_TOOLS.has(toolName)) {
    saveNudgeState(state);
    process.exit(0);
  }

  const nudges = [];

  // 1. Check for entity mentions in tool output
  const entities = [...new Set([...toolOutput.matchAll(ENTITY_PATTERN)].map(m => m[1]))];
  for (const entity of entities.slice(0, 2)) {
    const lastNudged = state.entitiesNudged[entity] || 0;
    if (state.toolCount - lastNudged > NUDGE_COOLDOWN) {
      nudges.push(`[NodeBench] Entity "${entity}" detected. Run /nodebench:diligence "${entity}" for full intelligence packet.`);
      state.entitiesNudged[entity] = state.toolCount;
    }
  }

  // 2. Check for remediation-relevant file changes
  if (toolName === "Write" || toolName === "Edit") {
    const filePath = (input.tool_input?.file_path || "").toLowerCase();
    for (const [keyword, message] of Object.entries(REMEDIATION_TRIGGERS)) {
      if (filePath.includes(keyword) || toolInput.toLowerCase().includes(keyword)) {
        const lastNudged = state.entitiesNudged[`_rem_${keyword}`] || 0;
        if (state.toolCount - lastNudged > NUDGE_COOLDOWN) {
          nudges.push(`[NodeBench] ${message}`);
          state.entitiesNudged[`_rem_${keyword}`] = state.toolCount;
        }
        break; // one remediation nudge per tool call
      }
    }
  }

  // 3. Check for deploy/ship signals
  if (toolName === "Bash") {
    const cmd = (input.tool_input?.command || "").toLowerCase();
    if (cmd.includes("vercel") || cmd.includes("deploy") || cmd.includes("npm publish")) {
      const lastNudged = state.entitiesNudged["_deploy"] || 0;
      if (state.toolCount - lastNudged > NUDGE_COOLDOWN * 2) {
        nudges.push("[NodeBench] Pre-deploy check: Run /nodebench:diligence on your company to verify public-facing presence before shipping.");
        state.entitiesNudged["_deploy"] = state.toolCount;
      }
    }
  }

  saveNudgeState(state);

  // Write nudges to stderr (shown to Claude as feedback)
  if (nudges.length > 0) {
    process.stderr.write(nudges.join("\n") + "\n");
  }

  // Never block — PostToolUse can't block anyway
  process.exit(0);
}

main().catch(() => process.exit(0));
