#!/usr/bin/env node
/**
 * CLI search — `npx nodebench-mcp search "Anthropic AI"`
 *
 * Calls Pipeline v2 (local or remote) and outputs a structured packet to stdout.
 * Codex pattern: same agent logic powers CLI, web, and MCP surfaces.
 *
 * Usage:
 *   npx nodebench-mcp search "Anthropic AI" --lens investor
 *   npx nodebench-mcp search "My startup idea" --lens founder --json
 *   echo "Stripe payments" | npx nodebench-mcp search --lens banker
 */

const DEFAULT_API = process.env.NODEBENCH_API_URL ?? "http://localhost:3100";

interface CLIArgs {
  query: string;
  lens: string;
  json: boolean;
  api: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  let query = "";
  let lens = "founder";
  let json = false;
  let api = DEFAULT_API;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--lens" && args[i + 1]) { lens = args[++i]; }
    else if (arg === "--json") { json = true; }
    else if (arg === "--api" && args[i + 1]) { api = args[++i]; }
    else if (arg === "search") { /* skip command name */ }
    else if (!arg.startsWith("--")) { query = query ? `${query} ${arg}` : arg; }
  }

  return { query: query.trim(), lens, json, api };
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return "";
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8").trim();
}

async function main() {
  const args = parseArgs();

  // Read from stdin if no query argument
  if (!args.query) {
    args.query = await readStdin();
  }

  if (!args.query) {
    console.error("Usage: npx nodebench-mcp search \"company or question\" [--lens founder|investor|banker|ceo]");
    process.exit(1);
  }

  const startMs = Date.now();

  try {
    const resp = await fetch(`${args.api}/api/pipeline/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: args.query, lens: args.lens }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!resp.ok) {
      console.error(`Error: API returned ${resp.status}`);
      process.exit(1);
    }

    const data = await resp.json() as any;
    const ms = Date.now() - startMs;

    if (args.json) {
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    // Human-readable output
    const entity = data.entityName ?? "Unknown";
    const confidence = data.confidence ?? 0;
    const signals = data.variables?.length ?? 0;
    const risks = data.risks?.length ?? 0;
    const sources = data.sourceRefs?.length ?? 0;

    console.log();
    console.log(`  \x1b[1m${entity}\x1b[0m  \x1b[2m${args.lens} lens\x1b[0m  \x1b[32m${confidence}% confidence\x1b[0m  \x1b[2m${ms}ms\x1b[0m`);
    console.log();

    // Answer
    if (data.answer) {
      console.log(`  ${data.answer.slice(0, 300)}`);
      console.log();
    }

    // Signals
    if (data.variables?.length > 0) {
      console.log("  \x1b[33mSignals\x1b[0m");
      for (const v of data.variables.slice(0, 5)) {
        const arrow = v.direction === "up" ? "↑" : v.direction === "down" ? "↓" : "→";
        const cat = v.category ? `[${v.category}]` : "";
        console.log(`    ${arrow} ${v.name} \x1b[2m${cat}\x1b[0m`);
      }
      console.log();
    }

    // Risks
    if (data.risks?.length > 0) {
      console.log("  \x1b[31mRisks\x1b[0m");
      for (const r of data.risks.slice(0, 3)) {
        console.log(`    ⚠ ${r.title}`);
      }
      console.log();
    }

    // Pain resolutions
    if (data.painResolutions?.length > 0) {
      console.log("  \x1b[32mPain resolved\x1b[0m");
      for (const pr of data.painResolutions) {
        console.log(`    ✓ ${pr.painLabel}`);
      }
      console.log();
    }

    // Sources
    console.log(`  \x1b[2m${sources} sources · ${signals} signals · ${risks} risks\x1b[0m`);
    console.log();

  } catch (err: any) {
    if (err.name === "AbortError") {
      console.error("Error: Search timed out (60s)");
    } else {
      console.error(`Error: ${err.message}`);
    }
    process.exit(1);
  }
}

main();
