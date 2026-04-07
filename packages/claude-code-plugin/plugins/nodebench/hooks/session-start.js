#!/usr/bin/env node
/**
 * NodeBench SessionStart Hook
 *
 * Injects subconscious whispers at the start of each Claude Code session.
 * Reads memory blocks from the local NodeBench DB or REST API and prepends
 * relevant context as a whisper.
 *
 * Hook contract: read stdin JSON, write stdout JSON with { result: "block"|"allow", message? }
 */

const { readFileSync } = require("fs");
const { join } = require("path");
const { homedir } = require("os");

async function main() {
  const input = JSON.parse(readFileSync(0, "utf-8"));

  // Try to read subconscious blocks from local DB
  const dbPath = join(homedir(), ".nodebench", "nodebench.db");
  let whisper = "";

  try {
    // Try local REST API first (if server is running)
    const resp = await fetch("http://localhost:5191/api/subconscious/summary", {
      signal: AbortSignal.timeout(2000),
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.populatedBlocks > 0) {
        whisper = `<nodebench_whisper>\n${data.summary}\n</nodebench_whisper>`;
      }
    }
  } catch {
    // Server not running — try reading blocks directly
    try {
      const resp = await fetch("https://www.nodebenchai.com/api/subconscious/blocks", {
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const data = await resp.json();
        const populated = (data.blocks || []).filter((b) => b.value?.length > 0);
        if (populated.length > 0) {
          const lines = populated.map(
            (b) => `- ${b.label} (v${b.version}): ${b.value.split("\n")[0].slice(0, 80)}`
          );
          whisper = `<nodebench_whisper>\n${lines.join("\n")}\n</nodebench_whisper>`;
        }
      }
    } catch {
      // No connectivity — skip whisper silently
    }
  }

  if (whisper) {
    // Inject whisper by allowing the session with added context
    console.log(
      JSON.stringify({
        result: "allow",
        message: whisper,
      })
    );
  } else {
    console.log(JSON.stringify({ result: "allow" }));
  }
}

main().catch(() => {
  // Never block session start
  console.log(JSON.stringify({ result: "allow" }));
});
