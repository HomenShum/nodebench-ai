/**
 * NotebookRightRail — optional run inspector rail for the entity notebook.
 *
 * Pattern: optional rails (PR8 from the refactor checklist).
 *          Scratchpad / trace and run-map panels exist as secondary
 *          surfaces — visible to power users, invisible to search-only users
 *          by default. Never the primary reading path.
 *
 * Prior art:
 *   - Notion — optional right rail with comments, outline, AI
 *   - Linear — collapsible right pane with activity
 *   - Cursor — composer panel alongside editor
 *
 * See: .claude/rules/reexamine_design_reduction.md  (earned complexity)
 *      .claude/rules/reexamine_performance.md  (lazy mount inside drawer)
 *      .claude/rules/reference_attribution.md
 *      docs/architecture/NOTEBOOK_REFACTOR_NOTES.md  (PR8)
 *
 * UX invariants:
 *  - Default-closed — user must opt in
 *  - Open/close state is local to the rail, does not touch editor identity
 *  - Rail contents are lazy-mounted — opening the rail doesn't pre-load
 *    scratchpad or session data for users who never open it
 *  - Only one primary surface open at a time to keep the page calm (user
 *    can override)
 */

import { memo, useState, type ReactNode } from "react";
import { PanelRight, PanelRightClose } from "lucide-react";
import { cn } from "@/lib/utils";

export type NotebookRightRailProps = {
  /** Content slot for the Scratchpad viewer (supplied lazily by caller). */
  scratchpadSlot?: ReactNode;
  /** Content slot for the Session Artifacts panel. */
  sessionArtifactsSlot?: ReactNode;
  /** Header title. Defaults to the runtime-oriented label. */
  title?: string;
  /** Default open? For returning power users. Persist via caller if needed. */
  defaultOpen?: boolean;
  /** Additional classes for positioning. */
  className?: string;
};

type RailTab = "scratchpad" | "artifacts";

/**
 * ARIA labels kept short — the rail is supplementary; rich descriptions
 * live on the child panels themselves.
 */
const TAB_LABEL: Record<RailTab, string> = {
  scratchpad: "Trace",
  artifacts: "Run map",
};

function NotebookRightRailBase({
  scratchpadSlot,
  sessionArtifactsSlot,
  title = "Run inspector",
  defaultOpen = false,
  className,
}: NotebookRightRailProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Default to artifacts tab — more immediately relevant to most users.
  // Power users who prefer scratchpad-first can click through.
  const [activeTab, setActiveTab] = useState<RailTab>("artifacts");

  const availableTabs: RailTab[] = [];
  if (sessionArtifactsSlot) availableTabs.push("artifacts");
  if (scratchpadSlot) availableTabs.push("scratchpad");

  // If nothing to show, don't render the toggle either — the rail is purely
  // opt-in supplementary content.
  if (availableTabs.length === 0) return null;

  // Normalize active tab if the preferred one isn't available.
  const effectiveTab = availableTabs.includes(activeTab)
    ? activeTab
    : availableTabs[0];

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-gray-200 bg-white/60 backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.02]",
        className,
      )}
      aria-label={title}
    >
      {/* Compact header — always visible, toggles the rail body */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="notebook-right-rail-body"
        className="flex w-full items-center justify-between gap-2 rounded-t-lg px-3 py-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757] dark:hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <PanelRightClose className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
          ) : (
            <PanelRight className="h-3.5 w-3.5 text-gray-500" aria-hidden="true" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-600 dark:text-gray-300">
            {title}
          </span>
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {open ? "Hide" : "Open"}
        </span>
      </button>

      {/* Tab strip — only visible when open. Hidden when only one tab available. */}
      {open && availableTabs.length > 1 ? (
        <div
          role="tablist"
          aria-label={`${title} sections`}
          className="flex border-t border-gray-100 px-2 pt-2 dark:border-white/[0.06]"
        >
          {availableTabs.map((tab) => {
            const isActive = tab === effectiveTab;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`rail-panel-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "rounded-t-md px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]",
                  isActive
                    ? "bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-gray-100"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                {TAB_LABEL[tab]}
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Body — only mount the active tab's content. Lazy by design: when the
          rail is closed, NEITHER slot is rendered so neither pays any cost. */}
      {open ? (
        <div
          id="notebook-right-rail-body"
          className="border-t border-gray-100 p-2 dark:border-white/[0.06]"
        >
          <div
            id={`rail-panel-${effectiveTab}`}
            role="tabpanel"
            aria-label={TAB_LABEL[effectiveTab]}
          >
            {effectiveTab === "scratchpad" ? scratchpadSlot : null}
            {effectiveTab === "artifacts" ? sessionArtifactsSlot : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const NotebookRightRail = memo(NotebookRightRailBase);
NotebookRightRail.displayName = "NotebookRightRail";

export default NotebookRightRail;
