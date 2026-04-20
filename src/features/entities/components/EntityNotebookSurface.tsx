import { memo, Suspense, lazy } from "react";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

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

// DiligenceVerdictPanel — surfaces deterministic + LLM verdicts above the
// notebook trace. Lazy-loaded because it pulls Convex subscriptions + the
// per-gate rendering we only need when the live notebook is visible.
// (owner_mode_end_to_end.md: don't stop at backend work when UI can't see it.)
const DiligenceVerdictPanel = lazy(() =>
  import("@/features/entities/components/notebook/DiligenceVerdictPanel").then((mod) => ({
    default: mod.DiligenceVerdictPanel,
  })),
);

// DiligenceDriftBanner — silent by default; fires a warning when recent
// verdict rate drops below floor. Mounted ABOVE the verdict panel so
// the alert is the first thing operators see when drift is real.
const DiligenceDriftBanner = lazy(() =>
  import("@/features/entities/components/notebook/DiligenceDriftBanner").then((mod) => ({
    default: mod.DiligenceDriftBanner,
  })),
);

// ShareEntityButton — owner-facing "copy public share link". Anonymous
// read-only URL so owners can send briefs to investors without asking
// them to sign up (pitch-line commitment: "shareable public URLs").
const ShareEntityButton = lazy(() =>
  import("@/features/share/components/ShareEntityButton").then((mod) => ({
    default: mod.ShareEntityButton,
  })),
);

// PipelineReliabilityChip — surfaces scheduled retries + open DLQ entries
// tied to THIS entity. Silent when the pipeline is healthy
// (async_reliability.md invariant: "partial success is first-class").
const PipelineReliabilityChip = lazy(() =>
  import("@/features/entities/components/notebook/PipelineReliabilityChip").then((mod) => ({
    default: mod.PipelineReliabilityChip,
  })),
);

// EntityMemoryPanel — read-only view of the per-entity MEMORY.md index
// (layered_memory.md L1). Silent when the entity has no compacted topics
// yet; once runs accumulate, shows the one-liner summary per topic with
// progressive-disclosure fact expansion.
const EntityMemoryPanel = lazy(() =>
  import("@/features/entities/components/notebook/EntityMemoryPanel").then((mod) => ({
    default: mod.EntityMemoryPanel,
  })),
);

// ExtendedRunPanel — Live Diligence surface. Launcher + streaming
// checkpoint feed for multi-checkpoint Claude extended-thinking runs.
// The "90-minute autonomous build" pitch wired as Convex-reactive
// chain-of-checkpoints (convex/domains/product/extendedThinking.ts).
const ExtendedRunPanel = lazy(() =>
  import("@/features/entities/components/notebook/ExtendedRunPanel").then((mod) => ({
    default: mod.ExtendedRunPanel,
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
              ? "Live notebook — blocks are persisted, inline-editable, slash commands active."
              : entityViewMode === "notebook"
                ? "Notebook view — read-only derivation with full harness lineage."
                : "Classic view — sections rendered as stacked panels."}
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
                {materializingLiveWorkspace ? "Opening Live..." : "Live ✨"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {entityViewMode === "notebook" ? (
        <ErrorBoundary section="Entity notebook">
          <Suspense fallback={<div className="py-12 text-center text-sm text-gray-500">Loading notebook…</div>}>
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
          <Suspense fallback={<div className="py-12 text-center text-sm text-gray-500">Loading live notebook…</div>}>
            {/*
              Owner-only: mint a public share link for this entity's brief.
              Gated on canEditNotebook so read-only viewers don't see the
              button. The minted link works anonymously — no sign-in
              required for the recipient (publicShares.ts bearer token).
            */}
            {canEditNotebook ? (
              <ErrorBoundary section="Share link">
                <Suspense fallback={null}>
                  <ShareEntityButton entitySlug={entitySlug} className="mt-4" />
                </Suspense>
              </ErrorBoundary>
            ) : null}
            {/*
              Drift banner — silent by default. Renders only when recent
              verdict rate for THIS entity drops below the floor. Sitting
              above the verdict panel means operators see the alert first
              when drift is real, and see nothing when things are fine
              (zero noise, design_reduction.md).
            */}
            <ErrorBoundary section="Drift banner">
              <Suspense fallback={null}>
                <DiligenceDriftBanner entitySlug={entitySlug} className="mt-4" />
              </Suspense>
            </ErrorBoundary>
            {/*
              Reliability chip — shows scheduled retries + DLQ state for
              this entity. Silent when healthy; fires a compact amber row
              when anything is pending. Part of the async_reliability.md
              "partial success is first-class" contract.
            */}
            <ErrorBoundary section="Reliability chip">
              <Suspense fallback={null}>
                <PipelineReliabilityChip entitySlug={entitySlug} className="mt-3" />
              </Suspense>
            </ErrorBoundary>
            {/*
              Memory index — one-liner per topic across runs. Layered
              memory L1. Silent on cold start (no topics yet); grows as
              the entity accumulates structured runs.
            */}
            <ErrorBoundary section="Memory index">
              <Suspense fallback={null}>
                <EntityMemoryPanel entitySlug={entitySlug} className="mt-4" />
              </Suspense>
            </ErrorBoundary>
            {/*
              Live Diligence surface — multi-checkpoint autonomous Claude
              run with streaming-ish UI (checkpoint-granular via Convex
              reactivity). Launcher is owner-only; read-only visitors
              see past run summaries.
            */}
            <ErrorBoundary section="Live diligence">
              <Suspense fallback={null}>
                <ExtendedRunPanel
                  entitySlug={entitySlug}
                  canEdit={canEditNotebook}
                  className="mt-4"
                />
              </Suspense>
            </ErrorBoundary>
            {/*
              Verdict panel ABOVE the notebook article so operators see
              deterministic + LLM scoring before they dive into blocks
              (agent_run_verdict_workflow.md §4). Fallback is bounded and
              the panel itself renders a skeleton, so there is no blank
              section under Suspense.
            */}
            <ErrorBoundary section="Pipeline verdicts">
              <Suspense fallback={null}>
                <DiligenceVerdictPanel entitySlug={entitySlug} limit={8} className="mt-4" />
              </Suspense>
            </ErrorBoundary>
            <article className="notebook-sheet mt-4">
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
            </article>
          </Suspense>
        </ErrorBoundary>
      ) : null}
    </>
  );
}

export const EntityNotebookSurface = memo(EntityNotebookSurfaceBase);
EntityNotebookSurface.displayName = "EntityNotebookSurface";
