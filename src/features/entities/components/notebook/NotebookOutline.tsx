/**
 * NotebookOutline — collapsible outline of H2/H3 headings in the notebook.
 *
 * Pattern: Notion's Table of Contents / Obsidian's outline pane.
 * Prior art:
 *   - Notion — /toc block renders an auto-updating outline
 *   - Obsidian — "Outline" core plugin in the right pane
 *   - Linear — issue description has sticky section anchors
 *
 * UX invariants:
 *   - Rendered only when the notebook has 2+ headings (no value below that)
 *   - Click a heading → smooth-scroll to it + brief focus pulse
 *   - Tracks scroll position; highlights the currently-visible section
 *   - Honors prefers-reduced-motion (instant scroll + no pulse)
 */

import { memo, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type OutlineItem = {
  blockId: string;
  kind: "heading_1" | "heading_2" | "heading_3";
  text: string;
};

type Props = {
  /** Notebook blocks with kind + textContent derived by parent. */
  items: readonly OutlineItem[];
  /** Additional classes (positioning in the rail). */
  className?: string;
};

function scrollToBlock(blockId: string) {
  const el = document.querySelector<HTMLElement>(
    `[data-testid="notebook-block"][data-block-id="${CSS.escape(blockId)}"]`,
  );
  if (!el) return;
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
  // Brief focus pulse so the user sees where they landed. Toggling a class
  // the CSS keyframe picks up; class is removed after the animation ends so
  // repeated jumps re-fire it.
  if (!prefersReducedMotion) {
    el.classList.remove("notebook-outline-jump-pulse");
    // Force reflow so the class toggle restarts the animation.
    void el.offsetWidth;
    el.classList.add("notebook-outline-jump-pulse");
    window.setTimeout(() => el.classList.remove("notebook-outline-jump-pulse"), 900);
  }
}

function useActiveHeadingId(items: readonly OutlineItem[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const targets = items
      .map((item) =>
        document.querySelector<HTMLElement>(
          `[data-testid="notebook-block"][data-block-id="${CSS.escape(item.blockId)}"]`,
        ),
      )
      .filter((el): el is HTMLElement => Boolean(el));
    if (targets.length === 0) return;
    // Guard against envs without IntersectionObserver (JSDOM tests,
    // older Safari). Matches the pattern in DocumentCard and
    // ScrollytellingLayout. Outline just won't auto-scroll on scroll
    // in those environments — non-critical UX.
    if (typeof IntersectionObserver === "undefined") return;

    // IntersectionObserver: the topmost intersecting heading wins.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute("data-block-id");
          if (id) setActive(id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, [items]);

  return active;
}

function NotebookOutlineBase({ items, className }: Props) {
  const activeId = useActiveHeadingId(items);

  // Filter out empty-title headings — they can't be jumped to meaningfully.
  const visible = useMemo(
    () => items.filter((item) => item.text.trim().length > 0),
    [items],
  );

  // Below 2 headings, outline adds no navigational value. Ship-gate §8:
  // empty/low-value modules should not render.
  if (visible.length < 2) return null;

  return (
    <nav
      className={cn(
        "flex flex-col rounded-lg border border-gray-200 bg-white/60 p-3 backdrop-blur-sm",
        "dark:border-white/[0.08] dark:bg-white/[0.02]",
        className,
      )}
      aria-label="Notebook outline"
    >
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
        <span>Outline</span>
        <span className="text-gray-300 dark:text-gray-600">·</span>
        <span className="text-gray-400 dark:text-gray-500">{visible.length}</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {visible.map((item) => {
          const isActive = activeId === item.blockId;
          const indent =
            item.kind === "heading_1" ? "pl-0" : item.kind === "heading_2" ? "pl-0" : "pl-3";
          return (
            <li key={item.blockId}>
              <button
                type="button"
                onClick={() => scrollToBlock(item.blockId)}
                className={cn(
                  "w-full truncate rounded-md px-2 py-1 text-left text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-primary)]/40",
                  indent,
                  isActive
                    ? "bg-[var(--accent-primary)]/10 font-medium text-[var(--accent-primary)]"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-gray-100",
                )}
              >
                {item.text}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export const NotebookOutline = memo(NotebookOutlineBase);
export default NotebookOutline;
