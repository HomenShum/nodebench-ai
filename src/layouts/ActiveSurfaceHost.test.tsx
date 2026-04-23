import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ActiveSurfaceHost } from "./ActiveSurfaceHost";

vi.mock("@/shared/agent-ui/AgentScreen", () => ({
  AgentScreen: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ErrorBoundary", () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/skeletons", () => ({
  ViewSkeleton: () => <div data-testid="view-skeleton" />,
}));

vi.mock("@/features/home/views/HomeLanding", () => ({
  HomeLanding: () => <div data-testid="legacy-home-surface" />,
}));

vi.mock("@/features/controlPlane/views/NotFoundPage", () => ({
  NotFoundPage: () => <div data-testid="not-found-surface" />,
}));

vi.mock("@/features/reports/views/ReportsHomeEnhanced", () => ({
  ReportsHomeEnhanced: () => <div data-testid="reports-surface" />,
}));

vi.mock("@/features/chat/views/ChatHome", () => ({
  ChatHome: () => <div data-testid="chat-home-surface" />,
}));

vi.mock("@/features/product/views/HomeLandingEnhanced", () => ({
  HomeLandingEnhanced: () => <div data-testid="home-landing-surface" />,
}));

vi.mock("@/features/nudges/views/NudgesHome", () => ({
  NudgesHome: () => <div data-testid="history-surface" />,
}));

vi.mock("@/features/me/views/MeHome", () => ({
  MeHome: () => <div data-testid="me-surface" />,
}));

describe("ActiveSurfaceHost", () => {
  it("renders the maintained chat surface for the workspace shell", async () => {
    render(
      <MemoryRouter initialEntries={["/?surface=chat"]}>
        <ActiveSurfaceHost
          currentSurface="workspace"
          currentView="chat-home"
          panel={null}
          entityName={null}
          selectedSpreadsheetId={null}
          setSelectedSpreadsheetId={() => undefined}
          selectedDocumentId={null}
          onDocumentSelect={() => undefined}
          isGridMode={false}
          setIsGridMode={() => undefined}
          selectedTaskId={null}
          selectedTaskSource={null}
          onSelectTask={() => undefined}
          onClearTaskSelection={() => undefined}
          researchHubInitialTab="overview"
          setResearchHubInitialTab={() => undefined}
          activeSources={[]}
          setActiveSources={() => undefined}
          setCurrentView={() => undefined}
          setEntityName={() => undefined}
          onNavigateToView={() => undefined}
          onOpenFastAgent={() => undefined}
          isUnknownRoute={false}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId("chat-home-surface")).toBeInTheDocument();
    expect(screen.queryByTestId("home-landing-surface")).not.toBeInTheDocument();
  });
});
