import { describe, expect, it } from "vitest";
import { getViewCapability } from "@/lib/viewCapabilityRegistry";
import { ALL_VIEW_IDS } from "@/lib/viewRegistry";

describe("viewCapabilityRegistry", () => {
  it("defines metadata for every main layout view", () => {
    for (const view of ALL_VIEW_IDS) {
      const capability = getViewCapability(view);
      expect(capability, `missing capability for ${view}`).toBeTruthy();
      expect(capability.title.length, `${view} should have a title`).toBeGreaterThan(0);
      expect(capability.description.length, `${view} should have a description`).toBeGreaterThan(0);
    }
  });
});
