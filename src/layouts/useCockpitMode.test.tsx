import { MemoryRouter } from "react-router-dom";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setCurrentView = vi.fn();
let mockCurrentView: "oracle" | "research" | "control-plane" = "oracle";

vi.mock("../hooks/useCockpitRouting", () => ({
  useCockpitRouting: () => ({
    currentView: mockCurrentView,
    setCurrentView,
    entityName: null,
    setEntityName: vi.fn(),
    selectedSpreadsheetId: null,
    setSelectedSpreadsheetId: vi.fn(),
    researchHubInitialTab: "overview",
    setResearchHubInitialTab: vi.fn(),
    isTransitioning: false,
    setIsTransitioning: vi.fn(),
  }),
}));

import { useCockpitMode } from "./useCockpitMode";

describe("useCockpitMode", () => {
  beforeEach(() => {
    setCurrentView.mockReset();
    mockCurrentView = "oracle";
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not restore a saved cockpit mode over an explicit oracle deep link", () => {
    window.localStorage.setItem("nodebench-cockpit-mode", "mission");

    renderHook(() => useCockpitMode(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={["/oracle"]}>{children}</MemoryRouter>,
    });

    expect(setCurrentView).not.toHaveBeenCalled();
  });

  it("does not restore a saved cockpit mode over the clean home route", () => {
    mockCurrentView = "control-plane";
    window.localStorage.setItem("nodebench-cockpit-mode", "system");

    renderHook(() => useCockpitMode(), {
      wrapper: ({ children }) => <MemoryRouter initialEntries={["/"]}>{children}</MemoryRouter>,
    });

    expect(setCurrentView).not.toHaveBeenCalled();
  });
});
