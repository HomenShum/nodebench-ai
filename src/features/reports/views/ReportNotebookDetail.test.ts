import { describe, expect, it } from "vitest";
import {
  buildReportNotebookContent,
  type SavedReportSnapshot,
} from "./ReportNotebookDetail";

describe("buildReportNotebookContent", () => {
  it("Scenario: real saved report with body HTML — renders the saved answer as the notebook body", () => {
    const saved: SavedReportSnapshot = {
      title: "Stripe diligence",
      summary: "Top moves this week",
      query: "What changed at Stripe?",
      bodyHtml: "<p>Pricing memo leaked, GRR holding.</p>",
    };
    const html = buildReportNotebookContent(null, "fallback name", saved);
    expect(html).toContain("Stripe diligence");
    expect(html).toContain("Top moves this week");
    expect(html).toContain("What changed at Stripe?");
    expect(html).toContain("Pricing memo leaked");
    expect(html).not.toContain("fallback name");
  });

  it("Scenario: saved report with markdown body — paragraphs split into <p> tags", () => {
    const saved: SavedReportSnapshot = {
      title: "Mercor hiring",
      bodyMarkdown:
        "First paragraph about hiring velocity.\n\nSecond paragraph about runway implications.",
    };
    const html = buildReportNotebookContent(null, "Mercor", saved);
    expect(html.match(/<p>/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(html).toContain("hiring velocity");
    expect(html).toContain("runway implications");
  });

  it("Scenario: saved report has no body — shows empty-body explanation, not silent blank", () => {
    const saved: SavedReportSnapshot = {
      title: "Empty report",
      summary: "",
    };
    const html = buildReportNotebookContent(null, "Empty report", saved);
    expect(html).toContain("Empty report");
    expect(html).toContain("does not yet have a written answer");
  });

  it("Scenario: adversarial — XSS-shaped fields in saved report are escaped", () => {
    const saved: SavedReportSnapshot = {
      title: "<img src=x onerror=alert(1)>",
      summary: "<script>alert('xss')</script>",
      query: "& how does it < behave >",
    };
    const html = buildReportNotebookContent(null, "fallback", saved);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; how does it &lt; behave &gt;");
  });

  it("Scenario: starter workspace fixture (no real saved report) — renders the starter sections", () => {
    const fakeWorkspace = {
      entity: { name: "Starter Co", summary: "demo", reportCount: 1 },
      note: { content: "field note" },
      latest: {
        title: "Latest brief",
        sections: [
          { title: "Signals", body: "Signal copy" },
          { title: "Risks", body: "Risk copy" },
        ],
      },
      evidence: [],
    } as any;
    const html = buildReportNotebookContent(fakeWorkspace, "Starter Co");
    expect(html).toContain("Latest brief");
    expect(html).toContain("Signals");
    expect(html).toContain("Signal copy");
    expect(html).toContain("Risks");
  });

  it("Scenario: no data, no fixture — renders neutral notebook stub (no white void)", () => {
    const html = buildReportNotebookContent(null, "New report");
    expect(html).toContain("New report");
    expect(html).toContain("notebook");
    expect(html).toContain("Workspace surface");
  });

  it("Scenario: saved report with bodyHtml takes precedence over bodyMarkdown", () => {
    const saved: SavedReportSnapshot = {
      title: "Both bodies",
      bodyHtml: "<h3>HTML wins</h3>",
      bodyMarkdown: "MD loses",
    };
    const html = buildReportNotebookContent(null, "Both bodies", saved);
    expect(html).toContain("<h3>HTML wins</h3>");
    expect(html).not.toContain("MD loses");
  });
});
