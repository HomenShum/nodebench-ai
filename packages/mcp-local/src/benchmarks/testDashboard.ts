/**
 * NodeBench Operating Dashboard — Smoke Test
 *
 * Starts the operating dashboard server programmatically,
 * fetches the HTML, validates structure/design tokens, then stops.
 *
 * Run: npx tsx src/benchmarks/testDashboard.ts
 */

import Database from "better-sqlite3";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync } from "node:fs";

// Use the source TS files directly via tsx
import {
  startOperatingDashboardServer,
  stopOperatingDashboardServer,
} from "../dashboard/operatingServer.js";

// ── Helpers ────────────────────────────────────────────────────────────

const results: { name: string; pass: boolean; detail?: string }[] = [];

function check(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  const icon = pass ? "PASS" : "FAIL";
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`  [${icon}] ${name}${suffix}`);
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== NodeBench Operating Dashboard Smoke Test ===\n");

  // Create a temporary SQLite database so we don't touch the real one
  const dbPath = join(tmpdir(), `nodebench-dashboard-test-${Date.now()}.db`);
  let db: Database.Database | null = null;
  let port: number | null = null;

  try {
    db = new Database(dbPath);

    // Start the server on a test port to avoid conflicts
    const testPort = 6274;
    console.log(`Starting server on port ${testPort}...`);
    port = await startOperatingDashboardServer(db, testPort);
    console.log(`Server started on port ${port}\n`);

    check("Server starts", true, `listening on port ${port}`);

    // Fetch the HTML
    const url = `http://127.0.0.1:${port}`;
    const response = await fetch(url);

    // 1. Status code
    check("HTTP 200", response.status === 200, `got ${response.status}`);

    const html = await response.text();

    // 2. Contains "NodeBench"
    check("Contains 'NodeBench'", html.includes("NodeBench"),
      html.includes("NodeBench") ? "found" : "missing");

    // 3. Contains "Operating Dashboard" header
    check("Contains 'Operating Dashboard'", html.includes("Operating Dashboard"),
      html.includes("Operating Dashboard") ? "found" : "missing");

    // 4. Expected sections (from the HTML comment header + actual section-headers)
    const expectedSections = [
      { label: "Company Truth", search: "Company Truth" },
      { label: "Initiatives", search: "Initiatives" },
      { label: "Ranked Interventions", search: "Ranked Interventions" },
      { label: "Competitor Intelligence", search: "Competitor Intelligence" },
      { label: "Active Contradictions", search: "Active Contradictions" },
      { label: "Agent Status", search: "Agent Status" },
      { label: "Recent Decisions", search: "Recent Decisions" },
      { label: "Session Delta", search: "Since Your Last Session" },
      { label: "Trajectory Score", search: "Trajectory Score" },
      { label: "Event Ledger", search: "Event Ledger" },
      { label: "Important Changes", search: "Important Changes" },
      { label: "Session Path", search: "Session Path" },
      { label: "Time Rollups", search: "Time Rollups" },
      { label: "Packet Readiness", search: "Packet Readiness" },
      { label: "Recent Actions", search: "Recent Actions" },
    ];

    let sectionPassCount = 0;
    for (const sec of expectedSections) {
      const found = html.includes(sec.search);
      if (found) sectionPassCount++;
      check(`Section: ${sec.label}`, found, found ? "found" : "MISSING from HTML");
    }
    console.log(`\n  Sections: ${sectionPassCount}/${expectedSections.length} present\n`);

    // 5. HTML validity basics
    check("Has <html> open tag", html.includes("<html"),
      html.includes("<html") ? "found" : "missing");
    check("Has </html> close tag", html.includes("</html>"),
      html.includes("</html>") ? "found" : "missing");
    check("Has <head> tag", html.includes("<head>"),
      html.includes("<head>") ? "found" : "missing");
    check("Has </head> tag", html.includes("</head>"),
      html.includes("</head>") ? "found" : "missing");
    check("Has <body> tag", html.includes("<body"),
      html.includes("<body") ? "found" : "missing");
    check("Has </body> tag", html.includes("</body>"),
      html.includes("</body>") ? "found" : "missing");
    check("Has DOCTYPE", html.includes("<!DOCTYPE html>"),
      html.includes("<!DOCTYPE html>") ? "found" : "missing");

    // 6. Design tokens
    check("Design token: #09090b background", html.includes("#09090b"),
      html.includes("#09090b") ? "found" : "missing");
    check("Design token: #d97757 accent", html.includes("#d97757"),
      html.includes("#d97757") ? "found" : "missing");
    check("Design token: Manrope font", html.includes("Manrope"),
      html.includes("Manrope") ? "found" : "missing");
    check("Design token: JetBrains Mono font", html.includes("JetBrains Mono"),
      html.includes("JetBrains Mono") ? "found" : "missing");

    // 7. API endpoints respond (spot check)
    const apiChecks = [
      "/api/business/company",
      "/api/business/initiatives",
      "/api/ambient/stats",
    ];
    for (const endpoint of apiChecks) {
      try {
        const apiRes = await fetch(`http://127.0.0.1:${port}${endpoint}`);
        check(`API ${endpoint}`, apiRes.status === 200, `status ${apiRes.status}`);
      } catch (err: any) {
        check(`API ${endpoint}`, false, err.message);
      }
    }

    // 8. HTML size sanity (should be substantial, not a stub)
    const sizeKB = Math.round(html.length / 1024);
    check("HTML size reasonable", html.length > 5000, `${sizeKB} KB`);

  } catch (err: any) {
    check("Server starts", false, err.message);
    console.error("\nFATAL:", err);
  } finally {
    // Stop server
    console.log("\nStopping server...");
    stopOperatingDashboardServer();
    console.log("Server stopped.");

    // Close DB and clean up temp file
    if (db) {
      try { db.close(); } catch {}
    }
    try { unlinkSync(dbPath); } catch {}
  }

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`RESULT: ${passed}/${total} passed, ${failed} failed`);
  if (failed > 0) {
    console.log("\nFailures:");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  - ${r.name}: ${r.detail || "no detail"}`);
    }
  }
  console.log(`${"=".repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main();
