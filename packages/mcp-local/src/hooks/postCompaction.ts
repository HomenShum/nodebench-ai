#!/usr/bin/env npx tsx
// @ts-nocheck — standalone CLI hook; not part of the library build
/**
 * Post-Compaction Hook for Claude Code
 *
 * Called after context compaction. Stdout is injected as a system message
 * into the new compacted context, allowing session continuity.
 *
 * Usage:
 *   npx tsx packages/mcp-local/src/hooks/postCompaction.ts
 *
 * Wire in .claude/hooks.json:
 *   { "hooks": { "PostCompaction": [{ "type": "command", "command": "npx tsx ./packages/mcp-local/src/hooks/postCompaction.ts" }] } }
 */

const FALLBACK_PROMPT = `NodeBench session context: Use summarize_session to recover prior state. Use get_proactive_alerts for pending items. Use founder_deep_context_gather for packet preparation.`;

async function main(): Promise<void> {
  try {
    // Dynamic import to handle the case where founderTrackingTools doesn't export get_compaction_recovery
    const mod = await import("../tools/founderTrackingTools.js");

    // The tools array is the default export — find the compaction recovery tool
    const tools: Array<{ name: string; handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ text: string }> }> }> =
      mod.founderTrackingTools ?? mod.default ?? [];

    const recoveryTool = tools.find(
      (t) => t.name === "get_compaction_recovery",
    );

    if (!recoveryTool) {
      // Tool not registered yet — use fallback
      console.log(FALLBACK_PROMPT);
      return;
    }

    const result = await recoveryTool.handler({});
    const text = result?.content?.[0]?.text;

    if (!text) {
      console.log(FALLBACK_PROMPT);
      return;
    }

    // Parse the JSON response to extract injectionPrompt
    const parsed = JSON.parse(text);
    if (parsed.injectionPrompt && typeof parsed.injectionPrompt === "string") {
      console.log(parsed.injectionPrompt);
    } else {
      // Tool returned data but no injectionPrompt field — print the raw text
      console.log(text);
    }
  } catch {
    // Any failure (module not found, DB not ready, parse error) — degrade gracefully
    console.log(FALLBACK_PROMPT);
  }
}

main();
