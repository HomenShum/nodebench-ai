/**
 * DiligenceSection — renders one diligence block's output on a company entity
 * page (Classic view).
 *
 * Pattern: one reusable section primitive per block; the 10 blocks all render
 *          through this component with a block-specific `renderer` callback.
 *          Avoids hand-built section code per block.
 *
 * Prior art:
 *   - Notion databases — render one layout, many content shapes
 *   - Linear custom views — block-typed section shell
 *   - Airtable record sections
 *
 * See: docs/architecture/DILIGENCE_BLOCKS.md
 *      docs/architecture/REPORTS_AND_ENTITIES.md
 *      docs/architecture/AGENT_PIPELINE.md
 *      .claude/rules/reference_attribution.md
 *
 * Invariants:
 *  - Every section header carries an EvidenceChip reflecting the block's
 *    overall confidence (computed from the candidates).
 *  - Empty-section copy is intentional — never "nothing here" (see dogfood rule).
 *  - The section is keyboard-accessible (collapse via Enter/Space on header).
 */

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EvidenceChip, type EvidenceTier } from "./EvidenceChip";

export type DiligenceSectionProps<TCandidate> = {
  /** Block type — drives icon + color accents; string for flexibility. */
  block: string;
  /** Section header title — e.g., "Founders", "Products", "Funding". */
  title: string;
  /** Short explanation shown under the title when expanded. */
  description?: string;
  /** Overall confidence for this block's output — aggregate of candidate tiers. */
  overallTier: EvidenceTier;
  /** Candidates for the block. May be empty (section still renders, with empty copy). */
  candidates: TCandidate[];
  /** How many sources total informed this section. */
  sourceCount?: number;
  /** Relative "last updated" label, e.g. "2h ago". */
  updatedLabel?: string;
  /**
   * Render function for a single candidate. Each block type supplies its
   * own renderer — FounderRenderer, ProductRenderer, FundingRenderer, etc.
   */
  renderer: (candidate: TCandidate, index: number) => ReactNode;
  /**
   * Action slot — optional buttons rendered in the header right side
   * (e.g., "Refresh", "Watch", "View in chat").
   */
  actions?: ReactNode;
  /**
   * Copy for the empty state. Must be actionable ("Upload a deck" etc.),
   * never "nothing here". See .claude/rules/dogfood_verification.md.
   */
  emptyLabel?: string;
  /** Default-collapsed state. Defaults to expanded. */
  defaultCollapsed?: boolean;
  /** Extra classes on the outer wrapper. */
  className?: string;
};

export function DiligenceSection<TCandidate>({
  block,
  title,
  description,
  overallTier,
  candidates,
  sourceCount,
  updatedLabel,
  renderer,
  actions,
  emptyLabel = "Unable to identify — try uploading a deck or bio.",
  defaultCollapsed = false,
  className,
}: DiligenceSectionProps<TCandidate>) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const headerId = `diligence-${block}-header`;
  const panelId = `diligence-${block}-panel`;

  return (
    <section
      className={cn(
        "rounded-lg border border-gray-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02]",
        className,
      )}
      aria-labelledby={headerId}
    >
      {/* Header — collapsible, keyboard-accessible */}
      <button
        id={headerId}
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-t-lg px-4 py-3 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757] dark:hover:bg-white/[0.04]"
      >
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          )}
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h2>
          <EvidenceChip
            tier={overallTier}
            sourceCount={sourceCount}
            compact
            className="shrink-0"
          />
          {updatedLabel ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
              · updated {updatedLabel}
            </span>
          ) : null}
        </span>
        {actions ? (
          <span
            className="flex shrink-0 items-center gap-1"
            // Stop propagation so action clicks don't also toggle the section
            onClick={(e) => e.stopPropagation()}
          >
            {actions}
          </span>
        ) : null}
      </button>

      {/* Body — candidates or empty state.
          No explicit role — the outer <section aria-labelledby> already
          exposes a single labeled region to screen readers. A nested
          role="region" here would create a second landmark for the same
          heading (a11y warning). */}
      {!collapsed ? (
        <div
          id={panelId}
          className="border-t border-gray-100 px-4 py-3 dark:border-white/[0.06]"
        >
          {description ? (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400 leading-5">
              {description}
            </p>
          ) : null}

          {candidates.length === 0 ? (
            <div
              className="rounded-md border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.01] dark:text-gray-400"
              role="status"
            >
              {emptyLabel}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {candidates.map((c, idx) => (
                <li key={idx}>{renderer(c, idx)}</li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default DiligenceSection;
