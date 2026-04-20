import { describe, expect, it } from "vitest";

import { collapseNudgesIntoGroups, getNudgeGroupKey } from "./nudges";

describe("nudges grouping", () => {
  it("groups multiple open nudges for the same linked report into one loop", () => {
    const grouped = collapseNudgesIntoGroups([
      {
        _id: "n1",
        type: "refresh_recommended",
        title: "Revisit Stripe",
        linkedReportId: "report_stripe",
        actionTargetSurface: "reports",
        updatedAt: 100,
      },
      {
        _id: "n2",
        type: "report_changed",
        title: "Stripe changed",
        linkedReportId: "report_stripe",
        actionTargetSurface: "chat",
        updatedAt: 200,
      },
      {
        _id: "n3",
        type: "follow_up_due",
        title: "Reply to founder",
        linkedReportId: "report_ramp",
        actionTargetSurface: "chat",
        updatedAt: 150,
      },
    ]);

    expect(grouped).toHaveLength(2);
    expect(grouped[0]?._id).toBe("n2");
    expect(grouped[0]?.groupedCount).toBe(2);
    expect(grouped[0]?.groupedTypes).toEqual(["report_changed", "refresh_recommended"]);
    expect(grouped[1]?._id).toBe("n3");
  });

  it("uses entity or target fallback keys when a report id is missing", () => {
    expect(
      getNudgeGroupKey({
        type: "follow_up_due",
        linkedEntitySlug: "stripe",
        actionTargetSurface: "chat",
      }),
    ).toBe("entity:stripe:chat");

    expect(
      getNudgeGroupKey({
        type: "reply_draft_ready",
        actionTargetSurface: "chat",
        actionTargetId: "stripe",
      }),
    ).toBe("target:chat:stripe");
  });
});
