import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildTelemetryInspectorRunsFromEvalArtifact,
  type EnterpriseEvalArtifact,
} from "./telemetryInspectorArtifacts";

describe("telemetryInspectorArtifacts", () => {
  it("converts the latest enterprise eval artifact into inspector runs", () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const artifact = JSON.parse(
      readFileSync(
        resolve(currentDir, "../../../../docs/architecture/benchmarks/enterprise-investigation-eval-latest.json"),
        "utf8",
      ),
    ) as EnterpriseEvalArtifact;

    const runs = buildTelemetryInspectorRunsFromEvalArtifact(artifact);

    expect(runs.length).toBeGreaterThanOrEqual(artifact.cases.length);
    expect(runs.some((run) => run.tags.includes("enterpriseInvestigation"))).toBe(true);
    expect(runs.every((run) => run.steps.length >= 3)).toBe(true);
    expect(runs.some((run) => run.videoUrl === artifact.stream.video?.url)).toBe(true);
    expect(
      runs.some((run) =>
        run.steps.some(
          (step) =>
            step.title === "Required LLM judge verdict" &&
            step.response.llmJudge &&
            typeof step.response.llmJudge === "object",
        ),
      ),
    ).toBe(true);
  });
});
