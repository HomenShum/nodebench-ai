#!/usr/bin/env node
/**
 * NodeBench Stop Hook
 *
 * Captures what Claude learned during the session and updates subconscious
 * memory blocks. Also records the session as a founder episode span.
 *
 * This hook runs asynchronously — it never blocks Claude from stopping.
 */

const { readFileSync } = require("fs");

async function main() {
  const input = JSON.parse(readFileSync(0, "utf-8"));

  // Extract useful session metadata
  const sessionSummary = {
    toolsUsed: input.toolsUsed || [],
    filesChanged: input.filesChanged || [],
    timestamp: new Date().toISOString(),
  };

  // Best-effort: notify NodeBench about the session completion
  try {
    await fetch("http://localhost:5191/api/subconscious/whisper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Session completed. Tools: ${sessionSummary.toolsUsed.join(", ")}. Files: ${sessionSummary.filesChanged.join(", ")}`,
        mode: "review",
        session_id: `cc_${Date.now()}`,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // Server not running — skip silently
  }

  // Never block the stop
  console.log(JSON.stringify({ result: "allow" }));
}

main().catch(() => {
  console.log(JSON.stringify({ result: "allow" }));
});
