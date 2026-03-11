import { describe, expect, it } from "vitest";
import { buildViewBreadcrumbs } from "./viewBreadcrumbs";

describe("buildViewBreadcrumbs", () => {
  it("returns no breadcrumbs for the control-plane landing", () => {
    expect(
      buildViewBreadcrumbs({
        currentView: "control-plane",
        researchHubInitialTab: "overview",
        showResearchDossier: false,
      }),
    ).toEqual([]);
  });

  it("builds parent breadcrumbs for nested views", () => {
    expect(
      buildViewBreadcrumbs({
        currentView: "receipts",
        researchHubInitialTab: "overview",
        showResearchDossier: false,
      }),
    ).toEqual([
      {
        id: "control-plane",
        isCurrent: false,
        label: "DeepTrace",
        path: "/",
        view: "control-plane",
      },
      {
        id: "receipts",
        isCurrent: true,
        label: "Action Receipts",
        path: "/receipts",
        view: "receipts",
      },
    ]);
  });

  it("builds research breadcrumbs for the product direction memo", () => {
    expect(
      buildViewBreadcrumbs({
        currentView: "product-direction",
        researchHubInitialTab: "overview",
        showResearchDossier: false,
      }),
    ).toEqual([
      {
        id: "research",
        isCurrent: false,
        label: "Research Hub",
        path: "/research",
        view: "research",
      },
      {
        id: "product-direction",
        isCurrent: true,
        label: "Product Direction",
        path: "/product-direction",
        view: "product-direction",
      },
    ]);
  });

  it("builds control-plane breadcrumbs for execution trace", () => {
    expect(
      buildViewBreadcrumbs({
        currentView: "execution-trace",
        researchHubInitialTab: "overview",
        showResearchDossier: false,
      }),
    ).toEqual([
      {
        id: "control-plane",
        isCurrent: false,
        label: "DeepTrace",
        path: "/",
        view: "control-plane",
      },
      {
        id: "execution-trace",
        isCurrent: true,
        label: "Execution Trace",
        path: "/execution-trace",
        view: "execution-trace",
      },
    ]);
  });

  it("builds research tab breadcrumbs when the dossier shell is open", () => {
    expect(
      buildViewBreadcrumbs({
        currentView: "research",
        researchHubInitialTab: "briefing",
        showResearchDossier: true,
      }),
    ).toEqual([
      {
        id: "research",
        isCurrent: false,
        label: "Research Hub",
        path: "/research",
        view: "research",
      },
      {
        id: "research-briefing",
        isCurrent: true,
        label: "Briefing",
        path: "/research/briefing",
      },
    ]);
  });
});
