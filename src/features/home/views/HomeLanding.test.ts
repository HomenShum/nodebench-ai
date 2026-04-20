import { describe, expect, it } from "vitest";

import { buildVisibleHomeReports } from "./HomeLanding";

describe("buildVisibleHomeReports", () => {
  it("dedupes saved reports by entity slug before choosing visible cards", () => {
    const visible = buildVisibleHomeReports([
      {
        key: "report-1",
        title: "Stripe",
        summary: "Latest Stripe brief",
        prompt: "What matters most about Stripe right now?",
        type: "company",
        lens: "investor",
        entitySlug: "stripe",
        updatedLabel: "Today",
      },
      {
        key: "report-2",
        title: "Stripe",
        summary: "Older Stripe brief",
        prompt: "Update Stripe and show me what changed.",
        type: "company",
        lens: "investor",
        entitySlug: "stripe",
        updatedLabel: "Yesterday",
      },
      {
        key: "report-3",
        title: "Datadog",
        summary: "Datadog brief",
        prompt: "What changed at Datadog?",
        type: "company",
        lens: "founder",
        entitySlug: "datadog",
        updatedLabel: "Today",
      },
    ]);

    expect(visible.map((report) => report.key)).toEqual([
      "report-1",
      "report-3",
      "starter-market",
    ]);
  });

  it("fills remaining slots with starter cards when there are too few unique saved reports", () => {
    const visible = buildVisibleHomeReports([
      {
        key: "report-1",
        title: "OpenAI",
        summary: "OpenAI brief",
        prompt: "Summarize OpenAI.",
        type: "company",
        lens: "founder",
        entitySlug: "openai",
        updatedLabel: "Today",
      },
    ]);

    expect(visible.map((report) => report.key)).toEqual([
      "report-1",
      "starter-market",
      "starter-role",
    ]);
  });

  it("dedupes legacy alias reports even when their entity slugs differ", () => {
    const visible = buildVisibleHomeReports([
      {
        key: "report-1",
        title: "SoftBank Group Corp.",
        summary: "Alias report",
        prompt: "What matters most about SoftBank right now?",
        type: "company",
        lens: "investor",
        entitySlug: "softbank-group-corp",
        updatedLabel: "Today",
      },
      {
        key: "report-2",
        title: "SoftBank",
        summary: "Canonical report",
        prompt: "Update SoftBank and show me what changed.",
        type: "company",
        lens: "investor",
        entitySlug: "softbank",
        updatedLabel: "Yesterday",
      },
    ]);

    expect(visible.map((report) => report.key)).toEqual([
      "report-1",
      "starter-market",
      "starter-role",
    ]);
  });
});
