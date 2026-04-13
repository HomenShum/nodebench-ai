import os from "node:os";
import path from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

import { autonomousDeliveryTools } from "../tools/autonomousDeliveryTools.js";

const originalDataDir = process.env.NODEBENCH_DATA_DIR;
let testDataDir = "";

beforeAll(() => {
  testDataDir = mkdtempSync(path.join(os.tmpdir(), "nodebench-mcp-autonomous-"));
  process.env.NODEBENCH_DATA_DIR = testDataDir;
});

afterAll(() => {
  if (originalDataDir) {
    process.env.NODEBENCH_DATA_DIR = originalDataDir;
  } else {
    delete process.env.NODEBENCH_DATA_DIR;
  }
  if (testDataDir) {
    try {
      rmSync(testDataDir, { recursive: true, force: true });
    } catch {
      // Windows can keep SQLite sidecars briefly locked. Leaving the temp dir behind is fine for CI.
    }
  }
});

function getTool(name: string) {
  const tool = autonomousDeliveryTools.find((entry) => entry.name === name);
  if (!tool) throw new Error(`Tool not found: ${name}`);
  return tool;
}

describe("autonomousDeliveryTools", () => {
  it("completes a local self-directed delivery loop", async () => {
    const runTool = getTool("run_self_directed_delivery_loop");
    const result = (await runTool.handler({
      goal: "Local autonomous delivery smoke test",
      saveSessionNote: false,
      research: {
        target: "local autonomous delivery loop",
        description: "Smoke test the local-first orchestration path",
      },
      implementation: {
        commands: [
          {
            label: "compile smoke",
            phase: "compile",
            command: `node -e "process.stdout.write('compile-ok')"`,
          },
          {
            label: "lint smoke",
            phase: "lint",
            command: `node -e "process.stdout.write('lint-ok')"`,
          },
          {
            label: "unit smoke",
            phase: "test",
            command: `node -e "process.stdout.write('test-ok')"`,
          },
          {
            label: "debug smoke",
            phase: "self_debug",
            command: `node -e "process.stdout.write('debug-ok')"`,
          },
          {
            label: "failure path smoke",
            phase: "failure_path_test",
            command: `node -e "process.stdout.write('negative-ok')"`,
          },
        ],
      },
      dogfood: {
        scenarioId: "delivery_smoke_scenario",
        prompt: "Judge whether the autonomous loop produced a reusable delivery packet.",
        output: {
          packetId: "pkt_smoke_1",
          packetType: "delivery_memo",
          canonicalEntity: "NodeBench",
          memo: "The local autonomous delivery loop completed with explicit compile, lint, test, and failure-path coverage.",
          nextActions: ["ship", "monitor"],
        },
      },
    })) as any;

    expect(result.status).toBe("completed");
    expect(result.judge.verdict).toBe("PASS");
    expect(result.verification.closedLoop.allPassed).toBe(true);
    expect(result.verification.flywheel.passed).toBe(true);
    expect(result.learning.recordedLearnings.length).toBeGreaterThan(0);
  });

  it("lists and reloads persisted delivery runs", async () => {
    const runTool = getTool("run_self_directed_delivery_loop");
    const created = (await runTool.handler({
      goal: "Listable autonomous run",
      saveSessionNote: false,
      implementation: {
        commands: [
          {
            label: "compile smoke",
            phase: "compile",
            command: `node -e "process.stdout.write('compile-ok')"`,
          },
          {
            label: "lint smoke",
            phase: "lint",
            command: `node -e "process.stdout.write('lint-ok')"`,
          },
          {
            label: "unit smoke",
            phase: "test",
            command: `node -e "process.stdout.write('test-ok')"`,
          },
          {
            label: "debug smoke",
            phase: "self_debug",
            command: `node -e "process.stdout.write('debug-ok')"`,
          },
          {
            label: "failure path smoke",
            phase: "failure_path_test",
            command: `node -e "process.stdout.write('negative-ok')"`,
          },
        ],
      },
      research: {
        target: "listable autonomous run",
      },
      dogfood: {
        scenarioId: "delivery_smoke_lookup",
        prompt: "Return a reusable packet.",
        output: {
          packetId: "pkt_lookup_1",
          packetType: "delivery_memo",
          canonicalEntity: "NodeBench",
          memo: "A second autonomous delivery loop run for persistence checks.",
          nextActions: ["inspect"],
        },
      },
    })) as any;

    const getToolRun = getTool("get_self_directed_delivery_run");
    const loaded = (await getToolRun.handler({ runId: created.runId })) as any;
    expect(loaded.runId).toBe(created.runId);
    expect(loaded.steps.length).toBeGreaterThan(0);

    const listTool = getTool("list_self_directed_delivery_runs");
    const listed = (await listTool.handler({ limit: 5 })) as any;
    expect(listed.count).toBeGreaterThan(0);
    expect(listed.runs.some((run: any) => run.runId === created.runId)).toBe(true);
  });
});
