#!/usr/bin/env node
/**
 * NodeBench Hook Setup — one-command installation of judge + nudge + hook system.
 *
 * Usage: node setup-hooks.js [--project-dir /path/to/project]
 *
 * Creates or updates .claude/hooks.json in the target project with:
 * - PostToolUse: autonomous entity nudges + remediation reminders
 * - Stop: diligence gate + value manifest + session learning capture
 *
 * Safe: merges with existing hooks, never overwrites user hooks.
 */

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const { join, resolve } = require("path");

const PROJECT_DIR = process.argv.includes("--project-dir")
  ? resolve(process.argv[process.argv.indexOf("--project-dir") + 1])
  : process.cwd();

const CLAUDE_DIR = join(PROJECT_DIR, ".claude");
const HOOKS_FILE = join(CLAUDE_DIR, "hooks.json");

// Find the nodebench plugin hooks directory
const PLUGIN_HOOKS_DIR = __dirname;

const NODEBENCH_HOOKS = {
  PostToolUse: [
    {
      matcher: "Bash|Write|Edit",
      hooks: [
        {
          type: "command",
          command: `node "${join(PLUGIN_HOOKS_DIR, "post-tool-nudge.js")}"`,
          timeout: 3000,
        },
      ],
    },
  ],
  Stop: [
    {
      hooks: [
        {
          type: "command",
          command: `node "${join(PLUGIN_HOOKS_DIR, "stop-check.js")}"`,
          timeout: 5000,
        },
      ],
    },
  ],
};

function main() {
  // Ensure .claude directory exists
  if (!existsSync(CLAUDE_DIR)) {
    mkdirSync(CLAUDE_DIR, { recursive: true });
    console.log(`Created ${CLAUDE_DIR}`);
  }

  // Load existing hooks
  let existing = { hooks: {} };
  if (existsSync(HOOKS_FILE)) {
    try {
      existing = JSON.parse(readFileSync(HOOKS_FILE, "utf-8"));
      console.log(`Found existing hooks.json with ${Object.keys(existing.hooks || {}).length} event(s)`);
    } catch {
      console.warn("Could not parse existing hooks.json, creating fresh");
      existing = { hooks: {} };
    }
  }

  // Merge NodeBench hooks (append, don't overwrite)
  const merged = { ...existing, hooks: { ...(existing.hooks || {}) } };
  let added = 0;

  for (const [event, handlers] of Object.entries(NODEBENCH_HOOKS)) {
    if (!merged.hooks[event]) {
      merged.hooks[event] = [];
    }
    // Check if NodeBench hooks already exist (by command path)
    const existingCommands = merged.hooks[event]
      .flatMap((h) => (h.hooks || [h]).map((hh) => hh.command || ""))
      .join(" ");

    for (const handler of handlers) {
      const handlerCmd = (handler.hooks || [handler]).map((h) => h.command || "").join(" ");
      if (!existingCommands.includes("nodebench")) {
        merged.hooks[event].push(handler);
        added++;
      }
    }
  }

  // Write merged hooks
  writeFileSync(HOOKS_FILE, JSON.stringify(merged, null, 2) + "\n");

  if (added > 0) {
    console.log(`\n[NodeBench] Hooks installed successfully!`);
    console.log(`  Added ${added} hook handler(s) to ${HOOKS_FILE}`);
    console.log(`\n  PostToolUse: entity nudge + remediation reminder (after Bash/Write/Edit)`);
    console.log(`  Stop: diligence gate + value manifest + session learning capture`);
    console.log(`\n  Value manifest: ~/.nodebench/value-manifest.json`);
    console.log(`  Dashboard: https://www.nodebenchai.com/?surface=telemetry&tab=subconscious`);
  } else {
    console.log(`\n[NodeBench] Hooks already installed in ${HOOKS_FILE}`);
  }

  console.log(`\nTo verify: /hooks (in Claude Code)`);
  console.log(`To uninstall: remove nodebench entries from ${HOOKS_FILE}`);
}

main();
