import { beforeEach, describe, expect, it } from "vitest";
import {
  AGENTS_VIEW_MODE_KEY,
  CONTROL_PLANE_CHECKLIST_KEY,
  CONTROL_PLANE_PREFERRED_PATH_KEY,
  deriveChecklistCompletionsFromRoute,
  loadAgentsViewMode,
  loadBuyerChecklistState,
  loadBuyerPreferredPath,
  mergeChecklistCompletions,
  orderByBuyerPreference,
  saveAgentsViewMode,
  saveBuyerChecklistState,
  saveBuyerPreferredPath,
} from "./onboardingState";

describe("onboardingState", () => {
  beforeEach(() => {
    localStorage.removeItem(CONTROL_PLANE_PREFERRED_PATH_KEY);
    localStorage.removeItem(CONTROL_PLANE_CHECKLIST_KEY);
    localStorage.removeItem(AGENTS_VIEW_MODE_KEY);
  });

  it("persists and reloads the buyer preferred path", () => {
    expect(loadBuyerPreferredPath()).toBeNull();
    saveBuyerPreferredPath("investigation");
    expect(loadBuyerPreferredPath()).toBe("investigation");
  });

  it("reorders role cards by the saved preferred path", () => {
    const ordered = orderByBuyerPreference(
      [
        { id: "a", preferredPath: "receipts" as const },
        { id: "b", preferredPath: "delegation" as const },
        { id: "c", preferredPath: "investigation" as const },
      ],
      "investigation",
    );

    expect(ordered.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("derives checklist completion from route visits instead of clicks", () => {
    expect(
      deriveChecklistCompletionsFromRoute({
        currentView: "research",
        showResearchDossier: true,
        researchHubInitialTab: "briefing",
      }),
    ).toEqual(["brief"]);

    expect(
      deriveChecklistCompletionsFromRoute({
        currentView: "receipts",
        showResearchDossier: false,
        researchHubInitialTab: "overview",
      }),
    ).toEqual(["receipt"]);
  });

  it("merges route completions into stored checklist state", () => {
    const merged = mergeChecklistCompletions({ receipt: true }, ["delegation", "brief"]);
    expect(merged).toEqual({ receipt: true, delegation: true, brief: true });
  });

  it("persists checklist dismissal and state separately", () => {
    saveBuyerChecklistState({ receipt: true });
    expect(loadBuyerChecklistState()).toEqual({ receipt: true });

    saveBuyerChecklistState("dismissed");
    expect(loadBuyerChecklistState()).toBe("dismissed");
  });

  it("persists the agents hub view mode", () => {
    expect(loadAgentsViewMode()).toBe("basic");
    saveAgentsViewMode("advanced");
    expect(loadAgentsViewMode()).toBe("advanced");
  });
});
