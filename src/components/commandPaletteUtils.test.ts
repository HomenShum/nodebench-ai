import { beforeEach, describe, expect, it } from "vitest";
import type { CommandAction } from "./CommandPalette";
import { rankCommandPaletteCommands } from "./commandPaletteUtils";
import {
  CONTROL_PLANE_PREFERRED_PATH_KEY,
  saveBuyerPreferredPath,
} from "@/features/controlPlane/lib/onboardingState";

const makeCommand = (id: string, label = id): CommandAction => ({
  id,
  label,
  description: label,
  icon: null,
  keywords: [],
  section: "navigation",
  action: () => {},
});

describe("rankCommandPaletteCommands", () => {
  beforeEach(() => {
    localStorage.removeItem(CONTROL_PLANE_PREFERRED_PATH_KEY);
  });

  it("biases empty-query results toward the default buyer journey", () => {
    const ranked = rankCommandPaletteCommands(
      [
        makeCommand("nav-benchmarks"),
        makeCommand("nav-research"),
        makeCommand("nav-delegation"),
        makeCommand("nav-investigation"),
        makeCommand("nav-receipts"),
      ],
      "",
    );

    expect(ranked.slice(0, 4).map((item) => item.id)).toEqual([
      "nav-receipts",
      "nav-delegation",
      "nav-investigation",
      "nav-research",
    ]);
  });

  it("puts the saved preferred path first", () => {
    saveBuyerPreferredPath("research-briefing");

    const ranked = rankCommandPaletteCommands(
      [
        makeCommand("nav-benchmarks"),
        makeCommand("nav-research"),
        makeCommand("nav-delegation"),
        makeCommand("nav-investigation"),
        makeCommand("nav-receipts"),
      ],
      "",
    );

    expect(ranked[0]?.id).toBe("nav-research");
  });

  it("does not reorder typed search results", () => {
    const commands = [
      makeCommand("nav-investigation"),
      makeCommand("nav-receipts"),
      makeCommand("nav-research"),
    ];

    expect(rankCommandPaletteCommands(commands, "invest")).toEqual(commands);
  });
});
