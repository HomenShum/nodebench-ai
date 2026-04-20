import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EntityNotebookSurface } from "./EntityNotebookSurface";

vi.mock("@/features/entities/components/EntityNotebookView", () => ({
  EntityNotebookView: ({
    entitySlug,
    canOpenLive,
    openingLive,
  }: {
    entitySlug: string;
    canOpenLive?: boolean;
    openingLive?: boolean;
  }) => (
    <div data-testid="mock-notebook-view">
      notebook:{entitySlug}:{String(canOpenLive)}:{String(openingLive)}
    </div>
  ),
}));

vi.mock("@/features/entities/components/notebook/EntityNotebookLiveMount", () => ({
  EntityNotebookLiveMount: ({
    entitySlug,
    canEdit,
    latestHumanEditorOwnerKey,
  }: {
    entitySlug: string;
    canEdit: boolean;
    latestHumanEditorOwnerKey?: string | null;
  }) => (
    <div data-testid="mock-live-notebook">
      live:{entitySlug}:{String(canEdit)}:{latestHumanEditorOwnerKey ?? "none"}
    </div>
  ),
}));

describe("EntityNotebookSurface", () => {
  it("renders classic drift state and routes view toggle clicks through stable callbacks", () => {
    const onSelectClassic = vi.fn();
    const onSelectNotebook = vi.fn();
    const onSelectLive = vi.fn();

    render(
      <EntityNotebookSurface
        entitySlug="softbank"
        entityViewMode="classic"
        showViewModeToggle
        liveNotebookEnabled
        materializingLiveWorkspace={false}
        hasLiveEntity
        hasWorkspaceSlug
        canEditNotebook
        notebookDriftMessage="2 live notebook edits are newer than the saved report."
        notebookDriftUpdatedLabel="2m ago"
        viewerOwnerKey="user:owner"
        latestHumanEditorOwnerKey="user:owner"
        latestHumanEditorUpdatedAt={Date.now()}
        onSelectClassic={onSelectClassic}
        onSelectNotebook={onSelectNotebook}
        onSelectLive={onSelectLive}
        onOpenReferenceNotebook={vi.fn()}
      />,
    );

    expect(screen.getByText("Live notebook ahead")).toBeInTheDocument();
    expect(
      screen.getByText("2 live notebook edits are newer than the saved report."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Classic" }));
    fireEvent.click(screen.getByRole("button", { name: "Notebook" }));
    fireEvent.click(screen.getByRole("button", { name: /Live/i }));

    expect(onSelectClassic).toHaveBeenCalledTimes(1);
    expect(onSelectNotebook).toHaveBeenCalledTimes(1);
    expect(onSelectLive).toHaveBeenCalledTimes(1);
  });

  it("renders the read-only notebook surface through the memoized boundary", async () => {
    render(
      <EntityNotebookSurface
        entitySlug="softbank"
        entityViewMode="notebook"
        showViewModeToggle
        liveNotebookEnabled
        materializingLiveWorkspace={false}
        hasLiveEntity
        hasWorkspaceSlug
        canEditNotebook
        viewerOwnerKey="user:owner"
        latestHumanEditorOwnerKey="user:owner"
        latestHumanEditorUpdatedAt={Date.now()}
        onSelectClassic={vi.fn()}
        onSelectNotebook={vi.fn()}
        onSelectLive={vi.fn()}
        onOpenReferenceNotebook={vi.fn()}
      />,
    );

    expect(await screen.findByTestId("mock-notebook-view")).toHaveTextContent(
      "notebook:softbank:true:false",
    );
  });

  it("renders the live notebook surface through the memoized boundary", async () => {
    render(
      <EntityNotebookSurface
        entitySlug="softbank"
        entityViewMode="live"
        showViewModeToggle
        liveNotebookEnabled
        materializingLiveWorkspace={false}
        hasLiveEntity
        hasWorkspaceSlug
        canEditNotebook={false}
        viewerOwnerKey="user:owner"
        latestHumanEditorOwnerKey="user:editor"
        latestHumanEditorUpdatedAt={Date.now()}
        onSelectClassic={vi.fn()}
        onSelectNotebook={vi.fn()}
        onSelectLive={vi.fn()}
        onOpenReferenceNotebook={vi.fn()}
      />,
    );

    expect(await screen.findByTestId("mock-live-notebook")).toHaveTextContent(
      "live:softbank:false:user:editor",
    );
  });
});
