import { describe, expect, it } from "vitest";

import { buildReportNotebookPath, getReportNotebookIdFromPath } from "./reportNotebookRouting";

describe("reportNotebookRouting", () => {
  it("builds the lightweight web notebook path under Reports", () => {
    expect(buildReportNotebookPath("orbital-labs")).toBe("/reports/orbital-labs/notebook");
    expect(buildReportNotebookPath("demo day")).toBe("/reports/demo%20day/notebook");
  });

  it("parses report ids from the lightweight web notebook route", () => {
    expect(getReportNotebookIdFromPath("/reports/orbital-labs/notebook")).toBe("orbital-labs");
    expect(getReportNotebookIdFromPath("/reports/demo%20day/notebook/")).toBe("demo day");
    expect(getReportNotebookIdFromPath("/reports/orbital-labs/graph")).toBeNull();
  });
});
