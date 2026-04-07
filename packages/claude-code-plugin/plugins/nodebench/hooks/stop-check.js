#!/usr/bin/env node
/**
 * NodeBench Stop Hook — Value Manifest + Counterfactual Tracking
 *
 * When Claude tries to stop, this hook:
 * 1. Checks if the session touched company-relevant areas
 * 2. If so, suggests a NodeBench check before finishing
 * 3. Tracks what NodeBench contributed (nudges acted on, diligence run)
 * 4. Generates a "what would have been missed" counterfactual
 *
 * Uses decision:"block" + reason to make Claude continue when warranted.
 * Respects stop_hook_active to prevent infinite loops.
 */

const { readFileSync, writeFileSync, existsSync, mkdirSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

const VALUE_LOG_FILE = join(homedir(), ".nodebench", "value-manifest.json");
const NUDGE_STATE_FILE = join(homedir(), ".nodebench", "nudge-state.json");

function loadValueLog() {
  try {
    if (existsSync(VALUE_LOG_FILE)) return JSON.parse(readFileSync(VALUE_LOG_FILE, "utf-8"));
  } catch { /* fresh */ }
  return { sessions: [], totalNudges: 0, nudgesActedOn: 0, diligenceRuns: 0, remediationsCompleted: 0 };
}

function saveValueLog(log) {
  try {
    const dir = join(homedir(), ".nodebench");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(VALUE_LOG_FILE, JSON.stringify(log, null, 2));
  } catch { /* best effort */ }
}

function loadNudgeState() {
  try {
    if (existsSync(NUDGE_STATE_FILE)) return JSON.parse(readFileSync(NUDGE_STATE_FILE, "utf-8"));
  } catch { /* fresh */ }
  return { recentNudges: [], toolCount: 0, entitiesNudged: {} };
}

async function main() {
  const input = JSON.parse(readFileSync(0, "utf-8"));

  // CRITICAL: never block if stop_hook_active (prevents infinite loop)
  if (input.stop_hook_active) {
    // Record the session value and exit
    const log = loadValueLog();
    const nudgeState = loadNudgeState();
    const nudgeCount = Object.keys(nudgeState.entitiesNudged).length;

    log.sessions.push({
      timestamp: new Date().toISOString(),
      sessionId: input.session_id,
      nudgesDelivered: nudgeCount,
      toolCallsMonitored: nudgeState.toolCount,
    });

    // Keep last 100 sessions
    if (log.sessions.length > 100) log.sessions = log.sessions.slice(-100);
    log.totalNudges += nudgeCount;

    saveValueLog(log);

    // Auto-populate subconscious blocks from session learnings
    try {
      const entitiesWorkedOn = Object.keys(nudgeState.entitiesNudged).filter(k => !k.startsWith("_"));
      if (entitiesWorkedOn.length > 0 || nudgeState.toolCount > 5) {
        const lastMsg = input.last_assistant_message || "";
        const blockUpdates = [];

        // Update recent_important_changes if session was substantial
        if (nudgeState.toolCount > 10) {
          blockUpdates.push({
            block_id: "recent_important_changes",
            value: `Session ${new Date().toISOString().slice(0,10)}: ${nudgeState.toolCount} tool calls. Entities: ${entitiesWorkedOn.join(", ") || "none"}. ${lastMsg.slice(0, 200)}`,
          });
        }

        // Update entity_watchlist with entities encountered
        if (entitiesWorkedOn.length > 0) {
          blockUpdates.push({
            block_id: "entity_watchlist",
            value: `Last session entities: ${entitiesWorkedOn.join(", ")}`,
          });
        }

        // Best-effort: push block updates to local NodeBench server
        for (const update of blockUpdates) {
          fetch(`http://localhost:5191/api/subconscious/blocks/${update.block_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: update.value, confidence: "medium" }),
            signal: AbortSignal.timeout(2000),
          }).catch(() => { /* server not running — skip */ });
        }
      }
    } catch { /* best effort — never block stop */ }

    // Output value summary to stderr (shown to user)
    if (nudgeCount > 0) {
      process.stderr.write(
        `\n[NodeBench] Session summary: ${nudgeCount} intelligence nudges delivered across ${nudgeState.toolCount} tool calls.\n` +
        `  Value manifest: ~/.nodebench/value-manifest.json\n` +
        `  Dashboard: https://www.nodebenchai.com/?surface=telemetry&tab=subconscious\n`
      );
    }

    console.log(JSON.stringify({ result: "allow" }));
    return;
  }

  // First stop attempt — check if we should nudge
  const lastMessage = (input.last_assistant_message || "").toLowerCase();
  const nudgeState = loadNudgeState();

  // Detect if session involved company/entity work but never ran NodeBench
  const entitiesMentioned = Object.keys(nudgeState.entitiesNudged).filter(k => !k.startsWith("_"));
  const nodiligenceRun = !lastMessage.includes("nodebench") && !lastMessage.includes("diligence");
  const significantSession = nudgeState.toolCount > 10;

  if (significantSession && entitiesMentioned.length > 0 && nodiligenceRun) {
    // Suggest a NodeBench check before finishing
    const topEntity = entitiesMentioned[0];
    console.log(JSON.stringify({
      decision: "block",
      reason: `[NodeBench] You mentioned "${topEntity}" during this session but didn't run a diligence check. Consider running /nodebench:diligence "${topEntity}" to catch any gaps before finishing. If not needed, just say "done" and I'll let you stop.`,
    }));
    return;
  }

  // Check if remediation-relevant work was done
  const remKeys = Object.keys(nudgeState.entitiesNudged).filter(k => k.startsWith("_rem_"));
  if (remKeys.length > 0 && !lastMessage.includes("remediat")) {
    const gaps = remKeys.map(k => k.replace("_rem_", "")).join(", ");
    console.log(JSON.stringify({
      decision: "block",
      reason: `[NodeBench] This session touched areas flagged in your diligence: ${gaps}. Run /nodebench:remediate to see if these changes address the gaps. Say "done" to skip.`,
    }));
    return;
  }

  // No nudge needed — allow stop
  console.log(JSON.stringify({ result: "allow" }));
}

main().catch(() => {
  console.log(JSON.stringify({ result: "allow" }));
});
