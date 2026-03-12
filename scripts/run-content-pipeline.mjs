#!/usr/bin/env node
/**
 * Daily Content Pipeline — Engine-Graded Automation
 *
 * Calls the NodeBench Engine API to execute the content_pipeline workflow,
 * then optionally runs content_publish to distribute.
 *
 * Usage:
 *   node scripts/run-content-pipeline.mjs                     # pipeline only
 *   node scripts/run-content-pipeline.mjs --publish            # pipeline + publish
 *   node scripts/run-content-pipeline.mjs --streaming          # with SSE live output
 *   node scripts/run-content-pipeline.mjs --preset research    # custom preset
 *
 * Requires: MCP server running with --engine flag
 *   npx nodebench-mcp --engine
 *
 * Environment:
 *   ENGINE_URL        — Override engine base URL (default: http://127.0.0.1:6276)
 *   ENGINE_SECRET     — Bearer token if engine auth is enabled
 *   CONTENT_EMAIL     — Email address for digest delivery (optional)
 */

const ENGINE_URL = process.env.ENGINE_URL || "http://127.0.0.1:6276";
const ENGINE_SECRET = process.env.ENGINE_SECRET || "";

const args = process.argv.slice(2);
const streaming = args.includes("--streaming");
const publish = args.includes("--publish");
const presetIdx = args.indexOf("--preset");
const preset = presetIdx !== -1 ? args[presetIdx + 1] : "research";
const quiet = args.includes("--quiet");

// ── Helpers ────────────────────────────────────────────────────────────

function log(msg) {
  if (!quiet) process.stderr.write(`${msg}\n`);
}

async function engineFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (ENGINE_SECRET) headers["Authorization"] = `Bearer ${ENGINE_SECRET}`;
  const res = await fetch(`${ENGINE_URL}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Engine ${res.status}: ${body}`);
  }
  return res;
}

async function engineJson(path, options = {}) {
  const res = await engineFetch(path, options);
  return res.json();
}

// ── Health Check ───────────────────────────────────────────────────────

async function checkHealth() {
  try {
    const health = await engineJson("/api/health");
    if (!health.ok) throw new Error("Engine not healthy");
    log(`Engine ready — ${health.toolCount} tools, ${health.activeSessions} active sessions`);
    return true;
  } catch (err) {
    log(`Engine not reachable at ${ENGINE_URL}`);
    log(`Start the MCP server with: npx nodebench-mcp --engine`);
    process.exit(1);
  }
}

// ── Create Session ─────────────────────────────────────────────────────

async function createSession() {
  const result = await engineJson("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ preset }),
  });
  log(`Session created: ${result.sessionId} (preset: ${result.preset}, ${result.toolCount} tools)`);
  return result.sessionId;
}

// ── Execute Workflow (Batch) ───────────────────────────────────────────

async function executeWorkflowBatch(chainName, sessionId, stepArgs = {}) {
  log(`\nExecuting workflow: ${chainName}`);
  const result = await engineJson(`/api/workflows/${chainName}`, {
    method: "POST",
    body: JSON.stringify({ sessionId, preset, stepArgs }),
  });

  for (const step of result.results) {
    const icon = step.status === "success" ? "✓" : "✗";
    log(`  ${icon} Step ${step.stepIndex}: ${step.tool} (${step.durationMs}ms)`);
  }

  log(`\nConformance: ${result.conformance.grade} (${result.conformance.score}/100)`);
  log(`  ${result.conformance.summary}`);

  return result;
}

// ── Execute Workflow (SSE Streaming) ───────────────────────────────────

async function executeWorkflowStreaming(chainName, sessionId, stepArgs = {}) {
  log(`\nExecuting workflow (streaming): ${chainName}`);

  const res = await engineFetch(`/api/workflows/${chainName}`, {
    method: "POST",
    body: JSON.stringify({ sessionId, preset, stepArgs, streaming: true }),
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalData = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep incomplete line

    let currentEvent = null;
    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          if (currentEvent === "start") {
            log(`  ▶ ${data.workflow} — ${data.totalSteps} steps`);
          } else if (currentEvent === "step") {
            if (data.status === "running") {
              log(`  ● Step ${data.stepIndex}: ${data.tool} ...`);
            } else {
              const icon = data.status === "complete" ? "✓" : "✗";
              log(`  ${icon} Step ${data.stepIndex}: ${data.tool} (${data.durationMs}ms)`);
            }
          } else if (currentEvent === "complete") {
            log(`\nConformance: ${data.grade} (${data.conformanceScore}/100) — ${data.totalDurationMs}ms total`);
            finalData = data;
          }
        } catch { /* skip malformed */ }
        currentEvent = null;
      }
    }
  }

  return finalData;
}

// ── Get Conformance Report ─────────────────────────────────────────────

async function getReport(sessionId) {
  const result = await engineJson(`/api/sessions/${sessionId}/report`);
  return result.report;
}

// ── Get Session Trace ──────────────────────────────────────────────────

async function getTrace(sessionId) {
  const result = await engineJson(`/api/sessions/${sessionId}/trace`);
  return result;
}

// ── Main ───────────────────────────────────────────────────────────────

async function main() {
  log("═══════════════════════════════════════════════════════════");
  log("  NodeBench Content Pipeline — Engine-Graded Automation");
  log("═══════════════════════════════════════════════════════════\n");

  await checkHealth();

  const sessionId = await createSession();

  // Step 1: Run content pipeline
  const executeWorkflow = streaming ? executeWorkflowStreaming : executeWorkflowBatch;
  const pipelineResult = await executeWorkflow("content_pipeline", sessionId);

  // Step 2: Optionally run publish workflow
  if (publish) {
    log("\n───────────────────────────────────────────────────────────");
    await executeWorkflow("content_publish", sessionId);
  }

  // Step 3: Get final report
  const report = await getReport(sessionId);
  const trace = await getTrace(sessionId);

  // Output structured result to stdout (composable with jq)
  const output = {
    sessionId,
    preset,
    pipeline: {
      workflow: "content_pipeline",
      grade: report.grade,
      score: report.score,
      totalDurationMs: report.totalDurationMs,
      stepsCompleted: report.successfulSteps,
      stepsFailed: report.failedSteps,
    },
    breakdown: report.breakdown,
    traceEventCount: trace.events?.length ?? 0,
    callCount: trace.callHistory?.length ?? 0,
    generatedAt: new Date().toISOString(),
  };

  if (process.stdout.isTTY) {
    process.stdout.write(JSON.stringify(output, null, 2) + "\n");
  } else {
    process.stdout.write(JSON.stringify(output) + "\n");
  }

  // Cleanup session
  await engineFetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
  log(`\nSession ${sessionId} cleaned up.`);
  log("Done.");
}

main().catch((err) => {
  process.stderr.write(`\nFatal: ${err.message}\n`);
  process.exit(1);
});
