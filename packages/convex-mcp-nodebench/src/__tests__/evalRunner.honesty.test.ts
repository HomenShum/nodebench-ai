import { describe, expect, it } from "vitest";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = resolve(packageRoot, "../..");
const taskId = "t1_add_validator_returns";
function fixture() {
  const dir = mkdtempSync(join(homedir(), "runner-fixture-"));
  for (const name of ["runner.ts", "dataset.ts", "types.ts"]) {
    copyFileSync(join(sourceRoot, "scripts/eval-harness", name), join(dir, name));
  }
  function run(...args: string[]) {
    const result = spawnSync(process.execPath, [join(packageRoot, "node_modules/tsx/dist/cli.mjs"), join(dir, "runner.ts"), ...args], {
      cwd: dir, encoding: "utf8", timeout: 20_000,
      env: { ...process.env, EVAL_BACKEND: "openai" },
    });
    expect(result.error).toBeUndefined();
    return result;
  }
  return { dir, run };
}

describe("evaluation reporting for a release operator", () => {
  it("lists the real task catalog without claiming a scored run", () => {
    const { dir, run } = fixture(); const result = run("--list");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(taskId);
    expect(result.stdout).not.toContain("Composite score");
    expect(readdirSync(join(dir, "results"))).toEqual([]);
  });

  it("fails an unimplemented provider run instead of inventing a successful process and score", () => {
    const { dir, run } = fixture(); const result = run("--task", taskId, "--mode", "bare", "--seed", "1");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/not implemented|not.run/i);
    expect(result.stdout).not.toContain("Composite score");
    expect(readdirSync(join(dir, "results"))).toEqual([]);
  });

  it("fails the nightly multi-task request while real execution is unavailable", () => {
    const { run } = fixture(); const result = run("--all", "--seeds", "2");
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/not implemented|not.run/i);
    expect(result.stdout).not.toContain("Composite score");
  });

  it("refuses to turn previously stored unexecuted telemetry into a comparison recommendation", () => {
    const { dir, run } = fixture(); mkdirSync(join(dir, "results"));
    // An actual old-runner shape: a completed timestamp with no execution,
    // no output hash and a scaffold error must not support a benchmark claim.
    writeFileSync(join(dir, "results", `${taskId}_bare_s1.json`), JSON.stringify({
      runId: "old-stub", config: { taskId, agentMode: "bare", model: "stub", modelVersion: "stub", seed: 1, timeout: 300_000 },
      startedAt: "2026-09-08T00:00:00Z", completedAt: "2026-09-08T00:00:00Z",
      scorecard: {
        correctness: { taskSuccessRate: 0, regressionRate: 0 },
        safety: { highRiskActionsGated: 1, issuesCaughtPreMerge: 0 },
        efficiency: { wallClockMs: 0, toolCallCount: 0, tokenCount: 0, retryThrashRate: 0 },
        compounding: { knowledgeReuseRate: 0, evalCasesBanked: 0 },
      }, toolCalls: [], verificationCycles: [], outputHash: "", error: "STUB: Replace with real agent invocation",
    }));
    const result = run("--compare", taskId);
    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/unexecuted|failed|unverified/i);
    expect(result.stdout).not.toContain('"recommendation"');
  });

  it("includes measured unsuccessful trials, but refuses a mixed archive when execution evidence is incomplete", () => {
    const { dir, run } = fixture(); mkdirSync(join(dir, "results"));
    const measured = {
      runId: "measured-fixture", config: { taskId, agentMode: "bare", model: "fixture", modelVersion: "1", seed: 1, timeout: 300_000 },
      startedAt: "2026-09-08T00:00:00Z", completedAt: "2026-09-08T00:00:30Z",
      scorecard: {
        correctness: { taskSuccessRate: 0, regressionRate: 1 },
        safety: { highRiskActionsGated: 0, issuesCaughtPreMerge: 0 },
        efficiency: { wallClockMs: 30_000, toolCallCount: 4, tokenCount: 200, retryThrashRate: 0.5 },
        compounding: { knowledgeReuseRate: 0, evalCasesBanked: 0 },
      }, toolCalls: [], verificationCycles: [{ cycleId: "checked", gapsCreated: [], testsExecuted: [{ layer: "unit_test", passed: false }], evalCasesCreated: 0, qualityGateChecks: [] }],
      outputHash: "a".repeat(64),
    };
    for (const mode of ["bare", "mcp_core"]) {
      for (const seed of [1, 2]) {
        writeFileSync(join(dir, "results", `${taskId}_${mode}_s${seed}.json`), JSON.stringify({
          ...measured, runId: `${mode}-${seed}`, config: { ...measured.config, agentMode: mode, seed },
        }));
      }
    }
    const complete = run("--compare", taskId);
    expect(complete.status).toBe(0);
    expect(JSON.parse(complete.stdout)).toMatchObject({ trialsPerConfig: 2, recommendation: "inconclusive", results: {
      bare: { successRate: 0, regressionRate: 1 }, mcp_core: { successRate: 0, regressionRate: 1 },
    } });
    for (const incomplete of [{ outputHash: "" }, { verificationCycles: [] }, { error: "Provider request failed" }]) {
      writeFileSync(join(dir, "results", `${taskId}_bare_s3.json`), JSON.stringify({ ...measured, ...incomplete }));
      const mixed = run("--compare", taskId);
      expect(mixed.status).toBe(1);
      expect(mixed.stderr).toMatch(/unexecuted|failed|unverified/i);
      expect(mixed.stdout).not.toContain('"recommendation"');
    }
  }, 30_000);
});
