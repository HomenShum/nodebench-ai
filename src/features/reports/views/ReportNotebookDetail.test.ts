import { describe, expect, it } from "vitest";
import {
  buildReportNotebookContent,
  type SavedReportSnapshot,
} from "./ReportNotebookDetail";

describe("buildReportNotebookContent", () => {
  it("Scenario: owner-edited notebookHtml is the source of truth — wins over sections", () => {
    const saved: SavedReportSnapshot = {
      title: "Stripe diligence",
      summary: "Top moves",
      notebookHtml: "<h2>Custom owner edit</h2><p>Annotated insights.</p>",
      sections: [{ title: "Should not render", body: "Should not render either" }],
    };
    const html = buildReportNotebookContent(null, "fallback name", saved);
    expect(html).toContain("Custom owner edit");
    expect(html).toContain("Annotated insights");
    expect(html).not.toContain("Should not render");
  });

  it("Scenario: saved report with structured sections — renders each title + body as paragraphs", () => {
    const saved: SavedReportSnapshot = {
      title: "Mercor hiring",
      summary: "Series B prep",
      sections: [
        { id: "s1", title: "Velocity", body: "7 new eng roles in 24h.\n\nUp 40% WoW.", status: "verified" },
        { id: "s2", title: "Implication", body: "Runway extends to Q1 2027.", status: "verified" },
      ],
    };
    const html = buildReportNotebookContent(null, "Mercor", saved);
    expect(html).toContain("<h3>Velocity</h3>");
    expect(html).toContain("7 new eng roles in 24h");
    expect(html).toContain("Up 40% WoW");
    expect(html).toContain("<h3>Implication</h3>");
    expect(html).toContain("Runway extends");
  });

  it("Scenario: saved report falls back to compiledAnswerV2.truthSections when sections are empty", () => {
    const saved: SavedReportSnapshot = {
      title: "DISCO",
      sections: [],
      compiledAnswerV2: {
        truthSections: [
          {
            id: "ts1",
            title: "Regulatory",
            sentences: [
              { sentenceId: "se1", text: "SOC 2 Type II GA in EU." },
              { sentenceId: "se2", text: "Flips prior needs-review stance." },
            ],
          },
        ],
      },
    };
    const html = buildReportNotebookContent(null, "DISCO", saved);
    expect(html).toContain("<h3>Regulatory</h3>");
    expect(html).toContain("SOC 2 Type II GA in EU.");
    expect(html).toContain("Flips prior needs-review stance");
  });

  it("Scenario: saved report has no body, no sections, no compiled — shows empty-body explanation", () => {
    const saved: SavedReportSnapshot = {
      title: "Empty report",
      summary: "",
    };
    const html = buildReportNotebookContent(null, "Empty report", saved);
    expect(html).toContain("Empty report");
    expect(html).toContain("does not yet have a written answer");
  });

  it("Scenario: adversarial — XSS-shaped fields in metadata are escaped (sections + summary + query)", () => {
    const saved: SavedReportSnapshot = {
      title: "<img src=x onerror=alert(1)>",
      summary: "<script>alert('xss')</script>",
      query: "& how does it < behave >",
      sections: [
        { title: "<svg/onload=alert(2)>", body: "<iframe>nope</iframe>" },
      ],
    };
    const html = buildReportNotebookContent(null, "fallback", saved);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<svg/onload");
    expect(html).not.toContain("<iframe>");
    expect(html).toContain("&lt;img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; how does it &lt; behave &gt;");
    expect(html).toContain("&lt;svg/onload");
  });

  it("Scenario: notebookHtml is trusted verbatim — backend is responsible for sanitization (server-of-truth)", () => {
    // Verifies we don't double-escape an already-saved owner edit.
    const saved: SavedReportSnapshot = {
      title: "ignored",
      notebookHtml: "<h2>Already escaped &amp; safe</h2>",
    };
    const html = buildReportNotebookContent(null, "x", saved);
    expect(html).toContain("&amp; safe");
    expect(html).not.toContain("&amp;amp;");
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

  it("Scenario: structured sections take precedence over compiledAnswerV2 when both present", () => {
    const saved: SavedReportSnapshot = {
      title: "Dual sources",
      sections: [{ title: "From sections", body: "Sections wins" }],
      compiledAnswerV2: {
        truthSections: [
          { title: "From compiled", sentences: [{ text: "Compiled loses" }] },
        ],
      },
    };
    const html = buildReportNotebookContent(null, "Dual sources", saved);
    expect(html).toContain("From sections");
    expect(html).toContain("Sections wins");
    expect(html).not.toContain("From compiled");
    expect(html).not.toContain("Compiled loses");
  });
});
