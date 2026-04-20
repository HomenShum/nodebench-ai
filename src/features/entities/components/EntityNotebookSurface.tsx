import { memo, Suspense, lazy } from "react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

const LiveDiligenceSection = lazy(() =>
  import("@/features/entities/components/LiveDiligenceSection").then((mod) => ({
    default: mod.LiveDiligenceSection,
  })),
);

const NotebookTimeline = lazy(() =>
  import("@/features/entities/components/notebook/NotebookTimeline").then((mod) => ({
    default: mod.NotebookTimeline,
  })),
);

const EntityNotebookView = lazy(() =>
  import("@/features/entities/components/EntityNotebookView").then((mod) => ({
    default: mod.EntityNotebookView,
  })),
);

const EntityNotebookLiveMount = lazy(() =>
  import("@/features/entities/components/notebook/EntityNotebookLiveMount").then((mod) => ({
    default: mod.EntityNotebookLiveMount,
  })),
);

const ShareEntityButton = lazy(() =>
  import("@/features/share/components/ShareEntityButton").then((mod) => ({
    default: mod.ShareEntityButton,
  })),
);

type EntityNotebookSurfaceProps = {
  entitySlug: string;
  shareToken?: string;
  entityViewMode: "classic" | "notebook" | "live";
  showViewModeToggle: boolean;
  liveNotebookEnabled: boolean;
  materializingLiveWorkspace: boolean;
  hasLiveEntity: boolean;
  hasWorkspaceSlug: boolean;
  canEditNotebook: boolean;
  notebookDriftMessage?: string | null;
  notebookDriftUpdatedLabel?: string | null;
  viewerOwnerKey: string | null;
  collaborationParticipants?: ReadonlyArray<{
    ownerKey: string;
    label: string;
    email?: string;
  }>;
  latestHumanEditorOwnerKey: string | null;
  latestHumanEditorUpdatedAt: number | null;
  onSelectClassic: () => void;
  onSelectNotebook: () => void;
  onSelectLive: () => void | Promise<void>;
  onOpenReferenceNotebook: () => void;
};

function EntityNotebookSurfaceBase({
  entitySlug,
  shareToken,
  entityViewMode,
  showViewModeToggle,
  liveNotebookEnabled,
  materializingLiveWorkspace,
  hasLiveEntity,
  hasWorkspaceSlug,
  canEditNotebook,
  notebookDriftMessage,
  notebookDriftUpdatedLabel,
  viewerOwnerKey,
  collaborationParticipants,
  latestHumanEditorOwnerKey,
  latestHumanEditorUpdatedAt,
  onSelectClassic,
  onSelectNotebook,
  onSelectLive,
  onOpenReferenceNotebook,
}: EntityNotebookSurfaceProps) {
  const liveViewDisabled =
    materializingLiveWorkspace || !hasWorkspaceSlug || (Boolean(shareToken) && !hasLiveEntity);
  const liveViewTitle =
    shareToken && !hasLiveEntity
      ? "Live notebook can only be created from your own workspace."
      : !hasWorkspaceSlug
        ? "Live notebook requires an entity workspace."
        : undefined;
  const canOpenLiveFromNotebook =
    liveNotebookEnabled &&
    hasWorkspaceSlug &&
    !(Boolean(shareToken) && !hasLiveEntity) &&
    !materializingLiveWorkspace;

  return (
    <>
      {notebookDriftMessage && entityViewMode === "classic" ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">Live notebook ahead</span>
            {notebookDriftUpdatedLabel ? (
              <span className="text-xs opacity-80">{notebookDriftUpdatedLabel}</span>
            ) : null}
          </div>
          <p className="mt-1.5 leading-6">{notebookDriftMessage}</p>
        </div>
      ) : null}

      {showViewModeToggle ? (
        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {entityViewMode === "live"
              ? "Live notebook - blocks are persisted, inline-editable, slash commands active."
              : entityViewMode === "notebook"
                ? "Notebook view - read-only derivation with full harness lineage."
                : "Classic view - sections rendered as stacked panels."}
          </div>
          <div className="flex gap-1 rounded-md border border-gray-200 bg-gray-50/60 p-0.5 dark:border-white/10 dark:bg-white/[0.02]">
            <button
              type="button"
              onClick={onSelectClassic}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                entityViewMode === "classic"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Classic
            </button>
            <button
              type="button"
              onClick={onSelectNotebook}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                entityViewMode === "notebook"
                  ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              Notebook
            </button>
            {liveNotebookEnabled ? (
              <button
                type="button"
                onClick={onSelectLive}
                disabled={liveViewDisabled}
                title={liveViewTitle}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  entityViewMode === "live"
                    ? "bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {materializingLiveWorkspace ? "Opening Live..." : "Live"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {entityViewMode === "notebook" ? (
        <ErrorBoundary section="Entity notebook">
          <Suspense fallback={<div className="py-12 text-center text-sm text-gray-500">Loading notebook...</div>}>
            <article className="notebook-sheet mt-4">
              <EntityNotebookView
                entitySlug={entitySlug}
                shareToken={shareToken}
                canOpenLive={canOpenLiveFromNotebook}
                onOpenLive={onSelectLive}
                openingLive={materializingLiveWorkspace}
              />
            </article>
          </Suspense>
        </ErrorBoundary>
      ) : null}

      {entityViewMode === "live" ? (
        <ErrorBoundary section="Live notebook">
          <Suspense fallback={<div className="py-12 text-center text-sm text-gray-500">Loading live notebook...</div>}>
            <article className="notebook-sheet mt-4">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200/70 pb-4 dark:border-white/[0.08]">
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Live notebook
                  </div>
                  <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                    The notebook stays first. Runtime, replay, and operator detail now sit underneath it instead of competing with the page header.
                  </p>
                </div>
                {canEditNotebook ? (
                  <ErrorBoundary section="Share link">
                    <Suspense fallback={null}>
                      <ShareEntityButton entitySlug={entitySlug} />
                    </Suspense>
                  </ErrorBoundary>
                ) : null}
              </div>

              <EntityNotebookLiveMount
                entitySlug={entitySlug}
                shareToken={shareToken}
                canEdit={canEditNotebook}
                showReferenceNotebookToggle={showViewModeToggle}
                onOpenReferenceNotebook={onOpenReferenceNotebook}
                viewerOwnerKey={viewerOwnerKey}
                collaborationParticipants={collaborationParticipants}
                latestHumanEditorOwnerKey={latestHumanEditorOwnerKey}
                latestHumanEditorUpdatedAt={latestHumanEditorUpdatedAt}
              />

              <ErrorBoundary section="Timeline">
                <Suspense fallback={null}>
                  <NotebookTimeline
                    entitySlug={entitySlug}
                    className="mt-6 border-t border-gray-200/70 pt-6 dark:border-white/[0.08]"
                  />
                </Suspense>
              </ErrorBoundary>

              <ErrorBoundary section="Live diligence">
                <Suspense fallback={null}>
                  <LiveDiligenceSection
                    entitySlug={entitySlug}
                    canEdit={canEditNotebook}
                    className="mt-6"
                  />
                </Suspense>
              </ErrorBoundary>
            </article>
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </>
  );
}

export const EntityNotebookSurface = memo(EntityNotebookSurfaceBase);
EntityNotebookSurface.displayName = "EntityNotebookSurface";
